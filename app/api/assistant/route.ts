import Anthropic from "@anthropic-ai/sdk";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread, message } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth-helpers";

const client = new Anthropic();

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "search_threads",
    description:
      "Search across the user's conversation threads using a text query. " +
      "This runs against the same search index the user sees in the search bar. " +
      "Returns matching threads with snippet excerpts showing where the query matched.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query to find relevant conversations",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_thread",
    description:
      "Open and read a specific conversation thread by its slug. " +
      "Returns the full thread metadata and all messages, just like when the user opens a conversation.",
    input_schema: {
      type: "object" as const,
      properties: {
        slug: {
          type: "string",
          description: "The thread slug identifier",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "list_threads",
    description:
      "List the user's conversation threads with optional filters. " +
      "Returns thread metadata (title, agent, model, tags, message count, date). " +
      "Use this to browse or get an overview of the user's conversations.",
    input_schema: {
      type: "object" as const,
      properties: {
        agent: {
          type: "string",
          description: "Filter by agent (e.g. 'claude-code', 'chatgpt', 'cursor')",
        },
        model: {
          type: "string",
          description: "Filter by model name",
        },
        limit: {
          type: "number",
          description: "Maximum number of threads to return (default 20, max 50)",
        },
        offset: {
          type: "number",
          description: "Number of threads to skip for pagination (default 0)",
        },
      },
      required: [],
    },
  },
];

/** Tools that the client resolves via FlexSearch */
const CLIENT_TOOLS = new Set(["search_threads"]);

// ---------------------------------------------------------------------------
// Server-side tool execution
// ---------------------------------------------------------------------------

async function executeServerTool(
  name: string,
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  switch (name) {
    case "get_thread": {
      const slug = input.slug as string;
      const rows = await db
        .select()
        .from(thread)
        .where(and(eq(thread.slug, slug), eq(thread.ownerId, userId)))
        .limit(1);

      const threadRow = rows[0];
      if (!threadRow) return JSON.stringify({ error: "Thread not found" });

      const messages = await db
        .select({
          ordinal: message.ordinal,
          role: message.role,
          content: message.content,
          model: message.messageModel,
          timestamp: message.timestamp,
        })
        .from(message)
        .where(eq(message.threadId, threadRow.id))
        .orderBy(asc(message.ordinal));

      return JSON.stringify({
        thread: {
          slug: threadRow.slug,
          title: threadRow.title,
          agent: threadRow.agent,
          model: threadRow.model,
          visibility: threadRow.visibility,
          projectPath: threadRow.projectPath,
          gitBranch: threadRow.gitBranch,
          tags: threadRow.tags,
          keyPoints: threadRow.keyPoints,
          messageCount: threadRow.messageCount,
          sessionTs: threadRow.sessionTs,
        },
        messages: messages.map((m) => ({
          ordinal: m.ordinal,
          role: m.role,
          content: m.content,
          model: m.model,
          timestamp: m.timestamp,
        })),
      });
    }

    case "list_threads": {
      const limit = Math.min(50, Math.max(1, Number(input.limit ?? 20)));
      const offset = Math.max(0, Number(input.offset ?? 0));

      const conditions = [eq(thread.ownerId, userId)];
      if (input.agent) conditions.push(eq(thread.agent, input.agent as string));
      if (input.model) conditions.push(eq(thread.model, input.model as string));

      const where = and(...conditions);

      const [threads, countResult] = await Promise.all([
        db
          .select({
            slug: thread.slug,
            title: thread.title,
            agent: thread.agent,
            model: thread.model,
            tags: thread.tags,
            keyPoints: thread.keyPoints,
            messageCount: thread.messageCount,
            sessionTs: thread.sessionTs,
            createdAt: thread.createdAt,
          })
          .from(thread)
          .where(where)
          .orderBy(desc(thread.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(thread)
          .where(where),
      ]);

      return JSON.stringify({
        threads,
        total: countResult[0].count,
        showing: threads.length,
        offset,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

type SSEEvent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown>; locality: "client" | "server" }
  | { type: "tool_result"; name: string }
  | { type: "pause"; assistantContent: Anthropic.Messages.ContentBlock[]; serverToolResults?: Anthropic.Messages.ToolResultBlockParam[] }
  | { type: "error"; message: string };

function encodeSSE(event: SSEEvent | "[DONE]"): Uint8Array {
  const encoder = new TextEncoder();
  if (event === "[DONE]") {
    return encoder.encode("data: [DONE]\n\n");
  }
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const [session, errorResponse] = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { messages: inputMessages, activeThread, continuation } = body as {
    messages: { role: "user" | "assistant"; content: string }[];
    activeThread?: string | null;
    continuation?: {
      assistantContent: Anthropic.Messages.ContentBlock[];
      toolResults: {
        type: "tool_result";
        tool_use_id: string;
        content: string;
      }[];
    };
  };

  if (!inputMessages || inputMessages.length === 0) {
    return new Response(JSON.stringify({ error: "Messages required" }), {
      status: 400,
    });
  }

  // Build the conversation messages for the API
  const apiMessages: Anthropic.Messages.MessageParam[] = inputMessages.map(
    (m) => ({ role: m.role, content: m.content })
  );

  // If this is a continuation after client-side tool resolution,
  // append the assistant's tool_use response and the tool results
  if (continuation) {
    apiMessages.push({
      role: "assistant",
      content: continuation.assistantContent,
    });
    apiMessages.push({
      role: "user",
      content: continuation.toolResults.map((tr) => ({
        type: "tool_result" as const,
        tool_use_id: tr.tool_use_id,
        content: tr.content,
      })) as Anthropic.Messages.ToolResultBlockParam[],
    });
  }

  const systemParts = [
    "You are a helpful assistant for replay.md, a platform that stores and shares AI coding conversation sessions.",
    "Be concise and direct. Use markdown formatting. Never use emojis.",
    "Answer what the user asks. Do not suggest next steps, offer unsolicited help, or ask what they'd like to do. Just answer their question and stop.",
    "You have tools to search, list, and read the user's conversations. Use them when you need information — don't guess or hallucinate conversation content.",
    "When referencing conversations, mention their titles and include the slug so the user can navigate to them.",
  ];

  if (activeThread) {
    systemParts.push(
      "The user is currently viewing a specific conversation. They opened the assistant from within that conversation.",
      "Prioritize answering questions about this active conversation.",
      "When the user asks questions without specifying which conversation, assume they mean the one they're currently viewing."
    );
  } else {
    systemParts.push(
      "The user is on the dashboard or profile page viewing their conversations.",
      "Help them find, understand, and navigate their stored conversations.",
      "Use the search and list tools to find relevant conversations rather than relying on memory."
    );
  }

  const systemPrompt = systemParts.join("\n");
  const userId = session.user.id;

  const readable = new ReadableStream({
    async start(controller) {
      try {
        await runAgentLoop(controller, systemPrompt, apiMessages, userId);
        controller.enqueue(encodeSSE("[DONE]"));
        controller.close();
      } catch (err) {
        const message =
          err instanceof Anthropic.APIError
            ? `API error: ${err.status} ${err.message}`
            : "Stream failed";
        controller.enqueue(encodeSSE({ type: "error", message }));
        controller.enqueue(encodeSSE("[DONE]"));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ---------------------------------------------------------------------------
// Agent loop — streams text, resolves server tools, pauses for client tools
// ---------------------------------------------------------------------------

async function runAgentLoop(
  controller: ReadableStreamDefaultController,
  systemPrompt: string,
  messages: Anthropic.Messages.MessageParam[],
  userId: string,
  maxIterations = 10
): Promise<void> {
  for (let i = 0; i < maxIterations; i++) {
    const stream = client.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    // Track tool_use blocks as they appear inline during streaming.
    // content_block_start gives us the id + name, input_json_delta
    // accumulates the input JSON, content_block_stop means it's complete.
    let pendingToolBlock: {
      id: string;
      name: string;
      inputJson: string;
    } | null = null;

    for await (const event of stream) {
      // Stream text deltas immediately
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        controller.enqueue(
          encodeSSE({ type: "text", text: event.delta.text })
        );
      }

      // Detect tool_use block starting — send the sprite event inline
      if (
        event.type === "content_block_start" &&
        event.content_block.type === "tool_use"
      ) {
        pendingToolBlock = {
          id: event.content_block.id,
          name: event.content_block.name,
          inputJson: "",
        };
      }

      // Accumulate tool input JSON deltas
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "input_json_delta" &&
        pendingToolBlock
      ) {
        pendingToolBlock.inputJson += event.delta.partial_json;
      }

      // Tool block complete — emit inline tool_use event
      if (event.type === "content_block_stop" && pendingToolBlock) {
        let input: Record<string, unknown> = {};
        try {
          input = JSON.parse(pendingToolBlock.inputJson || "{}");
        } catch {}

        const isClient = CLIENT_TOOLS.has(pendingToolBlock.name);
        controller.enqueue(
          encodeSSE({
            type: "tool_use",
            id: pendingToolBlock.id,
            name: pendingToolBlock.name,
            input,
            locality: isClient ? "client" : "server",
          })
        );
        pendingToolBlock = null;
      }
    }

    // Get the final message to check stop reason and collect tool blocks
    const finalMessage = await stream.finalMessage();

    if (finalMessage.stop_reason !== "tool_use") {
      return;
    }

    const toolUseBlocks = finalMessage.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
    );

    // Add the assistant response to the conversation
    messages.push({ role: "assistant", content: finalMessage.content });

    // Separate client and server tools
    const clientTools: Anthropic.Messages.ToolUseBlock[] = [];
    const serverTools: Anthropic.Messages.ToolUseBlock[] = [];
    for (const toolUse of toolUseBlocks) {
      if (CLIENT_TOOLS.has(toolUse.name)) {
        clientTools.push(toolUse);
      } else {
        serverTools.push(toolUse);
      }
    }

    // Resolve all server-side tools
    const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const toolUse of serverTools) {
      const result = await executeServerTool(
        toolUse.name,
        toolUse.input as Record<string, unknown>,
        userId
      );
      toolResultBlocks.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
      controller.enqueue(
        encodeSSE({ type: "tool_result", name: toolUse.name })
      );
    }

    if (clientTools.length > 0) {
      // Pause for client-side tools
      controller.enqueue(
        encodeSSE({
          type: "pause",
          assistantContent: finalMessage.content,
          serverToolResults: toolResultBlocks.length > 0 ? toolResultBlocks : undefined,
        })
      );
      return;
    }

    // All tools were server-side — add results and continue the loop
    messages.push({ role: "user", content: toolResultBlocks });
  }
}
