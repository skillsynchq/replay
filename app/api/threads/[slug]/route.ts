import { type NextRequest, NextResponse, after } from "next/server";
import { gunzipSync } from "node:zlib";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread, message, threadShare } from "@/lib/db/schema";
import { requireAuth, getOptionalSession, isCliRequest, checkCliVersion } from "@/lib/auth-helpers";
import {
  updateThreadSchema,
  uploadThreadSchema,
  extractTextFromBlocks,
  type ContentBlock,
} from "@/lib/validations";
import { summarizeThread } from "@/lib/ai/summarize-thread";
import { buildConversationSnapshot } from "@/lib/thread-snapshot";
import { getPostHogClient } from "@/lib/posthog-server";

async function findThread(slug: string) {
  const rows = await db
    .select()
    .from(thread)
    .where(eq(thread.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

async function canView(
  threadRow: typeof thread.$inferSelect,
  userId: string | null
): Promise<boolean> {
  if (
    threadRow.visibility === "public" ||
    threadRow.visibility === "unlisted"
  ) {
    return true;
  }
  if (!userId) return false;
  if (threadRow.ownerId === userId) return true;
  if (threadRow.visibility === "shared") {
    const share = await db
      .select({ id: threadShare.id })
      .from(threadShare)
      .where(
        and(
          eq(threadShare.threadId, threadRow.id),
          eq(threadShare.userId, userId)
        )
      )
      .limit(1);
    return share.length > 0;
  }
  return false;
}

/**
 * GET /api/threads/[slug] — Get a thread with messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const threadRow = await findThread(slug);

  if (!threadRow) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const session = await getOptionalSession(request);
  const userId = session?.user.id ?? null;

  if (!(await canView(threadRow, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = userId === threadRow.ownerId;

  const messages = await db
    .select()
    .from(message)
    .where(eq(message.threadId, threadRow.id))
    .orderBy(asc(message.ordinal));

  return NextResponse.json({
    thread: {
      id: threadRow.id,
      slug: threadRow.slug,
      title: threadRow.title,
      agent: threadRow.agent,
      model: threadRow.model,
      visibility: threadRow.visibility,
      projectPath: threadRow.projectPath,
      gitBranch: threadRow.gitBranch,
      cliVersion: threadRow.cliVersion,
      keyPoints: threadRow.keyPoints,

      messageCount: threadRow.messageCount,
      sessionTs: threadRow.sessionTs,
      createdAt: threadRow.createdAt,
    },
    messages: messages.map((m) => ({
      id: m.id,
      ordinal: m.ordinal,
      role: m.role,
      content: m.redacted && !isOwner ? "" : m.content,
      contentBlocks:
        m.redacted && !isOwner ? null : (m.contentBlocks ?? null),
      model: m.messageModel,
      stopReason: m.stopReason,
      usage: m.usage,
      redacted: m.redacted,
      timestamp: m.timestamp,
    })),
  });
}

/**
 * PATCH /api/threads/[slug] — Update thread (owner only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const [session, authError] = await requireAuth(request);
  if (authError) return authError;

  const threadRow = await findThread(slug);

  if (!threadRow || threadRow.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body: unknown = await request.json();
  const parsed = updateThreadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { visibility, title, tags, redactions } = parsed.data;

  const updates: Partial<typeof thread.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (visibility !== undefined) updates.visibility = visibility;
  if (title !== undefined) updates.title = title;
  if (tags !== undefined) updates.tags = tags;

  await db.update(thread).set(updates).where(eq(thread.id, threadRow.id));

  if (redactions && redactions.length > 0) {
    for (const r of redactions) {
      await db
        .update(message)
        .set({ redacted: r.redacted })
        .where(
          and(eq(message.id, r.message_id), eq(message.threadId, threadRow.id))
        );
    }

    // Recompute snapshot since redaction affects it
    const msgs = await db
      .select({
        role: message.role,
        content: message.content,
        contentBlocks: message.contentBlocks,
        redacted: message.redacted,
      })
      .from(message)
      .where(eq(message.threadId, threadRow.id))
      .orderBy(asc(message.ordinal));

    const snapshot = buildConversationSnapshot(msgs);
    await db
      .update(thread)
      .set({ conversationSnapshot: snapshot })
      .where(eq(thread.id, threadRow.id));
  }

  return NextResponse.json({ updated: true });
}

/**
 * PUT /api/threads/[slug] — Re-upload a session from the CLI (owner only)
 *
 * Accepts the same payload as POST /api/threads. Replaces all messages
 * and updates metadata. Bumps updatedAt. Preserves slug, visibility, tags,
 * and shares.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isCliRequest(request)) {
    return NextResponse.json(
      { error: "Re-upload is only available via the Replay CLI" },
      { status: 403 }
    );
  }

  const versionError = checkCliVersion(request);
  if (versionError) return versionError;

  const { slug } = await params;
  const [session, authError] = await requireAuth(request);
  if (authError) return authError;

  const threadRow = await findThread(slug);

  if (!threadRow || threadRow.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const compressed = Buffer.from(await request.arrayBuffer());
  const body: unknown = JSON.parse(gunzipSync(compressed).toString("utf-8"));
  const parsed = uploadThreadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { session: sessionData, messages: msgs } = parsed.data;

  // Derive title
  let title = sessionData.title ?? null;
  if (!title) {
    const firstUserMsg = msgs.find((m) => m.role === "user");
    if (firstUserMsg) {
      if ("content" in firstUserMsg && firstUserMsg.content) {
        title = extractTextFromBlocks(
          firstUserMsg.content as ContentBlock[]
        ).slice(0, 200);
      } else if ("text" in firstUserMsg && firstUserMsg.text) {
        title = firstUserMsg.text.slice(0, 200);
      }
    }
  }

  // Pre-process messages for insert and snapshot
  const processedMessages = msgs.map((m, i) => {
    let contentText: string;
    let contentBlocks: ContentBlock[] | null = null;

    if ("content" in m && m.content && Array.isArray(m.content)) {
      contentBlocks = m.content as ContentBlock[];
      contentText = extractTextFromBlocks(contentBlocks);
    } else if ("text" in m && m.text) {
      contentText = m.text;
    } else {
      contentText = "";
    }

    return { ordinal: i, role: m.role, contentText, contentBlocks, timestamp: m.timestamp, raw: m };
  });

  const conversationSnapshot = buildConversationSnapshot(
    processedMessages.map((m) => ({
      role: m.role,
      content: m.contentText,
      contentBlocks: m.contentBlocks,
      redacted: false,
    }))
  );

  // Update thread metadata (preserve visibility, tags, shares)
  await db
    .update(thread)
    .set({
      title: title || null,
      agent: sessionData.agent,
      model: sessionData.model ?? null,
      projectPath: sessionData.project_path ?? null,
      gitBranch: sessionData.git_branch ?? null,
      cliVersion: sessionData.cli_version ?? null,
      sessionTs: new Date(sessionData.timestamp),
      messageCount: msgs.length,
      conversationSnapshot,
      updatedAt: new Date(),
    })
    .where(eq(thread.id, threadRow.id));

  // Replace messages: delete old, insert new
  await db.delete(message).where(eq(message.threadId, threadRow.id));

  if (processedMessages.length > 0) {
    await db.insert(message).values(
      processedMessages.map((m) => ({
        threadId: threadRow.id,
        ordinal: m.ordinal,
        role: m.role,
        content: m.contentText,
        contentBlocks: m.contentBlocks ? JSON.stringify(m.contentBlocks) : null,
        messageModel: "model" in m.raw ? (m.raw.model ?? null) : null,
        stopReason: "stop_reason" in m.raw ? (m.raw.stop_reason ?? null) : null,
        usage: "usage" in m.raw && m.raw.usage ? JSON.stringify(m.raw.usage) : null,
        timestamp: new Date(m.timestamp),
      }))
    );
  }

  // Regenerate key points and verify/improve title in the background
  after(async () => {
    try {
      const textMessages = msgs.map((m) => ({
        role: m.role,
        content:
          "content" in m && m.content
            ? extractTextFromBlocks(m.content as ContentBlock[])
            : "text" in m
              ? (m.text ?? "")
              : "",
      }));

      const { keyPoints, improvedTitle } = await summarizeThread(
        title,
        textMessages
      );

      const updates: Partial<typeof thread.$inferInsert> = {
        keyPoints: keyPoints.length > 0 ? keyPoints : null,
      };
      if (improvedTitle) updates.title = improvedTitle;

      await db
        .update(thread)
        .set(updates)
        .where(eq(thread.id, threadRow.id));
    } catch {
      // Silent failure — key points are non-critical
    }
  });

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: session.user.id,
    event: "thread_reuploaded",
    properties: {
      thread_slug: threadRow.slug,
      agent: sessionData.agent,
      model: sessionData.model ?? null,
      message_count: msgs.length,
      cli_version: sessionData.cli_version ?? null,
    },
  });

  return NextResponse.json({
    id: threadRow.id,
    slug: threadRow.slug,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/t/${threadRow.slug}`,
    message_count: msgs.length,
    updated: true,
  });
}

/**
 * DELETE /api/threads/[slug] — Delete thread (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const [session, authError] = await requireAuth(request);
  if (authError) return authError;

  const threadRow = await findThread(slug);

  if (!threadRow || threadRow.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(thread).where(eq(thread.id, threadRow.id));

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: session.user.id,
    event: "thread_deleted",
    properties: {
      thread_slug: slug,
    },
  });

  return new NextResponse(null, { status: 204 });
}
