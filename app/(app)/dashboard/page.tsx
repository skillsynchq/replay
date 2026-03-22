"use client";

import { useEffect, useState } from "react";
import { ThreadCard } from "@/app/components/thread-card";
import { PageReveal } from "@/app/components/page-reveal";
import { CopyButton } from "@/app/components/copy-button";
import { useThreadSearch } from "@/lib/search/use-thread-search";
import { SearchResults } from "@/app/components/search-results";
import { AssistantSearchTrigger } from "@/app/components/assistant";

interface ThreadItem {
  id: string;
  slug: string;
  title: string | null;
  agent: string;
  model: string | null;
  visibility: string;
  messageCount: number;
  sessionTs: string;
  createdAt: string;
}

interface ThreadsResponse {
  threads: ThreadItem[];
  total: number;
  page: number;
  limit: number;
}

const INSTALL_COMMAND = "curl -sSf https://replay.md/install | sh";

export default function DashboardPage() {
  const [data, setData] = useState<ThreadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const { query, setQuery, results, syncing, isSearching, totalIndexed } =
    useThreadSearch();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/threads?page=${page}&limit=20`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch threads");
        return r.json() as Promise<ThreadsResponse>;
      })
      .then(setData)
      .catch(() => setData({ threads: [], total: 0, page: 1, limit: 20 }))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;
  const hasThreads = data && data.total > 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageReveal>
        <h1 className="text-[21px] font-medium text-fg">Your threads</h1>
        <p className="mt-1 text-[13px] text-fg-muted">
          Manage your uploaded agent sessions.
        </p>
      </PageReveal>

      {/* Search + Ask AI — only show when user has threads */}
      {hasThreads && (
        <PageReveal delay={40}>
          <div className="mt-6 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search threads..."
                className="w-full border border-border bg-surface rounded-[4px] px-3 py-2 text-[13px] text-fg placeholder:text-fg-ghost outline-none focus:border-fg-faint transition-colors duration-150"
              />
              {syncing && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 border-2 border-fg-ghost/30 border-t-fg-ghost rounded-full animate-spin" />
              )}
            </div>
            <AssistantSearchTrigger />
          </div>
        </PageReveal>
      )}

      <PageReveal delay={80}>
        <div className="mt-6">
          {/* Search results mode */}
          {isSearching ? (
            <SearchResults results={results} query={query} />
          ) : /* Normal paginated list */
          loading && !data ? (
            <p className="text-[13px] text-fg-ghost">Loading...</p>
          ) : data && data.threads.length === 0 ? (
            /* Empty state */
            <div className="border border-border px-6 py-10 text-center rounded-[4px]">
              <p className="text-[14px] font-medium text-fg">
                No threads yet
              </p>
              <p className="mt-2 text-[13px] text-fg-muted">
                Install the CLI and upload your first session.
              </p>
              <div className="mx-auto mt-6 flex max-w-lg items-center gap-3 border border-border bg-surface-raised px-5 py-3.5 font-mono text-[13px] rounded-[4px]">
                <span className="text-fg-ghost select-none">$</span>
                <code className="flex-1 text-fg select-all text-left">
                  {INSTALL_COMMAND}
                </code>
                <CopyButton text={INSTALL_COMMAND} />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {data?.threads.map((t) => (
                  <ThreadCard
                    key={t.id}
                    slug={t.slug}
                    title={t.title}
                    agent={t.agent}
                    model={t.model}
                    visibility={t.visibility}
                    messageCount={t.messageCount}
                    sessionTs={t.sessionTs}
                    showVisibility
                  />
                ))}
              </div>

              {/* Pagination — hidden during search */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="text-[13px] text-fg-muted transition-colors duration-150 hover:text-fg disabled:text-fg-faint disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <span className="font-mono text-[11px] text-fg-ghost">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page >= totalPages}
                    className="text-[13px] text-fg-muted transition-colors duration-150 hover:text-fg disabled:text-fg-faint disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </PageReveal>
    </div>
  );
}
