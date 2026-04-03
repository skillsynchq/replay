import Link from "next/link";
import { ChevronRight } from "./icons";
import { DocsMarkdown } from "./docs-markdown";
import type { DocMeta, DocPage } from "@/lib/docs";

interface DocsShellProps {
  docs: DocMeta[];
  doc: DocPage;
}

function SectionLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex rounded-[4px] border px-3 py-2 text-[13px] transition-colors duration-150 ${
        active
          ? "border-border bg-surface-raised text-fg"
          : "border-transparent text-fg-muted hover:border-border hover:text-fg"
      }`}
    >
      {label}
    </Link>
  );
}

export function DocsShell({ docs, doc }: DocsShellProps) {
  return (
    <section className="px-6 pb-24 pt-28">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[4px] border border-border bg-surface px-6 py-8 sm:px-8">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            <span>Docs</span>
            <ChevronRight className="size-3" />
            <span>Replay CLI</span>
          </div>
          <h1 className="mt-4 max-w-3xl text-[clamp(30px,4vw,46px)] font-medium leading-[1.05] tracking-tight text-fg">
            {doc.title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-fg-muted">
            {doc.description}
          </p>
          <p className="mt-6 max-w-2xl border-l border-accent/70 pl-4 font-mono text-[12px] leading-6 text-fg-subtle">
            These docs cover the CLI publishing path only. Claude Code has full
            support. Codex support is currently in beta.
          </p>
        </div>

        <div className="mt-6 rounded-[4px] border border-border bg-surface p-3">
          <div className="px-3 pb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-ghost">
            Navigate
          </div>
          <nav className="flex flex-wrap gap-2">
            {docs.map((item) => (
              <SectionLink
                key={item.slug}
                href={`/docs/${item.slug}`}
                label={item.navTitle}
                active={item.slug === doc.slug}
              />
            ))}
          </nav>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <article className="min-w-0 rounded-[4px] border border-border bg-surface px-6 py-8 sm:px-8">
            <DocsMarkdown content={doc.content} />
          </article>

          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[4px] border border-border bg-surface p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-ghost">
                On this page
              </div>
              <nav className="mt-3 space-y-1.5">
                {doc.headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`block text-[13px] leading-6 transition-colors duration-150 hover:text-fg ${
                      heading.depth === 3
                        ? "pl-3 text-fg-ghost"
                        : "text-fg-muted"
                    }`}
                  >
                    {heading.title}
                  </a>
                ))}
              </nav>
            </div>

            <div className="rounded-[4px] border border-border bg-surface p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-ghost">
                Core command
              </div>
              <pre className="mt-3 overflow-x-auto rounded-[4px] border border-accent/30 bg-bg px-4 py-3 font-mono text-[11px] leading-6 text-fg">
                <code>replay upload &lt;session-id-or-title&gt;</code>
              </pre>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
