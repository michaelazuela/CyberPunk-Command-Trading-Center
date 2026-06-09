# Active Campaign Close-Through Audit

Instrument: MES (MES 06-26)
Range: 2026-05-10 through 2026-06-09
Pattern: one trade per date/session/direction after completed 5M MSS close-through line.
Authority: research-only; no scanner rules, Discord behavior, bridge behavior, or canExecute changed.

## Summary

- Trades: 70
- Longs: 34
- Shorts: 36
- T1: 22
- T2: 2
- Stops: 40
- None by close: 6
- Ambiguous: 0
- Gross one MES P/L excluding ambiguous: $456.25

## Daily P/L

| Date | Trades | T1 | T2 | Stop | None | Ambiguous | One MES P/L |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026-05-11 | 4 | 0 | 0 | 4 | 0 | 0 | $-235.00 |
| 2026-05-12 | 2 | 1 | 0 | 1 | 0 | 0 | $93.75 |
| 2026-05-13 | 3 | 2 | 0 | 1 | 0 | 0 | $175.00 |
| 2026-05-14 | 2 | 1 | 0 | 1 | 0 | 0 | $21.25 |
| 2026-05-15 | 4 | 1 | 0 | 3 | 0 | 0 | $-177.50 |
| 2026-05-18 | 4 | 0 | 0 | 3 | 1 | 0 | $-308.75 |
| 2026-05-19 | 3 | 2 | 0 | 1 | 0 | 0 | $42.50 |
| 2026-05-20 | 4 | 0 | 0 | 3 | 1 | 0 | $-63.75 |
| 2026-05-21 | 3 | 1 | 0 | 2 | 0 | 0 | $11.25 |
| 2026-05-22 | 2 | 1 | 0 | 1 | 0 | 0 | $41.25 |
| 2026-05-25 | 4 | 0 | 0 | 4 | 0 | 0 | $-128.75 |
| 2026-05-26 | 3 | 1 | 0 | 1 | 1 | 0 | $-55.00 |
| 2026-05-27 | 3 | 0 | 0 | 3 | 0 | 0 | $-235.00 |
| 2026-05-28 | 4 | 1 | 1 | 2 | 0 | 0 | $-21.25 |
| 2026-05-29 | 3 | 0 | 0 | 1 | 2 | 0 | $-131.25 |
| 2026-06-01 | 3 | 1 | 1 | 1 | 0 | 0 | $198.75 |
| 2026-06-02 | 2 | 1 | 0 | 1 | 0 | 0 | $-8.75 |
| 2026-06-03 | 4 | 1 | 0 | 3 | 0 | 0 | $-183.75 |
| 2026-06-04 | 4 | 2 | 0 | 2 | 0 | 0 | $141.25 |
| 2026-06-05 | 3 | 2 | 0 | 1 | 0 | 0 | $383.75 |
| 2026-06-08 | 3 | 2 | 0 | 1 | 0 | 0 | $215.00 |
| 2026-06-09 | 3 | 2 | 0 | 0 | 1 | 0 | $681.25 |

## Trade Breakdown

