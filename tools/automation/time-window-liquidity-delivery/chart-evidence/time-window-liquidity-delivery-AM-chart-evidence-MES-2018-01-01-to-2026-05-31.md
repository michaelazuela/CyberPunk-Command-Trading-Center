# Time-Window Liquidity Delivery AM Chart Evidence - MES

Research-only. This chart evidence pack does not approve trades, does not create execution authority, and does not apply human labels.
This chart evidence pack does not approve trades and does not create execution authority.

Source reviewed file: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\review-packs\reviewed\time-window-liquidity-delivery-AM-curated-review-pack-MES-2018-01-01-to-2026-05-31.reviewed.json
Source curated pack: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\review-packs\time-window-liquidity-delivery-AM-curated-review-pack-MES-2018-01-01-to-2026-05-31.json
Source audit: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\time-window-liquidity-delivery-audit-MES-AM.json
Date range: 2018-01-01 to 2026-05-31
Window: AM
Boundary: research_only_not_execution_authority

## Summary
- Total needs_chart_review samples: 8
- PNG chart cards generated: 0

## Recommendation Summary
- upgrade_to_strong_advisory_candidate: 0
- keep_needs_chart_review: 1
- downgrade_to_weak_or_noisy: 0
- reject_time_window_standalone: 7
- covered_by_model_1: 0
- covered_by_uninstalled_context: 0

## Chart Evidence Records
| Sample ID | Date | Draw Type | Draw Level | FVG | MSS | Sweep/Reclaim | Delivery | FVG Respected | Draw Reached Before Window | Draw Valid During Window | no installed model path Overlap | no installed model path Overlap | Recommendation | Chart/Report Path |
|---|---|---|---:|---:|---:|---:|---|---|---|---|---:|---:|---|---|
| advisory_only_samples-am_liquidity_delivery_window-2023-09-06 | 2023-09-06 | previous_week_low | 5047.25 | Yes | Yes | No | failed | yes | no | yes | No | No | keep_needs_chart_review | C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md |
| advisory_only_samples-am_liquidity_delivery_window-2023-10-16 | 2023-10-16 | previous_week_low | 4882.25 | Yes | Yes | No | not_observed | yes | yes | no | No | No | reject_time_window_standalone | C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md |
| advisory_only_samples-am_liquidity_delivery_window-2023-12-05 | 2023-12-05 | previous_week_high | 5190.75 | Yes | Yes | No | not_observed | yes | yes | no | No | No | reject_time_window_standalone | C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md |
| advisory_only_samples-am_liquidity_delivery_window-2023-12-22 | 2023-12-22 | previous_week_low | 5182.00 | Yes | Yes | No | not_observed | yes | yes | no | No | No | reject_time_window_standalone | C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md |
| advisory_only_samples-am_liquidity_delivery_window-2024-09-03 | 2024-09-03 | previous_day_high | 6072.25 | Yes | Yes | No | not_observed | yes | yes | no | No | No | reject_time_window_standalone | C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md |
| advisory_only_samples-am_liquidity_delivery_window-2024-12-27 | 2024-12-27 | previous_week_low | 6135.75 | Yes | Yes | No | not_observed | yes | yes | no | No | No | reject_time_window_standalone | C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md |
| advisory_only_samples-am_liquidity_delivery_window-2026-02-02 | 2026-02-02 | previous_day_low | 6921.75 | Yes | Yes | No | not_observed | yes | yes | no | No | No | reject_time_window_standalone | C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md |
| advisory_only_samples-am_liquidity_delivery_window-2026-04-14 | 2026-04-14 | previous_week_low | 6572.75 | Yes | Yes | No | not_observed | no | yes | no | No | No | reject_time_window_standalone | C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md |

## Per-Sample Notes
### advisory_only_samples-am_liquidity_delivery_window-2023-09-06
- Symbol: MES
- Date: 2023-09-06
- NY Time: 10:00-11:00
- AM Window: AM 10:00-11:00 NY
- Draw Type: previous_week_low
- Draw Level: 5047.25
- FVG/Inefficiency Present: Yes
- MSS Present: Yes
- Sweep/Reclaim Present: No
- Delivery Status: failed
- FVG/Inefficiency Respected: yes
- Draw Reached Before Window: no
- Draw Valid During Window: yes
- no installed model path Overlap: No
- no installed model path Overlap: No
- Remains Advisory-Only: Yes
- Why Chart Review Was Needed: Clean draw with FVG and MSS, but delivery failed. Need chart review to determine whether this is useful failure behavior or invalidates standalone TWLD.
- Advisory-Only Reason: Curated as advisory-only time-window research, not an executable model label.
- Source Chart Path: Not recorded
- Source Report Path: Not recorded
- Generated Evidence Report: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md
- PNG Card: Not generated
- Recommendation: keep_needs_chart_review
- Recommendation Applied As Final Label: No
- Recommendation Reasons:
  - FVG/inefficiency and MSS are present, but delivery was not confirmed in the reviewed fields.
  - Keep this sample in chart review; do not apply a final label automatically.
