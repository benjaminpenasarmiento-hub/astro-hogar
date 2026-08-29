import { extractBearerToken, verifyFirebaseIdToken } from "../../serverAuth.js";
import { readAccountHomeIndex, runWithFirestoreAuthToken } from "../../serverFirestoreRest.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ error: "Autenticación requerida.", code: "AUTH_REQUIRED" });
  const user = await verifyFirebaseIdToken(token);
  if (!user) return res.status(401).json({ error: "La sesión de Google no es válida o ha expirado.", code: "AUTH_INVALID" });
  return runWithFirestoreAuthToken(token, async () => {
    try {
      const result = await readAccountHomeIndex(user.localId);
      return res.json({ homeCode: result.homeCode, found: Boolean(result.homeCode) });
    } catch (error: any) {
      console.error("[Detect Home] Error leyendo vínculo de cuenta:", error);
      return res.status(500).json({ error: "No se pudo detectar el hogar de la cuenta." });
    }
  });
}
