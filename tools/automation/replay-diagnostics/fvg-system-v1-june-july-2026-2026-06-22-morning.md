# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-22 / morning (2026-06-22T09:15:00 to 2026-06-22T12:00:00)
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
- Open below: 15m LONG 7565.00-7567.75 parent 2026-06-22T08:15:00 confirmed 2026-06-22T08:30:00 status partial_touch; 5m LONG 7567.00-7567.50 parent 2026-06-22T08:10:00 confirmed 2026-06-22T08:15:00 status partial_touch; 5m LONG 7565.00-7566.25 parent 2026-06-22T08:05:00 confirmed 2026-06-22T08:10:00 status open_untouched; 60m LONG 7547.75-7560.50 parent 2026-06-22T03:00:00 confirmed 2026-06-22T04:00:00 status partial_touch; 120m LONG 7547.75-7552.50 parent 2026-06-22T04:00:00 confirmed 2026-06-22T06:00:00 status open_untouched; 15m LONG 7547.75-7551.75 parent 2026-06-22T02:15:00 confirmed 2026-06-22T02:30:00 status open_untouched; 5m LONG 7549.25-7550.00 parent 2026-06-22T02:10:00 confirmed 2026-06-22T02:15:00 status open_untouched; 5m LONG 7547.75-7548.50 parent 2026-06-22T02:05:00 confirmed 2026-06-22T02:10:00 status open_untouched; 60m LONG 7536.75-7546.00 parent 2026-06-22T02:00:00 confirmed 2026-06-22T03:00:00 status open_untouched; 5m LONG 7536.00-7542.50 parent 2026-06-22T01:10:00 confirmed 2026-06-22T01:15:00 status partial_touch
- Failed above: 5m LONG 7577.25-7578.25 parent 2026-05-14T13:35:00 confirmed 2026-05-14T13:40:00 status failed_inverted; 5m LONG 7577.75-7578.75 parent 2026-05-28T01:25:00 confirmed 2026-05-28T01:30:00 status failed_inverted; 5m LONG 7578.00-7582.50 parent 2026-06-17T13:55:00 confirmed 2026-06-17T14:00:00 status failed_inverted; 15m LONG 7578.25-7579.00 parent 2026-05-14T11:00:00 confirmed 2026-05-14T11:15:00 status failed_inverted; 15m LONG 7578.25-7580.50 parent 2026-05-28T01:30:00 confirmed 2026-05-28T01:45:00 status failed_inverted; 5m SHORT 7578.75-7579.50 parent 2026-05-14T21:10:00 confirmed 2026-05-14T21:15:00 status failed_inverted; 60m SHORT 7578.75-7596.00 parent 2026-05-28T00:00:00 confirmed 2026-05-28T01:00:00 status failed_inverted; 60m LONG 7578.75-7587.00 parent 2026-05-28T02:00:00 confirmed 2026-05-28T03:00:00 status failed_inverted; 5m SHORT 7579.00-7581.50 parent 2026-06-17T13:05:00 confirmed 2026-06-17T13:10:00 status failed_inverted; 60m LONG 7579.25-7580.75 parent 2026-06-14T23:00:00 confirmed 2026-06-15T00:00:00 status failed_inverted
- Open above: 5m SHORT 7590.75-7597.25 parent 2026-06-17T10:35:00 confirmed 2026-06-17T10:40:00 status partial_touch; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch; 5m SHORT 7608.00-7609.75 parent 2026-06-17T03:20:00 confirmed 2026-06-17T03:25:00 status partial_touch; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch; 15m SHORT 7654.50-7656.50 parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00 status partial_touch; 60m SHORT 7655.00-7661.75 parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00 status partial_touch

## Review Order
- Primary campaign to review first: LONG proof none from 15M parent 2026-06-22T09:15:00 confirmed 2026-06-22T09:30:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: 2 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7571.75-7572.25 parent 2026-06-22T09:15:00 confirmed 2026-06-22T09:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-22T09:15:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-06-22T10:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-22T10:30:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-22T09:15:00
- Parent failure: 2026-06-22T10:30:00
- First 5M return: 2026-06-22T10:30:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7571.75-7572.25 parent 2026-06-22T09:15:00 confirmed 2026-06-22T09:30:00 defended_on_15m defended 2026-06-22T09:45:00 failed 2026-06-22T10:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7571.75-7572.25 parent 2026-06-22T09:15:00 confirmed 2026-06-22T09:30:00 defended_on_15m defended 2026-06-22T09:45:00 failed 2026-06-22T10:30:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-06-22T09:30:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-06-22T10:30:00.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 2. SHORT 15M FVG 7562.50-7589.00 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-22T10:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-22T10:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7562.50-7589.00 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7562.50-7589.00 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:45:00 untested_by_15m
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

