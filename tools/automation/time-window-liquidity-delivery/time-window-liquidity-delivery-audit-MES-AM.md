# Time-Window Liquidity Delivery Audit - MES AM
Research-only. This report does not approve trades and does not create execution authority.
This report does not approve trades and does not create execution authority.
Symbol: MES
Date range: 2018-01-01 to 2026-05-31
Window studied: AM 10:00-11:00 NY
Boundary: research_only_not_execution_authority
## Summary
- Candidate count: 710
- Clean draw count: 51
- No-draw count: 659
- FVG/inefficiency count: 629
- MSS count: 573
- Delivery achieved count: 367
- Failed delivery count: 46
- no installed model path overlap count: 503
- no installed model path overlap count: 196
- Advisory-only count: 11
## Evidence Collection Threshold
- Current examples: 710
- Minimum before rule-review discussion: 20
- Preferred before rule-review discussion: 30
- Ready for rule-review discussion: No
- Note: Collect 20-30 examples per window before any rule-review discussion. No window is approved by this report.
## Sample Table
| Date | Window | Clean Draw | Expected Delivery | Delivery Achieved | FVG/Inefficiency | MSS | Sweep/Reclaim | Overlap |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 2023-08-22 | AM 10:00-11:00 NY | No | 22.75 handles / 91 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-08-23 | AM 10:00-11:00 NY | No | 24.25 handles / 97 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-08-24 | AM 10:00-11:00 NY | No | 60.25 handles / 241 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-08-25 | AM 10:00-11:00 NY | No | 82.00 handles / 328 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-08-28 | AM 10:00-11:00 NY | No | 73.00 handles / 292 ticks | No | Yes | No | Yes | HISTORICAL_REVERSAL_overlap_possible |
| 2023-08-29 | AM 10:00-11:00 NY | No | 88.25 handles / 353 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-08-30 | AM 10:00-11:00 NY | No | 159.75 handles / 639 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-08-31 | AM 10:00-11:00 NY | No | 167.75 handles / 671 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-09-01 | AM 10:00-11:00 NY | No | 162.25 handles / 649 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-09-04 | AM 10:00-11:00 NY | Yes | 111.75 handles / 447 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-09-05 | AM 10:00-11:00 NY | No | 90.50 handles / 362 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-09-06 | AM 10:00-11:00 NY | Yes | 74.00 handles / 296 ticks | No | Yes | Yes | No | advisory_only_time_window_research |
| 2023-09-07 | AM 10:00-11:00 NY | No | 108.25 handles / 433 ticks | Yes | Yes | No | Yes | HISTORICAL_REVERSAL_overlap_possible |
| 2023-09-08 | AM 10:00-11:00 NY | No | 83.25 handles / 333 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-09-11 | AM 10:00-11:00 NY | No | 50.75 handles / 203 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-09-12 | AM 10:00-11:00 NY | Yes | 51.25 handles / 205 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-09-13 | AM 10:00-11:00 NY | No | 63.00 handles / 252 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-09-14 | AM 10:00-11:00 NY | No | 52.75 handles / 211 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-09-15 | AM 10:00-11:00 NY | No | 49.25 handles / 197 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-09-18 | AM 10:00-11:00 NY | No | 71.75 handles / 287 ticks | No | No | Yes | Yes | HISTORICAL_REVERSAL_overlap_possible |
| 2023-09-19 | AM 10:00-11:00 NY | No | 76.00 handles / 304 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-09-20 | AM 10:00-11:00 NY | No | 61.25 handles / 245 ticks | No | Yes | No | Yes | HISTORICAL_REVERSAL_overlap_possible |
| 2023-09-21 | AM 10:00-11:00 NY | No | 160.75 handles / 643 ticks | No | Yes | No | Yes | HISTORICAL_REVERSAL_overlap_possible |
| 2023-09-22 | AM 10:00-11:00 NY | No | 190.00 handles / 760 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-09-25 | AM 10:00-11:00 NY | No | 155.75 handles / 623 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-09-26 | AM 10:00-11:00 NY | No | 171.50 handles / 686 ticks | No | Yes | No | Yes | HISTORICAL_REVERSAL_overlap_possible |
| 2023-09-27 | AM 10:00-11:00 NY | Yes | 187.75 handles / 751 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-09-28 | AM 10:00-11:00 NY | No | 197.50 handles / 790 ticks | No | Yes | No | Yes | HISTORICAL_REVERSAL_overlap_possible |
| 2023-09-29 | AM 10:00-11:00 NY | No | 150.75 handles / 603 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-02 | AM 10:00-11:00 NY | No | 65.00 handles / 260 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-03 | AM 10:00-11:00 NY | No | 68.75 handles / 275 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-04 | AM 10:00-11:00 NY | No | 109.25 handles / 437 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-05 | AM 10:00-11:00 NY | No | 99.75 handles / 399 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-06 | AM 10:00-11:00 NY | No | 120.75 handles / 483 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-09 | AM 10:00-11:00 NY | No | 96.50 handles / 386 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-10 | AM 10:00-11:00 NY | No | 143.25 handles / 573 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-11 | AM 10:00-11:00 NY | No | 164.25 handles / 657 ticks | No | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-12 | AM 10:00-11:00 NY | No | 161.50 handles / 646 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-13 | AM 10:00-11:00 NY | No | 168.25 handles / 673 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-16 | AM 10:00-11:00 NY | No | 86.50 handles / 346 ticks | No | Yes | Yes | No | advisory_only_time_window_research |
| 2023-10-17 | AM 10:00-11:00 NY | No | 68.25 handles / 273 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-18 | AM 10:00-11:00 NY | No | 80.00 handles / 320 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-19 | AM 10:00-11:00 NY | No | 85.75 handles / 343 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-20 | AM 10:00-11:00 NY | No | 137.25 handles / 549 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-23 | AM 10:00-11:00 NY | No | 186.75 handles / 747 ticks | Yes | No | Yes | Yes | HISTORICAL_REVERSAL_overlap_possible |
| 2023-10-24 | AM 10:00-11:00 NY | No | 157.75 handles / 631 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-25 | AM 10:00-11:00 NY | No | 191.50 handles / 766 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-26 | AM 10:00-11:00 NY | No | 231.25 handles / 925 ticks | Yes | Yes | No | Yes | HISTORICAL_REVERSAL_overlap_possible |
| 2023-10-27 | AM 10:00-11:00 NY | No | 266.00 handles / 1064 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |
| 2023-10-30 | AM 10:00-11:00 NY | No | 109.25 handles / 437 ticks | Yes | Yes | Yes | Yes | model_1_overlap_possible |

_660 additional candidate(s) available in JSON._
## Required Next Actions
- Review sample evidence cards manually before any rule-review discussion.
- Keep no installed model path and no installed model path overlap as advisory classification only.
- Do not create entries, stops, T1/T2, outcome buttons, live alerts, or execution authority from this audit.
- Collect 20-30 examples per window before discussing any rules.
Research-only. No live alerts, no outcome buttons, no model promotion, and no execution behavior change.
