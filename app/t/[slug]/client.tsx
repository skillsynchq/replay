"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AgentMark } from "@/app/components/icons";
import { VisibilitySelector } from "@/app/components/visibility-selector";
import { EditableTitle } from "@/app/components/editable-title";
import { TagEditor } from "@/app/components/tag-editor";
import { PageReveal } from "@/app/components/page-reveal";
import { ContentBlockRenderer } from "@/app/components/content-renderer";
import { Markdown } from "@/app/components/markdown";
import { AssistantTrigger } from "@/app/components/assistant";
import { ThreadConversation } from "@/app/components/conversation";
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
    tags: string[];
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
    <div>
      <span className="text-[10px] uppercase tracking-wider text-fg-ghost">
        {label}
      </span>
      <div className="text-[11px] text-fg-muted">{children}</div>
    </div>
  );
}

/**
 * Check if a message has any renderable content.
 */
function hasVisibleContent(msg: MessageData): boolean {
  if (msg.contentBlocks && msg.contentBlocks.length > 0) return true;
  return msg.content.trim().length > 0;
}

function renderMessage(
  msg: MessageData,
  isOwner: boolean,
  toolResults: Map<string, string>
) {
  if (msg.redacted && !isOwner) {
    return <RedactedMessage key={msg.id} />;
  }

  if (msg.role === "user") {
    if (msg.contentBlocks) {
      const textBlocks = msg.contentBlocks.filter((b) => b.type === "text");
      const text = textBlocks
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");

      // Only render if there's human text — tool_result blocks are
      // paired with their tool_use in the assistant message via toolResults map
      if (!text.trim()) return null;
      return <UserMessage key={msg.id}>{text}</UserMessage>;
    }

    if (!msg.content.trim()) return null;
    return <UserMessage key={msg.id}>{msg.content}</UserMessage>;
  }

  // Assistant messages: render structured blocks or fall back to text
  return (
    <AssistantMessage key={msg.id}>
      {msg.contentBlocks ? (
        <ContentBlockRenderer
          blocks={msg.contentBlocks as never[]}
          toolResults={toolResults}
        />
      ) : (
        <Markdown content={msg.content} />
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
  // Build tool_use_id → tool_result content map across all messages
  const toolResults = useMemo(() => {
    const results = new Map<string, string>();
    for (const msg of messages) {
      if (msg.contentBlocks) {
        for (const block of msg.contentBlocks) {
          if (
            block.type === "tool_result" &&
            typeof (block as Record<string, unknown>).tool_use_id === "string" &&
            typeof (block as Record<string, unknown>).content === "string"
          ) {
            results.set(
              (block as { tool_use_id: string }).tool_use_id,
              (block as { content: string }).content
            );
          }
        }
      }
    }
    return results;
  }, [messages]);

  const totalUsage = useMemo(
    () =>
      messages.reduce(
        (acc, m) => {
          if (m.usage) {
            acc.input += m.usage.input_tokens;
            acc.output += m.usage.output_tokens;
          }
          return acc;
        },
        { input: 0, output: 0 }
      ),
    [messages]
  );

  const visibleMessages = useMemo(
    () => messages.filter((msg) => hasVisibleContent(msg)),
    [messages]
  );

  // Build context string for the AI assistant
  const assistantThreadContext = useMemo(() => {
    const parts: string[] = [
      `The user is currently viewing this conversation:`,
      `Title: "${thread.title || "Untitled"}"`,
      `Agent: ${agentLabel(thread.agent)}`,
      thread.model ? `Model: ${thread.model}` : "",
      `Messages: ${thread.messageCount} (${promptCount} prompts)`,
      thread.projectPath ? `Project: ${thread.projectPath}` : "",
      thread.gitBranch ? `Branch: ${thread.gitBranch}` : "",
      thread.tags.length > 0 ? `Tags: ${thread.tags.join(", ")}` : "",
      `Date: ${new Date(thread.sessionTs).toLocaleDateString()}`,
      "",
      "Conversation content:",
    ].filter(Boolean);

    // Include message content (truncate to keep context reasonable)
    let charBudget = 12000;
    for (const msg of messages) {
      if (charBudget <= 0) {
        parts.push("... (remaining messages truncated)");
        break;
      }
      const role = msg.role === "user" ? "User" : "Assistant";
      const text = msg.content.slice(0, Math.min(msg.content.length, charBudget));
      parts.push(`[${role}]: ${text}`);
      charBudget -= text.length;
    }

    return parts.join("\n");
  }, [thread, messages, promptCount]);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Title + Author — centered */}
      <PageReveal className="text-center">
        <EditableTitle
          title={thread.title}
          slug={thread.slug}
          isOwner={isOwner}
        />
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
          <ThreadConversation>
            {visibleMessages.map((msg) => (
              <div
                key={msg.id}
                id={`m${msg.ordinal}`}
                data-ordinal={msg.ordinal}
                className="thread-fragment-target"
              >
                {renderMessage(msg, isOwner, toolResults)}
              </div>
            ))}
          </ThreadConversation>
        </PageReveal>

        {/* Sidebar — right column */}
        <PageReveal delay={160} className="hidden w-48 shrink-0 lg:block">
          <div className="sticky top-24 space-y-3">
            <div className="flex items-start justify-between">
              <VisibilitySelector
                visibility={thread.visibility}
                slug={thread.slug}
                isOwner={isOwner}
              />
              {isOwner && (
                <AssistantTrigger threadContext={assistantThreadContext} />
              )}
            </div>

            <div className="space-y-3 border-t border-border pt-3">
              <SidebarItem label="Thread">
                <span className="font-mono">
                  {formatDate(thread.sessionTs)}
                </span>
              </SidebarItem>

              {thread.projectPath && (
                <SidebarItem label="Project">
                  <span className="font-mono text-[11px]">
                    {thread.projectPath.split("/").pop() ?? thread.projectPath}
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
                  <AgentMark
                    agent={thread.agent}
                    className="size-3.5 text-fg-subtle"
                  />
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

            {(isOwner || thread.tags.length > 0) && (
              <div className="border-t border-border pt-3">
                <TagEditor
                  tags={thread.tags}
                  slug={thread.slug}
                  isOwner={isOwner}
                />
              </div>
            )}

          </div>
        </PageReveal>
      </div>
    </div>
  );
}
