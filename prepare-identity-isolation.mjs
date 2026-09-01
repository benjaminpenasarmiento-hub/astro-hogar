import fs from "fs";

const serverPath = "server.ts";
let server = fs.readFileSync(serverPath, "utf8");

const identityImportMarker = "// ASTRO_REQUEST_IDENTITY_IMPORT_V2";
if (!server.includes(identityImportMarker)) {
  server = server.replace('import express from "express";\n', 'import express from "express";\nimport { AsyncLocalStorage } from "node:async_hooks";\n');
  server = server.replace('const app = express();\n', `${identityImportMarker}\nconst astroRequestIdentity = new AsyncLocalStorage<{ uid: string; email: string }>();\n\nconst app = express();\n`);
}

const isolationMarker = "// ASTRO_IDENTITY_ISOLATION_V2";
if (!server.includes(isolationMarker)) {
  const middlewareAnchor = `app.use((req, res, next) => {\n  const rawHomeCode = req.headers["x-home-code"] as string || "HOGARPELUDO";\n  const homeCode = normalizeHomeCode(rawHomeCode);\n  homeContextStorage.run(homeCode, () => {\n    next();\n  });\n});`;
  const isolationMiddleware = `${middlewareAnchor}\n\n${isolationMarker}\n// Every authenticated production request must belong to the active nest.\n// Onboarding create/join are the only routes that may establish membership.\napp.use((req, res, next) => {\n  const pathName = String(req.path || req.url || "").split("?")[0].replace(/\\/+$/, "") || "/";\n  const onboardingPath = pathName === "/api/onboarding/create-home" || pathName === "/api/onboarding/join-home" || pathName === "/onboarding/create-home" || pathName === "/onboarding/join-home";\n  if (onboardingPath) return next();\n\n  const authUid = String(req.authUser?.localId || "").trim();\n  const authEmail = String(req.authUser?.email || "").trim().toLowerCase();\n  if (!authUid && !authEmail) return next();\n\n  const store = getStore();\n  const users = Array.isArray(store.users) ? store.users : [];\n  const authorized = Boolean(\n    (Array.isArray(store.home?.authorizedUids) && authUid && store.home.authorizedUids.includes(authUid)) ||\n    users.some((u) =>\n      (authUid && String(u?.authUid || "").trim() === authUid) ||\n      (authEmail && String(u?.email || "").trim().toLowerCase() === authEmail)\n    )\n  );\n\n  if (!authorized) return res.status(403).json({ error: "Esta cuenta no pertenece al nido activo.", code: "HOME_ACCOUNT_MISMATCH" });\n  return next();\n});`;
  if (!server.includes(middlewareAnchor)) throw new Error("Home context middleware anchor not found");
  server = server.replace(middlewareAnchor, isolationMiddleware);
}

const identityMiddlewareMarker = "// ASTRO_REQUEST_IDENTITY_CONTEXT_V3";
if (!server.includes(identityMiddlewareMarker)) {
  const anchor = `${isolationMarker}\n// Every authenticated production request must belong to the active nest.`;
  const injection = `${identityMiddlewareMarker}\n// Keep identity request-scoped so concurrent users can never overwrite each other.\napp.use((req, _res, next) => {\n  astroRequestIdentity.run({\n    uid: String(req.authUser?.localId || "").trim(),\n    email: String(req.authUser?.email || "").trim().toLowerCase()\n  }, next);\n});\n\n`;
  if (!server.includes(anchor)) throw new Error("Identity middleware anchor not found");
  server = server.replace(anchor, `${injection}${anchor}`);
}

const identitySummaryMarker = "// ASTRO_MILO_IDENTITY_CONTEXT_V3";
if (!server.includes(identitySummaryMarker)) {
  const anchor = `function getHomeContextSummary() {\n  const store = getStore();\n  const todayStr = new Date().toISOString().split('T')[0];`;
  const replacement = `function getHomeContextSummary() {\n  const store = getStore();\n  const todayStr = new Date().toISOString().split('T')[0];\n\n  ${identitySummaryMarker}\n  const requestIdentity = astroRequestIdentity.getStore();\n  const authUid = String(requestIdentity?.uid || "").trim();\n  const authEmail = String(requestIdentity?.email || "").trim().toLowerCase();\n  const registeredUsers = Array.isArray(store.users) ? store.users : [];\n  const currentUser = registeredUsers.find((u: any) =>\n    (authUid && String(u?.authUid || "").trim() === authUid) ||\n    (authEmail && String(u?.email || "").trim().toLowerCase() === authEmail)\n  );\n  const identitySummary = currentUser\n    ? \`PERSONA AUTENTICADA: \${currentUser.name} (perfil \${currentUser.id}). Es la persona que está interactuando con Milo.\\nMIEMBROS DEL NIDO: \${registeredUsers.map((u: any) => String(u.name) + " [perfil=" + String(u.id) + "]").join(", ")}.\\nREGLA: nunca atribuyas a \${currentUser.name} datos pertenecientes a otro miembro; usa siempre la persona y perfil correctos.\`\n    : "PERSONA AUTENTICADA: no se pudo resolver el perfil. No atribuir datos personales a ningún miembro por defecto.";`;
  if (!server.includes(anchor)) throw new Error("Milo context anchor not found");
  server = server.replace(anchor, replacement);

  const returnAnchor = `    frasco: frascoSummary\n  };`;
  const returnReplacement = `    frasco: frascoSummary,\n    identity: identitySummary\n  };`;
  if (!server.includes(returnAnchor)) throw new Error("Milo context return anchor not found");
  server = server.replace(returnAnchor, returnReplacement);
}

