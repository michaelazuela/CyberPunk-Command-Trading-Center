# Time-Window Liquidity Delivery Audit - MES PM
Research-only. This report does not approve trades and does not create execution authority.
This report does not approve trades and does not create execution authority.
Symbol: MES
Date range: 2018-01-01 to 2026-05-31
Window studied: PM 2:00-3:00 NY
Boundary: research_only_not_execution_authority
## Summary
- Candidate count: 257
- Clean draw count: 6
- No-draw count: 251
- FVG/inefficiency count: 221
- MSS count: 205
- Delivery achieved count: 76
- Failed delivery count: 6
- Model 1 overlap count: 140
- Turtle Soup overlap count: 60
- Advisory-only count: 57
## Evidence Collection Threshold
- Current examples: 257
- Minimum before rule-review discussion: 20
- Preferred before rule-review discussion: 30
- Ready for rule-review discussion: No
- Note: Collect 20-30 examples per window before any rule-review discussion. No window is approved by this report.
## Sample Table
| Date | Window | Clean Draw | Expected Delivery | Delivery Achieved | FVG/Inefficiency | MSS | Sweep/Reclaim | Overlap |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 2023-11-06 | PM 2:00-3:00 NY | No | 220.00 handles / 880 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-11-07 | PM 2:00-3:00 NY | No | 250.75 handles / 1003 ticks | No | Yes | No | No | advisory_only_time_window_research |
| 2023-11-08 | PM 2:00-3:00 NY | No | 244.00 handles / 976 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-11-09 | PM 2:00-3:00 NY | No | 230.00 handles / 920 ticks | No | Yes | Yes | No | advisory_only_time_window_research |
| 2023-11-10 | PM 2:00-3:00 NY | No | 269.75 handles / 1079 ticks | No | Yes | Yes | No | advisory_only_time_window_research |
| 2023-11-13 | PM 2:00-3:00 NY | Yes | 75.75 handles / 303 ticks | No | Yes | Yes | No | advisory_only_time_window_research |
| 2023-11-14 | PM 2:00-3:00 NY | No | 154.75 handles / 619 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-11-15 | PM 2:00-3:00 NY | No | 170.25 handles / 681 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-11-16 | PM 2:00-3:00 NY | No | 156.00 handles / 624 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-11-17 | PM 2:00-3:00 NY | No | 174.50 handles / 698 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-11-20 | PM 2:00-3:00 NY | No | 149.25 handles / 597 ticks | No | Yes | Yes | No | advisory_only_time_window_research |
| 2023-11-21 | PM 2:00-3:00 NY | No | 143.75 handles / 575 ticks | No | No | Yes | Yes | turtle_soup_overlap_possible |
| 2023-11-22 | PM 2:00-3:00 NY | No | 160.25 handles / 641 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-11-27 | PM 2:00-3:00 NY | No | 45.75 handles / 183 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-11-28 | PM 2:00-3:00 NY | No | 41.00 handles / 164 ticks | No | Yes | No | Yes | turtle_soup_overlap_possible |
| 2023-11-29 | PM 2:00-3:00 NY | No | 55.00 handles / 220 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-11-30 | PM 2:00-3:00 NY | No | 49.00 handles / 196 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-12-01 | PM 2:00-3:00 NY | No | 75.00 handles / 300 ticks | No | No | Yes | Yes | turtle_soup_overlap_possible |
| 2023-12-04 | PM 2:00-3:00 NY | No | 36.50 handles / 146 ticks | No | Yes | Yes | No | advisory_only_time_window_research |
| 2023-12-05 | PM 2:00-3:00 NY | No | 36.50 handles / 146 ticks | No | Yes | No | No | advisory_only_time_window_research |
| 2023-12-06 | PM 2:00-3:00 NY | No | 34.50 handles / 138 ticks | No | No | Yes | Yes | turtle_soup_overlap_possible |
| 2023-12-07 | PM 2:00-3:00 NY | No | 45.00 handles / 180 ticks | No | No | Yes | Yes | turtle_soup_overlap_possible |
| 2023-12-08 | PM 2:00-3:00 NY | No | 55.75 handles / 223 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-12-11 | PM 2:00-3:00 NY | No | 72.50 handles / 290 ticks | No | Yes | Yes | No | advisory_only_time_window_research |
| 2023-12-12 | PM 2:00-3:00 NY | No | 87.00 handles / 348 ticks | No | No | Yes | No | advisory_only_time_window_research |
| 2023-12-13 | PM 2:00-3:00 NY | Yes | 99.25 handles / 397 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-12-14 | PM 2:00-3:00 NY | No | 148.00 handles / 592 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-12-15 | PM 2:00-3:00 NY | No | 159.25 handles / 637 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-12-18 | PM 2:00-3:00 NY | No | 145.25 handles / 581 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-12-19 | PM 2:00-3:00 NY | No | 162.25 handles / 649 ticks | No | Yes | No | Yes | turtle_soup_overlap_possible |
| 2023-12-20 | PM 2:00-3:00 NY | No | 172.25 handles / 689 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-12-21 | PM 2:00-3:00 NY | No | 118.75 handles / 475 ticks | No | No | No | Yes | turtle_soup_overlap_possible |
| 2023-12-22 | PM 2:00-3:00 NY | No | 160.00 handles / 640 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-12-26 | PM 2:00-3:00 NY | No | 77.75 handles / 311 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-12-27 | PM 2:00-3:00 NY | No | 87.50 handles / 350 ticks | Yes | Yes | No | Yes | turtle_soup_overlap_possible |
| 2023-12-28 | PM 2:00-3:00 NY | Yes | 92.25 handles / 369 ticks | No | No | Yes | Yes | turtle_soup_overlap_possible |
| 2023-12-29 | PM 2:00-3:00 NY | No | 69.75 handles / 279 ticks | No | No | Yes | No | advisory_only_time_window_research |
| 2024-01-02 | PM 2:00-3:00 NY | No | 57.25 handles / 229 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2024-01-03 | PM 2:00-3:00 NY | No | 81.75 handles / 327 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2024-01-04 | PM 2:00-3:00 NY | No | 93.50 handles / 374 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2024-01-05 | PM 2:00-3:00 NY | No | 102.00 handles / 408 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2024-01-08 | PM 2:00-3:00 NY | No | 70.75 handles / 283 ticks | No | Yes | Yes | No | advisory_only_time_window_research |
| 2024-01-09 | PM 2:00-3:00 NY | No | 97.75 handles / 391 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2024-01-10 | PM 2:00-3:00 NY | No | 109.50 handles / 438 ticks | No | Yes | Yes | No | advisory_only_time_window_research |
| 2024-01-11 | PM 2:00-3:00 NY | No | 100.75 handles / 403 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2024-01-12 | PM 2:00-3:00 NY | No | 116.75 handles / 467 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2024-01-16 | PM 2:00-3:00 NY | No | 72.75 handles / 291 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2024-01-17 | PM 2:00-3:00 NY | No | 84.50 handles / 338 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2024-01-18 | PM 2:00-3:00 NY | No | 70.75 handles / 283 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2024-01-19 | PM 2:00-3:00 NY | No | 144.50 handles / 578 ticks | No | Yes | Yes | No | advisory_only_time_window_research |

_207 additional candidate(s) available in JSON._
## Required Next Actions
- Review sample evidence cards manually before any rule-review discussion.
- Keep Model 1 and Turtle Soup overlap as advisory classification only.
- Do not create entries, stops, T1/T2, outcome buttons, live alerts, or execution authority from this audit.
- Collect 20-30 examples per window before discussing any rules.
Research-only. No live alerts, no outcome buttons, no model promotion, and no execution behavior change.
