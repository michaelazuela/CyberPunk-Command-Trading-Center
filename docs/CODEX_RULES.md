# CODEX_RULES.md

## Purpose

This document tells Codex how to work safely inside the 6K Trading project.

The goal is to improve the project without accidentally changing the approved trading system. Codex may improve code quality, reliability, testing, data handling, documentation, deployment support, and project structure, but it must not change trading logic unless explicitly approved.

---

## Project Summary

6K Trading is a local-bridge-driven trading support system.

The project uses data from a local bridge, not screenshots or OCR, as the primary source of market information.

Primary flow:

```text
Local Bridge Data
→ Data Validation
→ Session / Time Handling
→ Trading Rule Engine
→ Trade Decision Pipeline
→ Trade Plan / Alert Output
→ Journal / RAG / Supabase
→ Review and Improvement
```

The local bridge is the source of truth for live market data.

---

## Core Rule

Do not change trading rules unless explicitly instructed.

This includes, but is not limited to:

* setup definitions
* bias rules
* entry rules
* stop-loss rules
* target rules
* invalidation rules
* session rules
* confirmation rules
* scoring logic
* trade/no-trade decision logic

If a requested change appears to require trading-logic modification, stop and explain the issue before editing.

---

## Locked or High-Risk Areas

Codex must treat the following areas as protected:

```text
setupRegistry
setupScanner
tradeDecisionPipeline
conditionalPlanBuilder
session logic
entry logic
stop logic
target logic
invalidation logic
risk/reward logic
bar-close confirmation logic
local bridge data contract
journal/RAG trade-record schema
```

These areas may only be changed when the prompt clearly authorizes the change.

If Codex is unsure whether a change affects trading logic, assume it does and ask for approval in the response before making the change.

---

## Local Bridge Rules

The project receives market data from the local bridge.

Codex must protect the bridge-to-decision pipeline.

Before changing bridge-related code, Codex must identify:

1. What data the local bridge provides.
2. What fields are required by the trading engine.
3. What fields are calculated inside the app.
4. What timestamps are used.
5. Whether the data is based on closed bars or live/incomplete bars.
6. How missing, duplicate, delayed, or malformed data is handled.
7. Whether the change could affect trade decisions.

Codex must not guess missing market data.

If bridge data is incomplete or invalid, the system should fail safely instead of creating a trade decision from bad data.

---

## Historical Replay And Backfill Contract Rule

Historical replay, forensic review, and research backfill must use the same NinjaTrader chart contract the trader is reviewing unless the user explicitly asks for rollover-contract research.

Default standard:

* Resolve the active chart contract from NinjaTrader bridge health first.
* Use the bridge-reported active contract, such as `MES 09-26`, for historical replay/backfill when comparing against NinjaTrader screenshots or videos.
* Do not silently switch January-May replay to old quarterly contracts if the active chart is loaded on the current contract with long historical lookback.
* Store the resolved `bridge_instrument` with every cached OHLC row and report it in research output.
* If the active chart contract cannot be resolved, stop and report the bridge health/default instrument issue before running chart-review research.

Exception:

* Historical rollover-contract research is allowed only when explicitly requested.
* Rollover-contract backfill must be labeled as such in the command, output files, and final report.
* Rollover-contract research must not be used for screenshot-by-screenshot chart review unless the user is viewing that exact contract.

This rule exists to keep research prices aligned with the chart the trader is looking at. NinjaTrader OHLC remains the highest authority, but the contract must match the active chart context.

---

## Bar-Close Protection

The system must not treat an incomplete bar as a confirmed closed bar unless that behavior is explicitly intended.

Codex must preserve protections around:

* bar close status
* candle completion
* timestamp accuracy
* session alignment
* duplicate bars
* delayed bridge updates
* missing data
* partial updates

If a change affects bar-close handling, Codex must call that out clearly.

---

## HTF Context Sufficiency

Before classifying an HTF liquidity draw, raid/reclaim, MSS, or reversal-delivery candidate, Codex and the desk engines must load enough structured OHLC context to make the higher-timeframe story reliable.

Minimum structured scanner preload:

