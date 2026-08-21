# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-03 / morning (2026-07-03T09:15:00 to 2026-07-03T12:00:00)
Context window: 275 days (2025-10-01T00:00:00 to 2026-07-04T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 47976 bars (2025-10-28T18:05:00 to 2026-07-03T13:00:00)
- 15m: 16014 bars (2025-10-28T18:15:00 to 2026-07-03T13:00:00)
- 60m: 3980 bars (2025-10-28T19:00:00 to 2026-07-03T13:00:00)
- 120m: 2089 bars (2025-10-28T20:00:00 to 2026-07-03T13:00:00)
- 240m: 1160 bars (2025-10-28T22:00:00 to 2026-07-03T12:00:00)

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
- Open below: 60m LONG 7540.25-7548.25 parent 2026-07-02T22:00:00 confirmed 2026-07-02T23:00:00 status partial_touch; 120m LONG 7537.75-7547.75 parent 2026-07-02T22:00:00 confirmed 2026-07-03T00:00:00 status partial_touch; 5m LONG 7540.75-7545.00 parent 2026-07-02T21:10:00 confirmed 2026-07-02T21:15:00 status partial_touch; 15m LONG 7533.50-7544.75 parent 2026-07-02T21:15:00 confirmed 2026-07-02T21:30:00 status open_untouched; 5m LONG 7531.50-7539.75 parent 2026-07-02T21:05:00 confirmed 2026-07-02T21:10:00 status open_untouched; 15m LONG 7524.50-7528.50 parent 2026-07-02T18:15:00 confirmed 2026-07-02T18:30:00 status partial_touch; 5m LONG 7522.25-7523.50 parent 2026-07-02T17:00:00 confirmed 2026-07-02T18:05:00 status open_untouched; 5m LONG 7513.00-7521.00 parent 2026-07-02T15:55:00 confirmed 2026-07-02T16:00:00 status partial_touch; 15m LONG 7513.00-7517.75 parent 2026-07-02T16:00:00 confirmed 2026-07-02T16:15:00 status open_untouched; 60m LONG 7514.75-7517.75 parent 2026-07-02T16:00:00 confirmed 2026-07-02T17:00:00 status open_untouched
- Failed above: 5m LONG 7551.75-7555.00 parent 2026-06-18T03:00:00 confirmed 2026-06-18T03:05:00 status failed_inverted; 5m SHORT 7551.75-7552.00 parent 2026-07-03T07:00:00 confirmed 2026-07-03T07:05:00 status failed_inverted; 5m LONG 7551.75-7552.50 parent 2026-07-03T08:00:00 confirmed 2026-07-03T08:05:00 status failed_inverted; 15m LONG 7551.75-7554.75 parent 2026-07-02T08:30:00 confirmed 2026-07-02T08:45:00 status failed_inverted; 5m SHORT 7552.00-7555.50 parent 2026-05-14T07:25:00 confirmed 2026-05-14T07:30:00 status failed_inverted; 5m SHORT 7552.00-7553.75 parent 2026-05-22T02:00:00 confirmed 2026-05-22T02:05:00 status failed_inverted; 5m SHORT 7552.00-7562.25 parent 2026-06-17T15:00:00 confirmed 2026-06-17T15:05:00 status failed_inverted; 5m LONG 7552.00-7552.25 parent 2026-06-30T12:45:00 confirmed 2026-06-30T12:50:00 status failed_inverted; 60m SHORT 7552.00-7568.50 parent 2026-06-17T15:00:00 confirmed 2026-06-17T16:00:00 status failed_inverted; 5m LONG 7552.25-7554.25 parent 2026-05-22T00:05:00 confirmed 2026-05-22T00:10:00 status failed_inverted
- Open above: 5m SHORT 7574.50-7575.75 parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:35:00 status open_untouched; 15m SHORT 7574.50-7577.50 parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:45:00 status open_untouched; 5m SHORT 7579.00-7582.25 parent 2026-07-02T10:25:00 confirmed 2026-07-02T10:30:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof 2026-07-03T11:50:00 from 15M parent 2026-07-03T10:45:00 confirmed 2026-07-03T11:00:00.
- Defended-area management context: 5m LONG 7559.50-7561.25 is a callout before/near T1, not an issue by itself.
- Later rows: none.

## Trace Rows

### 1. LONG 15M FVG 7556.00-7557.50 parent 2026-07-03T10:45:00 confirmed 2026-07-03T11:00:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-03T10:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-03T11:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-03T11:30:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-03T11:35:00, 2026-07-03T11:45:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-03T11:50:00. | PASS entry_stop_risk_contract: Entry 7559.25, protected 5M stop 7554.25, risk 5.00 pts. | PASS tactical_targets_from_actual_risk: T1 7566.75 and T2 7569.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7559.50.
- Parent displacement: yes
- Parent displacement candle: 2026-07-03T10:30:00
- Parent failure: 2026-07-03T11:30:00
- First 5M return: 2026-07-03T11:30:00
- 5M wick defense: 2026-07-03T11:35:00, 2026-07-03T11:45:00
- Proof: 2026-07-03T11:50:00
- Entry/stop/risk: 7559.25 / 7554.25 / 5.00 pts
- T1/T2: 7566.75 / 7569.25
- Nearest liquidity: nearest prior high liquidity 7559.50
- Defended-area / obstacle management callout before or near T1: 5m LONG 7559.50-7561.25 parent 2026-06-18T04:05:00 confirmed 2026-06-18T04:10:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-03T11:55:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7556.00-7557.50 parent 2026-07-03T10:45:00 confirmed 2026-07-03T11:00:00 defended_on_15m defended 2026-07-03T11:15:00 failed 2026-07-03T11:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7556.00-7557.50 parent 2026-07-03T10:45:00 confirmed 2026-07-03T11:00:00 defended_on_15m defended 2026-07-03T11:15:00 failed 2026-07-03T11:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-03T11:05:00; wick 2026-07-03T11:45:00; proof 2026-07-03T11:50:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 60m LONG 7540.25-7548.25 parent 2026-07-02T22:00:00 confirmed 2026-07-02T23:00:00 status partial_touch; 120m LONG 7537.75-7547.75 parent 2026-07-02T22:00:00 confirmed 2026-07-03T00:00:00 status partial_touch; 5m LONG 7540.75-7545.00 parent 2026-07-02T21:10:00 confirmed 2026-07-02T21:15:00 status partial_touch; 15m LONG 7533.50-7544.75 parent 2026-07-02T21:15:00 confirmed 2026-07-02T21:30:00 status open_untouched; 5m LONG 7531.50-7539.75 parent 2026-07-02T21:05:00 confirmed 2026-07-02T21:10:00 status open_untouched; 15m LONG 7524.50-7528.50 parent 2026-07-02T18:15:00 confirmed 2026-07-02T18:30:00 status partial_touch; 5m LONG 7522.25-7523.50 parent 2026-07-02T17:00:00 confirmed 2026-07-02T18:05:00 status open_untouched; 5m LONG 7513.00-7521.00 parent 2026-07-02T15:55:00 confirmed 2026-07-02T16:00:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7559.50-7561.25 parent 2026-06-18T04:05:00 confirmed 2026-06-18T04:10:00 status failed_inverted; 5m SHORT 7559.75-7565.00 parent 2026-05-22T10:05:00 confirmed 2026-05-22T10:10:00 status failed_inverted; 5m LONG 7559.75-7561.00 parent 2026-06-19T10:40:00 confirmed 2026-06-19T10:45:00 status failed_inverted; 5m LONG 7559.75-7566.50 parent 2026-06-22T07:05:00 confirmed 2026-06-22T07:10:00 status failed_inverted; 5m LONG 7560.00-7561.50 parent 2026-06-18T05:50:00 confirmed 2026-06-18T05:55:00 status failed_inverted; 5m LONG 7560.00-7566.25 parent 2026-06-18T15:40:00 confirmed 2026-06-18T15:45:00 status failed_inverted; 15m SHORT 7560.00-7560.50 parent 2026-06-18T15:15:00 confirmed 2026-06-18T15:30:00 status failed_inverted; 15m LONG 7560.00-7565.25 parent 2026-06-18T15:45:00 confirmed 2026-06-18T16:00:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7574.50-7575.75 parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:35:00 status open_untouched; 15m SHORT 7574.50-7577.50 parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:45:00 status open_untouched; 5m SHORT 7579.00-7582.25 parent 2026-07-02T10:25:00 confirmed 2026-07-02T10:30:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch
- Objective ladder: liquidity 7560.50 not reached (prior 5M swing high liquidity from 2026-07-03T11:20:00); liquidity 7561.25 not reached (prior 5M swing high liquidity from 2026-07-03T11:00:00); liquidity 7561.75 not reached (prior 5M swing high liquidity from 2026-07-03T10:45:00); session_extreme 7561.75 not reached (RTH high liquidity before proof); tactical 7566.75 not reached (T1 1.5R); tactical 7569.25 not reached (T2 2.0R); open_fvg 7575.75 not reached (5m SHORT open FVG open_untouched parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:35:00); open_fvg 7577.50 not reached (15m SHORT open FVG open_untouched parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:45:00); open_fvg 7582.25 not reached (5m SHORT open FVG open_untouched parent 2026-07-02T10:25:00 confirmed 2026-07-02T10:30:00); open_fvg 7605.25 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00); open_fvg 7609.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00); open_fvg 7628.00 not reached (5m SHORT open FVG open_untouched parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00); open_fvg 7637.50 not reached (5m SHORT open FVG partial_touch parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00); open_fvg 7638.75 not reached (15m SHORT open FVG partial_touch parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00)
- Story: LONG proof completed at 2026-07-03T11:50:00 from 7556.00-7557.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7559.50-7561.25 with reaction obstacle_defended_management_callout. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-03T12:30:00, one MES $-25.00
- Managed outcome: Stop at 2026-07-03T12:30:00, exit 7554.25, one MES $-25.00
- Reasons: Qualified by this diagnostic heuristic.
