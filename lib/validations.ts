import { z } from "zod/v4";

// --- Content Block types ---

const textBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const thinkingBlockSchema = z.object({
  type: z.literal("thinking"),
  thinking: z.string(),
});

const toolUseBlockSchema = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: z.string(),
  input: z.record(z.string(), z.unknown()),
});

const toolResultBlockSchema = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string(),
  content: z.string(),
});

export const contentBlockSchema = z.union([
  textBlockSchema,
  thinkingBlockSchema,
  toolUseBlockSchema,
  toolResultBlockSchema,
]);

export type ContentBlock = z.infer<typeof contentBlockSchema>;

// --- Usage ---

const usageSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_creation_input_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional(),
});

export type Usage = z.infer<typeof usageSchema>;

// --- Upload schema (backward compatible) ---

const legacyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
  timestamp: z.iso.datetime(),
});

const structuredMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  timestamp: z.iso.datetime(),
  text: z.string().optional(),
  content: z.array(contentBlockSchema).optional(),
  model: z.string().optional(),
  stop_reason: z.string().optional(),
  usage: usageSchema.optional(),
});

// Accept either format
const messageSchema = z.union([structuredMessageSchema, legacyMessageSchema]);

export const uploadThreadSchema = z.object({
  session: z.object({
    id: z.string().min(1),
    agent: z.enum(["claude", "codex"]),
    model: z.string().optional(),
    timestamp: z.iso.datetime(),
    project_path: z.string().optional(),
    git_branch: z.string().optional(),
    title: z.string().optional(),
    cli_version: z.string().optional(),
  }),
  messages: z.array(messageSchema).min(1),
});

export type UploadThreadInput = z.infer<typeof uploadThreadSchema>;

// --- Other schemas ---

export const updateThreadSchema = z.object({
  visibility: z.enum(["private", "shared", "unlisted", "public"]).optional(),
  title: z.string().max(200).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  redactions: z
    .array(
      z.object({
        message_id: z.string().uuid(),
        redacted: z.boolean(),
      })
    )
    .optional(),
});

export type UpdateThreadInput = z.infer<typeof updateThreadSchema>;

export const shareThreadSchema = z.object({
  username: z.string().min(1).max(39),
});

export const usernameSchema = z
  .string()
  .min(3)
  .max(39)
  .regex(
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
    "Username must start and end with alphanumeric characters and can contain hyphens"
  );

// --- Helpers ---

/**
 * Extract plain text from content blocks for preview/search purposes.
 */
export function extractTextFromBlocks(blocks: ContentBlock[]): string {
  return blocks
    .filter((b): b is z.infer<typeof textBlockSchema> => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
