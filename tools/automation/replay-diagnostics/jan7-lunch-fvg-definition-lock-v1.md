# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-07 / lunch (2026-01-07T12:00:00 to 2026-01-07T16:00:00)

## Coverage
- 5m: 899 bars (2026-01-04T18:05:00 to 2026-01-07T23:55:00)
- 15m: 299 bars (2026-01-04T18:15:00 to 2026-01-07T23:45:00)
- 60m: 74 bars (2026-01-04T19:00:00 to 2026-01-07T23:00:00)
- 120m: 38 bars (2026-01-04T20:00:00 to 2026-01-07T22:00:00)
- 240m: 19 bars (2026-01-04T22:00:00 to 2026-01-07T22:00:00)

## FVG Inventory At Session Start
- Open below: 5m LONG 7104.50-7110.75 created 2026-01-07T11:50:00 status partial_touch; 15m LONG 7107.00-7110.00 created 2026-01-07T12:00:00 status open_untouched; 240m LONG 7082.75-7097.50 created 2026-01-06T17:00:00 status partial_touch; 60m LONG 7075.75-7086.25 created 2026-01-06T14:00:00 status open_untouched; 15m LONG 7080.25-7084.00 created 2026-01-06T12:45:00 status open_untouched; 5m LONG 7082.00-7083.75 created 2026-01-06T12:30:00 status open_untouched; 5m LONG 7080.25-7080.75 created 2026-01-06T12:25:00 status open_untouched; 15m LONG 7075.75-7078.75 created 2026-01-06T12:30:00 status open_untouched; 5m LONG 7075.00-7077.75 created 2026-01-06T12:15:00 status open_untouched; 60m LONG 7062.00-7067.25 created 2026-01-06T11:00:00 status partial_touch
- Failed above: none
- Open above: none

## Trace Rows

### 1. LONG 15M FVG 7107.00-7110.00 created 2026-01-07T12:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-07T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-07T13:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-07T13:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-07T13:50:00, 2026-01-07T14:05:00. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-07T11:45:00
- Parent failure: 2026-01-07T13:30:00
- First 5M return: 2026-01-07T13:45:00
- 5M wick defense: 2026-01-07T13:50:00, 2026-01-07T14:05:00
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Reasons: No completed 5M continuation close away from the failed FVG zone was found after the return.

### 2. LONG 15M FVG 7112.25-7114.25 created 2026-01-07T12:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-07T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-07T13:00:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-07T11:45:00
- Parent failure: 2026-01-07T13:00:00
- First 5M return: not found
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Reasons: After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return.

