import { extractBearerToken, verifyFirebaseIdToken } from "./serverAuth";

export async function requireFirebaseAuth(req: any, res: any, next: any) {
  const path = String(req.path || req.url || "");

  // Keep the health endpoint usable for deployment diagnostics without a user session.
  if (path === "/api/health" || path === "/health") {
    return next();
  }

  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({
      error: "Autenticación requerida.",
      code: "AUTH_REQUIRED",
    });
  }

  const verifiedUser = await verifyFirebaseIdToken(token);
  if (!verifiedUser) {
    return res.status(401).json({
      error: "La sesión de Google no es válida o ha expirado.",
      code: "AUTH_INVALID",
    });
  }

  req.authUser = verifiedUser;
  req.headers["x-auth-uid"] = verifiedUser.localId;
  if (verifiedUser.email) req.headers["x-auth-email"] = verifiedUser.email;

  return next();
}
