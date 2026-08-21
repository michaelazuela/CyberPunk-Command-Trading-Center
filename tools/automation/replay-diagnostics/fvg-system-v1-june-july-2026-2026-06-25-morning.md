# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-25 / morning (2026-06-25T09:15:00 to 2026-06-25T12:00:00)
Context window: 275 days (2025-09-23T00:00:00 to 2026-06-26T23:59:59)
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
- Open below: 60m LONG 7469.75-7471.00 parent 2026-06-25T02:00:00 confirmed 2026-06-25T03:00:00 status open_untouched; 120m LONG 7469.75-7471.00 parent 2026-06-25T02:00:00 confirmed 2026-06-25T04:00:00 status open_untouched; 15m LONG 7467.75-7468.50 parent 2026-06-25T01:15:00 confirmed 2026-06-25T01:30:00 status open_untouched; 5m LONG 7466.75-7467.75 parent 2026-06-25T01:05:00 confirmed 2026-06-25T01:10:00 status open_untouched; 60m LONG 7431.50-7466.50 parent 2026-06-24T17:00:00 confirmed 2026-06-24T18:00:00 status partial_touch; 120m LONG 7443.25-7464.00 parent 2026-06-24T17:00:00 confirmed 2026-06-24T18:00:00 status partial_touch; 15m LONG 7431.50-7460.75 parent 2026-06-24T16:15:00 confirmed 2026-06-24T16:30:00 status partial_touch; 5m LONG 7451.25-7457.00 parent 2026-06-24T16:10:00 confirmed 2026-06-24T16:15:00 status partial_touch; 5m LONG 7431.50-7449.75 parent 2026-06-24T16:05:00 confirmed 2026-06-24T16:10:00 status open_untouched; 15m LONG 7418.75-7421.25 parent 2026-06-24T16:00:00 confirmed 2026-06-24T16:15:00 status open_untouched
- Failed above: 5m LONG 7484.00-7484.25 parent 2026-05-08T13:20:00 confirmed 2026-05-08T13:25:00 status failed_inverted; 5m SHORT 7484.00-7492.00 parent 2026-05-13T09:35:00 confirmed 2026-05-13T09:40:00 status failed_inverted; 5m LONG 7484.00-7485.50 parent 2026-05-19T03:40:00 confirmed 2026-05-19T03:45:00 status failed_inverted; 5m SHORT 7484.00-7487.00 parent 2026-06-25T04:15:00 confirmed 2026-06-25T04:20:00 status failed_inverted; 15m SHORT 7484.00-7487.25 parent 2026-05-19T04:15:00 confirmed 2026-05-19T04:30:00 status failed_inverted; 240m LONG 7484.00-7485.00 parent 2026-05-11T10:00:00 confirmed 2026-05-11T14:00:00 status failed_inverted; 5m SHORT 7484.25-7484.75 parent 2026-05-12T01:15:00 confirmed 2026-05-12T01:20:00 status failed_inverted; 5m LONG 7484.25-7485.75 parent 2026-05-12T01:25:00 confirmed 2026-05-12T01:30:00 status failed_inverted; 5m LONG 7484.25-7491.50 parent 2026-05-21T09:55:00 confirmed 2026-05-21T10:00:00 status failed_inverted; 5m SHORT 7484.25-7487.25 parent 2026-06-08T06:20:00 confirmed 2026-06-08T06:25:00 status failed_inverted
- Open above: 5m SHORT 7496.50-7499.75 parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00 status partial_touch; 15m SHORT 7496.75-7499.75 parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00 status open_untouched; 5m SHORT 7501.75-7502.75 parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00 status open_untouched; 5m SHORT 7504.00-7507.25 parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00 status open_untouched; 15m SHORT 7513.75-7515.50 parent 2026-06-22T23:00:00 confirmed 2026-06-22T23:15:00 status open_untouched; 120m SHORT 7525.00-7525.50 parent 2026-06-22T22:00:00 confirmed 2026-06-23T00:00:00 status open_untouched; 15m SHORT 7525.50-7532.75 parent 2026-06-22T21:45:00 confirmed 2026-06-22T22:00:00 status open_untouched; 5m SHORT 7528.50-7529.50 parent 2026-06-22T21:40:00 confirmed 2026-06-22T21:45:00 status open_untouched; 5m SHORT 7530.25-7533.00 parent 2026-06-22T21:35:00 confirmed 2026-06-22T21:40:00 status open_untouched; 15m SHORT 7549.50-7560.50 parent 2026-06-22T10:45:00 confirmed 2026-06-22T11:00:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof 2026-06-25T10:15:00 from 15M parent 2026-06-25T09:45:00 confirmed 2026-06-25T10:00:00.
- Defended-area management context: 5m LONG 7430.25-7436.25 is a callout before/near T1, not an issue by itself.
- Later rows: none.

## Trace Rows

