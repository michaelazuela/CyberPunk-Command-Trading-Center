# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-01 / lunch (2026-07-01T12:00:00 to 2026-07-01T16:00:00)
Context window: 275 days (2025-09-29T00:00:00 to 2026-07-02T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 47819 bars (2025-10-28T18:05:00 to 2026-07-02T23:55:00)
- 15m: 15961 bars (2025-10-28T18:15:00 to 2026-07-02T23:45:00)
- 60m: 3966 bars (2025-10-28T19:00:00 to 2026-07-02T23:00:00)
- 120m: 2081 bars (2025-10-28T20:00:00 to 2026-07-02T22:00:00)
- 240m: 1153 bars (2025-10-28T22:00:00 to 2026-07-02T22:00:00)

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
- Open below: 5m LONG 7564.50-7568.50 parent 2026-07-01T11:20:00 confirmed 2026-07-01T11:25:00 status partial_touch; 15m LONG 7564.50-7567.50 parent 2026-07-01T11:30:00 confirmed 2026-07-01T11:45:00 status open_untouched; 15m LONG 7554.00-7563.75 parent 2026-07-01T11:15:00 confirmed 2026-07-01T11:30:00 status open_untouched; 5m LONG 7553.50-7557.75 parent 2026-07-01T11:05:00 confirmed 2026-07-01T11:10:00 status open_untouched; 60m LONG 7539.50-7552.25 parent 2026-07-01T11:00:00 confirmed 2026-07-01T12:00:00 status open_untouched; 15m LONG 7537.00-7546.75 parent 2026-07-01T10:15:00 confirmed 2026-07-01T10:30:00 status partial_touch; 5m LONG 7532.50-7533.00 parent 2026-07-01T10:00:00 confirmed 2026-07-01T10:05:00 status open_untouched; 5m LONG 7524.25-7528.00 parent 2026-07-01T09:55:00 confirmed 2026-07-01T10:00:00 status open_untouched; 15m LONG 7500.75-7503.50 parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00 status open_untouched; 120m LONG 7476.25-7491.25 parent 2026-06-29T14:00:00 confirmed 2026-06-29T16:00:00 status partial_touch
- Failed above: 5m LONG 7572.75-7573.25 parent 2026-05-22T11:30:00 confirmed 2026-05-22T11:35:00 status failed_inverted; 5m LONG 7572.75-7573.75 parent 2026-06-18T17:00:00 confirmed 2026-06-18T18:05:00 status failed_inverted; 5m LONG 7573.00-7574.25 parent 2026-05-22T13:05:00 confirmed 2026-05-22T13:10:00 status failed_inverted; 5m SHORT 7573.50-7575.00 parent 2026-06-18T16:45:00 confirmed 2026-06-18T16:50:00 status failed_inverted; 5m SHORT 7574.25-7574.75 parent 2026-05-22T13:55:00 confirmed 2026-05-22T14:00:00 status failed_inverted; 5m LONG 7574.25-7575.00 parent 2026-05-28T00:35:00 confirmed 2026-05-28T00:40:00 status failed_inverted; 5m LONG 7574.50-7578.00 parent 2026-05-14T10:45:00 confirmed 2026-05-14T10:50:00 status failed_inverted; 5m SHORT 7574.50-7574.75 parent 2026-05-14T21:25:00 confirmed 2026-05-14T21:30:00 status failed_inverted; 15m SHORT 7574.75-7575.75 parent 2026-05-22T14:00:00 confirmed 2026-05-22T14:15:00 status failed_inverted; 60m LONG 7574.75-7575.75 parent 2026-06-14T22:00:00 confirmed 2026-06-14T23:00:00 status failed_inverted
- Open above: 5m SHORT 7574.75-7579.25 parent 2026-06-22T10:25:00 confirmed 2026-06-22T10:30:00 status partial_touch; 5m SHORT 7581.75-7589.00 parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch; 15m SHORT 7654.50-7656.50 parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof 2026-07-01T13:20:00 from 15M parent 2026-07-01T11:15:00 confirmed 2026-07-01T11:30:00.
- Defended-area management context: 15m LONG 7565.25-7566.75 is a callout before/near T1, not an issue by itself.
- Later rows: 4 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7554.00-7563.75 parent 2026-07-01T11:15:00 confirmed 2026-07-01T11:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-01T11:15:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-01T15:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-01T12:55:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-01T13:10:00, 2026-07-01T13:15:00, 2026-07-01T13:40:00, 2026-07-01T13:55:00, 2026-07-01T14:10:00, 2026-07-01T14:20:00, 2026-07-01T14:25:00, 2026-07-01T14:35:00, 2026-07-01T14:40:00, 2026-07-01T14:45:00, 2026-07-01T14:50:00, 2026-07-01T15:25:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-01T13:20:00. | PASS entry_stop_risk_contract: Entry 7565.00, protected 5M stop 7540.00, risk 25.00 pts. | PASS tactical_targets_from_actual_risk: T1 7602.50 and T2 7615.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7565.25.
- Parent displacement: yes
- Parent displacement candle: 2026-07-01T11:15:00
- Parent failure: 2026-07-01T15:00:00
- First 5M return: 2026-07-01T12:55:00
- 5M wick defense: 2026-07-01T13:10:00, 2026-07-01T13:15:00, 2026-07-01T13:40:00, 2026-07-01T13:55:00, 2026-07-01T14:10:00, 2026-07-01T14:20:00, 2026-07-01T14:25:00, 2026-07-01T14:35:00, 2026-07-01T14:40:00, 2026-07-01T14:45:00, 2026-07-01T14:50:00, 2026-07-01T15:25:00
- Proof: 2026-07-01T13:20:00
- Entry/stop/risk: 7565.00 / 7540.00 / 25.00 pts
- T1/T2: 7602.50 / 7615.00
- Nearest liquidity: nearest prior high liquidity 7565.25
- Defended-area / obstacle management callout before or near T1: 15m LONG 7565.25-7566.75 parent 2026-05-22T11:15:00 confirmed 2026-05-22T11:30:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-01T13:25:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7554.00-7563.75 parent 2026-07-01T11:15:00 confirmed 2026-07-01T11:30:00 defended_on_15m defended 2026-07-01T13:30:00 failed 2026-07-01T15:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7554.00-7563.75 parent 2026-07-01T11:15:00 confirmed 2026-07-01T11:30:00 defended_on_15m defended 2026-07-01T13:30:00 failed 2026-07-01T15:00:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-01T12:55:00; wick 2026-07-01T13:10:00; proof 2026-07-01T13:20:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7573.75 (prior 5M swing high liquidity from 2026-07-01T11:50:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 15m LONG 7554.00-7563.75 parent 2026-07-01T11:15:00 confirmed 2026-07-01T11:30:00 status partial_touch; 5m LONG 7560.25-7561.50 parent 2026-07-01T13:15:00 confirmed 2026-07-01T13:20:00 status open_untouched; 5m LONG 7553.50-7557.75 parent 2026-07-01T11:05:00 confirmed 2026-07-01T11:10:00 status partial_touch; 60m LONG 7555.50-7557.50 parent 2026-07-01T12:00:00 confirmed 2026-07-01T13:00:00 status open_untouched; 60m LONG 7539.50-7552.25 parent 2026-07-01T11:00:00 confirmed 2026-07-01T12:00:00 status open_untouched; 15m LONG 7537.00-7546.75 parent 2026-07-01T10:15:00 confirmed 2026-07-01T10:30:00 status partial_touch; 5m LONG 7532.50-7533.00 parent 2026-07-01T10:00:00 confirmed 2026-07-01T10:05:00 status open_untouched; 5m LONG 7524.25-7528.00 parent 2026-07-01T09:55:00 confirmed 2026-07-01T10:00:00 status open_untouched
- Failed FVGs above at proof: 15m LONG 7565.25-7566.75 parent 2026-05-22T11:15:00 confirmed 2026-05-22T11:30:00 status failed_inverted; 5m SHORT 7565.75-7566.75 parent 2026-06-18T14:05:00 confirmed 2026-06-18T14:10:00 status failed_inverted; 15m SHORT 7566.25-7572.00 parent 2026-06-18T18:30:00 confirmed 2026-06-18T18:45:00 status failed_inverted; 5m LONG 7566.50-7569.00 parent 2026-06-14T20:15:00 confirmed 2026-06-14T20:20:00 status failed_inverted; 15m SHORT 7566.50-7566.75 parent 2026-06-18T14:15:00 confirmed 2026-06-18T14:30:00 status failed_inverted; 5m LONG 7567.00-7567.50 parent 2026-06-22T08:10:00 confirmed 2026-06-22T08:15:00 status failed_inverted; 60m LONG 7567.00-7579.00 parent 2026-05-14T11:00:00 confirmed 2026-05-14T12:00:00 status failed_inverted; 120m LONG 7567.00-7570.50 parent 2026-05-14T12:00:00 confirmed 2026-05-14T14:00:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7565.75-7567.50 parent 2026-07-01T12:55:00 confirmed 2026-07-01T13:00:00 status partial_touch; 5m SHORT 7571.50-7574.25 parent 2026-07-01T12:40:00 confirmed 2026-07-01T12:45:00 status partial_touch; 15m SHORT 7572.75-7573.00 parent 2026-07-01T12:45:00 confirmed 2026-07-01T13:00:00 status open_untouched; 5m SHORT 7574.75-7579.25 parent 2026-06-22T10:25:00 confirmed 2026-06-22T10:30:00 status partial_touch; 5m SHORT 7581.75-7589.00 parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched
- Objective ladder: open_fvg 7567.50 reached 2026-07-01T13:25:00 (5m SHORT open FVG partial_touch parent 2026-07-01T12:55:00 confirmed 2026-07-01T13:00:00); open_fvg 7573.00 not reached (15m SHORT open FVG open_untouched parent 2026-07-01T12:45:00 confirmed 2026-07-01T13:00:00); liquidity 7573.75 not reached (prior 5M swing high liquidity from 2026-07-01T11:50:00); open_fvg 7574.25 not reached (5m SHORT open FVG partial_touch parent 2026-07-01T12:40:00 confirmed 2026-07-01T12:45:00); liquidity 7576.00 not reached (prior 5M swing high liquidity from 2026-07-01T12:05:00); liquidity 7578.50 not reached (prior 5M swing high liquidity from 2026-07-01T11:35:00); liquidity 7579.00 not reached (prior 5M swing high liquidity from 2026-07-01T12:25:00); session_extreme 7579.00 not reached (RTH high liquidity before proof); open_fvg 7579.25 not reached (5m SHORT open FVG partial_touch parent 2026-06-22T10:25:00 confirmed 2026-06-22T10:30:00); open_fvg 7589.00 not reached (5m SHORT open FVG open_untouched parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00); tactical 7602.50 not reached (T1 1.5R); open_fvg 7605.25 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00); open_fvg 7609.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00); tactical 7615.00 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-07-01T13:20:00 from 7554.00-7563.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 15m 7565.25-7566.75 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7567.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-01T16:00:00, one MES $-125.00
- Managed outcome: Stop at 2026-07-01T16:00:00, exit 7540.00, one MES $-125.00
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-01T13:20:00 before later same-zone failure/reversal read at 2026-07-01T15:00:00. Review the defended continuation before labeling this zone as failure/reversal.

