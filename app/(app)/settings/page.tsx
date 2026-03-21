"use client";

import { useEffect, useState, useCallback } from "react";
import { PageReveal } from "@/app/components/page-reveal";
import { CheckMark } from "@/app/components/icons";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  username: string | null;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json() as Promise<{ user: UserProfile }>)
      .then((d) => {
        setUser(d.user);
        if (d.user.username) setUsername(d.user.username);
      });
  }, []);

  const checkAvailability = useCallback(
    async (value: string) => {
      if (value.length < 3) {
        setAvailable(null);
        return;
      }
      if (user?.username && value.toLowerCase() === user.username.toLowerCase()) {
        setAvailable(true);
        return;
      }
      setChecking(true);
      try {
        const r = await fetch(
          `/api/username/available?username=${encodeURIComponent(value)}`
        );
        const d = (await r.json()) as { available: boolean };
        setAvailable(d.available);
      } finally {
        setChecking(false);
      }
    },
    [user]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.length >= 3) {
        checkAvailability(username);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [username, checkAvailability]);

  async function handleSave() {
    if (!available || username.length < 3) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (r.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        // Refresh user data
        const d = (await (
          await fetch("/api/users/me")
        ).json()) as { user: UserProfile };
        setUser(d.user);
      } else {
        const d = (await r.json()) as { error: string };
        setError(d.error);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl">
        <p className="text-[13px] text-fg-ghost">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageReveal>
        <h1 className="text-[21px] font-medium text-fg">Settings</h1>
        <p className="mt-1 text-[13px] text-fg-muted">
          Manage your profile and username.
        </p>
      </PageReveal>

      <PageReveal delay={80}>
        {/* Profile info */}
        <div className="mt-10 space-y-6">
          <div className="border-b border-border pb-6">
            <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
              Profile
            </p>
            <div className="mt-4 flex items-center gap-4">
              {user.image && (
                <img
                  src={user.image}
                  alt=""
                  className="size-10 rounded-[4px] border border-border"
                />
              )}
              <div>
                <p className="text-[14px] font-medium text-fg">{user.name}</p>
                <p className="text-[13px] text-fg-ghost">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Username */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
              Username
            </p>

            {user.username ? (
              <div className="mt-2">
                <p className="text-[13px] text-fg-muted">
                  Your profile URL is{" "}
                  <a
                    href={`/${user.username}`}
                    className="font-mono text-accent transition-colors duration-150 hover:text-accent-hover"
                  >
                    replay.md/{user.username}
                  </a>
                </p>
              </div>
            ) : (
              <>
                <p className="mt-2 text-[13px] text-fg-muted">
                  Claim your profile URL at{" "}
                  <span className="font-mono text-fg-subtle">
                    replay.md/{username || "you"}
                  </span>
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-fg-ghost">
                      @
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setAvailable(null);
                        setSaved(false);
                        setError(null);
                      }}
                      placeholder="username"
                      className="w-full border border-border bg-surface px-3 py-2 pl-8 font-mono text-[13px] text-fg placeholder:text-fg-faint focus:border-border-hover focus:outline-none rounded-[4px]"
                    />
                    {/* Availability indicator */}
                    {username.length >= 3 && !checking && available !== null && (
                      <span
                        className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] ${
                          available ? "text-diff-add" : "text-diff-remove"
                        }`}
                      >
                        {available ? "available" : "taken"}
                      </span>
                    )}
                    {checking && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-fg-ghost">
                        checking...
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={!available || saving || username.length < 3}
                    className="flex items-center gap-1.5 border border-border px-4 py-2 text-[13px] text-fg transition-colors duration-150 hover:border-border-hover disabled:text-fg-faint disabled:cursor-not-allowed rounded-[4px]"
                  >
                    {saved ? (
                      <>
                        <CheckMark className="size-3.5 text-diff-add" />
                        Saved
                      </>
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>

                {error && (
                  <p className="mt-2 text-[12px] text-diff-remove">{error}</p>
                )}
              </>
            )}
          </div>
        </div>
      </PageReveal>
    </div>
  );
}
