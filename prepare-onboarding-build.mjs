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

// Make Milo aware of the live household environment and the explicit things the household taught him.
const miloSummaryAnchor = 'const store = getStore();\n  const todayStr = new Date().toISOString().split(\'T\')[0];';
const miloSummaryReplacement = `const store = getStore();\n  const environmentUsers = (store.users || []).filter((u: any) => u?.environment?.latitude != null && u?.environment?.longitude != null);\n  const preferredEnvironment = environmentUsers[0]?.environment;\n  const liveLocation = preferredEnvironment\n    ? \`\${preferredEnvironment.label || "Ubicación actual"} (\${Number(preferredEnvironment.latitude).toFixed(4)}, \${Number(preferredEnvironment.longitude).toFixed(4)}, zona \${preferredEnvironment.timezone || "local"})\`\n    : (store.home?.address || "Ubicación del hogar aún no autorizada");\n  const miloLearningNotes = store.home?.settings?.miloLearningNotes || "Aún no hay instrucciones explícitas del hogar para Milo.";\n  const todayStr = new Date().toISOString().split('T')[0];`;
source = source.replace(miloSummaryAnchor, miloSummaryReplacement);
source = source.replace(
  'location: "Bogotá, Sabana de Bogotá (2.640 msnm, clima templado/fresco)",',
  'location: liveLocation,'
);
source = source.replace(
  '    frasco: frascoSummary\n',
  '    frasco: frascoSummary,\n    miloLearning: miloLearningNotes\n'
);

fs.writeFileSync(buildPath, source, "utf8");

// Inject account/data controls into the existing settings module at build time.
const settingsPath = "src/components/SettingsModule.tsx";
let settingsSource = fs.readFileSync(settingsPath, "utf8");
const accountImport = 'import AccountDataControls from "./AccountDataControls";';
const accountMarker = 'AccountDataControls homeCode={home?.code}';

if (!settingsSource.includes(accountMarker)) {
  const importAnchor = 'import { SyncStatusIndicator } from "./SyncStatusIndicator";';
  if (!settingsSource.includes(accountImport)) {
    if (!settingsSource.includes(importAnchor)) throw new Error("No se encontró el ancla de imports de SettingsModule");
    settingsSource = settingsSource.replace(importAnchor, `${importAnchor}\n${accountImport}`, 1);
  }

  const generalAnchor = '{activeSection === "general" ? (\n        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">';
  const generalReplacement = '{activeSection === "general" ? (\n        <div className="space-y-6">\n          {/* __ACCOUNT_DATA_CONTROLS_V1__ */}\n          <AccountDataControls homeCode={home?.code} onComplete={onRefreshData} />\n          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">';
  if (!settingsSource.includes(generalAnchor)) throw new Error("No se encontró el ancla de Ajustes Generales");
  settingsSource = settingsSource.replace(generalAnchor, generalReplacement, 1);

  const mobileBranch = '      ) : activeSection === "mobile" ? (';
  const branchIndex = settingsSource.indexOf(mobileBranch);
  if (branchIndex === -1) throw new Error("No se encontró la rama mobile de SettingsModule");
  const beforeBranch = settingsSource.slice(0, branchIndex).replace(/\s+$/, "");
  const afterBranch = settingsSource.slice(branchIndex);
  settingsSource = `${beforeBranch}\n        </div>\n${afterBranch}`;

  fs.writeFileSync(settingsPath, settingsSource, "utf8");
  console.log("[AstroHogar] Account/data controls injected into SettingsModule.");
}

// Inject live environment, current day, Milo learning and daily energy color into production UI.
const dashboardPath = "src/components/HomeDashboard.tsx";
let dashboardSource = fs.readFileSync(dashboardPath, "utf8");
if (!dashboardSource.includes('import HomeEnvironmentStrip from "./HomeEnvironmentStrip";')) {
  dashboardSource = dashboardSource.replace(
    'import { Avatar } from "./Avatar";',
    'import { Avatar } from "./Avatar";\nimport HomeEnvironmentStrip from "./HomeEnvironmentStrip";\nimport MiloLearningCard from "./MiloLearningCard";',
    1
  );
}
if (!dashboardSource.includes('<HomeEnvironmentStrip home={home}')) {
  dashboardSource = dashboardSource.replace(/return \(\n(\s*)<div([^>]*>)/, (match, indent, opening) => {
    return `return (\n${indent}<${"HomeEnvironmentStrip"} home={home} users={users} activeUserId={activeUserId} onRefreshAll={onRefreshAll} />\n${indent}<MiloLearningCard home={home} onRefreshAll={onRefreshAll} />\n${indent}<div${opening}`;
  }, 1);
}
fs.writeFileSync(dashboardPath, dashboardSource, "utf8");

const cosmosPath = "src/components/CosmosModule.tsx";
let cosmosSource = fs.readFileSync(cosmosPath, "utf8");
if (!cosmosSource.includes('import DailyEnergyColor from "./DailyEnergyColor";')) {
  cosmosSource = cosmosSource.replace(
    'import { Avatar } from "./Avatar";',
    'import { Avatar } from "./Avatar";\nimport DailyEnergyColor from "./DailyEnergyColor";',
    1
  );
}
if (!cosmosSource.includes('<DailyEnergyColor userId="hogar"')) {
  cosmosSource = cosmosSource.replace(
    '          {/* Horóscopos de los Inquilinos de la Casa */}',
    '          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">\n            {users.map((u) => <DailyEnergyColor key={`daily-color-${u.id}`} userId={String(u.id)} />)}\n          </div>\n\n          {/* Horóscopos de los Inquilinos de la Casa */}',
    1
  );
}
fs.writeFileSync(cosmosPath, cosmosSource, "utf8");

console.log("[AstroHogar] Onboarding production patch prepared.");