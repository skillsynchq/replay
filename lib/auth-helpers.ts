import { NextResponse } from "next/server";
import { auth, type Session } from "@/lib/auth";

const UNAUTHORIZED = NextResponse.json(
  { error: "Unauthorized" },
  { status: 401 }
);

/**
 * Require authentication. Returns the session or a 401 NextResponse.
 *
 * Usage in route handlers:
 * ```ts
 * const [session, errorResponse] = await requireAuth(request);
 * if (errorResponse) return errorResponse;
 * // session is guaranteed non-null here
 * ```
 */
export async function requireAuth(
  request: Request
): Promise<[Session, null] | [null, NextResponse]> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return [null, UNAUTHORIZED];
  }

  return [session, null];
}

/**
 * Optionally get the session. Returns null if not authenticated.
 */
export async function getOptionalSession(
  request: Request
): Promise<Session | null> {
  return auth.api.getSession({
    headers: request.headers,
  });
}

/**
 * Validate that a redirect URI is a safe localhost URL (for CLI auth flow).
 * Only allows http://localhost:* and http://127.0.0.1:*
 */
export function isLocalhostRedirect(uri: string): boolean {
  try {
    const url = new URL(uri);
    const hostname = url.hostname;
    return (
      (hostname === "localhost" || hostname === "127.0.0.1") &&
      url.protocol === "http:"
    );
  } catch {
    return false;
  }
}

/**
 * Validate that a request comes from the CLI.
 * Checks for the X-Replay-Client header.
 */
export function isCliRequest(request: Request): boolean {
  return request.headers.get("x-replay-client") === "cli";
}
