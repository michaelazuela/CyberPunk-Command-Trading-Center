# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-23 / morning (2026-06-23T09:15:00 to 2026-06-23T12:00:00)
Context window: 275 days (2025-09-21T00:00:00 to 2026-06-24T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 46163 bars (2025-10-28T18:05:00 to 2026-06-24T23:55:00)
- 15m: 15406 bars (2025-10-28T18:15:00 to 2026-06-24T23:45:00)
- 60m: 3822 bars (2025-10-28T19:00:00 to 2026-06-24T23:00:00)
- 120m: 2003 bars (2025-10-28T20:00:00 to 2026-06-24T22:00:00)
- 240m: 1086 bars (2025-10-28T22:00:00 to 2026-06-24T22:00:00)

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
- Open below: 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status open_untouched; 120m LONG 7399.25-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00 status open_untouched; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status open_untouched; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status open_untouched; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch; 5m LONG 7247.75-7253.25 parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00 status partial_touch; 15m LONG 7244.75-7252.25 parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00 status partial_touch; 5m LONG 7240.75-7243.75 parent 2026-04-30T10:50:00 confirmed 2026-04-30T10:55:00 status open_untouched
- Failed above: 5m LONG 7434.50-7435.00 parent 2026-05-06T14:05:00 confirmed 2026-05-06T14:10:00 status failed_inverted; 5m LONG 7434.50-7435.00 parent 2026-05-19T20:35:00 confirmed 2026-05-19T20:40:00 status failed_inverted; 5m SHORT 7434.50-7437.75 parent 2026-05-19T21:30:00 confirmed 2026-05-19T21:35:00 status failed_inverted; 15m LONG 7434.50-7438.00 parent 2026-05-06T14:15:00 confirmed 2026-05-06T14:30:00 status failed_inverted; 15m SHORT 7434.50-7444.75 parent 2026-05-19T20:15:00 confirmed 2026-05-19T20:30:00 status failed_inverted; 15m LONG 7434.50-7436.25 parent 2026-05-19T20:45:00 confirmed 2026-05-19T21:00:00 status failed_inverted; 15m LONG 7434.50-7442.00 parent 2026-05-19T22:00:00 confirmed 2026-05-19T22:15:00 status failed_inverted; 15m LONG 7434.50-7441.75 parent 2026-06-09T20:00:00 confirmed 2026-06-09T20:15:00 status failed_inverted; 15m LONG 7434.50-7434.75 parent 2026-06-23T05:15:00 confirmed 2026-06-23T05:30:00 status failed_inverted; 60m LONG 7434.50-7442.50 parent 2026-05-06T15:00:00 confirmed 2026-05-06T16:00:00 status failed_inverted
- Open above: 15m SHORT 7440.50-7444.25 parent 2026-06-23T08:30:00 confirmed 2026-06-23T08:45:00 status open_untouched; 5m SHORT 7443.50-7444.25 parent 2026-06-23T08:20:00 confirmed 2026-06-23T08:25:00 status open_untouched; 120m SHORT 7446.00-7465.50 parent 2026-06-23T04:00:00 confirmed 2026-06-23T06:00:00 status partial_touch; 60m SHORT 7455.50-7465.50 parent 2026-06-23T03:00:00 confirmed 2026-06-23T04:00:00 status open_untouched; 15m SHORT 7458.75-7462.50 parent 2026-06-23T02:30:00 confirmed 2026-06-23T02:45:00 status open_untouched; 5m SHORT 7459.50-7461.50 parent 2026-06-23T02:25:00 confirmed 2026-06-23T02:30:00 status open_untouched; 60m SHORT 7472.25-7481.75 parent 2026-06-23T02:00:00 confirmed 2026-06-23T03:00:00 status open_untouched; 120m SHORT 7472.25-7496.50 parent 2026-06-23T02:00:00 confirmed 2026-06-23T04:00:00 status open_untouched; 5m SHORT 7477.50-7479.50 parent 2026-06-23T01:30:00 confirmed 2026-06-23T01:35:00 status open_untouched; 15m SHORT 7477.50-7482.75 parent 2026-06-23T01:30:00 confirmed 2026-06-23T01:45:00 status open_untouched

## Review Order
- Primary campaign to review first: LONG proof 2026-06-23T10:50:00 from 15M parent 2026-06-23T10:00:00 confirmed 2026-06-23T10:15:00.
- Defended-area management context: 5m SHORT 7467.75-7469.75 is a callout before/near T1, not an issue by itself.
- Later rows: 5 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7434.00-7436.00 parent 2026-06-23T09:45:00 confirmed 2026-06-23T10:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-23T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-23T11:45:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-23T11:50:00. | PASS entry_stop_risk_contract: Entry 7444.75, protected 5M stop 7415.00, risk 29.75 pts. | PASS tactical_targets_from_actual_risk: T1 7489.50 and T2 7504.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7445.00.
- Parent displacement: yes
- Parent displacement candle: 2026-06-23T09:45:00
- Parent failure: not found
- First 5M return: 2026-06-23T11:45:00
- 5M wick defense: none
- Proof: 2026-06-23T11:50:00
- Entry/stop/risk: 7444.75 / 7415.00 / 29.75 pts
- T1/T2: 7489.50 / 7504.25
- Nearest liquidity: nearest prior high liquidity 7445.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7445.00-7445.50 parent 2026-05-19T19:20:00 confirmed 2026-05-19T19:25:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-23T11:55:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7434.00-7436.00 parent 2026-06-23T09:45:00 confirmed 2026-06-23T10:00:00 defended_on_15m defended 2026-06-23T11:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7434.00-7436.00 parent 2026-06-23T09:45:00 confirmed 2026-06-23T10:00:00 defended_on_15m defended 2026-06-23T11:45:00
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-06-23T11:45:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 15m LONG 7434.00-7436.00 parent 2026-06-23T09:45:00 confirmed 2026-06-23T10:00:00 status partial_touch; 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status open_untouched; 120m LONG 7399.25-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00 status open_untouched; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status open_untouched; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status open_untouched; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7445.00-7445.50 parent 2026-05-19T19:20:00 confirmed 2026-05-19T19:25:00 status failed_inverted; 5m SHORT 7445.00-7446.00 parent 2026-05-19T20:00:00 confirmed 2026-05-19T20:05:00 status failed_inverted; 15m LONG 7445.00-7447.25 parent 2026-05-19T19:30:00 confirmed 2026-05-19T19:45:00 status failed_inverted; 15m SHORT 7445.00-7447.25 parent 2026-05-19T20:00:00 confirmed 2026-05-19T20:15:00 status failed_inverted; 15m SHORT 7445.00-7446.25 parent 2026-06-12T03:15:00 confirmed 2026-06-12T03:30:00 status failed_inverted; 15m LONG 7445.00-7452.00 parent 2026-06-12T03:45:00 confirmed 2026-06-12T04:00:00 status failed_inverted; 5m SHORT 7445.25-7462.25 parent 2026-06-12T09:45:00 confirmed 2026-06-12T09:50:00 status failed_inverted; 5m SHORT 7445.50-7448.00 parent 2026-05-06T18:05:00 confirmed 2026-05-06T18:10:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7449.50-7450.50 parent 2026-06-23T11:30:00 confirmed 2026-06-23T11:45:00 status open_untouched; 5m SHORT 7449.75-7451.00 parent 2026-06-23T11:20:00 confirmed 2026-06-23T11:25:00 status open_untouched; 60m LONG 7454.50-7459.75 parent 2026-06-23T10:00:00 confirmed 2026-06-23T11:00:00 status open_untouched; 5m SHORT 7457.00-7458.50 parent 2026-06-23T11:10:00 confirmed 2026-06-23T11:15:00 status partial_touch; 15m SHORT 7457.00-7459.75 parent 2026-06-23T11:15:00 confirmed 2026-06-23T11:30:00 status open_untouched; 120m SHORT 7472.25-7496.50 parent 2026-06-23T02:00:00 confirmed 2026-06-23T04:00:00 status open_untouched; 15m SHORT 7474.00-7475.75 parent 2026-06-23T10:45:00 confirmed 2026-06-23T11:00:00 status open_untouched; 60m SHORT 7488.25-7496.50 parent 2026-06-23T01:00:00 confirmed 2026-06-23T02:00:00 status partial_touch
- Objective ladder: open_fvg 7450.50 reached 2026-06-23T11:55:00 (15m SHORT open FVG open_untouched parent 2026-06-23T11:30:00 confirmed 2026-06-23T11:45:00); open_fvg 7451.00 reached 2026-06-23T11:55:00 (5m SHORT open FVG open_untouched parent 2026-06-23T11:20:00 confirmed 2026-06-23T11:25:00); open_fvg 7458.50 not reached (5m SHORT open FVG partial_touch parent 2026-06-23T11:10:00 confirmed 2026-06-23T11:15:00); open_fvg 7459.75 not reached (60m LONG open FVG open_untouched parent 2026-06-23T10:00:00 confirmed 2026-06-23T11:00:00); open_fvg 7459.75 not reached (15m SHORT open FVG open_untouched parent 2026-06-23T11:15:00 confirmed 2026-06-23T11:30:00); open_fvg 7475.75 not reached (15m SHORT open FVG open_untouched parent 2026-06-23T10:45:00 confirmed 2026-06-23T11:00:00); tactical 7489.50 not reached (T1 1.5R); liquidity 7491.25 not reached (prior 5M swing high liquidity from 2026-06-23T10:25:00); session_extreme 7491.25 not reached (RTH high liquidity before proof); open_fvg 7496.50 not reached (120m SHORT open FVG open_untouched parent 2026-06-23T02:00:00 confirmed 2026-06-23T04:00:00); open_fvg 7496.50 not reached (60m SHORT open FVG partial_touch parent 2026-06-23T01:00:00 confirmed 2026-06-23T02:00:00); tactical 7504.25 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-06-23T11:50:00 from 7434.00-7436.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7445.00-7445.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7450.50 open_fvg, 7451.00 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-24T11:00:00, one MES +$223.75
- Managed outcome: T1 at 2026-06-24T11:00:00, exit 7489.50, one MES +$223.75
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 2. LONG 15M FVG 7446.75-7463.75 parent 2026-06-23T10:00:00 confirmed 2026-06-23T10:15:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-23T10:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-23T11:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-23T10:50:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-23T10:50:00, 2026-06-23T11:00:00, 2026-06-23T11:15:00, 2026-06-23T12:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-23T10:50:00. | PASS entry_stop_risk_contract: Entry 7467.50, protected 5M stop 7415.00, risk 52.50 pts. | PASS tactical_targets_from_actual_risk: T1 7546.25 and T2 7572.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7467.75.
- Parent displacement: yes
- Parent displacement candle: 2026-06-23T10:00:00
- Parent failure: 2026-06-23T11:30:00
- First 5M return: 2026-06-23T10:50:00
- 5M wick defense: 2026-06-23T10:50:00, 2026-06-23T11:00:00, 2026-06-23T11:15:00, 2026-06-23T12:00:00
- Proof: 2026-06-23T10:50:00
- Entry/stop/risk: 7467.50 / 7415.00 / 52.50 pts
- T1/T2: 7546.25 / 7572.50
- Nearest liquidity: nearest prior high liquidity 7467.75
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7467.75-7469.75 parent 2026-05-19T05:20:00 confirmed 2026-05-19T05:25:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-23T10:55:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7434.00-7436.00 parent 2026-06-23T09:45:00 confirmed 2026-06-23T10:00:00 defended_on_15m defended 2026-06-23T11:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7434.00-7436.00 parent 2026-06-23T09:45:00 confirmed 2026-06-23T10:00:00 defended_on_15m defended 2026-06-23T11:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-23T10:50:00; wick 2026-06-23T10:50:00; proof 2026-06-23T10:50:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7491.25 (prior 5M swing high liquidity from 2026-06-23T10:25:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 15m LONG 7446.75-7463.75 parent 2026-06-23T10:00:00 confirmed 2026-06-23T10:15:00 status open_untouched; 5m LONG 7446.75-7457.25 parent 2026-06-23T09:50:00 confirmed 2026-06-23T09:55:00 status partial_touch; 15m LONG 7434.00-7436.00 parent 2026-06-23T09:45:00 confirmed 2026-06-23T10:00:00 status open_untouched; 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status open_untouched; 120m LONG 7399.25-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00 status open_untouched; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status open_untouched; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status open_untouched; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7467.75-7469.75 parent 2026-05-19T05:20:00 confirmed 2026-05-19T05:25:00 status failed_inverted; 15m SHORT 7467.75-7468.00 parent 2026-05-20T07:00:00 confirmed 2026-05-20T07:15:00 status failed_inverted; 5m SHORT 7468.00-7470.75 parent 2026-05-17T20:05:00 confirmed 2026-05-17T20:10:00 status failed_inverted; 5m LONG 7468.00-7471.50 parent 2026-05-18T12:15:00 confirmed 2026-05-18T12:20:00 status failed_inverted; 5m SHORT 7468.25-7469.75 parent 2026-06-11T15:50:00 confirmed 2026-06-11T15:55:00 status failed_inverted; 5m LONG 7468.25-7469.50 parent 2026-06-12T00:30:00 confirmed 2026-06-12T00:35:00 status failed_inverted; 15m SHORT 7468.25-7469.75 parent 2026-05-18T06:15:00 confirmed 2026-05-18T06:30:00 status failed_inverted; 15m LONG 7468.25-7472.25 parent 2026-06-08T19:00:00 confirmed 2026-06-08T19:15:00 status failed_inverted
- Open FVGs above at proof: 60m SHORT 7472.25-7481.75 parent 2026-06-23T02:00:00 confirmed 2026-06-23T03:00:00 status open_untouched; 120m SHORT 7472.25-7496.50 parent 2026-06-23T02:00:00 confirmed 2026-06-23T04:00:00 status open_untouched; 60m SHORT 7488.25-7496.50 parent 2026-06-23T01:00:00 confirmed 2026-06-23T02:00:00 status open_untouched; 5m SHORT 7493.75-7494.00 parent 2026-06-23T00:40:00 confirmed 2026-06-23T00:45:00 status open_untouched; 5m SHORT 7496.50-7499.75 parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00 status partial_touch; 15m SHORT 7496.75-7499.75 parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00 status open_untouched; 5m SHORT 7501.75-7502.75 parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00 status open_untouched; 5m SHORT 7504.00-7507.25 parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00 status open_untouched
- Objective ladder: open_fvg 7481.75 not reached (60m SHORT open FVG open_untouched parent 2026-06-23T02:00:00 confirmed 2026-06-23T03:00:00); liquidity 7491.25 not reached (prior 5M swing high liquidity from 2026-06-23T10:25:00); session_extreme 7491.25 not reached (RTH high liquidity before proof); open_fvg 7494.00 not reached (5m SHORT open FVG open_untouched parent 2026-06-23T00:40:00 confirmed 2026-06-23T00:45:00); open_fvg 7496.50 not reached (120m SHORT open FVG open_untouched parent 2026-06-23T02:00:00 confirmed 2026-06-23T04:00:00); open_fvg 7496.50 not reached (60m SHORT open FVG open_untouched parent 2026-06-23T01:00:00 confirmed 2026-06-23T02:00:00); open_fvg 7499.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00); open_fvg 7499.75 not reached (15m SHORT open FVG open_untouched parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00); open_fvg 7502.75 not reached (5m SHORT open FVG open_untouched parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00); open_fvg 7507.25 not reached (5m SHORT open FVG open_untouched parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00); tactical 7546.25 not reached (T1 1.5R); tactical 7572.50 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-06-23T10:50:00 from 7446.75-7463.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7467.75-7469.75 with reaction obstacle_defended_management_callout. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-24T13:35:00, one MES $-262.50
- Managed outcome: LQ1 at 2026-06-24T11:00:00, exit 7491.25, one MES +$118.75
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-06-23T10:50:00 before later same-zone failure/reversal read at 2026-06-23T11:30:00. Review the defended continuation before labeling this zone as failure/reversal.

### 3. LONG 15M FVG 7466.25-7475.75 parent 2026-06-23T10:15:00 confirmed 2026-06-23T10:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-23T10:15:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-23T11:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-23T10:30:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-23T10:30:00, 2026-06-23T10:50:00, 2026-06-23T11:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-23T10:30:00. | PASS entry_stop_risk_contract: Entry 7483.75, protected 5M stop 7454.75, risk 29.00 pts. | PASS tactical_targets_from_actual_risk: T1 7527.25 and T2 7541.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7484.00.
- Parent displacement: yes
- Parent displacement candle: 2026-06-23T10:15:00
- Parent failure: 2026-06-23T11:00:00
- First 5M return: 2026-06-23T10:30:00
- 5M wick defense: 2026-06-23T10:30:00, 2026-06-23T10:50:00, 2026-06-23T11:00:00
- Proof: 2026-06-23T10:30:00
- Entry/stop/risk: 7483.75 / 7454.75 / 29.00 pts
- T1/T2: 7527.25 / 7541.75
- Nearest liquidity: nearest prior high liquidity 7484.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7484.00-7484.25 parent 2026-05-08T13:20:00 confirmed 2026-05-08T13:25:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-23T10:35:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7434.00-7436.00 parent 2026-06-23T09:45:00 confirmed 2026-06-23T10:00:00 defended_on_15m defended 2026-06-23T11:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7434.00-7436.00 parent 2026-06-23T09:45:00 confirmed 2026-06-23T10:00:00 defended_on_15m defended 2026-06-23T11:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-23T10:30:00; wick 2026-06-23T10:30:00; proof 2026-06-23T10:30:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7491.25 (RTH high liquidity before proof)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 60m SHORT 7472.25-7481.75 parent 2026-06-23T02:00:00 confirmed 2026-06-23T03:00:00 status open_untouched; 15m LONG 7466.25-7475.75 parent 2026-06-23T10:15:00 confirmed 2026-06-23T10:30:00 status open_untouched; 5m LONG 7466.25-7470.75 parent 2026-06-23T10:05:00 confirmed 2026-06-23T10:10:00 status open_untouched; 15m LONG 7446.75-7463.75 parent 2026-06-23T10:00:00 confirmed 2026-06-23T10:15:00 status open_untouched; 5m LONG 7446.75-7457.25 parent 2026-06-23T09:50:00 confirmed 2026-06-23T09:55:00 status partial_touch; 15m LONG 7434.00-7436.00 parent 2026-06-23T09:45:00 confirmed 2026-06-23T10:00:00 status open_untouched; 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status open_untouched; 120m LONG 7399.25-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7484.00-7484.25 parent 2026-05-08T13:20:00 confirmed 2026-05-08T13:25:00 status failed_inverted; 5m SHORT 7484.00-7492.00 parent 2026-05-13T09:35:00 confirmed 2026-05-13T09:40:00 status failed_inverted; 5m LONG 7484.00-7485.50 parent 2026-05-19T03:40:00 confirmed 2026-05-19T03:45:00 status failed_inverted; 15m SHORT 7484.00-7487.25 parent 2026-05-19T04:15:00 confirmed 2026-05-19T04:30:00 status failed_inverted; 240m LONG 7484.00-7485.00 parent 2026-05-11T10:00:00 confirmed 2026-05-11T14:00:00 status failed_inverted; 5m SHORT 7484.25-7484.75 parent 2026-05-12T01:15:00 confirmed 2026-05-12T01:20:00 status failed_inverted; 5m LONG 7484.25-7485.75 parent 2026-05-12T01:25:00 confirmed 2026-05-12T01:30:00 status failed_inverted; 5m LONG 7484.25-7491.50 parent 2026-05-21T09:55:00 confirmed 2026-05-21T10:00:00 status failed_inverted
- Open FVGs above at proof: 60m SHORT 7488.25-7496.50 parent 2026-06-23T01:00:00 confirmed 2026-06-23T02:00:00 status open_untouched; 5m SHORT 7493.75-7494.00 parent 2026-06-23T00:40:00 confirmed 2026-06-23T00:45:00 status open_untouched; 5m SHORT 7496.50-7499.75 parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00 status partial_touch; 15m SHORT 7496.75-7499.75 parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00 status open_untouched; 5m SHORT 7501.75-7502.75 parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00 status open_untouched; 5m SHORT 7504.00-7507.25 parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00 status open_untouched; 15m SHORT 7513.75-7515.50 parent 2026-06-22T23:00:00 confirmed 2026-06-22T23:15:00 status open_untouched; 120m SHORT 7525.00-7525.50 parent 2026-06-22T22:00:00 confirmed 2026-06-23T00:00:00 status open_untouched
- Objective ladder: session_extreme 7491.25 not reached (RTH high liquidity before proof); open_fvg 7494.00 not reached (5m SHORT open FVG open_untouched parent 2026-06-23T00:40:00 confirmed 2026-06-23T00:45:00); open_fvg 7496.50 not reached (60m SHORT open FVG open_untouched parent 2026-06-23T01:00:00 confirmed 2026-06-23T02:00:00); open_fvg 7499.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00); open_fvg 7499.75 not reached (15m SHORT open FVG open_untouched parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00); open_fvg 7502.75 not reached (5m SHORT open FVG open_untouched parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00); open_fvg 7507.25 not reached (5m SHORT open FVG open_untouched parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00); open_fvg 7515.50 not reached (15m SHORT open FVG open_untouched parent 2026-06-22T23:00:00 confirmed 2026-06-22T23:15:00); open_fvg 7525.50 not reached (120m SHORT open FVG open_untouched parent 2026-06-22T22:00:00 confirmed 2026-06-23T00:00:00); tactical 7527.25 not reached (T1 1.5R); tactical 7541.75 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-06-23T10:30:00 from 7466.25-7475.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7484.00-7484.25 with reaction obstacle_defended_management_callout. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-23T11:10:00, one MES $-145.00
- Managed outcome: Stop at 2026-06-23T11:10:00, exit 7454.75, one MES $-145.00
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-06-23T10:30:00 before later same-zone failure/reversal read at 2026-06-23T11:00:00. Review the defended continuation before labeling this zone as failure/reversal.

