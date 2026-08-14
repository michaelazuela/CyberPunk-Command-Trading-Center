# Jan 21 FVG Rule Lock

Boundary: research_only_no_live_scanner_discord_supabase_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-21 / full-rth

Canonical research contract: fvg-research-rule-contract-v1
Contract path: tools/automation/replay-diagnostics/fvg-research-rule-contract-v1.md
Contract binding: 15M FVG Hold + Nested 5M FVG Defense Continuation
Runtime boundary: research only; no live scanner, Discord, Supabase, NinjaTrader, or execution change.

## Rule-Based Verdict

Trade 1 is valid under the FairValueGapResearchModel workflow because it entered into a valid 15M parent FVG and then used a tiny nested 5M FVG / wick-defense area for execution proof.

## Locked Trade 1

- Direction: LONG
- 15M parent FVG: 6944.75-6957.50
- Parent created: 2026-01-21T09:30:00
- Rule classification: 15M FVG Hold + Nested 5M FVG Defense Continuation
- 5M proof area: tiny nested 5M FVG / wick-defense area near 6957.00 inside the valid 15M parent FVG
- Proof time: around 2026-01-21T12:20:00 to 2026-01-21T12:30:00
- Entry reference: 6962.25
- Protected 5M stop: 6930.50
- T1: 7010.00
- T2: 7025.75
- First concern / objective: 6988.75
- Tool liquidity correction: 6978.50 should not be treated as first meaningful liquidity for this review.
- Outcome: T1 and T2 would have hit.

## Concrete Rule

Name: 15M FVG Hold + Nested 5M FVG Defense Continuation

Definition: Price returns into a valid 15M parent FVG. Inside that parent FVG, a nested 5M FVG or 5M wick-defense area forms or is defended. A completed 5M candle must defend that nested area and continue in the parent direction. Entry is based on the completed 5M proof, stop is the nearest protected 5M structure, and T1/T2 are calculated from actual entry-to-stop risk.

Required facts:
- Valid 15M parent FVG exists.
- Price returns into the 15M parent FVG.
- Nested/aligned 5M FVG or 5M wick-defense area exists inside the parent zone.
- Completed 5M candle defends the nested area.
- Entry, nearest protected 5M stop, T1, and T2 are known.
- Target room remains after the proof.

Invalidation:
- No valid 15M parent FVG.
- 5M proof occurs outside the parent FVG context.
- Price accepts through the FVG against the trade before proof.
- No protected 5M stop.
- T1/T2 already reached before proof.

## Jan 21 Application

- The 15M parent FVG was created at 9:30.
- Price returned into the parent zone.
- The nested 5M proof is tiny but present near the 6957 area.
- The long had room through the first concern at 6988.75 and into T1/T2.
- This is not one of the late long rows from the raw eligible output.

## Lessons Locked

- Tiny nested 5M FVGs are part of the rule when they sit inside a valid 15M parent FVG and the completed 5M candle defends the area.
- The model must not over-promote later same-direction rows when the earlier valid FVG campaign already exists.
- First meaningful concern/liquidity must be visually checked; the raw 6978.50 label was not accepted here.
- For this day, the clean review focus is the 9:30 parent / 12:20-12:30 proof long, not the two late eligible longs.