### 1. SHORT 15M FVG 7444.00-7479.25 parent 2026-06-25T09:45:00 confirmed 2026-06-25T10:00:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-25T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-25T10:10:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-25T10:15:00, 2026-06-25T10:25:00, 2026-06-25T11:30:00, 2026-06-25T11:35:00, 2026-06-25T11:40:00, 2026-06-25T11:50:00, 2026-06-25T12:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-25T10:15:00. | PASS entry_stop_risk_contract: Entry 7437.25, protected 5M stop 7490.50, risk 53.25 pts. | PASS tactical_targets_from_actual_risk: T1 7357.50 and T2 7330.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7437.00.
- Parent displacement: yes
- Parent displacement candle: 2026-06-25T09:45:00
- Parent failure: not found
- First 5M return: 2026-06-25T10:10:00
- 5M wick defense: 2026-06-25T10:15:00, 2026-06-25T10:25:00, 2026-06-25T11:30:00, 2026-06-25T11:35:00, 2026-06-25T11:40:00, 2026-06-25T11:50:00, 2026-06-25T12:00:00
- Proof: 2026-06-25T10:15:00
- Entry/stop/risk: 7437.25 / 7490.50 / 53.25 pts
- T1/T2: 7357.50 / 7330.75
- Nearest liquidity: nearest prior low liquidity 7437.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7430.25-7436.25 parent 2026-06-25T10:10:00 confirmed 2026-06-25T10:15:00 status open_untouched
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-25T10:20:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7444.00-7479.25 parent 2026-06-25T09:45:00 confirmed 2026-06-25T10:00:00 defended_on_15m defended 2026-06-25T10:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7444.00-7479.25 parent 2026-06-25T09:45:00 confirmed 2026-06-25T10:00:00 defended_on_15m defended 2026-06-25T10:15:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-25T10:10:00; wick 2026-06-25T10:15:00; proof 2026-06-25T10:15:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7390.00 (prior 5M swing low liquidity from 2026-06-25T10:00:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - The near liquidity objective sat in the path but was not reached during the replay window.
- Open FVGs below at proof: 5m LONG 7430.25-7436.25 parent 2026-06-25T10:10:00 confirmed 2026-06-25T10:15:00 status open_untouched; 5m LONG 7407.00-7427.50 parent 2026-06-25T10:05:00 confirmed 2026-06-25T10:10:00 status open_untouched; 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7437.50-7439.25 parent 2026-05-20T01:45:00 confirmed 2026-05-20T01:50:00 status failed_inverted; 5m LONG 7437.50-7439.00 parent 2026-05-20T01:55:00 confirmed 2026-05-20T02:00:00 status failed_inverted; 5m SHORT 7437.50-7440.00 parent 2026-06-09T22:55:00 confirmed 2026-06-09T23:00:00 status failed_inverted; 5m LONG 7437.50-7439.25 parent 2026-06-09T23:05:00 confirmed 2026-06-09T23:10:00 status failed_inverted; 5m LONG 7438.00-7440.00 parent 2026-05-07T22:50:00 confirmed 2026-05-07T22:55:00 status failed_inverted; 5m LONG 7438.00-7439.25 parent 2026-05-20T01:35:00 confirmed 2026-05-20T01:40:00 status failed_inverted; 5m LONG 7438.00-7445.75 parent 2026-06-07T18:15:00 confirmed 2026-06-07T18:20:00 status failed_inverted; 5m LONG 7438.00-7438.50 parent 2026-06-23T07:15:00 confirmed 2026-06-23T07:20:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7444.00-7465.25 parent 2026-06-25T09:45:00 confirmed 2026-06-25T09:50:00 status partial_touch; 15m SHORT 7444.00-7479.25 parent 2026-06-25T09:45:00 confirmed 2026-06-25T10:00:00 status partial_touch; 5m SHORT 7477.00-7481.50 parent 2026-06-25T09:35:00 confirmed 2026-06-25T09:40:00 status open_untouched; 5m SHORT 7496.50-7499.75 parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00 status partial_touch; 15m SHORT 7496.75-7499.75 parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00 status open_untouched; 5m SHORT 7501.75-7502.75 parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00 status open_untouched; 5m SHORT 7504.00-7507.25 parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00 status open_untouched; 15m SHORT 7513.75-7515.50 parent 2026-06-22T23:00:00 confirmed 2026-06-22T23:15:00 status open_untouched
- Objective ladder: open_fvg 7430.25 reached 2026-06-25T10:20:00 (5m LONG open FVG open_untouched parent 2026-06-25T10:10:00 confirmed 2026-06-25T10:15:00); open_fvg 7407.00 not reached (5m LONG open FVG open_untouched parent 2026-06-25T10:05:00 confirmed 2026-06-25T10:10:00); liquidity 7390.00 not reached (prior 5M swing low liquidity from 2026-06-25T10:00:00); session_extreme 7390.00 not reached (RTH low liquidity before proof); open_fvg 7386.00 not reached (60m LONG open FVG partial_touch parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00); tactical 7357.50 not reached (T1 1.5R); open_fvg 7355.50 not reached (15m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00); open_fvg 7345.25 not reached (5m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00); tactical 7330.75 not reached (T2 2.0R); open_fvg 7321.00 not reached (5m LONG open FVG partial_touch parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00); open_fvg 7318.25 not reached (5m LONG open FVG open_untouched parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00); open_fvg 7261.00 not reached (5m LONG open FVG partial_touch parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00)
- Story: SHORT proof completed at 2026-06-25T10:15:00 from 7444.00-7479.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7430.25-7436.25 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7430.25 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-25T23:40:00, one MES +$398.75
- Managed outcome: LQ1 at 2026-06-25T22:25:00, exit 7390.00, one MES +$236.25
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-25T10:15:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.
