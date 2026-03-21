import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { NavClient } from "./nav-client";

export async function Nav() {
  let user: { name: string; image: string | null; username: string | null } | null = null;

  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (session) {
      user = {
        name: session.user.name,
        image: session.user.image ?? null,
        username: (session.user as Record<string, unknown>).username as string | null ?? null,
      };
    }
  } catch {
    // Not authenticated or headers unavailable (static page)
  }

  return <NavClient user={user} />;
}
