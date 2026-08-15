# FVG Research Evidence Index v1

Boundary: research_only_no_live_scanner_discord_supabase_ninjatrader_change

This index keeps the current FVG research package portable. Use this file to find
the rule contract, guardrails, readable proof artifacts, and archived raw replay
details without mixing this research lane into older model logic.

## Source Of Truth

- `tools/automation/replay-diagnostics/fvg-research-guardrails-v1.md`
  - Portable FVG research guardrails.
  - Requires HTF/15M story first, then 5M execution proof.
  - Defines FVG defended, balanced path, objective ladder, and drift blockers.
- `tools/automation/replay-diagnostics/fvg-research-rule-contract-v1.md`
  - Human-readable rule contract.
  - Locks concrete model language for current FVG research.
- `tools/automation/replay-diagnostics/fvg-research-rule-contract-v1.json`
  - Machine-readable version of the same research contract.

## Committed Readable Evidence

- `tools/automation/replay-diagnostics/fvg-jan16-full-rth-review-v1.md`
  - Jan 16 review package.
  - Human correction: only the short tied to the valid 15M parent FVG remains
    usable; extra long/short rows without supporting 15M parent FVG are rejected.
- `tools/automation/replay-diagnostics/fvg-jan20-full-rth-preview-v1.md`
  - Jan 20 preview package.
  - Human correction: Trade 4 is valid as a rule-based FVG failure/continuation
    short. The parent FVG is the 12:45 15M zone around 6983-6991; the 13:00
    long-wick bearish candle is continuation/acceptance through that already
    created parent, not the parent creation candle.
  - Human correction: Trade 6 is management continuation short, not a fresh
    standalone primary trade. The 13:45 candle is the impulse leg, the 14:00
    15M candle confirms the parent FVG, and the older Dec 19 02:15/02:30 15M
    LONG FVG area around 6940.25-6949.00 defended before full tactical delivery.
- `tools/automation/replay-diagnostics/fvg-jan21-full-rth-preview-v1.md`
  - Jan 21 preview package.
  - Human correction: valid trade is the 9:30 15M parent FVG long with tiny
    nested 5M FVG/wick-defense around 6957. Tool liquidity label at 6978.50 is
    rejected; first meaningful concern/objective is 6988.75.
- `tools/automation/replay-diagnostics/fvg-jan22-full-rth-preview-v1.md`
  - Jan 22 preview package.
  - Human correction: late shorts are invalid when the market is already in an
    uptrend and the final/lowest 15M bullish FVG stack defends. This binds to
    `15M FVG Stack Defense Continuation`.

## Archived Raw Replay JSON

Raw per-candle replay detail was moved out of the repo to keep the worktree
clean while preserving the evidence.

Archive path:

`C:\Users\Mike\Documents\FuturesCrusher_FVG_RawArchive\20260814_cleanup_01`

Archived files:

- `fvg-jan16-full-rth-review-v1.json`
- `fvg-jan20-full-rth-preview-v1.json`
- `fvg-jan21-full-rth-preview-v1.json`
- `fvg-jan22-full-rth-preview-v1.json`

Use the raw JSON only for deep per-candle inspection. The portable research
source of truth is the guardrail file, rule contract, compact JSON contract, and
readable Markdown proof packages listed above.

## Current Workflow Reminder

1. Build the HTF/15M story first.
2. Confirm the 15M parent FVG and displacement.
3. Drill into 5M for return, wick defense, proof, entry, and nearest protected
   5M structure stop.
4. Build T1/T2 from actual entry-stop risk.
5. Separate real liquidity from FVG objectives or obstacles.
6. Use balanced-path context only after a valid 15M parent plus completed 5M
   proof exists.
7. Reject rows that skip the story-first workflow, invent liquidity from FVGs,
   or promote late duplicate same-parent entries as fresh trades.
