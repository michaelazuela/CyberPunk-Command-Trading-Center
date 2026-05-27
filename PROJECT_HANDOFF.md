# Project Handoff: Quant Desk MES/MNQ Trading App

Last updated: 2026-05-26

## 1. Current Project Purpose

This repository is a MES/MNQ futures trading decision-support platform. The current direction is a professional, ICT-informed, deterministic trading desk workflow:

- NinjaTrader provides factual OHLC data through a local read-only bridge.
- Supabase stores market bars, RAG records, trade/journal records, and app data.
- Cloudflare Pages hosts the app and provides API functions for model calls and Discord interaction endpoints.
- Discord is the primary trade-alert surface.
- The web UI includes an active Trading Workflow for Morning / AM and Lunch / PM Review, plus RAG/admin, archive, and settings tabs.
- The system must never place automated orders.

The app should generate decision-support plans only. Trade approval authority remains with app-owned deterministic engines, not AI text, screenshots, Discord cards, or time windows alone.

## 2. Current Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind-style CSS variables, lucide-react icons.
- Backend/platform: Cloudflare Pages + Pages Functions.
- Database/auth/storage: Supabase.
- Local market data: NinjaTrader 8 AddOn bridge, read-only, local host at `http://127.0.0.1:8765`.
- Local automation: Node/tsx scripts in `tools/automation`.
- AI providers:
  - Gemini through Cloudflare function `/api/gemini`.
  - Optional OpenAI validation through Cloudflare function `/api/openai`.
  - AI extracts facts only; AI does not approve trades.
- Discord:
  - Outbound webhook alerts from local automation.
  - Cloudflare `/api/discord-interactions` endpoint for Discord interaction verification.
  - Outcome buttons feed RAG/journal learning only.

Important npm scripts:

```bash
npm run dev
npm run build
npm run lint
npm test
npm run nt:scanner
npm run nt:candle-recorder
npm run nt:backfill
npm run nt:discord-alerts
```

Guards are wired into `npm run lint`:

```bash
npm run guard:no-firebase
npm run guard:legacy-rules
npm run guard:architecture
npm run guard:schema
```

## 3. Current App Structure And Important Files

Top-level guidance:

- `AGENTS.md`: primary architecture and agent rules. Read this first.
- `PROJECT_RULES.md`: Supabase/Cloudflare-only rule, Firebase prohibition, AI authority boundaries.
- `PROJECT_HANDOFF.md`: this file.

Frontend:

- `src/App.tsx`: current navigation shell. Active tabs are `RAG Admin`, `Trading Workflow`, `Trade Archive`, and `Settings`.
- `src/components/AdminDashboard.tsx`: active RAG/admin status, logs, Discord/RAG visibility, and operational checks.
- `src/components/DataHealthPanel.tsx`: checks Supabase/RAG/market bar health.
- `src/components/SessionLab.tsx`: active Trading Workflow for Morning / AM and Lunch / PM Review. It includes the workflow strip, session chips, visible screenshot/precheck states, advanced data/model controls disclosure, decision card, outcome/proof flow, and journal/RAG status.
- `src/components/TradeLog.tsx`: trade archive view.
- `src/components/Settings.tsx`: system configuration UI.
- `src/components/FinalTradePlanCard.tsx`: reusable trade plan / decision display component.
- `src/components/ReplayLab.tsx`: retained inactive replay/backtest source material, not an active `App.tsx` tab and not safe to activate as-is.
- `docs/REPLAY_BACKTEST_REQUIREMENTS.md`: preserved replay/backtest requirements and future rewrite architecture.
- `docs/TRADING_RULES_REFERENCE.md`: current source-of-truth-aligned rules reference for active primary models, supporting evidence, deprecated historical setup families, risk/target standards, and alert/reporting standards.
- Removed legacy UI shells/components: old standalone analysis/dashboard UI, old agent animation/progress/model panel UI, old API cost panel, old Monte Carlo panel, and the unused workflow mode toggle.

Trading configuration:

- `src/config/timeWindows.ts`: canonical morning/lunch time windows.
- `src/config/tradeRules.ts`: current allowed active setup models and supporting evidence list.
- `src/config/setupRegistry.ts`: setup registry with `role` metadata:
  - `primary_model`
  - `supporting_evidence`
  - `deprecated`
- `src/config/setupRegistry.test.ts`: focused registry role/accessor tests.

Trading engines:

