# Late-Day Micro-Continuation 30-Day Audit

Instrument: MES (MES 06-26)
Range: 2026-05-09 through 2026-06-08
Late window tested: 15:00-16:40 ET completed 5M bars
Line-in-the-sand source: scanner_structured_chart_context_levels

## Summary

- Late bars evaluated: 412
- Aligned 15M/5M MSS bars: 140
- Candidate triggers found: 69
- FVG retest/rejection triggers: 69
- HTF close-through triggers: 0
- Shorts: 26
- Longs: 43

## Daily Summary

| Date | Late Bars | Aligned MSS Bars | Candidates | Longs | Shorts | T1 | T2 | Stop | None | Ambiguous |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026-05-11 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-12 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-13 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-14 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-15 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-18 | 21 | 20 | 15 | 15 | 0 | 7 | 1 | 5 | 1 | 1 |
| 2026-05-19 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-20 | 21 | 21 | 10 | 10 | 0 | 1 | 2 | 7 | 0 | 0 |
| 2026-05-21 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-22 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-26 | 21 | 14 | 11 | 11 | 0 | 1 | 0 | 10 | 0 | 0 |
| 2026-05-27 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-28 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-05-29 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-06-01 | 21 | 21 | 10 | 0 | 10 | 3 | 1 | 6 | 0 | 0 |
| 2026-06-02 | 21 | 9 | 7 | 7 | 0 | 2 | 1 | 4 | 0 | 0 |
| 2026-06-03 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-06-04 | 21 | 21 | 1 | 0 | 1 | 0 | 1 | 0 | 0 | 0 |
| 2026-06-05 | 21 | 21 | 5 | 0 | 5 | 2 | 0 | 2 | 1 | 0 |
| 2026-06-08 | 13 | 13 | 10 | 0 | 10 | 0 | 1 | 1 | 7 | 1 |

## Candidates

### 1. 2026-05-18 2026-05-18T15:05:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7404.5 / 7375.5 / 29
- T1/T2: 7448 / 7462.5
- FVG: 7395.5-7403.75 formed 2026-05-18T13:00:00
- Line in the Sand: 7404.5 Asian Bearish Displacement Imbalance Top (Asian low is below London low)
- Outcome to close: NONE; MFE 36.25; MAE 18.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7404.5 Asian Bearish Displacement Imbalance Top. Human review only. No chase.

### 2. 2026-05-18 2026-05-18T15:10:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7403 / 7395.25 / 7.75
- T1/T2: 7414.75 / 7418.5
- FVG: 7401.5-7402.5 formed 2026-05-18T07:40:00
- Line in the Sand: 7403.75 RTH Open (First imported 5M RTH bar open.)
- Outcome to close: STOP; MFE 4.25; MAE 11.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7403.75 RTH Open. Human review only. No chase.

### 3. 2026-05-18 2026-05-18T15:15:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7400.75 / 7398.75 / 2
- T1/T2: 7403.75 / 7404.75
- FVG: 7399.5-7399.75 formed 2026-05-18T07:25:00
- Line in the Sand: 7401.5 Asian Bearish Displacement Imbalance Midpoint (Asian low is below London low)
- Outcome to close: AMBIGUOUS; MFE 4.5; MAE 5.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7401.5 Asian Bearish Displacement Imbalance Midpoint. Human review only. No chase.

### 4. 2026-05-18 2026-05-18T15:20:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7397.25 / 7381 / 16.25
- T1/T2: 7421.75 / 7429.75
- FVG: 7381.25-7395.5 formed 2026-05-18T15:10:00
- Line in the Sand: 7398.5 London Bullish Displacement Imbalance Bottom (Asian low is below London low)
- Outcome to close: T1; MFE 28; MAE 11
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7398.5 London Bullish Displacement Imbalance Bottom. Human review only. No chase.

