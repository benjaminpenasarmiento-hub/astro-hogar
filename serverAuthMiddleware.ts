import { initializeApp } from "firebase/app";
import { doc, getDoc, getFirestore, type Firestore } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";
import { extractBearerToken, verifyFirebaseIdToken } from "./serverAuth";

let authDb: Firestore | null = null;

function getAuthDb(): Firestore {
  if (authDb) return authDb;
  const firebaseApp = initializeApp(firebaseConfig, "astro-hogar-authz");
  authDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || undefined);
  return authDb;
}

function getHomeCode(req: any): string {
  return String(req.headers?.["x-home-code"] || "").trim().toUpperCase();
}

function isPublicAuthPath(path: string): boolean {
  return path === "/api/health" || path === "/health" ||
    path === "/api/onboarding/create-home" ||
    path === "/api/onboarding/join-home";
}

async function userBelongsToHome(homeCode: string, email?: string): Promise<boolean> {
  if (!homeCode || !email) return false;

  try {
    const snapshot = await getDoc(doc(getAuthDb(), "nests", homeCode));
    if (!snapshot.exists()) return false;

    const users = snapshot.data()?.data?.users;
    if (!Array.isArray(users)) return false;

    const normalizedEmail = email.trim().toLowerCase();
    return users.some((user: any) =>
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
  req.headers["x-auth-uid"] = verifiedUser.localId;
  if (verifiedUser.email) req.headers["x-auth-email"] = verifiedUser.email;

  // Never trust an editable email field from onboarding when the platform already
  // knows the authenticated Google account.
  if (req.body && typeof req.body === "object" && verifiedUser.email) {
    req.body.email = verifiedUser.email;
  }

  if (isPublicAuthPath(path)) return next();

  const homeCode = getHomeCode(req);
  const belongs = await userBelongsToHome(homeCode, verifiedUser.email);

  if (!belongs) {
    return res.status(403).json({
      error: "Tu cuenta de Google no pertenece a este hogar.",
      code: "HOME_ACCESS_DENIED",
    });
  }

  return next();
}
