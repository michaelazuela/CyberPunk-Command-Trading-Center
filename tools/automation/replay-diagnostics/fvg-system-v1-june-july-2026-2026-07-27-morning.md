# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-27 / morning (2026-07-27T09:15:00 to 2026-07-27T12:00:00)
Context window: 275 days (2025-10-25T00:00:00 to 2026-07-28T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 52739 bars (2025-10-28T18:05:00 to 2026-07-28T23:55:00)
- 15m: 17601 bars (2025-10-28T18:15:00 to 2026-07-28T23:45:00)
- 60m: 4391 bars (2025-10-28T19:00:00 to 2026-07-28T23:00:00)
- 120m: 2306 bars (2025-10-28T20:00:00 to 2026-07-28T22:00:00)
- 240m: 1320 bars (2025-10-28T22:00:00 to 2026-07-28T22:00:00)

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
- Open below: 15m LONG 7509.25-7510.75 parent 2026-07-27T08:45:00 confirmed 2026-07-27T09:00:00 status partial_touch; 120m LONG 7503.50-7505.50 parent 2026-07-27T02:00:00 confirmed 2026-07-27T04:00:00 status partial_touch; 15m LONG 7503.75-7504.25 parent 2026-07-27T00:45:00 confirmed 2026-07-27T01:00:00 status partial_touch; 60m LONG 7503.50-7504.00 parent 2026-07-27T01:00:00 confirmed 2026-07-27T02:00:00 status open_untouched; 240m LONG 7472.00-7495.75 parent 2026-07-26T22:00:00 confirmed 2026-07-27T02:00:00 status open_untouched; 15m LONG 7492.75-7493.25 parent 2026-07-26T21:45:00 confirmed 2026-07-26T22:00:00 status open_untouched; 5m LONG 7490.50-7491.50 parent 2026-07-26T21:35:00 confirmed 2026-07-26T21:40:00 status open_untouched; 15m LONG 7447.25-7491.50 parent 2026-07-26T18:15:00 confirmed 2026-07-26T18:30:00 status partial_touch; 60m LONG 7450.00-7491.25 parent 2026-07-26T19:00:00 confirmed 2026-07-26T20:00:00 status partial_touch; 5m LONG 7447.25-7490.25 parent 2026-07-26T18:05:00 confirmed 2026-07-26T18:10:00 status partial_touch
- Failed above: 5m SHORT 7512.50-7515.75 parent 2026-05-13T04:50:00 confirmed 2026-05-13T04:55:00 status failed_inverted; 5m SHORT 7512.50-7514.75 parent 2026-06-30T07:25:00 confirmed 2026-06-30T07:30:00 status failed_inverted; 5m LONG 7512.50-7513.75 parent 2026-06-30T07:45:00 confirmed 2026-06-30T07:50:00 status failed_inverted; 5m SHORT 7512.50-7512.75 parent 2026-07-17T08:10:00 confirmed 2026-07-17T08:15:00 status failed_inverted; 15m LONG 7512.50-7514.25 parent 2026-06-08T07:30:00 confirmed 2026-06-08T07:45:00 status failed_inverted; 15m SHORT 7512.50-7512.75 parent 2026-07-27T03:45:00 confirmed 2026-07-27T04:00:00 status failed_inverted; 240m LONG 7512.50-7529.25 parent 2026-05-13T14:00:00 confirmed 2026-05-13T17:00:00 status failed_inverted; 5m LONG 7512.75-7515.25 parent 2026-06-09T09:00:00 confirmed 2026-06-09T09:05:00 status failed_inverted; 15m LONG 7512.75-7520.50 parent 2026-05-21T13:30:00 confirmed 2026-05-21T13:45:00 status failed_inverted; 5m LONG 7513.00-7513.50 parent 2026-05-21T00:45:00 confirmed 2026-05-21T00:50:00 status failed_inverted
- Open above: 5m SHORT 7514.75-7515.50 parent 2026-07-27T07:30:00 confirmed 2026-07-27T07:35:00 status partial_touch; 15m SHORT 7515.25-7516.75 parent 2026-07-27T07:30:00 confirmed 2026-07-27T07:45:00 status partial_touch; 60m SHORT 7515.25-7518.25 parent 2026-07-27T08:00:00 confirmed 2026-07-27T09:00:00 status open_untouched; 15m SHORT 7519.25-7521.50 parent 2026-07-27T07:15:00 confirmed 2026-07-27T07:30:00 status open_untouched; 5m SHORT 7520.00-7521.50 parent 2026-07-27T07:05:00 confirmed 2026-07-27T07:10:00 status open_untouched; 5m SHORT 7526.00-7528.00 parent 2026-07-23T01:50:00 confirmed 2026-07-23T01:55:00 status partial_touch; 15m SHORT 7526.50-7528.00 parent 2026-07-23T02:00:00 confirmed 2026-07-23T02:15:00 status partial_touch; 5m SHORT 7531.50-7533.00 parent 2026-07-23T01:40:00 confirmed 2026-07-23T01:45:00 status open_untouched; 60m SHORT 7531.50-7538.25 parent 2026-07-22T23:00:00 confirmed 2026-07-23T00:00:00 status partial_touch; 5m SHORT 7537.00-7539.25 parent 2026-07-22T22:15:00 confirmed 2026-07-22T22:20:00 status open_untouched

## Review Order
- Primary campaign to review first: SHORT proof 2026-07-27T11:25:00 from 15M parent 2026-07-27T10:30:00 confirmed 2026-07-27T10:45:00.
- Defended-area management context: 5m LONG 7404.75-7428.50 is a callout before/near T1, not an issue by itself.
- Later rows: 5 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7500.00-7507.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T10:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-27T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-27T09:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7500.00-7507.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T10:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7500.00-7507.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T10:00:00 untested_by_15m
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

### 2. SHORT 15M FVG 7479.25-7492.75 parent 2026-07-27T10:00:00 confirmed 2026-07-27T10:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-27T10:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-27T10:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7500.00-7507.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T10:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7500.00-7507.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T10:00:00 untested_by_15m
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

### 3. SHORT 15M FVG 7443.50-7462.50 parent 2026-07-27T10:30:00 confirmed 2026-07-27T10:45:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-27T10:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-27T10:55:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-27T11:10:00, 2026-07-27T11:15:00, 2026-07-27T11:25:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-27T11:25:00. | PASS entry_stop_risk_contract: Entry 7440.00, protected 5M stop 7500.00, risk 60.00 pts. | PASS tactical_targets_from_actual_risk: T1 7350.00 and T2 7320.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7439.75.
- Parent displacement: yes
- Parent displacement candle: 2026-07-27T10:30:00
- Parent failure: not found
- First 5M return: 2026-07-27T10:55:00
- 5M wick defense: 2026-07-27T11:10:00, 2026-07-27T11:15:00, 2026-07-27T11:25:00
- Proof: 2026-07-27T11:25:00
- Entry/stop/risk: 7440.00 / 7500.00 / 60.00 pts
- T1/T2: 7350.00 / 7320.00
- Nearest liquidity: nearest prior low liquidity 7439.75
- Defended-area / obstacle management callout before or near T1: 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-27T11:40:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7500.00-7507.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T10:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7500.00-7507.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T10:00:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-27T10:55:00; wick 2026-07-27T11:10:00; proof 2026-07-27T11:25:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7422.75 (prior 5M swing low liquidity from 2026-07-27T10:45:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch; 5m LONG 7247.75-7253.25 parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00 status partial_touch; 15m LONG 7244.75-7252.25 parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7440.25-7444.75 parent 2026-05-19T20:05:00 confirmed 2026-05-19T20:10:00 status failed_inverted; 5m SHORT 7440.25-7444.00 parent 2026-05-19T22:30:00 confirmed 2026-05-19T22:35:00 status failed_inverted; 5m LONG 7440.25-7441.75 parent 2026-06-09T20:00:00 confirmed 2026-06-09T20:05:00 status failed_inverted; 5m SHORT 7440.25-7443.75 parent 2026-06-23T06:30:00 confirmed 2026-06-23T06:35:00 status failed_inverted; 5m LONG 7440.25-7441.25 parent 2026-07-24T00:25:00 confirmed 2026-07-24T00:30:00 status failed_inverted; 5m LONG 7440.25-7443.25 parent 2026-07-24T02:20:00 confirmed 2026-07-24T02:25:00 status failed_inverted; 15m SHORT 7440.25-7442.00 parent 2026-05-19T22:30:00 confirmed 2026-05-19T22:45:00 status failed_inverted; 15m SHORT 7440.25-7440.75 parent 2026-06-23T06:30:00 confirmed 2026-06-23T06:45:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7443.50-7462.50 parent 2026-07-27T10:30:00 confirmed 2026-07-27T10:45:00 status partial_touch; 15m LONG 7443.50-7449.25 parent 2026-07-27T11:00:00 confirmed 2026-07-27T11:15:00 status open_untouched; 120m LONG 7450.00-7487.00 parent 2026-07-26T20:00:00 confirmed 2026-07-26T22:00:00 status partial_touch; 5m SHORT 7456.75-7463.25 parent 2026-07-27T10:25:00 confirmed 2026-07-27T10:30:00 status partial_touch; 120m LONG 7472.00-7486.50 parent 2026-07-24T17:00:00 confirmed 2026-07-26T20:00:00 status partial_touch; 240m LONG 7472.00-7495.75 parent 2026-07-26T22:00:00 confirmed 2026-07-27T02:00:00 status partial_touch; 5m SHORT 7479.25-7491.75 parent 2026-07-27T10:00:00 confirmed 2026-07-27T10:05:00 status open_untouched; 15m SHORT 7479.25-7492.75 parent 2026-07-27T10:00:00 confirmed 2026-07-27T10:15:00 status open_untouched
- Objective ladder: liquidity 7422.75 reached 2026-07-27T11:40:00 (prior 5M swing low liquidity from 2026-07-27T10:45:00); session_extreme 7422.75 reached 2026-07-27T11:40:00 (RTH low liquidity before proof); open_fvg 7404.75 not reached (5m LONG open FVG partial_touch parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00); open_fvg 7355.50 not reached (15m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00); tactical 7350.00 not reached (T1 1.5R); open_fvg 7345.25 not reached (5m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00); open_fvg 7321.00 not reached (5m LONG open FVG partial_touch parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00); tactical 7320.00 not reached (T2 2.0R); open_fvg 7318.25 not reached (5m LONG open FVG open_untouched parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00); open_fvg 7261.00 not reached (5m LONG open FVG partial_touch parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00); open_fvg 7247.75 not reached (5m LONG open FVG partial_touch parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00); open_fvg 7244.75 not reached (15m LONG open FVG partial_touch parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00)
- Story: SHORT proof completed at 2026-07-27T11:25:00 from 7443.50-7462.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7404.75-7428.50 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7422.75 liquidity, 7422.75 session_extreme. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-28T20:25:00, one MES $-300.00
- Managed outcome: LQ1 at 2026-07-27T11:40:00, exit 7422.75, one MES +$86.25
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-07-27T11:25:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 4. LONG 15M FVG 7443.50-7449.25 parent 2026-07-27T11:00:00 confirmed 2026-07-27T11:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-27T11:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-27T11:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-27T11:30:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-27T11:30:00. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-27T11:00:00
- Parent failure: 2026-07-27T11:30:00
- First 5M return: 2026-07-27T11:30:00
- 5M wick defense: 2026-07-27T11:30:00
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7443.50-7449.25 parent 2026-07-27T11:00:00 confirmed 2026-07-27T11:15:00 failed_acceptance_through_15m failed 2026-07-27T11:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7443.50-7449.25 parent 2026-07-27T11:00:00 confirmed 2026-07-27T11:15:00 failed_acceptance_through_15m failed 2026-07-27T11:30:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-27T11:15:00; wick 2026-07-27T11:20:00; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-27T11:25:00.
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

### 5. SHORT 15M FVG 7441.50-7449.25 parent 2026-07-27T11:30:00 confirmed 2026-07-27T11:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7500.00-7507.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T10:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7500.00-7507.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T10:00:00 untested_by_15m
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

### 6. SHORT 15M FVG 7434.50-7436.75 parent 2026-07-27T11:45:00 confirmed 2026-07-27T12:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-27T12:00:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-07-27T12:00:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7500.00-7507.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T10:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7500.00-7507.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T10:00:00 untested_by_15m
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-07-27T12:00:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.
