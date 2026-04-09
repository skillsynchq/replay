import { NextResponse, after } from "next/server";
import { nanoid } from "nanoid";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { decisionTrace } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth-helpers";
import { getGlobalConfig, type DecisionTracesConfig } from "@/lib/config";
import { generateTrace } from "@/lib/ai/generate-trace";

export async function GET(request: Request) {
  const cfg = await getGlobalConfig<DecisionTracesConfig>("decision_traces");
  if (!cfg.enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [session, errorResponse] = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const traces = await db
    .select({
      id: decisionTrace.id,
      slug: decisionTrace.slug,
      question: decisionTrace.question,
      projectPath: decisionTrace.projectPath,
      status: decisionTrace.status,
      createdAt: decisionTrace.createdAt,
      updatedAt: decisionTrace.updatedAt,
    })
    .from(decisionTrace)
    .where(eq(decisionTrace.ownerId, session.user.id))
    .orderBy(desc(decisionTrace.createdAt));

  return NextResponse.json({ traces });
}

export async function POST(request: Request) {
  const cfg = await getGlobalConfig<DecisionTracesConfig>("decision_traces");
  if (!cfg.enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [session, errorResponse] = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { question, projectPath } = body as {
    question?: string;
    projectPath?: string;
  };

  if (!question || question.trim().length === 0) {
    return NextResponse.json(
      { error: "Question is required" },
      { status: 400 }
    );
  }

  if (question.length > 500) {
    return NextResponse.json(
      { error: "Question must be 500 characters or less" },
      { status: 400 }
    );
  }

  const slug = nanoid(10);
  const userId = session.user.id;

  const [inserted] = await db
    .insert(decisionTrace)
    .values({
      ownerId: userId,
      slug,
      question: question.trim(),
      projectPath: projectPath || null,
      status: "generating",
    })
    .returning({ id: decisionTrace.id, slug: decisionTrace.slug });

  // Fire-and-forget background generation
  after(async () => {
    await generateTrace(inserted.id, userId, question.trim(), projectPath);
  });

  return NextResponse.json(
    { id: inserted.id, slug: inserted.slug },
    { status: 201 }
  );
}
