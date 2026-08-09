# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-13 / full-rth (2026-01-13T09:15:00 to 2026-01-13T16:00:00)

## Coverage
- 5m: 623 bars (2026-01-11T18:05:00 to 2026-01-13T23:55:00)
- 15m: 207 bars (2026-01-11T18:15:00 to 2026-01-13T23:45:00)
- 60m: 51 bars (2026-01-11T19:00:00 to 2026-01-13T23:00:00)
- 120m: 26 bars (2026-01-11T20:00:00 to 2026-01-13T22:00:00)
- 240m: 13 bars (2026-01-11T22:00:00 to 2026-01-13T22:00:00)

## FVG Inventory At Session Start
- Open below: 5m LONG 7133.00-7133.25 created 2026-01-13T09:10:00 status open_untouched; 5m LONG 7120.75-7132.75 created 2026-01-13T08:40:00 status partial_touch; 15m LONG 7121.00-7125.50 created 2026-01-13T09:00:00 status open_untouched; 60m LONG 7082.75-7105.50 created 2026-01-12T11:00:00 status open_untouched; 120m LONG 7083.25-7105.50 created 2026-01-12T12:00:00 status open_untouched; 240m LONG 7083.50-7105.50 created 2026-01-12T14:00:00 status open_untouched; 15m LONG 7082.75-7101.25 created 2026-01-12T10:00:00 status open_untouched; 5m LONG 7098.25-7099.75 created 2026-01-12T09:45:00 status open_untouched; 5m LONG 7082.75-7092.00 created 2026-01-12T09:40:00 status open_untouched; 15m LONG 7075.50-7077.50 created 2026-01-12T07:30:00 status partial_touch
- Failed above: none
- Open above: none

## Trace Rows

### 1. SHORT 15M FVG 7127.75-7130.75 created 2026-01-13T10:00:00
- Verdict: valid_trace_candidate
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-13T09:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-13T12:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-13T12:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-13T12:00:00. | PASS entry_stop_risk_contract: Entry 7125.25, protected 5M stop 7128.00, risk 2.75 pts. | PASS tactical_targets_from_actual_risk: T1 7121.25 and T2 7119.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7125.00.
- Parent displacement: yes
- Parent displacement candle: 2026-01-13T09:30:00
- Parent failure: not found
- First 5M return: 2026-01-13T12:00:00
- 5M wick defense: 2026-01-13T12:00:00
- Proof: 2026-01-13T12:00:00
- Entry/stop/risk: 7125.25 / 7128.00 / 2.75 pts
- T1/T2: 7121.25 / 7119.75
- Nearest liquidity: nearest prior low liquidity 7125.00
- Open FVGs below at proof: 5m LONG 7123.50-7124.50 created 2026-01-13T12:00:00 status open_untouched; 5m LONG 7118.00-7119.25 created 2026-01-13T11:50:00 status open_untouched; 15m LONG 7118.50-7119.25 created 2026-01-13T12:00:00 status open_untouched; 60m LONG 7082.75-7105.50 created 2026-01-12T11:00:00 status partial_touch; 120m LONG 7083.25-7105.50 created 2026-01-12T12:00:00 status partial_touch; 240m LONG 7083.50-7105.50 created 2026-01-12T14:00:00 status open_untouched; 15m LONG 7082.75-7101.25 created 2026-01-12T10:00:00 status partial_touch; 5m LONG 7082.75-7092.00 created 2026-01-12T09:40:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7126.00-7129.50 created 2026-01-12T16:55:00 status failed_inverted; 15m SHORT 7127.00-7129.50 created 2026-01-12T18:15:00 status failed_inverted; 60m SHORT 7127.00-7128.50 created 2026-01-12T19:00:00 status failed_inverted; 5m LONG 7129.00-7129.50 created 2026-01-12T16:30:00 status failed_inverted; 5m LONG 7131.00-7132.00 created 2026-01-12T14:40:00 status failed_inverted; 15m LONG 7131.50-7133.00 created 2026-01-12T15:00:00 status failed_inverted; 15m SHORT 7131.50-7132.25 created 2026-01-12T15:45:00 status failed_inverted; 5m SHORT 7132.50-7134.75 created 2026-01-13T08:55:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7127.75-7129.50 created 2026-01-13T09:50:00 status partial_touch; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: open_fvg 7123.50 reached 2026-01-13T12:05:00 (5m LONG open FVG open_untouched created 2026-01-13T12:00:00); tactical 7121.25 reached 2026-01-13T12:20:00 (T1 1.5R); tactical 7119.75 reached 2026-01-13T12:20:00 (T2 2.0R); open_fvg 7118.50 reached 2026-01-13T12:20:00 (15m LONG open FVG open_untouched created 2026-01-13T12:00:00); open_fvg 7118.00 reached 2026-01-13T12:20:00 (5m LONG open FVG open_untouched created 2026-01-13T11:50:00); liquidity 7107.00 reached 2026-01-13T13:00:00 (prior 5M swing low liquidity from 2026-01-13T10:05:00); liquidity 7101.50 reached 2026-01-13T13:00:00 (prior 5M swing low liquidity from 2026-01-13T10:50:00); liquidity 7099.25 reached 2026-01-13T14:05:00 (prior 5M swing low liquidity from 2026-01-13T11:30:00); liquidity 7096.00 reached 2026-01-13T15:30:00 (prior 5M swing low liquidity from 2026-01-13T10:30:00); session_extreme 7096.00 reached 2026-01-13T15:30:00 (RTH low liquidity before proof); open_fvg 7083.50 not reached (240m LONG open FVG open_untouched created 2026-01-12T14:00:00); open_fvg 7083.25 not reached (120m LONG open FVG partial_touch created 2026-01-12T12:00:00); open_fvg 7082.75 not reached (60m LONG open FVG partial_touch created 2026-01-12T11:00:00); open_fvg 7082.75 not reached (15m LONG open FVG partial_touch created 2026-01-12T10:00:00)
- Story: SHORT proof completed at 2026-01-13T12:00:00 from 7127.75-7130.75. 10 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Structural objectives reached after proof: 7123.50 open_fvg, 7118.50 open_fvg, 7118.00 open_fvg, 7107.00 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T2 at 2026-01-13T12:20:00, one MES +$27.50
- Reasons: No 15M acceptance through the parent FVG was found inside this session window.

