import Anthropic from "@anthropic-ai/sdk";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread, message } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Tool definitions — shared between assistant and trace generation
// ---------------------------------------------------------------------------

export const THREAD_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "search_threads",
    description:
      "Search across the user's conversation threads using a text query. " +
      "Returns matching threads with snippet excerpts showing where the query matched.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query to find relevant conversations",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_thread",
    description:
      "Open and read a specific conversation thread by its slug. " +
      "Returns the full thread metadata and all messages, just like when the user opens a conversation.",
    input_schema: {
      type: "object" as const,
      properties: {
        slug: {
          type: "string",
          description: "The thread slug identifier",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "list_threads",
    description:
      "List the user's conversation threads with optional filters. " +
      "Returns thread metadata (title, agent, model, tags, message count, date). " +
      "Use this to browse or get an overview of the user's conversations.",
    input_schema: {
      type: "object" as const,
      properties: {
        agent: {
          type: "string",
          description: "Filter by agent (e.g. 'claude-code', 'chatgpt', 'cursor')",
        },
        model: {
          type: "string",
          description: "Filter by model name",
        },
        project_path: {
          type: "string",
          description: "Filter by project path",
        },
        limit: {
          type: "number",
          description: "Maximum number of threads to return (default 20, max 50)",
        },
        offset: {
          type: "number",
          description: "Number of threads to skip for pagination (default 0)",
        },
      },
      required: [],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool input types
// ---------------------------------------------------------------------------

interface GetThreadInput {
  slug: string;
}

interface ListThreadsInput {
  agent?: string;
  model?: string;
  project_path?: string;
  limit?: number;
  offset?: number;
}

interface SearchThreadsInput {
  query: string;
  project_path?: string;
}

export type ToolInput = GetThreadInput | ListThreadsInput | SearchThreadsInput;

// ---------------------------------------------------------------------------
// Server-side tool execution
// ---------------------------------------------------------------------------

export async function executeServerTool(
  name: string,
  input: ToolInput,
  userId: string
): Promise<string> {
  switch (name) {
    case "get_thread": {
      const { slug } = input as GetThreadInput;
      const rows = await db
        .select()
        .from(thread)
        .where(and(eq(thread.slug, slug), eq(thread.ownerId, userId)))
        .limit(1);

      const threadRow = rows[0];
      if (!threadRow) return JSON.stringify({ error: "Thread not found" });

      const messages = await db
        .select({
          ordinal: message.ordinal,
          role: message.role,
          content: message.content,
          model: message.messageModel,
          timestamp: message.timestamp,
        })
        .from(message)
        .where(eq(message.threadId, threadRow.id))
        .orderBy(asc(message.ordinal));

      return JSON.stringify({
        thread: {
          slug: threadRow.slug,
          title: threadRow.title,
          agent: threadRow.agent,
          model: threadRow.model,
          visibility: threadRow.visibility,
          projectPath: threadRow.projectPath,
          gitBranch: threadRow.gitBranch,
          tags: threadRow.tags,
          keyPoints: threadRow.keyPoints,
          messageCount: threadRow.messageCount,
          sessionTs: threadRow.sessionTs,
        },
        messages: messages.map((m) => ({
          ordinal: m.ordinal,
          role: m.role,
          content: m.content,
          model: m.model,
          timestamp: m.timestamp,
        })),
      });
    }

    case "list_threads": {
      const listInput = input as ListThreadsInput;
      const limit = Math.min(50, Math.max(1, Number(listInput.limit ?? 20)));
      const offset = Math.max(0, Number(listInput.offset ?? 0));

      const conditions = [eq(thread.ownerId, userId)];
      if (listInput.agent) conditions.push(eq(thread.agent, listInput.agent));
      if (listInput.model) conditions.push(eq(thread.model, listInput.model));
      if (listInput.project_path) conditions.push(eq(thread.projectPath, listInput.project_path));

      const where = and(...conditions);

      const [threads, countResult] = await Promise.all([
        db
          .select({
            slug: thread.slug,
            title: thread.title,
            agent: thread.agent,
            model: thread.model,
            tags: thread.tags,
            keyPoints: thread.keyPoints,
            messageCount: thread.messageCount,
            sessionTs: thread.sessionTs,
            createdAt: thread.createdAt,
          })
          .from(thread)
          .where(where)
          .orderBy(desc(thread.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(thread)
          .where(where),
      ]);

      return JSON.stringify({
        threads,
        total: countResult[0].count,
        showing: threads.length,
        offset,
      });
    }

    case "search_threads": {
      const searchInput = input as SearchThreadsInput;
      return searchThreadsServer(
        searchInput.query,
        userId,
        searchInput.project_path
      );
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ---------------------------------------------------------------------------
// Server-side thread search (ILIKE across message content)
// ---------------------------------------------------------------------------

export async function searchThreadsServer(
  query: string,
  userId: string,
  projectPath?: string
): Promise<string> {
  if (!query || query.trim().length === 0) {
    return JSON.stringify({ results: [], query });
  }

  const pattern = `%${query.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;

  const results = await db.execute<{
    slug: string;
    title: string | null;
    ordinal: number;
    role: string;
    snippet: string;
    session_ts: string;
  }>(
    projectPath
      ? sql`
          SELECT DISTINCT ON (t.slug, m.ordinal)
            t.slug, t.title, m.ordinal, m.role,
            substring(m.content from 1 for 200) as snippet,
            t.session_ts
          FROM message m
          JOIN thread t ON m.thread_id = t.id
          WHERE t.owner_id = ${userId}
            AND m.content ILIKE ${pattern}
            AND t.project_path = ${projectPath}
          ORDER BY t.slug, m.ordinal, t.session_ts DESC
          LIMIT 30
        `
      : sql`
          SELECT DISTINCT ON (t.slug, m.ordinal)
            t.slug, t.title, m.ordinal, m.role,
            substring(m.content from 1 for 200) as snippet,
            t.session_ts
          FROM message m
          JOIN thread t ON m.thread_id = t.id
          WHERE t.owner_id = ${userId}
            AND m.content ILIKE ${pattern}
          ORDER BY t.slug, m.ordinal, t.session_ts DESC
          LIMIT 30
        `
  );

  // Group by thread
  const grouped = new Map<string, {
    slug: string;
    title: string | null;
    matches: { ordinal: number; role: string; snippet: string }[];
  }>();

  for (const row of results.rows) {
    let group = grouped.get(row.slug);
    if (!group) {
      group = { slug: row.slug, title: row.title, matches: [] };
      grouped.set(row.slug, group);
    }
    group.matches.push({
      ordinal: row.ordinal,
      role: row.role,
      snippet: row.snippet,
    });
  }

  return JSON.stringify({
    results: Array.from(grouped.values()),
    query,
  });
}
