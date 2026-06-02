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
- Bars: 5M=43, 15M=63, 60M=16, 240M=4

## HTF/MSS Classification
- Classification: NO_QUALIFIED_STATE
- Plan Direction: LONG
- Raid State: sell_side_raid
- 5M Confirmed: true
- 5M Confirmation Type: swing_break_with_displacement
- Post-Shift State: continuation_pending
- External Liquidity Target: Current Imported Window High 7628.25

## Timeframe Stack
| Timeframe | Direction | Status | Lifecycle | Confidence |
|---|---|---|---|---:|
| 4H | unknown | unknown | unknown | 0 |
| 1H | bearish | failed | failed_mss | 24 |
| 15M | bearish | failed | failed_mss | 24 |
| 5M | bullish | confirmed | confirmed_mss | 92 |

## Candidate And Final Gates
- Candidate Detected: No
- Setup Type: HtfDrawContinuationAfterRaid
- Direction: NO TRADE
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
