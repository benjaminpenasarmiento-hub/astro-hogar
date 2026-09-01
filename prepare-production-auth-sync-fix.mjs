import fs from "fs";

// Recover valid household access for legacy documents by using the authenticated
// account_homes/{uid} index, then let the existing middleware backfill metadata.
const authPath = "serverAuthMiddleware.ts";
let auth = fs.readFileSync(authPath, "utf8");

if (!auth.includes("readAccountHomeIndex")) {
  auth = auth.replace(
    'import { readHomeDocument, patchHomeMetadata } from "./serverFirestoreRest.js";',
    'import { readHomeDocument, patchHomeMetadata, readAccountHomeIndex } from "./serverFirestoreRest.js";'
  );
}

const memberNeedle = `    const member = Boolean(
      (uid && authorizedUids.includes(uid)) ||
      (normalizedEmail && authorizedEmails.includes(normalizedEmail)) ||
      legacyMember
    );

    if (!member) return false;`;
const memberReplacement = `    let member = Boolean(
      (uid && authorizedUids.includes(uid)) ||
      (normalizedEmail && authorizedEmails.includes(normalizedEmail)) ||
      legacyMember
    );

    // Legacy repair: an authenticated account may already be linked to this home
    // through account_homes/{uid} even when the nest metadata arrays are stale.
    if (!member && uid) {
      try {
        const accountIndex = await readAccountHomeIndex(uid);
        if (accountIndex.homeCode === homeCode) {
          member = true;
        }
      } catch (indexError) {
        console.warn("[Firebase AuthZ] No se pudo consultar account_homes:", indexError);
      }
    }

    if (!member) return false;`;

if (!auth.includes("Legacy repair: an authenticated account") && !auth.includes("Source of truth for an authenticated account")) {
  if (auth.includes(memberNeedle)) {
    auth = auth.replace(memberNeedle, memberReplacement);
  } else {
    console.warn("[AstroHogar] Legacy membership block not found; leaving current auth middleware unchanged.");
  }
}
fs.writeFileSync(authPath, auth, "utf8");

// Production persistence: establish the remote revision before the first write,
// then recover once from a concurrent revision conflict instead of leaving the app unsynced.
const buildPath = "build-server.mjs";
// Normalize line endings because Vercel may check out this source with CRLF while
// the generated matcher strings use LF. The build logic itself is line-ending agnostic.
let build = fs.readFileSync(buildPath, "utf8").replace(/\r\n/g, "\n");

if (!build.includes("Revision conflict; refreshing remote state and retrying once.")) {
  // Match the generated production save block as plain text instead of embedding
  // a fragile regex literal. This avoids JS parser failures caused by nested ')' characters.
  const saveBlock = `      const dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));
      const expectedRevision = getObservedFirestoreRevision(cleanCode);
      const nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);
      observedFirestoreRevisions.set(cleanCode, nextRevision);`;

  const replacement = `      if (!observedFirestoreRevisions.has(cleanCode)) {
        await refreshActiveHomeFromFirestore(cleanCode);
      }

      const dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));
      let expectedRevision = getObservedFirestoreRevision(cleanCode);
      let nextRevision;
      try {
        nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);
      } catch (writeError) {
        const conflictMessage = String(writeError?.message || "");
        if (!conflictMessage.startsWith("SYNC_CONFLICT:" + cleanCode + ":")) throw writeError;
        console.warn("[Firestore Sync] Revision conflict; refreshing remote state and retrying once.");
        await refreshActiveHomeFromFirestore(cleanCode);
        expectedRevision = getObservedFirestoreRevision(cleanCode);
        const refreshedDataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));
        nextRevision = await writeHomeDocument(cleanCode, { data: refreshedDataCopy }, expectedRevision);
      }
      observedFirestoreRevisions.set(cleanCode, nextRevision);`;

  if (build.includes(saveBlock)) {
    build = build.replace(saveBlock, replacement);
  } else {
    console.warn("[AstroHogar] Production sync block not found; skipping conflict rewrite because build-server may already handle it.");
  }
}

const hydrationImportNeedle = 'import { requireFirebaseAuth as __requireFirebaseAuth } from "./serverAuthMiddleware";';
const hydrationImport = hydrationImportNeedle + '\nimport { refreshActiveHomeFromFirestore as __refreshActiveHomeFromFirestore } from "./serverStore.vercel";';
if (!build.includes("__refreshActiveHomeFromFirestore")) {
  if (build.includes(hydrationImportNeedle)) {
    build = build.replace(hydrationImportNeedle, hydrationImport);
  } else {
    console.warn("[AstroHogar] Could not locate server middleware import block for production hydration.");
  }
}

const safePartitionOld = `const safePartitionMiddleware = \`app.use((req, res, next) => {
  const rawHomeCode = String(req.headers["x-home-code"] || "").trim();
  const onboardingCreate = req.path === "/api/onboarding/create-home";
  const onboardingJoin = req.path === "/api/onboarding/join-home";
  const onboardingEnter = req.path === "/api/onboarding/enter-home";
  if (!rawHomeCode && !onboardingCreate && !onboardingJoin && !onboardingEnter && req.path !== "/api/health" && req.path !== "/health") {
    return res.status(400).json({ error: "No hay un hogar activo.", code: "HOME_CONTEXT_REQUIRED" });
  }
  const bodyCode = onboardingJoin ? String(req.body?.inviteCode || "").trim() : "";
  const homeCode = normalizeHomeCode(rawHomeCode || bodyCode);
  if (!homeCode) return next();
  homeContextStorage.run(homeCode, () => next());
});\`;`;
const safePartitionNew = `const safePartitionMiddleware = \`app.use((req, res, next) => {
  const rawHomeCode = String(req.headers["x-home-code"] || "").trim();
  const onboardingCreate = req.path === "/api/onboarding/create-home";
  const onboardingJoin = req.path === "/api/onboarding/join-home";
  const onboardingEnter = req.path === "/api/onboarding/enter-home";
  if (!rawHomeCode && !onboardingCreate && !onboardingJoin && !onboardingEnter && req.path !== "/api/health" && req.path !== "/health") {
    return res.status(400).json({ error: "No hay un hogar activo.", code: "HOME_CONTEXT_REQUIRED" });
  }
  const bodyCode = onboardingJoin ? String(req.body?.inviteCode || "").trim() : "";
  const homeCode = normalizeHomeCode(rawHomeCode || bodyCode);
  if (!homeCode) return next();
  homeContextStorage.run(homeCode, async () => {
    try {
      if (!onboardingCreate && !onboardingJoin && !onboardingEnter) {
        await __refreshActiveHomeFromFirestore(homeCode);
      }
    } catch (hydrationError) {
      console.warn("[AstroHogar] No se pudo hidratar el hogar activo desde Firestore; continuando con el estado disponible:", hydrationError);
    }
    next();
  });
});\`;`;
if (!build.includes("await __refreshActiveHomeFromFirestore(homeCode)")) {
  if (build.includes(safePartitionOld)) {
    build = build.replace(safePartitionOld, safePartitionNew);
  } else {
    console.warn("[AstroHogar] Production partition middleware text changed; skipping hydration rewrite.");
  }
}

fs.writeFileSync(buildPath, build, "utf8");
console.log("Production auth recovery, Firestore hydration, and conflict handling prepared.");
