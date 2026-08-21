# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-07-24 / morning (2026-07-24T09:15:00 to 2026-07-24T12:00:00)
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
- Open below: 60m LONG 7447.50-7449.25 parent 2026-07-24T04:00:00 confirmed 2026-07-24T05:00:00 status partial_touch; 5m LONG 7443.50-7446.00 parent 2026-07-24T03:05:00 confirmed 2026-07-24T03:10:00 status open_untouched; 5m LONG 7430.75-7442.00 parent 2026-07-23T16:00:00 confirmed 2026-07-23T16:05:00 status partial_touch; 5m LONG 7439.25-7442.00 parent 2026-07-24T03:00:00 confirmed 2026-07-24T03:05:00 status open_untouched; 5m LONG 7425.75-7429.25 parent 2026-07-23T15:55:00 confirmed 2026-07-23T16:00:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch; 5m LONG 7318.25-7318.50 parent 2026-06-10T20:15:00 confirmed 2026-06-10T20:20:00 status open_untouched
- Failed above: 5m SHORT 7450.25-7452.25 parent 2026-05-18T02:00:00 confirmed 2026-05-18T02:05:00 status failed_inverted; 5m SHORT 7450.25-7451.00 parent 2026-06-29T02:50:00 confirmed 2026-06-29T02:55:00 status failed_inverted; 5m LONG 7450.50-7451.00 parent 2026-05-06T21:40:00 confirmed 2026-05-06T21:45:00 status failed_inverted; 5m LONG 7450.50-7452.75 parent 2026-05-17T22:15:00 confirmed 2026-05-17T22:20:00 status failed_inverted; 5m SHORT 7450.50-7451.50 parent 2026-05-18T01:15:00 confirmed 2026-05-18T01:20:00 status failed_inverted; 5m LONG 7450.50-7452.00 parent 2026-06-12T03:45:00 confirmed 2026-06-12T03:50:00 status failed_inverted; 5m LONG 7450.50-7452.00 parent 2026-06-24T06:35:00 confirmed 2026-06-24T06:40:00 status failed_inverted; 5m SHORT 7450.50-7452.25 parent 2026-06-24T06:55:00 confirmed 2026-06-24T07:00:00 status failed_inverted; 5m LONG 7450.75-7451.25 parent 2026-05-18T00:10:00 confirmed 2026-05-18T00:15:00 status failed_inverted; 5m SHORT 7450.75-7453.75 parent 2026-06-29T10:05:00 confirmed 2026-06-29T10:10:00 status failed_inverted
- Open above: 5m SHORT 7451.75-7452.50 parent 2026-07-24T09:00:00 confirmed 2026-07-24T09:05:00 status open_untouched; 15m SHORT 7451.75-7455.00 parent 2026-07-24T09:00:00 confirmed 2026-07-24T09:15:00 status open_untouched; 5m SHORT 7456.50-7458.75 parent 2026-07-24T08:45:00 confirmed 2026-07-24T08:50:00 status open_untouched; 15m SHORT 7456.50-7460.50 parent 2026-07-24T08:45:00 confirmed 2026-07-24T09:00:00 status open_untouched; 120m SHORT 7469.75-7490.00 parent 2026-07-23T10:00:00 confirmed 2026-07-23T12:00:00 status open_untouched; 240m SHORT 7469.75-7495.25 parent 2026-07-23T10:00:00 confirmed 2026-07-23T14:00:00 status open_untouched; 5m SHORT 7470.00-7474.25 parent 2026-07-23T09:50:00 confirmed 2026-07-23T09:55:00 status partial_touch; 15m SHORT 7482.75-7492.25 parent 2026-07-23T08:30:00 confirmed 2026-07-23T08:45:00 status partial_touch; 5m SHORT 7484.25-7486.75 parent 2026-07-23T08:25:00 confirmed 2026-07-23T08:30:00 status partial_touch; 60m SHORT 7486.50-7490.00 parent 2026-07-23T09:00:00 confirmed 2026-07-23T10:00:00 status open_untouched

