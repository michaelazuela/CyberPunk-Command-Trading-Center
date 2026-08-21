# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-12 / morning (2026-06-12T09:15:00 to 2026-06-12T12:00:00)
Context window: 275 days (2025-09-10T00:00:00 to 2026-06-13T23:59:59)
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
- Open below: 5m LONG 7469.00-7470.75 parent 2026-06-12T09:10:00 confirmed 2026-06-12T09:15:00 status open_untouched; 5m LONG 7456.75-7461.75 parent 2026-06-12T04:00:00 confirmed 2026-06-12T04:05:00 status partial_touch; 15m LONG 7455.50-7461.75 parent 2026-06-12T04:00:00 confirmed 2026-06-12T04:15:00 status partial_touch; 5m LONG 7450.50-7452.00 parent 2026-06-12T03:45:00 confirmed 2026-06-12T03:50:00 status open_untouched; 15m LONG 7445.00-7452.00 parent 2026-06-12T03:45:00 confirmed 2026-06-12T04:00:00 status open_untouched; 5m LONG 7444.75-7448.50 parent 2026-06-12T03:40:00 confirmed 2026-06-12T03:45:00 status open_untouched; 5m LONG 7444.00-7445.00 parent 2026-06-12T03:35:00 confirmed 2026-06-12T03:40:00 status open_untouched; 5m LONG 7434.00-7440.50 parent 2026-06-11T14:50:00 confirmed 2026-06-11T14:55:00 status partial_touch; 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status open_untouched; 120m LONG 7399.25-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00 status open_untouched
- Failed above: 5m LONG 7477.50-7478.50 parent 2026-06-11T20:30:00 confirmed 2026-06-11T20:35:00 status failed_inverted; 15m LONG 7477.50-7492.50 parent 2026-05-11T09:45:00 confirmed 2026-05-11T10:00:00 status failed_inverted; 5m SHORT 7477.75-7478.75 parent 2026-05-08T14:55:00 confirmed 2026-05-08T15:00:00 status failed_inverted; 5m LONG 7477.75-7481.50 parent 2026-05-12T20:20:00 confirmed 2026-05-12T20:25:00 status failed_inverted; 15m SHORT 7477.75-7479.75 parent 2026-05-18T22:15:00 confirmed 2026-05-18T22:30:00 status failed_inverted; 5m SHORT 7478.00-7478.75 parent 2026-05-11T07:50:00 confirmed 2026-05-11T07:55:00 status failed_inverted; 5m SHORT 7478.00-7478.50 parent 2026-06-11T20:45:00 confirmed 2026-06-11T20:50:00 status failed_inverted; 5m SHORT 7478.25-7478.75 parent 2026-06-08T00:05:00 confirmed 2026-06-08T00:10:00 status failed_inverted; 5m LONG 7478.50-7483.00 parent 2026-06-08T03:25:00 confirmed 2026-06-08T03:30:00 status failed_inverted; 5m SHORT 7479.25-7481.50 parent 2026-05-11T07:45:00 confirmed 2026-05-11T07:50:00 status failed_inverted
- Open above: 15m SHORT 7480.25-7487.75 parent 2026-06-12T08:45:00 confirmed 2026-06-12T09:00:00 status open_untouched; 5m SHORT 7483.75-7484.25 parent 2026-06-12T08:40:00 confirmed 2026-06-12T08:45:00 status open_untouched; 15m SHORT 7490.25-7494.75 parent 2026-06-12T08:30:00 confirmed 2026-06-12T08:45:00 status open_untouched; 5m SHORT 7490.50-7492.50 parent 2026-06-12T08:25:00 confirmed 2026-06-12T08:30:00 status open_untouched; 15m SHORT 7499.00-7502.00 parent 2026-06-12T08:15:00 confirmed 2026-06-12T08:30:00 status open_untouched; 5m SHORT 7501.50-7505.25 parent 2026-06-12T08:05:00 confirmed 2026-06-12T08:10:00 status open_untouched; 5m SHORT 7504.75-7523.75 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00 status partial_touch; 15m SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 status partial_touch; 5m SHORT 7536.00-7536.50 parent 2026-06-09T10:00:00 confirmed 2026-06-09T10:05:00 status open_untouched; 60m SHORT 7554.00-7569.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T13:00:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof 2026-06-12T10:00:00 from 15M parent 2026-06-12T09:45:00 confirmed 2026-06-12T10:00:00.
- Defended-area management context: 60m LONG 7386.00-7408.75 is a callout before/near T1, not an issue by itself.
- Later rows: 3 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7453.25-7475.25 parent 2026-06-12T09:45:00 confirmed 2026-06-12T10:00:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-12T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-12T10:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-12T10:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-12T10:00:00, 2026-06-12T10:30:00, 2026-06-12T10:35:00, 2026-06-12T10:50:00, 2026-06-12T11:50:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-12T10:00:00. | PASS entry_stop_risk_contract: Entry 7445.00, protected 5M stop 7487.25, risk 42.25 pts. | PASS tactical_targets_from_actual_risk: T1 7381.75 and T2 7360.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7444.75.
- Parent displacement: yes
- Parent displacement candle: 2026-06-12T09:45:00
- Parent failure: 2026-06-12T10:30:00
- First 5M return: 2026-06-12T10:00:00
- 5M wick defense: 2026-06-12T10:00:00, 2026-06-12T10:30:00, 2026-06-12T10:35:00, 2026-06-12T10:50:00, 2026-06-12T11:50:00
- Proof: 2026-06-12T10:00:00
- Entry/stop/risk: 7445.00 / 7487.25 / 42.25 pts
- T1/T2: 7381.75 / 7360.50
- Nearest liquidity: nearest prior low liquidity 7444.75
- Defended-area / obstacle management callout before or near T1: 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status open_untouched
- Defended-area reaction: obstacle_before_t1_not_reached
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7453.25-7475.25 parent 2026-06-12T09:45:00 confirmed 2026-06-12T10:00:00 failed_acceptance_through_15m failed 2026-06-12T10:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7453.25-7475.25 parent 2026-06-12T09:45:00 confirmed 2026-06-12T10:00:00 failed_acceptance_through_15m failed 2026-06-12T10:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-12T10:00:00; wick 2026-06-12T10:00:00; proof 2026-06-12T10:00:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7429.00 (RTH low liquidity before proof)
- Balanced path to liquidity: not_balanced_path_to_liquidity - The near liquidity objective sat in the path but was not reached during the replay window.
- Open FVGs below at proof: 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status open_untouched; 120m LONG 7399.25-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00 status open_untouched; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status open_untouched; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status open_untouched; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch; 5m LONG 7247.75-7253.25 parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7445.50-7448.00 parent 2026-05-06T18:05:00 confirmed 2026-05-06T18:10:00 status failed_inverted; 5m SHORT 7445.75-7449.50 parent 2026-05-07T12:05:00 confirmed 2026-05-07T12:10:00 status failed_inverted; 15m SHORT 7445.75-7449.50 parent 2026-05-07T12:15:00 confirmed 2026-05-07T12:30:00 status failed_inverted; 5m SHORT 7446.00-7446.50 parent 2026-05-18T00:30:00 confirmed 2026-05-18T00:35:00 status failed_inverted; 60m SHORT 7446.00-7448.00 parent 2026-05-06T19:00:00 confirmed 2026-05-06T20:00:00 status failed_inverted; 15m SHORT 7446.25-7448.00 parent 2026-05-06T18:15:00 confirmed 2026-05-06T18:30:00 status failed_inverted; 5m LONG 7446.50-7447.00 parent 2026-05-06T20:50:00 confirmed 2026-05-06T20:55:00 status failed_inverted; 5m LONG 7446.75-7449.00 parent 2026-05-18T00:45:00 confirmed 2026-05-18T00:50:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7445.25-7462.25 parent 2026-06-12T09:45:00 confirmed 2026-06-12T09:50:00 status partial_touch; 15m SHORT 7453.25-7475.25 parent 2026-06-12T09:45:00 confirmed 2026-06-12T10:00:00 status open_untouched; 5m SHORT 7473.50-7478.00 parent 2026-06-12T09:35:00 confirmed 2026-06-12T09:40:00 status open_untouched; 15m SHORT 7480.25-7487.75 parent 2026-06-12T08:45:00 confirmed 2026-06-12T09:00:00 status partial_touch; 15m SHORT 7490.25-7494.75 parent 2026-06-12T08:30:00 confirmed 2026-06-12T08:45:00 status open_untouched; 5m SHORT 7490.50-7492.50 parent 2026-06-12T08:25:00 confirmed 2026-06-12T08:30:00 status open_untouched; 15m SHORT 7499.00-7502.00 parent 2026-06-12T08:15:00 confirmed 2026-06-12T08:30:00 status open_untouched; 5m SHORT 7501.50-7505.25 parent 2026-06-12T08:05:00 confirmed 2026-06-12T08:10:00 status open_untouched
- Objective ladder: session_extreme 7429.00 not reached (RTH low liquidity before proof); open_fvg 7399.25 not reached (120m LONG open FVG open_untouched parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00); open_fvg 7386.00 not reached (60m LONG open FVG open_untouched parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00); tactical 7381.75 not reached (T1 1.5R); tactical 7360.50 not reached (T2 2.0R); open_fvg 7355.50 not reached (15m LONG open FVG open_untouched parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00); open_fvg 7345.25 not reached (5m LONG open FVG open_untouched parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00); open_fvg 7321.00 not reached (5m LONG open FVG partial_touch parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00); open_fvg 7318.25 not reached (5m LONG open FVG open_untouched parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00); open_fvg 7261.00 not reached (5m LONG open FVG partial_touch parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00); open_fvg 7247.75 not reached (5m LONG open FVG partial_touch parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00)
- Story: SHORT proof completed at 2026-06-12T10:00:00 from 7453.25-7475.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 60m 7386.00-7408.75 with reaction obstacle_before_t1_not_reached. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-12T10:20:00, one MES $-211.25
- Managed outcome: Stop at 2026-06-12T10:20:00, exit 7487.25, one MES $-211.25
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-12T10:00:00 before later same-zone failure/reversal read at 2026-06-12T10:30:00. Review the defended continuation before labeling this zone as failure/reversal.

