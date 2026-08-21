# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-17 / lunch (2026-07-17T12:00:00 to 2026-07-17T16:00:00)
Context window: 275 days (2025-10-15T00:00:00 to 2026-07-18T23:59:59)
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
- Open below: 5m LONG 7521.75-7525.25 parent 2026-07-17T11:55:00 confirmed 2026-07-17T12:00:00 status open_untouched; 15m LONG 7492.25-7512.25 parent 2026-07-17T10:00:00 confirmed 2026-07-17T10:15:00 status partial_touch; 5m LONG 7497.00-7501.25 parent 2026-07-17T09:55:00 confirmed 2026-07-17T10:00:00 status open_untouched; 5m LONG 7492.25-7495.50 parent 2026-07-17T09:50:00 confirmed 2026-07-17T09:55:00 status open_untouched; 5m LONG 7434.50-7448.00 parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00 status partial_touch; 5m LONG 7428.50-7430.00 parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch
- Failed above: 5m LONG 7534.25-7537.50 parent 2026-06-09T09:45:00 confirmed 2026-06-09T09:50:00 status failed_inverted; 5m LONG 7534.25-7536.50 parent 2026-06-17T19:25:00 confirmed 2026-06-17T19:30:00 status failed_inverted; 5m LONG 7534.25-7538.50 parent 2026-06-22T20:45:00 confirmed 2026-06-22T20:50:00 status failed_inverted; 5m SHORT 7534.25-7534.50 parent 2026-06-30T21:50:00 confirmed 2026-06-30T21:55:00 status failed_inverted; 5m LONG 7534.25-7537.00 parent 2026-07-01T18:25:00 confirmed 2026-07-01T18:30:00 status failed_inverted; 5m SHORT 7534.25-7537.00 parent 2026-07-09T06:50:00 confirmed 2026-07-09T06:55:00 status failed_inverted; 5m LONG 7534.50-7539.50 parent 2026-06-21T18:25:00 confirmed 2026-06-21T18:30:00 status failed_inverted; 5m SHORT 7534.75-7541.75 parent 2026-05-13T15:55:00 confirmed 2026-05-13T16:00:00 status failed_inverted; 5m SHORT 7535.00-7536.75 parent 2026-06-22T00:00:00 confirmed 2026-06-22T00:05:00 status failed_inverted; 5m LONG 7535.00-7535.50 parent 2026-07-01T06:55:00 confirmed 2026-07-01T07:00:00 status failed_inverted
- Open above: 60m SHORT 7539.50-7546.00 parent 2026-07-16T22:00:00 confirmed 2026-07-16T23:00:00 status partial_touch; 15m SHORT 7540.50-7543.50 parent 2026-07-16T21:45:00 confirmed 2026-07-16T22:00:00 status partial_touch; 120m SHORT 7541.25-7556.75 parent 2026-07-16T22:00:00 confirmed 2026-07-17T00:00:00 status open_untouched; 5m SHORT 7550.25-7551.25 parent 2026-07-16T21:10:00 confirmed 2026-07-16T21:15:00 status open_untouched; 5m SHORT 7555.75-7558.50 parent 2026-07-16T20:10:00 confirmed 2026-07-16T20:15:00 status partial_touch; 60m SHORT 7556.25-7556.75 parent 2026-07-16T21:00:00 confirmed 2026-07-16T22:00:00 status open_untouched; 15m SHORT 7557.25-7558.50 parent 2026-07-16T20:15:00 confirmed 2026-07-16T20:30:00 status open_untouched; 240m SHORT 7563.75-7579.50 parent 2026-07-16T16:00:00 confirmed 2026-07-16T20:00:00 status partial_touch; 15m SHORT 7568.25-7569.50 parent 2026-07-16T18:30:00 confirmed 2026-07-16T18:45:00 status open_untouched; 5m SHORT 7570.50-7571.50 parent 2026-07-16T18:15:00 confirmed 2026-07-16T18:20:00 status open_untouched

## Review Order
- Primary campaign to review first: SHORT proof 2026-07-17T14:35:00 from 15M parent 2026-07-17T14:15:00 confirmed 2026-07-17T14:30:00.
- Defended-area management context: 5m LONG 7497.00-7501.25 is a callout before/near T1, not an issue by itself.
- Later rows: 2 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7524.25-7525.25 parent 2026-07-17T13:45:00 confirmed 2026-07-17T14:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-17T13:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-17T13:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7524.25-7525.25 parent 2026-07-17T13:45:00 confirmed 2026-07-17T14:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7524.25-7525.25 parent 2026-07-17T13:45:00 confirmed 2026-07-17T14:00:00 untested_by_15m
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

### 2. SHORT 15M FVG 7516.50-7520.25 parent 2026-07-17T14:00:00 confirmed 2026-07-17T14:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-17T14:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-17T14:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7524.25-7525.25 parent 2026-07-17T13:45:00 confirmed 2026-07-17T14:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7524.25-7525.25 parent 2026-07-17T13:45:00 confirmed 2026-07-17T14:00:00 untested_by_15m
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