- `src/lib/setupScanner.ts`: active candidate scanner. Phase D changed it so only primary models create active candidates.
- `src/lib/conditionalPlanBuilder.ts`: deterministic conditional plan builder. It now filters output to primary model setup types only.
- `src/lib/tradeDecisionPipeline.ts`: app-owned final decision pipeline.
- `src/lib/planEngine.ts` and `src/lib/tradePlan.ts`: normalized app-owned plan construction.
- `src/lib/localScannerEngine.ts`: local scanner state, scoring, Discord alert eligibility, market mapping behavior.
- `src/lib/targetObjectiveEngine.ts`: target map and target cascade logic.
- `src/lib/sessionStructure.ts`: session segmentation and context story.
- `src/lib/sessionLevelContextEngine.ts`: session level relationship and strength context.
- `src/lib/levelSanityEngine.ts`: rejects stale/impossible extracted levels.
- `src/lib/ninjaTraderBridge.ts`: local bridge client and OHLC fact conversion.
- `src/lib/rag.ts`, `src/lib/embeddings.ts`: RAG save/search/embedding support.
- `src/lib/tradeJournal.ts`: journal structure for later stats/Monte Carlo style analysis.

Automation:

- `tools/automation/nt-scanner.ts`: local continuous scanner with Discord alerting.
- `tools/automation/candle-recorder.ts`: writes bridge OHLC into Supabase `market_bars`.
- `tools/automation/backfill-market-bars.ts`: backfills historical bars from the bridge.
- `tools/automation/discord-scheduler.ts`: scheduled Discord plan alerts and RAG pending records.
- `tools/automation/Start Quant Desk Live.cmd`: launches live local workflow.
- `tools/automation/Start Quant Desk Discord Alerts.cmd`: launches Discord alert workflow.

Cloudflare functions:

- `functions/api/gemini.js`: Gemini proxy.
- `functions/api/openai.js`: optional OpenAI validation proxy.
- `functions/api/discord-interactions.js`: Discord interactions endpoint.

Supabase:

- `supabase/migrations`: schema migrations.
- `market_bars`: durable compact OHLCV cache for `5m`, `15m`, `60m`, and `240m`.

## 4. Current Trading Rules Implemented

The app is currently moving to a clean primary-model-only scanner.

Active primary models:

1. `SetupType.SweepMssFvgRetrace`
   - User-facing label: `Sweep -> MSS -> FVG Retrace`
   - Concept: sweep, reclaim, displacement, market structure shift, FVG/imbalance retrace, minimum 2.0R.
2. `SetupType.TurtleSoup`
   - User-facing label: `Turtle Soup Reversal`
   - Concept: failed breakout/breakdown after a liquidity sweep, reclaim back inside, stop beyond sweep wick, opposing liquidity target, minimum 2.0R.

Supporting evidence only:

- Liquidity sweep.
- Imbalance/FVG facts.
- Imbalance pullback facts.
- Market structure shift.
- Resting liquidity pools.
- Previous day/session sweep facts.
- Breaker/FVG overlap confluence.
- Wick rejection support.
- Premium/discount and higher-timeframe alignment when available.

Deprecated setup families:

- Older custom morning/lunch/session setup families and generic momentum/continuation families must not create active candidates.
- Deprecated entries may remain typed in the registry for backward compatibility and historical reference, but they must not become `candidate.setupType` in active scanner output.

Current Phase D behavior:

- `scanSetupCandidates()` uses `getPrimarySetupRegistry(sessionType)`.
- Supporting evidence may contribute evidence, missing evidence, tags, notes, and scoring signals.
- Supporting evidence does not independently create an active trade candidate.
- Deprecated entries do not create active trade candidates.
- `TRADE_RULES.sessions.*.allowedSetups` is limited to the two primary models.
- `tradeDecisionPipeline.setupFromText()` maps advisory text only to the two primary models or `NoSetup`.
- `conditionalPlanBuilder` filters returned plans to primary model setup types.

Execution authority rules:

- 5M remains execution authority.
- Higher timeframes are map/target context only.
- Stop must be tied to protected structure.
- Actual risk is calculated from entry to structure stop.
- Tactical targets remain R-based from actual risk.
- Target map uses real liquidity first for management context:
  - session highs/lows
  - swing highs/lows
  - equal high/low pools
  - prior day/week/month levels
- Imbalances, gaps, opens, and round numbers are obstacles/reaction zones, not liquidity targets.
- No trade may be approved from current price alone, time window alone, screenshot text alone, AI text alone, old labels, or unfinished candles.

## 5. Current UI Tabs And Active/Deprecated Status

Active navigation in `src/App.tsx`:

