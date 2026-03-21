import { ScrollReveal } from "./scroll-reveal";
import { GitHubMark } from "./icons";

interface Statement {
  title: string;
  description: string;
  showGitHub?: boolean;
}

const statements: Statement[] = [
  {
    title: "Your data, your control",
    description:
      "Sessions are private until you choose to share them. Delete anytime.",
  },
  {
    title: "Open source CLI",
    description:
      "The replay CLI is open source. Inspect every byte before it leaves your machine.",
    showGitHub: true,
  },
];

export function Trust() {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto max-w-2xl">
        <ScrollReveal>
          <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
            Built on trust
          </p>
        </ScrollReveal>

        <div className="mt-12 space-y-12">
          {statements.map((statement, i) => (
            <ScrollReveal key={statement.title} stagger={(i + 1) * 80}>
              <div>
                <h3 className="text-[21px] font-medium text-fg">
                  {statement.title}
                  {statement.showGitHub && (
                    <GitHubMark className="ml-2 inline size-4 align-middle text-fg-ghost" />
                  )}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                  {statement.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
