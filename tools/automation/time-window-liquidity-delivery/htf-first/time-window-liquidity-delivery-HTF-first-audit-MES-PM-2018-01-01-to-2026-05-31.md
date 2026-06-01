# Time-Window Liquidity Delivery HTF-First Audit - MES PM
Research-only HTF-first TWLD report. This does not approve trades, create execution authority, or mutate human labels.
This report does not apply labels, approve trades, create alerts, or create execution authority.
Date range: 2018-01-01 to 2026-05-31
Boundary: research_only_not_execution_authority
## Timeframe Discovery
- Coded/supported timeframes: 1m, 5m, 15m, 60m, 240m, 1h, 4h, 30m, daily, session
- Higher timeframes above 5m: 15m, 30m, 1h, 60m, 240m, 4h, daily, session
- Cached OHLC timeframes: 5m, 15m, 60m, 240m
- Execution timeframe: 5m (execution_only)
## Summary
- Candidates: 257
- HTF draw present: 257
- HTF draw missing: 0
- Delivery during window: 39
- Delivery after window: 60
- Execution-window conflicts: 21
## HTF-First Buckets
- priority_1_htf_draw_delivery_achieved: 39
- priority_2_htf_draw_delivery_failed: 21
- priority_3_htf_draw_delivery_not_observed: 197
- priority_4_execution_only_without_htf_draw: 0
- priority_5_no_valid_draw_or_noisy: 0
## Sample Table
| Date | Bucket | HTF Draw | Primary TF | Draw Level | Delivery During | Delivery After | FVG | MSS | Sweep/Reclaim | Classification |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|
| 2023-11-06 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4966.75 | No | Yes | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-07 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4972.5 | No | Yes | Yes | No | No | htf_draw_without_execution_window_delivery |
| 2023-11-08 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4986.5 | No | Yes | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-09 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4990.75 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2023-11-10 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4996 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2023-11-13 | priority_2_htf_draw_delivery_failed | prior_day_high | daily | 5008 | No | Yes | Yes | Yes | No | htf_draw_but_execution_window_conflicts |
| 2023-11-14 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5017.5 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-15 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5107 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-11-16 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5125 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-17 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5114 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-11-20 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5112 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2023-11-21 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5154 | No | No | No | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-22 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5148.25 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-11-27 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5152 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-28 | priority_2_htf_draw_delivery_failed | prior_day_high | daily | 5152 | No | Yes | Yes | No | Yes | htf_draw_but_execution_window_conflicts |
| 2023-11-29 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5160.25 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-30 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5180 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-01 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5162.5 | No | No | No | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-04 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5187.25 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2023-12-05 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5178.5 | No | No | Yes | No | No | htf_draw_without_execution_window_delivery |
| 2023-12-06 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5173.5 | No | No | No | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-07 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5181.5 | No | No | No | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-08 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5179 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-11 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5197 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2023-12-12 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5212.75 | No | No | No | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-13 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5235.5 | Yes | No | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-12-14 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5311.75 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-15 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5322 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-18 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5311 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-19 | priority_2_htf_draw_delivery_failed | prior_day_high | daily | 5332.5 | No | No | Yes | No | Yes | htf_draw_but_execution_window_conflicts |
| 2023-12-20 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5353.75 | Yes | No | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-12-21 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5361 | No | No | No | No | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-22 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5328.5 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-12-26 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5342.75 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-27 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5364.75 | No | Yes | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-28 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5371.75 | No | No | No | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-29 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5371.5 | No | No | No | Yes | No | htf_draw_without_execution_window_delivery |
| 2024-01-02 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5353 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2024-01-03 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5358.25 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-01-04 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5319.25 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-01-05 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5296.75 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-01-08 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5273.5 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2024-01-09 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5333.75 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-01-10 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5330.75 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2024-01-11 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5360.5 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2024-01-12 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5368.25 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-01-16 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5353.25 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-01-17 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5345.75 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-01-18 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5320.25 | Yes | No | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2024-01-19 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5347.25 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2024-01-22 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5417.5 | No | Yes | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2024-01-23 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5428.75 | No | Yes | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2024-01-24 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5436.75 | Yes | Yes | Yes | No | Yes | htf_draw_with_execution_window_delivery |
| 2024-01-25 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5463.5 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-01-26 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5456.75 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-01-29 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5443.5 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-01-30 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5487.5 | No | Yes | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-01-31 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5487.5 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-02-01 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5468.25 | No | Yes | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2024-02-02 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5494.25 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2024-02-05 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5511 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-02-06 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5507.75 | No | Yes | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2024-02-07 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5513.75 | No | No | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2024-02-08 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5550.25 | No | Yes | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2024-02-09 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5550.25 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-02-12 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5575 | Yes | No | Yes | No | Yes | htf_draw_with_execution_window_delivery |
| 2024-02-13 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5596.75 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2024-02-14 | priority_2_htf_draw_delivery_failed | prior_day_high | daily | 5570.25 | No | No | Yes | Yes | Yes | htf_draw_but_execution_window_conflicts |
| 2024-02-15 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5552.75 | No | No | No | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-02-16 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5582.25 | Yes | No | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2024-02-20 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5559 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-02-21 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5542.5 | No | Yes | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-02-22 | priority_2_htf_draw_delivery_failed | prior_day_high | daily | 5566.25 | No | No | Yes | No | No | htf_draw_but_execution_window_conflicts |
| 2024-02-23 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5638 | Yes | Yes | No | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2024-02-26 | priority_2_htf_draw_delivery_failed | prior_day_high | daily | 5631.5 | No | No | Yes | Yes | Yes | htf_draw_but_execution_window_conflicts |
| 2024-02-27 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5638.25 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2024-02-28 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5625.5 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2024-02-29 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5619.75 | Yes | No | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2024-03-01 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5644.5 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2024-03-04 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5676.25 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |

_177 additional candidate(s) available in JSON._
Research-only. 5M remains execution-only observation; HTF draw context does not approve a trade or model.
