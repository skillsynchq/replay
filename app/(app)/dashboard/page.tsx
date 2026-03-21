"use client";

import { useEffect, useState } from "react";
import { ThreadCard } from "@/app/components/thread-card";
import { PageReveal } from "@/app/components/page-reveal";
import { CopyButton } from "@/app/components/copy-button";

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

  return (
    <div className="mx-auto max-w-3xl">
      <PageReveal>
        <h1 className="text-[21px] font-medium text-fg">Your threads</h1>
        <p className="mt-1 text-[13px] text-fg-muted">
          Manage your uploaded agent sessions.
        </p>
      </PageReveal>

      <PageReveal delay={80}>
        <div className="mt-8">
          {loading && !data ? (
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

              {/* Pagination */}
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
