# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-05 / morning (2026-06-05T09:15:00 to 2026-06-05T12:00:00)
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
- Open below: 5m LONG 7597.50-7600.50 parent 2026-06-04T07:50:00 confirmed 2026-06-04T07:55:00 status partial_touch; 120m LONG 7558.50-7598.50 parent 2026-05-24T20:00:00 confirmed 2026-05-24T22:00:00 status partial_touch; 60m LONG 7558.50-7596.50 parent 2026-05-24T19:00:00 confirmed 2026-05-24T20:00:00 status partial_touch; 15m LONG 7551.00-7590.50 parent 2026-05-24T18:15:00 confirmed 2026-05-24T18:30:00 status partial_touch; 5m LONG 7549.75-7589.00 parent 2026-05-24T18:05:00 confirmed 2026-05-24T18:10:00 status partial_touch; 5m LONG 7587.00-7587.75 parent 2026-05-28T08:30:00 confirmed 2026-05-28T08:35:00 status open_untouched; 5m LONG 7582.75-7583.25 parent 2026-05-28T07:40:00 confirmed 2026-05-28T07:45:00 status open_untouched; 15m LONG 7578.25-7580.50 parent 2026-05-28T01:30:00 confirmed 2026-05-28T01:45:00 status partial_touch; 5m LONG 7550.50-7580.25 parent 2026-05-22T17:00:00 confirmed 2026-05-24T18:05:00 status partial_touch; 15m LONG 7556.75-7580.25 parent 2026-05-22T17:00:00 confirmed 2026-05-24T18:15:00 status partial_touch
- Failed above: 15m LONG 7609.50-7611.25 parent 2026-06-04T02:45:00 confirmed 2026-06-04T03:00:00 status failed_inverted; 5m SHORT 7609.75-7610.25 parent 2026-06-04T06:05:00 confirmed 2026-06-04T06:10:00 status failed_inverted; 15m SHORT 7609.75-7615.75 parent 2026-06-04T04:15:00 confirmed 2026-06-04T04:30:00 status failed_inverted; 120m SHORT 7609.75-7632.00 parent 2026-06-03T17:00:00 confirmed 2026-06-03T18:00:00 status failed_inverted; 5m SHORT 7610.00-7610.25 parent 2026-05-27T22:05:00 confirmed 2026-05-27T22:10:00 status failed_inverted; 5m LONG 7610.25-7610.75 parent 2026-06-03T21:35:00 confirmed 2026-06-03T21:40:00 status failed_inverted; 60m LONG 7610.25-7614.25 parent 2026-06-04T03:00:00 confirmed 2026-06-04T04:00:00 status failed_inverted; 5m LONG 7610.50-7611.25 parent 2026-05-24T22:45:00 confirmed 2026-05-24T22:50:00 status failed_inverted; 120m SHORT 7610.75-7614.00 parent 2026-05-27T10:00:00 confirmed 2026-05-27T12:00:00 status failed_inverted; 5m LONG 7611.00-7611.25 parent 2026-05-24T22:10:00 confirmed 2026-05-24T22:15:00 status failed_inverted
- Open above: 5m SHORT 7615.75-7622.25 parent 2026-06-05T08:55:00 confirmed 2026-06-05T09:00:00 status open_untouched; 5m SHORT 7642.50-7643.75 parent 2026-06-04T19:20:00 confirmed 2026-06-04T19:25:00 status partial_touch; 15m SHORT 7643.25-7643.75 parent 2026-06-04T19:30:00 confirmed 2026-06-04T19:45:00 status open_untouched; 5m SHORT 7644.75-7645.50 parent 2026-06-04T19:15:00 confirmed 2026-06-04T19:20:00 status open_untouched; 15m SHORT 7644.75-7645.25 parent 2026-06-04T19:15:00 confirmed 2026-06-04T19:30:00 status open_untouched; 5m SHORT 7647.25-7647.50 parent 2026-06-04T19:10:00 confirmed 2026-06-04T19:15:00 status open_untouched; 15m SHORT 7654.50-7656.50 parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00 status partial_touch; 60m SHORT 7655.00-7661.75 parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00 status partial_touch; 120m SHORT 7655.00-7661.75 parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00 status partial_touch; 5m SHORT 7655.50-7656.50 parent 2026-06-04T16:20:00 confirmed 2026-06-04T16:25:00 status open_untouched