### 5. 2026-05-18 2026-05-18T15:30:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7395.25 / 7386 / 9.25
- T1/T2: 7409.25 / 7413.75
- FVG: 7392-7395 formed 2026-05-18T03:05:00
- Line in the Sand: 7398.5 London Bullish Displacement Imbalance Bottom (Asian low is below London low)
- Outcome to close: T1; MFE 15.5; MAE 2.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7398.5 London Bullish Displacement Imbalance Bottom. Human review only. No chase.

### 6. 2026-05-18 2026-05-18T15:35:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7401 / 7381 / 20
- T1/T2: 7431 / 7441
- FVG: 7381.25-7395.5 formed 2026-05-18T15:10:00
- Line in the Sand: 7401.5 Asian Bearish Displacement Imbalance Midpoint (Asian low is below London low)
- Outcome to close: T1; MFE 31; MAE 0.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7401.5 Asian Bearish Displacement Imbalance Midpoint. Human review only. No chase.

### 7. 2026-05-18 2026-05-18T15:40:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7410.25 / 7395.25 / 15
- T1/T2: 7432.75 / 7440.25
- FVG: 7395.5-7403.75 formed 2026-05-18T13:00:00
- Line in the Sand: 7420 Round Number 7420 (Whole/round-number magnet inside imported context range.)
- Outcome to close: T1; MFE 27.25; MAE 0.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7420 Round Number 7420. Human review only. No chase.

### 8. 2026-05-18 2026-05-18T15:45:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7418.5 / 7409.75 / 8.75
- T1/T2: 7431.75 / 7436
- FVG: 7418-7418.25 formed 2026-05-18T08:15:00
- Line in the Sand: 7420 Round Number 7420 (Whole/round-number magnet inside imported context range.)
- Outcome to close: T1; MFE 13.5; MAE 2.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7420 Round Number 7420. Human review only. No chase.

### 9. 2026-05-18 2026-05-18T15:50:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7423.5 / 7415.5 / 8
- T1/T2: 7435.5 / 7439.5
- FVG: 7418-7418.25 formed 2026-05-18T08:15:00
- Line in the Sand: 7425.25 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: T1; MFE 14; MAE 6.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7425.25 Current Imported Window High. Human review only. No chase.

### 10. 2026-05-18 2026-05-18T15:55:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7425 / 7408 / 17
- T1/T2: 7450.5 / 7459
- FVG: 7408.25-7419.75 formed 2026-05-18T07:45:00
- Line in the Sand: 7428 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 15.75; MAE 21.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7428 Current Imported Window High. Human review only. No chase.

### 11. 2026-05-18 2026-05-18T16:00:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7426.5 / 7408 / 18.5
- T1/T2: 7454.25 / 7463.5
- FVG: 7408.25-7419.75 formed 2026-05-18T07:45:00
- Line in the Sand: 7428 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 14.25; MAE 23
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7428 Current Imported Window High. Human review only. No chase.

### 12. 2026-05-18 2026-05-18T16:10:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7420.5 / 7416.75 / 3.75
- T1/T2: 7426.25 / 7428
- FVG: 7418-7418.25 formed 2026-05-18T08:15:00
- Line in the Sand: 7428.5 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: T2; MFE 8.5; MAE 1.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7428.5 Current Imported Window High. Human review only. No chase.

### 13. 2026-05-18 2026-05-18T16:15:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7421.75 / 7408 / 13.75
- T1/T2: 7442.5 / 7449.25
- FVG: 7408.25-7419.75 formed 2026-05-18T07:45:00
- Line in the Sand: 7428.5 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 19; MAE 18.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7428.5 Current Imported Window High. Human review only. No chase.

### 14. 2026-05-18 2026-05-18T16:25:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7422.75 / 7408 / 14.75
- T1/T2: 7445 / 7452.25
- FVG: 7408.25-7419.75 formed 2026-05-18T07:45:00
- Line in the Sand: 7428.5 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 18; MAE 19.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7428.5 Current Imported Window High. Human review only. No chase.

