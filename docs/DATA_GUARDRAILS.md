# Data Guardrails

## Source Of Truth

Canonical values should live in one place:

- Time windows: `src/config/timeWindows.ts`.
- App-owned trade math: `src/lib/tradePlan.ts`.
- Session orchestration: `src/lib/planEngine.ts`.
- Supabase schema: `supabase/migrations`.
- Security rules: `security_spec.md`.

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
