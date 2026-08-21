# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-03 / lunch (2026-07-03T12:00:00 to 2026-07-03T16:00:00)
Context window: 275 days (2025-10-01T00:00:00 to 2026-07-04T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 47976 bars (2025-10-28T18:05:00 to 2026-07-03T13:00:00)
- 15m: 16014 bars (2025-10-28T18:15:00 to 2026-07-03T13:00:00)
- 60m: 3980 bars (2025-10-28T19:00:00 to 2026-07-03T13:00:00)
- 120m: 2089 bars (2025-10-28T20:00:00 to 2026-07-03T13:00:00)
- 240m: 1160 bars (2025-10-28T22:00:00 to 2026-07-03T12:00:00)

## Research Tags
- none

## Research Rules
- FvgBattleZoneInventory (research_only_supporting_rule): Track only the first same-side 15M FVG reaction zone, the final/deepest same-side 15M FVG battle zone, and the latest active-session same-side 15M FVG from the active displacement leg. The selected 15M battle zone must then be defended on completed 5M candles before any entry model can use it.
  - Required facts: 15M-only inventory for this research rule. | Same-side active-session 15M displacement leg creates the candidate FVG stack. | First same-side 15M FVG is the first reaction zone. | Final/deepest same-side 15M FVG is the structure survival battle zone if the first zone fails. | Latest same-side 15M FVG in the active session can be a valid active-leg battle zone when it is defended by 5M proof. | 5M confirms only after price returns into the selected 15M battle zone and rejects it.
  - Invalidation: Every 15M FVG is tagged as equal importance. | Middle-zone clutter is promoted over first reaction or final/deepest battle-zone roles. | 5M confirmation is used before the 15M battle zone is selected. | The selected 15M battle zone accepts through against the intended direction.
  - Standalone trigger: no
- FvgBalancedPathContinuation (research_only_supporting_rule): If price breaks out of a balanced/rebalanced range and no defended opposing FVG appears before the next real-liquidity or open-FVG objective, the move can travel cleanly through that path. This supports continuation and runner management after a valid FVG proof already exists.
  - Required facts: 15M parent FVG setup is valid. | Completed 5M wick-defense/proof exists. | Nearest protected 5M structure stop is known. | Objective ladder has a real liquidity or open-FVG objective ahead. | No opposing FVG/HTF obstacle defends before that objective.
  - Invalidation: Used without 15M parent FVG plus completed 5M proof. | Opposing FVG/HTF obstacle defends before the objective. | The objective was already reached before entry. | Balanced path is treated as a standalone trigger.
  - Standalone trigger: no

## FVG Inventory At Session Start
- Open below: 60m LONG 7540.25-7548.25 parent 2026-07-02T22:00:00 confirmed 2026-07-02T23:00:00 status partial_touch; 120m LONG 7537.75-7547.75 parent 2026-07-02T22:00:00 confirmed 2026-07-03T00:00:00 status partial_touch; 5m LONG 7540.75-7545.00 parent 2026-07-02T21:10:00 confirmed 2026-07-02T21:15:00 status partial_touch; 15m LONG 7533.50-7544.75 parent 2026-07-02T21:15:00 confirmed 2026-07-02T21:30:00 status open_untouched; 5m LONG 7531.50-7539.75 parent 2026-07-02T21:05:00 confirmed 2026-07-02T21:10:00 status open_untouched; 15m LONG 7524.50-7528.50 parent 2026-07-02T18:15:00 confirmed 2026-07-02T18:30:00 status partial_touch; 5m LONG 7522.25-7523.50 parent 2026-07-02T17:00:00 confirmed 2026-07-02T18:05:00 status open_untouched; 5m LONG 7513.00-7521.00 parent 2026-07-02T15:55:00 confirmed 2026-07-02T16:00:00 status partial_touch; 15m LONG 7513.00-7517.75 parent 2026-07-02T16:00:00 confirmed 2026-07-02T16:15:00 status open_untouched; 60m LONG 7514.75-7517.75 parent 2026-07-02T16:00:00 confirmed 2026-07-02T17:00:00 status open_untouched
- Failed above: 5m SHORT 7559.00-7559.50 parent 2026-06-18T06:35:00 confirmed 2026-06-18T06:40:00 status failed_inverted; 5m SHORT 7559.00-7560.25 parent 2026-06-30T15:35:00 confirmed 2026-06-30T15:40:00 status failed_inverted; 5m SHORT 7559.25-7565.50 parent 2026-06-18T09:35:00 confirmed 2026-06-18T09:40:00 status failed_inverted; 60m SHORT 7559.25-7568.00 parent 2026-06-22T11:00:00 confirmed 2026-06-22T12:00:00 status failed_inverted; 5m LONG 7559.50-7561.25 parent 2026-06-18T04:05:00 confirmed 2026-06-18T04:10:00 status failed_inverted; 5m SHORT 7559.75-7565.00 parent 2026-05-22T10:05:00 confirmed 2026-05-22T10:10:00 status failed_inverted; 5m LONG 7559.75-7561.00 parent 2026-06-19T10:40:00 confirmed 2026-06-19T10:45:00 status failed_inverted; 5m LONG 7559.75-7566.50 parent 2026-06-22T07:05:00 confirmed 2026-06-22T07:10:00 status failed_inverted; 5m LONG 7560.00-7561.50 parent 2026-06-18T05:50:00 confirmed 2026-06-18T05:55:00 status failed_inverted; 5m LONG 7560.00-7566.25 parent 2026-06-18T15:40:00 confirmed 2026-06-18T15:45:00 status failed_inverted
- Open above: 5m SHORT 7574.50-7575.75 parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:35:00 status open_untouched; 15m SHORT 7574.50-7577.50 parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:45:00 status open_untouched; 5m SHORT 7579.00-7582.25 parent 2026-07-02T10:25:00 confirmed 2026-07-02T10:30:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch

## Review Order
- No trade-like FVG campaign qualified for review.

## Trace Rows
