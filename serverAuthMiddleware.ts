import { extractBearerToken, verifyFirebaseIdToken } from "./serverAuth";
import { readHomeDocument } from "./serverFirestoreRest";
import { runWithFirestoreAuthToken } from "./serverFirestoreRest";

function getHomeCode(req: any): string {
  return String(req.headers?.["x-home-code"] || "").trim().toUpperCase();
}

function isOnboardingPath(path: string): boolean {
  return path === "/api/health" || path === "/health" ||
    path === "/api/onboarding/create-home" ||
    path === "/api/onboarding/join-home";
}

async function userBelongsToHome(homeCode: string, email?: string): Promise<boolean> {
  if (!homeCode || !email) return false;
  try {
    const snapshot = await readHomeDocument(homeCode);
    if (!snapshot.exists) return false;

    const normalizedEmail = email.trim().toLowerCase();
    const authorizedEmails = snapshot.data?.authorizedEmails;
    if (Array.isArray(authorizedEmails)) {
      return authorizedEmails.some((value: any) => String(value).trim().toLowerCase() === normalizedEmail);
    }

    const users = snapshot.data?.data?.users;
    return Array.isArray(users) && users.some((user: any) =>
      typeof user?.email === "string" && user.email.trim().toLowerCase() === normalizedEmail
    );
  } catch (error) {
    console.error("[Firebase AuthZ] No se pudo verificar pertenencia al hogar:", error);
    return false;
  }
}

export async function requireFirebaseAuth(req: any, res: any, next: any) {
  const path = String(req.path || req.url || "");
  if (path === "/api/health" || path === "/health") return next();

  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Autenticación requerida.", code: "AUTH_REQUIRED" });
  }

  const verifiedUser = await verifyFirebaseIdToken(token);
  if (!verifiedUser) {
    return res.status(401).json({ error: "La sesión de Google no es válida o ha expirado.", code: "AUTH_INVALID" });
  }

  req.authUser = verifiedUser;
  req.firebaseIdToken = token;
  req.headers["x-auth-uid"] = verifiedUser.localId;
  if (verifiedUser.email) req.headers["x-auth-email"] = verifiedUser.email;

  // Google is authoritative for the account identity.
  if (req.body && typeof req.body === "object" && verifiedUser.email) {
    req.body.email = verifiedUser.email;
  }

  // Keep the verified token request-scoped so any Firestore REST call made by
  // downstream code can be authenticated as this exact Firebase user.
  return runWithFirestoreAuthToken(token, async () => {
    if (isOnboardingPath(path)) return next();

    const homeCode = getHomeCode(req);
    const belongs = await userBelongsToHome(homeCode, verifiedUser.email);
    if (!belongs) {
      return res.status(403).json({
        error: "Tu cuenta de Google no pertenece a este hogar.",
        code: "HOME_ACCESS_DENIED",
      });
    }

    return next();
  });
}
