import type { ReactNode } from "react";
import { Nav } from "@/app/components/nav";
import { Footer } from "@/app/components/footer";

export default function DocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div id="top" className="flex min-h-dvh flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
