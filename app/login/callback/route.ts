import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isLocalhostRedirect } from "@/lib/auth-helpers";

interface CliAuthContext {
  redirect_uri: string;
  state: string;
}

function parseCliAuthContext(
  request: NextRequest
): CliAuthContext | null {
  const cookie = request.cookies.get("cli_auth_context");
  if (!cookie) return null;

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(cookie.value));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "redirect_uri" in parsed &&
      "state" in parsed &&
      typeof (parsed as CliAuthContext).redirect_uri === "string" &&
      typeof (parsed as CliAuthContext).state === "string"
    ) {
      return parsed as CliAuthContext;
    }
    return null;
  } catch {
    return null;
  }
}

function getSessionTokenFromCookies(request: NextRequest): string | null {
  // better-auth stores the session token in a cookie named "better-auth.session_token"
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");
  return sessionCookie?.value ?? null;
}

export async function GET(request: NextRequest) {
  // Verify the user is authenticated
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check for CLI auth context
  const cliContext = parseCliAuthContext(request);

  if (cliContext) {
    // Validate redirect_uri is localhost only — prevents open redirect attacks
    if (!isLocalhostRedirect(cliContext.redirect_uri)) {
      return new NextResponse("Invalid redirect URI", { status: 400 });
    }

    // Get the session token to pass to the CLI
    const sessionToken = getSessionTokenFromCookies(request);
    if (!sessionToken) {
      return new NextResponse("Session token not found", { status: 500 });
    }

    // Build the redirect URL for the CLI's localhost callback
    const target = new URL(cliContext.redirect_uri);
    target.searchParams.set("token", sessionToken);
    target.searchParams.set("state", cliContext.state);

    // Clear the CLI auth context cookie and redirect
    const response = NextResponse.redirect(target.toString());
    response.cookies.delete("cli_auth_context");
    return response;
  }

  // Normal web login — redirect to dashboard
  return NextResponse.redirect(new URL("/", request.url));
}
