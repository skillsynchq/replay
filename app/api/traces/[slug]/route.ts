import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { decisionTrace } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth-helpers";
import { getGlobalConfig, type DecisionTracesConfig } from "@/lib/config";
import { getPostHogClient } from "@/lib/posthog-server";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  const cfg = await getGlobalConfig<DecisionTracesConfig>("decision_traces");
  if (!cfg.enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [session, errorResponse] = await requireAuth(request);
  if (errorResponse) return errorResponse;

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
  if (!trace) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    trace: {
      id: trace.id,
      slug: trace.slug,
      question: trace.question,
      title: trace.title,
      projectPath: trace.projectPath,
      status: trace.status,
      content: trace.content,
      createdAt: trace.createdAt,
      updatedAt: trace.updatedAt,
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  const [session, errorResponse] = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { slug } = await params;

  const deleted = await db
    .delete(decisionTrace)
    .where(
      and(
        eq(decisionTrace.slug, slug),
        eq(decisionTrace.ownerId, session.user.id)
      )
    )
    .returning({ status: decisionTrace.status });

  if (deleted[0]) {
    getPostHogClient().capture({
      distinctId: session.user.id,
      event: "trace_deleted",
      properties: {
        trace_slug: slug,
        status_at_delete: deleted[0].status,
      },
    });
  }

  return new Response(null, { status: 204 });
}
