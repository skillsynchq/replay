"use client";

import { useState } from "react";
import { VisibilityBadge } from "@/app/components/visibility-badge";
import { ChevronDown, ChevronRight } from "@/app/components/icons";
import { SharedUsers } from "@/app/components/shared-users";
import { patchThread } from "@/lib/thread-mutations";

const options = [
  { value: "private", label: "Private", desc: "Only you" },
  { value: "shared", label: "Shared", desc: "Invited users" },
  { value: "unlisted", label: "Unlisted", desc: "Anyone with link" },
  { value: "public", label: "Public", desc: "Visible on profile" },
] as const;

interface VisibilitySelectorProps {
  visibility: string;
  slug: string;
  isOwner: boolean;
}

export function VisibilitySelector({
  visibility,
  slug,
  isOwner,
}: VisibilitySelectorProps) {
  const [localVisibility, setLocalVisibility] = useState(visibility);
  const [expanded, setExpanded] = useState(false);

  if (!isOwner) {
    return <VisibilityBadge visibility={localVisibility} />;
  }

  async function select(value: string) {
    if (value === localVisibility) {
      setExpanded(false);
      return;
    }
    const prev = localVisibility;
    setLocalVisibility(value);
    setExpanded(false);
    const result = await patchThread(slug, { visibility: value });
    if (!result.ok) setLocalVisibility(prev);
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 cursor-pointer"
      >
        <VisibilityBadge visibility={localVisibility} />
        {expanded ? (
          <ChevronDown className="size-3 text-fg-faint" />
        ) : (
          <ChevronRight className="size-3 text-fg-faint" />
        )}
      </button>

      {expanded && (
        <div className="mt-1.5 border border-border rounded-[4px] overflow-hidden bg-surface">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => select(opt.value)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-150 hover:bg-surface-raised"
            >
              <span
                className={`size-2 shrink-0 rounded-full border ${
                  localVisibility === opt.value
                    ? "border-accent bg-accent"
                    : "border-fg-faint"
                }`}
              />
              <div>
                <span className="text-[11px] text-fg-muted">{opt.label}</span>
                <span className="ml-1.5 text-[10px] text-fg-ghost">
                  {opt.desc}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {localVisibility === "shared" && <SharedUsers slug={slug} />}
    </div>
  );
}
