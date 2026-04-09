"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Streamdown, type Components } from "streamdown";
import "streamdown/styles.css";
import {
  loadMessages,
  saveMessages,
  clearMessages,
  type ChatMessage,
  type MessageSegment,
  type ToolCall,
} from "@/lib/assistant/store";
import { search, init as initSearch } from "@/lib/search/index";
import { LightningMark } from "@/app/components/icons";
import {
  AssistantConversation,
  Conversation,
} from "@/app/components/conversation";

// Match the project's design system — same styles as markdown.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
const sdComponents = {
  h1: ({ children, ...p }: any) => <h1 {...p} className="mt-4 mb-1.5 text-[15px] font-medium text-fg">{children}</h1>,
  h2: ({ children, ...p }: any) => <h2 {...p} className="mt-3 mb-1 text-[14px] font-medium text-fg">{children}</h2>,
  h3: ({ children, ...p }: any) => <h3 {...p} className="mt-2 mb-1 text-[13px] font-medium text-fg">{children}</h3>,
  p: ({ children, ...p }: any) => <p {...p} className="mb-1.5 text-[13px] leading-relaxed text-fg-muted">{children}</p>,
  strong: ({ children, ...p }: any) => <strong {...p} className="font-medium text-fg">{children}</strong>,
  em: ({ children, ...p }: any) => <em {...p} className="text-fg-muted">{children}</em>,
  a: ({ href, children, ...p }: any) => <a {...p} href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover transition-colors duration-150">{children}</a>,
  pre: ({ children, ...p }: any) => <pre {...p} className="my-1.5 overflow-x-auto border border-border bg-surface p-2.5 font-mono text-[11px] leading-[1.7] text-fg-muted rounded-[4px]">{children}</pre>,
  inlineCode: ({ children, ...p }: any) => <code {...p} className="border border-border bg-surface px-1 py-0.5 font-mono text-[11px] text-fg-subtle rounded-[2px]">{children}</code>,
  ul: ({ children, ...p }: any) => <ul {...p} className="mb-1.5 ml-3 list-disc space-y-0.5 text-[13px] text-fg-muted marker:text-fg-faint">{children}</ul>,
  ol: ({ children, ...p }: any) => <ol {...p} className="mb-1.5 ml-3 list-decimal space-y-0.5 text-[13px] text-fg-muted marker:text-fg-faint">{children}</ol>,
  li: ({ children, ...p }: any) => <li {...p} className="text-[13px] leading-relaxed text-fg-muted">{children}</li>,
  blockquote: ({ children, ...p }: any) => <blockquote {...p} className="my-1.5 border-l-2 border-fg-faint pl-2.5 text-fg-ghost">{children}</blockquote>,
  hr: (p: any) => <hr {...p} className="my-3 border-border" />,
} as unknown as Components;

/** Dispatch this event from any trigger button to open the assistant sidebar */
export function openAssistant(threadContext?: string) {
  window.dispatchEvent(
    new CustomEvent("open-assistant", { detail: threadContext ?? null })
  );
}

/** Inline trigger for the assistant — use in the sidebar or standalone */
export function AssistantTrigger({
  className = "",
  threadContext,
}: {
  className?: string;
  threadContext?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => openAssistant(threadContext)}
      className={`group inline-flex items-center gap-1 rounded-[2px] border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-ghost transition-colors duration-150 hover:border-border-hover hover:text-fg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${className}`}
      aria-label="Open AI assistant"
    >
      <LightningMark className="size-2.5 opacity-50 group-hover:opacity-80 transition-opacity duration-150" />
      <span>AI</span>
    </button>
  );
}

