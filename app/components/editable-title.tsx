"use client";

import { useState, useRef, useEffect } from "react";
import { PencilIcon } from "@/app/components/icons";
import { patchThread } from "@/lib/thread-mutations";

interface EditableTitleProps {
  title: string | null;
  slug: string;
  isOwner: boolean;
}

export function EditableTitle({ title, slug, isOwner }: EditableTitleProps) {
  const [localTitle, setLocalTitle] = useState(title);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  async function save(value: string) {
    const trimmed = value.trim();
    const newTitle = trimmed || null;
    if (newTitle === localTitle) {
      setIsEditing(false);
      return;
    }
    const prev = localTitle;
    setLocalTitle(newTitle);
    setIsEditing(false);
    const result = await patchThread(slug, { title: newTitle ?? "" });
    if (!result.ok) setLocalTitle(prev);
  }

  if (!isOwner) {
    return (
      <h1 className="text-[clamp(21px,3vw,34px)] font-medium leading-tight text-fg">
        {localTitle ?? "Untitled thread"}
      </h1>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        defaultValue={localTitle ?? ""}
        maxLength={200}
        aria-label="Thread title"
        className="w-full border-b border-border-hover bg-transparent text-center text-[clamp(21px,3vw,34px)] font-medium leading-tight text-fg placeholder:text-fg-faint focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        placeholder="Untitled thread…"
        onBlur={(e) => save(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save(e.currentTarget.value);
          if (e.key === "Escape") setIsEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="group inline-flex items-center gap-2 rounded-[4px] text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <h1 className="text-[clamp(21px,3vw,34px)] font-medium leading-tight text-fg">
        {localTitle ?? "Untitled thread"}
      </h1>
      <PencilIcon className="size-3.5 text-fg-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
    </button>
  );
}
