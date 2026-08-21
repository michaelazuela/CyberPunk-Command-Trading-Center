# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-04 / lunch (2026-06-04T12:00:00 to 2026-06-04T16:00:00)
Context window: 275 days (2025-09-02T00:00:00 to 2026-06-05T23:59:59)
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
- Open below: 5m LONG 7638.50-7642.75 parent 2026-06-04T11:10:00 confirmed 2026-06-04T11:15:00 status partial_touch; 5m LONG 7633.25-7635.75 parent 2026-06-04T11:05:00 confirmed 2026-06-04T11:10:00 status open_untouched; 5m LONG 7630.75-7633.00 parent 2026-06-04T11:00:00 confirmed 2026-06-04T11:05:00 status open_untouched; 60m LONG 7628.00-7633.00 parent 2026-06-04T11:00:00 confirmed 2026-06-04T12:00:00 status open_untouched; 5m LONG 7619.75-7622.75 parent 2026-06-04T10:15:00 confirmed 2026-06-04T10:20:00 status partial_touch; 120m LONG 7611.50-7613.25 parent 2026-06-04T10:00:00 confirmed 2026-06-04T12:00:00 status open_untouched; 5m LONG 7597.50-7600.50 parent 2026-06-04T07:50:00 confirmed 2026-06-04T07:55:00 status partial_touch; 120m LONG 7558.50-7598.50 parent 2026-05-24T20:00:00 confirmed 2026-05-24T22:00:00 status partial_touch; 60m LONG 7558.50-7596.50 parent 2026-05-24T19:00:00 confirmed 2026-05-24T20:00:00 status partial_touch; 15m LONG 7551.00-7590.50 parent 2026-05-24T18:15:00 confirmed 2026-05-24T18:30:00 status partial_touch
- Failed above: 5m SHORT 7644.75-7646.25 parent 2026-06-03T15:05:00 confirmed 2026-06-03T15:10:00 status failed_inverted; 5m SHORT 7645.00-7645.25 parent 2026-06-03T11:40:00 confirmed 2026-06-03T11:45:00 status failed_inverted; 15m SHORT 7645.25-7645.75 parent 2026-06-03T15:15:00 confirmed 2026-06-03T15:30:00 status failed_inverted; 5m LONG 7645.50-7646.25 parent 2026-06-02T00:05:00 confirmed 2026-06-02T00:10:00 status failed_inverted; 5m LONG 7645.75-7646.50 parent 2026-05-28T15:35:00 confirmed 2026-05-28T15:40:00 status failed_inverted; 5m LONG 7645.75-7647.50 parent 2026-06-03T14:25:00 confirmed 2026-06-03T14:30:00 status failed_inverted; 60m LONG 7646.25-7647.25 parent 2026-05-29T01:00:00 confirmed 2026-05-29T02:00:00 status failed_inverted; 60m LONG 7646.25-7651.75 parent 2026-06-02T01:00:00 confirmed 2026-06-02T02:00:00 status failed_inverted; 120m SHORT 7646.25-7647.50 parent 2026-05-28T22:00:00 confirmed 2026-05-29T00:00:00 status failed_inverted; 5m LONG 7646.50-7646.75 parent 2026-05-29T00:20:00 confirmed 2026-05-29T00:25:00 status failed_inverted
- Open above: 5m SHORT 7658.00-7666.00 parent 2026-06-03T09:45:00 confirmed 2026-06-03T09:50:00 status partial_touch; 15m SHORT 7658.00-7668.75 parent 2026-06-03T09:45:00 confirmed 2026-06-03T10:00:00 status partial_touch; 60m SHORT 7661.25-7667.25 parent 2026-06-03T10:00:00 confirmed 2026-06-03T11:00:00 status open_untouched; 120m SHORT 7661.25-7674.00 parent 2026-06-03T10:00:00 confirmed 2026-06-03T12:00:00 status open_untouched; 5m SHORT 7669.25-7670.25 parent 2026-06-03T09:40:00 confirmed 2026-06-03T09:45:00 status open_untouched; 15m SHORT 7675.00-7679.50 parent 2026-06-03T08:30:00 confirmed 2026-06-03T08:45:00 status partial_touch; 5m SHORT 7678.25-7679.75 parent 2026-06-03T08:20:00 confirmed 2026-06-03T08:25:00 status partial_touch; 5m SHORT 7690.00-7691.25 parent 2026-06-02T18:05:00 confirmed 2026-06-02T18:10:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof 2026-06-04T12:05:00 from 15M parent 2026-06-04T11:15:00 confirmed 2026-06-04T11:30:00.
- Defended-area management context: 60m LONG 7646.25-7647.25 is a callout before/near T1, not an issue by itself.
- Later rows: 3 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7633.50-7644.75 parent 2026-06-04T11:15:00 confirmed 2026-06-04T11:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-04T11:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-04T11:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-04T12:00:00, 2026-06-04T12:05:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-04T12:05:00. | PASS entry_stop_risk_contract: Entry 7645.75, protected 5M stop 7624.75, risk 21.00 pts. | PASS tactical_targets_from_actual_risk: T1 7677.25 and T2 7687.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7646.00.
- Parent displacement: yes
- Parent displacement candle: 2026-06-04T11:15:00
- Parent failure: not found
- First 5M return: 2026-06-04T11:45:00
- 5M wick defense: 2026-06-04T12:00:00, 2026-06-04T12:05:00
- Proof: 2026-06-04T12:05:00
- Entry/stop/risk: 7645.75 / 7624.75 / 21.00 pts
- T1/T2: 7677.25 / 7687.75
- Nearest liquidity: nearest prior high liquidity 7646.00
- Defended-area / obstacle management callout before or near T1: 60m LONG 7646.25-7647.25 parent 2026-05-29T01:00:00 confirmed 2026-05-29T02:00:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-04T12:10:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7633.50-7644.75 parent 2026-06-04T11:15:00 confirmed 2026-06-04T11:30:00 defended_on_15m defended 2026-06-04T12:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7633.50-7644.75 parent 2026-06-04T11:15:00 confirmed 2026-06-04T11:30:00 defended_on_15m defended 2026-06-04T12:15:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-04T11:45:00; wick 2026-06-04T12:00:00; proof 2026-06-04T12:05:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 15m LONG 7633.50-7644.75 parent 2026-06-04T11:15:00 confirmed 2026-06-04T11:30:00 status partial_touch; 5m LONG 7638.50-7642.75 parent 2026-06-04T11:10:00 confirmed 2026-06-04T11:15:00 status partial_touch; 5m LONG 7633.25-7635.75 parent 2026-06-04T11:05:00 confirmed 2026-06-04T11:10:00 status open_untouched; 5m LONG 7630.75-7633.00 parent 2026-06-04T11:00:00 confirmed 2026-06-04T11:05:00 status open_untouched; 60m LONG 7628.00-7633.00 parent 2026-06-04T11:00:00 confirmed 2026-06-04T12:00:00 status open_untouched; 5m LONG 7619.75-7622.75 parent 2026-06-04T10:15:00 confirmed 2026-06-04T10:20:00 status partial_touch; 120m LONG 7611.50-7613.25 parent 2026-06-04T10:00:00 confirmed 2026-06-04T12:00:00 status open_untouched; 5m LONG 7597.50-7600.50 parent 2026-06-04T07:50:00 confirmed 2026-06-04T07:55:00 status partial_touch
- Failed FVGs above at proof: 60m LONG 7646.25-7647.25 parent 2026-05-29T01:00:00 confirmed 2026-05-29T02:00:00 status failed_inverted; 60m LONG 7646.25-7651.75 parent 2026-06-02T01:00:00 confirmed 2026-06-02T02:00:00 status failed_inverted; 120m SHORT 7646.25-7647.50 parent 2026-05-28T22:00:00 confirmed 2026-05-29T00:00:00 status failed_inverted; 5m LONG 7646.50-7646.75 parent 2026-05-29T00:20:00 confirmed 2026-05-29T00:25:00 status failed_inverted; 120m SHORT 7646.75-7654.25 parent 2026-06-01T22:00:00 confirmed 2026-06-02T00:00:00 status failed_inverted; 120m LONG 7646.75-7657.25 parent 2026-06-02T02:00:00 confirmed 2026-06-02T04:00:00 status failed_inverted; 5m LONG 7647.00-7647.25 parent 2026-05-29T03:50:00 confirmed 2026-05-29T03:55:00 status failed_inverted; 5m SHORT 7647.00-7651.25 parent 2026-06-01T09:25:00 confirmed 2026-06-01T09:30:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7658.00-7666.00 parent 2026-06-03T09:45:00 confirmed 2026-06-03T09:50:00 status partial_touch; 15m SHORT 7658.00-7668.75 parent 2026-06-03T09:45:00 confirmed 2026-06-03T10:00:00 status partial_touch; 60m SHORT 7661.25-7667.25 parent 2026-06-03T10:00:00 confirmed 2026-06-03T11:00:00 status open_untouched; 120m SHORT 7661.25-7674.00 parent 2026-06-03T10:00:00 confirmed 2026-06-03T12:00:00 status open_untouched; 5m SHORT 7669.25-7670.25 parent 2026-06-03T09:40:00 confirmed 2026-06-03T09:45:00 status open_untouched; 15m SHORT 7675.00-7679.50 parent 2026-06-03T08:30:00 confirmed 2026-06-03T08:45:00 status partial_touch; 5m SHORT 7678.25-7679.75 parent 2026-06-03T08:20:00 confirmed 2026-06-03T08:25:00 status partial_touch; 5m SHORT 7690.00-7691.25 parent 2026-06-02T18:05:00 confirmed 2026-06-02T18:10:00 status partial_touch
- Objective ladder: liquidity 7651.00 reached 2026-06-04T12:10:00 (prior 5M swing high liquidity from 2026-06-04T11:35:00); session_extreme 7651.00 reached 2026-06-04T12:10:00 (RTH high liquidity before proof); open_fvg 7666.00 reached 2026-06-04T13:35:00 (5m SHORT open FVG partial_touch parent 2026-06-03T09:45:00 confirmed 2026-06-03T09:50:00); open_fvg 7667.25 reached 2026-06-04T14:00:00 (60m SHORT open FVG open_untouched parent 2026-06-03T10:00:00 confirmed 2026-06-03T11:00:00); open_fvg 7668.75 reached 2026-06-04T14:00:00 (15m SHORT open FVG partial_touch parent 2026-06-03T09:45:00 confirmed 2026-06-03T10:00:00); open_fvg 7670.25 reached 2026-06-04T14:05:00 (5m SHORT open FVG open_untouched parent 2026-06-03T09:40:00 confirmed 2026-06-03T09:45:00); open_fvg 7674.00 reached 2026-06-04T15:30:00 (120m SHORT open FVG open_untouched parent 2026-06-03T10:00:00 confirmed 2026-06-03T12:00:00); tactical 7677.25 not reached (T1 1.5R); open_fvg 7679.50 not reached (15m SHORT open FVG partial_touch parent 2026-06-03T08:30:00 confirmed 2026-06-03T08:45:00); open_fvg 7679.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-03T08:20:00 confirmed 2026-06-03T08:25:00); tactical 7687.75 not reached (T2 2.0R); open_fvg 7691.25 not reached (5m SHORT open FVG partial_touch parent 2026-06-02T18:05:00 confirmed 2026-06-02T18:10:00)
- Story: LONG proof completed at 2026-06-04T12:05:00 from 7633.50-7644.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 60m 7646.25-7647.25 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7651.00 liquidity, 7651.00 session_extreme, 7666.00 open_fvg, 7667.25 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-04T20:40:00, one MES $-105.00
- Managed outcome: Stop at 2026-06-04T20:40:00, exit 7624.75, one MES $-105.00
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-06-04T12:05:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 2. LONG 15M FVG 7646.00-7653.50 parent 2026-06-04T12:15:00 confirmed 2026-06-04T12:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-04T12:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-04T12:35:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-04T12:35:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-04T12:35:00. | PASS entry_stop_risk_contract: Entry 7654.75, protected 5M stop 7639.00, risk 15.75 pts. | PASS tactical_targets_from_actual_risk: T1 7678.50 and T2 7686.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7655.00.
- Parent displacement: yes
- Parent displacement candle: 2026-06-04T12:15:00
- Parent failure: not found
- First 5M return: 2026-06-04T12:35:00
- 5M wick defense: 2026-06-04T12:35:00
- Proof: 2026-06-04T12:35:00
- Entry/stop/risk: 7654.75 / 7639.00 / 15.75 pts
- T1/T2: 7678.50 / 7686.25
- Nearest liquidity: nearest prior high liquidity 7655.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7655.00-7661.75 parent 2026-06-01T11:35:00 confirmed 2026-06-01T11:40:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-04T12:40:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7646.00-7653.50 parent 2026-06-04T12:15:00 confirmed 2026-06-04T12:30:00 defended_on_15m defended 2026-06-04T12:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7646.00-7653.50 parent 2026-06-04T12:15:00 confirmed 2026-06-04T12:30:00 defended_on_15m defended 2026-06-04T12:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-04T12:35:00; wick 2026-06-04T12:35:00; proof 2026-06-04T12:35:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 15m LONG 7646.00-7653.50 parent 2026-06-04T12:15:00 confirmed 2026-06-04T12:30:00 status open_untouched; 5m LONG 7646.75-7652.50 parent 2026-06-04T12:10:00 confirmed 2026-06-04T12:15:00 status partial_touch; 15m LONG 7633.50-7644.75 parent 2026-06-04T11:15:00 confirmed 2026-06-04T11:30:00 status partial_touch; 5m LONG 7638.50-7642.75 parent 2026-06-04T11:10:00 confirmed 2026-06-04T11:15:00 status partial_touch; 5m LONG 7633.25-7635.75 parent 2026-06-04T11:05:00 confirmed 2026-06-04T11:10:00 status open_untouched; 5m LONG 7630.75-7633.00 parent 2026-06-04T11:00:00 confirmed 2026-06-04T11:05:00 status open_untouched; 60m LONG 7628.00-7633.00 parent 2026-06-04T11:00:00 confirmed 2026-06-04T12:00:00 status open_untouched; 5m LONG 7619.75-7622.75 parent 2026-06-04T10:15:00 confirmed 2026-06-04T10:20:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7655.00-7661.75 parent 2026-06-01T11:35:00 confirmed 2026-06-01T11:40:00 status failed_inverted; 15m LONG 7655.25-7656.75 parent 2026-05-29T14:30:00 confirmed 2026-05-29T14:45:00 status failed_inverted; 5m SHORT 7655.75-7656.25 parent 2026-05-29T13:45:00 confirmed 2026-05-29T13:50:00 status failed_inverted; 15m LONG 7655.75-7658.50 parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00 status failed_inverted; 5m LONG 7656.50-7656.75 parent 2026-05-29T07:20:00 confirmed 2026-05-29T07:25:00 status failed_inverted; 5m LONG 7656.50-7656.75 parent 2026-05-29T14:30:00 confirmed 2026-05-29T14:35:00 status failed_inverted; 15m LONG 7656.50-7657.25 parent 2026-06-02T01:30:00 confirmed 2026-06-02T01:45:00 status failed_inverted; 5m SHORT 7657.00-7657.50 parent 2026-06-01T20:05:00 confirmed 2026-06-01T20:10:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7658.00-7666.00 parent 2026-06-03T09:45:00 confirmed 2026-06-03T09:50:00 status partial_touch; 15m SHORT 7658.00-7668.75 parent 2026-06-03T09:45:00 confirmed 2026-06-03T10:00:00 status partial_touch; 60m SHORT 7661.25-7667.25 parent 2026-06-03T10:00:00 confirmed 2026-06-03T11:00:00 status open_untouched; 120m SHORT 7661.25-7674.00 parent 2026-06-03T10:00:00 confirmed 2026-06-03T12:00:00 status open_untouched; 5m SHORT 7669.25-7670.25 parent 2026-06-03T09:40:00 confirmed 2026-06-03T09:45:00 status open_untouched; 15m SHORT 7675.00-7679.50 parent 2026-06-03T08:30:00 confirmed 2026-06-03T08:45:00 status partial_touch; 5m SHORT 7678.25-7679.75 parent 2026-06-03T08:20:00 confirmed 2026-06-03T08:25:00 status partial_touch; 5m SHORT 7690.00-7691.25 parent 2026-06-02T18:05:00 confirmed 2026-06-02T18:10:00 status partial_touch
- Objective ladder: session_extreme 7658.50 reached 2026-06-04T12:40:00 (RTH high liquidity before proof); open_fvg 7666.00 reached 2026-06-04T13:35:00 (5m SHORT open FVG partial_touch parent 2026-06-03T09:45:00 confirmed 2026-06-03T09:50:00); open_fvg 7667.25 reached 2026-06-04T14:00:00 (60m SHORT open FVG open_untouched parent 2026-06-03T10:00:00 confirmed 2026-06-03T11:00:00); open_fvg 7668.75 reached 2026-06-04T14:00:00 (15m SHORT open FVG partial_touch parent 2026-06-03T09:45:00 confirmed 2026-06-03T10:00:00); open_fvg 7670.25 reached 2026-06-04T14:05:00 (5m SHORT open FVG open_untouched parent 2026-06-03T09:40:00 confirmed 2026-06-03T09:45:00); open_fvg 7674.00 reached 2026-06-04T15:30:00 (120m SHORT open FVG open_untouched parent 2026-06-03T10:00:00 confirmed 2026-06-03T12:00:00); tactical 7678.50 not reached (T1 1.5R); open_fvg 7679.50 not reached (15m SHORT open FVG partial_touch parent 2026-06-03T08:30:00 confirmed 2026-06-03T08:45:00); open_fvg 7679.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-03T08:20:00 confirmed 2026-06-03T08:25:00); tactical 7686.25 not reached (T2 2.0R); open_fvg 7691.25 not reached (5m SHORT open FVG partial_touch parent 2026-06-02T18:05:00 confirmed 2026-06-02T18:10:00)
- Story: LONG proof completed at 2026-06-04T12:35:00 from 7646.00-7653.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7655.00-7661.75 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7658.50 session_extreme, 7666.00 open_fvg, 7667.25 open_fvg, 7668.75 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-04T19:50:00, one MES $-78.75
- Managed outcome: Stop at 2026-06-04T19:50:00, exit 7639.00, one MES $-78.75
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-06-04T12:35:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 3. LONG 15M FVG 7661.50-7661.75 parent 2026-06-04T13:30:00 confirmed 2026-06-04T13:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-04T16:00:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-06-04T16:00:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7646.00-7653.50 parent 2026-06-04T12:15:00 confirmed 2026-06-04T12:30:00 defended_on_15m defended 2026-06-04T12:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7646.00-7653.50 parent 2026-06-04T12:15:00 confirmed 2026-06-04T12:30:00 defended_on_15m defended 2026-06-04T12:45:00
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-06-04T16:00:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 4. LONG 15M FVG 7666.00-7667.25 parent 2026-06-04T14:00:00 confirmed 2026-06-04T14:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-04T16:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-04T14:20:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-04T14:20:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-04T14:20:00. | PASS entry_stop_risk_contract: Entry 7670.25, protected 5M stop 7662.75, risk 7.50 pts. | PASS tactical_targets_from_actual_risk: T1 7681.50 and T2 7685.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7670.50.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-06-04T16:00:00
- First 5M return: 2026-06-04T14:20:00
- 5M wick defense: 2026-06-04T14:20:00
- Proof: 2026-06-04T14:20:00
- Entry/stop/risk: 7670.25 / 7662.75 / 7.50 pts
- T1/T2: 7681.50 / 7685.25
- Nearest liquidity: nearest prior high liquidity 7670.50
- Defended-area / obstacle management callout before or near T1: 5m LONG 7670.50-7671.25 parent 2026-06-02T10:15:00 confirmed 2026-06-02T10:20:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-04T14:25:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7646.00-7653.50 parent 2026-06-04T12:15:00 confirmed 2026-06-04T12:30:00 defended_on_15m defended 2026-06-04T12:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7646.00-7653.50 parent 2026-06-04T12:15:00 confirmed 2026-06-04T12:30:00 defended_on_15m defended 2026-06-04T12:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-04T14:20:00; wick 2026-06-04T14:20:00; proof 2026-06-04T14:20:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7666.50-7667.25 parent 2026-06-04T14:00:00 confirmed 2026-06-04T14:05:00 status partial_touch; 15m LONG 7666.00-7667.25 parent 2026-06-04T14:00:00 confirmed 2026-06-04T14:15:00 status open_untouched; 5m LONG 7660.50-7662.00 parent 2026-06-04T13:30:00 confirmed 2026-06-04T13:35:00 status partial_touch; 15m LONG 7661.50-7661.75 parent 2026-06-04T13:30:00 confirmed 2026-06-04T13:45:00 status open_untouched; 60m LONG 7651.00-7657.50 parent 2026-06-04T13:00:00 confirmed 2026-06-04T14:00:00 status open_untouched; 5m LONG 7657.00-7657.25 parent 2026-06-04T12:40:00 confirmed 2026-06-04T12:45:00 status partial_touch; 15m LONG 7646.00-7653.50 parent 2026-06-04T12:15:00 confirmed 2026-06-04T12:30:00 status partial_touch; 5m LONG 7646.75-7652.50 parent 2026-06-04T12:10:00 confirmed 2026-06-04T12:15:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7670.50-7671.25 parent 2026-06-02T10:15:00 confirmed 2026-06-02T10:20:00 status failed_inverted; 60m LONG 7672.75-7685.50 parent 2026-06-01T14:00:00 confirmed 2026-06-01T15:00:00 status failed_inverted; 5m SHORT 7673.00-7673.75 parent 2026-06-01T03:45:00 confirmed 2026-06-01T03:50:00 status failed_inverted; 5m SHORT 7673.00-7673.50 parent 2026-06-01T16:55:00 confirmed 2026-06-01T17:00:00 status failed_inverted; 5m SHORT 7673.25-7678.00 parent 2026-06-02T19:20:00 confirmed 2026-06-02T19:25:00 status failed_inverted; 15m LONG 7673.25-7675.25 parent 2026-06-01T05:00:00 confirmed 2026-06-01T05:15:00 status failed_inverted; 5m LONG 7673.50-7676.00 parent 2026-06-01T04:55:00 confirmed 2026-06-01T05:00:00 status failed_inverted; 60m SHORT 7673.50-7677.25 parent 2026-06-01T09:00:00 confirmed 2026-06-01T10:00:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7675.00-7679.50 parent 2026-06-03T08:30:00 confirmed 2026-06-03T08:45:00 status partial_touch; 5m SHORT 7678.25-7679.75 parent 2026-06-03T08:20:00 confirmed 2026-06-03T08:25:00 status partial_touch; 5m SHORT 7690.00-7691.25 parent 2026-06-02T18:05:00 confirmed 2026-06-02T18:10:00 status partial_touch
- Objective ladder: open_fvg 7679.50 not reached (15m SHORT open FVG partial_touch parent 2026-06-03T08:30:00 confirmed 2026-06-03T08:45:00); open_fvg 7679.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-03T08:20:00 confirmed 2026-06-03T08:25:00); tactical 7681.50 not reached (T1 1.5R); tactical 7685.25 not reached (T2 2.0R); open_fvg 7691.25 not reached (5m SHORT open FVG partial_touch parent 2026-06-02T18:05:00 confirmed 2026-06-02T18:10:00)
- Story: LONG proof completed at 2026-06-04T14:20:00 from 7666.00-7667.25. 11 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7670.50-7671.25 with reaction obstacle_defended_management_callout. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-04T16:00:00, one MES $-37.50
- Managed outcome: Stop at 2026-06-04T16:00:00, exit 7662.75, one MES $-37.50
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. Defended-first continuation precedence: LONG 5M defense proof completed at 2026-06-04T14:20:00 before later same-zone failure/reversal read at 2026-06-04T16:00:00. Review the defended continuation before labeling this zone as failure/reversal.
