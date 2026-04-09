"use client";

import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  init,
  sync,
  search as searchIndex,
  indexedCount,
  type GroupedSearchResult,
} from "./index";

interface UseThreadSearch {
  /** Search results grouped by thread, each with matching message snippets */
  results: GroupedSearchResult[];
  syncing: boolean;
  isSearching: boolean;
  totalIndexed: number;
  resync: () => Promise<void>;
}

type SearchIdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function useThreadSearch(query: string): UseThreadSearch {
  const [results, setResults] = useState<GroupedSearchResult[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [totalIndexed, setTotalIndexed] = useState(0);
  const [ready, setReady] = useState(false);
  const mountedRef = useRef(true);
  const initTaskRef = useRef<Promise<void> | null>(null);
  const deferredQuery = useDeferredValue(query);

  const ensureInitialized = useCallback(() => {
    if (initTaskRef.current) {
      return initTaskRef.current;
    }

    initTaskRef.current = (async () => {
      await init();
      if (!mountedRef.current) return;
      setTotalIndexed(indexedCount());
      setReady(true);
    })().catch((error) => {
      initTaskRef.current = null;
      throw error;
    });

    return initTaskRef.current;
  }, []);

  const syncIndex = useCallback(async () => {
    setSyncing(true);
    try {
      await ensureInitialized();
      await sync();
      if (!mountedRef.current) return;
      setTotalIndexed(indexedCount());
    } catch (err) {
      console.error("[search] sync error:", err);
    } finally {
      if (mountedRef.current) {
        setSyncing(false);
      }
    }
  }, [ensureInitialized]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let timeoutId: number | null = null;
    let idleId: number | null = null;
    const idleWindow = window as SearchIdleWindow;

    const bootstrap = () => {
      void ensureInitialized()
        .then(() => syncIndex())
        .catch((error) => {
          console.error("[search] init error:", error);
        });
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(bootstrap, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(bootstrap, 0);
    }

    return () => {
      if (idleId !== null && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [ensureInitialized, syncIndex]);

  useEffect(() => {
    if (!ready || !deferredQuery.trim()) {
      if (deferredQuery.trim()) {
        void ensureInitialized();
      }
      setResults([]);
      return;
    }

    startTransition(() => {
      setResults(searchIndex(deferredQuery));
    });
  }, [deferredQuery, ensureInitialized, ready]);

  const resync = useCallback(async () => {
    await syncIndex();
    if (query.trim()) {
      startTransition(() => {
        setResults(searchIndex(query));
      });
    }
  }, [query, syncIndex]);

  return {
    results,
    syncing,
    isSearching: query.trim().length > 0,
    totalIndexed,
    resync,
  };
}
