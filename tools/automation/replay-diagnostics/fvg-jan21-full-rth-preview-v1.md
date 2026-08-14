# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-21 / full-rth (2026-01-21T09:15:00 to 2026-01-21T16:00:00)
Context window: 120 days (2025-09-23T00:00:00 to 2026-01-21T23:59:59)

## Coverage
- 5m: 16040 bars (2025-10-28T18:05:00 to 2026-01-21T23:55:00)
- 15m: 5346 bars (2025-10-28T18:15:00 to 2026-01-21T23:45:00)
- 60m: 1308 bars (2025-10-28T19:00:00 to 2026-01-21T23:00:00)
- 120m: 682 bars (2025-10-28T20:00:00 to 2026-01-21T22:00:00)
- 240m: 341 bars (2025-10-28T22:00:00 to 2026-01-21T22:00:00)

## Research Tags
- none

## Research Rules
- FvgBalancedPathContinuation (research_only_supporting_rule): If price breaks out of a balanced/rebalanced range and no defended opposing FVG appears before the next real-liquidity or open-FVG objective, the move can travel cleanly through that path. This supports continuation and runner management after a valid FVG proof already exists.
  - Required facts: 15M parent FVG setup is valid. | Completed 5M wick-defense/proof exists. | Nearest protected 5M structure stop is known. | Objective ladder has a real liquidity or open-FVG objective ahead. | No opposing FVG/HTF obstacle defends before that objective.
  - Invalidation: Used without 15M parent FVG plus completed 5M proof. | Opposing FVG/HTF obstacle defends before the objective. | The objective was already reached before entry. | Balanced path is treated as a standalone trigger.
  - Standalone trigger: no

## FVG Inventory At Session Start
- Open below: 120m SHORT 6955.50-6959.25 created 2026-01-21T08:00:00 status open_untouched; 60m SHORT 6941.75-6947.75 created 2026-01-21T08:00:00 status partial_touch; 5m LONG 6944.75-6945.25 created 2026-01-21T09:10:00 status open_untouched; 15m LONG 6923.00-6940.50 created 2025-12-18T09:00:00 status partial_touch; 5m LONG 6923.00-6927.25 created 2025-12-18T08:40:00 status partial_touch; 240m LONG 6921.00-6924.50 created 2025-12-18T14:00:00 status open_untouched; 5m LONG 6918.50-6920.25 created 2025-12-18T08:20:00 status partial_touch; 15m LONG 6919.75-6920.00 created 2025-12-18T08:30:00 status open_untouched; 15m LONG 6913.25-6916.75 created 2025-12-18T05:00:00 status partial_touch; 240m LONG 6902.00-6913.50 created 2025-12-18T10:00:00 status open_untouched
- Failed above: 5m LONG 6967.00-6968.25 created 2025-11-05T03:35:00 status failed_inverted; 240m LONG 6967.00-6979.50 created 2025-12-19T14:00:00 status failed_inverted; 5m SHORT 6967.25-6967.50 created 2025-11-05T00:45:00 status failed_inverted; 5m LONG 6967.25-6969.00 created 2025-12-18T13:40:00 status failed_inverted; 15m SHORT 6967.25-6968.50 created 2025-11-17T04:30:00 status failed_inverted; 15m SHORT 6967.25-6968.25 created 2026-01-21T03:15:00 status failed_inverted; 120m LONG 6967.25-6969.00 created 2025-11-10T00:00:00 status failed_inverted; 5m LONG 6967.50-6968.50 created 2025-12-16T03:55:00 status failed_inverted; 5m LONG 6967.50-6970.00 created 2025-12-16T15:30:00 status failed_inverted; 5m SHORT 6968.00-6969.00 created 2025-11-04T18:55:00 status failed_inverted
- Open above: 15m SHORT 6973.75-6977.75 created 2026-01-20T13:45:00 status open_untouched; 5m SHORT 6975.50-6976.00 created 2026-01-20T13:30:00 status open_untouched; 15m SHORT 6983.00-6990.75 created 2026-01-20T13:00:00 status partial_touch; 60m SHORT 6984.50-6993.00 created 2026-01-20T14:00:00 status open_untouched; 15m SHORT 6993.50-6995.50 created 2026-01-20T12:45:00 status open_untouched; 5m SHORT 7003.00-7003.25 created 2026-01-20T12:15:00 status open_untouched; 5m SHORT 7018.00-7018.25 created 2026-01-20T01:05:00 status open_untouched; 5m SHORT 7021.50-7022.50 created 2026-01-19T23:15:00 status partial_touch; 15m SHORT 7021.50-7022.50 created 2026-01-19T23:30:00 status partial_touch; 60m SHORT 7022.00-7022.50 created 2026-01-20T01:00:00 status open_untouched

