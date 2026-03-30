"use client";

import { useMemo, useCallback, useSyncExternalStore } from "react";
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
import { ParsedUserContent } from "@/app/components/xml-blocks";

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

const MESSAGE_HASH_PATTERN = /^#m(\d+)(?:-m(\d+))?$/;

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
  if (msg.redacted) return true;

  if (msg.contentBlocks && msg.contentBlocks.length > 0) {
    if (msg.role === "user") {
      const imageBlocks = msg.contentBlocks.filter((b) => b.type === "image");
      const hasImages = imageBlocks.length > 0;
      const text = msg.contentBlocks
        .filter((b) => {
          if (b.type !== "text") return false;
          if (
            hasImages &&
            typeof (b as { text?: string }).text === "string" &&
            (b as { text: string }).text.match(/^\[Image.*source:/)
          ) {
            return false;
          }
          return true;
        })
        .map((b) => (b as { text?: string }).text ?? "")
        .join("\n")
        .trim();

      return hasImages || text.length > 0;
    }

    return firstRenderableBlock(msg) !== null;
  }

  return msg.content.trim().length > 0;
}

function firstRenderableBlock(msg: MessageData): Record<string, unknown> | null {
  if (!msg.contentBlocks) return null;

  for (const block of msg.contentBlocks) {
    if (block.type === "tool_result") continue;
    if (
      block.type === "text" &&
      typeof (block as { text?: string }).text === "string" &&
      !(block as { text: string }).text.trim()
    ) {
      continue;
    }
    return block;
  }

  return null;
}

function messageHighlightMode(msg: MessageData): "text" | "block" {
  if (!msg.contentBlocks || msg.contentBlocks.length === 0) return "text";

  for (const block of msg.contentBlocks) {
    if (block.type === "tool_result") continue;
    if (block.type !== "text") return "block";
  }

  return "text";
}

function lineNumberOffsetClass(msg: MessageData): string {
  const mode = messageHighlightMode(msg);

  if (mode === "block") return "pt-4";
  if (msg.role === "user") return "pt-2.5";

  const firstBlock = firstRenderableBlock(msg);
  if (!firstBlock || firstBlock.type === "text") return "pt-[14px]";
  return "pt-4";
}

function parseMessageHashRange(
  hash: string
): { start: number; end: number } | null {
  const match = hash.match(MESSAGE_HASH_PATTERN);
  if (!match) return null;

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : start;

  return { start, end };
}

function buildMessageHash(start: number, end: number): string {
  if (start === end) return `#m${start}`;
  return `#m${start}-m${end}`;
}

