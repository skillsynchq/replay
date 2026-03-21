/**
 * IndexedDB wrapper for storing thread + message data locally.
 * Messages are stored individually for per-message search indexing.
 */

const DB_NAME = "replay-search";
const DB_VERSION = 2;
const THREADS_STORE = "threads";
const MESSAGES_STORE = "messages";
const META_STORE = "meta";

export interface StoredThread {
  id: string;
  slug: string;
  title: string | null;
  agent: string;
  model: string | null;
  visibility: string;
  tags: string[];
  messageCount: number;
  sessionTs: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMessage {
  /** Composite key: `${threadId}:${ordinal}` */
  key: string;
  threadId: string;
  ordinal: number;
  role: string;
  content: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Clean slate on version bump
      for (const name of Array.from(db.objectStoreNames)) {
        db.deleteObjectStore(name);
      }
      db.createObjectStore(THREADS_STORE, { keyPath: "id" });
      const msgStore = db.createObjectStore(MESSAGES_STORE, {
        keyPath: "key",
      });
      msgStore.createIndex("threadId", "threadId", { unique: false });
      db.createObjectStore(META_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Upsert threads and their messages */
export async function putThreadsAndMessages(
  threads: StoredThread[],
  messages: StoredMessage[]
): Promise<void> {
  if (threads.length === 0) return;
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [THREADS_STORE, MESSAGES_STORE],
      "readwrite"
    );
    const threadStore = tx.objectStore(THREADS_STORE);
    const msgStore = tx.objectStore(MESSAGES_STORE);

    for (const t of threads) {
      threadStore.put(t);
    }
    for (const m of messages) {
      msgStore.put(m);
    }

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** Get all stored threads */
export async function getAllThreads(): Promise<StoredThread[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(THREADS_STORE, "readonly");
    const req = tx.objectStore(THREADS_STORE).getAll();
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

/** Get all stored messages */
export async function getAllMessages(): Promise<StoredMessage[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MESSAGES_STORE, "readonly");
    const req = tx.objectStore(MESSAGES_STORE).getAll();
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

/** Get the last sync timestamp */
export async function getSyncTs(): Promise<string | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const req = tx.objectStore(META_STORE).get("syncTs");
    req.onsuccess = () => {
      db.close();
      resolve(req.result ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

/** Set the last sync timestamp */
export async function setSyncTs(ts: string): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readwrite");
    tx.objectStore(META_STORE).put(ts, "syncTs");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** Clear everything (useful for logout / reset) */
export async function clearAll(): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [THREADS_STORE, MESSAGES_STORE, META_STORE],
      "readwrite"
    );
    tx.objectStore(THREADS_STORE).clear();
    tx.objectStore(MESSAGES_STORE).clear();
    tx.objectStore(META_STORE).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
