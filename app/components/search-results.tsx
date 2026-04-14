"use client";

import Link from "next/link";
import posthog from "posthog-js";
import type { GroupedSearchResult } from "@/lib/search/index";

interface SearchResultsProps {
  results: GroupedSearchResult[];
  query: string;
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;

  // Build regex from query words for highlighting
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length === 0) return text;

  const regex = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        className="bg-accent/20 text-accent rounded-[2px] px-[2px] mx-[-2px]"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function SearchResults({ results, query }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <p className="text-[13px] text-fg-ghost py-8 text-center">
        No matches for &ldquo;{query}&rdquo;
      </p>
    );
  }

  function trackClick(slug: string, index: number) {
    posthog.capture("search_result_clicked", {
      query,
      result_thread_slug: slug,
      result_index: index,
    });
  }

  return (
    <div className="space-y-1">
      {results.map((group, groupIdx) => (
        <div
          key={group.threadId}
          className="border border-border rounded-[4px] overflow-hidden"
        >
          {/* Thread header */}
          <Link
            href={`/t/${group.slug}`}
            onClick={() => trackClick(group.slug, groupIdx)}
            className="flex items-center gap-2 border-b border-border bg-surface-raised px-4 py-2.5 transition-colors duration-150 hover:bg-surface-raised/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
          >
            <span className="text-[13px] font-medium text-fg truncate">
              {group.title ?? "Untitled thread"}
            </span>
            <span className="ml-auto shrink-0 font-mono text-[11px] text-fg-ghost">
              {group.matches.length}{" "}
              {group.matches.length === 1 ? "match" : "matches"}
            </span>
          </Link>

          {/* Matching message snippets */}
          <div className="divide-y divide-border/50">
            {group.matches.slice(0, 5).map((match) => (
              <Link
                key={match.ordinal}
                href={`/t/${group.slug}#m${match.ordinal}`}
                onClick={() => trackClick(group.slug, groupIdx)}
                className="group flex gap-3 px-4 py-2 transition-colors duration-150 hover:bg-surface-raised/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
              >
                <span className="shrink-0 font-mono text-[10px] text-fg-faint mt-[3px] w-14 text-right">
                  {match.role === "user" ? "you" : "agent"}
                </span>
                <p className="text-[12px] text-fg-muted leading-relaxed line-clamp-2 group-hover:text-fg transition-colors duration-150">
                  {highlightMatch(match.snippet, query)}
                </p>
              </Link>
            ))}
            {group.matches.length > 5 && (
              <Link
                href={`/t/${group.slug}`}
                onClick={() => trackClick(group.slug, groupIdx)}
                className="block px-4 py-1.5 text-[11px] text-fg-ghost transition-colors duration-150 hover:text-fg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
              >
                +{group.matches.length - 5} more{" "}
                {group.matches.length - 5 === 1 ? "match" : "matches"}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
