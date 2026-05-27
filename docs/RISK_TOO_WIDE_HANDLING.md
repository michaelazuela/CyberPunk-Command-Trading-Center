# RiskTooWide Handling

This document defines how the app should treat setups whose visible structure cannot currently be expressed inside the configured risk limit.

This is a blueprint only. It does not change runtime behavior by itself.

## Core Rule

`RiskTooWide` is an execution blocker, not a setup detector.

When a valid primary setup is visible but the protected structure stop is too wide, the setup remains detected. Only execution is blocked.

## Required Behavior

The app must preserve the candidate and show:

- setup type
- direction
- confidence
- detected evidence
- actual entry-to-stop risk distance
- whether the current trigger can be expressed inside the configured risk limit
- execution status
- block reason
- next action
- cleaner structure-stop trigger plan, if available

## Example

```text
Setup: Sweep -> MSS -> FVG Retrace
Direction: Long
Detected Status: Detected
Execution Status: Blocked
Block Reason: RiskTooWide
Evidence:
- Liquidity sweep
- Reclaim after sweep
- Displacement and structure shift
Missing Evidence:
- Cleaner structure stop inside the configured risk limit
Next Action:
- Wait for retrace into imbalance with stop under protected structure.
```

## What Must Not Happen

The app must not collapse a detected setup into:

```text
No setup survived gates.
```

That message hides useful information from the trader and weakens RAG learning. A blocked setup is still a useful historical record.

## Reduced-Risk Planning

When `RiskTooWide` occurs, the scanner may create or recommend a conditional plan if the chart provides enough structure.

Examples:

- A primary model is detected but current entry is extended.
- App blocks immediate execution because the current protected structure exceeds the risk limit.
- App marks a cleaner retrace or reclaim plan as conditional.
- Required trigger might be a completed pullback candle break.
- Stop must be tied to the pullback low/high or visible swing structure.

The conditional plan must still obey all hard gates before it can become executable.

## Ranking Impact

A `RiskTooWide` candidate can be:

- high detection confidence
- high setup priority
- blocked for execution

Blocked candidates remain visible but cannot be the final executable plan. If the blocked setup has a cleaner structure stop inside the risk limit, that plan may become the best conditional opportunity.

## Final Decision Impact

The final decision should follow this order:

1. Select the best executable candidate.
2. If none exists, select the best conditional candidate.
3. Return `NoTrade` only when no executable or conditional candidate exists.

Therefore, `RiskTooWide` alone should not automatically produce `NoTrade` if a conditional opportunity exists.

## Non-Negotiables

- `RiskTooWide` blocks execution only.
- `RiskTooWide` must not erase detected setups.
- Blocked setups should remain visible and journal-ready.
- No-trade is valid only after every active primary setup candidate is scanned and ranked.

Older Lunch-only subtype names may remain in historical records or compatibility code, but they are not active standalone trade models in the current primary-model-only scanner. For current Lunch / PM Review candidates, `RiskTooWide` still blocks execution only and should not erase the journal-ready candidate context.
