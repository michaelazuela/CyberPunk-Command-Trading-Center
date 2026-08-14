# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-22 / full-rth (2026-01-22T09:15:00 to 2026-01-22T16:00:00)
Context window: 120 days (2025-09-24T00:00:00 to 2026-01-22T23:59:59)

## Coverage
- 5m: 16316 bars (2025-10-28T18:05:00 to 2026-01-22T23:55:00)
- 15m: 5438 bars (2025-10-28T18:15:00 to 2026-01-22T23:45:00)
- 60m: 1331 bars (2025-10-28T19:00:00 to 2026-01-22T23:00:00)
- 120m: 694 bars (2025-10-28T20:00:00 to 2026-01-22T22:00:00)
- 240m: 347 bars (2025-10-28T22:00:00 to 2026-01-22T22:00:00)

## Research Tags
- none

## Research Rules
- FvgBalancedPathContinuation (research_only_supporting_rule): If price breaks out of a balanced/rebalanced range and no defended opposing FVG appears before the next real-liquidity or open-FVG objective, the move can travel cleanly through that path. This supports continuation and runner management after a valid FVG proof already exists.
  - Required facts: 15M parent FVG setup is valid. | Completed 5M wick-defense/proof exists. | Nearest protected 5M structure stop is known. | Objective ladder has a real liquidity or open-FVG objective ahead. | No opposing FVG/HTF obstacle defends before that objective.
  - Invalidation: Used without 15M parent FVG plus completed 5M proof. | Opposing FVG/HTF obstacle defends before the objective. | The objective was already reached before entry. | Balanced path is treated as a standalone trigger.
  - Standalone trigger: no

## FVG Inventory At Session Start
- Open below: 5m LONG 7064.50-7065.50 created 2026-01-22T08:55:00 status partial_touch; 60m LONG 7044.75-7059.00 created 2026-01-22T05:00:00 status partial_touch; 120m LONG 7043.25-7059.00 created 2026-01-22T06:00:00 status partial_touch; 15m LONG 7050.50-7052.75 created 2026-01-22T03:45:00 status open_untouched; 15m LONG 7043.50-7047.75 created 2026-01-22T03:30:00 status open_untouched; 5m LONG 7043.25-7046.75 created 2026-01-22T03:10:00 status open_untouched; 5m LONG 7040.75-7041.50 created 2026-01-22T03:05:00 status open_untouched; 60m LONG 7036.25-7041.50 created 2026-01-22T04:00:00 status open_untouched; 5m LONG 7037.50-7038.00 created 2026-01-22T02:50:00 status open_untouched; 15m LONG 7034.25-7038.00 created 2026-01-22T03:00:00 status open_untouched
- Failed above: 5m LONG 7067.75-7068.00 created 2025-11-12T03:50:00 status failed_inverted; 5m LONG 7067.75-7068.00 created 2025-11-12T07:35:00 status failed_inverted; 5m SHORT 7067.75-7068.00 created 2025-12-12T05:40:00 status failed_inverted; 5m LONG 7067.75-7068.00 created 2025-12-12T05:50:00 status failed_inverted; 5m LONG 7067.75-7068.00 created 2025-12-12T07:20:00 status failed_inverted; 15m SHORT 7067.75-7070.25 created 2025-12-10T16:15:00 status failed_inverted; 15m SHORT 7067.75-7069.25 created 2025-12-12T07:00:00 status failed_inverted; 15m SHORT 7067.75-7069.25 created 2026-01-05T12:45:00 status failed_inverted; 5m LONG 7068.00-7068.50 created 2025-12-12T08:00:00 status failed_inverted; 5m LONG 7068.00-7068.25 created 2025-12-23T13:25:00 status failed_inverted
- Open above: 5m SHORT 7100.00-7105.50 created 2026-01-16T14:20:00 status partial_touch; 5m SHORT 7114.50-7115.00 created 2026-01-16T06:45:00 status partial_touch; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch

## Trace Rows

