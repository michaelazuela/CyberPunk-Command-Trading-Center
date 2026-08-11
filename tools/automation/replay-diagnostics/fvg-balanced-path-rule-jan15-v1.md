# Jan 15 FVG Balanced Path Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-15 / full-rth (2026-01-15T09:15:00 to 2026-01-15T16:00:00)
Context window: 120 days (2025-09-17T00:00:00 to 2026-01-15T23:59:59)

## Coverage
- 5m: 14984 bars (2025-10-28T18:05:00 to 2026-01-15T23:55:00)
- 15m: 4994 bars (2025-10-28T18:15:00 to 2026-01-15T23:45:00)
- 60m: 1220 bars (2025-10-28T19:00:00 to 2026-01-15T23:00:00)
- 120m: 636 bars (2025-10-28T20:00:00 to 2026-01-15T22:00:00)
- 240m: 318 bars (2025-10-28T22:00:00 to 2026-01-15T22:00:00)

## Research Tags
- none

## Research Rules
- FvgBalancedPathContinuation (research_only_supporting_rule): If price breaks out of a balanced/rebalanced range and no defended opposing FVG appears before the next real-liquidity or open-FVG objective, the move can travel cleanly through that path. This supports continuation and runner management after a valid FVG proof already exists.
  - Required facts: 15M parent FVG setup is valid. | Completed 5M wick-defense/proof exists. | Nearest protected 5M structure stop is known. | Objective ladder has a real liquidity or open-FVG objective ahead. | No opposing FVG/HTF obstacle defends before that objective.
  - Invalidation: Used without 15M parent FVG plus completed 5M proof. | Opposing FVG/HTF obstacle defends before the objective. | The objective was already reached before entry. | Balanced path is treated as a standalone trigger.
  - Standalone trigger: no
  - Label rule: real liquidity is prior swing/session/equal high-low. FVG zones are objective/reaction context and must not be called liquidity.
  - Same-move campaign rule: later same-direction proof after the first valid FVG trade is continuation/management unless a reset or add-on rule is explicitly approved.

## FVG Inventory At Session Start
- Open below: 5m LONG 7112.25-7113.00 created 2026-01-15T09:10:00 status partial_touch; 15m LONG 7109.25-7110.25 created 2026-01-15T09:00:00 status partial_touch; 15m LONG 7098.25-7100.75 created 2026-01-15T04:45:00 status partial_touch; 5m LONG 7098.50-7100.00 created 2026-01-15T04:30:00 status partial_touch; 120m LONG 7092.50-7100.00 created 2026-01-15T08:00:00 status open_untouched; 60m LONG 7092.50-7099.50 created 2026-01-15T06:00:00 status open_untouched; 5m LONG 7094.75-7096.00 created 2026-01-15T04:20:00 status open_untouched; 15m LONG 7091.75-7096.00 created 2026-01-15T04:30:00 status open_untouched; 5m LONG 7093.75-7094.75 created 2026-01-15T04:15:00 status open_untouched; 60m LONG 7088.00-7089.75 created 2026-01-15T05:00:00 status open_untouched
- Failed above: 5m SHORT 7113.50-7114.25 created 2026-01-12T20:45:00 status failed_inverted; 5m LONG 7113.50-7116.75 created 2026-01-12T20:55:00 status failed_inverted; 5m SHORT 7113.75-7114.25 created 2026-01-07T12:55:00 status failed_inverted; 15m SHORT 7114.00-7114.50 created 2026-01-11T18:30:00 status failed_inverted; 5m SHORT 7114.50-7116.50 created 2026-01-11T18:10:00 status failed_inverted; 5m SHORT 7114.50-7115.25 created 2026-01-12T20:40:00 status failed_inverted; 5m LONG 7114.75-7115.25 created 2025-10-29T02:30:00 status failed_inverted; 15m SHORT 7114.75-7115.00 created 2025-10-29T08:45:00 status failed_inverted; 5m LONG 7115.00-7115.50 created 2026-01-09T12:00:00 status failed_inverted; 5m LONG 7115.00-7116.00 created 2026-01-09T13:35:00 status failed_inverted
- Open above: 5m SHORT 7127.75-7129.50 created 2026-01-13T09:50:00 status partial_touch; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch

