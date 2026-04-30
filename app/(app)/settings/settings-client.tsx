"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageReveal } from "@/app/components/page-reveal";
import { CheckMark, GitHubMark } from "@/app/components/icons";
import { authClient } from "@/lib/auth-client";
import posthog from "posthog-js";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  username: string | null;
}

interface LinkedAccount {
  providerId: string;
  accountId: string;
}

type ProviderId = "github" | "google";

const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: "github", label: "GitHub" },
  { id: "google", label: "Google" },
];

function ProviderIcon({ id }: { id: ProviderId }) {
  if (id === "github") return <GitHubMark className="size-4 text-fg" />;
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function SettingsClient({
  initialUser,
  initialAccounts,
  welcome = false,
}: {
  initialUser: UserProfile;
  initialAccounts: LinkedAccount[];
  welcome?: boolean;
}) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [accounts, setAccounts] = useState<LinkedAccount[]>(initialAccounts);
  const [username, setUsername] = useState(initialUser.username ?? "");
  const [available, setAvailable] = useState<boolean | null>(
    initialUser.username ? true : null
  );
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workingProvider, setWorkingProvider] = useState<ProviderId | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    setUser(initialUser);
    setUsername(initialUser.username ?? "");
    setAvailable(initialUser.username ? true : null);
  }, [initialUser]);

  useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);

  async function handleConnect(provider: ProviderId) {
    setWorkingProvider(provider);
    setAccountError(null);
    try {
      await authClient.linkSocial({
        provider,
        callbackURL: "/settings",
      });
    } catch {
      setAccountError("Could not start the connect flow. Please try again.");
      setWorkingProvider(null);
    }
  }

  async function handleDisconnect(provider: ProviderId, accountId: string) {
    if (accounts.length <= 1) return;
    setWorkingProvider(provider);
    setAccountError(null);
    try {
      const result = await authClient.unlinkAccount({
        providerId: provider,
        accountId,
      });
      if (result.error) {
        setAccountError(result.error.message ?? "Could not disconnect this account.");
        return;
      }
      setAccounts((prev) =>
        prev.filter((a) => !(a.providerId === provider && a.accountId === accountId))
      );
      router.refresh();
    } catch {
      setAccountError("Could not disconnect this account.");
    } finally {
      setWorkingProvider(null);
    }
  }

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
      const isFirstTime = !user.username;
      posthog.capture("username_saved", { username: nextUsername, is_first_time: isFirstTime });
      posthog.identify(nextUsername, { username: nextUsername });
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

          <div className="border-b border-border pb-6">
            <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
              Connected accounts
            </p>
            <p className="mt-2 text-[13px] text-fg-muted">
              Sign in with any of your linked providers. You need at least one.
            </p>
            <div className="mt-4 space-y-2">
              {PROVIDERS.map((p) => {
                const linked = accounts.find((a) => a.providerId === p.id);
                const isOnly = !!linked && accounts.length === 1;
                const busy = workingProvider === p.id;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-[4px] border border-border bg-surface-raised px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <ProviderIcon id={p.id} />
                      <div>
                        <p className="text-[13px] text-fg">{p.label}</p>
                        <p className="text-[11px] text-fg-ghost">
                          {linked ? "Connected" : "Not connected"}
                        </p>
                      </div>
                    </div>
                    {linked ? (
                      <button
                        type="button"
                        onClick={() => handleDisconnect(p.id, linked.accountId)}
                        disabled={isOnly || workingProvider !== null}
                        title={
                          isOnly
                            ? "Add another provider before disconnecting this one."
                            : undefined
                        }
                        className="rounded-[4px] border border-border px-3 py-1.5 text-[12px] text-fg-muted transition-colors duration-150 hover:border-border-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                      >
                        {busy ? "Disconnecting…" : "Disconnect"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConnect(p.id)}
                        disabled={workingProvider !== null}
                        className="rounded-[4px] border border-border px-3 py-1.5 text-[12px] text-fg transition-colors duration-150 hover:border-border-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                      >
                        {busy ? "Redirecting…" : "Connect"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {accountError ? (
              <p className="mt-3 text-[12px] text-diff-remove">{accountError}</p>
            ) : null}
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
