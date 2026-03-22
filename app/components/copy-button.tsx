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
    <>
      <button
        type="button"
        onClick={handleCopy}
        className="text-fg-ghost transition-colors duration-150 hover:text-fg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <CheckMark className="size-4 text-accent" />
        ) : (
          <ClipboardMark className="size-4" />
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard." : ""}
      </span>
    </>
  );
}
