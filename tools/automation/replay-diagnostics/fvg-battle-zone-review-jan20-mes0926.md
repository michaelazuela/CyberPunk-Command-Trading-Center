# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-20 / full-rth (2026-01-20T09:15:00 to 2026-01-20T16:00:00)
Context window: 120 days (2025-09-22T00:00:00 to 2026-01-20T23:59:59)

## Human Locked Correction - Jan 20
- Keep row 4 as the valid management short: 13:05 SHORT, entry 6979.25, stop 7002.00, T1 6945.25 hit, T2 6933.75 not hit. Label: `valid_management_short_t1_only`.
- Reject row 6 as a trade lesson: 14:05 SHORT, entry 6956.50, stop 6981.00, T1 6919.75 not hit, T2 6907.50 not hit. Price later reversed into the stop path. Label: `rejected_no_t1_later_stop_path`.
- Do not carry row 6 forward as a valid short, management continuation, or profitable model example. Touching an intermediate objective or session-close mark is not enough when tactical T1 is not reached and the defended opposing FVG/reversal path invalidates continuation.
- Correct rule lesson: if a short reaches an opposing/defended FVG area before T1 and T1 never trades, the row becomes obstacle-defense evidence, not a valid continuation trade.

## Coverage
- 5m: 15764 bars (2025-10-28T18:05:00 to 2026-01-20T23:55:00)
- 15m: 5254 bars (2025-10-28T18:15:00 to 2026-01-20T23:45:00)
- 60m: 1285 bars (2025-10-28T19:00:00 to 2026-01-20T23:00:00)
- 120m: 670 bars (2025-10-28T20:00:00 to 2026-01-20T22:00:00)
- 240m: 335 bars (2025-10-28T22:00:00 to 2026-01-20T22:00:00)

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
- Open below: 60m LONG 6953.50-6979.50 created 2025-12-19T11:00:00 status partial_touch; 5m LONG 6973.00-6973.25 created 2026-01-20T05:25:00 status partial_touch; 15m LONG 6973.00-6973.25 created 2026-01-20T05:45:00 status partial_touch; 5m LONG 6966.75-6971.50 created 2026-01-20T05:20:00 status open_untouched; 15m LONG 6968.00-6971.50 created 2026-01-20T05:30:00 status open_untouched; 15m LONG 6953.25-6958.50 created 2025-12-19T09:45:00 status open_untouched; 15m LONG 6940.25-6949.00 created 2025-12-19T02:30:00 status partial_touch; 5m LONG 6940.25-6946.50 created 2025-12-19T02:10:00 status partial_touch; 15m LONG 6923.00-6940.50 created 2025-12-18T09:00:00 status partial_touch; 5m LONG 6939.25-6940.00 created 2025-12-19T02:05:00 status open_untouched
- Failed above: 5m LONG 6982.00-6984.25 created 2025-11-06T03:55:00 status failed_inverted; 5m LONG 6982.00-6987.25 created 2025-11-10T12:10:00 status failed_inverted; 5m SHORT 6982.00-6983.50 created 2025-11-26T10:05:00 status failed_inverted; 5m LONG 6982.00-6983.25 created 2025-12-16T07:00:00 status failed_inverted; 15m LONG 6982.00-6984.75 created 2025-11-06T04:15:00 status failed_inverted; 60m LONG 6982.00-6987.50 created 2025-12-17T06:00:00 status failed_inverted; 120m LONG 6982.00-6989.00 created 2025-12-17T08:00:00 status failed_inverted; 5m SHORT 6982.25-6984.25 created 2025-11-04T07:10:00 status failed_inverted; 5m LONG 6982.75-6985.00 created 2025-11-04T03:30:00 status failed_inverted; 15m LONG 6982.75-6983.00 created 2025-11-10T04:15:00 status failed_inverted
- Open above: 5m SHORT 6985.00-6990.00 created 2026-01-20T08:40:00 status partial_touch; 15m SHORT 6985.50-6987.50 created 2026-01-20T09:00:00 status open_untouched; 5m SHORT 6991.00-6992.00 created 2026-01-20T08:35:00 status open_untouched; 5m SHORT 7002.00-7003.00 created 2026-01-20T01:35:00 status partial_touch; 15m SHORT 7002.00-7010.50 created 2026-01-20T01:45:00 status partial_touch; 60m SHORT 7002.25-7014.50 created 2026-01-20T03:00:00 status open_untouched; 120m SHORT 7002.25-7014.25 created 2026-01-20T04:00:00 status open_untouched; 240m SHORT 7002.25-7008.75 created 2026-01-20T06:00:00 status open_untouched; 5m SHORT 7004.50-7005.00 created 2026-01-20T01:30:00 status open_untouched; 5m SHORT 7005.75-7010.50 created 2026-01-20T01:25:00 status open_untouched

