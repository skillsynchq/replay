import { type NextRequest, NextResponse } from "next/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread } from "@/lib/db/schema";

/**
 * GET /api/users/[username] — Public profile with public threads
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  // Find user by username
  const users = await db.execute<{
    id: string;
    name: string;
    username: string;
    image: string | null;
  }>(sql`SELECT id, name, username, image FROM "user" WHERE LOWER(username) = ${username.toLowerCase()} LIMIT 1`);

  const user = users.rows?.[0];

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get their public threads
  const threads = await db
    .select({
      id: thread.id,
      slug: thread.slug,
      title: thread.title,
      agent: thread.agent,
      model: thread.model,
      messageCount: thread.messageCount,
      sessionTs: thread.sessionTs,
      createdAt: thread.createdAt,
    })
    .from(thread)
    .where(
      and(eq(thread.ownerId, user.id), eq(thread.visibility, "public"))
    )
    .orderBy(desc(thread.createdAt))
    .limit(50);

  return NextResponse.json({
    user: {
      name: user.name,
      username: user.username,
      image: user.image,
    },
    threads,
  });
}
