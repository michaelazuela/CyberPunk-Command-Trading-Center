# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-02 / lunch (2026-07-02T12:00:00 to 2026-07-02T16:00:00)
Context window: 275 days (2025-09-30T00:00:00 to 2026-07-03T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 47976 bars (2025-10-28T18:05:00 to 2026-07-03T13:00:00)
- 15m: 16014 bars (2025-10-28T18:15:00 to 2026-07-03T13:00:00)
- 60m: 3980 bars (2025-10-28T19:00:00 to 2026-07-03T13:00:00)
- 120m: 2089 bars (2025-10-28T20:00:00 to 2026-07-03T13:00:00)
- 240m: 1160 bars (2025-10-28T22:00:00 to 2026-07-03T12:00:00)

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
- Open below: 15m LONG 7500.75-7503.50 parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00 status open_untouched; 120m LONG 7476.25-7491.25 parent 2026-06-29T14:00:00 confirmed 2026-06-29T16:00:00 status partial_touch; 5m LONG 7487.25-7487.50 parent 2026-06-29T21:20:00 confirmed 2026-06-29T21:25:00 status open_untouched; 15m LONG 7480.00-7485.00 parent 2026-06-29T13:15:00 confirmed 2026-06-29T13:30:00 status partial_touch; 5m LONG 7481.50-7483.25 parent 2026-06-29T13:10:00 confirmed 2026-06-29T13:15:00 status partial_touch; 5m LONG 7479.50-7480.25 parent 2026-06-29T13:05:00 confirmed 2026-06-29T13:10:00 status open_untouched; 15m LONG 7476.25-7477.25 parent 2026-06-29T13:00:00 confirmed 2026-06-29T13:15:00 status open_untouched; 60m LONG 7476.25-7477.25 parent 2026-06-29T13:00:00 confirmed 2026-06-29T14:00:00 status open_untouched; 5m LONG 7434.50-7448.00 parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00 status partial_touch; 5m LONG 7428.50-7430.00 parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00 status open_untouched
- Failed above: 5m LONG 7527.00-7529.00 parent 2026-05-13T13:00:00 confirmed 2026-05-13T13:05:00 status failed_inverted; 15m LONG 7527.00-7529.00 parent 2026-05-13T13:00:00 confirmed 2026-05-13T13:15:00 status failed_inverted; 15m SHORT 7527.00-7529.25 parent 2026-06-19T01:00:00 confirmed 2026-06-19T01:15:00 status failed_inverted; 120m LONG 7527.00-7545.25 parent 2026-06-30T12:00:00 confirmed 2026-06-30T14:00:00 status failed_inverted; 5m LONG 7527.25-7527.50 parent 2026-06-22T20:35:00 confirmed 2026-06-22T20:40:00 status failed_inverted; 5m SHORT 7527.25-7530.50 parent 2026-06-30T22:10:00 confirmed 2026-06-30T22:15:00 status failed_inverted; 5m SHORT 7527.25-7527.50 parent 2026-07-02T03:10:00 confirmed 2026-07-02T03:15:00 status failed_inverted; 5m LONG 7527.25-7528.25 parent 2026-07-02T03:40:00 confirmed 2026-07-02T03:45:00 status failed_inverted; 5m LONG 7527.50-7529.25 parent 2026-06-19T01:55:00 confirmed 2026-06-19T02:00:00 status failed_inverted; 5m SHORT 7527.75-7528.25 parent 2026-07-01T09:10:00 confirmed 2026-07-01T09:15:00 status failed_inverted
- Open above: 5m SHORT 7529.25-7533.25 parent 2026-07-02T11:50:00 confirmed 2026-07-02T11:55:00 status partial_touch; 5m SHORT 7537.75-7539.75 parent 2026-07-02T11:45:00 confirmed 2026-07-02T11:50:00 status open_untouched; 5m SHORT 7574.50-7575.75 parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:35:00 status open_untouched; 15m SHORT 7574.50-7577.50 parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:45:00 status open_untouched; 5m SHORT 7579.00-7582.25 parent 2026-07-02T10:25:00 confirmed 2026-07-02T10:30:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof 2026-07-02T15:10:00 from 15M parent 2026-07-02T14:15:00 confirmed 2026-07-02T14:30:00.
- Defended-area management context: 5m LONG 7497.75-7498.00 is a callout before/near T1, not an issue by itself.
- Later rows: 3 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7516.25-7517.00 parent 2026-07-02T12:30:00 confirmed 2026-07-02T12:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-02T16:00:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-07-02T16:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7516.25-7517.00 parent 2026-07-02T12:30:00 confirmed 2026-07-02T12:45:00 failed_acceptance_through_15m failed 2026-07-02T16:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7516.25-7517.00 parent 2026-07-02T12:30:00 confirmed 2026-07-02T12:45:00 failed_acceptance_through_15m failed 2026-07-02T16:00:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-02T15:55:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-02T15:55:00.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 2. SHORT 15M FVG 7491.00-7491.25 parent 2026-07-02T13:45:00 confirmed 2026-07-02T14:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-02T14:15:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-07-02T14:15:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7516.25-7517.00 parent 2026-07-02T12:30:00 confirmed 2026-07-02T12:45:00 failed_acceptance_through_15m failed 2026-07-02T16:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7516.25-7517.00 parent 2026-07-02T12:30:00 confirmed 2026-07-02T12:45:00 failed_acceptance_through_15m failed 2026-07-02T16:00:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-02T14:10:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-02T14:10:00.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 3. LONG 15M FVG 7491.00-7493.00 parent 2026-07-02T14:15:00 confirmed 2026-07-02T14:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-02T14:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-02T15:10:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-02T15:10:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-02T15:10:00. | PASS entry_stop_risk_contract: Entry 7497.50, protected 5M stop 7479.75, risk 17.75 pts. | PASS tactical_targets_from_actual_risk: T1 7524.25 and T2 7533.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7497.75.
- Parent displacement: yes
- Parent displacement candle: 2026-07-02T14:15:00
- Parent failure: not found
- First 5M return: 2026-07-02T15:10:00
- 5M wick defense: 2026-07-02T15:10:00
- Proof: 2026-07-02T15:10:00
- Entry/stop/risk: 7497.50 / 7479.75 / 17.75 pts
- T1/T2: 7524.25 / 7533.00
- Nearest liquidity: nearest prior high liquidity 7497.75
- Defended-area / obstacle management callout before or near T1: 5m LONG 7497.75-7498.00 parent 2026-05-12T23:40:00 confirmed 2026-05-12T23:45:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-02T15:15:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7491.00-7493.00 parent 2026-07-02T14:15:00 confirmed 2026-07-02T14:30:00 defended_on_15m defended 2026-07-02T15:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7491.00-7493.00 parent 2026-07-02T14:15:00 confirmed 2026-07-02T14:30:00 defended_on_15m defended 2026-07-02T15:15:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-02T15:10:00; wick 2026-07-02T15:10:00; proof 2026-07-02T15:10:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7502.00 (prior 5M swing high liquidity from 2026-07-02T13:20:00)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no defended FVG management objective interrupted delivery.
- Open FVGs below at proof: 15m LONG 7491.00-7493.00 parent 2026-07-02T14:15:00 confirmed 2026-07-02T14:30:00 status open_untouched; 120m LONG 7476.25-7491.25 parent 2026-06-29T14:00:00 confirmed 2026-06-29T16:00:00 status partial_touch; 5m LONG 7479.50-7480.25 parent 2026-06-29T13:05:00 confirmed 2026-06-29T13:10:00 status partial_touch; 15m LONG 7476.25-7477.25 parent 2026-06-29T13:00:00 confirmed 2026-06-29T13:15:00 status open_untouched; 60m LONG 7476.25-7477.25 parent 2026-06-29T13:00:00 confirmed 2026-06-29T14:00:00 status open_untouched; 5m LONG 7434.50-7448.00 parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00 status partial_touch; 5m LONG 7428.50-7430.00 parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7497.75-7498.00 parent 2026-05-12T23:40:00 confirmed 2026-05-12T23:45:00 status failed_inverted; 5m SHORT 7497.75-7498.00 parent 2026-05-18T18:50:00 confirmed 2026-05-18T18:55:00 status failed_inverted; 5m LONG 7498.00-7499.00 parent 2026-05-11T10:15:00 confirmed 2026-05-11T10:20:00 status failed_inverted; 5m LONG 7498.00-7498.50 parent 2026-05-18T19:05:00 confirmed 2026-05-18T19:10:00 status failed_inverted; 5m LONG 7498.00-7499.25 parent 2026-06-09T03:45:00 confirmed 2026-06-09T03:50:00 status failed_inverted; 15m SHORT 7498.00-7500.00 parent 2026-05-11T20:15:00 confirmed 2026-05-11T20:30:00 status failed_inverted; 15m SHORT 7498.00-7514.50 parent 2026-05-21T06:30:00 confirmed 2026-05-21T06:45:00 status failed_inverted; 60m LONG 7498.00-7503.25 parent 2026-05-13T12:00:00 confirmed 2026-05-13T13:00:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7500.25-7504.75 parent 2026-07-02T15:05:00 confirmed 2026-07-02T15:10:00 status open_untouched; 60m SHORT 7503.00-7520.50 parent 2026-07-02T13:00:00 confirmed 2026-07-02T14:00:00 status partial_touch; 15m SHORT 7516.25-7517.00 parent 2026-07-02T12:30:00 confirmed 2026-07-02T12:45:00 status open_untouched; 5m SHORT 7529.25-7533.25 parent 2026-07-02T11:50:00 confirmed 2026-07-02T11:55:00 status partial_touch; 60m SHORT 7529.50-7540.25 parent 2026-07-02T12:00:00 confirmed 2026-07-02T13:00:00 status open_untouched; 120m SHORT 7529.50-7541.00 parent 2026-07-02T12:00:00 confirmed 2026-07-02T14:00:00 status open_untouched; 5m SHORT 7537.75-7539.75 parent 2026-07-02T11:45:00 confirmed 2026-07-02T11:50:00 status open_untouched; 5m SHORT 7574.50-7575.75 parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:35:00 status open_untouched
- Objective ladder: liquidity 7500.75 reached 2026-07-02T15:15:00 (prior 5M swing high liquidity from 2026-07-02T13:35:00); liquidity 7502.00 reached 2026-07-02T15:30:00 (prior 5M swing high liquidity from 2026-07-02T13:20:00); open_fvg 7504.75 reached 2026-07-02T15:30:00 (5m SHORT open FVG open_untouched parent 2026-07-02T15:05:00 confirmed 2026-07-02T15:10:00); liquidity 7508.75 reached 2026-07-02T15:40:00 (prior 5M swing high liquidity from 2026-07-02T14:15:00); liquidity 7513.00 reached 2026-07-02T15:45:00 (prior 5M swing high liquidity from 2026-07-02T14:35:00); liquidity 7513.75 reached 2026-07-02T15:55:00 (prior 5M swing high liquidity from 2026-07-02T12:55:00); liquidity 7514.75 reached 2026-07-02T15:55:00 (prior 5M swing high liquidity from 2026-07-02T14:55:00); open_fvg 7517.00 reached 2026-07-02T15:55:00 (15m SHORT open FVG open_untouched parent 2026-07-02T12:30:00 confirmed 2026-07-02T12:45:00); open_fvg 7520.50 reached 2026-07-02T15:55:00 (60m SHORT open FVG partial_touch parent 2026-07-02T13:00:00 confirmed 2026-07-02T14:00:00); tactical 7524.25 reached 2026-07-02T16:00:00 (T1 1.5R); tactical 7533.00 reached 2026-07-02T16:00:00 (T2 2.0R); open_fvg 7533.25 reached 2026-07-02T16:00:00 (5m SHORT open FVG partial_touch parent 2026-07-02T11:50:00 confirmed 2026-07-02T11:55:00); open_fvg 7539.75 not reached (5m SHORT open FVG open_untouched parent 2026-07-02T11:45:00 confirmed 2026-07-02T11:50:00); open_fvg 7540.25 not reached (60m SHORT open FVG open_untouched parent 2026-07-02T12:00:00 confirmed 2026-07-02T13:00:00)
- Story: LONG proof completed at 2026-07-02T15:10:00 from 7491.00-7493.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7497.75-7498.00 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7500.75 liquidity, 7502.00 liquidity, 7504.75 open_fvg, 7508.75 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T2 at 2026-07-02T16:00:00, one MES +$177.50
- Managed outcome: LQ1 at 2026-07-02T15:30:00, exit 7502.00, one MES +$22.50
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-02T15:10:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 4. LONG 15M FVG 7505.50-7509.00 parent 2026-07-02T15:45:00 confirmed 2026-07-02T16:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-02T15:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-02T15:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7491.00-7493.00 parent 2026-07-02T14:15:00 confirmed 2026-07-02T14:30:00 defended_on_15m defended 2026-07-02T15:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7491.00-7493.00 parent 2026-07-02T14:15:00 confirmed 2026-07-02T14:30:00 defended_on_15m defended 2026-07-02T15:15:00
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