### 2. SHORT 15M FVG 7121.00-7124.75 created 2026-01-13T10:15:00
- Verdict: valid_trace_candidate
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-13T10:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-13T12:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-13T12:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-13T12:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-13T12:20:00. | PASS entry_stop_risk_contract: Entry 7118.25, protected 5M stop 7128.00, risk 9.75 pts. | PASS tactical_targets_from_actual_risk: T1 7103.75 and T2 7098.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7118.00.
- Parent displacement: yes
- Parent displacement candle: 2026-01-13T10:00:00
- Parent failure: 2026-01-13T12:00:00
- First 5M return: 2026-01-13T12:00:00
- 5M wick defense: 2026-01-13T12:00:00
- Proof: 2026-01-13T12:20:00
- Entry/stop/risk: 7118.25 / 7128.00 / 9.75 pts
- T1/T2: 7103.75 / 7098.75
- Nearest liquidity: nearest prior low liquidity 7118.00
- Open FVGs below at proof: 60m LONG 7082.75-7105.50 created 2026-01-12T11:00:00 status partial_touch; 120m LONG 7083.25-7105.50 created 2026-01-12T12:00:00 status partial_touch; 240m LONG 7083.50-7105.50 created 2026-01-12T14:00:00 status open_untouched; 15m LONG 7082.75-7101.25 created 2026-01-12T10:00:00 status partial_touch; 5m LONG 7082.75-7092.00 created 2026-01-12T09:40:00 status open_untouched; 15m LONG 7075.50-7077.50 created 2026-01-12T07:30:00 status partial_touch; 120m LONG 7074.75-7077.25 created 2026-01-12T10:00:00 status open_untouched; 5m LONG 7074.00-7077.00 created 2026-01-12T07:10:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7118.75-7119.00 created 2026-01-13T06:55:00 status failed_inverted; 15m SHORT 7119.00-7121.25 created 2026-01-12T19:15:00 status failed_inverted; 5m SHORT 7119.25-7120.75 created 2026-01-12T22:40:00 status failed_inverted; 5m SHORT 7119.25-7119.50 created 2026-01-13T05:15:00 status failed_inverted; 5m LONG 7119.50-7120.00 created 2026-01-12T21:45:00 status failed_inverted; 5m SHORT 7119.75-7120.00 created 2026-01-12T19:00:00 status failed_inverted; 5m LONG 7119.75-7120.75 created 2026-01-12T22:15:00 status failed_inverted; 5m SHORT 7119.75-7120.50 created 2026-01-13T05:10:00 status failed_inverted
- Open FVGs above at proof: 15m LONG 7118.50-7119.25 created 2026-01-13T12:00:00 status open_untouched; 5m SHORT 7127.75-7129.50 created 2026-01-13T09:50:00 status partial_touch; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: liquidity 7107.00 reached 2026-01-13T13:00:00 (prior 5M swing low liquidity from 2026-01-13T10:05:00); tactical 7103.75 reached 2026-01-13T13:00:00 (T1 1.5R); liquidity 7101.50 reached 2026-01-13T13:00:00 (prior 5M swing low liquidity from 2026-01-13T10:50:00); liquidity 7099.25 reached 2026-01-13T14:05:00 (prior 5M swing low liquidity from 2026-01-13T11:30:00); tactical 7098.75 reached 2026-01-13T14:10:00 (T2 2.0R); liquidity 7096.00 reached 2026-01-13T15:30:00 (prior 5M swing low liquidity from 2026-01-13T10:30:00); session_extreme 7096.00 reached 2026-01-13T15:30:00 (RTH low liquidity before proof); open_fvg 7083.50 not reached (240m LONG open FVG open_untouched created 2026-01-12T14:00:00); open_fvg 7083.25 not reached (120m LONG open FVG partial_touch created 2026-01-12T12:00:00); open_fvg 7082.75 not reached (60m LONG open FVG partial_touch created 2026-01-12T11:00:00); open_fvg 7082.75 not reached (15m LONG open FVG partial_touch created 2026-01-12T10:00:00); open_fvg 7082.75 not reached (5m LONG open FVG open_untouched created 2026-01-12T09:40:00); open_fvg 7075.50 not reached (15m LONG open FVG partial_touch created 2026-01-12T07:30:00); open_fvg 7074.75 not reached (120m LONG open FVG open_untouched created 2026-01-12T10:00:00)
- Story: SHORT proof completed at 2026-01-13T12:20:00 from 7121.00-7124.75. 11 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Structural objectives reached after proof: 7107.00 liquidity, 7101.50 liquidity, 7099.25 liquidity, 7096.00 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-13T13:00:00, one MES +$72.50
- Reasons: Qualified by this diagnostic heuristic.