### 1. SHORT 15M FVG 7065.25-7065.75 created 2026-01-22T10:00:00
- Verdict: valid_trace_candidate
- Continuation read: obstacle_defended_continuation_failed
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-22T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-22T11:15:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-22T11:15:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-22T14:50:00, 2026-01-22T14:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-22T14:55:00. | PASS entry_stop_risk_contract: Entry 7064.25, protected 5M stop 7081.50, risk 17.25 pts. | PASS tactical_targets_from_actual_risk: T1 7038.50 and T2 7029.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7064.00.
- Parent displacement: yes
- Parent displacement candle: 2026-01-22T09:45:00
- Parent failure: 2026-01-22T11:15:00
- First 5M return: 2026-01-22T11:15:00
- 5M wick defense: 2026-01-22T14:50:00, 2026-01-22T14:55:00
- Proof: 2026-01-22T14:55:00
- Entry/stop/risk: 7064.25 / 7081.50 / 17.25 pts
- T1/T2: 7038.50 / 7029.75
- Nearest liquidity: nearest prior low liquidity 7064.00
- Opposing FVG obstacle before T1: 5m LONG 7061.50-7061.75 created 2026-01-22T11:15:00 status partial_touch
- Opposing FVG reaction: obstacle_defended_continuation_failed at 2026-01-22T15:00:00
- Meaningful liquidity target before T1: 7054.50 (prior 5M swing low liquidity from 2026-01-22T11:00:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - An opposing FVG defended before T1, so the path did not deliver cleanly to liquidity.
- Open FVGs below at proof: 5m LONG 7061.50-7061.75 created 2026-01-22T11:15:00 status partial_touch; 60m LONG 7036.25-7041.50 created 2026-01-22T04:00:00 status partial_touch; 5m LONG 7037.50-7038.00 created 2026-01-22T02:50:00 status open_untouched; 15m LONG 7034.25-7038.00 created 2026-01-22T03:00:00 status open_untouched; 5m LONG 7034.25-7036.25 created 2026-01-22T02:40:00 status open_untouched; 5m LONG 7030.75-7034.00 created 2026-01-22T02:35:00 status open_untouched; 240m LONG 7021.50-7030.50 created 2026-01-21T22:00:00 status partial_touch; 5m LONG 7026.00-7027.25 created 2026-01-22T01:40:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7064.50-7067.75 created 2025-10-31T10:50:00 status failed_inverted; 5m SHORT 7064.50-7067.25 created 2025-11-12T05:45:00 status failed_inverted; 5m LONG 7064.50-7066.25 created 2025-11-12T05:55:00 status failed_inverted; 5m SHORT 7064.50-7064.75 created 2025-11-12T09:35:00 status failed_inverted; 5m SHORT 7064.50-7065.50 created 2025-12-29T20:00:00 status failed_inverted; 5m SHORT 7064.50-7065.25 created 2025-12-30T01:30:00 status failed_inverted; 5m SHORT 7064.50-7065.00 created 2025-12-30T14:55:00 status failed_inverted; 5m LONG 7064.50-7065.50 created 2026-01-22T08:55:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7071.25-7073.25 created 2026-01-22T14:45:00 status open_untouched; 5m SHORT 7074.25-7075.75 created 2026-01-22T14:40:00 status open_untouched; 5m SHORT 7100.00-7105.50 created 2026-01-16T14:20:00 status partial_touch; 5m SHORT 7114.50-7115.00 created 2026-01-16T06:45:00 status partial_touch; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: liquidity 7063.75 reached 2026-01-22T15:00:00 (prior 5M swing low liquidity from 2026-01-22T12:05:00); open_fvg 7061.50 reached 2026-01-22T15:00:00 (5m LONG open FVG partial_touch created 2026-01-22T11:15:00); liquidity 7054.50 reached 2026-01-22T15:30:00 (prior 5M swing low liquidity from 2026-01-22T11:00:00); tactical 7038.50 not reached (T1 1.5R); liquidity 7038.25 not reached (prior 5M swing low liquidity from 2026-01-22T10:10:00); session_extreme 7038.25 not reached (RTH low liquidity before proof); open_fvg 7037.50 not reached (5m LONG open FVG open_untouched created 2026-01-22T02:50:00); open_fvg 7036.25 not reached (60m LONG open FVG partial_touch created 2026-01-22T04:00:00); open_fvg 7034.25 not reached (15m LONG open FVG open_untouched created 2026-01-22T03:00:00); open_fvg 7034.25 not reached (5m LONG open FVG open_untouched created 2026-01-22T02:40:00); open_fvg 7030.75 not reached (5m LONG open FVG open_untouched created 2026-01-22T02:35:00); tactical 7029.75 not reached (T2 2.0R); open_fvg 7026.00 not reached (5m LONG open FVG open_untouched created 2026-01-22T01:40:00); open_fvg 7021.50 not reached (240m LONG open FVG partial_touch created 2026-01-21T22:00:00)
- Story: SHORT proof completed at 2026-01-22T14:55:00 from 7065.25-7065.75. 15 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7061.50-7061.75 with reaction obstacle_defended_continuation_failed. Structural objectives reached after proof: 7063.75 liquidity, 7061.50 open_fvg, 7054.50 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-01-22T16:00:00, one MES +$30.00
- Managed outcome: LQ1 at 2026-01-22T15:30:00, exit 7054.50, one MES +$48.75
- Reasons: Qualified by this diagnostic heuristic.

### 2. SHORT 15M FVG 7053.75-7059.00 created 2026-01-22T10:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: obstacle_before_t1_manage_or_downgrade
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-22T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-22T10:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-22T10:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-22T11:00:00, 2026-01-22T15:10:00, 2026-01-22T16:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-22T15:30:00. | PASS entry_stop_risk_contract: Entry 7051.00, protected 5M stop 7081.50, risk 30.50 pts. | PASS tactical_targets_from_actual_risk: T1 7005.25 and T2 6990.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7050.75. | FAIL first_valid_same_parent_proof: Earlier same-side completed 5M proof from the same parent displacement already completed at 2026-01-22T14:55:00. Later same-parent rows are management/re-entry context unless a reset rule is explicitly approved.
- Parent displacement: yes
- Parent displacement candle: 2026-01-22T09:45:00
- Parent failure: 2026-01-22T10:45:00
- First 5M return: 2026-01-22T10:45:00
- 5M wick defense: 2026-01-22T11:00:00, 2026-01-22T15:10:00, 2026-01-22T16:00:00
- Proof: 2026-01-22T15:30:00
- Entry/stop/risk: 7051.00 / 7081.50 / 30.50 pts
- T1/T2: 7005.25 / 6990.00
- Nearest liquidity: nearest prior low liquidity 7050.75
- Opposing FVG obstacle before T1: 60m LONG 7036.25-7041.50 created 2026-01-22T04:00:00 status partial_touch
- Opposing FVG reaction: obstacle_before_t1_not_reached
- Meaningful liquidity target before T1: 7038.25 (prior 5M swing low liquidity from 2026-01-22T10:10:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - The near liquidity objective sat in the path but was not reached during the replay window.
- Open FVGs below at proof: 60m LONG 7036.25-7041.50 created 2026-01-22T04:00:00 status partial_touch; 5m LONG 7037.50-7038.00 created 2026-01-22T02:50:00 status open_untouched; 15m LONG 7034.25-7038.00 created 2026-01-22T03:00:00 status open_untouched; 5m LONG 7034.25-7036.25 created 2026-01-22T02:40:00 status open_untouched; 5m LONG 7030.75-7034.00 created 2026-01-22T02:35:00 status open_untouched; 240m LONG 7021.50-7030.50 created 2026-01-21T22:00:00 status partial_touch; 5m LONG 7026.00-7027.25 created 2026-01-22T01:40:00 status open_untouched; 120m LONG 6984.50-7022.75 created 2026-01-21T17:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7051.25-7052.00 created 2025-11-11T20:15:00 status failed_inverted; 5m LONG 7051.25-7053.25 created 2025-12-05T12:00:00 status failed_inverted; 5m LONG 7051.25-7053.75 created 2025-12-05T15:00:00 status failed_inverted; 5m LONG 7051.25-7051.50 created 2026-01-06T04:45:00 status failed_inverted; 5m LONG 7051.50-7055.50 created 2025-11-12T22:35:00 status failed_inverted; 5m SHORT 7051.50-7051.75 created 2025-12-04T23:50:00 status failed_inverted; 5m LONG 7051.50-7052.00 created 2025-12-05T00:00:00 status failed_inverted; 15m SHORT 7051.50-7053.00 created 2025-12-07T19:30:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7053.75-7090.25 created 2026-01-18T18:05:00 status partial_touch; 15m SHORT 7053.75-7088.75 created 2026-01-18T18:15:00 status partial_touch; 60m SHORT 7053.75-7087.75 created 2026-01-18T19:00:00 status partial_touch; 120m SHORT 7053.75-7087.75 created 2026-01-18T20:00:00 status partial_touch; 5m SHORT 7058.00-7060.25 created 2026-01-22T15:30:00 status open_untouched; 15m SHORT 7062.00-7066.75 created 2026-01-22T15:15:00 status partial_touch; 5m SHORT 7065.00-7065.25 created 2026-01-22T15:00:00 status partial_touch; 15m SHORT 7068.25-7074.75 created 2026-01-22T15:00:00 status open_untouched
- Objective ladder: liquidity 7038.25 not reached (prior 5M swing low liquidity from 2026-01-22T10:10:00); session_extreme 7038.25 not reached (RTH low liquidity before proof); open_fvg 7037.50 not reached (5m LONG open FVG open_untouched created 2026-01-22T02:50:00); open_fvg 7036.25 not reached (60m LONG open FVG partial_touch created 2026-01-22T04:00:00); open_fvg 7034.25 not reached (15m LONG open FVG open_untouched created 2026-01-22T03:00:00); open_fvg 7034.25 not reached (5m LONG open FVG open_untouched created 2026-01-22T02:40:00); open_fvg 7030.75 not reached (5m LONG open FVG open_untouched created 2026-01-22T02:35:00); open_fvg 7026.00 not reached (5m LONG open FVG open_untouched created 2026-01-22T01:40:00); open_fvg 7021.50 not reached (240m LONG open FVG partial_touch created 2026-01-21T22:00:00); tactical 7005.25 not reached (T1 1.5R); tactical 6990.00 not reached (T2 2.0R); open_fvg 6984.50 not reached (120m LONG open FVG open_untouched created 2026-01-21T17:00:00)
- Story: SHORT proof completed at 2026-01-22T15:30:00 from 7053.75-7059.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 60m 7036.25-7041.50 with reaction obstacle_before_t1_not_reached. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-01-22T16:00:00, one MES $-36.25
- Managed outcome: SessionClose at 2026-01-22T16:00:00, exit 7058.25, one MES $-36.25
- Reasons: Late same-parent FVG continuation blocked. Earlier same-side completed 5M proof from the same parent displacement already completed at 2026-01-22T14:55:00. Later same-parent rows are management/re-entry context unless a reset rule is explicitly approved.

### 3. LONG 15M FVG 7074.50-7076.50 created 2026-01-22T13:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-22T13:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-22T13:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-22T14:10:00, 2026-01-22T14:20:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-22T14:15:00. | PASS entry_stop_risk_contract: Entry 7076.75, protected 5M stop 7067.50, risk 9.25 pts. | PASS tactical_targets_from_actual_risk: T1 7090.75 and T2 7095.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7077.00.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-01-22T13:45:00
- First 5M return: 2026-01-22T13:45:00
- 5M wick defense: 2026-01-22T14:10:00, 2026-01-22T14:20:00
- Proof: 2026-01-22T14:15:00
- Entry/stop/risk: 7076.75 / 7067.50 / 9.25 pts
- T1/T2: 7090.75 / 7095.25
- Nearest liquidity: nearest prior high liquidity 7077.00
- Opposing FVG obstacle before T1: 5m SHORT 7077.00-7077.50 created 2025-12-29T03:45:00 status failed_inverted
- Opposing FVG reaction: obstacle_defended_continuation_failed at 2026-01-22T14:20:00
- Meaningful liquidity target before T1: 7081.50 (prior 5M swing high liquidity from 2026-01-22T13:05:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7072.00-7074.75 created 2026-01-22T14:10:00 status open_untouched; 5m LONG 7061.50-7061.75 created 2026-01-22T11:15:00 status partial_touch; 60m LONG 7036.25-7041.50 created 2026-01-22T04:00:00 status partial_touch; 5m LONG 7037.50-7038.00 created 2026-01-22T02:50:00 status open_untouched; 15m LONG 7034.25-7038.00 created 2026-01-22T03:00:00 status open_untouched; 5m LONG 7034.25-7036.25 created 2026-01-22T02:40:00 status open_untouched; 5m LONG 7030.75-7034.00 created 2026-01-22T02:35:00 status open_untouched; 240m LONG 7021.50-7030.50 created 2026-01-21T22:00:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7077.00-7077.50 created 2025-12-29T03:45:00 status failed_inverted; 5m LONG 7077.00-7077.50 created 2026-01-12T01:15:00 status failed_inverted; 5m LONG 7077.25-7077.75 created 2025-12-29T06:50:00 status failed_inverted; 5m SHORT 7077.25-7077.50 created 2026-01-07T19:30:00 status failed_inverted; 5m SHORT 7077.25-7077.50 created 2026-01-08T19:00:00 status failed_inverted; 5m SHORT 7077.25-7077.50 created 2026-01-12T01:25:00 status failed_inverted; 5m LONG 7077.50-7079.00 created 2025-10-31T07:55:00 status failed_inverted; 5m LONG 7077.50-7078.25 created 2025-12-11T21:05:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7100.00-7105.50 created 2026-01-16T14:20:00 status partial_touch; 5m SHORT 7114.50-7115.00 created 2026-01-16T06:45:00 status partial_touch; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: liquidity 7078.50 reached 2026-01-22T14:25:00 (prior 5M swing high liquidity from 2026-01-22T13:35:00); liquidity 7081.50 not reached (prior 5M swing high liquidity from 2026-01-22T13:05:00); session_extreme 7081.50 not reached (RTH high liquidity before proof); tactical 7090.75 not reached (T1 1.5R); tactical 7095.25 not reached (T2 2.0R); open_fvg 7105.50 not reached (5m SHORT open FVG partial_touch created 2026-01-16T14:20:00); open_fvg 7115.00 not reached (5m SHORT open FVG partial_touch created 2026-01-16T06:45:00); open_fvg 7121.50 not reached (15m SHORT open FVG open_untouched created 2026-01-15T14:30:00); open_fvg 7123.25 not reached (15m SHORT open FVG open_untouched created 2026-01-15T14:15:00); open_fvg 7130.75 not reached (15m SHORT open FVG partial_touch created 2026-01-13T10:00:00)
- Story: LONG proof completed at 2026-01-22T14:15:00 from 7074.50-7076.50. 13 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7077.00-7077.50 with reaction obstacle_defended_continuation_failed. Structural objectives reached after proof: 7078.50 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-01-22T14:45:00, one MES $-46.25
- Managed outcome: Stop at 2026-01-22T14:45:00, exit 7067.50, one MES $-46.25
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic.

### 4. SHORT 15M FVG 7068.25-7074.75 created 2026-01-22T15:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-22T14:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-22T14:45:00
- Parent failure: not found
- First 5M return: not found
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
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return.

### 5. SHORT 15M FVG 7062.00-7066.75 created 2026-01-22T15:15:00
- Verdict: valid_trace_candidate
- Continuation read: obstacle_before_t1_manage_or_downgrade
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-22T14:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-22T15:15:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-22T15:20:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-22T15:25:00. | PASS entry_stop_risk_contract: Entry 7058.00, protected 5M stop 7077.25, risk 19.25 pts. | PASS tactical_targets_from_actual_risk: T1 7029.25 and T2 7019.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7057.75.
- Parent displacement: yes
- Parent displacement candle: 2026-01-22T14:45:00
- Parent failure: not found
- First 5M return: 2026-01-22T15:15:00
- 5M wick defense: 2026-01-22T15:20:00
- Proof: 2026-01-22T15:25:00
- Entry/stop/risk: 7058.00 / 7077.25 / 19.25 pts
- T1/T2: 7029.25 / 7019.50
- Nearest liquidity: nearest prior low liquidity 7057.75
- Opposing FVG obstacle before T1: 60m LONG 7036.25-7041.50 created 2026-01-22T04:00:00 status partial_touch
- Opposing FVG reaction: obstacle_before_t1_not_reached
- Meaningful liquidity target before T1: 7038.25 (prior 5M swing low liquidity from 2026-01-22T10:10:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - The near liquidity objective sat in the path but was not reached during the replay window.
- Open FVGs below at proof: 60m LONG 7036.25-7041.50 created 2026-01-22T04:00:00 status partial_touch; 5m LONG 7037.50-7038.00 created 2026-01-22T02:50:00 status open_untouched; 15m LONG 7034.25-7038.00 created 2026-01-22T03:00:00 status open_untouched; 5m LONG 7034.25-7036.25 created 2026-01-22T02:40:00 status open_untouched; 5m LONG 7030.75-7034.00 created 2026-01-22T02:35:00 status open_untouched; 240m LONG 7021.50-7030.50 created 2026-01-21T22:00:00 status partial_touch; 5m LONG 7026.00-7027.25 created 2026-01-22T01:40:00 status open_untouched; 120m LONG 6984.50-7022.75 created 2026-01-21T17:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7058.25-7060.75 created 2025-12-31T09:00:00 status failed_inverted; 5m LONG 7058.25-7059.25 created 2026-01-05T20:30:00 status failed_inverted; 15m SHORT 7058.25-7059.50 created 2025-11-11T22:00:00 status failed_inverted; 15m SHORT 7058.25-7059.75 created 2025-11-13T03:15:00 status failed_inverted; 5m LONG 7058.50-7059.75 created 2025-10-31T10:40:00 status failed_inverted; 5m LONG 7058.50-7059.25 created 2025-11-11T21:15:00 status failed_inverted; 5m LONG 7058.50-7058.75 created 2025-12-07T22:05:00 status failed_inverted; 5m SHORT 7058.50-7059.00 created 2025-12-08T06:10:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7062.00-7066.75 created 2026-01-22T15:15:00 status open_untouched; 5m SHORT 7065.00-7065.25 created 2026-01-22T15:00:00 status partial_touch; 15m SHORT 7068.25-7074.75 created 2026-01-22T15:00:00 status open_untouched; 5m SHORT 7071.25-7073.25 created 2026-01-22T14:45:00 status open_untouched; 5m SHORT 7074.25-7075.75 created 2026-01-22T14:40:00 status open_untouched; 5m SHORT 7100.00-7105.50 created 2026-01-16T14:20:00 status partial_touch; 5m SHORT 7114.50-7115.00 created 2026-01-16T06:45:00 status partial_touch; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched
- Objective ladder: liquidity 7055.75 reached 2026-01-22T15:30:00 (prior 5M swing low liquidity from 2026-01-22T15:05:00); liquidity 7054.50 reached 2026-01-22T15:30:00 (prior 5M swing low liquidity from 2026-01-22T11:00:00); liquidity 7038.25 not reached (prior 5M swing low liquidity from 2026-01-22T10:10:00); session_extreme 7038.25 not reached (RTH low liquidity before proof); open_fvg 7037.50 not reached (5m LONG open FVG open_untouched created 2026-01-22T02:50:00); open_fvg 7036.25 not reached (60m LONG open FVG partial_touch created 2026-01-22T04:00:00); open_fvg 7034.25 not reached (15m LONG open FVG open_untouched created 2026-01-22T03:00:00); open_fvg 7034.25 not reached (5m LONG open FVG open_untouched created 2026-01-22T02:40:00); open_fvg 7030.75 not reached (5m LONG open FVG open_untouched created 2026-01-22T02:35:00); tactical 7029.25 not reached (T1 1.5R); open_fvg 7026.00 not reached (5m LONG open FVG open_untouched created 2026-01-22T01:40:00); open_fvg 7021.50 not reached (240m LONG open FVG partial_touch created 2026-01-21T22:00:00); tactical 7019.50 not reached (T2 2.0R); open_fvg 6984.50 not reached (120m LONG open FVG open_untouched created 2026-01-21T17:00:00)
- Story: SHORT proof completed at 2026-01-22T15:25:00 from 7062.00-7066.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 60m 7036.25-7041.50 with reaction obstacle_before_t1_not_reached. Structural objectives reached after proof: 7055.75 liquidity, 7054.50 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-01-22T16:00:00, one MES $-1.25
- Managed outcome: SessionClose at 2026-01-22T16:00:00, exit 7058.25, one MES $-1.25
- Reasons: No 15M acceptance through the parent FVG was found inside this session window.

### 6. SHORT 15M FVG 7052.25-7055.75 created 2026-01-22T15:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-22T15:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-22T16:00:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-22T15:30:00
- Parent failure: 2026-01-22T16:00:00
- First 5M return: not found
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
- Reasons: After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return.
