import { PageReveal } from "./page-reveal";
import { ClaudeMark } from "./icons";
import {
  Conversation,
  type ConversationDiffLine,
  PreviewConversation,
} from "./conversation";

const diffLines: ConversationDiffLine[] = [
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
];

export function ConversationPreview() {
  return (
    <div className="flex min-h-0 flex-1 flex-col max-[899px]:max-h-[50vh]">
      <PageReveal delay={160} className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[4px] border border-border transition-colors duration-150 hover:border-border-hover">
          {/* Window chrome title bar */}
          <div className="flex items-center gap-2 border-b border-border bg-surface-raised px-3.5 py-2.5">
            <span className="size-[10px] rounded-full bg-[#ff5f57]" />
            <span className="size-[10px] rounded-full bg-[#febc2e]" />
            <span className="size-[10px] rounded-full bg-[#28c840]" />
            <span className="ml-2 text-[11px] text-fg-ghost">replay.md — Example</span>
          </div>
          <PreviewConversation
            className="flex min-h-0 flex-1 flex-col border-0 rounded-none"
            fade
          header={
            <Conversation.Header>
              <h3 className="text-[16px] font-medium text-fg">
                Refactor auth middleware for session validation
              </h3>
              <p className="mt-1 text-[13px] text-fg-muted">
                nishant · <span className="text-fg-ghost">@nishantjoshi</span>
              </p>

              <Conversation.MetaGrid>
                <Conversation.MetaItem label="Agent">
                  <div className="flex items-center gap-1">
                    <ClaudeMark className="size-3.5 text-fg-subtle" />
                    <span className="text-[12px] text-fg-muted">
                      Claude Code
                    </span>
                  </div>
                </Conversation.MetaItem>

                <Conversation.MetaItem label="Model">
                  <span className="text-[12px] text-fg-muted">
                    Opus 4.6
                  </span>
                </Conversation.MetaItem>

                <Conversation.MetaItem label="Diff">
                  <span className="font-mono text-[12px]">
                    <span className="text-diff-add">+9</span>
                    {" "}
                    <span className="text-diff-remove">-6</span>
                    {" "}
                    <span className="text-fg-ghost">lines</span>
                  </span>
                </Conversation.MetaItem>
              </Conversation.MetaGrid>
            </Conversation.Header>
          }
        >
          <Conversation.UserMessage>
            Refactor the auth middleware to use the new session validation
          </Conversation.UserMessage>

          <Conversation.AssistantMessage timestamp="2m ago">
            <Conversation.ToolRow label="Read src/lib/auth.ts" />
            <p className="text-[13px] leading-relaxed text-fg-muted">
              I&apos;ll refactor <Conversation.InlineCode>validateSession</Conversation.InlineCode> to
              use the new <Conversation.InlineCode>verifySessionToken</Conversation.InlineCode> helper.
              This extracts the bearer token, validates expiry, and optionally
              refreshes the session.
            </p>
            <Conversation.Diff lines={diffLines} filePath="src/lib/auth.ts" />
          </Conversation.AssistantMessage>

          <Conversation.UserMessage>
            Looks good, but extract the config into a separate file
          </Conversation.UserMessage>

          <div className="relative">
            <Conversation.AssistantMessage timestamp="1m ago">
              <p className="text-[13px] leading-relaxed text-fg-muted">
                I&apos;ll move the session configuration to{" "}
                <Conversation.InlineCode>src/lib/auth.config.ts</Conversation.InlineCode> and export
                the constants from there. This keeps the validation logic
                clean and makes the config easy to adjust per environment...
              </p>
            </Conversation.AssistantMessage>
          </div>
        </PreviewConversation>
        </div>
      </PageReveal>

    </div>
  );
}
