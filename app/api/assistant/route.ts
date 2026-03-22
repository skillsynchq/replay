import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth-helpers";

const client = new Anthropic();

export async function POST(request: Request) {
  const [, errorResponse] = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { messages, context, activeThread } = body as {
    messages: { role: "user" | "assistant"; content: string }[];
    context?: string;
    activeThread?: string | null;
  };

  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Messages required" }), {
      status: 400,
    });
  }

  const systemParts = [
    "You are a helpful assistant for replay.md, a platform that stores and shares Claude Code and Codex conversation sessions.",
    "Be concise and direct. Use markdown formatting. Never use emojis.",
    "Answer what the user asks. Do not suggest next steps, offer unsolicited help, or ask what they'd like to do. Just answer their question and stop.",
  ];

  if (activeThread) {
    systemParts.push(
      "The user is currently viewing a specific conversation. They opened the assistant from within that conversation.",
      "Prioritize answering questions about this active conversation. The conversation content is provided in the context below.",
      "When the user asks questions without specifying which conversation, assume they mean the one they're currently viewing."
    );
  } else {
    systemParts.push(
      "The user is on the dashboard viewing all their conversations.",
      "Help them find, understand, and navigate their stored conversations."
    );
  }

  systemParts.push(
    "When referencing conversations, mention their titles when available."
  );

  if (context) {
    systemParts.push(`\nContext:\n${context}`);
  }

  const systemPrompt = systemParts.join("\n");

  const stream = client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event.delta.text)}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message =
          err instanceof Anthropic.APIError
            ? `API error: ${err.message}`
            : "Stream failed";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
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