### 15. 2026-05-18 2026-05-18T16:35:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7420.25 / 7408 / 12.25
- T1/T2: 7438.75 / 7444.75
- FVG: 7408.25-7419.75 formed 2026-05-18T07:45:00
- Line in the Sand: 7428.5 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: T1; MFE 18.5; MAE 0.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7428.5 Current Imported Window High. Human review only. No chase.

### 16. 2026-05-20 2026-05-20T15:15:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7444.25 / 7438.5 / 5.75
- T1/T2: 7453 / 7455.75
- FVG: 7440-7441.5 formed 2026-05-20T14:40:00
- Line in the Sand: 7447.25 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: T1; MFE 10.25; MAE 1.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7447.25 Current Imported Window High. Human review only. No chase.

### 17. 2026-05-20 2026-05-20T15:20:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7445.75 / 7442.5 / 3.25
- T1/T2: 7450.75 / 7452.25
- FVG: 7443.25-7443.5 formed 2026-05-20T11:55:00
- Line in the Sand: 7447.25 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: T2; MFE 8.75; MAE 1.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7447.25 Current Imported Window High. Human review only. No chase.

### 18. 2026-05-20 2026-05-20T15:35:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7447.5 / 7444 / 3.5
- T1/T2: 7452.75 / 7454.5
- FVG: 7444.25-7444.5 formed 2026-05-20T15:25:00
- Line in the Sand: 7448.5 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: T2; MFE 7; MAE 0.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7448.5 Current Imported Window High. Human review only. No chase.

### 19. 2026-05-20 2026-05-20T15:55:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7448.75 / 7444 / 4.75
- T1/T2: 7456 / 7458.25
- FVG: 7444.25-7444.5 formed 2026-05-20T15:25:00
- Line in the Sand: 7450 Round Number 7450 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 4.25; MAE 7.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7450 Round Number 7450. Human review only. No chase.

### 20. 2026-05-20 2026-05-20T16:00:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7451.75 / 7446.25 / 5.5
- T1/T2: 7460 / 7462.75
- FVG: 7448.5-7450.5 formed 2026-05-20T15:45:00
- Line in the Sand: 7454.5 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 0.25; MAE 6.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7454.5 Current Imported Window High. Human review only. No chase.

### 21. 2026-05-20 2026-05-20T16:15:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7448 / 7444 / 4
- T1/T2: 7454 / 7456
- FVG: 7444.25-7444.5 formed 2026-05-20T15:25:00
- Line in the Sand: 7450 Round Number 7450 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 1; MAE 7
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7450 Round Number 7450. Human review only. No chase.

### 22. 2026-05-20 2026-05-20T16:20:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7447.5 / 7440.75 / 6.75
- T1/T2: 7457.75 / 7461
- FVG: 7444.25-7444.5 formed 2026-05-20T15:25:00
- Line in the Sand: 7450 Round Number 7450 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 2; MAE 18.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7450 Round Number 7450. Human review only. No chase.

### 23. 2026-05-20 2026-05-20T16:25:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7443 / 7429 / 14
- T1/T2: 7464 / 7471
- FVG: 7440-7441.5 formed 2026-05-20T14:40:00
- Line in the Sand: 7450 Round Number 7450 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 10.75; MAE 20.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7450 Round Number 7450. Human review only. No chase.

### 24. 2026-05-20 2026-05-20T16:30:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7452.5 / 7438.75 / 13.75
- T1/T2: 7473.25 / 7480
- FVG: 7448.5-7450.5 formed 2026-05-20T15:45:00
- Line in the Sand: 7454.5 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 1.25; MAE 16.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7454.5 Current Imported Window High. Human review only. No chase.

### 25. 2026-05-20 2026-05-20T16:40:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7438.75 / 7428 / 10.75
- T1/T2: 7455 / 7460.25
- FVG: 7428.25-7438.5 formed 2026-05-20T11:25:00
- Line in the Sand: 7440 Round Number 7440 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 3.25; MAE 16.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7440 Round Number 7440. Human review only. No chase.

