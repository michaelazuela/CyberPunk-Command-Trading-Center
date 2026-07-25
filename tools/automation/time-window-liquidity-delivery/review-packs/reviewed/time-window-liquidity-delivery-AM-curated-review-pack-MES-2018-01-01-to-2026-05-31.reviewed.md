# Time-Window Liquidity Delivery Human Review - MES AM
Research-only. This human review file does not approve trades and does not create execution authority.
This review file does not approve trades and does not create execution authority.
Source curated pack: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\review-packs\time-window-liquidity-delivery-AM-curated-review-pack-MES-2018-01-01-to-2026-05-31.json
Date range: 2018-01-01 to 2026-05-31
Boundary: research_only_not_execution_authority
## Safety
- Activates Model: No
- Approves Execution: No
- Creates Trade: No
- Changes Scanner: No
- Changes Rules: No
## Review Progress
- Total Samples: 46
- Reviewed Samples: 11
- Unreviewed Samples: 35
## Label Counts
- strong_advisory_candidate: 1
- covered_by_model_1: 0
- covered_by_RAID_RECLAIM: 0
- weak_or_noisy: 2
- needs_chart_review: 1
- reject_time_window_standalone: 7
## Summary Recommendation
- No automatic promotion is created. Review labels remain research-only.
- Most reviewed advisory-only samples are weak or rejected; keep AM TWLD advisory-only.
## Chart Evidence Application
- Source Chart Evidence: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.json
- Applied At: 2026-06-01T02:20:58.754Z
- Samples Updated: 8
- Samples Preserved: 38
- Note: Chart-evidence recommendations were applied as research-only human review labels. This does not approve trades, models, alerts, or execution.
- Before Label Counts:
  - strong_advisory_candidate: 1
  - covered_by_model_1: 0
  - covered_by_RAID_RECLAIM: 0
  - weak_or_noisy: 2
  - needs_chart_review: 8
  - reject_time_window_standalone: 0
- After Label Counts:
  - strong_advisory_candidate: 1
  - covered_by_model_1: 0
  - covered_by_RAID_RECLAIM: 0
  - weak_or_noisy: 2
  - needs_chart_review: 1
  - reject_time_window_standalone: 7
- Applied Samples:
  - advisory_only_samples-am_liquidity_delivery_window-2023-09-06: needs_chart_review -> needs_chart_review (keep_needs_chart_review)
  - advisory_only_samples-am_liquidity_delivery_window-2023-10-16: needs_chart_review -> reject_time_window_standalone (reject_time_window_standalone)
  - advisory_only_samples-am_liquidity_delivery_window-2023-12-05: needs_chart_review -> reject_time_window_standalone (reject_time_window_standalone)
  - advisory_only_samples-am_liquidity_delivery_window-2023-12-22: needs_chart_review -> reject_time_window_standalone (reject_time_window_standalone)
  - advisory_only_samples-am_liquidity_delivery_window-2024-09-03: needs_chart_review -> reject_time_window_standalone (reject_time_window_standalone)
  - advisory_only_samples-am_liquidity_delivery_window-2024-12-27: needs_chart_review -> reject_time_window_standalone (reject_time_window_standalone)
  - advisory_only_samples-am_liquidity_delivery_window-2026-02-02: needs_chart_review -> reject_time_window_standalone (reject_time_window_standalone)
  - advisory_only_samples-am_liquidity_delivery_window-2026-04-14: needs_chart_review -> reject_time_window_standalone (reject_time_window_standalone)
