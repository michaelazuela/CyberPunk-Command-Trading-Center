# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-16 / full-rth (2026-01-16T09:15:00 to 2026-01-16T16:00:00)
Context window: 120 days (2025-09-18T00:00:00 to 2026-01-16T23:59:59)

## Coverage
- 5m: 15189 bars (2025-10-28T18:05:00 to 2026-01-16T17:00:00)
- 15m: 5063 bars (2025-10-28T18:15:00 to 2026-01-16T17:00:00)
- 60m: 1238 bars (2025-10-28T19:00:00 to 2026-01-16T17:00:00)
- 120m: 646 bars (2025-10-28T20:00:00 to 2026-01-16T17:00:00)
- 240m: 323 bars (2025-10-28T22:00:00 to 2026-01-16T17:00:00)

## Research Tags
- none

## Research Rules
- FvgBalancedPathContinuation (research_only_supporting_rule): If price breaks out of a balanced/rebalanced range and no defended opposing FVG appears before the next real-liquidity or open-FVG objective, the move can travel cleanly through that path. This supports continuation and runner management after a valid FVG proof already exists.
  - Required facts: 15M parent FVG setup is valid. | Completed 5M wick-defense/proof exists. | Nearest protected 5M structure stop is known. | Objective ladder has a real liquidity or open-FVG objective ahead. | No opposing FVG/HTF obstacle defends before that objective.
  - Invalidation: Used without 15M parent FVG plus completed 5M proof. | Opposing FVG/HTF obstacle defends before the objective. | The objective was already reached before entry. | Balanced path is treated as a standalone trigger.
  - Standalone trigger: no

## FVG Inventory At Session Start
- Open below: 120m LONG 7099.25-7101.25 created 2026-01-15T22:00:00 status partial_touch; 60m LONG 7099.25-7100.25 created 2026-01-15T20:00:00 status partial_touch; 5m LONG 7098.25-7099.50 created 2026-01-15T18:20:00 status partial_touch; 15m LONG 7096.75-7099.50 created 2026-01-15T18:30:00 status partial_touch; 5m LONG 7085.25-7087.25 created 2026-01-15T03:15:00 status partial_touch; 15m LONG 7085.50-7086.00 created 2026-01-15T03:30:00 status open_untouched; 120m LONG 7076.00-7081.25 created 2026-01-15T04:00:00 status open_untouched; 240m LONG 7078.00-7081.25 created 2026-01-15T06:00:00 status open_untouched; 5m LONG 7078.25-7080.00 created 2026-01-15T01:20:00 status open_untouched; 15m LONG 7070.75-7074.50 created 2026-01-15T00:30:00 status partial_touch
- Failed above: 5m SHORT 7105.50-7107.25 created 2026-01-13T13:05:00 status failed_inverted; 60m SHORT 7105.50-7114.00 created 2026-01-15T16:00:00 status failed_inverted; 5m LONG 7105.75-7106.00 created 2025-10-29T21:40:00 status failed_inverted; 5m SHORT 7105.75-7106.75 created 2026-01-16T07:30:00 status failed_inverted; 5m SHORT 7106.00-7108.50 created 2025-10-29T13:35:00 status failed_inverted; 5m SHORT 7106.00-7106.25 created 2026-01-13T13:55:00 status failed_inverted; 5m SHORT 7106.00-7106.25 created 2026-01-13T23:50:00 status failed_inverted; 15m SHORT 7106.00-7107.00 created 2026-01-14T00:00:00 status failed_inverted; 5m LONG 7106.25-7106.75 created 2026-01-16T07:45:00 status failed_inverted; 5m LONG 7106.50-7107.25 created 2026-01-15T21:15:00 status failed_inverted
- Open above: 15m SHORT 7108.50-7112.75 created 2026-01-16T07:15:00 status partial_touch; 5m SHORT 7110.00-7112.75 created 2026-01-16T06:55:00 status partial_touch; 5m SHORT 7113.00-7113.50 created 2026-01-16T06:50:00 status open_untouched; 15m SHORT 7113.00-7114.50 created 2026-01-16T07:00:00 status open_untouched; 5m SHORT 7114.50-7115.00 created 2026-01-16T06:45:00 status open_untouched; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch

