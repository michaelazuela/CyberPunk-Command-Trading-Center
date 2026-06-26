# Desk State Phase Handoff

## Purpose

This handoff captures the next architecture cleanup plan for a fresh Codex chat.

The goal is to make Quant Desk trade visibility simpler, deterministic, and Discord-ready without changing trade approvals, trade models, entry rules, stop rules, target rules, risk gates, bridge behavior, or `canExecute`.

The core design principle:

```text
NinjaTrader OHLC
-> Scanner / Setup Engine
-> DeskState / Visibility Policy
-> Discord / RAG / UI
```

The scanner owns structured evidence and candidate state. Agents, Discord, RAG, and UI may summarize that state, but must not invent, suppress, rerank, or independently approve active trade candidates.

## Why This Exists

The current project has strong individual engines, but the workflow can feel like too many steps:

```text
Scanner -> candidate ranking -> agent interpretation -> scheduler filtering -> formatter guessing -> Discord
```

That creates the risk that a valid watch, conditional plan, or human-review plan is built somewhere but disappears before Discord.

The next phases should reduce that risk by creating one source of truth for trade visibility and making every meaningful structured OHLC state explain itself.

## Non-Negotiables

- NinjaTrader OHLC remains the highest-authority market data.
- 5M remains the execution authority for entry trigger, protected swing stop, invalidation, and final approval.
- Higher timeframes are context, campaign support, obstacle/target management, or caution unless an approved pathway explicitly uses them.
- Gemini/advisory paths are lower authority and must not create, suppress, rerank, or approve active trade candidates.
- No new trade models.
- No new execution approval.
- No changes to `canExecute`.
- No changes to entry, stop, target, risk, model definitions, or approval gates.
- No bridge behavior changes.
- No new Discord hard blockers.
- No silent hard stops when meaningful structured OHLC evidence exists.
- Any current trade plan, HTF read, target-validity answer, or Discord status answer shall use the mandatory Current Trade Report structure from `docs/CODEX_RULES.md`.

## Mandatory Current Trade Report

Every current trade answer shall break down the state the same way:

1. Decision:
   - Trade / watch / no fresh entry / no trade.
   - Direction.
   - `canExecute`.
   - Human-review-only status.
2. Current price and candle:
   - latest completed 5M candle timestamp and close.
   - current bridge price when available.
   - completed-bar status.
3. Trade plan:
   - entry, stop, risk, T1, T2, invalidation.
   - if no fresh plan exists, separate current no-entry state from historical/reference plan levels.
4. HTF story:
   - 15M, 60M, 120M, 240M.
   - support, conflict, caution, and data sufficiency.
5. Line in the sand:
   - exact level.
   - why it matters.
   - required completed candle close/retest.
   - what happens above and below.
6. Target and management:
   - whether T1/T2 remain valid for the original plan.
   - whether each level is a fresh-entry target, management target, reaction zone, or historical target.
   - next objective and runner condition when available.
7. No-chase / fresh-entry status:
   - fresh entry available or missed.
   - new proof required if missed.
8. Discord status:
   - posted, suppressed, held local, or not eligible.
   - exact suppression reason when available.

Important distinction:

```text
Original T1/T2 may remain valid for the original plan.
Current fresh-entry state may still be no-chase.
Those two facts must be reported separately.
```

## Phase 8.45: Obsolete And Dirty Code Cleanup Audit

### Goal

Find and remove bad, obsolete, duplicate, or dirty code that is creating workflow drift before adding more DeskState/visibility structure.

This phase must be audit-first. Do not delete trading-path code just because it looks old. Prove it is unused, superseded, duplicated, or unsafe first.

### What to look for

- Deprecated model names that still influence scanner, Discord, RAG, or agent behavior.
- Legacy "approved model", "approved setup", "ICT candidate", or "best plan" branches that bypass the current setup scanner or trade decision pipeline.
- Duplicate candidate selection logic in scanner, scheduler, formatter, or agents.
- Formatter or scheduler fallbacks that convert a conditional/watch candidate into "NO TRADE" without a trace.
- Legacy Gemini/advisory paths that can still shape active trade visibility.
- Old dry-run or replay RAG write paths that can pollute live records.
- Unused helper functions, duplicate target/stop builders, or stale constants that conflict with canonical config.
- Hardcoded session windows that compete with `src/config/timeWindows.ts`.
- Local Supabase/RAG write code that duplicates the shared persistence helper.
- Tests or fixtures that preserve obsolete behavior as if it were current authority.

### Removal rules

