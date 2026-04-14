import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { decisionTrace } from "@/lib/db/schema";
import { THREAD_TOOLS, executeServerTool } from "./tools";
import { getPostHogClient } from "@/lib/posthog-server";

const client = new Anthropic();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TraceMoment = {
  kind: "moment" | "annotation";
  threadSlug?: string;
  threadTitle?: string;
  startOrdinal?: number;
  endOrdinal?: number;
  excerpt: string;
  annotation?: string;
};

export type ActivityEntry = {
  type: "search" | "read" | "moment" | "synthesize" | "done" | "info";
  text: string;
  ts: number;
};

export type TraceContent = {
  moments: TraceMoment[];
  resolution: string | null;
  activity: ActivityEntry[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function activity(type: ActivityEntry["type"], text: string): ActivityEntry {
  return { type, text, ts: Date.now() };
}

async function saveProgress(
  traceId: string,
  content: TraceContent
): Promise<void> {
  await db
    .update(decisionTrace)
    .set({ content, updatedAt: new Date() })
    .where(eq(decisionTrace.id, traceId));
}

/**
 * Wraps executeServerTool but truncates get_thread responses so we don't
 * blow up the agent's context window. Each message is capped at 300 chars,
 * and we return at most 40 messages.
 */
async function executeDiscoveryTool(
  name: string,
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const result = await executeServerTool(name, input, userId);

  if (name !== "get_thread") return result;

  try {
    const parsed = JSON.parse(result);
    if (parsed.messages) {
      const truncated = parsed.messages.slice(0, 40).map(
        (m: { ordinal: number; role: string; content: string; model?: string; timestamp?: string }) => ({
          ordinal: m.ordinal,
          role: m.role,
          content: m.content.length > 300 ? m.content.slice(0, 300) + "..." : m.content,
          timestamp: m.timestamp,
        })
      );
      const totalMessages = parsed.messages.length;
      return JSON.stringify({
        thread: parsed.thread,
        messages: truncated,
        _note: totalMessages > 40 ? `Showing 40 of ${totalMessages} messages. Use search_threads for targeted queries.` : undefined,
      });
    }
  } catch {
    // Return original if parsing fails
  }
  return result;
}

// ---------------------------------------------------------------------------
// Phase 1: Discovery agent
// ---------------------------------------------------------------------------

const DISCOVERY_TOOLS: Anthropic.Messages.Tool[] = [
  ...THREAD_TOOLS,
  {
    name: "emit_moment",
    description:
      "Record a relevant moment you found. Call this immediately when you find something relevant — don't wait.",
    input_schema: {
      type: "object" as const,
      properties: {
        threadSlug: {
          type: "string",
          description: "The slug of the thread this moment is from",
        },
        startOrdinal: {
          type: "number",
          description: "The ordinal of the first message in this moment",
        },
        endOrdinal: {
          type: "number",
          description: "The ordinal of the last message in this moment",
        },
        excerpt: {
          type: "string",
          description: "A concise excerpt capturing the key reasoning or decision (2-4 sentences)",
        },
      },
      required: ["threadSlug", "startOrdinal", "endOrdinal", "excerpt"],
    },
  },
];

function buildDiscoveryPrompt(question: string, projectPath?: string | null): string {
  return [
    "You are a research agent for replay.md. Search the user's AI coding conversation history and find moments relevant to a question.",
    "",
    `Question: "${question}"`,
    projectPath ? `Scope: Only search conversations from the project at: ${projectPath}` : "",
    "",
    "Process:",
    "1. Use list_threads to see what conversations exist.",
    "2. Use search_threads with different keywords related to the question.",
    "3. Use get_thread to read promising conversations (messages are truncated — use search for targeted lookups).",
    "4. Call emit_moment immediately when you find something relevant. Don't batch.",
    "5. Try multiple search angles: the technology, alternatives, constraints, outcomes.",
    "6. When you've done a thorough search, stop.",
    "",
    "Guidelines:",
    "- Emit moments one at a time as you find them.",
    "- Each excerpt: 2-4 sentences of the key reasoning.",
    "- Aim for 4-10 moments. Cast a wide net.",
    "- If you can't find anything relevant after searching, just stop. That's fine.",
    "- Do not output text responses — only use tools.",
  ].filter(Boolean).join("\n");
}

async function runDiscoveryAgent(
  traceId: string,
  userId: string,
  question: string,
  content: TraceContent,
  projectPath?: string | null
): Promise<TraceMoment[]> {
  const moments = content.moments;
  const systemPrompt = buildDiscoveryPrompt(question, projectPath);
  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: question },
  ];

  for (let i = 0; i < 20; i++) {
    let response: Anthropic.Messages.Message;
    try {
      response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: systemPrompt,
        tools: DISCOVERY_TOOLS,
        messages,
      });
    } catch (err) {
      // Context too long — stop discovery gracefully
      if (err instanceof Anthropic.APIError && err.status === 400) {
        content.activity.push(activity("info", "Reached context limit, moving to synthesis"));
        await saveProgress(traceId, content);
        break;
      }
      throw err;
    }

    if (response.stop_reason !== "tool_use") break;

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
    );

    messages.push({ role: "assistant", content: response.content });
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const input = toolUse.input as Record<string, unknown>;

      if (toolUse.name === "emit_moment") {
        const moment: TraceMoment = {
          kind: "moment",
          threadSlug: input.threadSlug as string,
          startOrdinal: input.startOrdinal as number,
          endOrdinal: input.endOrdinal as number,
          excerpt: input.excerpt as string,
        };

        // Look up thread title
        const threadResult = await executeServerTool("get_thread", { slug: moment.threadSlug }, userId);
        try {
          const parsed = JSON.parse(threadResult);
          if (parsed.thread?.title) moment.threadTitle = parsed.thread.title;
        } catch { /* ignore */ }

        moments.push(moment);
        content.activity.push(
          activity("moment", `Found moment in "${moment.threadTitle || moment.threadSlug}"`)
        );
        await saveProgress(traceId, content);

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify({ success: true, momentIndex: moments.length - 1 }),
        });
      } else if (toolUse.name === "search_threads") {
        content.activity.push(activity("search", `Searching: "${input.query}"`));
        await saveProgress(traceId, content);

        const result = await executeDiscoveryTool(toolUse.name, input, userId);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      } else if (toolUse.name === "get_thread") {
        content.activity.push(activity("read", `Reading thread: ${input.slug}`));
        await saveProgress(traceId, content);

        const result = await executeDiscoveryTool(toolUse.name, input, userId);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      } else {
        const result = await executeDiscoveryTool(toolUse.name, input, userId);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  return moments;
}