* 5M: 30 calendar days when available, with the active execution window used as the execution trigger authority.
* 15M: 30 calendar days when available.
* 1H: 30 calendar days when available.
* 2H / 120M: 30 calendar days when available.
* 4H: 30 calendar days when available.

The scanner must read durable `market_bars` first and attempt NinjaTrader bridge repair/backfill when the 30-day preload is incomplete. If the 30-day preload still cannot be loaded, report it as an operational data-quality defect for HTF structural classification rather than a normal market-structure conclusion.

If minimum context is missing:

* Do not treat failed HTF classification as proof no setup exists.
* Mark the HTF read as data-limited.
* Report exact bars loaded per timeframe.
* Report exact date/time range loaded per timeframe.
* Report exact minimum expected context per timeframe.
* Prefer insufficient HTF context over bullish/bearish conflict when the engine cannot see enough history.
* Do not use narrative fallback to fill missing HTF context.
* Do not force a candidate when required structured context is missing.

A failed HTF read caused by limited history must not block the desk as if structure truly failed. It should become a data-quality/blocker state.

Data sufficiency cannot approve execution. It may only improve classification quality, blockers, and diagnostics. The 5M confirmed MSS, deterministic entry, stop, target, risk, session, model, and `canExecute` gates remain mandatory.

### HTF Context Sufficiency Visibility Rule

Any output that references HTF/MSS structure must explicitly state whether HTF context is sufficient, partial, or insufficient.

If reliability is `data_limited`, the output must state that HTF is context only, not structural confirmation, and cannot be used as candidate-promotion evidence.

Data-limited output must not say HTF conflict confirmed, bullish structure confirmed, bearish structure confirmed, candidate ready, or anything equivalent.

### Fair Value Gap Research Model Contract

Current FVG research models must use this workflow unless the user explicitly approves a different model definition:

1. HTF map first:
   * 60M, 120M, and 240M provide support, obstacle, draw, or caution only.
   * HTF context does not trigger or approve the trade by itself.
2. 15M parent setup:
   * A real 15M displacement must create the parent FVG.
   * The displacement candle may be the left, middle, or confirming candle of the three-candle 15M FVG formation. Do not require only the final FVG-confirming candle to pass displacement when the impulse leg clearly created the imbalance.
   * A standalone 5M FVG cannot trigger the Fair Value Gap Research Model.
3. Drill to 5M:
   * Price must return into the 15M FVG area, or into a clean nested 5M FVG contained inside and aligned with that 15M parent zone.
4. Completed 5M wick defense:
   * A completed 5M candle must test the FVG area and reject it.
   * The candle body must not accept through the zone against the trade direction.
   * If the 15M parent FVG or aligned nested 5M FVG accepted through against the trade direction before proof, the continuation setup is dead.
   * Later wick-defense-looking candles cannot revive a failed parent/nested FVG. A new setup requires a new valid parent model.
5. Entry, stop, targets:
   * Conservative research entry is the completed 5M wick-defense/confirmation close.
   * Stop is the nearest protected 5M structure for the active side.
   * T1 and T2 are calculated from actual entry-to-stop risk.
   * HTF zones are target-management or reaction context, not replacement execution targets.
   * When multiple same-side FVG candidates derive from the same parent displacement, the first valid completed 5M proof is the research trade candidate. Later same-parent rows are management or re-entry context unless a reset rule is explicitly approved.
   * Research reports must also carry an FVG inventory/objective ladder when evaluating management after entry:
     * Track 5M, 15M, 60M, 120M, and 240M FVGs as `open_untouched`, `partial_touch`, `filled`, or `failed_inverted`.
     * Preserve prior same-day RTH/morning liquidity levels for lunch/PM reviews; a lunch trade must not forget morning liquidity runs.
     * For shorts, failed/open FVGs above are resistance/context and open FVGs or liquidity below are structural draw/context. For longs, invert the logic.
     * T1/T2 remain tactical risk targets. Open FVGs, RTH/session liquidity, and HTF imbalance zones explain runner management only; they do not approve a trade by themselves.
