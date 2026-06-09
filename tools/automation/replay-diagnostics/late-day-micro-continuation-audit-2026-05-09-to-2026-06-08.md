# Late-Day Micro-Continuation 30-Day Audit

Instrument: MES (MES 06-26)
Range: 2026-05-09 through 2026-06-08
Late window tested: 15:30-15:45 ET completed 5M bars
Line-in-the-sand source: scanner_structured_chart_context_levels

## Summary

- Late bars evaluated: 80
- Aligned 15M/5M MSS bars: 30
- Candidate triggers found: 16
- FVG retest/rejection triggers: 16
- HTF close-through triggers: 0
- Shorts: 6
- Longs: 10

## Daily Summary

| Date | Late Bars | Aligned MSS Bars | Candidates | Longs | Shorts | T1 | T2 | Stop | None | Ambiguous |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026-05-11 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-12 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-13 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-14 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-15 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-18 | 4 | 4 | 4 | 4 | 0 | 4 | 0 | 0 | 0 | 0 |
| 2026-05-19 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-20 | 4 | 4 | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| 2026-05-21 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-22 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-26 | 4 | 3 | 3 | 3 | 0 | 1 | 0 | 2 | 0 | 0 |
| 2026-05-27 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-28 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-29 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-06-01 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-06-02 | 4 | 3 | 2 | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| 2026-06-03 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-06-04 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-06-05 | 4 | 4 | 2 | 0 | 2 | 0 | 0 | 2 | 0 | 0 |
| 2026-06-08 | 4 | 4 | 4 | 0 | 4 | 0 | 0 | 1 | 3 | 0 |

## Candidates

### 1. 2026-05-18 2026-05-18T15:30:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7395.25 / 7386 / 9.25
- T1/T2: 7409.25 / 7413.75
- FVG: 7392-7395 formed 2026-05-18T03:05:00
- Line in sand: 7398.5 London Bullish Displacement Imbalance Bottom (Asian low is below London low)
- Outcome to close: T1; MFE 15.5; MAE 2.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7398.5 London Bullish Displacement Imbalance Bottom. Human review only. No chase.

### 2. 2026-05-18 2026-05-18T15:35:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7401 / 7381 / 20
- T1/T2: 7431 / 7441
- FVG: 7381.25-7395.5 formed 2026-05-18T15:10:00
- Line in sand: 7401.5 Asian Bearish Displacement Imbalance Midpoint (Asian low is below London low)
- Outcome to close: T1; MFE 31; MAE 0.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7401.5 Asian Bearish Displacement Imbalance Midpoint. Human review only. No chase.

### 3. 2026-05-18 2026-05-18T15:40:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7410.25 / 7395.25 / 15
- T1/T2: 7432.75 / 7440.25
- FVG: 7395.5-7403.75 formed 2026-05-18T13:00:00
- Line in sand: 7420 Round Number 7420 (Whole/round-number magnet inside imported context range.)
- Outcome to close: T1; MFE 27.25; MAE 0.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7420 Round Number 7420. Human review only. No chase.

### 4. 2026-05-18 2026-05-18T15:45:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7418.5 / 7409.75 / 8.75
- T1/T2: 7431.75 / 7436
- FVG: 7418-7418.25 formed 2026-05-18T08:15:00
- Line in sand: 7420 Round Number 7420 (Whole/round-number magnet inside imported context range.)
- Outcome to close: T1; MFE 13.5; MAE 2.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7420 Round Number 7420. Human review only. No chase.

### 5. 2026-05-20 2026-05-20T15:35:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7447.5 / 7444 / 3.5
- T1/T2: 7452.75 / 7454.5
- FVG: 7444.25-7444.5 formed 2026-05-20T15:25:00
- Line in sand: 7448.5 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: T2; MFE 7; MAE 0.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7448.5 Current Imported Window High. Human review only. No chase.

### 6. 2026-05-26 2026-05-26T15:35:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7532.75 / 7527.5 / 5.25
- T1/T2: 7540.75 / 7543.25
- FVG: 7527.75-7530 formed 2026-05-26T14:20:00
- Line in sand: 7533.75 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: T1; MFE 8.25; MAE 0.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7533.75 Current Imported Window High. Human review only. No chase.

