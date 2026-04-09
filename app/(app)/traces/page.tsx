import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGlobalConfig, type DecisionTracesConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { decisionTrace, thread } from "@/lib/db/schema";
import { TraceInput } from "@/app/components/traces/trace-input";
import { TraceList } from "@/app/components/traces/trace-list";

export default async function TracesPage() {
  const cfg = await getGlobalConfig<DecisionTracesConfig>("decision_traces");
  if (!cfg.enabled) notFound();

  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) notFound();

  const [traces, projectPathRows] = await Promise.all([
    db
      .select({
        id: decisionTrace.id,
        slug: decisionTrace.slug,
        question: decisionTrace.question,
        title: decisionTrace.title,
        projectPath: decisionTrace.projectPath,
        status: decisionTrace.status,
        createdAt: decisionTrace.createdAt,
      })
      .from(decisionTrace)
      .where(eq(decisionTrace.ownerId, session.user.id))
      .orderBy(desc(decisionTrace.createdAt)),
    db
      .selectDistinct({ projectPath: thread.projectPath })
      .from(thread)
      .where(eq(thread.ownerId, session.user.id))
      .then((rows) =>
        rows
          .map((r) => r.projectPath)
          .filter((p): p is string => p != null)
          .sort()
      ),
  ]);

  const serializedTraces = traces.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div>
      <TraceInput projectPaths={projectPathRows} />
      <TraceList initialTraces={serializedTraces} />
    </div>
  );
}
