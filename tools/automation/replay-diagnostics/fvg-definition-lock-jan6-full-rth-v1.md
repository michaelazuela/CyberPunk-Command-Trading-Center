# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-06 / full-rth (2026-01-06T09:15:00 to 2026-01-06T16:00:00)

## Coverage
- 5m: 623 bars (2026-01-04T18:05:00 to 2026-01-06T23:55:00)
- 15m: 207 bars (2026-01-04T18:15:00 to 2026-01-06T23:45:00)
- 60m: 51 bars (2026-01-04T19:00:00 to 2026-01-06T23:00:00)
- 120m: 26 bars (2026-01-04T20:00:00 to 2026-01-06T22:00:00)
- 240m: 13 bars (2026-01-04T22:00:00 to 2026-01-06T22:00:00)

## FVG Inventory At Session Start
- Open below: 60m LONG 7038.50-7047.75 created 2026-01-05T11:00:00 status partial_touch; 120m LONG 7038.50-7047.75 created 2026-01-05T12:00:00 status partial_touch; 240m LONG 7034.75-7047.75 created 2026-01-05T14:00:00 status partial_touch; 15m LONG 7043.50-7045.25 created 2026-01-05T09:45:00 status partial_touch; 15m LONG 7038.50-7041.50 created 2026-01-05T09:30:00 status open_untouched; 5m LONG 7034.25-7035.25 created 2026-01-05T09:05:00 status open_untouched; 15m LONG 7032.50-7035.25 created 2026-01-05T09:15:00 status open_untouched; 5m LONG 7031.75-7032.25 created 2026-01-05T08:55:00 status open_untouched; 5m LONG 7023.50-7028.25 created 2026-01-05T03:20:00 status partial_touch; 15m LONG 7023.75-7028.25 created 2026-01-05T03:30:00 status partial_touch
- Failed above: 5m SHORT 7056.00-7058.00 created 2026-01-05T18:40:00 status failed_inverted; 15m SHORT 7056.00-7056.50 created 2026-01-05T19:00:00 status failed_inverted; 5m SHORT 7057.00-7057.50 created 2026-01-05T16:50:00 status failed_inverted; 5m LONG 7057.00-7057.25 created 2026-01-05T18:05:00 status failed_inverted; 5m LONG 7057.00-7058.25 created 2026-01-05T18:10:00 status failed_inverted; 5m LONG 7057.00-7059.00 created 2026-01-06T07:50:00 status failed_inverted; 15m LONG 7057.00-7059.00 created 2026-01-06T08:00:00 status failed_inverted; 5m LONG 7057.25-7057.75 created 2026-01-05T20:25:00 status failed_inverted; 15m LONG 7057.25-7060.00 created 2026-01-05T20:45:00 status failed_inverted; 60m LONG 7057.50-7059.00 created 2026-01-05T22:00:00 status failed_inverted
- Open above: 60m SHORT 7057.25-7064.50 created 2026-01-06T05:00:00 status partial_touch; 120m SHORT 7057.25-7065.25 created 2026-01-06T06:00:00 status partial_touch; 5m SHORT 7062.50-7065.25 created 2026-01-06T03:10:00 status open_untouched; 5m SHORT 7066.50-7067.00 created 2026-01-06T02:45:00 status open_untouched; 15m SHORT 7068.25-7069.50 created 2026-01-06T02:30:00 status open_untouched; 5m SHORT 7068.75-7069.75 created 2026-01-06T02:10:00 status partial_touch

## Trace Rows

