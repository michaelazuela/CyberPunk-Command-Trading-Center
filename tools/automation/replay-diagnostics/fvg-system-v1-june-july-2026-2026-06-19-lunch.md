# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-19 / lunch (2026-06-19T12:00:00 to 2026-06-19T16:00:00)
Context window: 275 days (2025-09-17T00:00:00 to 2026-06-20T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 45264 bars (2025-10-28T18:05:00 to 2026-06-19T13:00:00)
- 15m: 15103 bars (2025-10-28T18:15:00 to 2026-06-19T13:00:00)
- 60m: 3744 bars (2025-10-28T19:00:00 to 2026-06-19T13:00:00)
- 120m: 1961 bars (2025-10-28T20:00:00 to 2026-06-19T13:00:00)
- 240m: 1050 bars (2025-10-28T22:00:00 to 2026-06-19T12:00:00)

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
- Open below: 5m LONG 7561.50-7562.50 parent 2026-06-19T11:50:00 confirmed 2026-06-19T11:55:00 status open_untouched; 5m LONG 7542.00-7554.50 parent 2026-06-19T08:55:00 confirmed 2026-06-19T09:00:00 status partial_touch; 15m LONG 7541.50-7554.50 parent 2026-06-19T09:00:00 confirmed 2026-06-19T09:15:00 status partial_touch; 60m LONG 7546.25-7554.50 parent 2026-06-19T09:00:00 confirmed 2026-06-19T10:00:00 status partial_touch; 60m LONG 7531.75-7541.00 parent 2026-06-19T03:00:00 confirmed 2026-06-19T04:00:00 status partial_touch; 15m LONG 7528.50-7530.75 parent 2026-06-19T02:00:00 confirmed 2026-06-19T02:15:00 status partial_touch; 5m LONG 7527.50-7529.25 parent 2026-06-19T01:55:00 confirmed 2026-06-19T02:00:00 status open_untouched; 5m LONG 7525.50-7525.75 parent 2026-06-19T01:50:00 confirmed 2026-06-19T01:55:00 status open_untouched; 5m LONG 7517.00-7518.25 parent 2026-06-17T18:15:00 confirmed 2026-06-17T18:20:00 status open_untouched; 15m LONG 7517.00-7518.25 parent 2026-06-17T18:15:00 confirmed 2026-06-17T18:30:00 status open_untouched
- Failed above: 5m LONG 7564.00-7566.25 parent 2026-05-14T10:20:00 confirmed 2026-05-14T10:25:00 status failed_inverted; 5m SHORT 7564.00-7566.50 parent 2026-06-17T14:55:00 confirmed 2026-06-17T15:00:00 status failed_inverted; 5m SHORT 7564.00-7565.25 parent 2026-06-18T18:35:00 confirmed 2026-06-18T18:40:00 status failed_inverted; 15m LONG 7564.00-7565.00 parent 2026-05-14T10:30:00 confirmed 2026-05-14T10:45:00 status failed_inverted; 15m SHORT 7564.00-7564.75 parent 2026-06-18T18:45:00 confirmed 2026-06-18T19:00:00 status failed_inverted; 5m SHORT 7564.25-7565.00 parent 2026-05-22T09:20:00 confirmed 2026-05-22T09:25:00 status failed_inverted; 5m SHORT 7564.25-7568.75 parent 2026-05-22T15:05:00 confirmed 2026-05-22T15:10:00 status failed_inverted; 5m SHORT 7564.25-7565.75 parent 2026-06-18T12:55:00 confirmed 2026-06-18T13:00:00 status failed_inverted; 5m LONG 7564.25-7569.00 parent 2026-06-18T13:05:00 confirmed 2026-06-18T13:10:00 status failed_inverted; 5m LONG 7564.50-7567.00 parent 2026-06-18T12:40:00 confirmed 2026-06-18T12:45:00 status failed_inverted
- Open above: 15m SHORT 7566.25-7572.00 parent 2026-06-18T18:30:00 confirmed 2026-06-18T18:45:00 status partial_touch; 5m SHORT 7569.25-7572.50 parent 2026-06-18T18:20:00 confirmed 2026-06-18T18:25:00 status open_untouched; 5m SHORT 7590.75-7597.25 parent 2026-06-17T10:35:00 confirmed 2026-06-17T10:40:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch

## Review Order
- No trade-like FVG campaign qualified for review.

## Trace Rows
