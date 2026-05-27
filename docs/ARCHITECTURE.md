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
- Active UI routes:
  - `RAG Admin` -> `src/components/AdminDashboard.tsx`, with `DataHealthPanel.tsx`.
  - `Trading Workflow` -> `src/components/SessionLab.tsx`.
  - `Trade Archive` -> `src/components/TradeLog.tsx`.
  - `Settings` -> `src/components/Settings.tsx`, with `DataHealthPanel.tsx`.
- `src/components/SessionLab.tsx`: active Morning / AM and Lunch / PM Review workflow shell. It owns screenshot staging display, the workflow strip, session chips, advanced data/model disclosure, decision display, outcome/proof, and journal/RAG status.
- `src/components/ReplayLab.tsx`: retained legacy/reference replay component. It is not an active `App.tsx` tab unless explicitly reintroduced later.
- `src/components/Rules.tsx`: retained legacy/reference rule UI. It is not an active `App.tsx` tab.
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

Removed legacy UI shells are not part of the active architecture: old standalone analysis/dashboard components and their old animation/progress/model/cost/simulation child panels were removed during legacy UI cleanup after route-map smoke coverage was added.

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
