import fs from "node:fs";

const storePath = "serverStore.ts";
let store = fs.readFileSync(storePath, "utf8");

// Never erase existing budget accounts merely because the legacy seed flag is false.
// Older Firestore documents may legitimately have accounts but no hasSeededAccounts flag.
const destructiveBudgetSeed = `  if (!currentStore.hasSeededAccounts) {\n    currentStore.budgetAccounts = [];\n    currentStore.hasSeededAccounts = true;\n    saveToDisk();\n  }`;
const safeBudgetSeed = `  if (!currentStore.hasSeededAccounts) {\n    currentStore.hasSeededAccounts = true;\n    saveToDisk();\n  }`;
if (store.includes(destructiveBudgetSeed)) {
  store = store.replace(destructiveBudgetSeed, safeBudgetSeed);
}
fs.writeFileSync(storePath, store, "utf8");

const buildPath = "build-server.mjs";
let build = fs.readFileSync(buildPath, "utf8");

const barrierMarker = "ASTRO_PERSISTENCE_RESPONSE_BARRIER_V1";
if (!build.includes(barrierMarker)) {
  const appAnchor = "const app = express();";
  const barrier = `${appAnchor}\n\n// ${barrierMarker}\n// In Vercel, mutation endpoints must wait for Firestore persistence before the response\n// is sent. Otherwise the serverless invocation may finish before the queued write lands.\napp.use((req, res, next) => {\n  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();\n\n  const originalJson = res.json.bind(res);\n  const originalSend = res.send.bind(res);\n  const waitForPersistence = () => getPendingPersistence().catch((error) => {\n    console.error("[AstroHogar] Persistence barrier error:", error);\n  });\n\n  res.json = ((body) => waitForPersistence().then(() => originalJson(body)));\n  res.send = ((body) => waitForPersistence().then(() => originalSend(body)));\n  next();\n});`;
  if (!build.includes(appAnchor)) throw new Error("No se encontró const app = express() en build-server.mjs");
  build = build.replace(appAnchor, barrier);
}

fs.writeFileSync(buildPath, build, "utf8");
console.log("[AstroHogar] Persistence repair prepared: budget accounts are non-destructive and mutation responses await Firestore persistence.");
