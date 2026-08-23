# FVG Rulebook Handoff

Date: 2026-08-22

Scope: inventory of Fair Value Gap / FVG / fair value zap / imbalance rules added or changed in roughly the last three weeks. This correction documents that the learned FVG rule set is live as `FVG_TRADING_SYSTEM_V1`; it is not merely a research lane. No implementation behavior was changed.

## Recent Change Window

Recent git history from 2026-08-09 through 2026-08-21 is FVG-heavy:

- 2026-08-09: isolated FVG learning/proof workflow, session-window guard, protected-stop anchoring.
- 2026-08-10 through 2026-08-17: FVG learned-rule contract, balanced path, obstacle-before-T1, parent correction, defended-first precedence, same-direction parent guard, opposite-side 5M flip guard.
- 2026-08-21: learned FVG rules promoted/locked into active runtime as `FVG_TRADING_SYSTEM_V1`, setup registry collapsed to one parent model, FVG-only runtime guard added.

Search note: no first-class "fair value zap" rule was found. `zap` only appears incidentally in package lock integrity strings.

V2 check: no active `FVG_TRADING_SYSTEM_V2`, `FvgTradingSystemV2`, or "FVG Trading System v2" implementation was found. The `v2` hits in this repository are unrelated active-campaign audit modes or visual contract names, not a second FVG trading-system version.

## Active Runtime Surface

The active setup registry is now a single parent model:

- `src/config/setupRegistry.ts`: `SetupType.FvgTradingSystemV1` only. Required evidence includes HTF/15M story first, valid same-direction 15M parent FVG or battle zone, first/final battle-zone inventory, defended-first continuation, 5M rejection without accepting through, completed 5M confirmation, opposite-side 5M flip blocker, nearest protected 5M structure stop, actual-risk T1/T2, and FVG/HTF obstacles as target-management context only.
- `src/config/setupRegistry.test.ts`: asserts the active, registered, approved, primary, compatibility registries all contain only `FvgTradingSystemV1`; supporting and deprecated registries must be empty.
- `scripts/guard-fvg-only-runtime.js`: enforces one active setup registry entry and forbids old runtime markers in `src/lib/localScannerEngine.ts` and `tools/automation/nt-scanner.ts`.
- `src/lib/localScannerEngine.ts`: maps active runtime authority to FVG Trading System v1 decision support only; no automated orders; `canExecute` remains the final app-owned gate.
- `tools/automation/nt-scanner.ts`: sets `ACTIVE_SCANNER_MODEL_SURFACE = 'FVG_TRADING_SYSTEM_V1'` and persists model-surface/proof-memory boundaries around scanner state.

Important boundary: `src/lib/setupScanner.ts` still contains older candidate builders for `SweepMssFvgRetrace`, `HtfDisplacementFvgContinuation`, `OpeningDriveFvgContinuation`, `AfterLunchDriveFvgContinuation`, and `IntradayMssMicroContinuation`, but `scanSetupCandidates()` only promotes builders whose setup type exists in `getPrimarySetupRegistry()`. With the current registry, those older builders are effectively inactive runtime paths unless the registry is expanded.

## Fact Extraction Rules

Authority:

- NinjaTrader/OHLC facts are highest authority. AI can fill gaps only when OHLC is missing.
- `src/agents/chartFactAgent.ts` merges OHLC facts over AI fields for candles, swings, `fvgZones`, liquidity, reclaim, failed-break, `displacementCandles`, setup-ready facts, structural levels, session story, and targets.
- `src/lib/gemini.ts` instructs Gemini to extract facts only and always return arrays for `candles`, `swings`, `fvgZones`, `liquidityEvents`, `liquiditySweeps`, `reclaimEvents`, `failedBreakEvents`, `displacementCandles`, and `extractedLevels`.

Data structures:

- `src/types.ts`: `FvgZoneFact` carries direction, upper/lower/midpoint, formed time/index, fill %, inverted/reclaimed state, impulse qualification and ratios, confidence.
- `src/types.ts`: `DisplacementCandleFact` carries direction, candle index/time, OHLC, body/range quality, close location, displacement score, quality, `leavesImbalance`, `breaksStructure`, confidence.
- `src/types.ts`: `SetupReadyFacts` includes `pullbackIntoFvg`, `fvgReclaimed`, `breakOfStructure`, and `sweepThenReclaim`.

Geometry and quality:

- `src/lib/setupScanner.ts` derives a bullish FVG when `current.low > twoBack.high`.
- `src/lib/setupScanner.ts` derives a bearish FVG when `current.high < twoBack.low`.
- Derived FVGs must pass impulse qualification: body ratio or range ratio must be at least `TRADE_RULES.executionParameters.fvgImpulseBodyRatio` / `fvgImpulseRangeRatio`.
- `src/config/tradeRules.ts` currently sets both FVG impulse ratios to `1.25` and displacement score threshold to `70`.
- Explicit `fvgZones` are accepted only when confidence is readable, bounds are numeric, and `impulseQualified !== false`; if not explicitly impulse-qualified, the stored impulse ratios must pass the same threshold.

