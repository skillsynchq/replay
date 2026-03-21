"use client";

import { useState } from "react";
import { FileMark } from "./icons";

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

// --- Main renderer ---

export function ContentBlockRenderer({
  blocks,
}: {
  blocks: ContentBlock[];
}) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "text":
            return <TextBlockView key={i} block={block} />;
          case "thinking":
            return <ThinkingBlockView key={i} block={block} />;
          case "tool_use":
            return <ToolUseBlockView key={i} block={block} />;
          case "tool_result":
            return <ToolResultBlockView key={i} block={block} />;
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
  return (
    <p className="text-[13px] leading-relaxed text-fg whitespace-pre-wrap">
      {block.text}
    </p>
  );
}

// --- Thinking ---

function ThinkingBlockView({ block }: { block: ThinkingBlock }) {
  const [open, setOpen] = useState(false);
  const preview = block.thinking.slice(0, 80);

  return (
    <div className="border-l-2 border-fg-faint pl-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-fg-ghost transition-colors duration-150 hover:text-fg-subtle"
      >
        <span className="font-mono">{open ? "▾" : "▸"}</span>
        <span className="italic">Thinking</span>
        {!open && (
          <span className="ml-1 text-fg-faint truncate max-w-[300px]">
            {preview}...
          </span>
        )}
      </button>
      {open && (
        <p className="mt-2 text-[12px] leading-relaxed text-fg-ghost whitespace-pre-wrap">
          {block.thinking}
        </p>
      )}
    </div>
  );
}

// --- Tool Use ---

function ToolUseBlockView({ block }: { block: ToolUseBlock }) {
  const name = block.name;
  const input = block.input;

  switch (name) {
    case "Edit":
      return <EditToolView input={input} />;
    case "Write":
      return <WriteToolView input={input} />;
    case "Read":
      return <FileIndicator action="Read" path={input.file_path as string} />;
    case "Bash":
      return <BashToolView input={input} />;
    case "Glob":
      return (
        <SearchIndicator
          tool="Glob"
          pattern={input.pattern as string}
          path={input.path as string | undefined}
        />
      );
    case "Grep":
      return (
        <SearchIndicator
          tool="Grep"
          pattern={input.pattern as string}
          path={input.path as string | undefined}
        />
      );
    default:
      return <GenericToolView name={name} input={input} />;
  }
}

// --- Edit tool (diff view) ---

function EditToolView({ input }: { input: Record<string, unknown> }) {
  const filePath = input.file_path as string;
  const oldString = input.old_string as string;
  const newString = input.new_string as string;

  return (
    <div className="overflow-hidden border border-border rounded-[4px]">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-1.5">
        <FileMark className="size-3 text-fg-ghost" />
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

// --- Write tool (file creation) ---

function WriteToolView({ input }: { input: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const filePath = input.file_path as string;
  const content = input.content as string;
  const lineCount = content.split("\n").length;

  return (
    <div className="border border-border rounded-[4px]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left bg-surface transition-colors duration-150 hover:bg-surface-raised"
      >
        <FileMark className="size-3 text-fg-ghost" />
        <span className="font-mono text-[11px] text-fg-subtle">
          Write {filePath}
        </span>
        <span className="ml-auto font-mono text-[10px] text-fg-faint">
          {lineCount} lines
        </span>
        <span className="font-mono text-[11px] text-fg-ghost">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-border">
          <pre className="p-3 font-mono text-[12px] leading-[1.7] text-fg-muted">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

// --- Bash tool ---

function BashToolView({ input }: { input: Record<string, unknown> }) {
  const command = input.command as string;
  const description = input.description as string | undefined;

  return (
    <div className="border border-border bg-surface rounded-[4px] px-3 py-2">
      {description && (
        <p className="mb-1 text-[11px] text-fg-ghost">{description}</p>
      )}
      <div className="flex items-start gap-2 font-mono text-[12px]">
        <span className="text-fg-ghost select-none">$</span>
        <code className="text-fg whitespace-pre-wrap">{command}</code>
      </div>
    </div>
  );
}

// --- File indicator (Read) ---

function FileIndicator({
  action,
  path,
}: {
  action: string;
  path: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <FileMark className="size-3 text-fg-ghost" />
      <span className="font-mono text-[11px] text-fg-ghost">
        {action} {path}
      </span>
    </div>
  );
}

// --- Search indicator (Glob/Grep) ---

function SearchIndicator({
  tool,
  pattern,
  path,
}: {
  tool: string;
  pattern: string;
  path?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[11px] text-fg-ghost">
        {tool}
      </span>
      <code className="border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-fg-subtle rounded-[2px]">
        {pattern}
      </code>
      {path && (
        <span className="font-mono text-[11px] text-fg-faint">
          in {path}
        </span>
      )}
    </div>
  );
}

// --- Generic tool (fallback) ---

function GenericToolView({
  name,
  input,
}: {
  name: string;
  input: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="font-mono text-[11px] text-fg-ghost transition-colors duration-150 hover:text-fg-subtle"
      >
        <span>{open ? "▾" : "▸"}</span> {name}
      </button>
      {open && (
        <pre className="mt-1 overflow-x-auto border border-border bg-surface p-2 font-mono text-[10px] text-fg-ghost rounded-[2px]">
          {JSON.stringify(input, null, 2)}
        </pre>
      )}
    </div>
  );
}

// --- Tool Result ---

function ToolResultBlockView({ block }: { block: ToolResultBlock }) {
  const [open, setOpen] = useState(false);
  const preview = block.content.slice(0, 60);
  const isLong = block.content.length > 60;

  return (
    <div className="border-l border-border pl-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-fg-ghost transition-colors duration-150 hover:text-fg-subtle"
      >
        <span className="font-mono">{open ? "▾" : "▸"}</span>
        <span>Output</span>
        {!open && isLong && (
          <span className="ml-1 text-fg-faint truncate max-w-[300px]">
            {preview}...
          </span>
        )}
      </button>
      {open && (
        <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-fg-ghost whitespace-pre-wrap">
          {block.content}
        </pre>
      )}
      {!open && !isLong && block.content && (
        <p className="mt-1 font-mono text-[11px] text-fg-ghost">
          {block.content}
        </p>
      )}
    </div>
  );
}
