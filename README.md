# Replay

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)
[![Website](https://img.shields.io/badge/web-replay.md-78716c)](https://replay.md)
[![Docs](https://img.shields.io/badge/docs-replay.md%2Fdocs-78716c)](https://replay.md/docs)

Share your AI coding sessions. Upload a conversation from Claude Code or Codex, get a permanent link. That's it.

Your session becomes a browsable thread with inline diffs, tool calls, and the full back-and-forth — not a raw log dump, but something you'd actually want to read. Keep it private, share it with your team, or make it public.

This repo is the web app at [replay.md](https://replay.md). Uploads come from the companion CLI, [`skillsynchq/replay-cli`](https://github.com/skillsynchq/replay-cli).

## Install the CLI

```bash
curl -sSL https://install.replay.md | sh
replay login
replay upload <session-id-or-title>
```

Full CLI docs live in the [replay-cli README](https://github.com/skillsynchq/replay-cli).

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
- **Create skills** — convert a session where you nailed a workflow into a reusable skill

## Related projects

- [**replay-cli**](https://github.com/skillsynchq/replay-cli) — Rust CLI and TUI for browsing local agent sessions and uploading them here.

## Development

Running the web app locally:

```bash
bun install
cp .env.example .env.local   # fill in the values
bun drizzle-kit push         # apply schema to your Neon DB
bun dev
```

Open [localhost:3000](http://localhost:3000).

Tech: Next.js 16 / React 19, Tailwind CSS 4, Drizzle ORM on Neon, Better Auth (GitHub + Google), Anthropic SDK for the assistant sidebar, FlexSearch for client-side thread search. Deployed on Vercel with the Bun runtime.

Always use `bun`, not `npm`.

## Contributing

Issues and pull requests are welcome. For anything non-trivial, open an issue first so we can talk through the direction.

## License

[Apache 2.0](./LICENSE)
