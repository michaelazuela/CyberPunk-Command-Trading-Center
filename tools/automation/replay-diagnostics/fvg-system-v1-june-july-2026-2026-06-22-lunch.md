# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-22 / lunch (2026-06-22T12:00:00 to 2026-06-22T16:00:00)
Context window: 275 days (2025-09-20T00:00:00 to 2026-06-23T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 45887 bars (2025-10-28T18:05:00 to 2026-06-23T23:55:00)
- 15m: 15313 bars (2025-10-28T18:15:00 to 2026-06-23T23:45:00)
- 60m: 3798 bars (2025-10-28T19:00:00 to 2026-06-23T23:00:00)
- 120m: 1990 bars (2025-10-28T20:00:00 to 2026-06-23T22:00:00)
- 240m: 1075 bars (2025-10-28T22:00:00 to 2026-06-23T22:00:00)

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
- Open below: 15m LONG 7521.25-7531.25 parent 2026-06-21T20:15:00 confirmed 2026-06-21T20:30:00 status partial_touch; 5m LONG 7516.25-7530.00 parent 2026-06-21T20:05:00 confirmed 2026-06-21T20:10:00 status partial_touch; 5m LONG 7503.00-7504.00 parent 2026-06-17T16:25:00 confirmed 2026-06-17T16:30:00 status open_untouched; 5m LONG 7501.75-7502.75 parent 2026-06-17T16:20:00 confirmed 2026-06-17T16:25:00 status open_untouched; 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status open_untouched; 120m LONG 7399.25-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00 status open_untouched; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status open_untouched; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status open_untouched; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched
- Failed above: 5m LONG 7542.75-7544.00 parent 2026-06-19T03:05:00 confirmed 2026-06-19T03:10:00 status failed_inverted; 15m LONG 7542.75-7544.75 parent 2026-06-19T03:15:00 confirmed 2026-06-19T03:30:00 status failed_inverted; 60m LONG 7542.75-7550.50 parent 2026-06-19T04:00:00 confirmed 2026-06-19T05:00:00 status failed_inverted; 5m LONG 7543.00-7545.50 parent 2026-05-21T21:50:00 confirmed 2026-05-21T21:55:00 status failed_inverted; 5m SHORT 7543.00-7543.75 parent 2026-06-21T22:30:00 confirmed 2026-06-21T22:35:00 status failed_inverted; 15m SHORT 7543.00-7544.00 parent 2026-06-21T22:30:00 confirmed 2026-06-21T22:45:00 status failed_inverted; 5m SHORT 7543.25-7543.75 parent 2026-05-13T23:20:00 confirmed 2026-05-13T23:25:00 status failed_inverted; 5m SHORT 7543.25-7544.50 parent 2026-05-22T05:10:00 confirmed 2026-05-22T05:15:00 status failed_inverted; 5m LONG 7543.25-7544.50 parent 2026-05-22T07:50:00 confirmed 2026-05-22T07:55:00 status failed_inverted; 15m SHORT 7543.25-7544.00 parent 2026-05-22T06:15:00 confirmed 2026-05-22T06:30:00 status failed_inverted
- Open above: 5m SHORT 7546.00-7547.75 parent 2026-06-22T11:50:00 confirmed 2026-06-22T11:55:00 status partial_touch; 15m SHORT 7549.50-7560.50 parent 2026-06-22T10:45:00 confirmed 2026-06-22T11:00:00 status partial_touch; 5m SHORT 7556.25-7560.50 parent 2026-06-22T10:35:00 confirmed 2026-06-22T10:40:00 status partial_touch; 60m SHORT 7559.25-7568.00 parent 2026-06-22T11:00:00 confirmed 2026-06-22T12:00:00 status open_untouched; 5m SHORT 7562.50-7569.50 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:35:00 status open_untouched; 15m SHORT 7562.50-7589.00 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:45:00 status open_untouched; 5m SHORT 7574.75-7579.25 parent 2026-06-22T10:25:00 confirmed 2026-06-22T10:30:00 status open_untouched; 5m SHORT 7581.75-7589.00 parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof none from 15M parent 2026-06-22T15:00:00 confirmed 2026-06-22T15:15:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: none.

## Trace Rows

### 1. SHORT 15M FVG 7539.50-7540.50 parent 2026-06-22T15:00:00 confirmed 2026-06-22T15:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-22T15:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-22T15:55:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-22T15:00:00
- Parent failure: not found
- First 5M return: 2026-06-22T15:55:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7539.50-7540.50 parent 2026-06-22T15:00:00 confirmed 2026-06-22T15:15:00 not_selected
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7539.50-7540.50 parent 2026-06-22T15:00:00 confirmed 2026-06-22T15:15:00 not_selected
- 5M defense of active 15M zone: accepted_through_zone; return 2026-06-22T15:55:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-06-22T15:55:00.
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
