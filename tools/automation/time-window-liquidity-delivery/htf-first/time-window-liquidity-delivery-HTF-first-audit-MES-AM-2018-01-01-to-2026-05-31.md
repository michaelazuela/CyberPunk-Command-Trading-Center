# Time-Window Liquidity Delivery HTF-First Audit - MES AM
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
- Candidates: 710
- HTF draw present: 710
- HTF draw missing: 0
- Delivery during window: 192
- Delivery after window: 282
- Execution-window conflicts: 18
## HTF-First Buckets
- priority_1_htf_draw_delivery_achieved: 192
- priority_2_htf_draw_delivery_failed: 18
- priority_3_htf_draw_delivery_not_observed: 500
- priority_4_execution_only_without_htf_draw: 0
- priority_5_no_valid_draw_or_noisy: 0
## Sample Table
| Date | Bucket | HTF Draw | Primary TF | Draw Level | Delivery During | Delivery After | FVG | MSS | Sweep/Reclaim | Classification |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|
| 2023-08-22 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5052.5 | Yes | No | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-08-23 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5071.75 | No | Yes | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-08-24 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5112.75 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-08-25 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5117.25 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-08-28 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5056.5 | No | Yes | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2023-08-29 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5081.25 | Yes | No | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-08-30 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5148.25 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-08-31 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5163.25 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-09-01 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5173.75 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-04 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5156 | Yes | No | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-09-05 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5163 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-06 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5152.5 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2023-09-07 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5132.25 | No | No | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-08 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5101 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-09-11 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5100.25 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-12 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5126.5 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-13 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5122.5 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-14 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5114.5 | Yes | No | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-09-15 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5149 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-18 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5090.25 | No | Yes | No | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-19 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5097.5 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2023-09-20 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5092.5 | No | No | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-21 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5091 | No | No | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-22 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5022.25 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-25 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4957 | No | Yes | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-26 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4966.5 | No | No | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-27 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4949.5 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-28 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4919.5 | No | Yes | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2023-09-29 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 4938.5 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-10-02 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4936.75 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-03 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4939.75 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-04 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4918.75 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-05 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4887 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-06 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4885.25 | No | Yes | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-09 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 4903 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-10-10 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 4961 | Yes | No | Yes | Yes | No | htf_draw_with_execution_window_delivery |
| 2023-10-11 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5002 | No | Yes | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-12 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5005.25 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-13 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5013.5 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-16 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4955.25 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2023-10-17 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4997.5 | No | Yes | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-18 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5006.25 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-19 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4982 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-20 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4949.5 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2023-10-23 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4844.75 | No | Yes | No | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-24 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 4863.5 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-10-25 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4873.5 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-26 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4847.25 | No | No | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-27 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4788 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-10-30 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 4737.75 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-10-31 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4780.25 | No | Yes | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-01 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4798.25 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-02 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4853.25 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-03 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4923 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-06 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 4966.75 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-11-07 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 4972.5 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-11-08 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 4986.5 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-11-09 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4990.75 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-10 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 4996 | No | Yes | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-14 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5017.5 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2023-11-15 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5107 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-11-16 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5125 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-17 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5114 | No | Yes | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-20 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5112 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-21 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5154 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-22 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5148.25 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-11-23 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5163.5 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-24 | priority_2_htf_draw_delivery_failed | prior_day_high | daily | 5156.25 | No | No | No | Yes | Yes | htf_draw_but_execution_window_conflicts |
| 2023-11-27 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5152 | No | Yes | Yes | No | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-28 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5152 | No | Yes | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-11-29 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5160.25 | Yes | Yes | Yes | No | Yes | htf_draw_with_execution_window_delivery |
| 2023-11-30 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5180 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-01 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5162.5 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-12-04 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5187.25 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2023-12-05 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5178.5 | No | No | Yes | Yes | No | htf_draw_without_execution_window_delivery |
| 2023-12-06 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5173.5 | Yes | No | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-12-07 | priority_3_htf_draw_delivery_not_observed | prior_day_high | daily | 5181.5 | No | No | Yes | Yes | Yes | htf_draw_without_execution_window_delivery |
| 2023-12-08 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5179 | Yes | Yes | Yes | No | Yes | htf_draw_with_execution_window_delivery |
| 2023-12-11 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5197 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |
| 2023-12-12 | priority_1_htf_draw_delivery_achieved | prior_day_high | daily | 5212.75 | Yes | Yes | Yes | Yes | Yes | htf_draw_with_execution_window_delivery |

_630 additional candidate(s) available in JSON._
Research-only. 5M remains execution-only observation; HTF draw context does not approve a trade or model.
