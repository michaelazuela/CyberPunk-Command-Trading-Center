# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-16 / lunch (2026-07-16T12:00:00 to 2026-07-16T16:00:00)
Context window: 275 days (2025-10-14T00:00:00 to 2026-07-17T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 50736 bars (2025-10-28T18:05:00 to 2026-07-17T17:00:00)
- 15m: 16934 bars (2025-10-28T18:15:00 to 2026-07-17T17:00:00)
- 60m: 4220 bars (2025-10-28T19:00:00 to 2026-07-17T17:00:00)
- 120m: 2219 bars (2025-10-28T20:00:00 to 2026-07-17T17:00:00)
- 240m: 1272 bars (2025-10-28T22:00:00 to 2026-07-17T16:00:00)

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
- Open below: 5m LONG 7597.25-7601.00 parent 2026-07-16T10:10:00 confirmed 2026-07-16T10:15:00 status partial_touch; 15m LONG 7591.50-7599.75 parent 2026-07-16T10:15:00 confirmed 2026-07-16T10:30:00 status partial_touch; 5m LONG 7590.00-7594.75 parent 2026-07-16T10:05:00 confirmed 2026-07-16T10:10:00 status open_untouched; 15m LONG 7556.00-7556.50 parent 2026-07-14T08:30:00 confirmed 2026-07-14T08:45:00 status partial_touch; 5m LONG 7551.00-7555.75 parent 2026-07-14T08:25:00 confirmed 2026-07-14T08:30:00 status open_untouched; 5m LONG 7542.75-7545.25 parent 2026-07-14T00:25:00 confirmed 2026-07-14T00:30:00 status partial_touch; 60m LONG 7523.50-7525.50 parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00 status partial_touch; 15m LONG 7522.25-7523.00 parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00 status open_untouched; 60m LONG 7495.50-7514.50 parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00 status partial_touch; 5m LONG 7498.50-7500.75 parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00 status partial_touch
- Failed above: 5m SHORT 7605.25-7605.75 parent 2026-06-17T01:30:00 confirmed 2026-06-17T01:35:00 status failed_inverted; 5m LONG 7605.25-7605.50 parent 2026-07-14T23:35:00 confirmed 2026-07-14T23:40:00 status failed_inverted; 5m SHORT 7605.25-7606.50 parent 2026-07-15T05:55:00 confirmed 2026-07-15T06:00:00 status failed_inverted; 15m SHORT 7605.25-7605.50 parent 2026-05-27T02:30:00 confirmed 2026-05-27T02:45:00 status failed_inverted; 5m SHORT 7605.50-7625.00 parent 2026-07-12T18:05:00 confirmed 2026-07-12T18:10:00 status failed_inverted; 15m LONG 7605.50-7607.75 parent 2026-05-26T06:30:00 confirmed 2026-05-26T06:45:00 status failed_inverted; 15m LONG 7605.50-7606.50 parent 2026-07-16T10:30:00 confirmed 2026-07-16T10:45:00 status failed_inverted; 5m SHORT 7605.75-7606.25 parent 2026-05-26T09:05:00 confirmed 2026-05-26T09:10:00 status failed_inverted; 5m SHORT 7605.75-7607.25 parent 2026-06-04T01:10:00 confirmed 2026-06-04T01:15:00 status failed_inverted; 5m SHORT 7605.75-7606.75 parent 2026-07-15T03:20:00 confirmed 2026-07-15T03:25:00 status failed_inverted
- Open above: 5m SHORT 7619.50-7621.25 parent 2026-07-16T02:25:00 confirmed 2026-07-16T02:30:00 status open_untouched; 15m SHORT 7621.00-7626.00 parent 2026-07-16T01:45:00 confirmed 2026-07-16T02:00:00 status partial_touch; 5m SHORT 7622.25-7626.50 parent 2026-07-16T01:35:00 confirmed 2026-07-16T01:40:00 status partial_touch; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch; 15m SHORT 7654.50-7656.50 parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00 status partial_touch; 60m SHORT 7655.00-7661.75 parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00 status partial_touch; 120m SHORT 7655.00-7661.75 parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof 2026-07-16T12:35:00 from 15M parent 2026-07-16T12:15:00 confirmed 2026-07-16T12:30:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: 3 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7594.25-7599.00 parent 2026-07-16T12:15:00 confirmed 2026-07-16T12:30:00
- Verdict: valid_trace_candidate
- Continuation read: balanced_path_to_liquidity_valid
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-16T12:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-16T12:35:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-16T12:35:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-16T12:35:00. | PASS entry_stop_risk_contract: Entry 7590.75, protected 5M stop 7610.00, risk 19.25 pts. | PASS tactical_targets_from_actual_risk: T1 7562.00 and T2 7552.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7590.50.
- Parent displacement: yes
- Parent displacement candle: 2026-07-16T12:15:00
- Parent failure: not found
- First 5M return: 2026-07-16T12:35:00
- 5M wick defense: 2026-07-16T12:35:00
- Proof: 2026-07-16T12:35:00
- Entry/stop/risk: 7590.75 / 7610.00 / 19.25 pts
- T1/T2: 7562.00 / 7552.25
- Nearest liquidity: nearest prior low liquidity 7590.50
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7594.25-7599.00 parent 2026-07-16T12:15:00 confirmed 2026-07-16T12:30:00 defended_on_15m defended 2026-07-16T12:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7594.25-7599.00 parent 2026-07-16T12:15:00 confirmed 2026-07-16T12:30:00 defended_on_15m defended 2026-07-16T12:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-16T12:35:00; wick 2026-07-16T12:35:00; proof 2026-07-16T12:35:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7575.25 (prior 5M swing low liquidity from 2026-07-16T09:50:00)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no defended FVG management objective interrupted delivery.
- Open FVGs below at proof: 15m LONG 7556.00-7556.50 parent 2026-07-14T08:30:00 confirmed 2026-07-14T08:45:00 status partial_touch; 5m LONG 7551.00-7555.75 parent 2026-07-14T08:25:00 confirmed 2026-07-14T08:30:00 status open_untouched; 5m LONG 7542.75-7545.25 parent 2026-07-14T00:25:00 confirmed 2026-07-14T00:30:00 status partial_touch; 60m LONG 7523.50-7525.50 parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00 status partial_touch; 15m LONG 7522.25-7523.00 parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00 status open_untouched; 60m LONG 7495.50-7514.50 parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00 status partial_touch; 5m LONG 7498.50-7500.75 parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00 status partial_touch; 15m LONG 7498.50-7499.50 parent 2026-07-08T12:30:00 confirmed 2026-07-08T12:45:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7591.00-7591.75 parent 2026-05-28T06:20:00 confirmed 2026-05-28T06:25:00 status failed_inverted; 5m LONG 7591.00-7591.50 parent 2026-06-15T01:10:00 confirmed 2026-06-15T01:15:00 status failed_inverted; 5m LONG 7591.25-7593.50 parent 2026-05-26T14:15:00 confirmed 2026-05-26T14:20:00 status failed_inverted; 5m SHORT 7591.25-7591.50 parent 2026-05-27T11:40:00 confirmed 2026-05-27T11:45:00 status failed_inverted; 5m SHORT 7591.25-7591.50 parent 2026-05-28T02:35:00 confirmed 2026-05-28T02:40:00 status failed_inverted; 5m SHORT 7591.25-7591.75 parent 2026-06-17T07:45:00 confirmed 2026-06-17T07:50:00 status failed_inverted; 5m LONG 7591.25-7592.25 parent 2026-07-13T04:10:00 confirmed 2026-07-13T04:15:00 status failed_inverted; 5m SHORT 7591.25-7593.50 parent 2026-07-14T11:35:00 confirmed 2026-07-14T11:40:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7594.25-7599.00 parent 2026-07-16T12:15:00 confirmed 2026-07-16T12:30:00 status open_untouched; 5m SHORT 7599.50-7602.00 parent 2026-07-16T12:05:00 confirmed 2026-07-16T12:10:00 status open_untouched; 5m SHORT 7619.50-7621.25 parent 2026-07-16T02:25:00 confirmed 2026-07-16T02:30:00 status open_untouched; 15m SHORT 7621.00-7626.00 parent 2026-07-16T01:45:00 confirmed 2026-07-16T02:00:00 status partial_touch; 5m SHORT 7622.25-7626.50 parent 2026-07-16T01:35:00 confirmed 2026-07-16T01:40:00 status partial_touch; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch
- Objective ladder: liquidity 7575.25 reached 2026-07-16T14:10:00 (prior 5M swing low liquidity from 2026-07-16T09:50:00); session_extreme 7575.25 reached 2026-07-16T14:10:00 (RTH low liquidity before proof); tactical 7562.00 reached 2026-07-16T15:30:00 (T1 1.5R); open_fvg 7556.00 reached 2026-07-16T15:35:00 (15m LONG open FVG partial_touch parent 2026-07-14T08:30:00 confirmed 2026-07-14T08:45:00); tactical 7552.25 reached 2026-07-16T15:50:00 (T2 2.0R); open_fvg 7551.00 reached 2026-07-16T15:50:00 (5m LONG open FVG open_untouched parent 2026-07-14T08:25:00 confirmed 2026-07-14T08:30:00); open_fvg 7542.75 not reached (5m LONG open FVG partial_touch parent 2026-07-14T00:25:00 confirmed 2026-07-14T00:30:00); open_fvg 7523.50 not reached (60m LONG open FVG partial_touch parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00); open_fvg 7522.25 not reached (15m LONG open FVG open_untouched parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00); open_fvg 7498.50 not reached (5m LONG open FVG partial_touch parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00); open_fvg 7498.50 not reached (15m LONG open FVG open_untouched parent 2026-07-08T12:30:00 confirmed 2026-07-08T12:45:00); open_fvg 7495.50 not reached (60m LONG open FVG partial_touch parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00)
- Story: SHORT proof completed at 2026-07-16T12:35:00 from 7594.25-7599.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. No opposing FVG obstacle was loaded before T1. Structural objectives reached after proof: 7575.25 liquidity, 7575.25 session_extreme, 7556.00 open_fvg, 7551.00 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-16T15:30:00, one MES +$143.75
- Managed outcome: LQ1 at 2026-07-16T14:10:00, exit 7575.25, one MES +$77.50
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-07-16T12:35:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 2. SHORT 15M FVG 7588.00-7589.25 parent 2026-07-16T13:45:00 confirmed 2026-07-16T14:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-16T13:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-16T13:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7594.25-7599.00 parent 2026-07-16T12:15:00 confirmed 2026-07-16T12:30:00 defended_on_15m defended 2026-07-16T12:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7594.25-7599.00 parent 2026-07-16T12:15:00 confirmed 2026-07-16T12:30:00 defended_on_15m defended 2026-07-16T12:45:00
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

### 3. SHORT 15M FVG 7569.50-7570.50 parent 2026-07-16T15:15:00 confirmed 2026-07-16T15:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-16T16:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-16T16:00:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-07-16T16:00:00
- First 5M return: 2026-07-16T16:00:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7594.25-7599.00 parent 2026-07-16T12:15:00 confirmed 2026-07-16T12:30:00 defended_on_15m defended 2026-07-16T12:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7594.25-7599.00 parent 2026-07-16T12:15:00 confirmed 2026-07-16T12:30:00 defended_on_15m defended 2026-07-16T12:45:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-16T15:55:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-16T16:00:00.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 4. SHORT 15M FVG 7561.25-7565.00 parent 2026-07-16T15:30:00 confirmed 2026-07-16T15:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-16T16:00:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-07-16T16:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7594.25-7599.00 parent 2026-07-16T12:15:00 confirmed 2026-07-16T12:30:00 defended_on_15m defended 2026-07-16T12:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7594.25-7599.00 parent 2026-07-16T12:15:00 confirmed 2026-07-16T12:30:00 defended_on_15m defended 2026-07-16T12:45:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-16T15:45:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-16T15:55:00.
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
