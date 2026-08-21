# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-20 / morning (2026-07-20T09:15:00 to 2026-07-20T12:00:00)
Context window: 275 days (2025-10-18T00:00:00 to 2026-07-21T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 51359 bars (2025-10-28T18:05:00 to 2026-07-21T23:55:00)
- 15m: 17141 bars (2025-10-28T18:15:00 to 2026-07-21T23:45:00)
- 60m: 4274 bars (2025-10-28T19:00:00 to 2026-07-21T23:00:00)
- 120m: 2246 bars (2025-10-28T20:00:00 to 2026-07-21T22:00:00)
- 240m: 1290 bars (2025-10-28T22:00:00 to 2026-07-21T22:00:00)

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
- Open below: 5m LONG 7520.25-7520.50 parent 2026-07-20T06:50:00 confirmed 2026-07-20T06:55:00 status open_untouched; 5m LONG 7510.00-7514.50 parent 2026-07-20T03:35:00 confirmed 2026-07-20T03:40:00 status partial_touch; 60m LONG 7499.75-7512.00 parent 2026-07-20T04:00:00 confirmed 2026-07-20T05:00:00 status partial_touch; 15m LONG 7510.00-7511.75 parent 2026-07-20T03:45:00 confirmed 2026-07-20T04:00:00 status partial_touch; 5m LONG 7506.25-7509.50 parent 2026-07-20T03:30:00 confirmed 2026-07-20T03:35:00 status open_untouched; 15m LONG 7502.75-7509.50 parent 2026-07-20T03:30:00 confirmed 2026-07-20T03:45:00 status open_untouched; 5m LONG 7500.00-7504.00 parent 2026-07-20T03:25:00 confirmed 2026-07-20T03:30:00 status open_untouched; 5m LONG 7434.50-7448.00 parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00 status partial_touch; 5m LONG 7428.50-7430.00 parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch
- Failed above: 5m SHORT 7527.75-7528.25 parent 2026-07-01T09:10:00 confirmed 2026-07-01T09:15:00 status failed_inverted; 5m LONG 7527.75-7534.50 parent 2026-07-01T09:20:00 confirmed 2026-07-01T09:25:00 status failed_inverted; 5m SHORT 7527.75-7528.50 parent 2026-07-16T23:50:00 confirmed 2026-07-16T23:55:00 status failed_inverted; 15m LONG 7527.75-7531.00 parent 2026-06-17T19:15:00 confirmed 2026-06-17T19:30:00 status failed_inverted; 60m LONG 7527.75-7539.75 parent 2026-06-17T20:00:00 confirmed 2026-06-17T21:00:00 status failed_inverted; 5m LONG 7528.00-7528.75 parent 2026-05-21T13:40:00 confirmed 2026-05-21T13:45:00 status failed_inverted; 15m SHORT 7528.25-7531.75 parent 2026-06-30T22:15:00 confirmed 2026-06-30T22:30:00 status failed_inverted; 5m LONG 7528.50-7531.00 parent 2026-06-17T19:15:00 confirmed 2026-06-17T19:20:00 status failed_inverted; 5m SHORT 7528.50-7529.50 parent 2026-06-22T21:40:00 confirmed 2026-06-22T21:45:00 status failed_inverted; 5m LONG 7528.50-7528.75 parent 2026-06-30T22:45:00 confirmed 2026-06-30T22:50:00 status failed_inverted
- Open above: 5m SHORT 7530.25-7534.50 parent 2026-07-20T08:05:00 confirmed 2026-07-20T08:10:00 status partial_touch; 60m SHORT 7539.50-7546.00 parent 2026-07-16T22:00:00 confirmed 2026-07-16T23:00:00 status partial_touch; 120m SHORT 7541.25-7556.75 parent 2026-07-16T22:00:00 confirmed 2026-07-17T00:00:00 status partial_touch; 5m SHORT 7550.25-7551.25 parent 2026-07-16T21:10:00 confirmed 2026-07-16T21:15:00 status open_untouched; 5m SHORT 7555.75-7558.50 parent 2026-07-16T20:10:00 confirmed 2026-07-16T20:15:00 status partial_touch; 60m SHORT 7556.25-7556.75 parent 2026-07-16T21:00:00 confirmed 2026-07-16T22:00:00 status open_untouched; 15m SHORT 7557.25-7558.50 parent 2026-07-16T20:15:00 confirmed 2026-07-16T20:30:00 status open_untouched; 240m SHORT 7563.75-7579.50 parent 2026-07-16T16:00:00 confirmed 2026-07-16T20:00:00 status partial_touch; 15m SHORT 7568.25-7569.50 parent 2026-07-16T18:30:00 confirmed 2026-07-16T18:45:00 status open_untouched; 5m SHORT 7570.50-7571.50 parent 2026-07-16T18:15:00 confirmed 2026-07-16T18:20:00 status open_untouched

## Review Order
- Primary campaign to review first: SHORT proof 2026-07-20T12:00:00 from 15M parent 2026-07-20T10:00:00 confirmed 2026-07-20T10:15:00.
- Defended-area management context: 60m LONG 7499.75-7512.00 is a callout before/near T1, not an issue by itself.
- Later rows: 1 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7531.50-7532.75 parent 2026-07-20T09:30:00 confirmed 2026-07-20T09:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-20T09:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-20T10:00:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-20T09:30:00
- Parent failure: 2026-07-20T10:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7531.50-7532.75 parent 2026-07-20T09:30:00 confirmed 2026-07-20T09:45:00 failed_acceptance_through_15m failed 2026-07-20T10:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7531.50-7532.75 parent 2026-07-20T09:30:00 confirmed 2026-07-20T09:45:00 failed_acceptance_through_15m failed 2026-07-20T10:00:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-20T09:55:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-20T09:55:00.
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

### 2. SHORT 15M FVG 7527.50-7532.75 parent 2026-07-20T10:00:00 confirmed 2026-07-20T10:15:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-20T10:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-20T11:55:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-20T12:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-20T12:00:00. | PASS entry_stop_risk_contract: Entry 7523.50, protected 5M stop 7552.25, risk 28.75 pts. | PASS tactical_targets_from_actual_risk: T1 7480.50 and T2 7466.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7523.25.
- Parent displacement: yes
- Parent displacement candle: 2026-07-20T10:00:00
- Parent failure: not found
- First 5M return: 2026-07-20T11:55:00
- 5M wick defense: 2026-07-20T12:00:00
- Proof: 2026-07-20T12:00:00
- Entry/stop/risk: 7523.50 / 7552.25 / 28.75 pts
- T1/T2: 7480.50 / 7466.00
- Nearest liquidity: nearest prior low liquidity 7523.25
- Defended-area / obstacle management callout before or near T1: 60m LONG 7499.75-7512.00 parent 2026-07-20T04:00:00 confirmed 2026-07-20T05:00:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-20T12:45:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7527.50-7532.75 parent 2026-07-20T10:00:00 confirmed 2026-07-20T10:15:00 defended_on_15m defended 2026-07-20T12:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7527.50-7532.75 parent 2026-07-20T10:00:00 confirmed 2026-07-20T10:15:00 defended_on_15m defended 2026-07-20T12:00:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-20T11:55:00; wick 2026-07-20T12:00:00; proof 2026-07-20T12:00:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7506.00 (prior 5M swing low liquidity from 2026-07-20T10:25:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - The near liquidity objective sat in the path but was not reached during the replay window.
- Open FVGs below at proof: 60m LONG 7499.75-7512.00 parent 2026-07-20T04:00:00 confirmed 2026-07-20T05:00:00 status partial_touch; 5m LONG 7500.00-7504.00 parent 2026-07-20T03:25:00 confirmed 2026-07-20T03:30:00 status partial_touch; 5m LONG 7434.50-7448.00 parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00 status partial_touch; 5m LONG 7428.50-7430.00 parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7523.75-7524.50 parent 2026-06-05T12:45:00 confirmed 2026-06-05T12:50:00 status failed_inverted; 5m LONG 7523.75-7527.50 parent 2026-06-05T12:55:00 confirmed 2026-06-05T13:00:00 status failed_inverted; 5m LONG 7523.75-7524.75 parent 2026-07-17T10:10:00 confirmed 2026-07-17T10:15:00 status failed_inverted; 5m SHORT 7524.00-7528.00 parent 2026-06-05T14:05:00 confirmed 2026-06-05T14:10:00 status failed_inverted; 5m LONG 7524.25-7528.00 parent 2026-07-01T09:55:00 confirmed 2026-07-01T10:00:00 status failed_inverted; 5m LONG 7524.25-7525.25 parent 2026-07-20T07:05:00 confirmed 2026-07-20T07:10:00 status failed_inverted; 5m SHORT 7524.25-7525.00 parent 2026-07-20T07:25:00 confirmed 2026-07-20T07:30:00 status failed_inverted; 5m LONG 7524.25-7538.00 parent 2026-07-20T07:35:00 confirmed 2026-07-20T07:40:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7527.50-7532.75 parent 2026-07-20T10:00:00 confirmed 2026-07-20T10:15:00 status partial_touch; 5m SHORT 7529.00-7539.25 parent 2026-07-20T09:55:00 confirmed 2026-07-20T10:00:00 status open_untouched; 120m SHORT 7541.25-7556.75 parent 2026-07-16T22:00:00 confirmed 2026-07-17T00:00:00 status partial_touch; 5m SHORT 7542.50-7545.00 parent 2026-07-20T09:50:00 confirmed 2026-07-20T09:55:00 status open_untouched; 5m SHORT 7555.75-7558.50 parent 2026-07-16T20:10:00 confirmed 2026-07-16T20:15:00 status partial_touch; 60m SHORT 7556.25-7556.75 parent 2026-07-16T21:00:00 confirmed 2026-07-16T22:00:00 status open_untouched; 15m SHORT 7557.25-7558.50 parent 2026-07-16T20:15:00 confirmed 2026-07-16T20:30:00 status open_untouched; 240m SHORT 7563.75-7579.50 parent 2026-07-16T16:00:00 confirmed 2026-07-16T20:00:00 status partial_touch
- Objective ladder: liquidity 7506.00 not reached (prior 5M swing low liquidity from 2026-07-20T10:25:00); liquidity 7501.00 not reached (prior 5M swing low liquidity from 2026-07-20T11:00:00); session_extreme 7501.00 not reached (RTH low liquidity before proof); open_fvg 7500.00 not reached (5m LONG open FVG partial_touch parent 2026-07-20T03:25:00 confirmed 2026-07-20T03:30:00); open_fvg 7499.75 not reached (60m LONG open FVG partial_touch parent 2026-07-20T04:00:00 confirmed 2026-07-20T05:00:00); tactical 7480.50 not reached (T1 1.5R); tactical 7466.00 not reached (T2 2.0R); open_fvg 7434.50 not reached (5m LONG open FVG partial_touch parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00); open_fvg 7428.50 not reached (5m LONG open FVG open_untouched parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00); open_fvg 7404.75 not reached (5m LONG open FVG partial_touch parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00); open_fvg 7355.50 not reached (15m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00); open_fvg 7345.25 not reached (5m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00); open_fvg 7321.00 not reached (5m LONG open FVG partial_touch parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00)
- Story: SHORT proof completed at 2026-07-20T12:00:00 from 7527.50-7532.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 60m 7499.75-7512.00 with reaction obstacle_reached_then_continued. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-20T15:15:00, one MES +$215.00
- Managed outcome: LQ1 at 2026-07-20T13:10:00, exit 7506.00, one MES +$87.50
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-07-20T12:00:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.
