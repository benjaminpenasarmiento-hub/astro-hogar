import fs from "node:fs";
import { execFileSync } from "node:child_process";

const sourcePath = "server.ts";
const serverTempPath = "server.vercel.ts";
const storeTempPath = "serverStore.vercel.ts";

function replaceFunction(source, functionName, replacement) {
  const marker = `export function ${functionName}`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`No se encontró ${marker}`);
  const bodyStart = source.indexOf("{", start);
  if (bodyStart === -1) throw new Error(`No se encontró el cuerpo de ${functionName}`);
  let depth = 0;
  let inString = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = bodyStart; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (inLineComment) { if (ch === "\n") inLineComment = false; continue; }
    if (inBlockComment) { if (ch === "*" && next === "/") { inBlockComment = false; i++; } continue; }
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { inString = ch; continue; }
    if (ch === "/" && next === "/") { inLineComment = true; i++; continue; }
    if (ch === "/" && next === "*") { inBlockComment = true; i++; continue; }
    if (ch === "{") depth++;
    if (ch === "}") { depth--; if (depth === 0) return source.slice(0, start) + replacement + source.slice(i + 1); }
  }
  throw new Error(`No se pudo cerrar la función ${functionName}`);
}

const serverSource = fs.readFileSync(sourcePath, "utf8");
let storeSource = fs.readFileSync("serverStore.ts", "utf8");

storeSource = storeSource.replace(
  'const DB_FILE = path.join(process.cwd(), "db_sim.json");',
  'const DB_FILE = process.env.VERCEL === "1" ? path.join("/tmp", "astrohogar-production-empty.json") : path.join(process.cwd(), "db_sim.json");'
);
storeSource = storeSource.replace(
  'deleteDoc } from "firebase/firestore";',
  'deleteDoc } from "firebase/firestore";\nimport { readHomeDocument, writeHomeDocument } from "./serverFirestoreRest";'
);
storeSource = storeSource.replace(
  'return homeContextStorage.getStore() || "HOGARPELUDO"; // fallback code during bootstrap',
  'return homeContextStorage.getStore() || "";'
);
storeSource = storeSource.replace('if (!code) return "NIDO-YCV5W";', 'if (!code) return "";');
storeSource = storeSource.replace(
  'if (clean === "HOGARPELUDO" || clean === "HOGAR-PELUDO" || clean === "NIDO-HOGARPELUDO" || clean === "HOGAR PELUDO") {\n    return "NIDO-YCV5W";\n  }',
  'if (clean === "HOGARPELUDO" || clean === "HOGAR-PELUDO" || clean === "NIDO-HOGARPELUDO" || clean === "HOGAR PELUDO" || clean === "NIDO-YCV5W") {\n    return "";\n  }'
);
storeSource = storeSource.replace(
  'const cleanCode = normalizeHomeCode(code);\n  if (!multiStore[cleanCode]) {',
  'const cleanCode = normalizeHomeCode(code);\n  if (!cleanCode) throw new Error("HOME_CONTEXT_MISSING");\n  if (!multiStore[cleanCode]) {'
);
storeSource = storeSource.replace(
  'multiStore[cleanCode].home.name = `Hogar de Mafe y Benjamin`;',
  'multiStore[cleanCode].home.name = "";'
);
storeSource = storeSource.replace(/\n  \/\/ Dynamic seed \/ recovery for any home partition that has no users[\s\S]*?\n  return multiStore\[cleanCode\];/, '\n  return multiStore[cleanCode];');
storeSource = storeSource.replace(
  'export async function restoreFromFirestore() {\n  if (!firestore || isFirestoreQuotaExhausted) return;',
  'export async function restoreFromFirestore() {\n  if (process.env.VERCEL === "1") return;\n  if (!firestore || isFirestoreQuotaExhausted) return;'
);

const productionPersistenceHelpers = `\n\nexport let pendingPersistence: Promise<void> = Promise.resolve();\nconst observedFirestoreRevisions = new Map<string, number>();\n\nexport function getPendingPersistence(): Promise<void> { return pendingPersistence; }\n\nexport async function refreshActiveHomeFromFirestore(code: string): Promise<void> {\n  if (process.env.VERCEL !== "1") return;\n  const cleanCode = normalizeHomeCode(code || getActiveHomeCode());\n  if (!cleanCode) return;\n  try {\n    const snapshot = await readHomeDocument(cleanCode);\n    if (!snapshot.exists) {\n      observedFirestoreRevisions.set(cleanCode, 0);\n      return;\n    }\n    const remote = snapshot.data || {};\n    observedFirestoreRevisions.set(cleanCode, Number(remote.syncRevision || 0));\n    if (remote.data) multiStore[cleanCode] = sanitizeStoreData(remote.data as DBStore);\n  } catch (err) {\n    console.error("[Firestore Sync] Error refreshing active home:", err);\n  }\n}\n\nexport function getObservedFirestoreRevision(code: string): number {\n  return observedFirestoreRevisions.get(normalizeHomeCode(code)) ?? 0;\n}\n`;
storeSource = storeSource.replace("export let firestore: Firestore | null = null;", "export let firestore: Firestore | null = null;" + productionPersistenceHelpers);

