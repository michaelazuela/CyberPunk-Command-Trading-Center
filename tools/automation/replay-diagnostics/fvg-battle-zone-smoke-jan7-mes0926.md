# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-07 / lunch (2026-01-07T12:00:00 to 2026-01-07T16:00:00)
Context window: 120 days (2025-09-09T00:00:00 to 2026-01-07T23:59:59)

## Coverage
- 5m: 13328 bars (2025-10-28T18:05:00 to 2026-01-07T23:55:00)
- 15m: 4442 bars (2025-10-28T18:15:00 to 2026-01-07T23:45:00)
- 60m: 1082 bars (2025-10-28T19:00:00 to 2026-01-07T23:00:00)
- 120m: 564 bars (2025-10-28T20:00:00 to 2026-01-07T22:00:00)
- 240m: 282 bars (2025-10-28T22:00:00 to 2026-01-07T22:00:00)

## Research Tags
- none

## Research Rules
- FvgBattleZoneInventory (research_only_supporting_rule): Track only the first same-side 15M FVG reaction zone and the final/deepest same-side 15M FVG battle zone from the active displacement leg. The selected 15M battle zone must then be defended on completed 5M candles before any entry model can use it.
  - Required facts: 15M-only inventory for this research rule. | Same-side 15M displacement leg creates the candidate FVG stack. | First same-side 15M FVG is the first reaction zone. | Final/deepest same-side 15M FVG is the structure survival battle zone if the first zone fails. | 5M confirms only after price returns into the selected 15M battle zone and rejects it.
  - Invalidation: Every 15M FVG is tagged as equal importance. | Middle-zone clutter is promoted over first reaction or final/deepest battle-zone roles. | 5M confirmation is used before the 15M battle zone is selected. | The selected 15M battle zone accepts through against the intended direction.
  - Standalone trigger: no
- FvgBalancedPathContinuation (research_only_supporting_rule): If price breaks out of a balanced/rebalanced range and no defended opposing FVG appears before the next real-liquidity or open-FVG objective, the move can travel cleanly through that path. This supports continuation and runner management after a valid FVG proof already exists.
  - Required facts: 15M parent FVG setup is valid. | Completed 5M wick-defense/proof exists. | Nearest protected 5M structure stop is known. | Objective ladder has a real liquidity or open-FVG objective ahead. | No opposing FVG/HTF obstacle defends before that objective.
  - Invalidation: Used without 15M parent FVG plus completed 5M proof. | Opposing FVG/HTF obstacle defends before the objective. | The objective was already reached before entry. | Balanced path is treated as a standalone trigger.
  - Standalone trigger: no

## FVG Inventory At Session Start
- Open below: 5m LONG 7104.50-7110.75 created 2026-01-07T11:50:00 status partial_touch; 15m LONG 7107.00-7110.00 created 2026-01-07T12:00:00 status open_untouched; 240m LONG 7082.75-7097.50 created 2026-01-06T17:00:00 status partial_touch; 60m LONG 7075.75-7086.25 created 2026-01-06T14:00:00 status open_untouched; 15m LONG 7080.25-7084.00 created 2026-01-06T12:45:00 status open_untouched; 5m LONG 7082.00-7083.75 created 2026-01-06T12:30:00 status open_untouched; 5m LONG 7080.25-7080.75 created 2026-01-06T12:25:00 status open_untouched; 15m LONG 7075.75-7078.75 created 2026-01-06T12:30:00 status open_untouched; 5m LONG 7075.00-7077.75 created 2026-01-06T12:15:00 status open_untouched; 60m LONG 7062.00-7067.25 created 2026-01-06T11:00:00 status partial_touch
- Failed above: 5m SHORT 7115.50-7116.25 created 2025-10-29T08:30:00 status failed_inverted; 5m LONG 7115.75-7116.50 created 2025-10-29T22:20:00 status failed_inverted; 5m LONG 7116.25-7116.50 created 2025-10-29T03:45:00 status failed_inverted; 15m LONG 7116.25-7117.50 created 2025-10-29T07:45:00 status failed_inverted; 5m SHORT 7116.50-7117.25 created 2025-10-29T08:05:00 status failed_inverted; 5m LONG 7116.75-7119.00 created 2025-10-29T23:10:00 status failed_inverted; 5m SHORT 7117.50-7118.25 created 2025-10-29T08:00:00 status failed_inverted; 5m SHORT 7118.75-7119.25 created 2025-10-29T07:55:00 status failed_inverted; 5m LONG 7119.25-7119.75 created 2025-10-29T07:40:00 status failed_inverted; 15m LONG 7119.75-7120.50 created 2025-10-29T23:30:00 status failed_inverted
- Open above: 5m SHORT 7115.50-7118.00 created 2025-10-30T00:10:00 status open_untouched

