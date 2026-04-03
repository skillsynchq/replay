import Link from "next/link";
import type {
  ConversationSnapshot,
  ConversationSnapshotKind,
} from "@/lib/thread-snapshot";
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
  conversationSnapshot?: ConversationSnapshot;
}

const SNAPSHOT_COLORS: Record<ConversationSnapshotKind, string> = {
  user: "rgb(249 115 22 / 0.82)",
  assistant: "rgb(243 196 141 / 0.26)",
  tool: "var(--surface-raised)",
};

function snapshotLabel(snapshot: ConversationSnapshot): string {
  const totals = { user: 0, assistant: 0, tool: 0 };
  let totalWeight = 0;

  for (const segment of snapshot) {
    totals[segment.kind] += segment.weight;
    totalWeight += segment.weight;
  }

  if (totalWeight === 0) return "Conversation snapshot";

  return `Conversation snapshot. User ${Math.round((totals.user / totalWeight) * 100)}%. Assistant ${Math.round((totals.assistant / totalWeight) * 100)}%. Tool ${Math.round((totals.tool / totalWeight) * 100)}%.`;
}

function ConversationSnapshotRail({
  snapshot,
}: {
  snapshot: ConversationSnapshot;
}) {
  const label = snapshotLabel(snapshot);

  return (
    <div className="flex shrink-0 items-stretch" title={label}>
      <div
        aria-hidden="true"
        className="flex min-h-[72px] w-1.5 overflow-hidden rounded-none bg-surface-raised ring-1 ring-inset ring-border/80"
      >
        <div className="flex h-full w-full flex-col">
          {snapshot.map((segment, index) => (
            <div
              key={`${segment.kind}-${index}`}
              className="w-full rounded-none"
              style={{
                flex: `${segment.weight} 1 0%`,
                backgroundColor: SNAPSHOT_COLORS[segment.kind],
              }}
            />
          ))}
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
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
  conversationSnapshot,
}: ThreadCardProps) {
  return (
    <Link
      href={`/t/${slug}`}
      className="group block rounded-[4px] border border-border px-5 py-4 transition-colors duration-150 hover:border-border-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <div className="flex items-stretch justify-between gap-4">
        <div className="min-w-0 flex-1 py-0.5">
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
        {(showVisibility && visibility) || conversationSnapshot ? (
          <div className="flex shrink-0 items-stretch gap-3">
            {showVisibility && visibility && (
              <div className="self-start pt-0.5">
                <VisibilityBadge visibility={visibility} />
              </div>
            )}
            {conversationSnapshot && (
              <ConversationSnapshotRail snapshot={conversationSnapshot} />
            )}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
