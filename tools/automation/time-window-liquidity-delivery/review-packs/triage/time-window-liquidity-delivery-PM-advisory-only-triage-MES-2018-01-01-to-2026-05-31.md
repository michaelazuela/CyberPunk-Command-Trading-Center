# Time-Window Liquidity Delivery PM Advisory-Only Quality Triage - MES

Research-only. This triage report ranks advisory-only review samples and does not apply labels.
This triage report does not apply labels, approve trades, or create execution authority.

Source PM curated pack: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\review-packs\time-window-liquidity-delivery-PM-curated-review-pack-MES-2018-01-01-to-2026-05-31.json
Source audit: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\time-window-liquidity-delivery-audit-MES-PM.json
Date range: 2018-01-01 to 2026-05-31
Window: PM
Boundary: research_only_not_execution_authority

## Summary
- Total advisory-only samples: 57
- Recommended first review subset: 2

## Bucket Counts
- priority_1_clean_draw_delivery: 0
- priority_2_clean_draw_failed_delivery: 1
- priority_3_fvg_mss_delivery: 1
- priority_4_fvg_mss_not_observed: 32
- priority_5_low_quality_or_noisy: 23

## Recommended First Review Subset
| Rank | Sample ID | Date | Bucket | Draw Type | Draw Level | Clean Draw | Delivery | FVG | MSS | Sweep/Reclaim | Expected Delivery Handles | Recommendation |
|---:|---|---|---|---|---:|---:|---|---:|---:|---:|---:|---|
| 1 | advisory_only_samples-pm_liquidity_delivery_window-2023-11-13 | 2023-11-13 | priority_2_clean_draw_failed_delivery | previous_week_low | 4937.25 | Yes | failed | Yes | Yes | No | 75.75 | review_first |
| 2 | advisory_only_samples-pm_liquidity_delivery_window-2025-11-17 | 2025-11-17 | priority_3_fvg_mss_delivery | previous_week_low | 6779.50 | No | achieved | Yes | Yes | No | 182.00 | review_first |


