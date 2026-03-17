const encoder = new TextEncoder();
const decoder = new TextDecoder();

const KEYPAIR_STORAGE = "rivvo_keypair_jwk";
const DEVICE_KEYPAIR_STORAGE = "rivvo_device_keypair_jwk";
const STORAGE_KEY = "rivvo_storage_key_jwk";
const DEVICE_ID = "rivvo_device_id";

export interface StoredKeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

export const generateKeyPair = async () => {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );

  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return { publicKey, privateKey };
};

export const loadKeyPair = (): StoredKeyPair | null => {
  const raw = localStorage.getItem(KEYPAIR_STORAGE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredKeyPair;
  } catch {
    return null;
  }
};

export const saveKeyPair = (pair: StoredKeyPair) => {
  localStorage.setItem(KEYPAIR_STORAGE, JSON.stringify(pair));
};

export const getOrCreateKeyPair = async () => {
  const existing = loadKeyPair();
  if (existing) return existing;
  const created = await generateKeyPair();
  saveKeyPair(created);
  return created;
};

export const getDeviceId = () => {
  const existing = localStorage.getItem(DEVICE_ID);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID, created);
  return created;
};

export const loadDeviceKeyPair = (): StoredKeyPair | null => {
  const raw = localStorage.getItem(DEVICE_KEYPAIR_STORAGE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredKeyPair;
  } catch {
    return null;
  }
};

export const saveDeviceKeyPair = (pair: StoredKeyPair) => {
  localStorage.setItem(DEVICE_KEYPAIR_STORAGE, JSON.stringify(pair));
};

export const getOrCreateDeviceKeyPair = async () => {
  const existing = loadDeviceKeyPair();
  if (existing) return existing;
  const created = await generateKeyPair();
  saveDeviceKeyPair(created);
  return created;
};

export const importPublicKey = async (jwk: JsonWebKey) => {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
};

export const importPrivateKey = async (jwk: JsonWebKey) => {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
};

export const deriveSharedKey = async (privateKey: CryptoKey, publicKey: CryptoKey) => {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export const generateGroupKey = async () => {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
};

export const exportRawKey = async (key: CryptoKey) => {
  const raw = await crypto.subtle.exportKey("raw", key);
  return toBase64(raw);
};

export const importRawKey = async (rawBase64: string) => {
  const raw = fromBase64(rawBase64);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
};

export const getOrCreateStorageKey = async () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const jwk = JSON.parse(raw) as JsonWebKey;
    return crypto.subtle.importKey("jwk", jwk, { name: "AES-GCM" }, true, [
      "encrypt",
      "decrypt",
    ]);
  }

  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const jwk = await crypto.subtle.exportKey("jwk", key);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jwk));
  return key;
};

const toBase64 = (buffer: ArrayBuffer | ArrayBufferView) => {
  const bytes =
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return btoa(String.fromCharCode(...bytes));
};

const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

export const encryptMessage = async (plainText: string, key: CryptoKey) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plainText)
  );

  return {
    ciphertext: toBase64(cipherBuffer),
    iv: toBase64(iv)
  };
};

export const decryptMessage = async (ciphertext: string, iv: string, key: CryptoKey) => {
  const ivBytes = fromBase64(iv);
  const cipherBytes = fromBase64(ciphertext);
  const cipherBuffer = cipherBytes.buffer.slice(
    cipherBytes.byteOffset,
    cipherBytes.byteOffset + cipherBytes.byteLength
  );
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    cipherBuffer
  );
  return decoder.decode(plainBuffer);
};

export const encryptBytes = async (buffer: ArrayBuffer, key: CryptoKey) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, buffer);
  return { cipherBuffer, iv: toBase64(iv) };
};

export const decryptBytes = async (buffer: ArrayBuffer, iv: string, key: CryptoKey) => {
  const ivBytes = fromBase64(iv);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, key, buffer);
};

export const encryptLocal = async (plainText: string) => {
  const key = await getOrCreateStorageKey();
  return encryptMessage(plainText, key);
};

export const decryptLocal = async (ciphertext: string, iv: string) => {
  const key = await getOrCreateStorageKey();
  return decryptMessage(ciphertext, iv, key);
};

export const fingerprintPublicKey = async (publicKey: JsonWebKey) => {
  const data = encoder.encode(JSON.stringify(publicKey));
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
};
