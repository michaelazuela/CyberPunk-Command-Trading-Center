# Setup Scan Workflow

This document defines the planned all-setup scan workflow for the MES/MNQ trading decision-support app. It is an implementation blueprint only. It does not change runtime behavior by itself.

## Purpose

The app must evaluate every approved price-action setup type on every analysis run. The goal is to avoid missing valid or conditional trade opportunities because one candidate failed an execution gate.

AI may extract visible chart context. The app must own setup scanning, execution approval, ranking, and final trade selection.

## Approved Setup Universe

The setup scanner must consider the approved setup types for the active session:

- Order Block / 61.8%
- Liquidity Sweep
- Momentum / Runaway
- Fair Value Gap
- FVG / Imbalance Pullback
- Market Structure Shift / ChoCH
- Opening Order Block
- Equal Highs / Equal Lows
- Initial Balance Extension
- Previous Day High/Low Sweep
- Compression Breakout
- Opening Gap Fill
- Breaker Block
- Algo Kill Zone
- Mitigation Block
- Momentum Pullback / Breather Reclaim

If a setup is not allowed for a session, it should still be represented as unavailable or invalid for that session rather than silently disappearing from the system design.

## Required Separation

The app must keep three concerns separate:

1. Setup detection
2. Execution approval
3. Final opportunity selection

Detection answers: "Is this setup present, possible, absent, blocked, conditional, or invalid?"

Execution approval answers: "Can this setup be executed under the app rules right now?"

Final selection answers: "Which executable or conditional opportunity is best?"

## Setup Candidate Contract

Every scanned setup should produce a structured `SetupCandidate` record with:

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

This is true even when the setup is not detected. The scan output should make absence explicit.

## Execution Status

Each candidate should receive one execution status:

- `Executable`: all required fields are present and all hard gates pass
- `Conditional`: setup is valid but requires a future trigger or manual confirmation
- `Blocked`: setup exists but execution is blocked by a hard rule
- `NotDetected`: setup was scanned but not found
- `Invalid`: setup was inconsistent, structurally invalid, or not allowed for the session

## RiskTooWide Rule

`RiskTooWide` blocks execution only. It must not erase the detected setup candidate.

Correct handling:

```text
Momentum / Runaway
Status: Detected
Execution: Blocked
Reason: RiskTooWide
Next Action: Wait for pullback/reclaim or reduced-risk trigger.
```

Incorrect handling:

```text
No setup survived gates.
Reason: RiskTooWide
```

## Ranking Rules

After all setup candidates are created, the app should rank opportunities by:

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
3. `NoTrade`, only if no executable or conditional candidate exists

No-trade is valid, but it must be the final result only after the full setup scan is complete.

## Deterministic Conditional Builder

The scanner detects and ranks setup candidates. A separate deterministic builder may add conditional planning paths from structured chart facts so the user can see the next valid trigger without loosening execution rules.

Builder output remains non-executable until the trade decision pipeline confirms:

- trigger present
- entry confirmed
- stop confirmed
- T1/T2 computed from confirmed risk
- invalidation defined
- risk inside the hard limit

RiskTooWide candidates remain visible as blocked or conditional opportunities. They must not be converted into approved trades or erased from the scan.

## Output Expectation

The final output should support a ranked scan view:

```text
Setup Scan Results

1. Momentum / Runaway
Status: Detected
Direction: Long
Confidence: High
Execution: Blocked
Reason: RiskTooWide
Next Action: Generate pullback/reclaim plan

2. FVG / Imbalance Pullback
Status: Possible
Direction: Long
Confidence: Medium
Execution: Conditional
Reason: Needs pullback into imbalance

3. Liquidity Sweep
Status: NotDetected

Best Trade Opportunity:
Conditional Momentum Pullback Long
```

## Non-Negotiables

- The app evaluates all approved setup types every time.
- Setup detection is separate from execution approval.
- `RiskTooWide` blocks execution only.
- `RiskTooWide` must not erase the detected setup candidate.
- The app ranks executable and conditional opportunities.
- `NoTrade` is returned only when no executable or conditional setup exists.

## Lunch Reversal Subtypes

The scanner evaluates five Lunch-only subtypes for `lunch` and `replay_lunch`:

- Lunch Failed High Reversal
- Lunch Failed Low Reversal
- Lunch Compression Breakout
- Lunch Failed Continuation
- Lunch Range Reclaim

These subtypes require completed Morning window context. Missing Morning context prevents the subtype from activating. `RiskTooWide` blocks execution only; it does not erase a detected Lunch subtype.
