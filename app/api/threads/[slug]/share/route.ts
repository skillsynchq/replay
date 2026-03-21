import { type NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread, threadShare } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth-helpers";
import { shareThreadSchema } from "@/lib/validations";

/**
 * POST /api/threads/[slug]/share — Share a thread with a user by username
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
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

  const body: unknown = await request.json();
  const parsed = shareThreadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // Find the target user by username using better-auth's user table
  // better-auth uses a "user" table — query it directly via drizzle
  const targetUsers = await db.execute<{
    id: string;
    name: string;
    username: string;
  }>(sql`SELECT id, name, username FROM "user" WHERE username = ${parsed.data.username} LIMIT 1`);

  const targetUser = targetUsers.rows?.[0];

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetUser.id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot share with yourself" },
      { status: 400 }
    );
  }

  // Check if already shared
  const existing = await db
    .select({ id: threadShare.id })
    .from(threadShare)
    .where(
      and(
        eq(threadShare.threadId, threadRow.id),
        eq(threadShare.userId, targetUser.id)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Already shared with this user" },
      { status: 409 }
    );
  }

  await db.insert(threadShare).values({
    threadId: threadRow.id,
    userId: targetUser.id,
  });

  // If thread is private, upgrade to shared
  if (threadRow.visibility === "private") {
    await db
      .update(thread)
      .set({ visibility: "shared", updatedAt: new Date() })
      .where(eq(thread.id, threadRow.id));
  }

  return NextResponse.json(
    {
      shared_with: {
        username: targetUser.username,
        name: targetUser.name,
      },
    },
    { status: 201 }
  );
}