- Remove only after proving the path is unused or superseded.
- Prefer deleting duplicate interpretation paths over adding another wrapper around them.
- Preserve tests around current approved behavior.
- Add or update tests proving the deletion did not remove required visibility, Discord, scanner, RAG, or data-quality behavior.
- If a suspicious path still has live behavior, document it in the audit and defer deletion until Phase 9A/9B can trace it.
- Do not remove safety blockers, data-quality blockers, no-trade outcomes, or `canExecute` protections.

### Expected output

- A cleanup audit section or artifact listing:
  - file/function
  - reason it is obsolete/dirty/duplicate
  - evidence for removal or reason to defer
  - tests that protect the removal
- Removed code where removal is proven safe.
- A short list of deferred cleanup candidates if proof is not strong enough.

### Trading logic impact

No intended trading logic change. This phase removes obsolete or duplicate code only when current behavior is protected by tests.

### Installed audit behavior

Phase 8.45 is installed as a repeatable read-only audit command:

```bash
npm run diagnostic:obsolete-dirty-code-cleanup -- --json
```

The standard workflow loopback also runs `phase-8-45-obsolete-dirty-code-cleanup-audit`.

Current audit result: no live-code removal is justified without more review. The inventory is deferred into later phases, mostly authority-language cleanup, no-trade/visibility wording review, and hardcoded-window trace review. Do not delete those paths from this audit alone.

## Phase 8.5: Authority Language Cleanup

### Goal

Replace vague wording such as "approved model", "approved setup", "valid trade", and "ready" with precise authority levels.

### Add or standardize terms

- `registeredModel`: the model exists in the registry.
- `activeModel`: the model is allowed to scan during the relevant session/window.
- `watchEligible`: the model can produce a forming watch with a line in the sand.
- `planEligible`: the model can produce entry, stop, T1, T2 for human review.
- `discordEligible`: the model/state may be shown in Discord.
- `executionEligible`: the model/state can pass execution approval if all deterministic gates are satisfied.
- `humanReviewOnly`: the state is structured but not automated execution.
- `canExecute`: existing deterministic execution flag. Do not loosen it.

### Rule

These terms are metadata and diagnostics first. They must not become new gates unless a later phase explicitly approves that.

### Expected output

- Cleaner docs and agent language.
- Candidate metadata can explain authority level without adding roadblocks.
- Discord can say "watch eligible" or "human-review only" instead of vague "approved".

### Trading logic impact

No intended trading logic change.

### Installed audit behavior

Phase 8.5 is installed as a repeatable read-only audit command:

```bash
npm run diagnostic:authority-language -- --json
```

The standard workflow loopback also runs `phase-8-5-authority-language-audit`.

Current live-surface result: `pass`. The audit scans scanner, selection, Discord formatter/scheduler, setup registry, and responsibility registry authority surfaces for vague phrases such as `approved model`, `approved setup`, and `valid trade`, while requiring the precise metadata terms listed above. Compatibility identifiers such as `bestApprovedModel` may remain only as deprecated stored-audit aliases; user-facing live wording should use active/registered/execution-eligible language.

## Phase 8.55: Collapse Agent Responsibilities Around DeskState

### Goal

Reduce workflow complexity by making `DeskState` or visibility metadata the single source of truth for active trade visibility.

### Intended pipeline

```text
NinjaTrader OHLC
-> Scanner / Setup Engine
-> DeskState / Visibility Policy
-> Discord / RAG / UI
```

### Agent responsibilities

- Scanner/setup engine builds structured evidence, active campaign state, candidate states, line in the sand, next trigger, blockers, and `canExecute`.
- Selection/visibility layer maps that state to a visibility mode.
- Discord formatter formats exactly that state.
- RAG stores exactly that state and outcomes.
- Review agents audit after the fact.

### Agents may

- Summarize `DeskState`.
- Format `DeskState`.
- Store `DeskState`.
- Audit `DeskState`.
- Explain why a state was watch, conditional, review, no-trade, or blocked.

### Agents may not

- Invent trade candidates.
- Suppress structured OHLC candidates silently.
- Rerank active trade candidates independently.
- Decide execution approval independently.
- Convert advisory/Gemini content into executable trade instructions.

### Expected output

- Responsibility registry/docs/agent contracts updated.
- Architecture guard can protect key source-of-truth boundaries where practical.

### Trading logic impact

No intended trading logic change.

### Installed audit behavior

Phase 8.55 is installed as a repeatable read-only audit command:

```bash
npm run diagnostic:deskstate-responsibility -- --json
```

The standard workflow loopback also runs `phase-8-55-deskstate-responsibility-audit`.