- Boundary: research_only_not_execution_authority
## Samples Grouped By Final Human Label
### Strong Advisory Candidate
| Sample ID | Date/Time | Source Bucket | Suggested Label | Final Human Label | Reviewer | Notes |
|---|---|---|---|---|---|---|
| advisory_only_samples-am_liquidity_delivery_window-2023-12-04 | 2023-12-04 10:00-11:00 | advisory_only_samples | strong_advisory_candidate | strong_advisory_candidate | human | Best advisory-only example in this set: delivery achieved with FVG and MSS toward opening range low. Still research-only and not execution authority. |
### Covered By Model 1
_No samples reviewed with this label._
### Covered By Raid Reclaim Reversal
_No samples reviewed with this label._
### Weak Or Noisy
| Sample ID | Date/Time | Source Bucket | Suggested Label | Final Human Label | Reviewer | Notes |
|---|---|---|---|---|---|---|
| advisory_only_samples-am_liquidity_delivery_window-2024-07-04 | 2024-07-04 10:00-11:00 | advisory_only_samples | strong_advisory_candidate | weak_or_noisy | human | Failed delivery, no MSS, and July 4 holiday session may distort liquidity behavior. Weak standalone TWLD sample. |
| advisory_only_samples-am_liquidity_delivery_window-2024-11-29 | 2024-11-29 10:00-11:00 | advisory_only_samples | strong_advisory_candidate | weak_or_noisy | human | No observed delivery and likely holiday-thinned session after Thanksgiving. Weak standalone TWLD sample unless chart shows exceptional context. |
### Needs Chart Review
| Sample ID | Date/Time | Source Bucket | Suggested Label | Final Human Label | Reviewer | Notes |
|---|---|---|---|---|---|---|
| advisory_only_samples-am_liquidity_delivery_window-2023-09-06 | 2023-09-06 10:00-11:00 | advisory_only_samples | strong_advisory_candidate | needs_chart_review | human | Clean draw with FVG and MSS, but delivery failed. Need chart review to determine whether this is useful failure behavior or invalidates standalone TWLD. TWLD-5: Applied from chart-evidence recommendation keep_needs_chart_review -> needs_chart_review. Research-only; no execution authority created. |
### Reject Time Window Standalone
| Sample ID | Date/Time | Source Bucket | Suggested Label | Final Human Label | Reviewer | Notes |
|---|---|---|---|---|---|---|
| advisory_only_samples-am_liquidity_delivery_window-2023-10-16 | 2023-10-16 10:00-11:00 | advisory_only_samples | strong_advisory_candidate | reject_time_window_standalone | human | FVG and MSS present, but delivery was not observed. Need chart confirmation before deciding standalone value. TWLD-5: Applied from chart-evidence recommendation reject_time_window_standalone -> reject_time_window_standalone. Research-only; no execution authority created. |
| advisory_only_samples-am_liquidity_delivery_window-2023-12-05 | 2023-12-05 10:00-11:00 | advisory_only_samples | strong_advisory_candidate | reject_time_window_standalone | human | FVG and MSS present, but delivery was not observed. Need chart review before deciding whether this is standalone TWLD or noise. TWLD-5: Applied from chart-evidence recommendation reject_time_window_standalone -> reject_time_window_standalone. Research-only; no execution authority created. |
| advisory_only_samples-am_liquidity_delivery_window-2023-12-22 | 2023-12-22 10:00-11:00 | advisory_only_samples | strong_advisory_candidate | reject_time_window_standalone | human | FVG and MSS present, but delivery was not observed. Need chart review before deciding whether the draw was actionable or already invalid. TWLD-5: Applied from chart-evidence recommendation reject_time_window_standalone -> reject_time_window_standalone. Research-only; no execution authority created. |
| advisory_only_samples-am_liquidity_delivery_window-2024-09-03 | 2024-09-03 10:00-11:00 | advisory_only_samples | strong_advisory_candidate | reject_time_window_standalone | human | Prior day high draw with FVG and MSS, but delivery was not observed. Need chart confirmation before deciding standalone value. TWLD-5: Applied from chart-evidence recommendation reject_time_window_standalone -> reject_time_window_standalone. Research-only; no execution authority created. |
| advisory_only_samples-am_liquidity_delivery_window-2024-12-27 | 2024-12-27 10:00-11:00 | advisory_only_samples | strong_advisory_candidate | reject_time_window_standalone | human | FVG and MSS present, but delivery was not observed. Holiday-week context requires chart review before deciding. TWLD-5: Applied from chart-evidence recommendation reject_time_window_standalone -> reject_time_window_standalone. Research-only; no execution authority created. |
| advisory_only_samples-am_liquidity_delivery_window-2026-02-02 | 2026-02-02 10:00-11:00 | advisory_only_samples | strong_advisory_candidate | reject_time_window_standalone | human | Prior day low draw with FVG and MSS, but delivery was not observed. Need chart review before deciding standalone value. TWLD-5: Applied from chart-evidence recommendation reject_time_window_standalone -> reject_time_window_standalone. Research-only; no execution authority created. |
| advisory_only_samples-am_liquidity_delivery_window-2026-04-14 | 2026-04-14 10:00-11:00 | advisory_only_samples | strong_advisory_candidate | reject_time_window_standalone | human | Previous week low draw with FVG and MSS, but delivery was not observed. Need chart review before deciding standalone value. TWLD-5: Applied from chart-evidence recommendation reject_time_window_standalone -> reject_time_window_standalone. Research-only; no execution authority created. |
## Unreviewed Samples
| Sample ID | Date/Time | Source Bucket | Suggested Label | Final Human Label | Reviewer | Notes |
|---|---|---|---|---|---|---|
| best_clean_draw_delivery_achieved_samples-am_liquidity_delivery_window-2025-10-21 | 2025-10-21 10:00-11:00 | best_clean_draw_delivery_achieved_samples | strong_advisory_candidate | unreviewed | n/a |  |
| best_clean_draw_delivery_achieved_samples-am_liquidity_delivery_window-2023-09-27 | 2023-09-27 10:00-11:00 | best_clean_draw_delivery_achieved_samples | strong_advisory_candidate | unreviewed | n/a |  |
| best_clean_draw_delivery_achieved_samples-am_liquidity_delivery_window-2025-07-18 | 2025-07-18 10:00-11:00 | best_clean_draw_delivery_achieved_samples | strong_advisory_candidate | unreviewed | n/a |  |
| best_clean_draw_delivery_achieved_samples-am_liquidity_delivery_window-2024-07-15 | 2024-07-15 10:00-11:00 | best_clean_draw_delivery_achieved_samples | strong_advisory_candidate | unreviewed | n/a |  |
| best_clean_draw_delivery_achieved_samples-am_liquidity_delivery_window-2024-12-13 | 2024-12-13 10:00-11:00 | best_clean_draw_delivery_achieved_samples | strong_advisory_candidate | unreviewed | n/a |  |
| clean_draw_failed_delivery_samples-am_liquidity_delivery_window-2025-11-28 | 2025-11-28 10:00-11:00 | clean_draw_failed_delivery_samples | weak_or_noisy | unreviewed | n/a |  |
| clean_draw_failed_delivery_samples-am_liquidity_delivery_window-2025-11-27 | 2025-11-27 10:00-11:00 | clean_draw_failed_delivery_samples | weak_or_noisy | unreviewed | n/a |  |
| clean_draw_failed_delivery_samples-am_liquidity_delivery_window-2023-11-06 | 2023-11-06 10:00-11:00 | clean_draw_failed_delivery_samples | weak_or_noisy | unreviewed | n/a |  |
| clean_draw_failed_delivery_samples-am_liquidity_delivery_window-2025-06-26 | 2025-06-26 10:00-11:00 | clean_draw_failed_delivery_samples | weak_or_noisy | unreviewed | n/a |  |
| clean_draw_failed_delivery_samples-am_liquidity_delivery_window-2025-11-11 | 2025-11-11 10:00-11:00 | clean_draw_failed_delivery_samples | weak_or_noisy | unreviewed | n/a |  |
| clean_draw_failed_delivery_samples-am_liquidity_delivery_window-2024-05-16 | 2024-05-16 10:00-11:00 | clean_draw_failed_delivery_samples | weak_or_noisy | unreviewed | n/a |  |
| clean_draw_failed_delivery_samples-am_liquidity_delivery_window-2024-11-28 | 2024-11-28 10:00-11:00 | clean_draw_failed_delivery_samples | weak_or_noisy | unreviewed | n/a |  |
| clean_draw_failed_delivery_samples-am_liquidity_delivery_window-2025-07-25 | 2025-07-25 10:00-11:00 | clean_draw_failed_delivery_samples | weak_or_noisy | unreviewed | n/a |  |
| clean_draw_failed_delivery_samples-am_liquidity_delivery_window-2024-06-19 | 2024-06-19 10:00-11:00 | clean_draw_failed_delivery_samples | weak_or_noisy | unreviewed | n/a |  |
| clean_draw_failed_delivery_samples-am_liquidity_delivery_window-2023-12-20 | 2023-12-20 10:00-11:00 | clean_draw_failed_delivery_samples | weak_or_noisy | unreviewed | n/a |  |
| model_1_overlap_samples-am_liquidity_delivery_window-2025-10-21 | 2025-10-21 10:00-11:00 | model_1_overlap_samples | covered_by_model_1 | unreviewed | n/a |  |
| model_1_overlap_samples-am_liquidity_delivery_window-2023-09-27 | 2023-09-27 10:00-11:00 | model_1_overlap_samples | covered_by_model_1 | unreviewed | n/a |  |
| model_1_overlap_samples-am_liquidity_delivery_window-2025-07-18 | 2025-07-18 10:00-11:00 | model_1_overlap_samples | covered_by_model_1 | unreviewed | n/a |  |
| model_1_overlap_samples-am_liquidity_delivery_window-2024-07-15 | 2024-07-15 10:00-11:00 | model_1_overlap_samples | covered_by_model_1 | unreviewed | n/a |  |
| model_1_overlap_samples-am_liquidity_delivery_window-2024-12-13 | 2024-12-13 10:00-11:00 | model_1_overlap_samples | covered_by_model_1 | unreviewed | n/a |  |
| model_1_overlap_samples-am_liquidity_delivery_window-2025-11-28 | 2025-11-28 10:00-11:00 | model_1_overlap_samples | covered_by_model_1 | unreviewed | n/a |  |
| model_1_overlap_samples-am_liquidity_delivery_window-2025-11-27 | 2025-11-27 10:00-11:00 | model_1_overlap_samples | covered_by_model_1 | unreviewed | n/a |  |
| model_1_overlap_samples-am_liquidity_delivery_window-2023-11-06 | 2023-11-06 10:00-11:00 | model_1_overlap_samples | covered_by_model_1 | unreviewed | n/a |  |
| model_1_overlap_samples-am_liquidity_delivery_window-2025-04-09 | 2025-04-09 10:00-11:00 | model_1_overlap_samples | covered_by_model_1 | unreviewed | n/a |  |
| model_1_overlap_samples-am_liquidity_delivery_window-2025-06-26 | 2025-06-26 10:00-11:00 | model_1_overlap_samples | covered_by_model_1 | unreviewed | n/a |  |
| RAID_RECLAIM_overlap_samples-am_liquidity_delivery_window-2025-04-07 | 2025-04-07 10:00-11:00 | RAID_RECLAIM_overlap_samples | covered_by_RAID_RECLAIM | unreviewed | n/a |  |
| RAID_RECLAIM_overlap_samples-am_liquidity_delivery_window-2025-10-27 | 2025-10-27 10:00-11:00 | RAID_RECLAIM_overlap_samples | covered_by_RAID_RECLAIM | unreviewed | n/a |  |
| RAID_RECLAIM_overlap_samples-am_liquidity_delivery_window-2025-04-15 | 2025-04-15 10:00-11:00 | RAID_RECLAIM_overlap_samples | covered_by_RAID_RECLAIM | unreviewed | n/a |  |
| RAID_RECLAIM_overlap_samples-am_liquidity_delivery_window-2023-11-24 | 2023-11-24 10:00-11:00 | RAID_RECLAIM_overlap_samples | covered_by_RAID_RECLAIM | unreviewed | n/a |  |
| RAID_RECLAIM_overlap_samples-am_liquidity_delivery_window-2025-09-23 | 2025-09-23 10:00-11:00 | RAID_RECLAIM_overlap_samples | covered_by_RAID_RECLAIM | unreviewed | n/a |  |
| RAID_RECLAIM_overlap_samples-am_liquidity_delivery_window-2024-01-23 | 2024-01-23 10:00-11:00 | RAID_RECLAIM_overlap_samples | covered_by_RAID_RECLAIM | unreviewed | n/a |  |
| RAID_RECLAIM_overlap_samples-am_liquidity_delivery_window-2025-02-17 | 2025-02-17 10:00-11:00 | RAID_RECLAIM_overlap_samples | covered_by_RAID_RECLAIM | unreviewed | n/a |  |
| RAID_RECLAIM_overlap_samples-am_liquidity_delivery_window-2024-05-22 | 2024-05-22 10:00-11:00 | RAID_RECLAIM_overlap_samples | covered_by_RAID_RECLAIM | unreviewed | n/a |  |
| RAID_RECLAIM_overlap_samples-am_liquidity_delivery_window-2025-07-08 | 2025-07-08 10:00-11:00 | RAID_RECLAIM_overlap_samples | covered_by_RAID_RECLAIM | unreviewed | n/a |  |
| RAID_RECLAIM_overlap_samples-am_liquidity_delivery_window-2025-08-25 | 2025-08-25 10:00-11:00 | RAID_RECLAIM_overlap_samples | covered_by_RAID_RECLAIM | unreviewed | n/a |  |
Research-only. Human labels do not approve trades, models, or execution.
