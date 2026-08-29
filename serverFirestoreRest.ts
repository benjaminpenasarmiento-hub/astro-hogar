import { AsyncLocalStorage } from "node:async_hooks";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const PROJECT_ID = firebaseConfig.projectId;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId;
const API_BASE = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT_ID)}/databases/${encodeURIComponent(DATABASE_ID)}`;
const authTokenStorage = new AsyncLocalStorage<string>();

export function runWithFirestoreAuthToken<T>(token: string, callback: () => T): T {
  return authTokenStorage.run(token, callback);
}

function getAuthToken(): string {
  const token = authTokenStorage.getStore();
  if (!token) throw new Error("FIRESTORE_AUTH_TOKEN_MISSING");
  return token;
}

function decodeJwtPayload(token: string): Record<string, any> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return {};
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return {};
  }
}

export function getAuthenticatedClaims(): { uid?: string; email?: string } {
  const token = getAuthToken();
  const payload = decodeJwtPayload(token);
  return {
    uid: typeof payload.user_id === "string" ? payload.user_id : (typeof payload.sub === "string" ? payload.sub : undefined),
    email: typeof payload.email === "string" ? payload.email.trim().toLowerCase() : undefined,
  };
}

function toFirestoreValue(value: any): any {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "object") {
    const fields: Record<string, any> = {};
    for (const [key, child] of Object.entries(value)) fields[key] = toFirestoreValue(child);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function fromFirestoreValue(value: any): any {
  if (!value || typeof value !== "object") return null;
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("stringValue" in value) return value.stringValue;
  if ("arrayValue" in value) return (value.arrayValue?.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) {
    const out: Record<string, any> = {};
    for (const [key, child] of Object.entries(value.mapValue?.fields || {})) out[key] = fromFirestoreValue(child);
    return out;
  }
  return null;
}

function decodeFields(fields: Record<string, any> | undefined): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields || {})) out[key] = fromFirestoreValue(value);
  return out;
}

function encodeFields(data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(data || {})) out[key] = toFirestoreValue(value);
  return out;
}

function documentPath(collectionName: string, id: string): string {
  return `documents/${encodeURIComponent(collectionName)}/${encodeURIComponent(id)}`;
}

async function firestoreFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${getAuthToken()}`);
  headers.set("Content-Type", "application/json");
  return fetch(`${API_BASE}/${path}`, { ...init, headers });
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function commitWithRetry(writes: any[], context: string, maxAttempts = 3): Promise<any> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await firestoreFetch("documents:commit", {
        method: "POST",
        body: JSON.stringify({ writes }),
      });
      if (response.ok) return response.json();

      const message = await readResponseText(response);
      lastError = new Error(`${context}_${response.status}:${message}`);
      if (!isRetryableStatus(response.status) || attempt === maxAttempts) throw lastError;
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable = /_(408|429|5\d\d):/.test(lastError.message) || /fetch|network|ECONN|ETIMEDOUT/i.test(lastError.message);
      if (!retryable || attempt === maxAttempts) throw lastError;
    }

    await new Promise(resolve => setTimeout(resolve, 250 * Math.pow(2, attempt - 1)));
  }
  throw lastError || new Error(`${context}_UNKNOWN`);
}

export async function readHomeDocument(homeCode: string): Promise<{ exists: boolean; data: any; updateTime?: string }> {
  const response = await firestoreFetch(documentPath("nests", homeCode), { method: "GET" });
  if (response.status === 404) return { exists: false, data: null };
  if (!response.ok) throw new Error(`FIRESTORE_READ_${response.status}:${await readResponseText(response)}`);
  const payload = await response.json();
  return { exists: true, data: decodeFields(payload.fields), updateTime: payload.updateTime };
}

export async function readAccountHomeIndex(uid: string): Promise<{ homeCode: string | null }> {
  const cleanUid = String(uid || "").trim();
  if (!cleanUid) return { homeCode: null };
  const response = await firestoreFetch(documentPath("account_homes", cleanUid), { method: "GET" });
  if (response.status === 404) return { homeCode: null };
  if (!response.ok) throw new Error(`ACCOUNT_HOME_READ_${response.status}:${await readResponseText(response)}`);
  const payload = await response.json();
  const data = decodeFields(payload.fields);
  return { homeCode: typeof data.homeCode === "string" ? data.homeCode : null };
}

