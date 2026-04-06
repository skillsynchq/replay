import { CopyButton } from "./copy-button";
import { ScrollReveal } from "./scroll-reveal";

const INSTALL_COMMAND = "curl -sSf https://replay.md/install | sh";

export function BottomCta() {
  return (
    <section className="relative border-t border-border px-6 py-28">
      {/* Mirror the hero's subtle warmth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          background: "radial-gradient(ellipse 60% 60% at 50% 70%, var(--accent), transparent)",
        }}
      />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <ScrollReveal>
          <h2 className="text-[clamp(21px,3vw,34px)] font-medium leading-[1.2] tracking-tight text-fg">
            Get started in 30 seconds
          </h2>
          <p className="mt-3 text-[13px] text-fg-muted">
            One command. Then your sessions have a home.
          </p>
        </ScrollReveal>

        <ScrollReveal stagger={80}>
          <div className="mt-8 flex w-full max-w-lg items-center gap-3 border border-border bg-surface-raised px-5 py-3.5 font-mono text-[13px] rounded-[4px]">
            <span className="text-fg-ghost select-none">$</span>
            <code className="flex-1 text-fg select-all">{INSTALL_COMMAND}</code>
            <CopyButton text={INSTALL_COMMAND} />
          </div>
        </ScrollReveal>

        <ScrollReveal stagger={160}>
          <a
            href="/explore"
            className="mt-5 text-[13px] text-accent transition-colors duration-150 hover:text-accent-hover"
          >
            Explore public threads →
          </a>
        </ScrollReveal>
      </div>
    </section>
  );
}