### 3. SHORT 15M FVG 7109.75-7113.00 created 2026-01-07T13:15:00
- Verdict: valid_trace_candidate
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-07T13:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-07T13:55:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-07T13:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-07T13:55:00. | PASS entry_stop_risk_contract: Entry 7109.50, protected 5M stop 7111.00, risk 1.50 pts. | PASS tactical_targets_from_actual_risk: T1 7107.25 and T2 7106.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7108.75.
- Parent displacement: yes
- Parent displacement candle: 2026-01-07T13:00:00
- Parent failure: not found
- First 5M return: 2026-01-07T13:55:00
- 5M wick defense: 2026-01-07T13:55:00
- Proof: 2026-01-07T13:55:00
- Entry/stop/risk: 7109.50 / 7111.00 / 1.50 pts
- T1/T2: 7107.25 / 7106.50
- Nearest liquidity: nearest prior low liquidity 7108.75
- Open FVGs below at proof: 5m LONG 7108.25-7108.50 created 2026-01-07T13:55:00 status open_untouched; 60m LONG 7107.25-7107.50 created 2026-01-07T13:00:00 status open_untouched; 240m LONG 7082.75-7097.50 created 2026-01-06T17:00:00 status partial_touch; 60m LONG 7075.75-7086.25 created 2026-01-06T14:00:00 status open_untouched; 15m LONG 7080.25-7084.00 created 2026-01-06T12:45:00 status open_untouched; 5m LONG 7082.00-7083.75 created 2026-01-06T12:30:00 status open_untouched; 5m LONG 7080.25-7080.75 created 2026-01-06T12:25:00 status open_untouched; 15m LONG 7075.75-7078.75 created 2026-01-06T12:30:00 status open_untouched
- Failed FVGs above at proof: 15m LONG 7112.25-7114.25 created 2026-01-07T12:15:00 status failed_inverted; 5m LONG 7113.00-7114.25 created 2026-01-07T12:05:00 status failed_inverted; 5m LONG 7115.25-7116.25 created 2026-01-07T12:10:00 status failed_inverted; 5m SHORT 7115.50-7115.75 created 2026-01-07T12:40:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7109.75-7113.00 created 2026-01-07T13:15:00 status open_untouched; 5m SHORT 7112.00-7113.00 created 2026-01-07T13:00:00 status open_untouched; 5m SHORT 7113.75-7114.25 created 2026-01-07T12:55:00 status open_untouched
- Objective ladder: open_fvg 7108.25 reached 2026-01-07T14:00:00 (5m LONG open FVG open_untouched created 2026-01-07T13:55:00); tactical 7107.25 reached 2026-01-07T14:00:00 (T1 1.5R); open_fvg 7107.25 reached 2026-01-07T14:00:00 (60m LONG open FVG open_untouched created 2026-01-07T13:00:00); tactical 7106.50 reached 2026-01-07T14:00:00 (T2 2.0R); liquidity 7099.75 reached 2026-01-07T14:15:00 (prior 5M swing low liquidity from 2026-01-07T13:30:00); liquidity 7098.75 reached 2026-01-07T14:15:00 (prior 5M swing low liquidity from 2026-01-07T11:30:00); liquidity 7096.75 reached 2026-01-07T14:15:00 (prior 5M swing low liquidity from 2026-01-07T09:35:00); liquidity 7090.50 reached 2026-01-07T15:15:00 (prior 5M swing low liquidity from 2026-01-07T10:25:00); liquidity 7089.00 reached 2026-01-07T15:15:00 (prior 5M swing low liquidity from 2026-01-07T10:40:00); session_extreme 7089.00 reached 2026-01-07T15:15:00 (RTH low liquidity before proof); open_fvg 7082.75 reached 2026-01-07T15:30:00 (240m LONG open FVG partial_touch created 2026-01-06T17:00:00); open_fvg 7082.00 reached 2026-01-07T15:30:00 (5m LONG open FVG open_untouched created 2026-01-06T12:30:00); open_fvg 7080.25 reached 2026-01-07T15:30:00 (15m LONG open FVG open_untouched created 2026-01-06T12:45:00); open_fvg 7080.25 reached 2026-01-07T15:30:00 (5m LONG open FVG open_untouched created 2026-01-06T12:25:00)
- Story: SHORT proof completed at 2026-01-07T13:55:00 from 7109.75-7113.00. 7 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Structural objectives reached after proof: 7108.25 open_fvg, 7107.25 open_fvg, 7099.75 liquidity, 7098.75 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T2 at 2026-01-07T14:00:00, one MES +$15.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window.

