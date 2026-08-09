# FVG Isolated Research Report

Family: FairValueGapResearchModel
Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Live systems touched: no

## Isolated Model Definitions

### FvgWickDefenseContinuation
Purpose: Trade continuation only after a 15M displacement-created FVG is defended on completed 5M candles.
Entry: Completed 5M wick-defense or confirmation close.
Stop: Nearest protected 5M structure for the active side.
Targets: T1 = 1.5R and T2 = 2.0R from actual entry-to-stop risk.

### FvgFailedAcceptanceReversal
Purpose: Classify reversal when price fails acceptance through a key FVG/level, then proves the opposite direction on completed 5M candles.
Entry: Completed 5M reversal proof close after failed acceptance.
Stop: Nearest protected 5M structure for the reversal side.
Targets: T1/T2 from actual risk, with nearest real liquidity as management context.

### FvgObjectiveLadderContinuation
Purpose: Track open, failed, and untouched FVGs plus real liquidity so a valid FVG entry has an objective ladder.
Entry: No standalone entry. This submodel supports management after a valid FVG entry exists.
Stop: No standalone stop. Stop remains nearest protected 5M structure from the entry model.
Targets: T1/T2 remain tactical. FVG inventory and liquidity explain runner/management context.

## Proof Set Summary

Days reviewed: 2026-01-06, 2026-01-07, 2026-01-13
Eligible FVG-only rows: 7
Wins: 7
Losses: 0
One MES net: +$307.50

## Day Inventory Read

| Date | Session | Instrument | Parent FVGs | Eligible | Open Above | Open Below | Failed Above | Failed Below |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 2026-01-06 | full-rth | MES 09-26 | 10 | 3 | 3 | 4 | 43 | 42 |
| 2026-01-07 | lunch | MES 09-26 | 7 | 2 | 0 | 13 | 0 | 153 |
| 2026-01-13 | full-rth | MES 09-26 | 5 | 2 | 0 | 9 | 0 | 96 |

## Eligible Trade Rows

| Date | Model | Side | Parent 15M FVG | Displacement | 5M Proof | Entry | Stop | Risk | T1 | T2 | Outcome | 1 MES P/L |
|---|---|---|---|---|---|---:|---:|---:|---:|---:|---|---:|
| 2026-01-06 | FvgWickDefenseContinuation | LONG | 7056.75-7058.00 | 2026-01-06T09:30:00 | 2026-01-06T09:45:00 | 7065.50 | 7058.00 | 7.50 | 7076.75 | 7080.50 | T1 @ 2026-01-06T09:55:00 | +$56.25 |
| 2026-01-06 | FvgWickDefenseContinuation | LONG | 7059.50-7065.25 | 2026-01-06T09:30:00 | 2026-01-06T11:10:00 | 7069.00 | 7063.00 | 6.00 | 7078.00 | 7081.00 | T1 @ 2026-01-06T12:10:00 | +$45.00 |
| 2026-01-06 | FvgWickDefenseContinuation | LONG | 7067.00-7080.75 | 2026-01-06T09:45:00 | 2026-01-06T12:25:00 | 7084.25 | 7063.00 | 21.25 | 7116.25 | 7126.75 | SessionClose @ 2026-01-06T16:00:00 | +$75.00 |
| 2026-01-07 | FvgWickDefenseContinuation | SHORT | 7109.75-7113.00 | 2026-01-07T13:00:00 | 2026-01-07T13:55:00 | 7109.50 | 7111.00 | 1.50 | 7107.25 | 7106.50 | T2 @ 2026-01-07T14:00:00 | +$15.00 |
| 2026-01-07 | FvgWickDefenseContinuation | SHORT | 7100.00-7105.50 | 2026-01-07T14:15:00 | 2026-01-07T14:45:00 | 7099.00 | 7101.25 | 2.25 | 7095.75 | 7094.50 | T1 @ 2026-01-07T15:05:00 | +$16.25 |
| 2026-01-13 | FvgWickDefenseContinuation | SHORT | 7127.75-7130.75 | 2026-01-13T09:30:00 | 2026-01-13T12:00:00 | 7125.25 | 7128.00 | 2.75 | 7121.25 | 7119.75 | T2 @ 2026-01-13T12:20:00 | +$27.50 |
| 2026-01-13 | FvgFailedAcceptanceReversal | SHORT | 7121.00-7124.75 | 2026-01-13T10:00:00 | 2026-01-13T12:20:00 | 7118.25 | 7128.00 | 9.75 | 7103.75 | 7098.75 | T1 @ 2026-01-13T13:00:00 | +$72.50 |

## Clean Read

- Jan 6 supports the wick-defense continuation idea, but one row has wide risk and needs visual review before it becomes trusted model evidence.
- Jan 7 lunch now catches the afternoon short because the parent displacement can be the 14:15 impulse candle inside the 14:30 FVG formation.
- Jan 13 now keeps the 12:00/12:20 short evidence and blocks the 13:20 wide-risk same-parent row as management/re-entry context.
- This report does not compare against old trading models. That is intentional: the FVG family is isolated first.

## Next Gate

Visually review the Jan 13 12:00/12:20 short evidence next, especially whether the protected 5M stop should stay near 7128 or use the wider visual structure near 7140. Do not expand January until that entry/stop read is locked.
