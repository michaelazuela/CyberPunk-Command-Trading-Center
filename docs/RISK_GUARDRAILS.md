# Risk Guardrails

Risk guardrails are deterministic and cannot be overridden by AI.

AI may identify possible chart structure, but the app must validate entry, stop, target model, risk, and execution permission.

Confidence is supporting context only. A `High` confidence label must not approve a trade when entry, stop, invalidation, time window, or risk validation fails.

## Required Risk Sequence

Every analysis must follow this order:

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

## Entry And Stop Rules

Entry must come from a measurable trigger:

- Break of a completed candle high
- Break of a completed candle low
- Reclaim of a defined level
- Retest of a defined zone

Stop must come from invalidating structure:

- Trigger candle low/high
- Protected swing low/high
- Sweep wick extreme
- Order block or zone boundary
- Structure break level

The app must reject arbitrary entry or stop values.

## Risk Calculation

Risk is calculated by the app:

```text
riskPoints = abs(entry - stop)
```

Risk must be positive and finite.

If `entry`, `stop`, or `riskPoints` is missing, the trade is not executable.

## Risk Limit

The app must hard-block trades above the configured maximum stop distance.

Current constants define:

```ts
MAX_STOP_TYPE_1 = 6
MAX_STOP_TYPE_2 = 8
MAX_RISK_PER_TRADE = 0.02
```

The app-owned rule engine must enforce the active stop-distance maximum before execution.

Example:

```text
High confidence + failed risk check = No Trade
```

## Target Model

Targets are app-computed only:

```text
LONG:
T1 = entry + riskPoints * 1.5
T2 = entry + riskPoints * 2.0

SHORT:
T1 = entry - riskPoints * 1.5
T2 = entry - riskPoints * 2.0
```

Targets must be rounded to the valid tick size.

AI-provided targets are advisory only.

## Kill Switches

Risk guardrails must respect kill switches, including:

- Daily loss limit
- Order/fill count limit
- Time limit
- Size limit
- Revenge trading protection
- Pre-market restrictions

If a kill switch is active, the result is no-trade or no-execution.

## Position Sizing

Position sizing must be based on account risk and stop distance.

Conceptual formula:

```text
maxRiskDollars = accountEquity * riskPercent
riskPerContract = riskPoints * instrumentDollarPerPoint
contracts = floor(maxRiskDollars / riskPerContract)
```

The app must not increase contracts to force a trade.

## Execution Permission

A trade is executable only when all are true:

- Direction is `LONG` or `SHORT`
- Entry exists
- Stop exists
- T1 exists
- T2 exists
- Risk is within limit
- Trigger state is valid
- Time window is valid
- No kill switch is active
- Invalidation is defined

Otherwise, execution must remain disabled.

## Journal And RAG Requirement

The saved record should include:

- Entry
- Stop
- T1
- T2
- Risk points
- Risk/reward model
- Invalidation
- Outcome when known
- Proof screenshot when supplied

This lets RAG learn which risk profiles worked and which failed.

## Authority Boundary

AI can extract context. The deterministic app pipeline owns risk.