## Context Rules

- `src/lib/sessionStoryEngine.ts` converts qualifying displacement candles into session imbalance zones, expands the zone to overlapping FVG bounds when present, and exposes them as `imbalance_zone` / `imbalance_midpoint` structural levels.
- `src/lib/targetObjectiveEngine.ts` treats `imbalance_zone`, `imbalance_midpoint`, `displacement_origin`, gaps, opens, round numbers, support, and resistance as reaction/obstacle objectives, not real liquidity.
- Real liquidity is limited to liquidity pools, swings, and session high/low objectives from session sources.
- `src/lib/localScannerEngine.ts` builds FVG decision-zone and HTF FVG cascade metadata from active line-in-the-sand rules and MTF `fvgZones`; those objects explicitly say they are management/context only and do not change approvals, `canExecute`, entry/stop/targets, or risk rules.

## Setup Scanner Rules

Active registry rule:

- `FvgTradingSystemV1` is the only active registered parent model. It requires HTF/15M story first, selected 15M parent/battle-zone validity, completed 5M confirmation, nearest protected 5M stop, target/obstacle path, actual-risk targets, and normal session/model/canExecute gates.

Legacy/inactive source rules still present:

- `SweepMssFvgRetrace` validator requires sweep, reclaim, displacement, MSS, impulse-qualified FVG, retrace into FVG, entry inside FVG or breaker/FVG overlap, stop beyond sweep extreme, and at least 2.0R or valid opposing liquidity.
- FVG retest/mitigation can be confirmed by proposed entry/current price inside the zone, `pullbackIntoFvg` or `fvgReclaimed`, positive `filledPercent`, or a completed 5M candle touching the zone after formation.
- Intraday micro-continuation requires aligned 15M/5M MSS or displacement context, then a completed 5M FVG retest/rejection or MSS close-through/retest; it sets human review only and `canExecute=false`.
- Opening/after-lunch drive FVG continuation requires 15M displacement, aligned 5M structure, 5M FVG retest/mitigation in the specific review window, protected 5M stop, app T1/T2, and forward target context; it remains human-review only.
- HTF displacement + FVG continuation requires approved window, 15M displacement, 5M FVG/imbalance support, HTF context sufficiency/alignment, protected stop, 60% remaining path to external liquidity, and no-chase/fresh-entry checks.

These source paths conflict with the current FVG-only registry if treated as live. They should be preserved only as historical/research/compatibility code or explicitly migrated into the single parent `FvgTradingSystemV1` route.

## Ranking Rules

- `src/lib/setupScanner.ts` still scores older candidate types with pathway bonuses: HTF displacement FVG continuation gets a lower pathway bonus than HTF displacement MSS and session-drive FVG paths. Breaker/FVG overlap adds a small confluence bonus only for `SweepMssFvgRetrace` or Turtle Soup.
- `src/lib/tradeDecisionPipeline.ts` computes quality from textual evidence: sweep, reclaim, FVG/imbalance, displacement/MSS, liquidity map, HTF alignment, entry/stop/target availability, and risk state.
- Runtime FVG scorecard in `src/lib/localScannerEngine.ts` uses FVG Trading System v1 signals: liquidity sweep, reclaim, wick rejection support, FVG failure/reversal, displacement, MSS, FVG/imbalance entry, premium/discount, HTF alignment, entry/stop/target availability, stale/chase, risk/target room, and session quality.
- Raw scores are internal evidence. UI/Discord should not expose them as trader instructions.

## Execution Rules

- 5M remains execution authority for trigger, active swing, protected stop, invalidation, and final trade approval.
- T1/T2 remain app-owned deterministic math: T1 = 1.5R and T2 = 2.0R from actual entry-to-stop risk.
- FVG zones, HTF zones, balanced paths, and obstacles cannot approve trades by themselves.
- `canExecute` is an app-owned decision-support gate, not broker execution approval.
- Human-review paths explicitly keep `humanReview.canExecute=false` and require trader confirmation.
- Discord feedback/outcome buttons update learning/research only; they do not approve execution or place orders.

## Target Management Rules

- `src/lib/targetObjectiveEngine.ts` selects real liquidity targets separately from reaction/obstacle objectives.
- Target notes must show app tactical targets first, then obstacle/reaction zone if present, then real 15M/session liquidity targets, then runner instruction.
- Imbalance/FVG/gap/open/round-number zones are obstacles or reaction zones; they must not be labeled as liquidity.
- Obstacle before T1 becomes a decision-zone warning, not automatic invalidation unless it breaks the story, target room, protected stop, or parent proof.

## User-Facing Language Rules

- Preferred voice: Master Trading Desk, direct and risk-first.
- Avoid saying FVG or Gemini approved execution.
- Use "watch", "review only", "completed 5M proof", "protected structure stop", "target room", "canExecute gate", and "trader confirmation" where applicable.
- UI examples already follow this in `src/components/FinalTradePlanCard.tsx`: obstacle/reaction zones are labeled "Not liquidity"; session levels are context and do not approve trades.
- Discord examples in `tools/automation/discord-alert-format.ts` repeatedly state review-only / canExecute boundaries and include FVG Decision Zone / HTF FVG Cascade blocks as management context.

