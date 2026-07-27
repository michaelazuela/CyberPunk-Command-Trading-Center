# Setup Scan Workflow

This document records the setup scan workflow for the MES/MNQ trading decision-support app. Earlier versions described an all-setup scan across many historical setup families; the current runtime is primary-model-only.

## Purpose

The app must evaluate the current active primary setup models on every analysis run. historical context can strengthen or weaken those candidates, but it does not create a separate executable setup.

AI may extract visible chart context. The app must own setup scanning, execution approval, ranking, and final trade selection.

## Current Active Setup Universe

The setup scanner creates active candidates only for the current primary models:

- Sweep -> MSS -> FVG Retrace
- no installed model path

historical context may contribute facts, reasons, missing evidence, tags, notes, and scoring signals:

- Liquidity Sweep
- Fair Value Gap / Imbalance
- FVG / Imbalance Pullback
- Market Structure Shift / ChoCH
- Equal Highs / Equal Lows
- Previous Day / Session Sweep
- Breaker / FVG overlap

Deprecated or historical setup families should not create active candidates. They may remain in compatibility types, historical records, or reference docs only.

## Required Separation

The app must keep three concerns separate:

1. Setup detection
2. Execution approval
3. Final opportunity selection

Detection answers: "Is this setup present, possible, absent, blocked, conditional, or invalid?"

Execution approval answers: "Can this setup be executed under the app rules right now?"

Final selection answers: "Which executable or conditional opportunity is best?"

## Setup Candidate Contract

Every active primary setup candidate should produce a structured `SetupCandidate` record with:

- `setupType`
- `direction`
- `detectedStatus`
- `confidence`
- `priority`
- `evidence`
- `missingEvidence`
- `executionStatus`
- `blockReason`
- `requiredTrigger`
- `nextAction`
- `reducedRiskPlan`

historical context should be attached to the relevant primary candidate rather than emitted as a third executable model.

## Execution Status

Each candidate should receive one execution status:

- `Executable`: all required fields are present and all hard gates pass
- `Conditional`: setup is valid but requires a future trigger or manual confirmation
- `Blocked`: setup exists but execution is blocked by a hard rule
- `NotDetected`: setup was scanned but not found
- `Invalid`: setup was inconsistent, structurally invalid, or not allowed for the session

## Extended Structural Risk Rule

The scanner must use the nearest protected completed 5M structure as the stop. If that creates larger-than-standard risk, the candidate remains visible as extended structural risk instead of being erased or converted into an old fixed-cap blocker.

Correct handling:

```text
Sweep -> MSS -> FVG Retrace
Status: Detected
Execution: Conditional
Risk: Extended structural review
Next Action: Use nearest protected 5M structure stop; size or stand down at trader discretion.
```

Incorrect handling:

```text
No setup survived gates.
Reason: fixed risk cap erased the protected-structure candidate
```

## Ranking Rules

After active primary candidates are created, the app should rank opportunities by:

- setup priority
- confidence
- risk quality
- proximity to key level
- clarity of entry trigger
- clarity of stop
- clarity of target

Executable candidates rank above conditional candidates. Blocked candidates should remain visible but cannot become the final executable plan.

## Final Opportunity Selection

The app should return:

1. `bestExecutableCandidate`, if one exists
2. `bestConditionalCandidate`, if no executable candidate exists
3. `NoTrade`, only if no executable or conditional primary candidate exists

No-trade is valid, but it must be the final result only after the primary model scan is complete.

## Deterministic Conditional Builder

The scanner detects and ranks setup candidates. A separate deterministic builder may add conditional planning paths from structured chart facts so the user can see the next valid trigger without loosening execution rules.

Builder output remains non-executable until the trade decision pipeline confirms:

- trigger present
- entry confirmed
- stop confirmed
- T1/T2 computed from confirmed risk
- invalidation defined
- risk inside the hard limit

Extended-structural-risk candidates remain visible as conditional opportunities when the setup, trigger, entry, stop, targets, and invalidation are complete. They must not be erased from the scan by a fixed risk cap.

## Output Expectation

The final output should support a ranked scan view:

```text
Setup Scan Results

1. Sweep -> MSS -> FVG Retrace
Status: Detected
Direction: Long
Confidence: High
Execution: Conditional
Reason: Waiting for retrace into imbalance

2. no installed model path
Status: Possible
Direction: Short
Confidence: Medium
Execution: NotDetected
Reason: Sweep/reclaim sequence not complete

3. Liquidity Sweep
Status: historical context only

Best Trade Opportunity:
Conditional Sweep -> MSS -> FVG Retrace Long
```

## Non-Negotiables

- The app evaluates active primary setup models every time.
- historical context is not a standalone executable setup.
- Deprecated setup families must not create active candidates.
- Setup detection is separate from execution approval.
- Extended structural risk is advisory and sizing context.
- Fixed risk caps must not erase the detected setup candidate when the protected 5M structure stop is valid.
- The app ranks executable and conditional opportunities.
- `NoTrade` is returned only when no executable or conditional primary candidate exists.

## Deprecated Lunch Review Subtypes

Older docs and internal compatibility branches referenced five Lunch-only subtypes:

- Lunch Failed High Reversal
- Lunch Failed Low Reversal
- Lunch Compression Breakout
- Lunch Failed Continuation
- Lunch Range Reclaim

These are not active standalone trade models in the current primary-model-only scanner. Lunch still uses the same primary model families, with completed Morning context and session structure acting as evidence/context.
