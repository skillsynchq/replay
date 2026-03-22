"use client";

import {
  startTransition,
  useDeferredValue,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Index as FlexIndex } from "flexsearch";
import { ThreadCard } from "@/app/components/thread-card";
import { SearchResults } from "@/app/components/search-results";
import { AssistantSearchTrigger } from "@/app/components/assistant";
import type { GroupedSearchResult } from "@/lib/search/index";

interface ThreadItem {
  id: string;
  slug: string;
  title: string | null;
  agent: string;
  model: string | null;
  messageCount: number;
  sessionTs: string;
}

interface ProfileThreadsProps {
  threads: ThreadItem[];
  profileName: string;
  isAuthenticated: boolean;
}

export function ProfileThreads({
  threads,
  profileName,
  isAuthenticated,
}: ProfileThreadsProps) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<FlexIndex | null>(null);
  const [indexReady, setIndexReady] = useState(false);
  const indexedRef = useRef(false);
  const deferredQuery = useDeferredValue(query);

  const buildIndex = useCallback(() => {
    if (indexedRef.current) return;
    indexedRef.current = true;

    const flex = new FlexIndex({ tokenize: "forward", cache: 100 });

    for (let i = 0; i < threads.length; i++) {
      const t = threads[i];
      // Index title + agent + model as searchable text
      const text = [t.title || "", t.agent, t.model || ""].join(" ");
      flex.add(i, text);
    }

    setIndex(flex);
    setIndexReady(true);
  }, [threads]);

  const results = useMemo(() => {
    if (!indexReady || !deferredQuery.trim() || !index) {
      return [];
    }

    const ids = index.search(deferredQuery, 20) as number[];
    const groups: GroupedSearchResult[] = [];

    for (const idx of ids) {
      const t = threads[idx];
      if (!t) continue;
      groups.push({
        threadId: t.id,
        slug: t.slug,
        title: t.title,
        agent: t.agent,
        model: t.model,
        matches: [
          {
            ordinal: 0,
            role: "info",
            snippet: `${t.agent}${t.model ? ` · ${t.model}` : ""} · ${t.messageCount} messages`,
          },
        ],
      });
    }

    return groups;
  }, [deferredQuery, index, indexReady, threads]);

  const handleQueryChange = useCallback(
    (nextQuery: string) => {
      startTransition(() => {
        setQuery(nextQuery);
      });
      if (nextQuery.trim() && !index) buildIndex();
    },
    [buildIndex, index]
  );

  const threadContext = useMemo(() => {
    if (threads.length === 0) return undefined;
    return (
      `Viewing ${profileName}'s public profile with ${threads.length} public threads:\n` +
      threads
        .slice(0, 50)
        .map(
          (t) =>
            `- "${t.title || "Untitled"}" (${t.agent}, ${t.model || "unknown model"}, ${t.messageCount} messages)`
        )
        .join("\n")
    );
  }, [threads, profileName]);

  if (threads.length === 0) {
    return (
      <p className="mt-6 text-[13px] text-fg-ghost">No public threads yet.</p>
    );
  }

  const isSearching = query.trim().length > 0;

  return (
    <>
      <div className="mt-6 flex items-center gap-2">
        <label className="sr-only" htmlFor="profile-thread-search">
          Search public threads
        </label>
        <input
          id="profile-thread-search"
          type="text"
          value={query}
          onFocus={buildIndex}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search threads…"
          autoComplete="off"
          className="w-full rounded-[4px] border border-border bg-surface px-3 py-2 text-[13px] text-fg placeholder:text-fg-ghost focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        />
        {isAuthenticated && (
          <AssistantSearchTrigger threadContext={threadContext} />
        )}
      </div>

      <div className="mt-4">
        {isSearching ? (
          <SearchResults results={results} query={query} />
        ) : (
          <div className="space-y-3">
            {threads.map((t) => (
              <ThreadCard
                key={t.id}
                slug={t.slug}
                title={t.title}
                agent={t.agent}
                model={t.model}
                messageCount={t.messageCount}
                sessionTs={t.sessionTs}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