## Top Review Candidates
| Rank | Sample ID | Date | Bucket | Draw Type | Draw Level | Clean Draw | Delivery | FVG | MSS | Sweep/Reclaim | Expected Delivery Handles | Recommendation |
|---:|---|---|---|---|---:|---:|---|---:|---:|---:|---:|---|
| 1 | advisory_only_samples-pm_liquidity_delivery_window-2023-11-13 | 2023-11-13 | priority_2_clean_draw_failed_delivery | previous_week_low | 4937.25 | Yes | failed | Yes | Yes | No | 75.75 | review_first |
| 2 | advisory_only_samples-pm_liquidity_delivery_window-2025-11-17 | 2025-11-17 | priority_3_fvg_mss_delivery | previous_week_low | 6779.50 | No | achieved | Yes | Yes | No | 182.00 | review_first |
| 3 | advisory_only_samples-pm_liquidity_delivery_window-2024-11-08 | 2024-11-08 | priority_4_fvg_mss_not_observed | previous_week_low | 6070.25 | No | not_observed | Yes | Yes | No | 300.00 | review_later |
| 4 | advisory_only_samples-pm_liquidity_delivery_window-2023-11-10 | 2023-11-10 | priority_4_fvg_mss_not_observed | previous_week_low | 4731.75 | No | not_observed | Yes | Yes | No | 269.75 | review_later |
| 5 | advisory_only_samples-pm_liquidity_delivery_window-2023-11-09 | 2023-11-09 | priority_4_fvg_mss_not_observed | previous_week_low | 4731.75 | No | not_observed | Yes | Yes | No | 230.00 | review_later |
| 6 | advisory_only_samples-pm_liquidity_delivery_window-2025-01-17 | 2025-01-17 | priority_4_fvg_mss_not_observed | previous_week_low | 6101.00 | No | not_observed | Yes | Yes | No | 212.25 | review_later |
| 7 | advisory_only_samples-pm_liquidity_delivery_window-2025-02-26 | 2025-02-26 | priority_4_fvg_mss_not_observed | previous_week_high | 6436.25 | No | not_observed | Yes | Yes | No | 208.25 | review_later |
| 8 | advisory_only_samples-pm_liquidity_delivery_window-2026-03-05 | 2026-03-05 | priority_4_fvg_mss_not_observed | previous_week_high | 7037.25 | No | not_observed | Yes | Yes | No | 206.25 | review_later |
| 9 | advisory_only_samples-pm_liquidity_delivery_window-2026-01-20 | 2026-01-20 | priority_4_fvg_mss_not_observed | previous_week_high | 7085.75 | No | not_observed | Yes | Yes | No | 199.00 | review_later |
| 10 | advisory_only_samples-pm_liquidity_delivery_window-2026-01-27 | 2026-01-27 | priority_4_fvg_mss_not_observed | previous_week_low | 6863.75 | No | not_observed | Yes | Yes | No | 198.50 | review_later |
| 11 | advisory_only_samples-pm_liquidity_delivery_window-2025-11-10 | 2025-11-10 | priority_4_fvg_mss_not_observed | previous_week_low | 6764.50 | No | not_observed | Yes | Yes | No | 190.75 | review_later |
| 12 | advisory_only_samples-pm_liquidity_delivery_window-2026-02-06 | 2026-02-06 | priority_4_fvg_mss_not_observed | previous_day_low | 6800.75 | No | not_observed | Yes | Yes | No | 184.25 | review_later |
| 13 | advisory_only_samples-pm_liquidity_delivery_window-2025-12-23 | 2025-12-23 | priority_4_fvg_mss_not_observed | previous_week_low | 6820.50 | No | not_observed | Yes | Yes | No | 186.25 | review_later |
| 14 | advisory_only_samples-pm_liquidity_delivery_window-2024-03-01 | 2024-03-01 | priority_4_fvg_mss_not_observed | previous_week_low | 5489.50 | No | not_observed | Yes | Yes | No | 180.50 | review_later |
| 15 | advisory_only_samples-pm_liquidity_delivery_window-2026-01-26 | 2026-01-26 | priority_4_fvg_mss_not_observed | previous_week_low | 6863.75 | No | not_observed | Yes | Yes | No | 176.00 | review_later |
| 16 | advisory_only_samples-pm_liquidity_delivery_window-2024-02-09 | 2024-02-09 | priority_4_fvg_mss_not_observed | previous_week_low | 5396.25 | No | not_observed | Yes | Yes | No | 172.00 | review_later |
| 17 | advisory_only_samples-pm_liquidity_delivery_window-2025-01-15 | 2025-01-15 | priority_4_fvg_mss_not_observed | previous_week_low | 6101.00 | No | not_observed | Yes | Yes | No | 157.00 | review_later |
| 18 | advisory_only_samples-pm_liquidity_delivery_window-2024-12-20 | 2024-12-20 | priority_4_fvg_mss_not_observed | previous_week_high | 6446.00 | No | not_observed | Yes | Yes | No | 151.75 | review_later |
| 19 | advisory_only_samples-pm_liquidity_delivery_window-2023-11-20 | 2023-11-20 | priority_4_fvg_mss_not_observed | previous_week_low | 4992.25 | No | not_observed | Yes | Yes | No | 149.25 | review_later |
| 20 | advisory_only_samples-pm_liquidity_delivery_window-2024-12-27 | 2024-12-27 | priority_4_fvg_mss_not_observed | previous_week_low | 6135.75 | No | not_observed | Yes | Yes | No | 149.25 | review_later |