- Boundary: research_only_not_execution_authority

### advisory_only_samples-am_liquidity_delivery_window-2023-10-16
- Symbol: MES
- Date: 2023-10-16
- NY Time: 10:00-11:00
- AM Window: AM 10:00-11:00 NY
- Draw Type: previous_week_low
- Draw Level: 4882.25
- FVG/Inefficiency Present: Yes
- MSS Present: Yes
- Sweep/Reclaim Present: No
- Delivery Status: not_observed
- FVG/Inefficiency Respected: yes
- Draw Reached Before Window: yes
- Draw Valid During Window: no
- no installed model path Overlap: No
- no installed model path Overlap: No
- Remains Advisory-Only: Yes
- Why Chart Review Was Needed: FVG and MSS present, but delivery was not observed. Need chart confirmation before deciding standalone value.
- Advisory-Only Reason: Curated as advisory-only time-window research, not an executable model label.
- Source Chart Path: Not recorded
- Source Report Path: Not recorded
- Generated Evidence Report: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md
- PNG Card: Not generated
- Recommendation: reject_time_window_standalone
- Recommendation Applied As Final Label: No
- Recommendation Reasons:
  - The draw appears to have been reached before the review window/setup, so standalone TWLD validity is weak.
- Boundary: research_only_not_execution_authority

### advisory_only_samples-am_liquidity_delivery_window-2023-12-05
- Symbol: MES
- Date: 2023-12-05
- NY Time: 10:00-11:00
- AM Window: AM 10:00-11:00 NY
- Draw Type: previous_week_high
- Draw Level: 5190.75
- FVG/Inefficiency Present: Yes
- MSS Present: Yes
- Sweep/Reclaim Present: No
- Delivery Status: not_observed
- FVG/Inefficiency Respected: yes
- Draw Reached Before Window: yes
- Draw Valid During Window: no
- no installed model path Overlap: No
- no installed model path Overlap: No
- Remains Advisory-Only: Yes
- Why Chart Review Was Needed: FVG and MSS present, but delivery was not observed. Need chart review before deciding whether this is standalone TWLD or noise.
- Advisory-Only Reason: Curated as advisory-only time-window research, not an executable model label.
- Source Chart Path: Not recorded
- Source Report Path: Not recorded
- Generated Evidence Report: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md
- PNG Card: Not generated
- Recommendation: reject_time_window_standalone
- Recommendation Applied As Final Label: No
- Recommendation Reasons:
  - The draw appears to have been reached before the review window/setup, so standalone TWLD validity is weak.
- Boundary: research_only_not_execution_authority

### advisory_only_samples-am_liquidity_delivery_window-2023-12-22
- Symbol: MES
- Date: 2023-12-22
- NY Time: 10:00-11:00
- AM Window: AM 10:00-11:00 NY
- Draw Type: previous_week_low
- Draw Level: 5182.00
- FVG/Inefficiency Present: Yes
- MSS Present: Yes
- Sweep/Reclaim Present: No
- Delivery Status: not_observed
- FVG/Inefficiency Respected: yes
- Draw Reached Before Window: yes
- Draw Valid During Window: no
- no installed model path Overlap: No
- no installed model path Overlap: No
- Remains Advisory-Only: Yes
- Why Chart Review Was Needed: FVG and MSS present, but delivery was not observed. Need chart review before deciding whether the draw was actionable or already invalid.
- Advisory-Only Reason: Curated as advisory-only time-window research, not an executable model label.
- Source Chart Path: Not recorded
- Source Report Path: Not recorded
- Generated Evidence Report: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md
- PNG Card: Not generated
- Recommendation: reject_time_window_standalone
- Recommendation Applied As Final Label: No
- Recommendation Reasons:
  - The draw appears to have been reached before the review window/setup, so standalone TWLD validity is weak.
- Boundary: research_only_not_execution_authority

