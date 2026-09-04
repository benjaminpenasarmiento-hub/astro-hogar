import fs from "node:fs";

const buildPath = "build-server.mjs";
let build = fs.readFileSync(buildPath, "utf8");

const marker = "ASTRO_PERSISTENCE_ROOT_FIX_V2";
if (build.includes(marker)) {
  console.log("[AstroHogar] Persistence root fix already installed; skipping.");
  process.exit(0);
}

const helperStart = build.indexOf("const productionPersistenceHelpers = `");
if (helperStart === -1) {
  console.warn("[AstroHogar] productionPersistenceHelpers not found; leaving build unchanged.");
  process.exit(0);
}
const helperEnd = build.indexOf("`;", helperStart);
if (helperEnd === -1) {
  console.warn("[AstroHogar] productionPersistenceHelpers closing marker not found; leaving build unchanged.");
  process.exit(0);
}

let helper = build.slice(helperStart, helperEnd + 2);

// The old implementation refreshed the remote home before every save. That can
// overwrite the freshly-mutated in-memory store with the previous Firestore state.
const refreshExact = "      // Always establish the current remote revision before the first write.\\n      await refreshActiveHomeFromFirestore(cleanCode);";
if (helper.includes(refreshExact)) {
  helper = helper.replace(
    refreshExact,
    "      // Hydration happens before the mutation. Never replace the pending local mutation here.\\n      if (!observedFirestoreRevisions.has(cleanCode)) {\\n        await refreshActiveHomeFromFirestore(cleanCode);\\n      }"
  );
} else if (!helper.includes("Never replace the pending local mutation here.")) {
  console.warn("[AstroHogar] Pre-write hydration pattern already changed; continuing without replacement.");
}

// On a revision conflict, preserve the pending local snapshot and merge it with the
// newest remote state instead of discarding the local mutation.
const conflictExact = "        await refreshActiveHomeFromFirestore(cleanCode);\\n        expectedRevision = getObservedFirestoreRevision(cleanCode);\\n        dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));\\n        nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);";
if (helper.includes(conflictExact)) {
  helper = helper.replace(
    conflictExact,
    "        const latestRemote = await readHomeDocument(cleanCode);\\n        const latestRevision = Number(latestRemote.data?.syncRevision || 0);\\n        const remoteStore = latestRemote.data?.data;\\n        if (remoteStore && dataCopy) {\\n          dataCopy = JSON.parse(JSON.stringify(mergePersistenceStores(remoteStore, dataCopy)));\\n        }\\n        expectedRevision = latestRevision;\\n        nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);"
  );
} else if (!helper.includes("mergePersistenceStores(remoteStore, dataCopy)")) {
  console.warn("[AstroHogar] Conflict retry pattern already changed; continuing without replacement.");
}

// Generic preservation merge for array-backed modules. New local IDs replace any
// same-ID remote item, while unrelated remote records survive the write.
const saveAnchor = "export async function saveToFirestore(targetCodes: string[] = []) {";
if (!helper.includes("function mergePersistenceStores(") && helper.includes(saveAnchor)) {
  const mergeHelper = `function mergePersistenceStores(remoteStore: any, localStore: any): any {\\n  if (!remoteStore || typeof remoteStore !== "object") return localStore;\\n  if (!localStore || typeof localStore !== "object") return remoteStore;\\n  const merged: any = { ...remoteStore, ...localStore };\\n  const arrayKeys = [\\n    "users", "calendarItems", "pets", "plants", "wishes", "memories", "documents",\\n    "checkins", "budgetItems", "budgetEstimates", "budgetTemplates", "budgetAccounts",\\n    "dailyPools", "dailyAnswers", "saludChallenges", "frascoMessages", "cierresMensuales",\\n    "workoutLogs", "notifications", "emotionCheckins", "customEmotions", "workoutRoutines",\\n    "workoutDetailedLogs", "bodyMetrics", "personalRecords", "customExercises",\\n    "closetGarments", "closetCategories", "savedOutfits", "wornOutfitLogs",\\n    "closedFortnights", "auditLogs"\\n  ];\\n  for (const key of arrayKeys) {\\n    if (!Array.isArray(remoteStore[key]) && !Array.isArray(localStore[key])) continue;\\n    const byId = new Map<string, any>();\\n    for (const item of remoteStore[key] || []) {\\n      const id = String(item?.id ?? JSON.stringify(item));\\n      byId.set(id, item);\\n    }\\n    for (const item of localStore[key] || []) {\\n      const id = String(item?.id ?? JSON.stringify(item));\\n      byId.set(id, item);\\n    }\\n    merged[key] = [...byId.values()];\\n  }\\n  if (remoteStore.home || localStore.home) merged.home = { ...(remoteStore.home || {}), ...(localStore.home || {}) };\\n  return merged;\\n}\\n\\n`;
  const idx = helper.indexOf(saveAnchor);
  helper = helper.slice(0, idx) + mergeHelper + helper.slice(idx);
}

build = build.slice(0, helperStart) + helper + build.slice(helperEnd + 2);
build = build.replace("const transformedServerAnchor = 'const app = express();';", `const transformedServerAnchor = 'const app = express();';\\n// ${marker}`);
fs.writeFileSync(buildPath, build, "utf8");
console.log("[AstroHogar] Persistence root fix installed: local mutations are preserved before Firestore writes.");
