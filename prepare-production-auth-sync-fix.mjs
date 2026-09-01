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

if (!auth.includes("Legacy repair: an authenticated account")) {
  if (!auth.includes(memberNeedle)) throw new Error("No se encontró el bloque de pertenencia al hogar esperado");
  auth = auth.replace(memberNeedle, memberReplacement);
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

  const replacement = `      if (!observedFirestoreRevisions.has(cleanCode)) {\n        await refreshActiveHomeFromFirestore(cleanCode);\n      }\n\n      const dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));\n      let expectedRevision = getObservedFirestoreRevision(cleanCode);\n      let nextRevision;\n      try {\n        nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);\n      } catch (writeError) {\n        const conflictMessage = String(writeError?.message || "");\n        if (!conflictMessage.startsWith(`SYNC_CONFLICT:${cleanCode}:`)) throw writeError;\n        console.warn("[Firestore Sync] Revision conflict; refreshing remote state and retrying once.");\n        await refreshActiveHomeFromFirestore(cleanCode);\n        expectedRevision = getObservedFirestoreRevision(cleanCode);\n        const refreshedDataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));\n        nextRevision = await writeHomeDocument(cleanCode, { data: refreshedDataCopy }, expectedRevision);\n      }\n      observedFirestoreRevisions.set(cleanCode, nextRevision);`;

  if (build.includes(saveBlock)) {
    build = build.replace(saveBlock, replacement);
  } else {
    console.warn("[AstroHogar] Production sync block not found; skipping conflict rewrite because build-server may already handle it.");
  }
}

fs.writeFileSync(buildPath, build, "utf8");
console.log("Production auth recovery and Firestore conflict handling prepared.");
