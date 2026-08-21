# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-01 / lunch (2026-06-01T12:00:00 to 2026-06-01T16:00:00)
Context window: 275 days (2025-08-30T00:00:00 to 2026-06-02T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 41795 bars (2025-10-28T18:05:00 to 2026-06-02T23:55:00)
- 15m: 13934 bars (2025-10-28T18:15:00 to 2026-06-02T23:45:00)
- 60m: 3442 bars (2025-10-28T19:00:00 to 2026-06-02T23:00:00)
- 120m: 1797 bars (2025-10-28T20:00:00 to 2026-06-02T22:00:00)
- 240m: 909 bars (2025-10-28T22:00:00 to 2026-06-02T22:00:00)

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
- Open below: 15m LONG 7655.75-7658.50 parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00 status open_untouched; 240m LONG 7607.50-7638.75 parent 2026-05-28T14:00:00 confirmed 2026-05-28T17:00:00 status partial_touch; 120m LONG 7607.50-7634.25 parent 2026-05-28T12:00:00 confirmed 2026-05-28T14:00:00 status open_untouched; 5m LONG 7633.25-7634.00 parent 2026-05-28T11:25:00 confirmed 2026-05-28T11:30:00 status open_untouched; 5m LONG 7626.50-7632.00 parent 2026-05-28T11:05:00 confirmed 2026-05-28T11:10:00 status partial_touch; 15m LONG 7627.00-7628.50 parent 2026-05-28T11:15:00 confirmed 2026-05-28T11:30:00 status open_untouched; 60m LONG 7607.50-7625.00 parent 2026-05-28T11:00:00 confirmed 2026-05-28T12:00:00 status open_untouched; 5m LONG 7603.75-7619.00 parent 2026-05-28T10:15:00 confirmed 2026-05-28T10:20:00 status partial_touch; 15m LONG 7600.75-7616.75 parent 2026-05-28T10:15:00 confirmed 2026-05-28T10:30:00 status partial_touch; 120m LONG 7558.50-7598.50 parent 2026-05-24T20:00:00 confirmed 2026-05-24T22:00:00 status partial_touch
- Failed above: 15m LONG 7659.25-7662.50 parent 2026-05-29T15:30:00 confirmed 2026-05-29T15:45:00 status failed_inverted; 5m LONG 7660.25-7662.50 parent 2026-05-29T15:30:00 confirmed 2026-05-29T15:35:00 status failed_inverted; 5m SHORT 7660.75-7661.00 parent 2026-05-29T13:25:00 confirmed 2026-05-29T13:30:00 status failed_inverted; 15m LONG 7661.00-7663.25 parent 2026-05-31T18:45:00 confirmed 2026-05-31T19:00:00 status failed_inverted; 5m LONG 7661.25-7662.25 parent 2026-05-29T12:05:00 confirmed 2026-05-29T12:10:00 status failed_inverted; 5m LONG 7661.25-7663.25 parent 2026-05-31T18:45:00 confirmed 2026-05-31T18:50:00 status failed_inverted; 5m LONG 7661.75-7662.50 parent 2026-05-29T11:15:00 confirmed 2026-05-29T11:20:00 status failed_inverted; 5m LONG 7662.25-7667.25 parent 2026-05-29T09:45:00 confirmed 2026-05-29T09:50:00 status failed_inverted; 5m SHORT 7662.50-7663.75 parent 2026-05-29T15:55:00 confirmed 2026-05-29T16:00:00 status failed_inverted; 5m LONG 7663.00-7664.75 parent 2026-05-29T15:35:00 confirmed 2026-05-29T15:40:00 status failed_inverted
- Open above: 60m SHORT 7659.75-7669.75 parent 2026-06-01T10:00:00 confirmed 2026-06-01T11:00:00 status partial_touch; 5m SHORT 7660.25-7668.75 parent 2026-06-01T09:15:00 confirmed 2026-06-01T09:20:00 status partial_touch; 15m SHORT 7660.25-7671.50 parent 2026-06-01T09:15:00 confirmed 2026-06-01T09:30:00 status partial_touch; 120m SHORT 7666.50-7673.50 parent 2026-06-01T10:00:00 confirmed 2026-06-01T12:00:00 status open_untouched; 60m SHORT 7673.50-7677.25 parent 2026-06-01T09:00:00 confirmed 2026-06-01T10:00:00 status open_untouched; 5m SHORT 7673.75-7675.50 parent 2026-06-01T08:55:00 confirmed 2026-06-01T09:00:00 status open_untouched; 5m SHORT 7679.00-7680.75 parent 2026-06-01T07:55:00 confirmed 2026-06-01T08:00:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof 2026-06-01T12:30:00 from 15M parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00.
- Defended-area management context: 5m SHORT 7660.25-7668.75 is a callout before/near T1, not an issue by itself.
- Later rows: 2 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7655.75-7658.50 parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-01T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-01T12:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-01T12:20:00, 2026-06-01T12:30:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-01T12:30:00. | PASS entry_stop_risk_contract: Entry 7659.75, protected 5M stop 7650.50, risk 9.25 pts. | PASS tactical_targets_from_actual_risk: T1 7673.75 and T2 7678.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7660.00.
- Parent displacement: yes
- Parent displacement candle: 2026-06-01T11:45:00
- Parent failure: not found
- First 5M return: 2026-06-01T12:00:00
- 5M wick defense: 2026-06-01T12:20:00, 2026-06-01T12:30:00
- Proof: 2026-06-01T12:30:00
- Entry/stop/risk: 7659.75 / 7650.50 / 9.25 pts
- T1/T2: 7673.75 / 7678.25
- Nearest liquidity: nearest prior high liquidity 7660.00
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7660.25-7668.75 parent 2026-06-01T09:15:00 confirmed 2026-06-01T09:20:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-01T12:35:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7655.75-7658.50 parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00 defended_on_15m defended 2026-06-01T12:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7655.75-7658.50 parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00 defended_on_15m defended 2026-06-01T12:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-01T12:00:00; wick 2026-06-01T12:30:00; proof 2026-06-01T12:30:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7664.00 (prior 5M swing high liquidity from 2026-06-01T12:05:00)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no defended FVG management objective interrupted delivery.
- Open FVGs below at proof: 240m LONG 7607.50-7638.75 parent 2026-05-28T14:00:00 confirmed 2026-05-28T17:00:00 status partial_touch; 120m LONG 7607.50-7634.25 parent 2026-05-28T12:00:00 confirmed 2026-05-28T14:00:00 status open_untouched; 5m LONG 7633.25-7634.00 parent 2026-05-28T11:25:00 confirmed 2026-05-28T11:30:00 status open_untouched; 5m LONG 7626.50-7632.00 parent 2026-05-28T11:05:00 confirmed 2026-05-28T11:10:00 status partial_touch; 15m LONG 7627.00-7628.50 parent 2026-05-28T11:15:00 confirmed 2026-05-28T11:30:00 status open_untouched; 60m LONG 7607.50-7625.00 parent 2026-05-28T11:00:00 confirmed 2026-05-28T12:00:00 status open_untouched; 5m LONG 7603.75-7619.00 parent 2026-05-28T10:15:00 confirmed 2026-05-28T10:20:00 status partial_touch; 15m LONG 7600.75-7616.75 parent 2026-05-28T10:15:00 confirmed 2026-05-28T10:30:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7660.25-7662.50 parent 2026-05-29T15:30:00 confirmed 2026-05-29T15:35:00 status failed_inverted; 5m SHORT 7660.75-7661.00 parent 2026-05-29T13:25:00 confirmed 2026-05-29T13:30:00 status failed_inverted; 15m LONG 7661.00-7663.25 parent 2026-05-31T18:45:00 confirmed 2026-05-31T19:00:00 status failed_inverted; 5m LONG 7661.25-7662.25 parent 2026-05-29T12:05:00 confirmed 2026-05-29T12:10:00 status failed_inverted; 5m LONG 7661.25-7663.25 parent 2026-05-31T18:45:00 confirmed 2026-05-31T18:50:00 status failed_inverted; 5m LONG 7661.75-7662.50 parent 2026-05-29T11:15:00 confirmed 2026-05-29T11:20:00 status failed_inverted; 5m LONG 7662.25-7667.25 parent 2026-05-29T09:45:00 confirmed 2026-05-29T09:50:00 status failed_inverted; 5m SHORT 7662.50-7663.75 parent 2026-05-29T15:55:00 confirmed 2026-05-29T16:00:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7660.25-7668.75 parent 2026-06-01T09:15:00 confirmed 2026-06-01T09:20:00 status partial_touch; 15m SHORT 7660.25-7671.50 parent 2026-06-01T09:15:00 confirmed 2026-06-01T09:30:00 status partial_touch; 120m SHORT 7666.50-7673.50 parent 2026-06-01T10:00:00 confirmed 2026-06-01T12:00:00 status open_untouched; 60m SHORT 7673.50-7677.25 parent 2026-06-01T09:00:00 confirmed 2026-06-01T10:00:00 status open_untouched; 5m SHORT 7673.75-7675.50 parent 2026-06-01T08:55:00 confirmed 2026-06-01T09:00:00 status open_untouched; 5m SHORT 7679.00-7680.75 parent 2026-06-01T07:55:00 confirmed 2026-06-01T08:00:00 status partial_touch
- Objective ladder: liquidity 7660.00 reached 2026-06-01T12:35:00 (prior 5M swing high liquidity from 2026-06-01T09:55:00); liquidity 7664.00 reached 2026-06-01T12:35:00 (prior 5M swing high liquidity from 2026-06-01T12:05:00); liquidity 7666.50 reached 2026-06-01T12:55:00 (prior 5M swing high liquidity from 2026-06-01T11:45:00); open_fvg 7668.75 reached 2026-06-01T12:55:00 (5m SHORT open FVG partial_touch parent 2026-06-01T09:15:00 confirmed 2026-06-01T09:20:00); open_fvg 7671.50 reached 2026-06-01T13:00:00 (15m SHORT open FVG partial_touch parent 2026-06-01T09:15:00 confirmed 2026-06-01T09:30:00); open_fvg 7673.50 reached 2026-06-01T13:30:00 (120m SHORT open FVG open_untouched parent 2026-06-01T10:00:00 confirmed 2026-06-01T12:00:00); session_extreme 7673.50 reached 2026-06-01T13:30:00 (RTH high liquidity before proof); tactical 7673.75 reached 2026-06-01T13:30:00 (T1 1.5R); open_fvg 7675.50 reached 2026-06-01T13:30:00 (5m SHORT open FVG open_untouched parent 2026-06-01T08:55:00 confirmed 2026-06-01T09:00:00); open_fvg 7677.25 reached 2026-06-01T13:30:00 (60m SHORT open FVG open_untouched parent 2026-06-01T09:00:00 confirmed 2026-06-01T10:00:00); tactical 7678.25 reached 2026-06-01T13:35:00 (T2 2.0R); open_fvg 7680.75 reached 2026-06-01T13:45:00 (5m SHORT open FVG partial_touch parent 2026-06-01T07:55:00 confirmed 2026-06-01T08:00:00)
- Story: LONG proof completed at 2026-06-01T12:30:00 from 7655.75-7658.50. 14 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7660.25-7668.75 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7660.00 liquidity, 7664.00 liquidity, 7666.50 liquidity, 7668.75 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-01T13:30:00, one MES +$70.00
- Managed outcome: LQ1 at 2026-06-01T12:35:00, exit 7664.00, one MES +$21.25
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-06-01T12:30:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 2. LONG 15M FVG 7677.50-7686.75 parent 2026-06-01T13:45:00 confirmed 2026-06-01T14:00:00
- Verdict: valid_trace_candidate
- Continuation read: clean_continuation
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-01T13:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-01T16:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-01T14:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-01T15:05:00, 2026-06-01T15:10:00, 2026-06-01T15:40:00, 2026-06-01T16:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-01T15:05:00. | PASS entry_stop_risk_contract: Entry 7689.00, protected 5M stop 7662.25, risk 26.75 pts. | PASS tactical_targets_from_actual_risk: T1 7729.25 and T2 7742.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7689.25.
- Parent displacement: yes
- Parent displacement candle: 2026-06-01T13:45:00
- Parent failure: 2026-06-01T16:00:00
- First 5M return: 2026-06-01T14:00:00
- 5M wick defense: 2026-06-01T15:05:00, 2026-06-01T15:10:00, 2026-06-01T15:40:00, 2026-06-01T16:00:00
- Proof: 2026-06-01T15:05:00
- Entry/stop/risk: 7689.00 / 7662.25 / 26.75 pts
- T1/T2: 7729.25 / 7742.50
- Nearest liquidity: nearest prior high liquidity 7689.25
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7655.75-7658.50 parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00 defended_on_15m defended 2026-06-01T12:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7655.75-7658.50 parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00 defended_on_15m defended 2026-06-01T12:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-01T14:00:00; wick 2026-06-01T15:05:00; proof 2026-06-01T15:05:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7696.25 (prior 5M swing high liquidity from 2026-06-01T13:45:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - The near liquidity objective sat in the path but was not reached during the replay window.
- Open FVGs below at proof: 5m LONG 7677.00-7686.75 parent 2026-06-01T13:45:00 confirmed 2026-06-01T13:50:00 status partial_touch; 15m LONG 7677.50-7686.75 parent 2026-06-01T13:45:00 confirmed 2026-06-01T14:00:00 status partial_touch; 60m LONG 7672.75-7685.50 parent 2026-06-01T14:00:00 confirmed 2026-06-01T15:00:00 status open_untouched; 5m LONG 7669.00-7670.25 parent 2026-06-01T13:30:00 confirmed 2026-06-01T13:35:00 status open_untouched; 5m LONG 7666.00-7666.50 parent 2026-06-01T13:25:00 confirmed 2026-06-01T13:30:00 status open_untouched; 5m LONG 7659.25-7659.50 parent 2026-06-01T12:30:00 confirmed 2026-06-01T12:35:00 status open_untouched; 240m LONG 7607.50-7638.75 parent 2026-05-28T14:00:00 confirmed 2026-05-28T17:00:00 status partial_touch; 120m LONG 7607.50-7634.25 parent 2026-05-28T12:00:00 confirmed 2026-05-28T14:00:00 status open_untouched
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: liquidity 7691.50 not reached (prior 5M swing high liquidity from 2026-06-01T14:45:00); liquidity 7691.75 not reached (prior 5M swing high liquidity from 2026-06-01T14:30:00); liquidity 7696.25 not reached (prior 5M swing high liquidity from 2026-06-01T13:45:00); session_extreme 7696.25 not reached (RTH high liquidity before proof); tactical 7729.25 not reached (T1 1.5R); tactical 7742.50 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-06-01T15:05:00 from 7677.50-7686.75. 0 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. No opposing FVG obstacle was loaded before T1. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-01T18:10:00, one MES $-133.75
- Managed outcome: Stop at 2026-06-01T18:10:00, exit 7662.25, one MES $-133.75
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-06-01T15:05:00 before later same-zone failure/reversal read at 2026-06-01T16:00:00. Review the defended continuation before labeling this zone as failure/reversal.

### 3. SHORT 15M FVG 7683.50-7686.25 parent 2026-06-01T15:45:00 confirmed 2026-06-01T16:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-01T15:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-01T15:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7683.50-7686.25 parent 2026-06-01T15:45:00 confirmed 2026-06-01T16:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7683.50-7686.25 parent 2026-06-01T15:45:00 confirmed 2026-06-01T16:00:00 untested_by_15m
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
