# Security Spec: Supabase + Cloudflare

## 1. Data Invariants

- A logged-in user can only create, read, update, and delete their own trading records.
- All user-owned rows must include `user_id` matching `auth.uid()`.
- Tables exposed through the Supabase Data API must have Row Level Security enabled.
- Screenshot records should store Supabase Storage paths or signed/public URLs, not raw base64 payloads.
- Gemini API keys must never be stored in frontend code, Vite environment variables, localStorage, or the database.
- Gemini requests must be proxied through Cloudflare Pages Function `/api/gemini`.
- Trading plan execution fields must come from the app-owned plan engine, not raw Gemini advisory fields.

## 2. Supabase RLS Requirements

Required tables:

- `trades`
- `setups`
- `trade_embeddings`

Each table should enforce:

- `SELECT` only where `auth.uid() = user_id`
- `INSERT` only where `auth.uid() = user_id`
- `UPDATE` only where `auth.uid() = user_id`
- `DELETE` only where `auth.uid() = user_id`

Storage buckets:

- `analysis-screenshots`
- `trade-proofs`

Storage objects should use user-scoped paths:

```text
{user_id}/{trade_date}/{session}/{role}/{timestamp}.jpg
{user_id}/{trade_date}/{trade_or_setup_id}/{timestamp}.jpg
```

## 3. Payload Guardrails

Reject or sanitize:

1. Identity spoofing: payload `user_id` does not match `auth.uid()`.
2. Orphaned writes: missing `user_id`.
3. Ghost fields: unexpected privileged fields such as `is_admin`, `isVerified`, or role changes.
4. Oversized text: very large reasoning, OCR, notes, or embedding text payloads.
5. Invalid prices: non-numeric Entry, Stop, T1, T2, PnL, or contract fields.
6. Invalid outcomes: anything outside `win`, `loss`, `scratch`, `pending`, `no_trade`, `missed_trade`.
7. RAG injection: oversized IDs, unexpected SQL-like text in filter fields, or malformed vector payloads.
8. Base64 persistence: raw image data in database rows.
9. Unauthenticated writes.
10. Cross-user reads or updates.

## 4. Cloudflare Function Requirements

- `/api/gemini` is the only Gemini network path.
- The function reads `GEMINI_API_KEY` from Cloudflare environment variables.
- The function should not log request bodies containing screenshots or secrets.
- The function should return sanitized API errors to the frontend.

## 5. Verification Commands

Run before deployment:

```bash
npm run guard:no-firebase
npm run lint
npm run build
```

Run after schema changes:

```bash
npx supabase db query --linked -f path/to/migration.sql
```

Then verify the Settings/Data Health panel shows the expected schema columns and RAG status.