const claimPath = "api/onboarding/claim-user.ts";
let claim = fs.readFileSync(claimPath, "utf8");
const claimMarker = "// ASTRO_CLAIM_VERIFIED_IDENTITY_V2";
if (!claim.includes(claimMarker)) {
  const old = `      const email = String(req.body?.email || verified.email || "").trim().toLowerCase();\n      const authUid = String(req.body?.authUid || verified.localId || "").trim();`;
  const next = `      ${claimMarker}\n      const email = String(verified.email || "").trim().toLowerCase();\n      const authUid = String(verified.localId || "").trim();`;
  if (!claim.includes(old)) throw new Error("Verified claim identity block not found");
  claim = claim.replace(old, next);
  fs.writeFileSync(claimPath, claim);
}

const chatPath = "src/components/GatitoAiChat.tsx";
let chat = fs.readFileSync(chatPath, "utf8");
if (!chat.includes('import { useAuth } from "../auth";')) {
  chat = chat.replace('import { ChatMessage, UserProfile } from "../types";\n', 'import { ChatMessage, UserProfile } from "../types";\nimport { useAuth } from "../auth";\n');
}
const oldActive = `  const activeUser = useMemo(() => {\n    if (typeof window === "undefined") return users[0];\n    const saved = localStorage.getItem("astro_user_id");\n    return users.find((u) => u.id === saved) || users[0];\n  }, [users]);`;
const newActive = `  const { user: authUser } = useAuth();\n  const activeUser = useMemo(() => {\n    const uid = authUser?.uid || "";\n    const email = (authUser?.email || "").trim().toLowerCase();\n    return users.find((u) =>\n      (uid && u.authUid === uid) ||\n      (email && typeof u.email === "string" && u.email.trim().toLowerCase() === email)\n    );\n  }, [users, authUser]);`;
if (!chat.includes(newActive)) {
  if (!chat.includes(oldActive)) throw new Error("Milo active-user block not found");
  chat = chat.replace(oldActive, newActive);
}
const oldOptions = `        activeUser: activeUser ? { id: activeUser.id, name: activeUser.name, zodiacSign: activeUser.zodiacSign } : null,\n        registeredUsers: users.map((u) => ({ id: u.id, name: u.name, zodiacSign: u.zodiacSign })),`;
const newOptions = `        activeUser: activeUser ? { id: activeUser.id, name: activeUser.name, zodiacSign: activeUser.zodiacSign, authUid: activeUser.authUid, email: activeUser.email } : null,\n        authenticatedAccount: authUser ? { uid: authUser.uid, email: authUser.email || "", displayName: authUser.displayName || "" } : null,\n        homeCode: typeof window !== "undefined" ? localStorage.getItem("astro_home_code") || "" : "",\n        registeredUsers: users.map((u) => ({ id: u.id, name: u.name, zodiacSign: u.zodiacSign, authUid: u.authUid, email: u.email })),`;
if (!chat.includes(newOptions)) {
  if (!chat.includes(oldOptions)) throw new Error("Milo options block not found");
  chat = chat.replace(oldOptions, newOptions);
}
chat = chat.replace(
  `instruction: "Habla únicamente de usuarios registrados en este hogar. No inventes nombres, relaciones, recuerdos ni hechos. Si solo existe un usuario registrado, habla solamente con esa persona.",`,
  `instruction: "Usa SIEMPRE la cuenta autenticada como identidad principal. Solo puedes usar datos del nido activo y del perfil asociado a esa cuenta. Nunca mezcles datos entre personas, nunca uses el primer usuario como fallback y nunca inventes nombres, relaciones, recuerdos ni hechos. Si una cuenta no puede resolverse a un perfil, dilo y no atribuyas datos personales.",`
);
fs.writeFileSync(chatPath, chat);

console.log("Identity isolation + Milo identity context prepared successfully.");
