import fs from "node:fs";

const storePath = "serverStore.ts";
let store = fs.readFileSync(storePath, "utf8");

// Never erase existing budget accounts merely because the legacy seed flag is false.
const destructiveBudgetSeed = `  if (!currentStore.hasSeededAccounts) {\n    currentStore.budgetAccounts = [];\n    currentStore.hasSeededAccounts = true;\n    saveToDisk();\n  }`;
const safeBudgetSeed = `  if (!currentStore.hasSeededAccounts) {\n    currentStore.hasSeededAccounts = true;\n    saveToDisk();\n  }`;
if (store.includes(destructiveBudgetSeed)) store = store.replace(destructiveBudgetSeed, safeBudgetSeed);
fs.writeFileSync(storePath, store, "utf8");

const buildPath = "build-server.mjs";
let build = fs.readFileSync(buildPath, "utf8");

const barrierMarker = "ASTRO_PERSISTENCE_RESPONSE_BARRIER_V2";
if (!build.includes(barrierMarker)) {
  const transformedServerAnchor = 'const app = express();';
  const barrier = `${transformedServerAnchor}\n\n// ${barrierMarker}\n// Mutation responses wait for the persistence queue. A failed Firestore write\n// is surfaced as HTTP 500 instead of returning a false success to the client.\napp.use((req, res, next) => {\n  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();\n\n  const originalJson = res.json.bind(res);\n  const originalSend = res.send.bind(res);\n  const waitForPersistence = () => getPendingPersistence();\n  let persistenceSettled = false;\n\n  const respondWithPersistence = (writer, body) => {\n    if (persistenceSettled) return;\n    persistenceSettled = true;\n    waitForPersistence()\n      .then(() => writer(body))\n      .catch((error) => {\n        console.error("[AstroHogar] Persistence barrier failed:", error);\n        if (!res.headersSent) {\n          res.status(500);\n          originalJson({ success: false, error: "No se pudo persistir el cambio en Firestore.", code: "PERSISTENCE_FAILED" });\n        }\n      });\n  };\n\n  res.json = ((body) => { respondWithPersistence(originalJson, body); return res; });\n  res.send = ((body) => { respondWithPersistence(originalSend, body); return res; });\n  next();\n});`;

  const finalizationAnchor = 'if (!transformedServer.includes("startServer();")) throw new Error("No se encontró el arranque esperado de server.ts");';
  const finalizationReplacement = `if (!transformedServer.includes("${barrierMarker}")) {\n  const persistenceBarrierAnchor = "const app = express();";\n  if (!transformedServer.includes(persistenceBarrierAnchor)) throw new Error("No se encontró const app = express() en el server generado.");\n  transformedServer = transformedServer.replace(persistenceBarrierAnchor, ${JSON.stringify(barrier)});\n}\n\n${finalizationAnchor}`;
  if (!build.includes(finalizationAnchor)) throw new Error("No se encontró el ancla de finalización de transformedServer en build-server.mjs");
  build = build.replace(finalizationAnchor, finalizationReplacement);
}

// Frasco: enforce the persistence barrier at the route itself as an additional
// guarantee. The generated production server already imports getPendingPersistence.
const frascoMarker = "ASTRO_FRASCO_PERSISTENCE_BARRIER_V1";
if (!build.includes(frascoMarker)) {
  const frascoOpen = 'app.post("/api/salud-hogar/frasco", (req, res) => {';
  const frascoAsyncOpen = `app.post("/api/salud-hogar/frasco", async (req, res) => {\n    // ${frascoMarker}`;
  if (build.includes(frascoOpen)) {
    build = build.replace(frascoOpen, frascoAsyncOpen);
  }
  const frascoSave = `    const msg = addFrascoMessage({ senderId, text, emoji });`;
  const frascoSaveWaited = `${frascoSave}\n    await getPendingPersistence();`;
  if (build.includes(frascoSave) && !build.includes(frascoSaveWaited)) {
    build = build.replace(frascoSave, frascoSaveWaited);
  }
}

fs.writeFileSync(buildPath, build, "utf8");
console.log("[AstroHogar] Persistence repair prepared: budget accounts are non-destructive, mutation responses fail loudly on persistence errors, and Frasco waits for Firestore persistence.");
