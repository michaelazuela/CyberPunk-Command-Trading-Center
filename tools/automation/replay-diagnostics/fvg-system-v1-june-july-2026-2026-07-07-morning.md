# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-07 / morning (2026-07-07T09:15:00 to 2026-07-07T12:00:00)
Context window: 275 days (2025-10-05T00:00:00 to 2026-07-08T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 48875 bars (2025-10-28T18:05:00 to 2026-07-08T23:55:00)
- 15m: 16313 bars (2025-10-28T18:15:00 to 2026-07-08T23:45:00)
- 60m: 4058 bars (2025-10-28T19:00:00 to 2026-07-08T23:00:00)
- 120m: 2131 bars (2025-10-28T20:00:00 to 2026-07-08T22:00:00)
- 240m: 1196 bars (2025-10-28T22:00:00 to 2026-07-08T22:00:00)

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
- Open below: 5m LONG 7566.25-7568.75 parent 2026-07-07T01:35:00 confirmed 2026-07-07T01:40:00 status partial_touch; 15m LONG 7566.50-7568.75 parent 2026-07-07T01:45:00 confirmed 2026-07-07T02:00:00 status partial_touch; 5m LONG 7551.75-7553.00 parent 2026-07-06T02:35:00 confirmed 2026-07-06T02:40:00 status partial_touch; 15m LONG 7551.75-7552.50 parent 2026-07-06T02:45:00 confirmed 2026-07-06T03:00:00 status partial_touch; 5m LONG 7549.75-7550.00 parent 2026-07-06T02:30:00 confirmed 2026-07-06T02:35:00 status open_untouched; 120m LONG 7537.75-7547.75 parent 2026-07-02T22:00:00 confirmed 2026-07-03T00:00:00 status partial_touch; 5m LONG 7544.00-7545.50 parent 2026-07-06T00:15:00 confirmed 2026-07-06T00:20:00 status partial_touch; 15m LONG 7543.25-7545.50 parent 2026-07-06T00:15:00 confirmed 2026-07-06T00:30:00 status partial_touch; 15m LONG 7533.50-7544.75 parent 2026-07-02T21:15:00 confirmed 2026-07-02T21:30:00 status partial_touch; 5m LONG 7531.50-7539.75 parent 2026-07-02T21:05:00 confirmed 2026-07-02T21:10:00 status partial_touch
- Failed above: 5m SHORT 7580.75-7581.00 parent 2026-05-14T21:05:00 confirmed 2026-05-14T21:10:00 status failed_inverted; 5m LONG 7581.25-7581.50 parent 2026-05-14T13:40:00 confirmed 2026-05-14T13:45:00 status failed_inverted; 5m LONG 7581.25-7586.00 parent 2026-05-28T01:35:00 confirmed 2026-05-28T01:40:00 status failed_inverted; 15m LONG 7581.25-7588.50 parent 2026-05-28T01:45:00 confirmed 2026-05-28T02:00:00 status failed_inverted; 5m SHORT 7581.50-7584.75 parent 2026-05-14T14:05:00 confirmed 2026-05-14T14:10:00 status failed_inverted; 5m LONG 7581.50-7585.50 parent 2026-05-14T14:15:00 confirmed 2026-05-14T14:20:00 status failed_inverted; 5m SHORT 7581.75-7589.00 parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00 status failed_inverted; 15m SHORT 7581.75-7590.25 parent 2026-05-27T23:45:00 confirmed 2026-05-28T00:00:00 status failed_inverted; 5m SHORT 7582.00-7582.50 parent 2026-07-07T08:20:00 confirmed 2026-07-07T08:25:00 status failed_inverted; 5m SHORT 7582.25-7583.00 parent 2026-07-06T22:30:00 confirmed 2026-07-06T22:35:00 status failed_inverted
- Open above: 5m SHORT 7583.00-7583.25 parent 2026-07-07T08:50:00 confirmed 2026-07-07T08:55:00 status open_untouched; 5m SHORT 7596.75-7598.50 parent 2026-07-06T18:50:00 confirmed 2026-07-06T18:55:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch; 15m SHORT 7654.50-7656.50 parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof none from 15M parent 2026-07-07T10:15:00 confirmed 2026-07-07T10:30:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: none.

## Trace Rows

### 1. SHORT 15M FVG 7555.25-7560.25 parent 2026-07-07T10:15:00 confirmed 2026-07-07T10:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-07T10:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-07T10:15:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7555.25-7560.25 parent 2026-07-07T10:15:00 confirmed 2026-07-07T10:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7555.25-7560.25 parent 2026-07-07T10:15:00 confirmed 2026-07-07T10:30:00 untested_by_15m
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
