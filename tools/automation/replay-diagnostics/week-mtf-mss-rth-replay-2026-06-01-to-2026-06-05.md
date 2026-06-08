# Week Multi-Timeframe MSS RTH Replay

Instrument: MES (MES 06-26)
Window: 2026-06-01T09:30:00-04:00 to 2026-06-05T16:00:00-04:00
Preload: 2026-05-02T00:00:00-04:00 to 2026-06-05T16:00:00-04:00
Data boundary: ohlc_replay_only_not_trade_approval
Timestamp mode: eastern/close

## Data Coverage
| Timeframe | Source | Bars | Cache | Bridge | Range Start | Range End | Bridge Failures |
|---|---|---:|---:|---:|---|---|---:|
| 5M | market_bars_read_ninjatrader_repair_preferred | 6840 | 1000 | 6840 | 2026-05-03T18:05:00 | 2026-06-05T16:00:00 | 0 |
| 15M | market_bars_read_ninjatrader_repair_preferred | 2280 | 1000 | 2280 | 2026-05-03T18:15:00 | 2026-06-05T16:00:00 | 0 |
| 60M | market_bars_read_ninjatrader_repair_preferred | 570 | 1000 | 570 | 2026-05-03T19:00:00 | 2026-06-05T16:00:00 | 0 |
| 120M | market_bars_read_ninjatrader_repair_preferred | 297 | 1000 | 297 | 2026-05-03T20:00:00 | 2026-06-05T16:00:00 | 0 |
| 240M | market_bars_read_ninjatrader_repair_preferred | 148 | 1000 | 148 | 2026-05-03T22:00:00 | 2026-06-05T14:00:00 | 0 |

## Confirmed MSS Events
| Timeframe | Time | Direction | Score | Body/Range | Close Location | Range Expansion | Confidence |
|---|---|---|---:|---:|---:|---:|---:|
| 5M | 2026-06-02T09:35:00 | bullish | 67 | 0.51 | 0.69 | 1.97 | 77 |
| 5M | 2026-06-02T15:05:00 | bullish | 87 | 0.93 | 0.93 | 1.27 | 97 |
| 5M | 2026-06-02T15:45:00 | bearish | 69 | 0.56 | 1 | 0.91 | 65 |
| 5M | 2026-06-03T09:45:00 | bearish | 94 | 0.93 | 0.93 | 3.58 | 100 |
| 5M | 2026-06-03T10:15:00 | bullish | 79 | 0.9 | 0.95 | 0.51 | 65 |
| 5M | 2026-06-03T10:50:00 | bearish | 68 | 0.67 | 0.79 | 1.01 | 65 |
| 5M | 2026-06-03T13:00:00 | bullish | 79 | 0.74 | 0.94 | 1.28 | 89 |
| 5M | 2026-06-04T11:05:00 | bullish | 51 | 0.5 | 0.55 | 0.9 | 65 |
| 5M | 2026-06-04T11:45:00 | bearish | 66 | 0.61 | 0.78 | 1.12 | 65 |
| 5M | 2026-06-04T15:00:00 | bearish | 67 | 0.64 | 0.64 | 1.56 | 65 |
| 5M | 2026-06-05T09:40:00 | bearish | 78 | 0.72 | 0.72 | 2.39 | 88 |
| 5M | 2026-06-05T13:35:00 | bullish | 53 | 0.27 | 0.93 | 0.8 | 65 |
| 5M | 2026-06-05T14:05:00 | bearish | 91 | 0.91 | 0.98 | 1.57 | 100 |
| 15M | 2026-06-02T15:15:00 | bullish | 42 | 0.44 | 0.44 | 0.75 | 65 |
| 15M | 2026-06-03T15:30:00 | bearish | 45 | 0.21 | 0.71 | 1.12 | 65 |
| 15M | 2026-06-04T16:00:00 | bearish | 80 | 0.66 | 0.88 | 2.1 | 90 |
| 120M | 2026-06-01T10:00:00 | bearish | 80 | 0.74 | 0.77 | 3.43 | 90 |
| 240M | 2026-06-03T10:00:00 | bearish | 70 | 0.53 | 0.75 | 2.57 | 80 |

## Displacement Without MSS
No displacement-without-MSS events found inside the requested RTH window.

## Legacy Heuristic vs Swing-Structure Comparison
| Timeframe | Legacy Confirmed | Structural Confirmed | Delta | Legacy Disp Only | Structural Disp Only | Delta |
|---|---:|---:|---:|---:|---:|---:|
| 5M | 39 | 13 | -26 | 30 | 0 | -30 |
| 15M | 18 | 3 | -15 | 10 | 0 | -10 |
| 60M | 7 | 0 | -7 | 2 | 0 | -2 |
| 120M | 9 | 1 | -8 | 1 | 0 | -1 |
| 240M | 4 | 1 | -3 | 1 | 0 | -1 |

Structural-only confirmed MSS events are listed in the JSON report under `legacyHeuristicComparison[].structuralOnlyConfirmedMss`.
Legacy-only confirmed MSS events are listed in the JSON report under `legacyHeuristicComparison[].legacyOnlyConfirmedMss`.

## Active Rule Acceptance Review
Status: accepted_for_active_ruleset
Active-rule impact accepted: Yes
Legacy-only intentional demotions: 68
Structural-only accepted promotions: 9
Unresolved structural-only review events: 0

| Timeframe | Legacy-Only Intentional Demotions | Structural-Only Accepted Promotions | Unresolved Review Events |
|---|---:|---:|---:|
| 5M | 33 | 7 | 0 |
| 15M | 17 | 2 | 0 |
| 60M | 7 | 0 | 0 |
| 120M | 8 | 0 | 0 |
| 240M | 3 | 0 | 0 |

Review basis: legacy-only events are accepted as intentional demotions because they did not meet completed swing-structure MSS. Structural-only events are accepted only when the explicit structureBreak audit proves a completed close-through MSS against opposite prior swing structure.

## Authority
- OHLC-derived evidence only.
- No screenshot or narrative reconstruction was used.
- This replay does not approve trades, change scanner behavior, post to Discord, or place orders.
