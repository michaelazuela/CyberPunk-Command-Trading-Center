# Quant Desk Local Runtime Isolation Plan

Date: 2026-06-19

Purpose: isolate and harden the live Quant Desk scanner as a stable local Windows program. This replaces the earlier Docker/container direction. It does not change trading logic, scanner ranking, entries, stops, targets, canExecute, risk gates, Discord cadence, or NinjaTrader bridge contracts.

## Current Live Runtime

The live operational stack is started by the local supervisor:

- `npm run supervisor:start`
- `npm run nt:scanner`
- `npm run nt:candle-recorder`

Supervisor-owned services are defined in `tools/supervisor/config.ts`:

- `candle-recorder`: records NinjaTrader OHLC into `market_bars`.
- `scanner`: runs the deterministic Desk scanner and Discord delivery path.
- `companion-proxy`: disabled by default.
- `discord-alerts`: disabled by default.

## Runtime Source Surface

The operational runtime depends on:

- `tools/supervisor/**`
- `tools/automation/**`
- `src/lib/**`
- `src/config/**`
- `src/agents/**`
- `src/types.ts`

The scanner imports shared app-owned engines from `src/lib` and `src/config`, including the plan engine, trade rules, time windows, local scanner engine, NinjaTrader bridge client, market-data ingestion, journal/RAG helpers, Discord formatting, chart rendering, and scanner health/readiness agents.

## Dashboard Surface

The browser dashboard starts at:

- `src/main.tsx`
- `src/App.tsx`
- `src/components/**`
- `vite.config.ts`
- `index.html`

Current finding: the live scanner does not require the browser entrypoint to start. However, the scanner does require shared modules under `src`, so deleting the full `src` tree or broad UI-adjacent code would be unsafe.

Safe conclusion: isolate and harden the operational runtime first while keeping the dashboard code present. UI removal or archival should be a later phase after import boundaries are proven with tests.

## Local Service Hardening Direction

The next non-Docker runtime work should make the existing Windows-local process model more permanent:

1. Keep one supervisor-owned process tree for scanner and recorder.
2. Keep `Start-QuantDesk-Supervisor.ps1`, `Stop-QuantDesk-Supervisor.ps1`, and `Status-QuantDesk.ps1` as the operator-facing commands.
3. Add a Windows startup task or service wrapper only after duplicate-process prevention is verified.
4. Keep NinjaTrader bridge access local at `http://127.0.0.1:8765`.
5. Keep logs under `logs/supervisor`.
6. Keep generated audit/state files out of Git.

## Required Runtime Inputs

The isolated runtime still needs the same external systems:

- NinjaTrader bridge reachable on the same Windows host.
- Supabase URL and service role key.
- Discord scanner, health, and system-alert webhook variables.
- Discord outcome secret and base URL when outcome buttons are enabled.
- `DISCORD_RAG_USER_ID` for durable RAG records.

Secrets must stay in local environment scope or `.env.local`. They must not be committed.

## JSON State Stabilization

JSON files are acceptable for local runtime state, receipts, decision tapes, and supervisor status, but they should be treated as recoverable local state rather than execution authority.

Implemented first-pass hardening:

- Atomic JSON writes: write `*.tmp`, flush, then rename.
- Last-known-good `.bak` files for rewritten runtime JSON.
- Safe reads that recover from `.bak` when primary JSON is corrupt.
- Supervisor/scanner local state, notification state, pre-window backfill state, recorder heartbeat, local market-data gap ledger, and scanner audit/decision-tape writes use the safe JSON path.
- Preserve Supabase as the durable record for journal/RAG outcomes.

Recommended later hardening:

- Add schema validation around each local state file.
- Add cleanup for old `*.tmp-*` files after failed writes.
- Add operator-facing status when a `.bak` recovery occurred.

## Boundary

This local isolation plan does not change:

- setup definitions
- ranking
- trade approval
- canExecute
- entry/stop/target math
- risk gates
- Discord approval boundaries
- NinjaTrader OHLC authority
