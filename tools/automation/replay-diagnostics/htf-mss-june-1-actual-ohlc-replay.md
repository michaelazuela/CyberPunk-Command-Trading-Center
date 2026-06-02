# HTF/MSS June 1 Actual OHLC Replay

Boundary: actual_ohlc_replay_only_not_execution_authority

This report uses historical OHLC replay data only. It does not post to Discord, place orders, or bypass app-owned final gates.

## Data
- Instrument: MES
- Date: 2026-06-01
- Data Source: ninjatrader_historical_bars
- Source Path: N/A
- Timezone: America/New_York
- Timezone Assumption: Historical replay classifies scan windows using America/New_York wall-clock time. Timestamps with offsets are preserved; offset-free timestamps are treated as ET with warnings.
- Bars: 5M=43, 15M=86, 60M=62, 240M=33
- Ranges: 5M=2026-06-01T12:00:00.0000000 to 2026-06-01T15:30:00.0000000; 15M=2026-05-31T18:15:00.0000000 to 2026-06-01T15:30:00.0000000; 60M=2026-05-28T00:00:00.0000000 to 2026-06-01T15:00:00.0000000; 240M=2026-05-25T02:00:00.0000000 to 2026-06-01T14:00:00.0000000

## HTF Context Sufficiency
- Status: sufficient
- Reliability: structural
- HTF Usage: structural confirmation allowed
- Candidate Promotion: allowed only when approved pathway conditions and deterministic gates are satisfied
| Timeframe | Bars Loaded | Range | Minimum Expected | Status |
|---|---:|---|---|---|
| 4H | 33 | 2026-05-25T02:00:00.0000000 to 2026-06-01T14:00:00.0000000 | At least 7 completed trading days, preferably 20+ completed 4H candles when available. | sufficient |
| 1H | 62 | 2026-05-28T00:00:00.0000000 to 2026-06-01T15:00:00.0000000 | At least 4 completed trading days of structured 1H context. | sufficient |
| 15M | 86 | 2026-05-31T18:15:00.0000000 to 2026-06-01T15:30:00.0000000 | At least 2 completed trading days, or enough bars to include ETH, London, NY premarket, current RTH, and prior session liquidity. | sufficient |
| 5M | 42 | 2026-06-01T12:00:00.0000000 to 2026-06-01T15:25:00.0000000 | Active execution window plus enough bars for the current trigger sequence; minimum 12 valid completed 5M bars. | sufficient |

### Data-Limited Blockers
- none

- Classification Reason: Sell-side/buy-side raid/reclaim and 5M MSS detected with sufficient HTF context. Candidate status still depends on deterministic gates.
- Data Limited: false

## HTF/MSS Classification
- Classification: REVERSAL_DELIVERY_PLAN_CANDIDATE
- Plan Direction: LONG
- Raid State: sell_side_raid
- 5M Confirmed: true
- 5M Confirmation Type: swing_break_with_displacement
- Post-Shift State: continuation_pending
- External Liquidity Target: Current Imported Window High 7628.25

## Timeframe Stack
| Timeframe | Direction | Status | Lifecycle | Confidence |
|---|---|---|---|---:|
| 4H | neutral | conflicting | conflicting_mss | 35 |
| 1H | neutral | conflicting | conflicting_mss | 35 |
| 15M | bullish | potential_mss | potential_mss | 62 |
| 5M | bullish | confirmed | confirmed_mss | 92 |

## Candidate And Final Gates
- Candidate Detected: Yes
- Setup Type: HtfDrawContinuationAfterRaid
- Direction: LONG
- Final Gate Status: ConditionalTrade
- canExecute: false
- Entry: 7625.5
- Stop: 7622.5
- T1/T2: 7632.75 / 7640
- NoTrade Reason: None

## Safety
- Candidate status does not equal executable approval.
- ApprovedTrade appears only after deterministic final gates pass.
- External liquidity remains draw/management context.
- T1/T2 remain app-computed R targets.
- No live Discord post was sent.
- No broker execution was introduced.
