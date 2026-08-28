import { createRequire } from "node:module";
import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getFirestore,
  getDoc,
  runTransaction,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const require = createRequire(import.meta.url);
const { app } = require("../dist/server.cjs");

let lockDb: Firestore | null = null;

function getLockDb(): Firestore {
  if (lockDb) return lockDb;
  const firebaseApp = initializeApp(firebaseConfig, "astro-hogar-vercel-lock");
  lockDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || undefined);
  return lockDb;
}

function cleanHomeCode(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || "HOGARPELUDO")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "-")
    .slice(0, 120);
}

function createOwnerToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

async function acquireHomeLock(db: Firestore, homeCode: string, owner: string): Promise<() => Promise<void>> {
  const lockRef = doc(collection(db, "_sync_locks"), homeCode);
  const timeoutMs = 15_000;
  const leaseMs = 8_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(lockRef);
        const data = snapshot.exists() ? snapshot.data() : {};
        const lockedUntil = Number(data?.lockedUntil || 0);
        const currentOwner = String(data?.owner || "");

        if (lockedUntil > Date.now() && currentOwner && currentOwner !== owner) {
          throw new Error("HOME_LOCK_BUSY");
        }

        tx.set(lockRef, {
          owner,
          homeCode,
          lockedUntil: Date.now() + leaseMs,
          acquiredAt: new Date().toISOString(),
        }, { merge: true });
      });

      let released = false;
      return async () => {
        if (released) return;
        released = true;
        try {
          await runTransaction(db, async (tx) => {
            const snapshot = await tx.get(lockRef);
            const data = snapshot.exists() ? snapshot.data() : {};
            if (String(data?.owner || "") === owner) {
              tx.set(lockRef, {
                owner: null,
                lockedUntil: 0,
                releasedAt: new Date().toISOString(),
              }, { merge: true });
            }
          });
        } catch (error) {
          console.warn("[Sync Lock] No se pudo liberar el lock:", error);
        }
      };
    } catch (error: any) {
      if (error?.message !== "HOME_LOCK_BUSY") throw error;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  throw new Error("SYNC_LOCK_TIMEOUT");
}

async function handler(req: any, res: any) {
  const method = String(req?.method || "GET").toUpperCase();
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (!isMutation || process.env.VERCEL !== "1") {
    return app(req, res);
  }

  const homeCode = cleanHomeCode(req?.headers?.["x-home-code"]);
  const owner = createOwnerToken();
  let release: (() => Promise<void>) | null = null;

  try {
    release = await acquireHomeLock(getLockDb(), homeCode, owner);
  } catch (error: any) {
    const status = error?.message === "SYNC_LOCK_TIMEOUT" ? 503 : 500;
    return res.status(status).json({
      success: false,
      error: status === 503
        ? "El hogar está sincronizando otro cambio. Intenta nuevamente en unos segundos."
        : "No se pudo preparar la sincronización segura del hogar.",
    });
  }

  let released = false;
  const safeRelease = async () => {
    if (released) return;
    released = true;
    if (release) await release();
  };

  res.once("finish", () => { safeRelease().catch(() => {}); });
  res.once("close", () => { safeRelease().catch(() => {}); });

  try {
    return app(req, res);
  } catch (error) {
    await safeRelease();
    throw error;
  }
}

export default handler;
