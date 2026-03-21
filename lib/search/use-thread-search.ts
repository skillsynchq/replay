"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  init,
  sync,
  search as searchIndex,
  indexedCount,
  type GroupedSearchResult,
} from "./index";

interface UseThreadSearch {
  query: string;
  setQuery: (q: string) => void;
  /** Search results grouped by thread, each with matching message snippets */
  results: GroupedSearchResult[];
  syncing: boolean;
  isSearching: boolean;
  totalIndexed: number;
  resync: () => Promise<void>;
}

export function useThreadSearch(): UseThreadSearch {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupedSearchResult[]>([]);
  const [syncing, setSyncing] = useState(true);
  const [totalIndexed, setTotalIndexed] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      setSyncing(true);
      try {
        await init();
        setTotalIndexed(indexedCount());
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
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const r = searchIndex(query);
    setResults(r);
  }, [query]);

  const resync = useCallback(async () => {
    setSyncing(true);
    try {
      await sync();
      setTotalIndexed(indexedCount());
      if (query.trim()) {
        setResults(searchIndex(query));
      }
    } catch (err) {
      console.error("[search] resync error:", err);
    } finally {
      setSyncing(false);
    }
  }, [query]);

  return {
    query,
    setQuery,
    results,
    syncing,
    isSearching: query.trim().length > 0,
    totalIndexed,
    resync,
  };
}