6. Session-aware research windows:
   * FVG research scripts must use an explicit session window instead of hidden hardcoded cutoffs.
   * Default research may use `morning`, but afternoon review must run with a lunch/PM window that covers 12:00 PM-4:00 PM ET.
   * Research output must state the session window used so visual review can verify the same market period.
   * Research output must include a gate trace for rejected candidates so `eligible: 0` always names the exact failed gate before any model rule is adjusted.
7. Morning and afternoon symmetry:
   * FVG failure/breakdown research is not automatically an after-lunch-only idea.
   * The same parent 15M FVG workflow may be evaluated in morning or lunch/PM windows.
   * Session labels describe when the pattern appeared; they do not replace the parent 15M FVG, completed 5M proof, protected 5M stop, or target-room requirements.
8. Balanced-price context:
   * Prior balanced price action is context for likely continuation/liquidity delivery, not a standalone trigger.
   * If price rebalances a prior move, then creates a fresh 15M displacement FVG and pulls back into it, research may classify continuation only after completed 5M proof confirms rejection/defense and the nearest real liquidity target remains available.
9. Holiday bridge participation context:
   * FVG research may tag a Friday session after a Thursday federal holiday as `holiday_bridge_thin_participation`.
   * This is context only. It must not block, approve, publish, rank, or alter any trade by itself.
   * Use the tag to review whether holiday-bridge participation explains range/chop losses before proposing any live blocker.

If a replay finds a good-looking trade from a 5M FVG without a valid 15M parent displacement FVG, classify it as a separate research idea or no-trade. Do not label it as the Fair Value Gap Research Model.

### Mandatory Current Trade Report Contract

When the user asks for the current trade plan, current market read, HTF read, Discord plan status, target validity, or whether a trade is still valid, Codex shall answer in the same structured report format every time.

The report shall include:

1. Decision:
   * Trade / watch / no fresh entry / no trade.
   * Direction.
   * `canExecute` status.
   * Human-review-only status.
2. Current price and candle:
   * Latest completed 5M candle timestamp and close.
   * Current bridge price when available.
   * Candle completion status.
3. Trade plan:
   * Entry, stop, risk, T1, T2, and invalidation.
   * If no fresh plan exists, state that clearly and show only historical/reference levels as context.
4. HTF story:
   * 15M, 60M, 120M, and 240M read.
   * Support, conflict, caution, and data sufficiency.
5. Line in the sand:
   * Exact level.
   * Why it matters.
   * Required completed candle close or retest condition.
   * What happens above and below.
6. Target and management:
   * Whether T1/T2 are still valid for the original plan.
   * Whether each level is a fresh-entry target, management target, reaction zone, or historical target.
   * Next objective and runner condition when available.
7. No-chase / fresh-entry status:
   * Whether a fresh entry remains.
   * If missed, what new proof is required.
8. Discord status:
   * Posted / suppressed / held local / not eligible.
   * Exact suppression reason when available.

Codex must not collapse these distinctions. A target can remain valid for an earlier plan while the current fresh-entry state is no-chase. In that case, Codex shall explicitly say the target is still valid as management or historical context, and separately say whether a new entry is available.

---

## Before Editing Code

Before making changes, Codex must provide a short plan that includes:

1. Files it will inspect.
2. Files it expects to modify.
3. Whether trading logic may be affected.
4. What behavior it intends to preserve.
5. What tests or checks it will run.

Codex should not make broad or unrelated changes.

Keep changes narrow and directly tied to the requested task.

---

## During Implementation

Codex must follow these rules:

* Make the smallest safe change.
* Do not refactor unrelated code.
* Do not rename key files, functions, or data fields unless required.
* Do not remove existing safeguards.
* Do not weaken validation.
* Do not bypass tests.
* Do not introduce new trading assumptions.
* Do not add new strategies unless explicitly requested.
* Preserve current behavior unless the prompt says otherwise.

### Patch Context Hygiene

Before using `apply_patch`, Codex must verify the exact current file context for every hunk it will touch.

Required workflow:

* Use `rg`, `Get-Content`, or another read-only file inspection command to capture the current nearby lines immediately before patching.
* Anchor patches on stable, unique surrounding code instead of remembered text from an earlier turn.
* Keep patch hunks narrow. Do not patch a large block when one or two targeted lines are enough.
* If a patch-context mismatch occurs, stop editing that file, re-read the exact current lines, and apply a smaller corrected hunk.
* Do not use a patch-context mismatch as a reason to rewrite unrelated code.