// ---------------------------------------------------------------------------
// Phase 2: Synthesis agent
// ---------------------------------------------------------------------------

async function runSynthesisAgent(
  traceId: string,
  question: string,
  rawMoments: TraceMoment[],
  content: TraceContent
): Promise<TraceContent> {
  content.activity.push(activity("synthesize", "Stitching moments into a narrative"));
  await saveProgress(traceId, content);

  const momentsDescription = rawMoments
    .map((m, i) => {
      const citation = m.threadSlug
        ? ` [from: ${m.threadTitle || m.threadSlug} #m${m.startOrdinal}-m${m.endOrdinal}]`
        : "";
      return `Moment ${i + 1}${citation}:\n${m.excerpt}`;
    })
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          `Question: "${question}"`,
          "",
          "Here are the raw moments discovered from the user's conversation history:",
          "",
          momentsDescription,
          "",
          "Your job:",
          "1. Reorder these moments into a coherent chronological narrative that answers the question.",
          "2. Add brief annotations where needed to connect moments or explain transitions between them.",
          "3. Remove any moments that are redundant or not actually relevant to the question.",
          "4. Write a resolution that directly answers the question based on the evidence.",
          "",
          "Output JSON only, no other text. Format:",
          '{ "moments": [{ "index": <original 1-based moment number>, "annotation": "<optional connecting context>" }, ...], "annotations": [{ "after_index": <1-based moment number to place this after>, "text": "<connecting context>" }], "resolution": "<2-4 sentence answer to the question>" }',
        ].join("\n"),
      },
    ],
  });

  const text = response.content[0];
  if (text.type !== "text") {
    return { ...content, resolution: null };
  }

  try {
    const jsonMatch = text.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ...content, resolution: null };

    const parsed = JSON.parse(jsonMatch[0]) as {
      moments: { index: number; annotation?: string }[];
      annotations?: { after_index: number; text: string }[];
      resolution: string;
    };

    const finalMoments: TraceMoment[] = [];

    for (const ref of parsed.moments) {
      const original = rawMoments[ref.index - 1];
      if (!original) continue;

      finalMoments.push({
        ...original,
        annotation: ref.annotation || original.annotation,
      });

      const annotation = parsed.annotations?.find((a) => a.after_index === ref.index);
      if (annotation) {
        finalMoments.push({ kind: "annotation", excerpt: annotation.text });
      }
    }

    content.activity.push(activity("done", "Trace complete"));

    const result: TraceContent = {
      moments: finalMoments,
      resolution: parsed.resolution || null,
      activity: content.activity,
    };

    await saveProgress(traceId, result);
    return result;
  } catch {
    content.activity.push(activity("done", "Trace complete"));
    return { ...content, resolution: null };
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function generateTrace(
  traceId: string,
  traceSlug: string,
  userId: string,
  question: string,
  projectPath?: string | null
): Promise<void> {
  const content: TraceContent = { moments: [], resolution: null, activity: [] };
  const posthog = getPostHogClient();
  const startedAt = Date.now();
  let discoveryMs = 0;
  let synthesisMs = 0;
  let phase: "discovery" | "synthesis" = "discovery";

  try {
    // Generate title
    try {
      const titleResponse = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 60,
        messages: [
          {
            role: "user",
            content: `Convert this question into a short, clean title (max 60 chars, no quotes, no punctuation at end, title case). Just output the title, nothing else.\n\nQuestion: "${question}"`,
          },
        ],
      });
      const titleText = titleResponse.content[0];
      if (titleText.type === "text" && titleText.text.trim()) {
        await db
          .update(decisionTrace)
          .set({ title: titleText.text.trim().slice(0, 60) })
          .where(eq(decisionTrace.id, traceId));
      }
    } catch { /* best-effort */ }

    content.activity.push(activity("search", "Starting discovery"));
    await saveProgress(traceId, content);

    // Phase 1: Discovery
    const discoveryStart = Date.now();
    const rawMoments = await runDiscoveryAgent(traceId, userId, question, content, projectPath);
    discoveryMs = Date.now() - discoveryStart;

    if (rawMoments.length === 0) {
      content.activity.push(activity("done", "No relevant conversations found"));
      await db
        .update(decisionTrace)
        .set({
          status: "complete",
          content: {
            moments: [],
            resolution: "No relevant conversations were found for this question. Try rephrasing, broadening the scope, or checking that the relevant threads have been uploaded.",
            activity: content.activity,
          } satisfies TraceContent,
          updatedAt: new Date(),
        })
        .where(eq(decisionTrace.id, traceId));
      posthog.capture({
        distinctId: userId,
        event: "trace_generation_completed",
        properties: {
          trace_slug: traceSlug,
          moment_count: 0,
          has_resolution: false,
          duration_ms: Date.now() - startedAt,
          discovery_ms: discoveryMs,
          synthesis_ms: 0,
        },
      });
      return;
    }

    // Phase 2: Synthesis
    phase = "synthesis";
    const synthesisStart = Date.now();
    const finalContent = await runSynthesisAgent(traceId, question, rawMoments, content);
    synthesisMs = Date.now() - synthesisStart;

    await db
      .update(decisionTrace)
      .set({
        status: "complete",
        content: finalContent,
        updatedAt: new Date(),
      })
      .where(eq(decisionTrace.id, traceId));

    posthog.capture({
      distinctId: userId,
      event: "trace_generation_completed",
      properties: {
        trace_slug: traceSlug,
        moment_count: finalContent.moments.filter((m) => m.kind === "moment").length,
        has_resolution: !!finalContent.resolution,
        duration_ms: Date.now() - startedAt,
        discovery_ms: discoveryMs,
        synthesis_ms: synthesisMs,
      },
    });
  } catch (err) {
    console.error("Trace generation failed:", err);
    content.activity.push(activity("info", "Generation encountered an error"));
    await db
      .update(decisionTrace)
      .set({
        status: "failed",
        content: content.moments.length > 0 ? content : null,
        updatedAt: new Date(),
      })
      .where(eq(decisionTrace.id, traceId));

    posthog.capture({
      distinctId: userId,
      event: "trace_generation_failed",
      properties: {
        trace_slug: traceSlug,
        phase,
        error_kind: err instanceof Error ? err.constructor.name : "unknown",
      },
    });
  }
}