Current responsibility result: `pass`. The audit verifies the responsibility registry names scanner-owned `DeskState`/visibility metadata as the active visibility source of truth, confirms local scanner engine owns the visibility state builders, confirms the selection agent attaches scanner visibility metadata, confirms scanner automation carries `visibilityMetadata`, `candidateLifecycleTrace`, `tradeDecisionMapAudit`, and `deskState`, and blocks Discord formatter/scheduler imports that would make them independent setup, decision, or conditional-plan builders.

## Phase 8.6: No Silent Drop Policy

### Goal

Make sure meaningful structured OHLC evidence does not disappear without a visible lifecycle state.

Blocked execution can remain blocked. Full-plan Discord posting can remain strict. But if structured evidence exists, the desk should know what state it is in and what the next condition is.

### Visibility modes

Use a shared visibility classification such as:

- `POST_PLAN`
- `POST_WATCH`
- `POST_CONDITIONAL`
- `POST_REVIEW`
- `HOLD_WITH_REASON`
- `NO_TRADE_WITH_REASON`
- `DATA_QUALITY_BLOCKER`

### Metadata to add where needed

- `visibilityMode`
- `suppressionReason`
- `nextTrigger`
- `dataQualityBlocker`
- `holdWithReason`
- `noTradeWithReason`

### Policy

A candidate may be blocked from execution, but it should not be silently dropped from desk awareness if it has meaningful structured evidence.

Examples:

```text
Execution blocked -> canExecute=false, explain blocker.
Plan blocked -> show watch or hold-with-reason if evidence is meaningful.
Discord full-plan blocked -> show watch/conditional/review if allowed by visibility policy.
Data quality limited -> show DATA_QUALITY_BLOCKER with exact missing proof.
```

### Expected output

- Scanner/selection/Discord path can explain why something posted or did not post.
- Meaningful setup states become traceable instead of vanishing.
- This should increase visibility, not reduce it.

### Trading logic impact

No intended execution approval change. Some scanner/Discord visibility behavior may change in later implementation, but it must not loosen `canExecute`.

### Installed audit behavior

Phase 8.6 is installed as a repeatable read-only audit command:

```bash
npm run diagnostic:no-silent-drop -- --json
```

The standard workflow loopback also runs `phase-8-6-no-silent-drop-policy-audit`.

Current no-silent-drop result: `pass`. The audit verifies all shared visibility modes and reason metadata fields exist, then exercises `classifyScannerVisibility`, `buildCandidateLifecycleTrace`, and `buildDeskState` together so structured conditional, blocked, missed, no-trade, and data-limited candidates resolve to visible lifecycle states with explicit reasons. It also verifies DeskState preserves visibility/action and does not change `canExecute`.

## Phase 9A: Trade Decision Map Audit

### Goal

Inventory the current model hierarchy before changing behavior.

### Report should include

- model name
- session window
- required evidence
- rank weight
- watch eligibility
- plan eligibility
- Discord eligibility
- execution eligibility
- canExecute relationship
- known suppression paths

### Purpose

Reveal whether a model is outranking, hiding, or suppressing another model.

### Trading logic impact

No intended trading logic change.

### Installed audit behavior

Phase 9A is installed as a repeatable read-only audit command:

```bash
npm run diagnostic:trade-decision-map -- --json
```

The standard workflow loopback also runs `phase-9a-trade-decision-map-audit`.

Current trade decision map result: `pass`. The audit verifies every `SETUP_REGISTRY` entry appears in `buildTradeDecisionMapAudit`, each entry carries model/session/evidence/rank/eligibility/canExecute/suppression metadata, deprecated entries are not plan/Discord/execution eligible, supporting-evidence entries remain context/watch only, human-review-only models remain `executionEligible=false`, and the audit reports `tradingLogicChanged=false`.

## Phase 9B: Candidate Lifecycle Trace

### Goal

Every scanner cycle should explain what happened to candidates.

### Trace should answer

- Which candidates were created?
- Which candidate ranked highest?
- Which long and short ideas were best?
- Which candidates were filtered out?
- Why did Discord post or not post?
- What proof is missing?
- What is the next trigger?

### Purpose

End mystery "NO TRADE" or quiet Discord outcomes.

### Trading logic impact

No intended trading logic change.

### Installed audit behavior

Phase 9B is installed as a repeatable read-only audit command:

```bash
npm run diagnostic:candidate-lifecycle-trace -- --json
```

The standard workflow loopback also runs `phase-9b-candidate-lifecycle-trace-audit`.

