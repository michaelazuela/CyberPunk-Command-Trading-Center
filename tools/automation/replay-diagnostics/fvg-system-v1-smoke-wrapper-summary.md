# FVG Trading System v1 June/July Research Replay

Generated: 2026-08-17T03:42:44.067Z
Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Range: 2026-06-01 to 2026-06-02
Sessions: morning
Context days: 275

## Totals

- Runs attempted: 2
- Runs completed: 2
- Runs failed: 0
- Candidate traces: 6
- Eligible trades: 2
- Winners by managed/standard outcome: 1
- Stops: 1
- Net one-MES PnL from rows with outcome: $-23.75

## Month/Session Breakdown

| Month | Session | Days | Traces | Eligible | Winners | Stops | PnL/MES |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2026-06 | morning | 2 | 6 | 2 | 1 | 1 | $-23.75 |

## Eligible Trade Rows

| Date | Session | Dir | Parent FVG | Proof | Entry | Stop | T1 | T2 | Outcome | PnL/MES | Notes |
|---|---:|---:|---|---|---:|---:|---:|---:|---|---:|---|
| 2026-06-01 | morning | SHORT | 7660.25-7671.50 @ 09:30 | 12:00 | 7659.00 | 7679.25 | 7628.75 | 7618.50 | Stop | $-101.25 | valid_trace_candidate; obstacle before T1 |
| 2026-06-02 | morning | LONG | 7663.00-7664.25 @ 10:00 | 10:05 | 7669.25 | 7659.00 | 7684.75 | 7689.75 | T1 | $77.50 | valid_trace_candidate; obstacle before T1 |

## Review Queue

| Date | Session | Dir | Parent FVG | Proof | Entry | Stop | T1 | T2 | Outcome | PnL/MES | Notes |
|---|---:|---:|---|---|---:|---:|---:|---:|---|---:|---|
| 2026-06-01 | morning | SHORT | 7660.25-7671.50 @ 09:30 | 12:00 | 7659.00 | 7679.25 | 7628.75 | 7618.50 | Stop | $-101.25 | valid_trace_candidate; obstacle before T1 |
| 2026-06-02 | morning | LONG | 7663.00-7664.25 @ 10:00 | 10:05 | 7669.25 | 7659.00 | 7684.75 | 7689.75 | T1 | $77.50 | valid_trace_candidate; obstacle before T1 |

## Rule Boundary

- This is research replay only.
- No live scanner, Discord, Supabase write, NinjaTrader, or execution behavior was changed.
- Same-direction 15M parent FVG remains mandatory; 5M only confirms/executes.