### 3. SHORT 15M FVG 7549.50-7560.50 parent 2026-06-22T10:45:00 confirmed 2026-06-22T11:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-22T10:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-22T11:05:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-22T11:10:00. | PASS entry_stop_risk_contract: Entry 7538.50, protected 5M stop 7599.25, risk 60.75 pts. | PASS tactical_targets_from_actual_risk: T1 7447.50 and T2 7417.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7538.25.
- Parent displacement: yes
- Parent displacement candle: 2026-06-22T10:45:00
- Parent failure: not found
- First 5M return: 2026-06-22T11:05:00
- 5M wick defense: none
- Proof: 2026-06-22T11:10:00
- Entry/stop/risk: 7538.50 / 7599.25 / 60.75 pts
- T1/T2: 7447.50 / 7417.00
- Nearest liquidity: nearest prior low liquidity 7538.25
- Defended-area / obstacle management callout before or near T1: 15m LONG 7521.25-7531.25 parent 2026-06-21T20:15:00 confirmed 2026-06-21T20:30:00 status partial_touch
- Defended-area reaction: obstacle_reached_then_continued at 2026-06-22T15:10:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7562.50-7589.00 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:45:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7562.50-7589.00 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:45:00 untested_by_15m
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-06-22T11:05:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 15m LONG 7521.25-7531.25 parent 2026-06-21T20:15:00 confirmed 2026-06-21T20:30:00 status partial_touch; 5m LONG 7516.25-7530.00 parent 2026-06-21T20:05:00 confirmed 2026-06-21T20:10:00 status partial_touch; 5m LONG 7503.00-7504.00 parent 2026-06-17T16:25:00 confirmed 2026-06-17T16:30:00 status open_untouched; 5m LONG 7501.75-7502.75 parent 2026-06-17T16:20:00 confirmed 2026-06-17T16:25:00 status open_untouched; 60m LONG 7386.00-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00 status open_untouched; 120m LONG 7399.25-7408.75 parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00 status open_untouched; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status open_untouched; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7538.75-7539.75 parent 2026-05-22T07:40:00 confirmed 2026-05-22T07:45:00 status failed_inverted; 5m SHORT 7539.00-7539.50 parent 2026-06-18T07:40:00 confirmed 2026-06-18T07:45:00 status failed_inverted; 15m LONG 7539.00-7540.75 parent 2026-05-14T00:30:00 confirmed 2026-05-14T00:45:00 status failed_inverted; 5m SHORT 7539.25-7539.75 parent 2026-05-15T03:45:00 confirmed 2026-05-15T03:50:00 status failed_inverted; 5m LONG 7539.25-7540.25 parent 2026-05-22T07:05:00 confirmed 2026-05-22T07:10:00 status failed_inverted; 15m SHORT 7539.25-7545.00 parent 2026-05-15T03:45:00 confirmed 2026-05-15T04:00:00 status failed_inverted; 5m LONG 7539.50-7539.75 parent 2026-06-17T20:00:00 confirmed 2026-06-17T20:05:00 status failed_inverted; 5m LONG 7539.50-7541.00 parent 2026-06-19T03:00:00 confirmed 2026-06-19T03:05:00 status failed_inverted
- Open FVGs above at proof: 120m LONG 7547.75-7552.50 parent 2026-06-22T04:00:00 confirmed 2026-06-22T06:00:00 status open_untouched; 15m SHORT 7549.50-7560.50 parent 2026-06-22T10:45:00 confirmed 2026-06-22T11:00:00 status open_untouched; 5m SHORT 7556.25-7560.50 parent 2026-06-22T10:35:00 confirmed 2026-06-22T10:40:00 status open_untouched; 5m SHORT 7562.50-7569.50 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:35:00 status open_untouched; 15m SHORT 7562.50-7589.00 parent 2026-06-22T10:30:00 confirmed 2026-06-22T10:45:00 status open_untouched; 5m SHORT 7574.75-7579.25 parent 2026-06-22T10:25:00 confirmed 2026-06-22T10:30:00 status open_untouched; 5m SHORT 7581.75-7589.00 parent 2026-06-22T10:20:00 confirmed 2026-06-22T10:25:00 status open_untouched; 5m SHORT 7601.25-7605.25 parent 2026-06-17T04:15:00 confirmed 2026-06-17T04:20:00 status partial_touch
- Objective ladder: session_extreme 7527.25 not reached (RTH low liquidity before proof); open_fvg 7521.25 not reached (15m LONG open FVG partial_touch parent 2026-06-21T20:15:00 confirmed 2026-06-21T20:30:00); open_fvg 7516.25 not reached (5m LONG open FVG partial_touch parent 2026-06-21T20:05:00 confirmed 2026-06-21T20:10:00); open_fvg 7503.00 not reached (5m LONG open FVG open_untouched parent 2026-06-17T16:25:00 confirmed 2026-06-17T16:30:00); open_fvg 7501.75 not reached (5m LONG open FVG open_untouched parent 2026-06-17T16:20:00 confirmed 2026-06-17T16:25:00); tactical 7447.50 not reached (T1 1.5R); tactical 7417.00 not reached (T2 2.0R); open_fvg 7399.25 not reached (120m LONG open FVG open_untouched parent 2026-06-11T14:00:00 confirmed 2026-06-11T16:00:00); open_fvg 7386.00 not reached (60m LONG open FVG open_untouched parent 2026-06-11T14:00:00 confirmed 2026-06-11T15:00:00); open_fvg 7355.50 not reached (15m LONG open FVG open_untouched parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00); open_fvg 7345.25 not reached (5m LONG open FVG open_untouched parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00)
- Story: SHORT proof completed at 2026-06-22T11:10:00 from 7549.50-7560.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 15m 7521.25-7531.25 with reaction obstacle_reached_then_continued. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-23T03:00:00, one MES +$455.00
- Managed outcome: T1 at 2026-06-23T03:00:00, exit 7447.50, one MES +$455.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.
