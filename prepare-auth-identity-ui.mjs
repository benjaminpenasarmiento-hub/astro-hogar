import fs from "fs";

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

const marker = "// ASTRO_AUTH_UI_IDENTITY_V2";
if (!app.includes(marker)) {
  if (!app.includes('import { useAuth } from "./auth";')) {
    const importAnchor = 'import { \n  Home, \n  UserProfile,';
    if (!app.includes(importAnchor)) throw new Error("App imports anchor not found");
    app = app.replace(
      importAnchor,
      'import { useAuth } from "./auth";\n\n' + importAnchor
    );
  }

  // prepare-identity-fix.mjs already injects useAuth inside the active-user effect.
  // We intentionally do not depend on an exact previous effect shape here.
  // Add a component-level authUser only when one does not already exist there.
  const componentAnchor = 'export default function App() {\n  const [currentTab, setCurrentTab] = useState<string>("inicio");';
  if (app.includes(componentAnchor) && !app.includes('export default function App() {\n  const { user: authUser } = useAuth();')) {
    app = app.replace(
      componentAnchor,
      'export default function App() {\n  const { user: authUser } = useAuth();\n  const [currentTab, setCurrentTab] = useState<string>("inicio");'
    );
  }

  // If an older version of this patch is being prepared first, replace it.
  const oldActiveEffect = `  useEffect(() => {\n    const savedUserId = localStorage.getItem("astro_user_id");\n    if (savedUserId) {\n      setActiveUserId(savedUserId);\n    } else if (users.length > 0) {\n      setActiveUserId(users[0].id);\n    }\n  }, [users]);`;
  const newActiveEffect = `  // ${marker}\n  // Firebase Auth is the source of truth for the active session.\n  // Never fall back to a stored profile or to the first user in the home.\n  useEffect(() => {\n    const uid = String(authUser?.uid || "").trim();\n    const email = String(authUser?.email || "").trim().toLowerCase();\n    if (!uid && !email) {\n      setActiveUserId("");\n      return;\n    }\n\n    const matched = users.find((u) =>\n      (uid && String(u?.authUid || "").trim() === uid) ||\n      (email && String(u?.email || "").trim().toLowerCase() === email)\n    );\n\n    setActiveUserId(matched?.id || "");\n\n    if (matched?.id) {\n      localStorage.setItem("astro_user_id", matched.id);\n    } else {\n      localStorage.removeItem("astro_user_id");\n    }\n  }, [users, authUser?.uid, authUser?.email]);`;
  if (!app.includes(marker)) {
    if (app.includes(oldActiveEffect)) {
      app = app.replace(oldActiveEffect, newActiveEffect);
    } else {
      // The identity-fix patch already installed the safer active-user effect.
      const identityFixEffectMarker = '  const { user: authUser } = useAuth();\n\n  useEffect(() => {\n    const authUid = authUser?.uid || "";';
      if (!app.includes(identityFixEffectMarker)) {
        throw new Error("No compatible active-user identity effect found");
      }
      app = app.replace(
        identityFixEffectMarker,
        `  ${marker}\n${identityFixEffectMarker}`
      );
    }
  }

  // Resolve the authenticated profile independently from localStorage.
  if (!app.includes("const authenticatedProfile = users.find((u) =>")) {
    const authenticatedProfileAnchor = '  useEffect(() => {\n    if (users.length > 0 && !userToCustomizeShortcuts) {';
    if (!app.includes(authenticatedProfileAnchor)) throw new Error("Profile effect anchor not found");
    const authenticatedProfile = `  const authenticatedProfile = users.find((u) =>\n    (authUser?.uid && String(u?.authUid || "").trim() === authUser.uid) ||\n    (authUser?.email && String(u?.email || "").trim().toLowerCase() === authUser.email.trim().toLowerCase())\n  );\n\n${authenticatedProfileAnchor}`;
    app = app.replace(authenticatedProfileAnchor, authenticatedProfile);
  }

  const mobileSessionOld = `              Sesión: <strong className="text-[#2C2723] font-black">{users.find(u => u.id === activeUserId)?.name || "Milo"}</strong> 🐾`;
  const mobileSessionNew = `              Sesión: <strong className="text-[#2C2723] font-black">{authenticatedProfile?.name || authUser?.displayName || "Usuario"}</strong> 🐾`;
  if (app.includes(mobileSessionOld)) app = app.replace(mobileSessionOld, mobileSessionNew);

  const controlsAnchor = `        <div className="flex items-center gap-2">\n          {/* Active profiles mini trigger with active user indicator */}`;
  if (app.includes(controlsAnchor) && !app.includes('>Sesión</span>')) {
    const controlsReplacement = `        <div className="flex items-center gap-2">\n          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#FAF7F2] border border-[#E7E2D5]">\n            <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" />\n            <span className="text-[9px] text-[#8A817C] font-black">Sesión</span>\n            <span className="text-[9px] text-[#2C2723] font-black max-w-[100px] truncate">{authenticatedProfile?.name || authUser?.displayName || "Usuario"}</span>\n          </div>\n\n          {/* Active profiles mini trigger with active user indicator */}`;
    app = app.replace(controlsAnchor, controlsReplacement);
  }

  fs.writeFileSync(appPath, app);
}

console.log("Firebase-authenticated session UI prepared successfully.");
