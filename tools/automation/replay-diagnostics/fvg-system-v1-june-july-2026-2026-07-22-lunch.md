# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-22 / lunch (2026-07-22T12:00:00 to 2026-07-22T16:00:00)
Context window: 275 days (2025-10-20T00:00:00 to 2026-07-23T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 51911 bars (2025-10-28T18:05:00 to 2026-07-23T23:55:00)
- 15m: 17325 bars (2025-10-28T18:15:00 to 2026-07-23T23:45:00)
- 60m: 4322 bars (2025-10-28T19:00:00 to 2026-07-23T23:00:00)
- 120m: 2270 bars (2025-10-28T20:00:00 to 2026-07-23T22:00:00)
- 240m: 1302 bars (2025-10-28T22:00:00 to 2026-07-23T22:00:00)

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
- Open below: 5m LONG 7546.75-7548.25 parent 2026-07-22T11:10:00 confirmed 2026-07-22T11:15:00 status partial_touch; 15m LONG 7542.50-7547.50 parent 2026-07-22T11:15:00 confirmed 2026-07-22T11:30:00 status open_untouched; 5m LONG 7542.50-7544.00 parent 2026-07-22T11:05:00 confirmed 2026-07-22T11:10:00 status open_untouched; 5m LONG 7539.00-7541.25 parent 2026-07-22T11:00:00 confirmed 2026-07-22T11:05:00 status open_untouched; 15m LONG 7540.00-7541.25 parent 2026-07-22T11:00:00 confirmed 2026-07-22T11:15:00 status open_untouched; 60m LONG 7523.25-7528.75 parent 2026-07-22T10:00:00 confirmed 2026-07-22T11:00:00 status open_untouched; 15m LONG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00 status open_untouched; 5m LONG 7520.75-7522.50 parent 2026-07-22T09:20:00 confirmed 2026-07-22T09:25:00 status open_untouched; 240m LONG 7499.50-7513.75 parent 2026-07-21T02:00:00 confirmed 2026-07-21T06:00:00 status partial_touch; 60m LONG 7502.00-7512.50 parent 2026-07-21T00:00:00 confirmed 2026-07-21T01:00:00 status partial_touch
- Failed above: 5m LONG 7560.25-7562.25 parent 2026-05-22T11:00:00 confirmed 2026-05-22T11:05:00 status failed_inverted; 5m LONG 7560.25-7561.50 parent 2026-06-22T05:05:00 confirmed 2026-06-22T05:10:00 status failed_inverted; 5m LONG 7560.25-7561.50 parent 2026-07-01T13:15:00 confirmed 2026-07-01T13:20:00 status failed_inverted; 5m SHORT 7560.25-7561.00 parent 2026-07-06T04:35:00 confirmed 2026-07-06T04:40:00 status failed_inverted; 5m LONG 7560.50-7563.75 parent 2026-07-06T05:55:00 confirmed 2026-07-06T06:00:00 status failed_inverted; 5m LONG 7560.50-7561.00 parent 2026-07-06T08:55:00 confirmed 2026-07-06T09:00:00 status failed_inverted; 15m SHORT 7560.50-7573.00 parent 2026-06-17T14:15:00 confirmed 2026-06-17T14:30:00 status failed_inverted; 5m SHORT 7560.75-7561.50 parent 2026-07-06T07:05:00 confirmed 2026-07-06T07:10:00 status failed_inverted; 5m SHORT 7560.75-7562.25 parent 2026-07-13T15:25:00 confirmed 2026-07-13T15:30:00 status failed_inverted; 5m LONG 7561.00-7562.75 parent 2026-06-22T06:10:00 confirmed 2026-06-22T06:15:00 status failed_inverted
- Open above: 240m SHORT 7563.75-7579.50 parent 2026-07-16T16:00:00 confirmed 2026-07-16T20:00:00 status partial_touch; 15m SHORT 7568.25-7569.50 parent 2026-07-16T18:30:00 confirmed 2026-07-16T18:45:00 status open_untouched; 5m SHORT 7570.50-7571.50 parent 2026-07-16T18:15:00 confirmed 2026-07-16T18:20:00 status open_untouched; 120m SHORT 7577.75-7579.50 parent 2026-07-16T16:00:00 confirmed 2026-07-16T17:00:00 status open_untouched; 5m SHORT 7578.50-7581.00 parent 2026-07-16T14:30:00 confirmed 2026-07-16T14:35:00 status partial_touch; 5m SHORT 7585.25-7589.00 parent 2026-07-16T13:40:00 confirmed 2026-07-16T13:45:00 status partial_touch; 15m SHORT 7588.00-7589.25 parent 2026-07-16T13:45:00 confirmed 2026-07-16T14:00:00 status open_untouched; 5m SHORT 7599.50-7602.00 parent 2026-07-16T12:05:00 confirmed 2026-07-16T12:10:00 status open_untouched; 5m SHORT 7619.50-7621.25 parent 2026-07-16T02:25:00 confirmed 2026-07-16T02:30:00 status open_untouched; 15m SHORT 7621.00-7626.00 parent 2026-07-16T01:45:00 confirmed 2026-07-16T02:00:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof 2026-07-22T14:00:00 from 15M parent 2026-07-22T11:15:00 confirmed 2026-07-22T11:30:00.
- Defended-area management context: 5m LONG 7548.00-7549.75 is a callout before/near T1, not an issue by itself.
- Later rows: 2 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7542.50-7547.50 parent 2026-07-22T11:15:00 confirmed 2026-07-22T11:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-22T11:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-22T15:15:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-22T14:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-22T14:00:00, 2026-07-22T15:30:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-22T14:00:00. | PASS entry_stop_risk_contract: Entry 7547.75, protected 5M stop 7528.75, risk 19.00 pts. | PASS tactical_targets_from_actual_risk: T1 7576.25 and T2 7585.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7548.00.
- Parent displacement: yes
- Parent displacement candle: 2026-07-22T11:00:00
- Parent failure: 2026-07-22T15:15:00
- First 5M return: 2026-07-22T14:00:00
- 5M wick defense: 2026-07-22T14:00:00, 2026-07-22T15:30:00
- Proof: 2026-07-22T14:00:00
- Entry/stop/risk: 7547.75 / 7528.75 / 19.00 pts
- T1/T2: 7576.25 / 7585.75
- Nearest liquidity: nearest prior high liquidity 7548.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7548.00-7549.75 parent 2026-05-14T04:15:00 confirmed 2026-05-14T04:20:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-22T14:05:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7542.50-7547.50 parent 2026-07-22T11:15:00 confirmed 2026-07-22T11:30:00 defended_on_15m defended 2026-07-22T14:00:00 failed 2026-07-22T15:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7542.50-7547.50 parent 2026-07-22T11:15:00 confirmed 2026-07-22T11:30:00 defended_on_15m defended 2026-07-22T14:00:00 failed 2026-07-22T15:15:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-22T14:00:00; wick 2026-07-22T14:00:00; proof 2026-07-22T14:00:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7556.25 (prior 5M swing high liquidity from 2026-07-22T13:40:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 15m LONG 7542.50-7547.50 parent 2026-07-22T11:15:00 confirmed 2026-07-22T11:30:00 status partial_touch; 5m LONG 7542.50-7544.00 parent 2026-07-22T11:05:00 confirmed 2026-07-22T11:10:00 status open_untouched; 5m LONG 7539.00-7541.25 parent 2026-07-22T11:00:00 confirmed 2026-07-22T11:05:00 status open_untouched; 15m LONG 7540.00-7541.25 parent 2026-07-22T11:00:00 confirmed 2026-07-22T11:15:00 status open_untouched; 60m LONG 7523.25-7528.75 parent 2026-07-22T10:00:00 confirmed 2026-07-22T11:00:00 status open_untouched; 15m LONG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00 status open_untouched; 5m LONG 7520.75-7522.50 parent 2026-07-22T09:20:00 confirmed 2026-07-22T09:25:00 status open_untouched; 240m LONG 7499.50-7513.75 parent 2026-07-21T02:00:00 confirmed 2026-07-21T06:00:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7548.00-7549.75 parent 2026-05-14T04:15:00 confirmed 2026-05-14T04:20:00 status failed_inverted; 5m SHORT 7548.00-7549.00 parent 2026-06-18T00:20:00 confirmed 2026-06-18T00:25:00 status failed_inverted; 5m SHORT 7548.00-7551.25 parent 2026-06-19T06:25:00 confirmed 2026-06-19T06:30:00 status failed_inverted; 5m SHORT 7548.00-7549.00 parent 2026-06-30T18:35:00 confirmed 2026-06-30T18:40:00 status failed_inverted; 5m SHORT 7548.00-7551.00 parent 2026-07-03T04:50:00 confirmed 2026-07-03T04:55:00 status failed_inverted; 5m LONG 7548.00-7548.50 parent 2026-07-09T08:30:00 confirmed 2026-07-09T08:35:00 status failed_inverted; 5m SHORT 7548.00-7551.25 parent 2026-07-13T22:15:00 confirmed 2026-07-13T22:20:00 status failed_inverted; 5m SHORT 7548.00-7548.50 parent 2026-07-21T13:20:00 confirmed 2026-07-21T13:25:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7549.50-7552.50 parent 2026-07-22T13:55:00 confirmed 2026-07-22T14:00:00 status open_untouched; 5m SHORT 7557.00-7557.25 parent 2026-07-22T13:15:00 confirmed 2026-07-22T13:20:00 status open_untouched; 15m SHORT 7557.00-7557.50 parent 2026-07-22T13:15:00 confirmed 2026-07-22T13:30:00 status open_untouched; 240m SHORT 7563.75-7579.50 parent 2026-07-16T16:00:00 confirmed 2026-07-16T20:00:00 status partial_touch; 15m SHORT 7568.25-7569.50 parent 2026-07-16T18:30:00 confirmed 2026-07-16T18:45:00 status open_untouched; 5m SHORT 7570.50-7571.50 parent 2026-07-16T18:15:00 confirmed 2026-07-16T18:20:00 status open_untouched; 120m SHORT 7577.75-7579.50 parent 2026-07-16T16:00:00 confirmed 2026-07-16T17:00:00 status open_untouched; 5m SHORT 7578.50-7581.00 parent 2026-07-16T14:30:00 confirmed 2026-07-16T14:35:00 status partial_touch
- Objective ladder: open_fvg 7552.50 not reached (5m SHORT open FVG open_untouched parent 2026-07-22T13:55:00 confirmed 2026-07-22T14:00:00); liquidity 7556.25 not reached (prior 5M swing high liquidity from 2026-07-22T13:40:00); open_fvg 7557.25 not reached (5m SHORT open FVG open_untouched parent 2026-07-22T13:15:00 confirmed 2026-07-22T13:20:00); open_fvg 7557.50 not reached (15m SHORT open FVG open_untouched parent 2026-07-22T13:15:00 confirmed 2026-07-22T13:30:00); liquidity 7559.50 not reached (prior 5M swing high liquidity from 2026-07-22T11:30:00); liquidity 7562.50 not reached (prior 5M swing high liquidity from 2026-07-22T13:05:00); liquidity 7562.75 not reached (prior 5M swing high liquidity from 2026-07-22T12:35:00); liquidity 7563.00 not reached (prior 5M swing high liquidity from 2026-07-22T12:20:00); session_extreme 7563.00 not reached (RTH high liquidity before proof); open_fvg 7569.50 not reached (15m SHORT open FVG open_untouched parent 2026-07-16T18:30:00 confirmed 2026-07-16T18:45:00); open_fvg 7571.50 not reached (5m SHORT open FVG open_untouched parent 2026-07-16T18:15:00 confirmed 2026-07-16T18:20:00); tactical 7576.25 not reached (T1 1.5R); open_fvg 7579.50 not reached (240m SHORT open FVG partial_touch parent 2026-07-16T16:00:00 confirmed 2026-07-16T20:00:00); open_fvg 7579.50 not reached (120m SHORT open FVG open_untouched parent 2026-07-16T16:00:00 confirmed 2026-07-16T17:00:00)
- Story: LONG proof completed at 2026-07-22T14:00:00 from 7542.50-7547.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7548.00-7549.75 with reaction obstacle_defended_management_callout. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-22T18:05:00, one MES $-95.00
- Managed outcome: Stop at 2026-07-22T18:05:00, exit 7528.75, one MES $-95.00
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-22T14:00:00 before later same-zone failure/reversal read at 2026-07-22T15:15:00. Review the defended continuation before labeling this zone as failure/reversal.

### 2. SHORT 15M FVG 7557.00-7557.50 parent 2026-07-22T13:15:00 confirmed 2026-07-22T13:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7557.00-7557.50 parent 2026-07-22T13:15:00 confirmed 2026-07-22T13:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7557.00-7557.50 parent 2026-07-22T13:15:00 confirmed 2026-07-22T13:30:00 untested_by_15m
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

### 3. SHORT 15M FVG 7549.75-7550.75 parent 2026-07-22T14:00:00 confirmed 2026-07-22T14:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-22T14:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-22T14:00:00
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
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7557.00-7557.50 parent 2026-07-22T13:15:00 confirmed 2026-07-22T13:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7557.00-7557.50 parent 2026-07-22T13:15:00 confirmed 2026-07-22T13:30:00 untested_by_15m
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
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.
