interface VisibilityBadgeProps {
  visibility: string;
}

const config: Record<string, { label: string; className: string }> = {
  public: {
    label: "Public",
    className: "border-accent-dim text-accent",
  },
  unlisted: {
    label: "Unlisted",
    className: "border-border-hover text-fg-subtle",
  },
  shared: {
    label: "Shared",
    className: "border-border-hover text-fg-subtle",
  },
  private: {
    label: "Private",
    className: "border-border text-fg-ghost",
  },
};

export function VisibilityBadge({ visibility }: VisibilityBadgeProps) {
  const { label, className } = config[visibility] ?? config.private;

  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider rounded-[2px] ${className}`}
    >
      {label}
    </span>
  );
}
