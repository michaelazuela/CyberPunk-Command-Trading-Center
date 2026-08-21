# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-01 / morning (2026-07-01T09:15:00 to 2026-07-01T12:00:00)
Context window: 275 days (2025-09-29T00:00:00 to 2026-07-02T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 47819 bars (2025-10-28T18:05:00 to 2026-07-02T23:55:00)
- 15m: 15961 bars (2025-10-28T18:15:00 to 2026-07-02T23:45:00)
- 60m: 3966 bars (2025-10-28T19:00:00 to 2026-07-02T23:00:00)
- 120m: 2081 bars (2025-10-28T20:00:00 to 2026-07-02T22:00:00)
- 240m: 1153 bars (2025-10-28T22:00:00 to 2026-07-02T22:00:00)

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
- Open below: 5m LONG 7517.00-7517.75 parent 2026-07-01T03:25:00 confirmed 2026-07-01T03:30:00 status partial_touch; 15m LONG 7500.75-7503.50 parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00 status open_untouched; 120m LONG 7476.25-7491.25 parent 2026-06-29T14:00:00 confirmed 2026-06-29T16:00:00 status partial_touch; 5m LONG 7487.25-7487.50 parent 2026-06-29T21:20:00 confirmed 2026-06-29T21:25:00 status open_untouched; 15m LONG 7480.00-7485.00 parent 2026-06-29T13:15:00 confirmed 2026-06-29T13:30:00 status partial_touch; 5m LONG 7481.50-7483.25 parent 2026-06-29T13:10:00 confirmed 2026-06-29T13:15:00 status partial_touch; 5m LONG 7479.50-7480.25 parent 2026-06-29T13:05:00 confirmed 2026-06-29T13:10:00 status open_untouched; 15m LONG 7476.25-7477.25 parent 2026-06-29T13:00:00 confirmed 2026-06-29T13:15:00 status open_untouched; 60m LONG 7476.25-7477.25 parent 2026-06-29T13:00:00 confirmed 2026-06-29T14:00:00 status open_untouched; 5m LONG 7434.50-7448.00 parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00 status partial_touch
- Failed above: 5m LONG 7527.25-7527.50 parent 2026-06-22T20:35:00 confirmed 2026-06-22T20:40:00 status failed_inverted; 5m SHORT 7527.25-7530.50 parent 2026-06-30T22:10:00 confirmed 2026-06-30T22:15:00 status failed_inverted; 5m LONG 7527.50-7529.25 parent 2026-06-19T01:55:00 confirmed 2026-06-19T02:00:00 status failed_inverted; 15m LONG 7527.75-7531.00 parent 2026-06-17T19:15:00 confirmed 2026-06-17T19:30:00 status failed_inverted; 60m LONG 7527.75-7539.75 parent 2026-06-17T20:00:00 confirmed 2026-06-17T21:00:00 status failed_inverted; 5m LONG 7528.00-7528.75 parent 2026-05-21T13:40:00 confirmed 2026-05-21T13:45:00 status failed_inverted; 15m SHORT 7528.25-7531.75 parent 2026-06-30T22:15:00 confirmed 2026-06-30T22:30:00 status failed_inverted; 5m LONG 7528.50-7531.00 parent 2026-06-17T19:15:00 confirmed 2026-06-17T19:20:00 status failed_inverted; 5m SHORT 7528.50-7529.50 parent 2026-06-22T21:40:00 confirmed 2026-06-22T21:45:00 status failed_inverted; 5m LONG 7528.50-7528.75 parent 2026-06-30T22:45:00 confirmed 2026-06-30T22:50:00 status failed_inverted
- Open above: 5m SHORT 7527.75-7528.25 parent 2026-07-01T09:10:00 confirmed 2026-07-01T09:15:00 status open_untouched; 5m SHORT 7531.25-7535.50 parent 2026-07-01T08:35:00 confirmed 2026-07-01T08:40:00 status partial_touch; 60m SHORT 7533.25-7542.00 parent 2026-06-30T22:00:00 confirmed 2026-06-30T23:00:00 status partial_touch; 120m SHORT 7534.00-7541.00 parent 2026-06-30T22:00:00 confirmed 2026-07-01T00:00:00 status partial_touch; 15m SHORT 7540.75-7544.75 parent 2026-06-30T21:15:00 confirmed 2026-06-30T21:30:00 status open_untouched; 5m SHORT 7541.50-7544.75 parent 2026-06-30T21:05:00 confirmed 2026-06-30T21:10:00 status open_untouched; 15m SHORT 7553.25-7554.25 parent 2026-06-30T16:00:00 confirmed 2026-06-30T16:15:00 status open_untouched; 60m SHORT 7559.25-7568.00 parent 2026-06-22T11:00:00 confirmed 2026-06-22T12:00:00 status partial_touch; 5m SHORT 7562.50-7569.50 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:35:00 status partial_touch; 15m SHORT 7562.50-7589.00 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:45:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof 2026-07-01T10:50:00 from 15M parent 2026-07-01T10:15:00 confirmed 2026-07-01T10:30:00.
- Defended-area management context: 5m SHORT 7548.50-7550.00 is a callout before/near T1, not an issue by itself.
- Later rows: 2 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7537.00-7546.75 parent 2026-07-01T10:15:00 confirmed 2026-07-01T10:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-01T10:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-01T10:35:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-01T10:50:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-01T10:50:00. | PASS entry_stop_risk_contract: Entry 7548.25, protected 5M stop 7506.00, risk 42.25 pts. | PASS tactical_targets_from_actual_risk: T1 7611.75 and T2 7632.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7548.50.
- Parent displacement: yes
- Parent displacement candle: 2026-07-01T10:15:00
- Parent failure: not found
- First 5M return: 2026-07-01T10:35:00
- 5M wick defense: 2026-07-01T10:50:00
- Proof: 2026-07-01T10:50:00
- Entry/stop/risk: 7548.25 / 7506.00 / 42.25 pts
- T1/T2: 7611.75 / 7632.75
- Nearest liquidity: nearest prior high liquidity 7548.50
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7548.50-7550.00 parent 2026-05-14T04:45:00 confirmed 2026-05-14T04:50:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-01T10:55:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7537.00-7546.75 parent 2026-07-01T10:15:00 confirmed 2026-07-01T10:30:00 defended_on_15m defended 2026-07-01T10:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7537.00-7546.75 parent 2026-07-01T10:15:00 confirmed 2026-07-01T10:30:00 defended_on_15m defended 2026-07-01T10:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-01T10:35:00; wick 2026-07-01T10:50:00; proof 2026-07-01T10:50:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 15m LONG 7537.00-7546.75 parent 2026-07-01T10:15:00 confirmed 2026-07-01T10:30:00 status partial_touch; 60m SHORT 7533.25-7542.00 parent 2026-06-30T22:00:00 confirmed 2026-06-30T23:00:00 status partial_touch; 120m SHORT 7534.00-7541.00 parent 2026-06-30T22:00:00 confirmed 2026-07-01T00:00:00 status partial_touch; 5m LONG 7532.50-7533.00 parent 2026-07-01T10:00:00 confirmed 2026-07-01T10:05:00 status open_untouched; 5m LONG 7524.25-7528.00 parent 2026-07-01T09:55:00 confirmed 2026-07-01T10:00:00 status open_untouched; 15m LONG 7500.75-7503.50 parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00 status open_untouched; 120m LONG 7476.25-7491.25 parent 2026-06-29T14:00:00 confirmed 2026-06-29T16:00:00 status partial_touch; 5m LONG 7487.25-7487.50 parent 2026-06-29T21:20:00 confirmed 2026-06-29T21:25:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7548.50-7550.00 parent 2026-05-14T04:45:00 confirmed 2026-05-14T04:50:00 status failed_inverted; 5m LONG 7548.50-7549.00 parent 2026-05-14T04:55:00 confirmed 2026-05-14T05:00:00 status failed_inverted; 15m SHORT 7548.50-7550.00 parent 2026-06-18T22:00:00 confirmed 2026-06-18T22:15:00 status failed_inverted; 60m LONG 7548.50-7552.25 parent 2026-05-22T00:00:00 confirmed 2026-05-22T01:00:00 status failed_inverted; 5m SHORT 7548.75-7549.00 parent 2026-05-14T03:55:00 confirmed 2026-05-14T04:00:00 status failed_inverted; 5m SHORT 7548.75-7582.50 parent 2026-06-17T14:05:00 confirmed 2026-06-17T14:10:00 status failed_inverted; 5m SHORT 7548.75-7557.25 parent 2026-06-18T09:40:00 confirmed 2026-06-18T09:45:00 status failed_inverted; 15m LONG 7548.75-7549.25 parent 2026-05-13T20:45:00 confirmed 2026-05-13T21:00:00 status failed_inverted
- Open FVGs above at proof: 60m SHORT 7559.25-7568.00 parent 2026-06-22T11:00:00 confirmed 2026-06-22T12:00:00 status partial_touch; 5m SHORT 7562.50-7569.50 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:35:00 status partial_touch; 15m SHORT 7562.50-7589.00 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:45:00 status partial_touch; 5m SHORT 7574.75-7579.25 parent 2026-06-22T10:25:00 confirmed 2026-06-22T10:30:00 status open_untouched; 5m SHORT 7581.75-7589.00 parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched
- Objective ladder: liquidity 7553.75 reached 2026-07-01T10:55:00 (prior 5M swing high liquidity from 2026-07-01T10:30:00); session_extreme 7555.50 reached 2026-07-01T11:05:00 (RTH high liquidity before proof); open_fvg 7568.00 reached 2026-07-01T11:20:00 (60m SHORT open FVG partial_touch parent 2026-06-22T11:00:00 confirmed 2026-06-22T12:00:00); open_fvg 7569.50 reached 2026-07-01T11:20:00 (5m SHORT open FVG partial_touch parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:35:00); open_fvg 7579.25 not reached (5m SHORT open FVG open_untouched parent 2026-06-22T10:25:00 confirmed 2026-06-22T10:30:00); open_fvg 7589.00 not reached (15m SHORT open FVG partial_touch parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:45:00); open_fvg 7589.00 not reached (5m SHORT open FVG open_untouched parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00); open_fvg 7605.25 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00); open_fvg 7609.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00); tactical 7611.75 not reached (T1 1.5R); open_fvg 7628.00 not reached (5m SHORT open FVG open_untouched parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00); tactical 7632.75 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-07-01T10:50:00 from 7537.00-7546.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7548.50-7550.00 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7553.75 liquidity, 7555.50 session_extreme, 7568.00 open_fvg, 7569.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-02T12:40:00, one MES $-211.25
- Managed outcome: Stop at 2026-07-02T12:40:00, exit 7506.00, one MES $-211.25
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-01T10:50:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 2. LONG 15M FVG 7554.00-7563.75 parent 2026-07-01T11:15:00 confirmed 2026-07-01T11:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-01T11:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-01T11:15:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7537.00-7546.75 parent 2026-07-01T10:15:00 confirmed 2026-07-01T10:30:00 defended_on_15m defended 2026-07-01T10:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7537.00-7546.75 parent 2026-07-01T10:15:00 confirmed 2026-07-01T10:30:00 defended_on_15m defended 2026-07-01T10:45:00
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

### 3. LONG 15M FVG 7564.50-7567.50 parent 2026-07-01T11:30:00 confirmed 2026-07-01T11:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-01T11:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-01T11:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7537.00-7546.75 parent 2026-07-01T10:15:00 confirmed 2026-07-01T10:30:00 defended_on_15m defended 2026-07-01T10:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7537.00-7546.75 parent 2026-07-01T10:15:00 confirmed 2026-07-01T10:30:00 defended_on_15m defended 2026-07-01T10:45:00
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