### 3. SHORT 15M FVG 7110.25-7117.75 created 2026-01-13T10:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-13T10:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-13T11:45:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-13T11:45:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-13T13:20:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-13T13:20:00. | PASS entry_stop_risk_contract: Entry 7107.25, protected 5M stop 7128.00, risk 20.75 pts. | PASS tactical_targets_from_actual_risk: T1 7076.25 and T2 7065.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7107.00. | FAIL first_valid_same_parent_proof: Earlier same-side completed 5M proof from the same parent displacement already completed at 2026-01-13T12:20:00. Later same-parent rows are management/re-entry context unless a reset rule is explicitly approved.
- Parent displacement: yes
- Parent displacement candle: 2026-01-13T10:00:00
- Parent failure: 2026-01-13T11:45:00
- First 5M return: 2026-01-13T11:45:00
- 5M wick defense: 2026-01-13T13:20:00
- Proof: 2026-01-13T13:20:00
- Entry/stop/risk: 7107.25 / 7128.00 / 20.75 pts
- T1/T2: 7076.25 / 7065.75
- Nearest liquidity: nearest prior low liquidity 7107.00
- Open FVGs below at proof: 60m LONG 7082.75-7105.50 created 2026-01-12T11:00:00 status partial_touch; 120m LONG 7083.25-7105.50 created 2026-01-12T12:00:00 status partial_touch; 240m LONG 7083.50-7105.50 created 2026-01-12T14:00:00 status open_untouched; 15m LONG 7082.75-7101.25 created 2026-01-12T10:00:00 status partial_touch; 5m LONG 7082.75-7092.00 created 2026-01-12T09:40:00 status open_untouched; 15m LONG 7075.50-7077.50 created 2026-01-12T07:30:00 status partial_touch; 120m LONG 7074.75-7077.25 created 2026-01-12T10:00:00 status open_untouched; 5m LONG 7074.00-7077.00 created 2026-01-12T07:10:00 status partial_touch
- Failed FVGs above at proof: 5m LONG 7108.00-7110.00 created 2026-01-12T10:00:00 status failed_inverted; 15m SHORT 7108.00-7110.75 created 2026-01-11T19:30:00 status failed_inverted; 5m LONG 7109.50-7110.25 created 2026-01-13T11:00:00 status failed_inverted; 5m SHORT 7110.00-7110.75 created 2026-01-11T19:10:00 status failed_inverted; 15m SHORT 7110.25-7117.75 created 2026-01-13T10:30:00 status failed_inverted; 5m LONG 7111.50-7113.00 created 2026-01-12T11:00:00 status failed_inverted; 15m LONG 7112.25-7113.00 created 2026-01-12T11:15:00 status failed_inverted; 5m SHORT 7113.25-7113.75 created 2026-01-13T11:30:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7109.50-7110.25 created 2026-01-13T13:15:00 status open_untouched; 5m SHORT 7109.75-7110.75 created 2026-01-13T13:00:00 status partial_touch; 5m SHORT 7115.75-7117.00 created 2026-01-13T12:50:00 status partial_touch; 5m SHORT 7127.75-7129.50 created 2026-01-13T09:50:00 status partial_touch; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch
- Objective ladder: liquidity 7107.00 reached 2026-01-13T13:25:00 (prior 5M swing low liquidity from 2026-01-13T10:05:00); liquidity 7101.50 reached 2026-01-13T13:55:00 (prior 5M swing low liquidity from 2026-01-13T10:50:00); liquidity 7099.75 reached 2026-01-13T14:05:00 (prior 5M swing low liquidity from 2026-01-13T13:05:00); liquidity 7099.25 reached 2026-01-13T14:05:00 (prior 5M swing low liquidity from 2026-01-13T11:30:00); liquidity 7096.00 reached 2026-01-13T15:30:00 (prior 5M swing low liquidity from 2026-01-13T10:30:00); session_extreme 7096.00 reached 2026-01-13T15:30:00 (RTH low liquidity before proof); open_fvg 7083.50 not reached (240m LONG open FVG open_untouched created 2026-01-12T14:00:00); open_fvg 7083.25 not reached (120m LONG open FVG partial_touch created 2026-01-12T12:00:00); open_fvg 7082.75 not reached (60m LONG open FVG partial_touch created 2026-01-12T11:00:00); open_fvg 7082.75 not reached (15m LONG open FVG partial_touch created 2026-01-12T10:00:00); open_fvg 7082.75 not reached (5m LONG open FVG open_untouched created 2026-01-12T09:40:00); tactical 7076.25 not reached (T1 1.5R); open_fvg 7075.50 not reached (15m LONG open FVG partial_touch created 2026-01-12T07:30:00); open_fvg 7074.75 not reached (120m LONG open FVG open_untouched created 2026-01-12T10:00:00)
- Story: SHORT proof completed at 2026-01-13T13:20:00 from 7110.25-7117.75. 13 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Structural objectives reached after proof: 7107.00 liquidity, 7101.50 liquidity, 7099.75 liquidity, 7099.25 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: SessionClose at 2026-01-13T16:00:00, one MES $-31.25
- Reasons: Late same-parent FVG continuation blocked. Earlier same-side completed 5M proof from the same parent displacement already completed at 2026-01-13T12:20:00. Later same-parent rows are management/re-entry context unless a reset rule is explicitly approved.

### 4. LONG 15M FVG 7118.50-7119.25 created 2026-01-13T12:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-13T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-13T12:45:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-13T11:45:00
- Parent failure: 2026-01-13T12:45:00
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

### 5. SHORT 15M FVG 7109.50-7110.25 created 2026-01-13T13:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-13T12:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-13T16:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-13T16:00:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-13T12:45:00
- Parent failure: 2026-01-13T16:00:00
- First 5M return: 2026-01-13T16:00:00
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
- Reasons: No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return.
