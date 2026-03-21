"use client";

import { useState } from "react";
import { ClipboardMark, CheckMark } from "./icons";

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="text-fg-ghost transition-colors duration-150 hover:text-fg-muted"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <CheckMark className="size-4 text-accent" />
      ) : (
        <ClipboardMark className="size-4" />
      )}
    </button>
  );
}