## Review Order
- Primary campaign to review first: SHORT proof 2026-07-24T09:40:00 from 15M parent 2026-07-24T09:00:00 confirmed 2026-07-24T09:15:00.
- Defended-area management context: 60m LONG 7447.50-7449.25 is a callout before/near T1, not an issue by itself.
- Later rows: 2 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7451.75-7455.00 parent 2026-07-24T09:00:00 confirmed 2026-07-24T09:15:00
- Verdict: valid_trace_candidate
- Continuation read: defended_area_management_callout
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-24T09:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-07-24T11:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-24T09:20:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-07-24T09:40:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-24T09:40:00. | PASS entry_stop_risk_contract: Entry 7449.75, protected 5M stop 7466.50, risk 16.75 pts. | PASS tactical_targets_from_actual_risk: T1 7424.75 and T2 7416.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7449.50.
- Parent displacement: yes
- Parent displacement candle: 2026-07-24T09:00:00
- Parent failure: 2026-07-24T11:00:00
- First 5M return: 2026-07-24T09:20:00
- 5M wick defense: 2026-07-24T09:40:00
- Proof: 2026-07-24T09:40:00
- Entry/stop/risk: 7449.75 / 7466.50 / 16.75 pts
- T1/T2: 7424.75 / 7416.25
- Nearest liquidity: nearest prior low liquidity 7449.50
- Defended-area / obstacle management callout before or near T1: 60m LONG 7447.50-7449.25 parent 2026-07-24T04:00:00 confirmed 2026-07-24T05:00:00 status partial_touch
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-24T09:45:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7451.75-7455.00 parent 2026-07-24T09:00:00 confirmed 2026-07-24T09:15:00 defended_on_15m defended 2026-07-24T09:30:00 failed 2026-07-24T11:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7451.75-7455.00 parent 2026-07-24T09:00:00 confirmed 2026-07-24T09:15:00 defended_on_15m defended 2026-07-24T09:30:00 failed 2026-07-24T11:00:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-07-24T09:20:00; wick 2026-07-24T09:40:00; proof 2026-07-24T09:40:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7442.25 (RTH low liquidity before proof)
- Balanced path to liquidity: not_balanced_path_to_liquidity - A defended FVG/HTF obstacle sat before or near T1, so it must be reported as management context before treating liquidity as the first clean objective.
- Open FVGs below at proof: 60m LONG 7447.50-7449.25 parent 2026-07-24T04:00:00 confirmed 2026-07-24T05:00:00 status partial_touch; 5m LONG 7430.75-7442.00 parent 2026-07-23T16:00:00 confirmed 2026-07-23T16:05:00 status partial_touch; 5m LONG 7439.25-7442.00 parent 2026-07-24T03:00:00 confirmed 2026-07-24T03:05:00 status open_untouched; 5m LONG 7425.75-7429.25 parent 2026-07-23T15:55:00 confirmed 2026-07-23T16:00:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch; 5m LONG 7345.25-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00 status partial_touch; 15m LONG 7355.50-7405.50 parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00 status partial_touch; 5m LONG 7321.00-7333.00 parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7450.00-7450.50 parent 2026-05-06T16:50:00 confirmed 2026-05-06T16:55:00 status failed_inverted; 5m SHORT 7450.00-7451.00 parent 2026-06-24T13:10:00 confirmed 2026-06-24T13:15:00 status failed_inverted; 5m LONG 7450.00-7451.00 parent 2026-06-29T01:45:00 confirmed 2026-06-29T01:50:00 status failed_inverted; 15m LONG 7450.00-7452.00 parent 2026-05-06T21:45:00 confirmed 2026-05-06T22:00:00 status failed_inverted; 15m LONG 7450.00-7454.75 parent 2026-05-19T12:45:00 confirmed 2026-05-19T13:00:00 status failed_inverted; 15m SHORT 7450.00-7452.25 parent 2026-07-23T18:15:00 confirmed 2026-07-23T18:30:00 status failed_inverted; 120m LONG 7450.00-7453.75 parent 2026-06-11T16:00:00 confirmed 2026-06-11T17:00:00 status failed_inverted; 240m LONG 7450.00-7458.50 parent 2026-06-11T16:00:00 confirmed 2026-06-11T20:00:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7451.75-7455.00 parent 2026-07-24T09:00:00 confirmed 2026-07-24T09:15:00 status partial_touch; 5m SHORT 7456.50-7458.75 parent 2026-07-24T08:45:00 confirmed 2026-07-24T08:50:00 status open_untouched; 15m SHORT 7456.50-7460.50 parent 2026-07-24T08:45:00 confirmed 2026-07-24T09:00:00 status open_untouched; 120m SHORT 7469.75-7490.00 parent 2026-07-23T10:00:00 confirmed 2026-07-23T12:00:00 status open_untouched; 240m SHORT 7469.75-7495.25 parent 2026-07-23T10:00:00 confirmed 2026-07-23T14:00:00 status open_untouched; 5m SHORT 7470.00-7474.25 parent 2026-07-23T09:50:00 confirmed 2026-07-23T09:55:00 status partial_touch; 15m SHORT 7482.75-7492.25 parent 2026-07-23T08:30:00 confirmed 2026-07-23T08:45:00 status partial_touch; 5m SHORT 7484.25-7486.75 parent 2026-07-23T08:25:00 confirmed 2026-07-23T08:30:00 status partial_touch
- Objective ladder: open_fvg 7447.50 reached 2026-07-24T09:45:00 (60m LONG open FVG partial_touch parent 2026-07-24T04:00:00 confirmed 2026-07-24T05:00:00); session_extreme 7442.25 reached 2026-07-24T09:55:00 (RTH low liquidity before proof); open_fvg 7439.25 reached 2026-07-24T09:55:00 (5m LONG open FVG open_untouched parent 2026-07-24T03:00:00 confirmed 2026-07-24T03:05:00); open_fvg 7430.75 not reached (5m LONG open FVG partial_touch parent 2026-07-23T16:00:00 confirmed 2026-07-23T16:05:00); open_fvg 7425.75 not reached (5m LONG open FVG open_untouched parent 2026-07-23T15:55:00 confirmed 2026-07-23T16:00:00); tactical 7424.75 not reached (T1 1.5R); tactical 7416.25 not reached (T2 2.0R); open_fvg 7404.75 not reached (5m LONG open FVG partial_touch parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00); open_fvg 7355.50 not reached (15m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:45:00); open_fvg 7345.25 not reached (5m LONG open FVG partial_touch parent 2026-06-11T13:30:00 confirmed 2026-06-11T13:35:00); open_fvg 7321.00 not reached (5m LONG open FVG partial_touch parent 2026-06-10T20:20:00 confirmed 2026-06-10T20:25:00)
- Story: SHORT proof completed at 2026-07-24T09:40:00 from 7451.75-7455.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 60m 7447.50-7449.25 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7447.50 open_fvg, 7442.25 session_extreme, 7439.25 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-24T11:05:00, one MES $-83.75
- Managed outcome: LQ1 at 2026-07-24T09:55:00, exit 7442.25, one MES +$37.50
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-07-24T09:40:00 before later same-zone failure/reversal read at 2026-07-24T11:00:00. Review the defended continuation before labeling this zone as failure/reversal.

