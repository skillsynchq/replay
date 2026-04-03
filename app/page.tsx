import Link from "next/link";
import { Nav } from "./components/nav";
import { CopyButton } from "./components/copy-button";
import { PageReveal } from "./components/page-reveal";
import { ConversationPreview } from "./components/conversation-preview";
import { ClaudeMark, OpenAIMark, GitHubMark } from "./components/icons";

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
    <div id="top" className="flex h-dvh flex-col min-[900px]:overflow-hidden">
      <Nav />

      <main className="flex flex-1 flex-col pt-16 min-[900px]:flex-row min-[900px]:pt-[48px]">
        {/* Left column — 38.2% (golden ratio minor) */}
        <div className="flex w-full flex-col justify-between px-6 pb-6 min-[900px]:w-[38.2%] min-[900px]:py-8 min-[900px]:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]">
          <div>
            {/* Hero */}
            <PageReveal delay={0}>
              <h1 className="text-[clamp(28px,4vw,44px)] font-medium leading-[1.1] tracking-tight text-fg">
                Share your agent sessions
              </h1>
            </PageReveal>

            <PageReveal delay={80}>
              <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-fg-muted">
                Pick any Claude Code or Codex conversation, give it a URL, and
                share it with anyone.
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
                  <span className="text-fg">Open source CLI.</span>{" "}
                  Inspect every byte before it leaves your machine.
                  <a
                    href="https://github.com/nicholasgriffintn/replay-cli"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1.5 inline-block align-middle transition-colors duration-150 hover:text-fg"
                  >
                    <GitHubMark className="size-3" />
                  </a>
                </p>
              </div>
            </PageReveal>

            <PageReveal delay={400}>
              <div className="mt-4 flex items-center gap-3 text-[11px] text-fg-ghost">
                <span>© 2026 replay.md</span>
                <span>·</span>
                <Link
                  href="/privacy"
                  className="transition-colors duration-150 hover:text-fg-muted"
                >
                  Privacy
                </Link>
                <span>·</span>
                <Link
                  href="/terms"
                  className="transition-colors duration-150 hover:text-fg-muted"
                >
                  Terms
                </Link>
              </div>
            </PageReveal>
          </div>
        </div>

        {/* Right column — 61.8% (golden ratio major) */}
        <div className="flex w-full flex-col px-6 pb-6 min-[900px]:w-[61.8%] min-[900px]:py-8 min-[900px]:pl-0 min-[900px]:pr-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]">
          <ConversationPreview />
        </div>
      </main>
    </div>
  );
}
