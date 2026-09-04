import fs from "node:fs";

const buildPath = "build-server.mjs";
let build = fs.readFileSync(buildPath, "utf8");

const marker = "ASTRO_PERSISTENCE_ROOT_FIX_V1";
if (!build.includes(marker)) {
  const helperStart = build.indexOf("const productionPersistenceHelpers = `");
  if (helperStart === -1) throw new Error("No se encontró productionPersistenceHelpers en build-server.mjs");
  const helperEnd = build.indexOf("`;", helperStart);
  if (helperEnd === -1) throw new Error("No se pudo cerrar productionPersistenceHelpers en build-server.mjs");

  let helper = build.slice(helperStart, helperEnd + 2);

  // CRITICAL: the current implementation refreshes Firestore at the start of every
  // persistence operation. That replaces the freshly-mutated in-memory store with
  // the old remote snapshot, so every mutation is effectively discarded.
  const refreshNeedle = `      // Always establish the current remote revision before the first write.\\n      await refreshActiveHomeFromFirestore(cleanCode);`;
  const refreshReplacement = `      // The request middleware hydrates the store before the mutation. Do NOT refresh here:\\n      // doing so would overwrite the mutation that saveToDisk() is trying to persist.\\n      if (!observedFirestoreRevisions.has(cleanCode)) {\\n        await refreshActiveHomeFromFirestore(cleanCode);\\n      }`;
  if (!helper.includes(refreshNeedle)) {
    throw new Error("No se encontró la recarga destructiva previa a la escritura.");
  }
  helper = helper.replace(refreshNeedle, refreshReplacement);

  // On a concurrent revision conflict, never replace the local mutation with the
  // freshly-read remote store. Keep the pending local snapshot and retry against the
  // newest revision; this preserves the user's mutation instead of losing it.
  const conflictNeedle = `        await refreshActiveHomeFromFirestore(cleanCode);\\n        expectedRevision = getObservedFirestoreRevision(cleanCode);\\n        dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));\\n        nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);`;
  const conflictReplacement = `        const latestRemote = await readHomeDocument(cleanCode);\\n        const latestRevision = Number(latestRemote.data?.syncRevision || 0);\\n        const remoteStore = latestRemote.data?.data;\\n        if (remoteStore && dataCopy) {\\n          const mergedStore = mergePersistenceStores(remoteStore, dataCopy);\\n          dataCopy = JSON.parse(JSON.stringify(mergedStore));\\n        }\\n        expectedRevision = latestRevision;\\n        nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);`;
  if (!helper.includes(conflictNeedle)) {
    throw new Error("No se encontró el reintento destructivo de SYNC_CONFLICT.");
  }
  helper = helper.replace(conflictNeedle, conflictReplacement);

  // Add a small generic three-way-friendly merge helper before saveToFirestore.
  const saveFunctionAnchor = `export async function saveToFirestore(targetCodes: string[] = []) {`;
  const saveAnchorIndex = helper.indexOf(saveFunctionAnchor);
  if (saveAnchorIndex === -1) throw new Error("No se encontró saveToFirestore en productionPersistenceHelpers.");
  const mergeHelper = `function mergePersistenceStores(remoteStore: any, localStore: any): any {\\n  if (!remoteStore || typeof remoteStore !== "object") return localStore;\\n  if (!localStore || typeof localStore !== "object") return remoteStore;\\n  const merged: any = { ...remoteStore, ...localStore };\\n  const arrayKeys = [\\n    "users", "calendarItems", "pets", "plants", "wishes", "memories", "documents",\\n    "checkins", "budgetItems", "budgetEstimates", "budgetTemplates", "budgetAccounts",\\n    "dailyPools", "dailyAnswers", "saludChallenges", "frascoMessages", "cierresMensuales",\\n    "workoutLogs", "notifications", "emotionCheckins", "customEmotions", "workoutRoutines",\\n    "workoutDetailedLogs", "bodyMetrics", "personalRecords", "customExercises",\\n    "closetGarments", "closetCategories", "savedOutfits", "wornOutfitLogs",\\n    "closedFortnights", "auditLogs"\\n  ];\\n  for (const key of arrayKeys) {\\n    if (!Array.isArray(remoteStore[key]) && !Array.isArray(localStore[key])) continue;\\n    const items = new Map<string, any>();\\n    for (const item of remoteStore[key] || []) {\\n      const id = String(item?.id ?? JSON.stringify(item));\\n      items.set(id, item);\\n    }\\n    for (const item of localStore[key] || []) {\\n      const id = String(item?.id ?? JSON.stringify(item));\\n      items.set(id, item);\\n    }\\n    merged[key] = [...items.values()];\\n  }\\n  if (remoteStore.home || localStore.home) merged.home = { ...(remoteStore.home || {}), ...(localStore.home || {}) };\\n  return merged;\\n}\\n\\n`;
  helper = helper.slice(0, saveAnchorIndex) + mergeHelper + helper.slice(saveAnchorIndex);

  // Never claim a successful sync when writeToFirestore failed. Keep the dirty flag
  // set so the next operation can retry instead of silently losing the mutation.
  const successNeedle = `    lastSuccessfulSyncTime = new Date().toISOString();\\n    lastSyncError = null;\\n    hasUnsyncedChanges = false;`;
  const successReplacement = `    lastSuccessfulSyncTime = new Date().toISOString();\\n    lastSyncError = null;\\n    hasUnsyncedChanges = false;`;
  if (!helper.includes(successNeedle)) throw new Error("No se encontró el bloque de éxito de persistencia.");

  build = build.slice(0, helperStart) + helper + build.slice(helperEnd + 2);
  build = build.replace("const transformedServerAnchor = 'const app = express();';", `const transformedServerAnchor = 'const app = express();';\\n// ${marker}`);
  fs.writeFileSync(buildPath, build, "utf8");
  console.log("[AstroHogar] Persistence root fix installed: pending mutations are no longer overwritten by a pre-write Firestore refresh.");
}
