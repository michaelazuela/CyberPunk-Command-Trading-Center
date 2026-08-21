# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-29 / lunch (2026-06-29T12:00:00 to 2026-06-29T16:00:00)
Context window: 275 days (2025-09-27T00:00:00 to 2026-06-30T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 47267 bars (2025-10-28T18:05:00 to 2026-06-30T23:55:00)
- 15m: 15777 bars (2025-10-28T18:15:00 to 2026-06-30T23:45:00)
- 60m: 3918 bars (2025-10-28T19:00:00 to 2026-06-30T23:00:00)
- 120m: 2055 bars (2025-10-28T20:00:00 to 2026-06-30T22:00:00)
- 240m: 1131 bars (2025-10-28T22:00:00 to 2026-06-30T22:00:00)

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
- Open below: 5m LONG 7434.50-7448.00 parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00 status partial_touch; 5m LONG 7428.50-7430.00 parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch; 5m LONG 7247.75-7253.25 parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00 status partial_touch; 15m LONG 7244.75-7252.25 parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00 status partial_touch
- Failed above: 5m LONG 7475.25-7475.75 parent 2026-05-11T00:55:00 confirmed 2026-05-11T01:00:00 status failed_inverted; 5m SHORT 7475.25-7475.75 parent 2026-05-11T01:45:00 confirmed 2026-05-11T01:50:00 status failed_inverted; 5m LONG 7475.25-7476.75 parent 2026-06-25T02:15:00 confirmed 2026-06-25T02:20:00 status failed_inverted; 60m LONG 7475.25-7476.75 parent 2026-05-18T08:00:00 confirmed 2026-05-18T09:00:00 status failed_inverted; 5m LONG 7475.50-7476.00 parent 2026-05-11T02:10:00 confirmed 2026-05-11T02:15:00 status failed_inverted; 5m SHORT 7475.50-7476.00 parent 2026-06-08T16:20:00 confirmed 2026-06-08T16:25:00 status failed_inverted; 5m SHORT 7475.50-7478.25 parent 2026-06-25T07:25:00 confirmed 2026-06-25T07:30:00 status failed_inverted; 60m LONG 7475.50-7479.00 parent 2026-06-08T22:00:00 confirmed 2026-06-08T23:00:00 status failed_inverted; 5m LONG 7475.75-7476.00 parent 2026-05-10T23:30:00 confirmed 2026-05-10T23:35:00 status failed_inverted; 5m SHORT 7475.75-7480.00 parent 2026-05-19T04:25:00 confirmed 2026-05-19T04:30:00 status failed_inverted
- Open above: 5m SHORT 7496.50-7499.75 parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00 status partial_touch; 15m SHORT 7496.75-7499.75 parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00 status open_untouched; 5m SHORT 7501.75-7502.75 parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00 status open_untouched; 5m SHORT 7504.00-7507.25 parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00 status open_untouched; 15m SHORT 7513.75-7515.50 parent 2026-06-22T23:00:00 confirmed 2026-06-22T23:15:00 status open_untouched; 120m SHORT 7525.00-7525.50 parent 2026-06-22T22:00:00 confirmed 2026-06-23T00:00:00 status open_untouched; 15m SHORT 7525.50-7532.75 parent 2026-06-22T21:45:00 confirmed 2026-06-22T22:00:00 status open_untouched; 5m SHORT 7528.50-7529.50 parent 2026-06-22T21:40:00 confirmed 2026-06-22T21:45:00 status open_untouched; 5m SHORT 7530.25-7533.00 parent 2026-06-22T21:35:00 confirmed 2026-06-22T21:40:00 status open_untouched; 15m SHORT 7549.50-7560.50 parent 2026-06-22T10:45:00 confirmed 2026-06-22T11:00:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof none from 15M parent 2026-06-29T13:00:00 confirmed 2026-06-29T13:15:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: 1 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7476.25-7477.25 parent 2026-06-29T13:00:00 confirmed 2026-06-29T13:15:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7476.25-7477.25 parent 2026-06-29T13:00:00 confirmed 2026-06-29T13:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7476.25-7477.25 parent 2026-06-29T13:00:00 confirmed 2026-06-29T13:15:00 untested_by_15m
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

### 2. LONG 15M FVG 7480.00-7485.00 parent 2026-06-29T13:15:00 confirmed 2026-06-29T13:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-29T13:30:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-29T13:35:00. | PASS entry_stop_risk_contract: Entry 7493.00, protected 5M stop 7472.00, risk 21.00 pts. | PASS tactical_targets_from_actual_risk: T1 7524.50 and T2 7535.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7493.25.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-06-29T13:30:00
- 5M wick defense: none
- Proof: 2026-06-29T13:35:00
- Entry/stop/risk: 7493.00 / 7472.00 / 21.00 pts
- T1/T2: 7524.50 / 7535.00
- Nearest liquidity: nearest prior high liquidity 7493.25
- Defended-area / obstacle management callout before or near T1: 5m LONG 7493.25-7493.50 parent 2026-05-11T09:50:00 confirmed 2026-05-11T09:55:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-29T13:40:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7476.25-7477.25 parent 2026-06-29T13:00:00 confirmed 2026-06-29T13:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7476.25-7477.25 parent 2026-06-29T13:00:00 confirmed 2026-06-29T13:15:00 untested_by_15m
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-06-29T13:30:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7484.50-7489.25 parent 2026-06-29T13:15:00 confirmed 2026-06-29T13:20:00 status partial_touch; 15m LONG 7480.00-7485.00 parent 2026-06-29T13:15:00 confirmed 2026-06-29T13:30:00 status open_untouched; 5m LONG 7481.50-7483.25 parent 2026-06-29T13:10:00 confirmed 2026-06-29T13:15:00 status open_untouched; 5m LONG 7479.50-7480.25 parent 2026-06-29T13:05:00 confirmed 2026-06-29T13:10:00 status open_untouched; 15m LONG 7476.25-7477.25 parent 2026-06-29T13:00:00 confirmed 2026-06-29T13:15:00 status open_untouched; 5m LONG 7434.50-7448.00 parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00 status partial_touch; 5m LONG 7428.50-7430.00 parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7493.25-7493.50 parent 2026-05-11T09:50:00 confirmed 2026-05-11T09:55:00 status failed_inverted; 5m LONG 7493.25-7495.00 parent 2026-05-12T21:50:00 confirmed 2026-05-12T21:55:00 status failed_inverted; 5m LONG 7493.25-7494.00 parent 2026-05-18T18:20:00 confirmed 2026-05-18T18:25:00 status failed_inverted; 5m SHORT 7493.25-7495.00 parent 2026-05-18T19:55:00 confirmed 2026-05-18T20:00:00 status failed_inverted; 5m LONG 7493.25-7495.50 parent 2026-06-12T16:00:00 confirmed 2026-06-12T16:05:00 status failed_inverted; 15m LONG 7493.25-7494.00 parent 2026-05-11T10:00:00 confirmed 2026-05-11T10:15:00 status failed_inverted; 15m LONG 7493.25-7494.25 parent 2026-05-12T23:30:00 confirmed 2026-05-12T23:45:00 status failed_inverted; 5m SHORT 7493.50-7501.50 parent 2026-05-18T09:35:00 confirmed 2026-05-18T09:40:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7496.50-7499.75 parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00 status partial_touch; 15m SHORT 7496.75-7499.75 parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00 status open_untouched; 5m SHORT 7501.75-7502.75 parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00 status open_untouched; 5m SHORT 7504.00-7507.25 parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00 status open_untouched; 15m SHORT 7513.75-7515.50 parent 2026-06-22T23:00:00 confirmed 2026-06-22T23:15:00 status open_untouched; 120m SHORT 7525.00-7525.50 parent 2026-06-22T22:00:00 confirmed 2026-06-23T00:00:00 status open_untouched; 15m SHORT 7525.50-7532.75 parent 2026-06-22T21:45:00 confirmed 2026-06-22T22:00:00 status open_untouched; 5m SHORT 7528.50-7529.50 parent 2026-06-22T21:40:00 confirmed 2026-06-22T21:45:00 status open_untouched
- Objective ladder: session_extreme 7494.75 reached 2026-06-29T13:40:00 (RTH high liquidity before proof); open_fvg 7499.75 reached 2026-06-29T14:45:00 (5m SHORT open FVG partial_touch parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00); open_fvg 7499.75 reached 2026-06-29T14:45:00 (15m SHORT open FVG open_untouched parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00); open_fvg 7502.75 reached 2026-06-29T16:00:00 (5m SHORT open FVG open_untouched parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00); open_fvg 7507.25 not reached (5m SHORT open FVG open_untouched parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00); open_fvg 7515.50 not reached (15m SHORT open FVG open_untouched parent 2026-06-22T23:00:00 confirmed 2026-06-22T23:15:00); tactical 7524.50 not reached (T1 1.5R); open_fvg 7525.50 not reached (120m SHORT open FVG open_untouched parent 2026-06-22T22:00:00 confirmed 2026-06-23T00:00:00); open_fvg 7529.50 not reached (5m SHORT open FVG open_untouched parent 2026-06-22T21:40:00 confirmed 2026-06-22T21:45:00); open_fvg 7532.75 not reached (15m SHORT open FVG open_untouched parent 2026-06-22T21:45:00 confirmed 2026-06-22T22:00:00); tactical 7535.00 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-06-29T13:35:00 from 7480.00-7485.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7493.25-7493.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7494.75 session_extreme, 7499.75 open_fvg, 7499.75 open_fvg, 7502.75 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-30T10:00:00, one MES +$157.50
- Managed outcome: T1 at 2026-06-30T10:00:00, exit 7524.50, one MES +$157.50
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.
