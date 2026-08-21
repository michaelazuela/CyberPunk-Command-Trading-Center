# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-22 / morning (2026-07-22T09:15:00 to 2026-07-22T12:00:00)
Context window: 275 days (2025-10-20T00:00:00 to 2026-07-23T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 51911 bars (2025-10-28T18:05:00 to 2026-07-23T23:55:00)
- 15m: 17325 bars (2025-10-28T18:15:00 to 2026-07-23T23:45:00)
- 60m: 4322 bars (2025-10-28T19:00:00 to 2026-07-23T23:00:00)
- 120m: 2270 bars (2025-10-28T20:00:00 to 2026-07-23T22:00:00)
- 240m: 1302 bars (2025-10-28T22:00:00 to 2026-07-23T22:00:00)

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
- Open below: 240m LONG 7499.50-7513.75 parent 2026-07-21T02:00:00 confirmed 2026-07-21T06:00:00 status partial_touch; 60m LONG 7502.00-7512.50 parent 2026-07-21T00:00:00 confirmed 2026-07-21T01:00:00 status partial_touch; 120m LONG 7499.50-7510.00 parent 2026-07-21T00:00:00 confirmed 2026-07-21T02:00:00 status partial_touch; 15m LONG 7502.00-7503.25 parent 2026-07-20T23:15:00 confirmed 2026-07-20T23:30:00 status partial_touch; 5m LONG 7502.00-7502.75 parent 2026-07-20T23:05:00 confirmed 2026-07-20T23:10:00 status open_untouched; 5m LONG 7499.75-7501.75 parent 2026-07-20T23:00:00 confirmed 2026-07-20T23:05:00 status open_untouched; 15m LONG 7501.50-7501.75 parent 2026-07-20T23:00:00 confirmed 2026-07-20T23:15:00 status open_untouched; 60m LONG 7499.50-7501.75 parent 2026-07-20T23:00:00 confirmed 2026-07-21T00:00:00 status open_untouched; 15m LONG 7497.25-7498.25 parent 2026-07-20T22:45:00 confirmed 2026-07-20T23:00:00 status open_untouched; 5m LONG 7497.25-7497.75 parent 2026-07-20T22:35:00 confirmed 2026-07-20T22:40:00 status open_untouched
- Failed above: 5m SHORT 7519.50-7520.50 parent 2026-07-01T03:10:00 confirmed 2026-07-01T03:15:00 status failed_inverted; 15m SHORT 7519.50-7524.25 parent 2026-07-17T00:15:00 confirmed 2026-07-17T00:30:00 status failed_inverted; 5m SHORT 7519.75-7523.75 parent 2026-05-15T04:20:00 confirmed 2026-05-15T04:25:00 status failed_inverted; 5m SHORT 7519.75-7520.00 parent 2026-06-22T22:10:00 confirmed 2026-06-22T22:15:00 status failed_inverted; 5m SHORT 7519.75-7521.50 parent 2026-07-08T19:20:00 confirmed 2026-07-08T19:25:00 status failed_inverted; 15m LONG 7519.75-7520.50 parent 2026-05-21T05:15:00 confirmed 2026-05-21T05:30:00 status failed_inverted; 5m SHORT 7520.00-7527.50 parent 2026-06-08T11:30:00 confirmed 2026-06-08T11:35:00 status failed_inverted; 5m LONG 7520.00-7523.50 parent 2026-07-08T14:05:00 confirmed 2026-07-08T14:10:00 status failed_inverted; 5m SHORT 7520.00-7521.50 parent 2026-07-22T03:35:00 confirmed 2026-07-22T03:40:00 status failed_inverted; 5m LONG 7520.00-7521.25 parent 2026-07-22T04:25:00 confirmed 2026-07-22T04:30:00 status failed_inverted
- Open above: 5m SHORT 7520.00-7521.50 parent 2026-07-22T08:50:00 confirmed 2026-07-22T08:55:00 status partial_touch; 60m SHORT 7523.25-7524.25 parent 2026-07-22T08:00:00 confirmed 2026-07-22T09:00:00 status open_untouched; 5m SHORT 7540.50-7543.25 parent 2026-07-21T23:35:00 confirmed 2026-07-21T23:40:00 status partial_touch; 120m SHORT 7541.25-7556.75 parent 2026-07-16T22:00:00 confirmed 2026-07-17T00:00:00 status partial_touch; 5m SHORT 7555.75-7558.50 parent 2026-07-16T20:10:00 confirmed 2026-07-16T20:15:00 status partial_touch; 60m SHORT 7556.25-7556.75 parent 2026-07-16T21:00:00 confirmed 2026-07-16T22:00:00 status open_untouched; 15m SHORT 7557.25-7558.50 parent 2026-07-16T20:15:00 confirmed 2026-07-16T20:30:00 status open_untouched; 240m SHORT 7563.75-7579.50 parent 2026-07-16T16:00:00 confirmed 2026-07-16T20:00:00 status partial_touch; 15m SHORT 7568.25-7569.50 parent 2026-07-16T18:30:00 confirmed 2026-07-16T18:45:00 status open_untouched; 5m SHORT 7570.50-7571.50 parent 2026-07-16T18:15:00 confirmed 2026-07-16T18:20:00 status open_untouched

## Review Order
- Primary campaign to review first: LONG proof 2026-07-22T10:50:00 from 15M parent 2026-07-22T09:45:00 confirmed 2026-07-22T10:00:00.
- Defended-area management context: 5m SHORT 7536.25-7536.50 is a callout before/near T1, not an issue by itself.
- Later rows: 5 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-22T09:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-22T09:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00 untested_by_15m
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

### 2. LONG 15M FVG 7528.75-7535.50 parent 2026-07-22T09:45:00 confirmed 2026-07-22T10:00:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-22T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-22T10:30:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-22T10:40:00, 2026-07-22T10:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-22T10:50:00. | PASS entry_stop_risk_contract: Entry 7536.00, protected 5M stop 7518.75, risk 17.25 pts. | PASS tactical_targets_from_actual_risk: T1 7562.00 and T2 7570.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7536.25.
- Parent displacement: yes
- Parent displacement candle: 2026-07-22T09:45:00
- Parent failure: not found
- First 5M return: 2026-07-22T10:30:00
- 5M wick defense: 2026-07-22T10:40:00, 2026-07-22T10:55:00
- Proof: 2026-07-22T10:50:00
- Entry/stop/risk: 7536.00 / 7518.75 / 17.25 pts
- T1/T2: 7562.00 / 7570.50
- Nearest liquidity: nearest prior high liquidity 7536.25
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7536.25-7536.50 parent 2026-06-17T19:40:00 confirmed 2026-06-17T19:45:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-22T10:55:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-22T10:30:00; wick 2026-07-22T10:40:00; proof 2026-07-22T10:50:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7556.25 (prior 5M swing high liquidity from 2026-07-22T10:10:00)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no defended FVG management objective interrupted delivery.
- Open FVGs below at proof: 15m LONG 7528.75-7535.50 parent 2026-07-22T09:45:00 confirmed 2026-07-22T10:00:00 status partial_touch; 15m LONG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00 status open_untouched; 5m LONG 7520.75-7522.50 parent 2026-07-22T09:20:00 confirmed 2026-07-22T09:25:00 status open_untouched; 240m LONG 7499.50-7513.75 parent 2026-07-21T02:00:00 confirmed 2026-07-21T06:00:00 status partial_touch; 60m LONG 7502.00-7512.50 parent 2026-07-21T00:00:00 confirmed 2026-07-21T01:00:00 status partial_touch; 120m LONG 7499.50-7510.00 parent 2026-07-21T00:00:00 confirmed 2026-07-21T02:00:00 status partial_touch; 15m LONG 7502.00-7503.25 parent 2026-07-20T23:15:00 confirmed 2026-07-20T23:30:00 status partial_touch; 5m LONG 7502.00-7502.75 parent 2026-07-20T23:05:00 confirmed 2026-07-20T23:10:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7536.25-7536.50 parent 2026-06-17T19:40:00 confirmed 2026-06-17T19:45:00 status failed_inverted; 5m LONG 7536.25-7537.50 parent 2026-06-30T11:25:00 confirmed 2026-06-30T11:30:00 status failed_inverted; 5m LONG 7536.25-7539.25 parent 2026-07-01T20:55:00 confirmed 2026-07-01T21:00:00 status failed_inverted; 5m SHORT 7536.25-7537.00 parent 2026-07-08T22:40:00 confirmed 2026-07-08T22:45:00 status failed_inverted; 5m LONG 7536.25-7541.50 parent 2026-07-20T09:35:00 confirmed 2026-07-20T09:40:00 status failed_inverted; 5m SHORT 7536.25-7539.00 parent 2026-07-21T23:55:00 confirmed 2026-07-22T00:00:00 status failed_inverted; 15m LONG 7536.25-7539.00 parent 2026-06-22T16:00:00 confirmed 2026-06-22T16:15:00 status failed_inverted; 5m LONG 7536.50-7537.25 parent 2026-05-22T06:50:00 confirmed 2026-05-22T06:55:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7540.00-7543.00 parent 2026-07-22T10:30:00 confirmed 2026-07-22T10:45:00 status open_untouched; 120m SHORT 7541.25-7556.75 parent 2026-07-16T22:00:00 confirmed 2026-07-17T00:00:00 status partial_touch; 5m SHORT 7545.50-7547.50 parent 2026-07-22T10:15:00 confirmed 2026-07-22T10:20:00 status partial_touch; 5m SHORT 7555.75-7558.50 parent 2026-07-16T20:10:00 confirmed 2026-07-16T20:15:00 status partial_touch; 60m SHORT 7556.25-7556.75 parent 2026-07-16T21:00:00 confirmed 2026-07-16T22:00:00 status open_untouched; 15m SHORT 7557.25-7558.50 parent 2026-07-16T20:15:00 confirmed 2026-07-16T20:30:00 status open_untouched; 240m SHORT 7563.75-7579.50 parent 2026-07-16T16:00:00 confirmed 2026-07-16T20:00:00 status partial_touch; 15m SHORT 7568.25-7569.50 parent 2026-07-16T18:30:00 confirmed 2026-07-16T18:45:00 status open_untouched
- Objective ladder: open_fvg 7543.00 reached 2026-07-22T11:05:00 (15m SHORT open FVG open_untouched parent 2026-07-22T10:30:00 confirmed 2026-07-22T10:45:00); open_fvg 7547.50 reached 2026-07-22T11:10:00 (5m SHORT open FVG partial_touch parent 2026-07-22T10:15:00 confirmed 2026-07-22T10:20:00); liquidity 7556.25 reached 2026-07-22T11:25:00 (prior 5M swing high liquidity from 2026-07-22T10:10:00); session_extreme 7556.25 reached 2026-07-22T11:25:00 (RTH high liquidity before proof); open_fvg 7556.75 reached 2026-07-22T11:30:00 (120m SHORT open FVG partial_touch parent 2026-07-16T22:00:00 confirmed 2026-07-17T00:00:00); open_fvg 7556.75 reached 2026-07-22T11:30:00 (60m SHORT open FVG open_untouched parent 2026-07-16T21:00:00 confirmed 2026-07-16T22:00:00); open_fvg 7558.50 reached 2026-07-22T11:30:00 (5m SHORT open FVG partial_touch parent 2026-07-16T20:10:00 confirmed 2026-07-16T20:15:00); open_fvg 7558.50 reached 2026-07-22T11:30:00 (15m SHORT open FVG open_untouched parent 2026-07-16T20:15:00 confirmed 2026-07-16T20:30:00); tactical 7562.00 not reached (T1 1.5R); open_fvg 7569.50 not reached (15m SHORT open FVG open_untouched parent 2026-07-16T18:30:00 confirmed 2026-07-16T18:45:00); tactical 7570.50 not reached (T2 2.0R); open_fvg 7579.50 not reached (240m SHORT open FVG partial_touch parent 2026-07-16T16:00:00 confirmed 2026-07-16T20:00:00)
- Story: LONG proof completed at 2026-07-22T10:50:00 from 7528.75-7535.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7536.25-7536.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7543.00 open_fvg, 7547.50 open_fvg, 7556.25 liquidity, 7556.25 session_extreme. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-22T12:20:00, one MES +$130.00
- Managed outcome: LQ1 at 2026-07-22T11:25:00, exit 7556.25, one MES +$101.25
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-22T10:50:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 3. LONG 15M FVG 7538.75-7543.00 parent 2026-07-22T10:00:00 confirmed 2026-07-22T10:15:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-22T10:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-22T10:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-22T10:15:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-22T10:20:00, 2026-07-22T10:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-22T10:20:00. | PASS entry_stop_risk_contract: Entry 7543.50, protected 5M stop 7535.50, risk 8.00 pts. | PASS tactical_targets_from_actual_risk: T1 7555.50 and T2 7559.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7543.75.
- Parent displacement: yes
- Parent displacement candle: 2026-07-22T10:00:00
- Parent failure: 2026-07-22T10:30:00
- First 5M return: 2026-07-22T10:15:00
- 5M wick defense: 2026-07-22T10:20:00, 2026-07-22T10:55:00
- Proof: 2026-07-22T10:20:00
- Entry/stop/risk: 7543.50 / 7535.50 / 8.00 pts
- T1/T2: 7555.50 / 7559.50
- Nearest liquidity: nearest prior high liquidity 7543.75
- Defended-area / obstacle management callout before or near T1: 5m LONG 7543.75-7544.50 parent 2026-05-13T19:05:00 confirmed 2026-05-13T19:10:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-22T10:25:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-22T10:15:00; wick 2026-07-22T10:20:00; proof 2026-07-22T10:20:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 15m LONG 7538.75-7543.00 parent 2026-07-22T10:00:00 confirmed 2026-07-22T10:15:00 status open_untouched; 15m LONG 7528.75-7535.50 parent 2026-07-22T09:45:00 confirmed 2026-07-22T10:00:00 status open_untouched; 5m LONG 7528.75-7531.75 parent 2026-07-22T09:35:00 confirmed 2026-07-22T09:40:00 status open_untouched; 15m LONG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00 status open_untouched; 5m LONG 7520.75-7522.50 parent 2026-07-22T09:20:00 confirmed 2026-07-22T09:25:00 status open_untouched; 240m LONG 7499.50-7513.75 parent 2026-07-21T02:00:00 confirmed 2026-07-21T06:00:00 status partial_touch; 60m LONG 7502.00-7512.50 parent 2026-07-21T00:00:00 confirmed 2026-07-21T01:00:00 status partial_touch; 120m LONG 7499.50-7510.00 parent 2026-07-21T00:00:00 confirmed 2026-07-21T02:00:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7543.75-7544.50 parent 2026-05-13T19:05:00 confirmed 2026-05-13T19:10:00 status failed_inverted; 5m LONG 7543.75-7545.25 parent 2026-07-09T00:55:00 confirmed 2026-07-09T01:00:00 status failed_inverted; 5m SHORT 7543.75-7546.25 parent 2026-07-09T10:20:00 confirmed 2026-07-09T10:25:00 status failed_inverted; 5m LONG 7543.75-7544.75 parent 2026-07-09T10:30:00 confirmed 2026-07-09T10:35:00 status failed_inverted; 5m LONG 7543.75-7547.00 parent 2026-07-22T10:00:00 confirmed 2026-07-22T10:05:00 status failed_inverted; 5m LONG 7544.00-7545.50 parent 2026-07-06T00:15:00 confirmed 2026-07-06T00:20:00 status failed_inverted; 5m LONG 7544.00-7546.25 parent 2026-07-13T22:40:00 confirmed 2026-07-13T22:45:00 status failed_inverted; 15m SHORT 7544.00-7548.25 parent 2026-05-22T05:15:00 confirmed 2026-05-22T05:30:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7545.50-7547.50 parent 2026-07-22T10:15:00 confirmed 2026-07-22T10:20:00 status open_untouched; 5m SHORT 7555.75-7558.50 parent 2026-07-16T20:10:00 confirmed 2026-07-16T20:15:00 status partial_touch; 60m SHORT 7556.25-7556.75 parent 2026-07-16T21:00:00 confirmed 2026-07-16T22:00:00 status open_untouched; 15m SHORT 7557.25-7558.50 parent 2026-07-16T20:15:00 confirmed 2026-07-16T20:30:00 status open_untouched; 240m SHORT 7563.75-7579.50 parent 2026-07-16T16:00:00 confirmed 2026-07-16T20:00:00 status partial_touch; 15m SHORT 7568.25-7569.50 parent 2026-07-16T18:30:00 confirmed 2026-07-16T18:45:00 status open_untouched; 5m SHORT 7570.50-7571.50 parent 2026-07-16T18:15:00 confirmed 2026-07-16T18:20:00 status open_untouched; 120m SHORT 7577.75-7579.50 parent 2026-07-16T16:00:00 confirmed 2026-07-16T17:00:00 status open_untouched
- Objective ladder: open_fvg 7547.50 reached 2026-07-22T11:10:00 (5m SHORT open FVG open_untouched parent 2026-07-22T10:15:00 confirmed 2026-07-22T10:20:00); tactical 7555.50 reached 2026-07-22T11:25:00 (T1 1.5R); session_extreme 7556.25 reached 2026-07-22T11:25:00 (RTH high liquidity before proof); open_fvg 7556.75 reached 2026-07-22T11:30:00 (60m SHORT open FVG open_untouched parent 2026-07-16T21:00:00 confirmed 2026-07-16T22:00:00); open_fvg 7558.50 reached 2026-07-22T11:30:00 (5m SHORT open FVG partial_touch parent 2026-07-16T20:10:00 confirmed 2026-07-16T20:15:00); open_fvg 7558.50 reached 2026-07-22T11:30:00 (15m SHORT open FVG open_untouched parent 2026-07-16T20:15:00 confirmed 2026-07-16T20:30:00); tactical 7559.50 reached 2026-07-22T11:30:00 (T2 2.0R); open_fvg 7569.50 not reached (15m SHORT open FVG open_untouched parent 2026-07-16T18:30:00 confirmed 2026-07-16T18:45:00); open_fvg 7571.50 not reached (5m SHORT open FVG open_untouched parent 2026-07-16T18:15:00 confirmed 2026-07-16T18:20:00); open_fvg 7579.50 not reached (240m SHORT open FVG partial_touch parent 2026-07-16T16:00:00 confirmed 2026-07-16T20:00:00); open_fvg 7579.50 not reached (120m SHORT open FVG open_untouched parent 2026-07-16T16:00:00 confirmed 2026-07-16T17:00:00)
- Story: LONG proof completed at 2026-07-22T10:20:00 from 7538.75-7543.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7543.75-7544.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7547.50 open_fvg, 7556.25 session_extreme, 7556.75 open_fvg, 7558.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-22T10:30:00, one MES $-40.00
- Managed outcome: Stop at 2026-07-22T10:30:00, exit 7535.50, one MES $-40.00
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-22T10:20:00 before later same-zone failure/reversal read at 2026-07-22T10:30:00. Review the defended continuation before labeling this zone as failure/reversal.

### 4. SHORT 15M FVG 7540.00-7543.00 parent 2026-07-22T10:30:00 confirmed 2026-07-22T10:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-22T10:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-22T11:15:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-22T10:30:00
- Parent failure: 2026-07-22T11:15:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7540.00-7543.00 parent 2026-07-22T10:30:00 confirmed 2026-07-22T10:45:00 failed_acceptance_through_15m failed 2026-07-22T11:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7540.00-7543.00 parent 2026-07-22T10:30:00 confirmed 2026-07-22T10:45:00 failed_acceptance_through_15m failed 2026-07-22T11:15:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-22T11:00:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-22T11:05:00.
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

### 5. LONG 15M FVG 7540.00-7541.25 parent 2026-07-22T11:00:00 confirmed 2026-07-22T11:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-22T11:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-22T11:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00 untested_by_15m
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

### 6. LONG 15M FVG 7542.50-7547.50 parent 2026-07-22T11:15:00 confirmed 2026-07-22T11:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-22T11:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-22T11:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7521.00-7525.00 parent 2026-07-22T09:30:00 confirmed 2026-07-22T09:45:00 untested_by_15m
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
