"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { XIcon, FastForwardIcon } from "./icons";
import { authClient } from "@/lib/auth-client";

interface NavClientProps {
  user: { name: string; image: string | null; username: string | null } | null;
  minimal?: boolean;
  tracesEnabled?: boolean;
}

export function NavClient({ user, minimal, tracesEnabled }: NavClientProps) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuListRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const mobileNavListRef = useRef<HTMLDivElement>(null);
  const userMenuId = useId();
  const mobileMenuId = useId();

  useEffect(() => {
    function handleDismiss(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key === "Escape") {
        setUserMenuOpen(false);
        return;
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      const focusFrame = requestAnimationFrame(() => {
        userMenuListRef.current
          ?.querySelector<HTMLElement>('[data-menu-item="true"]')
          ?.focus();
      });
      document.addEventListener("mousedown", handleDismiss);
      document.addEventListener("keydown", handleDismiss);
      return () => {
        cancelAnimationFrame(focusFrame);
        document.removeEventListener("mousedown", handleDismiss);
        document.removeEventListener("keydown", handleDismiss);
      };
    }
  }, [userMenuOpen]);

  useEffect(() => {
    function handleDismiss(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key === "Escape") {
        setMobileNavOpen(false);
        return;
      }
      if (
        mobileNavRef.current &&
        !mobileNavRef.current.contains(e.target as Node)
      ) {
        setMobileNavOpen(false);
      }
    }
    if (mobileNavOpen) {
      const focusFrame = requestAnimationFrame(() => {
        mobileNavListRef.current
          ?.querySelector<HTMLElement>('[data-mobile-nav-item="true"]')
          ?.focus();
      });
      document.addEventListener("mousedown", handleDismiss);
      document.addEventListener("keydown", handleDismiss);
      return () => {
        cancelAnimationFrame(focusFrame);
        document.removeEventListener("mousedown", handleDismiss);
        document.removeEventListener("keydown", handleDismiss);
      };
    }
  }, [mobileNavOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 900px)");
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMobileNavOpen(false);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex h-[56px] items-center px-6 min-[900px]:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-1.5 font-mono text-[13px] tracking-tight">
          <Link
            href="/"
            className="shrink-0 flex items-center gap-1.5 text-fg transition-colors duration-150 hover:text-fg"
          >
            <FastForwardIcon className="size-[22px]" />
            replay.md
          </Link>
          {user?.username && (
            <>
              <span className="shrink-0 text-fg-ghost">/</span>
              <Link
                href={`/${user.username}`}
                className="truncate text-fg-muted transition-colors duration-150 hover:text-fg"
              >
                {user.username}
              </Link>
            </>
          )}
        </div>

        {!minimal && <div className="hidden min-[900px]:flex items-center gap-6">
          <Link
            href="/docs"
            className="text-fg-muted text-[13px] transition-colors duration-150 hover:text-fg"
          >
            Docs
          </Link>

          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-fg-muted text-[13px] transition-colors duration-150 hover:text-fg"
              >
                Dashboard
              </Link>
              {tracesEnabled && (
                <Link
                  href="/traces"
                  className="text-fg-muted text-[13px] transition-colors duration-150 hover:text-fg"
                >
                  Traces
                </Link>
              )}
              <div className="relative flex items-center" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    setUserMenuOpen((v) => !v);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  aria-controls={userMenuId}
                  className="flex cursor-pointer items-center rounded-[4px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="block size-6 rounded-[4px] border border-border object-cover transition-colors duration-150 hover:border-border-hover"
                    />
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-[4px] border border-border bg-surface text-[11px] font-medium text-fg-muted transition-colors duration-150 hover:border-border-hover">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>

                {userMenuOpen && (
                  <div
                    id={userMenuId}
                    ref={userMenuListRef}
                    role="menu"
                    aria-label="User menu"
                    className="absolute right-0 top-full mt-2 w-40 rounded-md border border-border bg-surface py-1 shadow-lg"
                  >
                    <Link
                      href="/settings"
                      role="menuitem"
                      data-menu-item="true"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-3 py-1.5 text-[13px] text-fg-muted transition-colors duration-150 hover:bg-surface-raised hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await authClient.signOut();
                        router.push("/");
                        router.refresh();
                      }}
                      role="menuitem"
                      data-menu-item="true"
                      className="block w-full cursor-pointer px-3 py-1.5 text-left text-[13px] text-fg-muted transition-colors duration-150 hover:bg-surface-raised hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
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
        </div>}

        {!minimal && <div className="relative min-[900px]:hidden" ref={mobileNavRef}>
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen(false);
              setMobileNavOpen((v) => !v);
            }}
            aria-haspopup="menu"
            aria-expanded={mobileNavOpen}
            aria-controls={mobileMenuId}
            className="inline-flex items-center justify-center rounded-[4px] border border-border bg-bg/92 p-2 text-fg-muted transition-colors duration-150 hover:border-border-hover hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileNavOpen ? (
              <XIcon className="size-3.5" />
            ) : (
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="size-3.5"
                aria-hidden="true"
              >
                <path d="M2.5 4.5h11" />
                <path d="M2.5 8h11" />
                <path d="M2.5 11.5h11" />
              </svg>
            )}
          </button>

          {mobileNavOpen && (
            <div
              id={mobileMenuId}
              ref={mobileNavListRef}
              role="menu"
              aria-label="Navigation menu"
              className="absolute right-0 mt-3 w-[min(19rem,calc(100vw-3rem))] overflow-hidden rounded-[8px] border border-border bg-bg/96 shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur-md"
            >
              {user ? (
                <div className="border-b border-border px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-fg-ghost">
                    Signed in
                  </div>
                  <div className="mt-1 text-[13px] text-fg">{user.name}</div>
                  {user.username ? (
                    <div className="font-mono text-[11px] text-fg-muted">
                      @{user.username}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="p-1">
                <Link
                  href="/docs"
                  role="menuitem"
                  data-mobile-nav-item="true"
                  onClick={() => setMobileNavOpen(false)}
                  className="block rounded-[6px] px-3 py-2 text-[13px] text-fg-muted transition-colors duration-150 hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
                >
                  Docs
                </Link>

                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      role="menuitem"
                      data-mobile-nav-item="true"
                      onClick={() => setMobileNavOpen(false)}
                      className="block rounded-[6px] px-3 py-2 text-[13px] text-fg-muted transition-colors duration-150 hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
                    >
                      Dashboard
                    </Link>
                    {tracesEnabled && (
                      <Link
                        href="/traces"
                        role="menuitem"
                        data-mobile-nav-item="true"
                        onClick={() => setMobileNavOpen(false)}
                        className="block rounded-[6px] px-3 py-2 text-[13px] text-fg-muted transition-colors duration-150 hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
                      >
                        Traces
                      </Link>
                    )}
                    <Link
                      href="/settings"
                      role="menuitem"
                      data-mobile-nav-item="true"
                      onClick={() => setMobileNavOpen(false)}
                      className="block rounded-[6px] px-3 py-2 text-[13px] text-fg-muted transition-colors duration-150 hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      data-mobile-nav-item="true"
                      onClick={async () => {
                        setMobileNavOpen(false);
                        await authClient.signOut();
                        router.push("/");
                        router.refresh();
                      }}
                      className="block w-full cursor-pointer rounded-[6px] px-3 py-2 text-left text-[13px] text-fg-muted transition-colors duration-150 hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    role="menuitem"
                    data-mobile-nav-item="true"
                    onClick={() => setMobileNavOpen(false)}
                    className="block rounded-[6px] px-3 py-2 text-[13px] text-fg-muted transition-colors duration-150 hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>}
      </div>
    </nav>
  );
}
