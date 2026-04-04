import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread, threadStar } from "@/lib/db/schema";
import { requireAuth, getOptionalSession } from "@/lib/auth-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await getOptionalSession(request);

  const rows = await db
    .select({ id: thread.id, starCount: thread.starCount })
    .from(thread)
    .where(eq(thread.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let starred = false;
  if (session) {
    const stars = await db
      .select({ id: threadStar.id })
      .from(threadStar)
      .where(
        and(
          eq(threadStar.threadId, row.id),
          eq(threadStar.userId, session.user.id)
        )
      )
      .limit(1);
    starred = stars.length > 0;
  }

  return NextResponse.json({ starred, starCount: row.starCount });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const [session, authError] = await requireAuth(request);
  if (authError) return authError;

  const { slug } = await params;

  const rows = await db
    .select({ id: thread.id, starCount: thread.starCount })
    .from(thread)
    .where(eq(thread.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await db
    .select({ id: threadStar.id })
    .from(threadStar)
    .where(
      and(
        eq(threadStar.threadId, row.id),
        eq(threadStar.userId, session.user.id)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(threadStar)
      .where(
        and(
          eq(threadStar.threadId, row.id),
          eq(threadStar.userId, session.user.id)
        )
      );
    await db
      .update(thread)
      .set({ starCount: sql`GREATEST(${thread.starCount} - 1, 0)` })
      .where(eq(thread.id, row.id));

    return NextResponse.json({
      starred: false,
      starCount: Math.max(row.starCount - 1, 0),
    });
  }

  await db.insert(threadStar).values({
    threadId: row.id,
    userId: session.user.id,
  });
  await db
    .update(thread)
    .set({ starCount: sql`${thread.starCount} + 1` })
    .where(eq(thread.id, row.id));

  return NextResponse.json({
    starred: true,
    starCount: row.starCount + 1,
  });
}
