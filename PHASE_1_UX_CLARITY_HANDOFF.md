# Phase 1 UX Clarity Handoff

Last updated: 2026-05-21

This file is a phase-specific handoff for the next Codex session. It documents the current worktree state and the next approved UX-only phase. Do not use this file as permission to alter trading rules.

## 1. Current Branch / Worktree Name

- Current branch: `main`
- Current workspace: `C:\Users\Mike\Documents\New project`
- GitHub repo: `michaelazuela/CyberPunk-Command-Trading-Center`

Current observed worktree status before this handoff was created:

```text
 M src/config/setupRegistry.ts
 M src/config/tradeRules.ts
 M src/lib/conditionalPlanBuilder.ts
 M src/lib/localScannerEngine.test.ts
 M src/lib/localScannerEngine.ts
 M src/lib/setupScanner.test.ts
 M src/lib/setupScanner.ts
 M src/lib/tradeDecisionPipeline.test.ts
 M src/lib/tradeDecisionPipeline.ts
 M src/types.ts
 M tools/automation/discord-scheduler.ts
 M tools/automation/nt-scanner.ts
?? src/config/setupRegistry.test.ts
?? test-screenshots/
?? tools/automation/Session
?? tools/automation/Supabase
```

Important: some of the modified files above are from previous work and may already be intentional. Do not revert them unless explicitly instructed.

## 2. What Was Already Completed And Pushed

Recent pushed commits on `main` include:

- `644fac3 Add trading workflow tab and align AM PM screenshot flow with replay`
- `4ef84d1 Add project handoff and trading rules baseline`
- `585e469 Add ICT scanner journal and admin workflow updates`
- `874251d Add scanner market mapping mode`
- `003f6b2 Improve deterministic scanner plan builders`

Already completed:

- `PROJECT_HANDOFF.md` was created.
- `TRADING_RULES_BASELINE.md` was created.
- The app has a `Trading Workflow` tab in navigation.
- `SessionLab` is currently mounted under the `Trading Workflow` tab.
- The active scanner direction has been narrowed to primary model setup types:
  - `Sweep -> MSS -> FVG Retrace`
  - `Turtle Soup Reversal`
- Supporting evidence and deprecated setup registry roles have been introduced in prior phases.
- Guardrails against Firebase and legacy custom rule language are wired through npm guards.

## 3. Current Active App Navigation

Current `src/App.tsx` active tabs:

- `RAG Admin`
- `Trading Workflow`
- `Trade Archive`
- `Settings`

Current active rendering:

- `RAG Admin` renders `AdminDashboard`.
- `Trading Workflow` renders `SessionLab`.
- `Trade Archive` renders `TradeLog`.
- `Settings` renders `Settings`.

Current direction:

- Discord remains the primary live trade-alert interface.
- The UI should support admin, review, workflow clarity, and screenshot-driven/manual analysis.
- The UI must not become an automated execution cockpit.

## 4. Current Trading Workflow Behavior

The `Trading Workflow` tab currently uses `SessionLab`.

Approved behavior to preserve:

- User can paste or upload screenshots.
- Screenshot preview must display before analysis.
- Analysis must not auto-run just because a screenshot is pasted or uploaded.
- User must intentionally click Analyze/Process.
- AM and PM must be separate workflows.
- AM state must not leak into PM state.
- PM state must not leak into AM state.
- Reset must clear only the active workflow/mode.
- The workflow should follow the Replay Window interaction pattern:
  - upload/paste,
  - preview,
  - explicit run/analyze button,
  - output result,
  - proof/outcome/RAG support if available.

Trading logic behavior to preserve:

- The 5-minute chart remains execution authority.
- Higher timeframes are context/target map only.
- 15M ETH/context screenshot is context only.
- AI may extract chart facts, but the app-owned scanner/pipeline decides the trade state.
- Active trade candidates should remain limited to:
  - `SetupType.SweepMssFvgRetrace`
  - `SetupType.TurtleSoup`
- Supporting evidence must not become standalone active candidates.
- Deprecated Lunch Reversal logic must not become the AM/PM model.

## 5. Files Already Changed In The Previous Phase

Previous active-code phases changed or touched these important files:

- `src/config/setupRegistry.ts`
- `src/config/tradeRules.ts`
- `src/lib/setupScanner.ts`
- `src/lib/setupScanner.test.ts`
- `src/lib/tradeDecisionPipeline.ts`
- `src/lib/tradeDecisionPipeline.test.ts`
- `src/lib/conditionalPlanBuilder.ts`
- `src/types.ts`
- `src/config/setupRegistry.test.ts`

Other modified files existed in the worktree before this handoff and must be treated carefully:

- `src/lib/localScannerEngine.ts`
- `src/lib/localScannerEngine.test.ts`
- `tools/automation/discord-scheduler.ts`
- `tools/automation/nt-scanner.ts`

Untracked folders/files to avoid unless explicitly needed:

- `test-screenshots/`
- `tools/automation/Session`
- `tools/automation/Supabase`

## 6. Validation Status From The Previous Phase

Most recent reported validation from Phase D:

```bash
npm run lint
npm test
npm run build
```

Status:

- `npm run lint`: passed.
- `npm test`: passed.
- `npm run build`: passed.

Build warnings only:

- Vite reported a chunk-size warning.
- Vite reported `src/lib/rag.ts` is dynamically imported and also statically imported.

