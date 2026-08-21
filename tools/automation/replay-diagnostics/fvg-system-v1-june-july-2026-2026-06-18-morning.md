# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-18 / morning (2026-06-18T09:15:00 to 2026-06-18T12:00:00)
Context window: 275 days (2025-09-16T00:00:00 to 2026-06-19T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 45264 bars (2025-10-28T18:05:00 to 2026-06-19T13:00:00)
- 15m: 15103 bars (2025-10-28T18:15:00 to 2026-06-19T13:00:00)
- 60m: 3744 bars (2025-10-28T19:00:00 to 2026-06-19T13:00:00)
- 120m: 1961 bars (2025-10-28T20:00:00 to 2026-06-19T13:00:00)
- 240m: 1050 bars (2025-10-28T22:00:00 to 2026-06-19T12:00:00)

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
- Open below: 15m LONG 7548.00-7553.25 parent 2026-06-18T08:30:00 confirmed 2026-06-18T08:45:00 status partial_touch; 5m LONG 7547.75-7552.75 parent 2026-06-18T08:25:00 confirmed 2026-06-18T08:30:00 status partial_touch; 5m LONG 7539.75-7541.00 parent 2026-06-18T07:55:00 confirmed 2026-06-18T08:00:00 status partial_touch; 60m LONG 7527.75-7539.75 parent 2026-06-17T20:00:00 confirmed 2026-06-17T21:00:00 status partial_touch; 5m LONG 7528.50-7531.00 parent 2026-06-17T19:15:00 confirmed 2026-06-17T19:20:00 status open_untouched; 15m LONG 7527.75-7531.00 parent 2026-06-17T19:15:00 confirmed 2026-06-17T19:30:00 status open_untouched; 5m LONG 7522.00-7523.00 parent 2026-06-17T18:25:00 confirmed 2026-06-17T18:30:00 status partial_touch; 15m LONG 7521.75-7522.50 parent 2026-06-17T18:30:00 confirmed 2026-06-17T18:45:00 status open_untouched; 5m LONG 7517.00-7518.25 parent 2026-06-17T18:15:00 confirmed 2026-06-17T18:20:00 status open_untouched; 15m LONG 7517.00-7518.25 parent 2026-06-17T18:15:00 confirmed 2026-06-17T18:30:00 status open_untouched
- Failed above: 60m LONG 7561.75-7569.25 parent 2026-06-14T21:00:00 confirmed 2026-06-14T22:00:00 status failed_inverted; 15m SHORT 7562.25-7563.00 parent 2026-05-15T00:45:00 confirmed 2026-05-15T01:00:00 status failed_inverted; 15m SHORT 7562.25-7567.00 parent 2026-05-22T15:15:00 confirmed 2026-05-22T15:30:00 status failed_inverted; 5m SHORT 7563.25-7567.25 parent 2026-05-14T21:50:00 confirmed 2026-05-14T21:55:00 status failed_inverted; 5m LONG 7563.50-7568.25 parent 2026-05-22T09:35:00 confirmed 2026-05-22T09:40:00 status failed_inverted; 5m LONG 7563.50-7564.50 parent 2026-06-18T04:10:00 confirmed 2026-06-18T04:15:00 status failed_inverted; 5m LONG 7563.75-7566.25 parent 2026-06-14T20:10:00 confirmed 2026-06-14T20:15:00 status failed_inverted; 5m LONG 7564.00-7566.25 parent 2026-05-14T10:20:00 confirmed 2026-05-14T10:25:00 status failed_inverted; 5m SHORT 7564.00-7566.50 parent 2026-06-17T14:55:00 confirmed 2026-06-17T15:00:00 status failed_inverted; 15m LONG 7564.00-7565.00 parent 2026-05-14T10:30:00 confirmed 2026-05-14T10:45:00 status failed_inverted
- Open above: 5m SHORT 7590.75-7597.25 parent 2026-06-17T10:35:00 confirmed 2026-06-17T10:40:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch; 15m SHORT 7654.50-7656.50 parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00 status partial_touch; 60m SHORT 7655.00-7661.75 parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof 2026-06-18T11:20:00 from 15M parent 2026-06-18T09:45:00 confirmed 2026-06-18T10:00:00.
- Defended-area management context: 60m LONG 7527.75-7539.75 is a callout before/near T1, not an issue by itself.
- Later rows: 1 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7555.00-7560.75 parent 2026-06-18T09:45:00 confirmed 2026-06-18T10:00:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-18T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-18T11:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-18T11:05:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-18T11:10:00, 2026-06-18T11:15:00, 2026-06-18T11:25:00, 2026-06-18T11:30:00, 2026-06-18T12:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-18T11:20:00. | PASS entry_stop_risk_contract: Entry 7554.50, protected 5M stop 7570.50, risk 16.00 pts. | PASS tactical_targets_from_actual_risk: T1 7530.50 and T2 7522.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7554.25.
- Parent displacement: yes
- Parent displacement candle: 2026-06-18T09:45:00
- Parent failure: 2026-06-18T11:00:00
- First 5M return: 2026-06-18T11:05:00
- 5M wick defense: 2026-06-18T11:10:00, 2026-06-18T11:15:00, 2026-06-18T11:25:00, 2026-06-18T11:30:00, 2026-06-18T12:00:00
- Proof: 2026-06-18T11:20:00
- Entry/stop/risk: 7554.50 / 7570.50 / 16.00 pts
- T1/T2: 7530.50 / 7522.50
- Nearest liquidity: nearest prior low liquidity 7554.25
- Defended-area / obstacle management callout before or near T1: 60m LONG 7527.75-7539.75 parent 2026-06-17T20:00:00 confirmed 2026-06-17T21:00:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-18T23:20:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7555.00-7560.75 parent 2026-06-18T09:45:00 confirmed 2026-06-18T10:00:00 defended_on_15m defended 2026-06-18T10:15:00 failed 2026-06-18T11:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7555.00-7560.75 parent 2026-06-18T09:45:00 confirmed 2026-06-18T10:00:00 defended_on_15m defended 2026-06-18T10:15:00 failed 2026-06-18T11:00:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-18T10:10:00; wick 2026-06-18T11:15:00; proof 2026-06-18T11:20:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7541.25 (prior 5M swing low liquidity from 2026-06-18T10:35:00)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no defended FVG management objective interrupted delivery.
- Open FVGs below at proof: 60m LONG 7527.75-7539.75 parent 2026-06-17T20:00:00 confirmed 2026-06-17T21:00:00 status partial_touch; 5m LONG 7528.50-7531.00 parent 2026-06-17T19:15:00 confirmed 2026-06-17T19:20:00 status open_untouched; 15m LONG 7527.75-7531.00 parent 2026-06-17T19:15:00 confirmed 2026-06-17T19:30:00 status open_untouched; 5m LONG 7522.00-7523.00 parent 2026-06-17T18:25:00 confirmed 2026-06-17T18:30:00 status partial_touch; 15m LONG 7521.75-7522.50 parent 2026-06-17T18:30:00 confirmed 2026-06-17T18:45:00 status open_untouched; 5m LONG 7517.00-7518.25 parent 2026-06-17T18:15:00 confirmed 2026-06-17T18:20:00 status open_untouched; 15m LONG 7517.00-7518.25 parent 2026-06-17T18:15:00 confirmed 2026-06-17T18:30:00 status open_untouched; 5m LONG 7515.25-7516.25 parent 2026-06-17T18:10:00 confirmed 2026-06-17T18:15:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7554.75-7556.50 parent 2026-06-14T19:35:00 confirmed 2026-06-14T19:40:00 status failed_inverted; 5m LONG 7554.75-7555.75 parent 2026-06-17T22:05:00 confirmed 2026-06-17T22:10:00 status failed_inverted; 5m LONG 7555.00-7555.50 parent 2026-05-22T00:55:00 confirmed 2026-05-22T01:00:00 status failed_inverted; 5m LONG 7555.00-7556.50 parent 2026-05-22T10:35:00 confirmed 2026-05-22T10:40:00 status failed_inverted; 5m LONG 7555.00-7557.25 parent 2026-06-18T05:40:00 confirmed 2026-06-18T05:45:00 status failed_inverted; 5m SHORT 7555.00-7557.25 parent 2026-06-18T06:45:00 confirmed 2026-06-18T06:50:00 status failed_inverted; 15m SHORT 7555.00-7560.75 parent 2026-06-18T09:45:00 confirmed 2026-06-18T10:00:00 status failed_inverted; 5m SHORT 7555.25-7555.75 parent 2026-05-14T08:50:00 confirmed 2026-05-14T08:55:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7590.75-7597.25 parent 2026-06-17T10:35:00 confirmed 2026-06-17T10:40:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch
- Objective ladder: liquidity 7541.25 reached 2026-06-18T11:40:00 (prior 5M swing low liquidity from 2026-06-18T10:35:00); liquidity 7539.00 not reached (prior 5M swing low liquidity from 2026-06-18T10:20:00); liquidity 7535.50 not reached (prior 5M swing low liquidity from 2026-06-18T09:50:00); session_extreme 7535.50 not reached (RTH low liquidity before proof); tactical 7530.50 not reached (T1 1.5R); open_fvg 7528.50 not reached (5m LONG open FVG open_untouched parent 2026-06-17T19:15:00 confirmed 2026-06-17T19:20:00); open_fvg 7527.75 not reached (60m LONG open FVG partial_touch parent 2026-06-17T20:00:00 confirmed 2026-06-17T21:00:00); open_fvg 7527.75 not reached (15m LONG open FVG open_untouched parent 2026-06-17T19:15:00 confirmed 2026-06-17T19:30:00); tactical 7522.50 not reached (T2 2.0R); open_fvg 7522.00 not reached (5m LONG open FVG partial_touch parent 2026-06-17T18:25:00 confirmed 2026-06-17T18:30:00); open_fvg 7521.75 not reached (15m LONG open FVG open_untouched parent 2026-06-17T18:30:00 confirmed 2026-06-17T18:45:00); open_fvg 7517.00 not reached (5m LONG open FVG open_untouched parent 2026-06-17T18:15:00 confirmed 2026-06-17T18:20:00); open_fvg 7517.00 not reached (15m LONG open FVG open_untouched parent 2026-06-17T18:15:00 confirmed 2026-06-17T18:30:00); open_fvg 7515.25 not reached (5m LONG open FVG open_untouched parent 2026-06-17T18:10:00 confirmed 2026-06-17T18:15:00)
- Story: SHORT proof completed at 2026-06-18T11:20:00 from 7555.00-7560.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 60m 7527.75-7539.75 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7541.25 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-18T12:40:00, one MES $-80.00
- Managed outcome: LQ1 at 2026-06-18T11:40:00, exit 7541.25, one MES +$66.25
- Reasons: Qualified by this diagnostic heuristic.

### 2. SHORT 15M FVG 7556.25-7557.25 parent 2026-06-18T11:30:00 confirmed 2026-06-18T11:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-18T12:00:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-06-18T12:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7555.00-7560.75 parent 2026-06-18T09:45:00 confirmed 2026-06-18T10:00:00 defended_on_15m defended 2026-06-18T10:15:00 failed 2026-06-18T11:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7555.00-7560.75 parent 2026-06-18T09:45:00 confirmed 2026-06-18T10:00:00 defended_on_15m defended 2026-06-18T10:15:00 failed 2026-06-18T11:00:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-06-18T11:55:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-06-18T11:55:00.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.
