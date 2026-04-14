# replay

Share your AI coding sessions. Upload a conversation from Claude Code or Codex, get a permanent link. That's it.

```bash
curl -sSL https://install.replay.md | sh
replay login
replay upload <session-id-or-title>
```

Your session becomes a browsable thread with inline diffs, tool calls, and the full back-and-forth — not a raw log dump, but something you'd actually want to read. Keep it private, share it with your team, or make it public.

## Features

- Upload sessions from Claude Code and Codex
- Full conversation rendering with inline diffs, tool calls, and thinking blocks
- Public, unlisted, or private visibility per thread
- Full-text search across all your threads
- Decision traces — AI-generated narratives from conversation history
- Star and tag threads for curation
- Stable URLs that persist across re-uploads

## Use cases

- **Decision traces** — keep a searchable record of decisions made in the conversation where they actually happened
- **Portfolios** — showcase your domain expertise and how you think, not just what you ship
- **Code review** — link the conversation alongside a PR so reviewers see what was considered, not just what landed
- **Create Skills** — convert a session where you nailed a workflow into a reusable skill


## Getting started

```bash
bun install
cp .env.example .env.local
bun drizzle-kit push
bun dev
```

Open [localhost:3000](http://localhost:3000).

## Project structure

```
app/
  (app)/          # Authenticated app shell
  [username]/     # Public profile / thread pages
  api/            # Route handlers
  components/     # Shared UI components
  login/          # Auth pages
  t/              # Thread routes
  docs/           # Documentation pages
lib/
  ai/             # AI assistant logic
  auth.ts         # Better Auth config
  db/             # Drizzle schema, queries, migrations
  search/         # FlexSearch indexing
content/
  docs/           # Documentation content (MDX)
```
