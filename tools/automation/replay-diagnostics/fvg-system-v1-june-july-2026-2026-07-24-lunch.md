# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-24 / lunch (2026-07-24T12:00:00 to 2026-07-24T16:00:00)
Context window: 275 days (2025-10-22T00:00:00 to 2026-07-25T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 52116 bars (2025-10-28T18:05:00 to 2026-07-24T17:00:00)
- 15m: 17394 bars (2025-10-28T18:15:00 to 2026-07-24T17:00:00)
- 60m: 4340 bars (2025-10-28T19:00:00 to 2026-07-24T17:00:00)
- 120m: 2280 bars (2025-10-28T20:00:00 to 2026-07-24T17:00:00)
- 240m: 1307 bars (2025-10-28T22:00:00 to 2026-07-24T17:00:00)

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
- Open below: 5m LONG 7465.50-7472.50 parent 2026-07-24T11:15:00 confirmed 2026-07-24T11:20:00 status open_untouched; 15m LONG 7466.00-7472.50 parent 2026-07-24T11:15:00 confirmed 2026-07-24T11:30:00 status open_untouched; 5m LONG 7452.00-7461.25 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:05:00 status partial_touch; 15m LONG 7451.00-7454.75 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:15:00 status open_untouched; 5m LONG 7444.25-7448.75 parent 2026-07-24T10:55:00 confirmed 2026-07-24T11:00:00 status open_untouched; 5m LONG 7442.50-7444.00 parent 2026-07-24T10:50:00 confirmed 2026-07-24T10:55:00 status open_untouched; 5m LONG 7430.75-7442.00 parent 2026-07-23T16:00:00 confirmed 2026-07-23T16:05:00 status partial_touch; 5m LONG 7425.75-7429.25 parent 2026-07-23T15:55:00 confirmed 2026-07-23T16:00:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch
- Failed above: 5m SHORT 7490.00-7492.50 parent 2026-05-19T04:05:00 confirmed 2026-05-19T04:10:00 status failed_inverted; 5m LONG 7490.00-7490.50 parent 2026-05-21T13:05:00 confirmed 2026-05-21T13:10:00 status failed_inverted; 5m SHORT 7490.25-7491.00 parent 2026-05-21T12:25:00 confirmed 2026-05-21T12:30:00 status failed_inverted; 5m LONG 7490.25-7492.25 parent 2026-07-17T16:25:00 confirmed 2026-07-17T16:30:00 status failed_inverted; 15m SHORT 7490.25-7490.50 parent 2026-05-18T21:00:00 confirmed 2026-05-18T21:15:00 status failed_inverted; 15m SHORT 7490.25-7494.75 parent 2026-06-12T08:30:00 confirmed 2026-06-12T08:45:00 status failed_inverted; 60m LONG 7490.25-7492.50 parent 2026-07-08T08:00:00 confirmed 2026-07-08T09:00:00 status failed_inverted; 5m SHORT 7490.50-7491.75 parent 2026-05-11T23:05:00 confirmed 2026-05-11T23:10:00 status failed_inverted; 5m SHORT 7490.50-7491.50 parent 2026-05-11T23:50:00 confirmed 2026-05-11T23:55:00 status failed_inverted; 5m SHORT 7490.50-7499.25 parent 2026-05-13T08:35:00 confirmed 2026-05-13T08:40:00 status failed_inverted
- Open above: 60m SHORT 7501.50-7508.50 parent 2026-07-23T08:00:00 confirmed 2026-07-23T09:00:00 status open_untouched; 15m SHORT 7505.75-7510.00 parent 2026-07-23T07:30:00 confirmed 2026-07-23T07:45:00 status open_untouched; 5m SHORT 7508.25-7511.75 parent 2026-07-23T07:25:00 confirmed 2026-07-23T07:30:00 status open_untouched; 5m SHORT 7514.75-7519.50 parent 2026-07-23T07:05:00 confirmed 2026-07-23T07:10:00 status partial_touch; 15m SHORT 7516.00-7519.50 parent 2026-07-23T07:15:00 confirmed 2026-07-23T07:30:00 status open_untouched; 5m SHORT 7526.00-7528.00 parent 2026-07-23T01:50:00 confirmed 2026-07-23T01:55:00 status partial_touch; 15m SHORT 7526.50-7528.00 parent 2026-07-23T02:00:00 confirmed 2026-07-23T02:15:00 status partial_touch; 5m SHORT 7531.50-7533.00 parent 2026-07-23T01:40:00 confirmed 2026-07-23T01:45:00 status open_untouched; 60m SHORT 7531.50-7538.25 parent 2026-07-22T23:00:00 confirmed 2026-07-23T00:00:00 status partial_touch; 5m SHORT 7537.00-7539.25 parent 2026-07-22T22:15:00 confirmed 2026-07-22T22:20:00 status open_untouched

## Review Order
- Primary campaign to review first: LONG proof 2026-07-24T13:00:00 from 15M parent 2026-07-24T11:15:00 confirmed 2026-07-24T11:30:00.
- Defended-area management context: 5m LONG 7473.75-7475.25 is a callout before/near T1, not an issue by itself.
- Later rows: 5 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. LONG 15M FVG 7466.00-7472.50 parent 2026-07-24T11:15:00 confirmed 2026-07-24T11:30:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-24T11:15:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-24T14:15:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-24T12:50:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-24T12:55:00, 2026-07-24T13:25:00, 2026-07-24T13:30:00, 2026-07-24T13:50:00, 2026-07-24T13:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-24T13:00:00. | PASS entry_stop_risk_contract: Entry 7473.50, protected 5M stop 7432.75, risk 40.75 pts. | PASS tactical_targets_from_actual_risk: T1 7534.75 and T2 7555.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7473.75.
- Parent displacement: yes
- Parent displacement candle: 2026-07-24T11:15:00
- Parent failure: 2026-07-24T14:15:00
- First 5M return: 2026-07-24T12:50:00
- 5M wick defense: 2026-07-24T12:55:00, 2026-07-24T13:25:00, 2026-07-24T13:30:00, 2026-07-24T13:50:00, 2026-07-24T13:55:00
- Proof: 2026-07-24T13:00:00
- Entry/stop/risk: 7473.50 / 7432.75 / 40.75 pts
- T1/T2: 7534.75 / 7555.00
- Nearest liquidity: nearest prior high liquidity 7473.75
- Defended-area / obstacle management callout before or near T1: 5m LONG 7473.75-7475.25 parent 2026-06-11T19:45:00 confirmed 2026-06-11T19:50:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-24T13:05:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7466.00-7472.50 parent 2026-07-24T11:15:00 confirmed 2026-07-24T11:30:00 defended_on_15m defended 2026-07-24T13:00:00 failed 2026-07-24T14:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7466.00-7472.50 parent 2026-07-24T11:15:00 confirmed 2026-07-24T11:30:00 defended_on_15m defended 2026-07-24T13:00:00 failed 2026-07-24T14:15:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-24T12:50:00; wick 2026-07-24T12:55:00; proof 2026-07-24T13:00:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7492.00 (prior 5M swing high liquidity from 2026-07-24T11:45:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 5m LONG 7465.50-7472.50 parent 2026-07-24T11:15:00 confirmed 2026-07-24T11:20:00 status partial_touch; 15m LONG 7466.00-7472.50 parent 2026-07-24T11:15:00 confirmed 2026-07-24T11:30:00 status partial_touch; 60m LONG 7466.00-7466.25 parent 2026-07-24T12:00:00 confirmed 2026-07-24T13:00:00 status open_untouched; 5m LONG 7452.00-7461.25 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:05:00 status partial_touch; 15m LONG 7451.00-7454.75 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:15:00 status open_untouched; 5m LONG 7444.25-7448.75 parent 2026-07-24T10:55:00 confirmed 2026-07-24T11:00:00 status open_untouched; 5m LONG 7442.50-7444.00 parent 2026-07-24T10:50:00 confirmed 2026-07-24T10:55:00 status open_untouched; 5m LONG 7430.75-7442.00 parent 2026-07-23T16:00:00 confirmed 2026-07-23T16:05:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7473.75-7475.25 parent 2026-06-11T19:45:00 confirmed 2026-06-11T19:50:00 status failed_inverted; 5m LONG 7473.75-7475.25 parent 2026-07-08T06:20:00 confirmed 2026-07-08T06:25:00 status failed_inverted; 5m SHORT 7473.75-7475.50 parent 2026-07-23T08:40:00 confirmed 2026-07-23T08:45:00 status failed_inverted; 15m LONG 7473.75-7476.00 parent 2026-06-07T22:45:00 confirmed 2026-06-07T23:00:00 status failed_inverted; 5m LONG 7474.00-7476.75 parent 2026-05-12T03:20:00 confirmed 2026-05-12T03:25:00 status failed_inverted; 5m SHORT 7474.00-7489.50 parent 2026-06-09T10:45:00 confirmed 2026-06-09T10:50:00 status failed_inverted; 15m SHORT 7474.00-7475.50 parent 2026-05-12T03:00:00 confirmed 2026-05-12T03:15:00 status failed_inverted; 15m LONG 7474.00-7476.00 parent 2026-05-12T03:30:00 confirmed 2026-05-12T03:45:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7477.50-7481.25 parent 2026-07-24T12:45:00 confirmed 2026-07-24T12:50:00 status open_untouched; 15m SHORT 7477.50-7487.50 parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00 status open_untouched; 5m SHORT 7482.00-7482.75 parent 2026-07-24T12:40:00 confirmed 2026-07-24T12:45:00 status open_untouched; 5m SHORT 7486.75-7491.00 parent 2026-07-24T12:35:00 confirmed 2026-07-24T12:40:00 status open_untouched; 60m SHORT 7501.50-7508.50 parent 2026-07-23T08:00:00 confirmed 2026-07-23T09:00:00 status open_untouched; 15m SHORT 7505.75-7510.00 parent 2026-07-23T07:30:00 confirmed 2026-07-23T07:45:00 status open_untouched; 5m SHORT 7508.25-7511.75 parent 2026-07-23T07:25:00 confirmed 2026-07-23T07:30:00 status open_untouched; 5m SHORT 7514.75-7519.50 parent 2026-07-23T07:05:00 confirmed 2026-07-23T07:10:00 status partial_touch
- Objective ladder: open_fvg 7481.25 not reached (5m SHORT open FVG open_untouched parent 2026-07-24T12:45:00 confirmed 2026-07-24T12:50:00); open_fvg 7482.75 not reached (5m SHORT open FVG open_untouched parent 2026-07-24T12:40:00 confirmed 2026-07-24T12:45:00); open_fvg 7487.50 not reached (15m SHORT open FVG open_untouched parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00); open_fvg 7491.00 not reached (5m SHORT open FVG open_untouched parent 2026-07-24T12:35:00 confirmed 2026-07-24T12:40:00); liquidity 7492.00 not reached (prior 5M swing high liquidity from 2026-07-24T11:45:00); liquidity 7495.25 not reached (prior 5M swing high liquidity from 2026-07-24T12:30:00); liquidity 7496.50 not reached (prior 5M swing high liquidity from 2026-07-24T12:15:00); session_extreme 7496.50 not reached (RTH high liquidity before proof); open_fvg 7508.50 not reached (60m SHORT open FVG open_untouched parent 2026-07-23T08:00:00 confirmed 2026-07-23T09:00:00); open_fvg 7510.00 not reached (15m SHORT open FVG open_untouched parent 2026-07-23T07:30:00 confirmed 2026-07-23T07:45:00); open_fvg 7511.75 not reached (5m SHORT open FVG open_untouched parent 2026-07-23T07:25:00 confirmed 2026-07-23T07:30:00); open_fvg 7519.50 not reached (5m SHORT open FVG partial_touch parent 2026-07-23T07:05:00 confirmed 2026-07-23T07:10:00); tactical 7534.75 not reached (T1 1.5R); tactical 7555.00 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-07-24T13:00:00 from 7466.00-7472.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7473.75-7475.25 with reaction obstacle_defended_management_callout. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-24T15:25:00, one MES $-203.75
- Managed outcome: Stop at 2026-07-24T15:25:00, exit 7432.75, one MES $-203.75
- Reasons: Defended-first continuation precedence: LONG 5M defense proof completed at 2026-07-24T13:00:00 before later same-zone failure/reversal read at 2026-07-24T14:15:00. Review the defended continuation before labeling this zone as failure/reversal.

### 2. SHORT 15M FVG 7477.50-7487.50 parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-24T12:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-24T13:30:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-24T13:40:00. | PASS entry_stop_risk_contract: Entry 7474.25, protected 5M stop 7495.25, risk 21.00 pts. | PASS tactical_targets_from_actual_risk: T1 7442.75 and T2 7432.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7474.00.
- Parent displacement: yes
- Parent displacement candle: 2026-07-24T12:45:00
- Parent failure: not found
- First 5M return: 2026-07-24T13:30:00
- 5M wick defense: none
- Proof: 2026-07-24T13:40:00
- Entry/stop/risk: 7474.25 / 7495.25 / 21.00 pts
- T1/T2: 7442.75 / 7432.25
- Nearest liquidity: nearest prior low liquidity 7474.00
- Defended-area / obstacle management callout before or near T1: 60m LONG 7466.00-7466.25 parent 2026-07-24T12:00:00 confirmed 2026-07-24T13:00:00 status open_untouched
- Defended-area reaction: obstacle_reached_then_continued at 2026-07-24T14:15:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7477.50-7487.50 parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00 defended_on_15m defended 2026-07-24T13:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7477.50-7487.50 parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00 defended_on_15m defended 2026-07-24T13:30:00
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-07-24T13:30:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: 7466.25 (prior 5M swing low liquidity from 2026-07-24T12:55:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 60m LONG 7466.00-7466.25 parent 2026-07-24T12:00:00 confirmed 2026-07-24T13:00:00 status open_untouched; 5m LONG 7452.00-7461.25 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:05:00 status partial_touch; 15m LONG 7451.00-7454.75 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:15:00 status open_untouched; 5m LONG 7444.25-7448.75 parent 2026-07-24T10:55:00 confirmed 2026-07-24T11:00:00 status open_untouched; 5m LONG 7442.50-7444.00 parent 2026-07-24T10:50:00 confirmed 2026-07-24T10:55:00 status open_untouched; 5m LONG 7430.75-7442.00 parent 2026-07-23T16:00:00 confirmed 2026-07-23T16:05:00 status partial_touch; 5m LONG 7425.75-7429.25 parent 2026-07-23T15:55:00 confirmed 2026-07-23T16:00:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7474.50-7475.00 parent 2026-05-11T08:45:00 confirmed 2026-05-11T08:50:00 status failed_inverted; 5m LONG 7474.50-7475.75 parent 2026-05-18T23:10:00 confirmed 2026-05-18T23:15:00 status failed_inverted; 5m SHORT 7474.50-7474.75 parent 2026-06-11T19:00:00 confirmed 2026-06-11T19:05:00 status failed_inverted; 5m SHORT 7474.75-7475.25 parent 2026-05-11T08:10:00 confirmed 2026-05-11T08:15:00 status failed_inverted; 5m SHORT 7474.75-7476.75 parent 2026-05-12T02:55:00 confirmed 2026-05-12T03:00:00 status failed_inverted; 5m LONG 7474.75-7476.75 parent 2026-05-18T04:55:00 confirmed 2026-05-18T05:00:00 status failed_inverted; 5m LONG 7474.75-7475.50 parent 2026-05-19T02:40:00 confirmed 2026-05-19T02:45:00 status failed_inverted; 5m SHORT 7474.75-7475.00 parent 2026-06-11T21:00:00 confirmed 2026-06-11T21:05:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7477.50-7481.25 parent 2026-07-24T12:45:00 confirmed 2026-07-24T12:50:00 status partial_touch; 15m SHORT 7477.50-7487.50 parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00 status partial_touch; 5m SHORT 7482.00-7482.75 parent 2026-07-24T12:40:00 confirmed 2026-07-24T12:45:00 status open_untouched; 5m SHORT 7486.75-7491.00 parent 2026-07-24T12:35:00 confirmed 2026-07-24T12:40:00 status open_untouched; 60m SHORT 7501.50-7508.50 parent 2026-07-23T08:00:00 confirmed 2026-07-23T09:00:00 status open_untouched; 15m SHORT 7505.75-7510.00 parent 2026-07-23T07:30:00 confirmed 2026-07-23T07:45:00 status open_untouched; 5m SHORT 7508.25-7511.75 parent 2026-07-23T07:25:00 confirmed 2026-07-23T07:30:00 status open_untouched; 5m SHORT 7514.75-7519.50 parent 2026-07-23T07:05:00 confirmed 2026-07-23T07:10:00 status partial_touch
- Objective ladder: liquidity 7466.25 reached 2026-07-24T14:15:00 (prior 5M swing low liquidity from 2026-07-24T12:55:00); open_fvg 7466.00 reached 2026-07-24T14:15:00 (60m LONG open FVG open_untouched parent 2026-07-24T12:00:00 confirmed 2026-07-24T13:00:00); liquidity 7461.25 reached 2026-07-24T14:20:00 (prior 5M swing low liquidity from 2026-07-24T13:15:00); liquidity 7454.75 reached 2026-07-24T14:30:00 (prior 5M swing low liquidity from 2026-07-24T11:15:00); open_fvg 7452.00 reached 2026-07-24T14:30:00 (5m LONG open FVG partial_touch parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:05:00); open_fvg 7451.00 reached 2026-07-24T14:30:00 (15m LONG open FVG open_untouched parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:15:00); open_fvg 7444.25 reached 2026-07-24T14:35:00 (5m LONG open FVG open_untouched parent 2026-07-24T10:55:00 confirmed 2026-07-24T11:00:00); tactical 7442.75 reached 2026-07-24T14:35:00 (T1 1.5R); open_fvg 7442.50 reached 2026-07-24T14:35:00 (5m LONG open FVG open_untouched parent 2026-07-24T10:50:00 confirmed 2026-07-24T10:55:00); liquidity 7442.25 reached 2026-07-24T14:35:00 (prior 5M swing low liquidity from 2026-07-24T09:35:00); liquidity 7432.75 reached 2026-07-24T15:25:00 (prior 5M swing low liquidity from 2026-07-24T10:50:00); tactical 7432.25 reached 2026-07-24T15:25:00 (T2 2.0R); liquidity 7431.25 not reached (prior 5M swing low liquidity from 2026-07-24T10:00:00); session_extreme 7431.25 not reached (RTH low liquidity before proof)
- Story: SHORT proof completed at 2026-07-24T13:40:00 from 7477.50-7487.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 60m 7466.00-7466.25 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7466.25 liquidity, 7466.00 open_fvg, 7461.25 liquidity, 7454.75 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-24T14:35:00, one MES +$157.50
- Managed outcome: LQ1 at 2026-07-24T14:15:00, exit 7466.25, one MES +$40.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 3. SHORT 15M FVG 7475.00-7475.50 parent 2026-07-24T13:00:00 confirmed 2026-07-24T13:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-24T12:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-24T13:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-24T13:30:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-24T13:40:00. | PASS entry_stop_risk_contract: Entry 7474.25, protected 5M stop 7476.75, risk 2.50 pts. | PASS tactical_targets_from_actual_risk: T1 7470.50 and T2 7469.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7474.00.
- Parent displacement: yes
- Parent displacement candle: 2026-07-24T12:45:00
- Parent failure: 2026-07-24T13:30:00
- First 5M return: 2026-07-24T13:30:00
- 5M wick defense: none
- Proof: 2026-07-24T13:40:00
- Entry/stop/risk: 7474.25 / 7476.75 / 2.50 pts
- T1/T2: 7470.50 / 7469.25
- Nearest liquidity: nearest prior low liquidity 7474.00
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7477.50-7487.50 parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00 defended_on_15m defended 2026-07-24T13:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7477.50-7487.50 parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00 defended_on_15m defended 2026-07-24T13:30:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-07-24T13:30:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-07-24T13:30:00.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 60m LONG 7466.00-7466.25 parent 2026-07-24T12:00:00 confirmed 2026-07-24T13:00:00 status open_untouched; 5m LONG 7452.00-7461.25 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:05:00 status partial_touch; 15m LONG 7451.00-7454.75 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:15:00 status open_untouched; 5m LONG 7444.25-7448.75 parent 2026-07-24T10:55:00 confirmed 2026-07-24T11:00:00 status open_untouched; 5m LONG 7442.50-7444.00 parent 2026-07-24T10:50:00 confirmed 2026-07-24T10:55:00 status open_untouched; 5m LONG 7430.75-7442.00 parent 2026-07-23T16:00:00 confirmed 2026-07-23T16:05:00 status partial_touch; 5m LONG 7425.75-7429.25 parent 2026-07-23T15:55:00 confirmed 2026-07-23T16:00:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7474.50-7475.00 parent 2026-05-11T08:45:00 confirmed 2026-05-11T08:50:00 status failed_inverted; 5m LONG 7474.50-7475.75 parent 2026-05-18T23:10:00 confirmed 2026-05-18T23:15:00 status failed_inverted; 5m SHORT 7474.50-7474.75 parent 2026-06-11T19:00:00 confirmed 2026-06-11T19:05:00 status failed_inverted; 5m SHORT 7474.75-7475.25 parent 2026-05-11T08:10:00 confirmed 2026-05-11T08:15:00 status failed_inverted; 5m SHORT 7474.75-7476.75 parent 2026-05-12T02:55:00 confirmed 2026-05-12T03:00:00 status failed_inverted; 5m LONG 7474.75-7476.75 parent 2026-05-18T04:55:00 confirmed 2026-05-18T05:00:00 status failed_inverted; 5m LONG 7474.75-7475.50 parent 2026-05-19T02:40:00 confirmed 2026-05-19T02:45:00 status failed_inverted; 5m SHORT 7474.75-7475.00 parent 2026-06-11T21:00:00 confirmed 2026-06-11T21:05:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7477.50-7481.25 parent 2026-07-24T12:45:00 confirmed 2026-07-24T12:50:00 status partial_touch; 15m SHORT 7477.50-7487.50 parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00 status partial_touch; 5m SHORT 7482.00-7482.75 parent 2026-07-24T12:40:00 confirmed 2026-07-24T12:45:00 status open_untouched; 5m SHORT 7486.75-7491.00 parent 2026-07-24T12:35:00 confirmed 2026-07-24T12:40:00 status open_untouched; 60m SHORT 7501.50-7508.50 parent 2026-07-23T08:00:00 confirmed 2026-07-23T09:00:00 status open_untouched; 15m SHORT 7505.75-7510.00 parent 2026-07-23T07:30:00 confirmed 2026-07-23T07:45:00 status open_untouched; 5m SHORT 7508.25-7511.75 parent 2026-07-23T07:25:00 confirmed 2026-07-23T07:30:00 status open_untouched; 5m SHORT 7514.75-7519.50 parent 2026-07-23T07:05:00 confirmed 2026-07-23T07:10:00 status partial_touch
- Objective ladder: tactical 7470.50 reached 2026-07-24T13:45:00 (T1 1.5R); tactical 7469.25 reached 2026-07-24T13:50:00 (T2 2.0R); liquidity 7466.25 reached 2026-07-24T14:15:00 (prior 5M swing low liquidity from 2026-07-24T12:55:00); open_fvg 7466.00 reached 2026-07-24T14:15:00 (60m LONG open FVG open_untouched parent 2026-07-24T12:00:00 confirmed 2026-07-24T13:00:00); liquidity 7461.25 reached 2026-07-24T14:20:00 (prior 5M swing low liquidity from 2026-07-24T13:15:00); liquidity 7454.75 reached 2026-07-24T14:30:00 (prior 5M swing low liquidity from 2026-07-24T11:15:00); open_fvg 7452.00 reached 2026-07-24T14:30:00 (5m LONG open FVG partial_touch parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:05:00); open_fvg 7451.00 reached 2026-07-24T14:30:00 (15m LONG open FVG open_untouched parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:15:00); open_fvg 7444.25 reached 2026-07-24T14:35:00 (5m LONG open FVG open_untouched parent 2026-07-24T10:55:00 confirmed 2026-07-24T11:00:00); open_fvg 7442.50 reached 2026-07-24T14:35:00 (5m LONG open FVG open_untouched parent 2026-07-24T10:50:00 confirmed 2026-07-24T10:55:00); liquidity 7442.25 reached 2026-07-24T14:35:00 (prior 5M swing low liquidity from 2026-07-24T09:35:00); liquidity 7432.75 reached 2026-07-24T15:25:00 (prior 5M swing low liquidity from 2026-07-24T10:50:00); liquidity 7431.25 not reached (prior 5M swing low liquidity from 2026-07-24T10:00:00); session_extreme 7431.25 not reached (RTH low liquidity before proof)
- Story: SHORT proof completed at 2026-07-24T13:40:00 from 7475.00-7475.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. No opposing FVG obstacle was loaded before T1. Structural objectives reached after proof: 7466.25 liquidity, 7466.00 open_fvg, 7461.25 liquidity, 7454.75 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-07-24T13:45:00, one MES +$18.75
- Managed outcome: T1 at 2026-07-24T13:45:00, exit 7470.50, one MES +$18.75
- Reasons: No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 4. SHORT 15M FVG 7465.75-7468.25 parent 2026-07-24T14:15:00 confirmed 2026-07-24T14:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-24T14:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-24T14:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7477.50-7487.50 parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00 defended_on_15m defended 2026-07-24T13:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7477.50-7487.50 parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00 defended_on_15m defended 2026-07-24T13:30:00
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

### 5. SHORT 15M FVG 7450.75-7463.75 parent 2026-07-24T14:30:00 confirmed 2026-07-24T14:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-24T14:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-24T14:30:00
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
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7477.50-7487.50 parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00 defended_on_15m defended 2026-07-24T13:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7477.50-7487.50 parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00 defended_on_15m defended 2026-07-24T13:30:00
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

### 6. SHORT 15M FVG 7446.25-7448.75 parent 2026-07-24T14:45:00 confirmed 2026-07-24T15:00:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-24T14:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-24T15:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-24T15:00:00, 2026-07-24T15:05:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-24T15:00:00. | PASS entry_stop_risk_contract: Entry 7443.25, protected 5M stop 7472.00, risk 28.75 pts. | PASS tactical_targets_from_actual_risk: T1 7400.25 and T2 7385.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7443.00.
- Parent displacement: yes
- Parent displacement candle: 2026-07-24T14:45:00
- Parent failure: not found
- First 5M return: 2026-07-24T15:00:00
- 5M wick defense: 2026-07-24T15:00:00, 2026-07-24T15:05:00
- Proof: 2026-07-24T15:00:00
- Entry/stop/risk: 7443.25 / 7472.00 / 28.75 pts
- T1/T2: 7400.25 / 7385.75
- Nearest liquidity: nearest prior low liquidity 7443.00
- Defended-area / obstacle management callout before or near T1: 5m LONG 7430.75-7442.00 parent 2026-07-23T16:00:00 confirmed 2026-07-23T16:05:00 status partial_touch
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-24T15:05:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7477.50-7487.50 parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00 defended_on_15m defended 2026-07-24T13:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7477.50-7487.50 parent 2026-07-24T12:45:00 confirmed 2026-07-24T13:00:00 defended_on_15m defended 2026-07-24T13:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-24T15:00:00; wick 2026-07-24T15:00:00; proof 2026-07-24T15:00:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7435.25 (prior 5M swing low liquidity from 2026-07-24T14:45:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 5m LONG 7430.75-7442.00 parent 2026-07-23T16:00:00 confirmed 2026-07-23T16:05:00 status partial_touch; 5m LONG 7425.75-7429.25 parent 2026-07-23T15:55:00 confirmed 2026-07-23T16:00:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched; 5m LONG 7261.00-7265.50 parent 2026-04-30T13:05:00 confirmed 2026-04-30T13:10:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7443.50-7445.75 parent 2026-05-19T12:30:00 confirmed 2026-05-19T12:35:00 status failed_inverted; 5m SHORT 7443.50-7444.25 parent 2026-06-23T08:20:00 confirmed 2026-06-23T08:25:00 status failed_inverted; 5m LONG 7443.50-7444.00 parent 2026-07-23T12:10:00 confirmed 2026-07-23T12:15:00 status failed_inverted; 5m LONG 7443.50-7443.75 parent 2026-07-24T01:05:00 confirmed 2026-07-24T01:10:00 status failed_inverted; 5m LONG 7443.50-7446.00 parent 2026-07-24T03:05:00 confirmed 2026-07-24T03:10:00 status failed_inverted; 15m LONG 7443.50-7444.00 parent 2026-07-24T01:15:00 confirmed 2026-07-24T01:30:00 status failed_inverted; 15m LONG 7443.50-7454.00 parent 2026-07-24T03:15:00 confirmed 2026-07-24T03:30:00 status failed_inverted; 60m LONG 7443.50-7455.50 parent 2026-05-12T14:00:00 confirmed 2026-05-12T15:00:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7445.25-7448.75 parent 2026-07-24T14:35:00 confirmed 2026-07-24T14:40:00 status partial_touch; 15m SHORT 7446.25-7448.75 parent 2026-07-24T14:45:00 confirmed 2026-07-24T15:00:00 status open_untouched; 5m SHORT 7450.75-7456.25 parent 2026-07-24T14:30:00 confirmed 2026-07-24T14:35:00 status open_untouched; 15m SHORT 7450.75-7463.75 parent 2026-07-24T14:30:00 confirmed 2026-07-24T14:45:00 status open_untouched; 5m SHORT 7457.75-7460.25 parent 2026-07-24T14:25:00 confirmed 2026-07-24T14:30:00 status open_untouched; 5m SHORT 7461.00-7463.75 parent 2026-07-24T14:20:00 confirmed 2026-07-24T14:25:00 status open_untouched; 5m SHORT 7465.75-7466.75 parent 2026-07-24T14:15:00 confirmed 2026-07-24T14:20:00 status open_untouched; 15m SHORT 7465.75-7468.25 parent 2026-07-24T14:15:00 confirmed 2026-07-24T14:30:00 status open_untouched
- Objective ladder: liquidity 7442.25 reached 2026-07-24T15:05:00 (prior 5M swing low liquidity from 2026-07-24T09:35:00); liquidity 7435.25 reached 2026-07-24T15:10:00 (prior 5M swing low liquidity from 2026-07-24T14:45:00); liquidity 7432.75 reached 2026-07-24T15:25:00 (prior 5M swing low liquidity from 2026-07-24T10:50:00); liquidity 7431.25 not reached (prior 5M swing low liquidity from 2026-07-24T10:00:00); session_extreme 7431.25 not reached (RTH low liquidity before proof); open_fvg 7430.75 not reached (5m LONG open FVG partial_touch parent 2026-07-23T16:00:00 confirmed 2026-07-23T16:05:00); open_fvg 7425.75 not reached (5m LONG open FVG open_untouched parent 2026-07-23T15:55:00 confirmed 2026-07-23T16:00:00); open_fvg 7404.75 not reached (5m LONG open FVG partial_touch parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00); tactical 7400.25 not reached (T1 1.5R); tactical 7385.75 not reached (T2 2.0R); open_fvg 7355.50 not reached (15m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00); open_fvg 7345.25 not reached (5m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00); open_fvg 7321.00 not reached (5m LONG open FVG partial_touch parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00); open_fvg 7318.25 not reached (5m LONG open FVG open_untouched parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00)
- Story: SHORT proof completed at 2026-07-24T15:00:00 from 7446.25-7448.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7430.75-7442.00 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7442.25 liquidity, 7435.25 liquidity, 7432.75 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-07-24T17:00:00, one MES $-3.75
- Managed outcome: LQ1 at 2026-07-24T15:10:00, exit 7435.25, one MES +$40.00
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-07-24T15:00:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.
