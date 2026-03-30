"use client";

import { useState } from "react";
import {
  FileMark,
  ChevronRight,
  ChevronDown,
  TerminalIcon,
  BrainIcon,
  SearchIcon,
} from "./icons";
import { Markdown } from "./markdown";

// --- Types ---

interface TextBlock {
  type: "text";
  text: string;
}

interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }>;
  is_error?: boolean;
}

interface ImageBlock {
  type: "image";
  source: { type: string; media_type: string; data: string };
}

type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock | ImageBlock;
type HighlightMode = "text" | "block" | "none";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// --- Helpers ---

function shortPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 3) return path;
  return parts.slice(-3).join("/");
}

function toolSummary(block: ToolUseBlock): string {
  const input = block.input;
  switch (block.name) {
    case "Read":
      return shortPath(input.file_path as string);
    case "Edit":
      return shortPath(input.file_path as string);
    case "Write":
      return shortPath(input.file_path as string);
    case "Bash": {
      const cmd = input.command as string;
      return cmd.length > 80 ? cmd.slice(0, 80) + "…" : cmd;
    }
    case "Glob":
      return input.pattern as string;
    case "Grep":
      return `${input.pattern as string}${input.path ? ` in ${shortPath(input.path as string)}` : ""}`;
    case "Agent":
      return ((input.description as string) ?? "").slice(0, 60);
    default:
      return block.name;
  }
}

function toolIcon(name: string) {
  switch (name) {
    case "Read":
    case "Edit":
    case "Write":
      return <FileMark className="size-3 shrink-0 text-fg-faint" />;
    case "Bash":
      return <TerminalIcon className="size-3 shrink-0 text-fg-faint" />;
    case "Glob":
    case "Grep":
      return <SearchIcon className="size-3 shrink-0 text-fg-faint" />;
    default:
      return <FileMark className="size-3 shrink-0 text-fg-faint" />;
  }
}

function ExpandIcon({ open }: { open: boolean }) {
  return open ? (
    <ChevronDown className="size-3 shrink-0 text-fg-faint" />
  ) : (
    <ChevronRight className="size-3 shrink-0 text-fg-faint" />
  );
}

function tryFormatJson(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return null;
  }
}

// --- Main renderer ---

