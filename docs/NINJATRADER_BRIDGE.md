# NinjaTrader Bridge

This document defines the first read-only bridge between NinjaTrader Desktop and the Quant Desk app.

## Goal

Pull live data from the NinjaTrader 8 desktop app into the decision-support app without giving the app trade execution authority.

Confirmed environment:

- NinjaTrader: 8.1.6.3 64-bit
- Initial instrument: MES
- Initial accounts: Sim101 and 206257
- Bridge mode: local read-only HTTP bridge
- Initial port: `127.0.0.1:8765`

Chosen v1 recommendations:

- Start read-only. Pull bars, snapshots, accounts, and positions first.
- Do not place trades from the web app in v1.
- Use the NinjaTrader user Custom folder, not the Program Files install folder.
- Keep MES as the default instrument, then make the exact contract selectable once the connection panel is added.
- Treat live bars as structured chart facts for the app-owned setup scanner and trade decision pipeline.

## Architecture

```text
NinjaTrader 8 Desktop
  -> QuantDeskBridge NinjaScript AddOn
  -> local read-only HTTP endpoints on 127.0.0.1:8765
  -> Trading Workflow / SessionLab reads structured bars and account snapshots
  -> app-owned setup scanner, plan engine, and trade decision pipeline decide
```

The bridge is read-only in v1. It must not place, change, cancel, reverse, flatten, or otherwise submit orders.

Official NinjaTrader references used for this scaffold:

- AddOn lifecycle uses `OnStateChange()` and the `State.Active` / `State.Terminated` lifecycle.
- Market data access uses `BarsRequest`, its `Update` event, and `Request()` callback pattern.
- Account and position data are read from the NinjaTrader account objects.

## Install Location

Use the user NinjaScript folder, not Program Files:

```text
C:\Users\Mike\Documents\NinjaTrader 8\bin\Custom\AddOns\QuantDeskBridge.cs
```

Do not manually edit:

```text
C:\Program Files\NinjaTrader 8
```

That is the application install path.

## Compile

1. Copy `tools/ninjatrader-bridge/QuantDeskBridge.cs` into:

   ```text
   C:\Users\Mike\Documents\NinjaTrader 8\bin\Custom\AddOns\QuantDeskBridge.cs
   ```

2. Open NinjaTrader.
3. Open `New > NinjaScript Editor`.
4. Right-click and choose `Compile`.
5. Open the NinjaScript Output window and confirm the bridge started.

Expected output:

```text
QuantDeskBridge started at http://127.0.0.1:8765/
```

## Endpoints

Health:

```text
GET http://127.0.0.1:8765/health
```

Accounts:

```text
GET http://127.0.0.1:8765/accounts
```

Snapshot:

```text
GET http://127.0.0.1:8765/snapshot?instrument=MES%2006-26
```

Bars:

```text
GET http://127.0.0.1:8765/bars?instrument=MES%2006-26&timeframe=5m&limit=100
GET http://127.0.0.1:8765/bars?instrument=MES%2006-26&timeframe=15m&limit=100
GET http://127.0.0.1:8765/bars?instrument=MES%2006-26&timeframe=60m&limit=100
GET http://127.0.0.1:8765/bars?instrument=MES%2006-26&timeframe=120m&limit=100
GET http://127.0.0.1:8765/bars?instrument=MES%2006-26&timeframe=240m&limit=100
GET http://127.0.0.1:8765/bars?instrument=MES%2006-26&timeframe=1m&limit=100
```

Historical bars for Replay Lab:

```text
GET http://127.0.0.1:8765/historical-bars?instrument=MES%2006-26&timeframe=5m&from=2026-05-15T10:00:00-04:00&to=2026-05-15T12:00:00-04:00
GET http://127.0.0.1:8765/historical-bars?instrument=MES%2006-26&timeframe=15m&from=2026-05-15T00:00:00-04:00&to=2026-05-15T10:00:00-04:00
GET http://127.0.0.1:8765/historical-bars?instrument=MES%2006-26&timeframe=60m&from=2026-05-14T18:00:00-04:00&to=2026-05-15T10:00:00-04:00
GET http://127.0.0.1:8765/historical-bars?instrument=MES%2006-26&timeframe=120m&from=2026-05-14T18:00:00-04:00&to=2026-05-15T10:00:00-04:00
GET http://127.0.0.1:8765/historical-bars?instrument=MES%2006-26&timeframe=240m&from=2026-05-14T18:00:00-04:00&to=2026-05-15T10:00:00-04:00
GET http://127.0.0.1:8765/historical-bars?instrument=MES%2006-26&timeframe=5m&from=2026-05-15T12:00:00-04:00&to=2026-05-15T15:30:00-04:00
```

