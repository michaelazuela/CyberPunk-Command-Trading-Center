# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-14 / lunch (2026-07-14T12:00:00 to 2026-07-14T16:00:00)
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
- Open below: 15m LONG 7556.00-7556.50 parent 2026-07-14T08:30:00 confirmed 2026-07-14T08:45:00 status partial_touch; 5m LONG 7551.00-7555.75 parent 2026-07-14T08:25:00 confirmed 2026-07-14T08:30:00 status open_untouched; 5m LONG 7542.75-7545.25 parent 2026-07-14T00:25:00 confirmed 2026-07-14T00:30:00 status partial_touch; 60m LONG 7523.50-7525.50 parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00 status partial_touch; 15m LONG 7522.25-7523.00 parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00 status open_untouched; 60m LONG 7495.50-7514.50 parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00 status partial_touch; 5m LONG 7498.50-7500.75 parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00 status partial_touch; 15m LONG 7498.50-7499.50 parent 2026-07-08T12:30:00 confirmed 2026-07-08T12:45:00 status open_untouched; 5m LONG 7492.50-7495.00 parent 2026-07-08T12:15:00 confirmed 2026-07-08T12:20:00 status open_untouched; 15m LONG 7485.00-7495.00 parent 2026-07-08T12:15:00 confirmed 2026-07-08T12:30:00 status open_untouched
- Failed above: 5m LONG 7580.25-7580.50 parent 2026-05-28T01:30:00 confirmed 2026-05-28T01:35:00 status failed_inverted; 5m SHORT 7580.25-7580.50 parent 2026-07-06T23:15:00 confirmed 2026-07-06T23:20:00 status failed_inverted; 5m SHORT 7580.25-7580.75 parent 2026-07-07T04:55:00 confirmed 2026-07-07T05:00:00 status failed_inverted; 5m LONG 7580.25-7581.25 parent 2026-07-09T22:40:00 confirmed 2026-07-09T22:45:00 status failed_inverted; 5m SHORT 7580.25-7583.25 parent 2026-07-13T12:20:00 confirmed 2026-07-13T12:25:00 status failed_inverted; 15m LONG 7580.25-7581.00 parent 2026-07-09T22:45:00 confirmed 2026-07-09T23:00:00 status failed_inverted; 5m LONG 7580.50-7581.25 parent 2026-07-06T11:25:00 confirmed 2026-07-06T11:30:00 status failed_inverted; 5m LONG 7580.50-7585.00 parent 2026-07-06T14:05:00 confirmed 2026-07-06T14:10:00 status failed_inverted; 5m LONG 7580.50-7581.75 parent 2026-07-09T13:05:00 confirmed 2026-07-09T13:10:00 status failed_inverted; 5m SHORT 7580.75-7581.00 parent 2026-05-14T21:05:00 confirmed 2026-05-14T21:10:00 status failed_inverted
- Open above: 5m SHORT 7582.25-7585.50 parent 2026-07-14T11:55:00 confirmed 2026-07-14T12:00:00 status open_untouched; 5m SHORT 7591.25-7593.50 parent 2026-07-14T11:35:00 confirmed 2026-07-14T11:40:00 status open_untouched; 15m SHORT 7598.00-7625.00 parent 2026-07-12T18:15:00 confirmed 2026-07-12T18:30:00 status partial_touch; 5m SHORT 7605.50-7625.00 parent 2026-07-12T18:05:00 confirmed 2026-07-12T18:10:00 status partial_touch; 5m SHORT 7612.00-7626.50 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:05:00 status partial_touch; 15m SHORT 7612.00-7624.25 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:15:00 status partial_touch; 60m SHORT 7612.00-7617.75 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:00:00 status partial_touch; 60m SHORT 7612.00-7618.25 parent 2026-07-12T18:00:00 confirmed 2026-07-12T19:00:00 status partial_touch; 120m SHORT 7612.00-7618.25 parent 2026-07-12T18:00:00 confirmed 2026-07-12T20:00:00 status partial_touch; 240m SHORT 7615.50-7617.75 parent 2026-07-12T16:00:00 confirmed 2026-07-12T20:00:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof none from 15M parent 2026-07-14T12:45:00 confirmed 2026-07-14T13:00:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: none.

## Trace Rows

### 1. LONG 15M FVG 7579.50-7580.00 parent 2026-07-14T12:45:00 confirmed 2026-07-14T13:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: not found
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7579.50-7580.00 parent 2026-07-14T12:45:00 confirmed 2026-07-14T13:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7579.50-7580.00 parent 2026-07-14T12:45:00 confirmed 2026-07-14T13:00:00 untested_by_15m
- 5M defense of active 15M zone: not_returned; return none; wick none; proof none; 5M did not return into the selected 15M battle zone before the session ended.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.