- `RAG Admin`
  - Intended for data health, RAG/admin status, logs, Discord/RAG visibility, and operational checks.
- `Trading Workflow`
  - Active `SessionLab` workflow for Morning / AM and Lunch / PM Review.
  - User flow: Screenshot staged -> Analyze -> Decision -> Outcome/Proof -> Journal/RAG.
  - Advanced bridge/model/provider diagnostics live behind `Advanced data/model controls`.
  - Screenshot/OCR/precheck states are visible and session-specific.
- `Trade Archive`
  - Trade/journal archive.
  - Used for historical trade records, not live execution.
- `Settings`
  - Local app settings.
  - Discord/scanner/Supabase/UI configuration visibility.

Retained inactive source material:

- `ReplayLab.tsx`

This component is not an active `App.tsx` tab. It should not be re-added to main navigation unless it is rewritten around shared Trading Workflow components and the primary-model-only architecture is preserved. The retired Rules UI was converted into `docs/TRADING_RULES_REFERENCE.md` and removed.

## 6. Current Replay Window Workflow

Replay is no longer the primary user-facing workflow, but replay/testing still matters for validation and RAG learning.

Current intended replay flow:

1. Historical OHLC is loaded through NinjaTrader bridge/backfill into Supabase `market_bars`.
2. Replay analysis should read cached OHLC first.
3. If cache has gaps, local tools may repair gaps from the bridge.
4. The same live rule engine should be reused for replay sessions:
   - `replay_morning` uses live morning rules.
   - `replay_lunch` uses live lunch rules.
5. Replay outcomes should write replay-specific RAG/journal context.
6. Discord outcome buttons can record whether a replay/trade plan was taken, missed, stopped, or reached targets, but buttons do not approve trades.

Known tension:

- Old Replay Lab UI still exists but should be treated as inactive source material unless rewritten. See `docs/REPLAY_BACKTEST_REQUIREMENTS.md`.
- Replay tests should validate the scanner/pipeline, not restore old custom setup families.

## 7. Current AM/PM Workflow Requirements

The old AM/PM toggle in Replay Lab originally represented chart timezone/context for uploaded review screenshots, not a separate trading rule.

Current preferred model:

- Live scanner and automation should use deterministic ET handling.
- The NinjaTrader bridge can be configured for bar timestamp mode/timezone.
- Completed 5M candles must be used for confirmation.
- The scanner may poll frequently for heads-up context, but actionable planning must still wait for completed confirmation candles.
- Morning and lunch are session types:
  - `morning`
  - `lunch`
  - `replay_morning`
  - `replay_lunch`

Canonical windows:

- Morning Analysis: 9:30 AM-11:15 AM ET.
- Opening observation/RTH mapping: 9:30 AM-10:00 AM ET. This is context/observation, not automatic trade approval.
- Lunch Review: 11:50 AM-1:00 PM ET.
- Market Mapping mode: runs 24 hours/day outside trade windows to update context, targets, levels, and bridge health. It must not generate action-ready plans outside approved windows.

Important wording:

- Use `Market Mapping Mode: context updated only` outside trade windows.
- Do not call 24-hour context collection an opening observation window.

## 8. Known Bugs Or Incomplete Items

Current known/incomplete items:

- Legacy UI cleanup removed the old standalone analysis/dashboard shells and their orphaned child panels. `SessionLab` remains the active Trading Workflow shell.
- `ReplayLab` is retained as inactive replay/backtest source material. Do not activate it as-is; rewrite around shared Trading Workflow components first.
- The retired Rules UI was converted into `docs/TRADING_RULES_REFERENCE.md` and removed.
- `conditionalPlanBuilder.ts` still contains deprecated internal builder code, but returned candidates are filtered to primary models. A later phase should remove or archive unused deprecated builder branches.
- Some tests still mention deprecated component/builders as negative tests to prove they do not create active candidates.
- `AGENTS.md` still contains older examples of approved setup types in a few explanatory bullets. Update carefully only if it will not confuse future agents.
- The app has Vite build warnings:
  - `src/lib/rag.ts` is both dynamically and statically imported.
  - Main JS chunk is over 500 kB.
  These are warnings, not current build failures.
