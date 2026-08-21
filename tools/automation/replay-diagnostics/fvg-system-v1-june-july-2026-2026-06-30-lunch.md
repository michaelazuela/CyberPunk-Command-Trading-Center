# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-30 / lunch (2026-06-30T12:00:00 to 2026-06-30T16:00:00)
Context window: 275 days (2025-09-28T00:00:00 to 2026-07-01T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 47543 bars (2025-10-28T18:05:00 to 2026-07-01T23:55:00)
- 15m: 15869 bars (2025-10-28T18:15:00 to 2026-07-01T23:45:00)
- 60m: 3942 bars (2025-10-28T19:00:00 to 2026-07-01T23:00:00)
- 120m: 2068 bars (2025-10-28T20:00:00 to 2026-07-01T22:00:00)
- 240m: 1142 bars (2025-10-28T22:00:00 to 2026-07-01T22:00:00)

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
- Open below: 5m LONG 7524.50-7525.25 parent 2026-06-30T11:05:00 confirmed 2026-06-30T11:10:00 status open_untouched; 5m LONG 7510.50-7518.25 parent 2026-06-30T09:55:00 confirmed 2026-06-30T10:00:00 status partial_touch; 15m LONG 7510.50-7515.50 parent 2026-06-30T10:00:00 confirmed 2026-06-30T10:15:00 status open_untouched; 60m LONG 7511.25-7515.50 parent 2026-06-30T10:00:00 confirmed 2026-06-30T11:00:00 status open_untouched; 15m LONG 7500.75-7503.50 parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00 status open_untouched; 120m LONG 7476.25-7491.25 parent 2026-06-29T14:00:00 confirmed 2026-06-29T16:00:00 status partial_touch; 5m LONG 7487.25-7487.50 parent 2026-06-29T21:20:00 confirmed 2026-06-29T21:25:00 status open_untouched; 15m LONG 7480.00-7485.00 parent 2026-06-29T13:15:00 confirmed 2026-06-29T13:30:00 status partial_touch; 5m LONG 7481.50-7483.25 parent 2026-06-29T13:10:00 confirmed 2026-06-29T13:15:00 status partial_touch; 5m LONG 7479.50-7480.25 parent 2026-06-29T13:05:00 confirmed 2026-06-29T13:10:00 status open_untouched
- Failed above: 5m SHORT 7546.00-7549.75 parent 2026-05-15T01:35:00 confirmed 2026-05-15T01:40:00 status failed_inverted; 5m SHORT 7546.00-7547.75 parent 2026-06-22T11:50:00 confirmed 2026-06-22T11:55:00 status failed_inverted; 5m SHORT 7546.25-7546.50 parent 2026-05-13T21:45:00 confirmed 2026-05-13T21:50:00 status failed_inverted; 5m SHORT 7546.25-7547.25 parent 2026-06-18T01:50:00 confirmed 2026-06-18T01:55:00 status failed_inverted; 5m LONG 7546.25-7546.75 parent 2026-06-18T02:30:00 confirmed 2026-06-18T02:35:00 status failed_inverted; 5m SHORT 7546.25-7548.25 parent 2026-06-21T22:15:00 confirmed 2026-06-21T22:20:00 status failed_inverted; 60m SHORT 7546.25-7553.50 parent 2026-06-19T07:00:00 confirmed 2026-06-19T08:00:00 status failed_inverted; 60m LONG 7546.25-7554.50 parent 2026-06-19T09:00:00 confirmed 2026-06-19T10:00:00 status failed_inverted; 5m SHORT 7546.50-7547.50 parent 2026-06-05T12:10:00 confirmed 2026-06-05T12:15:00 status failed_inverted; 5m LONG 7546.50-7547.75 parent 2026-06-22T11:40:00 confirmed 2026-06-22T11:45:00 status failed_inverted
- Open above: 15m SHORT 7549.50-7560.50 parent 2026-06-22T10:45:00 confirmed 2026-06-22T11:00:00 status partial_touch; 120m SHORT 7550.50-7563.75 parent 2026-06-22T12:00:00 confirmed 2026-06-22T14:00:00 status partial_touch; 5m SHORT 7556.25-7560.50 parent 2026-06-22T10:35:00 confirmed 2026-06-22T10:40:00 status partial_touch; 60m SHORT 7559.25-7568.00 parent 2026-06-22T11:00:00 confirmed 2026-06-22T12:00:00 status open_untouched; 5m SHORT 7562.50-7569.50 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:35:00 status open_untouched; 15m SHORT 7562.50-7589.00 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:45:00 status open_untouched; 5m SHORT 7574.75-7579.25 parent 2026-06-22T10:25:00 confirmed 2026-06-22T10:30:00 status open_untouched; 5m SHORT 7581.75-7589.00 parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof none from 15M parent 2026-06-30T12:00:00 confirmed 2026-06-30T12:15:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: 1 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7542.75-7545.25 parent 2026-06-30T12:00:00 confirmed 2026-06-30T12:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-30T16:00:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-06-30T16:00:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7542.75-7545.25 parent 2026-06-30T12:00:00 confirmed 2026-06-30T12:15:00 defended_on_15m defended 2026-06-30T16:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7542.75-7545.25 parent 2026-06-30T12:00:00 confirmed 2026-06-30T12:15:00 defended_on_15m defended 2026-06-30T16:00:00
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-06-30T16:00:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 2. LONG 15M FVG 7547.75-7549.50 parent 2026-06-30T12:15:00 confirmed 2026-06-30T12:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-30T12:35:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-30T12:40:00. | PASS entry_stop_risk_contract: Entry 7551.75, protected 5M stop 7537.75, risk 14.00 pts. | PASS tactical_targets_from_actual_risk: T1 7572.75 and T2 7579.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7552.00.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-06-30T12:35:00
- 5M wick defense: none
- Proof: 2026-06-30T12:40:00
- Entry/stop/risk: 7551.75 / 7537.75 / 14.00 pts
- T1/T2: 7572.75 / 7579.75
- Nearest liquidity: nearest prior high liquidity 7552.00
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7552.00-7555.50 parent 2026-05-14T07:25:00 confirmed 2026-05-14T07:30:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-30T12:45:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7542.75-7545.25 parent 2026-06-30T12:00:00 confirmed 2026-06-30T12:15:00 defended_on_15m defended 2026-06-30T16:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7542.75-7545.25 parent 2026-06-30T12:00:00 confirmed 2026-06-30T12:15:00 defended_on_15m defended 2026-06-30T16:00:00
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-06-30T12:35:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 15m LONG 7547.75-7549.50 parent 2026-06-30T12:15:00 confirmed 2026-06-30T12:30:00 status open_untouched; 5m LONG 7545.00-7545.25 parent 2026-06-30T12:00:00 confirmed 2026-06-30T12:05:00 status open_untouched; 15m LONG 7542.75-7545.25 parent 2026-06-30T12:00:00 confirmed 2026-06-30T12:15:00 status open_untouched; 5m LONG 7524.50-7525.25 parent 2026-06-30T11:05:00 confirmed 2026-06-30T11:10:00 status open_untouched; 5m LONG 7510.50-7518.25 parent 2026-06-30T09:55:00 confirmed 2026-06-30T10:00:00 status partial_touch; 15m LONG 7510.50-7515.50 parent 2026-06-30T10:00:00 confirmed 2026-06-30T10:15:00 status open_untouched; 60m LONG 7511.25-7515.50 parent 2026-06-30T10:00:00 confirmed 2026-06-30T11:00:00 status open_untouched; 15m LONG 7500.75-7503.50 parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7552.00-7555.50 parent 2026-05-14T07:25:00 confirmed 2026-05-14T07:30:00 status failed_inverted; 5m SHORT 7552.00-7553.75 parent 2026-05-22T02:00:00 confirmed 2026-05-22T02:05:00 status failed_inverted; 5m SHORT 7552.00-7562.25 parent 2026-06-17T15:00:00 confirmed 2026-06-17T15:05:00 status failed_inverted; 60m SHORT 7552.00-7568.50 parent 2026-06-17T15:00:00 confirmed 2026-06-17T16:00:00 status failed_inverted; 5m LONG 7552.25-7554.25 parent 2026-05-22T00:05:00 confirmed 2026-05-22T00:10:00 status failed_inverted; 15m LONG 7552.25-7554.25 parent 2026-05-22T00:15:00 confirmed 2026-05-22T00:30:00 status failed_inverted; 15m LONG 7552.50-7552.75 parent 2026-05-22T04:15:00 confirmed 2026-05-22T04:30:00 status failed_inverted; 5m SHORT 7552.75-7553.00 parent 2026-06-17T20:55:00 confirmed 2026-06-17T21:00:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7556.25-7560.50 parent 2026-06-22T10:35:00 confirmed 2026-06-22T10:40:00 status partial_touch; 60m SHORT 7559.25-7568.00 parent 2026-06-22T11:00:00 confirmed 2026-06-22T12:00:00 status open_untouched; 5m SHORT 7562.50-7569.50 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:35:00 status open_untouched; 15m SHORT 7562.50-7589.00 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:45:00 status open_untouched; 5m SHORT 7574.75-7579.25 parent 2026-06-22T10:25:00 confirmed 2026-06-22T10:30:00 status open_untouched; 5m SHORT 7581.75-7589.00 parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch
- Objective ladder: liquidity 7554.50 reached 2026-06-30T12:50:00 (prior 5M swing high liquidity from 2026-06-30T12:20:00); session_extreme 7554.50 reached 2026-06-30T12:50:00 (RTH high liquidity before proof); open_fvg 7560.50 reached 2026-06-30T14:50:00 (5m SHORT open FVG partial_touch parent 2026-06-22T10:35:00 confirmed 2026-06-22T10:40:00); open_fvg 7568.00 not reached (60m SHORT open FVG open_untouched parent 2026-06-22T11:00:00 confirmed 2026-06-22T12:00:00); open_fvg 7569.50 not reached (5m SHORT open FVG open_untouched parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:35:00); tactical 7572.75 not reached (T1 1.5R); open_fvg 7579.25 not reached (5m SHORT open FVG open_untouched parent 2026-06-22T10:25:00 confirmed 2026-06-22T10:30:00); tactical 7579.75 not reached (T2 2.0R); open_fvg 7589.00 not reached (15m SHORT open FVG open_untouched parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:45:00); open_fvg 7589.00 not reached (5m SHORT open FVG open_untouched parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00); open_fvg 7605.25 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00); open_fvg 7609.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00)
- Story: LONG proof completed at 2026-06-30T12:40:00 from 7547.75-7549.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7552.00-7555.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7554.50 liquidity, 7554.50 session_extreme, 7560.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-30T21:15:00, one MES $-70.00
- Managed outcome: Stop at 2026-06-30T21:15:00, exit 7537.75, one MES $-70.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.