### 3. SHORT 15M FVG 7507.50-7508.75 parent 2026-07-17T14:15:00 confirmed 2026-07-17T14:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-17T14:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-17T14:35:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-17T14:35:00, 2026-07-17T16:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-17T14:35:00. | PASS entry_stop_risk_contract: Entry 7501.75, protected 5M stop 7516.50, risk 14.75 pts. | PASS tactical_targets_from_actual_risk: T1 7479.75 and T2 7472.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7501.50.
- Parent displacement: yes
- Parent displacement candle: 2026-07-17T14:00:00
- Parent failure: not found
- First 5M return: 2026-07-17T14:35:00
- 5M wick defense: 2026-07-17T14:35:00, 2026-07-17T16:00:00
- Proof: 2026-07-17T14:35:00
- Entry/stop/risk: 7501.75 / 7516.50 / 14.75 pts
- T1/T2: 7479.75 / 7472.25
- Nearest liquidity: nearest prior low liquidity 7501.50
- Defended-area / obstacle management callout before or near T1: 5m LONG 7497.00-7501.25 parent 2026-07-17T09:55:00 confirmed 2026-07-17T10:00:00 status partial_touch
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-17T14:40:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7524.25-7525.25 parent 2026-07-17T13:45:00 confirmed 2026-07-17T14:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7524.25-7525.25 parent 2026-07-17T13:45:00 confirmed 2026-07-17T14:00:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-17T14:35:00; wick 2026-07-17T14:35:00; proof 2026-07-17T14:35:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 5m LONG 7497.00-7501.25 parent 2026-07-17T09:55:00 confirmed 2026-07-17T10:00:00 status partial_touch; 5m LONG 7492.25-7495.50 parent 2026-07-17T09:50:00 confirmed 2026-07-17T09:55:00 status open_untouched; 5m LONG 7434.50-7448.00 parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00 status partial_touch; 5m LONG 7428.50-7430.00 parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7502.00-7504.00 parent 2026-05-13T08:20:00 confirmed 2026-05-13T08:25:00 status failed_inverted; 5m LONG 7502.00-7505.50 parent 2026-06-09T04:15:00 confirmed 2026-06-09T04:20:00 status failed_inverted; 15m SHORT 7502.25-7503.00 parent 2026-05-11T20:00:00 confirmed 2026-05-11T20:15:00 status failed_inverted; 15m SHORT 7502.25-7506.25 parent 2026-07-17T04:30:00 confirmed 2026-07-17T04:45:00 status failed_inverted; 120m SHORT 7502.25-7503.00 parent 2026-05-21T08:00:00 confirmed 2026-05-21T10:00:00 status failed_inverted; 5m LONG 7502.50-7503.00 parent 2026-05-13T03:40:00 confirmed 2026-05-13T03:45:00 status failed_inverted; 5m LONG 7502.50-7504.00 parent 2026-05-20T22:20:00 confirmed 2026-05-20T22:25:00 status failed_inverted; 5m LONG 7502.50-7504.25 parent 2026-06-12T16:15:00 confirmed 2026-06-12T16:20:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7507.50-7508.75 parent 2026-07-17T14:15:00 confirmed 2026-07-17T14:30:00 status open_untouched; 5m SHORT 7515.25-7519.25 parent 2026-07-17T13:55:00 confirmed 2026-07-17T14:00:00 status partial_touch; 15m SHORT 7516.50-7520.25 parent 2026-07-17T14:00:00 confirmed 2026-07-17T14:15:00 status open_untouched; 15m SHORT 7524.25-7525.25 parent 2026-07-17T13:45:00 confirmed 2026-07-17T14:00:00 status open_untouched; 5m SHORT 7526.00-7530.75 parent 2026-07-17T13:40:00 confirmed 2026-07-17T13:45:00 status open_untouched; 60m SHORT 7539.50-7546.00 parent 2026-07-16T22:00:00 confirmed 2026-07-16T23:00:00 status partial_touch; 15m SHORT 7540.50-7543.50 parent 2026-07-16T21:45:00 confirmed 2026-07-16T22:00:00 status partial_touch; 120m SHORT 7541.25-7556.75 parent 2026-07-16T22:00:00 confirmed 2026-07-17T00:00:00 status open_untouched
- Objective ladder: open_fvg 7497.00 reached 2026-07-17T14:45:00 (5m LONG open FVG partial_touch parent 2026-07-17T09:55:00 confirmed 2026-07-17T10:00:00); open_fvg 7492.25 reached 2026-07-17T15:15:00 (5m LONG open FVG open_untouched parent 2026-07-17T09:50:00 confirmed 2026-07-17T09:55:00); tactical 7479.75 not reached (T1 1.5R); liquidity 7473.00 not reached (prior 5M swing low liquidity from 2026-07-17T09:40:00); session_extreme 7473.00 not reached (RTH low liquidity before proof); tactical 7472.25 not reached (T2 2.0R); open_fvg 7434.50 not reached (5m LONG open FVG partial_touch parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00); open_fvg 7428.50 not reached (5m LONG open FVG open_untouched parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00); open_fvg 7404.75 not reached (5m LONG open FVG partial_touch parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00); open_fvg 7355.50 not reached (15m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00); open_fvg 7345.25 not reached (5m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00); open_fvg 7321.00 not reached (5m LONG open FVG partial_touch parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00)
- Story: SHORT proof completed at 2026-07-17T14:35:00 from 7507.50-7508.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7497.00-7501.25 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7497.00 open_fvg, 7492.25 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-07-17T17:00:00, one MES +$33.75
- Managed outcome: SessionClose at 2026-07-17T17:00:00, exit 7495.00, one MES +$33.75
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-07-17T14:35:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.
