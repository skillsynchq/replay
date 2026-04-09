/**
 * Thread search engine — per-message indexing.
 *
 * Each message is individually indexed so search results can show
 * exactly which message matched with a surrounding snippet.
 *
 * Sync flow:
 *   1. Load threads + messages from IndexedDB → rebuild FlexSearch index
 *   2. Fetch /api/threads/sync?since=<lastSyncTs> for incremental updates
 *   3. Upsert into IndexedDB + FlexSearch
 *   4. Persist new syncTs
 */

import { Index as FlexIndex } from "flexsearch";
import {
  type StoredThread,
  type StoredMessage,
  getAllThreads,
  getAllMessages,
  putThreadsAndMessages,
  getSyncTs,
  setSyncTs,
} from "./db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchMatch {
  threadId: string;
  slug: string;
  title: string | null;
  agent: string;
  model: string | null;
  ordinal: number;
  role: string;
  snippet: string;
}

export interface GroupedSearchResult {
  threadId: string;
  slug: string;
  title: string | null;
  agent: string;
  model: string | null;
  matches: { ordinal: number; role: string; snippet: string }[];
}

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

/** Thread metadata by id */
const threadMap = new Map<string, StoredThread>();

/** Message lookup by numeric FlexSearch key */
const keyToMessage = new Map<number, StoredMessage>();

/** Map composite message key → numeric FlexSearch key */
const msgKeyToNum = new Map<string, number>();
let nextKey = 0;

const flexIndex = new FlexIndex({
  tokenize: "forward",
  cache: 100,
});

function getNumKey(compositeKey: string): number {
  let key = msgKeyToNum.get(compositeKey);
  if (key === undefined) {
    key = nextKey++;
    msgKeyToNum.set(compositeKey, key);
  }
  return key;
}

function indexMessage(msg: StoredMessage) {
  const numKey = getNumKey(msg.key);
  if (keyToMessage.has(numKey)) {
    flexIndex.update(numKey, msg.content);
  } else {
    flexIndex.add(numKey, msg.content);
  }
  keyToMessage.set(numKey, msg);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Initialize: load from IndexedDB and rebuild the in-memory index */
export async function init(): Promise<number> {
  const [threads, messages] = await Promise.all([
    getAllThreads(),
    getAllMessages(),
  ]);
  for (const t of threads) threadMap.set(t.id, t);
  for (const m of messages) indexMessage(m);
  return threads.length;
}

/** Sync with the server. Returns the number of new/updated threads. */
export async function sync(): Promise<number> {
  const since = await getSyncTs();

  // Skip if synced recently (avoid redundant requests on rapid navigation)
  if (since) {
    const age = Date.now() - new Date(since).getTime();
    if (age < 30_000) return 0;
  }

  const url = since
    ? `/api/threads/sync?since=${encodeURIComponent(since)}`
    : `/api/threads/sync`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`);

  const data: {
    threads: (StoredThread & {
      messages: { ordinal: number; role: string; content: string }[];
    })[];
    syncTs: string;
  } = await res.json();

  if (data.threads.length > 0) {
    const storedThreads: StoredThread[] = [];
    const storedMessages: StoredMessage[] = [];

    for (const t of data.threads) {
      const { messages: msgs, ...threadData } = t;
      storedThreads.push(threadData);
      threadMap.set(t.id, threadData);

      for (const m of msgs) {
        const stored: StoredMessage = {
          key: `${t.id}:${m.ordinal}`,
          threadId: t.id,
          ordinal: m.ordinal,
          role: m.role,
          content: m.content,
        };
        storedMessages.push(stored);
        indexMessage(stored);
      }
    }

    await putThreadsAndMessages(storedThreads, storedMessages);
  }

  await setSyncTs(data.syncTs);
  return data.threads.length;
}

/**
 * Extract a snippet around the first occurrence of `query` in `text`.
 * Returns ~120 chars of context with the match in the middle.
 */
function extractSnippet(text: string, query: string, contextLen = 60): string {
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  // Try to match each word individually if full query doesn't match
  let idx = lower.indexOf(qLower);
  if (idx === -1) {
    // Find first matching word
    const words = qLower.split(/\s+/).filter(Boolean);
    for (const w of words) {
      idx = lower.indexOf(w);
      if (idx !== -1) break;
    }
  }
  if (idx === -1) idx = 0;

  const start = Math.max(0, idx - contextLen);
  const end = Math.min(text.length, idx + query.length + contextLen);
  let snippet = text.slice(start, end).replace(/\n+/g, " ").trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}

/** Full-text search, returns results grouped by thread */
export function search(query: string, limit = 100): GroupedSearchResult[] {
  if (!query.trim()) return [];

  const ids = flexIndex.search(query, limit) as number[];
  // Group by thread
  const groups = new Map<
    string,
    GroupedSearchResult
  >();

  for (const numKey of ids) {
    const msg = keyToMessage.get(numKey);
    if (!msg) continue;
    const thread = threadMap.get(msg.threadId);
    if (!thread) continue;

    let group = groups.get(msg.threadId);
    if (!group) {
      group = {
        threadId: thread.id,
        slug: thread.slug,
        title: thread.title,
        agent: thread.agent,
        model: thread.model,
        matches: [],
      };
      groups.set(msg.threadId, group);
    }
    group.matches.push({
      ordinal: msg.ordinal,
      role: msg.role,
      snippet: extractSnippet(msg.content, query),
    });
  }

  // Sort matches within each group by ordinal
  for (const group of groups.values()) {
    group.matches.sort((a, b) => a.ordinal - b.ordinal);
  }

  return Array.from(groups.values());
}

/** Get total number of indexed threads */
export function indexedCount(): number {
  return threadMap.size;
}
