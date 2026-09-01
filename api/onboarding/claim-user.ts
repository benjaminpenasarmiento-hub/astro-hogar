import { extractBearerToken, verifyFirebaseIdToken } from "../../serverAuth.js";
import { readHomeDocument, writeHomeDocument, runWithFirestoreAuthToken } from "../../serverFirestoreRest.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ error: "Autenticación requerida.", code: "AUTH_REQUIRED" });

  const verified = await verifyFirebaseIdToken(token);
  if (!verified) return res.status(401).json({ error: "La sesión de Google no es válida o ha expirado.", code: "AUTH_INVALID" });

  return runWithFirestoreAuthToken(token, async () => {
    try {
      const homeCode = String(req.body?.homeCode || "").trim().toUpperCase();
      const email = String(req.body?.email || verified.email || "").trim().toLowerCase();
      const authUid = String(req.body?.authUid || verified.localId || "").trim();

      if (!homeCode || !authUid) {
        return res.status(400).json({ error: "Faltan datos de identidad del hogar." });
      }

      const current = await readHomeDocument(homeCode);
      if (!current.exists) return res.status(404).json({ error: "No se encontró el hogar." });

      const data = current.data || {};
      const users = Array.isArray(data.users) ? data.users : [];
      const normalizedEmail = email;
      const index = users.findIndex((u: any) =>
        (u?.authUid && String(u.authUid) === authUid) ||
        (normalizedEmail && typeof u?.email === "string" && u.email.trim().toLowerCase() === normalizedEmail)
      );

      if (index < 0) {
        return res.json({ success: true, found: false, homeCode });
      }

      const updatedUsers = users.map((u: any, i: number) =>
        i === index ? { ...u, authUid, email: normalizedEmail || u.email } : u
      );

      await writeHomeDocument(homeCode, { users: updatedUsers }, Number(data.syncRevision || 0));
      return res.json({ success: true, found: true, userId: updatedUsers[index].id, homeCode });
    } catch (error: any) {
      console.error("[Claim User] Error vinculando cuenta:", error);
      return res.status(500).json({ error: "No se pudo vincular la cuenta con el perfil del hogar." });
    }
  });
}
