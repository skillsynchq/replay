import { TerminalIcon, SearchIcon, LinkIcon, UserIcon } from "./icons";
import type { ReactNode } from "react";

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <TerminalIcon className="size-4" />,
    title: "Full capture",
    description:
      "Every message, tool call, file read, diff, and thinking block. Nothing lost.",
  },
  {
    icon: <SearchIcon className="size-4" />,
    title: "Search everything",
    description:
      'Full-text search across all sessions. Find "that conversation where I set up auth."',
  },
  {
    icon: <LinkIcon className="size-4" />,
    title: "Share with a link",
    description:
      "replay.md/you/session. Public, private, unlisted, or team-only.",
  },
  {
    icon: <UserIcon className="size-4" />,
    title: "Your profile",
    description:
      "replay.md/username. A portfolio of how you think with AI.",
  },
];

export function Features() {
  return (
    <section className="px-6 pt-6 pb-16">
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="animate-reveal stagger-4 group border border-border rounded-[4px] px-6 py-6 transition-colors duration-150 hover:border-border-hover"
            >
              <div className="flex size-9 items-center justify-center rounded-[4px] border border-border bg-surface text-accent transition-colors duration-150 group-hover:border-border-hover">
                {feature.icon}
              </div>
              <h3 className="mt-5 text-[15px] font-medium text-fg">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
