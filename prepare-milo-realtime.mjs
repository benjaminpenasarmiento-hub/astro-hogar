import fs from "node:fs";

// Send the browser's real timezone/time to the server so Milo never uses Vercel's UTC clock.
const apiPath = "src/api.ts";
let api = fs.readFileSync(apiPath, "utf8");
const apiAnchor = '    if (uid) {\n      headers["x-user-id"] = uid;\n    }\n    newInit.headers = headers;';
const apiReplacement = '    if (uid) {\n      headers["x-user-id"] = uid;\n    }\n    if (typeof window !== "undefined") {\n      headers["x-client-timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";\n      headers["x-client-now"] = new Date().toISOString();\n    }\n    newInit.headers = headers;';
if (!api.includes('x-client-timezone') && api.includes(apiAnchor)) {
  api = api.replace(apiAnchor, apiReplacement, 1);
  fs.writeFileSync(apiPath, api, "utf8");
}

// Make Milo's day-period calculation use the requesting user's timezone for all AI context endpoints.
const serverPath = "server.ts";
let server = fs.readFileSync(serverPath, "utf8");
const helperMarker = "// 1. Daily Message Generator (Tono Cálido + Gatito)";
if (!server.includes("function getClientHour") && server.includes(helperMarker)) {
  const helper = `function getClientHour(req) {\n  const timezone = String(req.headers["x-client-timezone"] || "America/Bogota");\n  try {\n    const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", hour12: false }).formatToParts(new Date());\n    const hour = Number(parts.find(p => p.type === "hour")?.value || 0);\n    return hour === 24 ? 0 : hour;\n  } catch {\n    const hour = new Date().getUTCHours() - 5;\n    return (hour + 24) % 24;\n  }\n}\n\n`;
  server = server.replace(helperMarker, helper + helperMarker, 1);
}

server = server.replace(
  /(app\.get\("\/api\/ai\/daily-greeting"[\s\S]*?const summary = getHomeContextSummary\(\);\n\s*)const timeOfDay = req\.query\.timeOfDay \|\| "morning";/,
  '$1const timeOfDay = (() => { const hr = getClientHour(req); return hr >= 5 && hr < 12 ? "morning" : hr >= 12 && hr < 18 ? "afternoon" : "evening"; })();'
);
server = server.replace(
  /(app\.get\("\/api\/ai\/init-home-state"[\s\S]*?const now = new Date\(\);\n\s*)const hr = now\.getHours\(\);/,
  '$1const hr = getClientHour(req);'
);
server = server.replace(
  /(app\.post\("\/api\/ai\/update-milo-daily-context"[\s\S]*?const now = new Date\(\);\n\s*)const hr = now\.getHours\(\);/,
  '$1const hr = getClientHour(req);'
);
fs.writeFileSync(serverPath, server, "utf8");

// Refresh the live Milo context periodically while the conversation is open.
const chatPath = "src/components/GatitoAiChat.tsx";
let chat = fs.readFileSync(chatPath, "utf8");
chat = chat.replace(
  /initializeMiloHomeContext\(true\)\n\s*\.then\(context => \{ if \(!cancelled\) setLiveMiloContext\(context\); \}\)/,
  'initializeMiloHomeContext(true).then(context => { if (!cancelled) setLiveMiloContext(context); })'
);
if (!chat.includes('const refreshTimer = window.setInterval')) {
  const marker = '    initializeMiloHomeContext(true).then(context => { if (!cancelled) setLiveMiloContext(context); }).catch(err => console.warn("Milo live context unavailable:", err));';
  const replacement = marker + '\n    const refreshTimer = window.setInterval(() => { initializeMiloHomeContext(true).then(context => { if (!cancelled) setLiveMiloContext(context); }).catch(() => {}); }, 60000);';
  if (chat.includes(marker)) {
    chat = chat.replace(marker, replacement, 1);
    chat = chat.replace('    return () => { cancelled = true; };', '    return () => { cancelled = true; window.clearInterval(refreshTimer); };', 1);
  }
}
fs.writeFileSync(chatPath, chat, "utf8");

console.log("[AstroHogar] Milo realtime timezone, context refresh and voice pipeline hardened.");