Positions:

```text
GET http://127.0.0.1:8765/positions?account=Sim101
GET http://127.0.0.1:8765/positions?account=206257
```

## Current Limitations

- The initial AddOn is configured for `MES 06-26`.
- Futures contract rollover must be updated or made configurable before production use.
- The bridge returns cached bars from NinjaTrader `BarsRequest`.
- Cloudflare-hosted pages use Chrome Private Network Access rules when calling a local `127.0.0.1` endpoint from HTTPS. The bridge includes `Access-Control-Allow-Private-Network: true`, but some browser builds can still deny public-site access to loopback services. In that case, use local dev or the local companion server below.

## Durable Candle Cache

NinjaTrader remains the data authority, but Quant Desk also keeps a compact Supabase candle cache for replay, Discord alerts, RAG, and gap repair.

Stored timeframes:

- `5m` execution authority
- `15m` liquidity/session map
- `60m` intraday structure
- `120m` / `2h` intermediate structure
- `240m` macro context

The cache stores OHLCV candles only. It does not store tick data.

Required local secrets in `.env.local`:

```bash
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="server-only-secret-key"
DISCORD_RAG_USER_ID="your-supabase-auth-user-id"
```

Continuous recorder:

```bash
npm run nt:candle-recorder
```

The recorder writes a local heartbeat at `logs/supervisor/candle-recorder-heartbeat.json` when launched by the supervisor. The heartbeat includes status, latest completed 5M timestamp, processed bar count, and warning/error text.

Backfill / gap repair:

```bash
npm run nt:backfill -- --days 1000
npm run nt:backfill -- --from 2026-05-10 --to 2026-05-15
```

Backfill uses prior-day 6:00 PM ET through trade-date 5:00 PM ET to cover ETH, premarket, RTH, morning, and lunch context.

The Discord scheduler reads Supabase `market_bars` first. If the requested window is missing, it falls back to NinjaTrader `/historical-bars` and repairs the cache with any returned bars.

## Durable Scanner Campaign Ledger

The local scanner also writes ActiveCampaign alert claims to Supabase `scanner_active_campaign_alerts`.

Purpose:

- prevent repeated Discord trade-plan alerts for the same `activeCampaign.id`
- survive scanner restarts and deleted `.nt-scanner-state.json`
- coordinate multiple scanner instances that share the same Supabase project and `DISCORD_RAG_USER_ID`

This ledger is alert-delivery state only. It does not approve trades, place orders, change `canExecute`, or replace the app-owned trade decision pipeline.

Required local secrets are the same server-only values used by the candle cache:

```bash
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="server-only-secret-key"
DISCORD_RAG_USER_ID="your-supabase-auth-user-id"
```

If those values are missing or Supabase is temporarily unavailable, ActiveCampaign trade-plan alerts are held instead of being sent with local-only de-duplication. The local `.nt-scanner-state.json` file remains a cache/diagnostic record, not the authority for campaign de-duplication.

Check ledger readiness:

```bash
npm run nt:scanner -- --preflight-active-campaign-ledger
```

The live PowerShell launcher runs this preflight before starting Discord posting mode.

The PowerShell launcher starts the candle recorder automatically unless `-NoRecorder` is supplied:

```powershell
.\tools\automation\start-discord-alerts.ps1
.\tools\automation\start-discord-alerts.ps1 -NoRecorder
```

Keep NinjaTrader open while recording or backfilling. If NinjaTrader is closed, the cache cannot receive new market data.

## Supervisor-First Automation

The preferred local workflow is the Quant Desk Supervisor tray:

```powershell
.\Launch-QuantDeskSupervisorTray.vbs
```

The tray starts the supervisor hidden, and the supervisor owns:

- the local setup scanner
- the NinjaTrader candle recorder
- startup 30-day HTF preload/backfill
- automatic pre-window cache repair before Morning and Lunch windows
- service restart checks for supervisor-owned child processes
- Discord operational notices for bridge, recorder, stale 5M, cache gap, and pre-window repair problems

Default automatic repair windows:

- Morning cache repair: 9:45-10:00 AM ET
- Lunch cache repair: 11:45 AM-12:00 PM ET

