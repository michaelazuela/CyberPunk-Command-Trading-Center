# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-13 / morning (2026-07-13T09:15:00 to 2026-07-13T12:00:00)
Context window: 275 days (2025-10-11T00:00:00 to 2026-07-14T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 49979 bars (2025-10-28T18:05:00 to 2026-07-14T23:55:00)
- 15m: 16681 bars (2025-10-28T18:15:00 to 2026-07-14T23:45:00)
- 60m: 4154 bars (2025-10-28T19:00:00 to 2026-07-14T23:00:00)
- 120m: 2183 bars (2025-10-28T20:00:00 to 2026-07-14T22:00:00)
- 240m: 1241 bars (2025-10-28T22:00:00 to 2026-07-14T22:00:00)

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
- Open below: 15m LONG 7591.50-7595.25 parent 2026-07-13T09:00:00 confirmed 2026-07-13T09:15:00 status open_untouched; 5m LONG 7591.50-7593.00 parent 2026-07-13T08:50:00 confirmed 2026-07-13T08:55:00 status open_untouched; 120m LONG 7591.25-7592.00 parent 2026-07-13T06:00:00 confirmed 2026-07-13T08:00:00 status open_untouched; 5m LONG 7589.00-7590.50 parent 2026-07-13T08:45:00 confirmed 2026-07-13T08:50:00 status open_untouched; 60m LONG 7584.75-7586.75 parent 2026-07-13T04:00:00 confirmed 2026-07-13T05:00:00 status partial_touch; 120m LONG 7584.25-7586.75 parent 2026-07-13T04:00:00 confirmed 2026-07-13T06:00:00 status open_untouched; 5m LONG 7577.75-7578.25 parent 2026-07-13T02:20:00 confirmed 2026-07-13T02:25:00 status open_untouched; 5m LONG 7543.75-7544.75 parent 2026-07-09T10:30:00 confirmed 2026-07-09T10:35:00 status open_untouched; 60m LONG 7523.50-7525.50 parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00 status partial_touch; 15m LONG 7522.25-7523.00 parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00 status open_untouched
- Failed above: 5m SHORT 7596.50-7596.75 parent 2026-05-26T18:10:00 confirmed 2026-05-26T18:15:00 status failed_inverted; 5m LONG 7596.50-7597.25 parent 2026-05-27T12:40:00 confirmed 2026-05-27T12:45:00 status failed_inverted; 15m LONG 7596.50-7597.00 parent 2026-05-14T12:00:00 confirmed 2026-05-14T12:15:00 status failed_inverted; 5m LONG 7596.75-7598.75 parent 2026-05-26T15:40:00 confirmed 2026-05-26T15:45:00 status failed_inverted; 5m SHORT 7596.75-7597.00 parent 2026-06-15T07:35:00 confirmed 2026-06-15T07:40:00 status failed_inverted; 5m SHORT 7596.75-7598.50 parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00 status failed_inverted; 5m LONG 7596.75-7597.25 parent 2026-07-13T04:50:00 confirmed 2026-07-13T04:55:00 status failed_inverted; 5m SHORT 7596.75-7597.75 parent 2026-07-13T07:50:00 confirmed 2026-07-13T07:55:00 status failed_inverted; 5m SHORT 7597.00-7599.25 parent 2026-05-26T16:50:00 confirmed 2026-05-26T16:55:00 status failed_inverted; 5m SHORT 7597.00-7597.25 parent 2026-05-27T23:10:00 confirmed 2026-05-27T23:15:00 status failed_inverted
- Open above: 15m SHORT 7598.00-7625.00 parent 2026-07-12T18:15:00 confirmed 2026-07-12T18:30:00 status partial_touch; 15m SHORT 7603.25-7607.00 parent 2026-07-12T20:45:00 confirmed 2026-07-12T21:00:00 status partial_touch; 5m SHORT 7604.25-7607.50 parent 2026-07-12T20:35:00 confirmed 2026-07-12T20:40:00 status partial_touch; 5m SHORT 7605.50-7625.00 parent 2026-07-12T18:05:00 confirmed 2026-07-12T18:10:00 status partial_touch; 5m SHORT 7608.25-7608.50 parent 2026-07-12T20:30:00 confirmed 2026-07-12T20:35:00 status open_untouched; 5m SHORT 7612.00-7626.50 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:05:00 status partial_touch; 15m SHORT 7612.00-7624.25 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:15:00 status partial_touch; 60m SHORT 7612.00-7617.75 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:00:00 status partial_touch; 60m SHORT 7612.00-7618.25 parent 2026-07-12T18:00:00 confirmed 2026-07-12T19:00:00 status partial_touch; 120m SHORT 7612.00-7618.25 parent 2026-07-12T18:00:00 confirmed 2026-07-12T20:00:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof 2026-07-13T09:15:00 from 15M parent 2026-07-13T09:00:00 confirmed 2026-07-13T09:15:00.
- Defended-area management context: 5m SHORT 7596.50-7596.75 is a callout before/near T1, not an issue by itself.
- Later rows: 1 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7591.50-7595.25 parent 2026-07-13T09:00:00 confirmed 2026-07-13T09:15:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-13T09:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-13T10:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-13T09:15:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-13T09:15:00, 2026-07-13T09:30:00, 2026-07-13T09:50:00, 2026-07-13T09:55:00, 2026-07-13T10:10:00, 2026-07-13T10:20:00, 2026-07-13T10:50:00, 2026-07-13T11:20:00, 2026-07-13T11:25:00, 2026-07-13T11:30:00, 2026-07-13T11:40:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-13T09:15:00. | PASS entry_stop_risk_contract: Entry 7596.25, protected 5M stop 7585.75, risk 10.50 pts. | PASS tactical_targets_from_actual_risk: T1 7612.00 and T2 7617.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7596.50.
- Parent displacement: yes
- Parent displacement candle: 2026-07-13T09:00:00
- Parent failure: 2026-07-13T10:45:00
- First 5M return: 2026-07-13T09:15:00
- 5M wick defense: 2026-07-13T09:15:00, 2026-07-13T09:30:00, 2026-07-13T09:50:00, 2026-07-13T09:55:00, 2026-07-13T10:10:00, 2026-07-13T10:20:00, 2026-07-13T10:50:00, 2026-07-13T11:20:00, 2026-07-13T11:25:00, 2026-07-13T11:30:00, 2026-07-13T11:40:00
- Proof: 2026-07-13T09:15:00
- Entry/stop/risk: 7596.25 / 7585.75 / 10.50 pts
- T1/T2: 7612.00 / 7617.25
- Nearest liquidity: nearest prior high liquidity 7596.50
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7596.50-7596.75 parent 2026-05-26T18:10:00 confirmed 2026-05-26T18:15:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-13T09:20:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7591.50-7595.25 parent 2026-07-13T09:00:00 confirmed 2026-07-13T09:15:00 defended_on_15m defended 2026-07-13T09:30:00 failed 2026-07-13T10:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7591.50-7595.25 parent 2026-07-13T09:00:00 confirmed 2026-07-13T09:15:00 defended_on_15m defended 2026-07-13T09:30:00 failed 2026-07-13T10:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-13T09:15:00; wick 2026-07-13T09:15:00; proof 2026-07-13T09:15:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 15m LONG 7591.50-7595.25 parent 2026-07-13T09:00:00 confirmed 2026-07-13T09:15:00 status open_untouched; 5m LONG 7591.50-7593.00 parent 2026-07-13T08:50:00 confirmed 2026-07-13T08:55:00 status open_untouched; 120m LONG 7591.25-7592.00 parent 2026-07-13T06:00:00 confirmed 2026-07-13T08:00:00 status open_untouched; 5m LONG 7589.00-7590.50 parent 2026-07-13T08:45:00 confirmed 2026-07-13T08:50:00 status open_untouched; 60m LONG 7584.75-7586.75 parent 2026-07-13T04:00:00 confirmed 2026-07-13T05:00:00 status partial_touch; 120m LONG 7584.25-7586.75 parent 2026-07-13T04:00:00 confirmed 2026-07-13T06:00:00 status open_untouched; 5m LONG 7577.75-7578.25 parent 2026-07-13T02:20:00 confirmed 2026-07-13T02:25:00 status open_untouched; 5m LONG 7543.75-7544.75 parent 2026-07-09T10:30:00 confirmed 2026-07-09T10:35:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7596.50-7596.75 parent 2026-05-26T18:10:00 confirmed 2026-05-26T18:15:00 status failed_inverted; 5m LONG 7596.50-7597.25 parent 2026-05-27T12:40:00 confirmed 2026-05-27T12:45:00 status failed_inverted; 15m LONG 7596.50-7597.00 parent 2026-05-14T12:00:00 confirmed 2026-05-14T12:15:00 status failed_inverted; 5m LONG 7596.75-7598.75 parent 2026-05-26T15:40:00 confirmed 2026-05-26T15:45:00 status failed_inverted; 5m SHORT 7596.75-7597.00 parent 2026-06-15T07:35:00 confirmed 2026-06-15T07:40:00 status failed_inverted; 5m SHORT 7596.75-7598.50 parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00 status failed_inverted; 5m LONG 7596.75-7597.25 parent 2026-07-13T04:50:00 confirmed 2026-07-13T04:55:00 status failed_inverted; 5m SHORT 7596.75-7597.75 parent 2026-07-13T07:50:00 confirmed 2026-07-13T07:55:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7598.00-7625.00 parent 2026-07-12T18:15:00 confirmed 2026-07-12T18:30:00 status partial_touch; 15m SHORT 7603.25-7607.00 parent 2026-07-12T20:45:00 confirmed 2026-07-12T21:00:00 status partial_touch; 5m SHORT 7604.25-7607.50 parent 2026-07-12T20:35:00 confirmed 2026-07-12T20:40:00 status partial_touch; 5m SHORT 7605.50-7625.00 parent 2026-07-12T18:05:00 confirmed 2026-07-12T18:10:00 status partial_touch; 5m SHORT 7608.25-7608.50 parent 2026-07-12T20:30:00 confirmed 2026-07-12T20:35:00 status open_untouched; 5m SHORT 7612.00-7626.50 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:05:00 status partial_touch; 15m SHORT 7612.00-7624.25 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:15:00 status partial_touch; 60m SHORT 7612.00-7617.75 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:00:00 status partial_touch
- Objective ladder: open_fvg 7607.00 reached 2026-07-13T09:35:00 (15m SHORT open FVG partial_touch parent 2026-07-12T20:45:00 confirmed 2026-07-12T21:00:00); open_fvg 7607.50 reached 2026-07-13T09:35:00 (5m SHORT open FVG partial_touch parent 2026-07-12T20:35:00 confirmed 2026-07-12T20:40:00); open_fvg 7608.50 reached 2026-07-13T09:35:00 (5m SHORT open FVG open_untouched parent 2026-07-12T20:30:00 confirmed 2026-07-12T20:35:00); tactical 7612.00 not reached (T1 1.5R); tactical 7617.25 not reached (T2 2.0R); open_fvg 7617.75 not reached (60m SHORT open FVG partial_touch parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:00:00); open_fvg 7624.25 not reached (15m SHORT open FVG partial_touch parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:15:00); open_fvg 7625.00 not reached (15m SHORT open FVG partial_touch parent 2026-07-12T18:15:00 confirmed 2026-07-12T18:30:00); open_fvg 7625.00 not reached (5m SHORT open FVG partial_touch parent 2026-07-12T18:05:00 confirmed 2026-07-12T18:10:00); open_fvg 7626.50 not reached (5m SHORT open FVG partial_touch parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:05:00)
- Story: LONG proof completed at 2026-07-13T09:15:00 from 7591.50-7595.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7596.50-7596.75 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7607.00 open_fvg, 7607.50 open_fvg, 7608.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-13T10:20:00, one MES $-52.50
- Managed outcome: Stop at 2026-07-13T10:20:00, exit 7585.75, one MES $-52.50
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-13T09:15:00 before later same-zone failure/reversal read at 2026-07-13T10:45:00. Review the defended continuation before labeling this zone as failure/reversal.

### 2. SHORT 15M FVG 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00 untested_by_15m
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
