# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-30 / morning (2026-06-30T09:15:00 to 2026-06-30T12:00:00)
Context window: 275 days (2025-09-28T00:00:00 to 2026-07-01T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 47543 bars (2025-10-28T18:05:00 to 2026-07-01T23:55:00)
- 15m: 15869 bars (2025-10-28T18:15:00 to 2026-07-01T23:45:00)
- 60m: 3942 bars (2025-10-28T19:00:00 to 2026-07-01T23:00:00)
- 120m: 2068 bars (2025-10-28T20:00:00 to 2026-07-01T22:00:00)
- 240m: 1142 bars (2025-10-28T22:00:00 to 2026-07-01T22:00:00)

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
- Open below: 120m LONG 7476.25-7491.25 parent 2026-06-29T14:00:00 confirmed 2026-06-29T16:00:00 status partial_touch; 5m LONG 7487.25-7487.50 parent 2026-06-29T21:20:00 confirmed 2026-06-29T21:25:00 status open_untouched; 15m LONG 7480.00-7485.00 parent 2026-06-29T13:15:00 confirmed 2026-06-29T13:30:00 status partial_touch; 5m LONG 7481.50-7483.25 parent 2026-06-29T13:10:00 confirmed 2026-06-29T13:15:00 status partial_touch; 5m LONG 7479.50-7480.25 parent 2026-06-29T13:05:00 confirmed 2026-06-29T13:10:00 status open_untouched; 15m LONG 7476.25-7477.25 parent 2026-06-29T13:00:00 confirmed 2026-06-29T13:15:00 status open_untouched; 60m LONG 7476.25-7477.25 parent 2026-06-29T13:00:00 confirmed 2026-06-29T14:00:00 status open_untouched; 5m LONG 7434.50-7448.00 parent 2026-06-29T10:30:00 confirmed 2026-06-29T10:35:00 status partial_touch; 5m LONG 7428.50-7430.00 parent 2026-06-29T10:25:00 confirmed 2026-06-29T10:30:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch
- Failed above: 5m SHORT 7496.75-7497.75 parent 2026-06-29T15:35:00 confirmed 2026-06-29T15:40:00 status failed_inverted; 15m SHORT 7496.75-7499.50 parent 2026-05-20T17:00:00 confirmed 2026-05-20T18:15:00 status failed_inverted; 15m SHORT 7496.75-7499.75 parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00 status failed_inverted; 60m SHORT 7496.75-7502.25 parent 2026-05-20T17:00:00 confirmed 2026-05-20T19:00:00 status failed_inverted; 120m LONG 7496.75-7498.50 parent 2026-05-20T22:00:00 confirmed 2026-05-21T00:00:00 status failed_inverted; 5m LONG 7497.00-7497.25 parent 2026-05-11T15:55:00 confirmed 2026-05-11T16:00:00 status failed_inverted; 5m SHORT 7497.00-7499.25 parent 2026-06-09T03:55:00 confirmed 2026-06-09T04:00:00 status failed_inverted; 5m LONG 7497.25-7505.00 parent 2026-05-18T08:45:00 confirmed 2026-05-18T08:50:00 status failed_inverted; 5m SHORT 7497.25-7516.50 parent 2026-05-21T06:30:00 confirmed 2026-05-21T06:35:00 status failed_inverted; 5m SHORT 7497.25-7498.50 parent 2026-06-09T02:55:00 confirmed 2026-06-09T03:00:00 status failed_inverted
- Open above: 15m SHORT 7503.50-7510.25 parent 2026-06-30T08:15:00 confirmed 2026-06-30T08:30:00 status open_untouched; 5m SHORT 7506.25-7510.25 parent 2026-06-30T08:05:00 confirmed 2026-06-30T08:10:00 status partial_touch; 5m SHORT 7511.25-7512.75 parent 2026-06-30T08:00:00 confirmed 2026-06-30T08:05:00 status open_untouched; 5m SHORT 7513.50-7513.75 parent 2026-06-30T07:55:00 confirmed 2026-06-30T08:00:00 status open_untouched; 120m SHORT 7525.00-7525.50 parent 2026-06-22T22:00:00 confirmed 2026-06-23T00:00:00 status open_untouched; 15m SHORT 7525.50-7532.75 parent 2026-06-22T21:45:00 confirmed 2026-06-22T22:00:00 status open_untouched; 5m SHORT 7528.50-7529.50 parent 2026-06-22T21:40:00 confirmed 2026-06-22T21:45:00 status open_untouched; 5m SHORT 7530.25-7533.00 parent 2026-06-22T21:35:00 confirmed 2026-06-22T21:40:00 status open_untouched; 15m SHORT 7549.50-7560.50 parent 2026-06-22T10:45:00 confirmed 2026-06-22T11:00:00 status partial_touch; 120m SHORT 7550.50-7563.75 parent 2026-06-22T12:00:00 confirmed 2026-06-22T14:00:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof none from 15M parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: 1 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7500.75-7503.50 parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-30T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-30T09:45:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7500.75-7503.50 parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7500.75-7503.50 parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00 untested_by_15m
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

### 2. LONG 15M FVG 7510.50-7515.50 parent 2026-06-30T10:00:00 confirmed 2026-06-30T10:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-30T10:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-30T10:00:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7500.75-7503.50 parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7500.75-7503.50 parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00 untested_by_15m
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
