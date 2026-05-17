# Discord Outcome Buttons

Discord alert cards can include outcome buttons so the trader can record what actually happened after a plan was sent.

This is still decision support only. Button clicks do not approve trades, place orders, or override the app-owned pipeline. They only write the trader-confirmed outcome back to Supabase/RAG learning.

## Workflow

1. The NinjaTrader Discord scheduler builds a Morning or Lunch plan.
2. The scheduler creates a `plan_version_id`.
3. If Supabase server secrets are available, it saves a pending `trade_embeddings` row with `source = discord_alert`.
4. The scheduler posts the Discord card with signed link-buttons.
5. The trader taps the matching outcome button:
   - Long T1
   - Long T2
   - Long Liquidity
   - Long Stopped
   - Short T1
   - Short T2
   - Short Liquidity
   - Short Stopped
   - Scratch
   - Not Taken
   - Missed
6. The button opens `/api/discord-outcome`.
7. Cloudflare verifies the signed token and updates or inserts the matching RAG row.

## Required Environment Variables

Set these in `.env.local` for local scheduler tests and in Cloudflare Pages environment variables for production callbacks.

```bash
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
DISCORD_OUTCOME_BASE_URL="https://your-cloudflare-pages-site.pages.dev"
DISCORD_OUTCOME_SECRET="long-random-shared-secret"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="server-only-service-role-key"
DISCORD_RAG_USER_ID="your-supabase-auth-user-id"
```

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed in browser code. It belongs only in `.env.local` for local automation and in Cloudflare server-side secrets.

## Why Link Buttons

The current alert flow uses an incoming Discord webhook. Incoming webhooks can post embeds and link buttons. Native stateful Discord buttons require a Discord Application interaction endpoint. Link buttons are the safest first version because they work with the existing webhook and still route through Cloudflare before touching Supabase.

## RAG Fields Updated

The callback updates:

- `trade_result`
- `outcome`
- `source`
- `analysis_mode`
- `plan_version_id`
- `trade_plan_json.discordOutcome`
- `notes`

The saved `discordOutcome` object includes:

- `tradeTaken`
- `direction`
- `targetHit`
- `outcomeCode`
- `tradeResult`
- `updatedFrom`
- `updatedAt`

This lets future Morning and Lunch plans learn not just whether the trade was a win or loss, but which path was actually taken and whether T1, T2, or nearest liquidity was the result.
