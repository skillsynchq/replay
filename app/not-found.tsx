import Link from "next/link";
import { BrainIcon } from "./components/icons";
import { Conversation, PreviewConversation } from "./components/conversation";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <PreviewConversation className="border-none hover:border-border">
          <Conversation.UserMessage>
            show me what&apos;s at this URL
          </Conversation.UserMessage>

          <Conversation.AssistantMessage>
            <Conversation.ToolRow
              icon={<BrainIcon className="size-3 text-fg-ghost" />}
              label="looked everywhere, checked twice…"
              className="mb-0 w-fit rounded-[4px] bg-surface px-3 py-1.5"
            />
          </Conversation.AssistantMessage>

          <Conversation.AssistantMessage timestamp="404">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[13px] leading-relaxed text-fg">
                  Nothing here. This page doesn&apos;t exist — it may have been
                  moved, deleted, or the URL might be wrong.
                </p>
                <p className="text-[13px] leading-relaxed text-fg-muted">
                  Here&apos;s what I can suggest:
                </p>
                <ul className="ml-4 list-disc space-y-0.5 text-[13px] text-fg marker:text-fg-faint">
                  <li className="leading-relaxed text-fg">
                    <Link
                      href="/"
                      className="text-accent transition-colors duration-150 hover:text-accent-hover"
                    >
                      Go home
                    </Link>
                  </li>
                  <li className="leading-relaxed text-fg">
                    <Link
                      href="/dashboard"
                      className="text-accent transition-colors duration-150 hover:text-accent-hover"
                    >
                      View your conversations
                    </Link>
                  </li>
                  <li className="leading-relaxed text-fg">
                    <Link
                      href="/docs"
                      className="text-accent transition-colors duration-150 hover:text-accent-hover"
                    >
                      Read the docs
                    </Link>
                  </li>
                </ul>
              </div>
          </Conversation.AssistantMessage>
        </PreviewConversation>
      </div>
    </div>
  );
}
