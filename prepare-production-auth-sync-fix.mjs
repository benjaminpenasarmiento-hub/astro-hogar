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

const memberNeedle = `    const member = Boolean(\n      (uid && authorizedUids.includes(uid)) ||\n      (normalizedEmail && authorizedEmails.includes(normalizedEmail)) ||\n      legacyMember\n    );\n\n    if (!member) return false;`;
const memberReplacement = `    let member = Boolean(\n      (uid && authorizedUids.includes(uid)) ||\n      (normalizedEmail && authorizedEmails.includes(normalizedEmail)) ||\n      legacyMember\n    );\n\n    // Legacy repair: an authenticated account may already be linked to this home\n    // through account_homes/{uid} even when the nest metadata arrays are stale.\n    if (!member && uid) {\n      try {\n        const accountIndex = await readAccountHomeIndex(uid);\n        if (accountIndex.homeCode === homeCode) {\n          member = true;\n        }\n      } catch (indexError) {\n        console.warn("[Firebase AuthZ] No se pudo consultar account_homes:", indexError);\n      }\n    }\n\n    if (!member) return false;`;

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
let build = fs.readFileSync(buildPath, "utf8");

if (!build.includes("Revision conflict; refreshing remote state and retrying once.")) {
  // Match the generated production save block as plain text instead of embedding
  // a fragile regex literal. This avoids JS parser failures caused by nested ')' characters.
  const saveBlock = `      const dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));\n      const expectedRevision = getObservedFirestoreRevision(cleanCode);\n      const nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);\n      observedFirestoreRevisions.set(cleanCode, nextRevision);`;

  const replacement = `      if (!observedFirestoreRevisions.has(cleanCode)) {\n        await refreshActiveHomeFromFirestore(cleanCode);\n      }\n\n      const dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));\n      let expectedRevision = getObservedFirestoreRevision(cleanCode);\n      let nextRevision;\n      try {\n        nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);\n      } catch (writeError) {\n        const conflictMessage = String(writeError?.message || "");\n        if (!conflictMessage.startsWith("SYNC_CONFLICT:" + cleanCode + ":")) throw writeError;\n        console.warn("[Firestore Sync] Revision conflict; refreshing remote state and retrying once.");\n        await refreshActiveHomeFromFirestore(cleanCode);\n        expectedRevision = getObservedFirestoreRevision(cleanCode);\n        const refreshedDataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));\n        nextRevision = await writeHomeDocument(cleanCode, { data: refreshedDataCopy }, expectedRevision);\n      }\n      observedFirestoreRevisions.set(cleanCode, nextRevision);`;

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

const safePartitionOld = `const safePartitionMiddleware = \`app.use((req, res, next) => {\n  const rawHomeCode = String(req.headers["x-home-code"] || "").trim();\n  const onboardingCreate = req.path === "/api/onboarding/create-home";\n  const onboardingJoin = req.path === "/api/onboarding/join-home";\n  const onboardingEnter = req.path === "/api/onboarding/enter-home";\n  if (!rawHomeCode && !onboardingCreate && !onboardingJoin && !onboardingEnter && req.path !== "/api/health" && req.path !== "/health") {\n    return res.status(400).json({ error: "No hay un hogar activo.", code: "HOME_CONTEXT_REQUIRED" });\n  }\n  const bodyCode = onboardingJoin ? String(req.body?.inviteCode || "").trim() : "";\n  const homeCode = normalizeHomeCode(rawHomeCode || bodyCode);\n  if (!homeCode) return next();\n  homeContextStorage.run(homeCode, () => next());\n});\`;`;
const safePartitionNew = `const safePartitionMiddleware = \`app.use((req, res, next) => {\n  const rawHomeCode = String(req.headers["x-home-code"] || "").trim();\n  const onboardingCreate = req.path === "/api/onboarding/create-home";\n  const onboardingJoin = req.path === "/api/onboarding/join-home";\n  const onboardingEnter = req.path === "/api/onboarding/enter-home";\n  if (!rawHomeCode && !onboardingCreate && !onboardingJoin && !onboardingEnter && req.path !== "/api/health" && req.path !== "/health") {\n    return res.status(400).json({ error: "No hay un hogar activo.", code: "HOME_CONTEXT_REQUIRED" });\n  }\n  const bodyCode = onboardingJoin ? String(req.body?.inviteCode || "").trim() : "";\n  const homeCode = normalizeHomeCode(rawHomeCode || bodyCode);\n  if (!homeCode) return next();\n  homeContextStorage.run(homeCode, async () => {\n    try {\n      if (!onboardingCreate && !onboardingJoin && !onboardingEnter) {\n        await __refreshActiveHomeFromFirestore(homeCode);\n      }\n    } catch (hydrationError) {\n      console.warn("[AstroHogar] No se pudo hidratar el hogar activo desde Firestore; continuando con el estado disponible:", hydrationError);\n    }\n    next();\n  });\n});\`;`;
if (!build.includes("await __refreshActiveHomeFromFirestore(homeCode)")) {
  if (build.includes(safePartitionOld)) {
    build = build.replace(safePartitionOld, safePartitionNew);
  } else {
    console.warn("[AstroHogar] Production partition middleware text changed; skipping hydration rewrite.");
  }
}

fs.writeFileSync(buildPath, build, "utf8");
console.log("Production auth recovery, Firestore hydration, and conflict handling prepared.");
