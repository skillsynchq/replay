"use client";

import { useState, useEffect, useRef } from "react";
import { XIcon } from "@/app/components/icons";
import { getShares, shareThread, unshareThread } from "@/lib/thread-mutations";

interface Share {
  user_id: string;
  username: string;
  name: string;
}

interface SharedUsersProps {
  slug: string;
}

export function SharedUsers({ slug }: SharedUsersProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getShares(slug).then((result) => {
      if (result.ok) setShares(result.data.shares);
      setLoading(false);
    });
  }, [slug]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(t);
  }, [error]);

  async function addUser() {
    const username = inputValue.trim();
    if (!username || adding) return;

    setAdding(true);
    const result = await shareThread(slug, username);
    if (result.ok) {
      setShares((prev) => [
        ...prev,
        {
          user_id: "",
          username: result.data.shared_with.username,
          name: result.data.shared_with.name,
        },
      ]);
      setInputValue("");
      setError(null);
      getShares(slug).then((r) => {
        if (r.ok) setShares(r.data.shares);
      });
    } else {
      setError(result.error);
    }
    setAdding(false);
  }

  async function removeUser(userId: string) {
    const prev = shares;
    setShares((s) => s.filter((u) => u.user_id !== userId));
    const result = await unshareThread(slug, userId);
    if (!result.ok) setShares(prev);
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-fg-ghost">
          Shared with
        </span>
        {shares.length > 0 && (
          <span className="font-mono text-[10px] text-fg-faint">
            {shares.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-2 h-3 w-16 bg-surface-raised rounded-[2px] animate-pulse" />
      ) : (
        <>
          {shares.length > 0 && (
            <div className="mt-1.5 space-y-px">
              {shares.map((s) => (
                <div
                  key={s.user_id || s.username}
                  className="group flex items-center justify-between rounded-[2px] py-1 -mx-1 px-1 transition-colors duration-150 hover:bg-surface"
                >
                  <span className="font-mono text-[11px] text-fg-muted truncate">
                    @{s.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeUser(s.user_id)}
                    className="text-fg-ghost opacity-0 transition-opacity duration-150 hover:text-fg-muted group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                    aria-label={`Remove @${s.username}`}
                  >
                    <XIcon className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-1.5 relative">
            <label className="sr-only" htmlFor={`shared-users-${slug}`}>
              Share this thread with a username
            </label>
            <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-fg-faint">
              @
            </span>
            <input
              id={`shared-users-${slug}`}
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addUser();
              }}
              placeholder={shares.length === 0 ? "add username…" : "add another…"}
              disabled={adding}
              autoComplete="off"
              spellCheck={false}
              className="w-full border-b border-border bg-transparent pl-5 pr-1 py-1 font-mono text-[11px] text-fg placeholder:text-fg-faint focus-visible:border-fg-faint focus-visible:outline-none disabled:opacity-50"
            />
          </div>

          <p className="sr-only" aria-live="polite">
            {adding ? "Sharing thread…" : error ?? ""}
          </p>
          {error && (
            <p className="mt-1 text-[10px] text-diff-remove">{error}</p>
          )}
        </>
      )}
    </div>
  );
}
