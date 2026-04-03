import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { message, thread } from "@/lib/db/schema";
import { buildConversationSnapshot } from "@/lib/thread-snapshot";
import { DashboardClient } from "./dashboard-client";

function firstParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[] | undefined;
    q?: string | string[] | undefined;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(firstParam(params.page, "1")) || 1);
  const query = firstParam(params.q).trim();
  const limit = 20;
  const offset = (page - 1) * limit;

  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) redirect("/login");

  const where = and(eq(thread.ownerId, session.user.id));
  const [threads, countResult] = await Promise.all([
    db
      .select({
        id: thread.id,
        slug: thread.slug,
        title: thread.title,

        keyPoints: thread.keyPoints,
        agent: thread.agent,
        model: thread.model,
        visibility: thread.visibility,
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

  const threadIds = threads.map((item) => item.id);
  const threadMessages =
    threadIds.length === 0
      ? []
      : await db
          .select({
            threadId: message.threadId,
            ordinal: message.ordinal,
            role: message.role,
            content: message.content,
            contentBlocks: message.contentBlocks,
            redacted: message.redacted,
          })
          .from(message)
          .where(inArray(message.threadId, threadIds))
          .orderBy(asc(message.threadId), asc(message.ordinal));

  const messagesByThread = new Map<string, typeof threadMessages>();
  for (const item of threadMessages) {
    const existing = messagesByThread.get(item.threadId);
    if (existing) {
      existing.push(item);
      continue;
    }
    messagesByThread.set(item.threadId, [item]);
  }

  return (
    <DashboardClient
      initialQuery={query}
      initialData={{
        threads: threads.map((item) => ({
          ...item,
          sessionTs: item.sessionTs.toISOString(),
          createdAt: item.createdAt.toISOString(),
          conversationSnapshot: buildConversationSnapshot(
            messagesByThread.get(item.id) ?? []
          ),
        })),
        total: countResult[0]?.count ?? 0,
        page,
        limit,
      }}
    />
  );
}
