"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "./icons";

interface Segment {
  kind: "text" | "xml";
  value: string;
  tag?: string;
  inner?: string;
}

/**
 * Scan-based parser. Finds `<tag...>`, then does a simple indexOf for `</tag>`.
 * No regex over content — handles arbitrarily large inner text without backtracking.
 */
function parseXmlSegments(input: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  // Matches an opening tag — tag name can include spaces, hyphens, dots, underscores, colons
  // e.g. <permissions instructions>, <local-command-caveat>, <environment_context>
  const openTagRe = /<([a-zA-Z_][\w.:_ -]*[\w])\s*(\/?)>/g;

  let m: RegExpExecArray | null;
  while ((m = openTagRe.exec(input)) !== null) {
    const tagStart = m.index;
    const tagName = m[1];
    const selfClosing = m[2] === "/";
    const openTagEnd = tagStart + m[0].length;

    let blockEnd: number;
    let inner = "";

    if (selfClosing) {
      blockEnd = openTagEnd;
    } else {
      // Look ahead for the closing tag — simple string search, no regex on content
      const closer = `</${tagName}>`;
      const closeIdx = input.indexOf(closer, openTagEnd);
      if (closeIdx === -1) {
        // No closing tag found — not a block, skip
        continue;
      }
      inner = input.slice(openTagEnd, closeIdx);
      blockEnd = closeIdx + closer.length;
    }

    // Push preceding plain text
    if (tagStart > cursor) {
      const text = input.slice(cursor, tagStart);
      if (text.trim()) {
        segments.push({ kind: "text", value: text });
      }
    }

    segments.push({
      kind: "xml",
      value: input.slice(tagStart, blockEnd),
      tag: tagName,
      inner: inner.trim(),
    });

    cursor = blockEnd;
    // Reset regex to continue after this block
    openTagRe.lastIndex = blockEnd;
  }

  // Trailing text
  if (cursor < input.length) {
    const text = input.slice(cursor);
    if (text.trim()) {
      segments.push({ kind: "text", value: text });
    }
  }

  return segments;
}

function XmlBlock({ tag, inner }: { tag: string; inner: string }) {
  const [open, setOpen] = useState(false);

  const firstLine = inner.split("\n")[0] || "";
  const preview = firstLine.length > 60 ? firstLine.slice(0, 60) + "…" : firstLine;

  return (
    <span className="block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-left group"
      >
        <ChevronRight
          className={`size-2.5 text-fg-ghost/60 transition-transform duration-100 ${open ? "rotate-90" : ""}`}
        />
        <span className="font-mono text-[11px] text-fg-faint/80">
          {tag}
        </span>
        {!open && preview && (
          <span className="font-mono text-[11px] text-fg-ghost/30 truncate max-w-[250px]">
            — {preview}
          </span>
        )}
      </button>
      {open && (
        <pre className="ml-3.5 mt-0.5 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-fg-faint">
          {inner}
        </pre>
      )}
    </span>
  );
}

export function ParsedUserContent({ text }: { text: string }): ReactNode {
  const segments = parseXmlSegments(text);

  if (segments.length <= 1 && segments[0]?.kind === "text") {
    return text;
  }
  if (segments.length === 0) {
    return text;
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.kind === "text" ? (
          <span key={i} className="whitespace-pre-wrap">{seg.value}</span>
        ) : (
          <XmlBlock key={i} tag={seg.tag!} inner={seg.inner!} />
        )
      )}
    </>
  );
}
