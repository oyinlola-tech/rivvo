import { decryptLocal, encryptLocal } from "./crypto";

const DB_NAME = "rivvo";
const DB_VERSION = 1;
const STORE_MESSAGES = "messages";
const STORE_STATE = "conversation_state";

interface StoredMessage {
  id: string;
  ownerId: string;
  conversationId: string;
  timestamp: string;
  sender: "me" | "them";
  senderId?: string;
  encrypted?: boolean;
  iv?: string | null;
  readAt?: string | null;
  localCiphertext: string;
  localIv: string;
  serverCiphertext?: string | null;
  serverIv?: string | null;
}

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const store = db.createObjectStore(STORE_MESSAGES, { keyPath: "id" });
        store.createIndex("byOwnerConversationTime", ["ownerId", "conversationId", "timestamp"]);
      }
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const saveMessages = async (
  ownerId: string,
  conversationId: string,
  messages: Array<{
    id: string;
    text: string;
    timestamp: string;
    sender: "me" | "them";
    senderId?: string;
    encrypted?: boolean;
    iv?: string | null;
    readAt?: string | null;
  }>
) => {
  const db = await openDb();
  const tx = db.transaction(STORE_MESSAGES, "readwrite");
  const store = tx.objectStore(STORE_MESSAGES);

  for (const msg of messages) {
    const localEncrypted = await encryptLocal(msg.text);
    const record: StoredMessage = {
      id: msg.id,
      ownerId,
      conversationId,
      timestamp: msg.timestamp,
      sender: msg.sender,
      senderId: msg.senderId,
      encrypted: msg.encrypted,
      iv: msg.iv || null,
      readAt: msg.readAt || null,
      localCiphertext: localEncrypted.ciphertext,
      localIv: localEncrypted.iv,
      serverCiphertext: msg.encrypted ? msg.text : null,
      serverIv: msg.encrypted ? msg.iv || null : null
    };
    store.put(record);
  }

  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(null);
    tx.onerror = () => reject(tx.error);
  });
};

export const loadMessages = async (ownerId: string, conversationId: string) => {
  const db = await openDb();
  const tx = db.transaction(STORE_MESSAGES, "readonly");
  const store = tx.objectStore(STORE_MESSAGES);
  const index = store.index("byOwnerConversationTime");
  const range = IDBKeyRange.bound([ownerId, conversationId, ""], [ownerId, conversationId, "\uffff"]);

  const request = index.getAll(range);
  const records: StoredMessage[] = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as StoredMessage[]);
    request.onerror = () => reject(request.error);
  });

  const hydrated = await Promise.all(
    records.map(async (record) => {
      const text = await decryptLocal(record.localCiphertext, record.localIv);
      return {
        id: record.id,
        text,
        timestamp: record.timestamp,
        sender: record.sender,
        senderId: record.senderId,
        encrypted: record.encrypted,
        iv: record.iv,
        readAt: record.readAt
      };
    })
  );

  return hydrated;
};

export const setConversationSync = async (ownerId: string, conversationId: string, lastSyncAt: string) => {
  const db = await openDb();
  const tx = db.transaction(STORE_STATE, "readwrite");
  const store = tx.objectStore(STORE_STATE);
  store.put({ key: `${ownerId}:${conversationId}`, lastSyncAt });
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(null);
    tx.onerror = () => reject(tx.error);
  });
};

export const getConversationSync = async (ownerId: string, conversationId: string) => {
  const db = await openDb();
  const tx = db.transaction(STORE_STATE, "readonly");
  const store = tx.objectStore(STORE_STATE);
  const request = store.get(`${ownerId}:${conversationId}`);
  const record = await new Promise<{ lastSyncAt?: string } | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as { lastSyncAt?: string } | undefined);
    request.onerror = () => reject(request.error);
  });
  return record?.lastSyncAt || null;
};
