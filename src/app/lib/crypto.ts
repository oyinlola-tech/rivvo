const encoder = new TextEncoder();
const decoder = new TextDecoder();

const KEYPAIR_STORAGE = "rivvo_keypair_jwk";

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

const toBase64 = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

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
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    cipherBytes
  );
  return decoder.decode(plainBuffer);
};