### 26. 2026-05-26 2026-05-26T15:35:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7532.75 / 7527.5 / 5.25
- T1/T2: 7540.75 / 7543.25
- FVG: 7527.75-7530 formed 2026-05-26T14:20:00
- Line in the Sand: 7533.75 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: T1; MFE 8.25; MAE 0.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7533.75 Current Imported Window High. Human review only. No chase.

### 27. 2026-05-26 2026-05-26T15:40:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7536 / 7530.25 / 5.75
- T1/T2: 7544.75 / 7547.5
- FVG: 7530.5-7532.25 formed 2026-05-26T03:50:00
- Line in the Sand: 7536.25 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 6.25; MAE 5.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7536.25 Current Imported Window High. Human review only. No chase.

### 28. 2026-05-26 2026-05-26T15:45:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7538.5 / 7534.25 / 4.25
- T1/T2: 7545 / 7547
- FVG: 7534.5-7536.75 formed 2026-05-26T05:35:00
- Line in the Sand: 7538.5 Asian Bullish Displacement Imbalance Midpoint (Asian high is above London high)
- Outcome to close: STOP; MFE 3.75; MAE 4.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7538.5 Asian Bullish Displacement Imbalance Midpoint. Human review only. No chase.

### 29. 2026-05-26 2026-05-26T15:50:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7539.25 / 7536.75 / 2.5
- T1/T2: 7543 / 7544.25
- FVG: 7538.75-7539 formed 2026-05-26T06:15:00
- Line in the Sand: 7540 Round Number 7540 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 3; MAE 5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7540 Round Number 7540. Human review only. No chase.

### 30. 2026-05-26 2026-05-26T15:55:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7540.25 / 7533.5 / 6.75
- T1/T2: 7550.5 / 7553.75
- FVG: 7533.75-7540 formed 2026-05-26T09:50:00
- Line in the Sand: 7542.25 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 0.5; MAE 7.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7542.25 Current Imported Window High. Human review only. No chase.

### 31. 2026-05-26 2026-05-26T16:00:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7539.25 / 7534 / 5.25
- T1/T2: 7547.25 / 7549.75
- FVG: 7536.25-7537 formed 2026-05-26T15:50:00
- Line in the Sand: 7540 Round Number 7540 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 1.5; MAE 6.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7540 Round Number 7540. Human review only. No chase.

### 32. 2026-05-26 2026-05-26T16:05:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7537.25 / 7536 / 1.25
- T1/T2: 7539.25 / 7539.75
- FVG: 7536.25-7537 formed 2026-05-26T15:50:00
- Line in the Sand: 7540 Round Number 7540 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 0.75; MAE 1.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7540 Round Number 7540. Human review only. No chase.

### 33. 2026-05-26 2026-05-26T16:10:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7537.25 / 7536 / 1.25
- T1/T2: 7539.25 / 7539.75
- FVG: 7536.25-7537 formed 2026-05-26T15:50:00
- Line in the Sand: 7537.5 Asian Bullish Displacement Imbalance Bottom (Asian high is above London high)
- Outcome to close: STOP; MFE 0.5; MAE 1.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7537.5 Asian Bullish Displacement Imbalance Bottom. Human review only. No chase.

### 34. 2026-05-26 2026-05-26T16:20:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7537.75 / 7535.25 / 2.5
- T1/T2: 7541.5 / 7542.75
- FVG: 7536.25-7537 formed 2026-05-26T15:50:00
- Line in the Sand: 7540 Round Number 7540 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 0.75; MAE 3
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7540 Round Number 7540. Human review only. No chase.

### 35. 2026-05-26 2026-05-26T16:35:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7536.5 / 7533 / 3.5
- T1/T2: 7541.75 / 7543.5
- FVG: 7533.25-7535.25 formed 2026-05-26T15:45:00
- Line in the Sand: 7540 Round Number 7540 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 1.25; MAE 3.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7540 Round Number 7540. Human review only. No chase.

