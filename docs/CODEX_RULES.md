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

Minimum structured lookback:

* 5M: active execution window only, plus enough bars for the current trigger sequence.
* 15M: at least 2 completed trading days, or enough bars to include ETH, London, NY premarket, current RTH, and prior session liquidity.
* 1H: at least 4 completed trading days.
* 4H: at least 7 completed trading days, preferably 20+ completed 4H candles when available.

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
