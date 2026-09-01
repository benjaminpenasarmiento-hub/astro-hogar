import "node:fs";
import fs from "node:fs";
import path from "node:path";

const REPLACEMENTS = [
  ["activdeUserName", "activeUserName"],
];

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".mjs", ".cjs", ".jsx", ".json", ".css", ".html", ".md"
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(full);
  }
  return files;
}

function sanitizeText(source, file) {
  let next = source;
  for (const [bad, good] of REPLACEMENTS) next = next.split(bad).join(good);

  if (file.endsWith("src/components/HomeDashboard.tsx")) {
    const safeActiveUserBlock = `  let activeUser = users[0] || { id: "mafe", name: "Mafe" };
  if (activeUserId) {
    for (const candidate of users) {
      if (candidate?.id === activeUserId) {
        activeUser = candidate;
        break;
      }
    }
  }`;

    const activeUserForms = [
      '  const activeUser = users.find(u => u.id === activeUserId) || users[0] || { id: "mafe", name: "Mafe" };',
      '  const activeUser = users.find(u => u.id === activeUserId) || users[0] || null;'
    ];
    for (const form of activeUserForms) {
      if (next.includes(form)) {
        next = next.replace(form, safeActiveUserBlock);
        break;
      }
    }

    const getUserNameOld = `  const getUserName = (id: string) => {
    const user = users.find(u => u.id === id);
    return user ? user.name : id;
  };`;
    const getUserNameSafe = `  const getUserName = (id: string) => {
    for (const user of users) {
      if (user?.id === id) return user.name;
    }
    return id;
  };`;
    if (next.includes(getUserNameOld)) next = next.replace(getUserNameOld, getUserNameSafe);

    const partnerDeclaration = `  let partnerUser: UserProfile | undefined;
  for (const candidateUser of users) {
    if (candidateUser?.id !== activeUser.id) {
      partnerUser = candidateUser;
      break;
    }
  }`;
    const partnerAnchor = /\n\s*\/\/ Memory showcase selector logic - strictly uses real registered memories/;
    if (partnerAnchor.test(next) && !next.includes("let partnerUser: UserProfile | undefined;")) {
      next = next.replace(partnerAnchor, `\n${partnerDeclaration}\n\n  // Memory showcase selector logic - strictly uses real registered memories`);
    }
    next = next.replace(
      'placeholder={`Dejar un lindo mensaje para ${users.find(u => u.id !== activeUser.id)?.name || "tu pareja"} hoy...`}',
      'placeholder={`Dejar un lindo mensaje para ${partnerUser?.name || "tu pareja"} hoy...`}'
    );

    const activeUserDeclaration = '  const activeUserName = activeUser.name || "Usuario";';
    if (next.includes("activeUserName") && !next.includes(activeUserDeclaration)) {
      const activeUserAnchor = /\n\s*(let activeUser = users\[0\][\s\S]*?\n\s*\})/;
      if (activeUserAnchor.test(next)) {
        next = next.replace(activeUserAnchor, (block) => `${block}\n${activeUserDeclaration}`);
      }
    }
  }

  if (file.endsWith("src/App.tsx")) {
    const oldProfile = `  const authenticatedProfile = users.find((u) =>
    (authUser?.uid && String(u?.authUid || "").trim() === authUser.uid) ||
    (authUser?.email && String(u?.email || "").trim().toLowerCase() === authUser.email.trim().toLowerCase())
  );`;
    const safeProfile = `  let authenticatedProfile: UserProfile | undefined;
  for (const candidateUser of users) {
    const matchesUid = Boolean(authUser?.uid && String(candidateUser?.authUid || "").trim() === authUser.uid);
    const matchesEmail = Boolean(authUser?.email && String(candidateUser?.email || "").trim().toLowerCase() === authUser.email.trim().toLowerCase());
    if (matchesUid || matchesEmail) {
      authenticatedProfile = candidateUser;
      break;
    }
  }`;
    if (next.includes(oldProfile)) next = next.replace(oldProfile, safeProfile);
  }

  if (file.endsWith("src/auth.tsx")) {
    next = next.replace(
      'Authorization: `Bearer ${idToken}`',
      'Authorization: `Bearer ${await currentUser.getIdToken()}`'
    );
  }

  if (file === "serverStore.ts" || file.endsWith("/serverStore.ts")) {
    next = next.replace(
      /const UNSCOPED_STORE: DBStore = JSON\.parse\(JSON\.stringify\(INITIAL_DATA\)\);\n\s*const UNSCOPED_STORE: DBStore = JSON\.parse\(JSON\.stringify\(INITIAL_DATA\);/g,
      'const UNSCOPED_STORE: DBStore = JSON.parse(JSON.stringify(INITIAL_DATA));'
    );
  }

  return next;
}

function sanitizeRoot() {
  let changed = 0;
  for (const file of walk(process.cwd())) {
    let source;
    try { source = fs.readFileSync(file, "utf8"); } catch { continue; }
    const next = sanitizeText(source, path.relative(process.cwd(), file));
    if (next !== source) {
      fs.writeFileSync(file, next, "utf8");
      changed++;
      console.log(`[AstroHogar sanitize] Corregido ${path.relative(process.cwd(), file)}`);
    }
  }
  console.log(`[AstroHogar sanitize] Archivos corregidos: ${changed}`);
}

function sanitizeDist() {
  const dist = path.join(process.cwd(), "dist");
  if (!fs.existsSync(dist)) return;
  let changed = 0;
  for (const file of walk(dist)) {
    let source;
    try { source = fs.readFileSync(file, "utf8"); } catch { continue; }
    const next = sanitizeText(source, path.relative(process.cwd(), file));
    if (next !== source) {
      fs.writeFileSync(file, next, "utf8");
      changed++;
      console.log(`[AstroHogar sanitize] Bundle corregido ${path.relative(process.cwd(), file)}`);
    }
  }
  console.log(`[AstroHogar sanitize] Bundles corregidos: ${changed}`);
}

sanitizeRoot();
if (process.argv.includes("--dist")) sanitizeDist();
