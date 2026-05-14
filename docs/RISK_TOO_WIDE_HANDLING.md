# RiskTooWide Handling

This document defines how the app should treat setups whose entry-to-stop distance exceeds the configured risk limit.

This is a blueprint only. It does not change runtime behavior by itself.

## Core Rule

`RiskTooWide` is an execution blocker, not a setup detector.

When a valid setup is visible but the stop distance is too wide, the setup remains detected. Only execution is blocked.

## Required Behavior

The app must preserve the candidate and show:

- setup type
- direction
- confidence
- detected evidence
- risk distance
- configured max risk limit
- execution status
- block reason
- next action
- reduced-risk plan, if available

## Example

```text
Setup: Momentum / Runaway
Direction: Long
Detected Status: Detected
Execution Status: Blocked
Block Reason: RiskTooWide
Evidence:
- Strong directional expansion
- Higher-high / higher-low structure
- Continuation pressure visible
Missing Evidence:
- Reduced-risk pullback trigger
Next Action:
- Wait for breather reclaim or pullback entry with stop under active swing.
```

## What Must Not Happen

The app must not collapse a detected setup into:

```text
No setup survived gates.
```

That message hides useful information from the trader and weakens RAG learning. A blocked setup is still a useful historical record.

## Reduced-Risk Planning

When `RiskTooWide` occurs, the scanner may create or recommend a conditional reduced-risk plan if the chart provides enough structure.

Examples:

- Momentum setup is detected but current entry is extended.
- App blocks immediate execution because risk exceeds max.
- App marks a reduced-risk pullback plan as conditional.
- Required trigger might be a completed pullback candle break.
- Stop must be tied to the pullback low/high or visible swing structure.

The reduced-risk plan must still obey all hard gates before it can become executable.

## Ranking Impact

A `RiskTooWide` candidate can be:

- high detection confidence
- high setup priority
- blocked for execution

Blocked candidates remain visible but cannot be the final executable plan. If the blocked setup has a clean reduced-risk trigger, that reduced-risk plan may become the best conditional opportunity.

## Final Decision Impact

The final decision should follow this order:

1. Select the best executable candidate.
2. If none exists, select the best conditional candidate.
3. Return `NoTrade` only when no executable or conditional candidate exists.

Therefore, `RiskTooWide` alone should not automatically produce `NoTrade` if a conditional reduced-risk opportunity exists.

## Non-Negotiables

- `RiskTooWide` blocks execution only.
- `RiskTooWide` must not erase detected setups.
- Blocked setups should remain visible and journal-ready.
- No-trade is valid only after every setup candidate is scanned and ranked.

For Lunch-only subtypes, `RiskTooWide` still blocks execution only. A detected `LunchFailedHighReversal`, `LunchFailedLowReversal`, `LunchCompressionBreakout`, `LunchFailedContinuation`, or `LunchRangeReclaim` must remain visible so the trader and RAG database can learn from the opportunity even when the current entry/stop distance is too wide.
