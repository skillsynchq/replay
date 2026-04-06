import { Nav } from "./components/nav";
import { CopyButton } from "./components/copy-button";
import { PageReveal } from "./components/page-reveal";
import { ConversationPreview } from "./components/conversation-preview";
import { ClaudeMark, OpenAIMark } from "./components/icons";

const INSTALL_COMMAND = "curl -sSL https://install.replay.md | sh";

const steps = [
  {
    number: "01",
    title: "Install the CLI",
    description: "One command. macOS & Linux.",
  },
  {
    number: "02",
    title: "Upload a session",
    description: "Browse and pick from your sessions.",
  },
  {
    number: "03",
    title: "Share the link",
    description: "Public or private. Claim your username.",
  },
];

export default function Home() {
  return (
    <div id="top" className="relative flex h-dvh flex-col min-[900px]:overflow-hidden">
      {/* Blueprint guide lines — hidden on mobile */}
      <div className="pointer-events-none absolute inset-0 hidden min-[900px]:block" aria-hidden="true">
        {/* Left edge */}
        <div className="absolute top-0 bottom-0 left-[max(0.25rem,calc((100vw-84rem)/2))] w-px border-l border-dashed border-fg/[0.06]" />
        {/* Right edge */}
        <div className="absolute top-0 bottom-0 right-[max(0.25rem,calc((100vw-84rem)/2))] w-px border-l border-dashed border-fg/[0.06]" />
        {/* Top edge below nav */}
        <div className="absolute left-0 right-0 top-[56px] h-px border-t border-dashed border-fg/[0.06]" />
        {/* Bottom edge */}
        <div className="absolute left-0 right-0 bottom-[150px] h-px border-t border-dashed border-fg/[0.06]" />
        {/* Corner dots — solid, on top of line intersections */}
        <div className="absolute z-10 left-[max(0.25rem,calc((100vw-84rem)/2))] top-[56px] size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1a1918]" />
        <div className="absolute z-10 right-[max(0.25rem,calc((100vw-84rem)/2))] top-[56px] size-[5px] translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1a1918]" />
        <div className="absolute z-10 left-[max(0.25rem,calc((100vw-84rem)/2))] bottom-[150px] size-[5px] -translate-x-1/2 translate-y-1/2 rounded-full bg-[#1a1918]" />
        <div className="absolute z-10 right-[max(0.25rem,calc((100vw-84rem)/2))] bottom-[150px] size-[5px] translate-x-1/2 translate-y-1/2 rounded-full bg-[#1a1918]" />
      </div>

      <Nav />

      <main className="flex min-h-0 flex-1 flex-col pt-16 min-[900px]:flex-row min-[900px]:pt-[48px]">
        {/* Left column — 38.2% (golden ratio minor) */}
        <div className="flex w-full flex-col justify-between px-6 pb-6 min-[900px]:w-[38.2%] min-[900px]:py-8 min-[900px]:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]">
          <div>
            {/* Hero */}
            <PageReveal delay={0}>
              <h1 className="text-[clamp(28px,4vw,44px)] font-medium leading-[1.1] tracking-tight text-fg">
                Home for your
                <br />
                coding sessions
              </h1>
            </PageReveal>

            <PageReveal delay={80}>
              <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-fg-muted">
                Turn any Claude Code or Codex conversation into a decision
                trace. Browsable, searchable, and shareable.
              </p>
            </PageReveal>

            <PageReveal delay={160}>
              <div className="animate-border-pulse mt-6 flex items-center gap-3 border border-border bg-surface-raised px-4 py-2.5 font-mono text-[13px] rounded-[4px]">
                <span className="text-fg-ghost select-none">$</span>
                <code className="flex-1 truncate text-fg select-all">
                  {INSTALL_COMMAND}
                </code>
                <CopyButton text={INSTALL_COMMAND} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[11px] text-fg-ghost">Available for</span>
                <ClaudeMark className="size-3.5 text-fg-ghost" />
                <OpenAIMark className="size-3.5 text-fg-ghost" />
              </div>
            </PageReveal>

            {/* How it works */}
            <PageReveal delay={240}>
              <div className="mt-8">
                <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
                  How it works
                </p>
                <div className="mt-3 space-y-2">
                  {steps.map((step) => (
                    <div key={step.number} className="flex items-baseline gap-3">
                      <span className="shrink-0 font-mono text-[13px] text-accent">
                        {step.number}
                      </span>
                      <p className="text-[13px] leading-relaxed">
                        <span className="text-fg">{step.title}</span>
                        <span className="text-fg-ghost"> — </span>
                        <span className="text-fg-muted">{step.description}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </PageReveal>
          </div>

          {/* Bottom: trust + footer */}
          <div className="mt-8 min-[900px]:mt-0">
            <PageReveal delay={320}>
              <div className="space-y-1.5">
                <p className="text-[13px] text-fg-muted">
                  <span className="text-fg">Your data, your control.</span>{" "}
                  Private until you share. Delete anytime.
                </p>
                <p className="text-[13px] text-fg-muted">
                  Going open source soon.
                </p>
              </div>
            </PageReveal>

            <PageReveal delay={400}>
              <div className="mt-4 text-[11px] text-fg-ghost">
                <span>© 2026 replay.md</span>
              </div>
            </PageReveal>
          </div>
        </div>

        {/* Right column — 61.8% (golden ratio major), hidden on mobile */}
        <div className="hidden min-[900px]:flex w-full min-h-0 flex-col px-6 pb-6 min-[900px]:w-[61.8%] min-[900px]:py-8 min-[900px]:pl-0 min-[900px]:pr-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]">
          <ConversationPreview />
        </div>
      </main>
    </div>
  );
}
