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

dashboard = dashboard.replace(
  /\s*const activeUser = users\.find\(u => u\.id === activeUserId\)[^;]*;/g,
  `\n${safeActiveUser}`
);
dashboard = dashboard.replace(
  /\s*const activeUser = users\.find\(u => u\.id === activeUserId\)\s*\|\|\s*users\[0\][^;]*;/g,
  `\n${safeActiveUser}`
);

dashboard = dashboard.replace(
  /  const getUserName = \(id: string\) => \{\n    const user = users\.find\(u => u\.id === id\);\n    return user \? user\.name : id;\n  \};/g,
  `  const getUserName = (id: string) => {\n    for (const user of users) {\n      if (user?.id === id) return user.name;\n    }\n    return id;\n  };`
);

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

app = app.replace(
  /\s*const matched\s*=\s*users\.find\(\(u\)\s*=>[\s\S]{0,1600}?\);/g,
  `\n    let matched: UserProfile | undefined;\n    for (const candidateUser of users) {\n      const matchesUid = Boolean(uid && String(candidateUser?.authUid || "").trim() === uid);\n      const matchesEmail = Boolean(email && String(candidateUser?.email || "").trim().toLowerCase() === email);\n      if (matchesUid || matchesEmail) {\n        matched = candidateUser;\n        break;\n      }\n    }`
);

app = app.replace(
  /\s*const authenticatedProfile\s*=\s*users\.find\(\(u\)\s*=>[\s\S]{0,1800}?\);/g,
  `\n  let authenticatedProfile: UserProfile | undefined;\n  for (const candidateUser of users) {\n    const matchesUid = Boolean(authUser?.uid && String(candidateUser?.authUid || "").trim() === authUser.uid);\n    const matchesEmail = Boolean(authUser?.email && String(candidateUser?.email || "").trim().toLowerCase() === authUser.email.trim().toLowerCase());\n    if (matchesUid || matchesEmail) {\n      authenticatedProfile = candidateUser;\n      break;\n    }\n  }`
);

// activeUserName closes the find() call before the optional property access,
// so its terminator is `)?.name || ...;`, not `);`.
app = app.replace(
  /\s*const activeUserName\s*=\s*users\.find\(\(u\)\s*=>[\s\S]{0,1800}?\)\?\.name\s*\|\|\s*"Usuario"\s*;/g,
  `\n  let activeUserName = "Usuario";\n  for (const candidateUser of users) {\n    const matchesUid = Boolean(authUser?.uid && String(candidateUser?.authUid || "").trim() === authUser.uid);\n    const matchesEmail = Boolean(authUser?.email && String(candidateUser?.email || "").trim().toLowerCase() === authUser.email.trim().toLowerCase());\n    if (matchesUid || matchesEmail) {\n      activeUserName = candidateUser?.name || "Usuario";\n      break;\n    }\n  }`
);

const errors = [];
if (/users\s*\.find\s*\(/.test(dashboard)) errors.push(dashboardPath);
if (/users\s*\.find\s*\(/.test(app)) errors.push(appPath);
if (errors.length) {
  throw new Error(`[AstroHogar] TDZ guard failed; users.find() remains in: ${errors.join(", ")}`);
}

fs.writeFileSync(appPath, app, "utf8");
console.log("[AstroHogar] Final TDZ guard passed: no users.find() remains in App or HomeDashboard.");
