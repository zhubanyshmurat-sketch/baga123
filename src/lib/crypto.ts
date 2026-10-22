import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Column-level encryption for the most personal records (diary entries, test answers).
 *
 * AES-256-GCM, a fresh random IV per value, and the owner's user id bound in as additional
 * authenticated data: a ciphertext copied onto another user's row will not decrypt. The key
 * lives only in the server environment, so nobody with access to the database alone (including
 * an administrator in the Supabase dashboard) can read these columns.
 *
 * APP_ENCRYPTION_KEYS = "v2:<base64 32 bytes>,v1:<base64 32 bytes>"
 *   The first key encrypts new data; every listed key can decrypt, which allows key rotation.
 *   Generate one with:  node -e "console.log('v1:'+require('crypto').randomBytes(32).toString('base64'))"
 *
 * Token format: <version>.<iv>.<tag>.<ciphertext> (base64url parts).
 */

export class EncryptionNotConfiguredError extends Error {
  constructor() {
    super("APP_ENCRYPTION_KEYS is not set");
    this.name = "EncryptionNotConfiguredError";
  }
}

interface KeyRing {
  current: string;
  keys: Map<string, Buffer>;
}

let cached: KeyRing | null = null;

function loadKeys(): KeyRing {
  if (cached) return cached;
  const raw = process.env.APP_ENCRYPTION_KEYS?.trim();
  const keys = new Map<string, Buffer>();
  let current = "";

  if (raw) {
    for (const part of raw.split(",")) {
      const [version, b64] = part.trim().split(":");
      const key = b64 ? Buffer.from(b64, "base64") : null;
      if (!version || !key || key.length !== 32) {
        throw new Error("APP_ENCRYPTION_KEYS must look like v1:<base64 of 32 bytes>");
      }
      keys.set(version, key);
      if (!current) current = version;
    }
  } else if (process.env.NODE_ENV !== "production") {
    // Development convenience only: a fixed, publicly known key. Never used in production.
    console.warn("[crypto] APP_ENCRYPTION_KEYS is not set; using an insecure development key.");
    keys.set("dev", createHash("sha256").update("studentmind-dev-only-key").digest());
    current = "dev";
  } else {
    throw new EncryptionNotConfiguredError();
  }

  cached = { current, keys };
  return cached;
}

const b64u = (buf: Buffer) => buf.toString("base64url");

/** Encrypts a JSON-serialisable value for one user and purpose (e.g. "diary"). */
export function encryptJson(value: unknown, userId: string, purpose: string): string {
  const { current, keys } = loadKeys();
  const key = keys.get(current)!;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`${purpose}:${userId}`));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [current, b64u(iv), b64u(cipher.getAuthTag()), b64u(ciphertext)].join(".");
}

/** Decrypts a value produced by `encryptJson`; throws if it was tampered with or belongs to someone else. */
export function decryptJson<T>(token: string, userId: string, purpose: string): T {
  const [version, iv, tag, ciphertext] = token.split(".");
  const key = loadKeys().keys.get(version ?? "");
  if (!key || !iv || !tag || !ciphertext) throw new Error("Malformed or unknown-key ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(`${purpose}:${userId}`));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const plain = Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as T;
}

/** Test helper: forget the cached keys after changing the environment. */
export function resetKeyCacheForTests() {
  cached = null;
}
