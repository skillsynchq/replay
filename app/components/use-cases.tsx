import { ScrollReveal } from "./scroll-reveal";

interface UseCase {
  title: string;
  description: string;
}

const useCases: UseCase[] = [
  {
    title: '"What was I thinking?"',
    description:
      "You built a feature last week. Today it's broken. Pull up the session and see every decision you made.",
  },
  {
    title: '"Here\'s how I built it"',
    description:
      "Share a session with a teammate. Better than any doc — they see the real process, not a polished summary.",
  },
  {
    title: "Trace the origin",
    description:
      "git blame tells you what changed. Replay tells you why.",
  },
];

export function UseCases() {
  return (
    <section className="bg-surface/50 px-6 py-28 border-y border-border">
      <div className="mx-auto max-w-3xl">
        <ScrollReveal>
          <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
            Why it matters
          </p>
          <h2 className="mt-3 text-[clamp(21px,3vw,34px)] font-medium leading-[1.2] tracking-tight text-fg">
            Your thinking is worth keeping
          </h2>
        </ScrollReveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {useCases.map((useCase, i) => (
            <ScrollReveal key={useCase.title} stagger={(i + 1) * 80}>
              <div>
                <span className="font-mono text-[13px] text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-[16px] font-medium text-fg">
                  {useCase.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                  {useCase.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
