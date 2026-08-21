# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-28 / morning (2026-07-28T09:15:00 to 2026-07-28T12:00:00)
Context window: 275 days (2025-10-26T00:00:00 to 2026-07-29T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 53015 bars (2025-10-28T18:05:00 to 2026-07-29T23:55:00)
- 15m: 17693 bars (2025-10-28T18:15:00 to 2026-07-29T23:45:00)
- 60m: 4414 bars (2025-10-28T19:00:00 to 2026-07-29T23:00:00)
- 120m: 2318 bars (2025-10-28T20:00:00 to 2026-07-29T22:00:00)
- 240m: 1326 bars (2025-10-28T22:00:00 to 2026-07-29T22:00:00)

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
- Open below: 5m LONG 7451.25-7452.25 parent 2026-07-28T08:25:00 confirmed 2026-07-28T08:30:00 status partial_touch; 5m LONG 7446.00-7449.00 parent 2026-07-28T08:00:00 confirmed 2026-07-28T08:05:00 status partial_touch; 60m LONG 7444.25-7448.50 parent 2026-07-28T08:00:00 confirmed 2026-07-28T09:00:00 status open_untouched; 5m LONG 7438.75-7441.50 parent 2026-07-28T07:50:00 confirmed 2026-07-28T07:55:00 status open_untouched; 5m LONG 7429.75-7436.25 parent 2026-07-28T04:20:00 confirmed 2026-07-28T04:25:00 status partial_touch; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched
- Failed above: 5m LONG 7456.25-7456.75 parent 2026-05-07T01:35:00 confirmed 2026-05-07T01:40:00 status failed_inverted; 5m LONG 7456.25-7457.25 parent 2026-07-24T03:20:00 confirmed 2026-07-24T03:25:00 status failed_inverted; 15m SHORT 7456.25-7459.00 parent 2026-06-08T01:45:00 confirmed 2026-06-08T02:00:00 status failed_inverted; 15m LONG 7456.25-7462.25 parent 2026-06-11T15:30:00 confirmed 2026-06-11T15:45:00 status failed_inverted; 120m LONG 7456.25-7459.00 parent 2026-05-20T06:00:00 confirmed 2026-05-20T08:00:00 status failed_inverted; 5m LONG 7456.50-7456.75 parent 2026-05-07T00:50:00 confirmed 2026-05-07T00:55:00 status failed_inverted; 5m LONG 7456.50-7459.25 parent 2026-06-29T06:30:00 confirmed 2026-06-29T06:35:00 status failed_inverted; 5m SHORT 7456.50-7458.75 parent 2026-07-24T08:45:00 confirmed 2026-07-24T08:50:00 status failed_inverted; 15m SHORT 7456.50-7460.75 parent 2026-05-07T09:45:00 confirmed 2026-05-07T10:00:00 status failed_inverted; 15m LONG 7456.50-7460.50 parent 2026-06-23T12:15:00 confirmed 2026-06-23T12:30:00 status failed_inverted
- Open above: 240m SHORT 7456.75-7473.75 parent 2026-07-27T14:00:00 confirmed 2026-07-27T17:00:00 status open_untouched; 60m SHORT 7462.00-7473.75 parent 2026-07-27T11:00:00 confirmed 2026-07-27T12:00:00 status partial_touch; 5m SHORT 7479.25-7491.75 parent 2026-07-27T10:00:00 confirmed 2026-07-27T10:05:00 status open_untouched; 15m SHORT 7479.25-7492.75 parent 2026-07-27T10:00:00 confirmed 2026-07-27T10:15:00 status open_untouched; 60m SHORT 7479.25-7504.50 parent 2026-07-27T10:00:00 confirmed 2026-07-27T11:00:00 status open_untouched; 120m SHORT 7479.25-7508.00 parent 2026-07-27T10:00:00 confirmed 2026-07-27T12:00:00 status open_untouched; 240m SHORT 7479.25-7505.50 parent 2026-07-27T10:00:00 confirmed 2026-07-27T14:00:00 status open_untouched; 5m SHORT 7500.00-7504.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T09:50:00 status partial_touch; 15m SHORT 7500.00-7507.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T10:00:00 status open_untouched; 5m SHORT 7514.75-7515.50 parent 2026-07-27T07:30:00 confirmed 2026-07-27T07:35:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof 2026-07-28T10:55:00 from 15M parent 2026-07-28T09:30:00 confirmed 2026-07-28T09:45:00.
- Defended-area management context: 15m SHORT 7439.25-7449.00 is a callout before/near T1, not an issue by itself.
- Later rows: 2 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7452.50-7452.75 parent 2026-07-28T09:30:00 confirmed 2026-07-28T09:45:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-28T09:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-28T11:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-28T10:55:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-28T10:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-28T10:55:00. | PASS entry_stop_risk_contract: Entry 7451.75, protected 5M stop 7462.50, risk 10.75 pts. | PASS tactical_targets_from_actual_risk: T1 7435.75 and T2 7430.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7451.50.
- Parent displacement: yes
- Parent displacement candle: 2026-07-28T09:30:00
- Parent failure: 2026-07-28T11:30:00
- First 5M return: 2026-07-28T10:55:00
- 5M wick defense: 2026-07-28T10:55:00
- Proof: 2026-07-28T10:55:00
- Entry/stop/risk: 7451.75 / 7462.50 / 10.75 pts
- T1/T2: 7435.75 / 7430.25
- Nearest liquidity: nearest prior low liquidity 7451.50
- Defended-area / obstacle management callout before or near T1: 15m SHORT 7439.25-7449.00 parent 2026-07-28T09:45:00 confirmed 2026-07-28T10:00:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-28T11:00:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7452.50-7452.75 parent 2026-07-28T09:30:00 confirmed 2026-07-28T09:45:00 defended_on_15m defended 2026-07-28T11:00:00 failed 2026-07-28T11:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7452.50-7452.75 parent 2026-07-28T09:30:00 confirmed 2026-07-28T09:45:00 defended_on_15m defended 2026-07-28T11:00:00 failed 2026-07-28T11:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-28T10:55:00; wick 2026-07-28T10:55:00; proof 2026-07-28T10:55:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 15m SHORT 7439.25-7449.00 parent 2026-07-28T09:45:00 confirmed 2026-07-28T10:00:00 status partial_touch; 5m LONG 7443.50-7448.75 parent 2026-07-28T10:50:00 confirmed 2026-07-28T10:55:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7452.00-7452.75 parent 2026-05-17T22:40:00 confirmed 2026-05-17T22:45:00 status failed_inverted; 5m SHORT 7452.00-7453.50 parent 2026-06-09T11:20:00 confirmed 2026-06-09T11:25:00 status failed_inverted; 5m LONG 7452.00-7461.25 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:05:00 status failed_inverted; 5m SHORT 7452.25-7457.00 parent 2026-05-07T12:00:00 confirmed 2026-05-07T12:05:00 status failed_inverted; 5m LONG 7452.25-7453.00 parent 2026-05-08T04:10:00 confirmed 2026-05-08T04:15:00 status failed_inverted; 5m LONG 7452.25-7453.00 parent 2026-05-20T03:25:00 confirmed 2026-05-20T03:30:00 status failed_inverted; 15m LONG 7452.25-7453.00 parent 2026-05-06T23:30:00 confirmed 2026-05-06T23:45:00 status failed_inverted; 15m SHORT 7452.25-7460.25 parent 2026-05-07T12:00:00 confirmed 2026-05-07T12:15:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7452.50-7457.00 parent 2026-07-28T09:30:00 confirmed 2026-07-28T09:35:00 status partial_touch; 15m SHORT 7452.50-7452.75 parent 2026-07-28T09:30:00 confirmed 2026-07-28T09:45:00 status open_untouched; 120m SHORT 7455.25-7473.75 parent 2026-07-27T12:00:00 confirmed 2026-07-27T14:00:00 status partial_touch; 240m SHORT 7456.75-7473.75 parent 2026-07-27T14:00:00 confirmed 2026-07-27T17:00:00 status partial_touch; 60m SHORT 7462.00-7473.75 parent 2026-07-27T11:00:00 confirmed 2026-07-27T12:00:00 status partial_touch; 5m SHORT 7479.25-7491.75 parent 2026-07-27T10:00:00 confirmed 2026-07-27T10:05:00 status open_untouched; 15m SHORT 7479.25-7492.75 parent 2026-07-27T10:00:00 confirmed 2026-07-27T10:15:00 status open_untouched; 60m SHORT 7479.25-7504.50 parent 2026-07-27T10:00:00 confirmed 2026-07-27T11:00:00 status open_untouched
- Objective ladder: open_fvg 7443.50 reached 2026-07-28T11:00:00 (5m LONG open FVG open_untouched parent 2026-07-28T10:50:00 confirmed 2026-07-28T10:55:00); open_fvg 7439.25 reached 2026-07-28T11:05:00 (15m SHORT open FVG partial_touch parent 2026-07-28T09:45:00 confirmed 2026-07-28T10:00:00); tactical 7435.75 not reached (T1 1.5R); tactical 7430.25 not reached (T2 2.0R); liquidity 7420.00 not reached (prior 5M swing low liquidity from 2026-07-28T10:15:00); liquidity 7417.00 not reached (prior 5M swing low liquidity from 2026-07-28T09:50:00); session_extreme 7417.00 not reached (RTH low liquidity before proof); open_fvg 7404.75 not reached (5m LONG open FVG partial_touch parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00); open_fvg 7355.50 not reached (15m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00); open_fvg 7345.25 not reached (5m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00); open_fvg 7321.00 not reached (5m LONG open FVG partial_touch parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00); open_fvg 7318.25 not reached (5m LONG open FVG open_untouched parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00); open_fvg 7261.00 not reached (5m LONG open FVG partial_touch parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00)
- Story: SHORT proof completed at 2026-07-28T10:55:00 from 7452.50-7452.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 15m 7439.25-7449.00 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7443.50 open_fvg, 7439.25 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-28T11:20:00, one MES $-53.75
- Managed outcome: Stop at 2026-07-28T11:20:00, exit 7462.50, one MES $-53.75
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-07-28T10:55:00 before later same-zone failure/reversal read at 2026-07-28T11:30:00. Review the defended continuation before labeling this zone as failure/reversal.

### 2. SHORT 15M FVG 7439.25-7449.00 parent 2026-07-28T09:45:00 confirmed 2026-07-28T10:00:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-28T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-28T11:15:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-28T10:10:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-28T10:10:00, 2026-07-28T10:40:00, 2026-07-28T10:55:00, 2026-07-28T11:05:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-28T10:10:00. | PASS entry_stop_risk_contract: Entry 7427.75, protected 5M stop 7462.50, risk 34.75 pts. | PASS tactical_targets_from_actual_risk: T1 7375.75 and T2 7358.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7427.50.
- Parent displacement: yes
- Parent displacement candle: 2026-07-28T09:45:00
- Parent failure: 2026-07-28T11:15:00
- First 5M return: 2026-07-28T10:10:00
- 5M wick defense: 2026-07-28T10:10:00, 2026-07-28T10:40:00, 2026-07-28T10:55:00, 2026-07-28T11:05:00
- Proof: 2026-07-28T10:10:00
- Entry/stop/risk: 7427.75 / 7462.50 / 34.75 pts
- T1/T2: 7375.75 / 7358.25
- Nearest liquidity: nearest prior low liquidity 7427.50
- Defended-area / obstacle management callout before or near T1: 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-29T10:30:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7452.50-7452.75 parent 2026-07-28T09:30:00 confirmed 2026-07-28T09:45:00 defended_on_15m defended 2026-07-28T11:00:00 failed 2026-07-28T11:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7452.50-7452.75 parent 2026-07-28T09:30:00 confirmed 2026-07-28T09:45:00 defended_on_15m defended 2026-07-28T11:00:00 failed 2026-07-28T11:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-28T10:10:00; wick 2026-07-28T10:10:00; proof 2026-07-28T10:10:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7417.00 (prior 5M swing low liquidity from 2026-07-28T09:50:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - The near liquidity objective sat in the path but was not reached during the replay window.
- Open FVGs below at proof: 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch; 5m LONG 7247.75-7253.25 parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00 status partial_touch; 15m LONG 7244.75-7252.25 parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00 status partial_touch; 5m LONG 7240.75-7243.75 parent 2026-04-30T10:50:00 confirmed 2026-04-30T10:55:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7428.00-7431.00 parent 2026-06-24T13:25:00 confirmed 2026-06-24T13:30:00 status failed_inverted; 5m SHORT 7428.00-7430.50 parent 2026-06-25T15:05:00 confirmed 2026-06-25T15:10:00 status failed_inverted; 5m LONG 7428.25-7429.50 parent 2026-06-10T01:55:00 confirmed 2026-06-10T02:00:00 status failed_inverted; 5m SHORT 7428.25-7428.75 parent 2026-07-27T23:05:00 confirmed 2026-07-27T23:10:00 status failed_inverted; 5m LONG 7428.50-7430.25 parent 2026-05-07T16:05:00 confirmed 2026-05-07T16:10:00 status failed_inverted; 5m LONG 7428.50-7433.50 parent 2026-05-20T01:05:00 confirmed 2026-05-20T01:10:00 status failed_inverted; 5m LONG 7428.50-7428.75 parent 2026-06-05T16:50:00 confirmed 2026-06-05T16:55:00 status failed_inverted; 5m SHORT 7428.50-7429.25 parent 2026-06-23T04:20:00 confirmed 2026-06-23T04:25:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7439.25-7449.00 parent 2026-07-28T09:45:00 confirmed 2026-07-28T10:00:00 status open_untouched; 5m SHORT 7448.50-7449.00 parent 2026-07-28T09:35:00 confirmed 2026-07-28T09:40:00 status open_untouched; 5m SHORT 7452.50-7457.00 parent 2026-07-28T09:30:00 confirmed 2026-07-28T09:35:00 status open_untouched; 15m SHORT 7452.50-7452.75 parent 2026-07-28T09:30:00 confirmed 2026-07-28T09:45:00 status open_untouched; 120m SHORT 7455.25-7473.75 parent 2026-07-27T12:00:00 confirmed 2026-07-27T14:00:00 status partial_touch; 240m SHORT 7456.75-7473.75 parent 2026-07-27T14:00:00 confirmed 2026-07-27T17:00:00 status partial_touch; 60m SHORT 7462.00-7473.75 parent 2026-07-27T11:00:00 confirmed 2026-07-27T12:00:00 status partial_touch; 5m SHORT 7479.25-7491.75 parent 2026-07-27T10:00:00 confirmed 2026-07-27T10:05:00 status open_untouched
- Objective ladder: liquidity 7417.00 not reached (prior 5M swing low liquidity from 2026-07-28T09:50:00); session_extreme 7417.00 not reached (RTH low liquidity before proof); tactical 7375.75 not reached (T1 1.5R); tactical 7358.25 not reached (T2 2.0R); open_fvg 7355.50 not reached (15m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00); open_fvg 7345.25 not reached (5m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00); open_fvg 7321.00 not reached (5m LONG open FVG partial_touch parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00); open_fvg 7318.25 not reached (5m LONG open FVG open_untouched parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00); open_fvg 7261.00 not reached (5m LONG open FVG partial_touch parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00); open_fvg 7247.75 not reached (5m LONG open FVG partial_touch parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00); open_fvg 7244.75 not reached (15m LONG open FVG partial_touch parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00); open_fvg 7240.75 not reached (5m LONG open FVG open_untouched parent 2026-04-30T10:50:00 confirmed 2026-04-30T10:55:00)
- Story: SHORT proof completed at 2026-07-28T10:10:00 from 7439.25-7449.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7345.25-7405.50 with reaction obstacle_reached_then_continued. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-28T11:20:00, one MES $-173.75
- Managed outcome: Stop at 2026-07-28T11:20:00, exit 7462.50, one MES $-173.75
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-07-28T10:10:00 before later same-zone failure/reversal read at 2026-07-28T11:15:00. Review the defended continuation before labeling this zone as failure/reversal.

### 3. LONG 15M FVG 7455.00-7467.25 parent 2026-07-28T11:30:00 confirmed 2026-07-28T11:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-28T11:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-28T11:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7455.00-7467.25 parent 2026-07-28T11:30:00 confirmed 2026-07-28T11:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7455.00-7467.25 parent 2026-07-28T11:30:00 confirmed 2026-07-28T11:45:00 untested_by_15m
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
