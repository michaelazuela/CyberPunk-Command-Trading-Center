# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-11 / morning (2026-06-11T09:15:00 to 2026-06-11T12:00:00)
Context window: 275 days (2025-09-09T00:00:00 to 2026-06-12T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 43932 bars (2025-10-28T18:05:00 to 2026-06-12T17:00:00)
- 15m: 14654 bars (2025-10-28T18:15:00 to 2026-06-12T17:00:00)
- 60m: 3628 bars (2025-10-28T19:00:00 to 2026-06-12T17:00:00)
- 120m: 1898 bars (2025-10-28T20:00:00 to 2026-06-12T17:00:00)
- 240m: 996 bars (2025-10-28T22:00:00 to 2026-06-12T16:00:00)

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
- Open below: 5m LONG 7351.50-7354.75 parent 2026-06-10T23:35:00 confirmed 2026-06-10T23:40:00 status partial_touch; 15m LONG 7336.25-7340.50 parent 2026-06-10T21:00:00 confirmed 2026-06-10T21:15:00 status partial_touch; 60m LONG 7326.75-7340.50 parent 2026-06-10T21:00:00 confirmed 2026-06-10T22:00:00 status partial_touch; 120m LONG 7330.25-7336.75 parent 2026-06-10T22:00:00 confirmed 2026-06-11T00:00:00 status open_untouched; 5m LONG 7334.00-7335.50 parent 2026-06-10T20:50:00 confirmed 2026-06-10T20:55:00 status open_untouched; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch; 5m LONG 7247.75-7253.25 parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00 status partial_touch; 15m LONG 7244.75-7252.25 parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00 status partial_touch
- Failed above: 5m LONG 7372.00-7372.25 parent 2026-05-05T23:35:00 confirmed 2026-05-05T23:40:00 status failed_inverted; 5m SHORT 7372.00-7372.25 parent 2026-05-05T23:50:00 confirmed 2026-05-05T23:55:00 status failed_inverted; 5m SHORT 7372.00-7372.50 parent 2026-05-06T01:20:00 confirmed 2026-05-06T01:25:00 status failed_inverted; 15m SHORT 7372.00-7376.75 parent 2026-05-05T20:15:00 confirmed 2026-05-05T20:30:00 status failed_inverted; 15m SHORT 7372.00-7373.75 parent 2026-06-11T01:15:00 confirmed 2026-06-11T01:30:00 status failed_inverted; 5m SHORT 7372.50-7374.25 parent 2026-06-11T01:05:00 confirmed 2026-06-11T01:10:00 status failed_inverted; 15m LONG 7372.50-7373.50 parent 2026-05-06T04:45:00 confirmed 2026-05-06T05:00:00 status failed_inverted; 15m LONG 7372.50-7373.75 parent 2026-06-11T00:45:00 confirmed 2026-06-11T01:00:00 status failed_inverted; 5m LONG 7372.75-7373.00 parent 2026-05-06T01:50:00 confirmed 2026-05-06T01:55:00 status failed_inverted; 5m SHORT 7373.00-7374.50 parent 2026-06-10T13:35:00 confirmed 2026-06-10T13:40:00 status failed_inverted
- Open above: 15m SHORT 7378.25-7392.25 parent 2026-06-11T08:30:00 confirmed 2026-06-11T08:45:00 status partial_touch; 5m SHORT 7379.00-7389.25 parent 2026-06-11T08:25:00 confirmed 2026-06-11T08:30:00 status partial_touch; 5m SHORT 7390.75-7393.25 parent 2026-06-11T08:20:00 confirmed 2026-06-11T08:25:00 status open_untouched; 120m SHORT 7424.50-7505.00 parent 2026-06-09T12:00:00 confirmed 2026-06-09T14:00:00 status partial_touch; 15m SHORT 7428.50-7439.75 parent 2026-06-10T11:00:00 confirmed 2026-06-10T11:15:00 status open_untouched; 60m SHORT 7469.00-7512.50 parent 2026-06-09T11:00:00 confirmed 2026-06-09T12:00:00 status open_untouched; 5m SHORT 7474.00-7489.50 parent 2026-06-09T10:45:00 confirmed 2026-06-09T10:50:00 status open_untouched; 15m SHORT 7474.00-7479.00 parent 2026-06-09T10:45:00 confirmed 2026-06-09T11:00:00 status open_untouched; 5m SHORT 7504.75-7523.75 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00 status partial_touch; 15m SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 status open_untouched

## Review Order
- No trade-like FVG campaign qualified for review.

## Trace Rows
