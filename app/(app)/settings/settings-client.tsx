"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageReveal } from "@/app/components/page-reveal";
import { CheckMark } from "@/app/components/icons";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  username: string | null;
}

export function SettingsClient({
  initialUser,
  welcome = false,
}: {
  initialUser: UserProfile;
  welcome?: boolean;
}) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [username, setUsername] = useState(initialUser.username ?? "");
  const [available, setAvailable] = useState<boolean | null>(
    initialUser.username ? true : null
  );
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUser(initialUser);
    setUsername(initialUser.username ?? "");
    setAvailable(initialUser.username ? true : null);
  }, [initialUser]);

  const checkAvailability = useCallback(
    async (value: string) => {
      if (value.length < 3) {
        setAvailable(null);
        return;
      }
      if (
        user.username &&
        value.toLowerCase() === user.username.toLowerCase()
      ) {
        setAvailable(true);
        return;
      }
      setChecking(true);
      try {
        const response = await fetch(
          `/api/username/available?username=${encodeURIComponent(value)}`
        );
        const data = (await response.json()) as { available: boolean };
        setAvailable(data.available);
      } finally {
        setChecking(false);
      }
    },
    [user.username]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (username.length >= 3) {
        void checkAvailability(username);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [checkAvailability, username]);

  async function handleSave() {
    if (!available || username.length < 3) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Unable to save username.");
        return;
      }

      const nextUsername = username.toLowerCase();
      setUser((prev) => ({ ...prev, username: nextUsername }));
      setUsername(nextUsername);
      setAvailable(true);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const availabilityMessage = checking
    ? "Checking username availability…"
    : available === true && username.length >= 3
      ? "Username available."
      : available === false
        ? "Username taken."
        : error ?? "";

  return (
    <div className="mx-auto max-w-xl">
      <PageReveal>
        <h1 className="text-balance text-[21px] font-medium text-fg">
          Settings
        </h1>
        <p className="mt-1 text-[13px] text-fg-muted">
          Manage your profile and username.
        </p>
      </PageReveal>

      <PageReveal delay={80}>
        <div className="mt-10 space-y-6">
          <div className="border-b border-border pb-6">
            <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
              Profile
            </p>
            <div className="mt-4 flex items-center gap-4">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={`${user.name} avatar`}
                  width={40}
                  height={40}
                  className="rounded-[4px] border border-border"
                />
              ) : null}
              <div>
                <p className="text-[14px] font-medium text-fg">{user.name}</p>
                <p className="text-[13px] text-fg-ghost">{user.email}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
              Username
            </p>

            {user.username ? (
              <div className="mt-2">
                <p className="text-[13px] text-fg-muted">
                  Your profile URL is{" "}
                  <Link
                    href={`/${user.username}`}
                    className="font-mono text-accent transition-colors duration-150 hover:text-accent-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                  >
                    replay.md/{user.username}
                  </Link>
                </p>
              </div>
            ) : (
              <>
                {!welcome && (
                  <p className="mt-2 text-[13px] text-fg-muted">
                    Claim your profile URL at{" "}
                    <span className="font-mono text-fg-subtle">
                      replay.md/{username || "you"}
                    </span>
                  </p>
                )}

                <div className="mt-4 flex items-center gap-3">
                  <div className="relative flex-1">
                    <label className="sr-only" htmlFor="settings-username">
                      Username
                    </label>
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-fg-ghost">
                      @
                    </span>
                    <input
                      id="settings-username"
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setAvailable(null);
                        setSaved(false);
                        setError(null);
                      }}
                      placeholder="username"
                      autoFocus={welcome}
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full rounded-[4px] border border-border-hover bg-surface-raised px-3 py-2 pl-8 font-mono text-[13px] text-fg placeholder:text-fg-subtle focus-visible:border-fg-subtle focus-visible:outline-none"
                    />
                    {username.length >= 3 && !checking && available !== null ? (
                      <span
                        className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] ${
                          available ? "text-diff-add" : "text-diff-remove"
                        }`}
                      >
                        {available ? "available" : "taken"}
                      </span>
                    ) : null}
                    {checking ? (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-fg-ghost">
                        checking…
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!available || saving || username.length < 3}
                    className="flex items-center gap-1.5 rounded-[4px] border border-border px-4 py-2 text-[13px] text-fg transition-colors duration-150 hover:border-border-hover disabled:cursor-not-allowed disabled:text-fg-faint focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                  >
                    {saved ? (
                      <>
                        <CheckMark className="size-3.5 text-diff-add" />
                        Saved
                      </>
                    ) : saving ? (
                      "Saving…"
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>

                <p className="sr-only" aria-live="polite">
                  {availabilityMessage}
                </p>
                {error ? (
                  <p className="mt-2 text-[12px] text-diff-remove">{error}</p>
                ) : null}

                {welcome && (
                  <div className="mt-4 animate-reveal">
                    <div className="ml-6 flex">
                      <span className="border-x-[6px] border-b-[6px] border-x-transparent border-b-border" />
                    </div>
                    <div className="-mt-px rounded-[4px] border border-border px-5 py-4">
                      <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
                        Welcome to Replay
                      </p>
                      <p className="mt-2 text-[13px] text-fg-muted">
                        Your threads will live at{" "}
                        <span className="font-mono text-fg-subtle">
                          replay.md/{username || "you"}
                        </span>
                        . Pick your username before someone else does.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </PageReveal>
    </div>
  );
}
