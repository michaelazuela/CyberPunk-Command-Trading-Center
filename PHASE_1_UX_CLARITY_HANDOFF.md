# Phase 1 UX Clarity Handoff

## 1. Current Branch / Worktree

- Branch: `trading-workflow-ux-clarity`
- Worktree: `C:\Users\Mike\.codex\worktrees\trading-workflow-ux-clarity\New project`
- Created from: `ampm-replay-workflow-fix`
- Starting commit: `644fac3 Add trading workflow tab and align AM PM screenshot flow with replay`

## 2. What Was Already Completed And Pushed

The previous phase, `ampm-replay-workflow-fix`, was completed and pushed.

That phase safely reintroduced the visible trading workflow into the active app UI and aligned AM/PM screenshot handling with the Replay Window workflow.

Completed behavior:

- Added a visible `Trading Workflow` navigation entry.
- Mounted `SessionLab` as the `Trading Workflow` screen.
- Kept `RAG Admin`, `Trade Archive`, and `Settings` working.
- Preserved dark mode.
- Kept Morning and PM workflows separate.
- Preserved internal `sessionType: 'lunch'` where needed.
- Removed or neutralized deprecated Lunch Reversal wording from the visible AM/PM workflow.
- Kept paste/upload as screenshot staging only.
- Ensured analysis only runs from explicit user action.
- Added Replay-style click targeting so pasted screenshots route to the selected AM or PM panel.
- Added screenshot OCR/precheck after paste/upload without changing trading rules.
- Did not expose a separate Lunch Reversal tab.

## 3. Current Active App Navigation

The active visible app navigation is:

- `RAG Admin`
- `Trading Workflow`
- `Trade Archive`
- `Settings`

The app no longer exposes old unused workflow tabs in active navigation.

## 4. Current Trading Workflow Behavior

`Trading Workflow` currently renders `SessionLab`.

Current behavior:

- Morning and PM are visible as separate workflow panels.
- Morning uses:
  - `15m ETH Context`
  - `5m Morning Execution`
- PM uses:
  - `5m PM Execution`
- Clicking a panel or upload slot sets the active paste target.
- Pasting or uploading a screenshot stages the image and shows preview behavior.
- Paste/upload does not auto-run analysis.
- OCR/precheck is attempted after staging.
- Analysis only runs when the user clicks the explicit Morning or PM analysis button.
- Morning and PM image/result/outcome state are isolated.
- PM visible wording is PM-oriented, while internal `lunch` naming may remain for compatibility.

Known UX issues entering Phase 1:

- Advanced bridge/model/readiness controls appear before the AM/PM workflow panels.
- Screenshot previews are small and hard to verify before analysis.
- OCR/precheck status is not clearly visible while checking or when unavailable.
- The workflow does not yet have a compact top-level process strip.
- Session context chips for Morning/AM, PM Review, trade date, and instrument are not yet prominent.
- `TradeProofPanel` still has a visible Replay-only sentence.

## 5. Files Already Changed In The Previous Phase

Previous phase changed:

- `src/App.tsx`
- `src/components/SessionLab.tsx`

No trading-rule engines were changed in the previous phase.

## 6. Validation Status From The Previous Phase

The previous phase passed:

```bash
npm run guard:no-firebase
npm run guard:architecture
npm run guard:schema
npm run lint
npm run build
```

## 7. Phase 1 UX Clarity Goal

Improve the visible `Trading Workflow` tab so it is easier and safer to use during live AM/PM analysis without changing trading rules, analyzer logic, setup scanning, trade decision logic, risk logic, target logic, storage assumptions, or app navigation architecture.

The Phase 1 focus is UI/UX clarity only:

- Make the workflow sequence obvious.
- Make Morning and PM easy to find first.
- Make screenshot staged state explicit.
- Make OCR/precheck state visible.
- Make screenshot previews large enough to verify before analysis.
- Keep advanced bridge/model controls available but less visually dominant.
- Remove Replay-only wording from proof capture.

