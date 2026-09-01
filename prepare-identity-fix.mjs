import fs from 'fs';

const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');
if (!app.includes('import { useAuth } from "./auth";')) {
  app = app.replace('import React, { useState, useEffect } from "react";\n', 'import React, { useState, useEffect } from "react";\nimport { useAuth } from "./auth";\n');
}
const oldEffect = `  useEffect(() => {\n    const savedUserId = localStorage.getItem("astro_user_id");\n    if (savedUserId) {\n      setActiveUserId(savedUserId);\n    } else if (users.length > 0) {\n      setActiveUserId(users[0].id);\n    }\n  }, [users]);`;
const newEffect = `  const { user: authUser } = useAuth();\n\n  useEffect(() => {\n    const authUid = authUser?.uid || "";\n    const authEmail = (authUser?.email || "").trim().toLowerCase();\n    const matchedUser = users.find(u =>\n      (authUid && u.authUid === authUid) ||\n      (authEmail && typeof u.email === "string" && u.email.trim().toLowerCase() === authEmail)\n    );\n\n    if (matchedUser) {\n      setActiveUserId(matchedUser.id);\n      localStorage.setItem("astro_user_id", matchedUser.id);\n      return;\n    }\n\n    // Never fall back to the first household member when a Google account is authenticated.\n    if (authUser) {\n      localStorage.removeItem("astro_user_id");\n      setActiveUserId("");\n      return;\n    }\n\n    const savedUserId = localStorage.getItem("astro_user_id");\n    if (savedUserId && users.some(u => u.id === savedUserId)) {\n      setActiveUserId(savedUserId);\n    } else {\n      setActiveUserId("");\n    }\n  }, [users, authUser]);`;
if (!app.includes(newEffect)) {
  if (!app.includes(oldEffect)) throw new Error('App active-user effect not found');
  app = app.replace(oldEffect, newEffect);
}
fs.writeFileSync(appPath, app);

const authPath = 'src/auth.tsx';
let auth = fs.readFileSync(authPath, 'utf8');
const oldDetect = `        const detectedHome = await detectHomeForAccount(currentUser);\n        if (detectedHome) {\n          localStorage.setItem("astro_home_code", detectedHome);\n        } else {\n          clearStaleHouseholdSession();\n        }`;
const newDetect = `        const detectedHome = await detectHomeForAccount(currentUser);\n        if (detectedHome) {\n          localStorage.setItem("astro_home_code", detectedHome);\n          try {\n            await fetch("/api/onboarding/claim-user", {\n              method: "POST",\n              headers: {\n                Authorization: \`Bearer \${idToken}\`,\n                "Content-Type": "application/json"\n              },\n              body: JSON.stringify({\n                homeCode: detectedHome,\n                email: currentUser.email || "",\n                authUid: currentUser.uid\n              })\n            });\n          } catch (error) {\n            console.warn("[AstroHogar] No se pudo vincular la cuenta con su perfil del hogar:", error);\n          }\n        } else {\n          clearStaleHouseholdSession();\n        }`;
if (!auth.includes(newDetect)) {
  if (!auth.includes(oldDetect)) throw new Error('Auth detect-home block not found');
  auth = auth.replace(oldDetect, newDetect);
}
fs.writeFileSync(authPath, auth);