### 1. LONG 15M FVG 7056.75-7058.00 created 2026-01-06T09:45:00
- Verdict: valid_trace_candidate
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-06T09:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-06T09:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-06T09:45:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-06T09:45:00. | PASS entry_stop_risk_contract: Entry 7065.50, protected 5M stop 7058.00, risk 7.50 pts. | PASS tactical_targets_from_actual_risk: T1 7076.75 and T2 7080.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7065.75.
- Parent displacement: yes
- Parent displacement candle: 2026-01-06T09:30:00
- Parent failure: not found
- First 5M return: 2026-01-06T09:45:00
- 5M wick defense: 2026-01-06T09:45:00
- Proof: 2026-01-06T09:45:00
- Entry/stop/risk: 7065.50 / 7058.00 / 7.50 pts
- T1/T2: 7076.75 / 7080.50
- Nearest liquidity: nearest prior high liquidity 7065.75
- Open FVGs below at proof: 120m SHORT 7057.25-7065.25 created 2026-01-06T06:00:00 status partial_touch; 60m SHORT 7057.25-7064.50 created 2026-01-06T05:00:00 status partial_touch; 5m LONG 7056.50-7059.00 created 2026-01-06T09:35:00 status partial_touch; 15m LONG 7056.75-7058.00 created 2026-01-06T09:45:00 status open_untouched; 60m LONG 7038.50-7047.75 created 2026-01-05T11:00:00 status partial_touch; 120m LONG 7038.50-7047.75 created 2026-01-05T12:00:00 status partial_touch; 240m LONG 7034.75-7047.75 created 2026-01-05T14:00:00 status partial_touch; 15m LONG 7043.50-7045.25 created 2026-01-05T09:45:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7066.00-7066.75 created 2026-01-05T14:15:00 status failed_inverted; 5m LONG 7066.00-7067.00 created 2026-01-06T01:10:00 status failed_inverted; 15m LONG 7066.00-7066.25 created 2026-01-05T14:00:00 status failed_inverted; 15m LONG 7066.25-7067.00 created 2026-01-06T01:30:00 status failed_inverted; 5m LONG 7066.50-7067.00 created 2026-01-06T00:20:00 status failed_inverted; 5m SHORT 7067.00-7067.50 created 2026-01-05T12:30:00 status failed_inverted; 5m LONG 7067.25-7067.50 created 2026-01-05T13:50:00 status failed_inverted; 15m SHORT 7067.75-7069.25 created 2026-01-05T12:45:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7068.25-7069.50 created 2026-01-06T02:30:00 status open_untouched; 5m SHORT 7068.75-7069.75 created 2026-01-06T02:10:00 status partial_touch
- Objective ladder: session_extreme 7067.00 reached 2026-01-06T09:50:00 (RTH high liquidity before proof); open_fvg 7069.50 reached 2026-01-06T09:50:00 (15m SHORT open FVG open_untouched created 2026-01-06T02:30:00); open_fvg 7069.75 reached 2026-01-06T09:50:00 (5m SHORT open FVG partial_touch created 2026-01-06T02:10:00); tactical 7076.75 reached 2026-01-06T09:55:00 (T1 1.5R); tactical 7080.50 reached 2026-01-06T10:00:00 (T2 2.0R)
- Story: LONG proof completed at 2026-01-06T09:45:00 from 7056.75-7058.00. 10 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Structural objectives reached after proof: 7067.00 session_extreme, 7069.50 open_fvg, 7069.75 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-06T09:55:00, one MES +$56.25
- Reasons: No 15M acceptance through the parent FVG was found inside this session window.

