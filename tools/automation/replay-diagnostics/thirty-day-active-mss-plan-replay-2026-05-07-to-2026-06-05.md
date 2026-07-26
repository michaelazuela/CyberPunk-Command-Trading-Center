# Thirty-Day Active MSS Plan Replay

Instrument: MES (MES 06-26)
Evaluation window: 2026-05-07 to 2026-06-05
Preload: 2026-04-07T00:00:00-04:00 to 2026-06-05T16:00:00-04:00
Boundary: ohlc_replay_existing_live_rules_only_not_execution_authority

## Summary
- Active-window completed 5M bars loaded: 1423
- Structural 5M MSS events found: 71
- Completed 5M bars evaluated around MSS: 1423
- Final ApprovedTrade + effective canExecute: 78
- Scanner executable candidates before final gates: 2
- Conditional candidates observed: 1423
- Active MSS blocked executable candidates: 28

## Data Coverage
| Timeframe | Source | Bars | Cache | Bridge | Range Start | Range End | Bridge Failures |
|---|---|---:|---:|---:|---|---|---:|
| 5m | market_bars_read_ninjatrader_repair_preferred | 12013 | 1000 | 12013 | 2026-04-07T00:00:00 | 2026-06-05T16:00:00 | 0 |
| 15m | market_bars_read_ninjatrader_repair_preferred | 4005 | 1000 | 4005 | 2026-04-07T00:00:00 | 2026-06-05T16:00:00 | 0 |
| 60m | market_bars_read_ninjatrader_repair_preferred | 1002 | 1000 | 1002 | 2026-04-07T00:00:00 | 2026-06-05T16:00:00 | 0 |
| 120m | market_bars_read_ninjatrader_repair_preferred | 523 | 1000 | 523 | 2026-04-07T00:00:00 | 2026-06-05T16:00:00 | 0 |
| 240m | market_bars_read_ninjatrader_repair_preferred | 261 | 1000 | 261 | 2026-04-07T02:00:00 | 2026-06-05T14:00:00 | 0 |

