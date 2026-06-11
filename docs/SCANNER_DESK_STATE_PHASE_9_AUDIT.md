# Scanner DeskState Phase 9 Audit

Date: 2026-06-10

## Scope

Phase 9A-9F adds scanner-owned visibility, watch, promotion, and replay-validation metadata only. It does not change setup definitions, ranking weights, trade approvals, `canExecute`, entry, stop, target, risk, or bridge behavior.

## Phase 9A: Trade Decision Map Audit

Owner: `src/lib/localScannerEngine.ts` via `buildTradeDecisionMapAudit`.

The audit is generated from `SETUP_REGISTRY` and reports each registered model's:

- model name and setup type
- session windows
- required evidence
- registry rank weight
- watch, plan, Discord, execution, and human-review eligibility metadata
- `canExecute` relationship
- known suppression paths

Deprecated entries remain inventoried but are marked non-Discord and non-execution eligible. Supporting-evidence entries remain watch/context metadata only. Human-review-only primary models remain non-execution eligible unless an existing app-owned deterministic path separately allows `canExecute`.

## Phase 9B: Candidate Lifecycle Trace

Owner: `src/lib/localScannerEngine.ts` via `buildCandidateLifecycleTrace`.

Every scanner cycle can now report:

- candidates created by the existing scanner/plan path
- highest-ranked candidate
- best long and short ideas
- selected candidate
- filtered candidates and reasons
- missing proof summary
- next trigger
- copied Discord post/suppress decision

The trace does not rerank, select, suppress, or approve anything.

## Phase 9C: Active DeskState

Owner: `src/lib/localScannerEngine.ts` via `buildDeskState`.

Scanner decision tape and live Discord audit JSON now persist:

- `visibility`
- `candidateLifecycleTrace`
- `deskState`

`deskState` is the consumer-ready snapshot for Discord, RAG, and UI. It mirrors scanner-owned visibility/lifecycle metadata and existing `canExecute`; it does not create a new approval path.

## Phase 9D: Discord Watch Alerts

Owner: `tools/automation/discord-alert-format.ts`, consuming scanner-owned `DeskState`.

When `DeskState.discordAction` is `post_watch`, Discord now renders a watch-only scanner alert:

- headline says `WATCH FORMING`
- includes line in the sand, trigger, reason, invalidation, and no-chase language
- omits entry, stop, T1, T2, visual plan attachments, and outcome buttons

The scanner may surface a `Watching` or `TriggerPending` candidate as a watch alert only inside the existing alert window and quality/duplicate checks. Watch alerts do not approve execution.

## Phase 9E: Watch-To-Plan Promotion

Owner: `src/lib/localScannerEngine.ts` via `DeskState.promotion`.

Each DeskState now reports its current promotion stage and next possible stage:

```text
watch -> conditional -> human_review_ready -> posted_plan
```

`promotion.canPromoteNow` is always false because promotion remains controlled by the existing scanner, trade decision pipeline, and `canExecute` gates. Missing proof and next trigger are surfaced for continuity only.

## Phase 9F: Replay Validation

Owner: `src/lib/localScannerEngine.ts` via `validateDeskStateReplayPath`.

Diagnostic replay now carries DeskState snapshots from scanner audit JSON and reports whether replay observed:

- watch before plan/review
- a continuous watch-to-plan path
- no-chase/completed-5M/protected-structure language
- scanner-owned source-of-truth markers
- DeskState/visibility alignment for Discord/RAG/UI consumers

Replay validation is diagnostic only. It does not approve trades, change rules, or change `canExecute`.

## Deferred

None. Focused verification cleared the implementation risks found during Phase 9B, 9C, 9D, 9E, and 9F fixture/type checks.
