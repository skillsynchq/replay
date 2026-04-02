"use client";

import { prepare, layout } from "@chenglou/pretext";
import type { PreparedText } from "@chenglou/pretext";

// ---------------------------------------------------------------------------
// Typography constants — must match globals.css + component CSS exactly
// ---------------------------------------------------------------------------

// Sans: var(--font-helvetica) is unset, falls through to "Helvetica Neue"
const SANS_FONT = '13px "Helvetica Neue", Helvetica, Arial, sans-serif';
const SANS_FONT_MEDIUM = '500 13px "Helvetica Neue", Helvetica, Arial, sans-serif';

const SANS_LINE_HEIGHT = 20.8; // 13px * 1.6
const MONO_12_LINE_HEIGHT = 20.4; // 12px * 1.7

// ---------------------------------------------------------------------------
// Fixed heights for structural elements (px)
// ---------------------------------------------------------------------------

const COLLAPSED_PILL = 36; // thinking button, tool pill
const EDIT_HEADER = 28; // file path header on Edit blocks
const IMAGE_ESTIMATE = 200;
const REDACTED_HEIGHT = 40;
const USER_MESSAGE_PADDING = 20; // py-2.5 top+bottom (10+10)
const ASSISTANT_MESSAGE_PADDING = 16; // py-2 top+bottom (8+8)
const BLOCK_GAP = 8; // space-y-2 between content blocks
const MESSAGE_GAP = 4; // space-y-1 between messages

// ---------------------------------------------------------------------------
// PreparedText cache — keyed by messageId:blockIndex
// ---------------------------------------------------------------------------

const preparedCache = new Map<string, PreparedText>();
let pretextSupported: boolean | null = null;

function canUsePretext(): boolean {
  if (pretextSupported !== null) return pretextSupported;
  if (typeof window === "undefined") {
    pretextSupported = false;
    return pretextSupported;
  }

  if (typeof OffscreenCanvas !== "undefined") {
    pretextSupported = true;
    return pretextSupported;
  }

  const canvas = window.document.createElement("canvas");
  pretextSupported = canvas.getContext("2d") !== null;
  return pretextSupported;
}

function getPrepared(
  key: string,
  text: string,
  font: string,
  whiteSpace: "normal" | "pre-wrap" = "normal"
): PreparedText | null {
  if (!canUsePretext()) return null;

  let cached = preparedCache.get(key);
  if (!cached) {
    try {
      cached = prepare(text, font, { whiteSpace });
    } catch {
      pretextSupported = false;
      return null;
    }
    preparedCache.set(key, cached);
  }
  return cached;
}

function fallbackTextHeight(
  text: string,
  width: number,
  lineHeight: number,
  whiteSpace: "normal" | "pre-wrap"
): number {
  const usableWidth = Math.max(width, 120);
  const avgCharWidth = 7;
  const charsPerLine = Math.max(12, Math.floor(usableWidth / avgCharWidth));

  const normalized =
    whiteSpace === "pre-wrap" ? text : text.replace(/\s+/g, " ").trim();
  const segments =
    whiteSpace === "pre-wrap" ? normalized.split("\n") : [normalized];

  let lines = 0;
  for (const segment of segments) {
    const content = segment.trimEnd();
    lines += Math.max(1, Math.ceil(content.length / charsPerLine));
  }

  return lines * lineHeight;
}

// ---------------------------------------------------------------------------
// Markdown overhead heuristic
// ---------------------------------------------------------------------------

