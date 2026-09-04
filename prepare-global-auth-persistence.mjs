import fs from "node:fs";

const buildPath = "build-server.mjs";
let build = fs.readFileSync(buildPath, "utf8");

const marker = "ASTRO_GLOBAL_FIREBASE_AUTH_V2";
if (!build.includes(marker)) {
  const finalizationAnchor = 'if (!transformedServer.includes("startServer();")) throw new Error("No se encontró el arranque esperado de server.ts");';
  const injection = `const globalAuthAnchor = 'app.use(express.urlencoded({ limit: "50mb", extended: true }));';
if (!transformedServer.includes("${marker}")) {
  if (!transformedServer.includes(globalAuthAnchor)) {
    throw new Error("[AstroHogar] No se encontró el parser de Express para instalar Auth global.");
  }
  const globalAuthBlock = globalAuthAnchor + `\\n\\n// ${marker}\\n// Centraliza autenticación Firebase y el token de Firestore para TODAS las APIs.\\n// Las rutas de health/onboarding están exceptuadas por serverAuthMiddleware.\\napp.use("/api", __requireFirebaseAuthDirect);`;
  transformedServer = transformedServer.replace(globalAuthAnchor, globalAuthBlock);
}
`;
  if (!build.includes(finalizationAnchor)) {
    throw new Error("[AstroHogar] No se encontró el ancla final de transformedServer.");
  }
  build = build.replace(finalizationAnchor, injection + "\n" + finalizationAnchor);
}

fs.writeFileSync(buildPath, build, "utf8");
console.log("[AstroHogar] Global Firebase Auth persistence context installed.");
