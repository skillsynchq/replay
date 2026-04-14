<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into Replay. Client-side analytics are initialized via `instrumentation-client.ts` (Next.js 15.3+ pattern) with a reverse proxy through `/ingest` to avoid ad-blockers. A shared server-side client in `lib/posthog-server.ts` is used across all API routes. User identity is correlated between client and server: `posthog.identify()` is called on the client after username is saved, and `posthog.identify()` is called on the server-side PostHog client after username is claimed via the API. Error tracking is enabled via `capture_exceptions: true` in the client init.

| Event | Description | File |
|---|---|---|
| `sign_in_clicked` | User clicks GitHub or Google sign-in button | `app/login/login-form.tsx` |
| `thread_starred` | User stars a thread | `app/components/star-button.tsx` |
| `thread_unstarred` | User unstars a thread | `app/components/star-button.tsx` |
| `thread_visibility_changed` | Owner changes thread visibility (with from/to values) | `app/components/visibility-selector.tsx` |
| `username_saved` | User saves their username on the client | `app/(app)/settings/settings-client.tsx` |
| `thread_uploaded` | CLI uploads a new thread — core product usage event | `app/api/threads/route.ts` |
| `thread_reuploaded` | CLI re-uploads (updates) an existing thread | `app/api/threads/[slug]/route.ts` |
| `thread_deleted` | Owner deletes a thread | `app/api/threads/[slug]/route.ts` |
| `thread_shared` | Owner shares a thread with another user | `app/api/threads/[slug]/share/route.ts` |
| `username_claimed` | Server confirms a username update | `app/api/users/me/route.ts` |
| `assistant_queried` | User sends a new query to the AI assistant sidebar | `app/api/assistant/route.ts` |

## LLM analytics

The Anthropic client in `app/api/assistant/route.ts` is wrapped with `@posthog/ai`'s `Anthropic` class. Every call to `client.messages.stream()` now automatically captures a `$ai_generation` event in PostHog with model, token counts, latency, cost, and full input/output. A unique `traceId` (`crypto.randomUUID()`) is generated per HTTP request and threaded through all agent loop iterations as `posthogTraceId`, grouping multi-step tool-use turns into a single trace. The user's `distinctId` is passed as `posthogDistinctId` so LLM generations are linked to their PostHog profile.

| Property auto-captured | Description |
|---|---|
| `$ai_model` | Model name (e.g. `claude-haiku-4-5`) |
| `$ai_input_tokens` | Input token count |
| `$ai_output_tokens` | Output token count |
| `$ai_total_cost_usd` | Estimated cost in USD |
| `$ai_latency` | Latency in seconds |
| `$ai_input` | Full message array sent to the model |
| `$ai_output_choices` | Full response from the model |

> **Requires:** `bun add @posthog/ai` (also `bun add posthog-js posthog-node` from the base integration if not yet done)

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/211694/dashboard/1465393
- **New user activation funnel** (sign_in_clicked → username_saved): https://us.posthog.com/project/211694/insights/CZ7AzDqN
- **Thread uploads over time**: https://us.posthog.com/project/211694/insights/arrwHQEW
- **Thread engagement** (uploaded vs starred vs shared): https://us.posthog.com/project/211694/insights/JpsWghKt
- **Thread visibility distribution** (breakdown by target visibility): https://us.posthog.com/project/211694/insights/2srKJ2Dc
- **Thread deletion rate** (uploaded vs deleted): https://us.posthog.com/project/211694/insights/FWQomBxd
- **LLM generation cost over time**: https://us.posthog.com/project/211694/insights/CzAumoOS
- **LLM average latency**: https://us.posthog.com/project/211694/insights/aSgk7mh6

You can also explore all LLM traces at https://us.posthog.com/llm-analytics/generations

### Agent skill

We've left agent skill folders in your project at `.claude/skills/integration-nextjs-app-router/` and `.claude/skills/llm-analytics-setup/`. You can use these for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
