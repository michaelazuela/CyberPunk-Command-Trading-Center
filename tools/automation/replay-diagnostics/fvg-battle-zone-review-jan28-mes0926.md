# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-28 / full-rth (2026-01-28T09:15:00 to 2026-01-28T16:00:00)
Context window: 120 days (2025-09-30T00:00:00 to 2026-01-28T23:59:59)

## Coverage
- 5m: 17420 bars (2025-10-28T18:05:00 to 2026-01-28T23:55:00)
- 15m: 5806 bars (2025-10-28T18:15:00 to 2026-01-28T23:45:00)
- 60m: 1423 bars (2025-10-28T19:00:00 to 2026-01-28T23:00:00)
- 120m: 742 bars (2025-10-28T20:00:00 to 2026-01-28T22:00:00)
- 240m: 371 bars (2025-10-28T22:00:00 to 2026-01-28T22:00:00)

## Research Tags
- none

## Research Rules
- FvgBattleZoneInventory (research_only_supporting_rule): Track only the first same-side 15M FVG reaction zone and the final/deepest same-side 15M FVG battle zone from the active displacement leg. The selected 15M battle zone must then be defended on completed 5M candles before any entry model can use it.
  - Required facts: 15M-only inventory for this research rule. | Same-side 15M displacement leg creates the candidate FVG stack. | First same-side 15M FVG is the first reaction zone. | Final/deepest same-side 15M FVG is the structure survival battle zone if the first zone fails. | 5M confirms only after price returns into the selected 15M battle zone and rejects it.
  - Invalidation: Every 15M FVG is tagged as equal importance. | Middle-zone clutter is promoted over first reaction or final/deepest battle-zone roles. | 5M confirmation is used before the 15M battle zone is selected. | The selected 15M battle zone accepts through against the intended direction.
  - Standalone trigger: no
- FvgBalancedPathContinuation (research_only_supporting_rule): If price breaks out of a balanced/rebalanced range and no defended opposing FVG appears before the next real-liquidity or open-FVG objective, the move can travel cleanly through that path. This supports continuation and runner management after a valid FVG proof already exists.
  - Required facts: 15M parent FVG setup is valid. | Completed 5M wick-defense/proof exists. | Nearest protected 5M structure stop is known. | Objective ladder has a real liquidity or open-FVG objective ahead. | No opposing FVG/HTF obstacle defends before that objective.
  - Invalidation: Used without 15M parent FVG plus completed 5M proof. | Opposing FVG/HTF obstacle defends before the objective. | The objective was already reached before entry. | Balanced path is treated as a standalone trigger.
  - Standalone trigger: no

## FVG Inventory At Session Start
- Open below: 5m LONG 7127.75-7129.50 created 2026-01-27T19:20:00 status open_untouched; 15m LONG 7126.25-7129.50 created 2026-01-27T19:30:00 status open_untouched; 5m LONG 7126.50-7127.25 created 2026-01-27T19:15:00 status open_untouched; 60m LONG 7124.75-7125.25 created 2026-01-27T20:00:00 status open_untouched; 15m LONG 7124.25-7124.50 created 2026-01-27T18:30:00 status open_untouched; 5m LONG 7123.00-7124.00 created 2026-01-27T18:10:00 status open_untouched; 5m LONG 7121.25-7121.75 created 2026-01-27T16:40:00 status partial_touch; 5m LONG 7117.50-7119.50 created 2026-01-27T13:20:00 status partial_touch; 15m LONG 7109.50-7110.75 created 2026-01-27T10:15:00 status open_untouched; 5m LONG 7109.50-7110.25 created 2026-01-27T09:55:00 status open_untouched
- Failed above: 5m SHORT 7132.50-7134.75 created 2026-01-13T08:55:00 status failed_inverted; 5m LONG 7132.50-7135.50 created 2026-01-27T19:40:00 status failed_inverted; 15m LONG 7132.50-7135.25 created 2026-01-27T20:00:00 status failed_inverted; 5m LONG 7133.00-7133.25 created 2026-01-13T09:10:00 status failed_inverted; 5m SHORT 7133.50-7134.75 created 2026-01-12T15:20:00 status failed_inverted; 5m LONG 7133.75-7134.25 created 2026-01-12T14:55:00 status failed_inverted; 5m SHORT 7135.00-7137.00 created 2026-01-13T09:35:00 status failed_inverted; 5m LONG 7136.00-7136.50 created 2026-01-27T19:45:00 status failed_inverted; 15m LONG 7138.25-7139.25 created 2026-01-27T23:30:00 status failed_inverted; 5m LONG 7138.50-7139.25 created 2026-01-27T23:15:00 status failed_inverted
- Open above: 60m SHORT 7139.75-7141.50 created 2026-01-28T09:00:00 status open_untouched; 5m SHORT 7141.25-7144.00 created 2026-01-28T07:20:00 status partial_touch; 15m SHORT 7141.25-7144.50 created 2026-01-28T07:30:00 status partial_touch

## Trace Rows

