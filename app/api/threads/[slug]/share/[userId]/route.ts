import { type NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread, threadShare } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth-helpers";

/**
 * DELETE /api/threads/[slug]/share/[userId] — Revoke share
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const { slug, userId } = await params;
  const [session, authError] = await requireAuth(request);
  if (authError) return authError;

  const threadRow = await db
    .select()
    .from(thread)
    .where(eq(thread.slug, slug))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!threadRow || threadRow.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(threadShare)
    .where(
      and(eq(threadShare.threadId, threadRow.id), eq(threadShare.userId, userId))
    );

  return new NextResponse(null, { status: 204 });
}
