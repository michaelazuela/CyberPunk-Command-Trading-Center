# No-Trade Rules

No-trade is a valid, protected system outcome. The app must prefer no-trade over an unclear or unsafe trade.

AI may describe why a chart looks risky, but the final no-trade decision must be produced by the deterministic rule-based pipeline.

## Required No-Trade Checks

The app must evaluate these checks in order:

1. Confirm session and instrument
2. Confirm screenshot usability
3. Identify market context
4. Identify key levels
5. Determine bias
6. Check approved time window
7. Identify setup type
8. Validate entry trigger
9. Validate stop location
10. Validate risk limit
11. Determine target model
12. Define invalidation
13. Decide trade or no-trade
14. Generate final trade plan
15. Save journal-ready record

## Hard No-Trade Conditions

The app must return no-trade when any hard blocker is present:

- No selected instrument
- Unsupported instrument
- Screenshot is unreadable
- Required execution chart is missing
- Required session context is missing
- No measurable setup type
- No measurable entry trigger
- No valid stop location
- Risk exceeds configured maximum
- Entry and stop are equal or invalid
- Targets cannot be computed from entry and stop
- Trade violates approved time window rules
- Kill switch is active
- Setup requires data that is not visible or supplied

## Soft No-Trade Or Warning Conditions

These conditions may produce a warning, pending trigger, or no-trade depending on the full rule context:

- OCR timestamp is unreadable
- Screenshot is outside the ideal upload window
- Midnight Open is missing
- ETH context is missing
- RAG history conflicts with the setup
- Price is chopping around a key level
- Heavy candle overlap
- Current candle has not completed
- Entry trigger has not fired yet
- Trend is extended and chasing risk is high

## Pending Trigger Vs No-Trade

A pending trigger is allowed when the app has:

- Direction
- Setup type
- A completed trigger candle or measurable trigger level
- Entry price
- Stop price
- Risk within limits
- App-computed T1 and T2

A no-trade is required when the app lacks any of those fields.

## Examples

### Valid Pending Trigger

```text
Trend is intact.
Trigger candle is completed.
Entry = break of trigger candle high.
Stop = trigger candle low.
Risk is within limit.
Result = conditional LONG plan with PENDING_TRIGGER.
```

### No-Trade

```text
Trend is bullish, but the current candle is still forming.
No completed trigger candle exists.
Entry cannot be measured.
Result = NO TRADE.
```

## No-Trade Output

The app should return:

```ts
{
  decision: "NO TRADE",
  entry: null,
  stop: null,
  t1: null,
  t2: null,
  canExecute: false,
  triggerState: "NO_TRIGGER",
  whyThisPlan: "Specific blocker",
  invalidation: "What must change before a trade can be considered"
}
```

## Journal Requirement

No-trade outcomes should still be saved when appropriate. They teach the RAG database which conditions were rejected and why.

## Authority Boundary

AI may suggest no-trade reasons. The app must decide no-trade through deterministic gates.