function renderMessage(
  msg: MessageData,
  isOwner: boolean,
  toolResults: Map<string, string>,
  highlighted: boolean
) {
  const highlightMode = highlighted ? messageHighlightMode(msg) : "none";

  if (msg.redacted && !isOwner) {
    return <RedactedMessage key={msg.id} />;
  }

  if (msg.role === "user") {
    if (msg.contentBlocks) {
      const imageBlocks = msg.contentBlocks.filter((b) => b.type === "image");
      const hasImages = imageBlocks.length > 0;
      const textBlocks = msg.contentBlocks.filter((b) => {
        if (b.type !== "text") return false;
        // When images are present, skip the redundant "[Image: source: ...]" reference text
        if (hasImages && (b as { text: string }).text.match(/^\[Image.*source:/)) return false;
        return true;
      });
      const text = textBlocks
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");

      // Only render if there's human text or images — tool_result blocks are
      // paired with their tool_use in the assistant message via toolResults map
      if (!text.trim() && imageBlocks.length === 0) return null;
      return (
        <UserMessage key={msg.id}>
          {text.trim() && (
            <div
              className={
                highlightMode === "text" ? "thread-selected-text" : undefined
              }
            >
              <ParsedUserContent text={text} />
            </div>
          )}
          {imageBlocks.map((b, i) => {
            const src = (b as { type: "image"; source: { media_type: string; data: string } }).source;
            return (
              <img
                key={i}
                src={`data:${src.media_type};base64,${src.data}`}
                alt="Attached image"
                className={`mt-2 max-w-full rounded-[4px] border ${
                  highlightMode === "block"
                    ? "border-accent bg-accent/4"
                    : "border-border"
                }`}
              />
            );
          })}
        </UserMessage>
      );
    }

    if (!msg.content.trim()) return null;
    return (
      <UserMessage key={msg.id}>
        <div
          className={highlightMode === "text" ? "thread-selected-text" : undefined}
        >
          <ParsedUserContent text={msg.content} />
        </div>
      </UserMessage>
    );
  }

  // Assistant messages: render structured blocks or fall back to text
  return (
    <AssistantMessage key={msg.id}>
      {msg.contentBlocks ? (
        <ContentBlockRenderer
          blocks={msg.contentBlocks as never[]}
          toolResults={toolResults}
          highlightMode={highlightMode}
        />
      ) : (
        <div
          className={highlightMode === "text" ? "thread-selected-text" : undefined}
        >
          <Markdown content={msg.content} />
        </div>
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
            typeof (block as Record<string, unknown>).tool_use_id === "string"
          ) {
            const raw = (block as Record<string, unknown>).content;
            let text: string;
            if (typeof raw === "string") {
              text = raw;
            } else if (Array.isArray(raw)) {
              text = (raw as Array<Record<string, unknown>>)
                .filter((item) => item.type === "text" && typeof item.text === "string")
                .map((item) => item.text as string)
                .join("\n");
            } else {
              continue;
            }
            results.set(
              (block as { tool_use_id: string }).tool_use_id,
              text
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

  // Parse hash like #m3 or #m3-m7 into a set of highlighted ordinals
  const parseHash = useCallback((hash: string): Set<number> => {
    const set = new Set<number>();
    const range = parseMessageHashRange(hash);
    if (!range) return set;
    const { start, end } = range;
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    for (let i = lo; i <= hi; i++) set.add(i);
    return set;
  }, []);

  const activeHash = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("hashchange", onStoreChange);
      return () => window.removeEventListener("hashchange", onStoreChange);
    },
    () => window.location.hash,
    () => ""
  );

  const highlighted = useMemo(
    () => parseHash(activeHash),
    [activeHash, parseHash]
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
            {visibleMessages.map((msg) => {
              const isHighlighted = highlighted.has(msg.ordinal);

              return (
                <div
                  key={msg.id}
                  id={`m${msg.ordinal}`}
                  data-ordinal={msg.ordinal}
                  className={`thread-fragment-target group/msg relative lg:grid lg:grid-cols-[2.75rem_minmax(0,1fr)] lg:gap-x-4 ${isHighlighted ? "permalink-active" : ""}`}
                >
                  <a
                    href={`#m${msg.ordinal}`}
                    className={`thread-fragment-link hidden items-start justify-end text-right font-mono text-[11px] leading-none transition-opacity select-none focus-visible:opacity-100 focus-visible:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg lg:flex ${lineNumberOffsetClass(msg)} ${isHighlighted ? "text-accent opacity-100" : "text-fg-ghost opacity-0 group-hover/msg:opacity-100"}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const activeRange = parseMessageHashRange(activeHash);
                      const hash =
                        e.shiftKey && activeRange
                          ? buildMessageHash(activeRange.start, msg.ordinal)
                          : buildMessageHash(msg.ordinal, msg.ordinal);

                      window.history.replaceState(null, "", hash);
                      window.dispatchEvent(new HashChangeEvent("hashchange"));
                      const url = `${window.location.origin}${window.location.pathname}${hash}`;
                      void navigator.clipboard.writeText(url);
                    }}
                    aria-label={`Copy link to message #m${msg.ordinal}. Hold Shift to extend the current selection into a range.`}
                    title={`Link to message #m${msg.ordinal}. Hold Shift to extend the current selection into a range.`}
                  >
                    {msg.ordinal}
                  </a>
                  <div className="min-w-0">
                    {renderMessage(msg, isOwner, toolResults, isHighlighted)}
                  </div>
                </div>
              );
            })}
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
