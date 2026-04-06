import { NextResponse } from "next/server";
import { auth, type Session } from "@/lib/auth";

const UNAUTHORIZED = NextResponse.json(
  { error: "Unauthorized" },
  { status: 401 }
);

/**
 * Minimum CLI version the server will accept.
 * Bump this when a breaking change requires clients to update.
 */
const MIN_CLI_VERSION = "0.3.0";

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

/**
 * Compare two semver version strings (x.y.z).
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Check that a CLI request meets the minimum version requirement.
 * Returns a 426 NextResponse if the client version is missing or too old,
 * or null if the version is acceptable.
 *
 * Call this on routes that require `isCliRequest(request) === true`.
 */
export function checkCliVersion(request: Request): NextResponse | null {
  const clientVersion = request.headers.get("x-client-version");

  if (!clientVersion || compareSemver(clientVersion, MIN_CLI_VERSION) < 0) {
    return NextResponse.json(
      {
        error: "client_upgrade_required",
        min_version: MIN_CLI_VERSION,
        message: `Your CLI is outdated. Please update to v${MIN_CLI_VERSION} or later.`,
      },
      { status: 426 }
    );
  }

  return null;
}
