import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGlobalConfig, type DecisionTracesConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { decisionTrace } from "@/lib/db/schema";
import type { TraceContent } from "@/lib/ai/generate-trace";
import { TraceView } from "@/app/components/traces/trace-view";
import { TraceGenerating } from "@/app/components/traces/trace-generating";

export default async function TraceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const cfg = await getGlobalConfig<DecisionTracesConfig>("decision_traces");
  if (!cfg.enabled) notFound();

  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) notFound();

  const { slug } = await params;

  const rows = await db
    .select()
    .from(decisionTrace)
    .where(
      and(
        eq(decisionTrace.slug, slug),
        eq(decisionTrace.ownerId, session.user.id)
      )
    )
    .limit(1);

  const trace = rows[0];
  if (!trace) notFound();

  const content = trace.content as TraceContent | null;

  if (trace.status === "complete" && content) {
    return (
      <TraceView
        question={trace.question}
        title={trace.title}
        content={content}
        slug={trace.slug}
        status="complete"
        isOwner
      />
    );
  }

  return (
    <TraceGenerating
      slug={trace.slug}
      question={trace.question}
      initialTitle={trace.title}
      initialContent={content}
    />
  );
}
