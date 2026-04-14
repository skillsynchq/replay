# Self-hosting Replay

This guide walks you through running your own Replay instance. You'll need accounts on a few third-party services for the database, OAuth, and the AI assistant.

## Prerequisites

- [Bun](https://bun.sh) — the project uses Bun for install, scripts, and the runtime on Vercel
- A [Neon](https://neon.tech) account (serverless Postgres)
- GitHub and/or Google OAuth apps
- An [Anthropic API](https://console.anthropic.com) key (for the assistant sidebar)
- Optional: [PostHog](https://posthog.com) for analytics
- Optional: [Vercel](https://vercel.com) for hosting (any Node/Bun host works)

## 1. Clone and install

```bash
git clone https://github.com/<your-fork>/replay.git
cd replay
bun install
cp .env.example .env.local
```

## 2. Set up Neon (database)

1. Create a project at [console.neon.tech](https://console.neon.tech).
2. In the connection details, copy the **pooled** connection string — the hostname ends in `-pooler`.
3. Put it in `.env.local` as `DATABASE_URL`.

Then push the schema:

```bash
bun drizzle-kit push
```

This creates the `thread`, `message`, `threadShare`, and Better Auth tables.

## 3. Generate the auth secret

```bash
openssl rand -base64 32
```

Put the output in `BETTER_AUTH_SECRET`. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your deployed URL (use `http://localhost:3000` locally).

## 4. GitHub OAuth

1. Go to GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App.
2. Homepage URL: `http://localhost:3000` (or your prod URL).
3. Authorization callback URL: `http://localhost:3000/api/auth/callback/github`.
4. Copy the client ID and generate a client secret.
5. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

For production, either register a second OAuth app or add the prod callback to the same one.

## 5. Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → **Credentials**.
2. Create an OAuth 2.0 Client ID (Web application).
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`.
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

You can skip this block if you only want GitHub login — just remove the Google provider from `lib/auth.ts`.

## 6. Anthropic API key

Grab a key from [console.anthropic.com](https://console.anthropic.com) and set `ANTHROPIC_API_KEY`. This powers the assistant sidebar and the decision-trace summaries in `lib/ai/`.

## 7. PostHog (optional)

If you don't want analytics, leave `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` blank. Otherwise create a PostHog project and paste the project API key. `NEXT_PUBLIC_POSTHOG_HOST` defaults to `https://us.i.posthog.com` — change to `https://eu.i.posthog.com` if your project is in the EU region.

## 8. Run it

```bash
bun dev
```

Open [localhost:3000](http://localhost:3000), sign in, and claim a username.

## 9. Deploy

The repo ships with `vercel.json` configured for the Bun runtime, so:

```bash
vercel
```

Set the same env vars in the Vercel dashboard. Update `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the deployed domain, and add the production OAuth callback URLs to your GitHub/Google apps.

Any host that can run Next.js 16 with Bun will work — you just need to pass the env vars through and ensure the Neon pooled connection is reachable.

## Pointing the CLI at your instance

The Replay CLI defaults to `replay.md`. To upload sessions to your own host, set:

```bash
export REPLAY_API_URL=https://your-domain.example
replay login
```

## Environment reference

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon pooled Postgres connection |
| `BETTER_AUTH_SECRET` | yes | Session signing secret |
| `BETTER_AUTH_URL` | yes | Base URL Better Auth uses for callbacks |
| `NEXT_PUBLIC_APP_URL` | yes | Public base URL (used for thread links) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | yes* | GitHub OAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | yes* | Google OAuth |
| `ANTHROPIC_API_KEY` | yes | AI assistant + summaries |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | no | Analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | no | PostHog region host |

\* At least one OAuth provider is required.
