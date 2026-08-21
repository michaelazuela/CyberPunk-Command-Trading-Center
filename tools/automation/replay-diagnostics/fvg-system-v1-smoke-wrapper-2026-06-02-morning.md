# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-02 / morning (2026-06-02T09:15:00 to 2026-06-02T12:00:00)
Context window: 275 days (2025-08-31T00:00:00 to 2026-06-03T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 42071 bars (2025-10-28T18:05:00 to 2026-06-03T23:55:00)
- 15m: 14027 bars (2025-10-28T18:15:00 to 2026-06-03T23:45:00)
- 60m: 3466 bars (2025-10-28T19:00:00 to 2026-06-03T23:00:00)
- 120m: 1810 bars (2025-10-28T20:00:00 to 2026-06-03T22:00:00)
- 240m: 920 bars (2025-10-28T22:00:00 to 2026-06-03T22:00:00)

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
- Open below: 15m LONG 7649.50-7651.75 parent 2026-06-02T01:00:00 confirmed 2026-06-02T01:15:00 status partial_touch; 60m LONG 7646.25-7651.75 parent 2026-06-02T01:00:00 confirmed 2026-06-02T02:00:00 status open_untouched; 5m LONG 7649.50-7651.25 parent 2026-06-02T00:50:00 confirmed 2026-06-02T00:55:00 status partial_touch; 15m LONG 7644.00-7644.75 parent 2026-06-02T00:00:00 confirmed 2026-06-02T00:15:00 status open_untouched; 240m LONG 7607.50-7638.75 parent 2026-05-28T14:00:00 confirmed 2026-05-28T17:00:00 status partial_touch; 120m LONG 7607.50-7634.25 parent 2026-05-28T12:00:00 confirmed 2026-05-28T14:00:00 status open_untouched; 5m LONG 7633.25-7634.00 parent 2026-05-28T11:25:00 confirmed 2026-05-28T11:30:00 status open_untouched; 5m LONG 7626.50-7632.00 parent 2026-05-28T11:05:00 confirmed 2026-05-28T11:10:00 status partial_touch; 15m LONG 7627.00-7628.50 parent 2026-05-28T11:15:00 confirmed 2026-05-28T11:30:00 status open_untouched; 60m LONG 7607.50-7625.00 parent 2026-05-28T11:00:00 confirmed 2026-05-28T12:00:00 status open_untouched
- Failed above: 5m SHORT 7655.75-7656.25 parent 2026-05-29T13:45:00 confirmed 2026-05-29T13:50:00 status failed_inverted; 15m LONG 7655.75-7658.50 parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00 status failed_inverted; 5m LONG 7656.50-7656.75 parent 2026-05-29T07:20:00 confirmed 2026-05-29T07:25:00 status failed_inverted; 5m LONG 7656.50-7656.75 parent 2026-05-29T14:30:00 confirmed 2026-05-29T14:35:00 status failed_inverted; 15m LONG 7656.50-7657.25 parent 2026-06-02T01:30:00 confirmed 2026-06-02T01:45:00 status failed_inverted; 5m SHORT 7657.00-7657.50 parent 2026-06-01T20:05:00 confirmed 2026-06-01T20:10:00 status failed_inverted; 5m SHORT 7657.50-7658.00 parent 2026-05-29T16:20:00 confirmed 2026-05-29T16:25:00 status failed_inverted; 5m LONG 7657.50-7658.25 parent 2026-06-01T19:00:00 confirmed 2026-06-01T19:05:00 status failed_inverted; 5m LONG 7658.00-7660.50 parent 2026-05-29T09:40:00 confirmed 2026-05-29T09:45:00 status failed_inverted; 5m SHORT 7658.00-7658.50 parent 2026-06-01T12:15:00 confirmed 2026-06-01T12:20:00 status failed_inverted
- Open above: 5m SHORT 7657.75-7659.25 parent 2026-06-02T09:10:00 confirmed 2026-06-02T09:15:00 status open_untouched; 5m SHORT 7661.25-7662.25 parent 2026-06-02T08:55:00 confirmed 2026-06-02T09:00:00 status partial_touch; 5m SHORT 7667.00-7667.25 parent 2026-06-02T05:55:00 confirmed 2026-06-02T06:00:00 status partial_touch; 5m SHORT 7669.00-7669.50 parent 2026-06-02T05:00:00 confirmed 2026-06-02T05:05:00 status partial_touch; 60m SHORT 7681.75-7685.50 parent 2026-06-01T16:00:00 confirmed 2026-06-01T17:00:00 status open_untouched; 15m SHORT 7683.50-7686.25 parent 2026-06-01T15:45:00 confirmed 2026-06-01T16:00:00 status open_untouched; 5m SHORT 7684.25-7684.50 parent 2026-06-01T15:40:00 confirmed 2026-06-01T15:45:00 status open_untouched; 5m SHORT 7685.75-7687.75 parent 2026-06-01T15:35:00 confirmed 2026-06-01T15:40:00 status open_untouched

## Review Order
- Primary campaign to review first: LONG proof 2026-06-02T10:05:00 from 15M parent 2026-06-02T09:45:00 confirmed 2026-06-02T10:00:00.
- Defended-area management context: 5m LONG 7669.50-7671.75 is a callout before/near T1, not an issue by itself.
- Later rows: 3 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7663.00-7664.25 parent 2026-06-02T09:45:00 confirmed 2026-06-02T10:00:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-02T09:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-02T10:05:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-02T10:05:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-02T10:05:00. | PASS entry_stop_risk_contract: Entry 7669.25, protected 5M stop 7659.00, risk 10.25 pts. | PASS tactical_targets_from_actual_risk: T1 7684.75 and T2 7689.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7669.50.
- Parent displacement: yes
- Parent displacement candle: 2026-06-02T09:30:00
- Parent failure: not found
- First 5M return: 2026-06-02T10:05:00
- 5M wick defense: 2026-06-02T10:05:00
- Proof: 2026-06-02T10:05:00
- Entry/stop/risk: 7669.25 / 7659.00 / 10.25 pts
- T1/T2: 7684.75 / 7689.75
- Nearest liquidity: nearest prior high liquidity 7669.50
- Defended-area / obstacle management callout before or near T1: 5m LONG 7669.50-7671.75 parent 2026-05-31T20:05:00 confirmed 2026-05-31T20:10:00 status failed_inverted
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-02T10:10:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7663.00-7664.25 parent 2026-06-02T09:45:00 confirmed 2026-06-02T10:00:00 defended_on_15m defended 2026-06-02T10:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7663.00-7664.25 parent 2026-06-02T09:45:00 confirmed 2026-06-02T10:00:00 defended_on_15m defended 2026-06-02T10:15:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-02T10:05:00; wick 2026-06-02T10:05:00; proof 2026-06-02T10:05:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 15m LONG 7663.00-7664.25 parent 2026-06-02T09:45:00 confirmed 2026-06-02T10:00:00 status open_untouched; 120m LONG 7646.75-7657.25 parent 2026-06-02T02:00:00 confirmed 2026-06-02T04:00:00 status partial_touch; 15m LONG 7649.50-7651.75 parent 2026-06-02T01:00:00 confirmed 2026-06-02T01:15:00 status partial_touch; 60m LONG 7646.25-7651.75 parent 2026-06-02T01:00:00 confirmed 2026-06-02T02:00:00 status partial_touch; 5m LONG 7649.50-7651.25 parent 2026-06-02T00:50:00 confirmed 2026-06-02T00:55:00 status partial_touch; 15m LONG 7644.00-7644.75 parent 2026-06-02T00:00:00 confirmed 2026-06-02T00:15:00 status open_untouched; 240m LONG 7607.50-7638.75 parent 2026-05-28T14:00:00 confirmed 2026-05-28T17:00:00 status partial_touch; 120m LONG 7607.50-7634.25 parent 2026-05-28T12:00:00 confirmed 2026-05-28T14:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7669.50-7671.75 parent 2026-05-31T20:05:00 confirmed 2026-05-31T20:10:00 status failed_inverted; 5m LONG 7670.00-7670.50 parent 2026-06-02T04:05:00 confirmed 2026-06-02T04:10:00 status failed_inverted; 15m LONG 7670.00-7670.25 parent 2026-05-31T20:15:00 confirmed 2026-05-31T20:30:00 status failed_inverted; 60m LONG 7670.00-7671.75 parent 2026-05-31T21:00:00 confirmed 2026-05-31T22:00:00 status failed_inverted; 120m LONG 7670.00-7674.25 parent 2026-05-31T22:00:00 confirmed 2026-06-01T00:00:00 status failed_inverted; 60m LONG 7672.75-7685.50 parent 2026-06-01T14:00:00 confirmed 2026-06-01T15:00:00 status failed_inverted; 5m SHORT 7673.00-7673.75 parent 2026-06-01T03:45:00 confirmed 2026-06-01T03:50:00 status failed_inverted; 15m LONG 7673.25-7675.25 parent 2026-06-01T05:00:00 confirmed 2026-06-01T05:15:00 status failed_inverted
- Open FVGs above at proof: 60m SHORT 7681.75-7685.50 parent 2026-06-01T16:00:00 confirmed 2026-06-01T17:00:00 status open_untouched; 15m SHORT 7683.50-7686.25 parent 2026-06-01T15:45:00 confirmed 2026-06-01T16:00:00 status open_untouched; 5m SHORT 7684.25-7684.50 parent 2026-06-01T15:40:00 confirmed 2026-06-01T15:45:00 status open_untouched; 5m SHORT 7685.75-7687.75 parent 2026-06-01T15:35:00 confirmed 2026-06-01T15:40:00 status open_untouched
- Objective ladder: open_fvg 7684.50 reached 2026-06-02T10:50:00 (5m SHORT open FVG open_untouched parent 2026-06-01T15:40:00 confirmed 2026-06-01T15:45:00); tactical 7684.75 reached 2026-06-02T10:55:00 (T1 1.5R); open_fvg 7685.50 reached 2026-06-02T10:55:00 (60m SHORT open FVG open_untouched parent 2026-06-01T16:00:00 confirmed 2026-06-01T17:00:00); open_fvg 7686.25 reached 2026-06-02T10:55:00 (15m SHORT open FVG open_untouched parent 2026-06-01T15:45:00 confirmed 2026-06-01T16:00:00); open_fvg 7687.75 reached 2026-06-02T11:00:00 (5m SHORT open FVG open_untouched parent 2026-06-01T15:35:00 confirmed 2026-06-01T15:40:00); tactical 7689.75 reached 2026-06-02T11:10:00 (T2 2.0R)
- Story: LONG proof completed at 2026-06-02T10:05:00 from 7663.00-7664.25. 12 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7669.50-7671.75 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7684.50 open_fvg, 7685.50 open_fvg, 7686.25 open_fvg, 7687.75 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-02T10:55:00, one MES +$77.50
- Managed outcome: T1 at 2026-06-02T10:55:00, exit 7684.75, one MES +$77.50
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-06-02T10:05:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.

### 2. LONG 15M FVG 7676.00-7679.50 parent 2026-06-02T10:45:00 confirmed 2026-06-02T11:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-02T10:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-02T10:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7663.00-7664.25 parent 2026-06-02T09:45:00 confirmed 2026-06-02T10:00:00 defended_on_15m defended 2026-06-02T10:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7663.00-7664.25 parent 2026-06-02T09:45:00 confirmed 2026-06-02T10:00:00 defended_on_15m defended 2026-06-02T10:15:00
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

### 3. LONG 15M FVG 7680.75-7685.00 parent 2026-06-02T11:00:00 confirmed 2026-06-02T11:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-02T11:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-02T11:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7663.00-7664.25 parent 2026-06-02T09:45:00 confirmed 2026-06-02T10:00:00 defended_on_15m defended 2026-06-02T10:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7663.00-7664.25 parent 2026-06-02T09:45:00 confirmed 2026-06-02T10:00:00 defended_on_15m defended 2026-06-02T10:15:00
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

### 4. LONG 15M FVG 7688.75-7690.00 parent 2026-06-02T11:15:00 confirmed 2026-06-02T11:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-02T11:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-02T11:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-02T11:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-02T11:55:00. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-02T11:00:00
- Parent failure: 2026-06-02T11:45:00
- First 5M return: 2026-06-02T11:45:00
- 5M wick defense: 2026-06-02T11:55:00
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7663.00-7664.25 parent 2026-06-02T09:45:00 confirmed 2026-06-02T10:00:00 defended_on_15m defended 2026-06-02T10:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7663.00-7664.25 parent 2026-06-02T09:45:00 confirmed 2026-06-02T10:00:00 defended_on_15m defended 2026-06-02T10:15:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-06-02T11:30:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-06-02T11:45:00.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.
