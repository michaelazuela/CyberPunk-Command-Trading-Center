# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-26 / full-rth (2026-01-26T09:15:00 to 2026-01-26T16:00:00)
Context window: 120 days (2025-09-28T00:00:00 to 2026-01-27T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 17144 bars (2025-10-28T18:05:00 to 2026-01-27T23:55:00)
- 15m: 5714 bars (2025-10-28T18:15:00 to 2026-01-27T23:45:00)
- 60m: 1400 bars (2025-10-28T19:00:00 to 2026-01-27T23:00:00)
- 120m: 730 bars (2025-10-28T20:00:00 to 2026-01-27T22:00:00)
- 240m: 365 bars (2025-10-28T22:00:00 to 2026-01-27T22:00:00)

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
- Open below: 5m LONG 7062.75-7064.25 created 2026-01-26T09:05:00 status open_untouched; 15m LONG 7057.25-7064.25 created 2026-01-26T09:15:00 status open_untouched; 5m LONG 7060.25-7060.75 created 2026-01-26T09:00:00 status open_untouched; 5m LONG 7055.00-7059.75 created 2026-01-26T08:55:00 status open_untouched; 5m LONG 7048.50-7049.00 created 2026-01-26T07:05:00 status open_untouched; 5m LONG 7047.00-7047.25 created 2026-01-26T07:00:00 status open_untouched; 5m LONG 7038.00-7040.00 created 2026-01-26T05:05:00 status open_untouched; 60m LONG 7029.25-7030.00 created 2026-01-25T21:00:00 status open_untouched; 15m LONG 7023.75-7024.50 created 2026-01-25T19:15:00 status open_untouched; 120m LONG 6984.50-7022.75 created 2026-01-21T17:00:00 status partial_touch
- Failed above: 5m LONG 7065.50-7067.00 created 2025-12-12T07:15:00 status failed_inverted; 5m LONG 7065.50-7065.75 created 2025-12-29T18:40:00 status failed_inverted; 5m SHORT 7065.50-7065.75 created 2025-12-29T19:40:00 status failed_inverted; 5m LONG 7065.50-7066.75 created 2025-12-29T22:40:00 status failed_inverted; 5m SHORT 7065.50-7065.75 created 2026-01-05T10:45:00 status failed_inverted; 5m LONG 7065.50-7067.50 created 2026-01-23T10:55:00 status failed_inverted; 15m LONG 7065.50-7066.50 created 2025-11-03T09:00:00 status failed_inverted; 15m LONG 7065.50-7067.00 created 2025-12-23T13:30:00 status failed_inverted; 15m SHORT 7065.50-7069.00 created 2025-12-29T09:15:00 status failed_inverted; 15m SHORT 7065.50-7066.25 created 2026-01-05T14:30:00 status failed_inverted
- Open above: 5m SHORT 7100.00-7105.50 created 2026-01-16T14:20:00 status partial_touch; 5m SHORT 7114.50-7115.00 created 2026-01-16T06:45:00 status partial_touch; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch

## Trace Rows

### 1. LONG 15M FVG 7057.25-7064.25 created 2026-01-26T09:15:00
- Verdict: valid_trace_candidate
- Continuation read: obstacle_before_t1_manage_or_downgrade
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-26T09:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-26T09:25:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-26T09:25:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-26T09:25:00. | PASS entry_stop_risk_contract: Entry 7066.25, protected 5M stop 7050.25, risk 16.00 pts. | PASS tactical_targets_from_actual_risk: T1 7090.25 and T2 7098.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7066.50.
- Parent displacement: yes
- Parent displacement candle: 2026-01-26T09:00:00
- Parent failure: not found
- First 5M return: 2026-01-26T09:25:00
- 5M wick defense: 2026-01-26T09:25:00
- Proof: 2026-01-26T09:25:00
- Entry/stop/risk: 7066.25 / 7050.25 / 16.00 pts
- T1/T2: 7090.25 / 7098.25
- Nearest liquidity: nearest prior high liquidity 7066.50
- Opposing FVG obstacle before T1: 5m LONG 7066.50-7071.00 created 2025-12-11T13:45:00 status failed_inverted
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-26T09:30:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7057.25-7064.25 created 2026-01-26T09:15:00 defended_on_15m defended 2026-01-26T09:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7057.25-7064.25 created 2026-01-26T09:15:00 defended_on_15m defended 2026-01-26T09:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-01-26T09:25:00; wick 2026-01-26T09:25:00; proof 2026-01-26T09:25:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 5m LONG 7062.75-7064.25 created 2026-01-26T09:05:00 status partial_touch; 15m LONG 7057.25-7064.25 created 2026-01-26T09:15:00 status open_untouched; 5m LONG 7060.25-7060.75 created 2026-01-26T09:00:00 status open_untouched; 5m LONG 7055.00-7059.75 created 2026-01-26T08:55:00 status open_untouched; 5m LONG 7048.50-7049.00 created 2026-01-26T07:05:00 status open_untouched; 5m LONG 7047.00-7047.25 created 2026-01-26T07:00:00 status open_untouched; 5m LONG 7038.00-7040.00 created 2026-01-26T05:05:00 status open_untouched; 60m LONG 7029.25-7030.00 created 2026-01-25T21:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7066.50-7071.00 created 2025-12-11T13:45:00 status failed_inverted; 5m LONG 7066.50-7067.25 created 2025-12-30T03:55:00 status failed_inverted; 5m SHORT 7066.50-7067.00 created 2025-12-30T07:30:00 status failed_inverted; 5m LONG 7066.50-7067.00 created 2026-01-06T00:20:00 status failed_inverted; 5m SHORT 7066.50-7067.00 created 2026-01-06T02:45:00 status failed_inverted; 5m LONG 7066.50-7068.00 created 2026-01-08T08:25:00 status failed_inverted; 5m LONG 7066.50-7067.00 created 2026-01-22T20:55:00 status failed_inverted; 15m LONG 7066.50-7067.25 created 2025-11-12T04:45:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7100.00-7105.50 created 2026-01-16T14:20:00 status partial_touch; 5m SHORT 7114.50-7115.00 created 2026-01-16T06:45:00 status partial_touch; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: session_extreme 7067.25 reached 2026-01-26T09:30:00 (RTH high liquidity before proof); tactical 7090.25 reached 2026-01-26T09:50:00 (T1 1.5R); tactical 7098.25 reached 2026-01-26T10:25:00 (T2 2.0R); open_fvg 7105.50 reached 2026-01-26T13:30:00 (5m SHORT open FVG partial_touch created 2026-01-16T14:20:00); open_fvg 7115.00 not reached (5m SHORT open FVG partial_touch created 2026-01-16T06:45:00); open_fvg 7121.50 not reached (15m SHORT open FVG open_untouched created 2026-01-15T14:30:00); open_fvg 7123.25 not reached (15m SHORT open FVG open_untouched created 2026-01-15T14:15:00); open_fvg 7130.75 not reached (15m SHORT open FVG partial_touch created 2026-01-13T10:00:00)
- Story: LONG proof completed at 2026-01-26T09:25:00 from 7057.25-7064.25. 13 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7066.50-7071.00 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7067.25 session_extreme, 7105.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-26T09:50:00, one MES +$120.00
- Managed outcome: T1 at 2026-01-26T09:50:00, exit 7090.25, one MES +$120.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window.

### 2. LONG 15M FVG 7070.75-7086.75 created 2026-01-26T10:00:00
- Verdict: valid_trace_candidate
- Continuation read: obstacle_before_t1_manage_or_downgrade
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-26T09:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-26T10:05:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-26T10:05:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-26T10:05:00. | PASS entry_stop_risk_contract: Entry 7088.50, protected 5M stop 7064.75, risk 23.75 pts. | PASS tactical_targets_from_actual_risk: T1 7124.25 and T2 7136.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7088.75.
- Parent displacement: yes
- Parent displacement candle: 2026-01-26T09:30:00
- Parent failure: not found
- First 5M return: 2026-01-26T10:05:00
- 5M wick defense: 2026-01-26T10:05:00
- Proof: 2026-01-26T10:05:00
- Entry/stop/risk: 7088.50 / 7064.75 / 23.75 pts
- T1/T2: 7124.25 / 7136.00
- Nearest liquidity: nearest prior high liquidity 7088.75
- Opposing FVG obstacle before T1: 5m LONG 7088.75-7089.50 created 2025-12-26T04:05:00 status failed_inverted
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-26T10:10:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7057.25-7064.25 created 2026-01-26T09:15:00 defended_on_15m defended 2026-01-26T09:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7057.25-7064.25 created 2026-01-26T09:15:00 defended_on_15m defended 2026-01-26T09:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-01-26T10:05:00; wick 2026-01-26T10:05:00; proof 2026-01-26T10:05:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 5m LONG 7086.00-7087.75 created 2026-01-26T09:50:00 status partial_touch; 15m LONG 7070.75-7086.75 created 2026-01-26T10:00:00 status open_untouched; 5m LONG 7079.50-7080.75 created 2026-01-26T09:45:00 status open_untouched; 5m LONG 7070.75-7078.75 created 2026-01-26T09:40:00 status open_untouched; 5m LONG 7062.75-7064.25 created 2026-01-26T09:05:00 status partial_touch; 15m LONG 7057.25-7064.25 created 2026-01-26T09:15:00 status partial_touch; 60m LONG 7057.50-7063.75 created 2026-01-26T10:00:00 status open_untouched; 5m LONG 7060.25-7060.75 created 2026-01-26T09:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7088.75-7089.50 created 2025-12-26T04:05:00 status failed_inverted; 15m SHORT 7088.75-7090.00 created 2025-10-29T18:30:00 status failed_inverted; 15m LONG 7088.75-7089.00 created 2025-10-30T07:15:00 status failed_inverted; 5m LONG 7089.00-7095.25 created 2026-01-09T08:40:00 status failed_inverted; 15m LONG 7089.00-7089.50 created 2025-12-26T04:15:00 status failed_inverted; 60m SHORT 7089.00-7089.75 created 2025-12-28T22:00:00 status failed_inverted; 5m SHORT 7089.25-7092.75 created 2025-10-29T18:05:00 status failed_inverted; 5m LONG 7089.25-7090.00 created 2026-01-06T13:20:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7100.00-7105.50 created 2026-01-16T14:20:00 status partial_touch; 5m SHORT 7114.50-7115.00 created 2026-01-16T06:45:00 status partial_touch; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: session_extreme 7092.75 reached 2026-01-26T10:15:00 (RTH high liquidity before proof); open_fvg 7105.50 reached 2026-01-26T13:30:00 (5m SHORT open FVG partial_touch created 2026-01-16T14:20:00); open_fvg 7115.00 not reached (5m SHORT open FVG partial_touch created 2026-01-16T06:45:00); open_fvg 7121.50 not reached (15m SHORT open FVG open_untouched created 2026-01-15T14:30:00); open_fvg 7123.25 not reached (15m SHORT open FVG open_untouched created 2026-01-15T14:15:00); tactical 7124.25 not reached (T1 1.5R); open_fvg 7130.75 not reached (15m SHORT open FVG partial_touch created 2026-01-13T10:00:00); tactical 7136.00 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-01-26T10:05:00 from 7070.75-7086.75. 13 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7088.75-7089.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7092.75 session_extreme, 7105.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-27T10:45:00, one MES +$178.75
- Managed outcome: T1 at 2026-01-27T10:45:00, exit 7124.25, one MES +$178.75
- Reasons: No 15M acceptance through the parent FVG was found inside this session window.

### 3. LONG 15M FVG 7099.00-7101.00 created 2026-01-26T12:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-26T13:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-26T13:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-26T13:00:00, 2026-01-26T13:05:00, 2026-01-26T13:50:00, 2026-01-26T14:00:00, 2026-01-26T14:05:00, 2026-01-26T15:05:00, 2026-01-26T15:45:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-26T13:25:00. | PASS entry_stop_risk_contract: Entry 7103.00, protected 5M stop 7095.50, risk 7.50 pts. | PASS tactical_targets_from_actual_risk: T1 7114.25 and T2 7118.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7103.25.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-01-26T13:00:00
- First 5M return: 2026-01-26T13:00:00
- 5M wick defense: 2026-01-26T13:00:00, 2026-01-26T13:05:00, 2026-01-26T13:50:00, 2026-01-26T14:00:00, 2026-01-26T14:05:00, 2026-01-26T15:05:00, 2026-01-26T15:45:00
- Proof: 2026-01-26T13:25:00
- Entry/stop/risk: 7103.00 / 7095.50 / 7.50 pts
- T1/T2: 7114.25 / 7118.00
- Nearest liquidity: nearest prior high liquidity 7103.25
- Opposing FVG obstacle before T1: 15m LONG 7103.25-7103.75 created 2026-01-14T04:30:00 status failed_inverted
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-26T13:30:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7057.25-7064.25 created 2026-01-26T09:15:00 defended_on_15m defended 2026-01-26T09:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7057.25-7064.25 created 2026-01-26T09:15:00 defended_on_15m defended 2026-01-26T09:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-01-26T12:35:00; wick 2026-01-26T12:40:00; proof 2026-01-26T12:45:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7098.00-7100.25 created 2026-01-26T13:25:00 status open_untouched; 15m LONG 7070.75-7086.75 created 2026-01-26T10:00:00 status partial_touch; 60m LONG 7065.50-7083.75 created 2026-01-26T11:00:00 status open_untouched; 120m LONG 7057.50-7083.75 created 2026-01-26T12:00:00 status open_untouched; 5m LONG 7079.50-7080.75 created 2026-01-26T09:45:00 status open_untouched; 5m LONG 7070.75-7078.75 created 2026-01-26T09:40:00 status open_untouched; 5m LONG 7062.75-7064.25 created 2026-01-26T09:05:00 status partial_touch; 15m LONG 7057.25-7064.25 created 2026-01-26T09:15:00 status partial_touch
- Failed FVGs above at proof: 15m LONG 7103.25-7103.75 created 2026-01-14T04:30:00 status failed_inverted; 5m SHORT 7103.50-7105.50 created 2026-01-07T14:15:00 status failed_inverted; 5m SHORT 7104.00-7105.00 created 2026-01-07T11:30:00 status failed_inverted; 5m SHORT 7104.00-7104.50 created 2026-01-14T00:00:00 status failed_inverted; 120m LONG 7104.00-7105.00 created 2025-10-29T00:00:00 status failed_inverted; 5m LONG 7104.25-7105.00 created 2025-10-28T22:05:00 status failed_inverted; 5m LONG 7104.25-7106.25 created 2026-01-07T09:50:00 status failed_inverted; 5m LONG 7104.25-7104.50 created 2026-01-14T04:15:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7114.50-7115.00 created 2026-01-16T06:45:00 status partial_touch; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: liquidity 7103.25 reached 2026-01-26T13:30:00 (prior 5M swing high liquidity from 2026-01-26T12:25:00); liquidity 7103.75 reached 2026-01-26T13:30:00 (prior 5M swing high liquidity from 2026-01-26T12:10:00); session_extreme 7103.75 reached 2026-01-26T13:30:00 (RTH high liquidity before proof); tactical 7114.25 not reached (T1 1.5R); open_fvg 7115.00 not reached (5m SHORT open FVG partial_touch created 2026-01-16T06:45:00); tactical 7118.00 not reached (T2 2.0R); open_fvg 7121.50 not reached (15m SHORT open FVG open_untouched created 2026-01-15T14:30:00); open_fvg 7123.25 not reached (15m SHORT open FVG open_untouched created 2026-01-15T14:15:00); open_fvg 7130.75 not reached (15m SHORT open FVG partial_touch created 2026-01-13T10:00:00)
- Story: LONG proof completed at 2026-01-26T13:25:00 from 7099.00-7101.00. 12 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 15m 7103.25-7103.75 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7103.25 liquidity, 7103.75 liquidity, 7103.75 session_extreme. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-01-26T15:55:00, one MES $-37.50
- Managed outcome: Stop at 2026-01-26T15:55:00, exit 7095.50, one MES $-37.50
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic.

### 4. LONG 15M FVG 7100.25-7101.25 created 2026-01-26T13:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-26T13:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-26T16:00:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-26T13:30:00
- Parent failure: 2026-01-26T16:00:00
- First 5M return: not found
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7057.25-7064.25 created 2026-01-26T09:15:00 defended_on_15m defended 2026-01-26T09:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7057.25-7064.25 created 2026-01-26T09:15:00 defended_on_15m defended 2026-01-26T09:30:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-01-26T13:45:00; wick 2026-01-26T13:50:00; proof 2026-01-26T13:50:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return.
