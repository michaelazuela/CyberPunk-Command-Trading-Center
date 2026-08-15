# Jan 28 Invalid Parent Lock v1

Boundary: research_only_no_live_scanner_discord_supabase_or_trading_rule_change
Date: 2026-01-28
Session: lunch
Correction: invalid_parent_15m_fvg_not_confirmed

## Invalidated Raw Candidate

- Side: LONG
- Claimed parent: 2026-01-28T11:45:00
- Claimed zone: 7116.75-7119.25
- Claimed 5M proof: 2026-01-28T12:20:00
- Prior research entry/stop: 7120.50 / 7109.75
- Prior outcome: stop, -$53.75 / MES

## Human Chart Correction

The 11:45 15M area is not a valid same-direction LONG parent FVG for this model. The tool was not allowed to convert an opposite-side or same-zone read into a LONG defended-first continuation.

## Regression Guard

Defended-first continuation precedence is a timing rule only after a real same-direction 15M parent/battle-zone FVG exists. It may not flip a SHORT parent into LONG, flip LONG into SHORT, or promote a 5M row by itself.

## Required Future Behavior

- If no same-direction 15M parent FVG exists, output `invalid_parent_15m_fvg_not_confirmed`.
- 5M proof can confirm only the already-valid 15M parent story.
- Later same-zone failure/reversal is reviewed only after same-direction parent validity is proven.