### 2. LONG 15M FVG 7564.50-7567.50 parent 2026-07-01T11:30:00 confirmed 2026-07-01T11:45:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-01T11:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-01T13:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-01T12:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-01T12:45:00, 2026-07-01T13:40:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-01T12:45:00. | PASS entry_stop_risk_contract: Entry 7570.50, protected 5M stop 7552.25, risk 18.25 pts. | PASS tactical_targets_from_actual_risk: T1 7598.00 and T2 7607.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7570.75.
- Parent displacement: yes
- Parent displacement candle: 2026-07-01T11:30:00
- Parent failure: 2026-07-01T13:00:00
- First 5M return: 2026-07-01T12:45:00
- 5M wick defense: 2026-07-01T12:45:00, 2026-07-01T13:40:00
- Proof: 2026-07-01T12:45:00
- Entry/stop/risk: 7570.50 / 7552.25 / 18.25 pts
- T1/T2: 7598.00 / 7607.00
- Nearest liquidity: nearest prior high liquidity 7570.75
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7571.50-7574.25 parent 2026-07-01T12:40:00 confirmed 2026-07-01T12:45:00 status open_untouched
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-01T12:50:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7564.50-7567.50 parent 2026-07-01T11:30:00 confirmed 2026-07-01T11:45:00 defended_on_15m defended 2026-07-01T12:45:00 failed 2026-07-01T13:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7564.50-7567.50 parent 2026-07-01T11:30:00 confirmed 2026-07-01T11:45:00 defended_on_15m defended 2026-07-01T12:45:00 failed 2026-07-01T13:00:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-01T12:45:00; wick 2026-07-01T12:45:00; proof 2026-07-01T12:45:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7576.00 (prior 5M swing high liquidity from 2026-07-01T12:05:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 5m LONG 7564.50-7568.50 parent 2026-07-01T11:20:00 confirmed 2026-07-01T11:25:00 status partial_touch; 15m LONG 7564.50-7567.50 parent 2026-07-01T11:30:00 confirmed 2026-07-01T11:45:00 status partial_touch; 15m LONG 7554.00-7563.75 parent 2026-07-01T11:15:00 confirmed 2026-07-01T11:30:00 status open_untouched; 5m LONG 7553.50-7557.75 parent 2026-07-01T11:05:00 confirmed 2026-07-01T11:10:00 status open_untouched; 60m LONG 7539.50-7552.25 parent 2026-07-01T11:00:00 confirmed 2026-07-01T12:00:00 status open_untouched; 15m LONG 7537.00-7546.75 parent 2026-07-01T10:15:00 confirmed 2026-07-01T10:30:00 status partial_touch; 5m LONG 7532.50-7533.00 parent 2026-07-01T10:00:00 confirmed 2026-07-01T10:05:00 status open_untouched; 5m LONG 7524.25-7528.00 parent 2026-07-01T09:55:00 confirmed 2026-07-01T10:00:00 status open_untouched
- Failed FVGs above at proof: 15m LONG 7571.50-7578.00 parent 2026-05-14T10:45:00 confirmed 2026-05-14T11:00:00 status failed_inverted; 5m SHORT 7571.75-7573.00 parent 2026-06-22T08:45:00 confirmed 2026-06-22T08:50:00 status failed_inverted; 15m SHORT 7571.75-7576.50 parent 2026-05-14T21:30:00 confirmed 2026-05-14T21:45:00 status failed_inverted; 15m LONG 7571.75-7572.25 parent 2026-06-22T09:15:00 confirmed 2026-06-22T09:30:00 status failed_inverted; 5m SHORT 7572.25-7573.50 parent 2026-05-22T13:20:00 confirmed 2026-05-22T13:25:00 status failed_inverted; 5m LONG 7572.25-7576.75 parent 2026-05-22T13:30:00 confirmed 2026-05-22T13:35:00 status failed_inverted; 5m SHORT 7572.25-7572.75 parent 2026-06-18T13:40:00 confirmed 2026-06-18T13:45:00 status failed_inverted; 5m LONG 7572.75-7573.25 parent 2026-05-22T11:30:00 confirmed 2026-05-22T11:35:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7571.50-7574.25 parent 2026-07-01T12:40:00 confirmed 2026-07-01T12:45:00 status open_untouched; 5m SHORT 7574.75-7579.25 parent 2026-06-22T10:25:00 confirmed 2026-06-22T10:30:00 status partial_touch; 5m SHORT 7581.75-7589.00 parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch
- Objective ladder: liquidity 7573.75 not reached (prior 5M swing high liquidity from 2026-07-01T11:50:00); open_fvg 7574.25 not reached (5m SHORT open FVG open_untouched parent 2026-07-01T12:40:00 confirmed 2026-07-01T12:45:00); liquidity 7576.00 not reached (prior 5M swing high liquidity from 2026-07-01T12:05:00); liquidity 7578.50 not reached (prior 5M swing high liquidity from 2026-07-01T11:35:00); liquidity 7579.00 not reached (prior 5M swing high liquidity from 2026-07-01T12:25:00); session_extreme 7579.00 not reached (RTH high liquidity before proof); open_fvg 7579.25 not reached (5m SHORT open FVG partial_touch parent 2026-06-22T10:25:00 confirmed 2026-06-22T10:30:00); open_fvg 7589.00 not reached (5m SHORT open FVG open_untouched parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00); tactical 7598.00 not reached (T1 1.5R); open_fvg 7605.25 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00); tactical 7607.00 not reached (T2 2.0R); open_fvg 7609.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00); open_fvg 7628.00 not reached (5m SHORT open FVG open_untouched parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00); open_fvg 7637.50 not reached (5m SHORT open FVG partial_touch parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00)
- Story: LONG proof completed at 2026-07-01T12:45:00 from 7564.50-7567.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7571.50-7574.25 with reaction obstacle_defended_management_callout. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-01T14:20:00, one MES $-91.25
- Managed outcome: Stop at 2026-07-01T14:20:00, exit 7552.25, one MES $-91.25
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-01T12:45:00 before later same-zone failure/reversal read at 2026-07-01T13:00:00. Review the defended continuation before labeling this zone as failure/reversal.

