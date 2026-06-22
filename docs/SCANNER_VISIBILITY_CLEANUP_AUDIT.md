# Scanner Visibility Cleanup Audit

Date: 2026-06-10

Latest Install 1 update: 2026-06-22

Latest Install 2 update: 2026-06-22

Latest Install 3 update: 2026-06-22

Latest Install 4 update: 2026-06-22

Latest Install 5 update: 2026-06-22

Latest Install 6 update: 2026-06-22

Latest Install 7 update: 2026-06-22

Latest Install 8 update: 2026-06-22

## Phase 11B Live Discord Send Boundary Guard

Install 8 wired the Phase 11A policy into scanner-owned live Discord trade/DeskState posts.

| File / Function | Finding | Action | Evidence |
| --- | --- | --- | --- |
| `tools/automation/nt-scanner.ts` / `postDiscord` | The common Discord sender is used by operational health/data-quality notices and scanner-owned trade/DeskState posts, so a blanket DeskState guard would block the wrong class of messages. | Added optional `liveSendBoundary` enforcement to `postDiscord`; dry-run and `--discord false` remain log-only/skipped, and operational notices do not pass the scanner trade/DeskState boundary. | Send-boundary-only change. It does not change setup selection, ranking, `canExecute`, entries, stops, targets, risk, or bridge reads. |
| `tools/automation/nt-scanner.ts` / scanner trade/DeskState post paths | Live scanner trade/DeskState posts need a final operational preflight before a webhook POST. | Added `buildScannerLiveDiscordSendBoundaryReport` and wired it into Morning HTF Desk Map, Tactical Reversal Watch, Current Desk Plan, and primary scanner alert sends after the decision tape/audit path exists. | Live posts require READY health, bridge/5M/HTF/DeskState/audit/payload/webhook readiness, plus `--live-discord-policy-confirmed` or `QUANT_DESK_LIVE_DISCORD_POLICY_CONFIRMED=true`. |
| Tests and architecture guard | Phase 11B needed proof that the guard blocks unconfirmed live sends without creating trade authority. | Added scanner delivery tests for unconfirmed and confirmed live-boundary reports; architecture guard now requires the Phase 11B builder, enforcement hook, confirmation flag, and call-site wiring. | Tests assert no `canExecute` change and no trade approval creation. |

## Phase 11A Live Discord Post Eligibility Policy

Install 7 added the live Discord rollout policy contract before wiring any live-send guard.

| File / Function | Finding | Action | Evidence |
| --- | --- | --- | --- |
| `src/lib/liveDiscordPostEligibility.ts` / `evaluateLiveDiscordPostEligibility` | Live Discord enablement needed a deterministic checklist before dry-run suppression can be removed. | Added a standalone eligibility report requiring READY scanner health, connected/resolved bridge, fresh completed 5M, required HTF context, scanner-owned DeskState/visibility metadata, writable decision tape, audit path, validated Discord payload with visibility metadata, configured webhook, dry-run disabled, fresh dry scan observed, and diagnostic replay passed. | Policy-only. The module is not wired into the live sender in Phase 11A and states no change to trading logic, scanner behavior, Discord send behavior, bridge behavior, `canExecute`, or trade approval. |
| `src/config/responsibilityRegistry.ts` / ownership metadata | The live-post policy needed a source-of-truth owner so scanner/scheduler/formatter do not reimplement competing readiness checks. | Added `live_discord_post_eligibility_policy` pointing to `src/lib/liveDiscordPostEligibility.ts`. | Metadata-only ownership. It documents that Phase 11B may wire the policy later after review. |
| Tests and architecture guard | The policy boundary needed regression coverage before any send-boundary work. | Added direct policy tests and architecture guard checks for required eligibility conditions and authority-boundary flags. | Tests assert the policy can report not eligible without approving trades or changing `canExecute`. |

## Phase 10 Production Readiness

Install 6 made Phase 9F replay validation work against generated decision-tape audit history without manual flattening.

