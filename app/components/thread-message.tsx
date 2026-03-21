import { FileMark } from "./icons";

interface DiffLineData {
  type: "context" | "add" | "remove";
  num: [number | null, number | null];
  code: string;
}

export function DiffBlock({
  lines,
  filePath,
}: {
  lines: DiffLineData[];
  filePath: string;
}) {
  return (
    <div className="mt-3 overflow-hidden border border-border rounded-[4px]">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-1.5">
        <FileMark className="size-3 text-fg-ghost" />
        <span className="font-mono text-[11px] text-fg-subtle">
          {filePath}
        </span>
      </div>
      <div className="overflow-x-auto">
        <pre className="font-mono text-[12px] leading-[1.7]">
          {lines.map((line, i) => {
            const bgClass =
              line.type === "add"
                ? "bg-diff-add-bg"
                : line.type === "remove"
                  ? "bg-diff-remove-bg"
                  : "";
            const textClass =
              line.type === "add"
                ? "text-diff-add"
                : line.type === "remove"
                  ? "text-diff-remove"
                  : "text-fg-ghost";
            const prefix =
              line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
            const numLeft =
              line.num[0] !== null ? String(line.num[0]).padStart(3) : "   ";
            const numRight =
              line.num[1] !== null ? String(line.num[1]).padStart(3) : "   ";

            return (
              <div key={i} className={`flex ${bgClass}`}>
                <span className="select-none px-2 text-fg-faint">
                  {numLeft}
                </span>
                <span className="select-none px-2 text-fg-faint">
                  {numRight}
                </span>
                <span className={`select-none px-1 ${textClass}`}>
                  {prefix}
                </span>
                <code className={textClass}>{line.code}</code>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

export function ToolUseIndicator({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <FileMark className="size-3 text-fg-ghost" />
      <span className="font-mono text-[11px] text-fg-ghost">{label}</span>
    </div>
  );
}

export function UserMessage({ text }: { text: string }) {
  return (
    <div className="py-4">
      <div className="flex gap-2">
        <span className="select-none font-mono text-[13px] text-fg-ghost">
          {">"}
        </span>
        <p className="text-[13px] font-medium text-fg whitespace-pre-wrap">
          {text}
        </p>
      </div>
    </div>
  );
}

export function AssistantMessage({
  children,
  timestamp,
}: {
  children: React.ReactNode;
  timestamp?: string;
}) {
  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">{children}</div>
        {timestamp && (
          <span className="shrink-0 font-mono text-[11px] text-fg-faint">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="border border-border bg-surface px-1.5 py-0.5 font-mono text-[12px] text-fg-subtle rounded-[2px]">
      {children}
    </code>
  );
}

export function RedactedMessage() {
  return (
    <div className="py-4">
      <p className="text-[13px] text-fg-faint italic">[redacted]</p>
    </div>
  );
}
