import { notFound } from "next/navigation";
import { eq, asc, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread, message, threadShare } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { buildPipeline, processDeep } from "@/lib/thread-processors";
import { headers } from "next/headers";
import { Nav } from "@/app/components/nav";
import { Assistant } from "@/app/components/assistant";
import { ThreadViewerClient } from "./client";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const threads = await db
    .select()
    .from(thread)
    .where(eq(thread.slug, slug))
    .limit(1);

  const threadRow = threads[0];
  if (!threadRow) notFound();

  // Check access
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  const userId = session?.user.id ?? null;
  const isOwner = userId === threadRow.ownerId;

  if (threadRow.visibility === "private" && !isOwner) notFound();
  if (threadRow.visibility === "shared" && !isOwner) {
    if (!userId) notFound();
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
    if (shares.length === 0) notFound();
  }

  // Fetch messages
  const messages = await db
    .select()
    .from(message)
    .where(eq(message.threadId, threadRow.id))
    .orderBy(asc(message.ordinal));

  // Fetch owner info
  const ownerRows = await db.execute<{
    name: string;
    username: string | null;
    image: string | null;
  }>(
    sql`SELECT name, username, image FROM "user" WHERE id = ${threadRow.ownerId} LIMIT 1`
  );
  const owner = ownerRows.rows?.[0] ?? {
    name: "Unknown",
    username: null,
    image: null,
  };

  const promptCount = messages.filter((m) => m.role === "user").length;

  // Run content processors (path relativization, etc.) over all messages
  const processor = buildPipeline({ projectPath: threadRow.projectPath });

  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main className="flex-1 px-6 pt-24 pb-20">
        <ThreadViewerClient
          thread={{
            id: threadRow.id,
            slug: threadRow.slug,
            title: threadRow.title,
            tags: threadRow.tags ?? [],
            agent: threadRow.agent,
            model: threadRow.model,
            visibility: threadRow.visibility,
            projectPath: threadRow.projectPath,
            gitBranch: threadRow.gitBranch,
            cliVersion: threadRow.cliVersion,
            messageCount: threadRow.messageCount,
            sessionTs: threadRow.sessionTs.toISOString(),
            createdAt: threadRow.createdAt.toISOString(),
          }}
          messages={processDeep(
            messages.map((m) => ({
              id: m.id,
              ordinal: m.ordinal,
              role: m.role,
              content: m.redacted && !isOwner ? "" : m.content,
              contentBlocks:
                m.redacted && !isOwner
                  ? null
                  : ((m.contentBlocks ?? null) as Record<string, unknown>[] | null),
              model: m.messageModel,
              stopReason: m.stopReason,
              usage: m.usage as { input_tokens: number; output_tokens: number } | null,
              redacted: m.redacted,
              timestamp: m.timestamp.toISOString(),
            })),
            processor ?? ((t) => t)
          )}
          owner={owner}
          promptCount={promptCount}
          isOwner={isOwner}
        />
      </main>
      {isOwner && <Assistant />}
    </div>
  );
}