### 2. LONG 15M FVG 7453.25-7468.50 parent 2026-06-12T10:15:00 confirmed 2026-06-12T10:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-12T10:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-12T10:45:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-12T10:55:00. | PASS entry_stop_risk_contract: Entry 7496.25, protected 5M stop 7429.00, risk 67.25 pts. | PASS tactical_targets_from_actual_risk: T1 7597.25 and T2 7630.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7496.50.
- Parent displacement: yes
- Parent displacement candle: 2026-06-12T10:15:00
- Parent failure: not found
- First 5M return: 2026-06-12T10:45:00
- 5M wick defense: none
- Proof: 2026-06-12T10:55:00
- Entry/stop/risk: 7496.25 / 7429.00 / 67.25 pts
- T1/T2: 7597.25 / 7630.75
- Nearest liquidity: nearest prior high liquidity 7496.50
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7496.50-7502.50 parent 2026-05-11T10:30:00 confirmed 2026-05-11T10:35:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-12T11:00:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7453.25-7468.50 parent 2026-06-12T10:15:00 confirmed 2026-06-12T10:30:00 defended_on_15m defended 2026-06-12T11:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7453.25-7468.50 parent 2026-06-12T10:15:00 confirmed 2026-06-12T10:30:00 defended_on_15m defended 2026-06-12T11:00:00
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-06-12T10:45:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 15m SHORT 7490.25-7494.75 parent 2026-06-12T08:30:00 confirmed 2026-06-12T08:45:00 status partial_touch; 15m LONG 7453.25-7468.50 parent 2026-06-12T10:15:00 confirmed 2026-06-12T10:30:00 status partial_touch; 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status open_untouched; 120m LONG 7399.25-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00 status open_untouched; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status open_untouched; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status open_untouched; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7496.50-7502.50 parent 2026-05-11T10:30:00 confirmed 2026-05-11T10:35:00 status failed_inverted; 5m LONG 7496.50-7507.50 parent 2026-05-18T09:55:00 confirmed 2026-05-18T10:00:00 status failed_inverted; 15m SHORT 7496.50-7504.00 parent 2026-05-15T16:00:00 confirmed 2026-05-15T16:15:00 status failed_inverted; 60m SHORT 7496.50-7508.50 parent 2026-05-15T16:00:00 confirmed 2026-05-15T17:00:00 status failed_inverted; 120m SHORT 7496.50-7500.75 parent 2026-05-15T16:00:00 confirmed 2026-05-15T17:00:00 status failed_inverted; 15m SHORT 7496.75-7499.50 parent 2026-05-20T17:00:00 confirmed 2026-05-20T18:15:00 status failed_inverted; 60m SHORT 7496.75-7502.25 parent 2026-05-20T17:00:00 confirmed 2026-05-20T19:00:00 status failed_inverted; 120m LONG 7496.75-7498.50 parent 2026-05-20T22:00:00 confirmed 2026-05-21T00:00:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7499.00-7502.00 parent 2026-06-12T08:15:00 confirmed 2026-06-12T08:30:00 status open_untouched; 5m SHORT 7501.50-7505.25 parent 2026-06-12T08:05:00 confirmed 2026-06-12T08:10:00 status open_untouched; 5m SHORT 7504.75-7523.75 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00 status partial_touch; 15m SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 status partial_touch; 5m SHORT 7536.00-7536.50 parent 2026-06-09T10:00:00 confirmed 2026-06-09T10:05:00 status open_untouched; 60m SHORT 7554.00-7569.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T13:00:00 status partial_touch; 120m SHORT 7554.00-7574.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T14:00:00 status partial_touch; 15m SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 status open_untouched
- Objective ladder: open_fvg 7502.00 reached 2026-06-12T11:00:00 (15m SHORT open FVG open_untouched parent 2026-06-12T08:15:00 confirmed 2026-06-12T08:30:00); open_fvg 7505.25 reached 2026-06-12T11:00:00 (5m SHORT open FVG open_untouched parent 2026-06-12T08:05:00 confirmed 2026-06-12T08:10:00); open_fvg 7523.75 reached 2026-06-12T11:25:00 (5m SHORT open FVG partial_touch parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00); open_fvg 7527.50 not reached (15m SHORT open FVG partial_touch parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00); open_fvg 7536.50 not reached (5m SHORT open FVG open_untouched parent 2026-06-09T10:00:00 confirmed 2026-06-09T10:05:00); open_fvg 7563.25 not reached (15m SHORT open FVG open_untouched parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00); open_fvg 7569.25 not reached (60m SHORT open FVG partial_touch parent 2026-06-05T12:00:00 confirmed 2026-06-05T13:00:00); open_fvg 7574.25 not reached (120m SHORT open FVG partial_touch parent 2026-06-05T12:00:00 confirmed 2026-06-05T14:00:00); tactical 7597.25 not reached (T1 1.5R); tactical 7630.75 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-06-12T10:55:00 from 7453.25-7468.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7496.50-7502.50 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7502.00 open_fvg, 7505.25 open_fvg, 7523.75 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-06-12T17:00:00, one MES +$11.25
- Managed outcome: SessionClose at 2026-06-12T17:00:00, exit 7498.50, one MES +$11.25
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 3. LONG 15M FVG 7491.50-7496.25 parent 2026-06-12T11:00:00 confirmed 2026-06-12T11:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-12T11:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-12T11:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-12T11:45:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-12T11:00:00
- Parent failure: 2026-06-12T11:45:00
- First 5M return: 2026-06-12T11:45:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7453.25-7468.50 parent 2026-06-12T10:15:00 confirmed 2026-06-12T10:30:00 defended_on_15m defended 2026-06-12T11:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7453.25-7468.50 parent 2026-06-12T10:15:00 confirmed 2026-06-12T10:30:00 defended_on_15m defended 2026-06-12T11:00:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-06-12T11:40:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-06-12T11:45:00.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 4. SHORT 15M FVG 7498.75-7505.50 parent 2026-06-12T11:45:00 confirmed 2026-06-12T12:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-12T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-12T11:45:00
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
- 15M battle-zone active role: final_deepest_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7453.25-7475.25 parent 2026-06-12T09:45:00 confirmed 2026-06-12T10:00:00 failed_acceptance_through_15m failed 2026-06-12T10:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7498.75-7505.50 parent 2026-06-12T11:45:00 confirmed 2026-06-12T12:00:00 untested_by_15m
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
