import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <div className="divide-y divide-border">
          {/* User message */}
          <div className="py-4">
            <div className="flex gap-2">
              <span className="select-none font-mono text-[13px] text-fg-ghost">
                {">"}
              </span>
              <p className="text-[13px] font-medium text-fg whitespace-pre-wrap">
                show me what&apos;s at this URL
              </p>
            </div>
          </div>

          {/* Assistant thinking */}
          <div className="py-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-[4px] w-fit">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-fg-ghost"
              >
                <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.4V19a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1.6c2.9-1.1 5-4 5-7.4a8 8 0 0 0-8-8z" />
                <line x1="9" y1="22" x2="15" y2="22" />
              </svg>
              <span className="font-mono text-[11px] text-fg-faint">
                looked everywhere, checked twice...
              </span>
            </div>
          </div>

          {/* Assistant response */}
          <div className="py-4">
            <div className="flex items-start justify-between gap-4">
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
              <span className="shrink-0 font-mono text-[11px] text-fg-faint">
                404
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