### 3. SHORT 15M FVG 7572.75-7573.00 parent 2026-07-01T12:45:00 confirmed 2026-07-01T13:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-01T13:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-01T13:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7572.75-7573.00 parent 2026-07-01T12:45:00 confirmed 2026-07-01T13:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7572.75-7573.00 parent 2026-07-01T12:45:00 confirmed 2026-07-01T13:00:00 untested_by_15m
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

### 4. SHORT 15M FVG 7564.00-7567.25 parent 2026-07-01T13:00:00 confirmed 2026-07-01T13:15:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-01T13:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-01T13:20:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-01T13:30:00, 2026-07-01T13:35:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-01T13:35:00. | PASS entry_stop_risk_contract: Entry 7563.00, protected 5M stop 7572.75, risk 9.75 pts. | PASS tactical_targets_from_actual_risk: T1 7548.50 and T2 7543.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7562.75.
- Parent displacement: yes
- Parent displacement candle: 2026-07-01T13:00:00
- Parent failure: not found
- First 5M return: 2026-07-01T13:20:00
- 5M wick defense: 2026-07-01T13:30:00, 2026-07-01T13:35:00
- Proof: 2026-07-01T13:35:00
- Entry/stop/risk: 7563.00 / 7572.75 / 9.75 pts
- T1/T2: 7548.50 / 7543.50
- Nearest liquidity: nearest prior low liquidity 7562.75
- Defended-area / obstacle management callout before or near T1: 5m LONG 7560.25-7561.50 parent 2026-07-01T13:15:00 confirmed 2026-07-01T13:20:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-01T13:40:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7572.75-7573.00 parent 2026-07-01T12:45:00 confirmed 2026-07-01T13:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7572.75-7573.00 parent 2026-07-01T12:45:00 confirmed 2026-07-01T13:00:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-01T13:20:00; wick 2026-07-01T13:30:00; proof 2026-07-01T13:35:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7554.50 (prior 5M swing low liquidity from 2026-07-01T13:10:00)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no defended FVG management objective interrupted delivery.
- Open FVGs below at proof: 5m LONG 7560.25-7561.50 parent 2026-07-01T13:15:00 confirmed 2026-07-01T13:20:00 status partial_touch; 5m LONG 7553.50-7557.75 parent 2026-07-01T11:05:00 confirmed 2026-07-01T11:10:00 status partial_touch; 60m LONG 7555.50-7557.50 parent 2026-07-01T12:00:00 confirmed 2026-07-01T13:00:00 status open_untouched; 60m LONG 7539.50-7552.25 parent 2026-07-01T11:00:00 confirmed 2026-07-01T12:00:00 status open_untouched; 15m LONG 7537.00-7546.75 parent 2026-07-01T10:15:00 confirmed 2026-07-01T10:30:00 status partial_touch; 5m LONG 7532.50-7533.00 parent 2026-07-01T10:00:00 confirmed 2026-07-01T10:05:00 status open_untouched; 5m LONG 7524.25-7528.00 parent 2026-07-01T09:55:00 confirmed 2026-07-01T10:00:00 status open_untouched; 15m LONG 7500.75-7503.50 parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7563.25-7567.25 parent 2026-05-14T21:50:00 confirmed 2026-05-14T21:55:00 status failed_inverted; 5m SHORT 7563.25-7564.50 parent 2026-06-18T04:20:00 confirmed 2026-06-18T04:25:00 status failed_inverted; 5m LONG 7563.50-7568.25 parent 2026-05-22T09:35:00 confirmed 2026-05-22T09:40:00 status failed_inverted; 5m LONG 7563.50-7564.50 parent 2026-06-18T04:10:00 confirmed 2026-06-18T04:15:00 status failed_inverted; 5m SHORT 7563.50-7564.25 parent 2026-06-19T11:35:00 confirmed 2026-06-19T11:40:00 status failed_inverted; 5m LONG 7563.75-7566.25 parent 2026-06-14T20:10:00 confirmed 2026-06-14T20:15:00 status failed_inverted; 15m LONG 7563.75-7564.25 parent 2026-06-19T11:00:00 confirmed 2026-06-19T11:15:00 status failed_inverted; 5m LONG 7564.00-7566.25 parent 2026-05-14T10:20:00 confirmed 2026-05-14T10:25:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7571.50-7574.25 parent 2026-07-01T12:40:00 confirmed 2026-07-01T12:45:00 status partial_touch; 15m SHORT 7572.75-7573.00 parent 2026-07-01T12:45:00 confirmed 2026-07-01T13:00:00 status open_untouched; 5m SHORT 7574.75-7579.25 parent 2026-06-22T10:25:00 confirmed 2026-06-22T10:30:00 status partial_touch; 5m SHORT 7581.75-7589.00 parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch
- Objective ladder: open_fvg 7560.25 reached 2026-07-01T13:45:00 (5m LONG open FVG partial_touch parent 2026-07-01T13:15:00 confirmed 2026-07-01T13:20:00); open_fvg 7555.50 reached 2026-07-01T14:15:00 (60m LONG open FVG open_untouched parent 2026-07-01T12:00:00 confirmed 2026-07-01T13:00:00); liquidity 7554.50 reached 2026-07-01T14:20:00 (prior 5M swing low liquidity from 2026-07-01T13:10:00); open_fvg 7553.50 reached 2026-07-01T14:20:00 (5m LONG open FVG partial_touch parent 2026-07-01T11:05:00 confirmed 2026-07-01T11:10:00); tactical 7548.50 reached 2026-07-01T15:50:00 (T1 1.5R); tactical 7543.50 reached 2026-07-01T15:55:00 (T2 2.0R); liquidity 7540.00 reached 2026-07-01T16:00:00 (prior 5M swing low liquidity from 2026-07-01T10:50:00); open_fvg 7539.50 reached 2026-07-01T16:00:00 (60m LONG open FVG open_untouched parent 2026-07-01T11:00:00 confirmed 2026-07-01T12:00:00); open_fvg 7537.00 reached 2026-07-01T16:00:00 (15m LONG open FVG partial_touch parent 2026-07-01T10:15:00 confirmed 2026-07-01T10:30:00); open_fvg 7532.50 not reached (5m LONG open FVG open_untouched parent 2026-07-01T10:00:00 confirmed 2026-07-01T10:05:00); open_fvg 7524.25 not reached (5m LONG open FVG open_untouched parent 2026-07-01T09:55:00 confirmed 2026-07-01T10:00:00); liquidity 7506.00 not reached (prior 5M swing low liquidity from 2026-07-01T09:40:00); session_extreme 7506.00 not reached (RTH low liquidity before proof); open_fvg 7500.75 not reached (15m LONG open FVG open_untouched parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00)
- Story: SHORT proof completed at 2026-07-01T13:35:00 from 7564.00-7567.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7560.25-7561.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7560.25 open_fvg, 7555.50 open_fvg, 7554.50 liquidity, 7553.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-01T15:50:00, one MES +$72.50
- Managed outcome: LQ1 at 2026-07-01T14:20:00, exit 7554.50, one MES +$42.50
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-07-01T13:35:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 5. SHORT 15M FVG 7552.50-7553.75 parent 2026-07-01T15:45:00 confirmed 2026-07-01T16:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-01T15:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-01T15:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7572.75-7573.00 parent 2026-07-01T12:45:00 confirmed 2026-07-01T13:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7572.75-7573.00 parent 2026-07-01T12:45:00 confirmed 2026-07-01T13:00:00 untested_by_15m
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
