type VerifiedGoogleUser = {
  localId: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
};

const cache = new Map<string, { user: VerifiedGoogleUser; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getFirebaseApiKey(): string {
  const configured = process.env.FIREBASE_WEB_API_KEY;
  if (configured) return configured;

  const projectConfig = {
    apiKey: "AIzaSyBqxdzL2sw4ME8985eo81IF62558obYxXg"
  };
  return projectConfig.apiKey;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedGoogleUser | null> {
  if (!idToken) return null;

  const cached = cache.get(idToken);
  if (cached && cached.expiresAt > Date.now()) return cached.user;
  if (cached) cache.delete(idToken);

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(getFirebaseApiKey())}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!response.ok) return null;
    const payload = await response.json() as { users?: Array<any> };
    const account = payload.users?.[0];
    if (!account?.localId) return null;

    const user: VerifiedGoogleUser = {
      localId: String(account.localId),
      email: typeof account.email === "string" ? account.email : undefined,
      displayName: typeof account.displayName === "string" ? account.displayName : undefined,
      photoUrl: typeof account.photoUrl === "string" ? account.photoUrl : undefined,
    };

    cache.set(idToken, { user, expiresAt: Date.now() + CACHE_TTL_MS });
    return user;
  } catch (error) {
    console.error("[Firebase Auth] Error verificando ID token:", error);
    return null;
  }
}

export function extractBearerToken(req: any): string | null {
  const header = String(req.headers?.authorization || "");
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}
