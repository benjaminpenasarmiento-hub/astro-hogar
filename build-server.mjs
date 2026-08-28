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

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(0, start) + replacement + source.slice(i + 1);
    }
  }
  throw new Error(`No se pudo cerrar la función ${functionName}`);
}

const serverSource = fs.readFileSync(sourcePath, "utf8");
let storeSource = fs.readFileSync("serverStore.ts", "utf8");

// Production persistence adapter: Firestore is the authoritative copy on Vercel.
const persistenceHelpers = `\n\nexport let pendingPersistence: Promise<void> = Promise.resolve();\n\nexport function getPendingPersistence(): Promise<void> {\n  return pendingPersistence;\n}\n\nexport async function refreshActiveHomeFromFirestore(code: string): Promise<void> {\n  if (!firestore || process.env.VERCEL !== "1") return;\n  const cleanCode = normalizeHomeCode(code || getActiveHomeCode());\n  try {\n    const snapshot = await getDoc(doc(firestore, "nests", cleanCode));\n    if (snapshot.exists()) {\n      const remoteData = snapshot.data()?.data;\n      if (remoteData) multiStore[cleanCode] = sanitizeStoreData(remoteData as DBStore);\n    }\n  } catch (err) {\n    console.error("[Firestore Sync] Error refreshing active home:", err);\n  }\n}\n`;

const saveToDiskReplacement = `export function saveToDisk() {\n  if (process.env.VERCEL !== "1") {\n    try {\n      fs.writeFileSync(DB_FILE, JSON.stringify(multiStore, null, 2), "utf8");\n      hasUnsyncedChanges = true;\n    } catch (err) {\n      console.error("Error saving database to disk db_sim.json:", err);\n    }\n\n    if (!firestore || isFirestoreQuotaExhausted) {\n      if (isFirestoreQuotaExhausted && quotaExhaustedAt) {\n        const elapsed = Date.now() - quotaExhaustedAt;\n        if (elapsed >= QUOTA_COOLDOWN_MS) {\n          isFirestoreQuotaExhausted = false;\n          quotaExhaustedAt = null;\n        } else return;\n      } else return;\n    }\n\n    if (firestoreSaveTimer) clearTimeout(firestoreSaveTimer);\n    firestoreSaveTimer = setTimeout(() => { saveToFirestore(); }, 5000);\n    return;\n  }\n\n  if (!firestore) {\n    lastSyncError = "Firestore no está inicializado en producción.";\n    hasUnsyncedChanges = true;\n    return;\n  }\n\n  hasUnsyncedChanges = true;\n  pendingPersistence = pendingPersistence\n    .catch(() => {})\n    .then(async () => {\n      await saveToFirestore();\n      if (lastSyncError || isFirestoreQuotaExhausted) {\n        throw new Error(lastSyncError || "Firestore no confirmó la sincronización");\n      }\n    });\n}`;

storeSource = storeSource.replace(
  "export let firestore: Firestore | null = null;",
  "export let firestore: Firestore | null = null;" + persistenceHelpers
);
storeSource = replaceFunction(storeSource, "saveToDisk", saveToDiskReplacement);
fs.writeFileSync(storeTempPath, storeSource, "utf8");

let transformedServer = serverSource
  .replaceAll('"./serverStore"', '"./serverStore.vercel"')
  .replace("  loadDatabase,", "  refreshActiveHomeFromFirestore,\n  getPendingPersistence,\n  loadDatabase,");

const persistenceMiddleware = `\n\n// Production consistency layer: hydrate from Firestore before each request\n// and wait for persistence before the response is completed.\napp.use(async (req: any, res: any, next: any) => {\n  const homeCode = String(req.headers["x-home-code"] || "HOGARPELUDO");\n  await refreshActiveHomeFromFirestore(homeCode);\n\n  const originalEnd = res.end.bind(res);\n  res.end = (...args: any[]) => {\n    getPendingPersistence()\n      .then(() => originalEnd(...args))\n      .catch((error: any) => {\n        console.error("[Firestore Sync] Persistence failed before response:", error);\n        if (!res.headersSent) {\n          res.statusCode = 503;\n          res.setHeader("content-type", "application/json");\n          originalEnd(JSON.stringify({ error: "No se pudo confirmar la sincronización con Firestore." }));\n        } else {\n          originalEnd(...args);\n        }\n      });\n    return res;\n  };\n\n  next();\n});\n`;

transformedServer = transformedServer.replace(
  "const app = express();",
  "const app = express();" + persistenceMiddleware
);

if (!transformedServer.includes("startServer();")) {
  throw new Error("No se encontró el arranque esperado de server.ts");
}

transformedServer = transformedServer.replace(
  /\nstartServer\(\);\s*$/,
  `\n\n// Vercel exports the Express app as a serverless function.\nexport { app };\n\nif (process.env.VERCEL !== "1") {\n  startServer();\n}\n`
);

fs.writeFileSync(serverTempPath, transformedServer, "utf8");

try {
  execFileSync("npx", [
    "esbuild",
    serverTempPath,
    "--bundle",
    "--platform=node",
    "--format=cjs",
    "--packages=external",
    "--sourcemap",
    "--outfile=dist/server.cjs"
  ], { stdio: "inherit" });
} finally {
  fs.rmSync(serverTempPath, { force: true });
  fs.rmSync(storeTempPath, { force: true });
}
