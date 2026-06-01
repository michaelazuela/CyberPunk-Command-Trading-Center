# Time-Window Liquidity Delivery HTF Timing Review - MES

Research-only HTF draw timing review. This timing review does not approve trades and does not create execution authority.
This timing review does not approve trades and does not create execution authority.
5M is execution-only. All coded HTFs above 5M are draw-context sources.

Source pack: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\htf-timing-review\time-window-liquidity-delivery-HTF-timing-review-pack-MES-2018-01-01-to-2026-05-31.json
Source HTF-quality review set: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\htf-quality\time-window-liquidity-delivery-HTF-quality-review-set-MES-2018-01-01-to-2026-05-31.json
Date range: 2018-01-01 to 2026-05-31
Boundary: research_only_not_execution_authority

## Safety
- Activates Model: No
- Approves Execution: No
- Creates Trade: No
- Changes Scanner: No
- Changes Bridge: No
- Changes Rules: No
- Changes Readiness: No

## Label Definitions
- window_confirmed_prior_htf_draw: HTF draw was known before the window and the TWLD window helped confirm delivery.
- window_continued_prior_htf_draw: Delivery was already in progress and the window continued it.
- window_failed_prior_htf_draw: HTF draw existed, but the window failed to deliver.
- window_conflicted_with_prior_htf_draw: Execution-window behavior conflicted with the HTF draw.
- not_useful_for_timing: HTF draw existed, but the window added no useful timing information.
- needs_visual_review: Data fields are insufficient; chart review is needed.

## Review Progress Summary
- Total Samples: 30
- Reviewed Samples: 0
- Unreviewed Samples: 30

## Suggested Label Summary
- window_confirmed_prior_htf_draw: 1
- window_continued_prior_htf_draw: 1
- window_failed_prior_htf_draw: 0
- window_conflicted_with_prior_htf_draw: 12
- not_useful_for_timing: 16
- needs_visual_review: 0

## Final Label Summary
- window_confirmed_prior_htf_draw: 0
- window_continued_prior_htf_draw: 0
- window_failed_prior_htf_draw: 0
- window_conflicted_with_prior_htf_draw: 0
- not_useful_for_timing: 0
- needs_visual_review: 0

