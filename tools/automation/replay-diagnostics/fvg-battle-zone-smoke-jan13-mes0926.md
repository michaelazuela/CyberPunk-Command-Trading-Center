# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-13 / lunch (2026-01-13T12:00:00 to 2026-01-13T16:00:00)
Context window: 120 days (2025-09-15T00:00:00 to 2026-01-13T23:59:59)

## Coverage
- 5m: 14432 bars (2025-10-28T18:05:00 to 2026-01-13T23:55:00)
- 15m: 4810 bars (2025-10-28T18:15:00 to 2026-01-13T23:45:00)
- 60m: 1174 bars (2025-10-28T19:00:00 to 2026-01-13T23:00:00)
- 120m: 612 bars (2025-10-28T20:00:00 to 2026-01-13T22:00:00)
- 240m: 306 bars (2025-10-28T22:00:00 to 2026-01-13T22:00:00)

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
- Open below: 5m LONG 7123.50-7124.50 created 2026-01-13T12:00:00 status open_untouched; 5m LONG 7118.00-7119.25 created 2026-01-13T11:50:00 status open_untouched; 15m LONG 7118.50-7119.25 created 2026-01-13T12:00:00 status open_untouched; 60m LONG 7082.75-7105.50 created 2026-01-12T11:00:00 status partial_touch; 120m LONG 7083.25-7105.50 created 2026-01-12T12:00:00 status partial_touch; 240m LONG 7083.50-7105.50 created 2026-01-12T14:00:00 status open_untouched; 15m LONG 7082.75-7101.25 created 2026-01-12T10:00:00 status partial_touch; 5m LONG 7082.75-7092.00 created 2026-01-12T09:40:00 status open_untouched; 15m LONG 7075.50-7077.50 created 2026-01-12T07:30:00 status partial_touch; 120m LONG 7074.75-7077.25 created 2026-01-12T10:00:00 status open_untouched
- Failed above: 5m LONG 7126.00-7127.50 created 2026-01-09T14:55:00 status failed_inverted; 5m SHORT 7126.00-7129.50 created 2026-01-12T16:55:00 status failed_inverted; 5m SHORT 7126.25-7126.75 created 2026-01-09T15:45:00 status failed_inverted; 15m SHORT 7127.00-7129.50 created 2026-01-12T18:15:00 status failed_inverted; 60m SHORT 7127.00-7128.50 created 2026-01-12T19:00:00 status failed_inverted; 5m LONG 7129.00-7129.50 created 2026-01-12T16:30:00 status failed_inverted; 5m LONG 7131.00-7132.00 created 2026-01-12T14:40:00 status failed_inverted; 15m LONG 7131.50-7133.00 created 2026-01-12T15:00:00 status failed_inverted; 15m SHORT 7131.50-7132.25 created 2026-01-12T15:45:00 status failed_inverted; 5m SHORT 7132.50-7134.75 created 2026-01-13T08:55:00 status failed_inverted
- Open above: 5m SHORT 7127.75-7129.50 created 2026-01-13T09:50:00 status partial_touch; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch

## Trace Rows

### 1. LONG 15M FVG 7118.50-7119.25 created 2026-01-13T12:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-13T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-13T12:45:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-13T11:45:00
- Parent failure: 2026-01-13T12:45:00
- First 5M return: not found
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: final_deepest_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7122.25-7122.50 created 2026-01-13T04:30:00 failed_acceptance_through_15m defended 2026-01-13T07:00:00 failed 2026-01-13T04:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7118.50-7119.25 created 2026-01-13T12:00:00 failed_acceptance_through_15m defended 2026-01-13T12:30:00 failed 2026-01-13T12:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-01-13T12:20:00; wick 2026-01-13T12:30:00; proof 2026-01-13T12:30:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return.

### 2. SHORT 15M FVG 7109.50-7110.25 created 2026-01-13T13:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-13T12:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-13T16:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-13T16:00:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-13T12:45:00
- Parent failure: 2026-01-13T16:00:00
- First 5M return: 2026-01-13T16:00:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7122.00-7122.50 created 2026-01-13T05:00:00 failed_acceptance_through_15m defended 2026-01-13T08:00:00 failed 2026-01-13T07:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 defended_on_15m defended 2026-01-13T12:00:00
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
