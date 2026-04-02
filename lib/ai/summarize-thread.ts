import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const MAX_TRANSCRIPT_CHARS = 6000;
const MAX_TITLE_CONTEXT_CHARS = 2000;

function buildTranscript(
  messages: { role: string; content: string }[],
  maxChars: number = MAX_TRANSCRIPT_CHARS
): string {
  const lines = messages
    .filter((m) => m.content.trim())
    .map((m) => {
      const prefix = m.role === "user" ? "User" : "Assistant";
      return `${prefix}: ${m.content}`;
    })
    .join("\n\n");

  if (lines.length <= maxChars) return lines;

  const half = maxChars / 2;
  return lines.slice(0, half) + "\n\n[...]\n\n" + lines.slice(-half);
}

/**
 * Verify title quality and generate a better one if needed.
 * Uses only the first few messages (~2000 chars) to keep it cheap and fast.
 */
async function verifyTitle(
  title: string | null,
  messages: { role: string; content: string }[]
): Promise<string | null> {
  const opening = buildTranscript(messages.slice(0, 6), MAX_TITLE_CONTEXT_CHARS);
  if (!opening.trim()) return null;

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `You are evaluating the title of a coding conversation.

Current title: "${title ?? "Untitled"}"

Opening messages:
${opening}

Is this title clear, specific, and descriptive of what the conversation is about? A good title should:
- Be concise (under 60 characters)
- Describe the actual task or topic (not just the first message verbatim)
- Be meaningful to someone scanning a list of threads

Return ONLY valid JSON:
- If the title is already good: {"keep": true}
- If the title needs improvement: {"keep": false, "title": "your better title here"}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]) as {
    keep: boolean;
    title?: string;
  };

  if (parsed.keep) return null;

  return typeof parsed.title === "string" && parsed.title.length > 0
    ? parsed.title.slice(0, 60)
    : null;
}

export async function summarizeThread(
  title: string | null,
  messages: { role: string; content: string }[]
): Promise<{ keyPoints: string[]; improvedTitle: string | null }> {
  try {
    if (messages.length < 2) {
      return { keyPoints: [], improvedTitle: null };
    }

    const transcript = buildTranscript(messages);
    if (!transcript.trim()) {
      return { keyPoints: [], improvedTitle: null };
    }

    // Run key points summarization and title verification in parallel
    const [keyPointsResult, verifiedTitle] = await Promise.all([
      client.messages
        .create({
          model: "claude-haiku-4-5",
          max_tokens: 512,
          messages: [
            {
              role: "user",
              content: `Summarize this coding conversation.

Return ONLY valid JSON: {"key_points": ["...", "...", "..."]}

Rules:
- key_points: 3-4 bullet points, each under 100 characters, capturing what was accomplished or discussed

Conversation:
${transcript}`,
            },
          ],
        })
        .then((response) => {
          const text =
            response.content[0].type === "text"
              ? response.content[0].text
              : "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) return [];
          const parsed = JSON.parse(jsonMatch[0]) as {
            key_points?: string[];
          };
          return Array.isArray(parsed.key_points)
            ? parsed.key_points
                .filter((p): p is string => typeof p === "string")
                .map((p) => p.slice(0, 100))
                .slice(0, 4)
            : [];
        })
        .catch(() => [] as string[]),
      verifyTitle(title, messages).catch(() => null),
    ]);

    return { keyPoints: keyPointsResult, improvedTitle: verifiedTitle };
  } catch {
    return { keyPoints: [], improvedTitle: null };
  }
}
