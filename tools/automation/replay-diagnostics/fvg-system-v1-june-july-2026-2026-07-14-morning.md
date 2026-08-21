# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-14 / morning (2026-07-14T09:15:00 to 2026-07-14T12:00:00)
Context window: 275 days (2025-10-12T00:00:00 to 2026-07-15T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 50255 bars (2025-10-28T18:05:00 to 2026-07-15T23:55:00)
- 15m: 16773 bars (2025-10-28T18:15:00 to 2026-07-15T23:45:00)
- 60m: 4178 bars (2025-10-28T19:00:00 to 2026-07-15T23:00:00)
- 120m: 2196 bars (2025-10-28T20:00:00 to 2026-07-15T22:00:00)
- 240m: 1252 bars (2025-10-28T22:00:00 to 2026-07-15T22:00:00)

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
- Open below: 15m LONG 7561.50-7575.50 parent 2026-07-14T08:45:00 confirmed 2026-07-14T09:00:00 status open_untouched; 15m LONG 7556.00-7556.50 parent 2026-07-14T08:30:00 confirmed 2026-07-14T08:45:00 status open_untouched; 5m LONG 7551.00-7555.75 parent 2026-07-14T08:25:00 confirmed 2026-07-14T08:30:00 status open_untouched; 5m LONG 7542.75-7545.25 parent 2026-07-14T00:25:00 confirmed 2026-07-14T00:30:00 status partial_touch; 60m LONG 7523.50-7525.50 parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00 status partial_touch; 15m LONG 7522.25-7523.00 parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00 status open_untouched; 60m LONG 7495.50-7514.50 parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00 status partial_touch; 5m LONG 7498.50-7500.75 parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00 status partial_touch; 15m LONG 7498.50-7499.50 parent 2026-07-08T12:30:00 confirmed 2026-07-08T12:45:00 status open_untouched; 5m LONG 7492.50-7495.00 parent 2026-07-08T12:15:00 confirmed 2026-07-08T12:20:00 status open_untouched
- Failed above: 5m SHORT 7579.50-7579.75 parent 2026-07-06T23:20:00 confirmed 2026-07-06T23:25:00 status failed_inverted; 5m SHORT 7579.50-7580.50 parent 2026-07-10T00:50:00 confirmed 2026-07-10T00:55:00 status failed_inverted; 60m SHORT 7579.50-7581.50 parent 2026-07-10T01:00:00 confirmed 2026-07-10T02:00:00 status failed_inverted; 120m LONG 7579.50-7580.75 parent 2026-07-10T06:00:00 confirmed 2026-07-10T08:00:00 status failed_inverted; 5m SHORT 7579.75-7582.00 parent 2026-05-14T13:15:00 confirmed 2026-05-14T13:20:00 status failed_inverted; 15m LONG 7579.75-7584.75 parent 2026-05-14T13:45:00 confirmed 2026-05-14T14:00:00 status failed_inverted; 15m LONG 7579.75-7580.00 parent 2026-06-17T11:30:00 confirmed 2026-06-17T11:45:00 status failed_inverted; 15m SHORT 7579.75-7581.50 parent 2026-06-17T13:15:00 confirmed 2026-06-17T13:30:00 status failed_inverted; 5m LONG 7580.00-7580.75 parent 2026-06-14T22:25:00 confirmed 2026-06-14T22:30:00 status failed_inverted; 5m SHORT 7580.00-7581.25 parent 2026-07-07T06:35:00 confirmed 2026-07-07T06:40:00 status failed_inverted
- Open above: 15m SHORT 7598.00-7625.00 parent 2026-07-12T18:15:00 confirmed 2026-07-12T18:30:00 status partial_touch; 5m SHORT 7605.50-7625.00 parent 2026-07-12T18:05:00 confirmed 2026-07-12T18:10:00 status partial_touch; 5m SHORT 7612.00-7626.50 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:05:00 status partial_touch; 15m SHORT 7612.00-7624.25 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:15:00 status partial_touch; 60m SHORT 7612.00-7617.75 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:00:00 status partial_touch; 60m SHORT 7612.00-7618.25 parent 2026-07-12T18:00:00 confirmed 2026-07-12T19:00:00 status partial_touch; 120m SHORT 7612.00-7618.25 parent 2026-07-12T18:00:00 confirmed 2026-07-12T20:00:00 status partial_touch; 240m SHORT 7615.50-7617.75 parent 2026-07-12T16:00:00 confirmed 2026-07-12T20:00:00 status partial_touch; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch

## Review Order
- No trade-like FVG campaign qualified for review.

## Trace Rows