These warnings were not build failures.

## 7. Phase 1 UX Clarity Goal

Phase 1 UX Clarity goal:

Make the `Trading Workflow` UI easy to understand without changing trading logic.

The user wants the workflow to be obvious and Replay-like:

- AM and PM are clearly separate.
- The screenshot upload/paste area is clear.
- Preview appears before analysis.
- Nothing auto-runs on paste/upload.
- Analyze/Process button is explicit.
- Output area clearly separates:
  - bias/read,
  - setup/model,
  - entry idea/zone,
  - stop,
  - target,
  - invalidation,
  - trade/no-trade/wait decision.
- User can tell what is required before clicking Analyze.
- User can tell whether they are in AM or PM.
- User can tell when the workflow is waiting for screenshot versus ready to analyze.

Do not change scanner logic, setup registry roles, risk rules, target logic, RAG schema, Discord logic, or Cloudflare/Supabase architecture in Phase 1.

## 8. Approved Files For Phase 1 Only

Approved files for Phase 1 UX clarity:

- `src/components/SessionLab.tsx`
- `src/components/ReplayLab.tsx` only as a reference file for workflow pattern; edit only if absolutely necessary and explicitly justified.
- `src/components/FinalTradePlanCard.tsx` only if labels/clarity need alignment and no trading logic changes are made.
- `src/components/TradeProofPanel.tsx` only if proof/outcome labels need clarity.
- `src/App.tsx` only if navigation label or tab wording needs small UX clarification.
- `src/lib/utils.ts` only if display-only helper text needs clarification.
- CSS/global style files only if needed for layout/readability and dark mode preservation.
- `PHASE_1_UX_CLARITY_HANDOFF.md` for updating handoff notes.

Preferred first file to inspect/edit:

- `src/components/SessionLab.tsx`

## 9. Hard Constraints / Files Not To Touch

Do not touch these in Phase 1 UX clarity unless the user explicitly changes scope:

- `src/config/setupRegistry.ts`
- `src/config/tradeRules.ts`
- `src/config/timeWindows.ts`
- `src/lib/setupScanner.ts`
- `src/lib/tradeDecisionPipeline.ts`
- `src/lib/conditionalPlanBuilder.ts`
- `src/lib/localScannerEngine.ts`
- `src/lib/targetObjectiveEngine.ts`
- `src/lib/sessionStructure.ts`
- `src/lib/sessionLevelContextEngine.ts`
- `src/lib/ninjaTraderBridge.ts`
- `tools/automation/nt-scanner.ts`
- `tools/automation/discord-scheduler.ts`
- `tools/automation/candle-recorder.ts`
- `tools/automation/backfill-market-bars.ts`
- `supabase/migrations`
- `functions/api/*`
- environment variable names or secret-handling code

Hard constraints:

- Do not alter trading rules while fixing UI workflow.
- Do not add new strategy logic.
- Do not re-enable deprecated setup families.
- Do not use old Lunch Reversal code as the AM/PM workflow model.
- Do not change active candidate rules.
- Do not change risk rules.
- Do not change target rules.
- Do not change RAG or Supabase schema.
- Do not change Discord outcome behavior.
- Preserve dark mode.
- Preserve screenshot paste/upload behavior.
- Preserve explicit click-to-analyze behavior.
- No automated orders.
- No Firebase.

## 10. Exact Next Prompt For A Fresh Codex Chat

Use this prompt to continue Phase 1 safely:

```text
You are working in the GitHub repo:

michaelazuela/CyberPunk-Command-Trading-Center

Read first:
- AGENTS.md
- PROJECT_HANDOFF.md
- TRADING_RULES_BASELINE.md
- PHASE_1_UX_CLARITY_HANDOFF.md

Task:
Implement Phase 1 UX Clarity for the Trading Workflow UI only.

Goal:
Make the current Trading Workflow tab clear, Replay-like, and safe to use without changing trading logic.

Before changing code:
1. Run git status --short.
2. Inspect src/App.tsx and src/components/SessionLab.tsx.
3. Inspect src/components/ReplayLab.tsx only as a workflow reference.
4. Identify the smallest UI-only changes needed.

Approved files:
- src/components/SessionLab.tsx
- src/components/ReplayLab.tsx only as reference, edit only if absolutely necessary
- src/components/FinalTradePlanCard.tsx only for label/readability changes
- src/components/TradeProofPanel.tsx only for label/readability changes
- src/App.tsx only for small navigation label/wording changes
- src/lib/utils.ts only for display-only helper text
- CSS/global style files only for layout/readability

Do not touch:
- setupScanner
- tradeDecisionPipeline
- conditionalPlanBuilder
- setupRegistry
- tradeRules
- timeWindows
- localScannerEngine
- target/session engines
- automation scripts
- Cloudflare functions
- Supabase migrations
- environment variable names

UX requirements:
- AM and PM must appear as separate workflows.
- AM must not trigger PM logic.
- PM must not trigger AM logic.
- Neither AM nor PM should use old Lunch Reversal workflow language.
- Screenshot paste/upload must show preview first.
- Analyzer must not auto-run when image is pasted/uploaded.
- User must click Analyze/Process intentionally.
- The UI must clearly show required inputs, ready/not-ready status, and result sections.
- Preserve dark mode.
- Preserve existing behavior unless the change is clearly label/layout-only.

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

End of handoff.
