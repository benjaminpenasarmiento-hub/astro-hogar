import fs from "node:fs";

// Final deterministic hardening pass. It runs before Vite and before build-server
// so the production build cannot reintroduce the two known failure modes.

const dashboardPath = "src/components/HomeDashboard.tsx";
let dashboard = fs.readFileSync(dashboardPath, "utf8");
dashboard = dashboard.replaceAll("activdeUserName", "activeUserName");

const activeUserPattern = /const activeUser = users\.find\(u => u\.id === activeUserId\)[^\n]*;/;
if (/\bactiveUserName\b/.test(dashboard) && !/\bconst\s+activeUserName\s*=/.test(dashboard)) {
  if (activeUserPattern.test(dashboard)) {
    dashboard = dashboard.replace(
      activeUserPattern,
      (line) => `${line}\n  const activeUserName = activeUser?.name || "Usuario";`
    );
  } else {
    throw new Error("No se encontró el ancla activeUser de HomeDashboard para declarar activeUserName.");
  }
}
fs.writeFileSync(dashboardPath, dashboard, "utf8");

const buildPath = "build-server.mjs";
let build = fs.readFileSync(buildPath, "utf8").replace(/\r\n/g, "\n");

// Replace the generated Vercel save operation regardless of whitespace or of a
// previous automated pass. The callback always refreshes the remote snapshot
// before the first write and retries once after a revision race.
const retryBlock = `      if (!observedFirestoreRevisions.has(cleanCode)) {
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

const saveStart = '      const dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));';
const saveEnd = '      observedFirestoreRevisions.set(cleanCode, nextRevision);';
const start = build.lastIndexOf(saveStart);
const endMarker = build.indexOf(saveEnd, start);
if (start >= 0 && endMarker > start) {
  const end = endMarker + saveEnd.length;
  build = build.slice(0, start) + retryBlock + build.slice(end);
} else if (!build.includes("Revision conflict; refreshing remote state and retrying once.")) {
  throw new Error("No se encontró el bloque de saveToFirestore generado para hardening.");
}

// Ensure the production partition hydrates Firestore for every authenticated
// request before route handlers read or mutate the in-memory home store.
const oldPartition = 'homeContextStorage.run(homeCode, () => next());';
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
if (build.includes(oldPartition)) {
  build = build.replace(oldPartition, newPartition);
}

fs.writeFileSync(buildPath, build, "utf8");
console.log("[AstroHogar] Final runtime hardening applied: activeUserName + Firestore revision hydration/retry.");
