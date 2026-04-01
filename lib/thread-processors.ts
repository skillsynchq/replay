/**
 * Thread content processors — composable string transformations
 * applied to the entire serialized conversation before rendering.
 *
 * Each processor is a factory: given thread context, it returns
 * a TextProcessor (or null if it doesn't apply). The pipeline
 * composes all active processors into a single pass over the
 * JSON-serialized message data.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** A pure string → string transform. */
export type TextProcessor = (text: string) => string;

/** Given thread context, produce a processor — or null to skip. */
export type ProcessorFactory = (ctx: ThreadContext) => TextProcessor | null;

export interface ThreadContext {
  projectPath: string | null;
}

/** Compose N processors into one. Short-circuits on 0 or 1. */
export function compose(...fns: TextProcessor[]): TextProcessor {
  if (fns.length === 0) return (t) => t;
  if (fns.length === 1) return fns[0];
  return (text) => {
    let out = text;
    for (const fn of fns) out = fn(out);
    return out;
  };
}

/**
 * Apply a TextProcessor to every string value in a deep structure.
 *
 * Serializes to JSON, runs the processor on the entire string,
 * then parses back. This is significantly faster than recursive
 * object traversal for large message arrays — Bun's JSON
 * stringify/parse runs in native C++, and we get a single
 * contiguous string to operate on instead of thousands of small ones.
 *
 * Safe for path replacement because forward slashes aren't escaped
 * in JSON strings, so `/Users/foo/bar` appears literally in the
 * serialized output.
 */
export function processDeep<T>(data: T, processor: TextProcessor): T {
  const json = JSON.stringify(data);
  const processed = processor(json);
  return JSON.parse(processed);
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const registry: ProcessorFactory[] = [relativizePaths];

/**
 * Build a single TextProcessor from all applicable factories.
 * Returns null if no processors apply (caller can skip processDeep).
 */
export function buildPipeline(ctx: ThreadContext): TextProcessor | null {
  const active: TextProcessor[] = [];
  for (const factory of registry) {
    const p = factory(ctx);
    if (p) active.push(p);
  }
  if (active.length === 0) return null;
  return compose(...active);
}

// ---------------------------------------------------------------------------
// Processors
// ---------------------------------------------------------------------------

/**
 * Replace absolute paths with project-relative paths.
 *
 * Given projectPath `/a/b/c`:
 *   /a/b/c/src/index.ts  →  ./src/index.ts
 *   /a/b/c               →  .
 *   /a/b/other            →  ../other
 *   /a/x                  →  ../../x
 *
 * Uses a single compiled regex that matches all ancestor prefixes
 * (longest first) in one pass — no repeated string scans.
 */
function relativizePaths(ctx: ThreadContext): TextProcessor | null {
  if (!ctx.projectPath) return null;

  const base = ctx.projectPath.replace(/\/+$/, "");
  const parts = base.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  // Build replacement map: longest paths first so the regex
  // engine matches greedily in the correct order via alternation.
  const replacements = new Map<string, string>();

  // Project path with trailing slash → ./
  replacements.set(base + "/", "./");

  // Ancestors: each level up adds one ../
  for (let i = parts.length - 1; i >= 1; i--) {
    const ancestor = "/" + parts.slice(0, i).join("/") + "/";
    const depth = parts.length - i;
    replacements.set(ancestor, "../".repeat(depth));
  }

  // Project path without trailing slash → . (must come after slash variants)
  replacements.set(base, ".");

  // Build a single regex — keys are already ordered longest-first
  // due to the insertion order above. Escape regex metacharacters.
  const escaped = Array.from(replacements.keys()).map((k) =>
    k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const pattern = new RegExp(escaped.join("|"), "g");

  return (text) =>
    text.replace(pattern, (match) => replacements.get(match) ?? match);
}