### 1. SHORT 15M FVG 7116.75-7119.25 created 2026-01-28T12:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-28T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-28T15:15:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-28T15:30:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-28T15:50:00, 2026-01-28T16:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-28T15:50:00. | PASS entry_stop_risk_contract: Entry 7114.75, protected 5M stop 7126.50, risk 11.75 pts. | PASS tactical_targets_from_actual_risk: T1 7097.25 and T2 7091.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7114.50.
- Parent displacement: yes
- Parent displacement candle: 2026-01-28T11:45:00
- Parent failure: 2026-01-28T15:15:00
- First 5M return: 2026-01-28T15:30:00
- 5M wick defense: 2026-01-28T15:50:00, 2026-01-28T16:00:00
- Proof: 2026-01-28T15:50:00
- Entry/stop/risk: 7114.75 / 7126.50 / 11.75 pts
- T1/T2: 7097.25 / 7091.25
- Nearest liquidity: nearest prior low liquidity 7114.50
- Opposing FVG obstacle before T1: 120m LONG 7096.75-7108.75 created 2026-01-27T00:00:00 status partial_touch
- Opposing FVG reaction: obstacle_before_t1_not_reached
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7141.25-7144.50 created 2026-01-28T07:30:00 defended_on_15m defended 2026-01-28T08:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7141.25-7144.50 created 2026-01-28T07:30:00 defended_on_15m defended 2026-01-28T08:00:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: 7110.00 (prior 5M swing low liquidity from 2026-01-28T13:05:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 120m LONG 7096.75-7108.75 created 2026-01-27T00:00:00 status partial_touch; 5m LONG 7100.75-7102.00 created 2026-01-26T21:10:00 status partial_touch; 60m LONG 7096.75-7100.00 created 2026-01-26T22:00:00 status open_untouched; 15m LONG 7097.75-7098.00 created 2026-01-26T20:45:00 status open_untouched; 15m LONG 7070.75-7086.75 created 2026-01-26T10:00:00 status partial_touch; 60m LONG 7065.50-7083.75 created 2026-01-26T11:00:00 status open_untouched; 120m LONG 7057.50-7083.75 created 2026-01-26T12:00:00 status open_untouched; 240m LONG 7063.00-7083.75 created 2026-01-26T14:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7115.00-7115.50 created 2026-01-09T12:00:00 status failed_inverted; 5m LONG 7115.00-7116.00 created 2026-01-09T13:35:00 status failed_inverted; 5m LONG 7115.00-7115.50 created 2026-01-16T00:30:00 status failed_inverted; 5m SHORT 7115.00-7115.25 created 2026-01-16T03:30:00 status failed_inverted; 15m SHORT 7115.00-7116.50 created 2026-01-27T02:00:00 status failed_inverted; 5m LONG 7115.25-7116.25 created 2026-01-07T12:10:00 status failed_inverted; 5m SHORT 7115.50-7116.25 created 2025-10-29T08:30:00 status failed_inverted; 5m SHORT 7115.50-7118.00 created 2025-10-30T00:10:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7120.50-7122.00 created 2026-01-28T15:35:00 status partial_touch; 120m SHORT 7121.75-7130.25 created 2026-01-28T14:00:00 status open_untouched; 60m SHORT 7128.25-7130.75 created 2026-01-28T12:00:00 status open_untouched; 240m SHORT 7138.50-7138.75 created 2026-01-28T14:00:00 status open_untouched; 15m SHORT 7141.25-7144.50 created 2026-01-28T07:30:00 status partial_touch
- Objective ladder: liquidity 7112.25 reached 2026-01-28T15:55:00 (prior 5M swing low liquidity from 2026-01-28T13:50:00); liquidity 7111.75 reached 2026-01-28T15:55:00 (prior 5M swing low liquidity from 2026-01-28T15:05:00); liquidity 7110.00 not reached (prior 5M swing low liquidity from 2026-01-28T13:05:00); liquidity 7109.75 not reached (prior 5M swing low liquidity from 2026-01-28T12:35:00); liquidity 7104.00 not reached (prior 5M swing low liquidity from 2026-01-28T14:35:00); liquidity 7102.25 not reached (prior 5M swing low liquidity from 2026-01-28T14:05:00); session_extreme 7102.25 not reached (RTH low liquidity before proof); open_fvg 7100.75 not reached (5m LONG open FVG partial_touch created 2026-01-26T21:10:00); open_fvg 7097.75 not reached (15m LONG open FVG open_untouched created 2026-01-26T20:45:00); tactical 7097.25 not reached (T1 1.5R); open_fvg 7096.75 not reached (120m LONG open FVG partial_touch created 2026-01-27T00:00:00); open_fvg 7096.75 not reached (60m LONG open FVG open_untouched created 2026-01-26T22:00:00); tactical 7091.25 not reached (T2 2.0R); open_fvg 7070.75 not reached (15m LONG open FVG partial_touch created 2026-01-26T10:00:00)
- Story: SHORT proof completed at 2026-01-28T15:50:00 from 7116.75-7119.25. 13 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 120m 7096.75-7108.75 with reaction obstacle_before_t1_not_reached. Structural objectives reached after proof: 7112.25 liquidity, 7111.75 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-01-28T16:00:00, one MES $-58.75
- Managed outcome: Stop at 2026-01-28T16:00:00, exit 7126.50, one MES $-58.75
- Reasons: 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.
