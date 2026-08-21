# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-21 / morning (2026-07-21T09:15:00 to 2026-07-21T12:00:00)
Context window: 275 days (2025-10-19T00:00:00 to 2026-07-22T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 51635 bars (2025-10-28T18:05:00 to 2026-07-22T23:55:00)
- 15m: 17233 bars (2025-10-28T18:15:00 to 2026-07-22T23:45:00)
- 60m: 4298 bars (2025-10-28T19:00:00 to 2026-07-22T23:00:00)
- 120m: 2258 bars (2025-10-28T20:00:00 to 2026-07-22T22:00:00)
- 240m: 1296 bars (2025-10-28T22:00:00 to 2026-07-22T22:00:00)

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
- Open below: 240m LONG 7499.50-7513.75 parent 2026-07-21T02:00:00 confirmed 2026-07-21T06:00:00 status open_untouched; 60m LONG 7502.00-7512.50 parent 2026-07-21T00:00:00 confirmed 2026-07-21T01:00:00 status partial_touch; 120m LONG 7499.50-7510.00 parent 2026-07-21T00:00:00 confirmed 2026-07-21T02:00:00 status open_untouched; 15m LONG 7504.50-7507.25 parent 2026-07-20T23:30:00 confirmed 2026-07-20T23:45:00 status partial_touch; 5m LONG 7504.50-7505.75 parent 2026-07-20T23:20:00 confirmed 2026-07-20T23:25:00 status partial_touch; 15m LONG 7502.00-7503.25 parent 2026-07-20T23:15:00 confirmed 2026-07-20T23:30:00 status open_untouched; 5m LONG 7502.00-7502.75 parent 2026-07-20T23:05:00 confirmed 2026-07-20T23:10:00 status open_untouched; 5m LONG 7499.75-7501.75 parent 2026-07-20T23:00:00 confirmed 2026-07-20T23:05:00 status open_untouched; 15m LONG 7501.50-7501.75 parent 2026-07-20T23:00:00 confirmed 2026-07-20T23:15:00 status open_untouched; 60m LONG 7499.50-7501.75 parent 2026-07-20T23:00:00 confirmed 2026-07-21T00:00:00 status open_untouched
- Failed above: 15m LONG 7514.25-7514.75 parent 2026-05-15T06:15:00 confirmed 2026-05-15T06:30:00 status failed_inverted; 5m SHORT 7514.50-7516.50 parent 2026-05-21T01:30:00 confirmed 2026-05-21T01:35:00 status failed_inverted; 5m LONG 7514.50-7515.75 parent 2026-07-20T04:00:00 confirmed 2026-07-20T04:05:00 status failed_inverted; 15m SHORT 7514.50-7515.75 parent 2026-05-21T01:30:00 confirmed 2026-05-21T01:45:00 status failed_inverted; 5m LONG 7514.75-7516.25 parent 2026-05-15T06:15:00 confirmed 2026-05-15T06:20:00 status failed_inverted; 60m LONG 7514.75-7517.75 parent 2026-07-02T16:00:00 confirmed 2026-07-02T17:00:00 status failed_inverted; 120m SHORT 7514.75-7568.50 parent 2026-06-17T16:00:00 confirmed 2026-06-17T17:00:00 status failed_inverted; 5m LONG 7515.00-7516.25 parent 2026-05-15T04:45:00 confirmed 2026-05-15T04:50:00 status failed_inverted; 15m LONG 7515.00-7515.75 parent 2026-05-21T01:00:00 confirmed 2026-05-21T01:15:00 status failed_inverted; 5m SHORT 7515.25-7516.75 parent 2026-05-15T15:05:00 confirmed 2026-05-15T15:10:00 status failed_inverted
- Open above: 5m SHORT 7529.00-7539.25 parent 2026-07-20T09:55:00 confirmed 2026-07-20T10:00:00 status partial_touch; 120m SHORT 7541.25-7556.75 parent 2026-07-16T22:00:00 confirmed 2026-07-17T00:00:00 status partial_touch; 5m SHORT 7542.50-7545.00 parent 2026-07-20T09:50:00 confirmed 2026-07-20T09:55:00 status open_untouched; 5m SHORT 7555.75-7558.50 parent 2026-07-16T20:10:00 confirmed 2026-07-16T20:15:00 status partial_touch; 60m SHORT 7556.25-7556.75 parent 2026-07-16T21:00:00 confirmed 2026-07-16T22:00:00 status open_untouched; 15m SHORT 7557.25-7558.50 parent 2026-07-16T20:15:00 confirmed 2026-07-16T20:30:00 status open_untouched; 240m SHORT 7563.75-7579.50 parent 2026-07-16T16:00:00 confirmed 2026-07-16T20:00:00 status partial_touch; 15m SHORT 7568.25-7569.50 parent 2026-07-16T18:30:00 confirmed 2026-07-16T18:45:00 status open_untouched; 5m SHORT 7570.50-7571.50 parent 2026-07-16T18:15:00 confirmed 2026-07-16T18:20:00 status open_untouched; 120m SHORT 7577.75-7579.50 parent 2026-07-16T16:00:00 confirmed 2026-07-16T17:00:00 status open_untouched

## Review Order
- No trade-like FVG campaign qualified for review.

## Trace Rows
