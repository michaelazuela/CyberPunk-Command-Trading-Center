# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-26 / lunch (2026-06-26T12:00:00 to 2026-06-26T16:00:00)
Context window: 275 days (2025-09-24T00:00:00 to 2026-06-27T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 46644 bars (2025-10-28T18:05:00 to 2026-06-26T17:00:00)
- 15m: 15568 bars (2025-10-28T18:15:00 to 2026-06-26T17:00:00)
- 60m: 3864 bars (2025-10-28T19:00:00 to 2026-06-26T17:00:00)
- 120m: 2026 bars (2025-10-28T20:00:00 to 2026-06-26T17:00:00)
- 240m: 1106 bars (2025-10-28T22:00:00 to 2026-06-26T16:00:00)

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
- Open below: 5m LONG 7432.50-7437.50 parent 2026-06-26T11:30:00 confirmed 2026-06-26T11:35:00 status partial_touch; 15m LONG 7427.75-7437.50 parent 2026-06-26T11:30:00 confirmed 2026-06-26T11:45:00 status partial_touch; 5m LONG 7426.25-7430.25 parent 2026-06-26T11:25:00 confirmed 2026-06-26T11:30:00 status open_untouched; 15m LONG 7405.50-7418.00 parent 2026-06-26T10:15:00 confirmed 2026-06-26T10:30:00 status partial_touch; 5m LONG 7405.50-7414.25 parent 2026-06-26T10:05:00 confirmed 2026-06-26T10:10:00 status partial_touch; 60m LONG 7405.50-7409.50 parent 2026-06-26T11:00:00 confirmed 2026-06-26T12:00:00 status open_untouched; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7389.00-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T10:05:00 status open_untouched; 15m LONG 7388.25-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T10:15:00 status open_untouched
- Failed above: 5m LONG 7448.00-7448.50 parent 2026-05-06T15:10:00 confirmed 2026-05-06T15:15:00 status failed_inverted; 5m LONG 7448.00-7450.00 parent 2026-05-20T02:55:00 confirmed 2026-05-20T03:00:00 status failed_inverted; 5m SHORT 7448.00-7449.50 parent 2026-06-09T17:00:00 confirmed 2026-06-09T18:05:00 status failed_inverted; 15m SHORT 7448.00-7449.50 parent 2026-06-09T17:00:00 confirmed 2026-06-09T18:00:00 status failed_inverted; 15m SHORT 7448.00-7449.00 parent 2026-06-09T18:00:00 confirmed 2026-06-09T18:15:00 status failed_inverted; 15m LONG 7448.00-7449.75 parent 2026-06-24T06:30:00 confirmed 2026-06-24T06:45:00 status failed_inverted; 5m LONG 7448.25-7448.50 parent 2026-05-08T02:10:00 confirmed 2026-05-08T02:15:00 status failed_inverted; 5m SHORT 7448.50-7449.00 parent 2026-05-18T00:55:00 confirmed 2026-05-18T01:00:00 status failed_inverted; 5m LONG 7448.50-7451.50 parent 2026-05-18T01:05:00 confirmed 2026-05-18T01:10:00 status failed_inverted; 5m SHORT 7448.50-7449.75 parent 2026-06-24T02:20:00 confirmed 2026-06-24T02:25:00 status failed_inverted
- Open above: 5m SHORT 7477.00-7481.50 parent 2026-06-25T09:35:00 confirmed 2026-06-25T09:40:00 status open_untouched; 5m SHORT 7496.50-7499.75 parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00 status partial_touch; 15m SHORT 7496.75-7499.75 parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00 status open_untouched; 5m SHORT 7501.75-7502.75 parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00 status open_untouched; 5m SHORT 7504.00-7507.25 parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00 status open_untouched; 15m SHORT 7513.75-7515.50 parent 2026-06-22T23:00:00 confirmed 2026-06-22T23:15:00 status open_untouched; 120m SHORT 7525.00-7525.50 parent 2026-06-22T22:00:00 confirmed 2026-06-23T00:00:00 status open_untouched; 15m SHORT 7525.50-7532.75 parent 2026-06-22T21:45:00 confirmed 2026-06-22T22:00:00 status open_untouched; 5m SHORT 7528.50-7529.50 parent 2026-06-22T21:40:00 confirmed 2026-06-22T21:45:00 status open_untouched; 5m SHORT 7530.25-7533.00 parent 2026-06-22T21:35:00 confirmed 2026-06-22T21:40:00 status open_untouched

## Review Order
- Primary campaign to review first: LONG proof 2026-06-26T12:35:00 from 15M parent 2026-06-26T11:30:00 confirmed 2026-06-26T11:45:00.
- Defended-area management context: 5m LONG 7440.00-7443.25 is a callout before/near T1, not an issue by itself.
- Later rows: none.

## Trace Rows

### 1. LONG 15M FVG 7427.75-7437.50 parent 2026-06-26T11:30:00 confirmed 2026-06-26T11:45:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-26T11:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-26T12:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-26T12:30:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-26T12:30:00, 2026-06-26T13:00:00, 2026-06-26T13:05:00, 2026-06-26T13:45:00, 2026-06-26T14:25:00, 2026-06-26T15:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-26T12:35:00. | PASS entry_stop_risk_contract: Entry 7439.75, protected 5M stop 7420.75, risk 19.00 pts. | PASS tactical_targets_from_actual_risk: T1 7468.25 and T2 7477.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7440.00.
- Parent displacement: yes
- Parent displacement candle: 2026-06-26T11:30:00
- Parent failure: 2026-06-26T12:30:00
- First 5M return: 2026-06-26T12:30:00
- 5M wick defense: 2026-06-26T12:30:00, 2026-06-26T13:00:00, 2026-06-26T13:05:00, 2026-06-26T13:45:00, 2026-06-26T14:25:00, 2026-06-26T15:55:00
- Proof: 2026-06-26T12:35:00
- Entry/stop/risk: 7439.75 / 7420.75 / 19.00 pts
- T1/T2: 7468.25 / 7477.75
- Nearest liquidity: nearest prior high liquidity 7440.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7440.00-7443.25 parent 2026-05-19T12:25:00 confirmed 2026-05-19T12:30:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-26T12:40:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7427.75-7437.50 parent 2026-06-26T11:30:00 confirmed 2026-06-26T11:45:00 defended_on_15m defended 2026-06-26T12:00:00 failed 2026-06-26T12:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7427.75-7437.50 parent 2026-06-26T11:30:00 confirmed 2026-06-26T11:45:00 defended_on_15m defended 2026-06-26T12:00:00 failed 2026-06-26T12:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-26T11:55:00; wick 2026-06-26T13:00:00; proof 2026-06-26T13:00:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7459.25 (prior 5M swing high liquidity from 2026-06-26T11:45:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 15m LONG 7405.50-7418.00 parent 2026-06-26T10:15:00 confirmed 2026-06-26T10:30:00 status partial_touch; 5m LONG 7405.50-7414.25 parent 2026-06-26T10:05:00 confirmed 2026-06-26T10:10:00 status partial_touch; 60m LONG 7405.50-7409.50 parent 2026-06-26T11:00:00 confirmed 2026-06-26T12:00:00 status open_untouched; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7389.00-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T10:05:00 status open_untouched; 15m LONG 7388.25-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T10:15:00 status open_untouched; 120m LONG 7394.50-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T12:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7440.00-7443.25 parent 2026-05-19T12:25:00 confirmed 2026-05-19T12:30:00 status failed_inverted; 5m LONG 7440.00-7440.75 parent 2026-05-19T19:10:00 confirmed 2026-05-19T19:15:00 status failed_inverted; 5m SHORT 7440.00-7446.00 parent 2026-06-23T18:25:00 confirmed 2026-06-23T18:30:00 status failed_inverted; 5m SHORT 7440.25-7444.75 parent 2026-05-19T20:05:00 confirmed 2026-05-19T20:10:00 status failed_inverted; 5m SHORT 7440.25-7444.00 parent 2026-05-19T22:30:00 confirmed 2026-05-19T22:35:00 status failed_inverted; 5m LONG 7440.25-7441.75 parent 2026-06-09T20:00:00 confirmed 2026-06-09T20:05:00 status failed_inverted; 5m SHORT 7440.25-7443.75 parent 2026-06-23T06:30:00 confirmed 2026-06-23T06:35:00 status failed_inverted; 15m SHORT 7440.25-7442.00 parent 2026-05-19T22:30:00 confirmed 2026-05-19T22:45:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7444.00-7479.25 parent 2026-06-25T09:45:00 confirmed 2026-06-25T10:00:00 status partial_touch; 5m SHORT 7477.00-7481.50 parent 2026-06-25T09:35:00 confirmed 2026-06-25T09:40:00 status open_untouched; 5m SHORT 7496.50-7499.75 parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00 status partial_touch; 15m SHORT 7496.75-7499.75 parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00 status open_untouched; 5m SHORT 7501.75-7502.75 parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00 status open_untouched; 5m SHORT 7504.00-7507.25 parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00 status open_untouched; 15m SHORT 7513.75-7515.50 parent 2026-06-22T23:00:00 confirmed 2026-06-22T23:15:00 status open_untouched; 120m SHORT 7525.00-7525.50 parent 2026-06-22T22:00:00 confirmed 2026-06-23T00:00:00 status open_untouched
- Objective ladder: liquidity 7459.25 not reached (prior 5M swing high liquidity from 2026-06-26T11:45:00); session_extreme 7459.25 not reached (RTH high liquidity before proof); tactical 7468.25 not reached (T1 1.5R); tactical 7477.75 not reached (T2 2.0R); open_fvg 7479.25 not reached (15m SHORT open FVG partial_touch parent 2026-06-25T09:45:00 confirmed 2026-06-25T10:00:00); open_fvg 7481.50 not reached (5m SHORT open FVG open_untouched parent 2026-06-25T09:35:00 confirmed 2026-06-25T09:40:00); open_fvg 7499.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00); open_fvg 7499.75 not reached (15m SHORT open FVG open_untouched parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00); open_fvg 7502.75 not reached (5m SHORT open FVG open_untouched parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00); open_fvg 7507.25 not reached (5m SHORT open FVG open_untouched parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00); open_fvg 7515.50 not reached (15m SHORT open FVG open_untouched parent 2026-06-22T23:00:00 confirmed 2026-06-22T23:15:00); open_fvg 7525.50 not reached (120m SHORT open FVG open_untouched parent 2026-06-22T22:00:00 confirmed 2026-06-23T00:00:00)
- Story: LONG proof completed at 2026-06-26T12:35:00 from 7427.75-7437.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7440.00-7443.25 with reaction obstacle_defended_management_callout. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-26T14:30:00, one MES $-95.00
- Managed outcome: Stop at 2026-06-26T14:30:00, exit 7420.75, one MES $-95.00
- Reasons: Qualified by this diagnostic heuristic.
