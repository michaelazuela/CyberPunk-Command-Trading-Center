# Architecture

## Runtime Stack

- Frontend: Vite + React.
- Hosting: Cloudflare Pages.
- Server boundary: Cloudflare Pages Function at `functions/api/gemini.js`.
- Database/Auth/Storage: Supabase.
- AI calls: Gemini through `/api/gemini` only by default. Optional OpenAI validation, when enabled, must use its Cloudflare function boundary and may only validate extracted chart facts.

## Primary Data Flow

1. User uploads or pastes a chart screenshot.
2. Frontend prepares the image and session context.
3. Frontend calls the approved Cloudflare API boundary.
4. AI/OHLC extraction returns structured chart facts: candles, swings, levels, FVG zones, liquidity events, session context, and confidence flags.
5. The setup scanner applies approved setup definitions to those facts.
6. The ranking layer scores executable and conditional opportunities.
7. The app-owned trade decision pipeline approves, waits, rejects, or marks conditional.
8. The app computes executable T1/T2 from ENTRY and STOP.
9. Supabase stores setup/trade/RAG records with storage URLs and metadata.
10. RAG context feeds future Morning, Lunch, and Replay analysis.

## Key Files

- `src/App.tsx`: top-level app state, auth/session bootstrapping, tab routing.
- `src/components/Analysis.tsx`: Morning Analysis workflow.
- `src/components/LunchReversal.tsx`: Lunch Reversal workflow.
- `src/components/ReplayLab.tsx`: historical replay workflow.
- `src/lib/gemini.ts`: screenshot analysis client and prompt construction.
- `src/lib/openai.ts`: optional OpenAI chart-fact validation client.
- `src/lib/planEngine.ts`: app-owned plan orchestration.
- `src/lib/tradePlan.ts`: normalized trade plan extraction and T1/T2 math.
- `src/lib/setupScanner.ts`: approved setup scan and candidate scoring inputs.
- `src/lib/tradeDecisionPipeline.ts`: deterministic final trade decision pipeline.
- `src/lib/conditionalPlanBuilder.ts`: deterministic wait/conditional planning paths.
- `src/lib/sessionLevelContextEngine.ts`: Asian/London/NY/ETH/RTH market map context.
- `src/lib/targetObjectiveEngine.ts`: fixed-R target context plus liquidity/runner objectives.
- `src/lib/ninjaTraderBridge.ts`: read-only NinjaTrader OHLC bridge client.
- `src/lib/rag.ts`: RAG save/retrieve/update logic.
- `src/lib/cloudStorage.ts`: Supabase Storage and setup persistence.
- `src/lib/supabaseTradeService.ts`: Supabase trade persistence.
- `src/config/timeWindows.ts`: canonical time windows.
- `functions/api/gemini.js`: Cloudflare Gemini proxy.
- `supabase/migrations`: database schema history.

## Ownership Boundaries

AI/OHLC extraction owns:

- Chart observation and OCR-style extraction.
- Structured candle, level, swing, FVG, liquidity, and session context facts.
- Advisory summaries for display only.
- Proof screenshot review when explicitly requested.

The app owns:

- Whether a trade is executable.
- Setup detection from approved definitions.
- Candidate scoring and conditional planning.
- ENTRY/STOP validation.
- T1/T2 target math.
- Liquidity-aware target context and runner/obstacle notes.
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
