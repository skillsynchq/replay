import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { FileMark } from "./icons";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export interface ConversationDiffLine {
  type: "context" | "add" | "remove";
  num: [number | null, number | null];
  code: string;
}

function Root({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

function Header({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cx("border-b border-border bg-surface px-5 py-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function MetaGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mt-4 flex flex-wrap gap-x-8 gap-y-2", className)}>
      {children}
    </div>
  );
}

function MetaItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-wider text-fg-ghost">
        {label}
      </span>
      {children}
    </div>
  );
}

function Messages({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cx("space-y-1", className)} {...props}>
      {children}
    </div>
  );
}

function UserMessage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("bg-surface/40 px-3 py-2.5", className)}>
      <div className="flex gap-2">
        <span className="select-none font-mono text-[13px] text-fg-ghost">
          {">"}
        </span>
        <div className="min-w-0 flex-1 text-[13px] font-medium leading-relaxed text-fg whitespace-pre-wrap">
          {children}
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({
  children,
  timestamp,
  className,
}: {
  children: ReactNode;
  timestamp?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("py-2", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">{children}</div>
        {timestamp ? (
          <span className="shrink-0 font-mono text-[11px] text-fg-faint">
            {timestamp}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ToolRow({
  label,
  icon,
  className,
}: {
  label: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mb-2 flex items-center gap-1.5", className)}>
      {icon ?? <FileMark className="size-3 text-fg-ghost" />}
      <span className="font-mono text-[11px] text-fg-ghost">{label}</span>
    </div>
  );
}

function Diff({
  lines,
  filePath,
}: {
  lines: ConversationDiffLine[];
  filePath: string;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-[4px] border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-1.5">
        <FileMark className="size-3 text-fg-ghost" />
        <span className="font-mono text-[11px] text-fg-subtle">{filePath}</span>
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
                <span className="select-none px-2 text-fg-faint">{numLeft}</span>
                <span className="select-none px-2 text-fg-faint">
                  {numRight}
                </span>
                <span className={`select-none px-1 ${textClass}`}>{prefix}</span>
                <code className={textClass}>{line.code}</code>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[2px] border border-border bg-surface px-1.5 py-0.5 font-mono text-[12px] text-fg-subtle">
      {children}
    </code>
  );
}

function EmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("py-16 text-center text-[12px] text-fg-ghost", className)}>
      {children}
    </div>
  );
}

function RedactedMessage() {
  return (
    <AssistantMessage>
      <p className="text-[13px] italic text-fg-faint">[redacted]</p>
    </AssistantMessage>
  );
}

export function PreviewConversation({
  header,
  children,
  footer,
  className,
}: {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Root
      className={cx(
        "overflow-hidden rounded-[4px] border border-border transition-colors duration-150 hover:border-border-hover",
        className
      )}
    >
      {header}
      <Messages className="px-5 py-2">{children}</Messages>
      {footer}
    </Root>
  );
}

export function ThreadConversation({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Messages className={className}>{children}</Messages>;
}

export function AssistantConversation({
  children,
  empty,
  hasMessages = true,
  className,
}: {
  children?: ReactNode;
  empty?: ReactNode;
  hasMessages?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("flex-1 overflow-y-auto px-4 py-3", className)}>
      {hasMessages ? children : <EmptyState>{empty}</EmptyState>}
    </div>
  );
}

export const Conversation = {
  Root,
  Header,
  MetaGrid,
  MetaItem,
  Messages,
  UserMessage,
  AssistantMessage,
  ToolRow,
  Diff,
  InlineCode,
  EmptyState,
  RedactedMessage,
};

export {
  Diff as ConversationDiff,
  ToolRow as ConversationToolRow,
  UserMessage as ConversationUserMessage,
  AssistantMessage as ConversationAssistantMessage,
  InlineCode as ConversationInlineCode,
  RedactedMessage as ConversationRedactedMessage,
};