## Trace Rows

### 1. SHORT 15M FVG 7122.75-7124.25 created 2026-01-15T12:45:00
- Verdict: valid_trace_candidate
- Continuation read: balanced_path_to_liquidity_valid
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-15T12:30:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-15T13:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-15T13:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-15T13:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-15T14:00:00. | PASS entry_stop_risk_contract: Entry 7122.25, protected 5M stop 7130.00, risk 7.75 pts. | PASS tactical_targets_from_actual_risk: T1 7110.75 and T2 7106.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7122.00.
- Parent displacement: yes
- Parent displacement candle: 2026-01-15T12:30:00
- Parent failure: 2026-01-15T13:45:00
- First 5M return: 2026-01-15T13:45:00
- 5M wick defense: 2026-01-15T13:55:00
- Proof: 2026-01-15T14:00:00
- Entry/stop/risk: 7122.25 / 7130.00 / 7.75 pts
- T1/T2: 7110.75 / 7106.75
- Nearest liquidity: nearest prior low liquidity 7122.00
- Opposing FVG obstacle before T1: 5m LONG 7111.50-7118.75 created 2026-01-15T11:05:00 status partial_touch
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-15T14:05:00
- Meaningful liquidity target before T1: 7117.00 (prior 5M swing low liquidity from 2026-01-15T12:40:00)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no opposing FVG defended before delivery.
- Open FVGs below at proof: 5m LONG 7111.50-7118.75 created 2026-01-15T11:05:00 status partial_touch; 15m LONG 7098.25-7100.75 created 2026-01-15T04:45:00 status partial_touch; 5m LONG 7098.50-7100.00 created 2026-01-15T04:30:00 status partial_touch; 120m LONG 7092.50-7100.00 created 2026-01-15T08:00:00 status open_untouched; 240m LONG 7090.50-7100.00 created 2026-01-15T10:00:00 status open_untouched; 60m LONG 7092.50-7099.50 created 2026-01-15T06:00:00 status open_untouched; 5m LONG 7094.75-7096.00 created 2026-01-15T04:20:00 status open_untouched; 15m LONG 7091.75-7096.00 created 2026-01-15T04:30:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7122.50-7123.00 created 2026-01-12T18:10:00 status failed_inverted; 5m SHORT 7122.50-7123.00 created 2026-01-12T18:50:00 status failed_inverted; 5m SHORT 7122.75-7123.75 created 2026-01-09T16:00:00 status failed_inverted; 15m SHORT 7122.75-7124.25 created 2026-01-15T12:45:00 status failed_inverted; 5m LONG 7123.50-7124.50 created 2026-01-13T12:00:00 status failed_inverted; 5m LONG 7123.50-7123.75 created 2026-01-15T13:35:00 status failed_inverted; 5m LONG 7124.25-7125.50 created 2026-01-12T13:10:00 status failed_inverted; 5m LONG 7124.25-7124.50 created 2026-01-13T01:55:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: liquidity 7120.25 reached 2026-01-15T14:05:00 (prior 5M swing low liquidity from 2026-01-15T11:40:00); liquidity 7119.00 reached 2026-01-15T14:05:00 (prior 5M swing low liquidity from 2026-01-15T13:20:00); liquidity 7118.75 reached 2026-01-15T14:05:00 (prior 5M swing low liquidity from 2026-01-15T11:15:00); liquidity 7117.00 reached 2026-01-15T14:05:00 (prior 5M swing low liquidity from 2026-01-15T12:40:00); liquidity 7114.00 reached 2026-01-15T14:10:00 (prior 5M swing low liquidity from 2026-01-15T13:05:00); liquidity 7111.50 reached 2026-01-15T14:30:00 (prior 5M swing low liquidity from 2026-01-15T10:30:00); open_fvg 7111.50 reached 2026-01-15T14:30:00 (5m LONG open FVG partial_touch created 2026-01-15T11:05:00); tactical 7110.75 reached 2026-01-15T14:30:00 (T1 1.5R); liquidity 7108.00 reached 2026-01-15T14:35:00 (prior 5M swing low liquidity from 2026-01-15T10:10:00); liquidity 7107.25 reached 2026-01-15T14:35:00 (prior 5M swing low liquidity from 2026-01-15T09:55:00); tactical 7106.75 reached 2026-01-15T14:35:00 (T2 2.0R); session_extreme 7105.00 reached 2026-01-15T14:35:00 (RTH low liquidity before proof); open_fvg 7098.50 reached 2026-01-15T15:05:00 (5m LONG open FVG partial_touch created 2026-01-15T04:30:00); open_fvg 7098.25 reached 2026-01-15T15:20:00 (15m LONG open FVG partial_touch created 2026-01-15T04:45:00)
- Story: SHORT proof completed at 2026-01-15T14:00:00 from 7122.75-7124.25. 9 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7111.50-7118.75 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7120.25 liquidity, 7119.00 liquidity, 7118.75 liquidity, 7117.00 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-15T14:30:00, one MES +$57.50
- Managed outcome: LQ1 at 2026-01-15T14:05:00, exit 7117.00, one MES +$26.25
- Reasons: Qualified by this diagnostic heuristic.
- Human review correction: Trade 1 is the primary Jan 15 short. The earlier 7117 area is FVG/objective/management context, not first real liquidity. The real delivery draw for this short is the 7100 zone. Future reports must not label the nearby FVG/objective area as liquidity.

