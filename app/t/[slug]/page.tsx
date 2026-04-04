import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, asc, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread, message, threadShare, threadStar } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { buildPipeline, processDeep } from "@/lib/thread-processors";
import { headers } from "next/headers";
import { Nav } from "@/app/components/nav";
import { Assistant } from "@/app/components/assistant";
import { ThreadViewerClient } from "./client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://replay.md";

async function getThreadWithOwner(slug: string) {
  const rows = await db
    .select()
    .from(thread)
    .where(eq(thread.slug, slug))
    .limit(1);
  const threadRow = rows[0] ?? null;
  if (!threadRow) return null;

  const ownerRows = await db.execute<{
    name: string;
    username: string | null;
  }>(
    sql`SELECT name, username FROM "user" WHERE id = ${threadRow.ownerId} LIMIT 1`
  );
  const owner = ownerRows.rows?.[0] ?? { name: "Unknown", username: null };

  return { threadRow, owner };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getThreadWithOwner(slug);

  if (!result) {
    return { title: "replay.md" };
  }

  const { threadRow, owner } = result;

  // For private threads, return minimal metadata
  if (threadRow.visibility === "private") {
    return { title: "replay.md" };
  }

  const title = threadRow.title
    ? `${threadRow.title} — replay.md`
    : "replay.md";

  const canonicalUrl = `${APP_URL}/t/${threadRow.slug}`;

  let description: string;
  if (threadRow.keyPoints && threadRow.keyPoints.length > 0) {
    description = threadRow.keyPoints.join(". ");
    if (!description.endsWith(".")) description += ".";
  } else {
    const agentLabel =
      threadRow.agent === "claude"
        ? "Claude Code"
        : threadRow.agent === "codex"
          ? "Codex"
          : threadRow.agent;
    description = `A ${agentLabel} conversation by ${owner.name} — ${threadRow.messageCount} messages`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: threadRow.title ?? "replay.md",
      description,
      type: "article",
      url: canonicalUrl,
      siteName: "replay.md",
    },
    twitter: {
      card: "summary_large_image",
      title: threadRow.title ?? "replay.md",
      description,
    },
  };
}

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

  let starred = false;
  if (userId) {
    const stars = await db
      .select({ id: threadStar.id })
      .from(threadStar)
      .where(
        and(
          eq(threadStar.threadId, threadRow.id),
          eq(threadStar.userId, userId)
        )
      )
      .limit(1);
    starred = stars.length > 0;
  }

  // Run content processors (path relativization, etc.) over all messages
  const processor = buildPipeline({ projectPath: threadRow.projectPath });

  const canonicalUrl = `${APP_URL}/t/${threadRow.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: threadRow.title ?? "Untitled conversation",
    author: {
      "@type": "Person",
      name: owner.name,
      ...(owner.username ? { url: `${APP_URL}/${owner.username}` } : {}),
    },
    datePublished: threadRow.sessionTs.toISOString(),
    dateCreated: threadRow.createdAt.toISOString(),
    url: canonicalUrl,
    ...(threadRow.tags && threadRow.tags.length > 0
      ? { keywords: threadRow.tags.join(", ") }
      : {}),
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: threadRow.messageCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: threadRow.starCount,
      },
    ],
    ...(threadRow.agent ? { "replay:agent": threadRow.agent } : {}),
    ...(threadRow.model ? { "replay:model": threadRow.model } : {}),
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
          starCount={threadRow.starCount}
          starred={starred}
          isAuthenticated={!!userId}
        />
      </main>
      {isOwner && <Assistant />}
    </div>
  );
}
