# Architecture

## Runtime Stack

- Frontend: Vite + React.
- Hosting: Cloudflare Pages.
- Server boundary: Cloudflare Pages Function at `functions/api/gemini.js`.
- Database/Auth/Storage: Supabase.
- AI calls: Gemini is optional visual/advisory fallback only and must go through `/api/gemini` when explicitly enabled with `VITE_GEMINI_ADVISORY_FALLBACK_ENABLED=true`. Scanner, Discord, and RAG persistence must remain Gemini-independent. RAG vector embeddings use an app-owned deterministic 768-dimension fallback by default; optional Gemini RAG embeddings require `VITE_GEMINI_RAG_EMBEDDINGS_ENABLED=true` or `GEMINI_RAG_EMBEDDINGS_ENABLED=true`. Optional OpenAI validation, when enabled, must use its Cloudflare function boundary and may only validate extracted chart facts.

## Primary Data Flow

1. NinjaTrader OHLC and durable `market_bars` provide the primary market facts for scanner, Discord, and RAG workflows.
2. User-uploaded screenshots may provide optional visual/advisory context only when the Gemini fallback flag is enabled.
3. Frontend prepares the image and session context for the approved Cloudflare API boundary only in that optional fallback mode.
4. AI/OHLC extraction returns structured chart facts: candles, swings, levels, FVG zones, liquidity events, session context, and confidence flags. AI facts are lower authority than NinjaTrader OHLC and cannot overwrite OHLC-derived fields.
5. The setup scanner applies approved setup definitions to those facts.
6. The ranking layer scores executable and conditional opportunities.
7. The app-owned trade decision pipeline approves, waits, rejects, or marks conditional.
8. The app computes executable T1/T2 from ENTRY and STOP.
9. Supabase stores setup/trade/RAG records with storage URLs and metadata.
10. RAG context feeds future Morning, Lunch, and Replay analysis.

## Key Files

- `src/App.tsx`: top-level app state, auth/session bootstrapping, tab routing.
- Active UI routes:
  - `RAG Admin` -> `src/components/AdminDashboard.tsx`, with `DataHealthPanel.tsx`.
  - `Trading Workflow` -> `src/components/SessionLab.tsx`.
  - `Trade Archive` -> `src/components/TradeLog.tsx`.
  - `Settings` -> `src/components/Settings.tsx`, with `DataHealthPanel.tsx`.
- `src/components/SessionLab.tsx`: active Morning / AM and Lunch / PM Review workflow shell. It owns screenshot staging display, the workflow strip, session chips, advanced data/model disclosure, decision display, outcome/proof, and journal/RAG status.
- `src/components/ReplayLab.tsx`: retained inactive replay/backtest source material. It is not an active `App.tsx` tab and should not be activated as-is.
- `docs/REPLAY_BACKTEST_REQUIREMENTS.md`: preserved replay/backtest requirements and future rewrite architecture.
- `docs/TRADING_RULES_REFERENCE.md`: current source-of-truth-aligned rules reference for active primary models, supporting evidence, deprecated historical setup families, risk/target standards, and alert/reporting standards.
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

Removed legacy UI shells are not part of the active architecture: old standalone analysis/dashboard components, the retired Rules UI, and their old animation/progress/model/cost/simulation child panels were removed during legacy UI cleanup after route-map smoke coverage was added.

## Discord And Renderer Standard

- Morning scheduled alerts, Lunch scheduled alerts, and live scanner alerts use the shared compact Discord summary formatter.
- Main Discord content stays short and mobile-readable; detailed audit JSON is kept outside the main message.
- Discord payload validation runs before send.
- When an active plan candidate exists, alerts attach both:
  - Chart Plan PNG.
  - Price Level Map / Risk-Reward Ladder PNG.
- Chart rendering uses OHLC-driven annotation anchors. Label boxes may shift for readability, but numbered marker anchors stay tied to real event price/time coordinates.

## Ownership Boundaries

AI/OHLC extraction owns:

- Chart observation and OCR-style extraction.
- Structured candle, level, swing, FVG, liquidity, and session context facts.
- Advisory summaries for display only.
- Gemini unavailability must not block scanner, Discord, RAG persistence, or RAG vector generation.
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
