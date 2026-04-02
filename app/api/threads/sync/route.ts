import { type NextRequest, NextResponse } from "next/server";
import { eq, and, gt, desc, asc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread, message } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth-helpers";

/**
 * Build searchable text from a message's content + contentBlocks.
 * Includes text blocks, tool_use inputs, and tool_result content (truncated).
 */
function buildSearchableContent(
  plainContent: string,
  contentBlocks: unknown
): string {
  if (!contentBlocks || !Array.isArray(contentBlocks)) {
    return plainContent;
  }

  const parts: string[] = [];

  for (const block of contentBlocks) {
    const b = block as Record<string, unknown>;
    if (b.type === "text" && typeof b.text === "string") {
      parts.push(b.text);
    } else if (b.type === "tool_use" && b.input && typeof b.input === "object") {
      // Index tool input values (file paths, commands, etc.)
      const values = Object.values(b.input as Record<string, unknown>);
      for (const v of values) {
        if (typeof v === "string") {
          parts.push(v);
        }
      }
    } else if (b.type === "tool_result") {
      // Truncate tool results to keep index size reasonable
      if (typeof b.content === "string") {
        parts.push(b.content.slice(0, 500));
      } else if (Array.isArray(b.content)) {
        for (const item of b.content as Array<Record<string, unknown>>) {
          if (item.type === "text" && typeof item.text === "string") {
            parts.push((item.text as string).slice(0, 500));
          }
        }
      }
    }
  }

  return parts.join("\n");
}

/**
 * GET /api/threads/sync?since=<ISO timestamp>
 *
 * Returns threads updated after `since` with their individual messages
 * for client-side per-message search indexing.
 * If `since` is omitted, returns all threads.
 *
 * Response shape:
 *   { threads: SyncThread[], syncTs: string }
 *
 * Each SyncThread includes a `messages` array with { ordinal, role, content }.
 */
export async function GET(request: NextRequest) {
  const [session, authError] = await requireAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const since = url.searchParams.get("since");

  const conditions = [eq(thread.ownerId, session.user.id)];
  if (since) {
    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid `since` timestamp" },
        { status: 400 }
      );
    }
    conditions.push(gt(thread.updatedAt, sinceDate));
  }

  const where = and(...conditions);

  // Capture server time before query so the client can use it as next `since`
  const syncTs = new Date().toISOString();

  // Fetch thread metadata
  const threads = await db
    .select({
      id: thread.id,
      slug: thread.slug,
      title: thread.title,
      agent: thread.agent,
      model: thread.model,
      visibility: thread.visibility,
      tags: thread.tags,
      keyPoints: thread.keyPoints,

      messageCount: thread.messageCount,
      sessionTs: thread.sessionTs,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    })
    .from(thread)
    .where(where)
    .orderBy(desc(thread.updatedAt));

  if (threads.length === 0) {
    return NextResponse.json({ threads: [], syncTs });
  }

  // Fetch all messages for these threads in one query
  const threadIds = threads.map((t) => t.id);
  const messages = await db
    .select({
      threadId: message.threadId,
      ordinal: message.ordinal,
      role: message.role,
      content: message.content,
      contentBlocks: message.contentBlocks,
    })
    .from(message)
    .where(inArray(message.threadId, threadIds))
    .orderBy(asc(message.ordinal));

  // Group messages by thread
  const messagesByThread = new Map<string, typeof messages>();
  for (const m of messages) {
    let arr = messagesByThread.get(m.threadId);
    if (!arr) {
      arr = [];
      messagesByThread.set(m.threadId, arr);
    }
    arr.push(m);
  }

  const result = threads.map((t) => ({
    ...t,
    messages: (messagesByThread.get(t.id) ?? []).map((m) => ({
      ordinal: m.ordinal,
      role: m.role,
      content: buildSearchableContent(m.content, m.contentBlocks),
    })),
  }));

  return NextResponse.json({ threads: result, syncTs });
}
