# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-09 / morning (2026-06-09T09:15:00 to 2026-06-09T12:00:00)
Context window: 275 days (2025-09-07T00:00:00 to 2026-06-10T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 43451 bars (2025-10-28T18:05:00 to 2026-06-10T23:55:00)
- 15m: 14492 bars (2025-10-28T18:15:00 to 2026-06-10T23:45:00)
- 60m: 3586 bars (2025-10-28T19:00:00 to 2026-06-10T23:00:00)
- 120m: 1875 bars (2025-10-28T20:00:00 to 2026-06-10T22:00:00)
- 240m: 976 bars (2025-10-28T22:00:00 to 2026-06-10T22:00:00)

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
- Open below: 5m LONG 7509.00-7514.25 parent 2026-06-09T08:35:00 confirmed 2026-06-09T08:40:00 status partial_touch; 15m LONG 7509.00-7509.75 parent 2026-06-09T08:45:00 confirmed 2026-06-09T09:00:00 status open_untouched; 5m LONG 7489.50-7491.25 parent 2026-06-08T23:35:00 confirmed 2026-06-08T23:40:00 status partial_touch; 60m LONG 7488.75-7491.25 parent 2026-06-09T00:00:00 confirmed 2026-06-09T01:00:00 status open_untouched; 60m LONG 7475.50-7479.00 parent 2026-06-08T22:00:00 confirmed 2026-06-08T23:00:00 status open_untouched; 5m LONG 7467.00-7475.50 parent 2026-06-08T21:25:00 confirmed 2026-06-08T21:30:00 status partial_touch; 15m LONG 7465.75-7475.50 parent 2026-06-08T21:30:00 confirmed 2026-06-08T21:45:00 status open_untouched; 15m LONG 7461.50-7462.25 parent 2026-06-08T21:15:00 confirmed 2026-06-08T21:30:00 status open_untouched; 5m LONG 7416.00-7417.25 parent 2026-05-07T19:25:00 confirmed 2026-05-07T19:30:00 status partial_touch; 120m LONG 7378.25-7403.75 parent 2026-05-06T06:00:00 confirmed 2026-05-06T08:00:00 status partial_touch
- Failed above: 5m LONG 7515.50-7516.50 parent 2026-05-21T01:00:00 confirmed 2026-05-21T01:05:00 status failed_inverted; 5m SHORT 7515.75-7516.25 parent 2026-05-15T04:55:00 confirmed 2026-05-15T05:00:00 status failed_inverted; 5m LONG 7515.75-7522.50 parent 2026-05-15T10:20:00 confirmed 2026-05-15T10:25:00 status failed_inverted; 5m SHORT 7515.75-7517.50 parent 2026-05-15T12:55:00 confirmed 2026-05-15T13:00:00 status failed_inverted; 5m LONG 7516.00-7518.50 parent 2026-05-15T13:10:00 confirmed 2026-05-15T13:15:00 status failed_inverted; 5m LONG 7516.00-7518.25 parent 2026-05-21T04:15:00 confirmed 2026-05-21T04:20:00 status failed_inverted; 5m LONG 7516.00-7516.75 parent 2026-06-08T07:35:00 confirmed 2026-06-08T07:40:00 status failed_inverted; 5m SHORT 7516.25-7516.75 parent 2026-06-08T07:45:00 confirmed 2026-06-08T07:50:00 status failed_inverted; 5m LONG 7516.75-7521.25 parent 2026-05-13T12:25:00 confirmed 2026-05-13T12:30:00 status failed_inverted; 5m SHORT 7518.00-7519.00 parent 2026-05-21T06:25:00 confirmed 2026-05-21T06:30:00 status failed_inverted
- Open above: 15m SHORT 7525.25-7532.00 parent 2026-06-08T11:30:00 confirmed 2026-06-08T11:45:00 status partial_touch; 120m SHORT 7536.00-7549.75 parent 2026-06-05T14:00:00 confirmed 2026-06-05T16:00:00 status partial_touch; 60m SHORT 7541.25-7549.75 parent 2026-06-05T13:00:00 confirmed 2026-06-05T14:00:00 status open_untouched; 15m SHORT 7543.50-7549.75 parent 2026-06-05T12:15:00 confirmed 2026-06-05T12:30:00 status open_untouched; 5m SHORT 7546.50-7547.50 parent 2026-06-05T12:10:00 confirmed 2026-06-05T12:15:00 status open_untouched; 5m SHORT 7549.00-7552.00 parent 2026-06-05T12:05:00 confirmed 2026-06-05T12:10:00 status open_untouched; 60m SHORT 7554.00-7569.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T13:00:00 status open_untouched; 120m SHORT 7554.00-7574.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T14:00:00 status open_untouched; 15m SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 status open_untouched; 5m SHORT 7558.50-7564.25 parent 2026-06-05T11:40:00 confirmed 2026-06-05T11:45:00 status open_untouched

## Review Order
- Primary campaign to review first: SHORT proof 2026-06-09T11:45:00 from 15M parent 2026-06-09T11:30:00 confirmed 2026-06-09T11:45:00.
- Defended-area management context: 5m LONG 7376.00-7396.25 is a callout before/near T1, not an issue by itself.
- Later rows: 3 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7523.00-7527.50 parent 2026-06-09T09:45:00 confirmed 2026-06-09T10:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-09T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-09T10:15:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-09T10:15:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-09T09:45:00
- Parent failure: 2026-06-09T10:15:00
- First 5M return: 2026-06-09T10:15:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7523.00-7527.50 parent 2026-06-09T09:45:00 confirmed 2026-06-09T10:00:00 failed_acceptance_through_15m failed 2026-06-09T10:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7523.00-7527.50 parent 2026-06-09T09:45:00 confirmed 2026-06-09T10:00:00 failed_acceptance_through_15m failed 2026-06-09T10:15:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-06-09T10:00:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-06-09T10:15:00.
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

### 2. SHORT 15M FVG 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-09T10:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-09T10:30:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-09T10:35:00. | PASS entry_stop_risk_contract: Entry 7497.00, protected 5M stop 7554.50, risk 57.50 pts. | PASS tactical_targets_from_actual_risk: T1 7410.75 and T2 7382.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7496.75.
- Parent displacement: yes
- Parent displacement candle: 2026-06-09T10:15:00
- Parent failure: not found
- First 5M return: 2026-06-09T10:30:00
- 5M wick defense: none
- Proof: 2026-06-09T10:35:00
- Entry/stop/risk: 7497.00 / 7554.50 / 57.50 pts
- T1/T2: 7410.75 / 7382.00
- Nearest liquidity: nearest prior low liquidity 7496.75
- Defended-area / obstacle management callout before or near T1: 60m LONG 7488.75-7491.25 parent 2026-06-09T00:00:00 confirmed 2026-06-09T01:00:00 status open_untouched
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-09T10:40:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 untested_by_15m
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-06-09T10:30:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: 7479.00 (prior 5M swing low liquidity from 2026-06-09T10:20:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 60m LONG 7488.75-7491.25 parent 2026-06-09T00:00:00 confirmed 2026-06-09T01:00:00 status open_untouched; 60m LONG 7475.50-7479.00 parent 2026-06-08T22:00:00 confirmed 2026-06-08T23:00:00 status open_untouched; 5m LONG 7467.00-7475.50 parent 2026-06-08T21:25:00 confirmed 2026-06-08T21:30:00 status partial_touch; 15m LONG 7465.75-7475.50 parent 2026-06-08T21:30:00 confirmed 2026-06-08T21:45:00 status open_untouched; 15m LONG 7461.50-7462.25 parent 2026-06-08T21:15:00 confirmed 2026-06-08T21:30:00 status open_untouched; 5m LONG 7416.00-7417.25 parent 2026-05-07T19:25:00 confirmed 2026-05-07T19:30:00 status partial_touch; 120m LONG 7378.25-7403.75 parent 2026-05-06T06:00:00 confirmed 2026-05-06T08:00:00 status partial_touch; 5m LONG 7376.00-7396.25 parent 2026-05-06T04:55:00 confirmed 2026-05-06T05:00:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7497.25-7505.00 parent 2026-05-18T08:45:00 confirmed 2026-05-18T08:50:00 status failed_inverted; 5m SHORT 7497.25-7516.50 parent 2026-05-21T06:30:00 confirmed 2026-05-21T06:35:00 status failed_inverted; 5m SHORT 7497.25-7498.50 parent 2026-06-09T02:55:00 confirmed 2026-06-09T03:00:00 status failed_inverted; 5m LONG 7497.25-7506.00 parent 2026-06-09T03:05:00 confirmed 2026-06-09T03:10:00 status failed_inverted; 5m LONG 7497.50-7500.50 parent 2026-05-15T08:55:00 confirmed 2026-05-15T09:00:00 status failed_inverted; 5m LONG 7497.75-7498.00 parent 2026-05-12T23:40:00 confirmed 2026-05-12T23:45:00 status failed_inverted; 5m SHORT 7497.75-7498.00 parent 2026-05-18T18:50:00 confirmed 2026-05-18T18:55:00 status failed_inverted; 5m LONG 7498.00-7499.00 parent 2026-05-11T10:15:00 confirmed 2026-05-11T10:20:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7504.75-7523.75 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00 status partial_touch; 15m SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 status open_untouched; 5m SHORT 7536.00-7536.50 parent 2026-06-09T10:00:00 confirmed 2026-06-09T10:05:00 status open_untouched; 60m SHORT 7554.00-7569.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T13:00:00 status partial_touch; 120m SHORT 7554.00-7574.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T14:00:00 status partial_touch; 15m SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 status open_untouched; 5m SHORT 7558.50-7564.25 parent 2026-06-05T11:40:00 confirmed 2026-06-05T11:45:00 status open_untouched; 15m SHORT 7575.75-7578.50 parent 2026-06-05T11:15:00 confirmed 2026-06-05T11:30:00 status open_untouched
- Objective ladder: open_fvg 7488.75 reached 2026-06-09T10:45:00 (60m LONG open FVG open_untouched parent 2026-06-09T00:00:00 confirmed 2026-06-09T01:00:00); liquidity 7479.00 reached 2026-06-09T10:45:00 (prior 5M swing low liquidity from 2026-06-09T10:20:00); session_extreme 7479.00 reached 2026-06-09T10:45:00 (RTH low liquidity before proof); open_fvg 7475.50 reached 2026-06-09T10:45:00 (60m LONG open FVG open_untouched parent 2026-06-08T22:00:00 confirmed 2026-06-08T23:00:00); open_fvg 7467.00 reached 2026-06-09T10:50:00 (5m LONG open FVG partial_touch parent 2026-06-08T21:25:00 confirmed 2026-06-08T21:30:00); open_fvg 7465.75 reached 2026-06-09T10:50:00 (15m LONG open FVG open_untouched parent 2026-06-08T21:30:00 confirmed 2026-06-08T21:45:00); open_fvg 7461.50 reached 2026-06-09T10:50:00 (15m LONG open FVG open_untouched parent 2026-06-08T21:15:00 confirmed 2026-06-08T21:30:00); open_fvg 7416.00 reached 2026-06-09T11:30:00 (5m LONG open FVG partial_touch parent 2026-05-07T19:25:00 confirmed 2026-05-07T19:30:00); tactical 7410.75 reached 2026-06-09T11:30:00 (T1 1.5R); tactical 7382.00 reached 2026-06-09T12:00:00 (T2 2.0R); open_fvg 7378.25 reached 2026-06-09T12:00:00 (120m LONG open FVG partial_touch parent 2026-05-06T06:00:00 confirmed 2026-05-06T08:00:00); open_fvg 7376.00 reached 2026-06-09T12:00:00 (5m LONG open FVG partial_touch parent 2026-05-06T04:55:00 confirmed 2026-05-06T05:00:00)
- Story: SHORT proof completed at 2026-06-09T10:35:00 from 7507.00-7527.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 60m 7488.75-7491.25 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7488.75 open_fvg, 7479.00 liquidity, 7479.00 session_extreme, 7475.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-09T11:30:00, one MES +$431.25
- Managed outcome: LQ1 at 2026-06-09T10:45:00, exit 7479.00, one MES +$90.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 3. SHORT 15M FVG 7474.00-7479.00 parent 2026-06-09T10:45:00 confirmed 2026-06-09T11:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-09T10:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-09T10:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 untested_by_15m
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

### 4. SHORT 15M FVG 7409.75-7447.75 parent 2026-06-09T11:30:00 confirmed 2026-06-09T11:45:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-09T11:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-09T11:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-09T11:45:00, 2026-06-09T11:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-09T11:45:00. | PASS entry_stop_risk_contract: Entry 7403.25, protected 5M stop 7469.00, risk 65.75 pts. | PASS tactical_targets_from_actual_risk: T1 7304.75 and T2 7271.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7403.00.
- Parent displacement: yes
- Parent displacement candle: 2026-06-09T11:30:00
- Parent failure: not found
- First 5M return: 2026-06-09T11:45:00
- 5M wick defense: 2026-06-09T11:45:00, 2026-06-09T11:55:00
- Proof: 2026-06-09T11:45:00
- Entry/stop/risk: 7403.25 / 7469.00 / 65.75 pts
- T1/T2: 7304.75 / 7271.75
- Nearest liquidity: nearest prior low liquidity 7403.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7376.00-7396.25 parent 2026-05-06T04:55:00 confirmed 2026-05-06T05:00:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-09T11:55:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-09T11:45:00; wick 2026-06-09T11:45:00; proof 2026-06-09T11:45:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 5m LONG 7376.00-7396.25 parent 2026-05-06T04:55:00 confirmed 2026-05-06T05:00:00 status partial_touch; 240m LONG 7376.25-7390.75 parent 2026-05-06T06:00:00 confirmed 2026-05-06T10:00:00 status partial_touch; 15m LONG 7374.50-7386.50 parent 2026-05-06T05:00:00 confirmed 2026-05-06T05:15:00 status open_untouched; 60m LONG 7375.25-7386.50 parent 2026-05-06T05:00:00 confirmed 2026-05-06T06:00:00 status open_untouched; 15m LONG 7372.50-7373.50 parent 2026-05-06T04:45:00 confirmed 2026-05-06T05:00:00 status open_untouched; 5m LONG 7371.00-7371.75 parent 2026-05-06T04:35:00 confirmed 2026-05-06T04:40:00 status open_untouched; 15m LONG 7360.50-7362.00 parent 2026-05-05T18:45:00 confirmed 2026-05-05T19:00:00 status open_untouched; 15m LONG 7354.25-7358.75 parent 2026-05-05T16:30:00 confirmed 2026-05-05T16:45:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7403.75-7404.50 parent 2026-05-06T05:55:00 confirmed 2026-05-06T06:00:00 status failed_inverted; 60m LONG 7406.50-7408.00 parent 2026-05-06T07:00:00 confirmed 2026-05-06T08:00:00 status failed_inverted; 5m SHORT 7407.00-7409.25 parent 2026-05-06T08:05:00 confirmed 2026-05-06T08:10:00 status failed_inverted; 5m LONG 7407.25-7410.25 parent 2026-05-06T06:20:00 confirmed 2026-05-06T06:25:00 status failed_inverted; 15m LONG 7411.50-7413.50 parent 2026-05-06T06:30:00 confirmed 2026-05-06T06:45:00 status failed_inverted; 5m SHORT 7412.25-7414.75 parent 2026-05-07T18:05:00 confirmed 2026-05-07T18:10:00 status failed_inverted; 15m SHORT 7412.25-7413.25 parent 2026-05-06T08:00:00 confirmed 2026-05-06T08:15:00 status failed_inverted; 5m LONG 7413.00-7413.50 parent 2026-05-06T06:30:00 confirmed 2026-05-06T06:35:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7409.75-7447.75 parent 2026-06-09T11:30:00 confirmed 2026-06-09T11:45:00 status open_untouched; 5m SHORT 7426.75-7446.75 parent 2026-06-09T11:25:00 confirmed 2026-06-09T11:30:00 status open_untouched; 5m SHORT 7452.00-7453.50 parent 2026-06-09T11:20:00 confirmed 2026-06-09T11:25:00 status open_untouched; 5m SHORT 7474.00-7489.50 parent 2026-06-09T10:45:00 confirmed 2026-06-09T10:50:00 status open_untouched; 15m SHORT 7474.00-7479.00 parent 2026-06-09T10:45:00 confirmed 2026-06-09T11:00:00 status open_untouched; 5m SHORT 7504.75-7523.75 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00 status partial_touch; 15m SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 status open_untouched; 5m SHORT 7536.00-7536.50 parent 2026-06-09T10:00:00 confirmed 2026-06-09T10:05:00 status open_untouched
- Objective ladder: session_extreme 7389.50 reached 2026-06-09T12:00:00 (RTH low liquidity before proof); open_fvg 7376.25 reached 2026-06-09T12:00:00 (240m LONG open FVG partial_touch parent 2026-05-06T06:00:00 confirmed 2026-05-06T10:00:00); open_fvg 7376.00 reached 2026-06-09T12:00:00 (5m LONG open FVG partial_touch parent 2026-05-06T04:55:00 confirmed 2026-05-06T05:00:00); open_fvg 7375.25 reached 2026-06-09T12:00:00 (60m LONG open FVG open_untouched parent 2026-05-06T05:00:00 confirmed 2026-05-06T06:00:00); open_fvg 7374.50 reached 2026-06-09T12:00:00 (15m LONG open FVG open_untouched parent 2026-05-06T05:00:00 confirmed 2026-05-06T05:15:00); open_fvg 7372.50 not reached (15m LONG open FVG open_untouched parent 2026-05-06T04:45:00 confirmed 2026-05-06T05:00:00); open_fvg 7371.00 not reached (5m LONG open FVG open_untouched parent 2026-05-06T04:35:00 confirmed 2026-05-06T04:40:00); open_fvg 7360.50 not reached (15m LONG open FVG open_untouched parent 2026-05-05T18:45:00 confirmed 2026-05-05T19:00:00); open_fvg 7354.25 not reached (15m LONG open FVG partial_touch parent 2026-05-05T16:30:00 confirmed 2026-05-05T16:45:00); tactical 7304.75 not reached (T1 1.5R); tactical 7271.75 not reached (T2 2.0R)
- Story: SHORT proof completed at 2026-06-09T11:45:00 from 7409.75-7447.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7376.00-7396.25 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7389.50 session_extreme, 7376.25 open_fvg, 7376.00 open_fvg, 7375.25 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-10T19:05:00, one MES +$492.50
- Managed outcome: T1 at 2026-06-10T19:05:00, exit 7304.75, one MES +$492.50
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-09T11:45:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.