const productionSaveToDisk = `export function saveToDisk() {\n  if (process.env.VERCEL !== "1") {\n    try { fs.writeFileSync(DB_FILE, JSON.stringify(multiStore, null, 2), "utf8"); hasUnsyncedChanges = true; }\n    catch (err) { console.error("Error saving database to disk db_sim.json:", err); }\n    if (!firestore || isFirestoreQuotaExhausted) return;\n    if (firestoreSaveTimer) clearTimeout(firestoreSaveTimer);\n    firestoreSaveTimer = setTimeout(() => { saveToFirestore(); }, 5000);\n    return;\n  }\n  hasUnsyncedChanges = true;\n  const active = normalizeHomeCode(getActiveHomeCode());\n  const target = active || "";\n  if (!target) return;\n  pendingPersistence = pendingPersistence.catch(() => {}).then(() => saveToFirestore([target]));\n}`;
storeSource = replaceFunction(storeSource, "saveToDisk", productionSaveToDisk);
storeSource = storeSource.replace("export async function saveToFirestore()", "export async function saveToFirestoreLegacy()");
storeSource += `\n\nexport async function saveToFirestore(targetCodes: string[] = []) {\n  if (process.env.VERCEL !== "1") return saveToFirestoreLegacy();\n  if (isFirestoreQuotaExhausted) return;\n  pendingWritesCount++;\n  try {\n    for (const code of targetCodes) {\n      const cleanCode = normalizeHomeCode(code);\n      if (!cleanCode || !multiStore[cleanCode]) continue;\n      const dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));\n      const expectedRevision = getObservedFirestoreRevision(cleanCode);\n      const nextRevision = await writeHomeDocument(cleanCode, { data: dataCopy }, expectedRevision);\n      observedFirestoreRevisions.set(cleanCode, nextRevision);\n    }\n    lastSuccessfulSyncTime = new Date().toISOString();\n    lastSyncError = null;\n    hasUnsyncedChanges = false;\n  } catch (err: any) {\n    if (!handleQuotaError(err, "authenticated REST saveToFirestore")) {\n      lastSyncError = err?.message || "Error al sincronizar con Firestore";\n      console.error("[Firestore Sync] Error en persistencia autenticada:", err);\n    }\n  } finally {\n    pendingWritesCount = Math.max(0, pendingWritesCount - 1);\n  }\n}\n`;

// Defensive, idempotent cleanup: older automated passes may have inserted this helper twice.
storeSource = storeSource.replace(/(const UNSCOPED_STORE: DBStore = JSON\.parse\(JSON\.stringify\(INITIAL_DATA\)\);\n\s*)+/g, 'const UNSCOPED_STORE: DBStore = JSON.parse(JSON.stringify(INITIAL_DATA));\n\n');

fs.writeFileSync(storeTempPath, storeSource, "utf8");

let transformedServer = serverSource.replaceAll('"./serverStore"', '"./serverStore.vercel"');
transformedServer = transformedServer.replace('  loadDatabase,', '  refreshActiveHomeFromFirestore,\n  getPendingPersistence,\n  loadDatabase,');
transformedServer = `import { requireFirebaseAuth as __requireFirebaseAuth } from "./serverAuthMiddleware";\nimport { requireFirebaseAuth as __requireFirebaseAuthDirect } from "./serverAuthMiddleware";\nimport { runWithFirestoreAuthToken as __runWithFirestoreAuthToken, writeHomeDocument as __writeHomeDocument } from "./serverFirestoreRest";\n${transformedServer}`;

