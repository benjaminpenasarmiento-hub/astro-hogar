import { extractBearerToken, verifyFirebaseIdToken } from "./serverAuth";
import { readHomeDocument, patchHomeMetadata } from "./serverFirestoreRest";
import { runWithFirestoreAuthToken } from "./serverFirestoreRest";

function getHomeCode(req: any): string {
  return String(req.headers?.["x-home-code"] || "").trim().toUpperCase();
}

function isOnboardingPath(path: string): boolean {
  return path === "/api/health" || path === "/health" ||
    path === "/api/onboarding/create-home" ||
    path === "/api/onboarding/join-home";
}

async function userBelongsToHome(homeCode: string, uid?: string, email?: string): Promise<boolean> {
  if (!homeCode || (!uid && !email)) return false;
  try {
    const snapshot = await readHomeDocument(homeCode);
    if (!snapshot.exists) return false;

    const data = snapshot.data || {};
    const normalizedEmail = email?.trim().toLowerCase();
    const authorizedUids = Array.isArray(data.authorizedUids) ? data.authorizedUids.map(String) : [];
    const authorizedEmails = Array.isArray(data.authorizedEmails)
      ? data.authorizedEmails.map((value: any) => String(value).trim().toLowerCase())
      : [];

    const users = data.data?.users;
    const legacyMember = Array.isArray(users) && users.some((user: any) => {
      const sameUid = uid && typeof user?.authUid === "string" && user.authUid === uid;
      const sameEmail = normalizedEmail && typeof user?.email === "string" && user.email.trim().toLowerCase() === normalizedEmail;
      return Boolean(sameUid || sameEmail);
    });

    const member = Boolean(
      (uid && authorizedUids.includes(uid)) ||
      (normalizedEmail && authorizedEmails.includes(normalizedEmail)) ||
      legacyMember
    );

    if (!member) return false;

    const nextUids = new Set(authorizedUids);
    const nextEmails = new Set(authorizedEmails);
    if (uid) nextUids.add(uid);
    if (normalizedEmail) nextEmails.add(normalizedEmail);
    if (Array.isArray(users)) {
      for (const user of users) {
        if (typeof user?.authUid === "string" && user.authUid.trim()) nextUids.add(user.authUid.trim());
        if (typeof user?.email === "string" && user.email.trim()) nextEmails.add(user.email.trim().toLowerCase());
      }
    }

    if (!Array.isArray(data.authorizedUids) || !Array.isArray(data.authorizedEmails) ||
        nextUids.size !== authorizedUids.length || nextEmails.size !== authorizedEmails.length) {
      try {
        await patchHomeMetadata(homeCode, {
          authorizedUids: [...nextUids],
          authorizedEmails: [...nextEmails],
        });
      } catch (migrationError) {
        console.warn("[Firebase AuthZ] No se pudo migrar la autorización del hogar:", migrationError);
      }
    }

    return true;
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

  if (req.body && typeof req.body === "object" && verifiedUser.email) {
    req.body.email = verifiedUser.email;
  }

  return runWithFirestoreAuthToken(token, async () => {
    if (isOnboardingPath(path)) return next();

    const homeCode = getHomeCode(req);
    const belongs = await userBelongsToHome(homeCode, verifiedUser.localId, verifiedUser.email);
    if (!belongs) {
      return res.status(403).json({
        error: "Tu cuenta de Google no pertenece a este hogar.",
        code: "HOME_ACCESS_DENIED",
      });
    }

    return next();
  });
}
