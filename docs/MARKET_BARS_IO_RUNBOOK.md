# market_bars IO Runbook

`market_bars` is a rolling operational OHLC cache for NinjaTrader-derived bars. It is not a permanent research archive.

## Retention Rule

Keep the latest 30 ET calendar dates, including today.

Examples:

- On June 30, keep June 1 through June 30 and delete older rows.
- On July 1, keep June 2 through July 1 and delete June 1 and older rows.

Retention applies only to `market_bars` rows for `5m`, `15m`, `60m`, `120m`, and `240m`.

Do not use this workflow to delete trades, RAG records, research records, Discord audits, decision tapes, receipts, learning records, chart artifacts, screenshots, or local generated files.

## Commands

Read-only audit:

```bash
npm run market-bars:audit
```

Dry-run retention:

```bash
npm run market-bars:retention:dry-run
```

Apply retention:

```bash
npm run market-bars:retention:apply
```

The tool writes receipts under `tools/automation/diagnostic-reports/`. Receipts include cutoff, dry-run/apply status, rows selected/deleted, timeframe counts, errors, risk status, and the boundary statement that this is market-data cache hardening only.

## Disk IO Warning Response

When Supabase reports Disk IO pressure:

1. Run the read-only audit.
2. Run retention dry-run.
3. Review receipt counts and errors.
4. Apply retention only when the dry-run is sane.
5. Confirm recorder/scanner health.
6. Consider Supabase compute/IO upgrade only after retention, recorder throttling, and backfill hardening are verified.

## Recorder And Backfill Behavior

The candle recorder keeps an in-process watermark per `bridge_instrument` and timeframe. Repeated cycles skip unchanged bars instead of rewriting the same higher-timeframe cache rows every minute.

Backfill checks existing daily cache coverage before requesting and writing large bridge ranges. If coverage is already sufficient, it skips the timeframe. If Supabase returns timeout-style errors, backfill stops early instead of hammering the database.

Supervisor starts child services before startup HTF preload assurance runs, so a failed/no-bars preload cannot indefinitely block scanner and recorder startup. Scanner HTF sufficiency rules still apply; this does not approve trades or weaken data-quality blockers.
