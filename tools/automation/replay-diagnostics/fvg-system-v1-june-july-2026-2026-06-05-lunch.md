# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-05 / lunch (2026-06-05T12:00:00 to 2026-06-05T16:00:00)
Context window: 275 days (2025-09-03T00:00:00 to 2026-06-06T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 42552 bars (2025-10-28T18:05:00 to 2026-06-05T17:00:00)
- 15m: 14189 bars (2025-10-28T18:15:00 to 2026-06-05T17:00:00)
- 60m: 3508 bars (2025-10-28T19:00:00 to 2026-06-05T17:00:00)
- 120m: 1833 bars (2025-10-28T20:00:00 to 2026-06-05T17:00:00)
- 240m: 940 bars (2025-10-28T22:00:00 to 2026-06-05T16:00:00)

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
- Open below: 15m LONG 7540.00-7542.00 parent 2026-05-22T07:45:00 confirmed 2026-05-22T08:00:00 status partial_touch; 5m LONG 7538.75-7539.75 parent 2026-05-22T07:40:00 confirmed 2026-05-22T07:45:00 status open_untouched; 5m LONG 7511.75-7513.50 parent 2026-05-21T15:05:00 confirmed 2026-05-21T15:10:00 status open_untouched; 5m LONG 7493.50-7504.25 parent 2026-05-21T13:15:00 confirmed 2026-05-21T13:20:00 status partial_touch; 15m LONG 7492.50-7504.25 parent 2026-05-21T13:15:00 confirmed 2026-05-21T13:30:00 status partial_touch; 60m LONG 7500.75-7501.50 parent 2026-05-21T14:00:00 confirmed 2026-05-21T15:00:00 status open_untouched; 5m LONG 7490.00-7490.50 parent 2026-05-21T13:05:00 confirmed 2026-05-21T13:10:00 status open_untouched; 5m LONG 7488.25-7489.75 parent 2026-05-21T13:00:00 confirmed 2026-05-21T13:05:00 status open_untouched; 15m LONG 7464.25-7476.00 parent 2026-05-20T10:30:00 confirmed 2026-05-20T10:45:00 status partial_touch; 5m LONG 7461.25-7469.00 parent 2026-05-20T10:20:00 confirmed 2026-05-20T10:25:00 status partial_touch
- Failed above: 5m LONG 7554.25-7556.75 parent 2026-05-14T07:50:00 confirmed 2026-05-14T07:55:00 status failed_inverted; 5m SHORT 7554.25-7555.25 parent 2026-05-22T00:35:00 confirmed 2026-05-22T00:40:00 status failed_inverted; 5m LONG 7554.25-7554.75 parent 2026-05-22T02:40:00 confirmed 2026-05-22T02:45:00 status failed_inverted; 5m LONG 7554.25-7557.00 parent 2026-05-22T04:20:00 confirmed 2026-05-22T04:25:00 status failed_inverted; 15m LONG 7554.25-7554.50 parent 2026-05-14T08:00:00 confirmed 2026-05-14T08:15:00 status failed_inverted; 15m SHORT 7554.25-7555.50 parent 2026-05-15T01:15:00 confirmed 2026-05-15T01:30:00 status failed_inverted; 5m LONG 7555.00-7555.50 parent 2026-05-22T00:55:00 confirmed 2026-05-22T01:00:00 status failed_inverted; 5m LONG 7555.00-7556.50 parent 2026-05-22T10:35:00 confirmed 2026-05-22T10:40:00 status failed_inverted; 5m SHORT 7555.25-7555.75 parent 2026-05-14T08:50:00 confirmed 2026-05-14T08:55:00 status failed_inverted; 5m SHORT 7555.25-7555.75 parent 2026-05-22T04:35:00 confirmed 2026-05-22T04:40:00 status failed_inverted
- Open above: 15m SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 status open_untouched; 5m SHORT 7558.50-7564.25 parent 2026-06-05T11:40:00 confirmed 2026-06-05T11:45:00 status open_untouched; 15m SHORT 7575.75-7578.50 parent 2026-06-05T11:15:00 confirmed 2026-06-05T11:30:00 status open_untouched; 5m SHORT 7594.50-7599.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T09:50:00 status partial_touch; 15m SHORT 7594.50-7605.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00 status partial_touch; 60m SHORT 7597.00-7609.25 parent 2026-06-05T10:00:00 confirmed 2026-06-05T11:00:00 status open_untouched; 120m SHORT 7597.00-7622.75 parent 2026-06-05T10:00:00 confirmed 2026-06-05T12:00:00 status open_untouched; 5m SHORT 7615.75-7622.25 parent 2026-06-05T08:55:00 confirmed 2026-06-05T09:00:00 status partial_touch; 60m SHORT 7616.25-7622.75 parent 2026-06-05T09:00:00 confirmed 2026-06-05T10:00:00 status open_untouched; 5m SHORT 7642.50-7643.75 parent 2026-06-04T19:20:00 confirmed 2026-06-04T19:25:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof 2026-06-05T15:55:00 from 15M parent 2026-06-05T15:00:00 confirmed 2026-06-05T15:15:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: 7 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7575.75-7578.50 parent 2026-06-05T11:15:00 confirmed 2026-06-05T11:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-05T11:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-05T11:15:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7575.75-7578.50 parent 2026-06-05T11:15:00 confirmed 2026-06-05T11:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7575.75-7578.50 parent 2026-06-05T11:15:00 confirmed 2026-06-05T11:30:00 untested_by_15m
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

### 2. SHORT 15M FVG 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-05T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-05T11:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 untested_by_15m
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

### 3. SHORT 15M FVG 7543.50-7549.75 parent 2026-06-05T12:15:00 confirmed 2026-06-05T12:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-05T12:30:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-05T12:30:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-05T12:30:00. | PASS entry_stop_risk_contract: Entry 7535.25, protected 5M stop 7557.50, risk 22.25 pts. | PASS tactical_targets_from_actual_risk: T1 7502.00 and T2 7490.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7535.00.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-06-05T12:30:00
- 5M wick defense: 2026-06-05T12:30:00
- Proof: 2026-06-05T12:30:00
- Entry/stop/risk: 7535.25 / 7557.50 / 22.25 pts
- T1/T2: 7502.00 / 7490.75
- Nearest liquidity: nearest prior low liquidity 7535.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7511.75-7513.50 parent 2026-05-21T15:05:00 confirmed 2026-05-21T15:10:00 status open_untouched
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-05T12:50:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-05T12:30:00; wick 2026-06-05T12:30:00; proof 2026-06-05T12:30:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7511.75-7513.50 parent 2026-05-21T15:05:00 confirmed 2026-05-21T15:10:00 status open_untouched; 5m LONG 7493.50-7504.25 parent 2026-05-21T13:15:00 confirmed 2026-05-21T13:20:00 status partial_touch; 15m LONG 7492.50-7504.25 parent 2026-05-21T13:15:00 confirmed 2026-05-21T13:30:00 status partial_touch; 60m LONG 7500.75-7501.50 parent 2026-05-21T14:00:00 confirmed 2026-05-21T15:00:00 status open_untouched; 5m LONG 7490.00-7490.50 parent 2026-05-21T13:05:00 confirmed 2026-05-21T13:10:00 status open_untouched; 5m LONG 7488.25-7489.75 parent 2026-05-21T13:00:00 confirmed 2026-05-21T13:05:00 status open_untouched; 15m LONG 7464.25-7476.00 parent 2026-05-20T10:30:00 confirmed 2026-05-20T10:45:00 status partial_touch; 5m LONG 7461.25-7469.00 parent 2026-05-20T10:20:00 confirmed 2026-05-20T10:25:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7536.00-7537.00 parent 2026-05-21T18:05:00 confirmed 2026-05-21T18:10:00 status failed_inverted; 15m LONG 7536.00-7541.75 parent 2026-05-13T14:15:00 confirmed 2026-05-13T14:30:00 status failed_inverted; 5m LONG 7536.50-7537.25 parent 2026-05-22T06:50:00 confirmed 2026-05-22T06:55:00 status failed_inverted; 5m LONG 7537.00-7541.75 parent 2026-05-13T14:15:00 confirmed 2026-05-13T14:20:00 status failed_inverted; 5m LONG 7537.00-7538.25 parent 2026-05-21T18:50:00 confirmed 2026-05-21T18:55:00 status failed_inverted; 15m SHORT 7537.25-7538.50 parent 2026-05-13T16:00:00 confirmed 2026-05-13T16:15:00 status failed_inverted; 5m SHORT 7537.50-7537.75 parent 2026-05-21T14:05:00 confirmed 2026-05-21T14:10:00 status failed_inverted; 5m SHORT 7538.00-7538.75 parent 2026-05-22T06:30:00 confirmed 2026-05-22T06:35:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7543.50-7549.75 parent 2026-06-05T12:15:00 confirmed 2026-06-05T12:30:00 status open_untouched; 5m SHORT 7546.50-7547.50 parent 2026-06-05T12:10:00 confirmed 2026-06-05T12:15:00 status open_untouched; 5m SHORT 7549.00-7552.00 parent 2026-06-05T12:05:00 confirmed 2026-06-05T12:10:00 status open_untouched; 15m SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 status open_untouched; 5m SHORT 7558.50-7564.25 parent 2026-06-05T11:40:00 confirmed 2026-06-05T11:45:00 status open_untouched; 15m SHORT 7575.75-7578.50 parent 2026-06-05T11:15:00 confirmed 2026-06-05T11:30:00 status open_untouched; 5m SHORT 7594.50-7599.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T09:50:00 status partial_touch; 15m SHORT 7594.50-7605.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00 status partial_touch
- Objective ladder: session_extreme 7533.75 reached 2026-06-05T12:35:00 (RTH low liquidity before proof); open_fvg 7511.75 reached 2026-06-05T14:15:00 (5m LONG open FVG open_untouched parent 2026-05-21T15:05:00 confirmed 2026-05-21T15:10:00); tactical 7502.00 reached 2026-06-05T14:20:00 (T1 1.5R); open_fvg 7500.75 reached 2026-06-05T14:20:00 (60m LONG open FVG open_untouched parent 2026-05-21T14:00:00 confirmed 2026-05-21T15:00:00); open_fvg 7493.50 reached 2026-06-05T14:30:00 (5m LONG open FVG partial_touch parent 2026-05-21T13:15:00 confirmed 2026-05-21T13:20:00); open_fvg 7492.50 reached 2026-06-05T14:35:00 (15m LONG open FVG partial_touch parent 2026-05-21T13:15:00 confirmed 2026-05-21T13:30:00); tactical 7490.75 reached 2026-06-05T14:40:00 (T2 2.0R); open_fvg 7490.00 reached 2026-06-05T14:40:00 (5m LONG open FVG open_untouched parent 2026-05-21T13:05:00 confirmed 2026-05-21T13:10:00); open_fvg 7488.25 reached 2026-06-05T14:45:00 (5m LONG open FVG open_untouched parent 2026-05-21T13:00:00 confirmed 2026-05-21T13:05:00); open_fvg 7464.25 reached 2026-06-05T15:10:00 (15m LONG open FVG partial_touch parent 2026-05-20T10:30:00 confirmed 2026-05-20T10:45:00); open_fvg 7461.25 reached 2026-06-05T15:15:00 (5m LONG open FVG partial_touch parent 2026-05-20T10:20:00 confirmed 2026-05-20T10:25:00)
- Story: SHORT proof completed at 2026-06-05T12:30:00 from 7543.50-7549.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7511.75-7513.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7533.75 session_extreme, 7511.75 open_fvg, 7500.75 open_fvg, 7493.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-05T14:20:00, one MES +$166.25
- Managed outcome: T1 at 2026-06-05T14:20:00, exit 7502.00, one MES +$166.25
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-05T12:30:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 4. SHORT 15M FVG 7536.00-7537.75 parent 2026-06-05T12:30:00 confirmed 2026-06-05T12:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-05T12:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-05T13:40:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-05T13:45:00. | PASS entry_stop_risk_contract: Entry 7526.00, protected 5M stop 7543.50, risk 17.50 pts. | PASS tactical_targets_from_actual_risk: T1 7499.75 and T2 7491.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7525.25.
- Parent displacement: yes
- Parent displacement candle: 2026-06-05T12:45:00
- Parent failure: not found
- First 5M return: 2026-06-05T13:40:00
- 5M wick defense: none
- Proof: 2026-06-05T13:45:00
- Entry/stop/risk: 7526.00 / 7543.50 / 17.50 pts
- T1/T2: 7499.75 / 7491.00
- Nearest liquidity: nearest prior low liquidity 7525.25
- Defended-area / obstacle management callout before or near T1: 5m LONG 7511.75-7513.50 parent 2026-05-21T15:05:00 confirmed 2026-05-21T15:10:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-05T14:15:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 untested_by_15m
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-06-05T13:40:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: 7515.75 (prior 5M swing low liquidity from 2026-06-05T13:25:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7511.75-7513.50 parent 2026-05-21T15:05:00 confirmed 2026-05-21T15:10:00 status partial_touch; 5m LONG 7493.50-7504.25 parent 2026-05-21T13:15:00 confirmed 2026-05-21T13:20:00 status partial_touch; 15m LONG 7492.50-7504.25 parent 2026-05-21T13:15:00 confirmed 2026-05-21T13:30:00 status partial_touch; 60m LONG 7500.75-7501.50 parent 2026-05-21T14:00:00 confirmed 2026-05-21T15:00:00 status open_untouched; 5m LONG 7490.00-7490.50 parent 2026-05-21T13:05:00 confirmed 2026-05-21T13:10:00 status open_untouched; 5m LONG 7488.25-7489.75 parent 2026-05-21T13:00:00 confirmed 2026-05-21T13:05:00 status open_untouched; 15m LONG 7464.25-7476.00 parent 2026-05-20T10:30:00 confirmed 2026-05-20T10:45:00 status partial_touch; 5m LONG 7461.25-7469.00 parent 2026-05-20T10:20:00 confirmed 2026-05-20T10:25:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7526.25-7527.00 parent 2026-05-15T07:05:00 confirmed 2026-05-15T07:10:00 status failed_inverted; 5m SHORT 7526.75-7527.50 parent 2026-06-05T13:05:00 confirmed 2026-06-05T13:10:00 status failed_inverted; 15m SHORT 7526.75-7530.00 parent 2026-05-21T15:00:00 confirmed 2026-05-21T15:15:00 status failed_inverted; 5m LONG 7527.00-7529.00 parent 2026-05-13T13:00:00 confirmed 2026-05-13T13:05:00 status failed_inverted; 15m LONG 7527.00-7529.00 parent 2026-05-13T13:00:00 confirmed 2026-05-13T13:15:00 status failed_inverted; 5m LONG 7528.00-7528.75 parent 2026-05-21T13:40:00 confirmed 2026-05-21T13:45:00 status failed_inverted; 5m SHORT 7529.00-7536.50 parent 2026-05-15T04:05:00 confirmed 2026-05-15T04:10:00 status failed_inverted; 5m LONG 7529.00-7530.00 parent 2026-06-05T13:35:00 confirmed 2026-06-05T13:40:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7543.50-7549.75 parent 2026-06-05T12:15:00 confirmed 2026-06-05T12:30:00 status open_untouched; 5m SHORT 7546.50-7547.50 parent 2026-06-05T12:10:00 confirmed 2026-06-05T12:15:00 status open_untouched; 5m SHORT 7549.00-7552.00 parent 2026-06-05T12:05:00 confirmed 2026-06-05T12:10:00 status open_untouched; 60m SHORT 7554.00-7569.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T13:00:00 status open_untouched; 15m SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 status open_untouched; 5m SHORT 7558.50-7564.25 parent 2026-06-05T11:40:00 confirmed 2026-06-05T11:45:00 status open_untouched; 15m SHORT 7575.75-7578.50 parent 2026-06-05T11:15:00 confirmed 2026-06-05T11:30:00 status open_untouched; 5m SHORT 7594.50-7599.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T09:50:00 status partial_touch
- Objective ladder: liquidity 7515.75 reached 2026-06-05T14:15:00 (prior 5M swing low liquidity from 2026-06-05T13:25:00); liquidity 7512.25 reached 2026-06-05T14:15:00 (prior 5M swing low liquidity from 2026-06-05T12:50:00); session_extreme 7512.25 reached 2026-06-05T14:15:00 (RTH low liquidity before proof); open_fvg 7511.75 reached 2026-06-05T14:15:00 (5m LONG open FVG partial_touch parent 2026-05-21T15:05:00 confirmed 2026-05-21T15:10:00); open_fvg 7500.75 reached 2026-06-05T14:20:00 (60m LONG open FVG open_untouched parent 2026-05-21T14:00:00 confirmed 2026-05-21T15:00:00); tactical 7499.75 reached 2026-06-05T14:30:00 (T1 1.5R); open_fvg 7493.50 reached 2026-06-05T14:30:00 (5m LONG open FVG partial_touch parent 2026-05-21T13:15:00 confirmed 2026-05-21T13:20:00); open_fvg 7492.50 reached 2026-06-05T14:35:00 (15m LONG open FVG partial_touch parent 2026-05-21T13:15:00 confirmed 2026-05-21T13:30:00); tactical 7491.00 reached 2026-06-05T14:40:00 (T2 2.0R); open_fvg 7490.00 reached 2026-06-05T14:40:00 (5m LONG open FVG open_untouched parent 2026-05-21T13:05:00 confirmed 2026-05-21T13:10:00); open_fvg 7488.25 reached 2026-06-05T14:45:00 (5m LONG open FVG open_untouched parent 2026-05-21T13:00:00 confirmed 2026-05-21T13:05:00); open_fvg 7464.25 reached 2026-06-05T15:10:00 (15m LONG open FVG partial_touch parent 2026-05-20T10:30:00 confirmed 2026-05-20T10:45:00); open_fvg 7461.25 reached 2026-06-05T15:15:00 (5m LONG open FVG partial_touch parent 2026-05-20T10:20:00 confirmed 2026-05-20T10:25:00)
- Story: SHORT proof completed at 2026-06-05T13:45:00 from 7536.00-7537.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7511.75-7513.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7515.75 liquidity, 7512.25 liquidity, 7512.25 session_extreme, 7511.75 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-05T14:30:00, one MES +$131.25
- Managed outcome: LQ1 at 2026-06-05T14:15:00, exit 7515.75, one MES +$51.25
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 5. SHORT 15M FVG 7509.75-7524.00 parent 2026-06-05T14:15:00 confirmed 2026-06-05T14:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-05T14:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-05T14:15:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 untested_by_15m
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

### 6. SHORT 15M FVG 7499.25-7509.00 parent 2026-06-05T14:30:00 confirmed 2026-06-05T14:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-05T14:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-05T14:15:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 untested_by_15m
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

### 7. SHORT 15M FVG 7489.75-7493.00 parent 2026-06-05T14:45:00 confirmed 2026-06-05T15:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-05T15:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-05T15:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-05T15:00:00. | PASS entry_stop_risk_contract: Entry 7480.00, protected 5M stop 7536.00, risk 56.00 pts. | PASS tactical_targets_from_actual_risk: T1 7396.00 and T2 7368.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7479.75.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-06-05T15:00:00
- 5M wick defense: 2026-06-05T15:00:00
- Proof: 2026-06-05T15:00:00
- Entry/stop/risk: 7480.00 / 7536.00 / 56.00 pts
- T1/T2: 7396.00 / 7368.00
- Nearest liquidity: nearest prior low liquidity 7479.75
- Defended-area / obstacle management callout before or near T1: 15m LONG 7464.25-7476.00 parent 2026-05-20T10:30:00 confirmed 2026-05-20T10:45:00 status partial_touch
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-05T15:05:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-05T15:00:00; wick 2026-06-05T15:00:00; proof 2026-06-05T15:00:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 15m LONG 7464.25-7476.00 parent 2026-05-20T10:30:00 confirmed 2026-05-20T10:45:00 status partial_touch; 5m LONG 7461.25-7469.00 parent 2026-05-20T10:20:00 confirmed 2026-05-20T10:25:00 status partial_touch; 5m LONG 7437.50-7439.00 parent 2026-05-20T01:55:00 confirmed 2026-05-20T02:00:00 status partial_touch; 60m LONG 7438.25-7439.00 parent 2026-05-20T02:00:00 confirmed 2026-05-20T03:00:00 status open_untouched; 5m LONG 7428.50-7433.50 parent 2026-05-20T01:05:00 confirmed 2026-05-20T01:10:00 status partial_touch; 5m LONG 7416.00-7417.25 parent 2026-05-07T19:25:00 confirmed 2026-05-07T19:30:00 status partial_touch; 120m LONG 7378.25-7403.75 parent 2026-05-06T06:00:00 confirmed 2026-05-06T08:00:00 status partial_touch; 5m LONG 7376.00-7396.25 parent 2026-05-06T04:55:00 confirmed 2026-05-06T05:00:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7480.25-7481.00 parent 2026-05-11T06:00:00 confirmed 2026-05-11T06:05:00 status failed_inverted; 5m SHORT 7480.25-7481.75 parent 2026-05-17T19:25:00 confirmed 2026-05-17T19:30:00 status failed_inverted; 5m SHORT 7480.25-7483.50 parent 2026-05-18T11:05:00 confirmed 2026-05-18T11:10:00 status failed_inverted; 5m SHORT 7480.25-7481.25 parent 2026-05-18T21:25:00 confirmed 2026-05-18T21:30:00 status failed_inverted; 5m SHORT 7480.25-7484.50 parent 2026-05-18T22:00:00 confirmed 2026-05-18T22:05:00 status failed_inverted; 5m SHORT 7480.25-7485.75 parent 2026-05-20T18:10:00 confirmed 2026-05-20T18:15:00 status failed_inverted; 15m SHORT 7480.25-7481.25 parent 2026-05-12T02:30:00 confirmed 2026-05-12T02:45:00 status failed_inverted; 60m SHORT 7480.25-7486.50 parent 2026-05-18T22:00:00 confirmed 2026-05-18T23:00:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7489.75-7493.00 parent 2026-06-05T14:45:00 confirmed 2026-06-05T15:00:00 status open_untouched; 5m SHORT 7499.25-7501.50 parent 2026-06-05T14:30:00 confirmed 2026-06-05T14:35:00 status open_untouched; 15m SHORT 7499.25-7509.00 parent 2026-06-05T14:30:00 confirmed 2026-06-05T14:45:00 status open_untouched; 5m SHORT 7508.00-7509.00 parent 2026-06-05T14:20:00 confirmed 2026-06-05T14:25:00 status open_untouched; 5m SHORT 7509.75-7518.75 parent 2026-06-05T14:15:00 confirmed 2026-06-05T14:20:00 status open_untouched; 15m SHORT 7509.75-7524.00 parent 2026-06-05T14:15:00 confirmed 2026-06-05T14:30:00 status open_untouched; 5m SHORT 7524.00-7528.00 parent 2026-06-05T14:05:00 confirmed 2026-06-05T14:10:00 status open_untouched; 60m SHORT 7541.25-7549.75 parent 2026-06-05T13:00:00 confirmed 2026-06-05T14:00:00 status open_untouched
- Objective ladder: session_extreme 7472.50 reached 2026-06-05T15:05:00 (RTH low liquidity before proof); open_fvg 7464.25 reached 2026-06-05T15:10:00 (15m LONG open FVG partial_touch parent 2026-05-20T10:30:00 confirmed 2026-05-20T10:45:00); open_fvg 7461.25 reached 2026-06-05T15:15:00 (5m LONG open FVG partial_touch parent 2026-05-20T10:20:00 confirmed 2026-05-20T10:25:00); open_fvg 7438.25 not reached (60m LONG open FVG open_untouched parent 2026-05-20T02:00:00 confirmed 2026-05-20T03:00:00); open_fvg 7437.50 not reached (5m LONG open FVG partial_touch parent 2026-05-20T01:55:00 confirmed 2026-05-20T02:00:00); open_fvg 7428.50 not reached (5m LONG open FVG partial_touch parent 2026-05-20T01:05:00 confirmed 2026-05-20T01:10:00); open_fvg 7416.00 not reached (5m LONG open FVG partial_touch parent 2026-05-07T19:25:00 confirmed 2026-05-07T19:30:00); tactical 7396.00 not reached (T1 1.5R); open_fvg 7378.25 not reached (120m LONG open FVG partial_touch parent 2026-05-06T06:00:00 confirmed 2026-05-06T08:00:00); open_fvg 7376.00 not reached (5m LONG open FVG partial_touch parent 2026-05-06T04:55:00 confirmed 2026-05-06T05:00:00); tactical 7368.00 not reached (T2 2.0R)
- Story: SHORT proof completed at 2026-06-05T15:00:00 from 7489.75-7493.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 15m 7464.25-7476.00 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7472.50 session_extreme, 7464.25 open_fvg, 7461.25 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-06-05T17:00:00, one MES +$242.50
- Managed outcome: SessionClose at 2026-06-05T17:00:00, exit 7431.50, one MES +$242.50
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-05T15:00:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 8. SHORT 15M FVG 7481.75-7485.25 parent 2026-06-05T15:00:00 confirmed 2026-06-05T15:15:00
- Verdict: valid_trace_candidate
- Continuation read: clean_continuation
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-05T15:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-05T15:55:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-05T15:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-05T15:55:00. | PASS entry_stop_risk_contract: Entry 7480.00, protected 5M stop 7489.75, risk 9.75 pts. | PASS tactical_targets_from_actual_risk: T1 7465.50 and T2 7460.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7479.75.
- Parent displacement: yes
- Parent displacement candle: 2026-06-05T15:15:00
- Parent failure: not found
- First 5M return: 2026-06-05T15:55:00
- 5M wick defense: 2026-06-05T15:55:00
- Proof: 2026-06-05T15:55:00
- Entry/stop/risk: 7480.00 / 7489.75 / 9.75 pts
- T1/T2: 7465.50 / 7460.50
- Nearest liquidity: nearest prior low liquidity 7479.75
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-05T15:55:00; wick 2026-06-05T15:55:00; proof 2026-06-05T15:55:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 5m LONG 7457.25-7460.50 parent 2026-06-05T15:30:00 confirmed 2026-06-05T15:35:00 status partial_touch; 5m LONG 7437.50-7439.00 parent 2026-05-20T01:55:00 confirmed 2026-05-20T02:00:00 status partial_touch; 60m LONG 7438.25-7439.00 parent 2026-05-20T02:00:00 confirmed 2026-05-20T03:00:00 status open_untouched; 5m LONG 7428.50-7433.50 parent 2026-05-20T01:05:00 confirmed 2026-05-20T01:10:00 status partial_touch; 5m LONG 7416.00-7417.25 parent 2026-05-07T19:25:00 confirmed 2026-05-07T19:30:00 status partial_touch; 120m LONG 7378.25-7403.75 parent 2026-05-06T06:00:00 confirmed 2026-05-06T08:00:00 status partial_touch; 5m LONG 7376.00-7396.25 parent 2026-05-06T04:55:00 confirmed 2026-05-06T05:00:00 status partial_touch; 5m LONG 7390.25-7393.00 parent 2026-05-06T05:15:00 confirmed 2026-05-06T05:20:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7480.25-7481.00 parent 2026-05-11T06:00:00 confirmed 2026-05-11T06:05:00 status failed_inverted; 5m SHORT 7480.25-7481.75 parent 2026-05-17T19:25:00 confirmed 2026-05-17T19:30:00 status failed_inverted; 5m SHORT 7480.25-7483.50 parent 2026-05-18T11:05:00 confirmed 2026-05-18T11:10:00 status failed_inverted; 5m SHORT 7480.25-7481.25 parent 2026-05-18T21:25:00 confirmed 2026-05-18T21:30:00 status failed_inverted; 5m SHORT 7480.25-7484.50 parent 2026-05-18T22:00:00 confirmed 2026-05-18T22:05:00 status failed_inverted; 5m SHORT 7480.25-7485.75 parent 2026-05-20T18:10:00 confirmed 2026-05-20T18:15:00 status failed_inverted; 15m SHORT 7480.25-7481.25 parent 2026-05-12T02:30:00 confirmed 2026-05-12T02:45:00 status failed_inverted; 60m SHORT 7480.25-7486.50 parent 2026-05-18T22:00:00 confirmed 2026-05-18T23:00:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7481.75-7485.25 parent 2026-06-05T15:00:00 confirmed 2026-06-05T15:15:00 status open_untouched; 15m SHORT 7489.75-7493.00 parent 2026-06-05T14:45:00 confirmed 2026-06-05T15:00:00 status open_untouched; 5m SHORT 7499.25-7501.50 parent 2026-06-05T14:30:00 confirmed 2026-06-05T14:35:00 status open_untouched; 15m SHORT 7499.25-7509.00 parent 2026-06-05T14:30:00 confirmed 2026-06-05T14:45:00 status open_untouched; 5m SHORT 7508.00-7509.00 parent 2026-06-05T14:20:00 confirmed 2026-06-05T14:25:00 status open_untouched; 5m SHORT 7509.75-7518.75 parent 2026-06-05T14:15:00 confirmed 2026-06-05T14:20:00 status open_untouched; 15m SHORT 7509.75-7524.00 parent 2026-06-05T14:15:00 confirmed 2026-06-05T14:30:00 status open_untouched; 5m SHORT 7524.00-7528.00 parent 2026-06-05T14:05:00 confirmed 2026-06-05T14:10:00 status open_untouched
- Objective ladder: tactical 7465.50 reached 2026-06-05T16:00:00 (T1 1.5R); tactical 7460.50 not reached (T2 2.0R); open_fvg 7457.25 not reached (5m LONG open FVG partial_touch parent 2026-06-05T15:30:00 confirmed 2026-06-05T15:35:00); liquidity 7443.25 not reached (prior 5M swing low liquidity from 2026-06-05T15:20:00); session_extreme 7443.25 not reached (RTH low liquidity before proof); open_fvg 7438.25 not reached (60m LONG open FVG open_untouched parent 2026-05-20T02:00:00 confirmed 2026-05-20T03:00:00); open_fvg 7437.50 not reached (5m LONG open FVG partial_touch parent 2026-05-20T01:55:00 confirmed 2026-05-20T02:00:00); open_fvg 7428.50 not reached (5m LONG open FVG partial_touch parent 2026-05-20T01:05:00 confirmed 2026-05-20T01:10:00); open_fvg 7416.00 not reached (5m LONG open FVG partial_touch parent 2026-05-07T19:25:00 confirmed 2026-05-07T19:30:00); open_fvg 7390.25 not reached (5m LONG open FVG partial_touch parent 2026-05-06T05:15:00 confirmed 2026-05-06T05:20:00); open_fvg 7378.25 not reached (120m LONG open FVG partial_touch parent 2026-05-06T06:00:00 confirmed 2026-05-06T08:00:00); open_fvg 7376.00 not reached (5m LONG open FVG partial_touch parent 2026-05-06T04:55:00 confirmed 2026-05-06T05:00:00)
- Story: SHORT proof completed at 2026-06-05T15:55:00 from 7481.75-7485.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. No opposing FVG obstacle was loaded before T1. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-05T16:00:00, one MES +$72.50
- Managed outcome: T1 at 2026-06-05T16:00:00, exit 7465.50, one MES +$72.50
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-05T15:55:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.