## Samples
| Sample ID | Date | Window | NY Time Window | HTF Score | HTF Label | Alignment | Delivery During | Delivery After | Suggested Timing Label | Final Timing Label |
|---|---:|---|---|---:|---|---|---|---|---|---|
| advisory_only_samples-pm_liquidity_delivery_window-2023-11-13 | 2023-11-13 | PM | PM 2:00-3:00 NY | 38 | conflicting | conflicting | No | Yes | window_conflicted_with_prior_htf_draw | unreviewed |
| advisory_only_samples-am_liquidity_delivery_window-2023-11-24 | 2023-11-24 | AM | AM 10:00-11:00 NY | 38 | conflicting | conflicting | No | No | window_conflicted_with_prior_htf_draw | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2023-11-28 | 2023-11-28 | PM | PM 2:00-3:00 NY | 38 | conflicting | conflicting | No | Yes | window_conflicted_with_prior_htf_draw | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2023-12-19 | 2023-12-19 | PM | PM 2:00-3:00 NY | 38 | conflicting | conflicting | No | No | window_conflicted_with_prior_htf_draw | unreviewed |
| advisory_only_samples-am_liquidity_delivery_window-2023-12-28 | 2023-12-28 | AM | AM 10:00-11:00 NY | 38 | conflicting | conflicting | No | No | window_conflicted_with_prior_htf_draw | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2024-02-14 | 2024-02-14 | PM | PM 2:00-3:00 NY | 38 | conflicting | conflicting | No | No | window_conflicted_with_prior_htf_draw | unreviewed |
| advisory_only_samples-am_liquidity_delivery_window-2024-02-21 | 2024-02-21 | AM | AM 10:00-11:00 NY | 38 | conflicting | conflicting | No | Yes | window_conflicted_with_prior_htf_draw | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2024-02-22 | 2024-02-22 | PM | PM 2:00-3:00 NY | 38 | conflicting | conflicting | No | No | window_conflicted_with_prior_htf_draw | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2024-02-26 | 2024-02-26 | PM | PM 2:00-3:00 NY | 38 | conflicting | conflicting | No | No | window_conflicted_with_prior_htf_draw | unreviewed |
| advisory_only_samples-am_liquidity_delivery_window-2024-03-13 | 2024-03-13 | AM | AM 10:00-11:00 NY | 38 | conflicting | conflicting | No | No | window_conflicted_with_prior_htf_draw | unreviewed |
| advisory_only_samples-am_liquidity_delivery_window-2023-10-16 | 2023-10-16 | AM | AM 10:00-11:00 NY | 38 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-am_liquidity_delivery_window-2023-12-05 | 2023-12-05 | AM | AM 10:00-11:00 NY | 38 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-am_liquidity_delivery_window-2023-12-22 | 2023-12-22 | AM | AM 10:00-11:00 NY | 38 | weak | aligned | No | Yes | window_continued_prior_htf_draw | unreviewed |
| advisory_only_samples-am_liquidity_delivery_window-2024-07-04 | 2024-07-04 | AM | AM 10:00-11:00 NY | 38 | weak | neutral | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-am_liquidity_delivery_window-2024-09-03 | 2024-09-03 | AM | AM 10:00-11:00 NY | 38 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-am_liquidity_delivery_window-2024-11-29 | 2024-11-29 | AM | AM 10:00-11:00 NY | 53 | weak | aligned | Yes | No | window_confirmed_prior_htf_draw | unreviewed |
| advisory_only_samples-am_liquidity_delivery_window-2024-12-27 | 2024-12-27 | AM | AM 10:00-11:00 NY | 38 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-am_liquidity_delivery_window-2026-02-02 | 2026-02-02 | AM | AM 10:00-11:00 NY | 38 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-am_liquidity_delivery_window-2026-04-14 | 2026-04-14 | AM | AM 10:00-11:00 NY | 38 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2025-11-17 | 2025-11-17 | PM | PM 2:00-3:00 NY | 38 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2024-11-08 | 2024-11-08 | PM | PM 2:00-3:00 NY | 38 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2023-11-10 | 2023-11-10 | PM | PM 2:00-3:00 NY | 38 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2023-11-09 | 2023-11-09 | PM | PM 2:00-3:00 NY | 38 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2025-01-17 | 2025-01-17 | PM | PM 2:00-3:00 NY | 38 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2025-02-26 | 2025-02-26 | PM | PM 2:00-3:00 NY | 30 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2026-03-05 | 2026-03-05 | PM | PM 2:00-3:00 NY | 38 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2026-01-20 | 2026-01-20 | PM | PM 2:00-3:00 NY | 38 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2026-01-27 | 2026-01-27 | PM | PM 2:00-3:00 NY | 38 | conflicting | conflicting | No | No | window_conflicted_with_prior_htf_draw | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2025-11-10 | 2025-11-10 | PM | PM 2:00-3:00 NY | 38 | weak | aligned | No | No | not_useful_for_timing | unreviewed |
| advisory_only_samples-pm_liquidity_delivery_window-2026-02-06 | 2026-02-06 | PM | PM 2:00-3:00 NY | 38 | conflicting | conflicting | No | No | window_conflicted_with_prior_htf_draw | unreviewed |

## Reviewed Groups
### Window Confirmed Prior Htf Draw
_No samples reviewed with this label._

### Window Continued Prior Htf Draw
_No samples reviewed with this label._

### Window Failed Prior Htf Draw
_No samples reviewed with this label._

### Window Conflicted With Prior Htf Draw
_No samples reviewed with this label._

### Not Useful For Timing
_No samples reviewed with this label._

### Needs Visual Review
_No samples reviewed with this label._

Research-only. Human timing labels do not approve trades, models, scanner output, bridge behavior, or execution.
