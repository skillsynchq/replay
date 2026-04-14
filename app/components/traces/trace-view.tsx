"use client";

import { useState } from "react";
import Link from "next/link";
import type { TraceContent, TraceMoment } from "@/lib/ai/generate-trace";
import { Markdown } from "@/app/components/markdown";

interface TraceViewProps {
  question: string;
  title?: string | null;
  content: TraceContent;
}

function deriveLabel(moment: TraceMoment): string {
  if (moment.annotation?.trim()) return moment.annotation.trim();
  const text = moment.excerpt.replace(/\s+/g, " ").trim();
  const sentenceEnd = text.search(/[.!?](\s|$)/);
  const firstSentence = sentenceEnd > 0 ? text.slice(0, sentenceEnd) : text;
  return firstSentence.length <= 60 ? firstSentence : firstSentence.slice(0, 57).trimEnd() + "…";
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-3 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
      aria-hidden="true"
    >
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

function Connector({ label }: { label?: string }) {
  if (!label) {
    return (
      <div className="flex justify-center" aria-hidden="true">
        <span className="block h-5 w-px bg-border-hover" />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      <span className="block h-2 w-px bg-border-hover" aria-hidden="true" />
      <span className="max-w-[75%] px-2 text-center text-[11px] italic leading-snug text-fg-subtle">
        {label}
      </span>
      <span className="block h-2 w-px bg-border-hover" aria-hidden="true" />
    </div>
  );
}

function FlowNode({
  moment,
  index,
  open,
  onToggle,
}: {
  moment: TraceMoment;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const label = deriveLabel(moment);
  const ordinal = String(index + 1).padStart(2, "0");
  const panelId = `trace-node-${index}`;

  const hasRange =
    moment.startOrdinal != null && moment.endOrdinal != null && moment.threadSlug;
  const hashFragment = hasRange
    ? moment.startOrdinal === moment.endOrdinal
      ? `#m${moment.startOrdinal}`
      : `#m${moment.startOrdinal}-m${moment.endOrdinal}`
    : "";
  const href = moment.threadSlug ? `/t/${moment.threadSlug}${hashFragment}` : null;

  return (
    <div
      className={`rounded-[4px] border transition-colors duration-150 ${
        open
          ? "border-border-hover bg-surface/60"
          : "border-border bg-transparent hover:border-border-hover hover:bg-surface/30"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer"
      >
        <span className="font-mono text-[11px] tracking-wider text-fg-ghost tabular-nums">
          {ordinal}
        </span>
        <span
          className={`flex-1 text-[13px] leading-snug transition-colors duration-150 ${
            open ? "text-fg" : "text-fg-muted"
          }`}
        >
          {label}
        </span>
        <span className="text-fg-ghost">
          <Chevron open={open} />
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          className="border-t border-border px-4 pb-3 pt-3 animate-reveal"
        >
          <div className="text-[13px] leading-relaxed text-fg-muted">
            <Markdown content={moment.excerpt} />
          </div>
          {href && (
            <Link
              href={href}
              className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] text-fg-ghost transition-colors duration-150 hover:text-accent"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3"
                aria-hidden="true"
              >
                <path d="M4 6h8M4 10h5" />
                <rect x="2" y="2" width="12" height="12" rx="2" />
              </svg>
              {moment.threadTitle ?? moment.threadSlug}
              {hashFragment && (
                <span className="text-fg-faint">{hashFragment.replace("#", " ")}</span>
              )}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

type FlowItem =
  | { kind: "node"; moment: TraceMoment; index: number }
  | { kind: "bridge"; label?: string; key: string };

function buildFlow(moments: TraceMoment[]): FlowItem[] {
  const items: FlowItem[] = [];
  let nodeIndex = 0;
  let pendingLabel: string | undefined;

  for (let i = 0; i < moments.length; i++) {
    const m = moments[i];
    if (m.kind === "annotation") {
      pendingLabel = pendingLabel
        ? `${pendingLabel} · ${m.excerpt}`
        : m.excerpt;
      continue;
    }
    if (nodeIndex > 0) {
      items.push({ kind: "bridge", label: pendingLabel, key: `b-${i}` });
    }
    pendingLabel = undefined;
    items.push({ kind: "node", moment: m, index: nodeIndex });
    nodeIndex += 1;
  }
  return items;
}

export function TraceView({ question, title, content }: TraceViewProps) {
  const items = buildFlow(content.moments);
  const [openSet, setOpenSet] = useState<Set<number>>(() => new Set());

  function toggle(i: number) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const hasNodes = items.some((it) => it.kind === "node");

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
        Decision Trace
      </p>
      <h1 className="mt-2 text-[clamp(18px,3vw,21px)] font-medium leading-[1.2] tracking-tight text-fg">
        {title || question}
      </h1>

      {hasNodes && (
        <div className="mt-8">
          {items.map((item) =>
            item.kind === "node" ? (
              <FlowNode
                key={`n-${item.index}`}
                moment={item.moment}
                index={item.index}
                open={openSet.has(item.index)}
                onToggle={() => toggle(item.index)}
              />
            ) : (
              <Connector key={item.key} label={item.label} />
            )
          )}
        </div>
      )}

      {content.resolution && (
        <div className="mt-10 border-t border-border pt-6">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-accent">
            Resolution
          </p>
          <div className="text-[13px] leading-relaxed text-fg">
            <Markdown content={content.resolution} />
          </div>
        </div>
      )}
    </div>
  );
}
