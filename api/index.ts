import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { app, __requireFirebaseAuth, __runWithFirestoreAuthToken } = require("../dist/server.cjs");

export default async function handler(req: any, res: any) {
  return __requireFirebaseAuth(req, res, () => {
    const token = req.firebaseIdToken as string | undefined;
    if (!token) return res.status(401).json({ error: "Autenticación requerida.", code: "AUTH_REQUIRED" });
    return __runWithFirestoreAuthToken(token, () => app(req, res));
  });
}
