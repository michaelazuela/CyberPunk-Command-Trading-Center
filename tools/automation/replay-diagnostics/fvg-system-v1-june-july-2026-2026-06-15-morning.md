# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-15 / morning (2026-06-15T09:15:00 to 2026-06-15T12:00:00)
Context window: 275 days (2025-09-13T00:00:00 to 2026-06-16T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 44555 bars (2025-10-28T18:05:00 to 2026-06-16T23:55:00)
- 15m: 14864 bars (2025-10-28T18:15:00 to 2026-06-16T23:45:00)
- 60m: 3682 bars (2025-10-28T19:00:00 to 2026-06-16T23:00:00)
- 120m: 1927 bars (2025-10-28T20:00:00 to 2026-06-16T22:00:00)
- 240m: 1021 bars (2025-10-28T22:00:00 to 2026-06-16T22:00:00)

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
- Open below: 5m LONG 7582.50-7584.00 parent 2026-06-15T00:20:00 confirmed 2026-06-15T00:25:00 status partial_touch; 60m LONG 7579.25-7580.75 parent 2026-06-14T23:00:00 confirmed 2026-06-15T00:00:00 status partial_touch; 120m LONG 7579.25-7580.50 parent 2026-06-15T00:00:00 confirmed 2026-06-15T02:00:00 status open_untouched; 60m LONG 7574.75-7575.75 parent 2026-06-14T22:00:00 confirmed 2026-06-14T23:00:00 status open_untouched; 120m LONG 7568.00-7575.75 parent 2026-06-14T22:00:00 confirmed 2026-06-15T00:00:00 status open_untouched; 60m LONG 7561.75-7569.25 parent 2026-06-14T21:00:00 confirmed 2026-06-14T22:00:00 status open_untouched; 5m LONG 7566.50-7569.00 parent 2026-06-14T20:15:00 confirmed 2026-06-14T20:20:00 status partial_touch; 15m LONG 7561.00-7568.00 parent 2026-06-14T20:15:00 confirmed 2026-06-14T20:30:00 status partial_touch; 5m LONG 7563.75-7566.25 parent 2026-06-14T20:10:00 confirmed 2026-06-14T20:15:00 status open_untouched; 240m LONG 7507.25-7557.25 parent 2026-06-14T16:00:00 confirmed 2026-06-14T20:00:00 status partial_touch
- Failed above: 5m SHORT 7597.25-7598.50 parent 2026-05-26T03:10:00 confirmed 2026-05-26T03:15:00 status failed_inverted; 5m SHORT 7597.25-7597.50 parent 2026-05-26T09:35:00 confirmed 2026-05-26T09:40:00 status failed_inverted; 5m LONG 7597.25-7603.50 parent 2026-05-26T09:45:00 confirmed 2026-05-26T09:50:00 status failed_inverted; 5m LONG 7597.25-7597.50 parent 2026-06-04T07:05:00 confirmed 2026-06-04T07:10:00 status failed_inverted; 15m SHORT 7597.25-7600.75 parent 2026-05-26T11:30:00 confirmed 2026-05-26T11:45:00 status failed_inverted; 5m LONG 7597.50-7599.50 parent 2026-05-27T14:20:00 confirmed 2026-05-27T14:25:00 status failed_inverted; 5m SHORT 7597.50-7600.00 parent 2026-06-03T22:15:00 confirmed 2026-06-03T22:20:00 status failed_inverted; 5m SHORT 7597.50-7598.25 parent 2026-06-04T06:50:00 confirmed 2026-06-04T06:55:00 status failed_inverted; 5m SHORT 7597.50-7599.75 parent 2026-06-04T07:40:00 confirmed 2026-06-04T07:45:00 status failed_inverted; 5m LONG 7597.50-7600.50 parent 2026-06-04T07:50:00 confirmed 2026-06-04T07:55:00 status failed_inverted
- Open above: 5m SHORT 7615.75-7622.25 parent 2026-06-05T08:55:00 confirmed 2026-06-05T09:00:00 status partial_touch; 60m SHORT 7616.25-7622.75 parent 2026-06-05T09:00:00 confirmed 2026-06-05T10:00:00 status open_untouched; 5m SHORT 7642.50-7643.75 parent 2026-06-04T19:20:00 confirmed 2026-06-04T19:25:00 status partial_touch; 15m SHORT 7643.25-7643.75 parent 2026-06-04T19:30:00 confirmed 2026-06-04T19:45:00 status open_untouched; 5m SHORT 7644.75-7645.50 parent 2026-06-04T19:15:00 confirmed 2026-06-04T19:20:00 status open_untouched; 15m SHORT 7644.75-7645.25 parent 2026-06-04T19:15:00 confirmed 2026-06-04T19:30:00 status open_untouched; 5m SHORT 7647.25-7647.50 parent 2026-06-04T19:10:00 confirmed 2026-06-04T19:15:00 status open_untouched; 15m SHORT 7654.50-7656.50 parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00 status partial_touch; 60m SHORT 7655.00-7661.75 parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00 status partial_touch; 120m SHORT 7655.00-7661.75 parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof 2026-06-15T10:15:00 from 15M parent 2026-06-15T09:45:00 confirmed 2026-06-15T10:00:00.
- Defended-area management context: 5m LONG 7611.25-7612.25 is a callout before/near T1, not an issue by itself.
- Later rows: 5 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00 untested_by_15m
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

### 2. LONG 15M FVG 7597.00-7598.25 parent 2026-06-15T09:30:00 confirmed 2026-06-15T09:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-15T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-15T09:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00 untested_by_15m
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

### 3. LONG 15M FVG 7601.25-7609.50 parent 2026-06-15T09:45:00 confirmed 2026-06-15T10:00:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-15T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-15T10:15:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-15T10:15:00, 2026-06-15T10:20:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-15T10:15:00. | PASS entry_stop_risk_contract: Entry 7611.00, protected 5M stop 7595.50, risk 15.50 pts. | PASS tactical_targets_from_actual_risk: T1 7634.25 and T2 7642.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7611.25.
- Parent displacement: yes
- Parent displacement candle: 2026-06-15T09:45:00
- Parent failure: not found
- First 5M return: 2026-06-15T10:15:00
- 5M wick defense: 2026-06-15T10:15:00, 2026-06-15T10:20:00
- Proof: 2026-06-15T10:15:00
- Entry/stop/risk: 7611.00 / 7595.50 / 15.50 pts
- T1/T2: 7634.25 / 7642.00
- Nearest liquidity: nearest prior high liquidity 7611.25
- Defended-area / obstacle management callout before or near T1: 5m LONG 7611.25-7612.25 parent 2026-06-04T02:40:00 confirmed 2026-06-04T02:45:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-15T10:20:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-15T10:15:00; wick 2026-06-15T10:15:00; proof 2026-06-15T10:15:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7622.50 (prior 5M swing high liquidity from 2026-06-15T09:55:00)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no defended FVG management objective interrupted delivery.
- Open FVGs below at proof: 15m LONG 7601.25-7609.50 parent 2026-06-15T09:45:00 confirmed 2026-06-15T10:00:00 status partial_touch; 5m LONG 7601.25-7608.00 parent 2026-06-15T09:35:00 confirmed 2026-06-15T09:40:00 status partial_touch; 15m LONG 7597.00-7598.25 parent 2026-06-15T09:30:00 confirmed 2026-06-15T09:45:00 status open_untouched; 5m LONG 7595.00-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:20:00 status open_untouched; 15m LONG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00 status open_untouched; 5m LONG 7582.50-7584.00 parent 2026-06-15T00:20:00 confirmed 2026-06-15T00:25:00 status partial_touch; 60m LONG 7579.25-7580.75 parent 2026-06-14T23:00:00 confirmed 2026-06-15T00:00:00 status partial_touch; 120m LONG 7579.25-7580.50 parent 2026-06-15T00:00:00 confirmed 2026-06-15T02:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7611.25-7612.25 parent 2026-06-04T02:40:00 confirmed 2026-06-04T02:45:00 status failed_inverted; 5m LONG 7611.50-7613.00 parent 2026-05-24T22:50:00 confirmed 2026-05-24T22:55:00 status failed_inverted; 15m LONG 7611.50-7615.50 parent 2026-05-24T23:00:00 confirmed 2026-05-24T23:15:00 status failed_inverted; 120m SHORT 7611.50-7618.75 parent 2026-05-25T20:00:00 confirmed 2026-05-25T22:00:00 status failed_inverted; 120m LONG 7611.50-7613.25 parent 2026-06-04T10:00:00 confirmed 2026-06-04T12:00:00 status failed_inverted; 15m SHORT 7612.00-7615.00 parent 2026-05-27T09:15:00 confirmed 2026-05-27T09:30:00 status failed_inverted; 5m SHORT 7612.25-7613.00 parent 2026-05-27T09:10:00 confirmed 2026-05-27T09:15:00 status failed_inverted; 15m LONG 7612.25-7615.00 parent 2026-05-27T04:15:00 confirmed 2026-05-27T04:30:00 status failed_inverted
- Open FVGs above at proof: 60m SHORT 7616.25-7622.75 parent 2026-06-05T09:00:00 confirmed 2026-06-05T10:00:00 status partial_touch; 5m SHORT 7642.50-7643.75 parent 2026-06-04T19:20:00 confirmed 2026-06-04T19:25:00 status partial_touch; 15m SHORT 7643.25-7643.75 parent 2026-06-04T19:30:00 confirmed 2026-06-04T19:45:00 status open_untouched; 5m SHORT 7644.75-7645.50 parent 2026-06-04T19:15:00 confirmed 2026-06-04T19:20:00 status open_untouched; 15m SHORT 7644.75-7645.25 parent 2026-06-04T19:15:00 confirmed 2026-06-04T19:30:00 status open_untouched; 5m SHORT 7647.25-7647.50 parent 2026-06-04T19:10:00 confirmed 2026-06-04T19:15:00 status open_untouched; 15m SHORT 7654.50-7656.50 parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00 status partial_touch; 60m SHORT 7655.00-7661.75 parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00 status partial_touch
- Objective ladder: liquidity 7622.50 reached 2026-06-15T11:00:00 (prior 5M swing high liquidity from 2026-06-15T09:55:00); session_extreme 7622.50 reached 2026-06-15T11:00:00 (RTH high liquidity before proof); open_fvg 7622.75 reached 2026-06-15T11:00:00 (60m SHORT open FVG partial_touch parent 2026-06-05T09:00:00 confirmed 2026-06-05T10:00:00); tactical 7634.25 reached 2026-06-15T11:35:00 (T1 1.5R); tactical 7642.00 reached 2026-06-15T11:50:00 (T2 2.0R); open_fvg 7643.75 reached 2026-06-15T12:00:00 (5m SHORT open FVG partial_touch parent 2026-06-04T19:20:00 confirmed 2026-06-04T19:25:00); open_fvg 7643.75 reached 2026-06-15T12:00:00 (15m SHORT open FVG open_untouched parent 2026-06-04T19:30:00 confirmed 2026-06-04T19:45:00); open_fvg 7645.25 not reached (15m SHORT open FVG open_untouched parent 2026-06-04T19:15:00 confirmed 2026-06-04T19:30:00); open_fvg 7645.50 not reached (5m SHORT open FVG open_untouched parent 2026-06-04T19:15:00 confirmed 2026-06-04T19:20:00); open_fvg 7647.50 not reached (5m SHORT open FVG open_untouched parent 2026-06-04T19:10:00 confirmed 2026-06-04T19:15:00); open_fvg 7656.50 not reached (15m SHORT open FVG partial_touch parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00); open_fvg 7661.75 not reached (60m SHORT open FVG partial_touch parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00)
- Story: LONG proof completed at 2026-06-15T10:15:00 from 7601.25-7609.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7611.25-7612.25 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7622.50 liquidity, 7622.50 session_extreme, 7622.75 open_fvg, 7643.75 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-15T11:35:00, one MES +$116.25
- Managed outcome: LQ1 at 2026-06-15T11:00:00, exit 7622.50, one MES +$57.50
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-06-15T10:15:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 4. LONG 15M FVG 7618.25-7623.00 parent 2026-06-15T11:00:00 confirmed 2026-06-15T11:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-15T11:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-15T11:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00 untested_by_15m
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

### 5. LONG 15M FVG 7625.00-7626.00 parent 2026-06-15T11:15:00 confirmed 2026-06-15T11:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-15T11:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-15T11:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00 untested_by_15m
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

### 6. LONG 15M FVG 7634.00-7636.00 parent 2026-06-15T11:45:00 confirmed 2026-06-15T12:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-15T12:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-15T12:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00 untested_by_15m
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
