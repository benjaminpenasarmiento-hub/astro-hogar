import fs from "fs";

// Recover valid household access for legacy documents by using the authenticated
// account_homes/{uid} index, then let the existing middleware backfill metadata.
const authPath = "serverAuthMiddleware.ts";
let auth = fs.readFileSync(authPath, "utf8");
auth = auth.replace(
  'import { readHomeDocument, patchHomeMetadata } from "./serverFirestoreRest.js";',
  'import { readHomeDocument, patchHomeMetadata, readAccountHomeIndex } from "./serverFirestoreRest.js";'
);
const memberNeedle = `    const member = Boolean(\n      (uid && authorizedUids.includes(uid)) ||\n      (normalizedEmail && authorizedEmails.includes(normalizedEmail)) ||\n      legacyMember\n    );\n\n    if (!member) return false;`;
const memberReplacement = `    let member = Boolean(\n      (uid && authorizedUids.includes(uid)) ||\n      (normalizedEmail && authorizedEmails.includes(normalizedEmail)) ||\n      legacyMember\n    );\n\n    // Legacy repair: an authenticated account may already be linked to this home\n    // through account_homes/{uid} even when the nest metadata arrays are stale.\n    if (!member && uid) {\n      try {\n        const accountIndex = await readAccountHomeIndex(uid);\n        if (accountIndex.homeCode === homeCode) {\n          member = true;\n        }\n      } catch (indexError) {\n        console.warn("[Firebase AuthZ] No se pudo consultar account_homes:", indexError);\n      }\n    }\n\n    if (!member) return false;`;
if (!auth.includes("readAccountHomeIndex")) throw new Error("No se encontró el middleware de autorización esperado");
if (!auth.includes(memberReplacement)) {
  if (!auth.includes(memberNeedle)) throw new Error("No se encontró el bloque de pertenencia al hogar esperado");
  auth = auth.replace(memberNeedle, memberReplacement);
}
fs.writeFileSync(authPath, auth, "utf8");

// Production persistence: always establish the remote revision before the first write,
// and recover once from a concurrent revision conflict instead of leaving the app unsynced.
const buildPath = "build-server.mjs";
let build = fs.readFileSync(buildPath, "utf8");
const oldSaveFragment = `      const dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));\n      const expectedRevision = getObservedFirestoreRevision(cleanCode);\n      const nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);\n      observedFirestoreRevisions.set(cleanCode, nextRevision);`;
const newSaveFragment = `      if (!observedFirestoreRevisions.has(cleanCode)) {\n        await refreshActiveHomeFromFirestore(cleanCode);\n      }\n\n      const dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));\n      let expectedRevision = getObservedFirestoreRevision(cleanCode);\n      let nextRevision;\n      try {\n        nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);\n      } catch (writeError: any) {\n        if (!String(writeError?.message || "").startsWith(\`SYNC_CONFLICT:\${cleanCode}:\`)) throw writeError;\n        console.warn(\"[Firestore Sync] Revision conflict; refreshing remote state and retrying once.\");\n        await refreshActiveHomeFromFirestore(cleanCode);\n        expectedRevision = getObservedFirestoreRevision(cleanCode);\n        const refreshedDataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));\n        nextRevision = await writeHomeDocument(cleanCode, { data: refreshedDataCopy }, expectedRevision);\n      }\n      observedFirestoreRevisions.set(cleanCode, nextRevision);`;
if (build.includes(oldSaveFragment)) {
  build = build.replace(oldSaveFragment, newSaveFragment);
} else if (!build.includes("Revision conflict; refreshing remote state")) {
  throw new Error("No se encontró el bloque production saveToFirestore esperado");
}
fs.writeFileSync(buildPath, build, "utf8");

console.log("Production auth recovery and Firestore conflict handling prepared.");
