# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-24 / lunch (2026-06-24T12:00:00 to 2026-06-24T16:00:00)
Context window: 275 days (2025-09-22T00:00:00 to 2026-06-25T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 46439 bars (2025-10-28T18:05:00 to 2026-06-25T23:55:00)
- 15m: 15499 bars (2025-10-28T18:15:00 to 2026-06-25T23:45:00)
- 60m: 3846 bars (2025-10-28T19:00:00 to 2026-06-25T23:00:00)
- 120m: 2016 bars (2025-10-28T20:00:00 to 2026-06-25T22:00:00)
- 240m: 1097 bars (2025-10-28T22:00:00 to 2026-06-25T22:00:00)

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
- Open below: 5m LONG 7473.50-7479.75 parent 2026-06-24T10:50:00 confirmed 2026-06-24T10:55:00 status partial_touch; 15m LONG 7473.50-7476.25 parent 2026-06-24T11:00:00 confirmed 2026-06-24T11:15:00 status partial_touch; 60m LONG 7472.50-7474.50 parent 2026-06-24T11:00:00 confirmed 2026-06-24T12:00:00 status open_untouched; 5m LONG 7468.00-7471.75 parent 2026-06-24T10:45:00 confirmed 2026-06-24T10:50:00 status open_untouched; 15m LONG 7466.00-7471.75 parent 2026-06-24T10:45:00 confirmed 2026-06-24T11:00:00 status open_untouched; 5m LONG 7455.00-7455.25 parent 2026-06-24T10:25:00 confirmed 2026-06-24T10:30:00 status open_untouched; 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status open_untouched; 120m LONG 7399.25-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00 status open_untouched; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status open_untouched; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status open_untouched
- Failed above: 5m SHORT 7480.50-7482.50 parent 2026-05-08T14:50:00 confirmed 2026-05-08T14:55:00 status failed_inverted; 5m LONG 7480.50-7480.75 parent 2026-05-11T07:30:00 confirmed 2026-05-11T07:35:00 status failed_inverted; 5m SHORT 7480.50-7484.25 parent 2026-05-11T21:40:00 confirmed 2026-05-11T21:45:00 status failed_inverted; 5m LONG 7480.50-7482.25 parent 2026-05-11T21:50:00 confirmed 2026-05-11T21:55:00 status failed_inverted; 15m SHORT 7480.50-7492.00 parent 2026-05-13T09:45:00 confirmed 2026-05-13T10:00:00 status failed_inverted; 5m LONG 7480.75-7481.00 parent 2026-05-08T15:40:00 confirmed 2026-05-08T15:45:00 status failed_inverted; 5m SHORT 7480.75-7482.00 parent 2026-05-12T02:25:00 confirmed 2026-05-12T02:30:00 status failed_inverted; 15m SHORT 7480.75-7482.50 parent 2026-05-08T15:00:00 confirmed 2026-05-08T15:15:00 status failed_inverted; 60m SHORT 7480.75-7482.00 parent 2026-05-12T03:00:00 confirmed 2026-05-12T04:00:00 status failed_inverted; 5m LONG 7481.00-7481.25 parent 2026-05-12T08:55:00 confirmed 2026-05-12T09:00:00 status failed_inverted
- Open above: 5m SHORT 7496.50-7499.75 parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00 status partial_touch; 15m SHORT 7496.75-7499.75 parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00 status open_untouched; 5m SHORT 7501.75-7502.75 parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00 status open_untouched; 5m SHORT 7504.00-7507.25 parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00 status open_untouched; 15m SHORT 7513.75-7515.50 parent 2026-06-22T23:00:00 confirmed 2026-06-22T23:15:00 status open_untouched; 120m SHORT 7525.00-7525.50 parent 2026-06-22T22:00:00 confirmed 2026-06-23T00:00:00 status open_untouched; 15m SHORT 7525.50-7532.75 parent 2026-06-22T21:45:00 confirmed 2026-06-22T22:00:00 status open_untouched; 5m SHORT 7528.50-7529.50 parent 2026-06-22T21:40:00 confirmed 2026-06-22T21:45:00 status open_untouched; 5m SHORT 7530.25-7533.00 parent 2026-06-22T21:35:00 confirmed 2026-06-22T21:40:00 status open_untouched; 15m SHORT 7549.50-7560.50 parent 2026-06-22T10:45:00 confirmed 2026-06-22T11:00:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof 2026-06-24T14:00:00 from 15M parent 2026-06-24T13:30:00 confirmed 2026-06-24T13:45:00.
- Defended-area management context: 60m LONG 7386.00-7408.75 is a callout before/near T1, not an issue by itself.
- Later rows: 2 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7464.50-7476.50 parent 2026-06-24T12:45:00 confirmed 2026-06-24T13:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-24T12:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-24T12:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7464.50-7476.50 parent 2026-06-24T12:45:00 confirmed 2026-06-24T13:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7464.50-7476.50 parent 2026-06-24T12:45:00 confirmed 2026-06-24T13:00:00 untested_by_15m
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

### 2. SHORT 15M FVG 7447.75-7450.50 parent 2026-06-24T13:15:00 confirmed 2026-06-24T13:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-24T13:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-24T13:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7464.50-7476.50 parent 2026-06-24T12:45:00 confirmed 2026-06-24T13:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7464.50-7476.50 parent 2026-06-24T12:45:00 confirmed 2026-06-24T13:00:00 untested_by_15m
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

### 3. SHORT 15M FVG 7424.75-7442.00 parent 2026-06-24T13:30:00 confirmed 2026-06-24T13:45:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-24T13:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-24T14:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-24T14:00:00, 2026-06-24T14:30:00, 2026-06-24T14:35:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-24T14:00:00. | PASS entry_stop_risk_contract: Entry 7414.00, protected 5M stop 7461.00, risk 47.00 pts. | PASS tactical_targets_from_actual_risk: T1 7343.50 and T2 7320.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7413.75.
- Parent displacement: yes
- Parent displacement candle: 2026-06-24T13:30:00
- Parent failure: not found
- First 5M return: 2026-06-24T14:00:00
- 5M wick defense: 2026-06-24T14:00:00, 2026-06-24T14:30:00, 2026-06-24T14:35:00
- Proof: 2026-06-24T14:00:00
- Entry/stop/risk: 7414.00 / 7461.00 / 47.00 pts
- T1/T2: 7343.50 / 7320.00
- Nearest liquidity: nearest prior low liquidity 7413.75
- Defended-area / obstacle management callout before or near T1: 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status partial_touch
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-24T14:55:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7464.50-7476.50 parent 2026-06-24T12:45:00 confirmed 2026-06-24T13:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7464.50-7476.50 parent 2026-06-24T12:45:00 confirmed 2026-06-24T13:00:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-24T14:00:00; wick 2026-06-24T14:00:00; proof 2026-06-24T14:00:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status partial_touch; 120m LONG 7399.25-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status open_untouched; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status open_untouched; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch; 5m LONG 7247.75-7253.25 parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7414.75-7418.50 parent 2026-05-06T07:45:00 confirmed 2026-05-06T07:50:00 status failed_inverted; 15m SHORT 7415.50-7419.25 parent 2026-05-06T07:45:00 confirmed 2026-05-06T08:00:00 status failed_inverted; 5m LONG 7416.00-7417.25 parent 2026-05-07T19:25:00 confirmed 2026-05-07T19:30:00 status failed_inverted; 5m SHORT 7417.25-7419.25 parent 2026-05-07T18:35:00 confirmed 2026-05-07T18:40:00 status failed_inverted; 5m LONG 7418.00-7418.25 parent 2026-05-07T19:45:00 confirmed 2026-05-07T19:50:00 status failed_inverted; 5m SHORT 7419.00-7421.25 parent 2026-05-07T14:45:00 confirmed 2026-05-07T14:50:00 status failed_inverted; 5m SHORT 7419.25-7420.00 parent 2026-05-07T15:20:00 confirmed 2026-05-07T15:25:00 status failed_inverted; 5m LONG 7419.50-7423.00 parent 2026-05-07T14:00:00 confirmed 2026-05-07T14:05:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7424.75-7442.00 parent 2026-06-24T13:30:00 confirmed 2026-06-24T13:45:00 status partial_touch; 5m SHORT 7428.00-7431.00 parent 2026-06-24T13:25:00 confirmed 2026-06-24T13:30:00 status open_untouched; 5m SHORT 7434.00-7442.00 parent 2026-06-24T13:20:00 confirmed 2026-06-24T13:25:00 status open_untouched; 15m SHORT 7447.75-7450.50 parent 2026-06-24T13:15:00 confirmed 2026-06-24T13:30:00 status open_untouched; 5m SHORT 7450.00-7451.00 parent 2026-06-24T13:10:00 confirmed 2026-06-24T13:15:00 status open_untouched; 60m SHORT 7461.00-7474.50 parent 2026-06-24T13:00:00 confirmed 2026-06-24T14:00:00 status open_untouched; 5m SHORT 7462.25-7471.50 parent 2026-06-24T12:40:00 confirmed 2026-06-24T12:45:00 status partial_touch; 15m SHORT 7464.50-7476.50 parent 2026-06-24T12:45:00 confirmed 2026-06-24T13:00:00 status open_untouched
- Objective ladder: liquidity 7407.75 reached 2026-06-24T15:10:00 (prior 5M swing low liquidity from 2026-06-24T13:35:00); session_extreme 7407.75 reached 2026-06-24T15:10:00 (RTH low liquidity before proof); open_fvg 7399.25 not reached (120m LONG open FVG partial_touch parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00); open_fvg 7386.00 not reached (60m LONG open FVG partial_touch parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00); open_fvg 7355.50 not reached (15m LONG open FVG open_untouched parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00); open_fvg 7345.25 not reached (5m LONG open FVG open_untouched parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00); tactical 7343.50 not reached (T1 1.5R); open_fvg 7321.00 not reached (5m LONG open FVG partial_touch parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00); tactical 7320.00 not reached (T2 2.0R); open_fvg 7318.25 not reached (5m LONG open FVG open_untouched parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00); open_fvg 7261.00 not reached (5m LONG open FVG partial_touch parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00); open_fvg 7247.75 not reached (5m LONG open FVG partial_touch parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00)
- Story: SHORT proof completed at 2026-06-24T14:00:00 from 7424.75-7442.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 60m 7386.00-7408.75 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7407.75 liquidity, 7407.75 session_extreme. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-24T16:10:00, one MES $-235.00
- Managed outcome: Stop at 2026-06-24T16:10:00, exit 7461.00, one MES $-235.00
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-24T14:00:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.