## Review Order
- Primary campaign to review first: SHORT proof 2026-06-05T10:40:00 from 15M parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00.
- Defended-area management context: 5m LONG 7549.75-7589.00 is a callout before/near T1, not an issue by itself.
- Later rows: 3 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7594.50-7605.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-05T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-05T10:20:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-05T10:40:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-05T10:40:00. | PASS entry_stop_risk_contract: Entry 7589.50, protected 5M stop 7616.25, risk 26.75 pts. | PASS tactical_targets_from_actual_risk: T1 7549.50 and T2 7536.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7589.25.
- Parent displacement: yes
- Parent displacement candle: 2026-06-05T09:45:00
- Parent failure: not found
- First 5M return: 2026-06-05T10:20:00
- 5M wick defense: 2026-06-05T10:40:00
- Proof: 2026-06-05T10:40:00
- Entry/stop/risk: 7589.50 / 7616.25 / 26.75 pts
- T1/T2: 7549.50 / 7536.00
- Nearest liquidity: nearest prior low liquidity 7589.25
- Defended-area / obstacle management callout before or near T1: 5m LONG 7549.75-7589.00 parent 2026-05-24T18:05:00 confirmed 2026-05-24T18:10:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-05T10:45:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7594.50-7605.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00 defended_on_15m defended 2026-06-05T10:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7594.50-7605.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00 defended_on_15m defended 2026-06-05T10:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-05T10:20:00; wick 2026-06-05T10:40:00; proof 2026-06-05T10:40:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7569.25 (prior 5M swing low liquidity from 2026-06-05T10:05:00)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no defended FVG management objective interrupted delivery.
- Open FVGs below at proof: 5m LONG 7549.75-7589.00 parent 2026-05-24T18:05:00 confirmed 2026-05-24T18:10:00 status partial_touch; 5m LONG 7585.50-7588.25 parent 2026-06-05T10:35:00 confirmed 2026-06-05T10:40:00 status open_untouched; 5m LONG 7550.50-7580.25 parent 2026-05-22T17:00:00 confirmed 2026-05-24T18:05:00 status partial_touch; 15m LONG 7556.75-7580.25 parent 2026-05-22T17:00:00 confirmed 2026-05-24T18:15:00 status partial_touch; 15m LONG 7540.00-7542.00 parent 2026-05-22T07:45:00 confirmed 2026-05-22T08:00:00 status partial_touch; 5m LONG 7538.75-7539.75 parent 2026-05-22T07:40:00 confirmed 2026-05-22T07:45:00 status open_untouched; 5m LONG 7511.75-7513.50 parent 2026-05-21T15:05:00 confirmed 2026-05-21T15:10:00 status open_untouched; 5m LONG 7493.50-7504.25 parent 2026-05-21T13:15:00 confirmed 2026-05-21T13:20:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7589.75-7591.75 parent 2026-05-28T03:00:00 confirmed 2026-05-28T03:05:00 status failed_inverted; 5m SHORT 7590.00-7590.50 parent 2026-05-14T19:45:00 confirmed 2026-05-14T19:50:00 status failed_inverted; 5m LONG 7590.00-7590.75 parent 2026-05-27T12:10:00 confirmed 2026-05-27T12:15:00 status failed_inverted; 15m LONG 7590.00-7591.00 parent 2026-05-28T02:00:00 confirmed 2026-05-28T02:15:00 status failed_inverted; 5m SHORT 7590.50-7594.25 parent 2026-05-14T12:30:00 confirmed 2026-05-14T12:35:00 status failed_inverted; 5m LONG 7590.50-7590.75 parent 2026-05-26T12:25:00 confirmed 2026-05-26T12:30:00 status failed_inverted; 15m LONG 7590.50-7593.00 parent 2026-05-26T14:15:00 confirmed 2026-05-26T14:30:00 status failed_inverted; 5m SHORT 7590.75-7591.00 parent 2026-05-27T23:30:00 confirmed 2026-05-27T23:35:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7594.50-7599.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T09:50:00 status partial_touch; 15m SHORT 7594.50-7605.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00 status partial_touch; 5m SHORT 7615.75-7622.25 parent 2026-06-05T08:55:00 confirmed 2026-06-05T09:00:00 status partial_touch; 60m SHORT 7616.25-7622.75 parent 2026-06-05T09:00:00 confirmed 2026-06-05T10:00:00 status open_untouched; 5m SHORT 7642.50-7643.75 parent 2026-06-04T19:20:00 confirmed 2026-06-04T19:25:00 status partial_touch; 15m SHORT 7643.25-7643.75 parent 2026-06-04T19:30:00 confirmed 2026-06-04T19:45:00 status open_untouched; 5m SHORT 7644.75-7645.50 parent 2026-06-04T19:15:00 confirmed 2026-06-04T19:20:00 status open_untouched; 15m SHORT 7644.75-7645.25 parent 2026-06-04T19:15:00 confirmed 2026-06-04T19:30:00 status open_untouched
- Objective ladder: open_fvg 7585.50 reached 2026-06-05T10:45:00 (5m LONG open FVG open_untouched parent 2026-06-05T10:35:00 confirmed 2026-06-05T10:40:00); liquidity 7569.25 reached 2026-06-05T11:25:00 (prior 5M swing low liquidity from 2026-06-05T10:05:00); session_extreme 7569.25 reached 2026-06-05T11:25:00 (RTH low liquidity before proof); open_fvg 7556.75 reached 2026-06-05T11:40:00 (15m LONG open FVG partial_touch parent 2026-05-22T17:00:00 confirmed 2026-05-24T18:15:00); open_fvg 7550.50 reached 2026-06-05T11:50:00 (5m LONG open FVG partial_touch parent 2026-05-22T17:00:00 confirmed 2026-05-24T18:05:00); open_fvg 7549.75 reached 2026-06-05T11:50:00 (5m LONG open FVG partial_touch parent 2026-05-24T18:05:00 confirmed 2026-05-24T18:10:00); tactical 7549.50 not reached (T1 1.5R); open_fvg 7540.00 not reached (15m LONG open FVG partial_touch parent 2026-05-22T07:45:00 confirmed 2026-05-22T08:00:00); open_fvg 7538.75 not reached (5m LONG open FVG open_untouched parent 2026-05-22T07:40:00 confirmed 2026-05-22T07:45:00); tactical 7536.00 not reached (T2 2.0R); open_fvg 7511.75 not reached (5m LONG open FVG open_untouched parent 2026-05-21T15:05:00 confirmed 2026-05-21T15:10:00); open_fvg 7493.50 not reached (5m LONG open FVG partial_touch parent 2026-05-21T13:15:00 confirmed 2026-05-21T13:20:00)
- Story: SHORT proof completed at 2026-06-05T10:40:00 from 7594.50-7605.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7549.75-7589.00 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7585.50 open_fvg, 7569.25 liquidity, 7569.25 session_extreme, 7556.75 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-05T12:05:00, one MES +$200.00
- Managed outcome: LQ1 at 2026-06-05T11:25:00, exit 7569.25, one MES +$101.25
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-05T10:40:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 2. SHORT 15M FVG 7590.00-7590.25 parent 2026-06-05T10:00:00 confirmed 2026-06-05T10:15:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-05T10:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-05T10:15:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-05T10:40:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-05T10:40:00. | PASS entry_stop_risk_contract: Entry 7589.50, protected 5M stop 7597.00, risk 7.50 pts. | PASS tactical_targets_from_actual_risk: T1 7578.25 and T2 7574.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7589.25.
- Parent displacement: yes
- Parent displacement candle: 2026-06-05T10:00:00
- Parent failure: not found
- First 5M return: 2026-06-05T10:15:00
- 5M wick defense: 2026-06-05T10:40:00
- Proof: 2026-06-05T10:40:00
- Entry/stop/risk: 7589.50 / 7597.00 / 7.50 pts
- T1/T2: 7578.25 / 7574.50
- Nearest liquidity: nearest prior low liquidity 7589.25
- Defended-area / obstacle management callout before or near T1: 5m LONG 7549.75-7589.00 parent 2026-05-24T18:05:00 confirmed 2026-05-24T18:10:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-05T10:45:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7594.50-7605.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00 defended_on_15m defended 2026-06-05T10:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7594.50-7605.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00 defended_on_15m defended 2026-06-05T10:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-05T10:15:00; wick 2026-06-05T10:40:00; proof 2026-06-05T10:40:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 5m LONG 7549.75-7589.00 parent 2026-05-24T18:05:00 confirmed 2026-05-24T18:10:00 status partial_touch; 5m LONG 7585.50-7588.25 parent 2026-06-05T10:35:00 confirmed 2026-06-05T10:40:00 status open_untouched; 5m LONG 7550.50-7580.25 parent 2026-05-22T17:00:00 confirmed 2026-05-24T18:05:00 status partial_touch; 15m LONG 7556.75-7580.25 parent 2026-05-22T17:00:00 confirmed 2026-05-24T18:15:00 status partial_touch; 15m LONG 7540.00-7542.00 parent 2026-05-22T07:45:00 confirmed 2026-05-22T08:00:00 status partial_touch; 5m LONG 7538.75-7539.75 parent 2026-05-22T07:40:00 confirmed 2026-05-22T07:45:00 status open_untouched; 5m LONG 7511.75-7513.50 parent 2026-05-21T15:05:00 confirmed 2026-05-21T15:10:00 status open_untouched; 5m LONG 7493.50-7504.25 parent 2026-05-21T13:15:00 confirmed 2026-05-21T13:20:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7589.75-7591.75 parent 2026-05-28T03:00:00 confirmed 2026-05-28T03:05:00 status failed_inverted; 5m SHORT 7590.00-7590.50 parent 2026-05-14T19:45:00 confirmed 2026-05-14T19:50:00 status failed_inverted; 5m LONG 7590.00-7590.75 parent 2026-05-27T12:10:00 confirmed 2026-05-27T12:15:00 status failed_inverted; 15m LONG 7590.00-7591.00 parent 2026-05-28T02:00:00 confirmed 2026-05-28T02:15:00 status failed_inverted; 5m SHORT 7590.50-7594.25 parent 2026-05-14T12:30:00 confirmed 2026-05-14T12:35:00 status failed_inverted; 5m LONG 7590.50-7590.75 parent 2026-05-26T12:25:00 confirmed 2026-05-26T12:30:00 status failed_inverted; 15m LONG 7590.50-7593.00 parent 2026-05-26T14:15:00 confirmed 2026-05-26T14:30:00 status failed_inverted; 5m SHORT 7590.75-7591.00 parent 2026-05-27T23:30:00 confirmed 2026-05-27T23:35:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7594.50-7599.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T09:50:00 status partial_touch; 15m SHORT 7594.50-7605.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00 status partial_touch; 5m SHORT 7615.75-7622.25 parent 2026-06-05T08:55:00 confirmed 2026-06-05T09:00:00 status partial_touch; 60m SHORT 7616.25-7622.75 parent 2026-06-05T09:00:00 confirmed 2026-06-05T10:00:00 status open_untouched; 5m SHORT 7642.50-7643.75 parent 2026-06-04T19:20:00 confirmed 2026-06-04T19:25:00 status partial_touch; 15m SHORT 7643.25-7643.75 parent 2026-06-04T19:30:00 confirmed 2026-06-04T19:45:00 status open_untouched; 5m SHORT 7644.75-7645.50 parent 2026-06-04T19:15:00 confirmed 2026-06-04T19:20:00 status open_untouched; 15m SHORT 7644.75-7645.25 parent 2026-06-04T19:15:00 confirmed 2026-06-04T19:30:00 status open_untouched
- Objective ladder: open_fvg 7585.50 reached 2026-06-05T10:45:00 (5m LONG open FVG open_untouched parent 2026-06-05T10:35:00 confirmed 2026-06-05T10:40:00); tactical 7578.25 reached 2026-06-05T11:10:00 (T1 1.5R); tactical 7574.50 reached 2026-06-05T11:15:00 (T2 2.0R); liquidity 7569.25 reached 2026-06-05T11:25:00 (prior 5M swing low liquidity from 2026-06-05T10:05:00); session_extreme 7569.25 reached 2026-06-05T11:25:00 (RTH low liquidity before proof); open_fvg 7556.75 reached 2026-06-05T11:40:00 (15m LONG open FVG partial_touch parent 2026-05-22T17:00:00 confirmed 2026-05-24T18:15:00); open_fvg 7550.50 reached 2026-06-05T11:50:00 (5m LONG open FVG partial_touch parent 2026-05-22T17:00:00 confirmed 2026-05-24T18:05:00); open_fvg 7549.75 reached 2026-06-05T11:50:00 (5m LONG open FVG partial_touch parent 2026-05-24T18:05:00 confirmed 2026-05-24T18:10:00); open_fvg 7540.00 not reached (15m LONG open FVG partial_touch parent 2026-05-22T07:45:00 confirmed 2026-05-22T08:00:00); open_fvg 7538.75 not reached (5m LONG open FVG open_untouched parent 2026-05-22T07:40:00 confirmed 2026-05-22T07:45:00); open_fvg 7511.75 not reached (5m LONG open FVG open_untouched parent 2026-05-21T15:05:00 confirmed 2026-05-21T15:10:00); open_fvg 7493.50 not reached (5m LONG open FVG partial_touch parent 2026-05-21T13:15:00 confirmed 2026-05-21T13:20:00)
- Story: SHORT proof completed at 2026-06-05T10:40:00 from 7590.00-7590.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7549.75-7589.00 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7585.50 open_fvg, 7569.25 liquidity, 7569.25 session_extreme, 7556.75 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-05T11:10:00, one MES +$56.25
- Managed outcome: T1 at 2026-06-05T11:10:00, exit 7578.25, one MES +$56.25
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-05T10:40:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 3. SHORT 15M FVG 7575.75-7578.50 parent 2026-06-05T11:15:00 confirmed 2026-06-05T11:30:00
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
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7594.50-7605.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00 defended_on_15m defended 2026-06-05T10:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7594.50-7605.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00 defended_on_15m defended 2026-06-05T10:30:00
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

### 4. SHORT 15M FVG 7557.50-7563.25 parent 2026-06-05T11:45:00 confirmed 2026-06-05T12:00:00
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
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7594.50-7605.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00 defended_on_15m defended 2026-06-05T10:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7594.50-7605.75 parent 2026-06-05T09:45:00 confirmed 2026-06-05T10:00:00 defended_on_15m defended 2026-06-05T10:30:00
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
