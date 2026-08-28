import fs from "node:fs";
import { execFileSync } from "node:child_process";

const sourcePath = "server.ts";
const tempPath = "server.vercel.ts";

const source = fs.readFileSync(sourcePath, "utf8");

if (!source.includes("startServer();")) {
  throw new Error("No se encontró el arranque esperado de server.ts");
}

const transformed = source.replace(
  /\nstartServer\(\);\s*$/,
  `\n\n// Vercel exports the Express app as a serverless function.\nexport { app };\n\nif (process.env.VERCEL !== "1") {\n  startServer();\n}\n`
);

fs.writeFileSync(tempPath, transformed, "utf8");

try {
  execFileSync("npx", [
    "esbuild",
    tempPath,
    "--bundle",
    "--platform=node",
    "--format=cjs",
    "--packages=external",
    "--sourcemap",
    "--outfile=dist/server.cjs"
  ], { stdio: "inherit" });
} finally {
  fs.rmSync(tempPath, { force: true });
}
