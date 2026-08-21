# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-16 / morning (2026-07-16T09:15:00 to 2026-07-16T12:00:00)
Context window: 275 days (2025-10-14T00:00:00 to 2026-07-17T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 50736 bars (2025-10-28T18:05:00 to 2026-07-17T17:00:00)
- 15m: 16934 bars (2025-10-28T18:15:00 to 2026-07-17T17:00:00)
- 60m: 4220 bars (2025-10-28T19:00:00 to 2026-07-17T17:00:00)
- 120m: 2219 bars (2025-10-28T20:00:00 to 2026-07-17T17:00:00)
- 240m: 1272 bars (2025-10-28T22:00:00 to 2026-07-17T16:00:00)

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
- Open below: 5m LONG 7588.75-7591.50 parent 2026-07-16T09:05:00 confirmed 2026-07-16T09:10:00 status open_untouched; 5m LONG 7579.25-7582.75 parent 2026-07-15T12:50:00 confirmed 2026-07-15T12:55:00 status partial_touch; 5m LONG 7576.00-7576.75 parent 2026-07-15T12:45:00 confirmed 2026-07-15T12:50:00 status open_untouched; 15m LONG 7556.00-7556.50 parent 2026-07-14T08:30:00 confirmed 2026-07-14T08:45:00 status partial_touch; 5m LONG 7551.00-7555.75 parent 2026-07-14T08:25:00 confirmed 2026-07-14T08:30:00 status open_untouched; 5m LONG 7542.75-7545.25 parent 2026-07-14T00:25:00 confirmed 2026-07-14T00:30:00 status partial_touch; 60m LONG 7523.50-7525.50 parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00 status partial_touch; 15m LONG 7522.25-7523.00 parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00 status open_untouched; 60m LONG 7495.50-7514.50 parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00 status partial_touch; 5m LONG 7498.50-7500.75 parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00 status partial_touch
- Failed above: 5m LONG 7596.00-7598.25 parent 2026-07-15T13:30:00 confirmed 2026-07-15T13:35:00 status failed_inverted; 120m LONG 7596.00-7597.00 parent 2026-05-28T10:00:00 confirmed 2026-05-28T12:00:00 status failed_inverted; 5m LONG 7596.25-7599.75 parent 2026-05-14T12:00:00 confirmed 2026-05-14T12:05:00 status failed_inverted; 5m SHORT 7596.50-7596.75 parent 2026-05-26T18:10:00 confirmed 2026-05-26T18:15:00 status failed_inverted; 5m LONG 7596.50-7597.25 parent 2026-05-27T12:40:00 confirmed 2026-05-27T12:45:00 status failed_inverted; 15m LONG 7596.50-7597.00 parent 2026-05-14T12:00:00 confirmed 2026-05-14T12:15:00 status failed_inverted; 5m LONG 7596.75-7598.75 parent 2026-05-26T15:40:00 confirmed 2026-05-26T15:45:00 status failed_inverted; 5m SHORT 7596.75-7597.00 parent 2026-06-15T07:35:00 confirmed 2026-06-15T07:40:00 status failed_inverted; 5m SHORT 7596.75-7598.50 parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00 status failed_inverted; 5m LONG 7596.75-7597.25 parent 2026-07-13T04:50:00 confirmed 2026-07-13T04:55:00 status failed_inverted
- Open above: 60m SHORT 7599.00-7601.00 parent 2026-07-16T08:00:00 confirmed 2026-07-16T09:00:00 status open_untouched; 60m SHORT 7603.50-7604.75 parent 2026-07-16T07:00:00 confirmed 2026-07-16T08:00:00 status open_untouched; 15m SHORT 7607.75-7608.75 parent 2026-07-16T06:00:00 confirmed 2026-07-16T06:15:00 status open_untouched; 5m SHORT 7619.50-7621.25 parent 2026-07-16T02:25:00 confirmed 2026-07-16T02:30:00 status open_untouched; 15m SHORT 7621.00-7626.00 parent 2026-07-16T01:45:00 confirmed 2026-07-16T02:00:00 status partial_touch; 5m SHORT 7622.25-7626.50 parent 2026-07-16T01:35:00 confirmed 2026-07-16T01:40:00 status partial_touch; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof 2026-07-16T11:20:00 from 15M parent 2026-07-16T10:15:00 confirmed 2026-07-16T10:30:00.
- Defended-area management context: 5m SHORT 7605.25-7605.75 is a callout before/near T1, not an issue by itself.
- Later rows: 3 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7589.50-7594.25 parent 2026-07-16T09:15:00 confirmed 2026-07-16T09:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-16T09:15:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-16T09:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-16T09:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-16T10:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-16T10:05:00. | PASS entry_stop_risk_contract: Entry 7596.50, protected 5M stop 7575.25, risk 21.25 pts. | PASS tactical_targets_from_actual_risk: T1 7628.50 and T2 7639.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7596.75.
- Parent displacement: yes
- Parent displacement candle: 2026-07-16T09:15:00
- Parent failure: 2026-07-16T09:45:00
- First 5M return: 2026-07-16T09:45:00
- 5M wick defense: 2026-07-16T10:00:00
- Proof: 2026-07-16T10:05:00
- Entry/stop/risk: 7596.50 / 7575.25 / 21.25 pts
- T1/T2: 7628.50 / 7639.00
- Nearest liquidity: nearest prior high liquidity 7596.75
- Defended-area / obstacle management callout before or near T1: 5m LONG 7596.75-7598.75 parent 2026-05-26T15:40:00 confirmed 2026-05-26T15:45:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-16T10:10:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7589.50-7594.25 parent 2026-07-16T09:15:00 confirmed 2026-07-16T09:30:00 failed_acceptance_through_15m defended 2026-07-16T10:15:00 failed 2026-07-16T09:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7589.50-7594.25 parent 2026-07-16T09:15:00 confirmed 2026-07-16T09:30:00 failed_acceptance_through_15m defended 2026-07-16T10:15:00 failed 2026-07-16T09:45:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-16T09:35:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-16T09:40:00.
- Meaningful liquidity target before T1: 7604.00 (prior 5M swing high liquidity from 2026-07-16T09:35:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 15m SHORT 7591.50-7594.25 parent 2026-07-16T09:45:00 confirmed 2026-07-16T10:00:00 status open_untouched; 15m LONG 7556.00-7556.50 parent 2026-07-14T08:30:00 confirmed 2026-07-14T08:45:00 status partial_touch; 5m LONG 7551.00-7555.75 parent 2026-07-14T08:25:00 confirmed 2026-07-14T08:30:00 status open_untouched; 5m LONG 7542.75-7545.25 parent 2026-07-14T00:25:00 confirmed 2026-07-14T00:30:00 status partial_touch; 60m LONG 7523.50-7525.50 parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00 status partial_touch; 15m LONG 7522.25-7523.00 parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00 status open_untouched; 60m LONG 7495.50-7514.50 parent 2026-07-08T13:00:00 confirmed 2026-07-08T14:00:00 status partial_touch; 5m LONG 7498.50-7500.75 parent 2026-07-08T12:20:00 confirmed 2026-07-08T12:25:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7596.75-7598.75 parent 2026-05-26T15:40:00 confirmed 2026-05-26T15:45:00 status failed_inverted; 5m SHORT 7596.75-7597.00 parent 2026-06-15T07:35:00 confirmed 2026-06-15T07:40:00 status failed_inverted; 5m SHORT 7596.75-7598.50 parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00 status failed_inverted; 5m LONG 7596.75-7597.25 parent 2026-07-13T04:50:00 confirmed 2026-07-13T04:55:00 status failed_inverted; 5m SHORT 7596.75-7597.75 parent 2026-07-13T07:50:00 confirmed 2026-07-13T07:55:00 status failed_inverted; 5m LONG 7596.75-7601.00 parent 2026-07-13T09:35:00 confirmed 2026-07-13T09:40:00 status failed_inverted; 5m SHORT 7597.00-7599.25 parent 2026-05-26T16:50:00 confirmed 2026-05-26T16:55:00 status failed_inverted; 5m SHORT 7597.00-7597.25 parent 2026-05-27T23:10:00 confirmed 2026-05-27T23:15:00 status failed_inverted
- Open FVGs above at proof: 60m SHORT 7603.50-7604.75 parent 2026-07-16T07:00:00 confirmed 2026-07-16T08:00:00 status partial_touch; 15m SHORT 7607.75-7608.75 parent 2026-07-16T06:00:00 confirmed 2026-07-16T06:15:00 status open_untouched; 5m SHORT 7619.50-7621.25 parent 2026-07-16T02:25:00 confirmed 2026-07-16T02:30:00 status open_untouched; 15m SHORT 7621.00-7626.00 parent 2026-07-16T01:45:00 confirmed 2026-07-16T02:00:00 status partial_touch; 5m SHORT 7622.25-7626.50 parent 2026-07-16T01:35:00 confirmed 2026-07-16T01:40:00 status partial_touch; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch
- Objective ladder: liquidity 7604.00 reached 2026-07-16T10:10:00 (prior 5M swing high liquidity from 2026-07-16T09:35:00); session_extreme 7604.00 reached 2026-07-16T10:10:00 (RTH high liquidity before proof); open_fvg 7604.75 reached 2026-07-16T10:10:00 (60m SHORT open FVG partial_touch parent 2026-07-16T07:00:00 confirmed 2026-07-16T08:00:00); open_fvg 7608.75 reached 2026-07-16T10:20:00 (15m SHORT open FVG open_untouched parent 2026-07-16T06:00:00 confirmed 2026-07-16T06:15:00); open_fvg 7621.25 not reached (5m SHORT open FVG open_untouched parent 2026-07-16T02:25:00 confirmed 2026-07-16T02:30:00); open_fvg 7626.00 not reached (15m SHORT open FVG partial_touch parent 2026-07-16T01:45:00 confirmed 2026-07-16T02:00:00); open_fvg 7626.50 not reached (5m SHORT open FVG partial_touch parent 2026-07-16T01:35:00 confirmed 2026-07-16T01:40:00); tactical 7628.50 not reached (T1 1.5R); open_fvg 7636.75 not reached (60m SHORT open FVG partial_touch parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00); open_fvg 7637.50 not reached (5m SHORT open FVG partial_touch parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00); open_fvg 7638.75 not reached (15m SHORT open FVG partial_touch parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00); tactical 7639.00 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-07-16T10:05:00 from 7589.50-7594.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7596.75-7598.75 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7604.00 liquidity, 7604.00 session_extreme, 7604.75 open_fvg, 7608.75 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-16T14:10:00, one MES $-106.25
- Managed outcome: LQ1 at 2026-07-16T10:10:00, exit 7604.00, one MES +$37.50
- Reasons: Selected 15M battle zone did not receive completed 5M defense confirmation.

### 2. SHORT 15M FVG 7591.50-7594.25 parent 2026-07-16T09:45:00 confirmed 2026-07-16T10:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-16T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-16T10:15:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-16T09:45:00
- Parent failure: 2026-07-16T10:15:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7591.50-7594.25 parent 2026-07-16T09:45:00 confirmed 2026-07-16T10:00:00 failed_acceptance_through_15m failed 2026-07-16T10:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7591.50-7594.25 parent 2026-07-16T09:45:00 confirmed 2026-07-16T10:00:00 failed_acceptance_through_15m failed 2026-07-16T10:15:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-16T10:05:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-16T10:05:00.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 3. LONG 15M FVG 7591.50-7599.75 parent 2026-07-16T10:15:00 confirmed 2026-07-16T10:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-16T10:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-16T11:15:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-16T11:20:00, 2026-07-16T11:25:00, 2026-07-16T11:50:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-16T11:20:00. | PASS entry_stop_risk_contract: Entry 7605.00, protected 5M stop 7575.25, risk 29.75 pts. | PASS tactical_targets_from_actual_risk: T1 7649.75 and T2 7664.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7605.25.
- Parent displacement: yes
- Parent displacement candle: 2026-07-16T10:15:00
- Parent failure: not found
- First 5M return: 2026-07-16T11:15:00
- 5M wick defense: 2026-07-16T11:20:00, 2026-07-16T11:25:00, 2026-07-16T11:50:00
- Proof: 2026-07-16T11:20:00
- Entry/stop/risk: 7605.00 / 7575.25 / 29.75 pts
- T1/T2: 7649.75 / 7664.50
- Nearest liquidity: nearest prior high liquidity 7605.25
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7605.25-7605.75 parent 2026-06-17T01:30:00 confirmed 2026-06-17T01:35:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-16T11:25:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7589.50-7594.25 parent 2026-07-16T09:15:00 confirmed 2026-07-16T09:30:00 failed_acceptance_through_15m defended 2026-07-16T10:15:00 failed 2026-07-16T09:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7589.50-7594.25 parent 2026-07-16T09:15:00 confirmed 2026-07-16T09:30:00 failed_acceptance_through_15m defended 2026-07-16T10:15:00 failed 2026-07-16T09:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-16T11:15:00; wick 2026-07-16T11:20:00; proof 2026-07-16T11:20:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7613.25 (prior 5M swing high liquidity from 2026-07-16T11:05:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 5m LONG 7597.25-7601.00 parent 2026-07-16T10:10:00 confirmed 2026-07-16T10:15:00 status partial_touch; 15m LONG 7591.50-7599.75 parent 2026-07-16T10:15:00 confirmed 2026-07-16T10:30:00 status partial_touch; 5m LONG 7590.00-7594.75 parent 2026-07-16T10:05:00 confirmed 2026-07-16T10:10:00 status open_untouched; 15m LONG 7556.00-7556.50 parent 2026-07-14T08:30:00 confirmed 2026-07-14T08:45:00 status partial_touch; 5m LONG 7551.00-7555.75 parent 2026-07-14T08:25:00 confirmed 2026-07-14T08:30:00 status open_untouched; 5m LONG 7542.75-7545.25 parent 2026-07-14T00:25:00 confirmed 2026-07-14T00:30:00 status partial_touch; 60m LONG 7523.50-7525.50 parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00 status partial_touch; 15m LONG 7522.25-7523.00 parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7605.25-7605.75 parent 2026-06-17T01:30:00 confirmed 2026-06-17T01:35:00 status failed_inverted; 5m LONG 7605.25-7605.50 parent 2026-07-14T23:35:00 confirmed 2026-07-14T23:40:00 status failed_inverted; 5m SHORT 7605.25-7606.50 parent 2026-07-15T05:55:00 confirmed 2026-07-15T06:00:00 status failed_inverted; 15m SHORT 7605.25-7605.50 parent 2026-05-27T02:30:00 confirmed 2026-05-27T02:45:00 status failed_inverted; 5m SHORT 7605.50-7625.00 parent 2026-07-12T18:05:00 confirmed 2026-07-12T18:10:00 status failed_inverted; 15m LONG 7605.50-7607.75 parent 2026-05-26T06:30:00 confirmed 2026-05-26T06:45:00 status failed_inverted; 15m LONG 7605.50-7606.50 parent 2026-07-16T10:30:00 confirmed 2026-07-16T10:45:00 status failed_inverted; 5m SHORT 7605.75-7606.25 parent 2026-05-26T09:05:00 confirmed 2026-05-26T09:10:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7619.50-7621.25 parent 2026-07-16T02:25:00 confirmed 2026-07-16T02:30:00 status open_untouched; 15m SHORT 7621.00-7626.00 parent 2026-07-16T01:45:00 confirmed 2026-07-16T02:00:00 status partial_touch; 5m SHORT 7622.25-7626.50 parent 2026-07-16T01:35:00 confirmed 2026-07-16T01:40:00 status partial_touch; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch; 15m SHORT 7654.50-7656.50 parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00 status partial_touch
- Objective ladder: liquidity 7613.25 reached 2026-07-16T11:30:00 (prior 5M swing high liquidity from 2026-07-16T11:05:00); liquidity 7614.75 not reached (prior 5M swing high liquidity from 2026-07-16T10:50:00); session_extreme 7614.75 not reached (RTH high liquidity before proof); open_fvg 7621.25 not reached (5m SHORT open FVG open_untouched parent 2026-07-16T02:25:00 confirmed 2026-07-16T02:30:00); open_fvg 7626.00 not reached (15m SHORT open FVG partial_touch parent 2026-07-16T01:45:00 confirmed 2026-07-16T02:00:00); open_fvg 7626.50 not reached (5m SHORT open FVG partial_touch parent 2026-07-16T01:35:00 confirmed 2026-07-16T01:40:00); open_fvg 7636.75 not reached (60m SHORT open FVG partial_touch parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00); open_fvg 7637.50 not reached (5m SHORT open FVG partial_touch parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00); open_fvg 7638.75 not reached (15m SHORT open FVG partial_touch parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00); open_fvg 7641.00 not reached (5m SHORT open FVG partial_touch parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00); tactical 7649.75 not reached (T1 1.5R); open_fvg 7656.50 not reached (15m SHORT open FVG partial_touch parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00); tactical 7664.50 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-07-16T11:20:00 from 7591.50-7599.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7605.25-7605.75 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7613.25 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-16T14:10:00, one MES $-148.75
- Managed outcome: LQ1 at 2026-07-16T11:30:00, exit 7613.25, one MES +$41.25
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-16T11:20:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 4. LONG 15M FVG 7605.50-7606.50 parent 2026-07-16T10:30:00 confirmed 2026-07-16T10:45:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-16T10:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-16T11:15:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-16T10:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-16T11:00:00, 2026-07-16T11:10:00, 2026-07-16T11:20:00, 2026-07-16T11:25:00, 2026-07-16T11:35:00, 2026-07-16T11:50:00, 2026-07-16T12:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-16T11:00:00. | PASS entry_stop_risk_contract: Entry 7611.00, protected 5M stop 7599.75, risk 11.25 pts. | PASS tactical_targets_from_actual_risk: T1 7628.00 and T2 7633.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7611.25.
- Parent displacement: yes
- Parent displacement candle: 2026-07-16T10:30:00
- Parent failure: 2026-07-16T11:15:00
- First 5M return: 2026-07-16T10:45:00
- 5M wick defense: 2026-07-16T11:00:00, 2026-07-16T11:10:00, 2026-07-16T11:20:00, 2026-07-16T11:25:00, 2026-07-16T11:35:00, 2026-07-16T11:50:00, 2026-07-16T12:00:00
- Proof: 2026-07-16T11:00:00
- Entry/stop/risk: 7611.00 / 7599.75 / 11.25 pts
- T1/T2: 7628.00 / 7633.50
- Nearest liquidity: nearest prior high liquidity 7611.25
- Defended-area / obstacle management callout before or near T1: 5m LONG 7611.25-7612.25 parent 2026-06-04T02:40:00 confirmed 2026-06-04T02:45:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-16T11:05:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7589.50-7594.25 parent 2026-07-16T09:15:00 confirmed 2026-07-16T09:30:00 failed_acceptance_through_15m defended 2026-07-16T10:15:00 failed 2026-07-16T09:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7589.50-7594.25 parent 2026-07-16T09:15:00 confirmed 2026-07-16T09:30:00 failed_acceptance_through_15m defended 2026-07-16T10:15:00 failed 2026-07-16T09:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-16T10:45:00; wick 2026-07-16T11:00:00; proof 2026-07-16T11:00:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 5m LONG 7597.25-7601.00 parent 2026-07-16T10:10:00 confirmed 2026-07-16T10:15:00 status partial_touch; 15m LONG 7591.50-7599.75 parent 2026-07-16T10:15:00 confirmed 2026-07-16T10:30:00 status open_untouched; 5m LONG 7590.00-7594.75 parent 2026-07-16T10:05:00 confirmed 2026-07-16T10:10:00 status open_untouched; 15m LONG 7556.00-7556.50 parent 2026-07-14T08:30:00 confirmed 2026-07-14T08:45:00 status partial_touch; 5m LONG 7551.00-7555.75 parent 2026-07-14T08:25:00 confirmed 2026-07-14T08:30:00 status open_untouched; 5m LONG 7542.75-7545.25 parent 2026-07-14T00:25:00 confirmed 2026-07-14T00:30:00 status partial_touch; 60m LONG 7523.50-7525.50 parent 2026-07-08T20:00:00 confirmed 2026-07-08T21:00:00 status partial_touch; 15m LONG 7522.25-7523.00 parent 2026-07-08T19:45:00 confirmed 2026-07-08T20:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7611.25-7612.25 parent 2026-06-04T02:40:00 confirmed 2026-06-04T02:45:00 status failed_inverted; 5m LONG 7611.50-7613.00 parent 2026-05-24T22:50:00 confirmed 2026-05-24T22:55:00 status failed_inverted; 15m LONG 7611.50-7615.50 parent 2026-05-24T23:00:00 confirmed 2026-05-24T23:15:00 status failed_inverted; 120m SHORT 7611.50-7618.75 parent 2026-05-25T20:00:00 confirmed 2026-05-25T22:00:00 status failed_inverted; 120m LONG 7611.50-7613.25 parent 2026-06-04T10:00:00 confirmed 2026-06-04T12:00:00 status failed_inverted; 5m LONG 7611.75-7613.25 parent 2026-07-15T16:00:00 confirmed 2026-07-15T16:05:00 status failed_inverted; 5m SHORT 7612.00-7626.50 parent 2026-07-10T17:00:00 confirmed 2026-07-12T18:05:00 status failed_inverted; 15m SHORT 7612.00-7615.00 parent 2026-05-27T09:15:00 confirmed 2026-05-27T09:30:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7619.50-7621.25 parent 2026-07-16T02:25:00 confirmed 2026-07-16T02:30:00 status open_untouched; 15m SHORT 7621.00-7626.00 parent 2026-07-16T01:45:00 confirmed 2026-07-16T02:00:00 status partial_touch; 5m SHORT 7622.25-7626.50 parent 2026-07-16T01:35:00 confirmed 2026-07-16T01:40:00 status partial_touch; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch; 15m SHORT 7654.50-7656.50 parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00 status partial_touch
- Objective ladder: session_extreme 7614.75 not reached (RTH high liquidity before proof); open_fvg 7621.25 not reached (5m SHORT open FVG open_untouched parent 2026-07-16T02:25:00 confirmed 2026-07-16T02:30:00); open_fvg 7626.00 not reached (15m SHORT open FVG partial_touch parent 2026-07-16T01:45:00 confirmed 2026-07-16T02:00:00); open_fvg 7626.50 not reached (5m SHORT open FVG partial_touch parent 2026-07-16T01:35:00 confirmed 2026-07-16T01:40:00); tactical 7628.00 not reached (T1 1.5R); tactical 7633.50 not reached (T2 2.0R); open_fvg 7636.75 not reached (60m SHORT open FVG partial_touch parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00); open_fvg 7637.50 not reached (5m SHORT open FVG partial_touch parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00); open_fvg 7638.75 not reached (15m SHORT open FVG partial_touch parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00); open_fvg 7641.00 not reached (5m SHORT open FVG partial_touch parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00); open_fvg 7656.50 not reached (15m SHORT open FVG partial_touch parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00)
- Story: LONG proof completed at 2026-07-16T11:00:00 from 7605.50-7606.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7611.25-7612.25 with reaction obstacle_defended_management_callout. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-16T11:15:00, one MES $-56.25
- Managed outcome: Stop at 2026-07-16T11:15:00, exit 7599.75, one MES $-56.25
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-16T11:00:00 before later same-zone failure/reversal read at 2026-07-16T11:15:00. Review the defended continuation before labeling this zone as failure/reversal.
