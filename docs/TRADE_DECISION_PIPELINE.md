# Trade Decision Pipeline

This app is a trading decision-support system. It must use the same trade-decision sequence every time for Morning Analysis, Lunch Reversal, Replay Morning, and Replay Lunch.

AI may extract chart context, summarize visible structure, and propose advisory observations. The final trade decision must be produced by a deterministic, rule-based app pipeline.

Confidence is a supporting field only. It may help rank otherwise valid candidates, but it must never override a failed gate. Example: `High` confidence plus a failed risk check still returns `NoTrade`.

## Fixed Sequence

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

## Pipeline Contract

### 1. Confirm Session And Instrument

The app must know which workflow is running:

- `morning`
- `lunch`
- `replay_morning`
- `replay_lunch`

The selected instrument is the source of truth. OCR or AI must not override the user-selected instrument.

### 2. Confirm Screenshot Usability

The screenshot must be checked for:

- Chart visibility
- Timeframe
- Price scale readability
- Required time range
- Session relevance

If the screenshot is unclear, the app may warn or return no-trade. It must not invent missing data.

### 3. Identify Market Context

The analyzer may extract:

- RTH structure
- ETH context when available
- Midnight Open relation
- Initial Balance behavior
- Morning-to-lunch carryover context
- Replay historical date context

This context is advisory input for the deterministic engine.

### 4. Identify Key Levels

The app should work from explicit levels, including:

- Midnight Open
- 9:30 open
- Opening range high/low
- Initial Balance high/low
- ETH high/low
- Asian high/low
- London high/low
- NY premarket high/low
- Prior swing highs/lows
- Current trigger candle high/low

Levels must be visible, manually supplied, or marked unknown.

The 15M ETH Context screenshot is context input only. It may contribute ETH, overnight, Asian, London, NY premarket, broader trend, compression/expansion, and major support/resistance context into the analyzer, but it must not approve a trade, produce executable entry/stop/T1/T2, override the 5M execution chart, override the plan engine, override the trade decision pipeline, override risk rules, or override setup scanner ranking.

The 5M chart remains the execution authority for entry trigger, active swing, stop placement, risk check, and final trade approval.

### 5. Determine Bias

Bias must come from the approved rule framework, not from free-form AI preference.

Possible bias outputs:

- `LONG`
- `SHORT`
- `NEUTRAL`
- `NO TRADE`

### 6. Check Approved Time Window

The app must evaluate whether the analysis is within the approved session context:

- Morning Analysis: 9:30 AM to 11:15 AM ET
- Required Morning screenshot focus: 9:30 AM through the 10:10 AM candle
- Lunch Reversal: 11:50 AM to 1:00 PM ET

Replay mode must use the entered trading date and replay session, not the upload timestamp.

### 7. Identify Setup Type

The app-owned rule engine must classify setup opportunities. AI may describe candidates, but final setup selection belongs to the deterministic engine.

The planned all-setup scan workflow requires the app to evaluate every approved setup type for the active session before returning a final decision. A single failed setup gate must not stop the scan.

Examples:

- Liquidity Sweep
- Momentum / Runaway
- Fair Value Gap / Imbalance
- Initial Balance Extension
- Opening Order Block
- Order Block 61.8
- Equal Highs / Equal Lows
- Previous Day Sweep
- Compression Breakout
- Gap Fill
- Breaker Block
- Mitigation Block
- No Trade

Setup detection must be separate from execution approval. A detected setup can still be blocked, conditional, or invalid for execution.

For the complete all-setup scan blueprint, see `docs/SETUP_SCAN_WORKFLOW.md`.

### 8. Validate Entry Trigger

A trade cannot be executable unless the app has a measurable entry trigger.

Valid examples:

- Break of a completed trigger candle high
- Break of a completed trigger candle low
- Retest of a defined zone
- Reclaim of a defined level

If the trigger is pending, the app may produce a conditional plan with `PENDING_TRIGGER`. If no measurable trigger exists, the result is no-trade.

### 9. Validate Stop Location

The stop must be tied to visible price structure:

- Protected swing low/high
- Trigger candle low/high
- Sweep wick extreme
- Order block or zone boundary
- Invalidating structure level

Arbitrary stops are not allowed.

### 10. Validate Risk Limit

The app must hard-block trades that exceed the configured risk limit. Risk must be calculated from:

```text
riskPoints = abs(entry - stop)
```

If risk is too large, the app must block execution. AI cannot override this.

`RiskTooWide` blocks execution only. It must not erase the detected setup candidate. A setup with wide risk should remain visible as a blocked opportunity and may produce a conditional reduced-risk plan if the chart provides a valid trigger.

For the detailed handling contract, see `docs/RISK_TOO_WIDE_HANDLING.md`.

### 11. Determine Target Model

Targets must be app-computed from entry and stop:

```text
T1 = 1.5R
T2 = 2.0R
```

AI-provided targets are advisory only and must not become executable targets unless they match the deterministic formula.

### 12. Define Invalidation

Every valid plan must include an invalidation condition:

- Stop hit
- Close beyond protected structure
- Failed reclaim
- Entry trigger expires
- Time window expires
- Risk guard fails

### 13. Decide Trade Or No-Trade

No-trade is a valid outcome.

The app must decide:

- Trade executable now
- Conditional/pending trade
- No-trade

The decision must be traceable to the rule engine.

No-trade is returned only when the full setup scan finds no executable or conditional opportunity. Blocked candidates remain visible but cannot be selected as executable trades.

### 14. Generate Final Trade Plan

The final trade plan must include:

- Direction
- Setup name
- Entry
- Stop
- T1
- T2
- Risk
- Trigger state
- Invalidation
- Reason
- Rejected alternatives when available

The final executable plan must not identify AI as the source of authority.

### 15. Save Journal-Ready Record

After analysis or replay outcome, the app must save a journal-ready record that can support RAG learning:

- Session type
- Instrument
- Trade date
- Screenshot URLs/storage paths
- Plan version ID
- Setup signature
- Entry, stop, T1, T2
- Risk
- Outcome when known
- RAG metadata
- Proof screenshot when supplied

## Non-Negotiable Rule

AI extracts and explains. The app decides and computes.

Confidence supports the decision. It does not approve the decision.