| # | Date | Time ET | Session | Dir | Line | Entry | Stop | Risk | T1 | T2 | Outcome | 1 MES P/L | HTF Read |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| 1 | 2026-05-11 | 10:30 | morning | SHORT | 7430.50 | 7430.25 | 7437.50 | 7.25 | 7419.50 | 7415.75 | STOP | $-36.25 | 15M displacement/close-through supports SHORT. 60M displacement/close-through supports SHORT. 240M displacement/close-through supports SHORT. Caution: 120M recent displacement opposes SHORT. | |
| 2 | 2026-05-11 | 10:55 | morning | LONG | 7437.25 | 7444.25 | 7421.25 | 23.00 | 7478.75 | 7490.25 | STOP | $-115.00 | 60M displacement/close-through supports LONG. 120M displacement/close-through supports LONG. 240M displacement/close-through supports LONG. | |
| 3 | 2026-05-11 | 12:45 | lunch | SHORT | 7445.50 | 7443.00 | 7450.00 | 7.00 | 7432.50 | 7429.00 | STOP | $-35.00 | 15M displacement/close-through supports SHORT. 60M displacement/close-through supports SHORT. 240M displacement/close-through supports SHORT. Caution: 120M recent displacement opposes SHORT. | |
| 4 | 2026-05-11 | 13:30 | lunch | LONG | 7443.00 | 7444.00 | 7434.25 | 9.75 | 7458.75 | 7463.50 | STOP | $-48.75 | 15M displacement/close-through supports LONG. 60M displacement/close-through supports LONG. 120M displacement/close-through supports LONG. 240M displacement/close-through supports LONG. | |
| 5 | 2026-05-12 | 12:35 | lunch | SHORT | 7370.75 | 7370.50 | 7380.25 | 9.75 | 7356.00 | 7351.00 | STOP | $-48.75 | 60M displacement/close-through supports SHORT. 120M displacement/close-through supports SHORT. 240M displacement/close-through supports SHORT. | |
| 6 | 2026-05-12 | 13:20 | lunch | LONG | 7379.25 | 7385.75 | 7366.75 | 19.00 | 7414.25 | 7423.75 | T1 | $142.50 | 15M displacement/close-through supports LONG. 60M displacement/close-through supports LONG. 120M displacement/close-through supports LONG. 240M displacement/close-through supports LONG. | |
| 7 | 2026-05-13 | 10:55 | morning | LONG | 7431.50 | 7433.25 | 7413.75 | 19.50 | 7462.50 | 7472.25 | T1 | $146.25 | 60M displacement/close-through supports LONG. 120M displacement/close-through supports LONG. 240M displacement/close-through supports LONG. | |
| 8 | 2026-05-13 | 12:10 | lunch | LONG | 7447.00 | 7448.00 | 7439.50 | 8.50 | 7460.75 | 7465.00 | T1 | $63.75 | 60M displacement/close-through supports LONG. 120M displacement/close-through supports LONG. 240M displacement/close-through supports LONG. | |
| 9 | 2026-05-13 | 14:00 | lunch | SHORT | 7466.50 | 7466.25 | 7473.25 | 7.00 | 7455.75 | 7452.25 | STOP | $-35.00 | 15M displacement/close-through supports SHORT. | |
| 10 | 2026-05-14 | 12:25 | lunch | SHORT | 7533.50 | 7530.75 | 7540.25 | 9.50 | 7516.50 | 7511.75 | T1 | $71.25 | 120M displacement/close-through supports SHORT. Caution: 60M recent displacement opposes SHORT. 240M recent displacement opposes SHORT. | |
| 11 | 2026-05-14 | 15:00 | lunch | LONG | 7525.50 | 7527.50 | 7517.50 | 10.00 | 7542.50 | 7547.50 | STOP | $-50.00 | 15M displacement/close-through supports LONG. 120M displacement/close-through supports LONG. | |
| 12 | 2026-05-15 | 10:15 | morning | LONG | 7451.00 | 7452.25 | 7430.00 | 22.25 | 7485.75 | 7496.75 | STOP | $-111.25 | 15M displacement/close-through supports LONG. 120M displacement/close-through supports LONG. Caution: 240M recent displacement opposes LONG. | |
| 13 | 2026-05-15 | 11:45 | morning | SHORT | 7448.25 | 7442.00 | 7460.75 | 18.75 | 7414.00 | 7404.50 | STOP | $-93.75 | 15M displacement/close-through supports SHORT. 120M displacement/close-through supports SHORT. 240M displacement/close-through supports SHORT. | |
| 14 | 2026-05-15 | 12:00 | lunch | SHORT | 7448.25 | 7443.25 | 7460.75 | 17.50 | 7417.00 | 7408.25 | STOP | $-87.50 | 240M displacement/close-through supports SHORT. Caution: 120M recent displacement opposes SHORT. | |
| 15 | 2026-05-15 | 12:25 | lunch | LONG | 7447.25 | 7452.25 | 7437.00 | 15.25 | 7475.25 | 7482.75 | T1 | $115.00 | 15M displacement/close-through supports LONG. 120M displacement/close-through supports LONG. Caution: 240M recent displacement opposes LONG. | |
| 16 | 2026-05-18 | 10:00 | morning | LONG | 7444.25 | 7446.00 | 7415.00 | 31.00 | 7492.50 | 7508.00 | STOP | $-155.00 | 15M displacement/close-through supports LONG. 120M displacement/close-through supports LONG. 240M displacement/close-through supports LONG. | |
| 17 | 2026-05-18 | 10:35 | morning | SHORT | 7425.75 | 7414.50 | 7448.50 | 34.00 | 7363.50 | 7346.50 | NONE | $1.25 | 5M execution only Caution: 120M recent displacement opposes SHORT. 240M recent displacement opposes SHORT. | |
| 18 | 2026-05-18 | 12:05 | lunch | SHORT | 7399.50 | 7398.75 | 7412.25 | 13.50 | 7378.50 | 7371.75 | STOP | $-67.50 | 60M displacement/close-through supports SHORT. 120M displacement/close-through supports SHORT. Caution: 240M recent displacement opposes SHORT. | |
| 19 | 2026-05-18 | 12:55 | lunch | LONG | 7401.00 | 7407.75 | 7390.25 | 17.50 | 7434.00 | 7442.75 | STOP | $-87.50 | 240M displacement/close-through supports LONG. Caution: 60M recent displacement opposes LONG. 120M recent displacement opposes LONG. | |
| 20 | 2026-05-19 | 10:15 | morning | SHORT | 7369.75 | 7368.25 | 7402.25 | 34.00 | 7317.25 | 7300.25 | STOP | $-170.00 | 15M displacement/close-through supports SHORT. | |
| 21 | 2026-05-19 | 12:25 | lunch | LONG | 7379.25 | 7379.75 | 7361.50 | 18.25 | 7407.25 | 7416.25 | T1 | $137.50 | 5M execution only Caution: 120M recent displacement opposes LONG. | |
| 22 | 2026-05-19 | 13:55 | lunch | SHORT | 7406.00 | 7403.75 | 7413.75 | 10.00 | 7388.75 | 7383.75 | T1 | $75.00 | 120M displacement/close-through supports SHORT. Caution: 60M recent displacement opposes SHORT. | |
| 23 | 2026-05-20 | 10:05 | morning | SHORT | 7391.50 | 7389.75 | 7411.00 | 21.25 | 7358.00 | 7347.25 | STOP | $-106.25 | 5M execution only | |
| 24 | 2026-05-20 | 10:20 | morning | LONG | 7410.75 | 7411.50 | 7376.50 | 35.00 | 7464.00 | 7481.50 | NONE | $160.00 | 5M execution only | |
| 25 | 2026-05-20 | 12:20 | lunch | SHORT | 7437.50 | 7435.75 | 7444.50 | 8.75 | 7422.75 | 7418.25 | STOP | $-43.75 | 5M execution only Caution: 60M recent displacement opposes SHORT. 120M recent displacement opposes SHORT. | |
| 26 | 2026-05-20 | 12:45 | lunch | LONG | 7432.75 | 7438.00 | 7423.25 | 14.75 | 7460.25 | 7467.50 | STOP | $-73.75 | 60M displacement/close-through supports LONG. 120M displacement/close-through supports LONG. | |
| 27 | 2026-05-21 | 10:00 | morning | LONG | 7424.25 | 7435.50 | 7409.75 | 25.75 | 7474.25 | 7487.00 | STOP | $-128.75 | 15M displacement/close-through supports LONG. | |
| 28 | 2026-05-21 | 12:20 | lunch | SHORT | 7429.25 | 7429.00 | 7437.50 | 8.50 | 7416.25 | 7412.00 | STOP | $-42.50 | 5M execution only | |
| 29 | 2026-05-21 | 13:15 | lunch | LONG | 7430.75 | 7442.00 | 7417.75 | 24.25 | 7478.50 | 7490.50 | T1 | $182.50 | 15M displacement/close-through supports LONG. | |
| 30 | 2026-05-22 | 13:05 | lunch | LONG | 7510.00 | 7512.50 | 7502.50 | 10.00 | 7527.50 | 7532.50 | STOP | $-50.00 | 240M displacement/close-through supports LONG. | |
| 31 | 2026-05-22 | 13:50 | lunch | SHORT | 7512.25 | 7512.00 | 7524.25 | 12.25 | 7493.75 | 7487.50 | T1 | $91.25 | 5M execution only Caution: 240M recent displacement opposes SHORT. | |
| 32 | 2026-05-25 | 10:15 | morning | SHORT | 7561.75 | 7560.25 | 7566.00 | 5.75 | 7551.75 | 7548.75 | STOP | $-28.75 | 15M displacement/close-through supports SHORT. | |
| 33 | 2026-05-25 | 11:15 | morning | LONG | 7558.25 | 7564.00 | 7555.00 | 9.00 | 7577.50 | 7582.00 | STOP | $-45.00 | 15M displacement/close-through supports LONG. Caution: 60M recent displacement opposes LONG. | |
| 34 | 2026-05-25 | 12:25 | lunch | SHORT | 7557.00 | 7556.50 | 7560.00 | 3.50 | 7551.25 | 7549.50 | STOP | $-17.50 | 5M execution only | |
| 35 | 2026-05-25 | 12:50 | lunch | LONG | 7559.75 | 7562.50 | 7555.00 | 7.50 | 7573.75 | 7577.50 | STOP | $-37.50 | 5M execution only | |
| 36 | 2026-05-26 | 11:05 | morning | SHORT | 7546.75 | 7541.25 | 7553.00 | 11.75 | 7523.75 | 7517.75 | T1 | $87.50 | 5M execution only Caution: 60M recent displacement opposes SHORT. | |
| 37 | 2026-05-26 | 12:00 | lunch | SHORT | 7525.25 | 7523.00 | 7553.00 | 30.00 | 7478.00 | 7463.00 | NONE | $-85.00 | 15M displacement/close-through supports SHORT. 60M displacement/close-through supports SHORT. 120M displacement/close-through supports SHORT. | |
| 38 | 2026-05-26 | 12:30 | lunch | LONG | 7527.75 | 7531.00 | 7519.50 | 11.50 | 7548.25 | 7554.00 | STOP | $-57.50 | 15M displacement/close-through supports LONG. Caution: 60M recent displacement opposes LONG. 120M recent displacement opposes LONG. | |
| 39 | 2026-05-27 | 10:30 | morning | SHORT | 7534.00 | 7533.50 | 7547.50 | 14.00 | 7512.50 | 7505.50 | STOP | $-70.00 | 15M displacement/close-through supports SHORT. 60M displacement/close-through supports SHORT. 120M displacement/close-through supports SHORT. | |
| 40 | 2026-05-27 | 12:10 | lunch | LONG | 7526.00 | 7528.00 | 7518.75 | 9.25 | 7542.00 | 7546.50 | STOP | $-46.25 | 5M execution only Caution: 60M recent displacement opposes LONG. 120M recent displacement opposes LONG. | |
| 41 | 2026-05-27 | 13:10 | lunch | SHORT | 7527.75 | 7516.00 | 7539.75 | 23.75 | 7480.50 | 7468.50 | STOP | $-118.75 | 120M displacement/close-through supports SHORT. | |
| 42 | 2026-05-28 | 10:10 | morning | LONG | 7537.25 | 7540.25 | 7534.25 | 6.00 | 7549.25 | 7552.25 | T2 | $60.00 | 120M displacement/close-through supports LONG. | |
| 43 | 2026-05-28 | 10:35 | morning | SHORT | 7553.25 | 7553.00 | 7574.25 | 21.25 | 7521.25 | 7510.50 | STOP | $-106.25 | 5M execution only Caution: 120M recent displacement opposes SHORT. | |
| 44 | 2026-05-28 | 12:20 | lunch | LONG | 7577.00 | 7579.00 | 7570.50 | 8.50 | 7591.75 | 7596.00 | T1 | $63.75 | 60M displacement/close-through supports LONG. 120M displacement/close-through supports LONG. | |
| 45 | 2026-05-28 | 13:20 | lunch | SHORT | 7576.50 | 7575.50 | 7583.25 | 7.75 | 7564.00 | 7560.00 | STOP | $-38.75 | 5M execution only Caution: 60M recent displacement opposes SHORT. 120M recent displacement opposes SHORT. | |
| 46 | 2026-05-29 | 10:40 | morning | SHORT | 7589.00 | 7586.75 | 7612.00 | 25.25 | 7549.00 | 7536.25 | NONE | $-18.75 | 15M displacement/close-through supports SHORT. Caution: 60M recent displacement opposes SHORT. 120M recent displacement opposes SHORT. 240M recent displacement opposes SHORT. | |
| 47 | 2026-05-29 | 11:15 | morning | LONG | 7598.00 | 7603.25 | 7577.25 | 26.00 | 7642.25 | 7655.25 | NONE | $-63.75 | 15M displacement/close-through supports LONG. 120M displacement/close-through supports LONG. 240M displacement/close-through supports LONG. | |
| 48 | 2026-05-29 | 12:10 | lunch | LONG | 7599.50 | 7603.00 | 7593.25 | 9.75 | 7617.75 | 7622.50 | STOP | $-48.75 | 240M displacement/close-through supports LONG. Caution: 15M recent displacement opposes LONG. | |
| 49 | 2026-06-01 | 11:35 | morning | LONG | 7592.25 | 7598.50 | 7580.75 | 17.75 | 7625.25 | 7634.00 | T1 | $133.75 | 5M execution only Caution: 120M recent displacement opposes LONG. 240M recent displacement opposes LONG. | |
| 50 | 2026-06-01 | 12:15 | lunch | SHORT | 7595.00 | 7593.25 | 7600.75 | 7.50 | 7582.00 | 7578.25 | STOP | $-37.50 | 15M displacement/close-through supports SHORT. 240M displacement/close-through supports SHORT. | |
| 51 | 2026-06-01 | 12:55 | lunch | LONG | 7601.00 | 7606.75 | 7596.50 | 10.25 | 7622.25 | 7627.25 | T2 | $102.50 | 15M displacement/close-through supports LONG. Caution: 240M recent displacement opposes LONG. | |
| 52 | 2026-06-02 | 11:45 | morning | SHORT | 7624.75 | 7624.50 | 7628.75 | 4.25 | 7618.25 | 7616.00 | T1 | $31.25 | 15M displacement/close-through supports SHORT. Caution: 60M recent displacement opposes SHORT. 120M recent displacement opposes SHORT. | |
| 53 | 2026-06-02 | 15:05 | lunch | LONG | 7620.25 | 7622.00 | 7614.00 | 8.00 | 7634.00 | 7638.00 | STOP | $-40.00 | 240M displacement/close-through supports LONG. | |
| 54 | 2026-06-03 | 10:15 | morning | LONG | 7593.75 | 7596.25 | 7573.75 | 22.50 | 7630.00 | 7641.25 | STOP | $-112.50 | 15M displacement/close-through supports LONG. Caution: 60M recent displacement opposes LONG. 120M recent displacement opposes LONG. 240M recent displacement opposes LONG. | |
| 55 | 2026-06-03 | 10:50 | morning | SHORT | 7590.75 | 7587.50 | 7598.00 | 10.50 | 7571.75 | 7566.50 | T1 | $78.75 | 60M displacement/close-through supports SHORT. 120M displacement/close-through supports SHORT. 240M displacement/close-through supports SHORT. | |
| 56 | 2026-06-03 | 12:25 | lunch | SHORT | 7576.25 | 7568.25 | 7582.25 | 14.00 | 7547.25 | 7540.25 | STOP | $-70.00 | 60M displacement/close-through supports SHORT. 240M displacement/close-through supports SHORT. | |
| 57 | 2026-06-03 | 13:00 | lunch | LONG | 7573.50 | 7578.25 | 7562.25 | 16.00 | 7602.25 | 7610.25 | STOP | $-80.00 | 15M displacement/close-through supports LONG. Caution: 240M recent displacement opposes LONG. | |
| 58 | 2026-06-04 | 11:05 | morning | LONG | 7570.00 | 7572.50 | 7561.00 | 11.50 | 7589.75 | 7595.50 | T1 | $86.25 | 15M displacement/close-through supports LONG. 60M displacement/close-through supports LONG. 120M displacement/close-through supports LONG. 240M displacement/close-through supports LONG. | |
| 59 | 2026-06-04 | 11:45 | morning | SHORT | 7581.25 | 7580.75 | 7587.75 | 7.00 | 7570.25 | 7566.75 | STOP | $-35.00 | 15M displacement/close-through supports SHORT. Caution: 60M recent displacement opposes SHORT. 120M recent displacement opposes SHORT. 240M recent displacement opposes SHORT. | |
| 60 | 2026-06-04 | 12:10 | lunch | LONG | 7587.50 | 7589.75 | 7575.25 | 14.50 | 7611.50 | 7618.75 | T1 | $108.75 | 60M displacement/close-through supports LONG. 120M displacement/close-through supports LONG. 240M displacement/close-through supports LONG. | |
| 61 | 2026-06-04 | 15:00 | lunch | SHORT | 7604.75 | 7604.25 | 7608.00 | 3.75 | 7598.75 | 7596.75 | STOP | $-18.75 | 5M execution only Caution: 120M recent displacement opposes SHORT. 240M recent displacement opposes SHORT. | |
| 62 | 2026-06-05 | 10:00 | morning | SHORT | 7517.50 | 7511.50 | 7553.00 | 41.50 | 7449.25 | 7428.50 | T1 | $311.25 | 15M displacement/close-through supports SHORT. 60M displacement/close-through supports SHORT. 120M displacement/close-through supports SHORT. 240M displacement/close-through supports SHORT. | |
| 63 | 2026-06-05 | 13:35 | lunch | LONG | 7466.00 | 7466.75 | 7452.00 | 14.75 | 7489.00 | 7496.25 | STOP | $-73.75 | 5M execution only Caution: 60M recent displacement opposes LONG. 120M recent displacement opposes LONG. 240M recent displacement opposes LONG. | |
| 64 | 2026-06-05 | 14:05 | lunch | SHORT | 7460.50 | 7458.50 | 7478.00 | 19.50 | 7429.25 | 7419.50 | T1 | $146.25 | 120M displacement/close-through supports SHORT. 240M displacement/close-through supports SHORT. | |
| 65 | 2026-06-08 | 11:30 | morning | SHORT | 7468.50 | 7455.25 | 7477.00 | 21.75 | 7422.75 | 7411.75 | T1 | $162.50 | 15M displacement/close-through supports SHORT. Caution: 60M recent displacement opposes SHORT. 240M recent displacement opposes SHORT. | |
| 66 | 2026-06-08 | 12:30 | lunch | SHORT | 7445.75 | 7443.75 | 7462.50 | 18.75 | 7415.75 | 7406.25 | T1 | $140.00 | 15M displacement/close-through supports SHORT. Caution: 240M recent displacement opposes SHORT. | |
| 67 | 2026-06-08 | 13:30 | lunch | LONG | 7434.00 | 7442.75 | 7425.25 | 17.50 | 7469.00 | 7477.75 | STOP | $-87.50 | 15M displacement/close-through supports LONG. 240M displacement/close-through supports LONG. | |
| 68 | 2026-06-09 | 10:15 | morning | SHORT | 7459.50 | 7437.00 | 7491.25 | 54.25 | 7355.75 | 7328.50 | T1 | $406.25 | 15M displacement/close-through supports SHORT. Caution: 60M recent displacement opposes SHORT. 120M recent displacement opposes SHORT. 240M recent displacement opposes SHORT. | |
| 69 | 2026-06-09 | 12:00 | lunch | SHORT | 7326.00 | 7312.50 | 7349.25 | 36.75 | 7257.50 | 7239.00 | T1 | $275.00 | 15M displacement/close-through supports SHORT. 60M displacement/close-through supports SHORT. 120M displacement/close-through supports SHORT. Caution: 240M recent displacement opposes SHORT. | |
| 70 | 2026-06-09 | 12:45 | lunch | LONG | 7307.75 | 7363.75 | 7274.25 | 89.50 | 7498.00 | 7542.75 | NONE | N/A | 15M displacement/close-through supports LONG. 240M displacement/close-through supports LONG. Caution: 60M recent displacement opposes LONG. 120M recent displacement opposes LONG. | |

## Notes

- This audit deliberately uses one trade per campaign/date/session/direction to avoid counting every continuation candle as a separate trade.
- Entry is the completed 5M close-through close, rounded to tick.
- Stop is the opposite protected 5M swing plus one tick.
- T1/T2 are 1.5R and 2.0R from actual entry/stop risk.
- Ambiguous means a single later candle touched stop and target; intrabar order is unknowable from 5M OHLC.