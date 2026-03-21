import { type NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-helpers";
import { usernameSchema } from "@/lib/validations";
import { db } from "@/lib/db";

/**
 * GET /api/username/available?username=foo — Check username availability
 */
export async function GET(request: NextRequest) {
  const [, authError] = await requireAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const username = url.searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "Username query parameter is required" },
      { status: 400 }
    );
  }

  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }

  const existing = await db.execute<{ id: string }>(
    sql`SELECT id FROM "user" WHERE LOWER(username) = ${parsed.data.toLowerCase()} LIMIT 1`
  );

  return NextResponse.json({
    available: !existing.rows || existing.rows.length === 0,
  });
}
