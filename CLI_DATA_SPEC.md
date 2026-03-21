# CLI Data Spec — What the CLI Can Send

This document describes everything available in the CLI's data layer that can be sent to the server. Use this to design the upload schema and database tables.

---

## Current State

The CLI currently sends a flattened payload with only `role`, `text`, and `timestamp` per message. Everything below describes what's **actually available** in the parsed JSONL data that we're discarding.

---

## Session Metadata

Extracted during discovery (fast scan of first few lines). Available for both Claude and Codex.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `id` | string | `sessionId` (Claude), `payload.id` (Codex) | UUID |
| `agent` | enum | hardcoded per provider | `"claude"` or `"codex"` |
| `timestamp` | ISO datetime | earliest timestamp in file | session start time |
| `project_path` | string? | `cwd` (Claude), `payload.cwd` (Codex) | absolute path to project dir |
| `git_branch` | string? | `gitBranch` (Claude), `payload.git.branch` (Codex) | branch at session start |

### Additional session-level fields available but NOT currently extracted

**Claude only:**
| Field | Type | Source |
|-------|------|--------|
| `version` | string | top-level on every line, e.g. `"2.1.79"` — Claude Code version |
| `entrypoint` | string | `"cli"` — how the session was started |
| `permissionMode` | string | `"default"`, etc. — user's permission mode |
| `customTitle` | string | `custom-title` line type — user/auto-generated session title |
| `agentName` | string | `agent-name` line type — named agent if applicable |
| `slug` | string | on `progress` lines — human-readable session slug (e.g. `"deep-gliding-hare"`) |

**Codex only:**
| Field | Type | Source |
|-------|------|--------|
| `payload.git` | object | full git context from `session_meta` (branch, possibly commit) |

---

## Messages

### Claude Message Structure

Each JSONL line with `type: "user"` or `type: "assistant"` contains a `message` object following the Anthropic Messages API format:

```
message: {
  role: "user" | "assistant"
  content: string | ContentBlock[]    // user can be plain string or array
  model?: string                      // on assistant messages, e.g. "claude-opus-4-6"
  id?: string                         // Anthropic message ID
  stop_reason?: string                // "end_turn", "tool_use", etc.
  usage?: {                           // token usage for this turn
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens: number
    cache_read_input_tokens: number
  }
}
```

#### Content Blocks (the key part)

`content` is an array of typed blocks. This is what we're currently flattening to text-only:

| Block Type | Fields | Description |
|-----------|--------|-------------|
| `text` | `{ type: "text", text: string }` | Plain text from the assistant or user |
| `thinking` | `{ type: "thinking", thinking: string }` | Extended thinking / chain-of-thought |
| `tool_use` | `{ type: "tool_use", id: string, name: string, input: object }` | Tool invocation |
| `tool_result` | `{ type: "tool_result", tool_use_id: string, content: string }` | Result of a tool call (on user messages) |

#### Tool Use — Available Tools and Their Inputs

These are the tools Claude Code invokes. The `input` object varies per tool:

**File operations (these are the diffs):**

```
Edit: {
  file_path: string,
  old_string: string,     // the text being replaced
  new_string: string,     // the replacement text
  replace_all?: boolean
}

Write: {
  file_path: string,
  content: string         // full file content
}

Read: {
  file_path: string,
  offset?: number,
  limit?: number
}
```

**Search operations:**

```
Glob: {
  pattern: string,
  path?: string
}

Grep: {
  pattern: string,
  path?: string,
  glob?: string,
  type?: string
}
```

**Shell execution:**

```
Bash: {
  command: string,
  description?: string,
  timeout?: number
}
```

**Other tools:** `Agent`, `ExitPlanMode`, `ToolSearch`, `Skill`, `NotebookEdit`, etc.

#### Tool Results

Tool results appear as `tool_result` content blocks on the subsequent `user` message. They contain the output of the tool call as a string. For example, after an `Edit` tool_use, the tool_result contains the confirmation or error.

**Currently discarded:** The provider filters out user messages that contain *only* `tool_result` blocks (no human text). These are the automated round-trip messages.

---

### Codex Message Structure

Each JSONL line with `type: "response_item"` and `payload.type: "message"`:

```
payload: {
  type: "message"
  role: "developer" | "user" | "assistant"
  content: ContentBlock[]
}
```

#### Content Block Types

| Block Type | Fields | Description |
|-----------|--------|-------------|
| `input_text` | `{ type: "input_text", text: string }` | User/developer input |
| `output_text` | `{ type: "output_text", text: string }` | Assistant output |

**Note:** Codex also has `response_item` lines with `payload.type: "function_call"` and `payload.type: "function_call_output"` — these are the tool use equivalents but are currently **completely ignored** by the provider (it only processes `payload.type == "message"`).

---

## Other Line Types (Claude)

These exist in the JSONL but are not currently parsed at all:

| Line Type | Description | Useful? |
|-----------|-------------|---------|
| `progress` | Real-time progress updates (tool execution status, hook events) | Probably not for upload |
| `system` | Hook summaries, stop reasons | Maybe — `stop_reason` could indicate how session ended |
| `file-history-snapshot` | File state snapshots for undo | No — local-only feature |
| `queue-operation` | Queued follow-up prompts (enqueue/dequeue) | No |
| `custom-title` | User/auto-generated session title | **Yes** — good for display |
| `agent-name` | Named agent identifier | **Yes** — good for display |
| `last-prompt` | Last user prompt (duplicate of message data) | No |

---

## Recommended Upload Schema Changes

Based on what's available, here's what the server should accept:

### Session (extended)

```typescript
session: {
  id: string
  agent: "claude" | "codex"
  timestamp: ISO datetime
  project_path?: string
  git_branch?: string
  // NEW:
  title?: string            // from custom-title or agent-name
  cli_version?: string      // e.g. "2.1.79"
  model?: string            // primary model used, from assistant messages
}
```

### Messages (structured content blocks)

Instead of flat `{ role, text, timestamp }`, accept the full content block array:

```typescript
messages: [{
  role: "user" | "assistant"
  timestamp: ISO datetime
  // NEW: replace `text` with structured content
  content: ContentBlock[]
  // NEW: assistant-only metadata
  model?: string
  stop_reason?: string
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}]
```

Where `ContentBlock` is:

```typescript
type ContentBlock =
  | { type: "text", text: string }
  | { type: "thinking", thinking: string }
  | { type: "tool_use", id: string, name: string, input: Record<string, unknown> }
  | { type: "tool_result", tool_use_id: string, content: string }
```

### What this enables on the UI

1. **Code diffs** — Render `Edit` tool_use blocks as proper diffs (old_string → new_string)
2. **File writes** — Show `Write` tool_use blocks with syntax highlighting
3. **File reads** — Show what files the assistant looked at
4. **Shell commands** — Show `Bash` tool_use blocks with command + output
5. **Search results** — Show `Glob`/`Grep` operations
6. **Thinking blocks** — Optionally show/hide chain-of-thought
7. **Token usage** — Display cost/usage per turn
8. **Tool flow** — Show the full tool_use → tool_result round-trip

### Backward compatibility

Keep accepting the current flat format (`text` field) as a fallback — the CLI can send both:
- `text`: flattened plain text (for older server versions)
- `content`: full structured blocks (when server supports it)