### 2. SHORT 15M FVG 7122.25-7123.25 created 2026-01-15T14:15:00
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

### 3. SHORT 15M FVG 7120.25-7121.50 created 2026-01-15T14:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-15T14:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-15T14:30:00
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

### 4. SHORT 15M FVG 7112.50-7113.00 created 2026-01-15T14:45:00
- Verdict: valid_trace_candidate
- Continuation read: balanced_path_to_liquidity_valid
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-15T14:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-15T14:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-15T14:45:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-15T14:45:00. | PASS entry_stop_risk_contract: Entry 7108.75, protected 5M stop 7122.25, risk 13.50 pts. | PASS tactical_targets_from_actual_risk: T1 7088.50 and T2 7081.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7108.50.
- Parent displacement: yes
- Parent displacement candle: 2026-01-15T14:30:00
- Parent failure: not found
- First 5M return: 2026-01-15T14:45:00
- 5M wick defense: 2026-01-15T14:45:00
- Proof: 2026-01-15T14:45:00
- Entry/stop/risk: 7108.75 / 7122.25 / 13.50 pts
- T1/T2: 7088.50 / 7081.75
- Nearest liquidity: nearest prior low liquidity 7108.50
- Opposing FVG obstacle before T1: 15m LONG 7098.25-7100.75 created 2026-01-15T04:45:00 status partial_touch
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-15T15:00:00
- Meaningful liquidity target before T1: 7101.25 (RTH low liquidity before proof)
- Balanced path to liquidity: balanced_path_to_liquidity - The first real-liquidity objective sat between entry and T1, was reached, and no opposing FVG defended before delivery.
- Open FVGs below at proof: 15m LONG 7098.25-7100.75 created 2026-01-15T04:45:00 status partial_touch; 5m LONG 7098.50-7100.00 created 2026-01-15T04:30:00 status partial_touch; 120m LONG 7092.50-7100.00 created 2026-01-15T08:00:00 status open_untouched; 240m LONG 7090.50-7100.00 created 2026-01-15T10:00:00 status open_untouched; 60m LONG 7092.50-7099.50 created 2026-01-15T06:00:00 status open_untouched; 5m LONG 7094.75-7096.00 created 2026-01-15T04:20:00 status open_untouched; 15m LONG 7091.75-7096.00 created 2026-01-15T04:30:00 status open_untouched; 5m LONG 7093.75-7094.75 created 2026-01-15T04:15:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7109.00-7111.75 created 2025-10-29T13:30:00 status failed_inverted; 5m LONG 7109.00-7109.25 created 2026-01-13T22:15:00 status failed_inverted; 15m SHORT 7109.00-7110.00 created 2026-01-13T21:00:00 status failed_inverted; 5m LONG 7109.25-7110.25 created 2025-10-29T12:30:00 status failed_inverted; 5m LONG 7109.25-7110.00 created 2026-01-09T11:20:00 status failed_inverted; 15m LONG 7109.25-7110.25 created 2026-01-15T09:00:00 status failed_inverted; 5m LONG 7109.50-7110.25 created 2026-01-13T11:00:00 status failed_inverted; 15m SHORT 7109.50-7110.25 created 2026-01-13T13:15:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7111.25-7115.00 created 2026-01-15T14:35:00 status partial_touch; 15m SHORT 7112.50-7113.00 created 2026-01-15T14:45:00 status open_untouched; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: liquidity 7108.00 reached 2026-01-15T14:50:00 (prior 5M swing low liquidity from 2026-01-15T10:10:00); liquidity 7107.25 reached 2026-01-15T14:50:00 (prior 5M swing low liquidity from 2026-01-15T09:55:00); liquidity 7105.00 reached 2026-01-15T15:00:00 (prior 5M swing low liquidity from 2026-01-15T10:55:00); session_extreme 7101.25 reached 2026-01-15T15:00:00 (RTH low liquidity before proof); open_fvg 7098.50 reached 2026-01-15T15:05:00 (5m LONG open FVG partial_touch created 2026-01-15T04:30:00); open_fvg 7098.25 reached 2026-01-15T15:20:00 (15m LONG open FVG partial_touch created 2026-01-15T04:45:00); open_fvg 7094.75 reached 2026-01-15T15:20:00 (5m LONG open FVG open_untouched created 2026-01-15T04:20:00); open_fvg 7093.75 reached 2026-01-15T15:20:00 (5m LONG open FVG open_untouched created 2026-01-15T04:15:00); open_fvg 7092.50 reached 2026-01-15T15:20:00 (120m LONG open FVG open_untouched created 2026-01-15T08:00:00); open_fvg 7092.50 reached 2026-01-15T15:20:00 (60m LONG open FVG open_untouched created 2026-01-15T06:00:00); open_fvg 7091.75 reached 2026-01-15T15:20:00 (15m LONG open FVG open_untouched created 2026-01-15T04:30:00); open_fvg 7090.50 reached 2026-01-15T15:25:00 (240m LONG open FVG open_untouched created 2026-01-15T10:00:00); tactical 7088.50 reached 2026-01-15T15:25:00 (T1 1.5R); tactical 7081.75 not reached (T2 2.0R)
- Story: SHORT proof completed at 2026-01-15T14:45:00 from 7112.50-7113.00. 13 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 15m 7098.25-7100.75 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7108.00 liquidity, 7107.25 liquidity, 7105.00 liquidity, 7101.25 session_extreme. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-15T15:25:00, one MES +$101.25
- Managed outcome: LQ1 at 2026-01-15T15:00:00, exit 7101.25, one MES +$37.50
- Reasons: No 15M acceptance through the parent FVG was found inside this session window.
- Human review correction: Trade 2 is valid, but it should be treated as continuation/management from Trade 1 by default, not a separate fresh campaign unless a reset or add-on rule is approved. The real liquidity draw remains the 7100 zone; nearby 5M/15M FVG areas are objective/reaction context, not liquidity.

