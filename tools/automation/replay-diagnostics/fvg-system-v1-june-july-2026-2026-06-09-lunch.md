# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-09 / lunch (2026-06-09T12:00:00 to 2026-06-09T16:00:00)
Context window: 275 days (2025-09-07T00:00:00 to 2026-06-10T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 43451 bars (2025-10-28T18:05:00 to 2026-06-10T23:55:00)
- 15m: 14492 bars (2025-10-28T18:15:00 to 2026-06-10T23:45:00)
- 60m: 3586 bars (2025-10-28T19:00:00 to 2026-06-10T23:00:00)
- 120m: 1875 bars (2025-10-28T20:00:00 to 2026-06-10T22:00:00)
- 240m: 976 bars (2025-10-28T22:00:00 to 2026-06-10T22:00:00)

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
- Open below: 15m LONG 7372.50-7373.50 parent 2026-05-06T04:45:00 confirmed 2026-05-06T05:00:00 status open_untouched; 5m LONG 7371.00-7371.75 parent 2026-05-06T04:35:00 confirmed 2026-05-06T04:40:00 status open_untouched; 15m LONG 7360.50-7362.00 parent 2026-05-05T18:45:00 confirmed 2026-05-05T19:00:00 status open_untouched; 15m LONG 7354.25-7358.75 parent 2026-05-05T16:30:00 confirmed 2026-05-05T16:45:00 status partial_touch; 5m LONG 7354.25-7356.00 parent 2026-05-05T16:20:00 confirmed 2026-05-05T16:25:00 status open_untouched; 120m LONG 7340.75-7342.50 parent 2026-05-05T12:00:00 confirmed 2026-05-05T14:00:00 status open_untouched; 60m LONG 7340.75-7342.00 parent 2026-05-05T11:00:00 confirmed 2026-05-05T12:00:00 status open_untouched; 120m LONG 7325.25-7330.00 parent 2026-05-05T10:00:00 confirmed 2026-05-05T12:00:00 status open_untouched; 15m LONG 7322.75-7326.50 parent 2026-05-05T08:15:00 confirmed 2026-05-05T08:30:00 status partial_touch; 60m LONG 7322.75-7325.00 parent 2026-05-05T09:00:00 confirmed 2026-05-05T10:00:00 status open_untouched
- Failed above: 120m LONG 7378.25-7403.75 parent 2026-05-06T06:00:00 confirmed 2026-05-06T08:00:00 status failed_inverted; 5m SHORT 7379.00-7379.75 parent 2026-05-05T19:25:00 confirmed 2026-05-05T19:30:00 status failed_inverted; 5m SHORT 7390.25-7396.25 parent 2026-05-06T05:05:00 confirmed 2026-05-06T05:10:00 status failed_inverted; 5m LONG 7390.25-7393.00 parent 2026-05-06T05:15:00 confirmed 2026-05-06T05:20:00 status failed_inverted; 5m LONG 7393.50-7394.50 parent 2026-05-06T05:20:00 confirmed 2026-05-06T05:25:00 status failed_inverted; 5m LONG 7397.25-7401.00 parent 2026-05-06T05:35:00 confirmed 2026-05-06T05:40:00 status failed_inverted; 5m LONG 7397.75-7402.75 parent 2026-05-06T09:35:00 confirmed 2026-05-06T09:40:00 status failed_inverted; 15m LONG 7399.75-7400.25 parent 2026-05-06T05:45:00 confirmed 2026-05-06T06:00:00 status failed_inverted; 5m LONG 7403.75-7404.50 parent 2026-05-06T05:55:00 confirmed 2026-05-06T06:00:00 status failed_inverted; 60m LONG 7406.50-7408.00 parent 2026-05-06T07:00:00 confirmed 2026-05-06T08:00:00 status failed_inverted
- Open above: 5m SHORT 7398.00-7400.75 parent 2026-06-09T11:55:00 confirmed 2026-06-09T12:00:00 status open_untouched; 5m SHORT 7403.00-7425.75 parent 2026-06-09T11:30:00 confirmed 2026-06-09T11:35:00 status partial_touch; 15m SHORT 7409.75-7447.75 parent 2026-06-09T11:30:00 confirmed 2026-06-09T11:45:00 status partial_touch; 5m SHORT 7426.75-7446.75 parent 2026-06-09T11:25:00 confirmed 2026-06-09T11:30:00 status open_untouched; 5m SHORT 7452.00-7453.50 parent 2026-06-09T11:20:00 confirmed 2026-06-09T11:25:00 status open_untouched; 60m SHORT 7469.00-7512.50 parent 2026-06-09T11:00:00 confirmed 2026-06-09T12:00:00 status open_untouched; 5m SHORT 7474.00-7489.50 parent 2026-06-09T10:45:00 confirmed 2026-06-09T10:50:00 status open_untouched; 15m SHORT 7474.00-7479.00 parent 2026-06-09T10:45:00 confirmed 2026-06-09T11:00:00 status open_untouched; 5m SHORT 7504.75-7523.75 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00 status partial_touch; 15m SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 status open_untouched

## Review Order
- Primary campaign to review first: SHORT proof 2026-06-09T11:45:00 from 15M parent 2026-06-09T11:30:00 confirmed 2026-06-09T11:45:00.
- Defended-area management context: 5m LONG 7376.00-7396.25 is a callout before/near T1, not an issue by itself.
- Later rows: 5 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7409.75-7447.75 parent 2026-06-09T11:30:00 confirmed 2026-06-09T11:45:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-09T11:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-09T15:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-09T11:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-09T11:45:00, 2026-06-09T11:55:00, 2026-06-09T13:45:00, 2026-06-09T14:00:00, 2026-06-09T14:05:00, 2026-06-09T14:55:00, 2026-06-09T15:35:00, 2026-06-09T15:50:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-09T11:45:00. | PASS entry_stop_risk_contract: Entry 7403.25, protected 5M stop 7469.00, risk 65.75 pts. | PASS tactical_targets_from_actual_risk: T1 7304.75 and T2 7271.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7403.00.
- Parent displacement: yes
- Parent displacement candle: 2026-06-09T11:30:00
- Parent failure: 2026-06-09T15:00:00
- First 5M return: 2026-06-09T11:45:00
- 5M wick defense: 2026-06-09T11:45:00, 2026-06-09T11:55:00, 2026-06-09T13:45:00, 2026-06-09T14:00:00, 2026-06-09T14:05:00, 2026-06-09T14:55:00, 2026-06-09T15:35:00, 2026-06-09T15:50:00
- Proof: 2026-06-09T11:45:00
- Entry/stop/risk: 7403.25 / 7469.00 / 65.75 pts
- T1/T2: 7304.75 / 7271.75
- Nearest liquidity: nearest prior low liquidity 7403.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7376.00-7396.25 parent 2026-05-06T04:55:00 confirmed 2026-05-06T05:00:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-09T11:55:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7409.75-7447.75 parent 2026-06-09T11:30:00 confirmed 2026-06-09T11:45:00 defended_on_15m defended 2026-06-09T12:00:00 failed 2026-06-09T15:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7409.75-7447.75 parent 2026-06-09T11:30:00 confirmed 2026-06-09T11:45:00 defended_on_15m defended 2026-06-09T12:00:00 failed 2026-06-09T15:00:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-09T11:45:00; wick 2026-06-09T11:45:00; proof 2026-06-09T11:45:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 5m LONG 7376.00-7396.25 parent 2026-05-06T04:55:00 confirmed 2026-05-06T05:00:00 status partial_touch; 240m LONG 7376.25-7390.75 parent 2026-05-06T06:00:00 confirmed 2026-05-06T10:00:00 status partial_touch; 15m LONG 7374.50-7386.50 parent 2026-05-06T05:00:00 confirmed 2026-05-06T05:15:00 status open_untouched; 60m LONG 7375.25-7386.50 parent 2026-05-06T05:00:00 confirmed 2026-05-06T06:00:00 status open_untouched; 15m LONG 7372.50-7373.50 parent 2026-05-06T04:45:00 confirmed 2026-05-06T05:00:00 status open_untouched; 5m LONG 7371.00-7371.75 parent 2026-05-06T04:35:00 confirmed 2026-05-06T04:40:00 status open_untouched; 15m LONG 7360.50-7362.00 parent 2026-05-05T18:45:00 confirmed 2026-05-05T19:00:00 status open_untouched; 15m LONG 7354.25-7358.75 parent 2026-05-05T16:30:00 confirmed 2026-05-05T16:45:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7403.75-7404.50 parent 2026-05-06T05:55:00 confirmed 2026-05-06T06:00:00 status failed_inverted; 60m LONG 7406.50-7408.00 parent 2026-05-06T07:00:00 confirmed 2026-05-06T08:00:00 status failed_inverted; 5m SHORT 7407.00-7409.25 parent 2026-05-06T08:05:00 confirmed 2026-05-06T08:10:00 status failed_inverted; 5m LONG 7407.25-7410.25 parent 2026-05-06T06:20:00 confirmed 2026-05-06T06:25:00 status failed_inverted; 15m LONG 7411.50-7413.50 parent 2026-05-06T06:30:00 confirmed 2026-05-06T06:45:00 status failed_inverted; 5m SHORT 7412.25-7414.75 parent 2026-05-07T18:05:00 confirmed 2026-05-07T18:10:00 status failed_inverted; 15m SHORT 7412.25-7413.25 parent 2026-05-06T08:00:00 confirmed 2026-05-06T08:15:00 status failed_inverted; 5m LONG 7413.00-7413.50 parent 2026-05-06T06:30:00 confirmed 2026-05-06T06:35:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7409.75-7447.75 parent 2026-06-09T11:30:00 confirmed 2026-06-09T11:45:00 status open_untouched; 5m SHORT 7426.75-7446.75 parent 2026-06-09T11:25:00 confirmed 2026-06-09T11:30:00 status open_untouched; 5m SHORT 7452.00-7453.50 parent 2026-06-09T11:20:00 confirmed 2026-06-09T11:25:00 status open_untouched; 5m SHORT 7474.00-7489.50 parent 2026-06-09T10:45:00 confirmed 2026-06-09T10:50:00 status open_untouched; 15m SHORT 7474.00-7479.00 parent 2026-06-09T10:45:00 confirmed 2026-06-09T11:00:00 status open_untouched; 5m SHORT 7504.75-7523.75 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00 status partial_touch; 15m SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 status open_untouched; 5m SHORT 7536.00-7536.50 parent 2026-06-09T10:00:00 confirmed 2026-06-09T10:05:00 status open_untouched
- Objective ladder: session_extreme 7389.50 reached 2026-06-09T12:00:00 (RTH low liquidity before proof); open_fvg 7376.25 reached 2026-06-09T12:00:00 (240m LONG open FVG partial_touch parent 2026-05-06T06:00:00 confirmed 2026-05-06T10:00:00); open_fvg 7376.00 reached 2026-06-09T12:00:00 (5m LONG open FVG partial_touch parent 2026-05-06T04:55:00 confirmed 2026-05-06T05:00:00); open_fvg 7375.25 reached 2026-06-09T12:00:00 (60m LONG open FVG open_untouched parent 2026-05-06T05:00:00 confirmed 2026-05-06T06:00:00); open_fvg 7374.50 reached 2026-06-09T12:00:00 (15m LONG open FVG open_untouched parent 2026-05-06T05:00:00 confirmed 2026-05-06T05:15:00); open_fvg 7372.50 reached 2026-06-09T12:10:00 (15m LONG open FVG open_untouched parent 2026-05-06T04:45:00 confirmed 2026-05-06T05:00:00); open_fvg 7371.00 reached 2026-06-09T12:10:00 (5m LONG open FVG open_untouched parent 2026-05-06T04:35:00 confirmed 2026-05-06T04:40:00); open_fvg 7360.50 reached 2026-06-09T12:20:00 (15m LONG open FVG open_untouched parent 2026-05-05T18:45:00 confirmed 2026-05-05T19:00:00); open_fvg 7354.25 reached 2026-06-09T12:20:00 (15m LONG open FVG partial_touch parent 2026-05-05T16:30:00 confirmed 2026-05-05T16:45:00); tactical 7304.75 not reached (T1 1.5R); tactical 7271.75 not reached (T2 2.0R)
- Story: SHORT proof completed at 2026-06-09T11:45:00 from 7409.75-7447.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7376.00-7396.25 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7389.50 session_extreme, 7376.25 open_fvg, 7376.00 open_fvg, 7375.25 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-10T19:05:00, one MES +$492.50
- Managed outcome: T1 at 2026-06-10T19:05:00, exit 7304.75, one MES +$492.50
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-09T11:45:00 before later same-zone failure/reversal read at 2026-06-09T15:00:00. Review the defended continuation before labeling this zone as failure/reversal.

### 2. SHORT 15M FVG 7370.75-7374.50 parent 2026-06-09T12:15:00 confirmed 2026-06-09T12:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-09T12:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-09T13:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-09T12:35:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-09T12:35:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-09T12:35:00. | PASS entry_stop_risk_contract: Entry 7357.75, protected 5M stop 7412.50, risk 54.75 pts. | PASS tactical_targets_from_actual_risk: T1 7275.75 and T2 7248.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7357.50.
- Parent displacement: yes
- Parent displacement candle: 2026-06-09T12:00:00
- Parent failure: 2026-06-09T13:30:00
- First 5M return: 2026-06-09T12:35:00
- 5M wick defense: 2026-06-09T12:35:00
- Proof: 2026-06-09T12:35:00
- Entry/stop/risk: 7357.75 / 7412.50 / 54.75 pts
- T1/T2: 7275.75 / 7248.25
- Nearest liquidity: nearest prior low liquidity 7357.50
- Defended-area / obstacle management callout before or near T1: 120m LONG 7340.75-7342.50 parent 2026-05-05T12:00:00 confirmed 2026-05-05T14:00:00 status open_untouched
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-09T12:40:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7370.75-7374.50 parent 2026-06-09T12:15:00 confirmed 2026-06-09T12:30:00 defended_on_15m defended 2026-06-09T12:45:00 failed 2026-06-09T13:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7370.75-7374.50 parent 2026-06-09T12:15:00 confirmed 2026-06-09T12:30:00 defended_on_15m defended 2026-06-09T12:45:00 failed 2026-06-09T13:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-09T12:35:00; wick 2026-06-09T12:35:00; proof 2026-06-09T12:35:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7338.00 (RTH low liquidity before proof)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 120m LONG 7340.75-7342.50 parent 2026-05-05T12:00:00 confirmed 2026-05-05T14:00:00 status open_untouched; 60m LONG 7340.75-7342.00 parent 2026-05-05T11:00:00 confirmed 2026-05-05T12:00:00 status open_untouched; 120m LONG 7325.25-7330.00 parent 2026-05-05T10:00:00 confirmed 2026-05-05T12:00:00 status open_untouched; 15m LONG 7322.75-7326.50 parent 2026-05-05T08:15:00 confirmed 2026-05-05T08:30:00 status partial_touch; 60m LONG 7322.75-7325.00 parent 2026-05-05T09:00:00 confirmed 2026-05-05T10:00:00 status open_untouched; 5m LONG 7321.75-7324.75 parent 2026-05-05T08:10:00 confirmed 2026-05-05T08:15:00 status partial_touch; 5m LONG 7316.50-7317.75 parent 2026-05-05T07:30:00 confirmed 2026-05-05T07:35:00 status open_untouched; 5m LONG 7315.25-7316.25 parent 2026-05-05T07:25:00 confirmed 2026-05-05T07:30:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7358.00-7359.75 parent 2026-05-05T15:10:00 confirmed 2026-05-05T15:15:00 status failed_inverted; 5m SHORT 7358.25-7360.00 parent 2026-05-01T10:30:00 confirmed 2026-05-01T10:35:00 status failed_inverted; 5m SHORT 7358.50-7358.75 parent 2026-05-05T16:50:00 confirmed 2026-05-05T16:55:00 status failed_inverted; 5m SHORT 7358.75-7359.25 parent 2026-05-05T18:15:00 confirmed 2026-05-05T18:20:00 status failed_inverted; 5m LONG 7359.00-7361.00 parent 2026-05-05T16:25:00 confirmed 2026-05-05T16:30:00 status failed_inverted; 5m SHORT 7359.25-7361.00 parent 2026-05-05T16:45:00 confirmed 2026-05-05T16:50:00 status failed_inverted; 15m LONG 7360.50-7362.00 parent 2026-05-05T18:45:00 confirmed 2026-05-05T19:00:00 status failed_inverted; 15m LONG 7363.25-7375.75 parent 2026-05-05T19:00:00 confirmed 2026-05-05T19:15:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7370.75-7374.50 parent 2026-06-09T12:15:00 confirmed 2026-06-09T12:30:00 status open_untouched; 5m SHORT 7390.75-7395.25 parent 2026-06-09T12:00:00 confirmed 2026-06-09T12:05:00 status open_untouched; 5m SHORT 7398.00-7400.75 parent 2026-06-09T11:55:00 confirmed 2026-06-09T12:00:00 status open_untouched; 5m SHORT 7403.00-7425.75 parent 2026-06-09T11:30:00 confirmed 2026-06-09T11:35:00 status partial_touch; 15m SHORT 7409.75-7447.75 parent 2026-06-09T11:30:00 confirmed 2026-06-09T11:45:00 status partial_touch; 5m SHORT 7426.75-7446.75 parent 2026-06-09T11:25:00 confirmed 2026-06-09T11:30:00 status open_untouched; 5m SHORT 7452.00-7453.50 parent 2026-06-09T11:20:00 confirmed 2026-06-09T11:25:00 status open_untouched; 60m SHORT 7469.00-7512.50 parent 2026-06-09T11:00:00 confirmed 2026-06-09T12:00:00 status open_untouched
- Objective ladder: open_fvg 7340.75 reached 2026-06-09T12:40:00 (120m LONG open FVG open_untouched parent 2026-05-05T12:00:00 confirmed 2026-05-05T14:00:00); open_fvg 7340.75 reached 2026-06-09T12:40:00 (60m LONG open FVG open_untouched parent 2026-05-05T11:00:00 confirmed 2026-05-05T12:00:00); session_extreme 7338.00 reached 2026-06-09T12:40:00 (RTH low liquidity before proof); open_fvg 7325.25 reached 2026-06-09T12:40:00 (120m LONG open FVG open_untouched parent 2026-05-05T10:00:00 confirmed 2026-05-05T12:00:00); open_fvg 7322.75 reached 2026-06-09T12:40:00 (15m LONG open FVG partial_touch parent 2026-05-05T08:15:00 confirmed 2026-05-05T08:30:00); open_fvg 7322.75 reached 2026-06-09T12:40:00 (60m LONG open FVG open_untouched parent 2026-05-05T09:00:00 confirmed 2026-05-05T10:00:00); open_fvg 7321.75 reached 2026-06-09T12:40:00 (5m LONG open FVG partial_touch parent 2026-05-05T08:10:00 confirmed 2026-05-05T08:15:00); open_fvg 7316.50 reached 2026-06-09T12:40:00 (5m LONG open FVG open_untouched parent 2026-05-05T07:30:00 confirmed 2026-05-05T07:35:00); open_fvg 7315.25 reached 2026-06-09T12:40:00 (5m LONG open FVG open_untouched parent 2026-05-05T07:25:00 confirmed 2026-05-05T07:30:00); tactical 7275.75 not reached (T1 1.5R); tactical 7248.25 not reached (T2 2.0R)
- Story: SHORT proof completed at 2026-06-09T12:35:00 from 7370.75-7374.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 120m 7340.75-7342.50 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7340.75 open_fvg, 7340.75 open_fvg, 7338.00 session_extreme, 7325.25 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-09T13:45:00, one MES $-273.75
- Managed outcome: LQ1 at 2026-06-09T12:40:00, exit 7338.00, one MES +$98.75
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-09T12:35:00 before later same-zone failure/reversal read at 2026-06-09T13:30:00. Review the defended continuation before labeling this zone as failure/reversal.

### 3. LONG 15M FVG 7351.75-7364.00 parent 2026-06-09T13:15:00 confirmed 2026-06-09T13:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7351.75-7364.00 parent 2026-06-09T13:15:00 confirmed 2026-06-09T13:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7351.75-7364.00 parent 2026-06-09T13:15:00 confirmed 2026-06-09T13:30:00 untested_by_15m
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

### 4. LONG 15M FVG 7375.50-7386.75 parent 2026-06-09T13:30:00 confirmed 2026-06-09T13:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7351.75-7364.00 parent 2026-06-09T13:15:00 confirmed 2026-06-09T13:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7351.75-7364.00 parent 2026-06-09T13:15:00 confirmed 2026-06-09T13:30:00 untested_by_15m
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

### 5. LONG 15M FVG 7422.75-7428.25 parent 2026-06-09T14:30:00 confirmed 2026-06-09T14:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-09T15:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-09T14:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-09T15:25:00, 2026-06-09T15:30:00, 2026-06-09T15:35:00, 2026-06-09T15:45:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-09T15:30:00. | PASS entry_stop_risk_contract: Entry 7431.25, protected 5M stop 7406.00, risk 25.25 pts. | PASS tactical_targets_from_actual_risk: T1 7469.25 and T2 7481.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7431.50.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-06-09T15:45:00
- First 5M return: 2026-06-09T14:45:00
- 5M wick defense: 2026-06-09T15:25:00, 2026-06-09T15:30:00, 2026-06-09T15:35:00, 2026-06-09T15:45:00
- Proof: 2026-06-09T15:30:00
- Entry/stop/risk: 7431.25 / 7406.00 / 25.25 pts
- T1/T2: 7469.25 / 7481.75
- Nearest liquidity: nearest prior high liquidity 7431.50
- Defended-area / obstacle management callout before or near T1: 15m SHORT 7431.50-7440.25 parent 2026-05-19T22:45:00 confirmed 2026-05-19T23:00:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-09T15:35:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7351.75-7364.00 parent 2026-06-09T13:15:00 confirmed 2026-06-09T13:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7351.75-7364.00 parent 2026-06-09T13:15:00 confirmed 2026-06-09T13:30:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-09T14:45:00; wick 2026-06-09T15:25:00; proof 2026-06-09T15:30:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7448.25 (prior 5M swing high liquidity from 2026-06-09T14:40:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 60m LONG 7390.75-7406.00 parent 2026-06-09T14:00:00 confirmed 2026-06-09T15:00:00 status open_untouched; 15m LONG 7375.50-7386.75 parent 2026-06-09T13:30:00 confirmed 2026-06-09T13:45:00 status open_untouched; 5m LONG 7375.50-7380.00 parent 2026-06-09T13:20:00 confirmed 2026-06-09T13:25:00 status open_untouched; 15m LONG 7351.75-7364.00 parent 2026-06-09T13:15:00 confirmed 2026-06-09T13:30:00 status open_untouched; 5m LONG 7351.75-7360.25 parent 2026-06-09T13:05:00 confirmed 2026-06-09T13:10:00 status partial_touch; 5m LONG 7339.75-7348.75 parent 2026-06-09T13:00:00 confirmed 2026-06-09T13:05:00 status open_untouched; 240m LONG 7307.75-7312.00 parent 2026-05-05T06:00:00 confirmed 2026-05-05T10:00:00 status partial_touch; 120m LONG 7307.75-7310.50 parent 2026-05-05T04:00:00 confirmed 2026-05-05T06:00:00 status partial_touch
- Failed FVGs above at proof: 15m SHORT 7431.50-7440.25 parent 2026-05-19T22:45:00 confirmed 2026-05-19T23:00:00 status failed_inverted; 15m LONG 7431.75-7433.25 parent 2026-05-06T14:00:00 confirmed 2026-05-06T14:15:00 status failed_inverted; 5m LONG 7432.75-7434.00 parent 2026-05-06T11:00:00 confirmed 2026-05-06T11:05:00 status failed_inverted; 5m SHORT 7432.75-7434.75 parent 2026-05-12T11:25:00 confirmed 2026-05-12T11:30:00 status failed_inverted; 5m LONG 7432.75-7433.50 parent 2026-05-12T11:35:00 confirmed 2026-05-12T11:40:00 status failed_inverted; 5m SHORT 7433.25-7433.50 parent 2026-05-20T01:15:00 confirmed 2026-05-20T01:20:00 status failed_inverted; 5m LONG 7434.00-7436.00 parent 2026-05-07T21:00:00 confirmed 2026-05-07T21:05:00 status failed_inverted; 5m SHORT 7434.00-7440.25 parent 2026-05-19T22:35:00 confirmed 2026-05-19T22:40:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7439.75-7449.25 parent 2026-06-09T15:15:00 confirmed 2026-06-09T15:20:00 status open_untouched; 60m SHORT 7469.00-7512.50 parent 2026-06-09T11:00:00 confirmed 2026-06-09T12:00:00 status open_untouched; 5m SHORT 7474.00-7489.50 parent 2026-06-09T10:45:00 confirmed 2026-06-09T10:50:00 status open_untouched; 15m SHORT 7474.00-7479.00 parent 2026-06-09T10:45:00 confirmed 2026-06-09T11:00:00 status open_untouched; 5m SHORT 7504.75-7523.75 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00 status partial_touch; 15m SHORT 7507.00-7527.50 parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00 status open_untouched; 5m SHORT 7536.00-7536.50 parent 2026-06-09T10:00:00 confirmed 2026-06-09T10:05:00 status open_untouched; 60m SHORT 7554.00-7569.25 parent 2026-06-05T12:00:00 confirmed 2026-06-05T13:00:00 status partial_touch
- Objective ladder: liquidity 7448.25 reached 2026-06-09T16:00:00 (prior 5M swing high liquidity from 2026-06-09T14:40:00); open_fvg 7449.25 reached 2026-06-09T16:00:00 (5m SHORT open FVG open_untouched parent 2026-06-09T15:15:00 confirmed 2026-06-09T15:20:00); liquidity 7462.25 not reached (prior 5M swing high liquidity from 2026-06-09T15:10:00); liquidity 7469.00 not reached (prior 5M swing high liquidity from 2026-06-09T11:15:00); tactical 7469.25 not reached (T1 1.5R); open_fvg 7479.00 not reached (15m SHORT open FVG open_untouched parent 2026-06-09T10:45:00 confirmed 2026-06-09T11:00:00); tactical 7481.75 not reached (T2 2.0R); open_fvg 7489.50 not reached (5m SHORT open FVG open_untouched parent 2026-06-09T10:45:00 confirmed 2026-06-09T10:50:00); liquidity 7507.00 not reached (prior 5M swing high liquidity from 2026-06-09T10:30:00); open_fvg 7512.50 not reached (60m SHORT open FVG open_untouched parent 2026-06-09T11:00:00 confirmed 2026-06-09T12:00:00); open_fvg 7523.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:20:00); open_fvg 7527.50 not reached (15m SHORT open FVG open_untouched parent 2026-06-09T10:15:00 confirmed 2026-06-09T10:30:00); open_fvg 7536.50 not reached (5m SHORT open FVG open_untouched parent 2026-06-09T10:00:00 confirmed 2026-06-09T10:05:00); liquidity 7554.50 not reached (prior 5M swing high liquidity from 2026-06-09T09:50:00)
- Story: LONG proof completed at 2026-06-09T15:30:00 from 7422.75-7428.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 15m 7431.50-7440.25 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7448.25 liquidity, 7449.25 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-10T04:45:00, one MES $-126.25
- Managed outcome: LQ1 at 2026-06-09T16:00:00, exit 7448.25, one MES +$85.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. Defended-first continuation precedence: LONG 5M defense proof completed at 2026-06-09T15:30:00 before later same-zone failure/reversal read at 2026-06-09T15:45:00. Review the defended continuation before labeling this zone as failure/reversal.

### 6. SHORT 15M FVG 7435.50-7436.75 parent 2026-06-09T15:30:00 confirmed 2026-06-09T15:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-09T16:00:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-06-09T16:00:00
- First 5M return: not found
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: final_deepest_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7370.75-7374.50 parent 2026-06-09T12:15:00 confirmed 2026-06-09T12:30:00 defended_on_15m defended 2026-06-09T12:45:00 failed 2026-06-09T13:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7435.50-7436.75 parent 2026-06-09T15:30:00 confirmed 2026-06-09T15:45:00 failed_acceptance_through_15m failed 2026-06-09T16:00:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-06-09T15:55:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-06-09T15:55:00.
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
