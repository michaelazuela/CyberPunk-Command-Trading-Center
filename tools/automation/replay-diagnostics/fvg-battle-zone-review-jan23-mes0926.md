# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-23 / full-rth (2026-01-23T09:15:00 to 2026-01-23T16:00:00)
Context window: 120 days (2025-09-25T00:00:00 to 2026-01-23T23:59:59)

## Coverage
- 5m: 16521 bars (2025-10-28T18:05:00 to 2026-01-23T17:00:00)
- 15m: 5507 bars (2025-10-28T18:15:00 to 2026-01-23T17:00:00)
- 60m: 1349 bars (2025-10-28T19:00:00 to 2026-01-23T17:00:00)
- 120m: 704 bars (2025-10-28T20:00:00 to 2026-01-23T17:00:00)
- 240m: 352 bars (2025-10-28T22:00:00 to 2026-01-23T17:00:00)

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
- Open below: 15m LONG 7034.25-7038.00 created 2026-01-22T03:00:00 status partial_touch; 5m LONG 7034.25-7036.25 created 2026-01-22T02:40:00 status open_untouched; 5m LONG 7030.75-7034.00 created 2026-01-22T02:35:00 status open_untouched; 240m LONG 7021.50-7030.50 created 2026-01-21T22:00:00 status partial_touch; 5m LONG 7026.00-7027.25 created 2026-01-22T01:40:00 status open_untouched; 120m LONG 6984.50-7022.75 created 2026-01-21T17:00:00 status open_untouched; 60m LONG 6984.50-7016.00 created 2026-01-21T16:00:00 status open_untouched; 5m LONG 6978.75-7013.50 created 2026-01-21T14:35:00 status open_untouched; 15m LONG 6981.75-7013.50 created 2026-01-21T14:45:00 status open_untouched; 60m LONG 6944.75-6985.50 created 2026-01-21T11:00:00 status partial_touch
- Failed above: 5m LONG 7040.75-7041.50 created 2025-12-11T07:25:00 status failed_inverted; 5m SHORT 7040.75-7041.50 created 2025-12-11T08:40:00 status failed_inverted; 5m SHORT 7040.75-7041.75 created 2025-12-22T23:40:00 status failed_inverted; 5m LONG 7040.75-7041.50 created 2026-01-02T03:50:00 status failed_inverted; 5m SHORT 7040.75-7041.25 created 2026-01-22T00:20:00 status failed_inverted; 5m LONG 7040.75-7041.50 created 2026-01-22T03:05:00 status failed_inverted; 15m LONG 7040.75-7045.00 created 2025-12-11T07:45:00 status failed_inverted; 15m SHORT 7040.75-7041.25 created 2025-12-22T14:15:00 status failed_inverted; 15m LONG 7040.75-7042.25 created 2025-12-22T14:45:00 status failed_inverted; 15m SHORT 7040.75-7042.50 created 2025-12-23T07:30:00 status failed_inverted
- Open above: 15m SHORT 7043.25-7089.50 created 2026-01-18T18:30:00 status partial_touch; 60m SHORT 7046.50-7086.25 created 2026-01-18T20:00:00 status partial_touch; 15m SHORT 7046.75-7049.50 created 2026-01-23T08:45:00 status open_untouched; 5m SHORT 7047.50-7047.75 created 2026-01-23T08:30:00 status open_untouched; 5m SHORT 7047.75-7090.25 created 2026-01-18T18:10:00 status partial_touch; 5m SHORT 7049.25-7049.50 created 2026-01-23T08:25:00 status open_untouched; 5m SHORT 7053.75-7090.25 created 2026-01-18T18:05:00 status partial_touch; 15m SHORT 7053.75-7088.75 created 2026-01-18T18:15:00 status partial_touch; 60m SHORT 7053.75-7087.75 created 2026-01-18T19:00:00 status partial_touch; 120m SHORT 7053.75-7087.75 created 2026-01-18T20:00:00 status partial_touch

## Trace Rows

