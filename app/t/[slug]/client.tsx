"use client";

import Link from "next/link";
import { ClaudeMark } from "@/app/components/icons";
import { VisibilityBadge } from "@/app/components/visibility-badge";
import { PageReveal } from "@/app/components/page-reveal";
import { ContentBlockRenderer } from "@/app/components/content-renderer";
import {
  UserMessage,
  AssistantMessage,
  RedactedMessage,
} from "@/app/components/thread-message";

interface MessageData {
  id: string;
  ordinal: number;
  role: string;
  content: string;
  contentBlocks: Record<string, unknown>[] | null;
  model: string | null;
  stopReason: string | null;
  usage: { input_tokens: number; output_tokens: number } | null;
  redacted: boolean;
  timestamp: string;
}

interface ThreadViewerProps {
  thread: {
    id: string;
    slug: string;
    title: string | null;
    agent: string;
    model: string | null;
    visibility: string;
    projectPath: string | null;
    gitBranch: string | null;
    cliVersion: string | null;
    messageCount: number;
    sessionTs: string;
    createdAt: string;
  };
  messages: MessageData[];
  owner: {
    name: string;
    username: string | null;
    image: string | null;
  };
  promptCount: number;
  isOwner: boolean;
}

function agentLabel(agent: string): string {
  if (agent === "claude") return "Claude Code";
  if (agent === "codex") return "Codex";
  return agent;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 1) {
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 1) return `${Math.floor(diffMs / 60000)}m ago`;
    return `${diffHours}h ago`;
  }
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SidebarItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-fg-ghost">
        {label}
      </span>
      <div className="text-[12px] text-fg-muted">{children}</div>
    </div>
  );
}

function renderMessage(msg: MessageData, isOwner: boolean) {
  if (msg.redacted && !isOwner) {
    return <RedactedMessage key={msg.id} />;
  }

  if (msg.role === "user") {
    // User messages: use content blocks if available, else flat text
    if (msg.contentBlocks) {
      const textBlocks = msg.contentBlocks.filter(
        (b) => b.type === "text"
      );
      const text = textBlocks
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");
      return <UserMessage key={msg.id} text={text || msg.content} />;
    }
    return <UserMessage key={msg.id} text={msg.content} />;
  }

  // Assistant messages: render structured blocks or fall back to text
  return (
    <AssistantMessage key={msg.id}>
      {msg.contentBlocks ? (
        <ContentBlockRenderer
          blocks={msg.contentBlocks as never[]}
        />
      ) : (
        <p className="text-[13px] leading-relaxed text-fg whitespace-pre-wrap">
          {msg.content}
        </p>
      )}
    </AssistantMessage>
  );
}

export function ThreadViewerClient({
  thread,
  messages,
  owner,
  promptCount,
  isOwner,
}: ThreadViewerProps) {
  // Calculate total token usage
  const totalUsage = messages.reduce(
    (acc, m) => {
      if (m.usage) {
        acc.input += m.usage.input_tokens;
        acc.output += m.usage.output_tokens;
      }
      return acc;
    },
    { input: 0, output: 0 }
  );

  return (
    <div className="mx-auto max-w-6xl">
      {/* Title + Author — centered */}
      <PageReveal className="text-center">
        <h1 className="text-[clamp(21px,3vw,34px)] font-medium leading-tight text-fg">
          {thread.title ?? "Untitled thread"}
        </h1>
        <p className="mt-2 text-[13px] text-fg-muted">
          {owner.name}
          {owner.username && (
            <>
              {" · "}
              <Link
                href={`/${owner.username}`}
                className="text-fg-ghost transition-colors duration-150 hover:text-accent"
              >
                @{owner.username}
              </Link>
            </>
          )}
        </p>
      </PageReveal>

      {/* Main layout: conversation + sidebar */}
      <div className="mt-10 flex gap-10">
        {/* Conversation — left column */}
        <PageReveal delay={80} className="min-w-0 flex-1">
          <div className="divide-y divide-border">
            {messages.map((msg) => renderMessage(msg, isOwner))}
          </div>
        </PageReveal>

        {/* Sidebar — right column */}
        <PageReveal delay={160} className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 space-y-5">
            <div>
              <VisibilityBadge visibility={thread.visibility} />
            </div>

            <div className="space-y-4 border-t border-border pt-5">
              <SidebarItem label="Thread">
                <span className="font-mono">
                  {formatDate(thread.sessionTs)}
                </span>
              </SidebarItem>

              {thread.projectPath && (
                <SidebarItem label="Project">
                  <span className="font-mono text-[11px] break-all">
                    {thread.projectPath}
                  </span>
                </SidebarItem>
              )}

              {thread.gitBranch && (
                <SidebarItem label="Branch">
                  <span className="font-mono text-[11px]">
                    {thread.gitBranch}
                  </span>
                </SidebarItem>
              )}

              <SidebarItem label="Agent">
                <span className="flex items-center gap-1">
                  <ClaudeMark className="size-3.5 text-fg-subtle" />
                  {agentLabel(thread.agent)}
                </span>
              </SidebarItem>

              {thread.model && (
                <SidebarItem label="Model">{thread.model}</SidebarItem>
              )}

              <SidebarItem label="Prompts">
                <span className="font-mono">{promptCount}</span>
              </SidebarItem>

              <SidebarItem label="Messages">
                <span className="font-mono">{thread.messageCount}</span>
              </SidebarItem>

              {totalUsage.input > 0 && (
                <SidebarItem label="Tokens">
                  <span className="font-mono text-[11px]">
                    {totalUsage.input.toLocaleString()} in /{" "}
                    {totalUsage.output.toLocaleString()} out
                  </span>
                </SidebarItem>
              )}

              {thread.cliVersion && (
                <SidebarItem label="CLI">
                  <span className="font-mono text-[11px]">
                    v{thread.cliVersion}
                  </span>
                </SidebarItem>
              )}
            </div>
          </div>
        </PageReveal>
      </div>
    </div>
  );
}