Current candidate lifecycle trace audit result: `pass`. The audit verifies the existing `buildCandidateLifecycleTrace` output explains created candidates, highest-ranked candidate, best long plan, best short plan, selected candidate, filtered-out candidates with reasons, copied Discord send/suppress reason, missing proof, and next trigger. It also verifies the phase remains metadata-only: no Discord posts, no Supabase writes, no scanner behavior change, no trading logic change, no ranking change, no `canExecute` change, and no entry/stop/target math change.

## Phase 9C: Active Desk State

### Goal

Create one source-of-truth object per scanner cycle.

### Shape

Example:

```ts
interface DeskState {
  marketMode: 'market_mapping' | 'watching' | 'conditional' | 'human_review_ready' | 'no_trade';
  activeCampaign: unknown | null;
  bestLongPlan: unknown | null;
  bestShortPlan: unknown | null;
  lineInSand: number | null;
  nextTrigger: string | null;
  invalidation: string | null;
  visibilityMode: 'POST_PLAN' | 'POST_WATCH' | 'POST_CONDITIONAL' | 'POST_REVIEW' | 'HOLD_WITH_REASON' | 'NO_TRADE_WITH_REASON' | 'DATA_QUALITY_BLOCKER';
  discordAction: 'post_plan' | 'post_watch' | 'post_conditional' | 'post_review' | 'hold' | 'no_trade';
  suppressionReason: string | null;
  htfContextStatus: 'sufficient' | 'partial' | 'insufficient' | 'not_applicable';
  dataQualityStatus: 'ok' | 'partial' | 'data_limited';
  canExecute: boolean;
}
```

The exact type can change to match the codebase, but the source-of-truth principle should not.

### Trading logic impact

No intended approval change at first. It should report current decisions before changing them.

### Installed audit behavior

Phase 9C is installed as a repeatable read-only audit command:

```bash
npm run diagnostic:active-desk-state -- --json
```

The standard workflow loopback also runs `phase-9c-active-desk-state-audit`.

Current active DeskState audit result: `pass`. The audit verifies DeskState snapshots carry scanner-owned source-of-truth markers, mirror visibility mode / Discord action / `canExecute` from visibility metadata, carry candidate lifecycle trace and promotion path metadata, preserve watch-to-plan/review promotion proof, and keep all no-authority-change boundaries intact. It does not post Discord, write Supabase, change scanner behavior, change trading logic, change ranking, change risk rules, change bridge behavior, change `canExecute`, or change entry/stop/target math.

## Phase 9D: Discord Watch Alerts

### Goal

Discord should tell the trader what is forming before a full plan exists.

### Example

```text
SHORT WATCH FORMING
Line in the sand: 7320.25
Trigger: completed 5M close below 7320.25
Reason: HTF failed auction plus 15M/5M structure shifting lower.
No chase. Wait for confirmation.
```

### Rules

- Watch alerts are not execution approval.
- Use completed 5M trigger language.
- Include line in the sand and invalidation/next trigger when available.
- Avoid prediction language.

### Trading logic impact

Discord visibility behavior changes, not execution approval.

Current Discord watch alert audit result: `pass`. The audit verifies a scanner-owned watch DeskState can render trader-facing Discord watch text with `WATCH FORMING`, line in the sand, side-specific `LONG ABOVE`/`SHORT BELOW`, completed-5M trigger language, invalidation, stand-down/no-chase language, `NOT APPROVED`, `canExecute=false`, and decision-support language. It rejects prediction/execution language and preserves all no-authority-change boundaries. It does not post Discord, write Supabase, change scanner behavior, change trading logic, change ranking, change risk rules, change bridge behavior, change `canExecute`, or change entry/stop/target math.

## Phase 9E: Watch-To-Plan Promotion

### Goal

Make campaigns continuous:

```text
Watch -> Conditional -> Human Review Ready -> Posted Plan
```

### Requirements

- Full plan requires confirmed trigger/retest/stop proof.
- Use protected 5M structure stop when proof exists.
- Keep `canExecute=false` unless already allowed elsewhere.
- Preserve no-chase behavior when price is extended.

### Trading logic impact

Potential scanner/visibility behavior change. Must be reviewed carefully.

## Phase 9F: Replay Validation

### Goal

Prove the new command path before trusting it live.

### Replay should verify

- Did watch alert appear before the move?
- Did line in the sand match the market structure?
- Did the plan promote correctly?
- Did it avoid chasing?
- Did it explain no-trade clearly?
- Did Discord/RAG/UI all reflect the same state?

### Trading logic impact

No, research/replay only.

## Phase 9H: HTF FVG Decision-Zone Alerts

### Goal

Make Discord name important 15M/60M/120M/240M FVG or imbalance decision zones when the scanner already has a structured FVG/imbalance line in the sand.

### Rules

