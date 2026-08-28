import { createRequire } from "node:module";
import { requireFirebaseAuth } from "../serverAuthMiddleware";
import { runWithFirestoreAuthToken } from "../serverFirestoreRest";

const require = createRequire(import.meta.url);
const { app } = require("../dist/server.cjs");

export default async function handler(req: any, res: any) {
  return requireFirebaseAuth(req, res, () => {
    const token = req.firebaseIdToken as string | undefined;
    if (!token) return res.status(401).json({ error: "Autenticación requerida.", code: "AUTH_REQUIRED" });
    return runWithFirestoreAuthToken(token, () => app(req, res));
  });
}