### 4. SHORT 15M FVG 7474.00-7475.75 parent 2026-06-23T10:45:00 confirmed 2026-06-23T11:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-23T10:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-23T10:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7474.00-7475.75 parent 2026-06-23T10:45:00 confirmed 2026-06-23T11:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7474.00-7475.75 parent 2026-06-23T10:45:00 confirmed 2026-06-23T11:00:00 untested_by_15m
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

### 5. SHORT 15M FVG 7457.00-7459.75 parent 2026-06-23T11:15:00 confirmed 2026-06-23T11:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-23T11:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-23T11:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7474.00-7475.75 parent 2026-06-23T10:45:00 confirmed 2026-06-23T11:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7474.00-7475.75 parent 2026-06-23T10:45:00 confirmed 2026-06-23T11:00:00 untested_by_15m
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

### 6. SHORT 15M FVG 7449.50-7450.50 parent 2026-06-23T11:30:00 confirmed 2026-06-23T11:45:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-23T11:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-23T12:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-23T11:50:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-23T11:50:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-23T11:50:00. | PASS entry_stop_risk_contract: Entry 7444.75, protected 5M stop 7457.00, risk 12.25 pts. | PASS tactical_targets_from_actual_risk: T1 7426.50 and T2 7420.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7444.50.
- Parent displacement: yes
- Parent displacement candle: 2026-06-23T11:30:00
- Parent failure: 2026-06-23T12:00:00
- First 5M return: 2026-06-23T11:50:00
- 5M wick defense: 2026-06-23T11:50:00
- Proof: 2026-06-23T11:50:00
- Entry/stop/risk: 7444.75 / 7457.00 / 12.25 pts
- T1/T2: 7426.50 / 7420.25
- Nearest liquidity: nearest prior low liquidity 7444.50
- Defended-area / obstacle management callout before or near T1: 15m LONG 7434.00-7436.00 parent 2026-06-23T09:45:00 confirmed 2026-06-23T10:00:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-23T14:45:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7474.00-7475.75 parent 2026-06-23T10:45:00 confirmed 2026-06-23T11:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7474.00-7475.75 parent 2026-06-23T10:45:00 confirmed 2026-06-23T11:00:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-23T11:50:00; wick 2026-06-23T11:50:00; proof 2026-06-23T11:50:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7436.25 (prior 5M swing low liquidity from 2026-06-23T11:30:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - The near liquidity objective sat in the path but was not reached during the replay window.
- Open FVGs below at proof: 15m LONG 7434.00-7436.00 parent 2026-06-23T09:45:00 confirmed 2026-06-23T10:00:00 status partial_touch; 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status open_untouched; 120m LONG 7399.25-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00 status open_untouched; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status open_untouched; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status open_untouched; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7445.00-7445.50 parent 2026-05-19T19:20:00 confirmed 2026-05-19T19:25:00 status failed_inverted; 5m SHORT 7445.00-7446.00 parent 2026-05-19T20:00:00 confirmed 2026-05-19T20:05:00 status failed_inverted; 15m LONG 7445.00-7447.25 parent 2026-05-19T19:30:00 confirmed 2026-05-19T19:45:00 status failed_inverted; 15m SHORT 7445.00-7447.25 parent 2026-05-19T20:00:00 confirmed 2026-05-19T20:15:00 status failed_inverted; 15m SHORT 7445.00-7446.25 parent 2026-06-12T03:15:00 confirmed 2026-06-12T03:30:00 status failed_inverted; 15m LONG 7445.00-7452.00 parent 2026-06-12T03:45:00 confirmed 2026-06-12T04:00:00 status failed_inverted; 5m SHORT 7445.25-7462.25 parent 2026-06-12T09:45:00 confirmed 2026-06-12T09:50:00 status failed_inverted; 5m SHORT 7445.50-7448.00 parent 2026-05-06T18:05:00 confirmed 2026-05-06T18:10:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7449.50-7450.50 parent 2026-06-23T11:30:00 confirmed 2026-06-23T11:45:00 status open_untouched; 5m SHORT 7449.75-7451.00 parent 2026-06-23T11:20:00 confirmed 2026-06-23T11:25:00 status open_untouched; 60m LONG 7454.50-7459.75 parent 2026-06-23T10:00:00 confirmed 2026-06-23T11:00:00 status open_untouched; 5m SHORT 7457.00-7458.50 parent 2026-06-23T11:10:00 confirmed 2026-06-23T11:15:00 status partial_touch; 15m SHORT 7457.00-7459.75 parent 2026-06-23T11:15:00 confirmed 2026-06-23T11:30:00 status open_untouched; 120m SHORT 7472.25-7496.50 parent 2026-06-23T02:00:00 confirmed 2026-06-23T04:00:00 status open_untouched; 15m SHORT 7474.00-7475.75 parent 2026-06-23T10:45:00 confirmed 2026-06-23T11:00:00 status open_untouched; 60m SHORT 7488.25-7496.50 parent 2026-06-23T01:00:00 confirmed 2026-06-23T02:00:00 status partial_touch
- Objective ladder: liquidity 7436.25 not reached (prior 5M swing low liquidity from 2026-06-23T11:30:00); open_fvg 7434.00 not reached (15m LONG open FVG partial_touch parent 2026-06-23T09:45:00 confirmed 2026-06-23T10:00:00); tactical 7426.50 not reached (T1 1.5R); tactical 7420.25 not reached (T2 2.0R); liquidity 7415.00 not reached (prior 5M swing low liquidity from 2026-06-23T09:35:00); session_extreme 7415.00 not reached (RTH low liquidity before proof); open_fvg 7399.25 not reached (120m LONG open FVG open_untouched parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00); open_fvg 7386.00 not reached (60m LONG open FVG open_untouched parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00); open_fvg 7355.50 not reached (15m LONG open FVG open_untouched parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00); open_fvg 7345.25 not reached (5m LONG open FVG open_untouched parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00); open_fvg 7321.00 not reached (5m LONG open FVG partial_touch parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00); open_fvg 7318.25 not reached (5m LONG open FVG open_untouched parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00); open_fvg 7261.00 not reached (5m LONG open FVG partial_touch parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00)
- Story: SHORT proof completed at 2026-06-23T11:50:00 from 7449.50-7450.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 15m 7434.00-7436.00 with reaction obstacle_reached_then_continued. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-23T12:05:00, one MES $-61.25
- Managed outcome: Stop at 2026-06-23T12:05:00, exit 7457.00, one MES $-61.25
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-23T11:50:00 before later same-zone failure/reversal read at 2026-06-23T12:00:00. Review the defended continuation before labeling this zone as failure/reversal.
