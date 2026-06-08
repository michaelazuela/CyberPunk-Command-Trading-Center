# June 5 Opening Drive FVG Current-Code Replay

Instrument: MES (MES 06-26)
Window: 2026-06-05T09:30:00-04:00 to 2026-06-05T11:00:00-04:00
Preload: 2026-05-06T00:00:00-04:00 to 2026-06-05T11:00:00-04:00
Boundary: ohlc_replay_human_review_only_not_execution_authority

## Summary
- 5M bars evaluated: 18
- Opening Drive candidates observed: 16
- Human Review Ready candidates: 9
- Final ApprovedTrade + effective canExecute: 0
- Errors: 0

## Data Coverage
| Timeframe | Source | Bars | Cache | Bridge | Requests | Range Start | Range End | Failures |
|---|---|---:|---:|---:|---:|---|---|---:|
| 5m | market_bars_read_ninjatrader_repair | 6217 | 1000 | 6217 | 31 | 2026-05-06T00:00:00 | 2026-06-05T16:00:00 | 0 |
| 15m | market_bars_read_ninjatrader_repair | 2073 | 1000 | 2073 | 31 | 2026-05-06T00:00:00 | 2026-06-05T16:00:00 | 0 |
| 60m | market_bars_read_ninjatrader_repair | 1432 | 1000 | 519 | 31 | 2026-05-06T00:00:00 | 2026-06-05T16:00:00 | 0 |
| 120m | market_bars_read_ninjatrader_repair | 1179 | 1000 | 271 | 31 | 2026-05-06T00:00:00 | 2026-06-05T16:00:00 | 0 |
| 240m | market_bars_read_ninjatrader_repair | 1112 | 1000 | 135 | 31 | 2026-05-06T00:00:00 | 2026-06-05T14:00:00 | 0 |

## Opening Drive Candidates
| Time | State | Direction | Entry | Stop | T1 | T2 | canExecute | Trader Confirmation | Discord Ready |
|---|---|---|---:|---:|---:|---:|---|---|---|
| 2026-06-05T09:30:00 | OPENING_OBSERVATION_ARMED | SHORT | 7556.75 | 7562.25 | 7548.5 | 7545.75 | false | true | no |
| 2026-06-05T09:35:00 | OPENING_OBSERVATION_ARMED | SHORT | 7556.75 | 7558.25 | 7554.5 | 7553.75 | false | true | no |
| 2026-06-05T09:40:00 | OPENING_OBSERVATION_ARMED | SHORT | 7556.75 | 7558.25 | 7554.5 | 7553.75 | false | true | no |
| 2026-06-05T09:45:00 | OPENING_OBSERVATION_ARMED | SHORT | 7556.75 | 7558.25 | 7554.5 | 7553.75 | false | true | no |
| 2026-06-05T09:50:00 | OPENING_OBSERVATION_ARMED | SHORT | 7533.625 | 7553 | 7504.5 | 7495 | false | true | no |
| 2026-06-05T10:00:00 | OPENING_OBSERVATION_ARMED | SHORT | 7526.25 | 7553 | 7486.25 | 7472.75 | false | true | no |
| 2026-06-05T10:05:00 | HUMAN_REVIEW_READY | SHORT | 7526.25 | 7553 | 7486.25 | 7472.75 | false | true | yes |
| 2026-06-05T10:10:00 | HUMAN_REVIEW_READY | SHORT | 7526.25 | 7553 | 7486.25 | 7472.75 | false | true | yes |
| 2026-06-05T10:20:00 | HUMAN_REVIEW_READY | LONG | 7523.625 | 7505.5 | 7550.75 | 7560 | false | true | yes |
| 2026-06-05T10:25:00 | HUMAN_REVIEW_READY | SHORT | 7526.25 | 7533.75 | 7515 | 7511.25 | false | true | yes |
| 2026-06-05T10:30:00 | HUMAN_REVIEW_READY | SHORT | 7523.375 | 7533.75 | 7507.75 | 7502.75 | false | true | yes |
| 2026-06-05T10:35:00 | HUMAN_REVIEW_READY | LONG | 7523.625 | 7505.5 | 7550.75 | 7560 | false | true | yes |
| 2026-06-05T10:40:00 | OPENING_OBSERVATION_ARMED | LONG | 7523.625 | 7505.5 | 7550.75 | 7560 | false | true | no |
| 2026-06-05T10:45:00 | HUMAN_REVIEW_READY | LONG | 7523.625 | 7508.5 | 7546.25 | 7554 | false | true | yes |
| 2026-06-05T10:50:00 | HUMAN_REVIEW_READY | LONG | 7523.625 | 7512.5 | 7540.25 | 7546 | false | true | yes |
| 2026-06-05T10:55:00 | HUMAN_REVIEW_READY | LONG | 7523.625 | 7512.5 | 7540.25 | 7546 | false | true | yes |

## Phase 5A Campaign Audit
Campaign by 10:00 ET: SHORT (sufficient, confidence 56/100, 15M aligned)
| Timeframe | MSS | MSS Direction | MSS Time | Displacement | Support L/S |
|---|---|---|---|---|---:|
| 15M | confirmed_mss | bearish | 2026-06-04T16:00:00 | bearish 2026-06-05T10:00:00 | 0/41 |
| 60M | confirmed_mss | bullish | 2026-06-05T06:00:00 | bearish 2026-06-05T10:00:00 | 25/9 |
| 120M | confirmed_mss | bullish | 2026-06-04T04:00:00 | bearish 2026-06-05T10:00:00 | 20/7 |
| 240M | confirmed_mss | bearish | 2026-06-03T10:00:00 | bearish 2026-06-05T10:00:00 | 0/34 |

## Phase 5B 5M Trigger Audit
First fresh 5M structure trigger after 10:00 ET: found at 2026-06-05T10:00:00, direction SHORT, entry 7511.5, stop 7553, risk 41.5 (extended).
First campaign-aligned human-review candidate: 2026-06-05T10:05:00, entry 7526.25, stop 7553, risk 26.75.
Lowest-risk campaign-aligned human-review candidate: 2026-06-05T10:25:00, entry 7526.25, stop 7533.75, risk 7.5.

## Authority
- Uses market_bars first, then segmented NinjaTrader historical repair.
- Uses structured OHLC only. No narrative reconstruction or screenshot fallback.
- Does not post Discord, modify bridge behavior, or approve broker execution.
