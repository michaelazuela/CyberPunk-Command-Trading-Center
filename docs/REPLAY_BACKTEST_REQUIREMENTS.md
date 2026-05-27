# Replay / Backtest Requirements

This document preserves the useful replay/backtest behavior currently embedded in `src/components/ReplayLab.tsx` and defines the future rewrite direction.

`ReplayLab.tsx` is not an active `App.tsx` tab. It should not be activated as-is. A future Replay / Backtest workflow should be rebuilt with the current shared Trading Workflow components and smaller testable services.

## Current Valuable Behavior To Preserve

### Historical Replay Shell

The replay workflow is intended for historical review and RAG learning, not live execution.

Current inputs:

- Historical trading date.
- Instrument, currently MES or MNQ.
- Contracts for risk review.
- Midnight Open context when available.
- Morning replay session.
- Lunch replay session.
- Optional screenshots as backup/context.

Replay sessions must continue to use the live rule engine:

- `replay_morning` maps to live Morning / AM rules.
- `replay_lunch` maps to live Lunch / PM Review rules.

### Historical OHLC Import

Replay should prefer factual OHLC over screenshot-only extraction.

Current behavior worth preserving:

- Read historical bars from Supabase `market_bars` first.
- Fall back to the read-only NinjaTrader bridge when cache data is missing.
- Repair/upsert historical bars into `market_bars` after bridge fallback.
- Load 4H, 1H, 15M, and 5M context where available.
- Treat imported OHLC as higher-authority factual context.
- Build replay chart context from historical bars before the app-owned scanner and decision pipeline consume it.

The future implementation should not hardcode current futures contract examples such as `MES 06-26` or `MNQ 06-26`. Contract selection should follow the app's bridge/front-month configuration.

### Replay Analysis

Replay analysis should support:

- Morning replay analysis.
- Lunch replay analysis.
- Screenshot fallback when historical bars are unavailable or screenshots add needed visual context.
- Historical OHLC context merged into the analysis result without allowing AI visual extraction to overwrite OHLC facts.
- App-owned normalized trade plan generation through the same rule engine used by live sessions.

The replay shell should make clear that historical data is for review/training only and does not create live trade authority.

### Replay Outcome Learning

Replay outcome capture should preserve:

- Trade taken: yes/no.
- Outcome choices: win, loss, scratch, no trade, missed trade.
- Candidate-specific replay plan selection when the trader took a conditional/setup-scan plan instead of the main app plan.
- Proof upload/review.
- Setup save.
- Trade history save.
- RAG/journal learning.
- Save receipts where available.

Outcome and proof updates must remain learning/journal events only. They do not approve trades or override risk rules.

### Duplicate Detection

Replay save behavior should continue to check for likely duplicates before writing:

- Existing setup records for the same user/date/session/signature.
- Existing replay RAG records for the same session/date context.

Duplicate detection should live outside the UI shell in a service that can be tested with fixtures.

### Components Currently Reused

The current inactive `ReplayLab.tsx` already reuses some active workflow pieces:

- `ScreenshotUploadPanel`
- `TradeConfirmationPanel`
- `TradeProofPanel`
- `FinalTradePlanCard`
- `WorkflowResetButton`
- `TimezoneToggle`

Future replay UI should reuse the newer shared workflow components too:

- `WorkflowStatusStrip`
- `SessionContextChips`
- `ScreenshotPrecheckStatus`
- `AdvancedDataModelControls`, if advanced replay data controls are needed.

## Why The Current ReplayLab Should Not Be Activated As-Is

Current issues:

- It is not routed in `App.tsx`.
- It has a large component surface with many responsibilities.
- It duplicates live `SessionLab` screenshot, upload, analyze, proof, journal, and RAG flows.
- It does not use the current workflow strip, session chips, or screenshot/precheck status components.
- It has no direct ReplayLab render/smoke test.
- It includes hardcoded contract examples such as `MES 06-26` and `MNQ 06-26`, which are rollover fragile.
- It uses old `EST` / `PST` timezone wording; future UI should use ET/session-authority language.
- It embeds Supabase/RAG side effects directly in a large UI component.
- Activating it as-is would clutter navigation and risk confusion between live and replay workflows.

## Future Rewrite Architecture

### Replay Data Service Or Hook

Possible names:

- `replayDataService.ts`
- `useReplayData.ts`
- `replayHistoricalBars.ts`

Responsibilities:

- Load historical bars from `market_bars` cache first.
- Fall back to NinjaTrader bridge only when needed.
- Upsert repaired bridge data back into `market_bars`.
- Normalize 4H, 1H, 15M, and 5M bars.
- Build replay chart context.
- Expose `replay_morning` and `replay_lunch` data.
- Avoid UI rendering.
- Be testable with fixture bars and mocked cache/bridge adapters.

### Replay Workflow Shell

Possible names:

- `ReplayWorkflow.tsx`
- `ReplayBacktestLab.tsx`

Responsibilities:

- Render the replay UI shell only.
- Own lightweight display state.
- Delegate data loading to the replay data service/hook.
- Delegate outcome persistence to the replay outcome service.
- Reuse shared Trading Workflow components:
  - `WorkflowStatusStrip`
  - `SessionContextChips`
  - `ScreenshotPrecheckStatus`
  - `ScreenshotUploadPanel`
  - `TradeConfirmationPanel`
  - `TradeProofPanel`
  - `FinalTradePlanCard`
  - `AdvancedDataModelControls`, if needed.

The shell should distinguish historical review from live trading. It should not share visual priority with live Morning/Lunch controls until product approval.

### Replay Outcome / Journal Service

Possible names:

- `replayOutcomeService.ts`
- `replayJournalService.ts`

Responsibilities:

- Save replay setup records.
- Save selected replay plan outcome.
- Save trade history when appropriate.
- Write RAG/journal learning.
- Handle duplicate detection.
- Save proof metadata.
- Keep Supabase/RAG side effects out of the main UI component.
- Be testable with mocked Supabase/RAG adapters.

## Future Tests Before Activation

Add tests before routing any Replay / Backtest tab:

- Replay historical bars service fixture test.
- Cache-first and bridge-fallback behavior test.
- Replay shell render test.
- Replay candidate outcome selection test.
- Replay proof/journal save fixture test.
- App route smoke test update if a Replay / Backtest tab is activated.

## Activation Gate

Do not add a Replay / Backtest tab until all are true:

- Historical OHLC loading is extracted and tested.
- Replay outcome persistence is extracted and tested.
- The UI shell uses shared workflow components.
- The old `EST` / `PST` wording is replaced with ET/session-authority language.
- Contract selection is not hardcoded to a stale futures month.
- The route smoke test covers the new tab.
- The full test/build/guard suite passes.