export async function writeAccountHomeIndex(uid: string, homeCode: string): Promise<void> {
  const cleanUid = String(uid || "").trim();
  const cleanCode = String(homeCode || "").trim().toUpperCase();
  if (!cleanUid || !cleanCode) throw new Error("ACCOUNT_HOME_INDEX_INVALID");

  const documentName = `${API_BASE}/${documentPath("account_homes", cleanUid)}`;
  await commitWithRetry([
    {
      update: {
        name: documentName,
        fields: encodeFields({
          uid: cleanUid,
          homeCode: cleanCode,
          updatedAt: new Date().toISOString(),
        }),
      },
    },
  ], "ACCOUNT_HOME_WRITE");
}

function buildAuthorizationMetadata(existing: any, candidateData: any): { authorizedUids: string[]; authorizedEmails: string[] } {
  const currentClaims = getAuthenticatedClaims();
  const uids = new Set<string>(Array.isArray(existing?.authorizedUids) ? existing.authorizedUids.map(String) : []);
  const emails = new Set<string>(Array.isArray(existing?.authorizedEmails) ? existing.authorizedEmails.map((v: any) => String(v).trim().toLowerCase()) : []);

  if (currentClaims.uid) uids.add(currentClaims.uid);
  if (currentClaims.email) emails.add(currentClaims.email);

  const users = candidateData?.data?.users;
  if (Array.isArray(users)) {
    for (const user of users) {
      if (typeof user?.authUid === "string" && user.authUid.trim()) uids.add(user.authUid.trim());
      if (typeof user?.email === "string" && user.email.trim()) emails.add(user.email.trim().toLowerCase());
    }
  }

  return { authorizedUids: [...uids], authorizedEmails: [...emails] };
}

export async function writeHomeDocument(homeCode: string, data: any, expectedRevision?: number): Promise<number> {
  const existing = await readHomeDocument(homeCode);
  const remote = existing.exists ? existing.data || {} : {};
  const actualRevision = Number(remote.syncRevision || 0);
  const expected = expectedRevision === undefined ? actualRevision : expectedRevision;
  if (actualRevision !== expected) throw new Error(`SYNC_CONFLICT:${homeCode}:expected=${expected}:actual=${actualRevision}`);

  const nextRevision = actualRevision + 1;
  const savedAt = new Date().toISOString();
  const auth = buildAuthorizationMetadata(remote, data);
  const merged = {
    ...remote,
    homeCode,
    ...data,
    authorizedUids: auth.authorizedUids,
    authorizedEmails: auth.authorizedEmails,
    syncRevision: nextRevision,
    syncUpdatedAt: savedAt,
    updatedAt: savedAt,
  };
  const documentName = `${API_BASE}/${documentPath("nests", homeCode)}`;
  const historyName = `${documentName}/history/${nextRevision}`;

  await commitWithRetry([
    {
      update: { name: documentName, fields: encodeFields(merged) },
      ...(existing.updateTime ? { currentDocument: { updateTime: existing.updateTime } } : {}),
    },
  ], "FIRESTORE_HOME_COMMIT");

  try {
    await commitWithRetry([
      {
        update: {
          name: historyName,
          fields: encodeFields({
            homeCode,
            revision: nextRevision,
            savedAt,
            actorUserId: auth.authorizedUids.includes(getAuthenticatedClaims().uid || "") ? (getAuthenticatedClaims().uid || "autenticado") : "autenticado",
            source: "astro-hogar",
            backupType: "full-home-snapshot",
            data: merged.data,
          }),
        },
      },
    ], "FIRESTORE_HISTORY_COMMIT");
  } catch (historyError) {
    console.warn("[Firestore Sync] No se pudo guardar el historial inicial del hogar:", historyError);
  }

  const currentUid = getAuthenticatedClaims().uid;
  if (currentUid) {
    try {
      await writeAccountHomeIndex(currentUid, homeCode);
    } catch (indexError) {
      console.warn("[Account Home Index] No se pudo actualizar el índice de cuenta:", indexError);
    }
  }

  return nextRevision;
}

export async function patchHomeMetadata(homeCode: string, metadata: Record<string, any>): Promise<void> {
  const existing = await readHomeDocument(homeCode);
  const current = existing.exists ? existing.data || {} : {};
  const documentName = `${API_BASE}/${documentPath("nests", homeCode)}`;
  const response = await commitWithRetry([
    {
      update: {
        name: documentName,
        fields: encodeFields({ ...current, ...metadata }),
      },
      ...(existing.updateTime ? { currentDocument: { updateTime: existing.updateTime } } : {}),
    },
  ], "FIRESTORE_METADATA");
  return response;
}
