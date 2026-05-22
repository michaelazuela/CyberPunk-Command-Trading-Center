# Start New Codex Chat Bootstrap

Last updated: 2026-05-22

Use this file when the current Codex chat is almost out of context. It is the shortest safe path to continue the MES/MNQ trading app work without losing project state.

## Current Repo State

- Repo: `michaelazuela/CyberPunk-Command-Trading-Center`
- Local path: `C:\Users\Mike\Documents\New project`
- Branch: `main`
- Latest pushed code checkpoint at time of this file:
  - `b633f86 Restrict active scanner candidates to primary models`
- Important prior commits:
  - `6e2da00 Add phase 1 UX clarity handoff`
  - `644fac3 Add trading workflow tab and align AM PM screenshot flow with replay`
  - `4ef84d1 Add project handoff and trading rules baseline`
  - `585e469 Add ICT scanner journal and admin workflow updates`

## Files To Read First In New Chat

Tell the next Codex chat to read these before changing anything:

1. `AGENTS.md`
2. `PROJECT_RULES.md`
3. `PROJECT_HANDOFF.md`
4. `TRADING_RULES_BASELINE.md`
5. `PHASE_1_UX_CLARITY_HANDOFF.md`
6. `START_NEW_CODEX_CHAT.md`

## Current Loose Local Files

At the time this file was created, the only uncommitted items were untracked local artifacts:

```text
?? test-screenshots/
?? tools/automation/Session
?? tools/automation/Supabase
```

Do not stage these unless the user explicitly says they are needed.

## Current Architecture To Preserve

- Supabase and Cloudflare only.
- No Firebase.
- NinjaTrader bridge is read-only.
- Discord is the primary trade-alert surface.
- Web UI is admin/workflow clarity, not automated execution.
- No automated orders.
- AI extracts facts only.
- App-owned deterministic scanner/pipeline decides trade state.
- 5M chart remains execution authority.
- Higher timeframes are market map/target context.

## Current Active Trading Models

Only these setup types may create active scanner candidates:

1. `SetupType.SweepMssFvgRetrace`
2. `SetupType.TurtleSoup`

Supporting evidence may enrich a plan but must not independently create active candidates:

- Liquidity sweep
- FVG / imbalance
- Imbalance pullback
- Market structure shift
- Equal highs/lows / resting liquidity pools
- Previous day/session sweep
- Breaker/FVG overlap
- Wick rejection
- Premium/discount
- HTF alignment

Deprecated setup families must not become active candidates.

## Next Approved Phase

Continue with **Phase 1 UX Clarity**.

Goal:

Make the `Trading Workflow` tab clear, Replay-like, and safe to use without changing trading logic.

Approved focus:

- `src/components/SessionLab.tsx`
- `src/components/ReplayLab.tsx` as a reference only
- very small label/readability changes in related UI files only if necessary

Do not touch:

- setup scanner
- trade decision pipeline
- conditional plan builder
- setup registry
- trade rules
- time windows
- target/session engines
- local scanner engine
- automation scripts
- Cloudflare functions
- Supabase migrations

## Exact Prompt For New Chat

Paste this into the new Codex chat:

```text
You are working in the GitHub repo:

michaelazuela/CyberPunk-Command-Trading-Center

Local path:
C:\Users\Mike\Documents\New project

I am continuing after a previous Codex chat ran out of context.

Before changing code, read:
- AGENTS.md
- PROJECT_RULES.md
- PROJECT_HANDOFF.md
- TRADING_RULES_BASELINE.md
- PHASE_1_UX_CLARITY_HANDOFF.md
- START_NEW_CODEX_CHAT.md

Then run:
git status --short
git log --oneline -5

Task:
Continue Phase 1 UX Clarity only.

Goal:
Make the Trading Workflow tab clear, Replay-like, and safe to use without changing trading logic.

Rules:
- Do not alter trading rules.
- Do not alter setupScanner, tradeDecisionPipeline, conditionalPlanBuilder, setupRegistry, tradeRules, timeWindows, localScannerEngine, target/session engines, automation scripts, Cloudflare functions, or Supabase migrations.
- Do not stage untracked test-screenshots or tools/automation/Session or tools/automation/Supabase unless I explicitly approve it.
- Preserve dark mode.
- Preserve screenshot paste/upload behavior.
- Screenshot preview must display before analysis.
- Analysis must not auto-run when an image is pasted/uploaded.
- User must click Analyze/Process intentionally.
- AM and PM must be separate workflows.
- AM must not trigger PM logic.
- PM must not trigger AM logic.
- Neither AM nor PM should use old Lunch Reversal workflow language.

Approved files:
- src/components/SessionLab.tsx
- src/components/ReplayLab.tsx only as workflow reference
- src/components/FinalTradePlanCard.tsx only for label/readability changes
- src/components/TradeProofPanel.tsx only for label/readability changes
- src/App.tsx only for small navigation label/wording changes
- src/lib/utils.ts only for display-only helper text
- CSS/global style files only for layout/readability

Validation:
Run:
npm run lint
npm test
npm run build

Return:
1. Files changed
2. UX clarity changes made
3. Confirmation no trading rules changed
4. Confirmation screenshot paste/upload behavior is preserved
5. Confirmation Analyze/Process remains explicit
6. Validation results
7. Remaining risks
```

## Quick Recovery Checklist

In a new chat:

1. Start from the exact prompt above.
2. Confirm current branch is `main`.
3. Confirm latest commit includes `b633f86` or newer.
4. Ignore untracked screenshots/artifacts unless needed.
5. Continue Phase 1 UX Clarity only.
6. Validate before commit/push.

End of bootstrap.
