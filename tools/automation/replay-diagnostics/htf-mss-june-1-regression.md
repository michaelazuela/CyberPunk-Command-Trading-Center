# HTF/MSS June 1 Regression Replay

Boundary: diagnostic_replay_only_not_execution_authority

This focused replay is a local regression diagnostic. It does not introduce broker execution, does not change trading rules, and does not bypass app-owned final gates.

## Replay Scope
- Instrument: MES
- Date: 2026-06-01
- Window: 13:25-14:15 America/New_York
- Data source: new_focused_fixture
- Active Scan Window: LUNCH_PM_SETUP_SCAN

## HTF/MSS Classification
- Classification: REVERSAL_DELIVERY_PLAN_CANDIDATE
- Plan Direction: LONG
- Draw Direction: buy_side
- Macro Context: bullish
- Raid State: sell_side_raid
- Reclaim Status: confirmed
- 15M Status: potential_mss
- 5M Confirmed: true
- 5M Confirmation Type: swing_break_with_displacement
- Post-Shift State: post_mss_digestion
- External Liquidity Target: prior RTH high / London high / full ETH high 7611.75, 7622.50, 7632.75
- Confidence: 100

## Timeframe Stack
| Timeframe | Direction | Status | Lifecycle | Confidence |
|---|---|---|---|---:|
| 4H | bullish | potential_mss | potential_mss | 62 |
| 1H | bullish | potential_mss | potential_mss | 62 |
| 15M | bullish | potential_mss | potential_mss | 62 |
| 5M | bullish | confirmed | post_mss_digestion | 86 |

## Setup Candidate Result
- Candidate Detected: Yes
- Setup Type: HtfDrawContinuationAfterRaid
- Label: HTF Draw Continuation After Raid/Reclaim
- Direction: LONG
- Not Bearish Continuation: Yes

## Final Gate Result
- Candidate-only Status: NoTrade
- Candidate-only canExecute: false
- Candidate-only Entry: Not defined
- Candidate-only Stop: Not defined
- Full Deterministic Gates Status: NoTrade
- Full Deterministic Gates canExecute: false
- Full Gate Targets: T1 N/A / T2 N/A
- RiskTooWide Status: NoTrade
- RiskTooWide Reason: RiskTooWide

## Diagnostic Replay
- Final Classification: D_NO_VALID_SETUP
- htfMssDiagnostics Present: Yes
- Diagnostic Approves Trade: false
- Diagnostic Changes Rules: false

## Safety
- Candidate status does not equal execution approval.
- ApprovedTrade does not appear in this regression shell; existing deterministic pipeline tests cover approval only after full gates pass.
- External liquidity remains draw/management context.
- T1/T2 remain app-computed R targets.
- No live Discord post was sent.
- No broker execution was introduced.