### advisory_only_samples-am_liquidity_delivery_window-2024-09-03
- Symbol: MES
- Date: 2024-09-03
- NY Time: 10:00-11:00
- AM Window: AM 10:00-11:00 NY
- Draw Type: previous_day_high
- Draw Level: 6072.25
- FVG/Inefficiency Present: Yes
- MSS Present: Yes
- Sweep/Reclaim Present: No
- Delivery Status: not_observed
- FVG/Inefficiency Respected: yes
- Draw Reached Before Window: yes
- Draw Valid During Window: no
- no installed model path Overlap: No
- no installed model path Overlap: No
- Remains Advisory-Only: Yes
- Why Chart Review Was Needed: Prior day high draw with FVG and MSS, but delivery was not observed. Need chart confirmation before deciding standalone value.
- Advisory-Only Reason: Curated as advisory-only time-window research, not an executable model label.
- Source Chart Path: Not recorded
- Source Report Path: Not recorded
- Generated Evidence Report: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md
- PNG Card: Not generated
- Recommendation: reject_time_window_standalone
- Recommendation Applied As Final Label: No
- Recommendation Reasons:
  - The draw appears to have been reached before the review window/setup, so standalone TWLD validity is weak.
- Boundary: research_only_not_execution_authority

### advisory_only_samples-am_liquidity_delivery_window-2024-12-27
- Symbol: MES
- Date: 2024-12-27
- NY Time: 10:00-11:00
- AM Window: AM 10:00-11:00 NY
- Draw Type: previous_week_low
- Draw Level: 6135.75
- FVG/Inefficiency Present: Yes
- MSS Present: Yes
- Sweep/Reclaim Present: No
- Delivery Status: not_observed
- FVG/Inefficiency Respected: yes
- Draw Reached Before Window: yes
- Draw Valid During Window: no
- no installed model path Overlap: No
- no installed model path Overlap: No
- Remains Advisory-Only: Yes
- Why Chart Review Was Needed: FVG and MSS present, but delivery was not observed. Holiday-week context requires chart review before deciding.
- Advisory-Only Reason: Curated as advisory-only time-window research, not an executable model label.
- Source Chart Path: Not recorded
- Source Report Path: Not recorded
- Generated Evidence Report: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md
- PNG Card: Not generated
- Recommendation: reject_time_window_standalone
- Recommendation Applied As Final Label: No
- Recommendation Reasons:
  - The draw appears to have been reached before the review window/setup, so standalone TWLD validity is weak.
- Boundary: research_only_not_execution_authority

### advisory_only_samples-am_liquidity_delivery_window-2026-02-02
- Symbol: MES
- Date: 2026-02-02
- NY Time: 10:00-11:00
- AM Window: AM 10:00-11:00 NY
- Draw Type: previous_day_low
- Draw Level: 6921.75
- FVG/Inefficiency Present: Yes
- MSS Present: Yes
- Sweep/Reclaim Present: No
- Delivery Status: not_observed
- FVG/Inefficiency Respected: yes
- Draw Reached Before Window: yes
- Draw Valid During Window: no
- no installed model path Overlap: No
- no installed model path Overlap: No
- Remains Advisory-Only: Yes
- Why Chart Review Was Needed: Prior day low draw with FVG and MSS, but delivery was not observed. Need chart review before deciding standalone value.
- Advisory-Only Reason: Curated as advisory-only time-window research, not an executable model label.
- Source Chart Path: Not recorded
- Source Report Path: Not recorded
- Generated Evidence Report: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md
- PNG Card: Not generated
- Recommendation: reject_time_window_standalone
- Recommendation Applied As Final Label: No
- Recommendation Reasons:
  - The draw appears to have been reached before the review window/setup, so standalone TWLD validity is weak.
- Boundary: research_only_not_execution_authority

### advisory_only_samples-am_liquidity_delivery_window-2026-04-14
- Symbol: MES
- Date: 2026-04-14
- NY Time: 10:00-11:00
- AM Window: AM 10:00-11:00 NY
- Draw Type: previous_week_low
- Draw Level: 6572.75
- FVG/Inefficiency Present: Yes
- MSS Present: Yes
- Sweep/Reclaim Present: No
- Delivery Status: not_observed
- FVG/Inefficiency Respected: no
- Draw Reached Before Window: yes
- Draw Valid During Window: no
- no installed model path Overlap: No
- no installed model path Overlap: No
- Remains Advisory-Only: Yes
- Why Chart Review Was Needed: Previous week low draw with FVG and MSS, but delivery was not observed. Need chart review before deciding standalone value.
- Advisory-Only Reason: Curated as advisory-only time-window research, not an executable model label.
- Source Chart Path: Not recorded
- Source Report Path: Not recorded
- Generated Evidence Report: C:\Users\Mike\Documents\New project\tools\automation\time-window-liquidity-delivery\chart-evidence\time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.md
- PNG Card: Not generated
- Recommendation: reject_time_window_standalone
- Recommendation Applied As Final Label: No
- Recommendation Reasons:
  - The draw appears to have been reached before the review window/setup, so standalone TWLD validity is weak.
- Boundary: research_only_not_execution_authority

Research-only. Recommendations are not final labels and do not approve trades, models, alerts, or execution.
