# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-23 / morning (2026-07-23T09:15:00 to 2026-07-23T12:00:00)
Context window: 275 days (2025-10-21T00:00:00 to 2026-07-24T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 52116 bars (2025-10-28T18:05:00 to 2026-07-24T17:00:00)
- 15m: 17394 bars (2025-10-28T18:15:00 to 2026-07-24T17:00:00)
- 60m: 4340 bars (2025-10-28T19:00:00 to 2026-07-24T17:00:00)
- 120m: 2280 bars (2025-10-28T20:00:00 to 2026-07-24T17:00:00)
- 240m: 1307 bars (2025-10-28T22:00:00 to 2026-07-24T17:00:00)

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
- Open below: 5m LONG 7434.50-7448.00 parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00 status partial_touch; 5m LONG 7428.50-7430.00 parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch; 5m LONG 7247.75-7253.25 parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00 status partial_touch; 15m LONG 7244.75-7252.25 parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00 status partial_touch
- Failed above: 5m SHORT 7458.50-7460.75 parent 2026-05-07T09:35:00 confirmed 2026-05-07T09:40:00 status failed_inverted; 5m LONG 7458.50-7460.00 parent 2026-05-18T04:00:00 confirmed 2026-05-18T04:05:00 status failed_inverted; 15m SHORT 7458.50-7462.50 parent 2026-05-19T09:15:00 confirmed 2026-05-19T09:30:00 status failed_inverted; 5m LONG 7458.75-7459.25 parent 2026-05-18T03:05:00 confirmed 2026-05-18T03:10:00 status failed_inverted; 5m SHORT 7458.75-7459.00 parent 2026-06-24T20:45:00 confirmed 2026-06-24T20:50:00 status failed_inverted; 15m SHORT 7458.75-7462.50 parent 2026-06-23T02:30:00 confirmed 2026-06-23T02:45:00 status failed_inverted; 60m LONG 7458.75-7460.00 parent 2026-05-18T04:00:00 confirmed 2026-05-18T05:00:00 status failed_inverted; 5m LONG 7459.00-7459.25 parent 2026-05-07T07:35:00 confirmed 2026-05-07T07:40:00 status failed_inverted; 5m LONG 7459.00-7467.25 parent 2026-05-18T12:55:00 confirmed 2026-05-18T13:00:00 status failed_inverted; 5m LONG 7459.00-7461.50 parent 2026-05-19T12:55:00 confirmed 2026-05-19T13:00:00 status failed_inverted
- Open above: 5m SHORT 7459.50-7461.25 parent 2026-07-23T09:10:00 confirmed 2026-07-23T09:15:00 status open_untouched; 15m SHORT 7471.75-7478.25 parent 2026-07-23T08:45:00 confirmed 2026-07-23T09:00:00 status open_untouched; 5m SHORT 7473.75-7475.50 parent 2026-07-23T08:40:00 confirmed 2026-07-23T08:45:00 status open_untouched; 15m SHORT 7482.75-7492.25 parent 2026-07-23T08:30:00 confirmed 2026-07-23T08:45:00 status open_untouched; 5m SHORT 7484.25-7486.75 parent 2026-07-23T08:25:00 confirmed 2026-07-23T08:30:00 status open_untouched; 5m SHORT 7489.00-7492.25 parent 2026-07-23T08:20:00 confirmed 2026-07-23T08:25:00 status open_untouched; 60m SHORT 7501.50-7508.50 parent 2026-07-23T08:00:00 confirmed 2026-07-23T09:00:00 status open_untouched; 15m SHORT 7505.75-7510.00 parent 2026-07-23T07:30:00 confirmed 2026-07-23T07:45:00 status open_untouched; 5m SHORT 7508.25-7511.75 parent 2026-07-23T07:25:00 confirmed 2026-07-23T07:30:00 status open_untouched; 5m SHORT 7514.75-7519.50 parent 2026-07-23T07:05:00 confirmed 2026-07-23T07:10:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof 2026-07-23T10:15:00 from 15M parent 2026-07-23T09:15:00 confirmed 2026-07-23T09:30:00.
- Defended-area management context: 5m LONG 7434.50-7448.00 is a callout before/near T1, not an issue by itself.
- Later rows: 2 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7458.75-7461.50 parent 2026-07-23T09:15:00 confirmed 2026-07-23T09:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-23T09:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-23T09:55:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-23T10:10:00, 2026-07-23T10:15:00, 2026-07-23T10:20:00, 2026-07-23T10:25:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-23T10:15:00. | PASS entry_stop_risk_contract: Entry 7457.00, protected 5M stop 7473.00, risk 16.00 pts. | PASS tactical_targets_from_actual_risk: T1 7433.00 and T2 7425.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7456.75.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-07-23T09:45:00
- First 5M return: 2026-07-23T09:55:00
- 5M wick defense: 2026-07-23T10:10:00, 2026-07-23T10:15:00, 2026-07-23T10:20:00, 2026-07-23T10:25:00
- Proof: 2026-07-23T10:15:00
- Entry/stop/risk: 7457.00 / 7473.00 / 16.00 pts
- T1/T2: 7433.00 / 7425.00
- Nearest liquidity: nearest prior low liquidity 7456.75
- Defended-area / obstacle management callout before or near T1: 5m LONG 7434.50-7448.00 parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-23T10:35:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7458.75-7461.50 parent 2026-07-23T09:15:00 confirmed 2026-07-23T09:30:00 failed_acceptance_through_15m defended 2026-07-23T10:00:00 failed 2026-07-23T09:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7458.75-7461.50 parent 2026-07-23T09:15:00 confirmed 2026-07-23T09:30:00 failed_acceptance_through_15m defended 2026-07-23T10:00:00 failed 2026-07-23T09:45:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-23T09:35:00; wick 2026-07-23T10:10:00; proof 2026-07-23T10:10:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7444.75 (prior 5M swing low liquidity from 2026-07-23T09:35:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7434.50-7448.00 parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00 status partial_touch; 5m LONG 7428.50-7430.00 parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7457.25-7457.75 parent 2026-05-19T06:40:00 confirmed 2026-05-19T06:45:00 status failed_inverted; 5m LONG 7457.25-7460.50 parent 2026-06-05T15:30:00 confirmed 2026-06-05T15:35:00 status failed_inverted; 5m SHORT 7457.25-7457.75 parent 2026-06-08T01:40:00 confirmed 2026-06-08T01:45:00 status failed_inverted; 5m SHORT 7457.25-7459.25 parent 2026-06-24T08:40:00 confirmed 2026-06-24T08:45:00 status failed_inverted; 15m LONG 7457.25-7458.50 parent 2026-05-20T04:30:00 confirmed 2026-05-20T04:45:00 status failed_inverted; 5m LONG 7457.50-7459.75 parent 2026-05-08T05:05:00 confirmed 2026-05-08T05:10:00 status failed_inverted; 5m SHORT 7457.50-7464.50 parent 2026-05-18T03:40:00 confirmed 2026-05-18T03:45:00 status failed_inverted; 5m SHORT 7457.75-7458.75 parent 2026-05-07T05:55:00 confirmed 2026-05-07T06:00:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7470.00-7474.25 parent 2026-07-23T09:50:00 confirmed 2026-07-23T09:55:00 status partial_touch; 15m SHORT 7482.75-7492.25 parent 2026-07-23T08:30:00 confirmed 2026-07-23T08:45:00 status partial_touch; 5m SHORT 7484.25-7486.75 parent 2026-07-23T08:25:00 confirmed 2026-07-23T08:30:00 status partial_touch; 60m SHORT 7486.50-7490.00 parent 2026-07-23T09:00:00 confirmed 2026-07-23T10:00:00 status open_untouched; 5m SHORT 7489.00-7492.25 parent 2026-07-23T08:20:00 confirmed 2026-07-23T08:25:00 status open_untouched; 60m SHORT 7501.50-7508.50 parent 2026-07-23T08:00:00 confirmed 2026-07-23T09:00:00 status open_untouched; 15m SHORT 7505.75-7510.00 parent 2026-07-23T07:30:00 confirmed 2026-07-23T07:45:00 status open_untouched; 5m SHORT 7508.25-7511.75 parent 2026-07-23T07:25:00 confirmed 2026-07-23T07:30:00 status open_untouched
- Objective ladder: liquidity 7444.75 reached 2026-07-23T10:55:00 (prior 5M swing low liquidity from 2026-07-23T09:35:00); session_extreme 7444.75 reached 2026-07-23T10:55:00 (RTH low liquidity before proof); open_fvg 7434.50 reached 2026-07-23T11:10:00 (5m LONG open FVG partial_touch parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00); tactical 7433.00 reached 2026-07-23T11:10:00 (T1 1.5R); open_fvg 7428.50 reached 2026-07-23T11:15:00 (5m LONG open FVG open_untouched parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00); tactical 7425.00 reached 2026-07-23T11:15:00 (T2 2.0R); open_fvg 7404.75 not reached (5m LONG open FVG partial_touch parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00); open_fvg 7355.50 not reached (15m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00); open_fvg 7345.25 not reached (5m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00); open_fvg 7321.00 not reached (5m LONG open FVG partial_touch parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00); open_fvg 7318.25 not reached (5m LONG open FVG open_untouched parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00); open_fvg 7261.00 not reached (5m LONG open FVG partial_touch parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00)
- Story: SHORT proof completed at 2026-07-23T10:15:00 from 7458.75-7461.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7434.50-7448.00 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7444.75 liquidity, 7444.75 session_extreme, 7434.50 open_fvg, 7428.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-23T11:10:00, one MES +$120.00
- Managed outcome: LQ1 at 2026-07-23T10:55:00, exit 7444.75, one MES +$61.25
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic.

### 2. SHORT 15M FVG 7445.25-7445.75 parent 2026-07-23T11:00:00 confirmed 2026-07-23T11:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-23T11:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-23T11:15:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7458.75-7461.50 parent 2026-07-23T09:15:00 confirmed 2026-07-23T09:30:00 failed_acceptance_through_15m defended 2026-07-23T10:00:00 failed 2026-07-23T09:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7458.75-7461.50 parent 2026-07-23T09:15:00 confirmed 2026-07-23T09:30:00 failed_acceptance_through_15m defended 2026-07-23T10:00:00 failed 2026-07-23T09:45:00
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

### 3. SHORT 15M FVG 7437.00-7440.00 parent 2026-07-23T11:15:00 confirmed 2026-07-23T11:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-23T11:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-23T11:45:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-23T11:50:00. | PASS entry_stop_risk_contract: Entry 7429.25, protected 5M stop 7466.75, risk 37.50 pts. | PASS tactical_targets_from_actual_risk: T1 7373.00 and T2 7354.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7429.00.
- Parent displacement: yes
- Parent displacement candle: 2026-07-23T11:15:00
- Parent failure: not found
- First 5M return: 2026-07-23T11:45:00
- 5M wick defense: none
- Proof: 2026-07-23T11:50:00
- Entry/stop/risk: 7429.25 / 7466.75 / 37.50 pts
- T1/T2: 7373.00 / 7354.25
- Nearest liquidity: nearest prior low liquidity 7429.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-23T11:55:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7458.75-7461.50 parent 2026-07-23T09:15:00 confirmed 2026-07-23T09:30:00 failed_acceptance_through_15m defended 2026-07-23T10:00:00 failed 2026-07-23T09:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7458.75-7461.50 parent 2026-07-23T09:15:00 confirmed 2026-07-23T09:30:00 failed_acceptance_through_15m defended 2026-07-23T10:00:00 failed 2026-07-23T09:45:00
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-07-23T11:45:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: 7411.75 (prior 5M swing low liquidity from 2026-07-23T11:35:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch; 5m LONG 7247.75-7253.25 parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00 status partial_touch; 15m LONG 7244.75-7252.25 parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7429.50-7430.50 parent 2026-06-10T03:25:00 confirmed 2026-06-10T03:30:00 status failed_inverted; 5m SHORT 7430.00-7431.25 parent 2026-06-26T12:25:00 confirmed 2026-06-26T12:30:00 status failed_inverted; 5m LONG 7430.00-7435.50 parent 2026-06-26T12:35:00 confirmed 2026-06-26T12:40:00 status failed_inverted; 5m SHORT 7430.00-7432.00 parent 2026-06-26T14:20:00 confirmed 2026-06-26T14:25:00 status failed_inverted; 5m SHORT 7430.25-7431.00 parent 2026-05-06T11:40:00 confirmed 2026-05-06T11:45:00 status failed_inverted; 5m LONG 7430.25-7436.25 parent 2026-06-25T10:10:00 confirmed 2026-06-25T10:15:00 status failed_inverted; 5m SHORT 7430.50-7436.75 parent 2026-06-25T19:45:00 confirmed 2026-06-25T19:50:00 status failed_inverted; 15m SHORT 7430.50-7431.75 parent 2026-06-25T19:45:00 confirmed 2026-06-25T20:00:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7437.00-7440.00 parent 2026-07-23T11:15:00 confirmed 2026-07-23T11:30:00 status partial_touch; 5m SHORT 7437.50-7440.75 parent 2026-07-23T11:05:00 confirmed 2026-07-23T11:10:00 status open_untouched; 15m SHORT 7445.25-7445.75 parent 2026-07-23T11:00:00 confirmed 2026-07-23T11:15:00 status open_untouched; 5m SHORT 7446.00-7446.75 parent 2026-07-23T10:55:00 confirmed 2026-07-23T11:00:00 status open_untouched; 5m SHORT 7470.00-7474.25 parent 2026-07-23T09:50:00 confirmed 2026-07-23T09:55:00 status partial_touch; 15m SHORT 7482.75-7492.25 parent 2026-07-23T08:30:00 confirmed 2026-07-23T08:45:00 status partial_touch; 5m SHORT 7484.25-7486.75 parent 2026-07-23T08:25:00 confirmed 2026-07-23T08:30:00 status partial_touch; 60m SHORT 7486.50-7490.00 parent 2026-07-23T09:00:00 confirmed 2026-07-23T10:00:00 status open_untouched
- Objective ladder: liquidity 7411.75 not reached (prior 5M swing low liquidity from 2026-07-23T11:35:00); session_extreme 7411.75 not reached (RTH low liquidity before proof); open_fvg 7404.75 not reached (5m LONG open FVG partial_touch parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00); tactical 7373.00 not reached (T1 1.5R); open_fvg 7355.50 not reached (15m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00); tactical 7354.25 not reached (T2 2.0R); open_fvg 7345.25 not reached (5m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00); open_fvg 7321.00 not reached (5m LONG open FVG partial_touch parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00); open_fvg 7318.25 not reached (5m LONG open FVG open_untouched parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00); open_fvg 7261.00 not reached (5m LONG open FVG partial_touch parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00); open_fvg 7247.75 not reached (5m LONG open FVG partial_touch parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00); open_fvg 7244.75 not reached (15m LONG open FVG partial_touch parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00)
- Story: SHORT proof completed at 2026-07-23T11:50:00 from 7437.00-7440.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7404.75-7428.50 with reaction obstacle_defended_management_callout. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-24T05:45:00, one MES $-187.50
- Managed outcome: Stop at 2026-07-24T05:45:00, exit 7466.75, one MES $-187.50
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.
