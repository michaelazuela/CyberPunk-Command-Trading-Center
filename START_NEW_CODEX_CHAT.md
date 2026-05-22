# Start New Codex Chat Bootstrap

Last updated: 2026-05-22

Use this file when the current Codex chat is almost out of context. It is the shortest safe path to continue the MES/MNQ trading app work without losing project state.

## Current Repo State

- Repo: `michaelazuela/CyberPunk-Command-Trading-Center`
- Local path: `C:\Users\Mike\Documents\New project`
- Branch: `main`
- Latest local commit at time of this update:
  - `d845f1c Add new chat bootstrap handoff`
- Latest pushed code checkpoint known before this update:
  - `b633f86 Restrict active scanner candidates to primary models`
- Important prior commits:
  - `b633f86 Restrict active scanner candidates to primary models`
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

At the time this file was updated, the current uncommitted items were:

```text
 M START_NEW_CODEX_CHAT.md
 M src/components/SessionLab.tsx
 M src/config/tradeRules.ts
 M src/lib/setupScanner.test.ts
 M src/lib/setupScanner.ts
 M src/lib/tradeDecisionPipeline.test.ts
?? test-screenshots/
?? tools/automation/Session
?? tools/automation/Supabase
```

Notes:

- `src/components/SessionLab.tsx` is from the completed Phase 1 UX clarity pass in this chat.
- `src/config/tradeRules.ts`, `src/lib/setupScanner.ts`, `src/lib/setupScanner.test.ts`, and `src/lib/tradeDecisionPipeline.test.ts` are from the completed Phase E Model 1 pass in this chat.
- `START_NEW_CODEX_CHAT.md` is modified only to update this handoff.
- Do not stage `test-screenshots/`, `tools/automation/Session`, or `tools/automation/Supabase` unless the user explicitly says they are needed.

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

## Completed Since Previous Bootstrap

### Phase 1 UX Clarity

Completed a UI-only clarity pass in `src/components/SessionLab.tsx`.

What changed:

- Added clear AM/PM readiness/status cards.
- Clarified upload/paste is staging only and preview must appear before analysis.
- Renamed buttons to explicit `Analyze Morning 5M` / `Analyze PM 5M`.
- Added compact result summaries for Bias/Read, Setup/Model, and Decision above the existing plan card.
- Kept AM and PM workflow state separate.

Validation after Phase 1:

```bash
npm run lint
npm test
npm run build
```

Status: passed. Build had existing Vite chunk/dynamic import warnings only.

### Phase E Model 1 Validation

Completed Phase E objective: make `SetupType.SweepMssFvgRetrace` an explicit, measurable primary ICT model.

Files changed for Phase E:

- `src/config/tradeRules.ts`
- `src/lib/setupScanner.ts`
- `src/lib/setupScanner.test.ts`
- `src/lib/tradeDecisionPipeline.test.ts`

Where Model 1 validation now lives:

- `validateModelOne()` in `src/lib/setupScanner.ts`.
- It is used only for `SetupType.SweepMssFvgRetrace`.

Model 1 now requires:

- liquidity sweep
- reclaim after sweep
- displacement
- market structure shift
- impulse-qualified FVG / imbalance
- retrace into FVG
- entry inside FVG or valid confluence zone
- stop beyond sweep extreme
- target using opposing liquidity or a valid R objective
- minimum 2.0R

FVG definitions implemented for derived candle facts:

- Bullish FVG: `Low[currentBar] > High[currentBar - 2]`
- Bearish FVG: `High[currentBar] < Low[currentBar - 2]`

Impulse filter:

- Added `TRADE_RULES.executionParameters.fvgImpulseBodyRatio = 1.25`
- Added `TRADE_RULES.executionParameters.fvgImpulseRangeRatio = 1.25`
- Explicit `fvgZones` must be impulse-qualified or pass the ratio filter.
- Weak gaps are not valid Model 1 FVGs.

Incomplete Model 1 handling:

- Full sequence qualifies as executable only when all required facts and 2.0R are present.
- Partial sequence remains conditional/watchlist if enough evidence exists.
- FVG-only, sweep-only, missing retrace, weak FVG, entry outside FVG, and missing 2R do not fully qualify.
- Supporting evidence remains available as notes/evidence, not active standalone candidates.

Tests added/updated:

- Full Model 1 sequence qualifies.
- FVG-only does not qualify.
- Sweep + reclaim without displacement/MSS/FVG does not fully qualify.
- Sweep + displacement + MSS without FVG retrace remains conditional.
- Weak FVG without impulse does not qualify.
- Entry outside FVG does not qualify.
- Missing 2R target room blocks full qualification.
- LONG stop is below sweep low.
- SHORT stop is above sweep high.
- Supporting evidence remains non-standalone.

Validation after Phase E:

```bash
npm run lint
npm test
npm run build
```

Status: passed. `npm run lint` included `guard:no-firebase`, `guard:legacy-rules`, `guard:architecture`, and `guard:schema`. Build had existing Vite chunk/dynamic import warnings only.

## Next Recommended Phase

No next phase has been explicitly approved after Phase E.

Recommended next step:

- Review the Phase 1 + Phase E diffs.
- Optionally commit a clean checkpoint, excluding untracked local artifacts unless explicitly approved.
- If continuing code work, ask the user for the next phase/scope before touching additional files.

Important:

- Do not expand active candidates beyond `SetupType.SweepMssFvgRetrace` and `SetupType.TurtleSoup`.
- Do not reintroduce deprecated setup families.
- Do not stage `test-screenshots/`, `tools/automation/Session`, or `tools/automation/Supabase` unless explicitly approved.

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
Continue from completed Phase 1 UX Clarity and completed Phase E Model 1 validation.

Rules:
- First inspect `git status --short` and current diffs.
- Do not stage untracked test-screenshots or tools/automation/Session or tools/automation/Supabase unless I explicitly approve it.
- Do not reintroduce deprecated setup families.
- Do not broaden active candidate generation beyond:
  - SetupType.SweepMssFvgRetrace
  - SetupType.TurtleSoup
- Preserve Supabase/Cloudflare-only architecture.
- Preserve Gemini through `/api/gemini`.
- Preserve decision-support-only behavior; no automated orders.

Current local changes to review:
- src/components/SessionLab.tsx
- src/config/tradeRules.ts
- src/lib/setupScanner.ts
- src/lib/setupScanner.test.ts
- src/lib/tradeDecisionPipeline.test.ts
- START_NEW_CODEX_CHAT.md

Validation:
Previous chat already ran:
npm run lint
npm test
npm run build

Task:
Ask me what next phase or action I want. If I ask to commit, make a clean checkpoint with only the intentional modified tracked files and do not stage the untracked artifact folders unless explicitly approved.
```

## Quick Recovery Checklist

In a new chat:

1. Start from the exact prompt above.
2. Confirm current branch is `main`.
3. Confirm latest local commit includes `d845f1c` or newer.
4. Review the current tracked diffs before changing anything.
5. Ignore untracked screenshots/artifacts unless explicitly approved.
6. Validate before commit/push.

End of bootstrap.
