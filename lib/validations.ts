import { z } from "zod/v4";

export const uploadThreadSchema = z.object({
  session: z.object({
    id: z.string().min(1),
    agent: z.enum(["claude", "codex"]),
    model: z.string().optional(),
    timestamp: z.iso.datetime(),
    project_path: z.string().optional(),
    git_branch: z.string().optional(),
  }),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string(),
        timestamp: z.iso.datetime(),
      })
    )
    .min(1),
});

export type UploadThreadInput = z.infer<typeof uploadThreadSchema>;

export const updateThreadSchema = z.object({
  visibility: z.enum(["private", "shared", "unlisted", "public"]).optional(),
  title: z.string().max(200).optional(),
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