The tray also has **Repair Market Cache Now** for one-click manual repair without opening PowerShell. Command-line tools remain available for diagnostics, but they are not the intended morning startup path.

## First Test Checklist

After compiling the AddOn in NinjaTrader, open these URLs in your browser while NinjaTrader is running:

```text
http://127.0.0.1:8765/health
http://127.0.0.1:8765/accounts
http://127.0.0.1:8765/bars?instrument=MES%2006-26&timeframe=5m&limit=20
http://127.0.0.1:8765/bars?instrument=MES%2006-26&timeframe=15m&limit=20
http://127.0.0.1:8765/positions?account=Sim101
```

Expected behavior:

- `/health` returns `readOnly: true`.
- `/accounts` includes `Sim101` and, if available in your install, `206257`.
- `/bars` returns real OHLC candles.
- `/historical-bars` returns real OHLC candles for the requested Replay Lab date/window when NinjaTrader and the connected data provider can load that history.
- Supported minute timeframes are `1m`, `5m`, `15m`, `60m`, `120m`, and `240m`. `1h`, `2h`, and `4h` are accepted aliases and are returned as `60m`, `120m`, and `240m`.
- 4H and 1H are macro/session context only. 15M is the primary liquidity target map. 5M remains execution authority.
- `/positions` returns current positions without submitting or modifying any orders.

If NinjaTrader uses a different MES contract name than `MES 06-26`, update `DefaultInstrument` inside `QuantDeskBridge.cs` and use that exact name in the URL.

## Cloudflare Production E2E Check

The deployed Cloudflare Pages app must be able to call:

```text
http://127.0.0.1:8765/health
```

from the browser. If Chrome reports:

```text
Permission was denied for this request to access the loopback address space
```

then NinjaTrader is running an older copy of the bridge. Copy the latest `QuantDeskBridge.cs` into the NinjaTrader AddOns folder, recompile, and restart/reload the bridge.

The important response header is:

```text
Access-Control-Allow-Private-Network: true
```

If that header is present and Chrome still blocks the request, the app is hitting browser local-network permission enforcement rather than a bridge code failure. The local app path still works because both the page and the bridge run from localhost.

## Local Companion Server

Use the companion when the Cloudflare-hosted HTTPS site cannot reach `127.0.0.1` directly.

```bash
npm run build
npm run nt:companion
```

Then open:

```text
http://127.0.0.1:8787
```

What it does:

- serves the production build locally from `dist`
- keeps the browser origin on `127.0.0.1`, so NinjaTrader bridge access is allowed
- exposes `/companion/health` for a quick status check
- exposes `/bridge/*` as a local proxy to `http://127.0.0.1:8765/*` for future bridge wiring

This does not place trades. It only gives the live decision-support app a reliable local path to read NinjaTrader data.

## Next Phases

Phase 1: compile and test the read-only bridge.

Phase 2: add a Session Lab connection panel:

- Bridge connected yes/no
- NinjaTrader version
- selected account
- selected instrument contract
- latest 5m bar timestamp
- latest 15m bar timestamp
- latest 1h bar timestamp
- latest 4h bar timestamp

Phase 3: use bridge candles as structured input:

- 4h macro context from real bars
- 1h session context from real bars
- 15m ETH/session liquidity context from real bars
- 5m execution chart from real bars
- level sanity from real OHLC
- screenshot becomes optional proof/context, not primary extraction
- Replay Lab can import historical NinjaTrader bars by trading date/window so RAG learns from factual OHLC, not only screenshots.
- Morning Replay imports broader 4h/2h/1h/15m context from prior day 6:00 PM ET through 10:00 AM ET, while keeping the 5m setup-scan window at 10:00-12:00.
- Lunch/PM Replay imports broader 4h/2h/1h/15m context through 3:30 PM ET plus the 5m setup-scan window at 12:00-3:30.
- The app segments imported bars into ETH, Asian, London, NY premarket, RTH morning, lunch, and current-window structure.
- The Target Objective Engine annotates conditional/executable plans with structural target context from those segments. Executable T1/T2 remain the app-owned fixed 1.5R / 2.0R levels.

Phase 4: staged order ticket only:

- app creates a ticket
- user reviews
- NinjaTrader receives only after explicit approval

Phase 5: limited automation only after replay/live validation:

- kill switches
- max risk
- max contracts
- manual enable switch
- emergency flatten
- full audit trail