### 7. 2026-05-26 2026-05-26T15:40:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7536 / 7530.25 / 5.75
- T1/T2: 7544.75 / 7547.5
- FVG: 7530.5-7532.25 formed 2026-05-26T03:50:00
- Line in sand: 7536.25 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 6.25; MAE 5.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7536.25 Current Imported Window High. Human review only. No chase.

### 8. 2026-05-26 2026-05-26T15:45:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7538.5 / 7534.25 / 4.25
- T1/T2: 7545 / 7547
- FVG: 7534.5-7536.75 formed 2026-05-26T05:35:00
- Line in sand: 7538.5 Asian Bullish Displacement Imbalance Midpoint (Asian high is above London high)
- Outcome to close: STOP; MFE 3.75; MAE 4.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7538.5 Asian Bullish Displacement Imbalance Midpoint. Human review only. No chase.

### 9. 2026-06-02 2026-06-02T15:30:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7621.5 / 7619.75 / 1.75
- T1/T2: 7624.25 / 7625
- FVG: 7620-7620.5 formed 2026-06-02T15:10:00
- Line in sand: 7623.75 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 1.5; MAE 2
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7623.75 Current Imported Window High. Human review only. No chase.

### 10. 2026-06-02 2026-06-02T15:35:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7622.5 / 7620.75 / 1.75
- T1/T2: 7625.25 / 7626
- FVG: 7621-7621.5 formed 2026-06-02T11:00:00
- Line in sand: 7623.75 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 0.5; MAE 2.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7623.75 Current Imported Window High. Human review only. No chase.

### 11. 2026-06-05 2026-06-05T15:35:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7404 / 7410 / 6
- T1/T2: 7395 / 7392
- FVG: 7405.25-7407 formed 2026-06-05T15:15:00
- Line in sand: 7403.75 RTH Open (First imported 5M RTH bar open.)
- Outcome to close: STOP; MFE 1.75; MAE 9
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7403.75 RTH Open. Human review only. No chase.

### 12. 2026-06-05 2026-06-05T15:45:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7402.75 / 7412.75 / 10
- T1/T2: 7387.75 / 7382.75
- FVG: 7405.25-7407 formed 2026-06-05T15:15:00
- Line in sand: 7400 Round Number 7400 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 1.75; MAE 12
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7400 Round Number 7400. Human review only. No chase.

### 13. 2026-06-08 2026-06-08T15:30:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7414.5 / 7415.5 / 1
- T1/T2: 7413 / 7412.5
- FVG: 7414.75-7415.25 formed 2026-06-08T00:10:00
- Line in sand: 7410 Round Number 7410 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 1; MAE 9.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7410 Round Number 7410. Human review only. No chase.

### 14. 2026-06-08 2026-06-08T15:35:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7417 / 7424.5 / 7.5
- T1/T2: 7405.75 / 7402
- FVG: 7418.5-7424.25 formed 2026-06-08T15:20:00
- Line in sand: 7415.5 Morning Setup Scan Window Low (36 bars reviewed for Morning Setup Scan Window.)
- Outcome to close: NONE; MFE 6.5; MAE 5.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7415.5 Morning Setup Scan Window Low. Human review only. No chase.

### 15. 2026-06-08 2026-06-08T15:40:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7416.25 / 7424.5 / 8.25
- T1/T2: 7404 / 7399.75
- FVG: 7418.5-7424.25 formed 2026-06-08T15:20:00
- Line in sand: 7415.5 Morning Setup Scan Window Low (36 bars reviewed for Morning Setup Scan Window.)
- Outcome to close: NONE; MFE 5.75; MAE 6
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7415.5 Morning Setup Scan Window Low. Human review only. No chase.

### 16. 2026-06-08 2026-06-08T15:45:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7416 / 7424.5 / 8.5
- T1/T2: 7403.25 / 7399
- FVG: 7418.5-7424.25 formed 2026-06-08T15:20:00
- Line in sand: 7415.5 Morning Setup Scan Window Low (36 bars reviewed for Morning Setup Scan Window.)
- Outcome to close: NONE; MFE 5.5; MAE 6.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7415.5 Morning Setup Scan Window Low. Human review only. No chase.

Authority: research-only. This audit does not change active windows, approve trades, post Discord alerts, or alter canExecute.