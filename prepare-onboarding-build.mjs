import fs from "node:fs";

const buildPath = "build-server.mjs";
let source = fs.readFileSync(buildPath, "utf8");

source = source.replace(
  'writeHomeDocument as __writeHomeDocument } from "./serverFirestoreRest";',
  'writeHomeDocument as __writeHomeDocument, readAccountHomeIndex as __readAccountHomeIndex } from "./serverFirestoreRest";'
);

const routes = [
  '// --- AstroHogar production onboarding routes ---',
  'app.get("/api/onboarding/detect-home", async (req, res) => {',
  '  try {',
  '    const authUser = req.authUser;',
  '    if (!authUser?.localId) return res.status(401).json({ error: "Autenticación requerida.", code: "AUTH_REQUIRED" });',
  '    const result = await __readAccountHomeIndex(authUser.localId);',
  '    return res.json({ homeCode: result.homeCode || null });',
  '  } catch (err) {',
  '    console.error("[Onboarding Detect Home]", err);',
  '    return res.status(500).json({ error: String(err?.message || err), code: "ONBOARDING_DETECT_FAILED" });',
  '  }',
  '});',
  '',
  'app.post("/api/onboarding/create-home", async (req, res) => {',
  '  try {',
  '    const body = req.body || {};',
  '    const userName = String(body.userName || "").trim();',
  '    const birthDate = String(body.birthDate || "").trim();',
  '    const email = String(body.email || req.headers["x-auth-email"] || "").trim();',
  '    if (!userName || !birthDate) return res.status(400).json({ error: "Faltan tu nombre y fecha de nacimiento.", code: "ONBOARDING_FIELDS_REQUIRED" });',
  '    let aiSigns;',
  '    try { aiSigns = await calculateAIOldCartaNatal(birthDate, "", ""); } catch (e) { console.warn("[Onboarding Create] Carta natal omitida", e); }',
  '    const result = onboardingCreateHome(String(body.homeName || "AstroHogar"), userName, birthDate, "", "", body.emoji, aiSigns, email);',
  '    const code = normalizeHomeCode(result?.home?.code || "");',
  '    if (!code) throw new Error("HOME_CODE_GENERATION_FAILED");',
  '    await __writeHomeDocument(code, { data: getStoreByCode(code) }, 0);',
  '    return res.status(201).json({ ...result, homeCode: code });',
  '  } catch (err) {',
  '    console.error("[Onboarding Create]", err);',
  '    return res.status(500).json({ error: String(err?.message || err), code: "ONBOARDING_CREATE_FAILED" });',
  '  }',
  '});',
  '',
  'app.post("/api/onboarding/join-home", async (req, res) => {',
  '  try {',
  '    const body = req.body || {};',
  '    const code = normalizeHomeCode(String(body.inviteCode || ""));',
  '    if (!code) return res.status(400).json({ error: "Se requiere un código de hogar para ingresar.", code: "INVITE_CODE_REQUIRED" });',
  '    if (!doesHomeExist(code)) return res.status(404).json({ error: "El código de invitación ingresado no existe.", code: "HOME_NOT_FOUND" });',
  '    let aiSigns;',
  '    try { aiSigns = await calculateAIOldCartaNatal(String(body.birthDate || ""), "", ""); } catch {}',
  '    const result = homeContextStorage.run(code, () => onboardingJoinHome(String(body.userName || "").trim(), String(body.birthDate || ""), "", "", body.emoji, aiSigns, String(body.email || req.headers["x-auth-email"] || "").trim()));',
  '    await __writeHomeDocument(code, { data: getStoreByCode(code) });',
  '    return res.json({ ...result, homeCode: code });',
  '  } catch (err) {',
  '    console.error("[Onboarding Join]", err);',
  '    return res.status(500).json({ error: String(err?.message || err), code: "ONBOARDING_JOIN_FAILED" });',
  '  }',
  '});',
  '// --- End AstroHogar production onboarding routes ---',
].join("\n");

const statement = `transformedServer = transformedServer.replace("// REST API Routes", ${JSON.stringify(routes + "\n// REST API Routes")});\n`;
if (!source.includes("onboarding/detect-home")) {
  const marker = 'fs.writeFileSync(serverTempPath, transformedServer, "utf8");';
  if (!source.includes(marker)) throw new Error("No se encontró el punto de inyección de build-server.mjs");
  source = source.replace(marker, statement + marker);
}

fs.writeFileSync(buildPath, source, "utf8");
console.log("[AstroHogar] Onboarding production patch prepared.");