## Trace Rows

### 1. LONG 15M FVG 7107.00-7110.00 created 2026-01-07T12:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-07T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-07T13:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-07T13:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-07T13:50:00, 2026-01-07T14:05:00. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-07T11:45:00
- Parent failure: 2026-01-07T13:30:00
- First 5M return: 2026-01-07T13:45:00
- 5M wick defense: 2026-01-07T13:50:00, 2026-01-07T14:05:00
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg LONG 7096.50-7097.75 created 2026-01-07T08:45:00 failed_acceptance_through_15m defended 2026-01-07T09:15:00 failed 2026-01-07T10:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7096.50-7097.75 created 2026-01-07T08:45:00 failed_acceptance_through_15m defended 2026-01-07T09:15:00 failed 2026-01-07T10:15:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No completed 5M continuation close away from the failed FVG zone was found after the return. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 2. LONG 15M FVG 7112.25-7114.25 created 2026-01-07T12:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-07T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-07T13:00:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-07T11:45:00
- Parent failure: 2026-01-07T13:00:00
- First 5M return: not found
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg LONG 7096.50-7097.75 created 2026-01-07T08:45:00 failed_acceptance_through_15m defended 2026-01-07T09:15:00 failed 2026-01-07T10:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7096.50-7097.75 created 2026-01-07T08:45:00 failed_acceptance_through_15m defended 2026-01-07T09:15:00 failed 2026-01-07T10:15:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 3. SHORT 15M FVG 7109.75-7113.00 created 2026-01-07T13:15:00
- Verdict: valid_trace_candidate
- Continuation read: balanced_path_to_liquidity_valid
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-07T13:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-07T13:55:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-07T13:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-07T13:55:00. | PASS entry_stop_risk_contract: Entry 7109.50, protected 5M stop 7118.00, risk 8.50 pts. | PASS tactical_targets_from_actual_risk: T1 7096.75 and T2 7092.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7109.25.
- Parent displacement: yes
- Parent displacement candle: 2026-01-07T13:00:00
- Parent failure: not found
- First 5M return: 2026-01-07T13:55:00
- 5M wick defense: 2026-01-07T13:55:00
- Proof: 2026-01-07T13:55:00
- Entry/stop/risk: 7109.50 / 7118.00 / 8.50 pts
- T1/T2: 7096.75 / 7092.50
- Nearest liquidity: nearest prior low liquidity 7109.25
- Opposing FVG obstacle before T1: 5m LONG 7108.25-7108.50 created 2026-01-07T13:55:00 status open_untouched
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-07T14:00:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: final_deepest_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7095.75-7097.00 created 2026-01-07T02:00:00 failed_acceptance_through_15m defended 2026-01-07T02:15:00 failed 2026-01-07T08:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7109.75-7113.00 created 2026-01-07T13:15:00 defended_on_15m defended 2026-01-07T14:00:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-01-07T13:55:00; wick 2026-01-07T13:55:00; proof 2026-01-07T13:55:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7099.75 (prior 5M swing low liquidity from 2026-01-07T13:30:00)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no opposing FVG defended before delivery.
- Open FVGs below at proof: 5m LONG 7108.25-7108.50 created 2026-01-07T13:55:00 status open_untouched; 60m LONG 7107.25-7107.50 created 2026-01-07T13:00:00 status open_untouched; 240m LONG 7082.75-7097.50 created 2026-01-06T17:00:00 status partial_touch; 60m LONG 7075.75-7086.25 created 2026-01-06T14:00:00 status open_untouched; 15m LONG 7080.25-7084.00 created 2026-01-06T12:45:00 status open_untouched; 5m LONG 7082.00-7083.75 created 2026-01-06T12:30:00 status open_untouched; 5m LONG 7080.25-7080.75 created 2026-01-06T12:25:00 status open_untouched; 15m LONG 7075.75-7078.75 created 2026-01-06T12:30:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7109.75-7110.00 created 2025-10-28T23:45:00 status failed_inverted; 5m LONG 7109.75-7110.25 created 2025-10-29T22:10:00 status failed_inverted; 5m SHORT 7110.00-7110.75 created 2025-10-29T05:00:00 status failed_inverted; 60m SHORT 7110.25-7111.75 created 2025-10-29T06:00:00 status failed_inverted; 5m LONG 7110.50-7111.00 created 2025-10-28T22:55:00 status failed_inverted; 5m LONG 7110.50-7111.25 created 2025-10-29T06:25:00 status failed_inverted; 5m SHORT 7110.75-7111.25 created 2025-10-29T11:35:00 status failed_inverted; 5m LONG 7111.25-7111.75 created 2025-10-29T06:30:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7109.75-7113.00 created 2026-01-07T13:15:00 status open_untouched; 5m SHORT 7112.00-7113.00 created 2026-01-07T13:00:00 status open_untouched; 5m SHORT 7113.75-7114.25 created 2026-01-07T12:55:00 status open_untouched
- Objective ladder: open_fvg 7108.25 reached 2026-01-07T14:00:00 (5m LONG open FVG open_untouched created 2026-01-07T13:55:00); open_fvg 7107.25 reached 2026-01-07T14:00:00 (60m LONG open FVG open_untouched created 2026-01-07T13:00:00); liquidity 7099.75 reached 2026-01-07T14:15:00 (prior 5M swing low liquidity from 2026-01-07T13:30:00); liquidity 7098.75 reached 2026-01-07T14:15:00 (prior 5M swing low liquidity from 2026-01-07T11:30:00); tactical 7096.75 reached 2026-01-07T14:15:00 (T1 1.5R); liquidity 7096.75 reached 2026-01-07T14:15:00 (prior 5M swing low liquidity from 2026-01-07T09:35:00); tactical 7092.50 reached 2026-01-07T15:15:00 (T2 2.0R); liquidity 7090.50 reached 2026-01-07T15:15:00 (prior 5M swing low liquidity from 2026-01-07T10:25:00); liquidity 7089.00 reached 2026-01-07T15:15:00 (prior 5M swing low liquidity from 2026-01-07T10:40:00); session_extreme 7089.00 reached 2026-01-07T15:15:00 (RTH low liquidity before proof); open_fvg 7082.75 reached 2026-01-07T15:30:00 (240m LONG open FVG partial_touch created 2026-01-06T17:00:00); open_fvg 7082.00 reached 2026-01-07T15:30:00 (5m LONG open FVG open_untouched created 2026-01-06T12:30:00); open_fvg 7080.25 reached 2026-01-07T15:30:00 (15m LONG open FVG open_untouched created 2026-01-06T12:45:00); open_fvg 7080.25 reached 2026-01-07T15:30:00 (5m LONG open FVG open_untouched created 2026-01-06T12:25:00)
- Story: SHORT proof completed at 2026-01-07T13:55:00 from 7109.75-7113.00. 11 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7108.25-7108.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7108.25 open_fvg, 7107.25 open_fvg, 7099.75 liquidity, 7098.75 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-07T14:15:00, one MES +$63.75
- Managed outcome: LQ1 at 2026-01-07T14:15:00, exit 7099.75, one MES +$48.75
- Reasons: No 15M acceptance through the parent FVG was found inside this session window.

