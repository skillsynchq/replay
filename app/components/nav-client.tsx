import Link from "next/link";
import { GitHubMark } from "./icons";

interface NavClientProps {
  user: { name: string; image: string | null } | null;
}

export function NavClient({ user }: NavClientProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link
          href="/"
          className="font-mono text-fg text-[13px] tracking-tight"
        >
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

          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-fg-muted text-[13px] transition-colors duration-150 hover:text-fg"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="text-fg-muted text-[13px] transition-colors duration-150 hover:text-fg"
              >
                Settings
              </Link>
              {user.image ? (
                <Link href="/settings">
                  <img
                    src={user.image}
                    alt={user.name}
                    className="size-6 rounded-[4px] border border-border transition-colors duration-150 hover:border-border-hover"
                  />
                </Link>
              ) : (
                <Link
                  href="/settings"
                  className="flex size-6 items-center justify-center border border-border bg-surface text-[11px] font-medium text-fg-muted rounded-[4px] transition-colors duration-150 hover:border-border-hover"
                >
                  {user.name.charAt(0).toUpperCase()}
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="text-fg-muted text-[13px] transition-colors duration-150 hover:text-fg"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
