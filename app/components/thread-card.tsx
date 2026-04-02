import Link from "next/link";
import { AgentMark } from "./icons";
import { VisibilityBadge } from "./visibility-badge";

interface ThreadCardProps {
  slug: string;
  title: string | null;

  keyPoints?: string[] | null;
  agent: string;
  model: string | null;
  visibility?: string;
  messageCount: number;
  sessionTs: string;
  showVisibility?: boolean;
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

function agentLabel(agent: string): string {
  if (agent === "claude") return "Claude Code";
  if (agent === "codex") return "Codex";
  return agent;
}

export function ThreadCard({
  slug,
  title,
  keyPoints,
  agent,
  model,
  visibility,
  messageCount,
  sessionTs,
  showVisibility = false,
}: ThreadCardProps) {
  return (
    <Link
      href={`/t/${slug}`}
      className="group block rounded-[4px] border border-border px-5 py-4 transition-colors duration-150 hover:border-border-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-fg group-hover:text-accent transition-colors duration-150">
            {title ?? "Untitled thread"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1 text-[12px] text-fg-ghost">
              <AgentMark agent={agent} className="size-3 text-fg-faint" />
              {agentLabel(agent)}
            </span>
            {model && (
              <span className="text-[12px] text-fg-ghost">{model}</span>
            )}
            <span className="font-mono text-[11px] text-fg-faint">
              {messageCount} messages
            </span>
            <span className="font-mono text-[11px] text-fg-faint">
              {formatRelativeTime(sessionTs)}
            </span>
          </div>
          {keyPoints && keyPoints.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {keyPoints.map((point, i) => (
                <li
                  key={i}
                  className="text-[12px] text-fg-faint leading-tight truncate"
                >
                  <span className="text-fg-ghost mr-1.5">·</span>
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>
        {showVisibility && visibility && (
          <VisibilityBadge visibility={visibility} />
        )}
      </div>
    </Link>
  );
}
