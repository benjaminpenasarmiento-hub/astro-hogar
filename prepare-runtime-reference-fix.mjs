import fs from "fs";

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

// Repair the known runtime typo that was causing React to crash before rendering.
app = app.replaceAll("activdeUserName", "activeUserName");

// Ensure the active user name always exists after the users state declaration.
if (!app.includes("const activeUserName =")) {
  const usersAnchor = '  const [users, setUsers] = useState<UserProfile[]>([]);';
  const declaration = `${usersAnchor}\n\n  const activeUserName = users.find((u) =>\n    (authUser?.uid && String(u?.authUid || "").trim() === authUser.uid) ||\n    (authUser?.email && String(u?.email || "").trim().toLowerCase() === authUser.email.trim().toLowerCase())\n  )?.name || "Usuario";`;
  if (app.includes(usersAnchor) && app.includes('const { user: authUser } = useAuth();')) {
    app = app.replace(usersAnchor, declaration);
  }
}

fs.writeFileSync(appPath, app, "utf8");
console.log("[AstroHogar] Runtime user-name reference repaired and guarded.");