### 2. LONG 15M FVG 7451.00-7454.75 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-24T11:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-07-24T11:15:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-07-24T11:20:00. | PASS entry_stop_risk_contract: Entry 7474.25, protected 5M stop 7432.75, risk 41.50 pts. | PASS tactical_targets_from_actual_risk: T1 7536.50 and T2 7557.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7474.50.
- Parent displacement: yes
- Parent displacement candle: 2026-07-24T11:00:00
- Parent failure: not found
- First 5M return: 2026-07-24T11:15:00
- 5M wick defense: none
- Proof: 2026-07-24T11:20:00
- Entry/stop/risk: 7474.25 / 7432.75 / 41.50 pts
- T1/T2: 7536.50 / 7557.25
- Nearest liquidity: nearest prior high liquidity 7474.50
- Defended-area / obstacle management callout before or near T1: 5m SHORT 7474.50-7475.00 parent 2026-05-11T08:45:00 confirmed 2026-05-11T08:50:00 status failed_inverted
- Defended-area reaction: obstacle_defended_management_callout at 2026-07-24T11:25:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7451.00-7454.75 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7451.00-7454.75 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:15:00 untested_by_15m
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-07-24T11:15:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7465.50-7472.50 parent 2026-07-24T11:15:00 confirmed 2026-07-24T11:20:00 status open_untouched; 5m LONG 7452.00-7461.25 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:05:00 status partial_touch; 15m LONG 7451.00-7454.75 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:15:00 status open_untouched; 5m LONG 7444.25-7448.75 parent 2026-07-24T10:55:00 confirmed 2026-07-24T11:00:00 status open_untouched; 5m LONG 7442.50-7444.00 parent 2026-07-24T10:50:00 confirmed 2026-07-24T10:55:00 status open_untouched; 5m LONG 7430.75-7442.00 parent 2026-07-23T16:00:00 confirmed 2026-07-23T16:05:00 status partial_touch; 5m LONG 7425.75-7429.25 parent 2026-07-23T15:55:00 confirmed 2026-07-23T16:00:00 status open_untouched; 5m LONG 7404.75-7428.50 parent 2026-06-28T18:05:00 confirmed 2026-06-28T18:10:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7474.50-7475.00 parent 2026-05-11T08:45:00 confirmed 2026-05-11T08:50:00 status failed_inverted; 5m LONG 7474.50-7475.75 parent 2026-05-18T23:10:00 confirmed 2026-05-18T23:15:00 status failed_inverted; 5m SHORT 7474.50-7474.75 parent 2026-06-11T19:00:00 confirmed 2026-06-11T19:05:00 status failed_inverted; 5m SHORT 7474.75-7475.25 parent 2026-05-11T08:10:00 confirmed 2026-05-11T08:15:00 status failed_inverted; 5m SHORT 7474.75-7476.75 parent 2026-05-12T02:55:00 confirmed 2026-05-12T03:00:00 status failed_inverted; 5m LONG 7474.75-7476.75 parent 2026-05-18T04:55:00 confirmed 2026-05-18T05:00:00 status failed_inverted; 5m LONG 7474.75-7475.50 parent 2026-05-19T02:40:00 confirmed 2026-05-19T02:45:00 status failed_inverted; 5m SHORT 7474.75-7475.00 parent 2026-06-11T21:00:00 confirmed 2026-06-11T21:05:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7482.75-7492.25 parent 2026-07-23T08:30:00 confirmed 2026-07-23T08:45:00 status partial_touch; 60m SHORT 7486.50-7490.00 parent 2026-07-23T09:00:00 confirmed 2026-07-23T10:00:00 status open_untouched; 5m SHORT 7489.00-7492.25 parent 2026-07-23T08:20:00 confirmed 2026-07-23T08:25:00 status partial_touch; 60m SHORT 7501.50-7508.50 parent 2026-07-23T08:00:00 confirmed 2026-07-23T09:00:00 status open_untouched; 15m SHORT 7505.75-7510.00 parent 2026-07-23T07:30:00 confirmed 2026-07-23T07:45:00 status open_untouched; 5m SHORT 7508.25-7511.75 parent 2026-07-23T07:25:00 confirmed 2026-07-23T07:30:00 status open_untouched; 5m SHORT 7514.75-7519.50 parent 2026-07-23T07:05:00 confirmed 2026-07-23T07:10:00 status partial_touch; 15m SHORT 7516.00-7519.50 parent 2026-07-23T07:15:00 confirmed 2026-07-23T07:30:00 status open_untouched
- Objective ladder: session_extreme 7481.25 reached 2026-07-24T11:25:00 (RTH high liquidity before proof); open_fvg 7490.00 reached 2026-07-24T11:30:00 (60m SHORT open FVG open_untouched parent 2026-07-23T09:00:00 confirmed 2026-07-23T10:00:00); open_fvg 7492.25 not reached (15m SHORT open FVG partial_touch parent 2026-07-23T08:30:00 confirmed 2026-07-23T08:45:00); open_fvg 7492.25 not reached (5m SHORT open FVG partial_touch parent 2026-07-23T08:20:00 confirmed 2026-07-23T08:25:00); open_fvg 7508.50 not reached (60m SHORT open FVG open_untouched parent 2026-07-23T08:00:00 confirmed 2026-07-23T09:00:00); open_fvg 7510.00 not reached (15m SHORT open FVG open_untouched parent 2026-07-23T07:30:00 confirmed 2026-07-23T07:45:00); open_fvg 7511.75 not reached (5m SHORT open FVG open_untouched parent 2026-07-23T07:25:00 confirmed 2026-07-23T07:30:00); open_fvg 7519.50 not reached (5m SHORT open FVG partial_touch parent 2026-07-23T07:05:00 confirmed 2026-07-23T07:10:00); open_fvg 7519.50 not reached (15m SHORT open FVG open_untouched parent 2026-07-23T07:15:00 confirmed 2026-07-23T07:30:00); tactical 7536.50 not reached (T1 1.5R); tactical 7557.25 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-07-24T11:20:00 from 7451.00-7454.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 5m 7474.50-7475.00 with reaction obstacle_defended_management_callout. Structural objectives reached after proof: 7481.25 session_extreme, 7490.00 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-07-24T15:25:00, one MES $-207.50
- Managed outcome: Stop at 2026-07-24T15:25:00, exit 7432.75, one MES $-207.50
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 3. LONG 15M FVG 7466.00-7472.50 parent 2026-07-24T11:15:00 confirmed 2026-07-24T11:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-07-24T11:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-07-24T11:15:00
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
- 15M first reaction zone: first_reaction_15m_fvg LONG 7451.00-7454.75 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7451.00-7454.75 parent 2026-07-24T11:00:00 confirmed 2026-07-24T11:15:00 untested_by_15m
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
