import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { message, thread } from "@/lib/db/schema";

export type ConversationSnapshotKind = "user" | "assistant" | "tool";

export interface ConversationSnapshotSegment {
  kind: ConversationSnapshotKind;
  weight: number;
}

export type ConversationSnapshot = ConversationSnapshotSegment[];

const USER_WEIGHT_MULTIPLIER = 4;

interface SnapshotMessage {
  role: string;
  content: string;
  contentBlocks: unknown;
  redacted?: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function estimateLines(
  text: string,
  charsPerLine: number,
  preserveWhitespace = false
): number {
  const normalized = preserveWhitespace ? text : text.replace(/\s+/g, " ").trim();
  if (!normalized) return 0;

  return normalized.split("\n").reduce((total, line) => {
    const length = preserveWhitespace ? line.length : line.trim().length;
    return total + Math.max(1, Math.ceil(length / charsPerLine));
  }, 0);
}

function textWeight(
  text: string,
  {
    charsPerLine = 56,
    lineWeight = 10,
    base = 8,
    preserveWhitespace = false,
  }: {
    charsPerLine?: number;
    lineWeight?: number;
    base?: number;
    preserveWhitespace?: boolean;
  } = {}
): number {
  const lines = estimateLines(text, charsPerLine, preserveWhitespace);
  if (lines === 0) return 0;
  return base + lines * lineWeight;
}

function extractToolResultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((item) => asRecord(item))
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && item.type === "text" && typeof item.text === "string"
    )
    .map((item) => item.text as string)
    .join("\n");
}

function toolWeight(block: Record<string, unknown>): number {
  if (block.type === "tool_use") {
    const name = typeof block.name === "string" ? block.name : "tool";
    const input = block.input ? JSON.stringify(block.input, null, 2) : "";
    return textWeight(`${name}\n${input}`, {
      charsPerLine: 42,
      lineWeight: 9,
      base: 12,
      preserveWhitespace: true,
    });
  }

  if (block.type === "tool_result") {
    return textWeight(extractToolResultText(block.content), {
      charsPerLine: 52,
      lineWeight: 9,
      base: 10,
      preserveWhitespace: true,
    });
  }

  return 0;
}

function pushSegment(
  segments: ConversationSnapshot,
  kind: ConversationSnapshotKind,
  weight: number
) {
  const adjustedWeight =
    kind === "user" ? weight * USER_WEIGHT_MULTIPLIER : weight;
  if (adjustedWeight <= 0) return;

  const last = segments[segments.length - 1];
  if (last?.kind === kind) {
    last.weight += adjustedWeight;
    return;
  }

  segments.push({ kind, weight: adjustedWeight });
}

function blockWeight(
  block: Record<string, unknown>,
  role: string,
  skipUserImageReferenceText: boolean
): { kind: ConversationSnapshotKind; weight: number } | null {
  const fallbackKind: ConversationSnapshotKind =
    role === "user" ? "user" : "assistant";

  switch (block.type) {
    case "text": {
      const text = typeof block.text === "string" ? block.text : "";
      if (
        skipUserImageReferenceText &&
        text.match(/^\[Image.*source:/)
      ) {
        return null;
      }
      const weight = textWeight(text, {
        charsPerLine: role === "user" ? 50 : 58,
        lineWeight: 10,
        base: 8,
        preserveWhitespace: role === "user",
      });
      return weight > 0 ? { kind: fallbackKind, weight } : null;
    }
    case "thinking": {
      const weight = textWeight(
        typeof block.thinking === "string" ? block.thinking : "",
        {
          charsPerLine: 60,
          lineWeight: 6,
          base: 12,
          preserveWhitespace: true,
        }
      );
      return weight > 0 ? { kind: "assistant", weight } : null;
    }
    case "tool_use":
    case "tool_result": {
      const weight = toolWeight(block);
      return weight > 0 ? { kind: "tool", weight } : null;
    }
    case "image":
      return { kind: fallbackKind, weight: 54 };
    default:
      return null;
  }
}

export function buildConversationSnapshot(
  messages: SnapshotMessage[]
): ConversationSnapshot {
  const segments: ConversationSnapshot = [];

  for (const message of messages) {
    if (message.redacted) {
      pushSegment(segments, message.role === "user" ? "user" : "assistant", 18);
      continue;
    }

    if (Array.isArray(message.contentBlocks) && message.contentBlocks.length > 0) {
      const skipUserImageReferenceText =
        message.role === "user" &&
        message.contentBlocks.some((block) => {
          const item = asRecord(block);
          return item?.type === "image";
        });

      let addedBlock = false;

      for (const rawBlock of message.contentBlocks) {
        const block = asRecord(rawBlock);
        if (!block) continue;

        const segment = blockWeight(
          block,
          message.role,
          skipUserImageReferenceText
        );

        if (!segment) continue;
        pushSegment(segments, segment.kind, segment.weight);
        addedBlock = true;
      }

      if (addedBlock) continue;
    }

    const kind: ConversationSnapshotKind =
      message.role === "user" ? "user" : "assistant";
    pushSegment(
      segments,
      kind,
      textWeight(message.content, {
        charsPerLine: message.role === "user" ? 50 : 58,
        lineWeight: 10,
        base: 8,
        preserveWhitespace: message.role === "user",
      })
    );
  }

  if (segments.length === 0) {
    return [{ kind: "assistant", weight: 1 }];
  }

  return segments;
}

/**
 * For a list of threads, returns snapshots — using stored values when present,
 * and batch-backfilling any that are missing in a single query.
 */
export async function getOrBackfillSnapshots(
  threads: { id: string; conversationSnapshot: unknown }[]
): Promise<Map<string, ConversationSnapshot>> {
  const result = new Map<string, ConversationSnapshot>();
  const missing: string[] = [];

  for (const t of threads) {
    if (Array.isArray(t.conversationSnapshot) && t.conversationSnapshot.length > 0) {
      result.set(t.id, t.conversationSnapshot as ConversationSnapshot);
    } else {
      missing.push(t.id);
    }
  }

  if (missing.length === 0) return result;

  // One query for all missing threads' messages
  const msgs = await db
    .select({
      threadId: message.threadId,
      role: message.role,
      content: message.content,
      contentBlocks: message.contentBlocks,
      redacted: message.redacted,
    })
    .from(message)
    .where(inArray(message.threadId, missing))
    .orderBy(asc(message.threadId), asc(message.ordinal));

  // Group by thread
  const byThread = new Map<string, typeof msgs>();
  for (const m of msgs) {
    let arr = byThread.get(m.threadId);
    if (!arr) {
      arr = [];
      byThread.set(m.threadId, arr);
    }
    arr.push(m);
  }

  // Compute and persist snapshots
  await Promise.all(
    missing.map(async (threadId) => {
      const snapshot = buildConversationSnapshot(byThread.get(threadId) ?? []);
      result.set(threadId, snapshot);
      await db
        .update(thread)
        .set({ conversationSnapshot: snapshot })
        .where(eq(thread.id, threadId));
    })
  );

  return result;
}
