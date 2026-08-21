# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-08 / morning (2026-07-08T09:15:00 to 2026-07-08T12:00:00)
Context window: 275 days (2025-10-06T00:00:00 to 2026-07-09T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 49151 bars (2025-10-28T18:05:00 to 2026-07-09T23:55:00)
- 15m: 16405 bars (2025-10-28T18:15:00 to 2026-07-09T23:45:00)
- 60m: 4082 bars (2025-10-28T19:00:00 to 2026-07-09T23:00:00)
- 120m: 2144 bars (2025-10-28T20:00:00 to 2026-07-09T22:00:00)
- 240m: 1207 bars (2025-10-28T22:00:00 to 2026-07-09T22:00:00)

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
- Open below: 5m LONG 7501.25-7507.75 parent 2026-07-08T08:10:00 confirmed 2026-07-08T08:15:00 status partial_touch; 15m LONG 7504.25-7504.50 parent 2026-07-08T08:15:00 confirmed 2026-07-08T08:30:00 status partial_touch; 5m LONG 7490.50-7495.25 parent 2026-07-08T07:45:00 confirmed 2026-07-08T07:50:00 status partial_touch; 15m LONG 7487.00-7493.50 parent 2026-07-08T07:45:00 confirmed 2026-07-08T08:00:00 status partial_touch; 60m LONG 7490.25-7492.50 parent 2026-07-08T08:00:00 confirmed 2026-07-08T09:00:00 status open_untouched; 5m LONG 7473.75-7475.25 parent 2026-07-08T06:20:00 confirmed 2026-07-08T06:25:00 status open_untouched; 5m LONG 7434.50-7448.00 parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00 status partial_touch; 5m LONG 7428.50-7430.00 parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch
- Failed above: 5m SHORT 7514.00-7514.75 parent 2026-05-11T14:15:00 confirmed 2026-05-11T14:20:00 status failed_inverted; 5m SHORT 7514.00-7520.00 parent 2026-06-08T09:35:00 confirmed 2026-06-08T09:40:00 status failed_inverted; 15m LONG 7514.25-7514.75 parent 2026-05-15T06:15:00 confirmed 2026-05-15T06:30:00 status failed_inverted; 5m SHORT 7514.50-7516.50 parent 2026-05-21T01:30:00 confirmed 2026-05-21T01:35:00 status failed_inverted; 15m SHORT 7514.50-7515.75 parent 2026-05-21T01:30:00 confirmed 2026-05-21T01:45:00 status failed_inverted; 5m LONG 7514.75-7516.25 parent 2026-05-15T06:15:00 confirmed 2026-05-15T06:20:00 status failed_inverted; 60m LONG 7514.75-7517.75 parent 2026-07-02T16:00:00 confirmed 2026-07-02T17:00:00 status failed_inverted; 120m SHORT 7514.75-7568.50 parent 2026-06-17T16:00:00 confirmed 2026-06-17T17:00:00 status failed_inverted; 5m LONG 7515.00-7516.25 parent 2026-05-15T04:45:00 confirmed 2026-05-15T04:50:00 status failed_inverted; 15m LONG 7515.00-7515.75 parent 2026-05-21T01:00:00 confirmed 2026-05-21T01:15:00 status failed_inverted
- Open above: 5m SHORT 7525.50-7541.25 parent 2026-07-08T04:20:00 confirmed 2026-07-08T04:25:00 status open_untouched; 15m SHORT 7548.25-7549.75 parent 2026-07-08T01:30:00 confirmed 2026-07-08T01:45:00 status open_untouched; 5m SHORT 7556.25-7557.50 parent 2026-07-07T23:45:00 confirmed 2026-07-07T23:50:00 status partial_touch; 5m SHORT 7568.75-7572.25 parent 2026-07-07T09:55:00 confirmed 2026-07-07T10:00:00 status partial_touch; 60m SHORT 7570.25-7578.25 parent 2026-07-07T10:00:00 confirmed 2026-07-07T11:00:00 status partial_touch; 120m SHORT 7570.25-7572.00 parent 2026-07-07T10:00:00 confirmed 2026-07-07T12:00:00 status partial_touch; 5m SHORT 7596.75-7598.50 parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched

## Review Order
- No trade-like FVG campaign qualified for review.

## Trace Rows