## All Advisory-Only Samples By Bucket
### priority_1_clean_draw_delivery
_No samples in this bucket._
### priority_2_clean_draw_failed_delivery
| Rank | Sample ID | Date | Bucket | Draw Type | Draw Level | Clean Draw | Delivery | FVG | MSS | Sweep/Reclaim | Expected Delivery Handles | Recommendation |
|---:|---|---|---|---|---:|---:|---|---:|---:|---:|---:|---|
| 1 | advisory_only_samples-pm_liquidity_delivery_window-2023-11-13 | 2023-11-13 | priority_2_clean_draw_failed_delivery | previous_week_low | 4937.25 | Yes | failed | Yes | Yes | No | 75.75 | review_first |
### priority_3_fvg_mss_delivery
| Rank | Sample ID | Date | Bucket | Draw Type | Draw Level | Clean Draw | Delivery | FVG | MSS | Sweep/Reclaim | Expected Delivery Handles | Recommendation |
|---:|---|---|---|---|---:|---:|---|---:|---:|---:|---:|---|
| 2 | advisory_only_samples-pm_liquidity_delivery_window-2025-11-17 | 2025-11-17 | priority_3_fvg_mss_delivery | previous_week_low | 6779.50 | No | achieved | Yes | Yes | No | 182.00 | review_first |
### priority_4_fvg_mss_not_observed
| Rank | Sample ID | Date | Bucket | Draw Type | Draw Level | Clean Draw | Delivery | FVG | MSS | Sweep/Reclaim | Expected Delivery Handles | Recommendation |
|---:|---|---|---|---|---:|---:|---|---:|---:|---:|---:|---|
| 3 | advisory_only_samples-pm_liquidity_delivery_window-2024-11-08 | 2024-11-08 | priority_4_fvg_mss_not_observed | previous_week_low | 6070.25 | No | not_observed | Yes | Yes | No | 300.00 | review_later |
| 4 | advisory_only_samples-pm_liquidity_delivery_window-2023-11-10 | 2023-11-10 | priority_4_fvg_mss_not_observed | previous_week_low | 4731.75 | No | not_observed | Yes | Yes | No | 269.75 | review_later |
| 5 | advisory_only_samples-pm_liquidity_delivery_window-2023-11-09 | 2023-11-09 | priority_4_fvg_mss_not_observed | previous_week_low | 4731.75 | No | not_observed | Yes | Yes | No | 230.00 | review_later |
| 6 | advisory_only_samples-pm_liquidity_delivery_window-2025-01-17 | 2025-01-17 | priority_4_fvg_mss_not_observed | previous_week_low | 6101.00 | No | not_observed | Yes | Yes | No | 212.25 | review_later |
| 7 | advisory_only_samples-pm_liquidity_delivery_window-2025-02-26 | 2025-02-26 | priority_4_fvg_mss_not_observed | previous_week_high | 6436.25 | No | not_observed | Yes | Yes | No | 208.25 | review_later |
| 8 | advisory_only_samples-pm_liquidity_delivery_window-2026-03-05 | 2026-03-05 | priority_4_fvg_mss_not_observed | previous_week_high | 7037.25 | No | not_observed | Yes | Yes | No | 206.25 | review_later |
| 9 | advisory_only_samples-pm_liquidity_delivery_window-2026-01-20 | 2026-01-20 | priority_4_fvg_mss_not_observed | previous_week_high | 7085.75 | No | not_observed | Yes | Yes | No | 199.00 | review_later |
| 10 | advisory_only_samples-pm_liquidity_delivery_window-2026-01-27 | 2026-01-27 | priority_4_fvg_mss_not_observed | previous_week_low | 6863.75 | No | not_observed | Yes | Yes | No | 198.50 | review_later |
| 11 | advisory_only_samples-pm_liquidity_delivery_window-2025-11-10 | 2025-11-10 | priority_4_fvg_mss_not_observed | previous_week_low | 6764.50 | No | not_observed | Yes | Yes | No | 190.75 | review_later |
| 12 | advisory_only_samples-pm_liquidity_delivery_window-2026-02-06 | 2026-02-06 | priority_4_fvg_mss_not_observed | previous_day_low | 6800.75 | No | not_observed | Yes | Yes | No | 184.25 | review_later |
| 13 | advisory_only_samples-pm_liquidity_delivery_window-2025-12-23 | 2025-12-23 | priority_4_fvg_mss_not_observed | previous_week_low | 6820.50 | No | not_observed | Yes | Yes | No | 186.25 | review_later |
| 14 | advisory_only_samples-pm_liquidity_delivery_window-2024-03-01 | 2024-03-01 | priority_4_fvg_mss_not_observed | previous_week_low | 5489.50 | No | not_observed | Yes | Yes | No | 180.50 | review_later |
| 15 | advisory_only_samples-pm_liquidity_delivery_window-2026-01-26 | 2026-01-26 | priority_4_fvg_mss_not_observed | previous_week_low | 6863.75 | No | not_observed | Yes | Yes | No | 176.00 | review_later |
| 16 | advisory_only_samples-pm_liquidity_delivery_window-2024-02-09 | 2024-02-09 | priority_4_fvg_mss_not_observed | previous_week_low | 5396.25 | No | not_observed | Yes | Yes | No | 172.00 | review_later |
| 17 | advisory_only_samples-pm_liquidity_delivery_window-2025-01-15 | 2025-01-15 | priority_4_fvg_mss_not_observed | previous_week_low | 6101.00 | No | not_observed | Yes | Yes | No | 157.00 | review_later |
| 18 | advisory_only_samples-pm_liquidity_delivery_window-2024-12-20 | 2024-12-20 | priority_4_fvg_mss_not_observed | previous_week_high | 6446.00 | No | not_observed | Yes | Yes | No | 151.75 | review_later |
| 19 | advisory_only_samples-pm_liquidity_delivery_window-2023-11-20 | 2023-11-20 | priority_4_fvg_mss_not_observed | previous_week_low | 4992.25 | No | not_observed | Yes | Yes | No | 149.25 | review_later |
| 20 | advisory_only_samples-pm_liquidity_delivery_window-2024-12-27 | 2024-12-27 | priority_4_fvg_mss_not_observed | previous_week_low | 6135.75 | No | not_observed | Yes | Yes | No | 149.25 | review_later |
| 21 | advisory_only_samples-pm_liquidity_delivery_window-2024-01-19 | 2024-01-19 | priority_4_fvg_mss_not_observed | previous_week_low | 5245.50 | No | not_observed | Yes | Yes | No | 144.50 | review_later |
| 22 | advisory_only_samples-pm_liquidity_delivery_window-2026-01-09 | 2026-01-09 | priority_4_fvg_mss_not_observed | previous_week_low | 6918.50 | No | not_observed | Yes | Yes | No | 141.00 | review_later |
| 23 | advisory_only_samples-pm_liquidity_delivery_window-2025-02-03 | 2025-02-03 | priority_4_fvg_mss_not_observed | previous_week_high | 6417.75 | No | not_observed | Yes | Yes | No | 114.00 | review_later |
| 24 | advisory_only_samples-pm_liquidity_delivery_window-2024-02-02 | 2024-02-02 | priority_4_fvg_mss_not_observed | previous_day_low | 5404.00 | No | not_observed | Yes | Yes | No | 105.50 | review_later |
| 25 | advisory_only_samples-pm_liquidity_delivery_window-2024-01-10 | 2024-01-10 | priority_4_fvg_mss_not_observed | previous_week_low | 5232.25 | No | not_observed | Yes | Yes | No | 109.50 | review_later |
| 26 | advisory_only_samples-pm_liquidity_delivery_window-2025-01-31 | 2025-01-31 | priority_4_fvg_mss_not_observed | previous_week_low | 6264.50 | No | not_observed | Yes | Yes | No | 108.75 | review_later |
| 27 | advisory_only_samples-pm_liquidity_delivery_window-2025-02-21 | 2025-02-21 | priority_4_fvg_mss_not_observed | previous_day_high | 6425.00 | No | not_observed | Yes | Yes | No | 103.25 | review_later |
| 28 | advisory_only_samples-pm_liquidity_delivery_window-2024-02-13 | 2024-02-13 | priority_4_fvg_mss_not_observed | previous_day_high | 5596.75 | No | not_observed | Yes | Yes | No | 102.25 | review_later |
| 29 | advisory_only_samples-pm_liquidity_delivery_window-2025-01-30 | 2025-01-30 | priority_4_fvg_mss_not_observed | previous_week_low | 6264.50 | No | not_observed | Yes | Yes | No | 104.25 | review_later |
| 30 | advisory_only_samples-pm_liquidity_delivery_window-2023-12-11 | 2023-12-11 | priority_4_fvg_mss_not_observed | previous_week_low | 5131.75 | No | not_observed | Yes | Yes | No | 72.50 | review_later |
| 31 | advisory_only_samples-pm_liquidity_delivery_window-2024-01-08 | 2024-01-08 | priority_4_fvg_mss_not_observed | previous_week_low | 5232.25 | No | not_observed | Yes | Yes | No | 70.75 | review_later |
| 32 | advisory_only_samples-pm_liquidity_delivery_window-2025-12-08 | 2025-12-08 | priority_4_fvg_mss_not_observed | previous_week_high | 7014.00 | No | not_observed | Yes | Yes | No | 59.75 | review_later |
| 33 | advisory_only_samples-pm_liquidity_delivery_window-2024-12-16 | 2024-12-16 | priority_4_fvg_mss_not_observed | previous_week_low | 6379.75 | No | not_observed | Yes | Yes | No | 52.50 | review_later |
| 34 | advisory_only_samples-pm_liquidity_delivery_window-2023-12-04 | 2023-12-04 | priority_4_fvg_mss_not_observed | previous_week_high | 5190.75 | No | not_observed | Yes | Yes | No | 36.50 | review_later |
### priority_5_low_quality_or_noisy
| Rank | Sample ID | Date | Bucket | Draw Type | Draw Level | Clean Draw | Delivery | FVG | MSS | Sweep/Reclaim | Expected Delivery Handles | Recommendation |
|---:|---|---|---|---|---:|---:|---|---:|---:|---:|---:|---|
| 35 | advisory_only_samples-pm_liquidity_delivery_window-2025-01-14 | 2025-01-14 | priority_5_low_quality_or_noisy | opening_range_low | 6148.50 | No | achieved | Yes | No | No | 171.75 | low_priority |
| 36 | advisory_only_samples-pm_liquidity_delivery_window-2025-01-24 | 2025-01-24 | priority_5_low_quality_or_noisy | previous_week_low | 6079.00 | No | not_observed | Yes | No | No | 325.00 | low_priority |
| 37 | advisory_only_samples-pm_liquidity_delivery_window-2023-11-07 | 2023-11-07 | priority_5_low_quality_or_noisy | previous_week_low | 4731.75 | No | not_observed | Yes | No | No | 250.75 | low_priority |
| 38 | advisory_only_samples-pm_liquidity_delivery_window-2024-11-06 | 2024-11-06 | priority_5_low_quality_or_noisy | previous_week_low | 6070.25 | No | not_observed | No | Yes | No | 221.00 | low_priority |
| 39 | advisory_only_samples-pm_liquidity_delivery_window-2025-11-11 | 2025-11-11 | priority_5_low_quality_or_noisy | previous_week_low | 6764.50 | No | not_observed | No | Yes | No | 218.25 | low_priority |
| 40 | advisory_only_samples-pm_liquidity_delivery_window-2025-12-17 | 2025-12-17 | priority_5_low_quality_or_noisy | previous_week_high | 7038.00 | No | not_observed | No | Yes | No | 202.75 | low_priority |
| 41 | advisory_only_samples-pm_liquidity_delivery_window-2024-02-22 | 2024-02-22 | priority_5_low_quality_or_noisy | previous_week_low | 5466.75 | No | not_observed | Yes | No | No | 157.75 | low_priority |
| 42 | advisory_only_samples-pm_liquidity_delivery_window-2025-03-03 | 2025-03-03 | priority_5_low_quality_or_noisy | previous_week_high | 6337.50 | No | not_observed | Yes | No | No | 157.00 | low_priority |
| 43 | advisory_only_samples-pm_liquidity_delivery_window-2026-03-03 | 2026-03-03 | priority_5_low_quality_or_noisy | previous_week_high | 7037.25 | No | not_observed | Yes | No | No | 150.50 | low_priority |
| 44 | advisory_only_samples-pm_liquidity_delivery_window-2025-11-13 | 2025-11-13 | priority_5_low_quality_or_noisy | previous_week_high | 7018.50 | No | not_observed | Yes | No | No | 145.00 | low_priority |
| 45 | advisory_only_samples-pm_liquidity_delivery_window-2026-02-03 | 2026-02-03 | priority_5_low_quality_or_noisy | previous_week_high | 7092.50 | No | not_observed | Yes | No | No | 142.75 | low_priority |
| 46 | advisory_only_samples-pm_liquidity_delivery_window-2025-02-05 | 2025-02-05 | priority_5_low_quality_or_noisy | previous_week_low | 6205.50 | No | not_observed | Yes | No | No | 138.25 | low_priority |
| 47 | advisory_only_samples-pm_liquidity_delivery_window-2026-02-17 | 2026-02-17 | priority_5_low_quality_or_noisy | previous_week_high | 7060.75 | No | not_observed | Yes | No | No | 133.75 | low_priority |
| 48 | advisory_only_samples-pm_liquidity_delivery_window-2026-01-06 | 2026-01-06 | priority_5_low_quality_or_noisy | previous_week_low | 6918.50 | No | not_observed | Yes | No | No | 114.50 | low_priority |
| 49 | advisory_only_samples-pm_liquidity_delivery_window-2024-11-11 | 2024-11-11 | priority_5_low_quality_or_noisy | previous_week_low | 6064.50 | No | not_observed | No | No | No | 303.75 | low_priority |
| 50 | advisory_only_samples-pm_liquidity_delivery_window-2026-01-23 | 2026-01-23 | priority_5_low_quality_or_noisy | previous_week_high | 7085.75 | No | not_observed | Yes | No | No | 94.75 | low_priority |
| 51 | advisory_only_samples-pm_liquidity_delivery_window-2024-03-07 | 2024-03-07 | priority_5_low_quality_or_noisy | previous_week_low | 5590.25 | No | not_observed | No | Yes | No | 109.00 | low_priority |
| 52 | advisory_only_samples-pm_liquidity_delivery_window-2026-01-14 | 2026-01-14 | priority_5_low_quality_or_noisy | previous_day_high | 7085.75 | No | not_observed | No | Yes | No | 96.25 | low_priority |
| 53 | advisory_only_samples-pm_liquidity_delivery_window-2023-12-12 | 2023-12-12 | priority_5_low_quality_or_noisy | previous_week_low | 5131.75 | No | not_observed | No | Yes | No | 87.00 | low_priority |
| 54 | advisory_only_samples-pm_liquidity_delivery_window-2024-12-10 | 2024-12-10 | priority_5_low_quality_or_noisy | previous_week_high | 6453.25 | No | not_observed | Yes | No | No | 52.75 | low_priority |
| 55 | advisory_only_samples-pm_liquidity_delivery_window-2024-02-01 | 2024-02-01 | priority_5_low_quality_or_noisy | previous_day_low | 5396.25 | No | not_observed | Yes | No | No | 42.75 | low_priority |
| 56 | advisory_only_samples-pm_liquidity_delivery_window-2023-12-29 | 2023-12-29 | priority_5_low_quality_or_noisy | previous_week_low | 5273.50 | No | not_observed | No | Yes | No | 69.75 | low_priority |
| 57 | advisory_only_samples-pm_liquidity_delivery_window-2023-12-05 | 2023-12-05 | priority_5_low_quality_or_noisy | previous_week_high | 5190.75 | No | not_observed | Yes | No | No | 36.50 | low_priority |
## Label Options For Later Review
- strong_advisory_candidate
- covered_by_model_1
- covered_by_uninstalled_context
- weak_or_noisy
- needs_chart_review
- reject_time_window_standalone

Research-only. This triage report does not apply labels, approve trades, approve models, create alerts, or create execution authority.