## Trace Rows

### 1. LONG 15M FVG 6986.00-6987.75 created 2026-01-20T10:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-20T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-20T12:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-20T12:45:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-20T09:45:00
- Parent failure: 2026-01-20T12:45:00
- First 5M return: 2026-01-20T12:45:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg LONG 6968.00-6971.50 created 2026-01-20T05:30:00 failed_acceptance_through_15m defended 2026-01-20T13:30:00 failed 2026-01-20T13:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 6968.00-6971.50 created 2026-01-20T05:30:00 failed_acceptance_through_15m defended 2026-01-20T13:30:00 failed 2026-01-20T13:45:00
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
- Reasons: No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 2. LONG 15M FVG 6992.75-7006.25 created 2026-01-20T10:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-20T10:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-20T12:45:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-20T10:30:00
- Parent failure: 2026-01-20T12:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 6968.00-6971.50 created 2026-01-20T05:30:00 failed_acceptance_through_15m defended 2026-01-20T13:30:00 failed 2026-01-20T13:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 6968.00-6971.50 created 2026-01-20T05:30:00 failed_acceptance_through_15m defended 2026-01-20T13:30:00 failed 2026-01-20T13:45:00
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

### 3. SHORT 15M FVG 6993.50-6995.50 created 2026-01-20T12:45:00
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
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7012.00-7016.50 created 2026-01-20T01:30:00 defended_on_15m defended 2026-01-20T11:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7012.00-7016.50 created 2026-01-20T01:30:00 defended_on_15m defended 2026-01-20T11:00:00
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
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 4. SHORT 15M FVG 6983.00-6990.75 created 2026-01-20T13:00:00
- Verdict: human_locked_valid_management_short_t1_only
- Continuation read: valid_management_short_t1_only
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-20T13:05:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-20T13:05:00, 2026-01-20T13:15:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-20T13:05:00. | PASS entry_stop_risk_contract: Entry 6979.25, protected 5M stop 7002.00, risk 22.75 pts. | PASS tactical_targets_from_actual_risk: T1 6945.25 and T2 6933.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 6979.00.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-01-20T13:05:00
- 5M wick defense: 2026-01-20T13:05:00, 2026-01-20T13:15:00
- Proof: 2026-01-20T13:05:00
- Entry/stop/risk: 6979.25 / 7002.00 / 22.75 pts
- T1/T2: 6945.25 / 6933.75
- Nearest liquidity: nearest prior low liquidity 6979.00
- Opposing FVG obstacle before T1: 5m LONG 6973.00-6973.25 created 2026-01-20T05:25:00 status partial_touch
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-20T13:25:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7012.00-7016.50 created 2026-01-20T01:30:00 defended_on_15m defended 2026-01-20T11:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7012.00-7016.50 created 2026-01-20T01:30:00 defended_on_15m defended 2026-01-20T11:00:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 6973.00-6973.25 created 2026-01-20T05:25:00 status partial_touch; 15m LONG 6973.00-6973.25 created 2026-01-20T05:45:00 status partial_touch; 5m LONG 6966.75-6971.50 created 2026-01-20T05:20:00 status open_untouched; 15m LONG 6968.00-6971.50 created 2026-01-20T05:30:00 status open_untouched; 15m LONG 6953.25-6958.50 created 2025-12-19T09:45:00 status open_untouched; 15m LONG 6940.25-6949.00 created 2025-12-19T02:30:00 status partial_touch; 5m LONG 6940.25-6946.50 created 2025-12-19T02:10:00 status partial_touch; 15m LONG 6923.00-6940.50 created 2025-12-18T09:00:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 6979.50-6980.00 created 2025-12-18T11:45:00 status failed_inverted; 15m SHORT 6979.50-6980.00 created 2025-12-01T00:30:00 status failed_inverted; 5m SHORT 6979.75-6980.75 created 2025-11-04T08:35:00 status failed_inverted; 5m LONG 6979.75-6986.50 created 2025-11-04T09:50:00 status failed_inverted; 15m SHORT 6979.75-6980.75 created 2025-11-26T03:15:00 status failed_inverted; 120m LONG 6979.75-6983.00 created 2025-11-10T06:00:00 status failed_inverted; 240m LONG 6979.75-6983.50 created 2025-11-10T10:00:00 status failed_inverted; 15m LONG 6980.00-6980.75 created 2025-11-26T02:45:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 6983.00-6990.75 created 2026-01-20T13:00:00 status open_untouched; 15m SHORT 6993.50-6995.50 created 2026-01-20T12:45:00 status open_untouched; 240m SHORT 7002.25-7008.75 created 2026-01-20T06:00:00 status partial_touch; 5m SHORT 7003.00-7003.25 created 2026-01-20T12:15:00 status open_untouched; 5m SHORT 7018.00-7018.25 created 2026-01-20T01:05:00 status open_untouched; 5m SHORT 7021.50-7022.50 created 2026-01-19T23:15:00 status partial_touch; 15m SHORT 7021.50-7022.50 created 2026-01-19T23:30:00 status partial_touch; 60m SHORT 7022.00-7022.50 created 2026-01-20T01:00:00 status open_untouched
- Objective ladder: liquidity 6978.25 reached 2026-01-20T13:10:00 (prior 5M swing low liquidity from 2026-01-20T10:15:00); liquidity 6978.00 reached 2026-01-20T13:10:00 (prior 5M swing low liquidity from 2026-01-20T09:25:00); session_extreme 6973.75 reached 2026-01-20T13:25:00 (RTH low liquidity before proof); open_fvg 6973.00 reached 2026-01-20T13:25:00 (5m LONG open FVG partial_touch created 2026-01-20T05:25:00); open_fvg 6973.00 reached 2026-01-20T13:25:00 (15m LONG open FVG partial_touch created 2026-01-20T05:45:00); open_fvg 6968.00 reached 2026-01-20T13:35:00 (15m LONG open FVG open_untouched created 2026-01-20T05:30:00); open_fvg 6966.75 reached 2026-01-20T13:35:00 (5m LONG open FVG open_untouched created 2026-01-20T05:20:00); open_fvg 6953.25 reached 2026-01-20T13:55:00 (15m LONG open FVG open_untouched created 2025-12-19T09:45:00); tactical 6945.25 reached 2026-01-20T14:35:00 (T1 1.5R); open_fvg 6940.25 reached 2026-01-20T15:15:00 (15m LONG open FVG partial_touch created 2025-12-19T02:30:00); open_fvg 6940.25 reached 2026-01-20T15:15:00 (5m LONG open FVG partial_touch created 2025-12-19T02:10:00); tactical 6933.75 not reached (T2 2.0R); open_fvg 6923.00 not reached (15m LONG open FVG partial_touch created 2025-12-18T09:00:00)
- Story: SHORT proof completed at 2026-01-20T13:05:00 from 6983.00-6990.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 6973.00-6973.25 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 6978.25 liquidity, 6978.00 liquidity, 6973.75 session_extreme, 6973.00 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-20T14:35:00, one MES +$170.00
- Managed outcome: T1 at 2026-01-20T14:35:00, exit 6945.25, one MES +$170.00; T2 was not reached.
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 5. SHORT 15M FVG 6973.75-6977.75 created 2026-01-20T13:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-20T13:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-20T13:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7012.00-7016.50 created 2026-01-20T01:30:00 defended_on_15m defended 2026-01-20T11:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7012.00-7016.50 created 2026-01-20T01:30:00 defended_on_15m defended 2026-01-20T11:00:00
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

