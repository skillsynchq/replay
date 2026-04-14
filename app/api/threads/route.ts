import { type NextRequest, NextResponse, after } from "next/server";
import { gunzipSync } from "node:zlib";
import { nanoid } from "nanoid";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread, message } from "@/lib/db/schema";
import { requireAuth, isCliRequest, checkCliVersion } from "@/lib/auth-helpers";
import {
  uploadThreadSchema,
  extractTextFromBlocks,
  type ContentBlock,
} from "@/lib/validations";
import { summarizeThread } from "@/lib/ai/summarize-thread";
import { buildConversationSnapshot } from "@/lib/thread-snapshot";
import { getPostHogClient } from "@/lib/posthog-server";

/**
 * POST /api/threads — Upload a thread from the CLI
 */
export async function POST(request: NextRequest) {
  if (!isCliRequest(request)) {
    return NextResponse.json(
      { error: "Threads can only be uploaded via the Replay CLI" },
      { status: 403 }
    );
  }

  const versionError = checkCliVersion(request);
  if (versionError) return versionError;

  const [session, authError] = await requireAuth(request);
  if (authError) return authError;

  const compressed = Buffer.from(await request.arrayBuffer());
  const body: unknown = JSON.parse(gunzipSync(compressed).toString("utf-8"));
  const parsed = uploadThreadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { session: sessionData, messages } = parsed.data;

  // Check for duplicate upload
  const existing = await db
    .select({ slug: thread.slug })
    .from(thread)
    .where(
      and(
        eq(thread.ownerId, session.user.id),
        eq(thread.sessionId, sessionData.id)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      {
        error: "Session already uploaded",
        slug: existing[0].slug,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/t/${existing[0].slug}`,
      },
      { status: 409 }
    );
  }

  const slug = nanoid(10);

  // Derive title: use session title, or extract from first user message
  let title = sessionData.title ?? null;
  if (!title) {
    const firstUserMsg = messages.find((m) => m.role === "user");
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
  const processedMessages = messages.map((m, i) => {
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

  // Insert thread
  const [inserted] = await db
    .insert(thread)
    .values({
      ownerId: session.user.id,
      ownerType: "user",
      slug,
      visibility: "private",
      title: title || null,
      agent: sessionData.agent,
      model: sessionData.model ?? null,
      sessionId: sessionData.id,
      projectPath: sessionData.project_path ?? null,
      gitBranch: sessionData.git_branch ?? null,
      cliVersion: sessionData.cli_version ?? null,
      sessionTs: new Date(sessionData.timestamp),
      messageCount: messages.length,
      conversationSnapshot,
    })
    .returning({ id: thread.id, slug: thread.slug });

  // Insert messages
  if (processedMessages.length > 0) {
    await db.insert(message).values(
      processedMessages.map((m) => ({
        threadId: inserted.id,
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

  // Generate key points and verify/improve title in the background
  after(async () => {
    try {
      const textMessages = messages.map((m) => ({
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

      const updates: Partial<typeof thread.$inferInsert> = {};
      if (keyPoints.length > 0) updates.keyPoints = keyPoints;
      if (improvedTitle) updates.title = improvedTitle;

      if (Object.keys(updates).length > 0) {
        await db
          .update(thread)
          .set(updates)
          .where(eq(thread.id, inserted.id));
      }
    } catch {
      // Silent failure — key points are non-critical
    }
  });

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: session.user.id,
    event: "thread_uploaded",
    properties: {
      thread_slug: inserted.slug,
      agent: sessionData.agent,
      model: sessionData.model ?? null,
      message_count: messages.length,
      cli_version: sessionData.cli_version ?? null,
    },
  });

  return NextResponse.json(
    {
      id: inserted.id,
      slug: inserted.slug,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/t/${inserted.slug}`,
      visibility: "private" as const,
      message_count: messages.length,
    },
    { status: 201 }
  );
}

/**
 * GET /api/threads — List authenticated user's threads
 */
export async function GET(request: NextRequest) {
  const [session, authError] = await requireAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get("limit") ?? "20"))
  );
  const visibility = url.searchParams.get("visibility");
  const offset = (page - 1) * limit;

  const conditions = [eq(thread.ownerId, session.user.id)];
  if (
    visibility &&
    ["private", "shared", "unlisted", "public"].includes(visibility)
  ) {
    conditions.push(eq(thread.visibility, visibility));
  }

  const where = and(...conditions);

  const [threads, countResult] = await Promise.all([
    db
      .select({
        id: thread.id,
        slug: thread.slug,
        title: thread.title,
        agent: thread.agent,
        model: thread.model,
        visibility: thread.visibility,
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

  return NextResponse.json({
    threads,
    total: countResult[0].count,
    page,
    limit,
  });
}
