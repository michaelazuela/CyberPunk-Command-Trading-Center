# Trade Decision Pipeline

This app is a trading decision-support system. It must use the same trade-decision sequence every time for Morning Analysis, Lunch Review, Replay Morning, and Replay Lunch.

AI may extract chart context, summarize visible structure, and propose advisory observations. The final trade decision must be produced by a deterministic, rule-based app pipeline.

Confidence is a context field only. It may help rank otherwise valid candidates, but it must never override a failed gate. Example: `High` confidence plus a failed risk check still returns `NoTrade`.

## Layered Decision Architecture

The intended architecture must stay separated:

1. **OHLC layer**
   Extract facts only:
   "There is a bullish candle, swing low, possible gap, reclaim, sweep, etc."

   Required setup-ready facts include `fvgZones[]`, `liquiditySweeps[]`, `reclaimEvents[]`, `failedBreakEvents[]`, `displacementCandles[]`, `pullbackIntoFvg`, `fvgReclaimed`, `breakOfStructure`, and `sweepThenReclaim` when they can be derived from screenshot or OHLC data.

   When NinjaTrader OHLC is available, those imported OHLC fields are the fact authority. AI visual extraction may fill missing facts, but it must not overwrite OHLC-derived candles, levels, session story, or structural context.

2. **Setup scanner**
   Applies active primary setup definitions:
   "Does this meet Sweep -> MSS -> FVG Retrace or no installed model path?"

   Liquidity sweeps, FVG/imbalance facts, market structure shifts, resting liquidity, prior-session sweeps, and breaker/FVG overlap are historical context. They do not create a third active executable model.

3. **Ranking engine**
   Scores candidates:
   "Which setup is better based on priority, confidence, risk, clarity, trigger, structure?"

   Session-level context is part of candidate scoring and target mapping. Asian, London, NY premarket, ETH, and RTH highs/lows should be scored internally for source quality and relationship context. Examples include London sweeping Asian low, NY premarket sweeping London high, or RTH testing the full ETH high/low. User-facing notes should explain the practical use of the level: reaction zone, reclaim/rejection area, obstacle before T1, or runner objective after T2. These facts can strengthen a long or short candidate, but they cannot approve execution by themselves.

4. **Trade decision pipeline**
   Approves, rejects, waits, or marks conditional:
   "Can this actually be traded now?"

The OHLC layer must not approve setups, rank trades, accept risk, or produce executable decisions. It should provide structured evidence that the scanner, ranking engine, and trade decision pipeline can evaluate consistently.

## Market Map / Target Context Rule

The app should evaluate session levels before final candidate ranking:

1. Extract or import Asian high/low, London high/low, NY premarket high/low, full ETH high/low, RTH high/low, and nearby round numbers when available.
2. Score each level for source quality, confidence, proximity, touches, historical reversal pattern context, round-number overlap, FVG overlap, and session relationships.
3. Evaluate context rules: Asian low below London low, London sweeps Asian high/low, NY premarket sweeps London high/low, RTH open relative to Midnight Open, RTH returning into ETH range, and RTH expanding away from ETH range.
4. Attach the most useful long-side and short-side levels to candidate scoring and target context.
5. Display the market map in the workflow with long-side reaction zones, short-side reaction zones, levels to watch, nearby target obstacles, and runner objectives.
6. Use the level context in Discord alerts so the card separates long-side objectives from short-side objectives and explains how to use them.

Session level context is not execution authority. A strong Asian/London/ETH level can support a candidate, but the 5M trigger, stop, risk, invalidation, and final pipeline gates still decide whether a plan is executable.

## Multi-Timeframe Context Rule

When OHLC is available, the app should prefer a clean 4H / 1H / 15M / 5M stack:

- 4H gives macro liquidity and broad swing context.
- 1H gives session structure and larger imbalance/displacement context.
- 15M gives the active session liquidity map and target-management objectives.
- 5M remains the execution chart.

The higher timeframes can explain where the market is likely to react and where a runner might aim, but they cannot create an executable trade without a 5M trigger, protected stop, valid risk, and clear invalidation.

The bridge must convert every available timeframe into machine-readable facts before the setup scanner or pipeline uses it. The app-owned engines should consume fields such as candles, FVG zones, liquidity sweeps, reclaims, failed breaks, displacement candles, structural levels, alignment, and target maps. Gemini narrative and human-readable notes may explain the read, but they must not be the glue that connects timeframes or approves setups.

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

The app must evaluate whether the analysis is within the approved setup-scan context:

- Morning Setup Scan: 9:15 AM to before 12:00 PM ET.
- Required Morning 5M setup-scan focus: 9:15 AM through 12:00 PM ET.
- Lunch/PM Setup Scan: 12:00 PM to before 4:00 PM ET.
- Required Lunch/PM 5M setup-scan focus: 12:00 PM through 4:00 PM ET.

Replay mode must use the entered trading date and replay session, not the upload timestamp.

### 7. Identify Setup Type

The app-owned rule engine must classify setup opportunities. AI may describe candidates, but final setup selection belongs to the deterministic engine.

The current scanner evaluates the active primary setup models for the session before returning a final decision. A single failed setup gate must not stop the scan of the remaining primary opportunities.

Examples:

- Sweep -> MSS -> FVG Retrace
- no installed model path
- No Trade

Setup detection must be separate from execution approval. A detected primary setup can still be blocked, conditional, or invalid for execution.

For the current scan contract and historical context, see `docs/SETUP_SCAN_WORKFLOW.md`.

#### Deterministic Conditional Plan Builder

After structured chart extraction and setup scanning, the app may build deterministic conditional planning paths from confirmed levels and facts. This layer exists so a `Wait` or `NoTrade` result does not hide useful if/then paths.

Historical examples that may still exist in reference notes or compatibility code:

- Morning Failed High / Liquidity Rejection: short only after a failed hold above a key high/resistance and a confirmed break below reclaim/support.
- Morning Reclaim Long: long only after price reclaims a key level and the pullback holds.
- Lunch Review subtypes: built only from completed Morning-window context plus Lunch execution evidence.

Conditional plan levels are projections, not approvals. Current returned plans are filtered to the active primary setup models. T1/T2 are still app-computed from candidate ENTRY/STOP at 1.5R and 2.0R, and execution remains disabled until the pipeline approves the plan.

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

The app must measure risk from the actual entry to the nearest protected completed 5M structure stop:

```text
riskPoints = abs(entry - stop)
```

If risk is missing or not tied to protected structure, the app must block execution. If the protected-structure risk is larger than the standard risk reference, the app marks the candidate as extended structural risk for review and sizing; it must not erase a complete protected-structure candidate with a fixed cap.

Extended structural risk is still decision support only. It does not place orders, override canExecute, or remove the requirement for completed 5M proof, valid entry, valid protected stop, app-computed targets, and structural invalidation.

### 11. Determine Target Model

Targets must be app-computed from entry and stop:

```text
T1 = 1.5R
T2 = 2.0R
```

Target-room viability uses T1 as the floor: a clean 1.5R path is the minimum tactical target requirement. T2 at 2.0R remains the second app target / extension-management objective and must not suppress an otherwise fresh, valid clean-1.5R candidate by itself.

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

No-trade is returned only when the primary model scan finds no executable or conditional opportunity. Blocked candidates remain visible but cannot be selected as executable trades.

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

Older Lunch-specific subtype names may remain in historical records or compatibility code, but they are not active standalone trade models in the current primary-model-only scanner. Lunch decisions still use the same pipeline gates: trigger, protected stop, risk, invalidation, target room, and time-window checks.