## 8. Approved Files For Phase 1 Only

Approved files to modify:

- `src/components/SessionLab.tsx`
- `src/components/workflow/ScreenshotUploadPanel.tsx`
- `src/components/TradeProofPanel.tsx`

No other app code should be modified in Phase 1 unless the user explicitly approves it.

## 9. Hard Constraints / Files Not To Touch

Do not change trading rules or analyzer logic.

Do not modify:

- `src/lib/setupRegistry.ts`
- `src/lib/setupScanner.ts`
- `src/lib/tradeDecisionPipeline.ts`
- `src/lib/conditionalPlanBuilder.ts`
- `src/lib/planEngine.ts`
- Risk engines
- Target engines
- Trade rules
- Trade Archive components
- `src/components/FinalTradePlanCard.tsx`

Additional constraints:

- Do not change internal `sessionType: 'lunch'`.
- Do not add or restore deprecated tabs.
- Do not add a Lunch Reversal tab.
- Do not expose deprecated Lunch Reversal wording in visible UI.
- Preserve dark mode.
- Keep `RAG Admin`, `Trading Workflow`, `Trade Archive`, and `Settings` working.
- Keep Morning and PM state isolated.
- Paste/upload must stage only.
- Analysis must only run from an explicit user button click.
- Do not modify app code before explaining the implementation plan if starting from a fresh chat.

## 10. Exact Next Prompt For A Fresh Codex Chat

```text
We are working in the permanent worktree:
C:\Users\Mike\.codex\worktrees\trading-workflow-ux-clarity\New project

Branch:
trading-workflow-ux-clarity

Before coding, read:
- AGENTS.md
- PROJECT_HANDOFF.md
- TRADING_RULES_BASELINE.md
- PHASE_1_UX_CLARITY_HANDOFF.md

Goal:
Implement Phase 1 UX Clarity for the visible Trading Workflow tab only.

Approved files only:
- src/components/SessionLab.tsx
- src/components/workflow/ScreenshotUploadPanel.tsx
- src/components/TradeProofPanel.tsx

Do not modify trading rules or analyzer logic.
Do not modify setupRegistry, setupScanner, tradeDecisionPipeline, conditionalPlanBuilder, planEngine, risk engines, target engines, Trade Archive, or FinalTradePlanCard.
Do not change internal sessionType: 'lunch'.
Do not add a Lunch Reversal tab or restore deprecated tabs.
Preserve dark mode.
Keep RAG Admin, Trading Workflow, Trade Archive, and Settings working.
Keep Morning and PM state isolated.
Paste/upload must stage only.
Analysis must only run from explicit user button clicks.

Implement the approved Phase 1 changes:
1. In SessionLab.tsx, add a compact workflow strip near the top:
   1 Screenshot staged -> 2 Analyze -> 3 Decision -> 4 Outcome/Proof -> 5 Journal/RAG
2. Add clear session chips:
   Morning / AM, PM Review, Trade date, Instrument.
3. Make AM and PM panels easier to find before advanced controls.
4. Move or collapse advanced bridge/model controls behind an "Advanced data/model controls" disclosure if clean.
5. Add clear staged-state wording:
   "Screenshot staged — analysis has not run yet."
6. Add visible OCR/precheck status:
   "Checking chart metadata..."
   "OCR complete"
   "OCR unavailable — screenshot still staged."
7. In ScreenshotUploadPanel.tsx, increase screenshot preview size so the chart can be verified before analysis, preserve paste/upload behavior, and support staged/OCR status display if needed.
8. In TradeProofPanel.tsx, remove Replay-only wording and use neutral wording like "Trading Workflow / Replay evidence" or "Optional evidence."

After implementation, run:
npm run guard:no-firebase
npm run guard:architecture
npm run guard:schema
npm run lint
npm run build

Report:
1. Every file changed
2. What changed in each file
3. Why each change was necessary
4. Commands run
5. Manual test steps
6. Any remaining risks
```
