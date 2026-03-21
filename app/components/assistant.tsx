"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Streamdown, type Components } from "streamdown";
import "streamdown/styles.css";
import {
  loadMessages,
  saveMessages,
  clearMessages,
  type ChatMessage,
} from "@/lib/assistant/store";
import { getAllThreads } from "@/lib/search/db";
import { search, init as initSearch } from "@/lib/search/index";
import { ClaudeMark } from "@/app/components/icons";

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
      onClick={() => openAssistant(threadContext)}
      className={`group inline-flex items-center gap-1 border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider rounded-[2px] text-fg-ghost transition-colors duration-150 hover:border-border-hover hover:text-fg-muted ${className}`}
      aria-label="Open AI assistant"
    >
      <ClaudeMark className="size-2.5 opacity-50 group-hover:opacity-80 transition-opacity duration-150" />
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
      onClick={() => openAssistant(threadContext)}
      className="group flex items-center gap-1.5 border border-border bg-surface rounded-[4px] px-3 py-2 text-[13px] text-fg-ghost transition-all duration-150 hover:border-border-hover hover:text-fg-muted"
      aria-label="Open AI assistant"
    >
      <ClaudeMark className="size-3.5 opacity-40 group-hover:opacity-70 transition-opacity duration-150" />
      <span className="text-[12px]">AI</span>
    </button>
  );
}

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [searchReady, setSearchReady] = useState(false);
  const [threadContext, setThreadContext] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const buildContext = useCallback(
    async (userMessage: string): Promise<{ context: string; activeThread: string | null }> => {
      const parts: string[] = [];

      // If opened on a specific thread, that's the primary context
      if (threadContext) {
        parts.push(threadContext);
      }

      try {
        const threads = await getAllThreads();
        if (threads.length > 0) {
          parts.push(
            `The user has ${threads.length} stored conversations:\n` +
              threads
                .slice(0, 50)
                .map(
                  (t) =>
                    `- "${t.title || "Untitled"}" (${t.agent}, ${t.model || "unknown model"}, ${t.messageCount} messages, ${t.tags.length > 0 ? `tags: ${t.tags.join(", ")}` : "no tags"})`
                )
                .join("\n")
          );
          if (threads.length > 50) {
            parts.push(`...and ${threads.length - 50} more conversations.`);
          }
        }
      } catch {}

      if (searchReady && userMessage.trim()) {
        try {
          const results = search(userMessage, 10);
          if (results.length > 0) {
            parts.push(
              "\nRelevant conversation excerpts matching the query:\n" +
                results
                  .slice(0, 5)
                  .map(
                    (r) =>
                      `Thread "${r.title || "Untitled"}":\n` +
                      r.matches
                        .slice(0, 3)
                        .map((m) => `  [${m.role}]: ${m.snippet}`)
                        .join("\n")
                  )
                  .join("\n\n")
            );
          }
        } catch {}
      }

      return {
        context: parts.join("\n\n"),
        activeThread: threadContext ? "true" : null,
      };
    },
    [searchReady, threadContext]
  );

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    saveMessages(updated);
    setInput("");
    setStreaming(true);

    const { context, activeThread } = await buildContext(text);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          context,
          activeThread,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

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
            const parsed = JSON.parse(data);
            if (typeof parsed === "string") {
              assistantContent += parsed;
              setMessages((prev) => {
                const copy = [...prev];
                const lastIdx = copy.length - 1;
                if (lastIdx >= 0 && copy[lastIdx].role === "assistant") {
                  copy[lastIdx] = { ...copy[lastIdx], content: assistantContent };
                } else {
                  copy.push({ role: "assistant", content: assistantContent });
                }
                return copy;
              });
            }
          } catch {}
        }
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
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <div
        className="flex h-full w-full max-w-[440px] flex-col border-l border-border bg-bg"
        style={{ animation: "assistant-slide-in 200ms ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setOpen(false)}
              className="text-fg-ghost hover:text-fg-muted transition-colors"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <span className="text-[13px] text-fg-muted">Assistant</span>
          </div>
          <button
            onClick={handleNewChat}
            className="text-fg-ghost hover:text-fg-muted transition-colors"
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
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <div className="text-fg-ghost text-[12px] text-center py-16">
              Ask anything about your conversations.
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`py-3 ${i > 0 ? "border-t border-border" : ""}`}
            >
              {msg.role === "user" ? (
                <div className="flex gap-2">
                  <span className="select-none font-mono text-[13px] text-fg-ghost">{">"}</span>
                  <p className="text-[13px] font-medium leading-relaxed text-fg whitespace-pre-wrap">{msg.content}</p>
                </div>
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
                      ? { sep: "word", duration: 80, stagger: 15, animation: "sd-fadeIn" }
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
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 px-4 h-12 border-t border-border shrink-0"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={streaming}
            className="flex-1 bg-transparent text-fg text-[13px] placeholder:text-fg-ghost outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="text-fg-ghost hover:text-accent disabled:opacity-30 transition-colors"
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
