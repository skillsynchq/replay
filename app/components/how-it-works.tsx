import { ScrollReveal } from "./scroll-reveal";
import { ClaudeMark } from "./icons";

interface Step {
  number: string;
  title: string;
  description: string;
  showLogos?: boolean;
}

const steps: Step[] = [
  {
    number: "01",
    title: "Install the CLI",
    description: "One command. Works on macOS and Linux.",
  },
  {
    number: "02",
    title: "Upload a session",
    description: "Replay detects your Claude Code and Codex sessions automatically.",
    showLogos: true,
  },
  {
    number: "03",
    title: "Share the link",
    description: "Public or private. Claim your username at replay.md/you.",
  },
];

export function HowItWorks() {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto max-w-4xl">
        <ScrollReveal>
          <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
            How it works
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-12 md:grid-cols-3 md:gap-16">
          {steps.map((step, i) => (
            <ScrollReveal key={step.number} stagger={(i + 1) * 80}>
              <div>
                <span className="font-mono text-[13px] text-accent">
                  {step.number}
                </span>
                <h3 className="mt-2 text-[21px] font-medium text-fg">
                  {step.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                  {step.description}
                  {step.showLogos && (
                    <span className="ml-1.5 inline-flex items-center gap-1.5 align-middle">
                      <ClaudeMark className="inline size-3.5 text-fg-ghost" />
                    </span>
                  )}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