function markdownOverhead(text: string): number {
  let overhead = 0;

  // Headings: ~24px margin (mt-6 mb-2 + larger font)
  const headingMatches = text.match(/\n#{1,6}\s/g);
  if (headingMatches) overhead += headingMatches.length * 24;

  // Fenced code blocks: ~24px padding/border each
  const fenceMatches = text.match(/```/g);
  if (fenceMatches) overhead += Math.floor(fenceMatches.length / 2) * 24;

  // Paragraph gaps (blank lines): ~8px each (mb-2)
  const blankLines = text.match(/\n\s*\n/g);
  if (blankLines) overhead += blankLines.length * 8;

  return overhead;
}

// ---------------------------------------------------------------------------
// Block-level height estimation
// ---------------------------------------------------------------------------

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
  source?: { type: string; media_type: string; data: string };
  content?: string | unknown[];
}

function estimateTextBlock(
  key: string,
  text: string,
  width: number,
  isUser: boolean
): number {
  if (!text.trim()) return 0;

  const font = isUser ? SANS_FONT_MEDIUM : SANS_FONT;
  const whiteSpace = isUser ? ("pre-wrap" as const) : ("normal" as const);
  const prepared = getPrepared(key, text, font, whiteSpace);
  const height = prepared
    ? layout(prepared, width, SANS_LINE_HEIGHT).height
    : fallbackTextHeight(text, width, SANS_LINE_HEIGHT, whiteSpace);

  return height + (isUser ? 0 : markdownOverhead(text));
}

function estimateThinkingBlock(): number {
  // Always collapsed by default
  return COLLAPSED_PILL;
}

function estimateToolUseBlock(block: ContentBlock): number {
  if (block.name === "Edit") {
    const input = block.input ?? {};
    const oldStr = (input.old_string as string) ?? "";
    const newStr = (input.new_string as string) ?? "";
    const lineCount =
      oldStr.split("\n").length + newStr.split("\n").length;
    return EDIT_HEADER + lineCount * MONO_12_LINE_HEIGHT;
  }

  // All other tools render as collapsed pills by default
  return COLLAPSED_PILL;
}

function estimateImageBlock(): number {
  return IMAGE_ESTIMATE;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface MessageData {
  id: string;
  ordinal: number;
  role: string;
  content: string;
  contentBlocks: Record<string, unknown>[] | null;
  redacted: boolean;
}

/**
 * Estimate the rendered height of a single message in pixels.
 * Uses pretext for text measurement, fixed values for structural elements.
 */
export function estimateMessageHeight(
  msg: MessageData,
  containerWidth: number
): number {
  if (msg.redacted) return REDACTED_HEIGHT;

  const isUser = msg.role === "user";
  const basePadding = isUser ? USER_MESSAGE_PADDING : ASSISTANT_MESSAGE_PADDING;

  if (msg.contentBlocks && msg.contentBlocks.length > 0) {
    const blocks = msg.contentBlocks as unknown as ContentBlock[];
    let total = 0;
    let blockCount = 0;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const key = `${msg.id}:${i}`;
      let blockHeight = 0;

      switch (block.type) {
        case "text": {
          const text = (block.text ?? "").trim();
          if (!text) continue;
          blockHeight = estimateTextBlock(key, text, containerWidth, isUser);
          break;
        }
        case "thinking":
          blockHeight = estimateThinkingBlock();
          break;
        case "tool_use":
          blockHeight = estimateToolUseBlock(block);
          break;
        case "tool_result":
          // tool_results are rendered inline with their tool_use, skip
          continue;
        case "image":
          blockHeight = estimateImageBlock();
          break;
        default:
          continue;
      }

      total += blockHeight;
      blockCount++;
    }

    // Add gaps between blocks (space-y-2 = 8px)
    if (blockCount > 1) total += (blockCount - 1) * BLOCK_GAP;

    return total + basePadding + MESSAGE_GAP;
  }

  // Fallback: plain text content
  if (!msg.content.trim()) return 0;

  const key = `${msg.id}:text`;
  const textHeight = estimateTextBlock(
    key,
    msg.content,
    containerWidth,
    isUser
  );

  return textHeight + basePadding + MESSAGE_GAP;
}

/**
 * Clear the PreparedText cache. Call when navigating away from the page.
 */
export function clearHeightCache(): void {
  preparedCache.clear();
}
