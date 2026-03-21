"use client";

import { useState, useRef, useCallback, useMemo } from "react";
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
  const [results, setResults] = useState<GroupedSearchResult[]>([]);
  const indexRef = useRef<FlexIndex | null>(null);
  const indexedRef = useRef(false);
  const threadMapRef = useRef<Map<string, ThreadItem>>(new Map());

  const buildIndex = useCallback(() => {
    if (indexedRef.current) return;
    indexedRef.current = true;

    const flex = new FlexIndex({ tokenize: "forward", cache: 100 });
    const tMap = new Map<string, ThreadItem>();

    for (let i = 0; i < threads.length; i++) {
      const t = threads[i];
      tMap.set(t.id, t);
      // Index title + agent + model as searchable text
      const text = [t.title || "", t.agent, t.model || ""].join(" ");
      flex.add(i, text);
    }

    indexRef.current = flex;
    threadMapRef.current = tMap;
  }, [threads]);

  const doSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (!q.trim()) {
        setResults([]);
        return;
      }
      if (!indexRef.current) return;

      const ids = indexRef.current.search(q, 20) as number[];
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
      setResults(groups);
    },
    [threads]
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
        <input
          type="text"
          value={query}
          onFocus={buildIndex}
          onChange={(e) => doSearch(e.target.value)}
          placeholder="Search threads..."
          className="w-full border border-border bg-surface rounded-[4px] px-3 py-2 text-[13px] text-fg placeholder:text-fg-ghost outline-none focus:border-fg-faint transition-colors duration-150"
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
