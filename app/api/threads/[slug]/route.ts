import { type NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread, message, threadShare } from "@/lib/db/schema";
import { requireAuth, getOptionalSession } from "@/lib/auth-helpers";
import { updateThreadSchema } from "@/lib/validations";

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
      messageCount: threadRow.messageCount,
      sessionTs: threadRow.sessionTs,
      createdAt: threadRow.createdAt,
    },
    messages: messages.map((m) => ({
      id: m.id,
      ordinal: m.ordinal,
      role: m.role,
      content: m.redacted && !isOwner ? "" : m.content,
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

  const { visibility, title, redactions } = parsed.data;

  const updates: Partial<typeof thread.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (visibility !== undefined) updates.visibility = visibility;
  if (title !== undefined) updates.title = title;

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
  }

  return NextResponse.json({ updated: true });
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

  return new NextResponse(null, { status: 204 });
}