### 2. LONG 15M FVG 7059.50-7065.25 created 2026-01-06T10:00:00
- Verdict: valid_trace_candidate
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-06T09:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-06T11:10:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-06T11:10:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-06T11:10:00. | PASS entry_stop_risk_contract: Entry 7069.00, protected 5M stop 7063.00, risk 6.00 pts. | PASS tactical_targets_from_actual_risk: T1 7078.00 and T2 7081.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7069.25.
- Parent displacement: yes
- Parent displacement candle: 2026-01-06T09:30:00
- Parent failure: not found
- First 5M return: 2026-01-06T11:10:00
- 5M wick defense: 2026-01-06T11:10:00
- Proof: 2026-01-06T11:10:00
- Entry/stop/risk: 7069.00 / 7063.00 / 6.00 pts
- T1/T2: 7078.00 / 7081.00
- Nearest liquidity: nearest prior high liquidity 7069.25
- Open FVGs below at proof: 60m LONG 7062.00-7067.25 created 2026-01-06T11:00:00 status open_untouched; 15m LONG 7059.50-7065.25 created 2026-01-06T10:00:00 status open_untouched; 5m LONG 7056.50-7059.00 created 2026-01-06T09:35:00 status partial_touch; 15m LONG 7056.75-7058.00 created 2026-01-06T09:45:00 status open_untouched; 60m LONG 7038.50-7047.75 created 2026-01-05T11:00:00 status partial_touch; 120m LONG 7038.50-7047.75 created 2026-01-05T12:00:00 status partial_touch; 240m LONG 7034.75-7047.75 created 2026-01-05T14:00:00 status partial_touch; 15m LONG 7043.50-7045.25 created 2026-01-05T09:45:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7071.00-7071.75 created 2026-01-05T11:55:00 status failed_inverted; 5m LONG 7075.25-7077.25 created 2026-01-06T10:00:00 status failed_inverted; 5m LONG 7079.75-7080.75 created 2026-01-06T10:05:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7072.75-7076.50 created 2026-01-06T11:00:00 status open_untouched; 15m SHORT 7081.00-7082.25 created 2026-01-06T11:00:00 status open_untouched; 5m SHORT 7083.25-7086.00 created 2026-01-06T10:40:00 status open_untouched
- Objective ladder: open_fvg 7076.50 reached 2026-01-06T12:10:00 (5m SHORT open FVG open_untouched created 2026-01-06T11:00:00); tactical 7078.00 reached 2026-01-06T12:10:00 (T1 1.5R); tactical 7081.00 reached 2026-01-06T12:20:00 (T2 2.0R); open_fvg 7082.25 reached 2026-01-06T12:25:00 (15m SHORT open FVG open_untouched created 2026-01-06T11:00:00); open_fvg 7086.00 reached 2026-01-06T12:30:00 (5m SHORT open FVG open_untouched created 2026-01-06T10:40:00); liquidity 7090.00 reached 2026-01-06T12:40:00 (prior 5M swing high liquidity from 2026-01-06T10:30:00); session_extreme 7090.00 reached 2026-01-06T12:40:00 (RTH high liquidity before proof)
- Story: LONG proof completed at 2026-01-06T11:10:00 from 7059.50-7065.25. 6 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Structural objectives reached after proof: 7076.50 open_fvg, 7082.25 open_fvg, 7086.00 open_fvg, 7090.00 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-06T12:10:00, one MES +$45.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window.

### 3. LONG 15M FVG 7067.00-7080.75 created 2026-01-06T10:15:00
- Verdict: valid_trace_candidate
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-06T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-06T10:40:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-06T10:50:00, 2026-01-06T11:00:00, 2026-01-06T11:10:00, 2026-01-06T11:20:00, 2026-01-06T11:25:00, 2026-01-06T11:40:00, 2026-01-06T12:00:00, 2026-01-06T12:05:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-06T12:25:00. | PASS entry_stop_risk_contract: Entry 7084.25, protected 5M stop 7063.00, risk 21.25 pts. | PASS tactical_targets_from_actual_risk: T1 7116.25 and T2 7126.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7085.00.
- Parent displacement: yes
- Parent displacement candle: 2026-01-06T09:45:00
- Parent failure: not found
- First 5M return: 2026-01-06T10:40:00
- 5M wick defense: 2026-01-06T10:50:00, 2026-01-06T11:00:00, 2026-01-06T11:10:00, 2026-01-06T11:20:00, 2026-01-06T11:25:00, 2026-01-06T11:40:00, 2026-01-06T12:00:00, 2026-01-06T12:05:00
- Proof: 2026-01-06T12:25:00
- Entry/stop/risk: 7084.25 / 7063.00 / 21.25 pts
- T1/T2: 7116.25 / 7126.75
- Nearest liquidity: nearest prior high liquidity 7085.00
- Open FVGs below at proof: 15m SHORT 7081.00-7082.25 created 2026-01-06T11:00:00 status open_untouched; 5m LONG 7080.25-7080.75 created 2026-01-06T12:25:00 status open_untouched; 5m LONG 7075.00-7077.75 created 2026-01-06T12:15:00 status open_untouched; 60m LONG 7062.00-7067.25 created 2026-01-06T11:00:00 status partial_touch; 15m LONG 7059.50-7065.25 created 2026-01-06T10:00:00 status partial_touch; 120m LONG 7062.00-7063.00 created 2026-01-06T12:00:00 status open_untouched; 5m LONG 7056.50-7059.00 created 2026-01-06T09:35:00 status partial_touch; 15m LONG 7056.75-7058.00 created 2026-01-06T09:45:00 status open_untouched
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: liquidity 7090.00 reached 2026-01-06T12:40:00 (prior 5M swing high liquidity from 2026-01-06T10:30:00); session_extreme 7090.00 reached 2026-01-06T12:40:00 (RTH high liquidity before proof); tactical 7116.25 not reached (T1 1.5R); tactical 7126.75 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-01-06T12:25:00 from 7067.00-7080.75. 0 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Structural objectives reached after proof: 7090.00 liquidity, 7090.00 session_extreme. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-01-06T16:00:00, one MES +$75.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window.

