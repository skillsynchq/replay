import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="mt-5 mb-2 text-[18px] font-medium text-fg">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 text-[16px] font-medium text-fg">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1.5 text-[14px] font-medium text-fg">{children}</h3>
  ),

  // Paragraphs
  p: ({ children }) => (
    <p className="mb-2 text-[13px] leading-relaxed text-fg">{children}</p>
  ),

  // Bold / italic
  strong: ({ children }) => (
    <strong className="font-medium text-fg">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-fg-muted">{children}</em>
  ),

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent transition-colors duration-150 hover:text-accent-hover"
    >
      {children}
    </a>
  ),

  // Inline code
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      const lang = className?.replace("language-", "") ?? "";
      return (
        <code className="text-fg-muted" data-language={lang}>
          {children}
        </code>
      );
    }
    return (
      <code className="border border-border bg-surface px-1.5 py-0.5 font-mono text-[12px] text-fg-subtle rounded-[2px]">
        {children}
      </code>
    );
  },

  // Code blocks
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto border border-border bg-surface p-3 font-mono text-[12px] leading-[1.7] text-fg-muted rounded-[4px]">
      {children}
    </pre>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="mb-2 ml-4 list-disc space-y-0.5 text-[13px] text-fg marker:text-fg-faint">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-4 list-decimal space-y-0.5 text-[13px] text-fg marker:text-fg-faint">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-[13px] leading-relaxed text-fg">{children}</li>
  ),

  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-fg-faint pl-3 text-fg-muted">
      {children}
    </blockquote>
  ),

  // Horizontal rules
  hr: () => <hr className="my-4 border-border" />,

  // Tables
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-2 py-1.5 text-left font-medium text-fg-muted">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-t border-border px-2 py-1.5 text-fg">
      {children}
    </td>
  ),
};

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  return (
    <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
