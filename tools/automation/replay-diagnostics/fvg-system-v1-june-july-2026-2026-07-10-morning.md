# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-10 / morning (2026-07-10T09:15:00 to 2026-07-10T12:00:00)
Context window: 275 days (2025-10-08T00:00:00 to 2026-07-11T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 49356 bars (2025-10-28T18:05:00 to 2026-07-10T17:00:00)
- 15m: 16474 bars (2025-10-28T18:15:00 to 2026-07-10T17:00:00)
- 60m: 4100 bars (2025-10-28T19:00:00 to 2026-07-10T17:00:00)
- 120m: 2154 bars (2025-10-28T20:00:00 to 2026-07-10T17:00:00)
- 240m: 1216 bars (2025-10-28T22:00:00 to 2026-07-10T16:00:00)

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
- Open below: 5m LONG 7580.75-7586.25 parent 2026-07-10T08:15:00 confirmed 2026-07-10T08:20:00 status partial_touch; 120m LONG 7579.50-7580.75 parent 2026-07-10T06:00:00 confirmed 2026-07-10T08:00:00 status open_untouched; 15m LONG 7577.00-7579.75 parent 2026-07-10T05:15:00 confirmed 2026-07-10T05:30:00 status partial_touch; 5m LONG 7576.50-7577.25 parent 2026-07-10T05:10:00 confirmed 2026-07-10T05:15:00 status partial_touch; 60m LONG 7564.50-7573.75 parent 2026-07-09T12:00:00 confirmed 2026-07-09T13:00:00 status partial_touch; 120m LONG 7566.50-7573.75 parent 2026-07-09T12:00:00 confirmed 2026-07-09T14:00:00 status partial_touch; 5m LONG 7564.25-7565.75 parent 2026-07-09T11:10:00 confirmed 2026-07-09T11:15:00 status partial_touch; 15m LONG 7563.75-7564.50 parent 2026-07-09T11:15:00 confirmed 2026-07-09T11:30:00 status open_untouched; 5m LONG 7554.75-7560.50 parent 2026-07-09T11:00:00 confirmed 2026-07-09T11:05:00 status open_untouched; 15m LONG 7559.00-7560.50 parent 2026-07-09T11:00:00 confirmed 2026-07-09T11:15:00 status open_untouched
- Failed above: 5m LONG 7591.25-7593.50 parent 2026-05-26T14:15:00 confirmed 2026-05-26T14:20:00 status failed_inverted; 5m SHORT 7591.25-7591.50 parent 2026-05-27T11:40:00 confirmed 2026-05-27T11:45:00 status failed_inverted; 5m SHORT 7591.25-7591.50 parent 2026-05-28T02:35:00 confirmed 2026-05-28T02:40:00 status failed_inverted; 5m SHORT 7591.25-7591.75 parent 2026-06-17T07:45:00 confirmed 2026-06-17T07:50:00 status failed_inverted; 15m SHORT 7591.25-7597.00 parent 2026-05-14T12:30:00 confirmed 2026-05-14T12:45:00 status failed_inverted; 15m SHORT 7591.25-7593.50 parent 2026-06-17T07:45:00 confirmed 2026-06-17T08:00:00 status failed_inverted; 5m SHORT 7591.50-7594.00 parent 2026-05-26T12:45:00 confirmed 2026-05-26T12:50:00 status failed_inverted; 5m SHORT 7591.50-7594.50 parent 2026-05-27T11:20:00 confirmed 2026-05-27T11:25:00 status failed_inverted; 5m SHORT 7591.50-7592.00 parent 2026-05-27T13:45:00 confirmed 2026-05-27T13:50:00 status failed_inverted; 5m LONG 7591.50-7593.75 parent 2026-05-27T13:55:00 confirmed 2026-05-27T14:00:00 status failed_inverted
- Open above: 5m SHORT 7596.75-7598.50 parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch; 15m SHORT 7654.50-7656.50 parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00 status partial_touch; 60m SHORT 7655.00-7661.75 parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00 status partial_touch

## Review Order
- No trade-like FVG campaign qualified for review.

## Trace Rows
