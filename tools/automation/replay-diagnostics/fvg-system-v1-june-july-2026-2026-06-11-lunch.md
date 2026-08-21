# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-11 / lunch (2026-06-11T12:00:00 to 2026-06-11T16:00:00)
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
- Open below: 5m LONG 7346.00-7347.50 parent 2026-06-11T11:10:00 confirmed 2026-06-11T11:15:00 status open_untouched; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch; 5m LONG 7247.75-7253.25 parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00 status partial_touch; 15m LONG 7244.75-7252.25 parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00 status partial_touch; 5m LONG 7240.75-7243.75 parent 2026-04-30T10:50:00 confirmed 2026-04-30T10:55:00 status open_untouched; 5m LONG 7236.50-7239.00 parent 2026-04-30T10:45:00 confirmed 2026-04-30T10:50:00 status open_untouched; 15m LONG 7218.00-7218.25 parent 2026-04-30T03:15:00 confirmed 2026-04-30T03:30:00 status open_untouched; 5m LONG 7206.75-7216.75 parent 2026-04-30T02:35:00 confirmed 2026-04-30T02:40:00 status partial_touch
- Failed above: 5m SHORT 7366.00-7369.25 parent 2026-06-11T02:05:00 confirmed 2026-06-11T02:10:00 status failed_inverted; 5m LONG 7366.00-7369.00 parent 2026-06-11T02:15:00 confirmed 2026-06-11T02:20:00 status failed_inverted; 5m SHORT 7366.25-7370.50 parent 2026-06-11T09:35:00 confirmed 2026-06-11T09:40:00 status failed_inverted; 5m LONG 7367.75-7369.25 parent 2026-05-05T21:05:00 confirmed 2026-05-05T21:10:00 status failed_inverted; 15m LONG 7367.75-7368.00 parent 2026-05-05T21:15:00 confirmed 2026-05-05T21:30:00 status failed_inverted; 60m LONG 7367.75-7375.75 parent 2026-05-05T19:00:00 confirmed 2026-05-05T20:00:00 status failed_inverted; 5m LONG 7368.25-7369.25 parent 2026-05-05T23:15:00 confirmed 2026-05-05T23:20:00 status failed_inverted; 15m SHORT 7368.25-7371.25 parent 2026-05-05T20:30:00 confirmed 2026-05-05T20:45:00 status failed_inverted; 5m SHORT 7369.00-7369.75 parent 2026-05-05T22:30:00 confirmed 2026-05-05T22:35:00 status failed_inverted; 15m SHORT 7369.75-7377.00 parent 2026-06-10T14:45:00 confirmed 2026-06-10T15:00:00 status failed_inverted
- Open above: 120m SHORT 7424.50-7505.00 parent 2026-06-09T12:00:00 confirmed 2026-06-09T14:00:00 status partial_touch; 15m SHORT 7428.50-7439.75 parent 2026-06-10T11:00:00 confirmed 2026-06-10T11:15:00 status open_untouched; 60m SHORT 7469.00-7512.50 parent 2026-06-09T11:00:00 confirmed 2026-06-09T12:00:00 status open_untouched; 5m SHORT 7474.00-7489.50 parent 2026-06-09T10:45:00 confirmed 2026-06-09T10:50:00 status open_untouched; 15m SHORT 7474.00-7479.00 parent 2026-06-09T10:45:00 confirmed 2026-06-09T11:00:00 status open_untouched; 5m SHORT 7504.75-7523.75 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00 status partial_touch; 15m SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 status open_untouched; 5m SHORT 7536.00-7536.50 parent 2026-06-09T10:00:00 confirmed 2026-06-09T10:05:00 status open_untouched; 60m SHORT 7554.00-7569.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T13:00:00 status partial_touch; 120m SHORT 7554.00-7574.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T14:00:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof 2026-06-11T13:15:00 from 15M parent 2026-06-11T13:00:00 confirmed 2026-06-11T13:15:00.
- Defended-area management context: 5m LONG 7321.00-7333.00 is a callout before/near T1, not an issue by itself.
- Later rows: 4 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7355.50-7356.75 parent 2026-06-11T13:00:00 confirmed 2026-06-11T13:15:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-11T13:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-11T13:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-11T13:15:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-11T13:15:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-11T13:15:00. | PASS entry_stop_risk_contract: Entry 7346.25, protected 5M stop 7372.50, risk 26.25 pts. | PASS tactical_targets_from_actual_risk: T1 7307.00 and T2 7293.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7346.00.
- Parent displacement: yes
- Parent displacement candle: 2026-06-11T13:00:00
- Parent failure: 2026-06-11T13:30:00
- First 5M return: 2026-06-11T13:15:00
- 5M wick defense: 2026-06-11T13:15:00
- Proof: 2026-06-11T13:15:00
- Entry/stop/risk: 7346.25 / 7372.50 / 26.25 pts
- T1/T2: 7307.00 / 7293.75
- Nearest liquidity: nearest prior low liquidity 7346.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch
- Defended-area reaction: obstacle_before_t1_not_reached
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7355.50-7356.75 parent 2026-06-11T13:00:00 confirmed 2026-06-11T13:15:00 failed_acceptance_through_15m failed 2026-06-11T13:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7355.50-7356.75 parent 2026-06-11T13:00:00 confirmed 2026-06-11T13:15:00 failed_acceptance_through_15m failed 2026-06-11T13:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-11T13:15:00; wick 2026-06-11T13:15:00; proof 2026-06-11T13:15:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7326.50 (prior 5M swing low liquidity from 2026-06-11T11:05:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - The near liquidity objective sat in the path but was not reached during the replay window.
- Open FVGs below at proof: 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch; 5m LONG 7247.75-7253.25 parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00 status partial_touch; 15m LONG 7244.75-7252.25 parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00 status partial_touch; 5m LONG 7240.75-7243.75 parent 2026-04-30T10:50:00 confirmed 2026-04-30T10:55:00 status open_untouched; 5m LONG 7236.50-7239.00 parent 2026-04-30T10:45:00 confirmed 2026-04-30T10:50:00 status open_untouched; 15m LONG 7218.00-7218.25 parent 2026-04-30T03:15:00 confirmed 2026-04-30T03:30:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7346.50-7347.50 parent 2026-05-05T12:10:00 confirmed 2026-05-05T12:15:00 status failed_inverted; 5m SHORT 7346.50-7349.00 parent 2026-06-10T22:25:00 confirmed 2026-06-10T22:30:00 status failed_inverted; 15m SHORT 7347.25-7350.00 parent 2026-06-10T22:30:00 confirmed 2026-06-10T22:45:00 status failed_inverted; 5m LONG 7347.50-7351.25 parent 2026-06-10T15:35:00 confirmed 2026-06-10T15:40:00 status failed_inverted; 5m LONG 7348.25-7353.00 parent 2026-06-10T23:00:00 confirmed 2026-06-10T23:05:00 status failed_inverted; 15m LONG 7348.75-7349.75 parent 2026-05-05T13:30:00 confirmed 2026-05-05T13:45:00 status failed_inverted; 15m SHORT 7349.00-7357.25 parent 2026-05-01T10:45:00 confirmed 2026-05-01T11:00:00 status failed_inverted; 5m SHORT 7349.25-7357.25 parent 2026-05-01T10:35:00 confirmed 2026-05-01T10:40:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7355.50-7356.75 parent 2026-06-11T13:00:00 confirmed 2026-06-11T13:15:00 status open_untouched; 5m SHORT 7355.75-7364.00 parent 2026-06-11T12:55:00 confirmed 2026-06-11T13:00:00 status open_untouched; 120m SHORT 7424.50-7505.00 parent 2026-06-09T12:00:00 confirmed 2026-06-09T14:00:00 status partial_touch; 15m SHORT 7428.50-7439.75 parent 2026-06-10T11:00:00 confirmed 2026-06-10T11:15:00 status open_untouched; 60m SHORT 7469.00-7512.50 parent 2026-06-09T11:00:00 confirmed 2026-06-09T12:00:00 status open_untouched; 5m SHORT 7474.00-7489.50 parent 2026-06-09T10:45:00 confirmed 2026-06-09T10:50:00 status open_untouched; 15m SHORT 7474.00-7479.00 parent 2026-06-09T10:45:00 confirmed 2026-06-09T11:00:00 status open_untouched; 5m SHORT 7504.75-7523.75 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00 status partial_touch
- Objective ladder: liquidity 7326.50 not reached (prior 5M swing low liquidity from 2026-06-11T11:05:00); session_extreme 7326.50 not reached (RTH low liquidity before proof); open_fvg 7321.00 not reached (5m LONG open FVG partial_touch parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00); open_fvg 7318.25 not reached (5m LONG open FVG open_untouched parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00); tactical 7307.00 not reached (T1 1.5R); tactical 7293.75 not reached (T2 2.0R); open_fvg 7261.00 not reached (5m LONG open FVG partial_touch parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00); open_fvg 7247.75 not reached (5m LONG open FVG partial_touch parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00); open_fvg 7244.75 not reached (15m LONG open FVG partial_touch parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00); open_fvg 7240.75 not reached (5m LONG open FVG open_untouched parent 2026-04-30T10:50:00 confirmed 2026-04-30T10:55:00); open_fvg 7236.50 not reached (5m LONG open FVG open_untouched parent 2026-04-30T10:45:00 confirmed 2026-04-30T10:50:00); open_fvg 7218.00 not reached (15m LONG open FVG open_untouched parent 2026-04-30T03:15:00 confirmed 2026-04-30T03:30:00)
- Story: SHORT proof completed at 2026-06-11T13:15:00 from 7355.50-7356.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7321.00-7333.00 with reaction obstacle_before_t1_not_reached. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-11T13:30:00, one MES $-131.25
- Managed outcome: Stop at 2026-06-11T13:30:00, exit 7372.50, one MES $-131.25
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-11T13:15:00 before later same-zone failure/reversal read at 2026-06-11T13:30:00. Review the defended continuation before labeling this zone as failure/reversal.

### 2. LONG 15M FVG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-11T13:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-11T13:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 untested_by_15m
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

### 3. LONG 15M FVG 7410.00-7417.25 parent 2026-06-11T13:45:00 confirmed 2026-06-11T14:00:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-11T13:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-11T14:05:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-11T14:10:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-11T14:15:00. | PASS entry_stop_risk_contract: Entry 7426.50, protected 5M stop 7335.50, risk 91.00 pts. | PASS tactical_targets_from_actual_risk: T1 7563.00 and T2 7608.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7426.75.
- Parent displacement: yes
- Parent displacement candle: 2026-06-11T13:45:00
- Parent failure: not found
- First 5M return: 2026-06-11T14:05:00
- 5M wick defense: 2026-06-11T14:10:00
- Proof: 2026-06-11T14:15:00
- Entry/stop/risk: 7426.50 / 7335.50 / 91.00 pts
- T1/T2: 7563.00 / 7608.50
- Nearest liquidity: nearest prior high liquidity 7426.75
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7426.75-7446.75 parent 2026-06-09T11:25:00 confirmed 2026-06-09T11:30:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-11T14:20:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-11T14:05:00; wick 2026-06-11T14:10:00; proof 2026-06-11T14:15:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7450.00 (prior 5M swing high liquidity from 2026-06-11T13:45:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status open_untouched; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status open_untouched; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch; 5m LONG 7247.75-7253.25 parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00 status partial_touch; 15m LONG 7244.75-7252.25 parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00 status partial_touch; 5m LONG 7240.75-7243.75 parent 2026-04-30T10:50:00 confirmed 2026-04-30T10:55:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7426.75-7446.75 parent 2026-06-09T11:25:00 confirmed 2026-06-09T11:30:00 status failed_inverted; 5m SHORT 7427.00-7428.25 parent 2026-05-06T12:50:00 confirmed 2026-05-06T12:55:00 status failed_inverted; 5m SHORT 7427.00-7427.75 parent 2026-05-07T14:25:00 confirmed 2026-05-07T14:30:00 status failed_inverted; 5m SHORT 7427.00-7430.50 parent 2026-05-19T20:15:00 confirmed 2026-05-19T20:20:00 status failed_inverted; 5m SHORT 7427.00-7428.00 parent 2026-06-10T04:05:00 confirmed 2026-06-10T04:10:00 status failed_inverted; 5m LONG 7427.25-7434.00 parent 2026-05-19T20:30:00 confirmed 2026-05-19T20:35:00 status failed_inverted; 5m LONG 7428.25-7429.50 parent 2026-06-10T01:55:00 confirmed 2026-06-10T02:00:00 status failed_inverted; 5m LONG 7428.50-7430.25 parent 2026-05-07T16:05:00 confirmed 2026-05-07T16:10:00 status failed_inverted
- Open FVGs above at proof: 60m SHORT 7469.00-7512.50 parent 2026-06-09T11:00:00 confirmed 2026-06-09T12:00:00 status open_untouched; 5m SHORT 7474.00-7489.50 parent 2026-06-09T10:45:00 confirmed 2026-06-09T10:50:00 status open_untouched; 15m SHORT 7474.00-7479.00 parent 2026-06-09T10:45:00 confirmed 2026-06-09T11:00:00 status open_untouched; 5m SHORT 7504.75-7523.75 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00 status partial_touch; 15m SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 status open_untouched; 5m SHORT 7536.00-7536.50 parent 2026-06-09T10:00:00 confirmed 2026-06-09T10:05:00 status open_untouched; 60m SHORT 7554.00-7569.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T13:00:00 status partial_touch; 120m SHORT 7554.00-7574.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T14:00:00 status partial_touch
- Objective ladder: liquidity 7450.00 reached 2026-06-11T15:05:00 (prior 5M swing high liquidity from 2026-06-11T13:45:00); session_extreme 7450.00 reached 2026-06-11T15:05:00 (RTH high liquidity before proof); open_fvg 7479.00 reached 2026-06-11T15:35:00 (15m SHORT open FVG open_untouched parent 2026-06-09T10:45:00 confirmed 2026-06-09T11:00:00); open_fvg 7489.50 not reached (5m SHORT open FVG open_untouched parent 2026-06-09T10:45:00 confirmed 2026-06-09T10:50:00); open_fvg 7512.50 not reached (60m SHORT open FVG open_untouched parent 2026-06-09T11:00:00 confirmed 2026-06-09T12:00:00); open_fvg 7523.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00); open_fvg 7527.50 not reached (15m SHORT open FVG open_untouched parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00); open_fvg 7536.50 not reached (5m SHORT open FVG open_untouched parent 2026-06-09T10:00:00 confirmed 2026-06-09T10:05:00); tactical 7563.00 not reached (T1 1.5R); open_fvg 7569.25 not reached (60m SHORT open FVG partial_touch parent 2026-06-05T12:00:00 confirmed 2026-06-05T13:00:00); open_fvg 7574.25 not reached (120m SHORT open FVG partial_touch parent 2026-06-05T12:00:00 confirmed 2026-06-05T14:00:00); tactical 7608.50 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-06-11T14:15:00 from 7410.00-7417.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7426.75-7446.75 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7450.00 liquidity, 7450.00 session_extreme, 7479.00 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-06-12T17:00:00, one MES +$360.00
- Managed outcome: LQ1 at 2026-06-11T15:05:00, exit 7450.00, one MES +$117.50
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-06-11T14:15:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 4. LONG 15M FVG 7446.75-7450.75 parent 2026-06-11T15:15:00 confirmed 2026-06-11T15:30:00
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
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 untested_by_15m
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

### 5. LONG 15M FVG 7456.25-7462.25 parent 2026-06-11T15:30:00 confirmed 2026-06-11T15:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-11T15:50:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-11T15:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-11T15:55:00. | PASS entry_stop_risk_contract: Entry 7465.25, protected 5M stop 7435.75, risk 29.50 pts. | PASS tactical_targets_from_actual_risk: T1 7509.50 and T2 7524.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7465.50.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-06-11T15:50:00
- 5M wick defense: 2026-06-11T15:55:00
- Proof: 2026-06-11T15:55:00
- Entry/stop/risk: 7465.25 / 7435.75 / 29.50 pts
- T1/T2: 7509.50 / 7524.25
- Nearest liquidity: nearest prior high liquidity 7465.50
- Defended-area / obstacle management callout before or near T1: 5m LONG 7465.50-7467.00 parent 2026-05-19T02:15:00 confirmed 2026-05-19T02:20:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-11T16:00:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-11T15:50:00; wick 2026-06-11T15:55:00; proof 2026-06-11T15:55:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7483.25 (prior 5M swing high liquidity from 2026-06-11T15:40:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 15m LONG 7456.25-7462.25 parent 2026-06-11T15:30:00 confirmed 2026-06-11T15:45:00 status open_untouched; 5m LONG 7448.75-7450.75 parent 2026-06-11T15:15:00 confirmed 2026-06-11T15:20:00 status open_untouched; 15m LONG 7446.75-7450.75 parent 2026-06-11T15:15:00 confirmed 2026-06-11T15:30:00 status open_untouched; 5m LONG 7434.00-7440.50 parent 2026-06-11T14:50:00 confirmed 2026-06-11T14:55:00 status partial_touch; 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status open_untouched; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status open_untouched; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status open_untouched; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7465.50-7467.00 parent 2026-05-19T02:15:00 confirmed 2026-05-19T02:20:00 status failed_inverted; 5m LONG 7465.50-7466.00 parent 2026-05-19T13:05:00 confirmed 2026-05-19T13:10:00 status failed_inverted; 5m SHORT 7465.50-7466.00 parent 2026-06-08T02:40:00 confirmed 2026-06-08T02:45:00 status failed_inverted; 5m LONG 7465.50-7471.00 parent 2026-06-11T15:35:00 confirmed 2026-06-11T15:40:00 status failed_inverted; 15m LONG 7465.50-7470.00 parent 2026-05-19T13:15:00 confirmed 2026-05-19T13:30:00 status failed_inverted; 240m LONG 7465.50-7470.75 parent 2026-05-08T10:00:00 confirmed 2026-05-08T14:00:00 status failed_inverted; 5m LONG 7465.75-7466.00 parent 2026-05-20T07:25:00 confirmed 2026-05-20T07:30:00 status failed_inverted; 15m SHORT 7465.75-7468.25 parent 2026-05-19T14:30:00 confirmed 2026-05-19T14:45:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7468.25-7469.75 parent 2026-06-11T15:50:00 confirmed 2026-06-11T15:55:00 status open_untouched; 60m SHORT 7469.00-7512.50 parent 2026-06-09T11:00:00 confirmed 2026-06-09T12:00:00 status open_untouched; 5m SHORT 7474.00-7489.50 parent 2026-06-09T10:45:00 confirmed 2026-06-09T10:50:00 status partial_touch; 5m SHORT 7504.75-7523.75 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00 status partial_touch; 15m SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 status open_untouched; 5m SHORT 7536.00-7536.50 parent 2026-06-09T10:00:00 confirmed 2026-06-09T10:05:00 status open_untouched; 60m SHORT 7554.00-7569.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T13:00:00 status partial_touch; 120m SHORT 7554.00-7574.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T14:00:00 status partial_touch
- Objective ladder: open_fvg 7469.75 not reached (5m SHORT open FVG open_untouched parent 2026-06-11T15:50:00 confirmed 2026-06-11T15:55:00); liquidity 7483.25 not reached (prior 5M swing high liquidity from 2026-06-11T15:40:00); session_extreme 7483.25 not reached (RTH high liquidity before proof); open_fvg 7489.50 not reached (5m SHORT open FVG partial_touch parent 2026-06-09T10:45:00 confirmed 2026-06-09T10:50:00); tactical 7509.50 not reached (T1 1.5R); open_fvg 7512.50 not reached (60m SHORT open FVG open_untouched parent 2026-06-09T11:00:00 confirmed 2026-06-09T12:00:00); open_fvg 7523.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00); tactical 7524.25 not reached (T2 2.0R); open_fvg 7527.50 not reached (15m SHORT open FVG open_untouched parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00); open_fvg 7536.50 not reached (5m SHORT open FVG open_untouched parent 2026-06-09T10:00:00 confirmed 2026-06-09T10:05:00); open_fvg 7569.25 not reached (60m SHORT open FVG partial_touch parent 2026-06-05T12:00:00 confirmed 2026-06-05T13:00:00); open_fvg 7574.25 not reached (120m SHORT open FVG partial_touch parent 2026-06-05T12:00:00 confirmed 2026-06-05T14:00:00)
- Story: LONG proof completed at 2026-06-11T15:55:00 from 7456.25-7462.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7465.50-7467.00 with reaction obstacle_reached_then_continued. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-12T05:35:00, one MES +$221.25
- Managed outcome: LQ1 at 2026-06-11T20:40:00, exit 7483.25, one MES +$90.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. Defended-first continuation precedence: LONG 5M defense proof completed at 2026-06-11T15:55:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.