## Persistence Fields

No dedicated Supabase FVG table or FVG column was found in migrations.

FVG facts persist through generic fields:

- `setupTags` can include `FVG`.
- normalized trade/setup metadata can carry candidate fields, chart context, target objective plans, active campaign metadata, and scanner state.
- `market_bars.metadata`, active campaign ledger `metadata`, replay metadata, and RAG metadata can carry structured context.

Recommendation: if FVG inventory becomes production state, add an explicit schema only after an approval gate. Do not overload narrative text as executable proof.

## Learning Proof Archive Feeding Live V1

The files below are not the active runtime name, but they are the learning/proof archive that produced the live `FVG_TRADING_SYSTEM_V1` rule surface. Treat them as evidence history and guardrails for the live v1 model unless the user explicitly approves a new model version.

Learning/proof sources:

- `tools/automation/fvg-research/fvg-research-model-spec.ts`
- `tools/automation/replay-diagnostics/fvg-research-guardrails-v1.md`
- `tools/automation/replay-diagnostics/fvg-research-rule-contract-v1.json`
- `tools/automation/jan7-fvg-failure-diagnostic.ts`

Live v1 rules learned from this archive:

- Build HTF/15M story first.
- 15M is parent setup authority for this lane.
- 5M is execution proof, protected stop, invalidation, and entry timing.
- Parent timestamp is the 15M FVG formation time, not later continuation/failure candles.
- A real 15M displacement must create the parent FVG; the displacement candle may be left, middle, or confirming candle of the three-candle formation.
- Standalone 5M FVG does not trigger the live v1 model.
- Defended-first continuation must be reviewed before later same-zone failure/reversal.
- Opposite-side 5M acceptance through the selected zone before same-direction proof blocks the original candidate.
- Track 15M battle-zone inventory as first reaction FVG and final/deepest same-side FVG; ignore middle FVG clutter unless explicitly promoted.
- FVG objective ladder can track 5M/15M/60M/120M/240M zones as `open_untouched`, `partial_touch`, `filled`, or `failed_inverted`.
- Balanced path/open FVG objective is management context only after a valid FVG entry exists.
- Open FVG objectives are not real liquidity.

## Conflicts And Drift Risks

1. `src/config/tradeRules.ts` still lists old FVG-related setup types in allowed/supporting arrays, while `src/config/setupRegistry.ts` and its guard/tests lock active runtime to `FvgTradingSystemV1` only.
2. `src/lib/gemini.ts` still tells Gemini that older pathways such as HTF Displacement + FVG Continuation, Opening Drive FVG Continuation, After-Lunch Drive FVG Continuation, and Intraday MSS Micro Continuation are approved pathways. That is stale relative to the FVG-only registry and could cause advisory text to imply old runtime authority.
3. `src/lib/tradeDecisionPipeline.ts` can infer old setup types from narrative text and still ranks them. Structured scanner output should dominate, but this is an authority-drift risk if narrative fallback is used.
4. `src/lib/setupScanner.ts` contains substantial inactive old FVG builders. They are blocked by registry today, but future registry edits could accidentally re-enable them.
5. Some source evidence strings include `Confidence score: N/100`; user-facing layers should avoid presenting those raw scores as instructions.
6. `scripts/fvg-research-window-guard.js` targets `tools/automation/overnight-raid-acceptance-fvg-research.ts`, which is currently absent, so the guard skips. That is acceptable for now but does not guard `jan7-fvg-failure-diagnostic.ts`.
7. File and command names containing `research` can mislead future agents. In the current repo, those files are proof/learning artifacts behind the live `FVG_TRADING_SYSTEM_V1` model, not permission to keep FVG rules out of runtime.

## Recommended Module Boundaries

- Keep `setupRegistry.ts` as the single active model surface: `FvgTradingSystemV1`.
- Move old setup-specific builders in `setupScanner.ts` behind a clearly named historical/research quarantine or delete them after confirming tests no longer depend on them.
- Update `tradeRules.ts`, `tradeDecisionPipeline.ts`, and `gemini.ts` to reflect FVG Trading System v1 only, or explicitly label old setup names as historical aliases that cannot create active runtime candidates.
- If a true FVG v2 is approved later, add an explicit new model identifier, migration/learning boundary, tests, and guard update. Do not infer v2 from unrelated audit mode names.
- Keep FVG geometry/fact extraction separate from setup approval.
- Keep 15M/HTF FVG zones in market-map/management modules, not execution gates.
- Keep all executable entry, stop, risk, T1/T2, invalidation, and `canExecute` authority in app-owned deterministic pipeline modules.
- If production needs durable FVG inventory, add a typed Supabase migration and RLS-scoped write/read path only after explicit approval.

## Verification Recommendation

For documentation-only review, no behavior tests are strictly necessary. If any implementation cleanup follows, run:

```bash
npm run guard:no-firebase
npm run guard:architecture
npm run guard:schema
npm run lint
npm run build
```