const safePartitionMiddleware = `app.use((req, res, next) => {\n  const rawHomeCode = String(req.headers["x-home-code"] || "").trim();\n  const onboardingCreate = req.path === "/api/onboarding/create-home";\n  const onboardingJoin = req.path === "/api/onboarding/join-home";\n  const onboardingEnter = req.path === "/api/onboarding/enter-home";\n  if (!rawHomeCode && !onboardingCreate && !onboardingJoin && !onboardingEnter && req.path !== "/api/health" && req.path !== "/health") {\n    return res.status(400).json({ error: "No hay un hogar activo.", code: "HOME_CONTEXT_REQUIRED" });\n  }\n  const bodyCode = onboardingJoin ? String(req.body?.inviteCode || "").trim() : "";\n  const homeCode = normalizeHomeCode(rawHomeCode || bodyCode);\n  if (!homeCode) return next();\n  homeContextStorage.run(homeCode, () => next());\n});`;
transformedServer = transformedServer.replace(/app\.use\(\(req, res, next\) => \{[\s\S]*?homeContextStorage\.run\(homeCode, \(\) => \{\s*next\(\);\s*\}\);\s*\}\);/, safePartitionMiddleware);

transformedServer = transformedServer.replace(/app\.post\("\/api\/force-firestore-sync", async \(req, res\) => \{[\s\S]*?\n\}\);/, `app.post("/api/force-firestore-sync", async (req, res) => {\n  try {\n    const code = normalizeHomeCode(String(req.headers["x-home-code"] || ""));\n    if (!code) return res.json({ success: true, skipped: true, reason: "HOME_CONTEXT_REQUIRED" });\n    await restoreFromFirestore();\n    return res.json({ success: true, store: getStore(), syncStatus: getSyncStatus() });\n  } catch (err: any) {\n    return res.status(500).json({ success: false, error: err?.message || "Error during sync" });\n  }\n});`);

transformedServer = transformedServer.replace(/app\.post\("\/api\/onboarding\/create-home", async \(req, res\) => \{[\s\S]*?\n\}\);/, `app.post("/api/onboarding/create-home", async (req, res) => {\n  try {\n    const { homeName, userName, email, birthDate, birthTime, birthPlace, emoji } = req.body;\n    if (!userName?.trim() || !birthDate) return res.status(400).json({ error: "Faltan tu nombre y fecha de nacimiento." });\n    const aiSigns = await calculateAIOldCartaNatal(birthDate, birthTime, birthPlace);\n    const result = onboardingCreateHome((homeName || "AstroHogar").trim(), userName.trim(), birthDate, birthTime || "12:00", birthPlace || "", emoji, aiSigns || undefined, email || "");\n    await __writeHomeDocument(result.home.code, { data: getStoreByCode(result.home.code) }, 0);\n    return res.json(result);\n  } catch (err: any) {\n    console.error("[Onboarding Create]", err);\n    return res.status(500).json({ error: err?.message || "No se pudo crear el hogar." });\n  }\n});`);

transformedServer = transformedServer.replace(/app\.post\("\/api\/onboarding\/join-home", async \(req, res\) => \{[\s\S]*?\n\}\);/, `app.post("/api/onboarding/join-home", async (req, res) => {\n  try {\n    const { inviteCode, userName, email, birthDate, birthTime, birthPlace, emoji } = req.body;\n    const code = normalizeHomeCode(String(inviteCode || ""));\n    if (!code) return res.status(400).json({ error: "Se requiere un código de hogar para ingresar." });\n    if (!doesHomeExist(code)) return res.status(404).json({ error: "El código de invitación ingresado no existe." });\n    const aiSigns = await calculateAIOldCartaNatal(birthDate, birthTime, birthPlace);\n    const result = homeContextStorage.run(code, () => onboardingJoinHome(userName, birthDate, birthTime || "12:00", birthPlace || "", emoji, aiSigns || undefined, email || ""));\n    await __writeHomeDocument(code, { data: getStoreByCode(code) }, undefined);\n    return res.json(result);\n  } catch (err: any) {\n    console.error("[Onboarding Join]", err);\n    return res.status(500).json({ error: err?.message || "No se pudo unir al hogar." });\n  }\n});`);

if (!transformedServer.includes("startServer();")) throw new Error("No se encontró el arranque esperado de server.ts");
transformedServer = transformedServer.replace(/\nstartServer\(\);\s*$/, '\n\nexport { app, __requireFirebaseAuth, __runWithFirestoreAuthToken };\n\nif (process.env.VERCEL !== "1") startServer();\n');
fs.writeFileSync(serverTempPath, transformedServer, "utf8");

try {
  execFileSync("npx", ["esbuild", serverTempPath, "--bundle", "--platform=node", "--format=cjs", "--packages=external", "--sourcemap", "--outfile=dist/server.cjs"], { stdio: "inherit" });
} finally {
  fs.rmSync(serverTempPath, { force: true });
  fs.rmSync(storeTempPath, { force: true });
}
