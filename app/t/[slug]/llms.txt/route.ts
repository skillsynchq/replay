import { eq, asc, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread, message, threadShare } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { buildPipeline, processDeep } from "@/lib/thread-processors";

// --- Content block types (mirrors content-renderer.tsx) ---

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
  content:
    | string
    | Array<{ type: string; text?: string }>;
  is_error?: boolean;
}

type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock;

// --- Markdown rendering ---

function renderContentBlocks(blocks: ContentBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "text":
        if (block.text.trim()) parts.push(block.text);
        break;

      case "thinking":
        if (block.thinking.trim()) {
          parts.push(
            `<details>\n<summary>Thinking</summary>\n\n${block.thinking}\n\n</details>`
          );
        }
        break;

      case "tool_use": {
        const inputStr = JSON.stringify(block.input, null, 2);
        parts.push(
          `> **${block.name}**\n> \`\`\`json\n${inputStr
            .split("\n")
            .map((l) => `> ${l}`)
            .join("\n")}\n> \`\`\``
        );
        break;
      }

      case "tool_result": {
        const resultText =
          typeof block.content === "string"
            ? block.content
            : block.content
                .filter((c) => c.text)
                .map((c) => c.text)
                .join("\n");
        if (resultText.trim()) {
          const label = block.is_error ? "Tool Error" : "Tool Result";
          parts.push(`> **${label}**:\n> ${resultText.split("\n").map((l) => `> ${l}`).join("\n")}`);
        }
        break;
      }
    }
  }

  return parts.join("\n\n");
}

function renderMessage(
  role: string,
  content: string,
  contentBlocks: Record<string, unknown>[] | null,
  redacted: boolean
): string {
  if (redacted) return `*[redacted]*`;

  // If structured content blocks exist, use them
  if (contentBlocks && contentBlocks.length > 0) {
    const rendered = renderContentBlocks(contentBlocks as ContentBlock[]);
    if (rendered.trim()) return rendered;
  }

  // Fall back to plain content
  return content;
}

function formatDate(iso: string): string {
  return new Date(iso).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Fetch thread
  const threads = await db
    .select()
    .from(thread)
    .where(eq(thread.slug, slug))
    .limit(1);

  const threadRow = threads[0];
  if (!threadRow) {
    return new Response("Not found", { status: 404 });
  }

  // Access control (same as page.tsx)
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  const userId = session?.user.id ?? null;
  const isOwner = userId === threadRow.ownerId;

  if (threadRow.visibility === "private" && !isOwner) {
    return new Response("Not found", { status: 404 });
  }
  if (threadRow.visibility === "shared" && !isOwner) {
    if (!userId) return new Response("Not found", { status: 404 });
    const shares = await db
      .select({ id: threadShare.id })
      .from(threadShare)
      .where(
        and(
          eq(threadShare.threadId, threadRow.id),
          eq(threadShare.userId, userId)
        )
      )
      .limit(1);
    if (shares.length === 0) {
      return new Response("Not found", { status: 404 });
    }
  }

  // Fetch messages
  const messages = await db
    .select()
    .from(message)
    .where(eq(message.threadId, threadRow.id))
    .orderBy(asc(message.ordinal));

  // Fetch owner
  const ownerRows = await db.execute<{ name: string; username: string | null }>(
    sql`SELECT name, username FROM "user" WHERE id = ${threadRow.ownerId} LIMIT 1`
  );
  const owner = ownerRows.rows?.[0] ?? { name: "Unknown", username: null };

  // Process content (path relativization)
  const processor = buildPipeline({ projectPath: threadRow.projectPath });

  const agentLabel =
    threadRow.agent === "claude"
      ? "Claude Code"
      : threadRow.agent === "codex"
        ? "Codex"
        : threadRow.agent;

  const promptCount = messages.filter((m) => m.role === "user").length;

  // Build markdown
  const lines: string[] = [];

  // Header
  lines.push(`# ${threadRow.title ?? "Untitled conversation"}`);
  lines.push("");
  lines.push(
    `> ${owner.name} · ${agentLabel}${threadRow.model ? ` · ${threadRow.model}` : ""} · ${formatDate(threadRow.sessionTs.toISOString())}`
  );
  lines.push(
    `> ${promptCount} prompts · ${threadRow.messageCount} messages`
  );

  if (threadRow.tags && threadRow.tags.length > 0) {
    lines.push(`> Tags: ${threadRow.tags.join(", ")}`);
  }

  lines.push("");
  lines.push("---");
  lines.push("");

  // Messages
  for (const m of messages) {
    const heading = m.role === "user" ? "## Human" : "## Assistant";
    lines.push(heading);
    lines.push("");

    const content = m.redacted && !isOwner ? "" : m.content;
    const contentBlocks =
      m.redacted && !isOwner
        ? null
        : ((m.contentBlocks ?? null) as Record<string, unknown>[] | null);

    // Apply path processing
    const processed = processor
      ? processDeep({ content, contentBlocks }, processor)
      : { content, contentBlocks };

    const rendered = renderMessage(
      m.role,
      processed.content,
      processed.contentBlocks,
      m.redacted && !isOwner
    );

    lines.push(rendered);
    lines.push("");
  }

  const markdown = lines.join("\n");

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept",
      "Content-Disposition": `inline; filename="${slug}.md"`,
    },
  });
}
