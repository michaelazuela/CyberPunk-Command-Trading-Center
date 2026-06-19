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

Implemented local permanence layer:

- `Install-QuantDesk-StartupTask.ps1` installs a current-user Windows Scheduled Task named `Quant Desk Local Supervisor`.
- `Uninstall-QuantDesk-StartupTask.ps1` removes that startup task.
- The startup task launches the tray/supervisor wrapper, not scanner child commands directly.
- The supervisor remains the owner of scanner and candle-recorder processes.
- The task uses `MultipleInstances IgnoreNew` so Windows logon does not stack duplicate startup tasks.
- The task runs at limited privilege for the current interactive Windows user.

Implemented read-only runtime diagnostics:

- `npm run supervisor:audit` prints a process ownership audit.
- The audit reports supervisor PID, service-owned PIDs, child process-tree PIDs, external duplicate PIDs, startup task health, bridge health, scanner state freshness, and recorder heartbeat status.
- The audit is read-only. It does not stop processes, start processes, repair state, post Discord messages, change scanner behavior, change trading logic, or change canExecute.

Implemented safer duplicate cleanup:

- `Repair-QuantDesk-Runtime.ps1` and `npm run supervisor:repair` provide the Phase 2 cleanup path.
- Preview mode is the default. It reports external duplicate scanner/recorder PIDs without stopping anything.
- `-Apply` is required before any process can be stopped.
- The cleanup target is limited to external duplicate scanner/recorder processes reported by the runtime audit.
- Supervisor-owned process-tree PIDs are explicitly protected and skipped.
- The cleanup does not start services, restart services, post Discord messages, repair JSON state, change scanner behavior, change trading logic, or change canExecute.

Implemented operator-facing status summary:

- `Status-QuantDesk.ps1` now prints the normal supervisor status plus a readable runtime ownership summary from `npm run supervisor:audit`.
- The summary shows supervisor state, startup-task health, bridge reachability, duplicate scanner/recorder status, owned process-tree counts, and external duplicate PID counts.
- Runtime JSON state files are checked for parseability, simple expected shape, backup recovery, and missing required files.
- JSON state warnings identify whether a file was recovered from `.bak`, failed validation, failed parsing, or is missing.
- If duplicates are detected, the status output points to the preview-first cleanup path: `npm run supervisor:repair`.
- If recorder heartbeat is stale or warning, the status output labels it as data freshness/bridge health, not duplicate process ownership.
- The status command is read-only. It does not stop processes, start processes, repair state, post Discord messages, change scanner behavior, change trading logic, or change canExecute.

Implemented runtime JSON temp cleanup and health bundles:

- `npm run supervisor:cleanup-json` previews old runtime JSON `*.tmp-*` files left behind by failed atomic writes.
- Cleanup only matches runtime JSON temp names such as `state.json.tmp-<pid>-<timestamp>-<hex>`.
- Preview mode is the default. `-- --apply` is required before any temp file is deleted.
- Cleanup scans only known runtime locations by default: `logs/supervisor`, `tools/automation`, and `tools/automation/discord-audit`.
- `Export-QuantDesk-HealthBundle.ps1` and `npm run supervisor:health-bundle` save troubleshooting output under ignored `logs/supervisor/health-bundles/<timestamp>`.
- The health bundle captures supervisor status, runtime audit JSON, duplicate cleanup preview, runtime JSON cleanup preview, `Status-QuantDesk.ps1` output, and a manifest.
- The health bundle is read-only. It does not apply cleanup, stop processes, start processes, post Discord messages, change scanner behavior, change trading logic, or change canExecute.

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
- Runtime JSON state validation and `.bak` recovery are visible in `npm run supervisor:audit` and `Status-QuantDesk.ps1`.
- Old runtime JSON temp-file cleanup is available through preview-first `npm run supervisor:cleanup-json`.
- Preserve Supabase as the durable record for journal/RAG outcomes.

Recommended later hardening:

- Tighten per-file schema validators as local state contracts stabilize.
- Add an operator-facing support workflow that can attach a health bundle to a GitHub issue or support note when requested.

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
