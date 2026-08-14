# Jan 16 Human Review Lock

Boundary: research only. No live scanner, Discord, Supabase, NinjaTrader, or trading-rule change.

Instrument: MES 09-26
Date/session: 2026-01-16 / full RTH

Canonical research contract: fvg-research-rule-contract-v1
Contract path: tools/automation/replay-diagnostics/fvg-research-rule-contract-v1.md
Contract binding: 15M FVG Failure / Breakdown Continuation; valid Trade 1 only
Runtime boundary: research only; no live scanner, Discord, Supabase, NinjaTrader, or execution change.

## Locked Review

Trade 1 is valid.

- Side: SHORT
- 15M parent FVG/rejection area: yellow-box zone around 7100-7103
- Tool parent FVG: 7100.50-7103.00, created 2026-01-16T10:15:00
- Proof time: 2026-01-16T12:00:00
- Entry: 7099.75
- Protected 5M stop: 7114.75
- Risk: 15.00 pts
- T1: 7077.25
- T2: 7069.75
- First meaningful liquidity from tool: 7088.00, reached 2026-01-16T16:00:00
- Outcome: session close +$52.50 / MES
- Managed outcome: LQ1 +$58.75 / MES

## Human Correction

Trades 2 and 3 from the raw diagnostic are rejected from this model review set.

Reason: they do not have valid 15M parent FVG support under the locked FairValueGapResearchModel workflow. A standalone or late 5M-looking idea is not enough.

## Rule Reinforced

The FairValueGapResearchModel requires:

- HTF map as context only
- valid 15M displacement/FVG parent
- return into that 15M parent or aligned nested 5M FVG
- completed 5M wick-defense/proof
- nearest protected 5M structure stop
- T1/T2 from actual entry-to-stop risk

If the 15M parent is not valid, the row is rejected or moved to a separate future research idea. It does not stay in the current FVG model review set.
