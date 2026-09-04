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

function replaceRemainingUsersFind(source) {
  const needle = "users.find(";
  let output = "";
  let cursor = 0;

  while (true) {
    const start = source.indexOf(needle, cursor);
    if (start < 0) {
      output += source.slice(cursor);
      break;
    }

    output += source.slice(cursor, start);
    const openIndex = start + needle.length - 1;
    let depth = 0;
    let quote = null;
    let escaped = false;
    let templateDepth = 0;
    let endIndex = -1;

    for (let i = openIndex; i < source.length; i += 1) {
      const ch = source[i];
      const next = source[i + 1];

      if (quote) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === quote) quote = null;
        continue;
      }

      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }

      if (ch === "`") {
        templateDepth = templateDepth ? templateDepth - 1 : templateDepth + 1;
        continue;
      }

      if (templateDepth && ch === "$" && next === "{") {
        templateDepth += 1;
        continue;
      }

      if (ch === "(") depth += 1;
      if (ch === ")") {
        depth -= 1;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (endIndex < 0) {
      throw new Error("[AstroHogar] Could not parse a remaining users.find() expression.");
    }

    const expression = source.slice(start, endIndex + 1);
    output += expression.replace(/^users\.find\(/, "users.filter(") + "[0]";
    cursor = endIndex + 1;
  }

  return output;
}

let dashboard = fs.readFileSync(dashboardPath, "utf8");
dashboard = dashboard.replaceAll("activdeUserName", "activeUserName");
dashboard = dashboard.replace(/\s*const activeUser = users\.find\(u => u\.id === activeUserId\)[^;]*;/g, `\n${safeActiveUser}`);
dashboard = dashboard.replace(/\s*const activeUser = users\.find\(u => u\.id === activeUserId\)\s*\|\|\s*users\[0\][^;]*;/g, `\n${safeActiveUser}`);
dashboard = dashboard.replace(/  const getUserName = \(id: string\) => \{\n    const user = users\.find\(u => u\.id === id\);\n    return user \? user\.name : id;\n  \};/g, `  const getUserName = (id: string) => {\n    for (const user of users) {\n      if (user?.id === id) return user.name;\n    }\n    return id;\n  };`);
dashboard = dashboard.replace(/\$\{users\.find\(u => u\.id !== activeUser\.id\)\?\.name \|\| "tu pareja"\}/g, '${partnerUser?.name || "tu pareja"}');
if (!dashboard.includes("let partnerUser: UserProfile | undefined;")) {
  const partner = `  let partnerUser: UserProfile | undefined;\n  for (const candidateUser of users) {\n    if (candidateUser?.id !== activeUser.id) {\n      partnerUser = candidateUser;\n      break;\n    }\n  }`;
  const anchor = /\n\s*\/\/ Memory showcase selector logic - strictly uses real registered memories/;
  if (anchor.test(dashboard)) dashboard = dashboard.replace(anchor, `\n${partner}\n\n  // Memory showcase selector logic - strictly uses real registered memories`);
}

dashboard = replaceRemainingUsersFind(dashboard);
fs.writeFileSync(dashboardPath, dashboard, "utf8");

let app = fs.readFileSync(appPath, "utf8");
app = app.replaceAll("activdeUserName", "activeUserName");

const matchedUserLoop = `\n    let matchedUser: UserProfile | undefined;\n    for (const candidateUser of users) {\n      const matchesUid = Boolean(authUid && candidateUser?.authUid === authUid);\n      const matchesEmail = Boolean(authEmail && typeof candidateUser?.email === "string" && candidateUser.email.trim().toLowerCase() === authEmail);\n      if (matchesUid || matchesEmail) {\n        matchedUser = candidateUser;\n        break;\n      }\n    }`;

app = app.replace(/\s*const matchedUser\s*=\s*users\.find\(u\s*=>[\s\S]{0,1600}?\);/g, matchedUserLoop);
app = app.replace(/\s*const matched\s*=\s*users\.find\(\(u\)\s*=>[\s\S]{0,1600}?\);/g, `\n    let matched: UserProfile | undefined;\n    for (const candidateUser of users) {\n      const matchesUid = Boolean(uid && String(candidateUser?.authUid || "").trim() === uid);\n      const matchesEmail = Boolean(email && String(candidateUser?.email || "").trim().toLowerCase() === email);\n      if (matchesUid || matchesEmail) {\n        matched = candidateUser;\n        break;\n      }\n    }`);
app = app.replace(/\s*const authenticatedProfile\s*=\s*users\.find\(\(u\)\s*=>[\s\S]{0,1800}?\);/g, `\n  let authenticatedProfile: UserProfile | undefined;\n  for (const candidateUser of users) {\n    const matchesUid = Boolean(authUser?.uid && String(candidateUser?.authUid || "").trim() === authUser.uid);\n    const matchesEmail = Boolean(authUser?.email && String(candidateUser?.email || "").trim().toLowerCase() === authUser.email.trim().toLowerCase());\n    if (matchesUid || matchesEmail) {\n      authenticatedProfile = candidateUser;\n      break;\n    }\n  }`);
app = app.replace(/\s*const activeUserName\s*=\s*users\.find\(\(u\)\s*=>[\s\S]{0,1800}?\)\?\.name\s*\|\|\s*"Usuario"\s*;/g, `\n  let activeUserName = "Usuario";\n  for (const candidateUser of users) {\n    const matchesUid = Boolean(authUser?.uid && String(candidateUser?.authUid || "").trim() === authUser.uid);\n    const matchesEmail = Boolean(authUser?.email && String(candidateUser?.email || "").trim().toLowerCase() === authUser.email.trim().toLowerCase());\n    if (matchesUid || matchesEmail) {\n      activeUserName = candidateUser?.name || "Usuario";\n      break;\n    }\n  }`);

// Final exhaustive safety net: if any earlier preparation script generated a new
// users.find() shape that was not covered above, rewrite that expression in a
// semantically equivalent way so the production bundle cannot hit the known TDZ.
app = replaceRemainingUsersFind(app);

const remaining = [];
if (/users\s*\.find\s*\(/.test(dashboard)) remaining.push(dashboardPath);
if (/users\s*\.find\s*\(/.test(app)) remaining.push(appPath);
if (remaining.length) throw new Error(`[AstroHogar] TDZ guard failed; users.find() remains in: ${remaining.join(", ")}`);

fs.writeFileSync(appPath, app, "utf8");
console.log("[AstroHogar] Final TDZ guard passed: no users.find() remains in App or HomeDashboard.");
