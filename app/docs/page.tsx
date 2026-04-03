import Link from "next/link";
import type { Metadata } from "next";
import { CheckMark, TerminalIcon, ChevronRight } from "@/app/components/icons";
import { getAllDocs } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Docs — Replay CLI publishing",
  description:
    "Documentation for installing the Replay CLI, authenticating, and publishing sessions with replay upload.",
};

export default function DocsIndexPage() {
  const docs = getAllDocs();

  return (
    <section className="px-6 pb-24 pt-28">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[10px] border border-border bg-surface/55 px-6 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:px-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            Documentation
          </div>
          <h1 className="mt-4 max-w-3xl text-[clamp(34px,5vw,55px)] font-medium leading-[1.05] tracking-tight text-fg">
            Publish your sessions from the CLI.
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-8 text-fg-muted">
            These docs only cover the publishing path: install the CLI, sign
            in, run{" "}
            <code className="rounded-[3px] border border-border bg-[#141110] px-1.5 py-0.5 font-mono text-[12px] text-fg">
              replay upload
            </code>
            , and share the resulting URL.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
            <div className="rounded-[8px] border border-border bg-[#141110]/90 p-5">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-ghost">
                <TerminalIcon className="size-3.5" />
                Fast path
              </div>
              <pre className="mt-4 overflow-x-auto rounded-[6px] border border-border bg-black/20 px-4 py-3 font-mono text-[12px] leading-6 text-fg">
                <code>{`curl -sSL https://install.replay.md | sh
replay login
replay upload <session-id-or-title>`}</code>
              </pre>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[8px] border border-border bg-[#141110]/90 p-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-ghost">
                  Transcript coverage
                </div>
                <p className="mt-3 text-[14px] leading-7 text-fg-muted">
                  Claude Code has full support today. Codex publishing is available in beta.
                </p>
              </div>

              <div className="rounded-[8px] border border-border bg-[#141110]/90 p-5">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-ghost">
                  <CheckMark className="size-3 text-accent" />
                  Upload behavior
                </div>
                <p className="mt-3 text-[14px] leading-7 text-fg-muted">
                  First upload creates a private thread. Re-uploading the same
                  session updates the existing URL.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className="group rounded-[10px] border border-border bg-surface/55 p-5 transition-colors duration-150 hover:border-border-hover hover:bg-surface"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-ghost">
                  {doc.navTitle}
                </div>
                <ChevronRight className="size-3.5 text-fg-ghost transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-fg" />
              </div>
              <h2 className="mt-3 text-[22px] font-medium tracking-tight text-fg">
                {doc.title}
              </h2>
              <p className="mt-3 text-[14px] leading-7 text-fg-muted">
                {doc.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
