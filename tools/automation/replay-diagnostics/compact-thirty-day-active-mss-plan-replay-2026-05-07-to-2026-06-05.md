# Compact Thirty-Day Active MSS Plan Replay

Structural MSS events: 49
Evaluated bars: 326
Final ApprovedTrade + canExecute: 30
Scanner executable candidates: 1
Conditional candidates: 326

## Pipeline Statuses
- ApprovedTrade: 110
- ConditionalTrade: 216

## Conditional By Setup
- TurtleSoup: 120
- SweepMssFvgRetrace: 68
- HtfDisplacementFvgContinuation: 76
- HtfDisplacementMssContinuation: 62

## Coverage
- 5m: 12013 bars, 2026-04-07T00:00:00 to 2026-06-05T16:00:00, failures=0
- 15m: 4005 bars, 2026-04-07T00:00:00 to 2026-06-05T16:00:00, failures=0
- 60m: 1002 bars, 2026-04-07T00:00:00 to 2026-06-05T16:00:00, failures=0
- 120m: 523 bars, 2026-04-07T00:00:00 to 2026-06-05T16:00:00, failures=0
- 240m: 261 bars, 2026-04-07T02:00:00 to 2026-06-05T14:00:00, failures=0

## Proper Trigger Verbose Review
- Status: completed
- Trigger: 2026-05-20T15:05:00 ET
- Verbose JSON: active-mss-trigger-review-2026-05-20T1505.json
- Verbose Markdown: active-mss-trigger-review-2026-05-20T1505.md
- Outcome label: target1_first
- First resolved: 2026-05-20T15:20:00 stop=false T1=true T2=false
- Max favorable/adverse: 3.93R / 0.57R

Boundary: OHLC replay only; no Discord, no bridge behavior change, no broker execution.
