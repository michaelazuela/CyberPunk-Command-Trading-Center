# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-29 / morning (2026-06-29T09:15:00 to 2026-06-29T12:00:00)
Context window: 275 days (2025-09-27T00:00:00 to 2026-06-30T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 47267 bars (2025-10-28T18:05:00 to 2026-06-30T23:55:00)
- 15m: 15777 bars (2025-10-28T18:15:00 to 2026-06-30T23:45:00)
- 60m: 3918 bars (2025-10-28T19:00:00 to 2026-06-30T23:00:00)
- 120m: 2055 bars (2025-10-28T20:00:00 to 2026-06-30T22:00:00)
- 240m: 1131 bars (2025-10-28T22:00:00 to 2026-06-30T22:00:00)

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
- Open below: 5m LONG 7461.25-7463.75 parent 2026-06-29T09:00:00 confirmed 2026-06-29T09:05:00 status partial_touch; 5m LONG 7443.00-7444.50 parent 2026-06-29T03:20:00 confirmed 2026-06-29T03:25:00 status open_untouched; 5m LONG 7442.25-7443.00 parent 2026-06-29T03:15:00 confirmed 2026-06-29T03:20:00 status open_untouched; 5m LONG 7429.25-7433.00 parent 2026-06-28T22:25:00 confirmed 2026-06-28T22:30:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch
- Failed above: 5m SHORT 7468.00-7470.75 parent 2026-05-17T20:05:00 confirmed 2026-05-17T20:10:00 status failed_inverted; 5m LONG 7468.00-7471.50 parent 2026-05-18T12:15:00 confirmed 2026-05-18T12:20:00 status failed_inverted; 5m LONG 7468.00-7471.75 parent 2026-06-24T10:45:00 confirmed 2026-06-24T10:50:00 status failed_inverted; 5m SHORT 7468.25-7469.75 parent 2026-06-11T15:50:00 confirmed 2026-06-11T15:55:00 status failed_inverted; 5m LONG 7468.25-7469.50 parent 2026-06-12T00:30:00 confirmed 2026-06-12T00:35:00 status failed_inverted; 15m SHORT 7468.25-7469.75 parent 2026-05-18T06:15:00 confirmed 2026-05-18T06:30:00 status failed_inverted; 15m LONG 7468.25-7472.25 parent 2026-06-08T19:00:00 confirmed 2026-06-08T19:15:00 status failed_inverted; 5m SHORT 7468.50-7471.25 parent 2026-05-12T08:05:00 confirmed 2026-05-12T08:10:00 status failed_inverted; 5m LONG 7468.50-7469.25 parent 2026-05-12T08:15:00 confirmed 2026-05-12T08:20:00 status failed_inverted; 5m SHORT 7468.75-7471.00 parent 2026-05-10T19:30:00 confirmed 2026-05-10T19:35:00 status failed_inverted
- Open above: 5m SHORT 7477.00-7481.50 parent 2026-06-25T09:35:00 confirmed 2026-06-25T09:40:00 status open_untouched; 5m SHORT 7496.50-7499.75 parent 2026-06-23T00:20:00 confirmed 2026-06-23T00:25:00 status partial_touch; 15m SHORT 7496.75-7499.75 parent 2026-06-23T00:30:00 confirmed 2026-06-23T00:45:00 status open_untouched; 5m SHORT 7501.75-7502.75 parent 2026-06-23T00:15:00 confirmed 2026-06-23T00:20:00 status open_untouched; 5m SHORT 7504.00-7507.25 parent 2026-06-23T00:10:00 confirmed 2026-06-23T00:15:00 status open_untouched; 15m SHORT 7513.75-7515.50 parent 2026-06-22T23:00:00 confirmed 2026-06-22T23:15:00 status open_untouched; 120m SHORT 7525.00-7525.50 parent 2026-06-22T22:00:00 confirmed 2026-06-23T00:00:00 status open_untouched; 15m SHORT 7525.50-7532.75 parent 2026-06-22T21:45:00 confirmed 2026-06-22T22:00:00 status open_untouched; 5m SHORT 7528.50-7529.50 parent 2026-06-22T21:40:00 confirmed 2026-06-22T21:45:00 status open_untouched; 5m SHORT 7530.25-7533.00 parent 2026-06-22T21:35:00 confirmed 2026-06-22T21:40:00 status open_untouched

## Review Order
- Primary campaign to review first: SHORT proof none from 15M parent 2026-06-29T10:15:00 confirmed 2026-06-29T10:30:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: none.

## Trace Rows

### 1. SHORT 15M FVG 7450.75-7453.75 parent 2026-06-29T10:15:00 confirmed 2026-06-29T10:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-29T10:15:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-29T10:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-29T10:50:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-29T11:25:00. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-29T10:15:00
- Parent failure: 2026-06-29T10:45:00
- First 5M return: 2026-06-29T10:50:00
- 5M wick defense: 2026-06-29T11:25:00
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7450.75-7453.75 parent 2026-06-29T10:15:00 confirmed 2026-06-29T10:30:00 failed_acceptance_through_15m failed 2026-06-29T10:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7450.75-7453.75 parent 2026-06-29T10:15:00 confirmed 2026-06-29T10:30:00 failed_acceptance_through_15m failed 2026-06-29T10:45:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-06-29T10:30:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-06-29T10:35:00.
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