## Trace Rows

### 1. LONG 15M FVG 6944.75-6957.50 created 2026-01-21T09:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-21T09:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-21T12:15:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-21T12:20:00. | PASS entry_stop_risk_contract: Entry 6962.25, protected 5M stop 6930.50, risk 31.75 pts. | PASS tactical_targets_from_actual_risk: T1 7010.00 and T2 7025.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 6962.50.
- Parent displacement: yes
- Parent displacement candle: 2026-01-21T09:15:00
- Parent failure: not found
- First 5M return: 2026-01-21T12:15:00
- 5M wick defense: none
- Proof: 2026-01-21T12:20:00
- Entry/stop/risk: 6962.25 / 6930.50 / 31.75 pts
- T1/T2: 7010.00 / 7025.75
- Nearest liquidity: nearest prior high liquidity 6962.50
- Opposing FVG obstacle before T1: 5m SHORT 6962.50-6963.75 created 2025-11-05T02:20:00 status failed_inverted
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-21T12:25:00
- Meaningful liquidity target before T1: 6978.50 (prior 5M swing high liquidity from 2026-01-21T09:25:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 15m LONG 6944.75-6957.50 created 2026-01-21T09:30:00 status partial_touch; 5m LONG 6944.75-6945.25 created 2026-01-21T09:10:00 status open_untouched; 15m LONG 6923.00-6940.50 created 2025-12-18T09:00:00 status partial_touch; 5m LONG 6923.00-6927.25 created 2025-12-18T08:40:00 status partial_touch; 240m LONG 6921.00-6924.50 created 2025-12-18T14:00:00 status open_untouched; 5m LONG 6918.50-6920.25 created 2025-12-18T08:20:00 status partial_touch; 15m LONG 6919.75-6920.00 created 2025-12-18T08:30:00 status open_untouched; 15m LONG 6913.25-6916.75 created 2025-12-18T05:00:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 6962.50-6963.75 created 2025-11-05T02:20:00 status failed_inverted; 5m LONG 6962.50-6964.00 created 2025-12-16T15:10:00 status failed_inverted; 5m SHORT 6962.50-6962.75 created 2025-12-16T20:25:00 status failed_inverted; 5m SHORT 6962.50-6964.00 created 2025-12-19T05:10:00 status failed_inverted; 5m LONG 6962.50-6964.00 created 2025-12-19T05:20:00 status failed_inverted; 5m LONG 6962.50-6964.00 created 2026-01-21T00:15:00 status failed_inverted; 5m LONG 6962.50-6964.25 created 2026-01-21T02:15:00 status failed_inverted; 15m SHORT 6962.50-6964.00 created 2025-12-16T23:45:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 6967.75-6968.00 created 2026-01-21T12:15:00 status open_untouched; 15m SHORT 6976.75-6981.00 created 2026-01-21T12:15:00 status open_untouched; 15m SHORT 6988.75-7008.00 created 2026-01-21T12:00:00 status open_untouched; 5m SHORT 6991.00-7004.00 created 2026-01-21T11:45:00 status open_untouched; 5m SHORT 7006.00-7008.00 created 2026-01-21T11:40:00 status open_untouched; 5m SHORT 7021.50-7022.50 created 2026-01-19T23:15:00 status partial_touch; 15m SHORT 7021.50-7022.50 created 2026-01-19T23:30:00 status partial_touch; 60m SHORT 7022.00-7022.50 created 2026-01-20T01:00:00 status open_untouched
- Objective ladder: open_fvg 6968.00 reached 2026-01-21T12:25:00 (5m SHORT open FVG open_untouched created 2026-01-21T12:15:00); liquidity 6978.50 reached 2026-01-21T13:00:00 (prior 5M swing high liquidity from 2026-01-21T09:25:00); open_fvg 6981.00 reached 2026-01-21T13:50:00 (15m SHORT open FVG open_untouched created 2026-01-21T12:15:00); liquidity 7003.75 reached 2026-01-21T14:30:00 (prior 5M swing high liquidity from 2026-01-21T10:20:00); open_fvg 7004.00 reached 2026-01-21T14:30:00 (5m SHORT open FVG open_untouched created 2026-01-21T11:45:00); open_fvg 7008.00 reached 2026-01-21T14:30:00 (15m SHORT open FVG open_untouched created 2026-01-21T12:00:00); open_fvg 7008.00 reached 2026-01-21T14:30:00 (5m SHORT open FVG open_untouched created 2026-01-21T11:40:00); tactical 7010.00 reached 2026-01-21T14:30:00 (T1 1.5R); liquidity 7018.50 reached 2026-01-21T14:30:00 (prior 5M swing high liquidity from 2026-01-21T11:15:00); liquidity 7021.50 reached 2026-01-21T14:35:00 (prior 5M swing high liquidity from 2026-01-21T11:00:00); session_extreme 7021.50 reached 2026-01-21T14:35:00 (RTH high liquidity before proof); open_fvg 7022.50 reached 2026-01-21T14:35:00 (5m SHORT open FVG partial_touch created 2026-01-19T23:15:00); open_fvg 7022.50 reached 2026-01-21T14:35:00 (15m SHORT open FVG partial_touch created 2026-01-19T23:30:00); open_fvg 7022.50 reached 2026-01-21T14:35:00 (60m SHORT open FVG open_untouched created 2026-01-20T01:00:00)
- Story: LONG proof completed at 2026-01-21T12:20:00 from 6944.75-6957.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 6962.50-6963.75 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 6968.00 open_fvg, 6978.50 liquidity, 6981.00 open_fvg, 7003.75 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-21T14:30:00, one MES +$238.75
- Managed outcome: LQ1 at 2026-01-21T13:00:00, exit 6978.50, one MES +$81.25
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone.

### 2. LONG 15M FVG 6976.25-6985.50 created 2026-01-21T10:15:00
- Verdict: valid_trace_candidate
- Continuation read: obstacle_defended_continuation_failed
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-21T10:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-21T12:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-21T12:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-21T13:00:00, 2026-01-21T13:35:00, 2026-01-21T13:40:00, 2026-01-21T14:00:00, 2026-01-21T14:25:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-21T14:30:00. | PASS entry_stop_risk_contract: Entry 7014.25, protected 5M stop 6950.00, risk 64.25 pts. | PASS tactical_targets_from_actual_risk: T1 7110.75 and T2 7142.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7014.50.
- Parent displacement: yes
- Parent displacement candle: 2026-01-21T10:00:00
- Parent failure: 2026-01-21T12:00:00
- First 5M return: 2026-01-21T12:00:00
- 5M wick defense: 2026-01-21T13:00:00, 2026-01-21T13:35:00, 2026-01-21T13:40:00, 2026-01-21T14:00:00, 2026-01-21T14:25:00
- Proof: 2026-01-21T14:30:00
- Entry/stop/risk: 7014.25 / 6950.00 / 64.25 pts
- T1/T2: 7110.75 / 7142.75
- Nearest liquidity: nearest prior high liquidity 7014.50
- Opposing FVG obstacle before T1: 5m LONG 7014.50-7015.00 created 2025-12-02T08:05:00 status failed_inverted
- Opposing FVG reaction: obstacle_defended_continuation_failed at 2026-01-21T14:35:00
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 60m LONG 6944.75-6985.50 created 2026-01-21T11:00:00 status partial_touch; 60m SHORT 6979.00-6985.50 created 2026-01-21T13:00:00 status partial_touch; 15m LONG 6944.75-6957.50 created 2026-01-21T09:30:00 status partial_touch; 5m LONG 6944.75-6945.25 created 2026-01-21T09:10:00 status open_untouched; 15m LONG 6923.00-6940.50 created 2025-12-18T09:00:00 status partial_touch; 5m LONG 6923.00-6927.25 created 2025-12-18T08:40:00 status partial_touch; 240m LONG 6921.00-6924.50 created 2025-12-18T14:00:00 status open_untouched; 5m LONG 6918.50-6920.25 created 2025-12-18T08:20:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7014.50-7015.00 created 2025-12-02T08:05:00 status failed_inverted; 5m LONG 7014.50-7023.00 created 2025-12-02T10:50:00 status failed_inverted; 5m LONG 7014.50-7015.25 created 2026-01-01T19:25:00 status failed_inverted; 5m SHORT 7014.50-7015.00 created 2026-01-02T16:45:00 status failed_inverted; 15m LONG 7014.50-7015.25 created 2026-01-04T18:30:00 status failed_inverted; 15m LONG 7014.50-7017.75 created 2026-01-19T08:00:00 status failed_inverted; 5m LONG 7014.75-7017.75 created 2025-12-01T11:50:00 status failed_inverted; 5m LONG 7014.75-7015.00 created 2025-12-02T18:05:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7021.50-7022.50 created 2026-01-19T23:15:00 status partial_touch; 15m SHORT 7021.50-7022.50 created 2026-01-19T23:30:00 status partial_touch; 60m SHORT 7022.00-7022.50 created 2026-01-20T01:00:00 status open_untouched; 5m SHORT 7029.25-7031.50 created 2026-01-19T04:10:00 status partial_touch; 240m SHORT 7035.50-7086.25 created 2026-01-19T02:00:00 status partial_touch; 120m SHORT 7040.00-7086.25 created 2026-01-18T22:00:00 status open_untouched; 15m SHORT 7043.25-7089.50 created 2026-01-18T18:30:00 status partial_touch; 60m SHORT 7046.50-7086.25 created 2026-01-18T20:00:00 status open_untouched
- Objective ladder: liquidity 7018.50 reached 2026-01-21T14:35:00 (prior 5M swing high liquidity from 2026-01-21T11:15:00); liquidity 7021.50 reached 2026-01-21T14:35:00 (prior 5M swing high liquidity from 2026-01-21T11:00:00); session_extreme 7021.50 reached 2026-01-21T14:35:00 (RTH high liquidity before proof); open_fvg 7022.50 reached 2026-01-21T14:35:00 (5m SHORT open FVG partial_touch created 2026-01-19T23:15:00); open_fvg 7022.50 reached 2026-01-21T14:35:00 (15m SHORT open FVG partial_touch created 2026-01-19T23:30:00); open_fvg 7022.50 reached 2026-01-21T14:35:00 (60m SHORT open FVG open_untouched created 2026-01-20T01:00:00); open_fvg 7031.50 reached 2026-01-21T14:40:00 (5m SHORT open FVG partial_touch created 2026-01-19T04:10:00); open_fvg 7086.25 not reached (240m SHORT open FVG partial_touch created 2026-01-19T02:00:00); open_fvg 7086.25 not reached (120m SHORT open FVG open_untouched created 2026-01-18T22:00:00); open_fvg 7086.25 not reached (60m SHORT open FVG open_untouched created 2026-01-18T20:00:00); open_fvg 7089.50 not reached (15m SHORT open FVG partial_touch created 2026-01-18T18:30:00); tactical 7110.75 not reached (T1 1.5R); tactical 7142.75 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-01-21T14:30:00 from 6976.25-6985.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7014.50-7015.00 with reaction obstacle_defended_continuation_failed. Structural objectives reached after proof: 7018.50 liquidity, 7021.50 liquidity, 7021.50 session_extreme, 7022.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-01-21T16:00:00, one MES +$47.50
- Managed outcome: SessionClose at 2026-01-21T16:00:00, exit 7023.75, one MES +$47.50
- Reasons: Qualified by this diagnostic heuristic.

### 3. LONG 15M FVG 6997.50-6999.00 created 2026-01-21T10:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-21T10:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-21T11:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-21T14:30:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-21T14:30:00. | PASS entry_stop_risk_contract: Entry 7014.25, protected 5M stop 6973.00, risk 41.25 pts. | PASS tactical_targets_from_actual_risk: T1 7076.25 and T2 7096.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7014.50.
- Parent displacement: yes
- Parent displacement candle: 2026-01-21T10:45:00
- Parent failure: 2026-01-21T11:45:00
- First 5M return: 2026-01-21T14:30:00
- 5M wick defense: none
- Proof: 2026-01-21T14:30:00
- Entry/stop/risk: 7014.25 / 6973.00 / 41.25 pts
- T1/T2: 7076.25 / 7096.75
- Nearest liquidity: nearest prior high liquidity 7014.50
- Opposing FVG obstacle before T1: 5m LONG 7014.50-7015.00 created 2025-12-02T08:05:00 status failed_inverted
- Opposing FVG reaction: obstacle_defended_continuation_failed at 2026-01-21T14:35:00
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 60m LONG 6944.75-6985.50 created 2026-01-21T11:00:00 status partial_touch; 60m SHORT 6979.00-6985.50 created 2026-01-21T13:00:00 status partial_touch; 15m LONG 6944.75-6957.50 created 2026-01-21T09:30:00 status partial_touch; 5m LONG 6944.75-6945.25 created 2026-01-21T09:10:00 status open_untouched; 15m LONG 6923.00-6940.50 created 2025-12-18T09:00:00 status partial_touch; 5m LONG 6923.00-6927.25 created 2025-12-18T08:40:00 status partial_touch; 240m LONG 6921.00-6924.50 created 2025-12-18T14:00:00 status open_untouched; 5m LONG 6918.50-6920.25 created 2025-12-18T08:20:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7014.50-7015.00 created 2025-12-02T08:05:00 status failed_inverted; 5m LONG 7014.50-7023.00 created 2025-12-02T10:50:00 status failed_inverted; 5m LONG 7014.50-7015.25 created 2026-01-01T19:25:00 status failed_inverted; 5m SHORT 7014.50-7015.00 created 2026-01-02T16:45:00 status failed_inverted; 15m LONG 7014.50-7015.25 created 2026-01-04T18:30:00 status failed_inverted; 15m LONG 7014.50-7017.75 created 2026-01-19T08:00:00 status failed_inverted; 5m LONG 7014.75-7017.75 created 2025-12-01T11:50:00 status failed_inverted; 5m LONG 7014.75-7015.00 created 2025-12-02T18:05:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7021.50-7022.50 created 2026-01-19T23:15:00 status partial_touch; 15m SHORT 7021.50-7022.50 created 2026-01-19T23:30:00 status partial_touch; 60m SHORT 7022.00-7022.50 created 2026-01-20T01:00:00 status open_untouched; 5m SHORT 7029.25-7031.50 created 2026-01-19T04:10:00 status partial_touch; 240m SHORT 7035.50-7086.25 created 2026-01-19T02:00:00 status partial_touch; 120m SHORT 7040.00-7086.25 created 2026-01-18T22:00:00 status open_untouched; 15m SHORT 7043.25-7089.50 created 2026-01-18T18:30:00 status partial_touch; 60m SHORT 7046.50-7086.25 created 2026-01-18T20:00:00 status open_untouched
- Objective ladder: liquidity 7018.50 reached 2026-01-21T14:35:00 (prior 5M swing high liquidity from 2026-01-21T11:15:00); liquidity 7021.50 reached 2026-01-21T14:35:00 (prior 5M swing high liquidity from 2026-01-21T11:00:00); session_extreme 7021.50 reached 2026-01-21T14:35:00 (RTH high liquidity before proof); open_fvg 7022.50 reached 2026-01-21T14:35:00 (5m SHORT open FVG partial_touch created 2026-01-19T23:15:00); open_fvg 7022.50 reached 2026-01-21T14:35:00 (15m SHORT open FVG partial_touch created 2026-01-19T23:30:00); open_fvg 7022.50 reached 2026-01-21T14:35:00 (60m SHORT open FVG open_untouched created 2026-01-20T01:00:00); open_fvg 7031.50 reached 2026-01-21T14:40:00 (5m SHORT open FVG partial_touch created 2026-01-19T04:10:00); tactical 7076.25 not reached (T1 1.5R); open_fvg 7086.25 not reached (240m SHORT open FVG partial_touch created 2026-01-19T02:00:00); open_fvg 7086.25 not reached (120m SHORT open FVG open_untouched created 2026-01-18T22:00:00); open_fvg 7086.25 not reached (60m SHORT open FVG open_untouched created 2026-01-18T20:00:00); open_fvg 7089.50 not reached (15m SHORT open FVG partial_touch created 2026-01-18T18:30:00); tactical 7096.75 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-01-21T14:30:00 from 6997.50-6999.00. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7014.50-7015.00 with reaction obstacle_defended_continuation_failed. Structural objectives reached after proof: 7018.50 liquidity, 7021.50 liquidity, 7021.50 session_extreme, 7022.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-01-21T16:00:00, one MES +$47.50
- Managed outcome: SessionClose at 2026-01-21T16:00:00, exit 7023.75, one MES +$47.50
- Reasons: No completed 5M wick-defense candle was found inside the failed FVG zone.

### 4. LONG 15M FVG 7003.75-7014.50 created 2026-01-21T11:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-21T10:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-21T11:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-21T14:30:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-21T14:35:00. | PASS entry_stop_risk_contract: Entry 7024.50, protected 5M stop 6973.00, risk 51.50 pts. | PASS tactical_targets_from_actual_risk: T1 7101.75 and T2 7127.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7024.75.
- Parent displacement: yes
- Parent displacement candle: 2026-01-21T10:45:00
- Parent failure: 2026-01-21T11:45:00
- First 5M return: 2026-01-21T14:30:00
- 5M wick defense: none
- Proof: 2026-01-21T14:35:00
- Entry/stop/risk: 7024.50 / 6973.00 / 51.50 pts
- T1/T2: 7101.75 / 7127.50
- Nearest liquidity: nearest prior high liquidity 7024.75
- Opposing FVG obstacle before T1: 5m SHORT 7024.75-7025.75 created 2025-12-03T04:10:00 status failed_inverted
- Opposing FVG reaction: obstacle_defended_continuation_failed at 2026-01-21T14:40:00
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 15m SHORT 7021.50-7022.50 created 2026-01-19T23:30:00 status partial_touch; 60m SHORT 7022.00-7022.50 created 2026-01-20T01:00:00 status open_untouched; 5m LONG 6978.75-7013.50 created 2026-01-21T14:35:00 status open_untouched; 60m LONG 6944.75-6985.50 created 2026-01-21T11:00:00 status partial_touch; 60m SHORT 6979.00-6985.50 created 2026-01-21T13:00:00 status partial_touch; 15m LONG 6944.75-6957.50 created 2026-01-21T09:30:00 status partial_touch; 5m LONG 6944.75-6945.25 created 2026-01-21T09:10:00 status open_untouched; 15m LONG 6923.00-6940.50 created 2025-12-18T09:00:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7024.75-7025.75 created 2025-12-03T04:10:00 status failed_inverted; 5m SHORT 7024.75-7025.75 created 2025-12-03T05:40:00 status failed_inverted; 5m LONG 7024.75-7025.25 created 2025-12-10T02:30:00 status failed_inverted; 5m LONG 7024.75-7025.75 created 2026-01-05T01:55:00 status failed_inverted; 5m LONG 7024.75-7025.00 created 2026-01-19T22:20:00 status failed_inverted; 15m LONG 7024.75-7025.00 created 2025-12-10T02:45:00 status failed_inverted; 15m SHORT 7024.75-7038.75 created 2025-12-15T10:00:00 status failed_inverted; 5m LONG 7025.00-7025.25 created 2025-12-02T22:25:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7029.25-7031.50 created 2026-01-19T04:10:00 status partial_touch; 240m SHORT 7035.50-7086.25 created 2026-01-19T02:00:00 status partial_touch; 120m SHORT 7040.00-7086.25 created 2026-01-18T22:00:00 status open_untouched; 15m SHORT 7043.25-7089.50 created 2026-01-18T18:30:00 status partial_touch; 60m SHORT 7046.50-7086.25 created 2026-01-18T20:00:00 status open_untouched; 5m SHORT 7047.75-7090.25 created 2026-01-18T18:10:00 status open_untouched; 5m SHORT 7053.75-7090.25 created 2026-01-18T18:05:00 status open_untouched; 15m SHORT 7053.75-7088.75 created 2026-01-18T18:15:00 status open_untouched
- Objective ladder: open_fvg 7031.50 reached 2026-01-21T14:40:00 (5m SHORT open FVG partial_touch created 2026-01-19T04:10:00); open_fvg 7086.25 not reached (240m SHORT open FVG partial_touch created 2026-01-19T02:00:00); open_fvg 7086.25 not reached (120m SHORT open FVG open_untouched created 2026-01-18T22:00:00); open_fvg 7086.25 not reached (60m SHORT open FVG open_untouched created 2026-01-18T20:00:00); open_fvg 7088.75 not reached (15m SHORT open FVG open_untouched created 2026-01-18T18:15:00); open_fvg 7089.50 not reached (15m SHORT open FVG partial_touch created 2026-01-18T18:30:00); open_fvg 7090.25 not reached (5m SHORT open FVG open_untouched created 2026-01-18T18:10:00); open_fvg 7090.25 not reached (5m SHORT open FVG open_untouched created 2026-01-18T18:05:00); tactical 7101.75 not reached (T1 1.5R); tactical 7127.50 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-01-21T14:35:00 from 7003.75-7014.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7024.75-7025.75 with reaction obstacle_defended_continuation_failed. Structural objectives reached after proof: 7031.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-01-21T16:00:00, one MES $-3.75
- Managed outcome: SessionClose at 2026-01-21T16:00:00, exit 7023.75, one MES $-3.75
- Reasons: No completed 5M wick-defense candle was found inside the failed FVG zone.

### 5. SHORT 15M FVG 6988.75-7008.00 created 2026-01-21T12:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-21T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-21T14:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-21T14:30:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-21T11:45:00
- Parent failure: 2026-01-21T14:30:00
- First 5M return: 2026-01-21T14:30:00
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

### 6. SHORT 15M FVG 6976.75-6981.00 created 2026-01-21T12:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-21T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-21T14:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-21T14:30:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-21T11:45:00
- Parent failure: 2026-01-21T14:30:00
- First 5M return: 2026-01-21T14:30:00
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

### 7. LONG 15M FVG 6981.75-7013.50 created 2026-01-21T14:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-21T14:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-21T14:30:00
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

### 8. LONG 15M FVG 7020.25-7041.75 created 2026-01-21T15:00:00
- Verdict: valid_trace_candidate
- Continuation read: obstacle_defended_continuation_failed
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-21T14:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-21T15:10:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-21T15:10:00, 2026-01-21T15:35:00, 2026-01-21T15:50:00, 2026-01-21T15:55:00, 2026-01-21T16:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-21T15:10:00. | PASS entry_stop_risk_contract: Entry 7044.00, protected 5M stop 6967.75, risk 76.25 pts. | PASS tactical_targets_from_actual_risk: T1 7158.50 and T2 7196.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7044.25.
- Parent displacement: yes
- Parent displacement candle: 2026-01-21T14:30:00
- Parent failure: not found
- First 5M return: 2026-01-21T15:10:00
- 5M wick defense: 2026-01-21T15:10:00, 2026-01-21T15:35:00, 2026-01-21T15:50:00, 2026-01-21T15:55:00, 2026-01-21T16:00:00
- Proof: 2026-01-21T15:10:00
- Entry/stop/risk: 7044.00 / 6967.75 / 76.25 pts
- T1/T2: 7158.50 / 7196.50
- Nearest liquidity: nearest prior high liquidity 7044.25
- Opposing FVG obstacle before T1: 5m LONG 7044.25-7048.75 created 2025-11-02T18:05:00 status failed_inverted
- Opposing FVG reaction: obstacle_defended_continuation_failed at 2026-01-21T15:15:00
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 5m LONG 7037.50-7042.75 created 2026-01-21T14:50:00 status partial_touch; 15m LONG 7020.25-7041.75 created 2026-01-21T15:00:00 status open_untouched; 5m LONG 7025.00-7029.75 created 2026-01-21T14:45:00 status open_untouched; 5m LONG 7020.25-7023.00 created 2026-01-21T14:40:00 status open_untouched; 5m LONG 6978.75-7013.50 created 2026-01-21T14:35:00 status open_untouched; 15m LONG 6981.75-7013.50 created 2026-01-21T14:45:00 status open_untouched; 60m LONG 6944.75-6985.50 created 2026-01-21T11:00:00 status partial_touch; 15m LONG 6944.75-6957.50 created 2026-01-21T09:30:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7044.25-7048.75 created 2025-11-02T18:05:00 status failed_inverted; 5m SHORT 7044.25-7045.00 created 2025-12-10T20:55:00 status failed_inverted; 5m LONG 7044.25-7045.00 created 2025-12-23T04:25:00 status failed_inverted; 5m LONG 7044.25-7045.50 created 2025-12-23T10:25:00 status failed_inverted; 5m SHORT 7044.25-7044.75 created 2026-01-02T07:10:00 status failed_inverted; 15m LONG 7044.25-7048.75 created 2025-11-02T18:15:00 status failed_inverted; 15m LONG 7044.25-7046.50 created 2025-12-23T04:45:00 status failed_inverted; 60m SHORT 7044.25-7047.25 created 2025-11-03T21:00:00 status failed_inverted
- Open FVGs above at proof: 60m SHORT 7046.50-7086.25 created 2026-01-18T20:00:00 status partial_touch; 5m SHORT 7047.75-7090.25 created 2026-01-18T18:10:00 status partial_touch; 5m SHORT 7053.75-7090.25 created 2026-01-18T18:05:00 status partial_touch; 15m SHORT 7053.75-7088.75 created 2026-01-18T18:15:00 status partial_touch; 60m SHORT 7053.75-7087.75 created 2026-01-18T19:00:00 status partial_touch; 120m SHORT 7053.75-7087.75 created 2026-01-18T20:00:00 status open_untouched; 240m SHORT 7053.75-7073.25 created 2026-01-18T22:00:00 status open_untouched; 5m SHORT 7100.00-7105.50 created 2026-01-16T14:20:00 status partial_touch
- Objective ladder: session_extreme 7058.00 not reached (RTH high liquidity before proof); open_fvg 7073.25 not reached (240m SHORT open FVG open_untouched created 2026-01-18T22:00:00); open_fvg 7086.25 not reached (60m SHORT open FVG partial_touch created 2026-01-18T20:00:00); open_fvg 7087.75 not reached (60m SHORT open FVG partial_touch created 2026-01-18T19:00:00); open_fvg 7087.75 not reached (120m SHORT open FVG open_untouched created 2026-01-18T20:00:00); open_fvg 7088.75 not reached (15m SHORT open FVG partial_touch created 2026-01-18T18:15:00); open_fvg 7090.25 not reached (5m SHORT open FVG partial_touch created 2026-01-18T18:10:00); open_fvg 7090.25 not reached (5m SHORT open FVG partial_touch created 2026-01-18T18:05:00); open_fvg 7105.50 not reached (5m SHORT open FVG partial_touch created 2026-01-16T14:20:00); tactical 7158.50 not reached (T1 1.5R); tactical 7196.50 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-01-21T15:10:00 from 7020.25-7041.75. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7044.25-7048.75 with reaction obstacle_defended_continuation_failed. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-01-21T16:00:00, one MES $-101.25
- Managed outcome: SessionClose at 2026-01-21T16:00:00, exit 7023.75, one MES $-101.25
- Reasons: No 15M acceptance through the parent FVG was found inside this session window.

### 9. SHORT 15M FVG 7031.50-7039.50 created 2026-01-21T15:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
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
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return.