export function ContentBlockRenderer({
  blocks,
  toolResults,
  highlightMode = "none",
}: {
  blocks: ContentBlock[];
  toolResults?: Map<string, string>;
  highlightMode?: HighlightMode;
}) {
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "text":
            return (
              <TextBlockView
                key={i}
                block={block}
                highlighted={highlightMode === "text"}
              />
            );
          case "thinking":
            return (
              <ThinkingBlockView
                key={i}
                block={block}
                highlighted={highlightMode === "block"}
              />
            );
          case "tool_use":
            return (
              <ToolUseBlockView
                key={i}
                block={block}
                result={toolResults?.get(block.id)}
                highlighted={highlightMode === "block"}
              />
            );
          case "tool_result":
            return null;
          case "image":
            return (
              <img
                key={i}
                src={`data:${block.source.media_type};base64,${block.source.data}`}
                alt="Attached image"
                className={cx(
                  "max-w-full rounded-[4px] border",
                  highlightMode === "block"
                    ? "border-accent bg-accent/4"
                    : "border-border"
                )}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

// --- Text ---

function TextBlockView({
  block,
  highlighted,
}: {
  block: TextBlock;
  highlighted: boolean;
}) {
  if (!block.text.trim()) return null;

  const content = <Markdown content={block.text} />;
  if (!highlighted) return content;

  return <div className="thread-selected-text">{content}</div>;
}

// --- Thinking ---

function ThinkingBlockView({
  block,
  highlighted,
}: {
  block: ThinkingBlock;
  highlighted: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cx(
        "overflow-hidden rounded-[4px] border",
        highlighted ? "border-accent bg-accent/4" : "border-border"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 bg-surface px-3 py-1.5 text-left transition-colors duration-150 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
      >
        <BrainIcon className="size-3 shrink-0 text-fg-faint" />
        <span className="text-[11px] italic text-fg-ghost">Thinking</span>
        {!open && (
          <span className="flex-1 truncate font-mono text-[11px] text-fg-faint">
            {block.thinking.slice(0, 80)}…
          </span>
        )}
        <ExpandIcon open={open} />
      </button>
      {open && (
        <div className="border-t border-border px-3 py-2">
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-fg-ghost max-h-[400px] overflow-y-auto">
            {block.thinking}
          </pre>
        </div>
      )}
    </div>
  );
}

// --- Tool Use (paired with result) ---

function ToolUseBlockView({
  block,
  result,
  highlighted,
}: {
  block: ToolUseBlock;
  result?: string;
  highlighted: boolean;
}) {
  if (block.name === "Edit") {
    return <EditToolView input={block.input} highlighted={highlighted} />;
  }
  return <ToolPill block={block} result={result} highlighted={highlighted} />;
}

function ToolPill({
  block,
  result,
  highlighted,
}: {
  block: ToolUseBlock;
  result?: string;
  highlighted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const summary = toolSummary(block);
  const hasExpandableContent =
    result || block.name === "Write" || block.name === "Bash";

  const expandContent = () => {
    if (block.name === "Write" && open) {
      return (
        <pre className="overflow-x-auto font-mono text-[12px] leading-[1.7] text-fg-muted whitespace-pre-wrap">
          {block.input.content as string}
        </pre>
      );
    }
    if (result && open) {
      return <FormattedOutput content={result} />;
    }
    return null;
  };

  if (!hasExpandableContent) {
    return (
      <div
        className={cx(
          "flex items-center gap-2 rounded-[4px] border bg-surface px-3 py-1.5 font-mono text-[11px] text-fg-ghost",
          highlighted ? "border-accent bg-accent/4" : "border-border"
        )}
      >
        {toolIcon(block.name)}
        <span className="truncate">{summary}</span>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "overflow-hidden rounded-[4px] border",
        highlighted ? "border-accent bg-accent/4" : "border-border"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 bg-surface px-3 py-1.5 text-left transition-colors duration-150 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
      >
        {toolIcon(block.name)}
        <span className="flex-1 truncate font-mono text-[11px] text-fg-ghost">
          {summary}
        </span>
        <ExpandIcon open={open} />
      </button>
      {open && (
        <div className="border-t border-border px-3 py-2">
          {expandContent()}
        </div>
      )}
    </div>
  );
}

// --- Formatted output (detects JSON, renders nicely) ---

function FormattedOutput({ content }: { content: string }) {
  const formattedJson = tryFormatJson(content);

  if (formattedJson) {
    return (
      <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-fg-ghost whitespace-pre-wrap max-h-[300px] overflow-y-auto">
        <JsonHighlight json={formattedJson} />
      </pre>
    );
  }

  // Plain text output
  return (
    <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-fg-ghost whitespace-pre-wrap max-h-[300px] overflow-y-auto">
      {content}
    </pre>
  );
}

/** Minimal JSON syntax coloring using our design tokens */
function JsonHighlight({ json }: { json: string }) {
  const parts = json.split(
    /("(?:[^"\\]|\\.)*")\s*:/g
  );

  return (
    <>
      {parts.map((part, i) => {
        // Keys (every odd index from the split)
        if (i % 2 === 1) {
          return (
            <span key={i}>
              <span className="text-fg-subtle">{part}</span>
              <span className="text-fg-faint">:</span>
            </span>
          );
        }

        // Values — highlight strings, numbers, booleans
        return (
          <span key={i}>
            {part.split(/("(?:[^"\\]|\\.)*")/g).map((valuePart, j) => {
              if (j % 2 === 1) {
                return (
                  <span key={j} className="text-accent">
                    {valuePart}
                  </span>
                );
              }
              // Numbers and booleans
              return (
                <span key={j}>
                  {valuePart.split(/\b(true|false|null|\d+\.?\d*)\b/g).map((token, k) => {
                    if (k % 2 === 1) {
                      return (
                        <span key={k} className="text-fg-muted">
                          {token}
                        </span>
                      );
                    }
                    return <span key={k}>{token}</span>;
                  })}
                </span>
              );
            })}
          </span>
        );
      })}
    </>
  );
}

// --- Edit tool (always expanded as diff) ---

function EditToolView({
  input,
  highlighted,
}: {
  input: Record<string, unknown>;
  highlighted: boolean;
}) {
  const filePath = shortPath(input.file_path as string);
  const oldString = input.old_string as string;
  const newString = input.new_string as string;

  return (
    <div
      className={cx(
        "overflow-hidden rounded-[4px] border",
        highlighted ? "border-accent bg-accent/4" : "border-border"
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-1.5">
        <FileMark className="size-3 text-fg-faint" />
        <span className="font-mono text-[11px] text-fg-subtle">
          {filePath}
        </span>
      </div>
      <div className="overflow-x-auto">
        <pre className="font-mono text-[12px] leading-[1.7]">
          {oldString.split("\n").map((line, i) => (
            <div key={`r-${i}`} className="flex bg-diff-remove-bg">
              <span className="select-none px-2 text-diff-remove">-</span>
              <code className="text-diff-remove">{line}</code>
            </div>
          ))}
          {newString.split("\n").map((line, i) => (
            <div key={`a-${i}`} className="flex bg-diff-add-bg">
              <span className="select-none px-2 text-diff-add">+</span>
              <code className="text-diff-add">{line}</code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