- Discord alerts use the shared compact summary formatter across scheduled Morning, scheduled Lunch, and live scanner alerts. Main content stays short and validated before send. Chart Plan and Price Level Map / Risk-Reward Ladder are the standard visual attachments when an active plan candidate exists. Audit JSON stays outside the main message.
- The market data recorder/backfill depends on NinjaTrader and the bridge being open. If the latest completed 5M candle is stale, restart NinjaTrader/bridge/local live script and check bar timezone/timestamp mode.
- Supabase RAG outcome button flow requires these environment values in Cloudflare/local automation where applicable:
  - `SUPABASE_URL` or `VITE_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DISCORD_RAG_USER_ID`
  - `DISCORD_OUTCOME_BASE_URL`
  - `DISCORD_OUTCOME_SECRET`
  - `DISCORD_PUBLIC_KEY`
- OpenAI validation requires `OPENAI_API_KEY` as a Cloudflare secret only.
- Gemini requires `GEMINI_API_KEY` as a Cloudflare secret only.

Current validation status from latest Phase D work:

- `npm run lint`: passed.
- `npm test`: passed.
- `npm run build`: passed with Vite warnings only.

## 9. Important User Preferences

- User wants a disciplined futures trading desk product voice: direct, specific, risk-first, no hype.
- User does not want the app to sound like an ICT glossary. Use professional trading vocabulary.
- User wants Discord to be the primary trade-alert interface.
- User wants the UI to keep live review clear and disciplined while Discord remains the primary alert surface.
- User wants NinjaTrader OHLC treated as factual when available.
- User wants all timeframes machine-readable before engines consume them.
- User wants higher timeframe context:
  - 4H: macro liquidity and structural objectives.
  - 1H: intraday/session structure.
  - 15M: session map, liquidity, displacement, imbalance, targets.
  - 5M: execution trigger, stop, risk, final approval.
- User wants real liquidity targets distinguished from obstacles/reaction zones.
- User wants concise Discord cards using the shared compact alert-summary standard.
- User wants Discord outcome buttons to feed RAG/journal learning.
- User does not want automated order placement.
- User wants no Firebase of any kind.
- User prefers MES as primary; MNQ support should not break MES.
- Dark mode remains primary.
- User wants no secret values printed.

## 10. Exact Next Steps For The Next Codex Session

Start every next session with:

```bash
git status --short
```

Respect unrelated modified/untracked files. Generated dry-run artifacts should remain ignored.

Recommended next technical steps:

1. Commit or review Phase B/C/D changes as a coherent checkpoint.
   - Include `PROJECT_HANDOFF.md`.
   - Do not accidentally stage untracked folders unless intentionally needed.
2. Run validation before any push:

```bash
npm run lint
npm test
npm run build
```

3. Clean up deprecated internals carefully:
   - Remove or archive deprecated builder branches inside `conditionalPlanBuilder.ts` only after tests prove Model 1 and Turtle Soup still work.
   - Do not remove enum values yet if migrations/RAG/history depend on them.
4. Update docs/agents to match primary-model-only scanner language:
   - `AGENTS.md`
   - Any active docs used by RAG indexing.
   - Avoid reintroducing old custom rule labels.
5. Make sure Discord alerts consume the same primary candidate selection as scanner/pipeline.
   - Discord should not show supporting evidence as the model type.
   - Discord should show model type as `Sweep -> MSS -> FVG Retrace` or `Turtle Soup Reversal`.
6. Confirm the UI reflects the current architecture:
   - Discord primary for alerts.
   - Trading Workflow for live Morning / AM and Lunch / PM Review.
   - RAG/admin/logs/search/settings remain operational support surfaces.
7. Test local live workflow with NinjaTrader open:

```bash
npm run nt:candle-recorder -- --instrument MES --bridge-instrument "MES 06-26" --bridge-url http://127.0.0.1:8765 --poll-seconds 30
npm run nt:scanner -- --instrument MES --bridge-instrument "MES 06-26" --bridge-url http://127.0.0.1:8765 --dry-run
```

8. If latest bars are stale:
   - Confirm NinjaTrader chart/data feed is live.
   - Confirm bridge is reachable at `http://127.0.0.1:8765`.
   - Confirm selected contract matches current front month.
   - Confirm bar timestamp mode/timezone setting.
9. Before sending real Discord alerts:
   - Dry run first.
   - Confirm webhook environment variables are present.
   - Confirm RAG outcome button base URL/secret are set.
10. Keep final trade approval strict:
   - Completed 5M trigger.
   - Structure stop.
   - Actual risk.
   - Target room.
   - Time-window gate.
   - Confidence/state gate.
   - No automated orders.

Most important next-session warning:

Do not restore old custom setup families as active candidates. The active scanner should only create primary candidates for:

- `SetupType.SweepMssFvgRetrace`
- `SetupType.TurtleSoup`

Everything else is supporting evidence, deprecated compatibility, or historical/RAG context.
