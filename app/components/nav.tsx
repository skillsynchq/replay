import Link from "next/link";
import { GitHubMark } from "./icons";

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="font-mono text-fg text-[13px] tracking-tight">
          replay.md
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/docs"
            className="text-fg-muted text-[13px] transition-colors duration-150 hover:text-fg"
          >
            Docs
          </Link>
          <a
            href="https://github.com/nicholasgriffintn/replay-cli"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-fg-muted text-[13px] transition-colors duration-150 hover:text-fg"
          >
            <GitHubMark className="size-4" />
            GitHub
          </a>
          <Link
            href="/sign-in"
            className="text-fg-muted text-[13px] transition-colors duration-150 hover:text-fg"
          >
            Sign in
          </Link>
        </div>
      </div>
    </nav>
  );
}
