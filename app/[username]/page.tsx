import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread, threadStar } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { getOrBackfillSnapshots } from "@/lib/thread-snapshot";
import { Nav } from "@/app/components/nav";
import { Assistant } from "@/app/components/assistant";
import { PageReveal } from "@/app/components/page-reveal";
import { ProfileThreads } from "./client";
import { fetchEcgData } from "@/lib/ecg-data";
import { EcgChart } from "./ecg-chart";

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

      keyPoints: thread.keyPoints,
      agent: thread.agent,
      model: thread.model,
      starCount: thread.starCount,
      conversationSnapshot: thread.conversationSnapshot,
      messageCount: thread.messageCount,
      sessionTs: thread.sessionTs,
      createdAt: thread.createdAt,
    })
    .from(thread)
    .where(and(eq(thread.ownerId, user.id), eq(thread.visibility, "public")))
    .orderBy(desc(thread.createdAt))
    .limit(50);

  // Get ECG activity data
  const ecgData = await fetchEcgData(user.id);

  // Check if visitor is authenticated (for AI button + stars)
  let isAuthenticated = false;
  let isSelf = false;
  let starredSlugs = new Set<string>();
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    isAuthenticated = !!session;
    isSelf = session?.user.id === user.id;

    if (session && threads.length > 0) {
      const threadIds = threads.map((t) => t.id);
      const stars = await db
        .select({ threadId: threadStar.threadId })
        .from(threadStar)
        .where(
          and(
            eq(threadStar.userId, session.user.id),
            inArray(threadStar.threadId, threadIds)
          )
        );
      const starredIds = new Set(stars.map((s) => s.threadId));
      starredSlugs = new Set(
        threads.filter((t) => starredIds.has(t.id)).map((t) => t.slug)
      );
    }
  } catch {}

  const snapshots = await getOrBackfillSnapshots(threads);
  const profileThreads = threads.map((t) => ({
    ...t,
    sessionTs: t.sessionTs.toISOString(),
    starred: starredSlugs.has(t.slug),
    conversationSnapshot: snapshots.get(t.id) ?? [{ kind: "assistant" as const, weight: 1 }],
  }));

  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main className="flex-1 px-6 pt-24 pb-20">
        <div className="mx-auto max-w-3xl">
          {/* Profile header */}
          <PageReveal>
            <div className="flex items-center gap-4">
              {user.image && (
                <Image
                  src={user.image}
                  alt={`${user.name} avatar`}
                  width={48}
                  height={48}
                  className="size-12 rounded-[4px] border border-border object-cover"
                />
              )}
              <div className="min-w-0 shrink-0">
                <h1 className="text-[21px] font-medium text-fg">
                  {user.name}
                </h1>
                <p className="text-[13px] text-fg-ghost">@{user.username}</p>
              </div>
              {ecgData.some((d) => d.count > 0) && (
                <div className="ml-auto min-w-0 flex-1 mr-0.5">
                  <EcgChart data={ecgData} />
                </div>
              )}
            </div>
          </PageReveal>

          {/* Threads */}
          <PageReveal delay={80}>
            <div className="mt-10">
              <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
                Public threads
              </p>

              <ProfileThreads
                threads={profileThreads}
                profileName={user.name}
                profileUsername={user.username}
                isAuthenticated={isAuthenticated}
                isSelf={isSelf}
              />
            </div>
          </PageReveal>
        </div>
      </main>
      {isAuthenticated && <Assistant />}
    </div>
  );
}
