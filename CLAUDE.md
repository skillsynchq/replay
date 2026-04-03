# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Replay is a web app for sharing AI coding conversations as reviewable threads. It ingests chat transcripts from Claude Code, ChatGPT, Cursor, and Codex, then presents them in a searchable interface for teams to browse and learn from.

## Commands

```bash
bun install          # Install dependencies
bun dev              # Start dev server (localhost:3000)
bun run build        # Production build
bun run lint         # ESLint (Next.js core-web-vitals + TypeScript)
bun drizzle-kit push # Push schema changes to Neon DB
```

Always use `bun`, not `npm`.

## Tech Stack

- **Next.js 16** / React 19 (App Router)
- **Tailwind CSS 4** via `@tailwindcss/postcss`
- **Drizzle ORM** + **Neon** (serverless Postgres) — schema in `lib/db/schema/`
- **Better Auth** with GitHub + Google OAuth, bearer plugin — config in `lib/auth.ts`
- **Anthropic SDK** for the assistant sidebar AI feature
- **FlexSearch** for client-side thread search (`lib/search/`)
- **Zod** for validation (`lib/validations.ts`)
- Deployed on Vercel with Bun runtime (`vercel.json`)

## Architecture

### Routing

- `app/page.tsx` — Landing page (public)
- `app/(app)/` — Authenticated app shell (dashboard, settings)
- `app/[username]/` — Public profile and thread pages
- `app/t/` — Thread routes
- `app/docs/` — Documentation pages (content from `content/docs/`)
- `app/login/` — Auth pages

### API Routes (`app/api/`)

- `api/auth/` — Better Auth handler (auto-generated routes)
- `api/threads/` — Thread CRUD
- `api/threads/sync/` — CLI sync endpoint (where CLI uploads sessions)
- `api/threads/[slug]/` — Single thread operations
- `api/assistant/` — AI assistant streaming endpoint
- `api/username/` — Username management
- `api/users/` — User operations

### Data Layer

Three main tables in `lib/db/schema/thread.ts`:
- `thread` — Session metadata (agent, model, slug, visibility, tags, key_points). Uniquely keyed on `(ownerId, sessionId)`.
- `message` — Structured messages with `content` (text) and `contentBlocks` (JSONB for tool_use, thinking, etc.). Ordered by `ordinal`.
- `threadShare` — Sharing threads with other users.

Auth tables (`lib/db/schema/auth.ts`): managed by Better Auth (user, session, account, verification).

Migrations output to `lib/db/migrations/`. Config in `drizzle.config.ts` (reads `.env.local`).

### Key Lib Modules

- `lib/thread-processors.ts` — Processes raw CLI data into thread/message records
- `lib/thread-mutations.ts` — DB mutations for threads
- `lib/thread-snapshot.ts` — Thread state snapshots
- `lib/ai/summarize-thread.ts` — AI-powered thread summarization
- `lib/assistant/store.ts` — Assistant sidebar state
- `lib/search/` — FlexSearch indexing and React hook (`use-thread-search.ts`)
- `lib/auth-client.ts` — Client-side auth helpers
- `lib/use-virtual-messages.ts` — Virtual scrolling for long conversations

### CLI Data Ingestion

The CLI sends JSONL session data. See `CLI_DATA_SPEC.md` for the full spec of what's available — messages include structured content blocks (text, thinking, tool_use, tool_result, images) beyond the flattened text.

## Design System

**Read `DESIGN.md` before any UI work.** It is the source of truth for all visual decisions.

Key constraints:
- Dark mode only (`color-scheme: dark`), warm stone-tinted palette
- No floating bubble/FAB buttons — integrate triggers into existing UI
- No gradients, glow effects, shadows for depth (use surface color hierarchy)
- No bold text — weights are 400 (body) and 500 (headlines) only
- Monochrome logos only
- All design tokens defined as CSS custom properties in `app/globals.css`
- Custom SVG icon components — no external icon library (`app/components/icons.tsx`)
- Base font size 13px, golden ratio scale
- `rounded-[4px]` default radius, `rounded-[2px]` for inline elements
- Animations: `animate-reveal`, `animate-blink`, `animate-border-pulse` — all respect `prefers-reduced-motion`
