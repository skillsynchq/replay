"use client";

import { useState, useEffect } from "react";
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
    if (!username) return;

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
      // Refetch to get the real user_id
      getShares(slug).then((r) => {
        if (r.ok) setShares(r.data.shares);
      });
    } else {
      setError(result.error);
    }
  }

  async function removeUser(userId: string) {
    const prev = shares;
    setShares((s) => s.filter((u) => u.user_id !== userId));
    const result = await unshareThread(slug, userId);
    if (!result.ok) setShares(prev);
  }

  return (
    <div className="mt-2">
      <span className="text-[10px] uppercase tracking-wider text-fg-ghost">
        Shared with
      </span>

      {loading ? (
        <p className="mt-1 text-[10px] text-fg-faint">Loading...</p>
      ) : (
        <div className="mt-1 space-y-0.5">
          {shares.length === 0 && (
            <p className="text-[10px] text-fg-faint">No one yet</p>
          )}
          {shares.map((s) => (
            <div
              key={s.user_id || s.username}
              className="flex items-center justify-between py-0.5"
            >
              <span className="font-mono text-[11px] text-fg-muted">
                @{s.username}
              </span>
              <button
                onClick={() => removeUser(s.user_id)}
                className="text-fg-ghost transition-colors duration-150 hover:text-fg-muted"
              >
                <XIcon className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-1.5">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addUser();
          }}
          placeholder="username"
          className="w-full bg-transparent border border-border rounded-[4px] px-2 py-1 font-mono text-[11px] text-fg placeholder:text-fg-faint outline-none focus:border-border-hover transition-colors duration-150"
        />
        {error && (
          <p className="mt-1 text-[10px] text-accent">{error}</p>
        )}
      </div>
    </div>
  );
}
