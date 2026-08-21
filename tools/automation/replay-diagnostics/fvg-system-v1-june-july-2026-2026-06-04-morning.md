# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-04 / morning (2026-06-04T09:15:00 to 2026-06-04T12:00:00)
Context window: 275 days (2025-09-02T00:00:00 to 2026-06-05T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 42552 bars (2025-10-28T18:05:00 to 2026-06-05T17:00:00)
- 15m: 14189 bars (2025-10-28T18:15:00 to 2026-06-05T17:00:00)
- 60m: 3508 bars (2025-10-28T19:00:00 to 2026-06-05T17:00:00)
- 120m: 1833 bars (2025-10-28T20:00:00 to 2026-06-05T17:00:00)
- 240m: 940 bars (2025-10-28T22:00:00 to 2026-06-05T16:00:00)

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
- Open below: 15m LONG 7607.25-7608.75 parent 2026-06-04T08:45:00 confirmed 2026-06-04T09:00:00 status open_untouched; 5m LONG 7597.50-7600.50 parent 2026-06-04T07:50:00 confirmed 2026-06-04T07:55:00 status partial_touch; 120m LONG 7558.50-7598.50 parent 2026-05-24T20:00:00 confirmed 2026-05-24T22:00:00 status partial_touch; 60m LONG 7558.50-7596.50 parent 2026-05-24T19:00:00 confirmed 2026-05-24T20:00:00 status partial_touch; 15m LONG 7551.00-7590.50 parent 2026-05-24T18:15:00 confirmed 2026-05-24T18:30:00 status partial_touch; 5m LONG 7549.75-7589.00 parent 2026-05-24T18:05:00 confirmed 2026-05-24T18:10:00 status partial_touch; 5m LONG 7587.00-7587.75 parent 2026-05-28T08:30:00 confirmed 2026-05-28T08:35:00 status open_untouched; 5m LONG 7582.75-7583.25 parent 2026-05-28T07:40:00 confirmed 2026-05-28T07:45:00 status open_untouched; 15m LONG 7578.25-7580.50 parent 2026-05-28T01:30:00 confirmed 2026-05-28T01:45:00 status partial_touch; 5m LONG 7550.50-7580.25 parent 2026-05-22T17:00:00 confirmed 2026-05-24T18:05:00 status partial_touch
- Failed above: 5m SHORT 7613.25-7614.50 parent 2026-05-26T10:55:00 confirmed 2026-05-26T11:00:00 status failed_inverted; 5m LONG 7613.25-7617.50 parent 2026-05-27T08:20:00 confirmed 2026-05-27T08:25:00 status failed_inverted; 5m LONG 7614.00-7614.25 parent 2026-06-04T02:55:00 confirmed 2026-06-04T03:00:00 status failed_inverted; 5m LONG 7614.25-7615.50 parent 2026-05-24T23:00:00 confirmed 2026-05-24T23:05:00 status failed_inverted; 5m LONG 7614.25-7615.75 parent 2026-05-27T16:55:00 confirmed 2026-05-27T17:00:00 status failed_inverted; 240m SHORT 7614.75-7626.00 parent 2026-06-03T16:00:00 confirmed 2026-06-03T20:00:00 status failed_inverted; 5m SHORT 7615.00-7616.50 parent 2026-05-27T08:00:00 confirmed 2026-05-27T08:05:00 status failed_inverted; 15m SHORT 7615.00-7619.50 parent 2026-05-27T08:00:00 confirmed 2026-05-27T08:15:00 status failed_inverted; 15m LONG 7615.00-7621.50 parent 2026-05-27T08:30:00 confirmed 2026-05-27T08:45:00 status failed_inverted; 5m LONG 7615.25-7616.50 parent 2026-05-27T04:20:00 confirmed 2026-05-27T04:25:00 status failed_inverted
- Open above: 15m SHORT 7622.75-7629.50 parent 2026-06-03T16:30:00 confirmed 2026-06-03T16:45:00 status open_untouched; 5m SHORT 7628.75-7629.50 parent 2026-06-03T16:20:00 confirmed 2026-06-03T16:25:00 status open_untouched; 15m SHORT 7631.75-7632.00 parent 2026-06-03T16:15:00 confirmed 2026-06-03T16:30:00 status open_untouched; 60m SHORT 7637.00-7640.50 parent 2026-06-03T16:00:00 confirmed 2026-06-03T17:00:00 status open_untouched; 5m SHORT 7640.50-7642.25 parent 2026-06-03T15:55:00 confirmed 2026-06-03T16:00:00 status open_untouched; 5m SHORT 7658.00-7666.00 parent 2026-06-03T09:45:00 confirmed 2026-06-03T09:50:00 status partial_touch; 15m SHORT 7658.00-7668.75 parent 2026-06-03T09:45:00 confirmed 2026-06-03T10:00:00 status partial_touch; 60m SHORT 7661.25-7667.25 parent 2026-06-03T10:00:00 confirmed 2026-06-03T11:00:00 status open_untouched; 120m SHORT 7661.25-7674.00 parent 2026-06-03T10:00:00 confirmed 2026-06-03T12:00:00 status open_untouched; 5m SHORT 7669.25-7670.25 parent 2026-06-03T09:40:00 confirmed 2026-06-03T09:45:00 status open_untouched

## Review Order
- Primary campaign to review first: LONG proof none from 15M parent 2026-06-04T11:15:00 confirmed 2026-06-04T11:30:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: none.

## Trace Rows

### 1. LONG 15M FVG 7633.50-7644.75 parent 2026-06-04T11:15:00 confirmed 2026-06-04T11:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-04T11:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-04T11:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-04T12:00:00. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-04T11:15:00
- Parent failure: not found
- First 5M return: 2026-06-04T11:45:00
- 5M wick defense: 2026-06-04T12:00:00
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7633.50-7644.75 parent 2026-06-04T11:15:00 confirmed 2026-06-04T11:30:00 not_selected
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7633.50-7644.75 parent 2026-06-04T11:15:00 confirmed 2026-06-04T11:30:00 not_selected
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-06-04T11:45:00; wick 2026-06-04T12:00:00; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.
