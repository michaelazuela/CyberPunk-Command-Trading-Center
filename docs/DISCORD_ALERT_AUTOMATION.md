# Discord Alert Automation

Quant Desk can run a local NinjaTrader-to-Discord alert process for decision support.

## What It Does

- Runs on the same Windows machine as NinjaTrader Desktop.
- Pulls OHLC bars from the read-only NinjaTrader bridge.
- Builds structured chart context from ETH and RTH data.
- Runs the app-owned plan engine and deterministic trade decision pipeline.
- Sends the resulting Morning or Lunch plan to Discord.
- Does not place orders.

## Why It Runs Locally

Cloudflare cannot reliably reach `127.0.0.1` on your trading PC. The local runner can access the NinjaTrader bridge directly, then post the finished decision-support message to Discord.

## Required Secret

Set this only on your local machine:

```powershell
$env:DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/..."
```

Do not commit webhook URLs.

## Commands

Dry run without posting:

```powershell
npm run nt:discord-alerts -- --once morning --dry-run
```

Send one Morning alert:

```powershell
npm run nt:discord-alerts -- --once morning
```

Send one Lunch alert:

```powershell
npm run nt:discord-alerts -- --once lunch
```

Start the scheduler:

```powershell
npm run nt:discord-alerts
```

## Double-Click Launcher

You can also start the scheduler with:

```powershell
tools\automation\start-discord-alerts.ps1
```

Or double-click:

```text
tools\automation\Start Quant Desk Discord Alerts.cmd
```

The launcher does not store your Discord webhook in the repo. If `DISCORD_WEBHOOK_URL` is not already set, it prompts for the webhook URL for that PowerShell session.

Test one alert without posting to Discord:

```powershell
tools\automation\start-discord-alerts.ps1 -DryRun -Once premarket
```

## Default Schedule

- Premarket ETH rundown: 9:15 AM ET
- Morning plan alert: 10:10 AM ET
- Lunch plan alert: 1:00 PM ET

Each job sends once per ET trading date. Local send state is stored in `tools/automation/.discord-alert-state.json`, which is ignored by git.

## Data Windows

Morning:

- 15M ETH context: prior 6:00 PM ET through 10:00 AM ET.
- 5M execution: 9:30 AM ET through 10:10 AM ET.

Lunch:

- 15M ETH context: prior 6:00 PM ET through 1:00 PM ET.
- 5M execution: 11:50 AM ET through 1:00 PM ET.

## Guardrails

- Discord alerts are decision support only.
- No automated orders are placed.
- The 15M ETH chart remains context only.
- The 5M chart remains execution authority.
- Final approval still comes from the app-owned plan engine and trade decision pipeline.