| File / Function | Finding | Action | Evidence |
| --- | --- | --- | --- |
| `tools/automation/scanner-audit-import.ts` / audit history loader | `scanner_decision_event_tape` files store events under an `events` object, but the importer treated the tape wrapper as one audit record. Phase 9F therefore missed generated DeskState snapshots unless a manual script flattened the tape. | Added decision-tape flattening so each tape entry becomes a diagnostic audit event with inherited trade date, instrument, session, timestamp, Discord decision, and DeskState. | Diagnostic/audit-read-only change. It does not rewrite audit files, send Discord, or affect scanner decisions. |
| `tools/automation/scanner-audit-import.ts` / historical DeskState replay import | Same-day tapes may contain historical DeskState snapshots from before Phase 9E added `requiredProof`, `blockedBy`, `promotionReadiness`, and `approvalBoundary`. Strict replay could crash or false-fail on mixed-schema history. | Added replay-only DeskState promotion normalization for historical snapshots. | Compatibility-only change. Normalization happens in memory for diagnostics and preserves no-approval-change boundaries. |
| `tools/automation/diagnostic-replay.ts` / CLI options | Diagnostic replay defaulted to morning session, so lunch tapes required custom scripts to validate. | Added `--session morning|lunch|replay_morning|replay_lunch`. | CLI-only change. No live scanner or trade behavior changed. |
| `src/agents/bridgeDiagnosticReplayAgent.ts` / audit matching | Flattened decision tapes can contain earlier same-day states before the requested replay window. | Added replay-window filtering when a decision-tape market timestamp is available. | Diagnostic-only change. It prevents mid-campaign pre-window states from false-failing Phase 9F. |

## Phase 9F Replay Validation

Install 5 added a research/replay-only Phase 9F verdict without changing scanner behavior.

| File / Function | Finding | Action | Evidence |
| --- | --- | --- | --- |
| `src/agents/bridgeDiagnosticReplayAgent.ts` / diagnostic report | Replay output had DeskState validation, but the Phase 9F handoff questions were not summarized as a single verdict. | Added `phase9FReplayValidation` with checks for watch-before-move/path, scanner-owned line metadata, promotion correctness, no-chase preservation, explained no-trade states, and Discord/RAG/UI alignment. | Diagnostic-only output. The authority boundary states no trade approval, no rule change, no `canExecute` change, no scanner behavior change, no Discord behavior change, and no bridge behavior change. |
| `tools/automation/diagnostic-replay.ts` / pretty output | CLI output did not surface the Phase 9F verdict. | Added a compact Phase 9F line to the pretty report. | Reporting-only change. No scanner, bridge, Discord send, or persistence behavior changed. |
| Tests and architecture guard | Phase 9F verdict needed regression coverage. | Added diagnostic replay assertions for a passing watch-to-plan path and explained no-trade state; architecture guard now requires Phase 9F fields and authority flags. | Tests assert diagnostic-only boundaries. |

## Phase 9E Watch-To-Plan Promotion

Install 4 added scanner-owned promotion proof metadata without changing approval behavior.

| File / Function | Finding | Action | Evidence |
| --- | --- | --- | --- |
| `src/lib/localScannerEngine.ts` / `DeskStatePromotionPath` | The existing promotion path showed stage continuity, but did not explicitly state the proof boundary that prevents watch metadata from becoming a full plan. | Added `promotionReadiness`, `requiredProof`, `blockedBy`, and an `approvalBoundary` that records no change to trade approvals, `canExecute`, entry/stop/target rules, risk rules, or bridge behavior. | Metadata only. `canPromoteNow` remains `false`; existing scanner selection, `canExecute`, entries, stops, targets, risk gates, model definitions, and bridge behavior are unchanged. |
| `src/lib/localScannerEngine.ts` / `validateDeskStateReplayPath` | Replay validation could observe watch-to-plan stages, but did not fail if promotion proof metadata or no-authority-change boundaries disappeared. | Added `watchToPlanPromotionProofed`, `canExecuteBoundaryPreserved`, and `promotionBoundary` validation. | Replay-only validation. It does not approve trades or change live scanner decisions. |
| Tests and architecture guard | Phase 9E fields needed regression coverage. | Added assertions in scanner, replay, and live-audit tests; architecture guard now requires the Phase 9E proof fields. | Tests assert scanner-owned metadata and no-authority-change flags. |

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
- `docs/PROJECT_STATUS.md`

### 2026-06-22 Install 1 Follow-Up

