import { type NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread, message } from "@/lib/db/schema";
import { requireAuth, isCliRequest } from "@/lib/auth-helpers";
import { uploadThreadSchema } from "@/lib/validations";

/**
 * POST /api/threads — Upload a thread from the CLI
 */
export async function POST(request: NextRequest) {
  // Only allow uploads from the CLI
  if (!isCliRequest(request)) {
    return NextResponse.json(
      { error: "Threads can only be uploaded via the Replay CLI" },
      { status: 403 }
    );
  }

  const [session, authError] = await requireAuth(request);
  if (authError) return authError;

  const body: unknown = await request.json();
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
  const title =
    messages.find((m) => m.role === "user")?.text.slice(0, 200) ?? null;

  // Insert thread and messages
  const [inserted] = await db
    .insert(thread)
    .values({
      ownerId: session.user.id,
      ownerType: "user",
      slug,
      visibility: "private",
      title,
      agent: sessionData.agent,
      model: sessionData.model ?? null,
      sessionId: sessionData.id,
      projectPath: sessionData.project_path ?? null,
      gitBranch: sessionData.git_branch ?? null,
      sessionTs: new Date(sessionData.timestamp),
      messageCount: messages.length,
    })
    .returning({ id: thread.id, slug: thread.slug });

  if (messages.length > 0) {
    await db.insert(message).values(
      messages.map((m, i) => ({
        threadId: inserted.id,
        ordinal: i,
        role: m.role,
        content: m.text,
        timestamp: new Date(m.timestamp),
      }))
    );
  }

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
