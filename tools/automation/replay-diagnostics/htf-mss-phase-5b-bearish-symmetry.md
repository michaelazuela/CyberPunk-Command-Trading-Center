# HTF/MSS Phase 5B Bearish Symmetry Replay

Boundary: diagnostic_replay_only_not_execution_authority

This focused replay is local diagnostic coverage only. It does not post to Discord, place orders, or bypass app-owned final gates.

## Replay Scope
- Instrument: MES
- Date: 2026-06-02
- Window: 13:25-14:10 America/New_York
- Data source: new_focused_fixture
- Active Scan Window: LUNCH_PM_SETUP_SCAN

## HTF Context Sufficiency
- Status: sufficient
- Reliability: structural
- HTF Usage: structural confirmation allowed
- Candidate Promotion: allowed only when approved pathway conditions and deterministic gates are satisfied
| Timeframe | Bars Loaded | Range | Minimum Expected | Status |
|---|---:|---|---|---|
| 4H | 20 | 2026-05-25T04:00:00.000Z to 2026-06-02T14:00:00-04:00 | At least 7 completed trading days, preferably 20+ completed 4H candles when available. | sufficient |
| 1H | 24 | 2026-05-25T04:00:00.000Z to 2026-06-02T13:00:00-04:00 | At least 4 completed trading days of structured 1H context. | sufficient |
| 15M | 40 | 2026-05-25T04:00:00.000Z to 2026-06-02T13:15:00-04:00 | At least 2 completed trading days, or enough bars to include ETH, London, NY premarket, current RTH, and prior session liquidity. | sufficient |
| 5M | 10 | 2026-06-02T13:25:00-04:00 to 2026-06-02T14:10:00-04:00 | Active execution window plus enough bars for the current trigger sequence; minimum 12 valid completed 5M bars. | sufficient |

### Data-Limited Blockers
- none

- Classification Reason: Sell-side/buy-side raid/reclaim and 5M MSS detected with sufficient HTF context. Candidate status still depends on deterministic gates.

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
| 4H | neutral | conflicting | conflicting_mss | 35 |
| 1H | neutral | conflicting | conflicting_mss | 35 |
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
