"use client";

import { useState } from "react";
import { XIcon } from "@/app/components/icons";
import { patchThread } from "@/lib/thread-mutations";

interface TagEditorProps {
  tags: string[];
  slug: string;
  isOwner: boolean;
}

export function TagEditor({ tags, slug, isOwner }: TagEditorProps) {
  const [localTags, setLocalTags] = useState(tags);
  const [inputValue, setInputValue] = useState("");

  if (!isOwner && localTags.length === 0) return null;

  async function addTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag || localTags.includes(tag)) {
      setInputValue("");
      return;
    }
    if (localTags.length >= 20) return;

    const next = [...localTags, tag];
    const prev = localTags;
    setLocalTags(next);
    setInputValue("");
    const result = await patchThread(slug, { tags: next });
    if (!result.ok) setLocalTags(prev);
  }

  async function removeTag(tag: string) {
    const next = localTags.filter((t) => t !== tag);
    const prev = localTags;
    setLocalTags(next);
    const result = await patchThread(slug, { tags: next });
    if (!result.ok) setLocalTags(prev);
  }

  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-fg-ghost">
        Tags
      </span>
      <div className="mt-1 flex flex-wrap gap-1">
        {localTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 border border-border rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] text-fg-muted"
          >
            {tag}
            {isOwner && (
              <button
                onClick={() => removeTag(tag)}
                className="text-fg-ghost transition-colors duration-150 hover:text-fg-muted"
              >
                <XIcon className="size-2.5" />
              </button>
            )}
          </span>
        ))}
      </div>
      {isOwner && (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTag(inputValue);
          }}
          maxLength={50}
          placeholder="+ add tag"
          className="mt-1.5 w-full bg-transparent border-b border-transparent text-[10px] font-mono text-fg-ghost placeholder:text-fg-faint outline-none focus:border-border-hover transition-colors duration-150"
        />
      )}
    </div>
  );
}
