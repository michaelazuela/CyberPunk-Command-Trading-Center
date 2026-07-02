# Project Guardrails

This project uses layered guard scripts to keep the trading desk architecture from drifting.

## What The Project Guard Checks

`npm run guard:project` is a read-only safety check. It verifies that:

- Core operating rules remain present in `AGENTS.md` and `docs/CODEX_RULES.md`.
- Data and risk guardrail docs remain available.
- The package guard chain includes Firebase, bridge-contract, legacy-rule, architecture, schema, active-window, and project guard checks.
- The main regression test command still includes critical scanner, decision-pipeline, data-ingestion, Discord-alert, and supervisor tests.
- Forbidden dependencies such as Firebase and browser-side Gemini SDKs are not added.
- Gemini API secrets stay behind the Cloudflare `/api/gemini` function.
- Canonical trading windows remain sourced from `src/config/timeWindows.ts`.
- Protected scanner, Discord, market-data, and decision files do not add direct Gemini calls, Firebase/Firestore, or automated order-placement code.

## What It Does Not Do

The project guard does not approve trades, rank candidates, suppress Discord posts, change scanner behavior, modify bridge behavior, or alter `canExecute`.

It is meant to fail the build when project boundaries are weakened, so drift is caught during checks instead of after a live scanner miss.

## When To Run It

Run the full guard chain before reporting implementation success:

```bash
npm run guard
```

Run the project guard alone when changing docs, package scripts, automation ownership, or high-risk scanner/Discord/bridge paths:

```bash
npm run guard:project
```
