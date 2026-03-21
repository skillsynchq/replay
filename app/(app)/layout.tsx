import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Nav } from "@/app/components/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main className="flex-1 px-6 pt-24 pb-20">{children}</main>
    </div>
  );
}