### 4. SHORT 15M FVG 7100.00-7105.50 created 2026-01-07T14:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-07T14:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-07T14:35:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-07T14:40:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-07T14:45:00. | PASS entry_stop_risk_contract: Entry 7099.00, protected 5M stop 7111.00, risk 12.00 pts. | PASS tactical_targets_from_actual_risk: T1 7081.00 and T2 7075.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7098.75.
- Parent displacement: yes
- Parent displacement candle: 2026-01-07T14:15:00
- Parent failure: not found
- First 5M return: 2026-01-07T14:35:00
- 5M wick defense: 2026-01-07T14:40:00
- Proof: 2026-01-07T14:45:00
- Entry/stop/risk: 7099.00 / 7111.00 / 12.00 pts
- T1/T2: 7081.00 / 7075.00
- Nearest liquidity: nearest prior low liquidity 7098.75
- Opposing FVG obstacle before T1: 240m LONG 7082.75-7097.50 created 2026-01-06T17:00:00 status partial_touch
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-07T14:55:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7095.75-7097.00 created 2026-01-07T02:00:00 failed_acceptance_through_15m defended 2026-01-07T02:15:00 failed 2026-01-07T08:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7109.75-7113.00 created 2026-01-07T13:15:00 defended_on_15m defended 2026-01-07T14:00:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: 7094.00 (prior 5M swing low liquidity from 2026-01-07T14:20:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 240m LONG 7082.75-7097.50 created 2026-01-06T17:00:00 status partial_touch; 60m LONG 7075.75-7086.25 created 2026-01-06T14:00:00 status open_untouched; 15m LONG 7080.25-7084.00 created 2026-01-06T12:45:00 status open_untouched; 5m LONG 7082.00-7083.75 created 2026-01-06T12:30:00 status open_untouched; 5m LONG 7080.25-7080.75 created 2026-01-06T12:25:00 status open_untouched; 15m LONG 7075.75-7078.75 created 2026-01-06T12:30:00 status open_untouched; 5m LONG 7075.00-7077.75 created 2026-01-06T12:15:00 status open_untouched; 60m LONG 7062.00-7067.25 created 2026-01-06T11:00:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7099.25-7103.00 created 2025-10-30T01:35:00 status failed_inverted; 5m LONG 7099.50-7099.75 created 2025-12-25T19:15:00 status failed_inverted; 5m LONG 7099.50-7100.25 created 2026-01-06T14:20:00 status failed_inverted; 5m SHORT 7099.50-7100.25 created 2026-01-06T23:05:00 status failed_inverted; 5m SHORT 7099.75-7100.00 created 2025-10-28T20:10:00 status failed_inverted; 5m SHORT 7099.75-7101.50 created 2026-01-07T09:10:00 status failed_inverted; 5m SHORT 7100.00-7101.50 created 2025-12-26T10:00:00 status failed_inverted; 15m SHORT 7100.00-7101.75 created 2025-10-28T19:00:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7100.00-7102.25 created 2026-01-07T14:20:00 status partial_touch; 15m SHORT 7100.00-7105.50 created 2026-01-07T14:30:00 status partial_touch; 5m SHORT 7103.50-7105.50 created 2026-01-07T14:15:00 status open_untouched; 15m SHORT 7109.75-7113.00 created 2026-01-07T13:15:00 status partial_touch; 5m SHORT 7112.00-7113.00 created 2026-01-07T13:00:00 status open_untouched; 5m SHORT 7113.75-7114.25 created 2026-01-07T12:55:00 status open_untouched
- Objective ladder: liquidity 7098.75 reached 2026-01-07T14:50:00 (prior 5M swing low liquidity from 2026-01-07T11:30:00); liquidity 7096.75 reached 2026-01-07T14:55:00 (prior 5M swing low liquidity from 2026-01-07T09:35:00); liquidity 7094.00 reached 2026-01-07T15:10:00 (prior 5M swing low liquidity from 2026-01-07T14:20:00); liquidity 7090.50 reached 2026-01-07T15:15:00 (prior 5M swing low liquidity from 2026-01-07T10:25:00); liquidity 7089.00 reached 2026-01-07T15:15:00 (prior 5M swing low liquidity from 2026-01-07T10:40:00); session_extreme 7089.00 reached 2026-01-07T15:15:00 (RTH low liquidity before proof); open_fvg 7082.75 reached 2026-01-07T15:30:00 (240m LONG open FVG partial_touch created 2026-01-06T17:00:00); open_fvg 7082.00 reached 2026-01-07T15:30:00 (5m LONG open FVG open_untouched created 2026-01-06T12:30:00); tactical 7081.00 reached 2026-01-07T15:30:00 (T1 1.5R); open_fvg 7080.25 reached 2026-01-07T15:30:00 (15m LONG open FVG open_untouched created 2026-01-06T12:45:00); open_fvg 7080.25 reached 2026-01-07T15:30:00 (5m LONG open FVG open_untouched created 2026-01-06T12:25:00); open_fvg 7075.75 reached 2026-01-07T15:40:00 (60m LONG open FVG open_untouched created 2026-01-06T14:00:00); open_fvg 7075.75 reached 2026-01-07T15:40:00 (15m LONG open FVG open_untouched created 2026-01-06T12:30:00); tactical 7075.00 reached 2026-01-07T15:40:00 (T2 2.0R)
- Story: SHORT proof completed at 2026-01-07T14:45:00 from 7100.00-7105.50. 14 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 240m 7082.75-7097.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7098.75 liquidity, 7096.75 liquidity, 7094.00 liquidity, 7090.50 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-07T15:30:00, one MES +$90.00
- Managed outcome: LQ1 at 2026-01-07T15:10:00, exit 7094.00, one MES +$25.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 5. SHORT 15M FVG 7090.50-7096.75 created 2026-01-07T15:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-07T15:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-07T15:15:00
- Parent failure: not found
- First 5M return: not found
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7095.75-7097.00 created 2026-01-07T02:00:00 failed_acceptance_through_15m defended 2026-01-07T02:15:00 failed 2026-01-07T08:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7109.75-7113.00 created 2026-01-07T13:15:00 defended_on_15m defended 2026-01-07T14:00:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 6. SHORT 15M FVG 7083.00-7086.50 created 2026-01-07T15:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-07T15:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-07T15:15:00
- Parent failure: not found
- First 5M return: not found
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7095.75-7097.00 created 2026-01-07T02:00:00 failed_acceptance_through_15m defended 2026-01-07T02:15:00 failed 2026-01-07T08:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7109.75-7113.00 created 2026-01-07T13:15:00 defended_on_15m defended 2026-01-07T14:00:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 7. SHORT 15M FVG 7079.00-7080.25 created 2026-01-07T16:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-07T15:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-07T15:45:00
- Parent failure: not found
- First 5M return: not found
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7095.75-7097.00 created 2026-01-07T02:00:00 failed_acceptance_through_15m defended 2026-01-07T02:15:00 failed 2026-01-07T08:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7109.75-7113.00 created 2026-01-07T13:15:00 defended_on_15m defended 2026-01-07T14:00:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.
