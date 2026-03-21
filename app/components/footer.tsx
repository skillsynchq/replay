import Link from "next/link";
import { GitHubMark, ArrowUp } from "./icons";

export function Footer() {
  return (
    <footer className="mt-auto px-6 pt-20 pb-8">
      <div className="mx-auto max-w-4xl">
        <div className="border-t border-border pt-10">
          <div className="flex flex-col justify-between gap-10 md:flex-row">
            {/* Left */}
            <div>
              <span className="font-mono text-[13px] text-fg">
                replay.md
              </span>
              <p className="mt-1 text-[13px] text-fg-ghost">
                Share your agent sessions.
              </p>
            </div>

            {/* Right — link groups */}
            <div className="flex gap-16">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-fg-ghost">
                  Product
                </p>
                <ul className="mt-3 space-y-2">
                  <li>
                    <Link
                      href="/docs"
                      className="text-[13px] text-fg-muted transition-colors duration-150 hover:text-fg"
                    >
                      Docs
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/#install"
                      className="text-[13px] text-fg-muted transition-colors duration-150 hover:text-fg"
                    >
                      Install
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-fg-ghost">
                  Community
                </p>
                <ul className="mt-3 space-y-2">
                  <li>
                    <a
                      href="https://github.com/nicholasgriffintn/replay-cli"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted transition-colors duration-150 hover:text-fg"
                    >
                      <GitHubMark className="size-3.5" />
                      GitHub
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-fg-ghost">
                  Legal
                </p>
                <ul className="mt-3 space-y-2">
                  <li>
                    <Link
                      href="/privacy"
                      className="text-[13px] text-fg-muted transition-colors duration-150 hover:text-fg"
                    >
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/terms"
                      className="text-[13px] text-fg-muted transition-colors duration-150 hover:text-fg"
                    >
                      Terms
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex items-center justify-between">
            <p className="text-[11px] text-fg-ghost">© 2026 replay.md</p>
            <a
              href="#top"
              className="text-fg-ghost transition-colors duration-150 hover:text-fg-muted"
              aria-label="Back to top"
            >
              <ArrowUp className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
