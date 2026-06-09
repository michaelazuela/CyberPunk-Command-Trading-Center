# Late-Day MSS Campaign Variant Research

Source: tools/automation/replay-diagnostics/late-day-micro-continuation-audit-1500-1640-mss-trigger-model-2026-05-09-to-2026-06-08.json
Interpretation: One trade per MSS campaign. Campaigns grouped by trade date and direction; no re-entry within same campaign.
Max risk for Variant B: 5 points

## Variant Summary

| Variant | Campaigns | Trades Taken | No Trade | Scored | Ambiguous | Wins | Losses | Win Rate | Gross 1 MES P/L |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A_first_qualifying_signal | 8 | 8 | 0 | 8 | 0 | 8 | 0 | 100% | $403.75 |
| B_first_signal_max_5pt_risk | 8 | 7 | 1 | 5 | 2 | 4 | 1 | 80% | $122.5 |
| C_first_clean_fvg_retest_rejection | 8 | 8 | 0 | 8 | 0 | 8 | 0 | 100% | $403.75 |
| D_hindsight_best_candidate_reference_only | 8 | 8 | 0 | 8 | 0 | 8 | 0 | 100% | $566.25 |

## A_first_qualifying_signal

| Campaign | Time | Dir | Entry | Stop | Risk | T1 | T2 | Outcome | 1 MES P/L | Reason |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| 2026-05-18-LONG | 15:05 | LONG | 7404.5 | 7375.5 | 29 | 7448 | 7462.5 | NONE | 48.75 | First completed 5M MSS/FVG qualifying signal in campaign. |
| 2026-05-20-LONG | 15:15 | LONG | 7444.25 | 7438.5 | 5.75 | 7453 | 7455.75 | T1 | 43.75 | First completed 5M MSS/FVG qualifying signal in campaign. |
| 2026-05-26-LONG | 15:35 | LONG | 7532.75 | 7527.5 | 5.25 | 7540.75 | 7543.25 | T1 | 40 | First completed 5M MSS/FVG qualifying signal in campaign. |
| 2026-06-01-SHORT | 15:50 | SHORT | 7615.5 | 7620.25 | 4.75 | 7608.5 | 7606 | T1 | 35 | First completed 5M MSS/FVG qualifying signal in campaign. |
| 2026-06-02-LONG | 15:05 | LONG | 7622 | 7618.5 | 3.5 | 7627.25 | 7629 | T1 | 26.25 | First completed 5M MSS/FVG qualifying signal in campaign. |
| 2026-06-04-SHORT | 15:55 | SHORT | 7604.25 | 7609.25 | 5 | 7596.75 | 7594.25 | T2 | 50 | First completed 5M MSS/FVG qualifying signal in campaign. |
| 2026-06-05-SHORT | 15:00 | SHORT | 7416.5 | 7426.5 | 10 | 7401.5 | 7396.5 | T1 | 75 | First completed 5M MSS/FVG qualifying signal in campaign. |
| 2026-06-08-SHORT | 15:00 | SHORT | 7431.75 | 7440.25 | 8.5 | 7419 | 7414.75 | T2 | 85 | First completed 5M MSS/FVG qualifying signal in campaign. |

## B_first_signal_max_5pt_risk

| Campaign | Time | Dir | Entry | Stop | Risk | T1 | T2 | Outcome | 1 MES P/L | Reason |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| 2026-05-18-LONG | 15:15 | LONG | 7400.75 | 7398.75 | 2 | 7403.75 | 7404.75 | AMBIGUOUS | N/A | First campaign signal with risk <= 5 points. |
| 2026-05-20-LONG | 15:20 | LONG | 7445.75 | 7442.5 | 3.25 | 7450.75 | 7452.25 | T2 | 32.5 | First campaign signal with risk <= 5 points. |
| 2026-05-26-LONG | 15:45 | LONG | 7538.5 | 7534.25 | 4.25 | 7545 | 7547 | STOP | -21.25 | First campaign signal with risk <= 5 points. |
| 2026-06-01-SHORT | 15:50 | SHORT | 7615.5 | 7620.25 | 4.75 | 7608.5 | 7606 | T1 | 35 | First campaign signal with risk <= 5 points. |
| 2026-06-02-LONG | 15:05 | LONG | 7622 | 7618.5 | 3.5 | 7627.25 | 7629 | T1 | 26.25 | First campaign signal with risk <= 5 points. |
| 2026-06-04-SHORT | 15:55 | SHORT | 7604.25 | 7609.25 | 5 | 7596.75 | 7594.25 | T2 | 50 | First campaign signal with risk <= 5 points. |
| 2026-06-05-SHORT | N/A | SHORT | N/A | N/A | N/A | N/A | N/A | NO_TRADE | N/A | No campaign signal had risk <= 5 points. |
| 2026-06-08-SHORT | 15:20 | SHORT | 7414.5 | 7418.75 | 4.25 | 7408.25 | 7406 | AMBIGUOUS | N/A | First campaign signal with risk <= 5 points. |

