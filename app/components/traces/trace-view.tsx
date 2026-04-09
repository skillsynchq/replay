import Link from "next/link";
import type { TraceContent, TraceMoment } from "@/lib/ai/generate-trace";
import { Markdown } from "@/app/components/markdown";

interface TraceViewProps {
  question: string;
  title?: string | null;
  content: TraceContent;
}

function MomentBlock({ moment }: { moment: TraceMoment }) {
  if (moment.kind === "annotation") {
    return (
      <div className="border-l-2 border-border-hover pl-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wider text-fg-ghost mb-1">
          Context
        </p>
        <div className="text-[13px] leading-relaxed text-fg-muted">
          <Markdown content={moment.excerpt} />
        </div>
      </div>
    );
  }

  const hasRange =
    moment.startOrdinal != null && moment.endOrdinal != null && moment.threadSlug;
  const hashFragment = hasRange
    ? moment.startOrdinal === moment.endOrdinal
      ? `#m${moment.startOrdinal}`
      : `#m${moment.startOrdinal}-m${moment.endOrdinal}`
    : "";
  const href = moment.threadSlug ? `/t/${moment.threadSlug}${hashFragment}` : null;

  return (
    <div className="border-l-2 border-accent/40 pl-3 py-2">
      <div className="text-[13px] leading-relaxed text-fg-muted">
        <Markdown content={moment.excerpt} />
      </div>
      {moment.annotation && (
        <p className="mt-1.5 text-[12px] leading-relaxed text-fg-subtle italic">
          {moment.annotation}
        </p>
      )}
      {href && (
        <Link
          href={href}
          className="mt-1.5 inline-flex items-center gap-1 font-mono text-[11px] text-fg-ghost transition-colors duration-150 hover:text-accent"
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
  );
}

export function TraceView({ question, title, content }: TraceViewProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
        Decision Trace
      </p>
      <h1 className="mt-2 text-[clamp(18px,3vw,21px)] font-medium leading-[1.2] tracking-tight text-fg">
        {title || question}
      </h1>

      {content.moments.length > 0 && (
        <div className="mt-8 space-y-4">
          {content.moments.map((moment, i) => (
            <MomentBlock key={i} moment={moment} />
          ))}
        </div>
      )}

      {content.resolution && (
        <>
          <div className="mt-8 border-t border-border pt-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent mb-2">
              Resolution
            </p>
            <div className="text-[13px] leading-relaxed text-fg">
              <Markdown content={content.resolution} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
