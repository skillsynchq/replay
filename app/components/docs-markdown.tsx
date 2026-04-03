import Link from "next/link";
import {
  isValidElement,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

function flattenText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(flattenText).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return flattenText(node.props.children);
  }

  return "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[`"'']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function headingLink(children: ReactNode) {
  return slugify(flattenText(children));
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-8 text-[28px] font-medium tracking-tight text-fg first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => {
    const id = headingLink(children);
    return (
      <h2
        id={id}
        className="group mt-10 scroll-mt-32 border-t border-border pt-6 text-[22px] font-medium tracking-tight text-fg first:mt-0 first:border-t-0 first:pt-0"
      >
        <a href={`#${id}`} className="transition-colors hover:text-accent">
          {children}
        </a>
      </h2>
    );
  },
  h3: ({ children }) => {
    const id = headingLink(children);
    return (
      <h3
        id={id}
        className="mt-8 scroll-mt-32 text-[16px] font-medium text-fg"
      >
        <a href={`#${id}`} className="transition-colors hover:text-accent">
          {children}
        </a>
      </h3>
    );
  },
  p: ({ children }) => (
    <p className="mt-4 text-[14px] leading-7 text-fg-muted">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-medium text-fg">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-fg">{children}</em>
  ),
  a: ({ href, children }) => {
    const target = href ?? "";
    if (target.startsWith("/")) {
      return (
        <Link
          href={target}
          className="text-accent transition-colors duration-150 hover:text-accent-hover"
        >
          {children}
        </Link>
      );
    }

    return (
      <a
        href={target}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent transition-colors duration-150 hover:text-accent-hover"
      >
        {children}
      </a>
    );
  },
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code className="text-fg">{children}</code>;
    }

    return (
      <code className="rounded-[2px] border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[12px] text-fg">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mt-4 overflow-x-auto rounded-[4px] border border-border bg-bg px-4 py-3 font-mono text-[12px] leading-6 text-fg">
      {children}
    </pre>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 space-y-2 pl-5 text-[14px] text-fg-muted marker:text-fg-ghost">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 space-y-2 pl-5 text-[14px] text-fg-muted marker:text-fg-ghost">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 leading-7">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-5 rounded-[4px] border border-border bg-surface px-4 py-3 text-[13px] leading-6 text-fg-muted">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="mt-8 border-border" />,
  table: ({ children }) => (
    <div className="mt-5 overflow-x-auto rounded-[4px] border border-border">
      <table className="w-full border-collapse text-left text-[13px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-surface text-fg-muted">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 font-medium">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-border px-3 py-2 text-fg-muted">
      {children}
    </td>
  ),
};

interface DocsMarkdownProps {
  content: string;
}

export function DocsMarkdown({ content }: DocsMarkdownProps) {
  return (
    <div className="[&>:first-child]:mt-0 [&_ol]:list-decimal [&_ul]:list-disc">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
