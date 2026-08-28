import { Firestore } from "@google-cloud/firestore";

let adminDb: Firestore | null = null;
let initialized = false;

function parseServiceAccount(raw: string) {
  const parsed = JSON.parse(raw);
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON no contiene project_id, client_email y private_key.");
  }
  return parsed;
}

export function getServerFirestore(): Firestore | null {
  if (initialized) return adminDb;
  initialized = true;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn("[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_JSON no está configurada; usando el acceso Firestore actual.");
    return null;
  }

  try {
    const serviceAccount = parseServiceAccount(raw);
    adminDb = new Firestore({
      projectId: serviceAccount.project_id,
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key.replace(/\\n/g, "\n"),
      },
    });
    console.log("[Firebase Admin] Firestore server-side inicializado correctamente.");
    return adminDb;
  } catch (error) {
    console.error("[Firebase Admin] No se pudo inicializar Firestore server-side:", error);
    return null;
  }
}

export function isServerFirestoreConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}
