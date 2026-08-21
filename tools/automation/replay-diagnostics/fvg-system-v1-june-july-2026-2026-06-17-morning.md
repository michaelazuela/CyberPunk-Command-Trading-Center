# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-17 / morning (2026-06-17T09:15:00 to 2026-06-17T12:00:00)
Context window: 275 days (2025-09-15T00:00:00 to 2026-06-18T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 45107 bars (2025-10-28T18:05:00 to 2026-06-18T23:55:00)
- 15m: 15050 bars (2025-10-28T18:15:00 to 2026-06-18T23:45:00)
- 60m: 3730 bars (2025-10-28T19:00:00 to 2026-06-18T23:00:00)
- 120m: 1953 bars (2025-10-28T20:00:00 to 2026-06-18T22:00:00)
- 240m: 1043 bars (2025-10-28T22:00:00 to 2026-06-18T22:00:00)

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
- Open below: 5m LONG 7586.75-7588.25 parent 2026-06-17T08:05:00 confirmed 2026-06-17T08:10:00 status open_untouched; 60m LONG 7574.75-7575.75 parent 2026-06-14T22:00:00 confirmed 2026-06-14T23:00:00 status open_untouched; 120m LONG 7568.00-7575.75 parent 2026-06-14T22:00:00 confirmed 2026-06-15T00:00:00 status open_untouched; 60m LONG 7561.75-7569.25 parent 2026-06-14T21:00:00 confirmed 2026-06-14T22:00:00 status open_untouched; 5m LONG 7566.50-7569.00 parent 2026-06-14T20:15:00 confirmed 2026-06-14T20:20:00 status partial_touch; 15m LONG 7561.00-7568.00 parent 2026-06-14T20:15:00 confirmed 2026-06-14T20:30:00 status partial_touch; 5m LONG 7563.75-7566.25 parent 2026-06-14T20:10:00 confirmed 2026-06-14T20:15:00 status open_untouched; 240m LONG 7507.25-7557.25 parent 2026-06-14T16:00:00 confirmed 2026-06-14T20:00:00 status partial_touch; 5m LONG 7500.25-7555.00 parent 2026-06-14T18:05:00 confirmed 2026-06-14T18:10:00 status partial_touch; 5m LONG 7500.75-7540.00 parent 2026-06-12T17:00:00 confirmed 2026-06-14T18:05:00 status open_untouched
- Failed above: 5m SHORT 7594.25-7595.00 parent 2026-05-28T06:05:00 confirmed 2026-05-28T06:10:00 status failed_inverted; 5m SHORT 7594.25-7597.00 parent 2026-06-16T15:15:00 confirmed 2026-06-16T15:20:00 status failed_inverted; 5m LONG 7594.50-7596.00 parent 2026-05-24T18:45:00 confirmed 2026-05-24T18:50:00 status failed_inverted; 5m LONG 7594.50-7595.50 parent 2026-05-28T04:55:00 confirmed 2026-05-28T05:00:00 status failed_inverted; 5m LONG 7594.50-7595.00 parent 2026-05-28T05:55:00 confirmed 2026-05-28T06:00:00 status failed_inverted; 5m SHORT 7594.50-7599.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T09:50:00 status failed_inverted; 5m LONG 7594.50-7595.00 parent 2026-06-15T07:10:00 confirmed 2026-06-15T07:15:00 status failed_inverted; 5m SHORT 7594.50-7595.50 parent 2026-06-17T07:30:00 confirmed 2026-06-17T07:35:00 status failed_inverted; 15m SHORT 7594.50-7605.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00 status failed_inverted; 5m LONG 7594.75-7596.25 parent 2026-06-17T04:55:00 confirmed 2026-06-17T05:00:00 status failed_inverted
- Open above: 120m SHORT 7598.50-7601.25 parent 2026-06-17T06:00:00 confirmed 2026-06-17T08:00:00 status open_untouched; 5m SHORT 7598.75-7599.50 parent 2026-06-17T05:35:00 confirmed 2026-06-17T05:40:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 15m SHORT 7602.25-7604.00 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:30:00 status partial_touch; 60m SHORT 7602.75-7603.25 parent 2026-06-17T05:00:00 confirmed 2026-06-17T06:00:00 status open_untouched; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof 2026-06-17T11:55:00 from 15M parent 2026-06-17T10:45:00 confirmed 2026-06-17T11:00:00.
- Defended-area management context: 5m LONG 7582.75-7585.25 is a callout before/near T1, not an issue by itself.
- Later rows: 2 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7589.00-7593.25 parent 2026-06-17T10:45:00 confirmed 2026-06-17T11:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-17T11:35:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-17T11:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-17T11:55:00. | PASS entry_stop_risk_contract: Entry 7587.00, protected 5M stop 7604.25, risk 17.25 pts. | PASS tactical_targets_from_actual_risk: T1 7561.25 and T2 7552.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7586.75.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-06-17T11:35:00
- 5M wick defense: 2026-06-17T11:55:00
- Proof: 2026-06-17T11:55:00
- Entry/stop/risk: 7587.00 / 7604.25 / 17.25 pts
- T1/T2: 7561.25 / 7552.50
- Nearest liquidity: nearest prior low liquidity 7586.75
- Defended-area / obstacle management callout before or near T1: 5m LONG 7582.75-7585.25 parent 2026-06-17T11:35:00 confirmed 2026-06-17T11:40:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-17T12:40:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7589.00-7593.25 parent 2026-06-17T10:45:00 confirmed 2026-06-17T11:00:00 defended_on_15m defended 2026-06-17T11:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7589.00-7593.25 parent 2026-06-17T10:45:00 confirmed 2026-06-17T11:00:00 defended_on_15m defended 2026-06-17T11:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-17T11:35:00; wick 2026-06-17T11:55:00; proof 2026-06-17T11:55:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7578.50 (prior 5M swing low liquidity from 2026-06-17T10:05:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7582.75-7585.25 parent 2026-06-17T11:35:00 confirmed 2026-06-17T11:40:00 status partial_touch; 15m LONG 7579.75-7580.00 parent 2026-06-17T11:30:00 confirmed 2026-06-17T11:45:00 status open_untouched; 120m LONG 7568.00-7575.75 parent 2026-06-14T22:00:00 confirmed 2026-06-15T00:00:00 status open_untouched; 240m LONG 7507.25-7557.25 parent 2026-06-14T16:00:00 confirmed 2026-06-14T20:00:00 status partial_touch; 5m LONG 7500.25-7555.00 parent 2026-06-14T18:05:00 confirmed 2026-06-14T18:10:00 status partial_touch; 5m LONG 7500.75-7540.00 parent 2026-06-12T17:00:00 confirmed 2026-06-14T18:05:00 status open_untouched; 15m LONG 7505.25-7540.00 parent 2026-06-12T17:00:00 confirmed 2026-06-14T18:00:00 status partial_touch; 15m LONG 7501.25-7540.00 parent 2026-06-14T18:00:00 confirmed 2026-06-14T18:15:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7587.25-7589.75 parent 2026-05-14T19:50:00 confirmed 2026-05-14T19:55:00 status failed_inverted; 5m SHORT 7587.50-7590.25 parent 2026-05-27T23:35:00 confirmed 2026-05-27T23:40:00 status failed_inverted; 15m SHORT 7587.50-7590.50 parent 2026-06-15T05:30:00 confirmed 2026-06-15T05:45:00 status failed_inverted; 60m LONG 7587.50-7589.50 parent 2026-06-15T01:00:00 confirmed 2026-06-15T02:00:00 status failed_inverted; 5m SHORT 7587.75-7589.00 parent 2026-06-17T07:50:00 confirmed 2026-06-17T07:55:00 status failed_inverted; 5m SHORT 7588.00-7590.25 parent 2026-05-14T16:20:00 confirmed 2026-05-14T16:25:00 status failed_inverted; 5m LONG 7588.25-7589.75 parent 2026-06-15T01:00:00 confirmed 2026-06-15T01:05:00 status failed_inverted; 60m SHORT 7588.25-7591.00 parent 2026-05-28T07:00:00 confirmed 2026-05-28T08:00:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7589.00-7593.25 parent 2026-06-17T10:45:00 confirmed 2026-06-17T11:00:00 status partial_touch; 5m SHORT 7590.75-7597.25 parent 2026-06-17T10:35:00 confirmed 2026-06-17T10:40:00 status partial_touch; 120m SHORT 7598.50-7601.25 parent 2026-06-17T06:00:00 confirmed 2026-06-17T08:00:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch
- Objective ladder: liquidity 7583.50 not reached (prior 5M swing low liquidity from 2026-06-17T09:45:00); open_fvg 7582.75 not reached (5m LONG open FVG partial_touch parent 2026-06-17T11:35:00 confirmed 2026-06-17T11:40:00); open_fvg 7579.75 not reached (15m LONG open FVG open_untouched parent 2026-06-17T11:30:00 confirmed 2026-06-17T11:45:00); liquidity 7578.50 not reached (prior 5M swing low liquidity from 2026-06-17T10:05:00); liquidity 7568.00 not reached (prior 5M swing low liquidity from 2026-06-17T11:10:00); open_fvg 7568.00 not reached (120m LONG open FVG open_untouched parent 2026-06-14T22:00:00 confirmed 2026-06-15T00:00:00); tactical 7561.25 not reached (T1 1.5R); liquidity 7560.50 not reached (prior 5M swing low liquidity from 2026-06-17T10:50:00); session_extreme 7560.50 not reached (RTH low liquidity before proof); tactical 7552.50 not reached (T2 2.0R); open_fvg 7507.25 not reached (240m LONG open FVG partial_touch parent 2026-06-14T16:00:00 confirmed 2026-06-14T20:00:00); open_fvg 7505.25 not reached (15m LONG open FVG partial_touch parent 2026-06-12T17:00:00 confirmed 2026-06-14T18:00:00); open_fvg 7501.25 not reached (15m LONG open FVG open_untouched parent 2026-06-14T18:00:00 confirmed 2026-06-14T18:15:00); open_fvg 7500.75 not reached (5m LONG open FVG open_untouched parent 2026-06-12T17:00:00 confirmed 2026-06-14T18:05:00)
- Story: SHORT proof completed at 2026-06-17T11:55:00 from 7589.00-7593.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7582.75-7585.25 with reaction obstacle_reached_then_continued. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T2 at 2026-06-17T14:05:00, one MES +$172.50
- Managed outcome: LQ1 at 2026-06-17T13:05:00, exit 7578.50, one MES +$42.50
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-17T11:55:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 2. LONG 15M FVG 7579.75-7580.00 parent 2026-06-17T11:30:00 confirmed 2026-06-17T11:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7579.75-7580.00 parent 2026-06-17T11:30:00 confirmed 2026-06-17T11:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7579.75-7580.00 parent 2026-06-17T11:30:00 confirmed 2026-06-17T11:45:00 untested_by_15m
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

### 3. LONG 15M FVG 7584.75-7585.50 parent 2026-06-17T11:45:00 confirmed 2026-06-17T12:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7579.75-7580.00 parent 2026-06-17T11:30:00 confirmed 2026-06-17T11:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7579.75-7580.00 parent 2026-06-17T11:30:00 confirmed 2026-06-17T11:45:00 untested_by_15m
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
