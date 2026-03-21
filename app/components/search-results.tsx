import Link from "next/link";
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
    regex.test(part) ? (
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

  return (
    <div className="space-y-1">
      {results.map((group) => (
        <div
          key={group.threadId}
          className="border border-border rounded-[4px] overflow-hidden"
        >
          {/* Thread header */}
          <Link
            href={`/t/${group.slug}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface-raised hover:bg-surface-raised/80 transition-colors duration-150 border-b border-border"
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
                className="flex gap-3 px-4 py-2 hover:bg-surface-raised/40 transition-colors duration-150 group"
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
                className="block px-4 py-1.5 text-[11px] text-fg-ghost hover:text-fg-muted transition-colors duration-150"
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
