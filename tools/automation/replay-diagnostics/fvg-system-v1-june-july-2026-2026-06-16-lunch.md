# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-06-16 / lunch (2026-06-16T12:00:00 to 2026-06-16T16:00:00)
Context window: 275 days (2025-09-14T00:00:00 to 2026-06-17T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 44831 bars (2025-10-28T18:05:00 to 2026-06-17T23:55:00)
- 15m: 14957 bars (2025-10-28T18:15:00 to 2026-06-17T23:45:00)
- 60m: 3706 bars (2025-10-28T19:00:00 to 2026-06-17T23:00:00)
- 120m: 1940 bars (2025-10-28T20:00:00 to 2026-06-17T22:00:00)
- 240m: 1032 bars (2025-10-28T22:00:00 to 2026-06-17T22:00:00)

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
- Open below: 5m LONG 7608.25-7609.75 parent 2026-06-16T11:55:00 confirmed 2026-06-16T12:00:00 status open_untouched; 15m LONG 7597.00-7598.25 parent 2026-06-15T09:30:00 confirmed 2026-06-15T09:45:00 status open_untouched; 5m LONG 7595.00-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:20:00 status open_untouched; 15m LONG 7594.75-7595.50 parent 2026-06-15T09:15:00 confirmed 2026-06-15T09:30:00 status open_untouched; 5m LONG 7582.50-7584.00 parent 2026-06-15T00:20:00 confirmed 2026-06-15T00:25:00 status partial_touch; 60m LONG 7579.25-7580.75 parent 2026-06-14T23:00:00 confirmed 2026-06-15T00:00:00 status partial_touch; 120m LONG 7579.25-7580.50 parent 2026-06-15T00:00:00 confirmed 2026-06-15T02:00:00 status open_untouched; 60m LONG 7574.75-7575.75 parent 2026-06-14T22:00:00 confirmed 2026-06-14T23:00:00 status open_untouched; 120m LONG 7568.00-7575.75 parent 2026-06-14T22:00:00 confirmed 2026-06-15T00:00:00 status open_untouched; 60m LONG 7561.75-7569.25 parent 2026-06-14T21:00:00 confirmed 2026-06-14T22:00:00 status open_untouched
- Failed above: 5m LONG 7610.25-7610.75 parent 2026-06-03T21:35:00 confirmed 2026-06-03T21:40:00 status failed_inverted; 60m LONG 7610.25-7614.25 parent 2026-06-04T03:00:00 confirmed 2026-06-04T04:00:00 status failed_inverted; 5m LONG 7610.50-7611.25 parent 2026-05-24T22:45:00 confirmed 2026-05-24T22:50:00 status failed_inverted; 120m SHORT 7610.75-7614.00 parent 2026-05-27T10:00:00 confirmed 2026-05-27T12:00:00 status failed_inverted; 5m LONG 7611.00-7611.25 parent 2026-05-24T22:10:00 confirmed 2026-05-24T22:15:00 status failed_inverted; 15m SHORT 7611.00-7612.25 parent 2026-05-27T18:30:00 confirmed 2026-05-27T18:45:00 status failed_inverted; 5m LONG 7611.25-7612.25 parent 2026-06-04T02:40:00 confirmed 2026-06-04T02:45:00 status failed_inverted; 5m LONG 7611.50-7613.00 parent 2026-05-24T22:50:00 confirmed 2026-05-24T22:55:00 status failed_inverted; 15m LONG 7611.50-7615.50 parent 2026-05-24T23:00:00 confirmed 2026-05-24T23:15:00 status failed_inverted; 120m SHORT 7611.50-7618.75 parent 2026-05-25T20:00:00 confirmed 2026-05-25T22:00:00 status failed_inverted
- Open above: 60m SHORT 7619.25-7620.75 parent 2026-06-16T11:00:00 confirmed 2026-06-16T12:00:00 status open_untouched; 15m SHORT 7621.50-7622.50 parent 2026-06-16T10:30:00 confirmed 2026-06-16T10:45:00 status open_untouched; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch; 15m SHORT 7654.50-7656.50 parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00 status partial_touch; 60m SHORT 7655.00-7661.75 parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00 status partial_touch; 120m SHORT 7655.00-7661.75 parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof 2026-06-16T15:30:00 from 15M parent 2026-06-16T15:15:00 confirmed 2026-06-16T15:30:00.
- Defended-area management context: no loaded obstacle before/near the primary campaign T1.
- Later rows: none.

## Trace Rows

### 1. SHORT 15M FVG 7600.25-7600.50 parent 2026-06-16T15:15:00 confirmed 2026-06-16T15:30:00
- Verdict: valid_trace_candidate
- Continuation read: balanced_path_to_liquidity_valid
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-16T15:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-16T15:30:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-16T15:30:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-16T15:30:00. | PASS entry_stop_risk_contract: Entry 7596.25, protected 5M stop 7604.50, risk 8.25 pts. | PASS tactical_targets_from_actual_risk: T1 7584.00 and T2 7579.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7596.00.
- Parent displacement: yes
- Parent displacement candle: 2026-06-16T15:15:00
- Parent failure: not found
- First 5M return: 2026-06-16T15:30:00
- 5M wick defense: 2026-06-16T15:30:00
- Proof: 2026-06-16T15:30:00
- Entry/stop/risk: 7596.25 / 7604.50 / 8.25 pts
- T1/T2: 7584.00 / 7579.75
- Nearest liquidity: nearest prior low liquidity 7596.00
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7600.25-7600.50 parent 2026-06-16T15:15:00 confirmed 2026-06-16T15:30:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7600.25-7600.50 parent 2026-06-16T15:15:00 confirmed 2026-06-16T15:30:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-16T15:30:00; wick 2026-06-16T15:30:00; proof 2026-06-16T15:30:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7584.75 (RTH low liquidity before proof)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no defended FVG management objective interrupted delivery.
- Open FVGs below at proof: 5m LONG 7582.50-7584.00 parent 2026-06-15T00:20:00 confirmed 2026-06-15T00:25:00 status partial_touch; 60m LONG 7579.25-7580.75 parent 2026-06-14T23:00:00 confirmed 2026-06-15T00:00:00 status partial_touch; 120m LONG 7579.25-7580.50 parent 2026-06-15T00:00:00 confirmed 2026-06-15T02:00:00 status open_untouched; 60m LONG 7574.75-7575.75 parent 2026-06-14T22:00:00 confirmed 2026-06-14T23:00:00 status open_untouched; 120m LONG 7568.00-7575.75 parent 2026-06-14T22:00:00 confirmed 2026-06-15T00:00:00 status open_untouched; 60m LONG 7561.75-7569.25 parent 2026-06-14T21:00:00 confirmed 2026-06-14T22:00:00 status open_untouched; 5m LONG 7566.50-7569.00 parent 2026-06-14T20:15:00 confirmed 2026-06-14T20:20:00 status partial_touch; 15m LONG 7561.00-7568.00 parent 2026-06-14T20:15:00 confirmed 2026-06-14T20:30:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7596.50-7596.75 parent 2026-05-26T18:10:00 confirmed 2026-05-26T18:15:00 status failed_inverted; 5m LONG 7596.50-7597.25 parent 2026-05-27T12:40:00 confirmed 2026-05-27T12:45:00 status failed_inverted; 15m LONG 7596.50-7597.00 parent 2026-05-14T12:00:00 confirmed 2026-05-14T12:15:00 status failed_inverted; 5m LONG 7596.75-7598.75 parent 2026-05-26T15:40:00 confirmed 2026-05-26T15:45:00 status failed_inverted; 5m SHORT 7596.75-7597.00 parent 2026-06-15T07:35:00 confirmed 2026-06-15T07:40:00 status failed_inverted; 5m SHORT 7597.00-7599.25 parent 2026-05-26T16:50:00 confirmed 2026-05-26T16:55:00 status failed_inverted; 5m SHORT 7597.00-7597.25 parent 2026-05-27T23:10:00 confirmed 2026-05-27T23:15:00 status failed_inverted; 15m SHORT 7597.00-7602.25 parent 2026-05-26T03:15:00 confirmed 2026-05-26T03:30:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7600.25-7600.50 parent 2026-06-16T15:15:00 confirmed 2026-06-16T15:30:00 status open_untouched; 5m SHORT 7625.25-7628.00 parent 2026-06-16T10:20:00 confirmed 2026-06-16T10:25:00 status open_untouched; 15m SHORT 7635.00-7638.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T14:15:00 status partial_touch; 5m SHORT 7636.25-7637.50 parent 2026-06-15T13:55:00 confirmed 2026-06-15T14:00:00 status partial_touch; 60m SHORT 7636.25-7636.75 parent 2026-06-15T14:00:00 confirmed 2026-06-15T15:00:00 status partial_touch; 5m SHORT 7640.25-7641.00 parent 2026-06-15T13:45:00 confirmed 2026-06-15T13:50:00 status partial_touch; 15m SHORT 7654.50-7656.50 parent 2026-06-04T16:30:00 confirmed 2026-06-04T16:45:00 status partial_touch; 60m SHORT 7655.00-7661.75 parent 2026-06-04T17:00:00 confirmed 2026-06-04T18:00:00 status partial_touch
- Objective ladder: session_extreme 7584.75 reached 2026-06-16T16:00:00 (RTH low liquidity before proof); tactical 7584.00 reached 2026-06-16T16:00:00 (T1 1.5R); open_fvg 7582.50 not reached (5m LONG open FVG partial_touch parent 2026-06-15T00:20:00 confirmed 2026-06-15T00:25:00); tactical 7579.75 not reached (T2 2.0R); open_fvg 7579.25 not reached (60m LONG open FVG partial_touch parent 2026-06-14T23:00:00 confirmed 2026-06-15T00:00:00); open_fvg 7579.25 not reached (120m LONG open FVG open_untouched parent 2026-06-15T00:00:00 confirmed 2026-06-15T02:00:00); open_fvg 7574.75 not reached (60m LONG open FVG open_untouched parent 2026-06-14T22:00:00 confirmed 2026-06-14T23:00:00); open_fvg 7568.00 not reached (120m LONG open FVG open_untouched parent 2026-06-14T22:00:00 confirmed 2026-06-15T00:00:00); open_fvg 7566.50 not reached (5m LONG open FVG partial_touch parent 2026-06-14T20:15:00 confirmed 2026-06-14T20:20:00); open_fvg 7561.75 not reached (60m LONG open FVG open_untouched parent 2026-06-14T21:00:00 confirmed 2026-06-14T22:00:00); open_fvg 7561.00 not reached (15m LONG open FVG partial_touch parent 2026-06-14T20:15:00 confirmed 2026-06-14T20:30:00)
- Story: SHORT proof completed at 2026-06-16T15:30:00 from 7600.25-7600.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. No opposing FVG obstacle was loaded before T1. Structural objectives reached after proof: 7584.75 session_extreme. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-06-16T16:00:00, one MES +$61.25
- Managed outcome: LQ1 at 2026-06-16T16:00:00, exit 7584.75, one MES +$57.50
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-16T15:30:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal.
