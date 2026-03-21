"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { GitHubMark } from "./icons";
import { authClient } from "@/lib/auth-client";

interface NavClientProps {
  user: { name: string; image: string | null; username: string | null } | null;
}

export function NavClient({ user }: NavClientProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[13px] tracking-tight">
          <Link href="/" className="text-fg transition-colors duration-150 hover:text-fg">
            replay.md
          </Link>
          {user?.username && (
            <>
              <span className="text-fg-ghost">/</span>
              <Link
                href={`/${user.username}`}
                className="text-fg-muted transition-colors duration-150 hover:text-fg"
              >
                {user.username}
              </Link>
            </>
          )}
        </div>
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
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="cursor-pointer"
              >
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="size-6 rounded-[4px] border border-border transition-colors duration-150 hover:border-border-hover"
                  />
                ) : (
                  <span className="flex size-6 items-center justify-center border border-border bg-surface text-[11px] font-medium text-fg-muted rounded-[4px] transition-colors duration-150 hover:border-border-hover">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-md border border-border bg-surface py-1 shadow-lg">
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-1.5 text-[13px] text-fg-muted transition-colors duration-150 hover:text-fg hover:bg-surface-raised"
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await authClient.signOut();
                      window.location.href = "/";
                    }}
                    className="block w-full text-left px-3 py-1.5 text-[13px] text-fg-muted transition-colors duration-150 hover:text-fg hover:bg-surface-raised cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
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
