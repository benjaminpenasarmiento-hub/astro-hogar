import firebaseConfig from "./firebase-applet-config.json";

const PROJECT_ID = firebaseConfig.projectId;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId;
const API_BASE = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT_ID)}/databases/${encodeURIComponent(DATABASE_ID)}`;

function getAuthToken(): string | null {
  return globalThis.__astroFirestoreAuthToken || null;
}

function toFirestoreValue(value: any): any {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
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
  if ("referenceValue" in value) return value.referenceValue;
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

function docPath(collection: string, id: string): string {
  return `documents/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
}

async function firestoreFetch(path: string, init: RequestInit = {}) {
  const token = getAuthToken();
  if (!token) throw new Error("FIRESTORE_AUTH_TOKEN_MISSING");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  return fetch(`${API_BASE}/${path}`, { ...init, headers });
}

export async function readHomeDocument(homeCode: string): Promise<{ exists: boolean; data: any; updateTime?: string }> {
  const response = await firestoreFetch(docPath("nests", homeCode), { method: "GET" });
  if (response.status === 404) return { exists: false, data: null };
  if (!response.ok) throw new Error(`FIRESTORE_READ_${response.status}:${await response.text()}`);
  const payload = await response.json();
  return {
    exists: true,
    data: decodeFields(payload.fields),
    updateTime: payload.updateTime,
  };
}

export async function writeHomeDocumentTransactional(homeCode: string, data: any, expectedRevision: number): Promise<number> {
  const begin = await firestoreFetch("documents:beginTransaction", {
    method: "POST",
    body: JSON.stringify({ options: { readWrite: {} } }),
  });
  if (!begin.ok) throw new Error(`FIRESTORE_BEGIN_TX_${begin.status}:${await begin.text()}`);
  const { transaction } = await begin.json();

  const documentName = `${API_BASE}/${docPath("nests", homeCode)}`;
  const getResponse = await firestoreFetch(docPath("nests", homeCode), {
    method: "GET",
    headers: { "X-Firebase-Transaction": transaction },
  });

  let actualRevision = 0;
  let existingFields: Record<string, any> = {};
  let updateTime: string | undefined;
  if (getResponse.ok) {
    const remote = await getResponse.json();
    existingFields = decodeFields(remote.fields);
    actualRevision = Number(existingFields.syncRevision || 0);
    updateTime = remote.updateTime;
  } else if (getResponse.status !== 404) {
    throw new Error(`FIRESTORE_TX_READ_${getResponse.status}:${await getResponse.text()}`);
  }

  if (actualRevision !== expectedRevision) {
    try {
      await firestoreFetch("documents:rollback", {
        method: "POST",
        body: JSON.stringify({ transaction }),
      });
    } catch {}
    throw new Error(`SYNC_CONFLICT:${homeCode}:expected=${expectedRevision}:actual=${actualRevision}`);
  }

  const nextRevision = actualRevision + 1;
  const savedAt = new Date().toISOString();
  const merged = {
    ...existingFields,
    homeCode,
    data,
    syncRevision: nextRevision,
    syncUpdatedAt: savedAt,
    updatedAt: savedAt,
  };

  const write = {
    update: {
      name: documentName,
      fields: encodeFields(merged),
    },
    ...(updateTime ? { currentDocument: { updateTime } } : {}),
  };

  const commit = await firestoreFetch("documents:commit", {
    method: "POST",
    body: JSON.stringify({ transaction, writes: [write] }),
  });
  if (!commit.ok) throw new Error(`FIRESTORE_COMMIT_${commit.status}:${await commit.text()}`);

  return nextRevision;
}

export async function writeDocument(collection: string, id: string, data: Record<string, any>): Promise<void> {
  const response = await firestoreFetch(docPath(collection, id), {
    method: "PATCH",
    body: JSON.stringify({ name: `${API_BASE}/${docPath(collection, id)}`, fields: encodeFields(data) }),
  });
  if (!response.ok) throw new Error(`FIRESTORE_WRITE_${response.status}:${await response.text()}`);
}

declare global {
  // eslint-disable-next-line no-var
  var __astroFirestoreAuthToken: string | null | undefined;
}

export function setFirestoreAuthToken(token: string | null) {
  globalThis.__astroFirestoreAuthToken = token;
}