| File / Function | Finding | Action | Evidence |
| --- | --- | --- | --- |
| `src/lib/localScannerEngine.ts` / DeskState model routing | DeskState metadata still exposed `bestApprovedModel` / `selectedApprovedModel` names, which can imply execution approval even though the values are diagnostic routing metadata only. | Added `bestActiveModel`, `bestActiveModelName`, and `selectedRegisteredModel` as precise source-of-truth fields while keeping the old names as deprecated audit-compatibility aliases. Reworded routing summaries from `approved model` to `active model` / `execution-eligible active model`. | Metadata/text-only change. Existing selection, ranking, DeskState construction, `canExecute`, entries, stops, targets, risk gates, and bridge behavior are unchanged. |
| `tools/automation/discord-alert-format.ts` / compact DeskState type | Formatter type accepted only legacy model-routing names. | Added optional precise fields so Discord can consume DeskState metadata without treating model registration as approval. | Type-only change. Formatter output and Discord hard blockers unchanged. |
| `src/config/setupRegistry.ts` / setup type catalog | `APPROVED_SETUP_TYPES` named the full registry catalog as if registration were execution approval. | Added `REGISTERED_SETUP_TYPES`; kept `APPROVED_SETUP_TYPES` as a deprecated compatibility alias. | Returned setup list is identical. No setup definitions, active sessions, priorities, or scanner accessors changed. |
| `scripts/architecture-guard.js` / DeskState guard | Guard protected legacy `bestApprovedModel` checks but did not require precise authority fields. | Added guard checks for `bestActiveModel` and `selectedRegisteredModel` regression assertions. | Guard-only change. No runtime behavior changed. |

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
| Historical research docs and generated research artifacts with `approved model/setup` phrasing | They describe research taxonomy or immutable generated samples, not live scanner/Discord authority. | Deferred to avoid rewriting historical evidence and test fixtures unrelated to live DeskState visibility. |

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

## Install 2: Phase 9A-9C Source-Of-Truth Propagation

Scope:

- Phase 9A: Trade Decision Map Audit
- Phase 9B: Candidate Lifecycle Trace
- Phase 9C: Active Desk State

### Added

| File / Function | Finding | Action | Evidence |
| --- | --- | --- | --- |
| `tools/automation/nt-scanner.ts` / Discord audit writer | Live scanner audit JSON already carried visibility metadata, candidate lifecycle trace, and DeskState, but not the Phase 9A trade-decision map audit. | Added `tradeDecisionMapAudit` to scanner Discord audit JSON using `buildTradeDecisionMapAudit()`. | Metadata/audit-only. No candidate selection, ranking, posting gate, or canExecute behavior changed. |
| `tools/automation/nt-scanner.ts` / decision tape writer | Decision tape could explain the selected cycle lifecycle, but did not include the registry-level map that explains all model authority boundaries. | Added `tradeDecisionMapAudit` to each decision-tape event. | Audit-only. Existing event state and Discord decision are unchanged. |
| `tools/automation/nt-scanner.ts` / RAG pending record | RAG stored visibility, lifecycle trace, and DeskState, but lacked the model map needed to interpret authority boundaries later. | Added `tradeDecisionMapAudit` to `trade_plan_json`. | Persistence metadata only. No schema migration; uses existing JSON field. |
| `scripts/architecture-guard.js` | Guard required visibility/lifecycle/DeskState persistence but not the trade-decision map. | Guard now requires `tradeDecisionMapAudit` in scanner audit/RAG source-of-truth paths. | Guard-only. |

### Deferred

| Candidate | Reason |
| --- | --- |
| Changing Discord watch cadence or posting more watch cards | Belongs to later Discord watch-alert phases. Install 2 only propagates source-of-truth metadata. |
| Changing candidate ranking or long/short selection | Would affect scanner behavior and requires a separately approved phase. |
| Removing legacy audit compatibility fields | Stored audit/RAG records and tests still read them. Removal is not needed for source-of-truth cleanup. |

### Install 2 Impact

- Trading logic changed: No.
- Scanner behavior changed: No.
- Discord behavior changed: No runtime/cadence change.
- Bridge behavior changed: No.

## Install 3: Phase 9D Discord Watch Alert Hardening

Scope:

- Phase 9D: Discord Watch Alerts

### Added

| File / Function | Finding | Action | Evidence |
| --- | --- | --- | --- |
| `tools/automation/discord-alert-format.ts` / `scannerWatchDiscordSummary` | Watch cards already rendered from DeskState, but the proof boundary could be clearer for all watch states. | Added explicit completed-5M proof wording and `canExecute=false` boundary text to watch-only cards. | Presentation-only. No posting gate, candidate selection, RAG save, canExecute, or trade approval behavior changed. |
| `tools/automation/nt-scanner-alert.test.ts` / watch fixture | Watch fixture covered no levels/no buttons, but did not assert the stronger proof boundary or Install 2 trade map in watch audits. | Added assertions for completed-5M proof text, `canExecute=false`, no levels/buttons, no RAG persistence, and `tradeDecisionMapAudit` in watch audit JSON. | Test-only reinforcement across Install 1, 2, and 3. |

### Install 3 Impact

- Trading logic changed: No.
- Scanner behavior changed: No.
- Discord behavior changed: Yes, watch-only card wording is clearer.
- Bridge behavior changed: No.
- RAG behavior changed: No; watch-only alerts remain out of pending trade/outcome RAG persistence.
