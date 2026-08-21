# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-29 / lunch (2026-07-29T12:00:00 to 2026-07-29T16:00:00)
Context window: 275 days (2025-10-27T00:00:00 to 2026-07-30T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 53291 bars (2025-10-28T18:05:00 to 2026-07-30T23:55:00)
- 15m: 17785 bars (2025-10-28T18:15:00 to 2026-07-30T23:45:00)
- 60m: 4437 bars (2025-10-28T19:00:00 to 2026-07-30T23:00:00)
- 120m: 2330 bars (2025-10-28T20:00:00 to 2026-07-30T22:00:00)
- 240m: 1332 bars (2025-10-28T22:00:00 to 2026-07-30T22:00:00)

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
- Open below: 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch; 5m LONG 7247.75-7253.25 parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00 status partial_touch; 15m LONG 7244.75-7252.25 parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00 status partial_touch; 5m LONG 7240.75-7243.75 parent 2026-04-30T10:50:00 confirmed 2026-04-30T10:55:00 status open_untouched; 5m LONG 7236.50-7239.00 parent 2026-04-30T10:45:00 confirmed 2026-04-30T10:50:00 status open_untouched; 15m LONG 7218.00-7218.25 parent 2026-04-30T03:15:00 confirmed 2026-04-30T03:30:00 status open_untouched; 5m LONG 7206.75-7216.75 parent 2026-04-30T02:35:00 confirmed 2026-04-30T02:40:00 status partial_touch; 15m LONG 7206.75-7209.75 parent 2026-04-30T02:45:00 confirmed 2026-04-30T03:00:00 status open_untouched
- Failed above: 5m SHORT 7393.25-7394.00 parent 2026-06-10T12:10:00 confirmed 2026-06-10T12:15:00 status failed_inverted; 5m LONG 7393.50-7394.50 parent 2026-05-06T05:20:00 confirmed 2026-05-06T05:25:00 status failed_inverted; 5m LONG 7393.50-7394.25 parent 2026-06-10T12:35:00 confirmed 2026-06-10T12:40:00 status failed_inverted; 5m SHORT 7393.50-7396.50 parent 2026-06-26T04:50:00 confirmed 2026-06-26T04:55:00 status failed_inverted; 120m LONG 7394.50-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T12:00:00 status failed_inverted; 60m LONG 7394.75-7395.00 parent 2026-06-11T05:00:00 confirmed 2026-06-11T06:00:00 status failed_inverted; 5m SHORT 7395.50-7396.50 parent 2026-06-26T08:25:00 confirmed 2026-06-26T08:30:00 status failed_inverted; 5m LONG 7395.75-7396.75 parent 2026-06-26T02:50:00 confirmed 2026-06-26T02:55:00 status failed_inverted; 5m LONG 7397.25-7401.00 parent 2026-05-06T05:35:00 confirmed 2026-05-06T05:40:00 status failed_inverted; 5m LONG 7397.50-7397.75 parent 2026-06-11T05:40:00 confirmed 2026-06-11T05:45:00 status failed_inverted
- Open above: 60m SHORT 7412.50-7422.00 parent 2026-07-29T11:00:00 confirmed 2026-07-29T12:00:00 status open_untouched; 5m SHORT 7418.75-7423.25 parent 2026-07-29T10:15:00 confirmed 2026-07-29T10:20:00 status partial_touch; 15m SHORT 7420.50-7422.00 parent 2026-07-29T10:15:00 confirmed 2026-07-29T10:30:00 status open_untouched; 5m SHORT 7426.75-7429.25 parent 2026-07-29T10:10:00 confirmed 2026-07-29T10:15:00 status open_untouched; 5m SHORT 7434.00-7445.25 parent 2026-07-29T09:55:00 confirmed 2026-07-29T10:00:00 status partial_touch; 15m SHORT 7439.50-7444.25 parent 2026-07-29T10:00:00 confirmed 2026-07-29T10:15:00 status open_untouched; 60m SHORT 7439.50-7455.25 parent 2026-07-29T10:00:00 confirmed 2026-07-29T11:00:00 status open_untouched; 120m SHORT 7439.50-7476.00 parent 2026-07-29T10:00:00 confirmed 2026-07-29T12:00:00 status open_untouched; 5m SHORT 7448.75-7450.00 parent 2026-07-29T09:50:00 confirmed 2026-07-29T09:55:00 status open_untouched; 5m SHORT 7463.25-7470.50 parent 2026-07-29T08:20:00 confirmed 2026-07-29T08:25:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof 2026-07-29T14:05:00 from 15M parent 2026-07-29T13:00:00 confirmed 2026-07-29T13:15:00.
- Defended-area management context: 5m SHORT 7437.50-7439.25 is a callout before/near T1, not an issue by itself.
- Later rows: 5 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7398.75-7402.75 parent 2026-07-29T13:00:00 confirmed 2026-07-29T13:15:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-29T13:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-29T15:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-29T14:05:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-29T14:05:00, 2026-07-29T15:30:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-29T14:05:00. | PASS entry_stop_risk_contract: Entry 7437.25, protected 5M stop 7384.25, risk 53.00 pts. | PASS tactical_targets_from_actual_risk: T1 7516.75 and T2 7543.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7437.50.
- Parent displacement: yes
- Parent displacement candle: 2026-07-29T13:00:00
- Parent failure: 2026-07-29T15:45:00
- First 5M return: 2026-07-29T14:05:00
- 5M wick defense: 2026-07-29T14:05:00, 2026-07-29T15:30:00
- Proof: 2026-07-29T14:05:00
- Entry/stop/risk: 7437.25 / 7384.25 / 53.00 pts
- T1/T2: 7516.75 / 7543.25
- Nearest liquidity: nearest prior high liquidity 7437.50
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7437.50-7439.25 parent 2026-05-20T01:45:00 confirmed 2026-05-20T01:50:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-29T14:10:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7398.75-7402.75 parent 2026-07-29T13:00:00 confirmed 2026-07-29T13:15:00 defended_on_15m defended 2026-07-29T14:15:00 failed 2026-07-29T15:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7398.75-7402.75 parent 2026-07-29T13:00:00 confirmed 2026-07-29T13:15:00 defended_on_15m defended 2026-07-29T14:15:00 failed 2026-07-29T15:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-29T14:05:00; wick 2026-07-29T14:05:00; proof 2026-07-29T14:05:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7464.75 (prior 5M swing high liquidity from 2026-07-29T09:30:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 15m LONG 7404.50-7413.00 parent 2026-07-29T13:15:00 confirmed 2026-07-29T13:30:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 15m LONG 7398.75-7402.75 parent 2026-07-29T13:00:00 confirmed 2026-07-29T13:15:00 status open_untouched; 5m LONG 7395.25-7396.50 parent 2026-07-29T12:55:00 confirmed 2026-07-29T13:00:00 status open_untouched; 5m LONG 7379.00-7388.25 parent 2026-07-29T12:25:00 confirmed 2026-07-29T12:30:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7437.50-7439.25 parent 2026-05-20T01:45:00 confirmed 2026-05-20T01:50:00 status failed_inverted; 5m LONG 7437.50-7439.00 parent 2026-05-20T01:55:00 confirmed 2026-05-20T02:00:00 status failed_inverted; 5m SHORT 7437.50-7440.00 parent 2026-06-09T22:55:00 confirmed 2026-06-09T23:00:00 status failed_inverted; 5m LONG 7437.50-7439.25 parent 2026-06-09T23:05:00 confirmed 2026-06-09T23:10:00 status failed_inverted; 5m SHORT 7437.50-7440.75 parent 2026-07-23T11:05:00 confirmed 2026-07-23T11:10:00 status failed_inverted; 5m LONG 7437.75-7439.00 parent 2026-07-24T15:35:00 confirmed 2026-07-24T15:40:00 status failed_inverted; 5m SHORT 7437.75-7438.25 parent 2026-07-28T07:10:00 confirmed 2026-07-28T07:15:00 status failed_inverted; 5m LONG 7437.75-7442.50 parent 2026-07-28T07:20:00 confirmed 2026-07-28T07:25:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7439.50-7444.25 parent 2026-07-29T10:00:00 confirmed 2026-07-29T10:15:00 status open_untouched; 60m SHORT 7439.50-7455.25 parent 2026-07-29T10:00:00 confirmed 2026-07-29T11:00:00 status open_untouched; 120m SHORT 7439.50-7476.00 parent 2026-07-29T10:00:00 confirmed 2026-07-29T12:00:00 status open_untouched; 240m SHORT 7439.50-7451.25 parent 2026-07-29T10:00:00 confirmed 2026-07-29T14:00:00 status open_untouched; 5m SHORT 7463.25-7470.50 parent 2026-07-29T08:20:00 confirmed 2026-07-29T08:25:00 status partial_touch; 60m SHORT 7464.75-7476.00 parent 2026-07-29T09:00:00 confirmed 2026-07-29T10:00:00 status open_untouched; 15m SHORT 7466.50-7470.50 parent 2026-07-29T08:30:00 confirmed 2026-07-29T08:45:00 status partial_touch; 5m SHORT 7472.75-7473.75 parent 2026-07-29T08:15:00 confirmed 2026-07-29T08:20:00 status open_untouched
- Objective ladder: liquidity 7439.50 reached 2026-07-29T14:10:00 (prior 5M swing high liquidity from 2026-07-29T10:10:00); open_fvg 7444.25 reached 2026-07-29T14:10:00 (15m SHORT open FVG open_untouched parent 2026-07-29T10:00:00 confirmed 2026-07-29T10:15:00); open_fvg 7451.25 reached 2026-07-29T14:45:00 (240m SHORT open FVG open_untouched parent 2026-07-29T10:00:00 confirmed 2026-07-29T14:00:00); open_fvg 7455.25 reached 2026-07-29T14:45:00 (60m SHORT open FVG open_untouched parent 2026-07-29T10:00:00 confirmed 2026-07-29T11:00:00); liquidity 7464.75 reached 2026-07-29T14:45:00 (prior 5M swing high liquidity from 2026-07-29T09:30:00); session_extreme 7464.75 reached 2026-07-29T14:45:00 (RTH high liquidity before proof); open_fvg 7470.50 reached 2026-07-29T14:50:00 (5m SHORT open FVG partial_touch parent 2026-07-29T08:20:00 confirmed 2026-07-29T08:25:00); open_fvg 7470.50 reached 2026-07-29T14:50:00 (15m SHORT open FVG partial_touch parent 2026-07-29T08:30:00 confirmed 2026-07-29T08:45:00); open_fvg 7473.75 reached 2026-07-29T14:50:00 (5m SHORT open FVG open_untouched parent 2026-07-29T08:15:00 confirmed 2026-07-29T08:20:00); open_fvg 7476.00 reached 2026-07-29T14:50:00 (120m SHORT open FVG open_untouched parent 2026-07-29T10:00:00 confirmed 2026-07-29T12:00:00); open_fvg 7476.00 reached 2026-07-29T14:50:00 (60m SHORT open FVG open_untouched parent 2026-07-29T09:00:00 confirmed 2026-07-29T10:00:00); tactical 7516.75 not reached (T1 1.5R); tactical 7543.25 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-07-29T14:05:00 from 7398.75-7402.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7437.50-7439.25 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7439.50 liquidity, 7444.25 open_fvg, 7451.25 open_fvg, 7455.25 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-29T15:35:00, one MES $-265.00
- Managed outcome: LQ1 at 2026-07-29T14:45:00, exit 7464.75, one MES +$137.50
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-29T14:05:00 before later same-zone failure/reversal read at 2026-07-29T15:45:00. Review the defended continuation before labeling this zone as failure/reversal.

### 2. LONG 15M FVG 7404.50-7413.00 parent 2026-07-29T13:15:00 confirmed 2026-07-29T13:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-29T13:15:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-29T15:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-29T13:30:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-29T13:35:00, 2026-07-29T13:40:00, 2026-07-29T13:45:00, 2026-07-29T13:50:00, 2026-07-29T14:00:00, 2026-07-29T14:05:00, 2026-07-29T15:30:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-29T13:35:00. | PASS entry_stop_risk_contract: Entry 7414.25, protected 5M stop 7384.25, risk 30.00 pts. | PASS tactical_targets_from_actual_risk: T1 7459.25 and T2 7474.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7414.50.
- Parent displacement: yes
- Parent displacement candle: 2026-07-29T13:15:00
- Parent failure: 2026-07-29T15:45:00
- First 5M return: 2026-07-29T13:30:00
- 5M wick defense: 2026-07-29T13:35:00, 2026-07-29T13:40:00, 2026-07-29T13:45:00, 2026-07-29T13:50:00, 2026-07-29T14:00:00, 2026-07-29T14:05:00, 2026-07-29T15:30:00
- Proof: 2026-07-29T13:35:00
- Entry/stop/risk: 7414.25 / 7384.25 / 30.00 pts
- T1/T2: 7459.25 / 7474.25
- Nearest liquidity: nearest prior high liquidity 7414.50
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7414.75-7418.50 parent 2026-05-06T07:45:00 confirmed 2026-05-06T07:50:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-29T13:40:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7398.75-7402.75 parent 2026-07-29T13:00:00 confirmed 2026-07-29T13:15:00 defended_on_15m defended 2026-07-29T14:15:00 failed 2026-07-29T15:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7398.75-7402.75 parent 2026-07-29T13:00:00 confirmed 2026-07-29T13:15:00 defended_on_15m defended 2026-07-29T14:15:00 failed 2026-07-29T15:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-29T13:30:00; wick 2026-07-29T13:35:00; proof 2026-07-29T13:35:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7439.50 (prior 5M swing high liquidity from 2026-07-29T10:10:00)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no defended FVG management objective interrupted delivery.
- Open FVGs below at proof: 15m LONG 7404.50-7413.00 parent 2026-07-29T13:15:00 confirmed 2026-07-29T13:30:00 status open_untouched; 5m LONG 7404.50-7408.75 parent 2026-07-29T13:05:00 confirmed 2026-07-29T13:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7400.75-7402.75 parent 2026-07-29T13:00:00 confirmed 2026-07-29T13:05:00 status open_untouched; 15m LONG 7398.75-7402.75 parent 2026-07-29T13:00:00 confirmed 2026-07-29T13:15:00 status open_untouched; 5m LONG 7395.25-7396.50 parent 2026-07-29T12:55:00 confirmed 2026-07-29T13:00:00 status open_untouched; 5m LONG 7379.00-7388.25 parent 2026-07-29T12:25:00 confirmed 2026-07-29T12:30:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7414.75-7418.50 parent 2026-05-06T07:45:00 confirmed 2026-05-06T07:50:00 status failed_inverted; 5m LONG 7414.75-7418.50 parent 2026-07-29T13:15:00 confirmed 2026-07-29T13:20:00 status failed_inverted; 15m SHORT 7415.50-7419.25 parent 2026-05-06T07:45:00 confirmed 2026-05-06T08:00:00 status failed_inverted; 5m LONG 7416.00-7417.25 parent 2026-05-07T19:25:00 confirmed 2026-05-07T19:30:00 status failed_inverted; 5m LONG 7416.00-7417.00 parent 2026-06-26T10:10:00 confirmed 2026-06-26T10:15:00 status failed_inverted; 5m SHORT 7417.25-7419.25 parent 2026-05-07T18:35:00 confirmed 2026-05-07T18:40:00 status failed_inverted; 5m LONG 7418.00-7418.25 parent 2026-05-07T19:45:00 confirmed 2026-05-07T19:50:00 status failed_inverted; 5m SHORT 7418.25-7424.75 parent 2026-06-24T14:50:00 confirmed 2026-06-24T14:55:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7426.75-7429.25 parent 2026-07-29T10:10:00 confirmed 2026-07-29T10:15:00 status partial_touch; 5m SHORT 7434.00-7445.25 parent 2026-07-29T09:55:00 confirmed 2026-07-29T10:00:00 status partial_touch; 15m SHORT 7439.50-7444.25 parent 2026-07-29T10:00:00 confirmed 2026-07-29T10:15:00 status open_untouched; 60m SHORT 7439.50-7455.25 parent 2026-07-29T10:00:00 confirmed 2026-07-29T11:00:00 status open_untouched; 120m SHORT 7439.50-7476.00 parent 2026-07-29T10:00:00 confirmed 2026-07-29T12:00:00 status open_untouched; 5m SHORT 7448.75-7450.00 parent 2026-07-29T09:50:00 confirmed 2026-07-29T09:55:00 status open_untouched; 5m SHORT 7463.25-7470.50 parent 2026-07-29T08:20:00 confirmed 2026-07-29T08:25:00 status partial_touch; 60m SHORT 7464.75-7476.00 parent 2026-07-29T09:00:00 confirmed 2026-07-29T10:00:00 status open_untouched
- Objective ladder: open_fvg 7429.25 reached 2026-07-29T14:05:00 (5m SHORT open FVG partial_touch parent 2026-07-29T10:10:00 confirmed 2026-07-29T10:15:00); liquidity 7439.50 reached 2026-07-29T14:05:00 (prior 5M swing high liquidity from 2026-07-29T10:10:00); open_fvg 7444.25 reached 2026-07-29T14:05:00 (15m SHORT open FVG open_untouched parent 2026-07-29T10:00:00 confirmed 2026-07-29T10:15:00); open_fvg 7445.25 reached 2026-07-29T14:05:00 (5m SHORT open FVG partial_touch parent 2026-07-29T09:55:00 confirmed 2026-07-29T10:00:00); open_fvg 7450.00 reached 2026-07-29T14:05:00 (5m SHORT open FVG open_untouched parent 2026-07-29T09:50:00 confirmed 2026-07-29T09:55:00); open_fvg 7455.25 reached 2026-07-29T14:45:00 (60m SHORT open FVG open_untouched parent 2026-07-29T10:00:00 confirmed 2026-07-29T11:00:00); tactical 7459.25 reached 2026-07-29T14:45:00 (T1 1.5R); liquidity 7464.75 reached 2026-07-29T14:45:00 (prior 5M swing high liquidity from 2026-07-29T09:30:00); session_extreme 7464.75 reached 2026-07-29T14:45:00 (RTH high liquidity before proof); open_fvg 7470.50 reached 2026-07-29T14:50:00 (5m SHORT open FVG partial_touch parent 2026-07-29T08:20:00 confirmed 2026-07-29T08:25:00); tactical 7474.25 reached 2026-07-29T14:50:00 (T2 2.0R); open_fvg 7476.00 reached 2026-07-29T14:50:00 (120m SHORT open FVG open_untouched parent 2026-07-29T10:00:00 confirmed 2026-07-29T12:00:00); open_fvg 7476.00 reached 2026-07-29T14:50:00 (60m SHORT open FVG open_untouched parent 2026-07-29T09:00:00 confirmed 2026-07-29T10:00:00)
- Story: LONG proof completed at 2026-07-29T13:35:00 from 7404.50-7413.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7414.75-7418.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7429.25 open_fvg, 7439.50 liquidity, 7444.25 open_fvg, 7445.25 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-29T14:45:00, one MES +$225.00
- Managed outcome: LQ1 at 2026-07-29T14:05:00, exit 7439.50, one MES +$126.25
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-29T13:35:00 before later same-zone failure/reversal read at 2026-07-29T15:45:00. Review the defended continuation before labeling this zone as failure/reversal.

### 3. LONG 15M FVG 7438.25-7460.50 parent 2026-07-29T14:45:00 confirmed 2026-07-29T15:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-29T14:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-29T15:30:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-29T14:45:00
- Parent failure: 2026-07-29T15:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7398.75-7402.75 parent 2026-07-29T13:00:00 confirmed 2026-07-29T13:15:00 defended_on_15m defended 2026-07-29T14:15:00 failed 2026-07-29T15:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7398.75-7402.75 parent 2026-07-29T13:00:00 confirmed 2026-07-29T13:15:00 defended_on_15m defended 2026-07-29T14:15:00 failed 2026-07-29T15:45:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-29T15:05:00; wick 2026-07-29T15:15:00; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-29T15:20:00.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 4. SHORT 15M FVG 7452.25-7460.50 parent 2026-07-29T15:15:00 confirmed 2026-07-29T15:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-29T15:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-29T15:15:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7452.25-7460.50 parent 2026-07-29T15:15:00 confirmed 2026-07-29T15:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7452.25-7460.50 parent 2026-07-29T15:15:00 confirmed 2026-07-29T15:30:00 untested_by_15m
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

### 5. SHORT 15M FVG 7411.00-7434.25 parent 2026-07-29T15:30:00 confirmed 2026-07-29T15:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-29T15:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-29T15:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7452.25-7460.50 parent 2026-07-29T15:15:00 confirmed 2026-07-29T15:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7452.25-7460.50 parent 2026-07-29T15:15:00 confirmed 2026-07-29T15:30:00 untested_by_15m
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

### 6. SHORT 15M FVG 7375.00-7396.25 parent 2026-07-29T15:45:00 confirmed 2026-07-29T16:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-29T15:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-29T15:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7452.25-7460.50 parent 2026-07-29T15:15:00 confirmed 2026-07-29T15:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7452.25-7460.50 parent 2026-07-29T15:15:00 confirmed 2026-07-29T15:30:00 untested_by_15m
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
