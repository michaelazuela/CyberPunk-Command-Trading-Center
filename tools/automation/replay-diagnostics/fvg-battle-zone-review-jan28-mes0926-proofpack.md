# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26 (requested MES)
Date/session: 2026-01-28 / lunch (2026-01-28T12:00:00 to 2026-01-28T16:00:00)
Context window: 120 days (2025-09-30T00:00:00 to 2026-01-29T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 17696 bars (2025-10-28T18:05:00 to 2026-01-29T23:55:00)
- 15m: 5898 bars (2025-10-28T18:15:00 to 2026-01-29T23:45:00)
- 60m: 1446 bars (2025-10-28T19:00:00 to 2026-01-29T23:00:00)
- 120m: 754 bars (2025-10-28T20:00:00 to 2026-01-29T22:00:00)
- 240m: 377 bars (2025-10-28T22:00:00 to 2026-01-29T22:00:00)

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
- Open below: 15m LONG 7109.50-7110.75 parent 2026-01-27T10:00:00 confirmed 2026-01-27T10:15:00 status partial_touch; 5m LONG 7109.50-7110.25 parent 2026-01-27T09:50:00 confirmed 2026-01-27T09:55:00 status partial_touch; 120m LONG 7096.75-7108.75 parent 2026-01-26T22:00:00 confirmed 2026-01-27T00:00:00 status partial_touch; 5m LONG 7100.75-7102.00 parent 2026-01-26T21:05:00 confirmed 2026-01-26T21:10:00 status partial_touch; 60m LONG 7096.75-7100.00 parent 2026-01-26T21:00:00 confirmed 2026-01-26T22:00:00 status open_untouched; 15m LONG 7097.75-7098.00 parent 2026-01-26T20:30:00 confirmed 2026-01-26T20:45:00 status open_untouched; 15m LONG 7070.75-7086.75 parent 2026-01-26T09:45:00 confirmed 2026-01-26T10:00:00 status partial_touch; 60m LONG 7065.50-7083.75 parent 2026-01-26T10:00:00 confirmed 2026-01-26T11:00:00 status open_untouched; 120m LONG 7057.50-7083.75 parent 2026-01-26T10:00:00 confirmed 2026-01-26T12:00:00 status open_untouched; 240m LONG 7063.00-7083.75 parent 2026-01-26T10:00:00 confirmed 2026-01-26T14:00:00 status open_untouched
- Failed above: 5m LONG 7112.25-7114.75 parent 2025-10-29T07:10:00 confirmed 2025-10-29T07:15:00 status failed_inverted; 5m LONG 7112.25-7113.25 parent 2025-10-29T08:50:00 confirmed 2025-10-29T08:55:00 status failed_inverted; 5m SHORT 7112.25-7113.00 parent 2026-01-13T16:45:00 confirmed 2026-01-13T16:50:00 status failed_inverted; 5m LONG 7112.25-7113.00 parent 2026-01-13T18:05:00 confirmed 2026-01-13T18:10:00 status failed_inverted; 5m LONG 7112.25-7113.00 parent 2026-01-15T09:05:00 confirmed 2026-01-15T09:10:00 status failed_inverted; 15m LONG 7112.25-7114.25 parent 2026-01-07T12:00:00 confirmed 2026-01-07T12:15:00 status failed_inverted; 15m LONG 7112.25-7113.00 parent 2026-01-12T11:00:00 confirmed 2026-01-12T11:15:00 status failed_inverted; 5m SHORT 7112.50-7113.50 parent 2025-10-29T10:45:00 confirmed 2025-10-29T10:50:00 status failed_inverted; 5m SHORT 7112.50-7112.75 parent 2026-01-16T03:35:00 confirmed 2026-01-16T03:40:00 status failed_inverted; 5m LONG 7112.50-7113.50 parent 2026-01-27T00:45:00 confirmed 2026-01-27T00:50:00 status failed_inverted
- Open above: 15m SHORT 7116.75-7119.25 parent 2026-01-28T11:45:00 confirmed 2026-01-28T12:00:00 status open_untouched; 5m SHORT 7120.25-7121.00 parent 2026-01-28T11:35:00 confirmed 2026-01-28T11:40:00 status open_untouched; 60m SHORT 7128.25-7130.75 parent 2026-01-28T11:00:00 confirmed 2026-01-28T12:00:00 status open_untouched; 240m LONG 7130.00-7136.50 parent 2026-01-27T22:00:00 confirmed 2026-01-28T02:00:00 status partial_touch; 15m SHORT 7141.25-7144.50 parent 2026-01-28T07:15:00 confirmed 2026-01-28T07:30:00 status partial_touch

## Trace Rows

### 1. SHORT 15M FVG 7116.75-7119.25 parent 2026-01-28T11:45:00 confirmed 2026-01-28T12:00:00
- Verdict: valid_trace_candidate
- Continuation read: obstacle_before_t1_manage_or_downgrade
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-28T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-28T15:15:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-28T12:05:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-28T13:10:00, 2026-01-28T13:25:00, 2026-01-28T13:35:00, 2026-01-28T13:40:00, 2026-01-28T13:55:00, 2026-01-28T14:15:00, 2026-01-28T14:35:00, 2026-01-28T14:40:00, 2026-01-28T15:50:00, 2026-01-28T16:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-28T13:10:00. | PASS entry_stop_risk_contract: Entry 7115.75, protected 5M stop 7119.25, risk 3.50 pts. | PASS tactical_targets_from_actual_risk: T1 7110.50 and T2 7108.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7115.50.
- Parent displacement: yes
- Parent displacement candle: 2026-01-28T11:45:00
- Parent failure: 2026-01-28T15:15:00
- First 5M return: 2026-01-28T12:05:00
- 5M wick defense: 2026-01-28T13:10:00, 2026-01-28T13:25:00, 2026-01-28T13:35:00, 2026-01-28T13:40:00, 2026-01-28T13:55:00, 2026-01-28T14:15:00, 2026-01-28T14:35:00, 2026-01-28T14:40:00, 2026-01-28T15:50:00, 2026-01-28T16:00:00
- Proof: 2026-01-28T13:10:00
- Entry/stop/risk: 7115.75 / 7119.25 / 3.50 pts
- T1/T2: 7110.50 / 7108.75
- Nearest liquidity: nearest prior low liquidity 7115.50
- Opposing FVG obstacle before T1: 15m LONG 7109.50-7110.75 parent 2026-01-27T10:00:00 confirmed 2026-01-27T10:15:00 status partial_touch
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-28T14:05:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7116.75-7119.25 parent 2026-01-28T11:45:00 confirmed 2026-01-28T12:00:00 defended_on_15m defended 2026-01-28T12:30:00 failed 2026-01-28T15:15:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7116.75-7119.25 parent 2026-01-28T11:45:00 confirmed 2026-01-28T12:00:00 defended_on_15m defended 2026-01-28T12:30:00 failed 2026-01-28T15:15:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-01-28T12:05:00; wick 2026-01-28T13:10:00; proof 2026-01-28T13:10:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 15m LONG 7109.50-7110.75 parent 2026-01-27T10:00:00 confirmed 2026-01-27T10:15:00 status partial_touch; 5m LONG 7109.50-7110.25 parent 2026-01-27T09:50:00 confirmed 2026-01-27T09:55:00 status partial_touch; 120m LONG 7096.75-7108.75 parent 2026-01-26T22:00:00 confirmed 2026-01-27T00:00:00 status partial_touch; 5m LONG 7100.75-7102.00 parent 2026-01-26T21:05:00 confirmed 2026-01-26T21:10:00 status partial_touch; 60m LONG 7096.75-7100.00 parent 2026-01-26T21:00:00 confirmed 2026-01-26T22:00:00 status open_untouched; 15m LONG 7097.75-7098.00 parent 2026-01-26T20:30:00 confirmed 2026-01-26T20:45:00 status open_untouched; 15m LONG 7070.75-7086.75 parent 2026-01-26T09:45:00 confirmed 2026-01-26T10:00:00 status partial_touch; 60m LONG 7065.50-7083.75 parent 2026-01-26T10:00:00 confirmed 2026-01-26T11:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7116.00-7117.00 parent 2026-01-12T11:10:00 confirmed 2026-01-12T11:15:00 status failed_inverted; 5m SHORT 7116.00-7119.25 parent 2026-01-15T10:45:00 confirmed 2026-01-15T10:50:00 status failed_inverted; 5m LONG 7116.00-7117.00 parent 2026-01-27T01:05:00 confirmed 2026-01-27T01:10:00 status failed_inverted; 15m LONG 7116.00-7116.50 parent 2026-01-27T01:15:00 confirmed 2026-01-27T01:30:00 status failed_inverted; 5m LONG 7116.25-7116.50 parent 2025-10-29T03:40:00 confirmed 2025-10-29T03:45:00 status failed_inverted; 5m LONG 7116.25-7119.00 parent 2026-01-15T09:25:00 confirmed 2026-01-15T09:30:00 status failed_inverted; 15m LONG 7116.25-7117.50 parent 2025-10-29T07:30:00 confirmed 2025-10-29T07:45:00 status failed_inverted; 15m LONG 7116.25-7117.75 parent 2026-01-12T21:00:00 confirmed 2026-01-12T21:15:00 status failed_inverted
- Open FVGs above at proof: 60m SHORT 7128.25-7130.75 parent 2026-01-28T11:00:00 confirmed 2026-01-28T12:00:00 status open_untouched; 240m LONG 7130.00-7136.50 parent 2026-01-27T22:00:00 confirmed 2026-01-28T02:00:00 status partial_touch; 15m SHORT 7141.25-7144.50 parent 2026-01-28T07:15:00 confirmed 2026-01-28T07:30:00 status partial_touch
- Objective ladder: tactical 7110.50 reached 2026-01-28T14:05:00 (T1 1.5R); liquidity 7109.75 reached 2026-01-28T14:05:00 (prior 5M swing low liquidity from 2026-01-28T12:35:00); session_extreme 7109.75 reached 2026-01-28T14:05:00 (RTH low liquidity before proof); open_fvg 7109.50 reached 2026-01-28T14:05:00 (15m LONG open FVG partial_touch parent 2026-01-27T10:00:00 confirmed 2026-01-27T10:15:00); open_fvg 7109.50 reached 2026-01-28T14:05:00 (5m LONG open FVG partial_touch parent 2026-01-27T09:50:00 confirmed 2026-01-27T09:55:00); tactical 7108.75 reached 2026-01-28T14:05:00 (T2 2.0R); open_fvg 7100.75 not reached (5m LONG open FVG partial_touch parent 2026-01-26T21:05:00 confirmed 2026-01-26T21:10:00); open_fvg 7097.75 not reached (15m LONG open FVG open_untouched parent 2026-01-26T20:30:00 confirmed 2026-01-26T20:45:00); open_fvg 7096.75 not reached (120m LONG open FVG partial_touch parent 2026-01-26T22:00:00 confirmed 2026-01-27T00:00:00); open_fvg 7096.75 not reached (60m LONG open FVG open_untouched parent 2026-01-26T21:00:00 confirmed 2026-01-26T22:00:00); open_fvg 7070.75 not reached (15m LONG open FVG partial_touch parent 2026-01-26T09:45:00 confirmed 2026-01-26T10:00:00); open_fvg 7065.50 not reached (60m LONG open FVG open_untouched parent 2026-01-26T10:00:00 confirmed 2026-01-26T11:00:00)
- Story: SHORT proof completed at 2026-01-28T13:10:00 from 7116.75-7119.25. 11 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 15m 7109.50-7110.75 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7109.75 liquidity, 7109.75 session_extreme, 7109.50 open_fvg, 7109.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-01-28T13:25:00, one MES $-17.50
- Managed outcome: Stop at 2026-01-28T13:25:00, exit 7119.25, one MES $-17.50
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-01-28T13:10:00 before later same-zone failure/reversal read at 2026-01-28T15:15:00. Review the defended continuation before labeling this zone as failure/reversal.
