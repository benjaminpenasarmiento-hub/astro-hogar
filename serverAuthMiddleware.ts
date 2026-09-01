import { extractBearerToken, verifyFirebaseIdToken } from "./serverAuth.js";
import { readHomeDocument, patchHomeMetadata, readAccountHomeIndex } from "./serverFirestoreRest.js";
import { runWithFirestoreAuthToken } from "./serverFirestoreRest.js";

function getHomeCode(req: any): string {
  return String(req.headers?.["x-home-code"] || "").trim().toUpperCase();
}

function normalizeRequestPath(req: any): string {
  const candidates = [String(req.path || ""), String(req.url || ""), String(req.originalUrl || "")];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const pathname = candidate.startsWith("http://") || candidate.startsWith("https://")
        ? new URL(candidate).pathname
        : candidate.split("?")[0].split("#")[0];
      if (pathname && pathname !== "/") return pathname;
    } catch {
      const pathname = candidate.split("?")[0].split("#")[0];
      if (pathname && pathname !== "/") return pathname;
    }
  }
  return candidates.find(Boolean) || "";
}

function isOnboardingPath(path: string): boolean {
  const normalized = path.replace(/\/+$/, "");
  return normalized === "/api/health" || normalized === "/health" ||
    normalized === "/api/onboarding/create-home" ||
    normalized === "/onboarding/create-home" ||
    normalized.endsWith("/api/onboarding/create-home") ||
    normalized.endsWith("/onboarding/create-home") ||
    normalized === "/api/onboarding/join-home" ||
    normalized === "/onboarding/join-home" ||
    normalized.endsWith("/api/onboarding/join-home") ||
    normalized.endsWith("/onboarding/join-home") ||
    normalized === "/api/onboarding/enter-home" ||
    normalized === "/onboarding/enter-home" ||
    normalized.endsWith("/api/onboarding/enter-home") ||
    normalized.endsWith("/onboarding/enter-home");
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

    let member = Boolean(
      (uid && authorizedUids.includes(uid)) ||
      (normalizedEmail && authorizedEmails.includes(normalizedEmail)) ||
      legacyMember
    );

    if (!member && uid) {
      try {
        const accountIndex = await readAccountHomeIndex(uid);
        if (accountIndex.homeCode === homeCode) {
          member = true;
        }
      } catch (indexError) {
        console.warn("[Firebase AuthZ] No se pudo consultar account_homes:", indexError);
      }
    }

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
  const path = normalizeRequestPath(req);
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

    const requestedHomeCode = getHomeCode(req);
    let effectiveHomeCode = requestedHomeCode;

    if (verifiedUser.localId) {
      try {
        const accountIndex = await readAccountHomeIndex(verifiedUser.localId);
        const indexedHomeCode = accountIndex.homeCode || "";
        if (indexedHomeCode) {
          effectiveHomeCode = indexedHomeCode;
          req.headers["x-home-code"] = indexedHomeCode;
        }
      } catch (indexError) {
        console.warn("[Firebase AuthZ] No se pudo resolver el hogar de la cuenta:", indexError);
      }
    }

    const belongs = await userBelongsToHome(effectiveHomeCode, verifiedUser.localId, verifiedUser.email);
    if (!belongs) {
      return res.status(403).json({
        error: "Tu cuenta de Google no pertenece a este hogar.",
        code: "HOME_ACCESS_DENIED",
      });
    }

    // Canonicalize the application-level user id from the authenticated profile.
    // Downstream endpoints use x-user-id for user-scoped data, so never trust a stale
    // browser value when the active Firebase account already identifies the profile.
    try {
      const homeSnapshot = await readHomeDocument(effectiveHomeCode);
      const homeUsers = Array.isArray(homeSnapshot.data?.data?.users) ? homeSnapshot.data.data.users : [];
      const normalizedEmail = verifiedUser.email?.trim().toLowerCase();
      const activeProfile = homeUsers.find((profile: any) => {
        const sameUid = verifiedUser.localId && typeof profile?.authUid === "string" && profile.authUid === verifiedUser.localId;
        const sameEmail = normalizedEmail && typeof profile?.email === "string" && profile.email.trim().toLowerCase() === normalizedEmail;
        return Boolean(sameUid || sameEmail);
      });

      if (activeProfile?.id) {
        req.headers["x-user-id"] = String(activeProfile.id);
        req.authUser.profileUserId = String(activeProfile.id);
      } else {
        req.headers["x-user-id"] = verifiedUser.localId;
      }
    } catch (profileError) {
      console.warn("[Firebase AuthZ] No se pudo resolver el perfil activo; usando UID:", profileError);
      req.headers["x-user-id"] = verifiedUser.localId;
    }

    return next();
  });
}
