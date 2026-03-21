import { notFound } from "next/navigation";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread } from "@/lib/db/schema";
import { Nav } from "@/app/components/nav";
import { ThreadCard } from "@/app/components/thread-card";
import { PageReveal } from "@/app/components/page-reveal";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  // Find user
  const userRows = await db.execute<{
    id: string;
    name: string;
    username: string;
    image: string | null;
  }>(
    sql`SELECT id, name, username, image FROM "user" WHERE LOWER(username) = ${username.toLowerCase()} LIMIT 1`
  );

  const user = userRows.rows?.[0];
  if (!user) notFound();

  // Get public threads
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
    .where(and(eq(thread.ownerId, user.id), eq(thread.visibility, "public")))
    .orderBy(desc(thread.createdAt))
    .limit(50);

  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main className="flex-1 px-6 pt-24 pb-20">
        <div className="mx-auto max-w-3xl">
          {/* Profile header */}
          <PageReveal>
            <div className="flex items-center gap-4">
              {user.image && (
                <img
                  src={user.image}
                  alt=""
                  className="size-12 rounded-[4px] border border-border"
                />
              )}
              <div>
                <h1 className="text-[21px] font-medium text-fg">
                  {user.name}
                </h1>
                <p className="text-[13px] text-fg-ghost">@{user.username}</p>
              </div>
            </div>
          </PageReveal>

          {/* Threads */}
          <PageReveal delay={80}>
            <div className="mt-10">
              <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
                Public threads
              </p>

              {threads.length === 0 ? (
                <p className="mt-6 text-[13px] text-fg-ghost">
                  No public threads yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {threads.map((t) => (
                    <ThreadCard
                      key={t.id}
                      slug={t.slug}
                      title={t.title}
                      agent={t.agent}
                      model={t.model}
                      messageCount={t.messageCount}
                      sessionTs={t.sessionTs.toISOString()}
                    />
                  ))}
                </div>
              )}
            </div>
          </PageReveal>
        </div>
      </main>
    </div>
  );
}
