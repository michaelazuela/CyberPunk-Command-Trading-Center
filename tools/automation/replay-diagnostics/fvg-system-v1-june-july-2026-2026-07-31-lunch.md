# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-31 / lunch (2026-07-31T12:00:00 to 2026-07-31T16:00:00)
Context window: 275 days (2025-10-29T00:00:00 to 2026-08-01T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 53425 bars (2025-10-29T00:00:00 to 2026-07-31T17:00:00)
- 15m: 17831 bars (2025-10-29T00:00:00 to 2026-07-31T17:00:00)
- 60m: 4450 bars (2025-10-29T00:00:00 to 2026-07-31T17:00:00)
- 120m: 2338 bars (2025-10-29T00:00:00 to 2026-07-31T17:00:00)
- 240m: 1336 bars (2025-10-29T02:00:00 to 2026-07-31T17:00:00)

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
- Open below: 5m LONG 7471.75-7477.00 parent 2026-07-31T11:55:00 confirmed 2026-07-31T12:00:00 status open_untouched; 240m LONG 7457.75-7467.75 parent 2026-07-30T17:00:00 confirmed 2026-07-30T22:00:00 status partial_touch; 5m LONG 7459.25-7461.25 parent 2026-07-31T11:40:00 confirmed 2026-07-31T11:45:00 status open_untouched; 240m LONG 7440.00-7450.75 parent 2026-07-30T14:00:00 confirmed 2026-07-30T17:00:00 status open_untouched; 15m LONG 7414.50-7416.25 parent 2026-07-30T11:45:00 confirmed 2026-07-30T12:00:00 status open_untouched; 240m LONG 7388.00-7398.75 parent 2026-07-30T10:00:00 confirmed 2026-07-30T14:00:00 status open_untouched; 60m LONG 7392.25-7392.75 parent 2026-07-30T08:00:00 confirmed 2026-07-30T09:00:00 status open_untouched; 120m LONG 7388.00-7392.75 parent 2026-07-30T08:00:00 confirmed 2026-07-30T10:00:00 status open_untouched; 5m LONG 7387.50-7388.75 parent 2026-07-30T07:05:00 confirmed 2026-07-30T07:10:00 status open_untouched; 15m LONG 7382.50-7384.00 parent 2026-07-30T06:30:00 confirmed 2026-07-30T06:45:00 status partial_touch
- Failed above: 5m LONG 7482.75-7484.50 parent 2026-05-20T19:05:00 confirmed 2026-05-20T19:10:00 status failed_inverted; 5m SHORT 7482.75-7483.50 parent 2026-06-25T07:10:00 confirmed 2026-06-25T07:15:00 status failed_inverted; 5m LONG 7482.75-7485.75 parent 2026-07-08T12:05:00 confirmed 2026-07-08T12:10:00 status failed_inverted; 15m SHORT 7482.75-7494.50 parent 2026-06-08T15:15:00 confirmed 2026-06-08T15:30:00 status failed_inverted; 15m SHORT 7482.75-7492.25 parent 2026-07-23T08:30:00 confirmed 2026-07-23T08:45:00 status failed_inverted; 5m SHORT 7483.00-7484.75 parent 2026-05-08T14:45:00 confirmed 2026-05-08T14:50:00 status failed_inverted; 5m LONG 7483.00-7483.25 parent 2026-05-12T21:00:00 confirmed 2026-05-12T21:05:00 status failed_inverted; 15m SHORT 7483.00-7486.75 parent 2026-05-08T14:45:00 confirmed 2026-05-08T15:00:00 status failed_inverted; 15m LONG 7483.00-7486.00 parent 2026-05-12T15:45:00 confirmed 2026-05-12T16:00:00 status failed_inverted; 5m SHORT 7483.25-7485.50 parent 2026-07-20T16:10:00 confirmed 2026-07-20T16:15:00 status failed_inverted
- Open above: 120m SHORT 7485.00-7494.25 parent 2026-07-31T10:00:00 confirmed 2026-07-31T12:00:00 status open_untouched; 5m SHORT 7487.75-7493.00 parent 2026-07-31T09:45:00 confirmed 2026-07-31T09:50:00 status open_untouched; 15m SHORT 7487.75-7490.00 parent 2026-07-31T09:45:00 confirmed 2026-07-31T10:00:00 status open_untouched; 5m SHORT 7494.00-7497.75 parent 2026-07-31T09:40:00 confirmed 2026-07-31T09:45:00 status open_untouched; 60m SHORT 7515.25-7518.25 parent 2026-07-27T08:00:00 confirmed 2026-07-27T09:00:00 status partial_touch; 15m SHORT 7519.25-7521.50 parent 2026-07-27T07:15:00 confirmed 2026-07-27T07:30:00 status open_untouched; 5m SHORT 7520.00-7521.50 parent 2026-07-27T07:05:00 confirmed 2026-07-27T07:10:00 status open_untouched; 5m SHORT 7526.00-7528.00 parent 2026-07-23T01:50:00 confirmed 2026-07-23T01:55:00 status partial_touch; 15m SHORT 7526.50-7528.00 parent 2026-07-23T02:00:00 confirmed 2026-07-23T02:15:00 status partial_touch; 5m SHORT 7531.50-7533.00 parent 2026-07-23T01:40:00 confirmed 2026-07-23T01:45:00 status open_untouched

## Review Order
- Primary campaign to review first: LONG proof none from 15M parent 2026-07-31T12:00:00 confirmed 2026-07-31T12:15:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: 4 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7475.25-7475.75 parent 2026-07-31T12:00:00 confirmed 2026-07-31T12:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7475.25-7475.75 parent 2026-07-31T12:00:00 confirmed 2026-07-31T12:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7475.25-7475.75 parent 2026-07-31T12:00:00 confirmed 2026-07-31T12:15:00 untested_by_15m
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
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 2. LONG 15M FVG 7488.00-7492.50 parent 2026-07-31T12:30:00 confirmed 2026-07-31T12:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-31T12:45:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-31T12:50:00. | PASS entry_stop_risk_contract: Entry 7497.25, protected 5M stop 7479.00, risk 18.25 pts. | PASS tactical_targets_from_actual_risk: T1 7524.75 and T2 7533.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7497.50.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-07-31T12:45:00
- 5M wick defense: none
- Proof: 2026-07-31T12:50:00
- Entry/stop/risk: 7497.25 / 7479.00 / 18.25 pts
- T1/T2: 7524.75 / 7533.75
- Nearest liquidity: nearest prior high liquidity 7497.50
- Defended-area / obstacle management callout before or near T1: 5m LONG 7497.50-7500.50 parent 2026-05-15T08:55:00 confirmed 2026-05-15T09:00:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-31T12:55:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7475.25-7475.75 parent 2026-07-31T12:00:00 confirmed 2026-07-31T12:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7475.25-7475.75 parent 2026-07-31T12:00:00 confirmed 2026-07-31T12:15:00 untested_by_15m
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-07-31T12:45:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: 7515.25 (prior 5M swing high liquidity from 2026-07-31T09:35:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 120m SHORT 7485.00-7494.25 parent 2026-07-31T10:00:00 confirmed 2026-07-31T12:00:00 status open_untouched; 15m LONG 7488.00-7492.50 parent 2026-07-31T12:30:00 confirmed 2026-07-31T12:45:00 status open_untouched; 5m LONG 7487.50-7489.50 parent 2026-07-31T12:25:00 confirmed 2026-07-31T12:30:00 status open_untouched; 5m LONG 7471.75-7477.00 parent 2026-07-31T11:55:00 confirmed 2026-07-31T12:00:00 status partial_touch; 15m LONG 7475.25-7475.75 parent 2026-07-31T12:00:00 confirmed 2026-07-31T12:15:00 status open_untouched; 240m LONG 7457.75-7467.75 parent 2026-07-30T17:00:00 confirmed 2026-07-30T22:00:00 status partial_touch; 5m LONG 7459.25-7461.25 parent 2026-07-31T11:40:00 confirmed 2026-07-31T11:45:00 status open_untouched; 240m LONG 7440.00-7450.75 parent 2026-07-30T14:00:00 confirmed 2026-07-30T17:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7497.50-7500.50 parent 2026-05-15T08:55:00 confirmed 2026-05-15T09:00:00 status failed_inverted; 5m LONG 7497.50-7497.75 parent 2026-06-29T15:25:00 confirmed 2026-06-29T15:30:00 status failed_inverted; 5m SHORT 7497.50-7499.75 parent 2026-07-17T16:00:00 confirmed 2026-07-17T16:05:00 status failed_inverted; 60m SHORT 7497.50-7499.00 parent 2026-07-20T15:00:00 confirmed 2026-07-20T16:00:00 status failed_inverted; 5m LONG 7497.75-7498.00 parent 2026-05-12T23:40:00 confirmed 2026-05-12T23:45:00 status failed_inverted; 5m SHORT 7497.75-7498.00 parent 2026-05-18T18:50:00 confirmed 2026-05-18T18:55:00 status failed_inverted; 5m LONG 7497.75-7500.75 parent 2026-07-02T15:30:00 confirmed 2026-07-02T15:35:00 status failed_inverted; 5m LONG 7498.00-7499.00 parent 2026-05-11T10:15:00 confirmed 2026-05-11T10:20:00 status failed_inverted
- Open FVGs above at proof: 60m SHORT 7515.25-7518.25 parent 2026-07-27T08:00:00 confirmed 2026-07-27T09:00:00 status partial_touch; 15m SHORT 7519.25-7521.50 parent 2026-07-27T07:15:00 confirmed 2026-07-27T07:30:00 status open_untouched; 5m SHORT 7520.00-7521.50 parent 2026-07-27T07:05:00 confirmed 2026-07-27T07:10:00 status open_untouched; 5m SHORT 7526.00-7528.00 parent 2026-07-23T01:50:00 confirmed 2026-07-23T01:55:00 status partial_touch; 15m SHORT 7526.50-7528.00 parent 2026-07-23T02:00:00 confirmed 2026-07-23T02:15:00 status partial_touch; 5m SHORT 7531.50-7533.00 parent 2026-07-23T01:40:00 confirmed 2026-07-23T01:45:00 status open_untouched; 60m SHORT 7531.50-7538.25 parent 2026-07-22T23:00:00 confirmed 2026-07-23T00:00:00 status partial_touch; 5m SHORT 7537.00-7539.25 parent 2026-07-22T22:15:00 confirmed 2026-07-22T22:20:00 status open_untouched
- Objective ladder: liquidity 7515.25 reached 2026-07-31T13:30:00 (prior 5M swing high liquidity from 2026-07-31T09:35:00); session_extreme 7515.25 reached 2026-07-31T13:30:00 (RTH high liquidity before proof); open_fvg 7518.25 reached 2026-07-31T15:20:00 (60m SHORT open FVG partial_touch parent 2026-07-27T08:00:00 confirmed 2026-07-27T09:00:00); open_fvg 7521.50 reached 2026-07-31T15:20:00 (15m SHORT open FVG open_untouched parent 2026-07-27T07:15:00 confirmed 2026-07-27T07:30:00); open_fvg 7521.50 reached 2026-07-31T15:20:00 (5m SHORT open FVG open_untouched parent 2026-07-27T07:05:00 confirmed 2026-07-27T07:10:00); tactical 7524.75 reached 2026-07-31T15:20:00 (T1 1.5R); open_fvg 7528.00 reached 2026-07-31T15:25:00 (5m SHORT open FVG partial_touch parent 2026-07-23T01:50:00 confirmed 2026-07-23T01:55:00); open_fvg 7528.00 reached 2026-07-31T15:25:00 (15m SHORT open FVG partial_touch parent 2026-07-23T02:00:00 confirmed 2026-07-23T02:15:00); open_fvg 7533.00 reached 2026-07-31T15:45:00 (5m SHORT open FVG open_untouched parent 2026-07-23T01:40:00 confirmed 2026-07-23T01:45:00); tactical 7533.75 reached 2026-07-31T15:50:00 (T2 2.0R); open_fvg 7538.25 reached 2026-07-31T15:55:00 (60m SHORT open FVG partial_touch parent 2026-07-22T23:00:00 confirmed 2026-07-23T00:00:00); open_fvg 7539.25 reached 2026-07-31T15:55:00 (5m SHORT open FVG open_untouched parent 2026-07-22T22:15:00 confirmed 2026-07-22T22:20:00)
- Story: LONG proof completed at 2026-07-31T12:50:00 from 7488.00-7492.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7497.50-7500.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7515.25 liquidity, 7515.25 session_extreme, 7518.25 open_fvg, 7521.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-31T15:20:00, one MES +$137.50
- Managed outcome: LQ1 at 2026-07-31T13:30:00, exit 7515.25, one MES +$90.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 3. LONG 15M FVG 7501.75-7502.50 parent 2026-07-31T13:15:00 confirmed 2026-07-31T13:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7475.25-7475.75 parent 2026-07-31T12:00:00 confirmed 2026-07-31T12:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7475.25-7475.75 parent 2026-07-31T12:00:00 confirmed 2026-07-31T12:15:00 untested_by_15m
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
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 4. LONG 15M FVG 7505.00-7507.50 parent 2026-07-31T13:30:00 confirmed 2026-07-31T13:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-31T13:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-31T13:45:00, 2026-07-31T14:05:00, 2026-07-31T14:10:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-31T13:45:00. | PASS entry_stop_risk_contract: Entry 7510.00, protected 5M stop 7496.50, risk 13.50 pts. | PASS tactical_targets_from_actual_risk: T1 7530.25 and T2 7537.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7510.25.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-07-31T13:45:00
- 5M wick defense: 2026-07-31T13:45:00, 2026-07-31T14:05:00, 2026-07-31T14:10:00
- Proof: 2026-07-31T13:45:00
- Entry/stop/risk: 7510.00 / 7496.50 / 13.50 pts
- T1/T2: 7530.25 / 7537.00
- Nearest liquidity: nearest prior high liquidity 7510.25
- Defended-area / obstacle management callout before or near T1: 5m LONG 7510.25-7510.50 parent 2026-05-11T11:55:00 confirmed 2026-05-11T12:00:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-31T13:50:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7475.25-7475.75 parent 2026-07-31T12:00:00 confirmed 2026-07-31T12:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7475.25-7475.75 parent 2026-07-31T12:00:00 confirmed 2026-07-31T12:15:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-31T13:45:00; wick 2026-07-31T13:45:00; proof 2026-07-31T13:45:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7515.25 (prior 5M swing high liquidity from 2026-07-31T09:35:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 15m LONG 7505.00-7507.50 parent 2026-07-31T13:30:00 confirmed 2026-07-31T13:45:00 status open_untouched; 15m LONG 7501.75-7502.50 parent 2026-07-31T13:15:00 confirmed 2026-07-31T13:30:00 status open_untouched; 120m SHORT 7485.00-7494.25 parent 2026-07-31T10:00:00 confirmed 2026-07-31T12:00:00 status open_untouched; 15m LONG 7488.00-7492.50 parent 2026-07-31T12:30:00 confirmed 2026-07-31T12:45:00 status partial_touch; 5m LONG 7487.50-7489.50 parent 2026-07-31T12:25:00 confirmed 2026-07-31T12:30:00 status open_untouched; 5m LONG 7471.75-7477.00 parent 2026-07-31T11:55:00 confirmed 2026-07-31T12:00:00 status partial_touch; 15m LONG 7475.25-7475.75 parent 2026-07-31T12:00:00 confirmed 2026-07-31T12:15:00 status open_untouched; 240m LONG 7457.75-7467.75 parent 2026-07-30T17:00:00 confirmed 2026-07-30T22:00:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7510.25-7510.50 parent 2026-05-11T11:55:00 confirmed 2026-05-11T12:00:00 status failed_inverted; 5m LONG 7510.25-7511.50 parent 2026-06-30T00:40:00 confirmed 2026-06-30T00:45:00 status failed_inverted; 5m SHORT 7510.25-7511.50 parent 2026-07-20T01:00:00 confirmed 2026-07-20T01:05:00 status failed_inverted; 5m SHORT 7510.25-7511.00 parent 2026-07-20T13:05:00 confirmed 2026-07-20T13:10:00 status failed_inverted; 5m SHORT 7510.25-7511.75 parent 2026-07-27T09:20:00 confirmed 2026-07-27T09:25:00 status failed_inverted; 5m SHORT 7510.50-7516.25 parent 2026-05-15T08:00:00 confirmed 2026-05-15T08:05:00 status failed_inverted; 5m LONG 7510.50-7518.25 parent 2026-06-30T09:55:00 confirmed 2026-06-30T10:00:00 status failed_inverted; 5m LONG 7510.50-7511.00 parent 2026-07-08T12:45:00 confirmed 2026-07-08T12:50:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7512.00-7512.25 parent 2026-07-31T13:40:00 confirmed 2026-07-31T13:45:00 status open_untouched; 60m SHORT 7515.25-7518.25 parent 2026-07-27T08:00:00 confirmed 2026-07-27T09:00:00 status partial_touch; 15m SHORT 7519.25-7521.50 parent 2026-07-27T07:15:00 confirmed 2026-07-27T07:30:00 status open_untouched; 5m SHORT 7520.00-7521.50 parent 2026-07-27T07:05:00 confirmed 2026-07-27T07:10:00 status open_untouched; 5m SHORT 7526.00-7528.00 parent 2026-07-23T01:50:00 confirmed 2026-07-23T01:55:00 status partial_touch; 15m SHORT 7526.50-7528.00 parent 2026-07-23T02:00:00 confirmed 2026-07-23T02:15:00 status partial_touch; 5m SHORT 7531.50-7533.00 parent 2026-07-23T01:40:00 confirmed 2026-07-23T01:45:00 status open_untouched; 60m SHORT 7531.50-7538.25 parent 2026-07-22T23:00:00 confirmed 2026-07-23T00:00:00 status partial_touch
- Objective ladder: open_fvg 7512.25 reached 2026-07-31T13:50:00 (5m SHORT open FVG open_untouched parent 2026-07-31T13:40:00 confirmed 2026-07-31T13:45:00); liquidity 7515.25 reached 2026-07-31T14:25:00 (prior 5M swing high liquidity from 2026-07-31T09:35:00); session_extreme 7516.75 reached 2026-07-31T14:55:00 (RTH high liquidity before proof); open_fvg 7518.25 reached 2026-07-31T15:20:00 (60m SHORT open FVG partial_touch parent 2026-07-27T08:00:00 confirmed 2026-07-27T09:00:00); open_fvg 7521.50 reached 2026-07-31T15:20:00 (15m SHORT open FVG open_untouched parent 2026-07-27T07:15:00 confirmed 2026-07-27T07:30:00); open_fvg 7521.50 reached 2026-07-31T15:20:00 (5m SHORT open FVG open_untouched parent 2026-07-27T07:05:00 confirmed 2026-07-27T07:10:00); open_fvg 7528.00 reached 2026-07-31T15:25:00 (5m SHORT open FVG partial_touch parent 2026-07-23T01:50:00 confirmed 2026-07-23T01:55:00); open_fvg 7528.00 reached 2026-07-31T15:25:00 (15m SHORT open FVG partial_touch parent 2026-07-23T02:00:00 confirmed 2026-07-23T02:15:00); tactical 7530.25 reached 2026-07-31T15:25:00 (T1 1.5R); open_fvg 7533.00 reached 2026-07-31T15:45:00 (5m SHORT open FVG open_untouched parent 2026-07-23T01:40:00 confirmed 2026-07-23T01:45:00); tactical 7537.00 reached 2026-07-31T15:50:00 (T2 2.0R); open_fvg 7538.25 reached 2026-07-31T15:55:00 (60m SHORT open FVG partial_touch parent 2026-07-22T23:00:00 confirmed 2026-07-23T00:00:00)
- Story: LONG proof completed at 2026-07-31T13:45:00 from 7505.00-7507.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7510.25-7510.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7512.25 open_fvg, 7515.25 liquidity, 7516.75 session_extreme, 7518.25 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-31T15:25:00, one MES +$101.25
- Managed outcome: LQ1 at 2026-07-31T14:25:00, exit 7515.25, one MES +$26.25
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-31T13:45:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 5. LONG 15M FVG 7517.25-7520.00 parent 2026-07-31T15:30:00 confirmed 2026-07-31T15:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-31T15:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-31T16:00:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-31T15:30:00
- Parent failure: not found
- First 5M return: 2026-07-31T16:00:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7475.25-7475.75 parent 2026-07-31T12:00:00 confirmed 2026-07-31T12:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7475.25-7475.75 parent 2026-07-31T12:00:00 confirmed 2026-07-31T12:15:00 untested_by_15m
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-07-31T16:00:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.
