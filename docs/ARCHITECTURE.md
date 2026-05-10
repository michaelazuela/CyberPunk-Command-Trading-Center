# Architecture

## Runtime Stack

- Frontend: Vite + React.
- Hosting: Cloudflare Pages.
- Server boundary: Cloudflare Pages Function at `functions/api/gemini.js`.
- Database/Auth/Storage: Supabase.
- AI calls: Gemini through `/api/gemini` only.

## Primary Data Flow

1. User uploads or pastes a chart screenshot.
2. Frontend prepares the image and session context.
3. Frontend calls `/api/gemini`.
4. Gemini returns chart interpretation and advisory setup data.
5. The app-owned plan engine normalizes the analysis into a trade decision.
6. The app computes executable T1/T2 from ENTRY and STOP.
7. Supabase stores setup/trade/RAG records with storage URLs and metadata.
8. RAG context feeds future Morning, Lunch, and Replay analysis.

## Key Files

- `src/App.tsx`: top-level app state, auth/session bootstrapping, tab routing.
- `src/components/Analysis.tsx`: Morning Analysis workflow.
- `src/components/LunchReversal.tsx`: Lunch Reversal workflow.
- `src/components/ReplayLab.tsx`: historical replay workflow.
- `src/lib/gemini.ts`: screenshot analysis client and prompt construction.
- `src/lib/planEngine.ts`: app-owned plan orchestration.
- `src/lib/tradePlan.ts`: normalized trade plan extraction and T1/T2 math.
- `src/lib/rag.ts`: RAG save/retrieve/update logic.
- `src/lib/cloudStorage.ts`: Supabase Storage and setup persistence.
- `src/lib/supabaseTradeService.ts`: Supabase trade persistence.
- `src/config/timeWindows.ts`: canonical time windows.
- `functions/api/gemini.js`: Cloudflare Gemini proxy.
- `supabase/migrations`: database schema history.

## Ownership Boundaries

Gemini owns:

- Chart observation.
- OCR-style extraction.
- Advisory setup notes.
- Trade management narrative.
- Proof screenshot review.

The app owns:

- Whether a trade is executable.
- ENTRY/STOP validation.
- T1/T2 target math.
- Session type consistency.
- Save receipts and RAG persistence.
- Firebase guardrails.

Supabase owns:

- Auth identity.
- User-scoped records.
- Storage buckets.
- RAG/vector metadata.

Cloudflare owns:

- Static hosting.
- Gemini secret boundary.
- `/api/gemini` request proxy.
