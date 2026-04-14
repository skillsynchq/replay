import { type NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-helpers";
import { auth } from "@/lib/auth";
import { usernameSchema } from "@/lib/validations";
import { db } from "@/lib/db";
import { getPostHogClient } from "@/lib/posthog-server";

/**
 * GET /api/users/me — Get current user profile
 */
export async function GET(request: NextRequest) {
  const [session, authError] = await requireAuth(request);
  if (authError) return authError;

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      username: (session.user as Record<string, unknown>).username ?? null,
    },
  });
}

/**
 * PATCH /api/users/me — Update username
 */
export async function PATCH(request: NextRequest) {
  const [session, authError] = await requireAuth(request);
  if (authError) return authError;

  const body = (await request.json()) as { username?: string };

  if (!body.username) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  const parsed = usernameSchema.safeParse(body.username);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid username", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const username = parsed.data.toLowerCase();

  const existing = await db.execute<{ id: string }>(
    sql`SELECT id FROM "user" WHERE LOWER(username) = ${username} AND id != ${session.user.id} LIMIT 1`
  );

  if (existing.rows && existing.rows.length > 0) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 409 }
    );
  }

  const previousUsername = (session.user as Record<string, unknown>).username as string | null;

  await auth.api.updateUser({
    headers: request.headers,
    body: { username },
  });

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: session.user.id,
    event: "username_claimed",
    properties: {
      username,
      is_first_time: !previousUsername,
    },
  });
  posthog.identify({
    distinctId: session.user.id,
    properties: { username },
  });

  return NextResponse.json({ username });
}
