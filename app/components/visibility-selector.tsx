"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!expanded) return;

    const focusFrame = requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLElement>('[data-visibility-option="true"]')
        ?.focus({ preventScroll: true });
    });

    function dismiss(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setExpanded(false);
        return;
      }
      if (
        event instanceof MouseEvent &&
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setExpanded(false);
      }
    }

    document.addEventListener("mousedown", dismiss);
    document.addEventListener("keydown", dismiss);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, [expanded]);

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
    <div ref={rootRef}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-haspopup="menu"
        aria-expanded={expanded}
        aria-controls={menuId}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <VisibilityBadge visibility={localVisibility} />
        {expanded ? (
          <ChevronDown className="size-3 text-fg-faint" />
        ) : (
          <ChevronRight className="size-3 text-fg-faint" />
        )}
      </button>

      {expanded && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label="Thread visibility"
          className="mt-2 overflow-hidden rounded-[4px] border border-border"
        >
          {options.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => select(opt.value)}
              role="menuitemradio"
              aria-checked={localVisibility === opt.value}
              data-visibility-option="true"
              className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors duration-150 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset ${
                localVisibility === opt.value ? "bg-surface" : ""
              }`}
            >
              <span
                className={`size-1.5 shrink-0 rounded-full ${
                  localVisibility === opt.value
                    ? "bg-accent"
                    : "bg-fg-faint"
                }`}
              />
              <span className="text-[11px] text-fg-muted">{opt.label}</span>
              <span className="text-[10px] text-fg-ghost">{opt.desc}</span>
            </button>
          ))}
        </div>
      )}

      {localVisibility === "shared" && <SharedUsers slug={slug} />}
    </div>
  );
}