/** Search-bar-integrated trigger — sits inside the search input area */
export function AssistantSearchTrigger({
  threadContext,
}: {
  threadContext?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => openAssistant(threadContext)}
      className="group flex items-center gap-1.5 rounded-[4px] border border-border bg-surface px-3 py-2 text-[13px] text-fg-ghost transition-[border-color,color] duration-150 hover:border-border-hover hover:text-fg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      aria-label="Open AI assistant"
    >
      <LightningMark className="size-3.5 opacity-40 group-hover:opacity-70 transition-opacity duration-150" />
      <span className="text-[12px]">AI</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tool call sprite
// ---------------------------------------------------------------------------

const TOOL_LABELS: Record<string, string> = {
  search_threads: "Searching",
  get_thread: "Reading",
  list_threads: "Listing",
};

function ToolSprite({ tool }: { tool: ToolCall }) {
  const label = TOOL_LABELS[tool.name] || tool.name;
  const detail =
    tool.name === "search_threads"
      ? `"${tool.input.query || ""}"`
      : tool.name === "get_thread"
        ? `"${tool.input.slug || ""}"`
        : tool.input.agent
          ? `${tool.input.agent}`
          : "threads";

  return (
    <div className="my-1.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${
          tool.status === "pending"
            ? "border-accent/40 text-accent animate-border-pulse"
            : "border-border text-fg-ghost"
        }`}
      >
        {tool.status === "pending" && (
          <span className="inline-block size-1.5 rounded-full bg-accent animate-blink" />
        )}
        <span>{label}</span>
        <span className="normal-case tracking-normal text-fg-ghost">{detail}</span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client-side tool execution
// ---------------------------------------------------------------------------

function executeClientTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "search_threads": {
      const query = (input.query as string) || "";
      if (!query.trim()) return JSON.stringify({ results: [] });

      const results = search(query, 10);
      return JSON.stringify({
        results: results.slice(0, 10).map((r) => ({
          slug: r.slug,
          title: r.title,
          agent: r.agent,
          model: r.model,
          matches: r.matches.slice(0, 5).map((m) => ({
            ordinal: m.ordinal,
            role: m.role,
            snippet: m.snippet,
          })),
        })),
      });
    }
    default:
      return JSON.stringify({ error: `Unknown client tool: ${name}` });
  }
}

// ---------------------------------------------------------------------------
// SSE event types from the server
// ---------------------------------------------------------------------------

type SSEEvent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown>; locality: "client" | "server" }
  | { type: "tool_result"; name: string }
  | { type: "pause"; assistantContent: unknown[]; serverToolResults?: { type: "tool_result"; tool_use_id: string; content: string }[] }
  | { type: "error"; message: string };

// ---------------------------------------------------------------------------
// Segment helpers
// ---------------------------------------------------------------------------

/** Append text to segments, merging with the last text segment if possible */
function appendText(segments: MessageSegment[], text: string): MessageSegment[] {
  const copy = [...segments];
  const last = copy[copy.length - 1];
  if (last && last.type === "text") {
    copy[copy.length - 1] = { type: "text", content: last.content + text };
  } else {
    copy.push({ type: "text", content: text });
  }
  return copy;
}

/** Add a tool segment */
function appendTool(segments: MessageSegment[], tool: ToolCall): MessageSegment[] {
  return [...segments, { type: "tool", tool }];
}

/** Mark a tool as complete by id */
function markToolComplete(segments: MessageSegment[], toolId: string): MessageSegment[] {
  return segments.map((s) =>
    s.type === "tool" && s.tool.id === toolId
      ? { type: "tool", tool: { ...s.tool, status: "complete" as const } }
      : s
  );
}

/** Mark a tool as complete by name (first pending match) */
function markToolCompleteByName(segments: MessageSegment[], toolName: string): MessageSegment[] {
  let found = false;
  return segments.map((s) => {
    if (!found && s.type === "tool" && s.tool.name === toolName && s.tool.status === "pending") {
      found = true;
      return { type: "tool", tool: { ...s.tool, status: "complete" as const } };
    }
    return s;
  });
}

/** Get flattened text content from segments */
function segmentsToText(segments: MessageSegment[]): string {
  return segments
    .filter((s): s is Extract<MessageSegment, { type: "text" }> => s.type === "text")
    .map((s) => s.content)
    .join("");
}

// ---------------------------------------------------------------------------
// Segment renderer
// ---------------------------------------------------------------------------

function AssistantSegments({
  segments,
  isStreaming,
}: {
  segments: MessageSegment[];
  isStreaming: boolean;
}) {
  const lastTextIdx = segments.reduce((acc, s, i) => (s.type === "text" ? i : acc), -1);

  return (
    <>
      {segments.map((segment, i) => {
        if (segment.type === "tool") {
          return <ToolSprite key={segment.tool.id} tool={segment.tool} />;
        }
        const isLast = i === lastTextIdx && isStreaming;
        return (
          <Streamdown
            key={`text-${i}`}
            components={sdComponents}
            mode={isLast ? "streaming" : "static"}
            animated={
              isLast
                ? { sep: "word", duration: 80, stagger: 15, animation: "sd-fadeIn" }
                : false
            }
            caret={isLast ? "block" : undefined}
          >
            {segment.content}
          </Streamdown>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [, setSearchReady] = useState(false);
  const [threadContext, setThreadContext] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMessages(loadMessages());
  }, []);

  useEffect(() => {
    initSearch()
      .then(() => setSearchReady(true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleOpen(e: Event) {
      const detail = (e as CustomEvent).detail as string | null;
      setThreadContext(detail);
      setOpen(true);
    }
    window.addEventListener("open-assistant", handleOpen);
    return () => window.removeEventListener("open-assistant", handleOpen);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!open) return;

    lastActiveRef.current = document.activeElement as HTMLElement | null;
    const overlay = overlayRef.current;
    const dialog = dialogRef.current;
    const parent = overlay?.parentElement;
    const inertSiblings: HTMLElement[] = [];
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (parent && overlay) {
      for (const child of Array.from(parent.children)) {
        if (child === overlay || !(child instanceof HTMLElement)) continue;
        child.inert = true;
        child.setAttribute("aria-hidden", "true");
        inertSiblings.push(child);
      }
    }

    const focusFrame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    dialog?.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(focusFrame);
      dialog?.removeEventListener("keydown", onKeyDown);
      for (const sibling of inertSiblings) {
        sibling.inert = false;
        sibling.removeAttribute("aria-hidden");
      }
      document.body.style.overflow = previousOverflow;
      lastActiveRef.current?.focus();
    };
  }, [open]);

  // ---------------------------------------------------------------------------
  // Stream processing
  // ---------------------------------------------------------------------------

  const processStream = useCallback(
    async (
      res: Response,
      segmentsRef: { current: MessageSegment[] },
    ): Promise<{
      clientToolCalls: { id: string; name: string; input: Record<string, unknown> }[];
      assistantContent: unknown[] | null;
      serverToolResults: { type: "tool_result"; tool_use_id: string; content: string }[];
    }> => {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const pendingClientTools: { id: string; name: string; input: Record<string, unknown> }[] = [];
      let pausedAssistantContent: unknown[] | null = null;
      let pausedServerToolResults: { type: "tool_result"; tool_use_id: string; content: string }[] = [];

      const updateMessage = () => {
        const segs = [...segmentsRef.current];
        const text = segmentsToText(segs);
        setMessages((prev) => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (lastIdx >= 0 && copy[lastIdx].role === "assistant") {
            copy[lastIdx] = { ...copy[lastIdx], content: text, segments: segs };
          } else {
            copy.push({ role: "assistant", content: text, segments: segs });
          }
          return copy;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const event = JSON.parse(data) as SSEEvent;

            switch (event.type) {
              case "text": {
                segmentsRef.current = appendText(segmentsRef.current, event.text);
                updateMessage();
                break;
              }

              case "tool_use": {
                const tool: ToolCall = {
                  id: event.id,
                  name: event.name,
                  input: event.input,
                  locality: event.locality,
                  status: "pending",
                };
                segmentsRef.current = appendTool(segmentsRef.current, tool);
                updateMessage();

                if (event.locality === "client") {
                  pendingClientTools.push({ id: event.id, name: event.name, input: event.input });
                }
                break;
              }

              case "tool_result": {
                segmentsRef.current = markToolCompleteByName(segmentsRef.current, event.name);
                updateMessage();
                break;
              }

              case "pause": {
                pausedAssistantContent = event.assistantContent;
                pausedServerToolResults = event.serverToolResults || [];
                break;
              }

              case "error": {
                segmentsRef.current = appendText(segmentsRef.current, `\n\n_Error: ${event.message}_`);
                updateMessage();
                break;
              }
            }
          } catch {}
        }
      }

      return {
        clientToolCalls: pendingClientTools,
        assistantContent: pausedAssistantContent,
        serverToolResults: pausedServerToolResults,
      };
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Send handler with tool-use continuation loop
  // ---------------------------------------------------------------------------

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    saveMessages(updated);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const apiMessages: Array<{ role: string; content: string }> = updated.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const segmentsRef = { current: [] as MessageSegment[] };

    try {
      let continuation: {
        assistantContent: unknown[];
        toolResults: { tool_use_id: string; content: string }[];
      } | undefined;

      for (let iteration = 0; iteration < 10; iteration++) {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            activeThread: threadContext ? "true" : null,
            continuation,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) throw new Error("Request failed");

        const { clientToolCalls, assistantContent, serverToolResults } = await processStream(
          res,
          segmentsRef,
        );

        if (clientToolCalls.length === 0 || !assistantContent) {
          break;
        }

        // Resolve client-side tools
        const resolvedToolResults = clientToolCalls.map((tc) => {
          const result = executeClientTool(tc.name, tc.input);

          // Mark tool as complete in segments
          segmentsRef.current = markToolComplete(segmentsRef.current, tc.id);
          const segs = [...segmentsRef.current];
          const flatText = segmentsToText(segs);
          setMessages((prev) => {
            const copy = [...prev];
            const lastIdx = copy.length - 1;
            if (lastIdx >= 0 && copy[lastIdx].role === "assistant") {
              copy[lastIdx] = { ...copy[lastIdx], content: flatText, segments: segs };
            }
            return copy;
          });

          return { tool_use_id: tc.id, content: result };
        });

        continuation = {
          assistantContent,
          toolResults: [
            ...serverToolResults,
            ...resolvedToolResults.map((tr) => ({
              type: "tool_result" as const,
              ...tr,
            })),
          ],
        };

        // Don't reset segments — new text from continuation appends after the tool sprites
      }

      setMessages((prev) => {
        saveMessages(prev);
        return prev;
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => {
          const next = [...prev, { role: "assistant" as const, content: "Something went wrong. Try again." }];
          saveMessages(next);
          return next;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleNewChat = () => {
    if (streaming && abortRef.current) {
      abortRef.current.abort();
    }
    setMessages([]);
    clearMessages();
    setStreaming(false);
  };

  if (!open) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-title"
        className="flex h-full w-full max-w-[440px] flex-col overscroll-contain border-l border-border bg-bg"
        style={{ animation: "assistant-slide-in 200ms ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-fg-ghost transition-colors hover:text-fg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <span id="assistant-title" className="text-[13px] text-fg-muted">
              Assistant
            </span>
          </div>
          <button
            type="button"
            onClick={handleNewChat}
            className="text-fg-ghost transition-colors hover:text-fg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            aria-label="New chat"
            title="New chat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <AssistantConversation
          empty="Ask anything about your conversations."
          hasMessages={messages.length > 0}
          className="relative"
        >
          <div aria-live="polite" className="sr-only">
            {streaming ? "Assistant response in progress…" : ""}
          </div>
          {messages.length > 0 ? (
            <Conversation.Messages aria-live="polite">
              {messages.map((msg, i) => (
                <div key={`${msg.role}-${i}`}>
                  {msg.role === "user" ? (
                    <Conversation.UserMessage>{msg.content}</Conversation.UserMessage>
                  ) : (
                    <Conversation.AssistantMessage>
                      {msg.segments && msg.segments.length > 0 ? (
                        <AssistantSegments
                          segments={msg.segments}
                          isStreaming={streaming && i === messages.length - 1}
                        />
                      ) : (
                        <Streamdown
                          components={sdComponents}
                          mode={
                            streaming && i === messages.length - 1
                              ? "streaming"
                              : "static"
                          }
                          animated={
                            streaming && i === messages.length - 1
                              ? {
                                  sep: "word",
                                  duration: 80,
                                  stagger: 15,
                                  animation: "sd-fadeIn",
                                }
                              : false
                          }
                          caret={
                            streaming && i === messages.length - 1
                              ? "block"
                              : undefined
                          }
                        >
                          {msg.content}
                        </Streamdown>
                      )}
                    </Conversation.AssistantMessage>
                  )}
                </div>
              ))}
            </Conversation.Messages>
          ) : null}
          <div ref={messagesEndRef} />
        </AssistantConversation>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 px-4 h-12 border-t border-border shrink-0"
        >
          <label className="sr-only" htmlFor="assistant-input">
            Ask the assistant a question
          </label>
          <input
            id="assistant-input"
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            disabled={streaming}
            autoComplete="off"
            className="flex-1 bg-transparent text-fg text-[13px] placeholder:text-fg-ghost focus-visible:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="text-fg-ghost transition-colors hover:text-accent disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            aria-label="Send"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
