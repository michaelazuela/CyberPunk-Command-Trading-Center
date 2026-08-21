# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-31 / morning (2026-07-31T09:15:00 to 2026-07-31T12:00:00)
Context window: 275 days (2025-10-29T00:00:00 to 2026-08-01T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 53425 bars (2025-10-29T00:00:00 to 2026-07-31T17:00:00)
- 15m: 17831 bars (2025-10-29T00:00:00 to 2026-07-31T17:00:00)
- 60m: 4450 bars (2025-10-29T00:00:00 to 2026-07-31T17:00:00)
- 120m: 2338 bars (2025-10-29T00:00:00 to 2026-07-31T17:00:00)
- 240m: 1336 bars (2025-10-29T02:00:00 to 2026-07-31T17:00:00)

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
- Open below: 5m LONG 7487.50-7488.00 parent 2026-07-31T09:10:00 confirmed 2026-07-31T09:15:00 status open_untouched; 5m LONG 7477.00-7479.00 parent 2026-07-30T18:40:00 confirmed 2026-07-30T18:45:00 status open_untouched; 15m LONG 7462.50-7471.00 parent 2026-07-30T15:15:00 confirmed 2026-07-30T15:30:00 status partial_touch; 60m LONG 7462.50-7468.25 parent 2026-07-30T16:00:00 confirmed 2026-07-30T17:00:00 status partial_touch; 120m LONG 7457.75-7468.25 parent 2026-07-30T16:00:00 confirmed 2026-07-30T17:00:00 status partial_touch; 240m LONG 7457.75-7467.75 parent 2026-07-30T17:00:00 confirmed 2026-07-30T22:00:00 status open_untouched; 5m LONG 7462.50-7465.50 parent 2026-07-30T15:05:00 confirmed 2026-07-30T15:10:00 status partial_touch; 5m LONG 7460.75-7461.25 parent 2026-07-30T15:00:00 confirmed 2026-07-30T15:05:00 status open_untouched; 15m LONG 7459.25-7461.25 parent 2026-07-30T15:00:00 confirmed 2026-07-30T15:15:00 status open_untouched; 60m LONG 7457.75-7461.25 parent 2026-07-30T15:00:00 confirmed 2026-07-30T16:00:00 status open_untouched
- Failed above: 5m SHORT 7490.50-7491.75 parent 2026-05-11T23:05:00 confirmed 2026-05-11T23:10:00 status failed_inverted; 5m SHORT 7490.50-7491.50 parent 2026-05-11T23:50:00 confirmed 2026-05-11T23:55:00 status failed_inverted; 5m SHORT 7490.50-7499.25 parent 2026-05-13T08:35:00 confirmed 2026-05-13T08:40:00 status failed_inverted; 5m SHORT 7490.50-7492.50 parent 2026-06-12T08:25:00 confirmed 2026-06-12T08:30:00 status failed_inverted; 5m LONG 7490.50-7495.25 parent 2026-07-08T07:45:00 confirmed 2026-07-08T07:50:00 status failed_inverted; 5m LONG 7490.50-7491.50 parent 2026-07-26T21:35:00 confirmed 2026-07-26T21:40:00 status failed_inverted; 15m LONG 7490.50-7491.75 parent 2026-05-12T21:45:00 confirmed 2026-05-12T22:00:00 status failed_inverted; 5m SHORT 7490.75-7492.50 parent 2026-05-18T20:55:00 confirmed 2026-05-18T21:00:00 status failed_inverted; 5m LONG 7490.75-7491.75 parent 2026-05-21T11:45:00 confirmed 2026-05-21T11:50:00 status failed_inverted; 5m SHORT 7491.00-7494.25 parent 2026-07-17T16:05:00 confirmed 2026-07-17T16:10:00 status failed_inverted
- Open above: 15m SHORT 7493.25-7495.75 parent 2026-07-31T08:15:00 confirmed 2026-07-31T08:30:00 status open_untouched; 5m SHORT 7494.50-7498.25 parent 2026-07-31T08:05:00 confirmed 2026-07-31T08:10:00 status open_untouched; 60m SHORT 7499.75-7502.25 parent 2026-07-31T08:00:00 confirmed 2026-07-31T09:00:00 status open_untouched; 5m SHORT 7500.00-7501.50 parent 2026-07-31T07:30:00 confirmed 2026-07-31T07:35:00 status partial_touch; 15m SHORT 7500.00-7506.00 parent 2026-07-31T07:30:00 confirmed 2026-07-31T07:45:00 status partial_touch; 5m SHORT 7503.75-7506.25 parent 2026-07-31T07:20:00 confirmed 2026-07-31T07:25:00 status partial_touch; 5m SHORT 7507.00-7509.25 parent 2026-07-31T07:15:00 confirmed 2026-07-31T07:20:00 status open_untouched; 5m SHORT 7512.50-7513.00 parent 2026-07-31T05:30:00 confirmed 2026-07-31T05:35:00 status open_untouched; 60m SHORT 7515.25-7518.25 parent 2026-07-27T08:00:00 confirmed 2026-07-27T09:00:00 status partial_touch; 15m SHORT 7519.25-7521.50 parent 2026-07-27T07:15:00 confirmed 2026-07-27T07:30:00 status open_untouched

## Review Order
- Primary campaign to review first: SHORT proof 2026-07-31T10:55:00 from 15M parent 2026-07-31T10:00:00 confirmed 2026-07-31T10:15:00.
- Defended-area management context: 5m LONG 7468.25-7471.75 is a callout before/near T1, not an issue by itself.
- Later rows: 4 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7487.00-7490.00 parent 2026-07-31T09:15:00 confirmed 2026-07-31T09:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-31T09:15:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-31T09:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-31T09:45:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-31T09:15:00
- Parent failure: 2026-07-31T09:45:00
- First 5M return: 2026-07-31T09:45:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7487.00-7490.00 parent 2026-07-31T09:15:00 confirmed 2026-07-31T09:30:00 failed_acceptance_through_15m failed 2026-07-31T09:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7487.00-7490.00 parent 2026-07-31T09:15:00 confirmed 2026-07-31T09:30:00 failed_acceptance_through_15m failed 2026-07-31T09:45:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-31T09:45:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-31T09:45:00.
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

### 2. SHORT 15M FVG 7487.75-7490.00 parent 2026-07-31T09:45:00 confirmed 2026-07-31T10:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-31T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-31T09:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7487.75-7490.00 parent 2026-07-31T09:45:00 confirmed 2026-07-31T10:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7487.75-7490.00 parent 2026-07-31T09:45:00 confirmed 2026-07-31T10:00:00 untested_by_15m
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

### 3. SHORT 15M FVG 7476.00-7480.25 parent 2026-07-31T10:00:00 confirmed 2026-07-31T10:15:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-31T10:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-31T12:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-31T10:50:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-31T10:55:00, 2026-07-31T11:20:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-31T10:55:00. | PASS entry_stop_risk_contract: Entry 7473.25, protected 5M stop 7515.25, risk 42.00 pts. | PASS tactical_targets_from_actual_risk: T1 7410.25 and T2 7389.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7473.00.
- Parent displacement: yes
- Parent displacement candle: 2026-07-31T10:00:00
- Parent failure: 2026-07-31T12:00:00
- First 5M return: 2026-07-31T10:50:00
- 5M wick defense: 2026-07-31T10:55:00, 2026-07-31T11:20:00
- Proof: 2026-07-31T10:55:00
- Entry/stop/risk: 7473.25 / 7515.25 / 42.00 pts
- T1/T2: 7410.25 / 7389.25
- Nearest liquidity: nearest prior low liquidity 7473.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7468.25-7471.75 parent 2026-07-31T10:50:00 confirmed 2026-07-31T10:55:00 status open_untouched
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-31T11:00:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7487.75-7490.00 parent 2026-07-31T09:45:00 confirmed 2026-07-31T10:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7487.75-7490.00 parent 2026-07-31T09:45:00 confirmed 2026-07-31T10:00:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-31T10:50:00; wick 2026-07-31T10:55:00; proof 2026-07-31T10:55:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7427.50 (prior 5M swing low liquidity from 2026-07-31T10:20:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 5m LONG 7468.25-7471.75 parent 2026-07-31T10:50:00 confirmed 2026-07-31T10:55:00 status open_untouched; 60m LONG 7462.50-7468.25 parent 2026-07-30T16:00:00 confirmed 2026-07-30T17:00:00 status partial_touch; 120m LONG 7457.75-7468.25 parent 2026-07-30T16:00:00 confirmed 2026-07-30T17:00:00 status partial_touch; 240m LONG 7457.75-7467.75 parent 2026-07-30T17:00:00 confirmed 2026-07-30T22:00:00 status partial_touch; 5m LONG 7465.25-7465.75 parent 2026-07-31T10:45:00 confirmed 2026-07-31T10:50:00 status open_untouched; 60m LONG 7457.75-7461.25 parent 2026-07-30T15:00:00 confirmed 2026-07-30T16:00:00 status open_untouched; 5m LONG 7452.00-7452.25 parent 2026-07-31T10:30:00 confirmed 2026-07-31T10:35:00 status open_untouched; 60m LONG 7445.75-7450.75 parent 2026-07-30T14:00:00 confirmed 2026-07-30T15:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7473.50-7474.75 parent 2026-05-11T00:20:00 confirmed 2026-05-11T00:25:00 status failed_inverted; 5m SHORT 7473.50-7478.00 parent 2026-06-12T09:35:00 confirmed 2026-06-12T09:40:00 status failed_inverted; 5m LONG 7473.50-7479.75 parent 2026-06-24T10:50:00 confirmed 2026-06-24T10:55:00 status failed_inverted; 15m LONG 7473.50-7476.25 parent 2026-06-24T11:00:00 confirmed 2026-06-24T11:15:00 status failed_inverted; 5m LONG 7473.75-7475.25 parent 2026-06-11T19:45:00 confirmed 2026-06-11T19:50:00 status failed_inverted; 5m LONG 7473.75-7475.25 parent 2026-07-08T06:20:00 confirmed 2026-07-08T06:25:00 status failed_inverted; 5m SHORT 7473.75-7475.50 parent 2026-07-23T08:40:00 confirmed 2026-07-23T08:45:00 status failed_inverted; 15m LONG 7473.75-7476.00 parent 2026-06-07T22:45:00 confirmed 2026-06-07T23:00:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7476.00-7480.25 parent 2026-07-31T10:00:00 confirmed 2026-07-31T10:15:00 status open_untouched; 5m SHORT 7487.75-7493.00 parent 2026-07-31T09:45:00 confirmed 2026-07-31T09:50:00 status open_untouched; 15m SHORT 7487.75-7490.00 parent 2026-07-31T09:45:00 confirmed 2026-07-31T10:00:00 status open_untouched; 5m SHORT 7494.00-7497.75 parent 2026-07-31T09:40:00 confirmed 2026-07-31T09:45:00 status open_untouched; 60m SHORT 7515.25-7518.25 parent 2026-07-27T08:00:00 confirmed 2026-07-27T09:00:00 status partial_touch; 15m SHORT 7519.25-7521.50 parent 2026-07-27T07:15:00 confirmed 2026-07-27T07:30:00 status open_untouched; 5m SHORT 7520.00-7521.50 parent 2026-07-27T07:05:00 confirmed 2026-07-27T07:10:00 status open_untouched; 5m SHORT 7526.00-7528.00 parent 2026-07-23T01:50:00 confirmed 2026-07-23T01:55:00 status partial_touch
- Objective ladder: open_fvg 7468.25 reached 2026-07-31T11:00:00 (5m LONG open FVG open_untouched parent 2026-07-31T10:50:00 confirmed 2026-07-31T10:55:00); open_fvg 7465.25 reached 2026-07-31T11:15:00 (5m LONG open FVG open_untouched parent 2026-07-31T10:45:00 confirmed 2026-07-31T10:50:00); open_fvg 7462.50 reached 2026-07-31T11:25:00 (60m LONG open FVG partial_touch parent 2026-07-30T16:00:00 confirmed 2026-07-30T17:00:00); open_fvg 7457.75 reached 2026-07-31T11:30:00 (120m LONG open FVG partial_touch parent 2026-07-30T16:00:00 confirmed 2026-07-30T17:00:00); open_fvg 7457.75 reached 2026-07-31T11:30:00 (240m LONG open FVG partial_touch parent 2026-07-30T17:00:00 confirmed 2026-07-30T22:00:00); open_fvg 7457.75 reached 2026-07-31T11:30:00 (60m LONG open FVG open_untouched parent 2026-07-30T15:00:00 confirmed 2026-07-30T16:00:00); open_fvg 7452.00 reached 2026-07-31T11:35:00 (5m LONG open FVG open_untouched parent 2026-07-31T10:30:00 confirmed 2026-07-31T10:35:00); open_fvg 7445.75 not reached (60m LONG open FVG open_untouched parent 2026-07-30T14:00:00 confirmed 2026-07-30T15:00:00); liquidity 7427.50 not reached (prior 5M swing low liquidity from 2026-07-31T10:20:00); session_extreme 7427.50 not reached (RTH low liquidity before proof); tactical 7410.25 not reached (T1 1.5R); tactical 7389.25 not reached (T2 2.0R)
- Story: SHORT proof completed at 2026-07-31T10:55:00 from 7476.00-7480.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7468.25-7471.75 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7468.25 open_fvg, 7465.25 open_fvg, 7462.50 open_fvg, 7457.75 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-31T13:30:00, one MES $-210.00
- Managed outcome: Stop at 2026-07-31T13:30:00, exit 7515.25, one MES $-210.00
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-07-31T10:55:00 before later same-zone failure/reversal read at 2026-07-31T12:00:00. Review the defended continuation before labeling this zone as failure/reversal.

### 4. SHORT 15M FVG 7456.75-7466.50 parent 2026-07-31T10:15:00 confirmed 2026-07-31T10:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-31T10:15:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-31T10:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-31T10:30:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-31T10:35:00, 2026-07-31T11:20:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-31T10:35:00. | PASS entry_stop_risk_contract: Entry 7456.00, protected 5M stop 7480.00, risk 24.00 pts. | PASS tactical_targets_from_actual_risk: T1 7420.00 and T2 7408.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7455.75.
- Parent displacement: yes
- Parent displacement candle: 2026-07-31T10:15:00
- Parent failure: 2026-07-31T10:45:00
- First 5M return: 2026-07-31T10:30:00
- 5M wick defense: 2026-07-31T10:35:00, 2026-07-31T11:20:00
- Proof: 2026-07-31T10:35:00
- Entry/stop/risk: 7456.00 / 7480.00 / 24.00 pts
- T1/T2: 7420.00 / 7408.00
- Nearest liquidity: nearest prior low liquidity 7455.75
- Defended-area / obstacle management callout before or near T1: 5m LONG 7452.00-7452.25 parent 2026-07-31T10:30:00 confirmed 2026-07-31T10:35:00 status open_untouched
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-31T11:35:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7487.75-7490.00 parent 2026-07-31T09:45:00 confirmed 2026-07-31T10:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7487.75-7490.00 parent 2026-07-31T09:45:00 confirmed 2026-07-31T10:00:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-31T10:30:00; wick 2026-07-31T10:35:00; proof 2026-07-31T10:35:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7427.50 (prior 5M swing low liquidity from 2026-07-31T10:20:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 5m LONG 7452.00-7452.25 parent 2026-07-31T10:30:00 confirmed 2026-07-31T10:35:00 status open_untouched; 60m LONG 7445.75-7450.75 parent 2026-07-30T14:00:00 confirmed 2026-07-30T15:00:00 status open_untouched; 120m LONG 7446.50-7450.75 parent 2026-07-30T14:00:00 confirmed 2026-07-30T16:00:00 status open_untouched; 240m LONG 7440.00-7450.75 parent 2026-07-30T14:00:00 confirmed 2026-07-30T17:00:00 status open_untouched; 60m LONG 7429.75-7443.50 parent 2026-07-30T13:00:00 confirmed 2026-07-30T14:00:00 status open_untouched; 15m LONG 7414.50-7416.25 parent 2026-07-30T11:45:00 confirmed 2026-07-30T12:00:00 status open_untouched; 240m LONG 7388.00-7398.75 parent 2026-07-30T10:00:00 confirmed 2026-07-30T14:00:00 status open_untouched; 60m LONG 7392.25-7392.75 parent 2026-07-30T08:00:00 confirmed 2026-07-30T09:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7456.25-7456.75 parent 2026-05-07T01:35:00 confirmed 2026-05-07T01:40:00 status failed_inverted; 5m LONG 7456.25-7457.25 parent 2026-07-24T03:20:00 confirmed 2026-07-24T03:25:00 status failed_inverted; 15m SHORT 7456.25-7459.00 parent 2026-06-08T01:45:00 confirmed 2026-06-08T02:00:00 status failed_inverted; 15m LONG 7456.25-7462.25 parent 2026-06-11T15:30:00 confirmed 2026-06-11T15:45:00 status failed_inverted; 120m LONG 7456.25-7459.00 parent 2026-05-20T06:00:00 confirmed 2026-05-20T08:00:00 status failed_inverted; 5m LONG 7456.50-7456.75 parent 2026-05-07T00:50:00 confirmed 2026-05-07T00:55:00 status failed_inverted; 5m LONG 7456.50-7459.25 parent 2026-06-29T06:30:00 confirmed 2026-06-29T06:35:00 status failed_inverted; 5m SHORT 7456.50-7458.75 parent 2026-07-24T08:45:00 confirmed 2026-07-24T08:50:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7456.75-7466.50 parent 2026-07-31T10:15:00 confirmed 2026-07-31T10:30:00 status open_untouched; 60m LONG 7457.75-7461.25 parent 2026-07-30T15:00:00 confirmed 2026-07-30T16:00:00 status open_untouched; 120m LONG 7457.75-7468.25 parent 2026-07-30T16:00:00 confirmed 2026-07-30T17:00:00 status partial_touch; 240m LONG 7457.75-7467.75 parent 2026-07-30T17:00:00 confirmed 2026-07-30T22:00:00 status partial_touch; 5m SHORT 7459.00-7468.25 parent 2026-07-31T10:05:00 confirmed 2026-07-31T10:10:00 status partial_touch; 60m LONG 7462.50-7468.25 parent 2026-07-30T16:00:00 confirmed 2026-07-30T17:00:00 status partial_touch; 15m SHORT 7476.00-7480.25 parent 2026-07-31T10:00:00 confirmed 2026-07-31T10:15:00 status open_untouched; 5m SHORT 7478.25-7480.25 parent 2026-07-31T09:50:00 confirmed 2026-07-31T09:55:00 status partial_touch
- Objective ladder: open_fvg 7452.00 reached 2026-07-31T11:35:00 (5m LONG open FVG open_untouched parent 2026-07-31T10:30:00 confirmed 2026-07-31T10:35:00); open_fvg 7446.50 not reached (120m LONG open FVG open_untouched parent 2026-07-30T14:00:00 confirmed 2026-07-30T16:00:00); open_fvg 7445.75 not reached (60m LONG open FVG open_untouched parent 2026-07-30T14:00:00 confirmed 2026-07-30T15:00:00); open_fvg 7440.00 not reached (240m LONG open FVG open_untouched parent 2026-07-30T14:00:00 confirmed 2026-07-30T17:00:00); open_fvg 7429.75 not reached (60m LONG open FVG open_untouched parent 2026-07-30T13:00:00 confirmed 2026-07-30T14:00:00); liquidity 7427.50 not reached (prior 5M swing low liquidity from 2026-07-31T10:20:00); session_extreme 7427.50 not reached (RTH low liquidity before proof); tactical 7420.00 not reached (T1 1.5R); open_fvg 7414.50 not reached (15m LONG open FVG open_untouched parent 2026-07-30T11:45:00 confirmed 2026-07-30T12:00:00); tactical 7408.00 not reached (T2 2.0R); open_fvg 7392.25 not reached (60m LONG open FVG open_untouched parent 2026-07-30T08:00:00 confirmed 2026-07-30T09:00:00); open_fvg 7388.00 not reached (240m LONG open FVG open_untouched parent 2026-07-30T10:00:00 confirmed 2026-07-30T14:00:00)
- Story: SHORT proof completed at 2026-07-31T10:35:00 from 7456.75-7466.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7452.00-7452.25 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7452.00 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-31T10:55:00, one MES $-120.00
- Managed outcome: Stop at 2026-07-31T10:55:00, exit 7480.00, one MES $-120.00
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-07-31T10:35:00 before later same-zone failure/reversal read at 2026-07-31T10:45:00. Review the defended continuation before labeling this zone as failure/reversal.

### 5. LONG 15M FVG 7456.75-7465.75 parent 2026-07-31T10:45:00 confirmed 2026-07-31T11:00:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-31T10:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-31T11:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-31T11:10:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-31T11:15:00, 2026-07-31T11:35:00, 2026-07-31T11:45:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-31T11:15:00. | PASS entry_stop_risk_contract: Entry 7473.25, protected 5M stop 7427.50, risk 45.75 pts. | PASS tactical_targets_from_actual_risk: T1 7542.00 and T2 7564.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7473.50.
- Parent displacement: yes
- Parent displacement candle: 2026-07-31T10:30:00
- Parent failure: 2026-07-31T11:30:00
- First 5M return: 2026-07-31T11:10:00
- 5M wick defense: 2026-07-31T11:15:00, 2026-07-31T11:35:00, 2026-07-31T11:45:00
- Proof: 2026-07-31T11:15:00
- Entry/stop/risk: 7473.25 / 7427.50 / 45.75 pts
- T1/T2: 7542.00 / 7564.75
- Nearest liquidity: nearest prior high liquidity 7473.50
- Defended-area / obstacle management callout before or near T1: 5m LONG 7473.50-7474.75 parent 2026-05-11T00:20:00 confirmed 2026-05-11T00:25:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-31T11:20:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: final_deepest_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7487.00-7490.00 parent 2026-07-31T09:15:00 confirmed 2026-07-31T09:30:00 failed_acceptance_through_15m failed 2026-07-31T09:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7456.75-7465.75 parent 2026-07-31T10:45:00 confirmed 2026-07-31T11:00:00 defended_on_15m defended 2026-07-31T11:15:00 failed 2026-07-31T11:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-31T11:10:00; wick 2026-07-31T11:15:00; proof 2026-07-31T11:15:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7515.25 (prior 5M swing high liquidity from 2026-07-31T09:35:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 120m LONG 7457.75-7468.25 parent 2026-07-30T16:00:00 confirmed 2026-07-30T17:00:00 status partial_touch; 240m LONG 7457.75-7467.75 parent 2026-07-30T17:00:00 confirmed 2026-07-30T22:00:00 status partial_touch; 15m LONG 7456.75-7465.75 parent 2026-07-31T10:45:00 confirmed 2026-07-31T11:00:00 status partial_touch; 5m LONG 7452.00-7452.25 parent 2026-07-31T10:30:00 confirmed 2026-07-31T10:35:00 status open_untouched; 120m LONG 7446.50-7450.75 parent 2026-07-30T14:00:00 confirmed 2026-07-30T16:00:00 status open_untouched; 240m LONG 7440.00-7450.75 parent 2026-07-30T14:00:00 confirmed 2026-07-30T17:00:00 status open_untouched; 15m LONG 7414.50-7416.25 parent 2026-07-30T11:45:00 confirmed 2026-07-30T12:00:00 status open_untouched; 240m LONG 7388.00-7398.75 parent 2026-07-30T10:00:00 confirmed 2026-07-30T14:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7473.50-7474.75 parent 2026-05-11T00:20:00 confirmed 2026-05-11T00:25:00 status failed_inverted; 5m SHORT 7473.50-7478.00 parent 2026-06-12T09:35:00 confirmed 2026-06-12T09:40:00 status failed_inverted; 5m LONG 7473.50-7479.75 parent 2026-06-24T10:50:00 confirmed 2026-06-24T10:55:00 status failed_inverted; 15m LONG 7473.50-7476.25 parent 2026-06-24T11:00:00 confirmed 2026-06-24T11:15:00 status failed_inverted; 5m LONG 7473.75-7475.25 parent 2026-06-11T19:45:00 confirmed 2026-06-11T19:50:00 status failed_inverted; 5m LONG 7473.75-7475.25 parent 2026-07-08T06:20:00 confirmed 2026-07-08T06:25:00 status failed_inverted; 5m SHORT 7473.75-7475.50 parent 2026-07-23T08:40:00 confirmed 2026-07-23T08:45:00 status failed_inverted; 15m LONG 7473.75-7476.00 parent 2026-06-07T22:45:00 confirmed 2026-06-07T23:00:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7487.75-7493.00 parent 2026-07-31T09:45:00 confirmed 2026-07-31T09:50:00 status open_untouched; 15m SHORT 7487.75-7490.00 parent 2026-07-31T09:45:00 confirmed 2026-07-31T10:00:00 status open_untouched; 5m SHORT 7494.00-7497.75 parent 2026-07-31T09:40:00 confirmed 2026-07-31T09:45:00 status open_untouched; 60m SHORT 7515.25-7518.25 parent 2026-07-27T08:00:00 confirmed 2026-07-27T09:00:00 status partial_touch; 15m SHORT 7519.25-7521.50 parent 2026-07-27T07:15:00 confirmed 2026-07-27T07:30:00 status open_untouched; 5m SHORT 7520.00-7521.50 parent 2026-07-27T07:05:00 confirmed 2026-07-27T07:10:00 status open_untouched; 5m SHORT 7526.00-7528.00 parent 2026-07-23T01:50:00 confirmed 2026-07-23T01:55:00 status partial_touch; 15m SHORT 7526.50-7528.00 parent 2026-07-23T02:00:00 confirmed 2026-07-23T02:15:00 status partial_touch
- Objective ladder: liquidity 7481.25 reached 2026-07-31T11:20:00 (prior 5M swing high liquidity from 2026-07-31T10:55:00); open_fvg 7490.00 not reached (15m SHORT open FVG open_untouched parent 2026-07-31T09:45:00 confirmed 2026-07-31T10:00:00); open_fvg 7493.00 not reached (5m SHORT open FVG open_untouched parent 2026-07-31T09:45:00 confirmed 2026-07-31T09:50:00); open_fvg 7497.75 not reached (5m SHORT open FVG open_untouched parent 2026-07-31T09:40:00 confirmed 2026-07-31T09:45:00); liquidity 7515.25 not reached (prior 5M swing high liquidity from 2026-07-31T09:35:00); session_extreme 7515.25 not reached (RTH high liquidity before proof); open_fvg 7518.25 not reached (60m SHORT open FVG partial_touch parent 2026-07-27T08:00:00 confirmed 2026-07-27T09:00:00); open_fvg 7521.50 not reached (15m SHORT open FVG open_untouched parent 2026-07-27T07:15:00 confirmed 2026-07-27T07:30:00); open_fvg 7521.50 not reached (5m SHORT open FVG open_untouched parent 2026-07-27T07:05:00 confirmed 2026-07-27T07:10:00); open_fvg 7528.00 not reached (5m SHORT open FVG partial_touch parent 2026-07-23T01:50:00 confirmed 2026-07-23T01:55:00); open_fvg 7528.00 not reached (15m SHORT open FVG partial_touch parent 2026-07-23T02:00:00 confirmed 2026-07-23T02:15:00); tactical 7542.00 not reached (T1 1.5R); tactical 7564.75 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-07-31T11:15:00 from 7456.75-7465.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7473.50-7474.75 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7481.25 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-07-31T17:00:00, one MES +$146.25
- Managed outcome: LQ1 at 2026-07-31T13:30:00, exit 7515.25, one MES +$210.00
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-31T11:15:00 before later same-zone failure/reversal read at 2026-07-31T11:30:00. Review the defended continuation before labeling this zone as failure/reversal.
