# replay

Share AI conversations as reviewable threads. Replay ingests chat transcripts from tools like Claude, ChatGPT, and Cursor, then presents them in a clean, searchable interface where teams can browse, discuss, and learn from each other's AI interactions.

## Tech Stack

- **Framework** — Next.js 16 / React 19
- **Styling** — Tailwind CSS 4
- **Database** — Drizzle ORM + Neon (serverless Postgres)
- **Auth** — Better Auth
- **AI** — Anthropic SDK (assistant sidebar)
- **Search** — FlexSearch

## Getting Started

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
bun drizzle-kit push

# Start dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  (app)/          # Authenticated app shell
  [username]/     # Public profile / thread pages
  api/            # Route handlers
  components/     # Shared UI components
  login/          # Auth pages
  t/              # Thread routes
lib/
  ai/             # AI / assistant logic
  auth.ts         # Better Auth config
  db/             # Drizzle schema & queries
  search/         # FlexSearch indexing
```
