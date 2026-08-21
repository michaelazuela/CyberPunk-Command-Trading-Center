# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-02 / morning (2026-07-02T09:15:00 to 2026-07-02T12:00:00)
Context window: 275 days (2025-09-30T00:00:00 to 2026-07-03T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 47976 bars (2025-10-28T18:05:00 to 2026-07-03T13:00:00)
- 15m: 16014 bars (2025-10-28T18:15:00 to 2026-07-03T13:00:00)
- 60m: 3980 bars (2025-10-28T19:00:00 to 2026-07-03T13:00:00)
- 120m: 2089 bars (2025-10-28T20:00:00 to 2026-07-03T13:00:00)
- 240m: 1160 bars (2025-10-28T22:00:00 to 2026-07-03T12:00:00)

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
- Open below: 120m SHORT 7544.75-7549.75 parent 2026-07-02T02:00:00 confirmed 2026-07-02T04:00:00 status partial_touch; 5m LONG 7546.00-7546.50 parent 2026-07-02T08:05:00 confirmed 2026-07-02T08:10:00 status open_untouched; 5m LONG 7537.00-7537.50 parent 2026-07-02T06:30:00 confirmed 2026-07-02T06:35:00 status open_untouched; 15m LONG 7537.25-7537.50 parent 2026-07-02T06:30:00 confirmed 2026-07-02T06:45:00 status open_untouched; 5m LONG 7530.00-7534.00 parent 2026-07-02T04:25:00 confirmed 2026-07-02T04:30:00 status partial_touch; 15m LONG 7500.75-7503.50 parent 2026-06-30T09:45:00 confirmed 2026-06-30T10:00:00 status open_untouched; 120m LONG 7476.25-7491.25 parent 2026-06-29T14:00:00 confirmed 2026-06-29T16:00:00 status partial_touch; 5m LONG 7487.25-7487.50 parent 2026-06-29T21:20:00 confirmed 2026-06-29T21:25:00 status open_untouched; 15m LONG 7480.00-7485.00 parent 2026-06-29T13:15:00 confirmed 2026-06-29T13:30:00 status partial_touch; 5m LONG 7481.50-7483.25 parent 2026-06-29T13:10:00 confirmed 2026-06-29T13:15:00 status partial_touch
- Failed above: 5m LONG 7554.75-7556.50 parent 2026-06-14T19:35:00 confirmed 2026-06-14T19:40:00 status failed_inverted; 5m LONG 7554.75-7555.75 parent 2026-06-17T22:05:00 confirmed 2026-06-17T22:10:00 status failed_inverted; 5m SHORT 7554.75-7555.25 parent 2026-07-01T23:10:00 confirmed 2026-07-01T23:15:00 status failed_inverted; 5m LONG 7555.00-7555.50 parent 2026-05-22T00:55:00 confirmed 2026-05-22T01:00:00 status failed_inverted; 5m LONG 7555.00-7556.50 parent 2026-05-22T10:35:00 confirmed 2026-05-22T10:40:00 status failed_inverted; 5m LONG 7555.00-7557.25 parent 2026-06-18T05:40:00 confirmed 2026-06-18T05:45:00 status failed_inverted; 5m SHORT 7555.00-7557.25 parent 2026-06-18T06:45:00 confirmed 2026-06-18T06:50:00 status failed_inverted; 5m SHORT 7555.00-7555.25 parent 2026-07-01T14:50:00 confirmed 2026-07-01T14:55:00 status failed_inverted; 15m SHORT 7555.00-7560.75 parent 2026-06-18T09:45:00 confirmed 2026-06-18T10:00:00 status failed_inverted; 5m SHORT 7555.25-7555.75 parent 2026-05-14T08:50:00 confirmed 2026-05-14T08:55:00 status failed_inverted
- Open above: 15m SHORT 7562.50-7589.00 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:45:00 status partial_touch; 5m SHORT 7566.25-7569.25 parent 2026-07-02T08:55:00 confirmed 2026-07-02T09:00:00 status open_untouched; 5m SHORT 7574.75-7579.25 parent 2026-06-22T10:25:00 confirmed 2026-06-22T10:30:00 status partial_touch; 5m SHORT 7581.75-7589.00 parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof none from 15M parent 2026-07-02T09:45:00 confirmed 2026-07-02T10:00:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: 1 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7561.50-7575.75 parent 2026-07-02T09:45:00 confirmed 2026-07-02T10:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-02T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-02T10:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-02T10:30:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-02T10:40:00. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-02T09:45:00
- Parent failure: 2026-07-02T10:30:00
- First 5M return: 2026-07-02T10:30:00
- 5M wick defense: 2026-07-02T10:40:00
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7561.50-7575.75 parent 2026-07-02T09:45:00 confirmed 2026-07-02T10:00:00 failed_acceptance_through_15m failed 2026-07-02T10:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7561.50-7575.75 parent 2026-07-02T09:45:00 confirmed 2026-07-02T10:00:00 failed_acceptance_through_15m failed 2026-07-02T10:30:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-02T10:25:00; wick 2026-07-02T10:40:00; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-02T10:30:00.
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

### 2. SHORT 15M FVG 7574.50-7577.50 parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-02T10:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-02T10:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7574.50-7577.50 parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7574.50-7577.50 parent 2026-07-02T10:30:00 confirmed 2026-07-02T10:45:00 untested_by_15m
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
