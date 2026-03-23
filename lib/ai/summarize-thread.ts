import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const MAX_TRANSCRIPT_CHARS = 6000;
const TITLE_LENGTH_THRESHOLD = 80;

function buildTranscript(
  messages: { role: string; content: string }[]
): string {
  const lines = messages
    .filter((m) => m.content.trim())
    .map((m) => {
      const prefix = m.role === "user" ? "User" : "Assistant";
      return `${prefix}: ${m.content}`;
    })
    .join("\n\n");

  if (lines.length <= MAX_TRANSCRIPT_CHARS) return lines;

  const half = MAX_TRANSCRIPT_CHARS / 2;
  return lines.slice(0, half) + "\n\n[...]\n\n" + lines.slice(-half);
}

export async function summarizeThread(
  title: string | null,
  messages: { role: string; content: string }[]
): Promise<{ keyPoints: string[]; conciseTitle: string | null }> {
  try {
    if (messages.length < 2) {
      return { keyPoints: [], conciseTitle: null };
    }

    const transcript = buildTranscript(messages);
    if (!transcript.trim()) {
      return { keyPoints: [], conciseTitle: null };
    }

    const needsConciseTitle = !!title && title.length > TITLE_LENGTH_THRESHOLD;

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Summarize this coding conversation.

Return ONLY valid JSON: {"key_points": ["...", "...", "..."], "concise_title": "..." }

Rules:
- key_points: 3-4 bullet points, each under 100 characters, capturing what was accomplished or discussed
- concise_title: A short descriptive title under 60 characters.${needsConciseTitle ? "" : ' Set to null since the current title is already short enough.'}

Current title: "${title ?? "Untitled"}"

Conversation:
${transcript}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { keyPoints: [], conciseTitle: null };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      key_points?: string[];
      concise_title?: string | null;
    };

    const keyPoints = Array.isArray(parsed.key_points)
      ? parsed.key_points
          .filter((p): p is string => typeof p === "string")
          .map((p) => p.slice(0, 100))
          .slice(0, 4)
      : [];

    const conciseTitle =
      needsConciseTitle &&
      typeof parsed.concise_title === "string" &&
      parsed.concise_title.length > 0
        ? parsed.concise_title.slice(0, 60)
        : null;

    return { keyPoints, conciseTitle };
  } catch {
    return { keyPoints: [], conciseTitle: null };
  }
}
