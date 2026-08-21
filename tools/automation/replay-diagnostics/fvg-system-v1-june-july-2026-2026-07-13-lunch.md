# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-13 / lunch (2026-07-13T12:00:00 to 2026-07-13T16:00:00)
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
- Open below: 5m LONG 7543.75-7544.75 parent 2026-07-09T10:30:00 confirmed 2026-07-09T10:35:00 status open_untouched; 60m LONG 7523.50-7525.50 parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00 status partial_touch; 15m LONG 7522.25-7523.00 parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00 status open_untouched; 60m LONG 7495.50-7514.50 parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00 status partial_touch; 5m LONG 7498.50-7500.75 parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00 status partial_touch; 15m LONG 7498.50-7499.50 parent 2026-07-08T12:30:00 confirmed 2026-07-08T12:45:00 status open_untouched; 5m LONG 7492.50-7495.00 parent 2026-07-08T12:15:00 confirmed 2026-07-08T12:20:00 status open_untouched; 15m LONG 7485.00-7495.00 parent 2026-07-08T12:15:00 confirmed 2026-07-08T12:30:00 status open_untouched; 5m LONG 7487.25-7491.25 parent 2026-07-08T12:10:00 confirmed 2026-07-08T12:15:00 status open_untouched; 5m LONG 7482.75-7485.75 parent 2026-07-08T12:05:00 confirmed 2026-07-08T12:10:00 status open_untouched
- Failed above: 5m LONG 7583.50-7586.25 parent 2026-07-09T13:10:00 confirmed 2026-07-09T13:15:00 status failed_inverted; 60m SHORT 7583.50-7585.75 parent 2026-07-13T00:00:00 confirmed 2026-07-13T01:00:00 status failed_inverted; 5m LONG 7583.75-7584.75 parent 2026-06-14T23:20:00 confirmed 2026-06-14T23:25:00 status failed_inverted; 5m SHORT 7583.75-7584.75 parent 2026-07-06T22:25:00 confirmed 2026-07-06T22:30:00 status failed_inverted; 5m LONG 7583.75-7584.50 parent 2026-07-09T22:55:00 confirmed 2026-07-09T23:00:00 status failed_inverted; 15m LONG 7583.75-7588.50 parent 2026-05-14T11:15:00 confirmed 2026-05-14T11:30:00 status failed_inverted; 60m SHORT 7583.75-7584.75 parent 2026-07-09T21:00:00 confirmed 2026-07-09T22:00:00 status failed_inverted; 5m SHORT 7584.00-7584.25 parent 2026-06-16T16:55:00 confirmed 2026-06-16T17:00:00 status failed_inverted; 5m LONG 7584.00-7585.75 parent 2026-06-16T18:05:00 confirmed 2026-06-16T18:10:00 status failed_inverted; 15m SHORT 7584.00-7585.50 parent 2026-07-09T23:30:00 confirmed 2026-07-09T23:45:00 status failed_inverted
- Open above: 5m SHORT 7588.75-7589.25 parent 2026-07-13T11:45:00 confirmed 2026-07-13T11:50:00 status partial_touch; 15m SHORT 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00 status open_untouched; 15m SHORT 7598.00-7625.00 parent 2026-07-12T18:15:00 confirmed 2026-07-12T18:30:00 status partial_touch; 5m SHORT 7605.50-7625.00 parent 2026-07-12T18:05:00 confirmed 2026-07-12T18:10:00 status partial_touch; 5m SHORT 7612.00-7626.50 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:05:00 status partial_touch; 15m SHORT 7612.00-7624.25 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:15:00 status partial_touch; 60m SHORT 7612.00-7617.75 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:00:00 status partial_touch; 60m SHORT 7612.00-7618.25 parent 2026-07-12T18:00:00 confirmed 2026-07-12T19:00:00 status partial_touch; 120m SHORT 7612.00-7618.25 parent 2026-07-12T18:00:00 confirmed 2026-07-12T20:00:00 status partial_touch; 240m SHORT 7615.50-7617.75 parent 2026-07-12T16:00:00 confirmed 2026-07-12T20:00:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof 2026-07-13T12:50:00 from 15M parent 2026-07-13T12:30:00 confirmed 2026-07-13T12:45:00.
- Defended-area management context: 5m LONG 7543.75-7544.75 is a callout before/near T1, not an issue by itself.
- Later rows: 3 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-13T12:15:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-13T12:15:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-13T12:15:00. | PASS entry_stop_risk_contract: Entry 7585.50, protected 5M stop 7597.00, risk 11.50 pts. | PASS tactical_targets_from_actual_risk: T1 7568.25 and T2 7562.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7585.25.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-07-13T12:15:00
- 5M wick defense: 2026-07-13T12:15:00
- Proof: 2026-07-13T12:15:00
- Entry/stop/risk: 7585.50 / 7597.00 / 11.50 pts
- T1/T2: 7568.25 / 7562.50
- Nearest liquidity: nearest prior low liquidity 7585.25
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00 defended_on_15m defended 2026-07-13T12:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00 defended_on_15m defended 2026-07-13T12:15:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-13T12:15:00; wick 2026-07-13T12:15:00; proof 2026-07-13T12:15:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7580.50 (prior 5M swing low liquidity from 2026-07-13T10:50:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7543.75-7544.75 parent 2026-07-09T10:30:00 confirmed 2026-07-09T10:35:00 status open_untouched; 60m LONG 7523.50-7525.50 parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00 status partial_touch; 15m LONG 7522.25-7523.00 parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00 status open_untouched; 60m LONG 7495.50-7514.50 parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00 status partial_touch; 5m LONG 7498.50-7500.75 parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00 status partial_touch; 15m LONG 7498.50-7499.50 parent 2026-07-08T12:30:00 confirmed 2026-07-08T12:45:00 status open_untouched; 5m LONG 7492.50-7495.00 parent 2026-07-08T12:15:00 confirmed 2026-07-08T12:20:00 status open_untouched; 15m LONG 7485.00-7495.00 parent 2026-07-08T12:15:00 confirmed 2026-07-08T12:30:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7585.75-7586.00 parent 2026-05-14T19:55:00 confirmed 2026-05-14T20:00:00 status failed_inverted; 5m SHORT 7585.75-7591.50 parent 2026-05-27T13:10:00 confirmed 2026-05-27T13:15:00 status failed_inverted; 5m LONG 7585.75-7588.75 parent 2026-05-27T13:20:00 confirmed 2026-05-27T13:25:00 status failed_inverted; 5m SHORT 7585.75-7588.25 parent 2026-06-05T10:45:00 confirmed 2026-06-05T10:50:00 status failed_inverted; 5m SHORT 7585.75-7588.50 parent 2026-07-09T20:05:00 confirmed 2026-07-09T20:10:00 status failed_inverted; 5m LONG 7586.00-7588.50 parent 2026-05-14T20:20:00 confirmed 2026-05-14T20:25:00 status failed_inverted; 5m LONG 7586.00-7588.25 parent 2026-06-05T10:15:00 confirmed 2026-06-05T10:20:00 status failed_inverted; 5m SHORT 7586.00-7586.25 parent 2026-06-17T10:40:00 confirmed 2026-06-17T10:45:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00 status partial_touch; 15m SHORT 7598.00-7625.00 parent 2026-07-12T18:15:00 confirmed 2026-07-12T18:30:00 status partial_touch; 5m SHORT 7605.50-7625.00 parent 2026-07-12T18:05:00 confirmed 2026-07-12T18:10:00 status partial_touch; 5m SHORT 7612.00-7626.50 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:05:00 status partial_touch; 15m SHORT 7612.00-7624.25 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:15:00 status partial_touch; 60m SHORT 7612.00-7617.75 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:00:00 status partial_touch; 60m SHORT 7612.00-7618.25 parent 2026-07-12T18:00:00 confirmed 2026-07-12T19:00:00 status partial_touch; 120m SHORT 7612.00-7618.25 parent 2026-07-12T18:00:00 confirmed 2026-07-12T20:00:00 status partial_touch
- Objective ladder: liquidity 7580.50 reached 2026-07-13T12:20:00 (prior 5M swing low liquidity from 2026-07-13T10:50:00); liquidity 7573.00 reached 2026-07-13T12:30:00 (prior 5M swing low liquidity from 2026-07-13T10:20:00); session_extreme 7573.00 reached 2026-07-13T12:30:00 (RTH low liquidity before proof); tactical 7568.25 reached 2026-07-13T12:35:00 (T1 1.5R); tactical 7562.50 reached 2026-07-13T12:40:00 (T2 2.0R); open_fvg 7543.75 not reached (5m LONG open FVG open_untouched parent 2026-07-09T10:30:00 confirmed 2026-07-09T10:35:00); open_fvg 7523.50 not reached (60m LONG open FVG partial_touch parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00); open_fvg 7522.25 not reached (15m LONG open FVG open_untouched parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00); open_fvg 7498.50 not reached (5m LONG open FVG partial_touch parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00); open_fvg 7498.50 not reached (15m LONG open FVG open_untouched parent 2026-07-08T12:30:00 confirmed 2026-07-08T12:45:00); open_fvg 7495.50 not reached (60m LONG open FVG partial_touch parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00); open_fvg 7492.50 not reached (5m LONG open FVG open_untouched parent 2026-07-08T12:15:00 confirmed 2026-07-08T12:20:00); open_fvg 7485.00 not reached (15m LONG open FVG open_untouched parent 2026-07-08T12:15:00 confirmed 2026-07-08T12:30:00)
- Story: SHORT proof completed at 2026-07-13T12:15:00 from 7588.75-7589.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. No opposing FVG obstacle was loaded before T1. Structural objectives reached after proof: 7580.50 liquidity, 7573.00 liquidity, 7573.00 session_extreme. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-13T12:35:00, one MES +$86.25
- Managed outcome: LQ1 at 2026-07-13T12:20:00, exit 7580.50, one MES +$25.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-07-13T12:15:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 2. SHORT 15M FVG 7576.25-7580.50 parent 2026-07-13T12:30:00 confirmed 2026-07-13T12:45:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-13T12:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-13T12:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-13T12:50:00, 2026-07-13T13:15:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-13T12:50:00. | PASS entry_stop_risk_contract: Entry 7571.25, protected 5M stop 7589.25, risk 18.00 pts. | PASS tactical_targets_from_actual_risk: T1 7544.25 and T2 7535.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7571.00.
- Parent displacement: yes
- Parent displacement candle: 2026-07-13T12:30:00
- Parent failure: not found
- First 5M return: 2026-07-13T12:45:00
- 5M wick defense: 2026-07-13T12:50:00, 2026-07-13T13:15:00
- Proof: 2026-07-13T12:50:00
- Entry/stop/risk: 7571.25 / 7589.25 / 18.00 pts
- T1/T2: 7544.25 / 7535.25
- Nearest liquidity: nearest prior low liquidity 7571.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7543.75-7544.75 parent 2026-07-09T10:30:00 confirmed 2026-07-09T10:35:00 status open_untouched
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-13T19:45:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00 defended_on_15m defended 2026-07-13T12:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00 defended_on_15m defended 2026-07-13T12:15:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-13T12:45:00; wick 2026-07-13T12:50:00; proof 2026-07-13T12:50:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7560.00 (RTH low liquidity before proof)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no defended FVG management objective interrupted delivery.
- Open FVGs below at proof: 5m LONG 7543.75-7544.75 parent 2026-07-09T10:30:00 confirmed 2026-07-09T10:35:00 status open_untouched; 60m LONG 7523.50-7525.50 parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00 status partial_touch; 15m LONG 7522.25-7523.00 parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00 status open_untouched; 60m LONG 7495.50-7514.50 parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00 status partial_touch; 5m LONG 7498.50-7500.75 parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00 status partial_touch; 15m LONG 7498.50-7499.50 parent 2026-07-08T12:30:00 confirmed 2026-07-08T12:45:00 status open_untouched; 5m LONG 7492.50-7495.00 parent 2026-07-08T12:15:00 confirmed 2026-07-08T12:20:00 status open_untouched; 15m LONG 7485.00-7495.00 parent 2026-07-08T12:15:00 confirmed 2026-07-08T12:30:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7571.50-7574.25 parent 2026-07-01T12:40:00 confirmed 2026-07-01T12:45:00 status failed_inverted; 15m LONG 7571.50-7578.00 parent 2026-05-14T10:45:00 confirmed 2026-05-14T11:00:00 status failed_inverted; 5m SHORT 7571.75-7573.00 parent 2026-06-22T08:45:00 confirmed 2026-06-22T08:50:00 status failed_inverted; 15m SHORT 7571.75-7576.50 parent 2026-05-14T21:30:00 confirmed 2026-05-14T21:45:00 status failed_inverted; 15m LONG 7571.75-7572.25 parent 2026-06-22T09:15:00 confirmed 2026-06-22T09:30:00 status failed_inverted; 5m SHORT 7572.25-7573.50 parent 2026-05-22T13:20:00 confirmed 2026-05-22T13:25:00 status failed_inverted; 5m LONG 7572.25-7576.75 parent 2026-05-22T13:30:00 confirmed 2026-05-22T13:35:00 status failed_inverted; 5m SHORT 7572.25-7572.75 parent 2026-06-18T13:40:00 confirmed 2026-06-18T13:45:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7576.25-7580.50 parent 2026-07-13T12:30:00 confirmed 2026-07-13T12:45:00 status open_untouched; 5m SHORT 7580.25-7583.25 parent 2026-07-13T12:20:00 confirmed 2026-07-13T12:25:00 status open_untouched; 15m SHORT 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00 status partial_touch; 15m SHORT 7598.00-7625.00 parent 2026-07-12T18:15:00 confirmed 2026-07-12T18:30:00 status partial_touch; 5m SHORT 7605.50-7625.00 parent 2026-07-12T18:05:00 confirmed 2026-07-12T18:10:00 status partial_touch; 5m SHORT 7612.00-7626.50 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:05:00 status partial_touch; 15m SHORT 7612.00-7624.25 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:15:00 status partial_touch; 60m SHORT 7612.00-7617.75 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:00:00 status partial_touch
- Objective ladder: session_extreme 7560.00 reached 2026-07-13T15:25:00 (RTH low liquidity before proof); tactical 7544.25 not reached (T1 1.5R); open_fvg 7543.75 not reached (5m LONG open FVG open_untouched parent 2026-07-09T10:30:00 confirmed 2026-07-09T10:35:00); tactical 7535.25 not reached (T2 2.0R); open_fvg 7523.50 not reached (60m LONG open FVG partial_touch parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00); open_fvg 7522.25 not reached (15m LONG open FVG open_untouched parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00); open_fvg 7498.50 not reached (5m LONG open FVG partial_touch parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00); open_fvg 7498.50 not reached (15m LONG open FVG open_untouched parent 2026-07-08T12:30:00 confirmed 2026-07-08T12:45:00); open_fvg 7495.50 not reached (60m LONG open FVG partial_touch parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00); open_fvg 7492.50 not reached (5m LONG open FVG open_untouched parent 2026-07-08T12:15:00 confirmed 2026-07-08T12:20:00); open_fvg 7485.00 not reached (15m LONG open FVG open_untouched parent 2026-07-08T12:15:00 confirmed 2026-07-08T12:30:00)
- Story: SHORT proof completed at 2026-07-13T12:50:00 from 7576.25-7580.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7543.75-7544.75 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7560.00 session_extreme. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-13T19:45:00, one MES +$135.00
- Managed outcome: LQ1 at 2026-07-13T15:25:00, exit 7560.00, one MES +$56.25
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-07-13T12:50:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 3. SHORT 15M FVG 7565.75-7566.00 parent 2026-07-13T15:15:00 confirmed 2026-07-13T15:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-13T15:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-13T15:55:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-13T15:55:00, 2026-07-13T16:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-13T15:55:00. | PASS entry_stop_risk_contract: Entry 7562.50, protected 5M stop 7571.25, risk 8.75 pts. | PASS tactical_targets_from_actual_risk: T1 7549.50 and T2 7545.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7562.25.
- Parent displacement: yes
- Parent displacement candle: 2026-07-13T15:30:00
- Parent failure: not found
- First 5M return: 2026-07-13T15:55:00
- 5M wick defense: 2026-07-13T15:55:00, 2026-07-13T16:00:00
- Proof: 2026-07-13T15:55:00
- Entry/stop/risk: 7562.50 / 7571.25 / 8.75 pts
- T1/T2: 7549.50 / 7545.00
- Nearest liquidity: nearest prior low liquidity 7562.25
- Defended-area / obstacle management callout before or near T1: 15m SHORT 7561.50-7562.25 parent 2026-07-13T15:30:00 confirmed 2026-07-13T15:45:00 status open_untouched
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-13T16:00:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00 defended_on_15m defended 2026-07-13T12:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00 defended_on_15m defended 2026-07-13T12:15:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-13T15:55:00; wick 2026-07-13T15:55:00; proof 2026-07-13T15:55:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7551.50 (prior 5M swing low liquidity from 2026-07-13T15:40:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - The near liquidity objective sat in the path but was not reached during the replay window.
- Open FVGs below at proof: 15m SHORT 7561.50-7562.25 parent 2026-07-13T15:30:00 confirmed 2026-07-13T15:45:00 status open_untouched; 5m LONG 7543.75-7544.75 parent 2026-07-09T10:30:00 confirmed 2026-07-09T10:35:00 status open_untouched; 60m LONG 7523.50-7525.50 parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00 status partial_touch; 15m LONG 7522.25-7523.00 parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00 status open_untouched; 60m LONG 7495.50-7514.50 parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00 status partial_touch; 5m LONG 7498.50-7500.75 parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00 status partial_touch; 15m LONG 7498.50-7499.50 parent 2026-07-08T12:30:00 confirmed 2026-07-08T12:45:00 status open_untouched; 5m LONG 7492.50-7495.00 parent 2026-07-08T12:15:00 confirmed 2026-07-08T12:20:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7562.75-7563.00 parent 2026-06-18T09:20:00 confirmed 2026-06-18T09:25:00 status failed_inverted; 5m SHORT 7562.75-7563.50 parent 2026-06-18T18:40:00 confirmed 2026-06-18T18:45:00 status failed_inverted; 5m LONG 7562.75-7563.50 parent 2026-06-19T12:25:00 confirmed 2026-06-19T12:30:00 status failed_inverted; 5m LONG 7563.00-7563.50 parent 2026-06-22T03:05:00 confirmed 2026-06-22T03:10:00 status failed_inverted; 5m LONG 7563.00-7564.75 parent 2026-07-01T13:20:00 confirmed 2026-07-01T13:25:00 status failed_inverted; 15m LONG 7563.00-7564.00 parent 2026-06-22T03:15:00 confirmed 2026-06-22T03:30:00 status failed_inverted; 5m SHORT 7563.25-7567.25 parent 2026-05-14T21:50:00 confirmed 2026-05-14T21:55:00 status failed_inverted; 5m SHORT 7563.25-7564.50 parent 2026-06-18T04:20:00 confirmed 2026-06-18T04:25:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7565.75-7566.00 parent 2026-07-13T15:15:00 confirmed 2026-07-13T15:30:00 status open_untouched; 15m SHORT 7576.25-7580.50 parent 2026-07-13T12:30:00 confirmed 2026-07-13T12:45:00 status partial_touch; 60m SHORT 7578.00-7581.75 parent 2026-07-13T13:00:00 confirmed 2026-07-13T14:00:00 status open_untouched; 5m SHORT 7580.25-7583.25 parent 2026-07-13T12:20:00 confirmed 2026-07-13T12:25:00 status open_untouched; 15m SHORT 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00 status partial_touch; 15m SHORT 7598.00-7625.00 parent 2026-07-12T18:15:00 confirmed 2026-07-12T18:30:00 status partial_touch; 5m SHORT 7605.50-7625.00 parent 2026-07-12T18:05:00 confirmed 2026-07-12T18:10:00 status partial_touch; 5m SHORT 7612.00-7626.50 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:05:00 status partial_touch
- Objective ladder: liquidity 7561.75 reached 2026-07-13T16:00:00 (prior 5M swing low liquidity from 2026-07-13T14:20:00); open_fvg 7561.50 reached 2026-07-13T16:00:00 (15m SHORT open FVG open_untouched parent 2026-07-13T15:30:00 confirmed 2026-07-13T15:45:00); liquidity 7561.00 not reached (prior 5M swing low liquidity from 2026-07-13T14:35:00); liquidity 7560.00 not reached (prior 5M swing low liquidity from 2026-07-13T12:40:00); liquidity 7551.50 not reached (prior 5M swing low liquidity from 2026-07-13T15:40:00); session_extreme 7551.50 not reached (RTH low liquidity before proof); tactical 7549.50 not reached (T1 1.5R); tactical 7545.00 not reached (T2 2.0R); open_fvg 7543.75 not reached (5m LONG open FVG open_untouched parent 2026-07-09T10:30:00 confirmed 2026-07-09T10:35:00); open_fvg 7523.50 not reached (60m LONG open FVG partial_touch parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00); open_fvg 7522.25 not reached (15m LONG open FVG open_untouched parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00); open_fvg 7498.50 not reached (5m LONG open FVG partial_touch parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00); open_fvg 7498.50 not reached (15m LONG open FVG open_untouched parent 2026-07-08T12:30:00 confirmed 2026-07-08T12:45:00); open_fvg 7495.50 not reached (60m LONG open FVG partial_touch parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00)
- Story: SHORT proof completed at 2026-07-13T15:55:00 from 7565.75-7566.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 15m 7561.50-7562.25 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7561.75 liquidity, 7561.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-13T16:20:00, one MES +$65.00
- Managed outcome: LQ1 at 2026-07-13T16:20:00, exit 7551.50, one MES +$55.00
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-07-13T15:55:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 4. SHORT 15M FVG 7561.50-7562.25 parent 2026-07-13T15:30:00 confirmed 2026-07-13T15:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-13T15:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-13T16:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-13T16:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-13T16:00:00. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-13T15:30:00
- Parent failure: 2026-07-13T16:00:00
- First 5M return: 2026-07-13T16:00:00
- 5M wick defense: 2026-07-13T16:00:00
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00 defended_on_15m defended 2026-07-13T12:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7588.75-7589.75 parent 2026-07-13T11:45:00 confirmed 2026-07-13T12:00:00 defended_on_15m defended 2026-07-13T12:15:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-13T15:45:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-13T15:55:00.
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
