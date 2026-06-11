# Scanner Visibility Cleanup Audit

Date: 2026-06-10

## Phase 8.45 Audit

Scope inspected:

- `src/lib/setupScanner.ts`
- `src/lib/localScannerEngine.ts`
- `src/agents/scannerPlanSelectionAgent.ts`
- `tools/automation/nt-scanner.ts`
- `tools/automation/discord-alert-format.ts`
- `tools/automation/discord-scheduler.ts`
- `src/config/setupRegistry.ts`
- `src/config/responsibilityRegistry.ts`
- `scripts/architecture-guard.js`

### Removed Or Reworded

| File / Function | Finding | Action | Evidence |
| --- | --- | --- | --- |
| `src/lib/localScannerEngine.ts` / `recommendationForScore` | User-facing scanner text said `approved model` even when the metadata concept is model activity/eligibility, not execution approval. | Reworded to `active model` and `deterministic risk gate`. | Text-only change. No scoring, thresholds, gates, or candidate selection changed. |
| `src/lib/localScannerEngine.ts` / scorecard labels | Scorecard labels used `Approved model` wording. | Reworded labels to `Registered model` / `Active model completion`. | Text-only change. Scorecard numeric logic and blockers unchanged. |

### Deferred Cleanup Candidates

| File / Function | Reason To Defer |
| --- | --- |
| `src/agents/scannerPlanSelectionAgent.ts` fallback candidate selection | It is live candidate lifecycle logic and already covered by regression tests for stale/chase, Turtle Soup watch, Intraday MSS watch, failed-plan reversal, and early-move review. Deleting or collapsing it would risk changing scanner behavior. |
| `tools/automation/discord-scheduler.ts` scheduled session selection | It still builds scheduled Morning/Lunch summaries and has provenance checks. It may duplicate scanner-like selection, but it is a live scheduled-report path, not proven obsolete. |
| `tools/automation/discord-alert-format.ts` status mapping | It independently maps status to compact Discord wording, but this is formatting behavior with test coverage and can still consume scanner visibility metadata in a later UI/Discord phase. No deletion in Phase 8.45. |
| Deprecated setup registry entries | Deprecated entries are already excluded from `getPrimarySetupRegistry`. They remain as supporting compatibility metadata and tests assert legacy labels normalize to generic ICT setup. No active deletion. |
| Replay diagnostics under `tools/automation/replay-diagnostics` | Historical artifacts contain old status language, but they are immutable diagnostics, not live scanner behavior. No cleanup required. |

## Phase 8.5 Authority Language

Standardized metadata terms added in `src/lib/localScannerEngine.ts`:

- `registeredModel`
- `activeModel`
- `watchEligible`
- `planEligible`
- `discordEligible`
- `executionEligible`
- `humanReviewOnly`
- `canExecute`

These fields are diagnostics only. They do not add gates or loosen existing gates.

## Phase 8.55 DeskState / Visibility Responsibility

`ScannerVisibilityMetadata` is now produced by scanner-owned code and attached to:

- `selectScannerPlan(...).visibilityMetadata`
- live scanner decision tape audit events
- live scanner Discord audit JSON

Consumers may summarize this metadata, but they must not use advisory/Gemini text to create, suppress, rerank, or approve active candidates.

## Phase 8.6 No Silent Drop Metadata

Visibility modes now available:

- `POST_PLAN`
- `POST_WATCH`
- `POST_CONDITIONAL`
- `POST_REVIEW`
- `HOLD_WITH_REASON`
- `NO_TRADE_WITH_REASON`
- `DATA_QUALITY_BLOCKER`

Blocked execution remains blocked. The metadata records why the candidate is visible, held, no-trade, or data-limited when structured evidence exists.

## Trading Logic Impact

No trading logic changed.

No changes were made to:

- setup definitions
- ranking weights
- entry rules
- stop rules
- target rules
- risk gates
- `canExecute`
- bridge behavior
- Discord hard blockers
