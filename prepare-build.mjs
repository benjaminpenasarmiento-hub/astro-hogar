import fs from "node:fs";

const buildPath = "build-server.mjs";
let buildSource = fs.readFileSync(buildPath, "utf8");

const marker = 'fs.writeFileSync(serverTempPath, transformedServer, "utf8");';
if (!buildSource.includes(marker)) {
  throw new Error("No se encontró el punto de inyección de build-server.mjs");
}

const injection = String.raw`

// Production onboarding hardening: inject these routes before the legacy handlers.
const onboardingRoutes = \`\n// --- AstroHogar production onboarding routes ---\napp.get("/api/onboarding/detect-home", async (req, res) => {\n  try {\n    const authUser = req.authUser;\n    if (!authUser?.localId) return res.status(401).json({ error: "Autenticación requerida.", code: "AUTH_REQUIRED" });\n    const index = await __readAccountHomeIndex(authUser.localId);\n    return res.json({ homeCode: index.homeCode || null });\n  } catch (err: any) {\n    console.error("[Onboarding Detect Home]", err);\n    return res.status(500).json({ error: err?.message || "No se pudo detectar el hogar." });\n  }\n});\n\napp.post("/api/onboarding/create-home", async (req, res) => {\n  try {\n    const { homeName, userName, email, birthDate, emoji } = req.body || {};\n    if (!String(userName || "").trim() || !String(birthDate || "").trim()) {\n      return res.status(400).json({ error: "Faltan tu nombre y fecha de nacimiento." });\n    }\n\n    let aiSigns: any = undefined;\n    try {\n      aiSigns = await calculateAIOldCartaNatal(String(birthDate), "", "");\n    } catch (aiError) {\n      console.warn("[Onboarding Create] Carta natal no disponible; continuando sin IA:", aiError);\n    }\n\n    const result = onboardingCreateHome(\n      String(homeName || "AstroHogar"),\n      String(userName).trim(),\n      String(birthDate),\n      "",\n      "",\n      emoji,\n      aiSigns || undefined,\n      email || req.headers["x-auth-email"] || ""\n    );\n\n    const code = normalizeHomeCode(result?.home?.code || "");\n    if (!code) throw new Error("HOME_CODE_GENERATION_FAILED");\n\n    await __writeHomeDocument(code, { data: getStoreByCode(code) }, 0);\n    return res.status(201).json({ ...result, homeCode: code });\n  } catch (err: any) {\n    console.error("[Onboarding Create]", err);\n    return res.status(500).json({ error: err?.message || "No se pudo crear el hogar.", code: "ONBOARDING_CREATE_FAILED" });\n  }\n});\n\napp.post("/api/onboarding/join-home", async (req, res) => {\n  try {\n    const { inviteCode, userName, email, birthDate, emoji } = req.body || {};\n    const code = normalizeHomeCode(String(inviteCode || ""));\n    if (!code) return res.status(400).json({ error: "Se requiere un código de hogar para ingresar." });\n    if (!doesHomeExist(code)) return res.status(404).json({ error: "El código de invitación ingresado no existe." });\n\n    const aiSigns = await calculateAIOldCartaNatal(String(birthDate || ""), "", "").catch(() => undefined);\n    const result = homeContextStorage.run(code, () => onboardingJoinHome(String(userName || "").trim(), String(birthDate || ""), "", "", emoji, aiSigns, email || req.headers["x-auth-email"] || ""));\n    await __writeHomeDocument(code, { data: getStoreByCode(code) });\n    return res.json({ ...result, homeCode: code });\n  } catch (err: any) {\n    console.error("[Onboarding Join]", err);\n    return res.status(500).json({ error: err?.message || "No se pudo unir al hogar.", code: "ONBOARDING_JOIN_FAILED" });\n  }\n});\n// --- End AstroHogar production onboarding routes ---\n\`;

buildSource = buildSource.replace(
  'transformedServer = `import { requireFirebaseAuth as __requireFirebaseAuth } from "./serverAuthMiddleware";\\nimport { requireFirebaseAuth as __requireFirebaseAuthDirect } from "./serverAuthMiddleware";\\nimport { runWithFirestoreAuthToken as __runWithFirestoreAuthToken, writeHomeDocument as __writeHomeDocument } from "./serverFirestoreRest";\\n${transformedServer}`;',
  'transformedServer = `import { requireFirebaseAuth as __requireFirebaseAuth } from "./serverAuthMiddleware";\\nimport { requireFirebaseAuth as __requireFirebaseAuthDirect } from "./serverAuthMiddleware";\\nimport { runWithFirestoreAuthToken as __runWithFirestoreAuthToken, writeHomeDocument as __writeHomeDocument, readAccountHomeIndex as __readAccountHomeIndex } from "./serverFirestoreRest";\\n${transformedServer}`;'
);

const injectionCode = `\nconst onboardingRoutes = ${JSON.stringify("PLACEHOLDER")};\n`;

// Inject executable route text using a template literal generated above.
const executable = `\nconst onboardingRoutes = String.raw\`${String.raw`${injection}`.replace(/`/g, "\\`").replace(/\\\\`/g, "\\`")}\`;\ntransformedServer = transformedServer.replace("// REST API Routes", onboardingRoutes + "\\n// REST API Routes");\n`;

buildSource = buildSource.replace(marker, executable + marker);
fs.writeFileSync(buildPath, buildSource, "utf8");

console.log("[AstroHogar] Production onboarding routes hardened before server build.");