### 4. SHORT 15M FVG 7081.00-7082.25 created 2026-01-06T11:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-06T10:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-06T12:30:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-06T10:45:00
- Parent failure: 2026-01-06T12:30:00
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

### 5. SHORT 15M FVG 7071.75-7077.75 created 2026-01-06T11:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-06T10:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-06T12:15:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-06T12:15:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-06T12:15:00. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-06T10:45:00
- Parent failure: 2026-01-06T12:15:00
- First 5M return: 2026-01-06T12:15:00
- 5M wick defense: 2026-01-06T12:15:00
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

### 6. LONG 15M FVG 7075.75-7078.75 created 2026-01-06T12:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-06T12:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-06T12:00:00
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

### 7. LONG 15M FVG 7080.25-7084.00 created 2026-01-06T12:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
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
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return.

### 8. LONG 15M FVG 7093.00-7094.50 created 2026-01-06T14:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
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
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return.

### 9. LONG 15M FVG 7095.50-7097.50 created 2026-01-06T14:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
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
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return.

### 10. LONG 15M FVG 7098.50-7100.00 created 2026-01-06T14:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-06T14:30:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-06T15:15:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-06T15:15:00. | PASS entry_stop_risk_contract: Entry 7101.75, protected 5M stop 7099.00, risk 2.75 pts. | PASS tactical_targets_from_actual_risk: T1 7106.00 and T2 7107.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7102.00.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: not found
- First 5M return: 2026-01-06T14:30:00
- 5M wick defense: 2026-01-06T15:15:00
- Proof: 2026-01-06T15:15:00
- Entry/stop/risk: 7101.75 / 7099.00 / 2.75 pts
- T1/T2: 7106.00 / 7107.25
- Nearest liquidity: nearest prior high liquidity 7102.00
- Open FVGs below at proof: 15m LONG 7098.50-7100.00 created 2026-01-06T14:30:00 status partial_touch; 15m LONG 7095.50-7097.50 created 2026-01-06T14:15:00 status open_untouched; 60m LONG 7091.75-7097.50 created 2026-01-06T15:00:00 status open_untouched; 5m LONG 7095.50-7096.00 created 2026-01-06T13:55:00 status partial_touch; 5m LONG 7091.50-7094.50 created 2026-01-06T13:50:00 status open_untouched; 15m LONG 7093.00-7094.50 created 2026-01-06T14:00:00 status open_untouched; 60m LONG 7075.75-7086.25 created 2026-01-06T14:00:00 status open_untouched; 15m LONG 7080.25-7084.00 created 2026-01-06T12:45:00 status open_untouched
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: liquidity 7102.75 reached 2026-01-06T15:20:00 (prior 5M swing high liquidity from 2026-01-06T14:45:00); session_extreme 7103.00 reached 2026-01-06T15:20:00 (RTH high liquidity before proof); tactical 7106.00 not reached (T1 1.5R); tactical 7107.25 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-01-06T15:15:00 from 7098.50-7100.00. 0 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Structural objectives reached after proof: 7102.75 liquidity, 7103.00 session_extreme. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-01-06T16:00:00, one MES $-13.75
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No 15M acceptance through the parent FVG was found inside this session window.