## Triggered Plans
| Time | Session | Setup | Direction | Entry | Stop | T1 | T2 | canExecute |
|---|---|---|---|---:|---:|---:|---:|---|
| 2026-05-07T10:15:00 | replay_morning | ArchivedSetupPath | LONG | 7395.5 | 7392.5 | 7402.25 | 7403 | true |
| 2026-05-11T10:00:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7420 | 7420 | true |
| 2026-05-11T10:05:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7420 | 7420 | true |
| 2026-05-11T10:10:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7420 | 7420 | true |
| 2026-05-11T10:15:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7420 | 7420 | true |
| 2026-05-11T10:20:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7420 | 7420 | true |
| 2026-05-11T10:25:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7420 | 7420 | true |
| 2026-05-11T10:30:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7420 | 7420 | true |
| 2026-05-11T10:35:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7418 | 7420 | true |
| 2026-05-11T10:40:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7418 | 7420 | true |
| 2026-05-11T10:45:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7418 | 7420 | true |
| 2026-05-11T10:50:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7418 | 7420 | true |
| 2026-05-11T10:55:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7418 | 7420 | true |
| 2026-05-11T11:00:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7418 | 7420 | true |
| 2026-05-11T11:05:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7418 | 7420 | true |
| 2026-05-11T11:10:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7418 | 7420 | true |
| 2026-05-11T11:15:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7418 | 7420 | true |
| 2026-05-11T11:20:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7418 | 7420 | true |
| 2026-05-11T11:25:00 | replay_morning | ArchivedSetupPath | LONG | 7411.25 | 7408 | 7418 | 7420 | true |
| 2026-05-12T10:20:00 | replay_morning | ArchivedSetupPath | LONG | 7404 | 7399 | 7414 | 7420 | true |
| 2026-05-12T10:25:00 | replay_morning | ArchivedSetupPath | LONG | 7404 | 7399 | 7414 | 7420 | true |
| 2026-05-13T10:00:00 | replay_morning | ArchivedSetupPath | SHORT | 7431.5 | 7432.5 | 7428.5 | 7428.5 | true |
| 2026-05-13T10:05:00 | replay_morning | ArchivedSetupPath | LONG | 7413.25 | 7409.25 | 7422.75 | 7428.5 | true |
| 2026-05-13T10:10:00 | replay_morning | ArchivedSetupPath | LONG | 7413.25 | 7409.25 | 7422.75 | 7428.5 | true |
| 2026-05-13T10:15:00 | replay_morning | ArchivedSetupPath | LONG | 7413.25 | 7409.25 | 7421.25 | 7428.5 | true |
| 2026-05-13T10:20:00 | replay_morning | ArchivedSetupPath | SHORT | 7417.5 | 7422.5 | 7399 | 7399 | true |
| 2026-05-19T10:10:00 | replay_morning | ArchivedSetupPath | SHORT | 7400 | 7405 | 7384 | 7384 | true |
| 2026-05-19T10:15:00 | replay_morning | ArchivedSetupPath | SHORT | 7400 | 7405 | 7384 | 7384 | true |
| 2026-05-19T10:20:00 | replay_morning | ArchivedSetupPath | SHORT | 7400 | 7405 | 7384 | 7384 | true |
| 2026-05-19T10:25:00 | replay_morning | ArchivedSetupPath | SHORT | 7400 | 7405 | 7384 | 7384 | true |
| 2026-05-19T10:30:00 | replay_morning | ArchivedSetupPath | SHORT | 7400 | 7405 | 7384 | 7384 | true |
| 2026-05-19T10:35:00 | replay_morning | ArchivedSetupPath | SHORT | 7400 | 7405 | 7384 | 7384 | true |
| 2026-05-19T10:40:00 | replay_morning | ArchivedSetupPath | SHORT | 7400 | 7405 | 7384 | 7384 | true |
| 2026-05-19T10:45:00 | replay_morning | ArchivedSetupPath | SHORT | 7400 | 7405 | 7384 | 7384 | true |
| 2026-05-19T10:50:00 | replay_morning | ArchivedSetupPath | SHORT | 7400 | 7405 | 7384 | 7384 | true |
| 2026-05-19T10:55:00 | replay_morning | ArchivedSetupPath | SHORT | 7400 | 7405 | 7384 | 7384 | true |
| 2026-05-19T11:00:00 | replay_morning | ArchivedSetupPath | SHORT | 7400 | 7405 | 7384 | 7384 | true |
| 2026-05-20T15:05:00 | replay_lunch | ArchivedSetupPath | LONG | 7440.75 | 7437.25 | 7446 | 7450 | true |
| 2026-05-20T15:10:00 | replay_lunch | ArchivedSetupPath | LONG | 7440.75 | 7436.75 | 7446.75 | 7450 | true |
| 2026-05-25T10:10:00 | replay_morning | ArchivedSetupPath | SHORT | 7563.25 | 7565.5 | 7558.5 | 7557.5 | true |
| 2026-05-25T10:15:00 | replay_morning | ArchivedSetupPath | SHORT | 7563.25 | 7565.5 | 7558.5 | 7557.5 | true |
| 2026-05-25T10:20:00 | replay_morning | ArchivedSetupPath | LONG | 7559.25 | 7557.75 | 7565 | 7565 | true |
| 2026-05-25T10:25:00 | replay_morning | ArchivedSetupPath | LONG | 7559.25 | 7557.75 | 7565 | 7565 | true |
| 2026-05-25T10:30:00 | replay_morning | ArchivedSetupPath | LONG | 7559.25 | 7557.75 | 7565 | 7565 | true |
| 2026-05-25T10:35:00 | replay_morning | ArchivedSetupPath | SHORT | 7563.25 | 7565.5 | 7558.5 | 7557.5 | true |
| 2026-05-25T10:40:00 | replay_morning | ArchivedSetupPath | SHORT | 7563.25 | 7565.5 | 7558.5 | 7557.5 | true |
| 2026-05-25T10:45:00 | replay_morning | ArchivedSetupPath | SHORT | 7563.25 | 7565.5 | 7558.5 | 7557.5 | true |
| 2026-05-25T10:50:00 | replay_morning | ArchivedSetupPath | SHORT | 7563.25 | 7565.5 | 7558.5 | 7557.5 | true |
| 2026-05-25T10:55:00 | replay_morning | ArchivedSetupPath | SHORT | 7563.25 | 7565.5 | 7558.5 | 7557.5 | true |
| 2026-05-25T11:00:00 | replay_morning | ArchivedSetupPath | SHORT | 7563.25 | 7565.5 | 7558.5 | 7557.5 | true |
| 2026-05-25T11:05:00 | replay_morning | ArchivedSetupPath | SHORT | 7563.25 | 7565.5 | 7558.5 | 7557.5 | true |
| 2026-05-25T11:10:00 | replay_morning | ArchivedSetupPath | SHORT | 7563.25 | 7565.5 | 7558.5 | 7557.5 | true |
| 2026-05-25T11:20:00 | replay_morning | ArchivedSetupPath | LONG | 7559.25 | 7557.75 | 7565 | 7565 | true |
| 2026-05-25T11:25:00 | replay_morning | ArchivedSetupPath | LONG | 7559.25 | 7557.75 | 7565 | 7565 | true |
| 2026-05-25T11:30:00 | replay_morning | ArchivedSetupPath | LONG | 7559.25 | 7557.75 | 7565 | 7565 | true |
| 2026-05-25T11:35:00 | replay_morning | ArchivedSetupPath | SHORT | 7563.25 | 7565.5 | 7558.5 | 7557.5 | true |
| 2026-05-25T11:40:00 | replay_morning | ArchivedSetupPath | LONG | 7559.25 | 7557.75 | 7565 | 7565 | true |
| 2026-05-25T11:45:00 | replay_morning | ArchivedSetupPath | SHORT | 7563.25 | 7565.5 | 7558.5 | 7557.5 | true |
| 2026-05-25T11:50:00 | replay_morning | ArchivedSetupPath | LONG | 7559.25 | 7557.75 | 7565 | 7565 | true |
| 2026-05-25T11:55:00 | replay_morning | ArchivedSetupPath | LONG | 7559.25 | 7557.75 | 7565 | 7565 | true |
| 2026-05-26T11:20:00 | replay_morning | ArchivedSetupPath | SHORT | 7551.25 | 7555.5 | 7538.75 | 7538.75 | true |
| 2026-05-26T11:25:00 | replay_morning | ArchivedSetupPath | SHORT | 7551.25 | 7555.5 | 7539 | 7539 | true |
| 2026-05-26T11:30:00 | replay_morning | ArchivedSetupPath | SHORT | 7551.25 | 7555.5 | 7538.75 | 7538.75 | true |
| 2026-05-26T11:35:00 | replay_morning | ArchivedSetupPath | SHORT | 7551.25 | 7555.5 | 7538.75 | 7538.75 | true |
| 2026-05-27T10:20:00 | replay_morning | ArchivedSetupPath | LONG | 7542.25 | 7539 | 7548.75 | 7551.5 | true |
| 2026-05-27T10:30:00 | replay_morning | ArchivedSetupPath | LONG | 7533.5 | 7528.5 | 7547.25 | 7547.25 | true |
| 2026-05-28T10:00:00 | replay_morning | ArchivedSetupPath | LONG | 7518.75 | 7516.5 | 7527.25 | 7527.25 | true |
| 2026-05-28T10:05:00 | replay_morning | ArchivedSetupPath | LONG | 7518.75 | 7516.5 | 7527.25 | 7527.25 | true |
| 2026-05-28T10:10:00 | replay_morning | ArchivedSetupPath | LONG | 7518.75 | 7516.5 | 7527.25 | 7527.25 | true |
| 2026-05-28T10:15:00 | replay_morning | ArchivedSetupPath | LONG | 7518.75 | 7516.5 | 7527.5 | 7527.5 | true |
| 2026-05-28T10:20:00 | replay_morning | ArchivedSetupPath | LONG | 7518.75 | 7516.5 | 7527.25 | 7527.25 | true |
| 2026-05-28T10:30:00 | replay_morning | ArchivedSetupPath | LONG | 7518.75 | 7516.5 | 7527.25 | 7527.25 | true |
| 2026-05-28T10:35:00 | replay_morning | ArchivedSetupPath | LONG | 7518.75 | 7516.5 | 7527.25 | 7527.25 | true |
| 2026-06-02T10:05:00 | replay_morning | ArchivedSetupPath | LONG | 7597.25 | 7594.75 | 7602.75 | 7603.5 | true |
| 2026-06-02T10:10:00 | replay_morning | ArchivedSetupPath | LONG | 7597.25 | 7594.75 | 7602.75 | 7603.5 | true |
| 2026-06-02T10:15:00 | replay_morning | ArchivedSetupPath | LONG | 7597.25 | 7594.75 | 7602.75 | 7603.5 | true |
| 2026-06-02T10:20:00 | replay_morning | ArchivedSetupPath | LONG | 7597.25 | 7594.75 | 7602.75 | 7603.5 | true |
| 2026-06-02T10:25:00 | replay_morning | ArchivedSetupPath | SHORT | 7608 | 7612.75 | 7593.75 | 7593.75 | true |

## Scanner Executable Candidates Before Final Gates
| Time | Session | Setup | Direction | Entry | Stop | T1 | T2 | Final Status | canExecute | Active MSS |
|---|---|---|---|---:|---:|---:|---:|---|---|---|
| 2026-05-20T15:05:00 | replay_lunch | ArchivedSetupPath | LONG | 7440.75 | 7437.25 | 7446 | 7450 | ApprovedTrade | true | passed |
| 2026-05-20T15:10:00 | replay_lunch | ArchivedSetupPath | LONG | 7440.75 | 7436.75 | 7446.75 | 7450 | ApprovedTrade | true | passed |

## Authority
- Uses OHLC-derived replay context only.
- Uses existing setup scanner and final trade decision pipeline.
- No narrative reconstruction, screenshot fallback, Discord post, bridge behavior change, or broker execution.
