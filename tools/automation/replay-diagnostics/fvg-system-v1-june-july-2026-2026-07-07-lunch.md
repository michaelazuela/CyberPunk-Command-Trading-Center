# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-07 / lunch (2026-07-07T12:00:00 to 2026-07-07T16:00:00)
Context window: 275 days (2025-10-05T00:00:00 to 2026-07-08T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 48875 bars (2025-10-28T18:05:00 to 2026-07-08T23:55:00)
- 15m: 16313 bars (2025-10-28T18:15:00 to 2026-07-08T23:45:00)
- 60m: 4058 bars (2025-10-28T19:00:00 to 2026-07-08T23:00:00)
- 120m: 2131 bars (2025-10-28T20:00:00 to 2026-07-08T22:00:00)
- 240m: 1196 bars (2025-10-28T22:00:00 to 2026-07-08T22:00:00)

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
- Open below: 5m LONG 7541.50-7543.00 parent 2026-07-07T11:50:00 confirmed 2026-07-07T11:55:00 status open_untouched; 5m LONG 7539.50-7541.00 parent 2026-07-07T11:45:00 confirmed 2026-07-07T11:50:00 status open_untouched; 15m LONG 7524.50-7528.50 parent 2026-07-02T18:15:00 confirmed 2026-07-02T18:30:00 status partial_touch; 5m LONG 7522.25-7523.50 parent 2026-07-02T17:00:00 confirmed 2026-07-02T18:05:00 status open_untouched; 5m LONG 7513.00-7521.00 parent 2026-07-02T15:55:00 confirmed 2026-07-02T16:00:00 status partial_touch; 15m LONG 7513.00-7517.75 parent 2026-07-02T16:00:00 confirmed 2026-07-02T16:15:00 status open_untouched; 60m LONG 7514.75-7517.75 parent 2026-07-02T16:00:00 confirmed 2026-07-02T17:00:00 status open_untouched; 15m LONG 7505.50-7509.00 parent 2026-07-02T15:45:00 confirmed 2026-07-02T16:00:00 status open_untouched; 5m LONG 7489.25-7500.75 parent 2026-07-02T14:10:00 confirmed 2026-07-02T14:15:00 status partial_touch; 5m LONG 7497.75-7500.75 parent 2026-07-02T15:30:00 confirmed 2026-07-02T15:35:00 status open_untouched
- Failed above: 5m SHORT 7551.00-7551.75 parent 2026-07-01T15:45:00 confirmed 2026-07-01T15:50:00 status failed_inverted; 15m SHORT 7551.00-7554.50 parent 2026-05-22T16:45:00 confirmed 2026-05-22T17:00:00 status failed_inverted; 15m LONG 7551.00-7590.50 parent 2026-05-24T18:15:00 confirmed 2026-05-24T18:30:00 status failed_inverted; 120m SHORT 7551.00-7557.25 parent 2026-05-15T02:00:00 confirmed 2026-05-15T04:00:00 status failed_inverted; 240m SHORT 7551.00-7557.75 parent 2026-05-15T02:00:00 confirmed 2026-05-15T06:00:00 status failed_inverted; 5m LONG 7551.25-7557.75 parent 2026-06-18T11:55:00 confirmed 2026-06-18T12:00:00 status failed_inverted; 5m LONG 7551.50-7552.25 parent 2026-05-22T04:00:00 confirmed 2026-05-22T04:05:00 status failed_inverted; 5m SHORT 7551.50-7552.00 parent 2026-06-18T00:15:00 confirmed 2026-06-18T00:20:00 status failed_inverted; 5m LONG 7551.75-7555.00 parent 2026-06-18T03:00:00 confirmed 2026-06-18T03:05:00 status failed_inverted; 5m SHORT 7551.75-7552.00 parent 2026-07-03T07:00:00 confirmed 2026-07-03T07:05:00 status failed_inverted
- Open above: 60m SHORT 7551.25-7560.25 parent 2026-07-07T11:00:00 confirmed 2026-07-07T12:00:00 status open_untouched; 5m SHORT 7553.00-7558.50 parent 2026-07-07T10:15:00 confirmed 2026-07-07T10:20:00 status partial_touch; 15m SHORT 7555.25-7560.25 parent 2026-07-07T10:15:00 confirmed 2026-07-07T10:30:00 status open_untouched; 5m SHORT 7568.75-7572.25 parent 2026-07-07T09:55:00 confirmed 2026-07-07T10:00:00 status partial_touch; 60m SHORT 7570.25-7578.25 parent 2026-07-07T10:00:00 confirmed 2026-07-07T11:00:00 status open_untouched; 120m SHORT 7570.25-7572.00 parent 2026-07-07T10:00:00 confirmed 2026-07-07T12:00:00 status open_untouched; 5m SHORT 7596.75-7598.50 parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched

## Review Order
- Primary campaign to review first: LONG proof 2026-07-07T15:55:00 from 15M parent 2026-07-07T12:00:00 confirmed 2026-07-07T12:15:00.
- Defended-area management context: 5m SHORT 7555.25-7555.75 is a callout before/near T1, not an issue by itself.
- Later rows: 4 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7541.75-7549.75 parent 2026-07-07T12:00:00 confirmed 2026-07-07T12:15:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-07T12:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-07T15:05:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-07T15:05:00, 2026-07-07T15:15:00, 2026-07-07T15:20:00, 2026-07-07T16:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-07T15:55:00. | PASS entry_stop_risk_contract: Entry 7555.00, protected 5M stop 7541.25, risk 13.75 pts. | PASS tactical_targets_from_actual_risk: T1 7575.75 and T2 7582.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7555.25.
- Parent displacement: yes
- Parent displacement candle: 2026-07-07T12:00:00
- Parent failure: not found
- First 5M return: 2026-07-07T15:05:00
- 5M wick defense: 2026-07-07T15:05:00, 2026-07-07T15:15:00, 2026-07-07T15:20:00, 2026-07-07T16:00:00
- Proof: 2026-07-07T15:55:00
- Entry/stop/risk: 7555.00 / 7541.25 / 13.75 pts
- T1/T2: 7575.75 / 7582.50
- Nearest liquidity: nearest prior high liquidity 7555.25
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7555.25-7555.75 parent 2026-05-14T08:50:00 confirmed 2026-05-14T08:55:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-07T16:00:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7541.75-7549.75 parent 2026-07-07T12:00:00 confirmed 2026-07-07T12:15:00 defended_on_15m defended 2026-07-07T16:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7541.75-7549.75 parent 2026-07-07T12:00:00 confirmed 2026-07-07T12:15:00 defended_on_15m defended 2026-07-07T16:00:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-07T15:05:00; wick 2026-07-07T15:05:00; proof 2026-07-07T15:55:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7567.75 (prior 5M swing high liquidity from 2026-07-07T12:35:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 15m SHORT 7548.00-7551.50 parent 2026-07-07T15:15:00 confirmed 2026-07-07T15:30:00 status partial_touch; 5m LONG 7545.50-7547.25 parent 2026-07-07T15:50:00 confirmed 2026-07-07T15:55:00 status open_untouched; 15m LONG 7524.50-7528.50 parent 2026-07-02T18:15:00 confirmed 2026-07-02T18:30:00 status partial_touch; 5m LONG 7522.25-7523.50 parent 2026-07-02T17:00:00 confirmed 2026-07-02T18:05:00 status open_untouched; 5m LONG 7513.00-7521.00 parent 2026-07-02T15:55:00 confirmed 2026-07-02T16:00:00 status partial_touch; 15m LONG 7513.00-7517.75 parent 2026-07-02T16:00:00 confirmed 2026-07-02T16:15:00 status open_untouched; 60m LONG 7514.75-7517.75 parent 2026-07-02T16:00:00 confirmed 2026-07-02T17:00:00 status open_untouched; 15m LONG 7505.50-7509.00 parent 2026-07-02T15:45:00 confirmed 2026-07-02T16:00:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7555.25-7555.75 parent 2026-05-14T08:50:00 confirmed 2026-05-14T08:55:00 status failed_inverted; 5m SHORT 7555.25-7555.75 parent 2026-05-22T04:35:00 confirmed 2026-05-22T04:40:00 status failed_inverted; 5m SHORT 7555.25-7556.00 parent 2026-06-19T05:25:00 confirmed 2026-06-19T05:30:00 status failed_inverted; 5m LONG 7555.25-7556.00 parent 2026-06-19T05:35:00 confirmed 2026-06-19T05:40:00 status failed_inverted; 5m LONG 7555.25-7557.00 parent 2026-06-22T02:25:00 confirmed 2026-06-22T02:30:00 status failed_inverted; 5m SHORT 7555.25-7556.00 parent 2026-06-30T13:15:00 confirmed 2026-06-30T13:20:00 status failed_inverted; 5m LONG 7555.25-7555.75 parent 2026-07-01T22:15:00 confirmed 2026-07-01T22:20:00 status failed_inverted; 15m SHORT 7555.25-7559.50 parent 2026-06-18T06:45:00 confirmed 2026-06-18T07:00:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7560.00-7561.50 parent 2026-07-07T14:50:00 confirmed 2026-07-07T14:55:00 status open_untouched; 5m SHORT 7568.75-7572.25 parent 2026-07-07T09:55:00 confirmed 2026-07-07T10:00:00 status partial_touch; 60m SHORT 7570.25-7578.25 parent 2026-07-07T10:00:00 confirmed 2026-07-07T11:00:00 status partial_touch; 120m SHORT 7570.25-7572.00 parent 2026-07-07T10:00:00 confirmed 2026-07-07T12:00:00 status partial_touch; 5m SHORT 7596.75-7598.50 parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched
- Objective ladder: open_fvg 7561.50 not reached (5m SHORT open FVG open_untouched parent 2026-07-07T14:50:00 confirmed 2026-07-07T14:55:00); liquidity 7567.75 not reached (prior 5M swing high liquidity from 2026-07-07T12:35:00); liquidity 7568.75 not reached (prior 5M swing high liquidity from 2026-07-07T12:50:00); liquidity 7570.25 not reached (prior 5M swing high liquidity from 2026-07-07T14:05:00); liquidity 7570.50 not reached (prior 5M swing high liquidity from 2026-07-07T13:45:00); liquidity 7570.75 not reached (prior 5M swing high liquidity from 2026-07-07T14:25:00); liquidity 7571.00 not reached (prior 5M swing high liquidity from 2026-07-07T13:10:00); open_fvg 7572.00 not reached (120m SHORT open FVG partial_touch parent 2026-07-07T10:00:00 confirmed 2026-07-07T12:00:00); open_fvg 7572.25 not reached (5m SHORT open FVG partial_touch parent 2026-07-07T09:55:00 confirmed 2026-07-07T10:00:00); tactical 7575.75 not reached (T1 1.5R); open_fvg 7578.25 not reached (60m SHORT open FVG partial_touch parent 2026-07-07T10:00:00 confirmed 2026-07-07T11:00:00); liquidity 7581.00 not reached (prior 5M swing high liquidity from 2026-07-07T09:50:00); tactical 7582.50 not reached (T2 2.0R); liquidity 7587.75 not reached (prior 5M swing high liquidity from 2026-07-07T09:35:00)
- Story: LONG proof completed at 2026-07-07T15:55:00 from 7541.75-7549.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7555.25-7555.75 with reaction obstacle_defended_management_callout. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-07T18:05:00, one MES $-68.75
- Managed outcome: Stop at 2026-07-07T18:05:00, exit 7541.25, one MES $-68.75
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-07T15:55:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 2. LONG 15M FVG 7551.25-7555.75 parent 2026-07-07T12:15:00 confirmed 2026-07-07T12:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-07T12:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-07T15:15:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-07T15:55:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-07T16:00:00. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-07T12:00:00
- Parent failure: 2026-07-07T15:15:00
- First 5M return: 2026-07-07T15:55:00
- 5M wick defense: 2026-07-07T16:00:00
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7541.75-7549.75 parent 2026-07-07T12:00:00 confirmed 2026-07-07T12:15:00 defended_on_15m defended 2026-07-07T16:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7541.75-7549.75 parent 2026-07-07T12:00:00 confirmed 2026-07-07T12:15:00 defended_on_15m defended 2026-07-07T16:00:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-07T14:50:00; wick 2026-07-07T16:00:00; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-07T15:05:00.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 3. LONG 15M FVG 7559.25-7559.75 parent 2026-07-07T12:30:00 confirmed 2026-07-07T12:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-07T15:00:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-07-07T15:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7541.75-7549.75 parent 2026-07-07T12:00:00 confirmed 2026-07-07T12:15:00 defended_on_15m defended 2026-07-07T16:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7541.75-7549.75 parent 2026-07-07T12:00:00 confirmed 2026-07-07T12:15:00 defended_on_15m defended 2026-07-07T16:00:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-07T14:50:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-07T14:50:00.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 4. SHORT 15M FVG 7554.25-7561.50 parent 2026-07-07T15:00:00 confirmed 2026-07-07T15:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-07T15:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-07T15:55:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-07T16:00:00. | PASS entry_stop_risk_contract: Entry 7553.75, protected 5M stop 7570.75, risk 17.00 pts. | PASS tactical_targets_from_actual_risk: T1 7528.25 and T2 7519.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7553.50.
- Parent displacement: yes
- Parent displacement candle: 2026-07-07T15:00:00
- Parent failure: not found
- First 5M return: 2026-07-07T15:55:00
- 5M wick defense: none
- Proof: 2026-07-07T16:00:00
- Entry/stop/risk: 7553.75 / 7570.75 / 17.00 pts
- T1/T2: 7528.25 / 7519.75
- Nearest liquidity: nearest prior low liquidity 7553.50
- Defended-area / obstacle management callout before or near T1: 5m LONG 7545.50-7547.25 parent 2026-07-07T15:50:00 confirmed 2026-07-07T15:55:00 status open_untouched
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-07T16:20:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7554.25-7561.50 parent 2026-07-07T15:00:00 confirmed 2026-07-07T15:15:00 defended_on_15m defended 2026-07-07T16:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7554.25-7561.50 parent 2026-07-07T15:00:00 confirmed 2026-07-07T15:15:00 defended_on_15m defended 2026-07-07T16:00:00
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-07-07T15:55:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: 7541.25 (prior 5M swing low liquidity from 2026-07-07T15:45:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7545.50-7547.25 parent 2026-07-07T15:50:00 confirmed 2026-07-07T15:55:00 status open_untouched; 15m LONG 7524.50-7528.50 parent 2026-07-02T18:15:00 confirmed 2026-07-02T18:30:00 status partial_touch; 5m LONG 7522.25-7523.50 parent 2026-07-02T17:00:00 confirmed 2026-07-02T18:05:00 status open_untouched; 5m LONG 7513.00-7521.00 parent 2026-07-02T15:55:00 confirmed 2026-07-02T16:00:00 status partial_touch; 15m LONG 7513.00-7517.75 parent 2026-07-02T16:00:00 confirmed 2026-07-02T16:15:00 status open_untouched; 60m LONG 7514.75-7517.75 parent 2026-07-02T16:00:00 confirmed 2026-07-02T17:00:00 status open_untouched; 15m LONG 7505.50-7509.00 parent 2026-07-02T15:45:00 confirmed 2026-07-02T16:00:00 status open_untouched; 5m LONG 7489.25-7500.75 parent 2026-07-02T14:10:00 confirmed 2026-07-02T14:15:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7554.00-7555.00 parent 2026-06-14T19:15:00 confirmed 2026-06-14T19:20:00 status failed_inverted; 5m LONG 7554.00-7554.25 parent 2026-06-17T23:55:00 confirmed 2026-06-18T00:00:00 status failed_inverted; 5m SHORT 7554.00-7554.75 parent 2026-06-19T06:05:00 confirmed 2026-06-19T06:10:00 status failed_inverted; 15m LONG 7554.00-7563.75 parent 2026-07-01T11:15:00 confirmed 2026-07-01T11:30:00 status failed_inverted; 60m SHORT 7554.00-7569.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T13:00:00 status failed_inverted; 120m SHORT 7554.00-7574.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T14:00:00 status failed_inverted; 5m LONG 7554.25-7556.75 parent 2026-05-14T07:50:00 confirmed 2026-05-14T07:55:00 status failed_inverted; 5m SHORT 7554.25-7555.25 parent 2026-05-22T00:35:00 confirmed 2026-05-22T00:40:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7554.25-7561.50 parent 2026-07-07T15:00:00 confirmed 2026-07-07T15:15:00 status partial_touch; 60m SHORT 7557.00-7561.75 parent 2026-07-07T15:00:00 confirmed 2026-07-07T16:00:00 status open_untouched; 5m SHORT 7560.00-7561.50 parent 2026-07-07T14:50:00 confirmed 2026-07-07T14:55:00 status open_untouched; 5m SHORT 7568.75-7572.25 parent 2026-07-07T09:55:00 confirmed 2026-07-07T10:00:00 status partial_touch; 60m SHORT 7570.25-7578.25 parent 2026-07-07T10:00:00 confirmed 2026-07-07T11:00:00 status partial_touch; 120m SHORT 7570.25-7572.00 parent 2026-07-07T10:00:00 confirmed 2026-07-07T12:00:00 status partial_touch; 5m SHORT 7596.75-7598.50 parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch
- Objective ladder: open_fvg 7545.50 not reached (5m LONG open FVG open_untouched parent 2026-07-07T15:50:00 confirmed 2026-07-07T15:55:00); liquidity 7541.25 not reached (prior 5M swing low liquidity from 2026-07-07T15:45:00); liquidity 7536.75 not reached (prior 5M swing low liquidity from 2026-07-07T15:20:00); liquidity 7536.25 not reached (prior 5M swing low liquidity from 2026-07-07T11:05:00); liquidity 7534.50 not reached (prior 5M swing low liquidity from 2026-07-07T11:20:00); liquidity 7531.25 not reached (prior 5M swing low liquidity from 2026-07-07T11:45:00); liquidity 7529.50 not reached (prior 5M swing low liquidity from 2026-07-07T10:45:00); session_extreme 7529.50 not reached (RTH low liquidity before proof); tactical 7528.25 not reached (T1 1.5R); open_fvg 7524.50 not reached (15m LONG open FVG partial_touch parent 2026-07-02T18:15:00 confirmed 2026-07-02T18:30:00); open_fvg 7522.25 not reached (5m LONG open FVG open_untouched parent 2026-07-02T17:00:00 confirmed 2026-07-02T18:05:00); tactical 7519.75 not reached (T2 2.0R); open_fvg 7514.75 not reached (60m LONG open FVG open_untouched parent 2026-07-02T16:00:00 confirmed 2026-07-02T17:00:00); open_fvg 7513.00 not reached (5m LONG open FVG partial_touch parent 2026-07-02T15:55:00 confirmed 2026-07-02T16:00:00)
- Story: SHORT proof completed at 2026-07-07T16:00:00 from 7554.25-7561.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7545.50-7547.25 with reaction obstacle_reached_then_continued. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T2 at 2026-07-08T04:20:00, one MES +$170.00
- Managed outcome: LQ1 at 2026-07-07T18:05:00, exit 7541.25, one MES +$62.50
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 5. SHORT 15M FVG 7548.00-7551.50 parent 2026-07-07T15:15:00 confirmed 2026-07-07T15:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-07T15:15:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-07T16:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-07T16:00:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-07T15:15:00
- Parent failure: 2026-07-07T16:00:00
- First 5M return: 2026-07-07T16:00:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7554.25-7561.50 parent 2026-07-07T15:00:00 confirmed 2026-07-07T15:15:00 defended_on_15m defended 2026-07-07T16:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7554.25-7561.50 parent 2026-07-07T15:00:00 confirmed 2026-07-07T15:15:00 defended_on_15m defended 2026-07-07T16:00:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-07T15:30:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-07T15:55:00.
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
