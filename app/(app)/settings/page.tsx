import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) redirect("/login");

  return (
    <SettingsClient
      initialUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
        username:
          ((session.user as Record<string, unknown>).username as string | null) ??
          null,
      }}
    />
  );
}
