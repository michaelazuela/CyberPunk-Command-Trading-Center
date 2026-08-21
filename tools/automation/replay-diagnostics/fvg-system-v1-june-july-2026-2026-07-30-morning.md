# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-30 / morning (2026-07-30T09:15:00 to 2026-07-30T12:00:00)
Context window: 275 days (2025-10-28T00:00:00 to 2026-07-31T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 53496 bars (2025-10-28T18:05:00 to 2026-07-31T17:00:00)
- 15m: 17854 bars (2025-10-28T18:15:00 to 2026-07-31T17:00:00)
- 60m: 4455 bars (2025-10-28T19:00:00 to 2026-07-31T17:00:00)
- 120m: 2340 bars (2025-10-28T20:00:00 to 2026-07-31T17:00:00)
- 240m: 1337 bars (2025-10-28T22:00:00 to 2026-07-31T17:00:00)

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
- Open below: 60m LONG 7392.25-7392.75 parent 2026-07-30T08:00:00 confirmed 2026-07-30T09:00:00 status open_untouched; 5m LONG 7387.50-7388.75 parent 2026-07-30T07:05:00 confirmed 2026-07-30T07:10:00 status open_untouched; 15m LONG 7382.50-7384.00 parent 2026-07-30T06:30:00 confirmed 2026-07-30T06:45:00 status partial_touch; 5m LONG 7382.50-7383.50 parent 2026-07-30T06:20:00 confirmed 2026-07-30T06:25:00 status partial_touch; 5m LONG 7360.25-7367.50 parent 2026-07-30T04:10:00 confirmed 2026-07-30T04:15:00 status partial_touch; 15m LONG 7343.75-7366.50 parent 2026-07-29T18:15:00 confirmed 2026-07-29T18:30:00 status partial_touch; 5m LONG 7343.75-7352.50 parent 2026-07-29T18:05:00 confirmed 2026-07-29T18:10:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch
- Failed above: 5m SHORT 7403.00-7425.75 parent 2026-06-09T11:30:00 confirmed 2026-06-09T11:35:00 status failed_inverted; 5m LONG 7403.25-7410.50 parent 2026-06-26T16:15:00 confirmed 2026-06-26T16:20:00 status failed_inverted; 5m LONG 7403.75-7404.50 parent 2026-05-06T05:55:00 confirmed 2026-05-06T06:00:00 status failed_inverted; 5m LONG 7404.00-7404.50 parent 2026-06-10T06:45:00 confirmed 2026-06-10T06:50:00 status failed_inverted; 5m SHORT 7404.25-7414.25 parent 2026-06-10T04:45:00 confirmed 2026-06-10T04:50:00 status failed_inverted; 5m LONG 7404.50-7408.75 parent 2026-07-29T13:05:00 confirmed 2026-07-29T13:10:00 status failed_inverted; 15m LONG 7404.50-7413.00 parent 2026-07-29T13:15:00 confirmed 2026-07-29T13:30:00 status failed_inverted; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status failed_inverted; 15m SHORT 7404.75-7410.50 parent 2026-06-26T16:45:00 confirmed 2026-06-26T17:00:00 status failed_inverted; 5m LONG 7405.50-7414.25 parent 2026-06-26T10:05:00 confirmed 2026-06-26T10:10:00 status failed_inverted
- Open above: 15m SHORT 7411.00-7434.25 parent 2026-07-29T15:30:00 confirmed 2026-07-29T15:45:00 status open_untouched; 5m SHORT 7411.25-7427.75 parent 2026-07-29T15:25:00 confirmed 2026-07-29T15:30:00 status open_untouched; 5m SHORT 7431.00-7434.25 parent 2026-07-29T15:20:00 confirmed 2026-07-29T15:25:00 status open_untouched; 5m SHORT 7447.50-7456.50 parent 2026-07-29T15:10:00 confirmed 2026-07-29T15:15:00 status partial_touch; 15m SHORT 7452.25-7460.50 parent 2026-07-29T15:15:00 confirmed 2026-07-29T15:30:00 status open_untouched; 5m SHORT 7461.50-7471.00 parent 2026-07-29T15:05:00 confirmed 2026-07-29T15:10:00 status open_untouched; 60m SHORT 7479.25-7504.50 parent 2026-07-27T10:00:00 confirmed 2026-07-27T11:00:00 status partial_touch; 120m SHORT 7479.25-7508.00 parent 2026-07-27T10:00:00 confirmed 2026-07-27T12:00:00 status partial_touch; 240m SHORT 7479.25-7505.50 parent 2026-07-27T10:00:00 confirmed 2026-07-27T14:00:00 status partial_touch; 5m SHORT 7500.00-7504.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T09:50:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof 2026-07-30T09:45:00 from 15M parent 2026-07-30T09:15:00 confirmed 2026-07-30T09:30:00.
- Defended-area management context: 5m LONG 7418.00-7418.25 is a callout before/near T1, not an issue by itself.
- Later rows: 4 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7400.75-7401.25 parent 2026-07-30T09:15:00 confirmed 2026-07-30T09:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-30T09:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-30T09:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-30T09:45:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-30T09:45:00. | PASS entry_stop_risk_contract: Entry 7417.50, protected 5M stop 7392.75, risk 24.75 pts. | PASS tactical_targets_from_actual_risk: T1 7454.75 and T2 7467.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7417.75.
- Parent displacement: yes
- Parent displacement candle: 2026-07-30T09:30:00
- Parent failure: not found
- First 5M return: 2026-07-30T09:45:00
- 5M wick defense: 2026-07-30T09:45:00
- Proof: 2026-07-30T09:45:00
- Entry/stop/risk: 7417.50 / 7392.75 / 24.75 pts
- T1/T2: 7454.75 / 7467.00
- Nearest liquidity: nearest prior high liquidity 7417.75
- Defended-area / obstacle management callout before or near T1: 5m LONG 7418.00-7418.25 parent 2026-05-07T19:45:00 confirmed 2026-05-07T19:50:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-30T09:50:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7400.75-7401.25 parent 2026-07-30T09:15:00 confirmed 2026-07-30T09:30:00 defended_on_15m defended 2026-07-30T09:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7400.75-7401.25 parent 2026-07-30T09:15:00 confirmed 2026-07-30T09:30:00 defended_on_15m defended 2026-07-30T09:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-30T09:45:00; wick 2026-07-30T09:45:00; proof 2026-07-30T09:45:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 60m LONG 7392.25-7392.75 parent 2026-07-30T08:00:00 confirmed 2026-07-30T09:00:00 status open_untouched; 5m LONG 7387.50-7388.75 parent 2026-07-30T07:05:00 confirmed 2026-07-30T07:10:00 status open_untouched; 15m LONG 7382.50-7384.00 parent 2026-07-30T06:30:00 confirmed 2026-07-30T06:45:00 status partial_touch; 5m LONG 7382.50-7383.50 parent 2026-07-30T06:20:00 confirmed 2026-07-30T06:25:00 status partial_touch; 5m LONG 7360.25-7367.50 parent 2026-07-30T04:10:00 confirmed 2026-07-30T04:15:00 status partial_touch; 15m LONG 7343.75-7366.50 parent 2026-07-29T18:15:00 confirmed 2026-07-29T18:30:00 status partial_touch; 5m LONG 7343.75-7352.50 parent 2026-07-29T18:05:00 confirmed 2026-07-29T18:10:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7418.00-7418.25 parent 2026-05-07T19:45:00 confirmed 2026-05-07T19:50:00 status failed_inverted; 5m SHORT 7418.25-7424.75 parent 2026-06-24T14:50:00 confirmed 2026-06-24T14:55:00 status failed_inverted; 5m SHORT 7418.75-7423.25 parent 2026-06-25T21:30:00 confirmed 2026-06-25T21:35:00 status failed_inverted; 5m SHORT 7418.75-7423.25 parent 2026-07-29T10:15:00 confirmed 2026-07-29T10:20:00 status failed_inverted; 15m LONG 7418.75-7421.25 parent 2026-06-24T16:00:00 confirmed 2026-06-24T16:15:00 status failed_inverted; 5m SHORT 7419.00-7421.25 parent 2026-05-07T14:45:00 confirmed 2026-05-07T14:50:00 status failed_inverted; 5m SHORT 7419.25-7420.00 parent 2026-05-07T15:20:00 confirmed 2026-05-07T15:25:00 status failed_inverted; 5m LONG 7419.50-7423.00 parent 2026-05-07T14:00:00 confirmed 2026-05-07T14:05:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7431.00-7434.25 parent 2026-07-29T15:20:00 confirmed 2026-07-29T15:25:00 status open_untouched; 5m SHORT 7447.50-7456.50 parent 2026-07-29T15:10:00 confirmed 2026-07-29T15:15:00 status partial_touch; 15m SHORT 7452.25-7460.50 parent 2026-07-29T15:15:00 confirmed 2026-07-29T15:30:00 status open_untouched; 5m SHORT 7461.50-7471.00 parent 2026-07-29T15:05:00 confirmed 2026-07-29T15:10:00 status open_untouched; 60m SHORT 7479.25-7504.50 parent 2026-07-27T10:00:00 confirmed 2026-07-27T11:00:00 status partial_touch; 120m SHORT 7479.25-7508.00 parent 2026-07-27T10:00:00 confirmed 2026-07-27T12:00:00 status partial_touch; 240m SHORT 7479.25-7505.50 parent 2026-07-27T10:00:00 confirmed 2026-07-27T14:00:00 status partial_touch; 5m SHORT 7500.00-7504.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T09:50:00 status partial_touch
- Objective ladder: open_fvg 7434.25 reached 2026-07-30T09:55:00 (5m SHORT open FVG open_untouched parent 2026-07-29T15:20:00 confirmed 2026-07-29T15:25:00); tactical 7454.75 not reached (T1 1.5R); open_fvg 7456.50 not reached (5m SHORT open FVG partial_touch parent 2026-07-29T15:10:00 confirmed 2026-07-29T15:15:00); open_fvg 7460.50 not reached (15m SHORT open FVG open_untouched parent 2026-07-29T15:15:00 confirmed 2026-07-29T15:30:00); tactical 7467.00 not reached (T2 2.0R); open_fvg 7471.00 not reached (5m SHORT open FVG open_untouched parent 2026-07-29T15:05:00 confirmed 2026-07-29T15:10:00); open_fvg 7504.00 not reached (5m SHORT open FVG partial_touch parent 2026-07-27T09:45:00 confirmed 2026-07-27T09:50:00); open_fvg 7504.50 not reached (60m SHORT open FVG partial_touch parent 2026-07-27T10:00:00 confirmed 2026-07-27T11:00:00); open_fvg 7505.50 not reached (240m SHORT open FVG partial_touch parent 2026-07-27T10:00:00 confirmed 2026-07-27T14:00:00); open_fvg 7508.00 not reached (120m SHORT open FVG partial_touch parent 2026-07-27T10:00:00 confirmed 2026-07-27T12:00:00)
- Story: LONG proof completed at 2026-07-30T09:45:00 from 7400.75-7401.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7418.00-7418.25 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7434.25 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-30T13:05:00, one MES +$186.25
- Managed outcome: T1 at 2026-07-30T13:05:00, exit 7454.75, one MES +$186.25
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-30T09:45:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 2. LONG 15M FVG 7415.00-7417.00 parent 2026-07-30T09:45:00 confirmed 2026-07-30T10:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-30T09:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-30T11:15:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-30T10:55:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-30T11:00:00, 2026-07-30T11:05:00, 2026-07-30T11:10:00, 2026-07-30T11:40:00, 2026-07-30T11:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-30T11:10:00. | PASS entry_stop_risk_contract: Entry 7420.50, protected 5M stop 7399.75, risk 20.75 pts. | PASS tactical_targets_from_actual_risk: T1 7451.75 and T2 7462.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7420.75. | FAIL first_valid_same_parent_proof: Earlier same-side completed 5M proof from the same parent displacement already completed at 2026-07-30T09:45:00. Later same-parent rows are management/re-entry context unless a reset rule is explicitly approved.
- Parent displacement: yes
- Parent displacement candle: 2026-07-30T09:30:00
- Parent failure: 2026-07-30T11:15:00
- First 5M return: 2026-07-30T10:55:00
- 5M wick defense: 2026-07-30T11:00:00, 2026-07-30T11:05:00, 2026-07-30T11:10:00, 2026-07-30T11:40:00, 2026-07-30T11:55:00
- Proof: 2026-07-30T11:10:00
- Entry/stop/risk: 7420.50 / 7399.75 / 20.75 pts
- T1/T2: 7451.75 / 7462.00
- Nearest liquidity: nearest prior high liquidity 7420.75
- Defended-area / obstacle management callout before or near T1: 15m LONG 7421.00-7427.50 parent 2026-06-25T16:00:00 confirmed 2026-06-25T16:15:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-30T11:45:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7400.75-7401.25 parent 2026-07-30T09:15:00 confirmed 2026-07-30T09:30:00 defended_on_15m defended 2026-07-30T09:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7400.75-7401.25 parent 2026-07-30T09:15:00 confirmed 2026-07-30T09:30:00 defended_on_15m defended 2026-07-30T09:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-30T10:55:00; wick 2026-07-30T11:00:00; proof 2026-07-30T11:10:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7443.75 (prior 5M swing high liquidity from 2026-07-30T10:05:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - The near liquidity objective sat in the path but was not reached during the replay window.
- Open FVGs below at proof: 60m LONG 7408.50-7408.75 parent 2026-07-30T10:00:00 confirmed 2026-07-30T11:00:00 status open_untouched; 60m LONG 7392.25-7392.75 parent 2026-07-30T08:00:00 confirmed 2026-07-30T09:00:00 status open_untouched; 120m LONG 7388.00-7392.75 parent 2026-07-30T08:00:00 confirmed 2026-07-30T10:00:00 status open_untouched; 5m LONG 7387.50-7388.75 parent 2026-07-30T07:05:00 confirmed 2026-07-30T07:10:00 status open_untouched; 15m LONG 7382.50-7384.00 parent 2026-07-30T06:30:00 confirmed 2026-07-30T06:45:00 status partial_touch; 5m LONG 7382.50-7383.50 parent 2026-07-30T06:20:00 confirmed 2026-07-30T06:25:00 status partial_touch; 5m LONG 7360.25-7367.50 parent 2026-07-30T04:10:00 confirmed 2026-07-30T04:15:00 status partial_touch; 15m LONG 7343.75-7366.50 parent 2026-07-29T18:15:00 confirmed 2026-07-29T18:30:00 status partial_touch
- Failed FVGs above at proof: 15m LONG 7421.00-7427.50 parent 2026-06-25T16:00:00 confirmed 2026-06-25T16:15:00 status failed_inverted; 5m LONG 7421.50-7422.75 parent 2026-06-09T14:20:00 confirmed 2026-06-09T14:25:00 status failed_inverted; 5m LONG 7421.50-7424.00 parent 2026-07-30T09:50:00 confirmed 2026-07-30T09:55:00 status failed_inverted; 15m LONG 7421.50-7427.50 parent 2026-07-30T10:00:00 confirmed 2026-07-30T10:15:00 status failed_inverted; 5m SHORT 7421.75-7423.25 parent 2026-06-25T13:45:00 confirmed 2026-06-25T13:50:00 status failed_inverted; 5m LONG 7422.00-7423.25 parent 2026-05-07T19:55:00 confirmed 2026-05-07T20:00:00 status failed_inverted; 5m SHORT 7422.00-7422.75 parent 2026-06-10T01:20:00 confirmed 2026-06-10T01:25:00 status failed_inverted; 5m LONG 7422.00-7422.25 parent 2026-06-10T01:30:00 confirmed 2026-06-10T01:35:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7426.75-7430.00 parent 2026-07-30T10:50:00 confirmed 2026-07-30T10:55:00 status open_untouched; 5m SHORT 7447.50-7456.50 parent 2026-07-29T15:10:00 confirmed 2026-07-29T15:15:00 status partial_touch; 15m SHORT 7452.25-7460.50 parent 2026-07-29T15:15:00 confirmed 2026-07-29T15:30:00 status open_untouched; 5m SHORT 7461.50-7471.00 parent 2026-07-29T15:05:00 confirmed 2026-07-29T15:10:00 status open_untouched; 60m SHORT 7479.25-7504.50 parent 2026-07-27T10:00:00 confirmed 2026-07-27T11:00:00 status partial_touch; 120m SHORT 7479.25-7508.00 parent 2026-07-27T10:00:00 confirmed 2026-07-27T12:00:00 status partial_touch; 240m SHORT 7479.25-7505.50 parent 2026-07-27T10:00:00 confirmed 2026-07-27T14:00:00 status partial_touch; 5m SHORT 7500.00-7504.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T09:50:00 status partial_touch
- Objective ladder: open_fvg 7430.00 not reached (5m SHORT open FVG open_untouched parent 2026-07-30T10:50:00 confirmed 2026-07-30T10:55:00); liquidity 7443.75 not reached (prior 5M swing high liquidity from 2026-07-30T10:05:00); liquidity 7444.50 not reached (prior 5M swing high liquidity from 2026-07-30T10:45:00); liquidity 7446.50 not reached (prior 5M swing high liquidity from 2026-07-30T10:30:00); session_extreme 7446.50 not reached (RTH high liquidity before proof); tactical 7451.75 not reached (T1 1.5R); open_fvg 7456.50 not reached (5m SHORT open FVG partial_touch parent 2026-07-29T15:10:00 confirmed 2026-07-29T15:15:00); open_fvg 7460.50 not reached (15m SHORT open FVG open_untouched parent 2026-07-29T15:15:00 confirmed 2026-07-29T15:30:00); tactical 7462.00 not reached (T2 2.0R); open_fvg 7471.00 not reached (5m SHORT open FVG open_untouched parent 2026-07-29T15:05:00 confirmed 2026-07-29T15:10:00); open_fvg 7504.00 not reached (5m SHORT open FVG partial_touch parent 2026-07-27T09:45:00 confirmed 2026-07-27T09:50:00); open_fvg 7504.50 not reached (60m SHORT open FVG partial_touch parent 2026-07-27T10:00:00 confirmed 2026-07-27T11:00:00); open_fvg 7505.50 not reached (240m SHORT open FVG partial_touch parent 2026-07-27T10:00:00 confirmed 2026-07-27T14:00:00); open_fvg 7508.00 not reached (120m SHORT open FVG partial_touch parent 2026-07-27T10:00:00 confirmed 2026-07-27T12:00:00)
- Story: LONG proof completed at 2026-07-30T11:10:00 from 7415.00-7417.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 15m 7421.00-7427.50 with reaction obstacle_reached_then_continued. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-30T11:20:00, one MES $-103.75
- Managed outcome: Stop at 2026-07-30T11:20:00, exit 7399.75, one MES $-103.75
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-30T11:10:00 before later same-zone failure/reversal read at 2026-07-30T11:15:00. Review the defended continuation before labeling this zone as failure/reversal. Late same-parent FVG continuation blocked. Earlier same-side completed 5M proof from the same parent displacement already completed at 2026-07-30T09:45:00. Later same-parent rows are management/re-entry context unless a reset rule is explicitly approved.

### 3. LONG 15M FVG 7421.50-7427.50 parent 2026-07-30T10:00:00 confirmed 2026-07-30T10:15:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-30T10:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-30T11:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-30T10:15:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-30T10:15:00, 2026-07-30T11:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-30T10:15:00. | PASS entry_stop_risk_contract: Entry 7433.00, protected 5M stop 7399.75, risk 33.25 pts. | PASS tactical_targets_from_actual_risk: T1 7483.00 and T2 7499.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7433.25.
- Parent displacement: yes
- Parent displacement candle: 2026-07-30T10:00:00
- Parent failure: 2026-07-30T11:00:00
- First 5M return: 2026-07-30T10:15:00
- 5M wick defense: 2026-07-30T10:15:00, 2026-07-30T11:55:00
- Proof: 2026-07-30T10:15:00
- Entry/stop/risk: 7433.00 / 7399.75 / 33.25 pts
- T1/T2: 7483.00 / 7499.50
- Nearest liquidity: nearest prior high liquidity 7433.25
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7433.25-7433.50 parent 2026-05-20T01:15:00 confirmed 2026-05-20T01:20:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-30T10:20:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7400.75-7401.25 parent 2026-07-30T09:15:00 confirmed 2026-07-30T09:30:00 defended_on_15m defended 2026-07-30T09:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7400.75-7401.25 parent 2026-07-30T09:15:00 confirmed 2026-07-30T09:30:00 defended_on_15m defended 2026-07-30T09:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-30T10:15:00; wick 2026-07-30T10:15:00; proof 2026-07-30T10:15:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7443.75 (RTH high liquidity before proof)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no defended FVG management objective interrupted delivery.
- Open FVGs below at proof: 15m LONG 7421.50-7427.50 parent 2026-07-30T10:00:00 confirmed 2026-07-30T10:15:00 status open_untouched; 5m LONG 7421.50-7424.00 parent 2026-07-30T09:50:00 confirmed 2026-07-30T09:55:00 status open_untouched; 5m LONG 7414.50-7417.00 parent 2026-07-30T09:45:00 confirmed 2026-07-30T09:50:00 status open_untouched; 15m LONG 7415.00-7417.00 parent 2026-07-30T09:45:00 confirmed 2026-07-30T10:00:00 status open_untouched; 60m LONG 7392.25-7392.75 parent 2026-07-30T08:00:00 confirmed 2026-07-30T09:00:00 status open_untouched; 120m LONG 7388.00-7392.75 parent 2026-07-30T08:00:00 confirmed 2026-07-30T10:00:00 status open_untouched; 5m LONG 7387.50-7388.75 parent 2026-07-30T07:05:00 confirmed 2026-07-30T07:10:00 status open_untouched; 15m LONG 7382.50-7384.00 parent 2026-07-30T06:30:00 confirmed 2026-07-30T06:45:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7433.25-7433.50 parent 2026-05-20T01:15:00 confirmed 2026-05-20T01:20:00 status failed_inverted; 5m SHORT 7433.25-7434.75 parent 2026-06-28T20:20:00 confirmed 2026-06-28T20:25:00 status failed_inverted; 5m SHORT 7433.25-7435.25 parent 2026-07-27T12:15:00 confirmed 2026-07-27T12:20:00 status failed_inverted; 5m LONG 7433.25-7435.25 parent 2026-07-27T12:25:00 confirmed 2026-07-27T12:30:00 status failed_inverted; 5m LONG 7433.50-7435.25 parent 2026-07-23T12:00:00 confirmed 2026-07-23T12:05:00 status failed_inverted; 5m SHORT 7433.50-7437.25 parent 2026-07-23T14:00:00 confirmed 2026-07-23T14:05:00 status failed_inverted; 5m SHORT 7433.50-7436.75 parent 2026-07-27T11:35:00 confirmed 2026-07-27T11:40:00 status failed_inverted; 5m SHORT 7433.50-7435.25 parent 2026-07-28T09:45:00 confirmed 2026-07-28T09:50:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7447.50-7456.50 parent 2026-07-29T15:10:00 confirmed 2026-07-29T15:15:00 status partial_touch; 15m SHORT 7452.25-7460.50 parent 2026-07-29T15:15:00 confirmed 2026-07-29T15:30:00 status open_untouched; 5m SHORT 7461.50-7471.00 parent 2026-07-29T15:05:00 confirmed 2026-07-29T15:10:00 status open_untouched; 60m SHORT 7479.25-7504.50 parent 2026-07-27T10:00:00 confirmed 2026-07-27T11:00:00 status partial_touch; 120m SHORT 7479.25-7508.00 parent 2026-07-27T10:00:00 confirmed 2026-07-27T12:00:00 status partial_touch; 240m SHORT 7479.25-7505.50 parent 2026-07-27T10:00:00 confirmed 2026-07-27T14:00:00 status partial_touch; 5m SHORT 7500.00-7504.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T09:50:00 status partial_touch; 15m SHORT 7500.00-7507.00 parent 2026-07-27T09:45:00 confirmed 2026-07-27T10:00:00 status partial_touch
- Objective ladder: session_extreme 7443.75 reached 2026-07-30T10:30:00 (RTH high liquidity before proof); open_fvg 7456.50 not reached (5m SHORT open FVG partial_touch parent 2026-07-29T15:10:00 confirmed 2026-07-29T15:15:00); open_fvg 7460.50 not reached (15m SHORT open FVG open_untouched parent 2026-07-29T15:15:00 confirmed 2026-07-29T15:30:00); open_fvg 7471.00 not reached (5m SHORT open FVG open_untouched parent 2026-07-29T15:05:00 confirmed 2026-07-29T15:10:00); tactical 7483.00 not reached (T1 1.5R); tactical 7499.50 not reached (T2 2.0R); open_fvg 7504.00 not reached (5m SHORT open FVG partial_touch parent 2026-07-27T09:45:00 confirmed 2026-07-27T09:50:00); open_fvg 7504.50 not reached (60m SHORT open FVG partial_touch parent 2026-07-27T10:00:00 confirmed 2026-07-27T11:00:00); open_fvg 7505.50 not reached (240m SHORT open FVG partial_touch parent 2026-07-27T10:00:00 confirmed 2026-07-27T14:00:00); open_fvg 7507.00 not reached (15m SHORT open FVG partial_touch parent 2026-07-27T09:45:00 confirmed 2026-07-27T10:00:00); open_fvg 7508.00 not reached (120m SHORT open FVG partial_touch parent 2026-07-27T10:00:00 confirmed 2026-07-27T12:00:00)
- Story: LONG proof completed at 2026-07-30T10:15:00 from 7421.50-7427.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7433.25-7433.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7443.75 session_extreme. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-30T11:20:00, one MES $-166.25
- Managed outcome: LQ1 at 2026-07-30T10:30:00, exit 7443.75, one MES +$53.75
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-30T10:15:00 before later same-zone failure/reversal read at 2026-07-30T11:00:00. Review the defended continuation before labeling this zone as failure/reversal.

### 4. SHORT 15M FVG 7421.25-7430.00 parent 2026-07-30T11:00:00 confirmed 2026-07-30T11:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-30T11:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-30T11:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-30T12:00:00. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-30T11:00:00
- Parent failure: not found
- First 5M return: 2026-07-30T11:45:00
- 5M wick defense: 2026-07-30T12:00:00
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7421.25-7430.00 parent 2026-07-30T11:00:00 confirmed 2026-07-30T11:15:00 defended_on_15m defended 2026-07-30T11:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7421.25-7430.00 parent 2026-07-30T11:00:00 confirmed 2026-07-30T11:15:00 defended_on_15m defended 2026-07-30T11:45:00
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-07-30T11:45:00; wick 2026-07-30T12:00:00; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 5. LONG 15M FVG 7414.50-7416.25 parent 2026-07-30T11:45:00 confirmed 2026-07-30T12:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-30T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-30T11:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7400.75-7401.25 parent 2026-07-30T09:15:00 confirmed 2026-07-30T09:30:00 defended_on_15m defended 2026-07-30T09:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7400.75-7401.25 parent 2026-07-30T09:15:00 confirmed 2026-07-30T09:30:00 defended_on_15m defended 2026-07-30T09:45:00
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