- FVG zones are reaction, obstacle, target-management, hold/fold, and continuation-gate context.
- FVG zones are not standalone trade approvals.
- FVG zones do not change `canExecute`.
- FVG zones do not replace completed 5M trigger, protected structure stop, risk, invalidation, target room, or session gates.
- Discord shall name the line, why it matters, the hold condition, the fold condition, and no-chase instruction.

### Installed behavior

`DeskState.primaryDeskPlay.fvgDecisionZone` is populated only when the active scanner-owned line in the sand is already tagged as an FVG/imbalance line. Current Desk Plan Discord output can then show a compact `FVG Decision Zone` block.

### Trading logic impact

No intended execution approval change. Discord visibility wording changes only.

## Recommended Implementation Order

1. Phase 8.45: Obsolete And Dirty Code Cleanup Audit
2. Phase 8.5: Authority Language Cleanup
3. Phase 8.55: Collapse Agent Responsibilities Around DeskState
4. Phase 8.6: No Silent Drop Policy
5. Phase 9A: Trade Decision Map Audit
6. Phase 9B: Candidate Lifecycle Trace
7. Phase 9C: Active Desk State
8. Review outputs with the user
9. Phase 9D: Discord Watch Alerts
10. Phase 9E: Watch-To-Plan Promotion
11. Phase 9F: Replay Validation
12. Phase 9H: HTF FVG Decision-Zone Alerts

## New Chat Starter Prompt

Use this prompt in the new chat:

```text
Read and follow AGENTS.md and docs/CODEX_RULES.md.

Also read docs/DESK_STATE_PHASE_HANDOFF.md before making any plan or edits.

Goal:
Implement the next architecture cleanup phases for the Quant Desk scanner so trade visibility becomes simpler, deterministic, and Discord-ready without changing trade approvals.

Important context:
We are trying to reduce workflow drift. The scanner should produce one source-of-truth DeskState / visibility metadata. Agents may summarize that state, but must not invent, suppress, rerank, or reinterpret active trade candidates. Discord should not silently drop meaningful structured NinjaTrader OHLC evidence.

Implement in this order:
1. Phase 8.45: Obsolete And Dirty Code Cleanup Audit
2. Phase 8.5: Authority Language Cleanup
3. Phase 8.55: Collapse Agent Responsibilities Around DeskState
4. Phase 8.6: No Silent Drop Policy

Constraints:
- Do not change trade approvals, canExecute, entry rules, stop rules, target rules, model definitions, or risk gates.
- Do not add new trade models.
- Do not add new Discord hard blockers.
- Authority terms are metadata first, not gates.
- No silent hard stops: blocked execution must become watch, conditional, review, hold-with-reason, no-trade-with-reason, or data-quality blocker when structured evidence exists.
- NinjaTrader OHLC remains the highest authority.
- Gemini/advisory agents must not invent or suppress trade candidates.
- Discord/RAG/UI must consume DeskState or visibility metadata instead of independently deciding trade visibility.
- Remove obsolete/dirty code only after proving it is unused, superseded, duplicated, or unsafe.
- Do not delete safety blockers, no-trade outcomes, data-quality blockers, or canExecute protections.

Before editing:
Inspect current scanner candidate lifecycle, agent selection, Discord formatter/scheduler, responsibility registry, setup registry, architecture guard, AGENTS.md, docs/CODEX_RULES.md, and docs/DESK_STATE_PHASE_HANDOFF.md.

First deliver a concise implementation plan.
Then implement Phase 8.45, Phase 8.5, Phase 8.55, and Phase 8.6 only.

Required checks:
- npx tsc --noEmit
- npm run test
- npm run lint
- npm run build
- npm run guard:no-firebase
- npm run guard:architecture
- npm run guard:schema

Final report:
- Files inspected
- Files changed
- What Phase 8.45 audited/removed/deferred
- What Phase 8.5 added
- What Phase 8.55 added
- What Phase 8.6 added
- Trading logic changed: Yes/No
- Scanner behavior changed: Yes/No
- Discord behavior changed: Yes/No
- Bridge behavior changed: Yes/No
- Tests/checks run
- Remaining risks
```

## What Not To Do In The New Chat

- Do not start with Phase 9D Discord watch alerts.
- Do not add a new trade model.
- Do not loosen `canExecute`.
- Do not delete code simply because it looks old.
- Do not remove safety or data-quality blockers in the name of cleanup.
- Do not convert authority labels into new blockers.
- Do not let agents independently decide visibility.
- Do not use Gemini/advisory text as glue between timeframes.
- Do not allow meaningful structured OHLC evidence to vanish without a trace.
