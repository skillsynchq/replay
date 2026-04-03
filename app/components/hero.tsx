import { CopyButton } from "./copy-button";

const INSTALL_COMMAND = "curl -sSL https://install.replay.md | sh";

export function Hero() {
  return (
    <section className="flex flex-col items-center px-6 pt-36 pb-28">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <h1 className="animate-reveal stagger-1 text-[clamp(34px,5vw,55px)] font-medium leading-[1.1] tracking-tight text-fg">
          Share your agent sessions
        </h1>

        <p className="animate-reveal stagger-2 mt-4 max-w-md text-[16px] leading-relaxed text-fg-muted">
          Pick any Claude Code or Codex conversation, give it a URL, and share
          it with anyone.
        </p>

        <div className="animate-reveal animate-border-pulse stagger-3 mt-8 flex w-full max-w-lg items-center gap-3 border border-border bg-surface-raised px-5 py-3.5 font-mono text-[13px] rounded-[4px]">
          <span className="text-fg-ghost select-none">$</span>
          <code className="flex-1 text-fg select-all">{INSTALL_COMMAND}</code>
          <CopyButton text={INSTALL_COMMAND} />
        </div>
      </div>
    </section>
  );
}
