"use client";

import { useState } from "react";
import { FileMark } from "./icons";
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
  content: string;
}

type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock;

// --- Helpers ---

/** Shorten an absolute path to just the last 2-3 segments */
function shortPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 3) return path;
  return parts.slice(-3).join("/");
}

/** Get a one-line summary for a tool_use block */
function toolSummary(block: ToolUseBlock): string {
  const input = block.input;
  switch (block.name) {
    case "Read":
      return `Read ${shortPath(input.file_path as string)}`;
    case "Edit":
      return `Edit ${shortPath(input.file_path as string)}`;
    case "Write":
      return `Write ${shortPath(input.file_path as string)}`;
    case "Bash":
      return `$ ${(input.command as string).slice(0, 80)}${(input.command as string).length > 80 ? "…" : ""}`;
    case "Glob":
      return `Glob ${input.pattern as string}`;
    case "Grep":
      return `Grep ${input.pattern as string}${input.path ? ` in ${shortPath(input.path as string)}` : ""}`;
    case "Agent":
      return `Agent ${(input.description as string) ?? ""}`.slice(0, 80);
    default:
      return block.name;
  }
}

// --- Main renderer ---

export function ContentBlockRenderer({
  blocks,
  toolResults,
}: {
  blocks: ContentBlock[];
  toolResults?: Map<string, string>;
}) {
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "text":
            return <TextBlockView key={i} block={block} />;
          case "thinking":
            return <ThinkingBlockView key={i} block={block} />;
          case "tool_use":
            return (
              <ToolUseBlockView
                key={i}
                block={block}
                result={toolResults?.get(block.id)}
              />
            );
          case "tool_result":
            // Rendered inline with tool_use — skip standalone
            return null;
          default:
            return null;
        }
      })}
    </div>
  );
}

// --- Text ---

function TextBlockView({ block }: { block: TextBlock }) {
  if (!block.text.trim()) return null;
  return <Markdown content={block.text} />;
}

// --- Thinking ---

function ThinkingBlockView({ block }: { block: ThinkingBlock }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-[4px] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 bg-surface px-3 py-1.5 text-left transition-colors duration-150 hover:bg-surface-raised"
      >
        <span className="text-[11px] italic text-fg-ghost">Thinking</span>
        {!open && (
          <span className="flex-1 truncate font-mono text-[11px] text-fg-faint">
            {block.thinking.slice(0, 80)}…
          </span>
        )}
        <span className="ml-auto text-fg-faint text-[11px] shrink-0">
          {open ? "▾" : "›"}
        </span>
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
}: {
  block: ToolUseBlock;
  result?: string;
}) {
  // Edit gets special rendering — always expanded as a diff
  if (block.name === "Edit") {
    return <EditToolView input={block.input} />;
  }

  return <ToolPill block={block} result={result} />;
}

/** Compact single-line tool indicator with expand chevron */
function ToolPill({
  block,
  result,
}: {
  block: ToolUseBlock;
  result?: string;
}) {
  const [open, setOpen] = useState(false);
  const summary = toolSummary(block);
  const hasExpandableContent =
    result || block.name === "Write" || block.name === "Bash";

  // Write tool: show full content when expanded
  const expandContent = () => {
    if (block.name === "Write" && open) {
      return (
        <pre className="mt-2 overflow-x-auto font-mono text-[12px] leading-[1.7] text-fg-muted whitespace-pre-wrap">
          {block.input.content as string}
        </pre>
      );
    }
    if (result && open) {
      return (
        <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-fg-ghost whitespace-pre-wrap max-h-[300px] overflow-y-auto">
          {result}
        </pre>
      );
    }
    return null;
  };

  if (!hasExpandableContent) {
    // Non-expandable — just a static indicator
    return (
      <div className="flex items-center gap-2 border border-border bg-surface px-3 py-1.5 font-mono text-[11px] text-fg-ghost rounded-[4px]">
        <FileMark className="size-3 shrink-0 text-fg-faint" />
        <span className="truncate">{summary}</span>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-[4px] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 bg-surface px-3 py-1.5 text-left transition-colors duration-150 hover:bg-surface-raised"
      >
        <FileMark className="size-3 shrink-0 text-fg-faint" />
        <span className="flex-1 truncate font-mono text-[11px] text-fg-ghost">
          {summary}
        </span>
        <span className="text-fg-faint text-[11px] shrink-0">
          {open ? "▾" : "›"}
        </span>
      </button>
      {open && (
        <div className="border-t border-border px-3 py-2">
          {expandContent()}
        </div>
      )}
    </div>
  );
}

// --- Edit tool (always expanded as diff) ---

function EditToolView({ input }: { input: Record<string, unknown> }) {
  const filePath = shortPath(input.file_path as string);
  const oldString = input.old_string as string;
  const newString = input.new_string as string;

  return (
    <div className="overflow-hidden border border-border rounded-[4px]">
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