### 36. 2026-05-26 2026-05-26T16:40:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7537 / 7534.25 / 2.75
- T1/T2: 7541.25 / 7542.5
- FVG: 7534.5-7536.75 formed 2026-05-26T05:35:00
- Line in the Sand: 7540 Round Number 7540 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 0.75; MAE 4.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7540 Round Number 7540. Human review only. No chase.

### 37. 2026-06-01 2026-06-01T15:50:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7615.5 / 7620.25 / 4.75
- T1/T2: 7608.5 / 7606
- FVG: 7616.25-7616.5 formed 2026-06-01T02:30:00
- Line in the Sand: 7615 Current Imported Window Low (16 bars reviewed for Current Imported Window.)
- Outcome to close: T1; MFE 8; MAE 2.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7615 Current Imported Window Low. Human review only. No chase.

### 38. 2026-06-01 2026-06-01T15:55:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7611.5 / 7617.25 / 5.75
- T1/T2: 7603 / 7600
- FVG: 7614.25-7614.5 formed 2026-06-01T08:05:00
- Line in the Sand: 7611 Current Imported Window Low (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 1; MAE 6.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7611 Current Imported Window Low. Human review only. No chase.

### 39. 2026-06-01 2026-06-01T16:00:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7613.75 / 7614.75 / 1
- T1/T2: 7612.25 / 7611.75
- FVG: 7614.25-7614.5 formed 2026-06-01T08:05:00
- Line in the Sand: 7613.5 London Bearish Displacement Imbalance Bottom (Asian low is below London low)
- Outcome to close: STOP; MFE 0.5; MAE 1.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7613.5 London Bearish Displacement Imbalance Bottom. Human review only. No chase.

### 40. 2026-06-01 2026-06-01T16:05:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7614.75 / 7617.5 / 2.75
- T1/T2: 7610.75 / 7609.25
- FVG: 7615.5-7617.25 formed 2026-06-01T08:00:00
- Line in the Sand: 7613.5 London Bearish Displacement Imbalance Bottom (Asian low is below London low)
- Outcome to close: T1; MFE 4; MAE 1.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7613.5 London Bearish Displacement Imbalance Bottom. Human review only. No chase.

### 41. 2026-06-01 2026-06-01T16:10:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7614.25 / 7617.5 / 3.25
- T1/T2: 7609.5 / 7607.75
- FVG: 7615.5-7617.25 formed 2026-06-01T08:00:00
- Line in the Sand: 7613.5 London Bearish Displacement Imbalance Bottom (Asian low is below London low)
- Outcome to close: STOP; MFE 3.75; MAE 4
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7613.5 London Bearish Displacement Imbalance Bottom. Human review only. No chase.

### 42. 2026-06-01 2026-06-01T16:15:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7615.75 / 7616.75 / 1
- T1/T2: 7614.25 / 7613.75
- FVG: 7616.25-7616.5 formed 2026-06-01T02:30:00
- Line in the Sand: 7613.5 London Bearish Displacement Imbalance Bottom (Asian low is below London low)
- Outcome to close: T2; MFE 2.5; MAE 0
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7613.5 London Bearish Displacement Imbalance Bottom. Human review only. No chase.

### 43. 2026-06-01 2026-06-01T16:20:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7614.25 / 7617.5 / 3.25
- T1/T2: 7609.5 / 7607.75
- FVG: 7615.5-7617.25 formed 2026-06-01T08:00:00
- Line in the Sand: 7613.5 London Bearish Displacement Imbalance Bottom (Asian low is below London low)
- Outcome to close: STOP; MFE 3.75; MAE 4
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7613.5 London Bearish Displacement Imbalance Bottom. Human review only. No chase.

### 44. 2026-06-01 2026-06-01T16:25:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7613.5 / 7615.25 / 1.75
- T1/T2: 7611 / 7610
- FVG: 7614.25-7615 formed 2026-06-01T16:00:00
- Line in the Sand: 7613.5 London Bearish Displacement Imbalance Bottom (Asian low is below London low)
- Outcome to close: T1; MFE 2.75; MAE 0
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7613.5 London Bearish Displacement Imbalance Bottom. Human review only. No chase.

### 45. 2026-06-01 2026-06-01T16:35:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7613.75 / 7615.25 / 1.5
- T1/T2: 7611.5 / 7610.75
- FVG: 7614.25-7615 formed 2026-06-01T16:00:00
- Line in the Sand: 7613.5 London Bearish Displacement Imbalance Bottom (Asian low is below London low)
- Outcome to close: STOP; MFE 1.5; MAE 4.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7613.5 London Bearish Displacement Imbalance Bottom. Human review only. No chase.

### 46. 2026-06-01 2026-06-01T16:40:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7613 / 7615.25 / 2.25
- T1/T2: 7609.75 / 7608.5
- FVG: 7614.25-7615 formed 2026-06-01T16:00:00
- Line in the Sand: 7610.5 Current Imported Window Low (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 0.75; MAE 5.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7610.5 Current Imported Window Low. Human review only. No chase.

### 47. 2026-06-02 2026-06-02T15:05:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7622 / 7618.5 / 3.5
- T1/T2: 7627.25 / 7629
- FVG: 7621-7621.5 formed 2026-06-02T11:00:00
- Line in the Sand: 7622.25 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: T1; MFE 5.5; MAE 2.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7622.25 Current Imported Window High. Human review only. No chase.

### 48. 2026-06-02 2026-06-02T15:10:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7622 / 7620.25 / 1.75
- T1/T2: 7624.75 / 7625.5
- FVG: 7621-7621.5 formed 2026-06-02T11:00:00
- Line in the Sand: 7622.25 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 0.75; MAE 2
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7622.25 Current Imported Window High. Human review only. No chase.

### 49. 2026-06-02 2026-06-02T15:15:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7620.5 / 7617 / 3.5
- T1/T2: 7625.75 / 7627.5
- FVG: 7617.25-7620 formed 2026-06-02T10:55:00
- Line in the Sand: 7622.75 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: T2; MFE 7; MAE 1
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7622.75 Current Imported Window High. Human review only. No chase.

### 50. 2026-06-02 2026-06-02T15:20:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7621.25 / 7619.75 / 1.5
- T1/T2: 7623.5 / 7624.25
- FVG: 7620-7620.5 formed 2026-06-02T15:10:00
- Line in the Sand: 7622.75 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: T1; MFE 2.5; MAE 0.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7622.75 Current Imported Window High. Human review only. No chase.

### 51. 2026-06-02 2026-06-02T15:25:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7623.5 / 7620.75 / 2.75
- T1/T2: 7627.75 / 7629
- FVG: 7621-7621.5 formed 2026-06-02T11:00:00
- Line in the Sand: 7623.75 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 0.25; MAE 3
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7623.75 Current Imported Window High. Human review only. No chase.

### 52. 2026-06-02 2026-06-02T15:30:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7621.5 / 7619.75 / 1.75
- T1/T2: 7624.25 / 7625
- FVG: 7620-7620.5 formed 2026-06-02T15:10:00
- Line in the Sand: 7623.75 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 1.5; MAE 2
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7623.75 Current Imported Window High. Human review only. No chase.

### 53. 2026-06-02 2026-06-02T15:35:00 LONG

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7622.5 / 7620.75 / 1.75
- T1/T2: 7625.25 / 7626
- FVG: 7621-7621.5 formed 2026-06-02T11:00:00
- Line in the Sand: 7623.75 Current Imported Window High (16 bars reviewed for Current Imported Window.)
- Outcome to close: STOP; MFE 0.5; MAE 2.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7623.75 Current Imported Window High. Human review only. No chase.

### 54. 2026-06-04 2026-06-04T15:55:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7604.25 / 7609.25 / 5
- T1/T2: 7596.75 / 7594.25
- FVG: 7607.5-7609 formed 2026-06-04T15:50:00
- Line in the Sand: 7602.25 Current Imported Window Low (16 bars reviewed for Current Imported Window.)
- Outcome to close: T2; MFE 10; MAE 0
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7602.25 Current Imported Window Low. Human review only. No chase.

### 55. 2026-06-05 2026-06-05T15:00:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7416.5 / 7426.5 / 10
- T1/T2: 7401.5 / 7396.5
- FVG: 7424.75-7425.5 formed 2026-06-05T14:50:00
- Line in the Sand: 7410 Round Number 7410 (Whole/round-number magnet inside imported context range.)
- Outcome to close: T1; MFE 17; MAE 1.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7410 Round Number 7410. Human review only. No chase.

### 56. 2026-06-05 2026-06-05T15:35:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7404 / 7410 / 6
- T1/T2: 7395 / 7392
- FVG: 7405.25-7407 formed 2026-06-05T15:15:00
- Line in the Sand: 7403.75 RTH Open (First imported 5M RTH bar open.)
- Outcome to close: STOP; MFE 1.75; MAE 9
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7403.75 RTH Open. Human review only. No chase.

### 57. 2026-06-05 2026-06-05T15:45:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7402.75 / 7412.75 / 10
- T1/T2: 7387.75 / 7382.75
- FVG: 7405.25-7407 formed 2026-06-05T15:15:00
- Line in the Sand: 7400 Round Number 7400 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 1.75; MAE 12
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7400 Round Number 7400. Human review only. No chase.

### 58. 2026-06-05 2026-06-05T16:00:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7400 / 7417 / 17
- T1/T2: 7374.5 / 7366
- FVG: 7405.25-7407 formed 2026-06-05T15:15:00
- Line in the Sand: 7400 Round Number 7400 (Whole/round-number magnet inside imported context range.)
- Outcome to close: T1; MFE 26; MAE 1.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7400 Round Number 7400. Human review only. No chase.

### 59. 2026-06-05 2026-06-05T16:05:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7378.25 / 7401.75 / 23.5
- T1/T2: 7343 / 7331.25
- FVG: 7396.75-7399.5 formed 2026-06-05T15:20:00
- Line in the Sand: 7374 Current Imported Window Low (16 bars reviewed for Current Imported Window.)
- Outcome to close: NONE; MFE 19.25; MAE 0.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7374 Current Imported Window Low. Human review only. No chase.

### 60. 2026-06-08 2026-06-08T15:00:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7431.75 / 7440.25 / 8.5
- T1/T2: 7419 / 7414.75
- FVG: 7436-7440 formed 2026-06-08T14:45:00
- Line in the Sand: 7430.5 RTH Morning Bearish Displacement Imbalance Bottom (Body 23.75 vs avg 3.70; range 25.75 vs avg 7.65. Body/range 92%; close location bottom_quarter. Leaves/overlaps FVG imbalance. No structure break detected. Occurs near rth_morning timing. Overlaps a detected FVG/imbalance zone.)
- Outcome to close: T2; MFE 17; MAE 2.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7430.5 RTH Morning Bearish Displacement Imbalance Bottom. Human review only. No chase.

### 61. 2026-06-08 2026-06-08T15:15:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7414.75 / 7424.75 / 10
- T1/T2: 7399.75 / 7394.75
- FVG: 7420.75-7423.75 formed 2026-06-08T06:25:00
- Line in the Sand: 7414.75 Lunch/PM Setup Scan Window Low (61 bars reviewed for Lunch/PM Setup Scan Window.)
- Outcome to close: NONE; MFE 11; MAE 9.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7414.75 Lunch/PM Setup Scan Window Low. Human review only. No chase.

### 62. 2026-06-08 2026-06-08T15:20:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7414.5 / 7418.75 / 4.25
- T1/T2: 7408.25 / 7406
- FVG: 7414.75-7415.25 formed 2026-06-08T00:10:00
- Line in the Sand: 7411.5 Lunch/PM Setup Scan Window Low (62 bars reviewed for Lunch/PM Setup Scan Window.)
- Outcome to close: AMBIGUOUS; MFE 8.25; MAE 4.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7411.5 Lunch/PM Setup Scan Window Low. Human review only. No chase.

### 63. 2026-06-08 2026-06-08T15:25:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7407.25 / 7424.5 / 17.25
- T1/T2: 7381.5 / 7372.75
- FVG: 7418.5-7424.25 formed 2026-06-08T15:20:00
- Line in the Sand: 7406.25 Lunch/PM Setup Scan Window Low (63 bars reviewed for Lunch/PM Setup Scan Window.)
- Outcome to close: NONE; MFE 3.5; MAE 17
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7406.25 Lunch/PM Setup Scan Window Low. Human review only. No chase.

### 64. 2026-06-08 2026-06-08T15:30:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7414.5 / 7415.5 / 1
- T1/T2: 7413 / 7412.5
- FVG: 7414.75-7415.25 formed 2026-06-08T00:10:00
- Line in the Sand: 7410 Round Number 7410 (Whole/round-number magnet inside imported context range.)
- Outcome to close: STOP; MFE 1; MAE 9.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7410 Round Number 7410. Human review only. No chase.

### 65. 2026-06-08 2026-06-08T15:35:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7417 / 7424.5 / 7.5
- T1/T2: 7405.75 / 7402
- FVG: 7418.5-7424.25 formed 2026-06-08T15:20:00
- Line in the Sand: 7415.5 Morning Setup Scan Window Low (36 bars reviewed for Morning Setup Scan Window.)
- Outcome to close: NONE; MFE 6.5; MAE 5.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7415.5 Morning Setup Scan Window Low. Human review only. No chase.

### 66. 2026-06-08 2026-06-08T15:40:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7416.25 / 7424.5 / 8.25
- T1/T2: 7404 / 7399.75
- FVG: 7418.5-7424.25 formed 2026-06-08T15:20:00
- Line in the Sand: 7415.5 Morning Setup Scan Window Low (36 bars reviewed for Morning Setup Scan Window.)
- Outcome to close: NONE; MFE 5.75; MAE 6
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7415.5 Morning Setup Scan Window Low. Human review only. No chase.

### 67. 2026-06-08 2026-06-08T15:45:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7416 / 7424.5 / 8.5
- T1/T2: 7403.25 / 7399
- FVG: 7418.5-7424.25 formed 2026-06-08T15:20:00
- Line in the Sand: 7415.5 Morning Setup Scan Window Low (36 bars reviewed for Morning Setup Scan Window.)
- Outcome to close: NONE; MFE 5.5; MAE 6.25
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7415.5 Morning Setup Scan Window Low. Human review only. No chase.

### 68. 2026-06-08 2026-06-08T15:50:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7415.5 / 7424.5 / 9
- T1/T2: 7402 / 7397.5
- FVG: 7418.5-7424.25 formed 2026-06-08T15:20:00
- Line in the Sand: 7415.5 Morning Setup Scan Window Low (36 bars reviewed for Morning Setup Scan Window.)
- Outcome to close: NONE; MFE 5; MAE 6.75
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7415.5 Morning Setup Scan Window Low. Human review only. No chase.

### 69. 2026-06-08 2026-06-08T15:55:00 SHORT

- Trigger: fvg_retest_rejection
- Entry/Stop/Risk: 7414.75 / 7424.5 / 9.75
- T1/T2: 7400.25 / 7395.25
- FVG: 7418.5-7424.25 formed 2026-06-08T15:20:00
- Line in the Sand: 7410 Round Number 7410 (Whole/round-number magnet inside imported context range.)
- Outcome to close: NONE; MFE 3; MAE 3.5
- Notes: Late-day micro-continuation review only. 15M and 5M MSS aligned from structured OHLC. Completed 5M FVG retest/rejection detected. Named HTF line from scanner structured map: 7410 Round Number 7410. Human review only. No chase.

Authority: research-only. This audit does not change active windows, approve trades, post Discord alerts, or alter canExecute.