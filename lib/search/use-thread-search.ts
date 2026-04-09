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

export function useThreadSearch(query: string): UseThreadSearch {
  const [results, setResults] = useState<GroupedSearchResult[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [totalIndexed, setTotalIndexed] = useState(0);
  const [ready, setReady] = useState(false);
  const initialized = useRef(false);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        // Load from IndexedDB first — searches work immediately against cached data
        await init();
        setTotalIndexed(indexedCount());
        setReady(true);

        // Then sync with server in background
        setSyncing(true);
        await sync();
        setTotalIndexed(indexedCount());
      } catch (err) {
        console.error("[search] sync error:", err);
      } finally {
        setSyncing(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready || !deferredQuery.trim()) {
      setResults([]);
      return;
    }
    startTransition(() => {
      setResults(searchIndex(deferredQuery));
    });
  }, [deferredQuery, ready]);

  const resync = useCallback(async () => {
    setSyncing(true);
    try {
      await sync();
      setTotalIndexed(indexedCount());
      if (query.trim()) {
        startTransition(() => {
          setResults(searchIndex(query));
        });
      }
    } catch (err) {
      console.error("[search] resync error:", err);
    } finally {
      setSyncing(false);
    }
  }, [query]);

  return {
    results,
    syncing,
    isSearching: query.trim().length > 0,
    totalIndexed,
    resync,
  };
}
