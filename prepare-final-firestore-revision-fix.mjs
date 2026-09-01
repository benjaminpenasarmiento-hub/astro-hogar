import fs from "node:fs";

const path = "build-server.mjs";
let build = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");

// The generated Vercel store must hydrate the remote revision before its first
// authenticated write. If another request wins the revision race, refresh and
// retry once using the latest remote snapshot/revision.
const oldSave = `      const dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));
      const expectedRevision = getObservedFirestoreRevision(cleanCode);
      const nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);
      observedFirestoreRevisions.set(cleanCode, nextRevision);`;
const newSave = `      if (!observedFirestoreRevisions.has(cleanCode)) {
        await refreshActiveHomeFromFirestore(cleanCode);
      }

      let dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));
      let expectedRevision = getObservedFirestoreRevision(cleanCode);
      let nextRevision;
      try {
        nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);
      } catch (writeError) {
        const message = String(writeError?.message || "");
        if (!message.startsWith("SYNC_CONFLICT:" + cleanCode + ":")) throw writeError;
        console.warn("[Firestore Sync] Revision conflict; refreshing remote state and retrying once.");
        await refreshActiveHomeFromFirestore(cleanCode);
        expectedRevision = getObservedFirestoreRevision(cleanCode);
        dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));
        nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);
      }
      observedFirestoreRevisions.set(cleanCode, nextRevision);`;

if (build.includes(oldSave)) {
  build = build.replace(oldSave, newSave);
} else if (!build.includes("Revision conflict; refreshing remote state and retrying once.")) {
  throw new Error("No se encontró el bloque de persistencia Vercel para reforzar la revisión Firestore.");
}

// Also guarantee that the generated Vercel partition middleware hydrates the
// selected home before API handlers execute. This is intentionally narrow so
// onboarding routes remain untouched.
const oldPartition = `homeContextStorage.run(homeCode, () => next());`;
const newPartition = `homeContextStorage.run(homeCode, async () => {
    try {
      if (!onboardingCreate && !onboardingJoin && !onboardingEnter) {
        await refreshActiveHomeFromFirestore(homeCode);
      }
    } catch (hydrationError) {
      console.warn("[AstroHogar] No se pudo hidratar el hogar activo desde Firestore; continuando con el estado disponible:", hydrationError);
    }
    next();
  });`;
if (build.includes(oldPartition)) build = build.replace(oldPartition, newPartition);

fs.writeFileSync(path, build, "utf8");
console.log("[AstroHogar] Firestore revision hydration/retry hardening applied.");
