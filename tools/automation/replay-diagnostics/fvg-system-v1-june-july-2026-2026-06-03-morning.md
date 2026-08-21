# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-03 / morning (2026-06-03T09:15:00 to 2026-06-03T12:00:00)
Context window: 275 days (2025-09-01T00:00:00 to 2026-06-04T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 42347 bars (2025-10-28T18:05:00 to 2026-06-04T23:55:00)
- 15m: 14120 bars (2025-10-28T18:15:00 to 2026-06-04T23:45:00)
- 60m: 3490 bars (2025-10-28T19:00:00 to 2026-06-04T23:00:00)
- 120m: 1823 bars (2025-10-28T20:00:00 to 2026-06-04T22:00:00)
- 240m: 931 bars (2025-10-28T22:00:00 to 2026-06-04T22:00:00)

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
- Open below: 120m LONG 7646.75-7657.25 parent 2026-06-02T02:00:00 confirmed 2026-06-02T04:00:00 status partial_touch; 15m LONG 7649.50-7651.75 parent 2026-06-02T01:00:00 confirmed 2026-06-02T01:15:00 status partial_touch; 60m LONG 7646.25-7651.75 parent 2026-06-02T01:00:00 confirmed 2026-06-02T02:00:00 status partial_touch; 5m LONG 7649.50-7651.25 parent 2026-06-02T00:50:00 confirmed 2026-06-02T00:55:00 status partial_touch; 15m LONG 7644.00-7644.75 parent 2026-06-02T00:00:00 confirmed 2026-06-02T00:15:00 status open_untouched; 240m LONG 7607.50-7638.75 parent 2026-05-28T14:00:00 confirmed 2026-05-28T17:00:00 status partial_touch; 120m LONG 7607.50-7634.25 parent 2026-05-28T12:00:00 confirmed 2026-05-28T14:00:00 status open_untouched; 5m LONG 7633.25-7634.00 parent 2026-05-28T11:25:00 confirmed 2026-05-28T11:30:00 status open_untouched; 5m LONG 7626.50-7632.00 parent 2026-05-28T11:05:00 confirmed 2026-05-28T11:10:00 status partial_touch; 15m LONG 7627.00-7628.50 parent 2026-05-28T11:15:00 confirmed 2026-05-28T11:30:00 status open_untouched
- Failed above: 60m LONG 7672.75-7685.50 parent 2026-06-01T14:00:00 confirmed 2026-06-01T15:00:00 status failed_inverted; 5m SHORT 7673.00-7673.75 parent 2026-06-01T03:45:00 confirmed 2026-06-01T03:50:00 status failed_inverted; 5m SHORT 7673.00-7673.50 parent 2026-06-01T16:55:00 confirmed 2026-06-01T17:00:00 status failed_inverted; 5m SHORT 7673.25-7678.00 parent 2026-06-02T19:20:00 confirmed 2026-06-02T19:25:00 status failed_inverted; 15m LONG 7673.25-7675.25 parent 2026-06-01T05:00:00 confirmed 2026-06-01T05:15:00 status failed_inverted; 5m LONG 7673.50-7676.00 parent 2026-06-01T04:55:00 confirmed 2026-06-01T05:00:00 status failed_inverted; 60m SHORT 7673.50-7677.25 parent 2026-06-01T09:00:00 confirmed 2026-06-01T10:00:00 status failed_inverted; 5m SHORT 7673.75-7674.25 parent 2026-05-31T21:05:00 confirmed 2026-05-31T21:10:00 status failed_inverted; 5m SHORT 7673.75-7674.25 parent 2026-06-01T05:55:00 confirmed 2026-06-01T06:00:00 status failed_inverted; 5m SHORT 7673.75-7675.50 parent 2026-06-01T08:55:00 confirmed 2026-06-01T09:00:00 status failed_inverted
- Open above: 5m SHORT 7672.25-7674.75 parent 2026-06-03T08:35:00 confirmed 2026-06-03T08:40:00 status partial_touch; 15m SHORT 7673.50-7674.75 parent 2026-06-03T08:45:00 confirmed 2026-06-03T09:00:00 status open_untouched; 5m SHORT 7675.00-7676.50 parent 2026-06-03T08:30:00 confirmed 2026-06-03T08:35:00 status open_untouched; 15m SHORT 7675.00-7679.50 parent 2026-06-03T08:30:00 confirmed 2026-06-03T08:45:00 status open_untouched; 5m SHORT 7678.25-7679.75 parent 2026-06-03T08:20:00 confirmed 2026-06-03T08:25:00 status open_untouched; 5m SHORT 7690.00-7691.25 parent 2026-06-02T18:05:00 confirmed 2026-06-02T18:10:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof 2026-06-03T10:35:00 from 15M parent 2026-06-03T09:45:00 confirmed 2026-06-03T10:00:00.
- Defended-area management context: 240m LONG 7607.50-7638.75 is a callout before/near T1, not an issue by itself.
- Later rows: none.

## Trace Rows

### 1. SHORT 15M FVG 7658.00-7668.75 parent 2026-06-03T09:45:00 confirmed 2026-06-03T10:00:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-03T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-03T10:15:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-03T10:35:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-03T10:35:00. | PASS entry_stop_risk_contract: Entry 7656.25, protected 5M stop 7678.25, risk 22.00 pts. | PASS tactical_targets_from_actual_risk: T1 7623.25 and T2 7612.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7656.00.
- Parent displacement: yes
- Parent displacement candle: 2026-06-03T09:45:00
- Parent failure: not found
- First 5M return: 2026-06-03T10:15:00
- 5M wick defense: 2026-06-03T10:35:00
- Proof: 2026-06-03T10:35:00
- Entry/stop/risk: 7656.25 / 7678.25 / 22.00 pts
- T1/T2: 7623.25 / 7612.25
- Nearest liquidity: nearest prior low liquidity 7656.00
- Defended-area / obstacle management callout before or near T1: 240m LONG 7607.50-7638.75 parent 2026-05-28T14:00:00 confirmed 2026-05-28T17:00:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-03T11:50:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7658.00-7668.75 parent 2026-06-03T09:45:00 confirmed 2026-06-03T10:00:00 defended_on_15m defended 2026-06-03T10:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7658.00-7668.75 parent 2026-06-03T09:45:00 confirmed 2026-06-03T10:00:00 defended_on_15m defended 2026-06-03T10:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-03T10:15:00; wick 2026-06-03T10:35:00; proof 2026-06-03T10:35:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7650.50 (prior 5M swing low liquidity from 2026-06-03T10:20:00)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no defended FVG management objective interrupted delivery.
- Open FVGs below at proof: 240m LONG 7607.50-7638.75 parent 2026-05-28T14:00:00 confirmed 2026-05-28T17:00:00 status partial_touch; 120m LONG 7607.50-7634.25 parent 2026-05-28T12:00:00 confirmed 2026-05-28T14:00:00 status open_untouched; 5m LONG 7633.25-7634.00 parent 2026-05-28T11:25:00 confirmed 2026-05-28T11:30:00 status open_untouched; 5m LONG 7626.50-7632.00 parent 2026-05-28T11:05:00 confirmed 2026-05-28T11:10:00 status partial_touch; 15m LONG 7627.00-7628.50 parent 2026-05-28T11:15:00 confirmed 2026-05-28T11:30:00 status open_untouched; 60m LONG 7607.50-7625.00 parent 2026-05-28T11:00:00 confirmed 2026-05-28T12:00:00 status open_untouched; 5m LONG 7603.75-7619.00 parent 2026-05-28T10:15:00 confirmed 2026-05-28T10:20:00 status partial_touch; 15m LONG 7600.75-7616.75 parent 2026-05-28T10:15:00 confirmed 2026-05-28T10:30:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7656.50-7656.75 parent 2026-05-29T07:20:00 confirmed 2026-05-29T07:25:00 status failed_inverted; 5m LONG 7656.50-7656.75 parent 2026-05-29T14:30:00 confirmed 2026-05-29T14:35:00 status failed_inverted; 15m LONG 7656.50-7657.25 parent 2026-06-02T01:30:00 confirmed 2026-06-02T01:45:00 status failed_inverted; 5m SHORT 7657.00-7657.50 parent 2026-06-01T20:05:00 confirmed 2026-06-01T20:10:00 status failed_inverted; 5m SHORT 7657.50-7658.00 parent 2026-05-29T16:20:00 confirmed 2026-05-29T16:25:00 status failed_inverted; 5m LONG 7657.50-7658.25 parent 2026-06-01T19:00:00 confirmed 2026-06-01T19:05:00 status failed_inverted; 5m SHORT 7657.75-7659.25 parent 2026-06-02T09:10:00 confirmed 2026-06-02T09:15:00 status failed_inverted; 5m LONG 7658.00-7660.50 parent 2026-05-29T09:40:00 confirmed 2026-05-29T09:45:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7658.00-7666.00 parent 2026-06-03T09:45:00 confirmed 2026-06-03T09:50:00 status partial_touch; 15m SHORT 7658.00-7668.75 parent 2026-06-03T09:45:00 confirmed 2026-06-03T10:00:00 status partial_touch; 5m SHORT 7669.25-7670.25 parent 2026-06-03T09:40:00 confirmed 2026-06-03T09:45:00 status open_untouched; 15m SHORT 7675.00-7679.50 parent 2026-06-03T08:30:00 confirmed 2026-06-03T08:45:00 status partial_touch; 5m SHORT 7678.25-7679.75 parent 2026-06-03T08:20:00 confirmed 2026-06-03T08:25:00 status partial_touch; 5m SHORT 7690.00-7691.25 parent 2026-06-02T18:05:00 confirmed 2026-06-02T18:10:00 status partial_touch
- Objective ladder: liquidity 7650.50 reached 2026-06-03T10:50:00 (prior 5M swing low liquidity from 2026-06-03T10:20:00); liquidity 7637.50 not reached (prior 5M swing low liquidity from 2026-06-03T09:55:00); session_extreme 7637.50 not reached (RTH low liquidity before proof); open_fvg 7633.25 not reached (5m LONG open FVG open_untouched parent 2026-05-28T11:25:00 confirmed 2026-05-28T11:30:00); open_fvg 7627.00 not reached (15m LONG open FVG open_untouched parent 2026-05-28T11:15:00 confirmed 2026-05-28T11:30:00); open_fvg 7626.50 not reached (5m LONG open FVG partial_touch parent 2026-05-28T11:05:00 confirmed 2026-05-28T11:10:00); tactical 7623.25 not reached (T1 1.5R); tactical 7612.25 not reached (T2 2.0R); open_fvg 7607.50 not reached (240m LONG open FVG partial_touch parent 2026-05-28T14:00:00 confirmed 2026-05-28T17:00:00); open_fvg 7607.50 not reached (120m LONG open FVG open_untouched parent 2026-05-28T12:00:00 confirmed 2026-05-28T14:00:00); open_fvg 7607.50 not reached (60m LONG open FVG open_untouched parent 2026-05-28T11:00:00 confirmed 2026-05-28T12:00:00); open_fvg 7603.75 not reached (5m LONG open FVG partial_touch parent 2026-05-28T10:15:00 confirmed 2026-05-28T10:20:00); open_fvg 7600.75 not reached (15m LONG open FVG partial_touch parent 2026-05-28T10:15:00 confirmed 2026-05-28T10:30:00)
- Story: SHORT proof completed at 2026-06-03T10:35:00 from 7658.00-7668.75. 14 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 240m 7607.50-7638.75 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7650.50 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-03T16:20:00, one MES +$165.00
- Managed outcome: LQ1 at 2026-06-03T10:50:00, exit 7650.50, one MES +$28.75
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-03T10:35:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.