---

## Required Final Response

After making changes, Codex must report:

1. Files changed.
2. What changed in each file.
3. Tests or checks run.
4. Test results.
5. Whether trading logic changed: Yes or No.
6. If trading logic changed, identify the exact file, function, and behavior changed.
7. Any unresolved risks.
8. Any follow-up recommendations.

Required format:

```text
Files changed:
- path/to/file.ts — brief explanation

Tests/checks run:
- command or manual check
- result

Trading logic changed:
- No

Risks:
- None known
```

If trading logic did change, use this format:

```text
Trading logic changed:
- Yes
- File:
- Function:
- Behavior changed:
- Reason:
- Approval basis:
```

---

## Testing Expectations

When possible, Codex should add or update tests for changes involving:

* local bridge ingestion
* bridge data validation
* timestamp handling
* session detection
* bar-close confirmation
* duplicate/missing data handling
* trade decision input contracts
* journal/RAG records
* Supabase persistence
* alert or Discord output formatting

Preferred test fixture examples:

```text
tests/fixtures/bridge/am-valid-long.json
tests/fixtures/bridge/am-valid-short.json
tests/fixtures/bridge/no-trade-chop.json
tests/fixtures/bridge/partial-bar-invalid.json
tests/fixtures/bridge/duplicate-bar.json
tests/fixtures/bridge/missing-field.json
tests/fixtures/bridge/delayed-update.json
tests/fixtures/bridge/session-boundary.json
```

Test cases should prove that the system does not create trades from invalid, incomplete, or ambiguous bridge data.

---

## Journal and RAG Integrity

Every trade decision should be traceable.

Codex should preserve or improve the ability to record:

* trade date
* session
* symbol
* market timestamp
* bridge payload or data snapshot reference
* setup detected
* bias
* decision
* entry
* stop
* target
* invalidation
* reason for trade or no-trade
* rule version
* outcome
* lessons learned

Codex must not change the journal/RAG schema without explaining the migration impact.

---

## Supabase and Cloudflare Safety

Codex must be careful with:

* Supabase credentials
* Cloudflare environment variables
* local bridge endpoints
* API keys
* webhook URLs
* authentication logic
* database writes
* deployment configuration

Never hard-code secrets.

Never print secrets in logs.

Never commit `.env` files.

If environment variables are needed, document the variable name and expected purpose without exposing actual values.

---

## Documentation Updates

Codex should update documentation when changes affect:

* local bridge contract
* data flow
* environment variables
* deployment behavior
* test commands
* trade decision output
* journal/RAG structure
* Supabase schema
* known limitations

Recommended docs:

```text
docs/CODEX_RULES.md
docs/LOCAL_BRIDGE_CONTRACT.md
docs/PROJECT_STATUS.md
docs/REGRESSION_TEST_PLAN.md
docs/RELEASE_NOTES.md
```

---

## Project Status Updates

For meaningful changes, Codex should update or create:

```text
docs/PROJECT_STATUS.md
```

Suggested format:

```text
# Project Status

## Latest Change

Date:
Task:
Files changed:
Reason:
Tests run:
Result:
Trading logic changed: Yes/No
Bridge impact:
Journal/RAG impact:
Supabase impact:
Known risks:
Next recommended action:
```

---

## Default Update Cadence

Codex should provide updates after major phases, not continuously.

Required checkpoints for larger tasks:

1. Inspection complete.
2. Plan complete.
3. Implementation complete.
4. Tests complete.
5. Final summary complete.

For high-risk areas, Codex must pause before implementation if trading logic may be affected.

---

## Definition of Done

A task is complete only when:

* requested change is implemented
* unrelated behavior is preserved
* tests/checks are run where possible
* final summary is provided
* trading-logic impact is clearly stated
* unresolved risks are identified
* documentation is updated if needed

---

## Standing Instruction

When in doubt, protect the trading system.

Accuracy and repeatability matter more than speed.

Do not make the project look cleaner at the cost of making the trade engine less trustworthy.
