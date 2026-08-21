# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-26 / morning (2026-06-26T09:15:00 to 2026-06-26T12:00:00)
Context window: 275 days (2025-09-24T00:00:00 to 2026-06-27T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 46644 bars (2025-10-28T18:05:00 to 2026-06-26T17:00:00)
- 15m: 15568 bars (2025-10-28T18:15:00 to 2026-06-26T17:00:00)
- 60m: 3864 bars (2025-10-28T19:00:00 to 2026-06-26T17:00:00)
- 120m: 2026 bars (2025-10-28T20:00:00 to 2026-06-26T17:00:00)
- 240m: 1106 bars (2025-10-28T22:00:00 to 2026-06-26T16:00:00)

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
- Open below: 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch; 5m LONG 7247.75-7253.25 parent 2026-04-30T10:55:00 confirmed 2026-04-30T11:00:00 status partial_touch; 15m LONG 7244.75-7252.25 parent 2026-04-30T11:00:00 confirmed 2026-04-30T11:15:00 status partial_touch; 5m LONG 7240.75-7243.75 parent 2026-04-30T10:50:00 confirmed 2026-04-30T10:55:00 status open_untouched; 5m LONG 7236.50-7239.00 parent 2026-04-30T10:45:00 confirmed 2026-04-30T10:50:00 status open_untouched; 15m LONG 7218.00-7218.25 parent 2026-04-30T03:15:00 confirmed 2026-04-30T03:30:00 status open_untouched; 5m LONG 7206.75-7216.75 parent 2026-04-30T02:35:00 confirmed 2026-04-30T02:40:00 status partial_touch; 15m LONG 7206.75-7209.75 parent 2026-04-30T02:45:00 confirmed 2026-04-30T03:00:00 status open_untouched
- Failed above: 5m SHORT 7377.00-7378.00 parent 2026-06-25T22:50:00 confirmed 2026-06-25T22:55:00 status failed_inverted; 5m LONG 7377.00-7379.00 parent 2026-06-26T01:30:00 confirmed 2026-06-26T01:35:00 status failed_inverted; 5m LONG 7377.25-7381.25 parent 2026-06-26T00:00:00 confirmed 2026-06-26T00:05:00 status failed_inverted; 5m SHORT 7377.50-7380.25 parent 2026-06-26T00:25:00 confirmed 2026-06-26T00:30:00 status failed_inverted; 5m LONG 7378.00-7378.75 parent 2026-06-11T03:00:00 confirmed 2026-06-11T03:05:00 status failed_inverted; 15m SHORT 7378.25-7392.25 parent 2026-06-11T08:30:00 confirmed 2026-06-11T08:45:00 status failed_inverted; 120m LONG 7378.25-7403.75 parent 2026-05-06T06:00:00 confirmed 2026-05-06T08:00:00 status failed_inverted; 5m SHORT 7378.50-7379.25 parent 2026-06-10T13:15:00 confirmed 2026-06-10T13:20:00 status failed_inverted; 5m SHORT 7379.00-7379.75 parent 2026-05-05T19:25:00 confirmed 2026-05-05T19:30:00 status failed_inverted; 5m SHORT 7379.00-7389.25 parent 2026-06-11T08:25:00 confirmed 2026-06-11T08:30:00 status failed_inverted
- Open above: 5m SHORT 7378.50-7378.75 parent 2026-06-26T09:10:00 confirmed 2026-06-26T09:15:00 status open_untouched; 5m SHORT 7381.50-7383.00 parent 2026-06-26T09:05:00 confirmed 2026-06-26T09:10:00 status open_untouched; 15m SHORT 7386.75-7389.75 parent 2026-06-26T08:45:00 confirmed 2026-06-26T09:00:00 status open_untouched; 5m SHORT 7388.00-7391.50 parent 2026-06-26T08:40:00 confirmed 2026-06-26T08:45:00 status open_untouched; 60m SHORT 7401.50-7418.50 parent 2026-06-25T22:00:00 confirmed 2026-06-25T23:00:00 status partial_touch; 120m SHORT 7401.50-7416.00 parent 2026-06-25T22:00:00 confirmed 2026-06-26T00:00:00 status partial_touch; 15m SHORT 7407.50-7416.50 parent 2026-06-25T21:45:00 confirmed 2026-06-25T22:00:00 status partial_touch; 5m SHORT 7410.25-7416.50 parent 2026-06-25T21:35:00 confirmed 2026-06-25T21:40:00 status partial_touch; 5m SHORT 7418.75-7423.25 parent 2026-06-25T21:30:00 confirmed 2026-06-25T21:35:00 status open_untouched; 5m SHORT 7430.50-7436.75 parent 2026-06-25T19:45:00 confirmed 2026-06-25T19:50:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof 2026-06-26T11:05:00 from 15M parent 2026-06-26T10:15:00 confirmed 2026-06-26T10:30:00.
- Defended-area management context: 5m SHORT 7421.75-7423.25 is a callout before/near T1, not an issue by itself.
- Later rows: 2 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7388.25-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T10:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-26T10:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-26T10:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7388.25-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T10:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7388.25-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T10:15:00 untested_by_15m
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

### 2. LONG 15M FVG 7405.50-7418.00 parent 2026-06-26T10:15:00 confirmed 2026-06-26T10:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-26T10:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-26T10:40:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-26T11:00:00, 2026-06-26T11:10:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-26T11:05:00. | PASS entry_stop_risk_contract: Entry 7421.50, protected 5M stop 7360.00, risk 61.50 pts. | PASS tactical_targets_from_actual_risk: T1 7513.75 and T2 7544.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7421.75.
- Parent displacement: yes
- Parent displacement candle: 2026-06-26T10:15:00
- Parent failure: not found
- First 5M return: 2026-06-26T10:40:00
- 5M wick defense: 2026-06-26T11:00:00, 2026-06-26T11:10:00
- Proof: 2026-06-26T11:05:00
- Entry/stop/risk: 7421.50 / 7360.00 / 61.50 pts
- T1/T2: 7513.75 / 7544.50
- Nearest liquidity: nearest prior high liquidity 7421.75
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7421.75-7423.25 parent 2026-06-25T13:45:00 confirmed 2026-06-25T13:50:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-26T11:10:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7388.25-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T10:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7388.25-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T10:15:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-26T10:40:00; wick 2026-06-26T11:00:00; proof 2026-06-26T11:05:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 15m LONG 7405.50-7418.00 parent 2026-06-26T10:15:00 confirmed 2026-06-26T10:30:00 status partial_touch; 120m SHORT 7401.50-7416.00 parent 2026-06-25T22:00:00 confirmed 2026-06-26T00:00:00 status partial_touch; 5m LONG 7405.50-7414.25 parent 2026-06-26T10:05:00 confirmed 2026-06-26T10:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7389.00-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T10:05:00 status open_untouched; 15m LONG 7388.25-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T10:15:00 status open_untouched; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7421.75-7423.25 parent 2026-06-25T13:45:00 confirmed 2026-06-25T13:50:00 status failed_inverted; 5m LONG 7422.00-7423.25 parent 2026-05-07T19:55:00 confirmed 2026-05-07T20:00:00 status failed_inverted; 5m SHORT 7422.00-7422.75 parent 2026-06-10T01:20:00 confirmed 2026-06-10T01:25:00 status failed_inverted; 5m LONG 7422.00-7422.25 parent 2026-06-10T01:30:00 confirmed 2026-06-10T01:35:00 status failed_inverted; 15m SHORT 7422.00-7425.50 parent 2026-06-10T04:15:00 confirmed 2026-06-10T04:30:00 status failed_inverted; 5m SHORT 7422.25-7425.75 parent 2026-06-24T13:30:00 confirmed 2026-06-24T13:35:00 status failed_inverted; 5m SHORT 7422.25-7423.00 parent 2026-06-25T15:15:00 confirmed 2026-06-25T15:20:00 status failed_inverted; 5m LONG 7422.25-7427.50 parent 2026-06-25T16:00:00 confirmed 2026-06-25T16:05:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7430.50-7436.75 parent 2026-06-25T19:45:00 confirmed 2026-06-25T19:50:00 status partial_touch; 5m SHORT 7437.25-7444.00 parent 2026-06-25T19:40:00 confirmed 2026-06-25T19:45:00 status open_untouched; 15m SHORT 7444.00-7479.25 parent 2026-06-25T09:45:00 confirmed 2026-06-25T10:00:00 status partial_touch; 5m SHORT 7445.25-7449.50 parent 2026-06-25T19:35:00 confirmed 2026-06-25T19:40:00 status open_untouched; 5m SHORT 7477.00-7481.50 parent 2026-06-25T09:35:00 confirmed 2026-06-25T09:40:00 status open_untouched; 5m SHORT 7496.50-7499.75 parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00 status partial_touch; 15m SHORT 7496.75-7499.75 parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00 status open_untouched; 5m SHORT 7501.75-7502.75 parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00 status open_untouched
- Objective ladder: liquidity 7436.25 reached 2026-06-26T11:30:00 (prior 5M swing high liquidity from 2026-06-26T10:25:00); session_extreme 7436.25 reached 2026-06-26T11:30:00 (RTH high liquidity before proof); open_fvg 7436.75 reached 2026-06-26T11:30:00 (5m SHORT open FVG partial_touch parent 2026-06-25T19:45:00 confirmed 2026-06-25T19:50:00); open_fvg 7444.00 reached 2026-06-26T11:35:00 (5m SHORT open FVG open_untouched parent 2026-06-25T19:40:00 confirmed 2026-06-25T19:45:00); open_fvg 7449.50 reached 2026-06-26T11:35:00 (5m SHORT open FVG open_untouched parent 2026-06-25T19:35:00 confirmed 2026-06-25T19:40:00); open_fvg 7479.25 not reached (15m SHORT open FVG partial_touch parent 2026-06-25T09:45:00 confirmed 2026-06-25T10:00:00); open_fvg 7481.50 not reached (5m SHORT open FVG open_untouched parent 2026-06-25T09:35:00 confirmed 2026-06-25T09:40:00); open_fvg 7499.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00); open_fvg 7499.75 not reached (15m SHORT open FVG open_untouched parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00); open_fvg 7502.75 not reached (5m SHORT open FVG open_untouched parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00); tactical 7513.75 not reached (T1 1.5R); tactical 7544.50 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-06-26T11:05:00 from 7405.50-7418.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7421.75-7423.25 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7436.25 liquidity, 7436.25 session_extreme, 7436.75 open_fvg, 7444.00 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-06-26T17:00:00, one MES $-118.75
- Managed outcome: SessionClose at 2026-06-26T17:00:00, exit 7397.75, one MES $-118.75
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-06-26T11:05:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 3. LONG 15M FVG 7427.75-7437.50 parent 2026-06-26T11:30:00 confirmed 2026-06-26T11:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-26T11:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-26T11:55:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-26T12:00:00. | PASS entry_stop_risk_contract: Entry 7447.75, protected 5M stop 7409.50, risk 38.25 pts. | PASS tactical_targets_from_actual_risk: T1 7505.25 and T2 7524.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7448.00.
- Parent displacement: yes
- Parent displacement candle: 2026-06-26T11:30:00
- Parent failure: not found
- First 5M return: 2026-06-26T11:55:00
- 5M wick defense: none
- Proof: 2026-06-26T12:00:00
- Entry/stop/risk: 7447.75 / 7409.50 / 38.25 pts
- T1/T2: 7505.25 / 7524.25
- Nearest liquidity: nearest prior high liquidity 7448.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7448.00-7448.50 parent 2026-05-06T15:10:00 confirmed 2026-05-06T15:15:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-26T12:05:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7388.25-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T10:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7388.25-7397.75 parent 2026-06-26T10:00:00 confirmed 2026-06-26T10:15:00 untested_by_15m
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-06-26T11:55:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: 7459.25 (prior 5M swing high liquidity from 2026-06-26T11:45:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7432.50-7437.50 parent 2026-06-26T11:30:00 confirmed 2026-06-26T11:35:00 status partial_touch; 15m LONG 7427.75-7437.50 parent 2026-06-26T11:30:00 confirmed 2026-06-26T11:45:00 status partial_touch; 5m LONG 7426.25-7430.25 parent 2026-06-26T11:25:00 confirmed 2026-06-26T11:30:00 status open_untouched; 15m LONG 7405.50-7418.00 parent 2026-06-26T10:15:00 confirmed 2026-06-26T10:30:00 status partial_touch; 5m LONG 7405.50-7414.25 parent 2026-06-26T10:05:00 confirmed 2026-06-26T10:10:00 status partial_touch; 60m LONG 7405.50-7409.50 parent 2026-06-26T11:00:00 confirmed 2026-06-26T12:00:00 status open_untouched; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7448.00-7448.50 parent 2026-05-06T15:10:00 confirmed 2026-05-06T15:15:00 status failed_inverted; 5m LONG 7448.00-7450.00 parent 2026-05-20T02:55:00 confirmed 2026-05-20T03:00:00 status failed_inverted; 5m SHORT 7448.00-7449.50 parent 2026-06-09T17:00:00 confirmed 2026-06-09T18:05:00 status failed_inverted; 15m SHORT 7448.00-7449.50 parent 2026-06-09T17:00:00 confirmed 2026-06-09T18:00:00 status failed_inverted; 15m SHORT 7448.00-7449.00 parent 2026-06-09T18:00:00 confirmed 2026-06-09T18:15:00 status failed_inverted; 15m LONG 7448.00-7449.75 parent 2026-06-24T06:30:00 confirmed 2026-06-24T06:45:00 status failed_inverted; 5m LONG 7448.25-7448.50 parent 2026-05-08T02:10:00 confirmed 2026-05-08T02:15:00 status failed_inverted; 5m SHORT 7448.50-7449.00 parent 2026-05-18T00:55:00 confirmed 2026-05-18T01:00:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7477.00-7481.50 parent 2026-06-25T09:35:00 confirmed 2026-06-25T09:40:00 status open_untouched; 5m SHORT 7496.50-7499.75 parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00 status partial_touch; 15m SHORT 7496.75-7499.75 parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00 status open_untouched; 5m SHORT 7501.75-7502.75 parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00 status open_untouched; 5m SHORT 7504.00-7507.25 parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00 status open_untouched; 15m SHORT 7513.75-7515.50 parent 2026-06-22T23:00:00 confirmed 2026-06-22T23:15:00 status open_untouched; 120m SHORT 7525.00-7525.50 parent 2026-06-22T22:00:00 confirmed 2026-06-23T00:00:00 status open_untouched; 15m SHORT 7525.50-7532.75 parent 2026-06-22T21:45:00 confirmed 2026-06-22T22:00:00 status open_untouched
- Objective ladder: liquidity 7459.25 not reached (prior 5M swing high liquidity from 2026-06-26T11:45:00); session_extreme 7459.25 not reached (RTH high liquidity before proof); open_fvg 7481.50 not reached (5m SHORT open FVG open_untouched parent 2026-06-25T09:35:00 confirmed 2026-06-25T09:40:00); open_fvg 7499.75 not reached (5m SHORT open FVG partial_touch parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00); open_fvg 7499.75 not reached (15m SHORT open FVG open_untouched parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00); open_fvg 7502.75 not reached (5m SHORT open FVG open_untouched parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00); tactical 7505.25 not reached (T1 1.5R); open_fvg 7507.25 not reached (5m SHORT open FVG open_untouched parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00); open_fvg 7515.50 not reached (15m SHORT open FVG open_untouched parent 2026-06-22T23:00:00 confirmed 2026-06-22T23:15:00); tactical 7524.25 not reached (T2 2.0R); open_fvg 7525.50 not reached (120m SHORT open FVG open_untouched parent 2026-06-22T22:00:00 confirmed 2026-06-23T00:00:00); open_fvg 7532.75 not reached (15m SHORT open FVG open_untouched parent 2026-06-22T21:45:00 confirmed 2026-06-22T22:00:00)
- Story: LONG proof completed at 2026-06-26T12:00:00 from 7427.75-7437.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7448.00-7448.50 with reaction obstacle_defended_management_callout. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-26T14:55:00, one MES $-191.25
- Managed outcome: Stop at 2026-06-26T14:55:00, exit 7409.50, one MES $-191.25
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.
