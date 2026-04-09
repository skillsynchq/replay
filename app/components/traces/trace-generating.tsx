"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import type { TraceContent, ActivityEntry } from "@/lib/ai/generate-trace";
import { TraceView } from "./trace-view";

interface TraceGeneratingProps {
  slug: string;
  question: string;
  initialTitle: string | null;
  initialContent: TraceContent | null;
}

function CopyQuestionButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-[4px] px-2 py-1 font-mono text-[11px] text-fg-ghost transition-colors duration-150 hover:bg-surface hover:text-fg-muted cursor-pointer"
      title="Copy original question"
    >
      {copied ? (
        <>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden="true">
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden="true">
            <rect x="5" y="5" width="8" height="8" rx="1" />
            <path d="M3 11V3h8" />
          </svg>
          Copy question
        </>
      )}
    </button>
  );
}

const ACTIVITY_ICONS: Record<ActivityEntry["type"], string> = {
  search: "M11 11l3 3M4.5 8a3.5 3.5 0 107 0 3.5 3.5 0 00-7 0z",
  read: "M2 4.5h2l1.5-2h5l1.5 2h2v9h-12z",
  moment: "M3.5 8.5l3 3 6-7",
  synthesize: "M2 8h4l2-4 2 8 2-4h4",
  done: "M3.5 8.5l3 3 6-7",
  info: "M8 4v5M8 11v1",
};

function ActivityLine({ entry, isLatest }: { entry: ActivityEntry; isLatest: boolean }) {
  const iconPath = ACTIVITY_ICONS[entry.type] || ACTIVITY_ICONS.info;
  const isHighlight = entry.type === "moment";

  return (
    <div className={`flex items-start gap-2 py-0.5 ${isLatest ? "text-fg-muted" : "text-fg-ghost"}`}>
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={isHighlight ? "2" : "1.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`size-3 shrink-0 mt-[2px] ${isHighlight ? "text-accent" : ""}`}
        aria-hidden="true"
      >
        <path d={iconPath} />
      </svg>
      <span className={`text-[12px] leading-tight ${isHighlight ? "text-fg-muted" : ""}`}>
        {entry.text}
      </span>
    </div>
  );
}

function AgentWindow({ activity, isGenerating }: { activity: ActivityEntry[]; isGenerating: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activity.length]);

  return (
    <div className="rounded-[4px] border border-border bg-surface overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        {isGenerating && (
          <span className="inline-block size-1.5 rounded-full bg-accent animate-pulse" />
        )}
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-ghost">
          {isGenerating ? "Agent running" : "Agent finished"}
        </span>
      </div>
      <div
        ref={scrollRef}
        className="max-h-[180px] overflow-y-auto px-3 py-2 scrollbar-thin"
      >
        {activity.length === 0 ? (
          <p className="text-[12px] text-fg-ghost">Starting...</p>
        ) : (
          activity.map((entry, i) => (
            <ActivityLine
              key={`${entry.ts}-${i}`}
              entry={entry}
              isLatest={i === activity.length - 1 && isGenerating}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MomentPreview({ moment }: { moment: TraceContent["moments"][0] }) {
  const href = moment.threadSlug
    ? `/t/${moment.threadSlug}${moment.startOrdinal != null ? `#m${moment.startOrdinal}` : ""}`
    : null;

  return (
    <div className="border-l-2 border-accent/40 pl-3 py-2">
      <div className="text-[13px] leading-relaxed text-fg-muted">
        {moment.excerpt}
      </div>
      {href && (
        <Link
          href={href}
          className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-fg-ghost transition-colors duration-150 hover:text-accent"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden="true">
            <path d="M4 6h8M4 10h5" />
            <rect x="2" y="2" width="12" height="12" rx="2" />
          </svg>
          {moment.threadTitle || moment.threadSlug}
        </Link>
      )}
    </div>
  );
}

export function TraceGenerating({
  slug,
  question,
  initialTitle,
  initialContent,
}: TraceGeneratingProps) {
  const [content, setContent] = useState<TraceContent | null>(initialContent);
  const [title, setTitle] = useState<string | null>(initialTitle);
  const [status, setStatus] = useState<string>("generating");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/traces/${slug}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.trace.content) {
        setContent(data.trace.content as TraceContent);
      }
      if (data.trace.title) {
        setTitle(data.trace.title);
      }

      if (data.trace.status !== "generating") {
        setStatus(data.trace.status);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch { /* retry next interval */ }
  }, [slug]);

  useEffect(() => {
    intervalRef.current = setInterval(poll, 2000);
    queueMicrotask(poll);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll]);

  const displayTitle = title || question;
  const activityLog = content?.activity ?? [];
  const moments = content?.moments ?? [];

  if (status === "complete" && content) {
    return <TraceView question={question} title={title} content={content} />;
  }

  if (status === "failed") {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
          Decision Trace
        </p>
        <h1 className="mt-2 text-[clamp(18px,3vw,21px)] font-medium leading-[1.2] tracking-tight text-fg">
          {displayTitle}
        </h1>
        {title && <div className="mt-2"><CopyQuestionButton text={question} /></div>}

        <div className="mt-6">
          <AgentWindow activity={activityLog} isGenerating={false} />
        </div>

        <div className="mt-6">
          {moments.length > 0 ? (
            <>
              <p className="text-[13px] text-fg-muted mb-4">
                Generation stopped early. Partial results below.
              </p>
              <div className="space-y-4">
                {moments.map((m, i) => (
                  <MomentPreview key={i} moment={m} />
                ))}
              </div>
            </>
          ) : (
            <p className="text-[13px] text-fg-muted">
              Trace generation failed. Try asking a different question or broadening the scope.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Generating state
  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
        Decision Trace
      </p>
      <h1 className="mt-2 text-[clamp(18px,3vw,21px)] font-medium leading-[1.2] tracking-tight text-fg">
        {displayTitle}
      </h1>
      {title && <div className="mt-2"><CopyQuestionButton text={question} /></div>}

      {/* Agent activity window */}
      <div className="mt-6">
        <AgentWindow activity={activityLog} isGenerating={true} />
      </div>

      {/* Moments appearing as they're discovered */}
      {moments.length > 0 && (
        <div className="mt-8">
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-ghost mb-3">
            {moments.length} moment{moments.length === 1 ? "" : "s"} found
          </p>
          <div className="space-y-4">
            {moments.map((m, i) => (
              <MomentPreview key={i} moment={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
