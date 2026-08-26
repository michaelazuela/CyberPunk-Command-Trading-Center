# FVG v1 2026-08-26 Morning Long Support Research

Date: 2026-08-26
Instrument: MES
Window reviewed: 09:30-10:05 ET
Source: `tools/automation/discord-audit/scanner-decision-tape-2026-08-26-MES-morning.json`

## Scope

Research-only review of whether the scanner missed a long-side FVG / battle-zone opportunity after the 09:30 ET RTH open. This note does not change runtime rules, approve a trade, or create execution authority.

## Finding

The scanner was live and recording the morning tape. The missed item was not a Discord delivery failure. It was a model coverage gap: active FVG Trading System v1 did not create a long-side candidate for the 09:30-10:05 ET support/continuation sequence.

The scanner did identify a LONG early move, but classified it as already triggered with no fresh entry:

- 09:35 ET tape: early move direction `LONG`, move start near `7676.5`, move extreme near `7698.25`, move points `21.75`, `freshEntryAvailable=false`.
- 09:50-10:05 ET tape: early move remained `LONG`, move extreme reached `7701.25-7702`, and the scanner continued to treat the move as extended.
- Discord remained suppressed with `No actionable scanner alert.`

## OHLC Evidence

Completed 5M bars in the reviewed window:

- 09:30 ET: O `7680.5`, H `7682.25`, L `7678.25`, C `7678.75`
- 09:35 ET: O `7678.75`, H `7690.75`, L `7678.75`, C `7689`
- 09:40 ET: O `7689`, H `7690.5`, L `7680.25`, C `7688`
- 09:45 ET: O `7688`, H `7698.25`, L `7686.5`, C `7695.25`
- 09:50 ET: O `7695.5`, H `7699.25`, L `7691.25`, C `7691.25`
- 09:55 ET: O `7691.5`, H `7698.75`, L `7688.5`, C `7698.75`
- 10:00 ET: O `7698.5`, H `7701.5`, L `7696.75`, C `7701.5`
- 10:05 ET: O `7701.25`, H `7702`, L `7698.25`, C `7700.75`

Approximate result: from the 09:35 close near `7689` to the 10:05 high near `7702`, the move delivered about 13 points. From the lower support area near `7678.75-7680.25`, it delivered more.

## Scanner Behavior

Across 09:30-10:05 ET, the candidate lifecycle kept only:

- `FvgTradingSystemV1|SHORT|scenario|NotDetected`
- `bestLongPlan=null`
- `NoTrade`
- `canExecute=false`

Repeated blockers included:

- `15M FVG failure acceptance by completed 5M close`
- `5M FVG / imbalance trigger zone`
- `Directional 5M FVG / imbalance zone is not available`
- `Completed 5M MSS confirms execution direction`
- `Protected 5M structure stop`
- `Actual entry-to-stop risk within 5 points`
- `App T1/T2 from actual entry-to-stop risk`
- `No-chase gate`

At 09:30 ET, the scanner mapped `7687.75` as `London Bullish Displacement Imbalance Top (london imbalance_zone)`, but used it as a short-below line in the only created FVG v1 candidate rather than creating a long-side support/battle-zone watch.

## Current Code Boundary

Relevant implementation points:

- `src/lib/setupScanner.ts`: `validateFvgTradingSystemV1()` selects direction from `intradayMssOrDisplacementDirection()`.
- `validateFvgTradingSystemV1()` then requires same-direction 15M FVG, 5M directional FVG, 5M retest/rejection, 15M FVG failure acceptance, completed 5M MSS, protected stop, actual risk, T1/T2, and no-chase.
- `src/config/tradeRules.ts`: active runtime setup set is only `FvgTradingSystemV1`.
- `src/config/setupRegistry.ts`: registry language says defended-first continuation should be checked before same-zone failure/reversal, but the active validator currently behaves like a failure/rejection path in this replay.

This means the current live path can miss a defended bullish support / continuation sequence if it is not represented as the exact parent-failure plus 5M FVG retest/rejection proof expected by the validator.

## Risk Boundary

This should not be converted into a loose 15M-goes-up long rule.

Any future fix must preserve:

- 15M is context only.
- 5M remains execution authority.
- Stop must be tied to protected 5M structure first.
- Actual entry-to-stop risk must be validated against the 5 point max.
- T1 = 1.5R and T2 = 2.0R from actual entry/stop risk.
- No chase after first expansion.
- Discord/UI must present this as decision support, not prediction.

## Implemented Replay / Test

Implemented a scoped regression replay in `src/lib/setupScanner.fvgV1Regression.test.ts` for `2026-08-26 MES morning 09:30-10:05 ET`.

Verified behavior:

- Scanner creates a long-side FVG Trading System v1 candidate only when a 15M bullish displacement/support battle zone is present.
- 5M must confirm a support retest, wick defense, or continuation close from that zone.
- Protected 5M swing-low stop must be available.
- Actual risk must be within 5 points.
- App T1/T2 must have room.
- Candidate must be blocked as stale/no-chase after the first 10+ point expansion if no fresh retest remains.

Runtime change: `src/lib/setupScanner.ts` now checks the defended-first LONG continuation branch inside `FvgTradingSystemV1` before falling back to the failure/reversal branch. The branch remains deterministic and still requires 5M MSS, protected structure stop, actual risk, app targets, HTF context sufficiency, and no-chase.
