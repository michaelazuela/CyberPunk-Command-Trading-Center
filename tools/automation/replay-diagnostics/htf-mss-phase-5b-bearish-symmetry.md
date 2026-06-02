# HTF/MSS Phase 5B Bearish Symmetry Replay

Boundary: diagnostic_replay_only_not_execution_authority

This focused replay is local diagnostic coverage only. It does not post to Discord, place orders, or bypass app-owned final gates.

## Replay Scope
- Instrument: MES
- Date: 2026-06-02
- Window: 13:25-14:10 America/New_York
- Data source: new_focused_fixture
- Active Scan Window: LUNCH_PM_SETUP_SCAN

## HTF/MSS Classification
- Classification: REVERSAL_DELIVERY_PLAN_CANDIDATE
- Plan Direction: SHORT
- Draw Direction: sell_side
- Macro Context: bearish
- Raid State: buy_side_raid
- Reclaim Status: confirmed
- 15M Status: potential_mss
- 5M Confirmed: true
- 5M Confirmation Type: swing_break_with_displacement
- Post-Shift State: post_mss_digestion
- External Liquidity Target: prior RTH low / London low / full ETH low 7580.00, 7576.00
- Confidence: 100

## Timeframe Stack
| Timeframe | Direction | Status | Lifecycle | Confidence |
|---|---|---|---|---:|
| 4H | bearish | potential_mss | potential_mss | 62 |
| 1H | bearish | potential_mss | potential_mss | 62 |
| 15M | bearish | potential_mss | potential_mss | 62 |
| 5M | bearish | confirmed | post_mss_digestion | 86 |

## Setup Candidate Result
- Candidate Detected: Yes
- Setup Type: HtfDrawContinuationAfterRaid
- Label: HTF Draw Continuation After Raid/Reclaim
- Direction: SHORT
- Not Bullish Continuation: Yes
- Candidate-only canExecute: false
- Candidate-only Status: NoTrade

## Diagnostic Replay
- Final Classification: D_NO_VALID_SETUP
- htfMssDiagnostics Present: Yes
- Diagnostic Approves Trade: false

## Safety
- Candidate status does not equal execution approval.
- External liquidity remains draw/management context.
- T1/T2 remain app-computed R targets.
- No live Discord post was sent.
- No broker execution was introduced.
