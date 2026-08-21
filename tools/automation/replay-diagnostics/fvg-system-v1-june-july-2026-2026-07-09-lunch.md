# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-09 / lunch (2026-07-09T12:00:00 to 2026-07-09T16:00:00)
Context window: 275 days (2025-10-07T00:00:00 to 2026-07-10T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 49356 bars (2025-10-28T18:05:00 to 2026-07-10T17:00:00)
- 15m: 16474 bars (2025-10-28T18:15:00 to 2026-07-10T17:00:00)
- 60m: 4100 bars (2025-10-28T19:00:00 to 2026-07-10T17:00:00)
- 120m: 2154 bars (2025-10-28T20:00:00 to 2026-07-10T17:00:00)
- 240m: 1216 bars (2025-10-28T22:00:00 to 2026-07-10T16:00:00)

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
- Open below: 5m LONG 7564.25-7565.75 parent 2026-07-09T11:10:00 confirmed 2026-07-09T11:15:00 status partial_touch; 15m LONG 7563.75-7564.50 parent 2026-07-09T11:15:00 confirmed 2026-07-09T11:30:00 status open_untouched; 5m LONG 7554.75-7560.50 parent 2026-07-09T11:00:00 confirmed 2026-07-09T11:05:00 status open_untouched; 15m LONG 7559.00-7560.50 parent 2026-07-09T11:00:00 confirmed 2026-07-09T11:15:00 status open_untouched; 5m LONG 7543.75-7544.75 parent 2026-07-09T10:30:00 confirmed 2026-07-09T10:35:00 status open_untouched; 60m LONG 7523.50-7525.50 parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00 status partial_touch; 15m LONG 7522.25-7523.00 parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00 status open_untouched; 60m LONG 7495.50-7514.50 parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00 status partial_touch; 5m LONG 7498.50-7500.75 parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00 status partial_touch; 15m LONG 7498.50-7499.50 parent 2026-07-08T12:30:00 confirmed 2026-07-08T12:45:00 status open_untouched
- Failed above: 60m LONG 7574.00-7575.25 parent 2026-07-06T11:00:00 confirmed 2026-07-06T12:00:00 status failed_inverted; 120m LONG 7574.00-7575.00 parent 2026-07-06T12:00:00 confirmed 2026-07-06T14:00:00 status failed_inverted; 5m SHORT 7574.25-7574.75 parent 2026-05-22T13:55:00 confirmed 2026-05-22T14:00:00 status failed_inverted; 5m LONG 7574.25-7575.00 parent 2026-05-28T00:35:00 confirmed 2026-05-28T00:40:00 status failed_inverted; 5m SHORT 7574.25-7576.00 parent 2026-07-07T03:55:00 confirmed 2026-07-07T04:00:00 status failed_inverted; 5m LONG 7574.25-7574.50 parent 2026-07-09T11:45:00 confirmed 2026-07-09T11:50:00 status failed_inverted; 5m LONG 7574.50-7578.00 parent 2026-05-14T10:45:00 confirmed 2026-05-14T10:50:00 status failed_inverted; 5m SHORT 7574.50-7574.75 parent 2026-05-14T21:25:00 confirmed 2026-05-14T21:30:00 status failed_inverted; 5m SHORT 7574.50-7575.75 parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:35:00 status failed_inverted; 5m SHORT 7574.50-7575.00 parent 2026-07-06T23:45:00 confirmed 2026-07-06T23:50:00 status failed_inverted
- Open above: 5m SHORT 7596.75-7598.50 parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch; 15m SHORT 7654.50-7656.50 parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00 status partial_touch; 60m SHORT 7655.00-7661.75 parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof 2026-07-09T12:40:00 from 15M parent 2026-07-09T12:15:00 confirmed 2026-07-09T12:30:00.
- Defended-area management context: 5m LONG 7581.25-7581.50 is a callout before/near T1, not an issue by itself.
- Later rows: 3 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7563.75-7564.50 parent 2026-07-09T11:15:00 confirmed 2026-07-09T11:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-09T11:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-09T11:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7563.75-7564.50 parent 2026-07-09T11:15:00 confirmed 2026-07-09T11:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7563.75-7564.50 parent 2026-07-09T11:15:00 confirmed 2026-07-09T11:30:00 untested_by_15m
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

### 2. LONG 15M FVG 7578.00-7579.25 parent 2026-07-09T12:15:00 confirmed 2026-07-09T12:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-09T12:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-09T12:40:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-09T12:40:00, 2026-07-09T13:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-09T12:40:00. | PASS entry_stop_risk_contract: Entry 7581.00, protected 5M stop 7573.25, risk 7.75 pts. | PASS tactical_targets_from_actual_risk: T1 7592.75 and T2 7596.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7581.25.
- Parent displacement: yes
- Parent displacement candle: 2026-07-09T12:15:00
- Parent failure: not found
- First 5M return: 2026-07-09T12:40:00
- 5M wick defense: 2026-07-09T12:40:00, 2026-07-09T13:00:00
- Proof: 2026-07-09T12:40:00
- Entry/stop/risk: 7581.00 / 7573.25 / 7.75 pts
- T1/T2: 7592.75 / 7596.50
- Nearest liquidity: nearest prior high liquidity 7581.25
- Defended-area / obstacle management callout before or near T1: 5m LONG 7581.25-7581.50 parent 2026-05-14T13:40:00 confirmed 2026-05-14T13:45:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-09T12:45:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7578.00-7579.25 parent 2026-07-09T12:15:00 confirmed 2026-07-09T12:30:00 defended_on_15m defended 2026-07-09T12:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7578.00-7579.25 parent 2026-07-09T12:15:00 confirmed 2026-07-09T12:30:00 defended_on_15m defended 2026-07-09T12:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-09T12:40:00; wick 2026-07-09T12:40:00; proof 2026-07-09T12:40:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 15m LONG 7578.00-7579.25 parent 2026-07-09T12:15:00 confirmed 2026-07-09T12:30:00 status open_untouched; 5m LONG 7576.25-7578.75 parent 2026-07-09T12:05:00 confirmed 2026-07-09T12:10:00 status partial_touch; 60m SHORT 7570.25-7578.25 parent 2026-07-07T10:00:00 confirmed 2026-07-07T11:00:00 status partial_touch; 5m LONG 7564.25-7565.75 parent 2026-07-09T11:10:00 confirmed 2026-07-09T11:15:00 status partial_touch; 15m LONG 7563.75-7564.50 parent 2026-07-09T11:15:00 confirmed 2026-07-09T11:30:00 status open_untouched; 5m LONG 7554.75-7560.50 parent 2026-07-09T11:00:00 confirmed 2026-07-09T11:05:00 status open_untouched; 15m LONG 7559.00-7560.50 parent 2026-07-09T11:00:00 confirmed 2026-07-09T11:15:00 status open_untouched; 5m LONG 7543.75-7544.75 parent 2026-07-09T10:30:00 confirmed 2026-07-09T10:35:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7581.25-7581.50 parent 2026-05-14T13:40:00 confirmed 2026-05-14T13:45:00 status failed_inverted; 5m LONG 7581.25-7586.00 parent 2026-05-28T01:35:00 confirmed 2026-05-28T01:40:00 status failed_inverted; 15m LONG 7581.25-7588.50 parent 2026-05-28T01:45:00 confirmed 2026-05-28T02:00:00 status failed_inverted; 5m SHORT 7581.50-7584.75 parent 2026-05-14T14:05:00 confirmed 2026-05-14T14:10:00 status failed_inverted; 5m LONG 7581.50-7585.50 parent 2026-05-14T14:15:00 confirmed 2026-05-14T14:20:00 status failed_inverted; 5m SHORT 7581.75-7589.00 parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00 status failed_inverted; 15m SHORT 7581.75-7590.25 parent 2026-05-27T23:45:00 confirmed 2026-05-28T00:00:00 status failed_inverted; 5m SHORT 7582.00-7582.50 parent 2026-07-07T08:20:00 confirmed 2026-07-07T08:25:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7596.75-7598.50 parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch
- Objective ladder: session_extreme 7584.50 reached 2026-07-09T13:10:00 (RTH high liquidity before proof); tactical 7592.75 reached 2026-07-09T13:30:00 (T1 1.5R); tactical 7596.50 not reached (T2 2.0R); open_fvg 7598.50 not reached (5m SHORT open FVG partial_touch parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00); open_fvg 7605.25 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00); open_fvg 7609.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00); open_fvg 7628.00 not reached (5m SHORT open FVG open_untouched parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00); open_fvg 7636.75 not reached (60m SHORT open FVG partial_touch parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00); open_fvg 7637.50 not reached (5m SHORT open FVG partial_touch parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00); open_fvg 7638.75 not reached (15m SHORT open FVG partial_touch parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00); open_fvg 7641.00 not reached (5m SHORT open FVG partial_touch parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00)
- Story: LONG proof completed at 2026-07-09T12:40:00 from 7578.00-7579.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7581.25-7581.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7584.50 session_extreme. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-09T13:30:00, one MES +$58.75
- Managed outcome: T1 at 2026-07-09T13:30:00, exit 7592.75, one MES +$58.75
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-09T12:40:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 3. LONG 15M FVG 7582.75-7587.25 parent 2026-07-09T13:15:00 confirmed 2026-07-09T13:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-09T13:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-09T14:30:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-09T14:30:00, 2026-07-09T14:50:00, 2026-07-09T15:00:00, 2026-07-09T15:15:00, 2026-07-09T15:35:00, 2026-07-09T15:45:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-09T14:30:00. | PASS entry_stop_risk_contract: Entry 7589.50, protected 5M stop 7577.25, risk 12.25 pts. | PASS tactical_targets_from_actual_risk: T1 7608.00 and T2 7614.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7589.75.
- Parent displacement: yes
- Parent displacement candle: 2026-07-09T13:15:00
- Parent failure: not found
- First 5M return: 2026-07-09T14:30:00
- 5M wick defense: 2026-07-09T14:30:00, 2026-07-09T14:50:00, 2026-07-09T15:00:00, 2026-07-09T15:15:00, 2026-07-09T15:35:00, 2026-07-09T15:45:00
- Proof: 2026-07-09T14:30:00
- Entry/stop/risk: 7589.50 / 7577.25 / 12.25 pts
- T1/T2: 7608.00 / 7614.00
- Nearest liquidity: nearest prior high liquidity 7589.75
- Defended-area / obstacle management callout before or near T1: 5m LONG 7589.75-7591.75 parent 2026-05-28T03:00:00 confirmed 2026-05-28T03:05:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-09T14:35:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7578.00-7579.25 parent 2026-07-09T12:15:00 confirmed 2026-07-09T12:30:00 defended_on_15m defended 2026-07-09T12:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7578.00-7579.25 parent 2026-07-09T12:15:00 confirmed 2026-07-09T12:30:00 defended_on_15m defended 2026-07-09T12:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-09T14:30:00; wick 2026-07-09T14:30:00; proof 2026-07-09T14:30:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7595.00 (prior 5M swing high liquidity from 2026-07-09T13:50:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - The near liquidity objective sat in the path but was not reached during the replay window.
- Open FVGs below at proof: 15m LONG 7582.75-7587.25 parent 2026-07-09T13:15:00 confirmed 2026-07-09T13:30:00 status partial_touch; 5m LONG 7583.50-7586.25 parent 2026-07-09T13:10:00 confirmed 2026-07-09T13:15:00 status open_untouched; 5m LONG 7580.50-7581.75 parent 2026-07-09T13:05:00 confirmed 2026-07-09T13:10:00 status open_untouched; 60m LONG 7578.00-7579.50 parent 2026-07-09T13:00:00 confirmed 2026-07-09T14:00:00 status open_untouched; 5m LONG 7576.25-7578.75 parent 2026-07-09T12:05:00 confirmed 2026-07-09T12:10:00 status partial_touch; 60m LONG 7564.50-7573.75 parent 2026-07-09T12:00:00 confirmed 2026-07-09T13:00:00 status open_untouched; 120m LONG 7566.50-7573.75 parent 2026-07-09T12:00:00 confirmed 2026-07-09T14:00:00 status open_untouched; 5m LONG 7564.25-7565.75 parent 2026-07-09T11:10:00 confirmed 2026-07-09T11:15:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7589.75-7591.75 parent 2026-05-28T03:00:00 confirmed 2026-05-28T03:05:00 status failed_inverted; 5m LONG 7589.75-7590.25 parent 2026-06-15T03:20:00 confirmed 2026-06-15T03:25:00 status failed_inverted; 5m SHORT 7589.75-7590.25 parent 2026-06-17T06:05:00 confirmed 2026-06-17T06:10:00 status failed_inverted; 5m LONG 7589.75-7591.50 parent 2026-06-17T06:25:00 confirmed 2026-06-17T06:30:00 status failed_inverted; 5m LONG 7589.75-7590.50 parent 2026-06-17T08:10:00 confirmed 2026-06-17T08:15:00 status failed_inverted; 5m SHORT 7590.00-7590.50 parent 2026-05-14T19:45:00 confirmed 2026-05-14T19:50:00 status failed_inverted; 5m LONG 7590.00-7590.75 parent 2026-05-27T12:10:00 confirmed 2026-05-27T12:15:00 status failed_inverted; 5m SHORT 7590.00-7591.50 parent 2026-06-15T02:35:00 confirmed 2026-06-15T02:40:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7596.75-7598.50 parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch
- Objective ladder: liquidity 7595.00 not reached (prior 5M swing high liquidity from 2026-07-09T13:50:00); session_extreme 7595.00 not reached (RTH high liquidity before proof); open_fvg 7598.50 not reached (5m SHORT open FVG partial_touch parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00); open_fvg 7605.25 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00); tactical 7608.00 not reached (T1 1.5R); open_fvg 7609.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00); tactical 7614.00 not reached (T2 2.0R); open_fvg 7628.00 not reached (5m SHORT open FVG open_untouched parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00); open_fvg 7636.75 not reached (60m SHORT open FVG partial_touch parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00); open_fvg 7637.50 not reached (5m SHORT open FVG partial_touch parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00); open_fvg 7638.75 not reached (15m SHORT open FVG partial_touch parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00); open_fvg 7641.00 not reached (5m SHORT open FVG partial_touch parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00)
- Story: LONG proof completed at 2026-07-09T14:30:00 from 7582.75-7587.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7589.75-7591.75 with reaction obstacle_reached_then_continued. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-09T20:35:00, one MES $-61.25
- Managed outcome: Stop at 2026-07-09T20:35:00, exit 7577.25, one MES $-61.25
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-09T14:30:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 4. LONG 15M FVG 7589.25-7590.00 parent 2026-07-09T13:30:00 confirmed 2026-07-09T13:45:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-09T13:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-09T14:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-09T14:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-09T14:00:00, 2026-07-09T14:30:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-09T14:00:00. | PASS entry_stop_risk_contract: Entry 7591.25, protected 5M stop 7577.25, risk 14.00 pts. | PASS tactical_targets_from_actual_risk: T1 7612.25 and T2 7619.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7591.50.
- Parent displacement: yes
- Parent displacement candle: 2026-07-09T13:30:00
- Parent failure: 2026-07-09T14:45:00
- First 5M return: 2026-07-09T14:00:00
- 5M wick defense: 2026-07-09T14:00:00, 2026-07-09T14:30:00
- Proof: 2026-07-09T14:00:00
- Entry/stop/risk: 7591.25 / 7577.25 / 14.00 pts
- T1/T2: 7612.25 / 7619.25
- Nearest liquidity: nearest prior high liquidity 7591.50
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7591.50-7594.00 parent 2026-05-26T12:45:00 confirmed 2026-05-26T12:50:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-09T14:05:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7578.00-7579.25 parent 2026-07-09T12:15:00 confirmed 2026-07-09T12:30:00 defended_on_15m defended 2026-07-09T12:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7578.00-7579.25 parent 2026-07-09T12:15:00 confirmed 2026-07-09T12:30:00 defended_on_15m defended 2026-07-09T12:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-09T14:00:00; wick 2026-07-09T14:00:00; proof 2026-07-09T14:00:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 15m LONG 7582.75-7587.25 parent 2026-07-09T13:15:00 confirmed 2026-07-09T13:30:00 status open_untouched; 5m LONG 7583.50-7586.25 parent 2026-07-09T13:10:00 confirmed 2026-07-09T13:15:00 status open_untouched; 5m LONG 7580.50-7581.75 parent 2026-07-09T13:05:00 confirmed 2026-07-09T13:10:00 status open_untouched; 60m LONG 7578.00-7579.50 parent 2026-07-09T13:00:00 confirmed 2026-07-09T14:00:00 status open_untouched; 5m LONG 7576.25-7578.75 parent 2026-07-09T12:05:00 confirmed 2026-07-09T12:10:00 status partial_touch; 60m LONG 7564.50-7573.75 parent 2026-07-09T12:00:00 confirmed 2026-07-09T13:00:00 status open_untouched; 120m LONG 7566.50-7573.75 parent 2026-07-09T12:00:00 confirmed 2026-07-09T14:00:00 status open_untouched; 5m LONG 7564.25-7565.75 parent 2026-07-09T11:10:00 confirmed 2026-07-09T11:15:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7591.50-7594.00 parent 2026-05-26T12:45:00 confirmed 2026-05-26T12:50:00 status failed_inverted; 5m SHORT 7591.50-7594.50 parent 2026-05-27T11:20:00 confirmed 2026-05-27T11:25:00 status failed_inverted; 5m SHORT 7591.50-7592.00 parent 2026-05-27T13:45:00 confirmed 2026-05-27T13:50:00 status failed_inverted; 5m LONG 7591.50-7593.75 parent 2026-05-27T13:55:00 confirmed 2026-05-27T14:00:00 status failed_inverted; 15m SHORT 7591.50-7594.25 parent 2026-05-26T11:45:00 confirmed 2026-05-26T12:00:00 status failed_inverted; 15m LONG 7591.50-7592.00 parent 2026-05-26T15:30:00 confirmed 2026-05-26T15:45:00 status failed_inverted; 5m LONG 7591.75-7592.00 parent 2026-05-27T13:35:00 confirmed 2026-05-27T13:40:00 status failed_inverted; 15m SHORT 7591.75-7592.75 parent 2026-05-27T13:15:00 confirmed 2026-05-27T13:30:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7596.75-7598.50 parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch
- Objective ladder: session_extreme 7595.00 not reached (RTH high liquidity before proof); open_fvg 7598.50 not reached (5m SHORT open FVG partial_touch parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00); open_fvg 7605.25 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00); open_fvg 7609.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00); tactical 7612.25 not reached (T1 1.5R); tactical 7619.25 not reached (T2 2.0R); open_fvg 7628.00 not reached (5m SHORT open FVG open_untouched parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00); open_fvg 7636.75 not reached (60m SHORT open FVG partial_touch parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00); open_fvg 7637.50 not reached (5m SHORT open FVG partial_touch parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00); open_fvg 7638.75 not reached (15m SHORT open FVG partial_touch parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00); open_fvg 7641.00 not reached (5m SHORT open FVG partial_touch parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00)
- Story: LONG proof completed at 2026-07-09T14:00:00 from 7589.25-7590.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7591.50-7594.00 with reaction obstacle_reached_then_continued. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-09T20:35:00, one MES $-70.00
- Managed outcome: Stop at 2026-07-09T20:35:00, exit 7577.25, one MES $-70.00
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-09T14:00:00 before later same-zone failure/reversal read at 2026-07-09T14:45:00. Review the defended continuation before labeling this zone as failure/reversal.
