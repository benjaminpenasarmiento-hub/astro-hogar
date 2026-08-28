import { AsyncLocalStorage } from "node:async_hooks";
import firebaseConfig from "./firebase-applet-config.json";

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

export async function readHomeDocument(homeCode: string): Promise<{ exists: boolean; data: any; updateTime?: string }> {
  const response = await firestoreFetch(documentPath("nests", homeCode), { method: "GET" });
  if (response.status === 404) return { exists: false, data: null };
  if (!response.ok) throw new Error(`FIRESTORE_READ_${response.status}:${await response.text()}`);
  const payload = await response.json();
  return { exists: true, data: decodeFields(payload.fields), updateTime: payload.updateTime };
}

export async function writeHomeDocument(homeCode: string, data: any, expectedRevision?: number): Promise<number> {
  const existing = await readHomeDocument(homeCode);
  const remote = existing.exists ? existing.data || {} : {};
  const actualRevision = Number(remote.syncRevision || 0);
  const expected = expectedRevision === undefined ? actualRevision : expectedRevision;
  if (actualRevision !== expected) throw new Error(`SYNC_CONFLICT:${homeCode}:expected=${expected}:actual=${actualRevision}`);

  const nextRevision = actualRevision + 1;
  const savedAt = new Date().toISOString();
  const merged = { ...remote, homeCode, ...data, syncRevision: nextRevision, syncUpdatedAt: savedAt, updatedAt: savedAt };
  const documentName = `${API_BASE}/${documentPath("nests", homeCode)}`;
  const historyName = `${documentName}/history/${nextRevision}`;
  const writes: any[] = [
    { update: { name: documentName, fields: encodeFields(merged) }, ...(existing.updateTime ? { currentDocument: { updateTime: existing.updateTime } } : {}) },
    { update: { name: historyName, fields: encodeFields({ homeCode, revision: nextRevision, savedAt, actorUserId: "autenticado", source: "astro-hogar", data }) } },
  ];

  const response = await firestoreFetch("documents:commit", { method: "POST", body: JSON.stringify({ writes }) });
  if (!response.ok) throw new Error(`FIRESTORE_COMMIT_${response.status}:${await response.text()}`);
  return nextRevision;
}

export async function patchHomeMetadata(homeCode: string, metadata: Record<string, any>): Promise<void> {
  const existing = await readHomeDocument(homeCode);
  const current = existing.exists ? existing.data || {} : {};
  const documentName = `${API_BASE}/${documentPath("nests", homeCode)}`;
  const response = await firestoreFetch("documents:commit", {
    method: "POST",
    body: JSON.stringify({ writes: [{ update: { name: documentName, fields: encodeFields({ ...current, ...metadata }) }, ...(existing.updateTime ? { currentDocument: { updateTime: existing.updateTime } } : {}) }] }),
  });
  if (!response.ok) throw new Error(`FIRESTORE_METADATA_${response.status}:${await response.text()}`);
}