### 6. SHORT 15M FVG 6962.00-6971.50 created 2026-01-20T14:00:00
- Verdict: human_locked_rejected_no_t1_later_stop_path
- Continuation read: rejected_obstacle_defense_not_management_continuation
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-20T13:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-20T14:05:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-20T14:05:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-20T14:05:00. | PASS entry_stop_risk_contract: Entry 6956.50, protected 5M stop 6981.00, risk 24.50 pts. | PASS tactical_targets_from_actual_risk: T1 6919.75 and T2 6907.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 6956.25.
- Parent displacement: yes
- Parent displacement candle: 2026-01-20T13:45:00
- Parent failure: not found
- First 5M return: 2026-01-20T14:05:00
- 5M wick defense: 2026-01-20T14:05:00
- Proof: 2026-01-20T14:05:00
- Entry/stop/risk: 6956.50 / 6981.00 / 24.50 pts
- T1/T2: 6919.75 / 6907.50
- Nearest liquidity: nearest prior low liquidity 6956.25
- Opposing FVG obstacle before T1: 15m LONG 6940.25-6949.00 created 2025-12-19T02:30:00 status partial_touch
- Opposing FVG reaction: obstacle_defended_continuation_failed at 2026-01-20T14:20:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7012.00-7016.50 created 2026-01-20T01:30:00 defended_on_15m defended 2026-01-20T11:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7012.00-7016.50 created 2026-01-20T01:30:00 defended_on_15m defended 2026-01-20T11:00:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: 6949.25 (RTH low liquidity before proof)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 15m LONG 6940.25-6949.00 created 2025-12-19T02:30:00 status partial_touch; 5m LONG 6940.25-6946.50 created 2025-12-19T02:10:00 status partial_touch; 15m LONG 6923.00-6940.50 created 2025-12-18T09:00:00 status partial_touch; 5m LONG 6939.25-6940.00 created 2025-12-19T02:05:00 status open_untouched; 5m LONG 6935.75-6938.00 created 2025-12-19T02:00:00 status open_untouched; 5m LONG 6923.00-6927.25 created 2025-12-18T08:40:00 status partial_touch; 240m LONG 6921.00-6924.50 created 2025-12-18T14:00:00 status open_untouched; 5m LONG 6918.50-6920.25 created 2025-12-18T08:20:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 6956.75-6957.25 created 2025-12-19T06:15:00 status failed_inverted; 240m SHORT 6956.75-6960.50 created 2025-11-06T17:00:00 status failed_inverted; 5m SHORT 6957.00-6957.25 created 2025-12-19T03:30:00 status failed_inverted; 5m LONG 6957.00-6958.00 created 2025-12-19T03:40:00 status failed_inverted; 15m LONG 6957.00-6959.25 created 2025-12-16T03:30:00 status failed_inverted; 5m LONG 6957.25-6958.75 created 2025-11-05T06:50:00 status failed_inverted; 5m LONG 6957.25-6957.75 created 2025-12-19T06:35:00 status failed_inverted; 5m SHORT 6957.75-6958.75 created 2025-12-15T22:35:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 6962.00-6962.75 created 2026-01-20T13:50:00 status partial_touch; 15m SHORT 6962.00-6971.50 created 2026-01-20T14:00:00 status open_untouched; 5m SHORT 6965.25-6966.75 created 2026-01-20T13:45:00 status open_untouched; 5m SHORT 6970.00-6971.50 created 2026-01-20T13:40:00 status open_untouched; 15m SHORT 6973.75-6977.75 created 2026-01-20T13:45:00 status open_untouched; 5m SHORT 6975.50-6976.00 created 2026-01-20T13:30:00 status open_untouched; 15m SHORT 6983.00-6990.75 created 2026-01-20T13:00:00 status partial_touch; 60m SHORT 6984.50-6993.00 created 2026-01-20T14:00:00 status open_untouched
- Objective ladder: session_extreme 6949.25 reached 2026-01-20T14:20:00 (RTH low liquidity before proof); open_fvg 6940.25 reached 2026-01-20T15:15:00 (15m LONG open FVG partial_touch created 2025-12-19T02:30:00); open_fvg 6940.25 reached 2026-01-20T15:15:00 (5m LONG open FVG partial_touch created 2025-12-19T02:10:00); open_fvg 6939.25 reached 2026-01-20T15:15:00 (5m LONG open FVG open_untouched created 2025-12-19T02:05:00); open_fvg 6935.75 reached 2026-01-20T15:45:00 (5m LONG open FVG open_untouched created 2025-12-19T02:00:00); open_fvg 6923.00 not reached (15m LONG open FVG partial_touch created 2025-12-18T09:00:00); open_fvg 6923.00 not reached (5m LONG open FVG partial_touch created 2025-12-18T08:40:00); open_fvg 6921.00 not reached (240m LONG open FVG open_untouched created 2025-12-18T14:00:00); tactical 6919.75 not reached (T1 1.5R); open_fvg 6918.50 not reached (5m LONG open FVG partial_touch created 2025-12-18T08:20:00); tactical 6907.50 not reached (T2 2.0R)
- Story: SHORT proof appeared at 2026-01-20T14:05:00 from 6962.00-6971.50, but tactical T1 6919.75 was never reached and the later chart path reversed into the stop path. The 15M LONG 6940.25-6949.00 opposing FVG was a defended obstacle before T1, so this is obstacle-defense evidence, not a valid short continuation.
- Outcome: Rejected manual review - T1 not reached; later stop path.
- Managed outcome: Rejected. Do not count LQ1/session-close as a valid management win for this row.
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. T1/T2 were not reached. The opposing FVG obstacle defended before T1 and continuation failed, so this row must not be carried forward as a valid trade lesson.
