import fs from "node:fs";

const dashboardPath = "src/components/HomeDashboard.tsx";
const appPath = "src/App.tsx";

const safeActiveUser = `  let activeUser = users[0] || { id: "mafe", name: "Mafe" };
  if (activeUserId) {
    for (const candidate of users) {
      if (candidate?.id === activeUserId) {
        activeUser = candidate;
        break;
      }
    }
  }`;

let dashboard = fs.readFileSync(dashboardPath, "utf8");
dashboard = dashboard.replaceAll("activdeUserName", "activeUserName");

// Remove every generated activeUser .find() shape, regardless of which previous
// build-preparation script inserted it.
dashboard = dashboard.replace(
  /\s*const activeUser = users\.find\(u => u\.id === activeUserId\)[^;]*;/g,
  `\n${safeActiveUser}`
);
dashboard = dashboard.replace(
  /\s*const activeUser = users\.find\(u => u\.id === activeUserId\)\s*\|\|\s*users\[0\][^;]*;/g,
  `\n${safeActiveUser}`
);

// Safe username lookup for render-time callbacks.
dashboard = dashboard.replace(
  /  const getUserName = \(id: string\) => \{\n    const user = users\.find\(u => u\.id === id\);\n    return user \? user\.name : id;\n  \};/g,
  `  const getUserName = (id: string) => {\n    for (const user of users) {\n      if (user?.id === id) return user.name;\n    }\n    return id;\n  };`
);

// The partner placeholder is also render-time identity logic; resolve it once.
dashboard = dashboard.replace(
  /\$\{users\.find\(u => u\.id !== activeUser\.id\)\?\.name \|\| "tu pareja"\}/g,
  '${partnerUser?.name || "tu pareja"}'
);
if (!dashboard.includes("let partnerUser: UserProfile | undefined;")) {
  const partner = `  let partnerUser: UserProfile | undefined;\n  for (const candidateUser of users) {\n    if (candidateUser?.id !== activeUser.id) {\n      partnerUser = candidateUser;\n      break;\n    }\n  }`;
  const anchor = /\n\s*\/\/ Memory showcase selector logic - strictly uses real registered memories/;
  if (anchor.test(dashboard)) dashboard = dashboard.replace(anchor, `\n${partner}\n\n  // Memory showcase selector logic - strictly uses real registered memories`);
}
fs.writeFileSync(dashboardPath, dashboard, "utf8");

let app = fs.readFileSync(appPath, "utf8");
app = app.replaceAll("activdeUserName", "activeUserName");

// The mobile header preparation script injects a session matcher using users.find().
// Resolve the authenticated session with an imperative loop to avoid TDZ/minifier
// collisions in production bundles.
app = app.replace(
  /\s*const matched = users\.find\(\(u\) =>\s*\(uid && String\(u\?\.authUid \|\| ""\)\.trim\(\) === uid\) \|\|\s*\(email && String\(u\?\.email \|\| ""\)\.trim\(\)\.toLowerCase\(\) === email\)\s*\);/g,
  `\n    let matched: UserProfile | undefined;\n    for (const candidateUser of users) {\n      const matchesUid = Boolean(uid && String(candidateUser?.authUid || "").trim() === uid);\n      const matchesEmail = Boolean(email && String(candidateUser?.email || "").trim().toLowerCase() === email);\n      if (matchesUid || matchesEmail) {\n        matched = candidateUser;\n        break;\n      }\n    }`
);

// Replace every authenticatedProfile users.find() block with a deterministic loop.
app = app.replace(
  /\s*const authenticatedProfile = users\.find\(\(u\) =>[\s\S]*?\n  \);/g,
  `\n  let authenticatedProfile: import("./types").UserProfile | undefined;\n  for (const candidateUser of users) {\n    const matchesUid = Boolean(authUser?.uid && String(candidateUser?.authUid || "").trim() === authUser.uid);\n    const matchesEmail = Boolean(authUser?.email && String(candidateUser?.email || "").trim().toLowerCase() === authUser.email.trim().toLowerCase());\n    if (matchesUid || matchesEmail) {\n      authenticatedProfile = candidateUser;\n      break;\n    }\n  }`
);

// Replace the generated activeUserName users.find() declaration if present.
app = app.replace(
  /\s*const activeUserName = users\.find\(\(u\) =>[\s\S]*?\n  \)\?\.name \|\| "Usuario";/g,
  `\n  let activeUserName = "Usuario";\n  for (const candidateUser of users) {\n    const matchesUid = Boolean(authUser?.uid && String(candidateUser?.authUid || "").trim() === authUser.uid);\n    const matchesEmail = Boolean(authUser?.email && String(candidateUser?.email || "").trim().toLowerCase() === authUser.email.trim().toLowerCase());\n    if (matchesUid || matchesEmail) {\n      activeUserName = candidateUser?.name || "Usuario";\n      break;\n    }\n  }`
);

// Nothing known to cause the production TDZ may remain in App or HomeDashboard.
const errors = [];
if (/users\s*\.find\s*\(/.test(dashboard)) errors.push(dashboardPath);
if (/users\s*\.find\s*\(/.test(app)) errors.push(appPath);
if (errors.length) {
  throw new Error(`[AstroHogar] TDZ guard failed; users.find() remains in: ${errors.join(", ")}`);
}

fs.writeFileSync(appPath, app, "utf8");
console.log("[AstroHogar] Final TDZ guard passed: no users.find() remains in App or HomeDashboard.");
