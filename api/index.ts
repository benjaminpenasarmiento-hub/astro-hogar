import { createRequire } from "node:module";
import { readAccountHomeIndex } from "../serverFirestoreRest.js";

const require = createRequire(import.meta.url);
const { app, __requireFirebaseAuth, __runWithFirestoreAuthToken } = require("../dist/server.cjs");

export default async function handler(req: any, res: any) {
  return __requireFirebaseAuth(req, res, async () => {
    const token = req.firebaseIdToken as string | undefined;
    if (!token) return res.status(401).json({ error: "Autenticación requerida.", code: "AUTH_REQUIRED" });

    const path = String(req.path || req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
    if (path === "/api/onboarding/detect-home" || path === "/onboarding/detect-home") {
      try {
        const uid = String(req.authUser?.localId || "").trim();
        if (!uid) return res.status(401).json({ error: "No se pudo identificar la cuenta.", code: "AUTH_IDENTITY_MISSING" });
        return __runWithFirestoreAuthToken(token, async () => {
          const index = await readAccountHomeIndex(uid);
          return res.json({ homeCode: index.homeCode || null });
        });
      } catch (error: any) {
        console.error("[Account Home Detection]", error);
        return res.status(500).json({ error: error?.message || "No se pudo detectar el hogar de la cuenta." });
      }
    }

    return __runWithFirestoreAuthToken(token, () => app(req, res));
  });
}