### 1. LONG 15M FVG 7065.50-7069.00 created 2026-01-23T11:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-23T11:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-23T12:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-23T12:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-23T12:05:00, 2026-01-23T12:20:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-23T12:15:00. | PASS entry_stop_risk_contract: Entry 7069.50, protected 5M stop 7058.25, risk 11.25 pts. | PASS tactical_targets_from_actual_risk: T1 7086.50 and T2 7092.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7069.75.
- Parent displacement: yes
- Parent displacement candle: 2026-01-23T11:00:00
- Parent failure: 2026-01-23T12:00:00
- First 5M return: 2026-01-23T12:00:00
- 5M wick defense: 2026-01-23T12:05:00, 2026-01-23T12:20:00
- Proof: 2026-01-23T12:15:00
- Entry/stop/risk: 7069.50 / 7058.25 / 11.25 pts
- T1/T2: 7086.50 / 7092.00
- Nearest liquidity: nearest prior high liquidity 7069.75
- Opposing FVG obstacle before T1: 5m LONG 7069.75-7072.50 created 2025-11-03T09:10:00 status failed_inverted
- Opposing FVG reaction: obstacle_defended_continuation_failed at 2026-01-23T12:20:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg LONG 7072.50-7072.75 created 2026-01-23T01:15:00 failed_acceptance_through_15m failed 2026-01-23T01:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7041.25-7041.75 created 2026-01-23T06:15:00 failed_acceptance_through_15m defended 2026-01-23T08:45:00 failed 2026-01-23T08:30:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: 7076.75 (prior 5M swing high liquidity from 2026-01-23T11:05:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 240m SHORT 7056.50-7064.25 created 2026-01-23T10:00:00 status open_untouched; 60m LONG 7055.25-7061.00 created 2026-01-23T12:00:00 status open_untouched; 5m LONG 7056.50-7057.75 created 2026-01-23T10:30:00 status open_untouched; 5m LONG 7047.50-7054.00 created 2026-01-23T10:05:00 status partial_touch; 60m LONG 7036.25-7041.50 created 2026-01-22T04:00:00 status partial_touch; 15m LONG 7034.25-7038.00 created 2026-01-22T03:00:00 status partial_touch; 5m LONG 7034.25-7036.25 created 2026-01-22T02:40:00 status open_untouched; 5m LONG 7030.75-7034.00 created 2026-01-22T02:35:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7069.75-7072.50 created 2025-11-03T09:10:00 status failed_inverted; 5m SHORT 7069.75-7070.00 created 2025-12-23T20:50:00 status failed_inverted; 5m LONG 7069.75-7070.00 created 2025-12-24T06:15:00 status failed_inverted; 5m SHORT 7069.75-7070.00 created 2025-12-24T06:25:00 status failed_inverted; 5m SHORT 7069.75-7071.00 created 2026-01-08T20:30:00 status failed_inverted; 5m LONG 7069.75-7070.50 created 2026-01-22T11:50:00 status failed_inverted; 15m LONG 7069.75-7072.75 created 2025-11-03T09:30:00 status failed_inverted; 5m SHORT 7070.00-7070.50 created 2025-10-30T23:30:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7100.00-7105.50 created 2026-01-16T14:20:00 status partial_touch; 5m SHORT 7114.50-7115.00 created 2026-01-16T06:45:00 status partial_touch; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: liquidity 7073.50 not reached (prior 5M swing high liquidity from 2026-01-23T11:50:00); liquidity 7076.75 not reached (prior 5M swing high liquidity from 2026-01-23T11:05:00); session_extreme 7076.75 not reached (RTH high liquidity before proof); tactical 7086.50 not reached (T1 1.5R); tactical 7092.00 not reached (T2 2.0R); open_fvg 7105.50 not reached (5m SHORT open FVG partial_touch created 2026-01-16T14:20:00); open_fvg 7115.00 not reached (5m SHORT open FVG partial_touch created 2026-01-16T06:45:00); open_fvg 7121.50 not reached (15m SHORT open FVG open_untouched created 2026-01-15T14:30:00); open_fvg 7123.25 not reached (15m SHORT open FVG open_untouched created 2026-01-15T14:15:00); open_fvg 7130.75 not reached (15m SHORT open FVG partial_touch created 2026-01-13T10:00:00)
- Story: LONG proof completed at 2026-01-23T12:15:00 from 7065.50-7069.00. 13 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7069.75-7072.50 with reaction obstacle_defended_continuation_failed. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-01-23T12:45:00, one MES $-56.25
- Managed outcome: Stop at 2026-01-23T12:45:00, exit 7058.25, one MES $-56.25
- Reasons: 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 2. SHORT 15M FVG 7058.00-7064.75 created 2026-01-23T13:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-23T12:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-23T13:30:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-23T13:30:00, 2026-01-23T14:00:00, 2026-01-23T14:35:00, 2026-01-23T14:40:00, 2026-01-23T14:55:00, 2026-01-23T15:20:00, 2026-01-23T16:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-23T13:30:00. | PASS entry_stop_risk_contract: Entry 7055.75, protected 5M stop 7070.75, risk 15.00 pts. | PASS tactical_targets_from_actual_risk: T1 7033.25 and T2 7025.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7055.50.
- Parent displacement: yes
- Parent displacement candle: 2026-01-23T12:45:00
- Parent failure: not found
- First 5M return: 2026-01-23T13:30:00
- 5M wick defense: 2026-01-23T13:30:00, 2026-01-23T14:00:00, 2026-01-23T14:35:00, 2026-01-23T14:40:00, 2026-01-23T14:55:00, 2026-01-23T15:20:00, 2026-01-23T16:00:00
- Proof: 2026-01-23T13:30:00
- Entry/stop/risk: 7055.75 / 7070.75 / 15.00 pts
- T1/T2: 7033.25 / 7025.75
- Nearest liquidity: nearest prior low liquidity 7055.50
- Opposing FVG obstacle before T1: 60m LONG 7036.25-7041.50 created 2026-01-22T04:00:00 status partial_touch
- Opposing FVG reaction: obstacle_before_t1_not_reached
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7071.50-7073.00 created 2026-01-23T02:00:00 defended_on_15m defended 2026-01-23T02:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7071.50-7073.00 created 2026-01-23T02:00:00 defended_on_15m defended 2026-01-23T02:45:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: 7048.75 (prior 5M swing low liquidity from 2026-01-23T10:20:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 60m LONG 7036.25-7041.50 created 2026-01-22T04:00:00 status partial_touch; 15m LONG 7034.25-7038.00 created 2026-01-22T03:00:00 status partial_touch; 5m LONG 7034.25-7036.25 created 2026-01-22T02:40:00 status open_untouched; 5m LONG 7030.75-7034.00 created 2026-01-22T02:35:00 status open_untouched; 240m LONG 7021.50-7030.50 created 2026-01-21T22:00:00 status partial_touch; 5m LONG 7026.00-7027.25 created 2026-01-22T01:40:00 status open_untouched; 120m LONG 6984.50-7022.75 created 2026-01-21T17:00:00 status open_untouched; 60m LONG 6984.50-7016.00 created 2026-01-21T16:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7056.00-7056.25 created 2025-11-03T17:00:00 status failed_inverted; 5m SHORT 7056.00-7057.50 created 2025-12-31T09:40:00 status failed_inverted; 5m SHORT 7056.00-7058.00 created 2026-01-05T18:40:00 status failed_inverted; 5m SHORT 7056.00-7057.50 created 2026-01-06T08:55:00 status failed_inverted; 5m LONG 7056.00-7057.25 created 2026-01-22T03:45:00 status failed_inverted; 15m SHORT 7056.00-7056.50 created 2026-01-05T19:00:00 status failed_inverted; 15m LONG 7056.00-7059.75 created 2026-01-08T02:45:00 status failed_inverted; 5m SHORT 7056.25-7058.50 created 2025-11-03T00:25:00 status failed_inverted
- Open FVGs above at proof: 240m SHORT 7056.50-7064.25 created 2026-01-23T10:00:00 status open_untouched; 5m SHORT 7058.00-7064.00 created 2026-01-23T12:50:00 status partial_touch; 15m SHORT 7058.00-7064.75 created 2026-01-23T13:00:00 status partial_touch; 5m SHORT 7100.00-7105.50 created 2026-01-16T14:20:00 status partial_touch; 5m SHORT 7114.50-7115.00 created 2026-01-16T06:45:00 status partial_touch; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: liquidity 7048.75 not reached (prior 5M swing low liquidity from 2026-01-23T10:20:00); liquidity 7043.75 not reached (prior 5M swing low liquidity from 2026-01-23T13:00:00); liquidity 7037.75 not reached (prior 5M swing low liquidity from 2026-01-23T09:45:00); session_extreme 7037.75 not reached (RTH low liquidity before proof); open_fvg 7036.25 not reached (60m LONG open FVG partial_touch created 2026-01-22T04:00:00); open_fvg 7034.25 not reached (15m LONG open FVG partial_touch created 2026-01-22T03:00:00); open_fvg 7034.25 not reached (5m LONG open FVG open_untouched created 2026-01-22T02:40:00); tactical 7033.25 not reached (T1 1.5R); open_fvg 7030.75 not reached (5m LONG open FVG open_untouched created 2026-01-22T02:35:00); open_fvg 7026.00 not reached (5m LONG open FVG open_untouched created 2026-01-22T01:40:00); tactical 7025.75 not reached (T2 2.0R); open_fvg 7021.50 not reached (240m LONG open FVG partial_touch created 2026-01-21T22:00:00); open_fvg 6984.50 not reached (120m LONG open FVG open_untouched created 2026-01-21T17:00:00); open_fvg 6984.50 not reached (60m LONG open FVG open_untouched created 2026-01-21T16:00:00)
- Story: SHORT proof completed at 2026-01-23T13:30:00 from 7058.00-7064.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 60m 7036.25-7041.50 with reaction obstacle_before_t1_not_reached. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-01-23T16:00:00, one MES $-13.75
- Managed outcome: SessionClose at 2026-01-23T16:00:00, exit 7058.50, one MES $-13.75
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 3. LONG 15M FVG 7058.25-7061.25 created 2026-01-23T14:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-23T15:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-23T15:30:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-01-23T15:30:00
- First 5M return: 2026-01-23T15:30:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg LONG 7072.50-7072.75 created 2026-01-23T01:15:00 failed_acceptance_through_15m failed 2026-01-23T01:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7041.25-7041.75 created 2026-01-23T06:15:00 failed_acceptance_through_15m defended 2026-01-23T08:45:00 failed 2026-01-23T08:30:00
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
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.