## Trace Rows

### 1. SHORT 15M FVG 7100.50-7103.00 created 2026-01-16T10:15:00
- Verdict: valid_trace_candidate
- Continuation read: obstacle_defended_continuation_failed
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-16T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-16T11:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-16T11:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-16T11:50:00, 2026-01-16T11:55:00, 2026-01-16T12:10:00, 2026-01-16T12:20:00, 2026-01-16T12:25:00, 2026-01-16T12:40:00, 2026-01-16T13:45:00, 2026-01-16T13:50:00, 2026-01-16T14:45:00, 2026-01-16T14:50:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-16T12:00:00. | PASS entry_stop_risk_contract: Entry 7099.75, protected 5M stop 7114.75, risk 15.00 pts. | PASS tactical_targets_from_actual_risk: T1 7077.25 and T2 7069.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7099.50.
- Parent displacement: yes
- Parent displacement candle: 2026-01-16T09:45:00
- Parent failure: 2026-01-16T11:45:00
- First 5M return: 2026-01-16T11:45:00
- 5M wick defense: 2026-01-16T11:50:00, 2026-01-16T11:55:00, 2026-01-16T12:10:00, 2026-01-16T12:20:00, 2026-01-16T12:25:00, 2026-01-16T12:40:00, 2026-01-16T13:45:00, 2026-01-16T13:50:00, 2026-01-16T14:45:00, 2026-01-16T14:50:00
- Proof: 2026-01-16T12:00:00
- Entry/stop/risk: 7099.75 / 7114.75 / 15.00 pts
- T1/T2: 7077.25 / 7069.75
- Nearest liquidity: nearest prior low liquidity 7099.50
- Opposing FVG obstacle before T1: 15m LONG 7091.25-7094.00 created 2026-01-16T11:30:00 status open_untouched
- Opposing FVG reaction: obstacle_defended_continuation_failed at 2026-01-16T12:55:00
- Meaningful liquidity target before T1: 7088.00 (prior 5M swing low liquidity from 2026-01-16T10:05:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - An opposing FVG defended before T1, so the path did not deliver cleanly to liquidity.
- Open FVGs below at proof: 15m LONG 7091.25-7094.00 created 2026-01-16T11:30:00 status open_untouched; 5m LONG 7086.25-7087.75 created 2026-01-16T11:05:00 status open_untouched; 240m LONG 7078.00-7081.25 created 2026-01-15T06:00:00 status open_untouched; 5m LONG 7079.50-7080.25 created 2026-01-16T10:55:00 status open_untouched; 15m LONG 7070.75-7074.50 created 2026-01-15T00:30:00 status partial_touch; 60m LONG 7073.00-7074.00 created 2026-01-15T02:00:00 status partial_touch; 5m LONG 7071.75-7073.50 created 2026-01-15T00:15:00 status partial_touch; 5m LONG 7070.25-7071.50 created 2026-01-15T00:10:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7100.00-7101.50 created 2025-12-26T10:00:00 status failed_inverted; 5m SHORT 7100.00-7102.25 created 2026-01-07T14:20:00 status failed_inverted; 5m SHORT 7100.00-7101.00 created 2026-01-15T15:20:00 status failed_inverted; 15m SHORT 7100.00-7101.75 created 2025-10-28T19:00:00 status failed_inverted; 15m LONG 7100.00-7100.25 created 2025-10-28T21:30:00 status failed_inverted; 15m SHORT 7100.00-7105.50 created 2026-01-07T14:30:00 status failed_inverted; 15m SHORT 7100.00-7100.75 created 2026-01-15T15:30:00 status failed_inverted; 5m SHORT 7100.25-7101.50 created 2025-10-28T18:45:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7101.75-7102.50 created 2026-01-16T12:00:00 status open_untouched; 5m SHORT 7114.50-7115.00 created 2026-01-16T06:45:00 status partial_touch; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: open_fvg 7091.25 reached 2026-01-16T13:05:00 (15m LONG open FVG open_untouched created 2026-01-16T11:30:00); liquidity 7088.00 reached 2026-01-16T16:00:00 (prior 5M swing low liquidity from 2026-01-16T10:05:00); liquidity 7087.25 not reached (prior 5M swing low liquidity from 2026-01-16T10:20:00); open_fvg 7086.25 not reached (5m LONG open FVG open_untouched created 2026-01-16T11:05:00); open_fvg 7079.50 not reached (5m LONG open FVG open_untouched created 2026-01-16T10:55:00); open_fvg 7078.00 not reached (240m LONG open FVG open_untouched created 2026-01-15T06:00:00); tactical 7077.25 not reached (T1 1.5R); liquidity 7073.25 not reached (prior 5M swing low liquidity from 2026-01-16T10:45:00); session_extreme 7073.25 not reached (RTH low liquidity before proof); open_fvg 7073.00 not reached (60m LONG open FVG partial_touch created 2026-01-15T02:00:00); open_fvg 7071.75 not reached (5m LONG open FVG partial_touch created 2026-01-15T00:15:00); open_fvg 7070.75 not reached (15m LONG open FVG partial_touch created 2026-01-15T00:30:00); open_fvg 7070.25 not reached (5m LONG open FVG open_untouched created 2026-01-15T00:10:00); tactical 7069.75 not reached (T2 2.0R)
- Story: SHORT proof completed at 2026-01-16T12:00:00 from 7100.50-7103.00. 13 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 15m 7091.25-7094.00 with reaction obstacle_defended_continuation_failed. Structural objectives reached after proof: 7091.25 open_fvg, 7088.00 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-01-16T16:00:00, one MES +$52.50
- Managed outcome: LQ1 at 2026-01-16T16:00:00, exit 7088.00, one MES +$58.75
- Reasons: Qualified by this diagnostic heuristic.

### 2. LONG 15M FVG 7091.25-7094.00 created 2026-01-16T11:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-16T11:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-16T16:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-16T16:00:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-16T11:00:00
- Parent failure: 2026-01-16T16:00:00
- First 5M return: 2026-01-16T16:00:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return.

### 3. LONG 15M FVG 7100.25-7100.50 created 2026-01-16T13:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-16T14:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-16T14:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-16T14:55:00, 2026-01-16T15:05:00, 2026-01-16T15:10:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-16T14:55:00. | PASS entry_stop_risk_contract: Entry 7102.25, protected 5M stop 7090.75, risk 11.50 pts. | PASS tactical_targets_from_actual_risk: T1 7119.50 and T2 7125.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7102.50.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-01-16T14:00:00
- First 5M return: 2026-01-16T14:00:00
- 5M wick defense: 2026-01-16T14:55:00, 2026-01-16T15:05:00, 2026-01-16T15:10:00
- Proof: 2026-01-16T14:55:00
- Entry/stop/risk: 7102.25 / 7090.75 / 11.50 pts
- T1/T2: 7119.50 / 7125.25
- Nearest liquidity: nearest prior high liquidity 7102.50
- Opposing FVG obstacle before T1: 5m SHORT 7102.50-7103.25 created 2026-01-15T07:10:00 status failed_inverted
- Opposing FVG reaction: obstacle_defended_continuation_failed at 2026-01-16T15:00:00
- Meaningful liquidity target before T1: 7107.75 (prior 5M swing high liquidity from 2026-01-16T11:50:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7099.00-7099.50 created 2026-01-16T14:45:00 status open_untouched; 5m LONG 7086.25-7087.75 created 2026-01-16T11:05:00 status open_untouched; 5m LONG 7079.50-7080.25 created 2026-01-16T10:55:00 status open_untouched; 15m LONG 7070.75-7074.50 created 2026-01-15T00:30:00 status partial_touch; 60m LONG 7073.00-7074.00 created 2026-01-15T02:00:00 status partial_touch; 5m LONG 7071.75-7073.50 created 2026-01-15T00:15:00 status partial_touch; 5m LONG 7070.25-7071.50 created 2026-01-15T00:10:00 status open_untouched; 120m LONG 7057.50-7057.75 created 2026-01-14T17:00:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7102.50-7103.25 created 2026-01-15T07:10:00 status failed_inverted; 120m LONG 7102.50-7110.75 created 2026-01-09T14:00:00 status failed_inverted; 240m LONG 7102.50-7114.50 created 2026-01-09T17:00:00 status failed_inverted; 5m LONG 7102.75-7103.75 created 2025-10-28T22:00:00 status failed_inverted; 60m LONG 7102.75-7105.00 created 2025-10-28T23:00:00 status failed_inverted; 5m SHORT 7103.00-7104.75 created 2026-01-07T10:10:00 status failed_inverted; 5m LONG 7103.00-7104.00 created 2026-01-09T10:35:00 status failed_inverted; 5m LONG 7103.00-7105.25 created 2026-01-13T10:40:00 status failed_inverted
- Open FVGs above at proof: 240m SHORT 7107.75-7109.50 created 2026-01-16T14:00:00 status open_untouched; 5m SHORT 7114.50-7115.00 created 2026-01-16T06:45:00 status partial_touch; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: liquidity 7102.50 reached 2026-01-16T15:00:00 (prior 5M swing high liquidity from 2026-01-16T12:10:00); liquidity 7102.75 not reached (prior 5M swing high liquidity from 2026-01-16T12:25:00); liquidity 7105.50 not reached (prior 5M swing high liquidity from 2026-01-16T13:35:00); liquidity 7107.75 not reached (prior 5M swing high liquidity from 2026-01-16T11:50:00); open_fvg 7109.50 not reached (240m SHORT open FVG open_untouched created 2026-01-16T14:00:00); liquidity 7110.25 not reached (prior 5M swing high liquidity from 2026-01-16T14:10:00); liquidity 7114.75 not reached (prior 5M swing high liquidity from 2026-01-16T09:35:00); session_extreme 7114.75 not reached (RTH high liquidity before proof); open_fvg 7115.00 not reached (5m SHORT open FVG partial_touch created 2026-01-16T06:45:00); tactical 7119.50 not reached (T1 1.5R); open_fvg 7121.50 not reached (15m SHORT open FVG open_untouched created 2026-01-15T14:30:00); open_fvg 7123.25 not reached (15m SHORT open FVG open_untouched created 2026-01-15T14:15:00); tactical 7125.25 not reached (T2 2.0R); open_fvg 7130.75 not reached (15m SHORT open FVG partial_touch created 2026-01-13T10:00:00)
- Story: LONG proof completed at 2026-01-16T14:55:00 from 7100.25-7100.50. 13 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7102.50-7103.25 with reaction obstacle_defended_continuation_failed. Structural objectives reached after proof: 7102.50 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-01-16T15:50:00, one MES $-57.50
- Managed outcome: Stop at 2026-01-16T15:50:00, exit 7090.75, one MES $-57.50
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic.

### 4. SHORT 15M FVG 7097.75-7098.00 created 2026-01-16T15:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-16T15:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-16T15:55:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-16T15:55:00. | PASS entry_stop_risk_contract: Entry 7096.75, protected 5M stop 7101.75, risk 5.00 pts. | PASS tactical_targets_from_actual_risk: T1 7089.25 and T2 7086.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7096.50.
- Parent displacement: yes
- Parent displacement candle: 2026-01-16T15:30:00
- Parent failure: not found
- First 5M return: 2026-01-16T15:55:00
- 5M wick defense: none
- Proof: 2026-01-16T15:55:00
- Entry/stop/risk: 7096.75 / 7101.75 / 5.00 pts
- T1/T2: 7089.25 / 7086.75
- Nearest liquidity: nearest prior low liquidity 7096.50
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- Meaningful liquidity target before T1: 7091.00 (prior 5M swing low liquidity from 2026-01-16T15:35:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7086.25-7087.75 created 2026-01-16T11:05:00 status open_untouched; 5m LONG 7079.50-7080.25 created 2026-01-16T10:55:00 status open_untouched; 15m LONG 7070.75-7074.50 created 2026-01-15T00:30:00 status partial_touch; 60m LONG 7073.00-7074.00 created 2026-01-15T02:00:00 status partial_touch; 5m LONG 7071.75-7073.50 created 2026-01-15T00:15:00 status partial_touch; 5m LONG 7070.25-7071.50 created 2026-01-15T00:10:00 status open_untouched; 120m LONG 7057.50-7057.75 created 2026-01-14T17:00:00 status open_untouched; 240m LONG 7034.75-7047.75 created 2026-01-05T14:00:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7097.00-7098.00 created 2025-12-26T09:40:00 status failed_inverted; 5m SHORT 7097.00-7097.50 created 2026-01-07T00:55:00 status failed_inverted; 5m LONG 7097.00-7098.75 created 2026-01-07T14:40:00 status failed_inverted; 5m SHORT 7097.00-7098.75 created 2026-01-14T05:25:00 status failed_inverted; 5m SHORT 7097.00-7097.25 created 2026-01-16T12:55:00 status failed_inverted; 5m LONG 7097.00-7097.25 created 2026-01-16T13:15:00 status failed_inverted; 15m SHORT 7097.00-7098.00 created 2025-12-25T21:00:00 status failed_inverted; 5m LONG 7097.25-7102.50 created 2026-01-09T11:10:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7097.75-7098.00 created 2026-01-16T15:45:00 status open_untouched; 5m SHORT 7100.00-7105.50 created 2026-01-16T14:20:00 status partial_touch; 240m SHORT 7107.75-7109.50 created 2026-01-16T14:00:00 status open_untouched; 5m SHORT 7114.50-7115.00 created 2026-01-16T06:45:00 status partial_touch; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: liquidity 7095.25 reached 2026-01-16T16:00:00 (prior 5M swing low liquidity from 2026-01-16T12:35:00); liquidity 7094.25 reached 2026-01-16T16:00:00 (prior 5M swing low liquidity from 2026-01-16T12:00:00); liquidity 7092.75 reached 2026-01-16T16:00:00 (prior 5M swing low liquidity from 2026-01-16T14:30:00); liquidity 7091.00 reached 2026-01-16T16:00:00 (prior 5M swing low liquidity from 2026-01-16T15:35:00); liquidity 7090.75 reached 2026-01-16T16:00:00 (prior 5M swing low liquidity from 2026-01-16T13:05:00); tactical 7089.25 reached 2026-01-16T16:00:00 (T1 1.5R); liquidity 7088.00 reached 2026-01-16T16:00:00 (prior 5M swing low liquidity from 2026-01-16T10:05:00); liquidity 7087.25 not reached (prior 5M swing low liquidity from 2026-01-16T10:20:00); tactical 7086.75 not reached (T2 2.0R); open_fvg 7086.25 not reached (5m LONG open FVG open_untouched created 2026-01-16T11:05:00); open_fvg 7079.50 not reached (5m LONG open FVG open_untouched created 2026-01-16T10:55:00); liquidity 7073.25 not reached (prior 5M swing low liquidity from 2026-01-16T10:45:00); session_extreme 7073.25 not reached (RTH low liquidity before proof); open_fvg 7073.00 not reached (60m LONG open FVG partial_touch created 2026-01-15T02:00:00)
- Story: SHORT proof completed at 2026-01-16T15:55:00 from 7097.75-7098.00. 15 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. No opposing FVG obstacle was loaded before T1. Structural objectives reached after proof: 7095.25 liquidity, 7094.25 liquidity, 7092.75 liquidity, 7091.00 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-16T16:00:00, one MES +$37.50
- Managed outcome: LQ1 at 2026-01-16T16:00:00, exit 7091.00, one MES +$28.75
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone.
