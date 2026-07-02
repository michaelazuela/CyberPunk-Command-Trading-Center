# Data Guardrails

## Source Of Truth

Canonical values should live in one place:

- Time windows: `src/config/timeWindows.ts`.
- App-owned trade math: `src/lib/tradePlan.ts`.
- Session orchestration: `src/lib/planEngine.ts`.
- Supabase schema: `supabase/migrations`.
- Security rules: `security_spec.md`.

## OHLC Fact Authority

NinjaTrader real-time and historical OHLC is the highest-authority market data path.

- Treat imported OHLC bars and OHLC-derived facts as factual: candles, swings, FVG/imbalance zones, liquidity sweeps, reclaims, failed breaks, displacement candles, session highs/lows, structural levels, target context, and session story.
- Durable candle cache reads and repairs should use `market_bars` first, then the NinjaTrader bridge when repair/backfill is needed.
- AI screenshot extraction may fill a missing field, but it must not overwrite an existing OHLC-derived field.
- If AI visual extraction conflicts with OHLC, trust OHLC and downgrade or ignore the visual extraction for that field.
- Gemini screenshot extraction is optional visual/advisory fallback only. If Gemini is unavailable or disabled, scanner, Discord, RAG persistence, and RAG vector generation must continue from NinjaTrader OHLC and app-owned facts.
- OHLC facts are still inputs only. They do not approve a setup or trade by themselves; the setup scanner, ranking engine, and trade decision pipeline remain required.

## Multi-Timeframe OHLC Rule

When the NinjaTrader bridge is available, fetch and evaluate the market in layers:

- `4H`: macro context, broad liquidity, large displacement, and major range boundaries.
- `1H`: session structure, overnight trend, larger imbalance zones, and ETH return/expansion behavior.
- `15M`: primary session liquidity map, Asian/London/NY premarket highs/lows, LQ1/LQ2/Runner objectives, and target obstacles.
- `5M`: execution authority for trigger, entry, stop, risk, invalidation, and final approval.

Higher timeframe levels may improve target management and setup ranking, but they must not approve trades or replace the 5M execution chart.

Bridge timeframes must be machine-readable before they influence the app-owned engines. The correct flow is:

```text
4H / 1H / 15M / 5M OHLC
↓
structured multi-timeframe facts
↓
setup scanner + ranking engine + target engine
↓
strict trade decision pipeline
```

Do not use Gemini narrative, Discord copy, or plain-English notes as the linking layer between timeframes. The linking layer must be structured OHLC-derived facts.

## Persistence Rules

- Do not store base64 screenshots in database rows.
- Store Supabase Storage URLs and metadata.
- Store normalized plan JSON when saving setup/trade/RAG records.
- Store plan traceability values such as plan version, setup signature, and save receipt where schema allows.
- Keep replay data separate by session type: `replay_morning` and `replay_lunch`.

## RAG Rules

RAG should learn from:

- Live Morning analysis.
- Live Lunch analysis.
- Replay Morning analysis.
- Replay Lunch analysis.
- Historical outcomes.
- Proof screenshots and review verdicts.
- Midnight Open context.

RAG errors should not block the user-facing analysis. Save what can be saved, surface a clear database error only when the user is trying to mark an outcome or save proof.

## Duplicate Protection

Before adding duplicate saves, compare:

- User ID.
- Trading date.
- Session type.
- Instrument.
- Setup signature.
- Screenshot URL when available.

If a likely duplicate is found, warn before saving another replay record.

## Supabase Expectations

Required tables include:

- `setups`
- `trades`
- `trade_embeddings`

Required storage buckets include:

- `analysis-screenshots`
- `trade-proofs`

RLS should restrict user-owned rows to `auth.uid()`.

## Schema Guard

Run this after migration or persistence changes:

```bash
npm run guard:schema
```

The schema guard checks that migration files still define the core tables, storage buckets, RAG/vector pieces, replay outcome fields, required screenshot range fields, Midnight Open fields, and plan traceability columns that the app expects.
