"use client";

import Link from "next/link";
import { TrashIcon } from "@/app/components/icons";

interface TraceCardProps {
  slug: string;
  question: string;
  title?: string | null;
  status: string;
  createdAt: string;
  projectPath?: string | null;
  onDelete?: (slug: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "generating") {
    return (
      <span className="inline-flex items-center rounded-[2px] border border-accent-dim px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
        generating
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center rounded-[2px] border border-border-hover px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-red-400">
        failed
      </span>
    );
  }
  return null;
}

export function TraceCard({
  slug,
  question,
  title,
  status,
  createdAt,
  projectPath,
  onDelete,
}: TraceCardProps) {
  return (
    <div className="group relative">
      <Link
        href={`/traces/${slug}`}
        className="block rounded-[4px] border border-border px-5 py-4 transition-colors duration-150 hover:border-border-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-fg transition-colors duration-150 group-hover:text-accent">
              {title || question}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              {projectPath && (
                <span className="truncate font-mono text-[11px] text-fg-faint">
                  {projectPath.split("/").slice(-2).join("/")}
                </span>
              )}
              <span className="font-mono text-[11px] text-fg-faint">
                {formatRelativeTime(createdAt)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            <StatusBadge status={status} />
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(slug);
                }}
                className="rounded-[4px] p-1.5 text-fg-ghost opacity-0 transition-all duration-150 hover:bg-surface-raised hover:text-red-400 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer"
                aria-label={`Delete trace`}
              >
                <TrashIcon className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
