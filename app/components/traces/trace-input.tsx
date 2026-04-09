"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface TraceInputProps {
  projectPaths: string[];
}

const EXAMPLE_QUESTIONS = [
  "Why did we choose this auth approach?",
  "How did the API design evolve?",
  "What tradeoffs did we make on caching?",
];

export function TraceInput({ projectPaths }: TraceInputProps) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [projectPath, setProjectPath] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setProjectOpen(false);
      }
    }
    if (projectOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [projectOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/traces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          projectPath: projectPath || undefined,
        }),
      });

      if (!res.ok) {
        setSubmitting(false);
        return;
      }

      const data = await res.json();
      router.push(`/traces/${data.slug}`);
    } catch {
      setSubmitting(false);
    }
  }

  function handleExampleClick(q: string) {
    setQuestion(q);
  }

  const selectedLabel = projectPath
    ? projectPath.split("/").slice(-2).join("/")
    : "All projects";

  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center pt-36 pb-16">
      <h1 className="text-[clamp(24px,4vw,34px)] font-medium leading-[1.1] tracking-tight text-fg text-center">
        What decision would you like to trace?
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 w-full">
        <div className="rounded-[4px] border border-border bg-surface transition-colors duration-150 focus-within:border-border-hover">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Why did we build auth as a separate service?"
            maxLength={500}
            disabled={submitting}
            className="w-full bg-transparent px-4 pt-3.5 pb-2 text-[14px] text-fg placeholder:text-fg-ghost focus-visible:outline-none disabled:opacity-50"
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="relative" ref={projectRef}>
              {projectPaths.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setProjectOpen((v) => !v)}
                    disabled={submitting}
                    className="flex items-center gap-1.5 rounded-[4px] px-2 py-1 font-mono text-[11px] text-fg-ghost transition-colors duration-150 hover:bg-surface-raised hover:text-fg-muted disabled:opacity-50 cursor-pointer"
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3 shrink-0" aria-hidden="true">
                      <path d="M2 4.5h2l1.5 -2h5l1.5 2h2v9h-12z" />
                    </svg>
                    {selectedLabel}
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-2.5 shrink-0" aria-hidden="true">
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </button>
                  {projectOpen && (
                    <div className="absolute left-0 top-full z-10 mt-1 min-w-[200px] rounded-md border border-border bg-surface-raised py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => { setProjectPath(""); setProjectOpen(false); }}
                        className={`block w-full px-3 py-1.5 text-left font-mono text-[11px] transition-colors duration-150 hover:bg-surface hover:text-fg focus-visible:outline-none ${projectPath === "" ? "text-fg" : "text-fg-muted"}`}
                      >
                        All projects
                      </button>
                      {projectPaths.map((path) => {
                        const short = path.split("/").slice(-2).join("/");
                        return (
                          <button
                            type="button"
                            key={path}
                            onClick={() => { setProjectPath(path); setProjectOpen(false); }}
                            className={`block w-full px-3 py-1.5 text-left font-mono text-[11px] transition-colors duration-150 hover:bg-surface hover:text-fg focus-visible:outline-none ${projectPath === path ? "text-fg" : "text-fg-muted"}`}
                          >
                            {short}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <span className="px-2 py-1 font-mono text-[11px] text-fg-faint">
                  All threads
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={!question.trim() || submitting}
              className="rounded-[4px] bg-surface-raised px-3 py-1.5 text-[12px] text-fg-muted transition-all duration-150 hover:text-fg disabled:opacity-30 cursor-pointer"
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-1.5 rounded-full bg-accent animate-pulse" />
                  Tracing...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Trace
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Example questions */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleExampleClick(q)}
            className="rounded-[4px] border border-border px-3 py-1.5 text-[12px] text-fg-ghost transition-colors duration-150 hover:border-border-hover hover:text-fg-muted cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Explanation */}
      <div className="mt-16 w-full">
        <div className="grid grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Ask a question",
              desc: "About any decision in your codebase. Why was it built this way? What was considered?",
            },
            {
              step: "02",
              title: "We search your threads",
              desc: "An AI agent reads through your conversations, finding the key moments where decisions were made.",
            },
            {
              step: "03",
              title: "Get a decision trace",
              desc: "A narrative built from real conversations, with citations linking back to the original threads.",
            },
          ].map((item) => (
            <div key={item.step}>
              <span className="font-mono text-[13px] text-accent">{item.step}</span>
              <p className="mt-1 text-[13px] text-fg">{item.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-fg-subtle">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