## C_first_clean_fvg_retest_rejection

| Campaign | Time | Dir | Entry | Stop | Risk | T1 | T2 | Outcome | 1 MES P/L | Reason |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| 2026-05-18-LONG | 15:05 | LONG | 7404.5 | 7375.5 | 29 | 7448 | 7462.5 | NONE | 48.75 | First completed 5M FVG retest/rejection in campaign. All source candidates already satisfy this condition, so C equals A here. |
| 2026-05-20-LONG | 15:15 | LONG | 7444.25 | 7438.5 | 5.75 | 7453 | 7455.75 | T1 | 43.75 | First completed 5M FVG retest/rejection in campaign. All source candidates already satisfy this condition, so C equals A here. |
| 2026-05-26-LONG | 15:35 | LONG | 7532.75 | 7527.5 | 5.25 | 7540.75 | 7543.25 | T1 | 40 | First completed 5M FVG retest/rejection in campaign. All source candidates already satisfy this condition, so C equals A here. |
| 2026-06-01-SHORT | 15:50 | SHORT | 7615.5 | 7620.25 | 4.75 | 7608.5 | 7606 | T1 | 35 | First completed 5M FVG retest/rejection in campaign. All source candidates already satisfy this condition, so C equals A here. |
| 2026-06-02-LONG | 15:05 | LONG | 7622 | 7618.5 | 3.5 | 7627.25 | 7629 | T1 | 26.25 | First completed 5M FVG retest/rejection in campaign. All source candidates already satisfy this condition, so C equals A here. |
| 2026-06-04-SHORT | 15:55 | SHORT | 7604.25 | 7609.25 | 5 | 7596.75 | 7594.25 | T2 | 50 | First completed 5M FVG retest/rejection in campaign. All source candidates already satisfy this condition, so C equals A here. |
| 2026-06-05-SHORT | 15:00 | SHORT | 7416.5 | 7426.5 | 10 | 7401.5 | 7396.5 | T1 | 75 | First completed 5M FVG retest/rejection in campaign. All source candidates already satisfy this condition, so C equals A here. |
| 2026-06-08-SHORT | 15:00 | SHORT | 7431.75 | 7440.25 | 8.5 | 7419 | 7414.75 | T2 | 85 | First completed 5M FVG retest/rejection in campaign. All source candidates already satisfy this condition, so C equals A here. |

## D_hindsight_best_candidate_reference_only

| Campaign | Time | Dir | Entry | Stop | Risk | T1 | T2 | Outcome | 1 MES P/L | Reason |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| 2026-05-18-LONG | 15:35 | LONG | 7401 | 7381 | 20 | 7431 | 7441 | T1 | 150 | Hindsight-only best P/L candidate inside campaign. Not tradable as a live rule. |
| 2026-05-20-LONG | 15:15 | LONG | 7444.25 | 7438.5 | 5.75 | 7453 | 7455.75 | T1 | 43.75 | Hindsight-only best P/L candidate inside campaign. Not tradable as a live rule. |
| 2026-05-26-LONG | 15:35 | LONG | 7532.75 | 7527.5 | 5.25 | 7540.75 | 7543.25 | T1 | 40 | Hindsight-only best P/L candidate inside campaign. Not tradable as a live rule. |
| 2026-06-01-SHORT | 15:50 | SHORT | 7615.5 | 7620.25 | 4.75 | 7608.5 | 7606 | T1 | 35 | Hindsight-only best P/L candidate inside campaign. Not tradable as a live rule. |
| 2026-06-02-LONG | 15:15 | LONG | 7620.5 | 7617 | 3.5 | 7625.75 | 7627.5 | T2 | 35 | Hindsight-only best P/L candidate inside campaign. Not tradable as a live rule. |
| 2026-06-04-SHORT | 15:55 | SHORT | 7604.25 | 7609.25 | 5 | 7596.75 | 7594.25 | T2 | 50 | Hindsight-only best P/L candidate inside campaign. Not tradable as a live rule. |
| 2026-06-05-SHORT | 16:00 | SHORT | 7400 | 7417 | 17 | 7374.5 | 7366 | T1 | 127.5 | Hindsight-only best P/L candidate inside campaign. Not tradable as a live rule. |
| 2026-06-08-SHORT | 15:00 | SHORT | 7431.75 | 7440.25 | 8.5 | 7419 | 7414.75 | T2 | 85 | Hindsight-only best P/L candidate inside campaign. Not tradable as a live rule. |
