"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarIcon } from "./icons";
import { toggleStar } from "@/lib/thread-mutations";
import posthog from "posthog-js";

interface StarButtonProps {
  slug: string;
  initialStarred: boolean;
  initialStarCount: number;
  isAuthenticated: boolean;
}

export function StarButton({
  slug,
  initialStarred,
  initialStarCount,
  isAuthenticated,
}: StarButtonProps) {
  const [starred, setStarred] = useState(initialStarred);
  const [starCount, setStarCount] = useState(initialStarCount);
  const router = useRouter();

  async function handleToggle() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const prevStarred = starred;
    const prevCount = starCount;

    const willStar = !starred;
    setStarred(willStar);
    setStarCount(starred ? starCount - 1 : starCount + 1);

    const result = await toggleStar(slug);
    if (!result.ok) {
      setStarred(prevStarred);
      setStarCount(prevCount);
    } else {
      posthog.capture(willStar ? "thread_starred" : "thread_unstarred", { thread_slug: slug });
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`flex items-center gap-1 rounded-[4px] px-1.5 py-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
        starred
          ? "text-accent hover:text-accent-hover"
          : "text-fg-ghost hover:text-fg-muted"
      }`}
      aria-label={starred ? "Unstar this thread" : "Star this thread"}
      aria-pressed={starred}
    >
      <StarIcon className="size-3.5" filled={starred} />
      {starCount > 0 && (
        <span className="translate-y-[0.5px] font-mono text-[11px]">{starCount}</span>
      )}
    </button>
  );
}
