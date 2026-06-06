# Failed-Plan Reversal Phase 8 Audit

Boundary: diagnostic_replay_only_not_execution_authority

This report validates scanner/audit evidence only. It does not approve execution, place trades, or change trading rules.

## Summary
- Instrument: MES
- Dates: 2026-06-02, 2026-06-03, 2026-06-05
- Scanner audits: 4
- Approved/executable live audits: 3
- Decision tapes: 3
- Decision tape events: 67
- Failed-plan reversal events: 0
- Dates with 120M / 2H coverage in existing decision tapes: 0
- Dates missing 120M / 2H coverage in existing decision tapes: 3
- Dates requiring fresh replay/live-style regeneration: 2
- Dates with fresh bridge 120M / 2H validation: 3

## Fresh Replay Requirement
Old scanner audit files are immutable historical evidence. If they lack 120M / 2H coverage or decision-tape events, do not reinterpret them as complete. Regenerate a fresh replay/live-style audit after 120M bridge/cache support is active.
- Suggested range command: npm run diagnostic:failed-plan-reversal-phase8 -- --instrument MES --dates 2026-06-02,2026-06-03,2026-06-05 --pretty

## Date Details
| Date | Scanner Audits | Approved/Executable | Decision Tapes | Events | Failed-Plan Reversal Events | 120M Coverage | Regenerate | Warnings |
|---|---:|---:|---:|---:|---:|---|---|---|
| 2026-06-02 | 3 | 3 | 0 | 0 | 0 | missing<br>Fresh: sufficient (2000, bridge_historical_120m_refresh) | Yes - missing decision tape | 2026-06-02: no scanner decision tape files found for MES. |
| 2026-06-03 | 0 | 0 | 1 | 1 | 0 | missing<br>Fresh: sufficient (2000, bridge_historical_120m_refresh) | Yes - missing live scanner audit | 2026-06-03: no live scanner audit files found for MES. |
| 2026-06-05 | 1 | 0 | 2 | 66 | 0 | missing<br>Fresh: sufficient (2000, bridge_historical_120m_refresh) | No | none |

Authority: diagnostic only. Existing deterministic gates remain the only app-owned trade-plan authority.