### 4. SHORT 15M FVG 7100.00-7105.50 created 2026-01-07T14:30:00
- Verdict: valid_trace_candidate
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-07T14:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-07T14:35:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-07T14:40:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-07T14:45:00. | PASS entry_stop_risk_contract: Entry 7099.00, protected 5M stop 7101.25, risk 2.25 pts. | PASS tactical_targets_from_actual_risk: T1 7095.75 and T2 7094.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7098.75.
- Parent displacement: yes
- Parent displacement candle: 2026-01-07T14:15:00
- Parent failure: not found
- First 5M return: 2026-01-07T14:35:00
- 5M wick defense: 2026-01-07T14:40:00
- Proof: 2026-01-07T14:45:00
- Entry/stop/risk: 7099.00 / 7101.25 / 2.25 pts
- T1/T2: 7095.75 / 7094.50
- Nearest liquidity: nearest prior low liquidity 7098.75
- Open FVGs below at proof: 240m LONG 7082.75-7097.50 created 2026-01-06T17:00:00 status partial_touch; 60m LONG 7075.75-7086.25 created 2026-01-06T14:00:00 status open_untouched; 15m LONG 7080.25-7084.00 created 2026-01-06T12:45:00 status open_untouched; 5m LONG 7082.00-7083.75 created 2026-01-06T12:30:00 status open_untouched; 5m LONG 7080.25-7080.75 created 2026-01-06T12:25:00 status open_untouched; 15m LONG 7075.75-7078.75 created 2026-01-06T12:30:00 status open_untouched; 5m LONG 7075.00-7077.75 created 2026-01-06T12:15:00 status open_untouched; 60m LONG 7062.00-7067.25 created 2026-01-06T11:00:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7099.50-7100.25 created 2026-01-06T14:20:00 status failed_inverted; 5m SHORT 7099.50-7100.25 created 2026-01-06T23:05:00 status failed_inverted; 5m SHORT 7099.75-7101.50 created 2026-01-07T09:10:00 status failed_inverted; 5m SHORT 7100.25-7100.75 created 2026-01-06T15:00:00 status failed_inverted; 5m LONG 7100.25-7100.50 created 2026-01-06T15:10:00 status failed_inverted; 5m SHORT 7100.25-7101.50 created 2026-01-06T20:25:00 status failed_inverted; 5m SHORT 7100.25-7100.75 created 2026-01-06T21:35:00 status failed_inverted; 5m LONG 7100.25-7100.50 created 2026-01-06T21:45:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7100.00-7102.25 created 2026-01-07T14:20:00 status partial_touch; 15m SHORT 7100.00-7105.50 created 2026-01-07T14:30:00 status partial_touch; 5m SHORT 7103.50-7105.50 created 2026-01-07T14:15:00 status open_untouched; 15m SHORT 7109.75-7113.00 created 2026-01-07T13:15:00 status partial_touch; 5m SHORT 7112.00-7113.00 created 2026-01-07T13:00:00 status open_untouched; 5m SHORT 7113.75-7114.25 created 2026-01-07T12:55:00 status open_untouched
- Objective ladder: liquidity 7098.75 reached 2026-01-07T14:50:00 (prior 5M swing low liquidity from 2026-01-07T11:30:00); liquidity 7096.75 reached 2026-01-07T14:55:00 (prior 5M swing low liquidity from 2026-01-07T09:35:00); tactical 7095.75 reached 2026-01-07T15:05:00 (T1 1.5R); tactical 7094.50 reached 2026-01-07T15:10:00 (T2 2.0R); liquidity 7094.00 reached 2026-01-07T15:10:00 (prior 5M swing low liquidity from 2026-01-07T14:20:00); liquidity 7090.50 reached 2026-01-07T15:15:00 (prior 5M swing low liquidity from 2026-01-07T10:25:00); liquidity 7089.00 reached 2026-01-07T15:15:00 (prior 5M swing low liquidity from 2026-01-07T10:40:00); session_extreme 7089.00 reached 2026-01-07T15:15:00 (RTH low liquidity before proof); open_fvg 7082.75 reached 2026-01-07T15:30:00 (240m LONG open FVG partial_touch created 2026-01-06T17:00:00); open_fvg 7082.00 reached 2026-01-07T15:30:00 (5m LONG open FVG open_untouched created 2026-01-06T12:30:00); open_fvg 7080.25 reached 2026-01-07T15:30:00 (15m LONG open FVG open_untouched created 2026-01-06T12:45:00); open_fvg 7080.25 reached 2026-01-07T15:30:00 (5m LONG open FVG open_untouched created 2026-01-06T12:25:00); open_fvg 7075.75 reached 2026-01-07T15:40:00 (60m LONG open FVG open_untouched created 2026-01-06T14:00:00); open_fvg 7075.75 reached 2026-01-07T15:40:00 (15m LONG open FVG open_untouched created 2026-01-06T12:30:00)
- Story: SHORT proof completed at 2026-01-07T14:45:00 from 7100.00-7105.50. 14 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Structural objectives reached after proof: 7098.75 liquidity, 7096.75 liquidity, 7094.00 liquidity, 7090.50 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-07T15:05:00, one MES +$16.25
- Reasons: No 15M acceptance through the parent FVG was found inside this session window.

### 5. SHORT 15M FVG 7090.50-7096.75 created 2026-01-07T15:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-07T15:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-07T15:15:00
- Parent failure: not found
- First 5M return: not found
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return.

### 6. SHORT 15M FVG 7083.00-7086.50 created 2026-01-07T15:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-07T15:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-07T15:15:00
- Parent failure: not found
- First 5M return: not found
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return.

### 7. SHORT 15M FVG 7079.00-7080.25 created 2026-01-07T16:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-07T15:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-07T15:45:00
- Parent failure: not found
- First 5M return: not found
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return.
