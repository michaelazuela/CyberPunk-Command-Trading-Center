# Pre-Candidate Watchlist Report

Symbol: MES
Date range: 2026-01-01 to 2026-05-31
Generated at: 2026-05-31T21:51:13.093Z
Boundary: research_only_not_execution_authority

This report tracks human-reviewed samples that are not yet formal model-candidate ledger entries. These samples do not count toward candidate-review gates unless a human later applies a formal model-candidate label.

## Summary
- Human-reviewed samples: 3
- Formal ledger-eligible samples: 1
- Watchlist/advisory samples: 2
- Advisory-only samples: 1
- Rejected/deprioritized samples: 0
- Samples with agent assessment: 2
- Samples with chart evidence: 2
- Samples with estimated gross contract P/L: 2
- Formal ledger reason: Watchlist/advisory samples are human-reviewed but do not use approved_for_future_model_candidate_review or not_approved_for_future_model_candidate_review. Only those two formal model-candidate labels count toward formal gates. Advisory/watchlist labels do not count unless a human later applies a formal model-candidate label.

## Concepts
### Time-Window Liquidity Delivery
- Concept: time_window_liquidity_delivery
- Watchlist Samples: 2
- Labels: keep_advisory=1 (advisory; gates=no; next=continue_observing); new_model_candidate_review=1 (watchlist; gates=no; next=decide_formal_candidate_label)
- Agent Assessment Summary: agrees=0; partial=1; disagrees=0; unclear=1
- Chart/Report Evidence: chart evidence=2; exact PNG=2; exact report=2; missing=0; unknown=0; withheld=1
- Estimated Gross Contract P/L: MES; samples with P/L 2; missing 0; avg hypothetical +$10.00 gross; avg MFE +$125.00 gross; avg MAE -$30.00 gross; status available; research-only context
- Watchlist Recommendation: needs_more_chart_evidence
- Reason:
  - Chart/report evidence is missing, unknown, or withheld for at least one watchlist sample.
  - Agent assessment is unclear or insufficient for at least one sample.
  - Estimated gross contract P/L is included as research context only and does not move samples into the formal ledger.
- Boundary: research_only_not_execution_authority

## Samples
| Sample ID | Label | Category | Counts Toward Gates | Agent Assessment | Chart Evidence | Estimated Gross P/L | Next Human Action |
|---|---|---|---|---|---|---|---|
| time_window_liquidity_delivery-003 | Keep Advisory (keep_advisory) | advisory | No | unclear_insufficient_evidence | chart_withheld | MES +$40.00 gross | review_chart |
| time_window_liquidity_delivery-014 | Candidate Label Review (new_model_candidate_review) | watchlist | No | partially_agrees_with_human | chart_available | MES -$20.00 gross | decide_candidate_label |
