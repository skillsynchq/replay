"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThreadCard } from "@/app/components/thread-card";
import { PageReveal } from "@/app/components/page-reveal";
import { CopyButton } from "@/app/components/copy-button";
import { SearchResults } from "@/app/components/search-results";
import { AssistantSearchTrigger } from "@/app/components/assistant";
import { useThreadSearch } from "@/lib/search/use-thread-search";

interface ThreadItem {
  id: string;
  slug: string;
  title: string | null;
  conciseTitle: string | null;
  keyPoints: string[] | null;
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

function buildPageHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  const trimmed = query.trim();
  if (trimmed) params.set("q", trimmed);
  const search = params.toString();
  return search ? `/dashboard?${search}` : "/dashboard";
}

export function DashboardClient({
  initialData,
  initialQuery,
}: {
  initialData: ThreadsResponse;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const { results, syncing, isSearching } = useThreadSearch(query);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextUrl = buildPageHref(initialData.page, query);
      if (nextUrl !== window.location.pathname + window.location.search) {
        window.history.replaceState(null, "", nextUrl);
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [initialData.page, query]);

  const totalPages = Math.ceil(initialData.total / initialData.limit);
  const hasThreads = initialData.total > 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageReveal>
        <h1 className="text-balance text-[21px] font-medium text-fg">
          Your threads
        </h1>
        <p className="mt-1 text-[13px] text-fg-muted">
          Manage your uploaded agent sessions.
        </p>
      </PageReveal>

      {hasThreads ? (
        <PageReveal delay={40}>
          <div className="mt-6 flex items-center gap-2">
            <div className="relative flex-1">
              <label className="sr-only" htmlFor="dashboard-search">
                Search your threads
              </label>
              <input
                id="dashboard-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search threads…"
                autoComplete="off"
                className="w-full rounded-[4px] border border-border bg-surface px-3 py-2 text-[13px] text-fg placeholder:text-fg-ghost focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              />
              {syncing ? (
                <div
                  aria-hidden="true"
                  className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 rounded-full border-2 border-fg-ghost/30 border-t-fg-ghost motion-safe:animate-spin"
                />
              ) : null}
              <p className="sr-only" aria-live="polite">
                {syncing ? "Search index syncing…" : ""}
              </p>
            </div>
            <AssistantSearchTrigger />
          </div>
        </PageReveal>
      ) : null}

      <PageReveal delay={80}>
        <div className="mt-6">
          {isSearching ? (
            <SearchResults results={results} query={query} />
          ) : initialData.threads.length === 0 ? (
            <div className="rounded-[4px] border border-border px-6 py-10 text-center">
              <p className="text-[14px] font-medium text-fg">No threads yet</p>
              <p className="mt-2 text-[13px] text-fg-muted">
                Install the CLI and upload your first session.
              </p>
              <div className="mx-auto mt-6 flex max-w-lg items-center gap-3 rounded-[4px] border border-border bg-surface-raised px-5 py-3.5 font-mono text-[13px]">
                <span className="select-none text-fg-ghost">$</span>
                <code className="flex-1 select-all text-left text-fg">
                  {INSTALL_COMMAND}
                </code>
                <CopyButton text={INSTALL_COMMAND} />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {initialData.threads.map((thread) => (
                  <ThreadCard
                    key={thread.id}
                    slug={thread.slug}
                    title={thread.title}
                    conciseTitle={thread.conciseTitle}
                    keyPoints={thread.keyPoints}
                    agent={thread.agent}
                    model={thread.model}
                    visibility={thread.visibility}
                    messageCount={thread.messageCount}
                    sessionTs={thread.sessionTs}
                    showVisibility
                  />
                ))}
              </div>

              {totalPages > 1 ? (
                <nav
                  aria-label="Thread list pagination"
                  className="mt-8 flex items-center justify-center gap-4"
                >
                  {initialData.page > 1 ? (
                    <Link
                      href={buildPageHref(initialData.page - 1, query)}
                      scroll={false}
                      className="text-[13px] text-fg-muted transition-colors duration-150 hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                    >
                      ← Previous
                    </Link>
                  ) : (
                    <span className="text-[13px] text-fg-faint">← Previous</span>
                  )}

                  <span className="font-mono text-[11px] text-fg-ghost">
                    {initialData.page} / {totalPages}
                  </span>

                  {initialData.page < totalPages ? (
                    <Link
                      href={buildPageHref(initialData.page + 1, query)}
                      scroll={false}
                      className="text-[13px] text-fg-muted transition-colors duration-150 hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                    >
                      Next →
                    </Link>
                  ) : (
                    <span className="text-[13px] text-fg-faint">Next →</span>
                  )}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </PageReveal>
    </div>
  );
}
