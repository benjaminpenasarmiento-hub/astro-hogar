import fs from "fs";

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

// Repair the known runtime typo that was causing React to crash before rendering.
app = app.replaceAll("activdeUserName", "activeUserName");

const usersAnchor = '  const [users, setUsers] = useState<UserProfile[]>([]);';
const authAnchor = '  const { user: authUser } = useAuth();';
const activeUserNameDeclaration = `  const activeUserName = users.find((u) =>
    (authUser?.uid && String(u?.authUid || "").trim() === authUser.uid) ||
    (authUser?.email && String(u?.email || "").trim().toLowerCase() === authUser.email.trim().toLowerCase())
  )?.name || "Usuario";`;

// The identity pipeline intentionally derives activeUserName from Firebase Auth,
// so it must never be evaluated before authUser has been initialized. The old
// version inserted it immediately after the users state, which was unsafe because
// prepare-identity-fix declares authUser later while replacing the legacy effect.
if (!app.includes("const activeUserName =")) {
  if (app.includes(authAnchor)) {
    app = app.replace(authAnchor, `${authAnchor}\n\n${activeUserNameDeclaration}`);
  } else if (app.includes(usersAnchor)) {
    // Defensive fallback for an unexpected pipeline ordering. This path does not
    // reference authUser; it therefore remains safe even without the auth hook.
    app = app.replace(
      usersAnchor,
      `${usersAnchor}\n\n  const activeUserName = users.length > 0 ? users[0]?.name || "Usuario" : "Usuario";`
    );
  }
}

// If a previous pipeline pass created activeUserName before authUser, move the
// declaration after authUser instead of leaving a latent temporal-dead-zone bug.
if (app.includes(authAnchor)) {
  const declarationPattern = /\n\s*const activeUserName = users\.find\(\(u\) =>[\s\S]*?\)\?\.name \|\| "Usuario";/;
  const match = app.match(declarationPattern);
  if (match) {
    const declaration = match[0].trim();
    const declarationIndex = match.index ?? -1;
    const authIndex = app.indexOf(authAnchor);
    if (declarationIndex >= 0 && authIndex >= 0 && declarationIndex < authIndex) {
      app = app.slice(0, declarationIndex) + app.slice(declarationIndex + match[0].length);
      const newAuthIndex = app.indexOf(authAnchor);
      app = app.slice(0, newAuthIndex + authAnchor.length) + `\n\n${declaration}` + app.slice(newAuthIndex + authAnchor.length);
    }
  }
}

// Build-time guard: never allow an authUser-dependent activeUserName declaration
// to appear before the authUser initialization again.
const activeIdx = app.indexOf("const activeUserName =");
const authIdx = app.indexOf(authAnchor);
if (activeIdx >= 0 && authIdx >= 0 && activeIdx < authIdx) {
  throw new Error("[AstroHogar] TDZ guard failed: activeUserName is declared before authUser.");
}

fs.writeFileSync(appPath, app, "utf8");
console.log("[AstroHogar] Runtime user-name reference repaired with safe authUser ordering.");