### 5. SHORT 15M FVG 7100.00-7100.75 created 2026-01-15T15:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-15T15:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-15T15:00:00
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

### 6. SHORT 15M FVG 7097.50-7098.50 created 2026-01-15T15:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-15T16:00:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-15T16:00:00. | PASS entry_stop_risk_contract: Entry 7096.75, protected 5M stop 7105.50, risk 8.75 pts. | PASS tactical_targets_from_actual_risk: T1 7083.75 and T2 7079.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7096.50.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-01-15T16:00:00
- 5M wick defense: none
- Proof: 2026-01-15T16:00:00
- Entry/stop/risk: 7096.75 / 7105.50 / 8.75 pts
- T1/T2: 7083.75 / 7079.25
- Nearest liquidity: nearest prior low liquidity 7096.50
- Opposing FVG obstacle before T1: 5m LONG 7085.25-7087.25 created 2026-01-15T03:15:00 status partial_touch
- Opposing FVG reaction: obstacle_before_t1_not_reached
- Meaningful liquidity target before T1: 7087.50 (prior 5M swing low liquidity from 2026-01-15T15:25:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7085.25-7087.25 created 2026-01-15T03:15:00 status partial_touch; 15m LONG 7085.50-7086.00 created 2026-01-15T03:30:00 status open_untouched; 120m LONG 7076.00-7081.25 created 2026-01-15T04:00:00 status open_untouched; 240m LONG 7078.00-7081.25 created 2026-01-15T06:00:00 status open_untouched; 5m LONG 7078.25-7080.00 created 2026-01-15T01:20:00 status open_untouched; 15m LONG 7070.75-7074.50 created 2026-01-15T00:30:00 status partial_touch; 60m LONG 7073.00-7074.00 created 2026-01-15T02:00:00 status open_untouched; 5m LONG 7071.75-7073.50 created 2026-01-15T00:15:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7097.00-7098.00 created 2025-12-26T09:40:00 status failed_inverted; 5m SHORT 7097.00-7097.50 created 2026-01-07T00:55:00 status failed_inverted; 5m LONG 7097.00-7098.75 created 2026-01-07T14:40:00 status failed_inverted; 5m SHORT 7097.00-7098.75 created 2026-01-14T05:25:00 status failed_inverted; 15m SHORT 7097.00-7098.00 created 2025-12-25T21:00:00 status failed_inverted; 5m LONG 7097.25-7102.50 created 2026-01-09T11:10:00 status failed_inverted; 15m LONG 7097.25-7100.50 created 2025-10-29T20:30:00 status failed_inverted; 60m LONG 7097.25-7098.75 created 2025-10-29T22:00:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7097.50-7098.50 created 2026-01-15T15:45:00 status partial_touch; 5m SHORT 7100.00-7101.00 created 2026-01-15T15:20:00 status open_untouched; 15m SHORT 7100.00-7100.75 created 2026-01-15T15:30:00 status open_untouched; 5m SHORT 7105.00-7106.25 created 2026-01-15T15:05:00 status partial_touch; 60m SHORT 7105.50-7114.00 created 2026-01-15T16:00:00 status open_untouched; 5m SHORT 7111.25-7115.00 created 2026-01-15T14:35:00 status partial_touch; 15m SHORT 7112.50-7113.00 created 2026-01-15T14:45:00 status open_untouched; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched
- Objective ladder: liquidity 7087.50 not reached (prior 5M swing low liquidity from 2026-01-15T15:25:00); session_extreme 7087.50 not reached (RTH low liquidity before proof); open_fvg 7085.50 not reached (15m LONG open FVG open_untouched created 2026-01-15T03:30:00); open_fvg 7085.25 not reached (5m LONG open FVG partial_touch created 2026-01-15T03:15:00); tactical 7083.75 not reached (T1 1.5R); tactical 7079.25 not reached (T2 2.0R); open_fvg 7078.25 not reached (5m LONG open FVG open_untouched created 2026-01-15T01:20:00); open_fvg 7078.00 not reached (240m LONG open FVG open_untouched created 2026-01-15T06:00:00); open_fvg 7076.00 not reached (120m LONG open FVG open_untouched created 2026-01-15T04:00:00); open_fvg 7073.00 not reached (60m LONG open FVG open_untouched created 2026-01-15T02:00:00); open_fvg 7071.75 not reached (5m LONG open FVG open_untouched created 2026-01-15T00:15:00); open_fvg 7070.75 not reached (15m LONG open FVG partial_touch created 2026-01-15T00:30:00)
- Story: SHORT proof completed at 2026-01-15T16:00:00 from 7097.50-7098.50. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7085.25-7087.25 with reaction obstacle_before_t1_not_reached. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone.
