# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-10 / lunch (2026-06-10T12:00:00 to 2026-06-10T16:00:00)
Context window: 275 days (2025-09-08T00:00:00 to 2026-06-11T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 43727 bars (2025-10-28T18:05:00 to 2026-06-11T23:55:00)
- 15m: 14585 bars (2025-10-28T18:15:00 to 2026-06-11T23:45:00)
- 60m: 3610 bars (2025-10-28T19:00:00 to 2026-06-11T23:00:00)
- 120m: 1888 bars (2025-10-28T20:00:00 to 2026-06-11T22:00:00)
- 240m: 987 bars (2025-10-28T22:00:00 to 2026-06-11T22:00:00)

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
- Open below: 15m LONG 7351.75-7364.00 parent 2026-06-09T13:15:00 confirmed 2026-06-09T13:30:00 status open_untouched; 5m LONG 7351.75-7360.25 parent 2026-06-09T13:05:00 confirmed 2026-06-09T13:10:00 status partial_touch; 5m LONG 7339.75-7348.75 parent 2026-06-09T13:00:00 confirmed 2026-06-09T13:05:00 status open_untouched; 240m LONG 7307.75-7312.00 parent 2026-05-05T06:00:00 confirmed 2026-05-05T10:00:00 status partial_touch; 120m LONG 7307.75-7310.50 parent 2026-05-05T04:00:00 confirmed 2026-05-05T06:00:00 status partial_touch; 5m LONG 7308.50-7309.50 parent 2026-05-05T02:55:00 confirmed 2026-05-05T03:00:00 status partial_touch; 60m LONG 7307.75-7309.25 parent 2026-05-05T03:00:00 confirmed 2026-05-05T04:00:00 status open_untouched; 15m LONG 7305.25-7307.00 parent 2026-05-05T02:45:00 confirmed 2026-05-05T03:00:00 status open_untouched; 5m LONG 7306.00-7306.25 parent 2026-05-05T02:40:00 confirmed 2026-05-05T02:45:00 status open_untouched; 5m LONG 7302.75-7305.50 parent 2026-05-05T02:35:00 confirmed 2026-05-05T02:40:00 status open_untouched
- Failed above: 5m LONG 7403.75-7404.50 parent 2026-05-06T05:55:00 confirmed 2026-05-06T06:00:00 status failed_inverted; 5m LONG 7404.00-7404.50 parent 2026-06-10T06:45:00 confirmed 2026-06-10T06:50:00 status failed_inverted; 5m SHORT 7404.25-7414.25 parent 2026-06-10T04:45:00 confirmed 2026-06-10T04:50:00 status failed_inverted; 60m SHORT 7406.25-7425.50 parent 2026-06-10T05:00:00 confirmed 2026-06-10T06:00:00 status failed_inverted; 60m LONG 7406.50-7408.00 parent 2026-05-06T07:00:00 confirmed 2026-05-06T08:00:00 status failed_inverted; 5m SHORT 7407.00-7409.25 parent 2026-05-06T08:05:00 confirmed 2026-05-06T08:10:00 status failed_inverted; 5m LONG 7407.25-7410.25 parent 2026-05-06T06:20:00 confirmed 2026-05-06T06:25:00 status failed_inverted; 15m SHORT 7408.50-7414.50 parent 2026-06-10T04:45:00 confirmed 2026-06-10T05:00:00 status failed_inverted; 15m SHORT 7409.75-7447.75 parent 2026-06-09T11:30:00 confirmed 2026-06-09T11:45:00 status failed_inverted; 120m SHORT 7410.00-7425.50 parent 2026-06-10T06:00:00 confirmed 2026-06-10T08:00:00 status failed_inverted
- Open above: 120m SHORT 7424.50-7505.00 parent 2026-06-09T12:00:00 confirmed 2026-06-09T14:00:00 status partial_touch; 15m SHORT 7428.50-7439.75 parent 2026-06-10T11:00:00 confirmed 2026-06-10T11:15:00 status open_untouched; 60m SHORT 7469.00-7512.50 parent 2026-06-09T11:00:00 confirmed 2026-06-09T12:00:00 status open_untouched; 5m SHORT 7474.00-7489.50 parent 2026-06-09T10:45:00 confirmed 2026-06-09T10:50:00 status open_untouched; 15m SHORT 7474.00-7479.00 parent 2026-06-09T10:45:00 confirmed 2026-06-09T11:00:00 status open_untouched; 5m SHORT 7504.75-7523.75 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00 status partial_touch; 15m SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 status open_untouched; 5m SHORT 7536.00-7536.50 parent 2026-06-09T10:00:00 confirmed 2026-06-09T10:05:00 status open_untouched; 60m SHORT 7554.00-7569.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T13:00:00 status partial_touch; 120m SHORT 7554.00-7574.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T14:00:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof none from 15M parent 2026-06-10T14:00:00 confirmed 2026-06-10T14:15:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: 2 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7381.00-7388.25 parent 2026-06-10T14:00:00 confirmed 2026-06-10T14:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-10T14:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-10T14:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-10T14:30:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-10T14:00:00
- Parent failure: 2026-06-10T14:30:00
- First 5M return: 2026-06-10T14:30:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7381.00-7388.25 parent 2026-06-10T14:00:00 confirmed 2026-06-10T14:15:00 failed_acceptance_through_15m failed 2026-06-10T14:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7381.00-7388.25 parent 2026-06-10T14:00:00 confirmed 2026-06-10T14:15:00 failed_acceptance_through_15m failed 2026-06-10T14:30:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-06-10T14:15:00; wick 2026-06-10T14:25:00; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-06-10T14:30:00.
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

### 2. SHORT 15M FVG 7380.00-7388.25 parent 2026-06-10T14:30:00 confirmed 2026-06-10T14:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7380.00-7388.25 parent 2026-06-10T14:30:00 confirmed 2026-06-10T14:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7380.00-7388.25 parent 2026-06-10T14:30:00 confirmed 2026-06-10T14:45:00 untested_by_15m
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

### 3. SHORT 15M FVG 7369.75-7377.00 parent 2026-06-10T14:45:00 confirmed 2026-06-10T15:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7380.00-7388.25 parent 2026-06-10T14:30:00 confirmed 2026-06-10T14:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7380.00-7388.25 parent 2026-06-10T14:30:00 confirmed 2026-06-10T14:45:00 untested_by_15m
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
