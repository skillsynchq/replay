import { ScrollReveal } from "./scroll-reveal";
import { ClaudeMark, FileMark } from "./icons";

interface DiffLine {
  type: "context" | "add" | "remove";
  num: [number | null, number | null];
  code: string;
}

const diffLines: DiffLine[] = [
  { type: "context", num: [14, 14], code: "export async function validateSession(" },
  { type: "context", num: [15, 15], code: "  request: NextRequest" },
  { type: "context", num: [16, 16], code: ") {" },
  { type: "remove", num: [17, null], code: "  const token = request.cookies.get(\"session\");" },
  { type: "remove", num: [18, null], code: "  if (!token) return null;" },
  { type: "remove", num: [19, null], code: "  const session = await db.sessions.findUnique({" },
  { type: "remove", num: [20, null], code: "    where: { token: token.value }," },
  { type: "remove", num: [21, null], code: "  });" },
  { type: "remove", num: [22, null], code: "  return session?.expiresAt > new Date() ? session : null;" },
  { type: "add", num: [null, 17], code: "  const token = extractBearerToken(request);" },
  { type: "add", num: [null, 18], code: '  if (!token) return { valid: false, reason: "missing" };' },
  { type: "add", num: [null, 19], code: "" },
  { type: "add", num: [null, 20], code: "  const result = await verifySessionToken(token, {" },
  { type: "add", num: [null, 21], code: "    maxAge: SESSION_MAX_AGE," },
  { type: "add", num: [null, 22], code: "    refresh: true," },
  { type: "add", num: [null, 23], code: "  });" },
  { type: "add", num: [null, 24], code: "" },
  { type: "add", num: [null, 25], code: "  return result;" },
  { type: "context", num: [23, 26], code: "}" },
];

function DiffBlock() {
  return (
    <div className="mt-3 overflow-hidden border border-border rounded-[4px]">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-1.5">
        <FileMark className="size-3 text-fg-ghost" />
        <span className="font-mono text-[11px] text-fg-subtle">
          src/lib/auth.ts
        </span>
      </div>
      <div className="overflow-x-auto">
        <pre className="font-mono text-[12px] leading-[1.7]">
          {diffLines.map((line, i) => {
            const bgClass =
              line.type === "add"
                ? "bg-diff-add-bg"
                : line.type === "remove"
                  ? "bg-diff-remove-bg"
                  : "";
            const textClass =
              line.type === "add"
                ? "text-diff-add"
                : line.type === "remove"
                  ? "text-diff-remove"
                  : "text-fg-ghost";
            const prefix =
              line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
            const numLeft =
              line.num[0] !== null ? String(line.num[0]).padStart(3) : "   ";
            const numRight =
              line.num[1] !== null ? String(line.num[1]).padStart(3) : "   ";

            return (
              <div key={i} className={`flex ${bgClass}`}>
                <span className="select-none px-2 text-fg-faint">
                  {numLeft}
                </span>
                <span className="select-none px-2 text-fg-faint">
                  {numRight}
                </span>
                <span className={`select-none px-1 ${textClass}`}>
                  {prefix}
                </span>
                <code className={textClass}>{line.code}</code>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

function ToolUseIndicator({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <FileMark className="size-3 text-fg-ghost" />
      <span className="font-mono text-[11px] text-fg-ghost">{label}</span>
    </div>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="py-4">
      <div className="flex gap-2">
        <span className="select-none font-mono text-[13px] text-fg-ghost">
          {">"}
        </span>
        <p className="text-[13px] font-medium text-fg">{text}</p>
      </div>
    </div>
  );
}

function AssistantMessage({
  children,
  timestamp,
}: {
  children: React.ReactNode;
  timestamp: string;
}) {
  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">{children}</div>
        <span className="shrink-0 font-mono text-[11px] text-fg-faint">
          {timestamp}
        </span>
      </div>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="border border-border bg-surface px-1.5 py-0.5 font-mono text-[12px] text-fg-subtle rounded-[2px]">
      {children}
    </code>
  );
}

export function ConversationPreview() {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto max-w-3xl">
        <ScrollReveal>
          <div className="overflow-hidden border border-border rounded-[4px] transition-colors duration-150 hover:border-border-hover">
            {/* Frontmatter — session metadata */}
            <div className="border-b border-border bg-surface px-5 py-4">
              {/* Title */}
              <h3 className="text-[16px] font-medium text-fg">
                Refactor auth middleware for session validation
              </h3>
              {/* Author */}
              <p className="mt-1 text-[13px] text-fg-muted">
                nishant · <span className="text-fg-ghost">@nishantjoshi</span>
              </p>

              {/* Metadata grid */}
              <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-fg-ghost">
                    Agent
                  </span>
                  <div className="flex items-center gap-1">
                    <ClaudeMark className="size-3.5 text-fg-subtle" />
                    <span className="text-[12px] text-fg-muted">
                      Claude Code
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-fg-ghost">
                    Model
                  </span>
                  <span className="text-[12px] text-fg-muted">
                    Opus 4.6
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-fg-ghost">
                    When
                  </span>
                  <span className="font-mono text-[12px] text-fg-muted">
                    3 hours ago
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-fg-ghost">
                    Prompts
                  </span>
                  <span className="font-mono text-[12px] text-fg-muted">
                    4
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-fg-ghost">
                    Diff
                  </span>
                  <span className="font-mono text-[12px]">
                    <span className="text-diff-add">+9</span>
                    {" "}
                    <span className="text-diff-remove">-6</span>
                    {" "}
                    <span className="text-fg-ghost">lines</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="divide-y divide-border px-5">
              <UserMessage text="Refactor the auth middleware to use the new session validation" />

              <AssistantMessage timestamp="2m ago">
                <ToolUseIndicator label="Read src/lib/auth.ts" />
                <p className="text-[13px] leading-relaxed text-fg-muted">
                  I&apos;ll refactor <InlineCode>validateSession</InlineCode> to
                  use the new <InlineCode>verifySessionToken</InlineCode> helper.
                  This extracts the bearer token, validates expiry, and optionally
                  refreshes the session.
                </p>
                <DiffBlock />
              </AssistantMessage>

              <UserMessage text="Looks good, but extract the config into a separate file" />

              {/* Fading assistant response */}
              <div className="relative">
                <AssistantMessage timestamp="1m ago">
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    I&apos;ll move the session configuration to{" "}
                    <InlineCode>src/lib/auth.config.ts</InlineCode> and export
                    the constants from there. This keeps the validation logic
                    clean and makes the config easy to adjust per environment...
                  </p>
                </AssistantMessage>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-bg to-transparent" />
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal stagger={80}>
          <div className="mt-8 flex flex-col items-center gap-2">
            <p className="text-[13px] text-fg-ghost">
              This is what sharing looks like.
            </p>
            <a
              href="#"
              className="text-[13px] text-accent transition-colors duration-150 hover:text-accent-hover"
            >
              Explore public threads →
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
