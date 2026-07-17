# Project Status

## Latest Change

Date: 2026-07-16
Task: Add held-local wording contract guard.
Files changed: tools/automation/unified-positive-held-local-wording-guard.ts, tools/automation/unified-positive-held-local-wording-guard.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: After making held-local invalidation wording side-specific, the desk needed a reusable local guard that fails if generic `below/above` wording returns or if LONG/SHORT invalidation text stops matching the protected 5M stop side.
Tests run: `npx tsx tools/automation/unified-positive-held-local-wording-guard.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/unified-positive-held-local-wording-guard.ts --inspection-surface tools/automation/diagnostic-reports/unified-positive-held-local-inspection-surface-1784256196818.json --out-dir tools/automation/diagnostic-reports --json`.
Result: Focused test, typecheck, and real local wording guard passed. The real guard checked 4 held-local inspection rows, passed all 4, found 0 generic invalidation findings, and found 0 missing side-specific findings. Report paths: `tools/automation/diagnostic-reports/unified-positive-held-local-wording-guard-1784257754479.json` and `.md`.
Trading logic changed: No. This is a local-only wording contract guard. It does not change setup definitions, live ranking, live scanner behavior, entry, stop, target, risk, invalidation gates, session gates, Discord posting, Supabase behavior, bridge behavior, or executable approval.
Bridge impact: None. No live bridge read occurred.
Journal/RAG impact: None. No live Supabase/RAG reads or writes occurred.
Supabase impact: None.
Known risks: Production Discord/Supabase publishing remains disabled. The guard validates local inspection artifacts only.
Next recommended action: Add a local preview payload builder for held-local `ACTIVE_REVIEW` tickets that consumes only wording-guard-passing inspection artifacts and still emits `publishDiscord=false`, `shouldPost=false`, and `canExecute=false`.

## Previous Change

Date: 2026-07-16
Task: Make held-local invalidation wording side-specific.
Files changed: src/lib/localScannerEngine.ts, tools/automation/unified-positive-held-local-ticket-adapter.test.ts, tools/automation/unified-positive-held-local-inspection-surface.test.ts, docs/PROJECT_STATUS.md.
Reason: The local inspection surface exposed generic held-local invalidation text (`below/above the protected 5M stop line`). Before any UI/Discord exposure, the local artifacts need trader-clean side-specific wording while preserving all no-post/no-execute boundaries.
Tests run: `npx tsx tools/automation/unified-positive-held-local-ticket-adapter.test.ts`; `npx tsx tools/automation/unified-positive-held-local-inspection-surface.test.ts`; `npx tsx tools/automation/unified-positive-guarded-scanner-replay.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/unified-positive-held-local-ticket-adapter.ts --contract-comparison tools/automation/diagnostic-reports/unified-positive-desk-ticket-contract-comparison-1784253451004.json --out-dir tools/automation/diagnostic-reports --json`; `npx tsx tools/automation/unified-positive-guarded-scanner-replay.ts --enable-held-local-inspection --held-local-adapter tools/automation/diagnostic-reports/unified-positive-held-local-ticket-adapter-1784256189869.json --out-dir tools/automation/diagnostic-reports --json`.
Result: Focused tests, typecheck, fresh adapter generation, and guarded replay passed. The regenerated inspection report has 4 inspectable tickets and 0 blockers. LONG tickets now say invalid if price trades below the protected 5M stop line; SHORT tickets say invalid if price trades above the protected 5M stop line. The guarded replay still showed 4 zero-live-publish-behavior-change rows, 4 inspectable tickets, and 0 blocked rows. Report paths: `tools/automation/diagnostic-reports/unified-positive-guarded-scanner-replay-1784256196820.json` and `.md`; inspection path: `tools/automation/diagnostic-reports/unified-positive-held-local-inspection-surface-1784256196818.md`.
Trading logic changed: No. This only changes held-local local artifact wording. It does not change setup definitions, live ranking, live scanner behavior, entry, stop, target, risk, invalidation gates, session gates, Discord posting, Supabase behavior, bridge behavior, or executable approval.
Bridge impact: None. No live bridge read occurred.
Journal/RAG impact: None. No live Supabase/RAG reads or writes occurred.
Supabase impact: None.
Known risks: Production Discord/Supabase publishing remains disabled. These are still local-only held-local artifacts.
Next recommended action: Add a final local artifact contract check that fails if any held-local review ticket contains generic invalidation wording or lacks side-specific stop wording before considering any UI/Discord preview surface.

## Previous Change

Date: 2026-07-16
Task: Add guarded local scanner replay option for held-local ticket inspection.
Files changed: tools/automation/unified-positive-guarded-scanner-replay.ts, tools/automation/unified-positive-guarded-scanner-replay.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The inspection surface proved the held-local `ACTIVE_REVIEW` tickets are locally inspectable. This phase adds an explicit guarded replay command that requires `--enable-held-local-inspection`, consumes a local held-local adapter report, and writes the dry-run replay plus local inspection artifacts without entering the live scanner loop.
Tests run: `npx tsx tools/automation/unified-positive-guarded-scanner-replay.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/unified-positive-guarded-scanner-replay.ts --enable-held-local-inspection --held-local-adapter tools/automation/diagnostic-reports/unified-positive-held-local-ticket-adapter-1784254207487.json --out-dir tools/automation/diagnostic-reports --json`.
Result: Focused test, typecheck, and real guarded local replay run passed. The real run required the explicit guard flag, loaded the 4 held-local tickets, produced a passing scanner dry-run replay, produced a passing held-local inspection surface, found 4 zero-live-publish-behavior-change rows, 4 inspectable tickets, and 0 blocked rows. Report paths: `tools/automation/diagnostic-reports/unified-positive-guarded-scanner-replay-1784255781038.json` and `.md`.
Trading logic changed: No. This is a local-only replay command. It does not change setup definitions, live ranking, live scanner behavior, entry, stop, target, risk, invalidation, session gates, Discord posting, Supabase behavior, bridge behavior, or executable approval.
Bridge impact: None. No live bridge read occurred.
Journal/RAG impact: None. No live Supabase/RAG reads or writes occurred.
Supabase impact: None.
Known risks: Production Discord/Supabase publishing remains disabled. The guarded command still depends on local artifact inputs from the previous diagnostic chain; it is not a live scanner feature.
Next recommended action: Fix the generic held-local invalidation wording to be side-specific in local artifacts before any UI/Discord exposure, then rerun the guarded replay to confirm the ticket text is trader-facing clean while all no-post/no-execute boundaries remain intact.

## Previous Change

Date: 2026-07-16
Task: Add local-only held-local ticket inspection surface.
Files changed: tools/automation/unified-positive-held-local-inspection-surface.ts, tools/automation/unified-positive-held-local-inspection-surface.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The scanner dry-run replay proved held-local artifacts can sit beside normal output with zero live publish behavior change. This phase adds a local-only inspection surface so the desk can review the actual `ACTIVE_REVIEW` ticket levels, triggers, invalidation text, and safety boundaries without touching Discord, Supabase, bridge, or live scanner behavior.
Tests run: `npx tsx tools/automation/unified-positive-held-local-inspection-surface.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/unified-positive-held-local-inspection-surface.ts --held-local-adapter tools/automation/diagnostic-reports/unified-positive-held-local-ticket-adapter-1784254207487.json --dry-run-replay tools/automation/diagnostic-reports/unified-positive-scanner-dry-run-replay-1784254950340.json --out-dir tools/automation/diagnostic-reports --json`.
Result: Focused test, typecheck, and real local-only inspection run passed. The report joined 4 held-local adapter rows with 4 dry-run replay rows and found 4 inspectable tickets, 0 blocked rows, 4 normal `shouldPost=false` rows, 4 held-local `shouldPost=false` rows, 4 normal `canExecute=false` rows, 4 held-local `canExecute=false` rows, 4 normal `publishDiscord=false` rows, and 4 held-local `publishDiscord=false` rows. Report paths: `tools/automation/diagnostic-reports/unified-positive-held-local-inspection-surface-1784255341673.json` and `.md`.
Trading logic changed: No. This is a local-only read-only inspection artifact. It does not change setup definitions, live ranking, scanner behavior, entry, stop, target, risk, invalidation, session gates, Discord posting, Supabase behavior, bridge behavior, or executable approval.
Bridge impact: None. No live bridge read occurred.
Journal/RAG impact: None. No live Supabase/RAG reads or writes occurred.
Supabase impact: None.
Known risks: The local inspection markdown exposes existing generic invalidation wording (`below/above the protected 5M stop line`) from the held-local artifact text. Because this is not a live trader-facing card, it was left unchanged for this phase; a later wording phase can make side-specific text before any Discord/UI exposure.
Next recommended action: Add a guarded scanner replay option that writes this local inspection artifact during replay only, still keeping live Discord/Supabase disabled and requiring a separate approval gate before production publish behavior changes.

## Previous Change

Date: 2026-07-16
Task: Add unified positive scanner dry-run replay.
Files changed: tools/automation/unified-positive-scanner-dry-run-replay.ts, tools/automation/unified-positive-scanner-dry-run-replay.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The held-local adapter created 4 scanner-owned review artifacts. Before scanner-visible wiring, the desk needed proof that these artifacts can be paired beside normal DeskState output while preserving zero live publish behavior change.
Tests run: `npx tsx tools/automation/unified-positive-scanner-dry-run-replay.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/unified-positive-scanner-dry-run-replay.ts --held-local-adapter tools/automation/diagnostic-reports/unified-positive-held-local-ticket-adapter-1784254207487.json --out-dir tools/automation/diagnostic-reports --json`.
Result: Focused test, typecheck, and real read-only dry-run replay passed. The replay loaded 4 adapter rows, paired 4 held-local artifacts beside preserved normal scanner output, found 4 zero-live-publish-behavior-change rows, and found 0 blockers. Normal output and adapter output both remained `shouldPost=false`, `publishDiscord=false`, and `canExecute=false` for all 4 rows. Report paths: `tools/automation/diagnostic-reports/unified-positive-scanner-dry-run-replay-1784254950340.json` and `.md`.
Trading logic changed: No. This is a read-only diagnostic replay over local artifacts. It does not change setup definitions, live ranking, scanner behavior, entry, stop, target, risk, invalidation, session gates, Discord posting, Supabase behavior, bridge behavior, or executable approval.
Bridge impact: None. No live bridge read occurred.
Journal/RAG impact: None. No live Supabase/RAG reads or writes occurred.
Supabase impact: None.
Known risks: The artifacts are still local dry-run evidence only. Scanner-visible UI/Discord/Supabase wiring remains off and would need a separate approval gate.
Next recommended action: Add an explicit local-only scanner dry-run flag or inspection surface that can show the held-local `ACTIVE_REVIEW` ticket beside normal DeskState output while keeping production Discord/Supabase behavior disabled.

## Previous Change

Date: 2026-07-16
Task: Add scanner-owned held-local review ticket adapter.
Files changed: src/lib/localScannerEngine.ts, tools/automation/unified-positive-held-local-ticket-adapter.ts, tools/automation/unified-positive-held-local-ticket-adapter.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The contract comparison proved 4 positive review tickets fit the scanner-owned `DeskTicket`/`DeskPublishDecision` contracts. This phase adds a dry-run scanner-owned adapter that emits held-local review ticket artifacts only, keeping `publishDiscord=false`, `shouldPost=false`, and `canExecute=false`.
Tests run: `npx tsx tools/automation/unified-positive-held-local-ticket-adapter.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/unified-positive-held-local-ticket-adapter.ts --contract-comparison tools/automation/diagnostic-reports/unified-positive-desk-ticket-contract-comparison-1784253451004.json --out-dir tools/automation/diagnostic-reports --json`.
Result: Focused test, typecheck, and real read-only adapter run passed. The adapter consumed 4 compatible contract-comparison rows and created 4 scanner-owned held-local artifacts: 2026-06-16 morning TurtleSoup LONG, 2026-06-24 evening TurtleSoup SHORT, 2026-06-25 evening TurtleSoup SHORT, and 2026-06-26 morning SweepMssFvgRetrace LONG. Every artifact has `DeskTicket.state=ACTIVE_REVIEW`, `DeskPublishDecision.shouldPost=false`, `canExecute=false`, and `publishDiscord=false`; 0 rows were blocked. Report paths: `tools/automation/diagnostic-reports/unified-positive-held-local-ticket-adapter-1784254207487.json` and `.md`.
Trading logic changed: No. This adds an exported dry-run/held-local artifact builder and read-only report. It does not change setup definitions, live ranking, scanner behavior, entry, stop, target, risk, invalidation, session gates, Discord posting, Supabase behavior, bridge behavior, or executable approval.
Bridge impact: None.
Journal/RAG impact: None. No live Supabase/RAG reads or writes occurred.
Supabase impact: None.
Known risks: The adapter is available but not wired into live scanner cycles. A later scanner dry-run replay must prove the adapter can sit beside normal DeskState output without changing the live publish path.
Next recommended action: Add a scanner dry-run replay that emits these held-local artifacts beside normal DeskState output, then compare normal output versus adapter output and require zero live publish behavior change.

## Previous Change

Date: 2026-07-16
Task: Compare simulated positive review tickets against DeskTicket/DeskPublishDecision contracts.
Files changed: tools/automation/unified-positive-desk-ticket-contract-comparison.ts, tools/automation/unified-positive-desk-ticket-contract-comparison.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The deduped review-ticket simulation produced 4 review-only candidates. Before any scanner-visible wiring, the desk needed proof that those tickets can be represented by the existing scanner-owned `DeskTicket` and `DeskPublishDecision` public contracts without changing Discord posting, Supabase schema, `canExecute`, or execution behavior.
Tests run: `npx tsx tools/automation/unified-positive-desk-ticket-contract-comparison.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/unified-positive-desk-ticket-contract-comparison.ts --review-ticket-simulation tools/automation/diagnostic-reports/unified-positive-review-ticket-rebuild-simulation-1784251224514.json --out-dir tools/automation/diagnostic-reports --json`.
Result: Focused test, typecheck, and real read-only comparison passed. The comparison loaded 4 simulated review tickets and found all 4 compatible with the scanner-owned `DeskTicket` shape and held-local `DeskPublishDecision` shape. All 4 rows remain `ACTIVE_REVIEW`, `shouldPost=false`, `canExecute=false`, and `publishDiscord=false`, with 0 contract blockers. Report paths: `tools/automation/diagnostic-reports/unified-positive-desk-ticket-contract-comparison-1784253451004.json` and `.md`.
Trading logic changed: No. This phase is read-only contract comparison. It does not change setup definitions, live ranking, scanner behavior, entry, stop, target, risk, invalidation, session gates, Discord posting, Supabase behavior, bridge behavior, or executable approval.
Bridge impact: None.
Journal/RAG impact: None. No live Supabase/RAG reads or writes occurred.
Supabase impact: None.
Known risks: The compatible projection is still an offline adapter, not scanner-owned live wiring. The next phase must install any adapter inside the scanner-owned DeskState/DeskTicket path and keep Discord posting disabled until separately approved.
Next recommended action: Add a dry-run scanner-owned adapter for these 4 review tickets that emits DeskTicket-compatible held-local artifacts only, still `publishDiscord=false`, before any live Discord or Supabase behavior is touched.

## Previous Change

Date: 2026-07-16
Task: Simulate deduped human-review tickets from fresh-proof positive rows.
Files changed: tools/automation/unified-positive-review-ticket-rebuild-simulation.ts, tools/automation/unified-positive-review-ticket-rebuild-simulation.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The fresh completed 5M proof extractor found 7 eligible TurtleSoup/Sweep positive rows, but repeated same-session snapshots must not become multiple Discord tickets. This phase adds a read-only review-ticket rebuild simulation that dedupes by trade date, session, setup, and direction while preserving the app-owned entry/stop/T1/T2 geometry from the proof-qualified row.
Tests run: `npx tsx tools/automation/unified-positive-review-ticket-rebuild-simulation.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/unified-positive-review-ticket-rebuild-simulation.ts --fresh-proof-report tools/automation/diagnostic-reports/unified-positive-fresh-5m-proof-extractor-1784250574870.json --out-dir tools/automation/diagnostic-reports --json`.
Result: Focused test, typecheck, and real read-only simulation passed. The simulation loaded 10 fresh-proof report rows, found 7 eligible fresh-proof rows, collapsed them into 4 simulated review-only tickets, suppressed 3 duplicate rows, kept 3 rows blocked as not eligible, and found 0 invalid geometry rows. All simulated tickets preserve `canExecute=false`, `publishDiscord=false`, and `reviewOnly=true`. Simulated tickets: 2026-06-16 morning TurtleSoup LONG, 2026-06-24 evening TurtleSoup SHORT, 2026-06-25 evening TurtleSoup SHORT, and 2026-06-26 morning SweepMssFvgRetrace LONG. Report paths: `tools/automation/diagnostic-reports/unified-positive-review-ticket-rebuild-simulation-1784251224514.json` and `.md`.
Trading logic changed: No. This phase is read-only ticket-shape simulation. It does not change setup definitions, live ranking, scanner behavior, entry, stop, target, risk, invalidation, session gates, Discord posting, Supabase behavior, bridge behavior, or executable approval.
Bridge impact: None.
Journal/RAG impact: None. No live Supabase/RAG reads or writes occurred.
Supabase impact: None.
Known risks: The simulation intentionally dedupes same-session setup/direction groups aggressively to avoid Discord flooding. Before live scanner wiring, the next phase should compare this simulated shape against the existing DeskPublishDecision/DeskTicket contract and decide whether any same-session second entry should remain as a separate review card.
Next recommended action: Keep live wiring off. Add a contract comparison against the existing scanner-owned DeskTicket/DeskPublishDecision path, proving these 4 simulated review tickets can be represented without changing Discord posting, Supabase schema, canExecute, or automated execution.

## Previous Change

Date: 2026-07-16
Task: Extract fresh completed 5M proof for positive TurtleSoup and Sweep rows.
Files changed: tools/automation/unified-positive-fresh-5m-proof-extractor.ts, tools/automation/unified-positive-fresh-5m-proof-extractor.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The positive rebuild-readiness audit found 10 positive overlay rows that all remained blocked by stale/no-chase or missing fresh 5M proof. This phase adds a read-only model-specific proof extractor for only TurtleSoup and SweepMssFvgRetrace positives, using completed 5M OHLC after the stale snapshot cutoff.
Tests run: `npx tsx tools/automation/unified-positive-fresh-5m-proof-extractor.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/unified-positive-fresh-5m-proof-extractor.ts --positive-rebuild-audit tools/automation/diagnostic-reports/unified-positive-candidate-rebuild-audit-1784249675968.json --audit-dir tools/automation/discord-audit --market-bars-json tools/automation/diagnostic-reports/raw-ohlc-source-MES-2026-06-01-to-2026-07-02-1784223007126.json --start-date 2026-06-01 --end-date 2026-07-02 --instrument MES --out-dir tools/automation/diagnostic-reports --json`.
Result: Focused test, typecheck, and real read-only extraction passed. The extractor loaded 10 positive rows and 12,119 local completed 5M bars from the raw OHLC source. It found 7 rows with fresh completed 5M retest/re-entry proof, 2 rows invalidated before proof, 1 row reached T1 before proof, 0 rows missing future bars, 0 missing snapshots, and 0 missing plan geometry. Eligible-after-proof rows remain research-only with `canExecute=false` and `publishDiscord=false`. Report paths: `tools/automation/diagnostic-reports/unified-positive-fresh-5m-proof-extractor-1784250574870.json` and `.md`.
Trading logic changed: No. This phase is read-only proof extraction. It does not change setup definitions, live ranking, scanner behavior, entry, stop, target, risk, invalidation, session gates, Discord posting, Supabase behavior, bridge behavior, or executable approval.
Bridge impact: None. The run used local raw 5M OHLC JSON only, not live bridge reads.
Journal/RAG impact: None. No live Supabase/RAG reads or writes occurred.
Supabase impact: None.
Known risks: Positive rows can include repeated nearby scanner snapshots, so the 7 eligible-after-proof rows are not yet deduplicated into unique scanner tickets. The extractor also blocks rows when stop or T1 is touched before proof, which is intentionally conservative for stale/no-chase research.
Next recommended action: Keep scanner-visible wiring off. Build a read-only review-ticket rebuild simulation for only the 7 eligible-after-fresh-proof rows, dedupe repeated same-session ideas, and prove the resulting ticket text/plan geometry before any live behavior change.

## Previous Change

Date: 2026-07-16
Task: Audit positive overlay candidates for rebuild readiness.
Files changed: tools/automation/unified-positive-candidate-rebuild-audit.ts, tools/automation/unified-positive-candidate-rebuild-audit.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The outcome/RAG overlay found 10 positive unified candidates, but scanner visibility must not be wired until the desk proves whether those rows already have fresh 5M proof and deterministic plan geometry. This phase adds a read-only rebuild-readiness audit over positive overlay rows only.
Tests run: `npx tsx tools/automation/unified-positive-candidate-rebuild-audit.test.ts`; `npx tsx tools/automation/unified-desk-candidate-book-diagnostic.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/unified-positive-candidate-rebuild-audit.ts --unified-diagnostic tools/automation/diagnostic-reports/unified-desk-candidate-book-diagnostic-1784248229399.json --audit-dir tools/automation/discord-audit --start-date 2026-06-01 --end-date 2026-07-02 --out-dir tools/automation/diagnostic-reports --json`; `git diff --check`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `npm run test`.
Result: Focused tests, typecheck, the real read-only audit, guards, lint, build, and full test suite passed. The audit reviewed 10 positive overlay rows and found 0 eligible review-ticket candidates, 10 needing fresh completed 5M proof, 0 needing plan geometry rebuild, and 0 needing both proof and geometry. The positive rows were 8 TurtleSoup rows and 2 SweepMssFvgRetrace rows. All rows preserved `canExecute=false` and `publishDiscord=false`. Positive overlay gross evidence across matched rows was +$2,592.50 one-MES before costs, but none is scanner-visible yet because every row is stale/no-chase or missing fresh 5M proof. Report paths: `tools/automation/diagnostic-reports/unified-positive-candidate-rebuild-audit-1784249675968.json` and `.md`.
Trading logic changed: No. This phase is read-only diagnostic classification. It does not change setup definitions, live ranking, scanner behavior, entry, stop, target, risk, invalidation, session gates, Discord posting, Supabase behavior, bridge behavior, or executable approval.
Bridge impact: None.
Journal/RAG impact: None. The audit consumed the prior local overlay report only. It did not read or write live Supabase/RAG.
Supabase impact: None.
Known risks: Positive overlay rows can repeat across nearby scanner snapshots, so matched gross evidence is triage evidence rather than a trade-count backtest. The classification still proves the useful next bottleneck: fresh completed 5M proof capture, not deterministic geometry rebuild.
Next recommended action: Keep scanner-visible wiring off. Build a model-specific fresh 5M proof extractor for the 8 TurtleSoup and 2 Sweep positive rows, using completed 5M OHLC only and still preserving `canExecute=false`/no Discord.

## Previous Change

Date: 2026-07-16
Task: Add read-only outcome/RAG overlay scoring to the unified trading-model diagnostic.
Files changed: tools/automation/unified-desk-candidate-book-diagnostic.ts, tools/automation/unified-desk-candidate-book-diagnostic.test.ts, docs/PROJECT_STATUS.md.
Reason: The unified candidate book found broad review-ticket over-promotion risk, especially SweepMssFvgRetrace. Before scanner-visible wiring, the desk needs a read-only overlay that lets replay/RAG-style outcome evidence penalize stop/no-fill/unresolved-prone model candidates and support only candidates that have clean outcome evidence.
Tests run: `npx tsx tools/automation/unified-desk-candidate-book-diagnostic.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/unified-desk-candidate-book-diagnostic.ts --input-dir tools/automation/discord-audit --start-date 2026-06-01 --end-date 2026-07-02 --out-dir tools/automation/diagnostic-reports --outcome-json tools/automation/diagnostic-reports/formal-ohlc-master-desk-audit-MES-2026-06-01-to-2026-07-02-1784224784513.json --outcome-json tools/automation/diagnostic-reports/no-chase-artifact-rebuild-pack-1784240574825.json --outcome-json tools/automation/diagnostic-reports/no-chase-artifact-rebuild-simulation-1784241406765.json --json`; `git diff --check`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `npm run test`.
Result: Focused test, typecheck, real read-only overlay run, guards, lint, build, and full test suite passed. The overlay loaded 607 local outcome/RAG-style records from master-desk replay and no-chase rebuild evidence, matched 317 unified primary rows, produced 10 positive rows, 304 negative rows, and 213 rows with no-fill/unresolved evidence. The trading-model states stayed unchanged: execution_ready 1, review_ticket 39, ranked_candidate 107, blocked_missing_5m_proof 230, blocked_missing_plan_geometry 6. Among the 39 review-ticket primaries, 0 were positively supported by the outcome overlay, 6 were penalized, and 33 remained unproven by this overlay. This keeps live/scanner-visible wiring off. Report paths: `tools/automation/diagnostic-reports/unified-desk-candidate-book-diagnostic-1784248229399.json` and `.md`.
Trading logic changed: No. This phase is diagnostic/report scoring only. It does not change setup definitions, live ranking, scanner behavior, entry, stop, target, risk, invalidation, session gates, Discord posting, Supabase behavior, bridge behavior, or executable approval.
Bridge impact: None.
Journal/RAG impact: Read-only local overlay only. No Supabase/RAG reads or writes occurred. Live Supabase outcome-button data is still not pulled in this phase.
Supabase impact: None.
Known risks: The overlay currently matches by trade date, session, setup type, and direction, so repeated snapshots can share the same outcome evidence. That is acceptable for diagnostic penalty/support, but it is not a live scoring rule. Live RAG/Supabase outcome-button ingestion still needs a separate controlled read-only gate before use.
Next recommended action: Keep scanner-visible wiring off. Add a targeted proof/geometry rebuild phase for the positively supported ranked/blocked candidates, while penalizing Sweep review tickets with no-fill/stop-prone overlay evidence.

## Previous Change

Date: 2026-07-16
Task: Start clean unified trading-model candidate book contract cleanup.
Files changed: src/lib/unifiedDeskCandidateBook.ts, src/lib/unifiedDeskCandidateBook.test.ts, tools/automation/unified-desk-candidate-book-diagnostic.ts, tools/automation/unified-desk-candidate-book-diagnostic.test.ts, docs/PROJECT_STATUS.md.
Reason: The desk is moving away from Gemini/advisory-centered language and away from treating `canExecute` as the center of the trade idea lifecycle. This phase keeps the existing audit-only candidate book but adds explicit trading-model states and internal-only confidence-source metadata so every model can be ranked together without using Gemini/advisory narrative as scoring evidence.
Tests run: `npx tsx src/lib/unifiedDeskCandidateBook.test.ts`; `npx tsx tools/automation/unified-desk-candidate-book-diagnostic.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/unified-desk-candidate-book-diagnostic.ts --input-dir tools/automation/discord-audit --start-date 2026-06-01 --end-date 2026-07-02 --out-dir tools/automation/diagnostic-reports --json`; `git diff --check`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `npm run test`.
Result: Focused tests, typecheck, diagnostic run, guards, lint, build, and full test suite passed. The candidate book now exposes `tradingModelState` values (`execution_ready`, `review_ticket`, `ranked_candidate`, `blocked_missing_5m_proof`, `blocked_missing_plan_geometry`, `blocked_no_fill`, `blocked`, `no_trade`), records `confidenceSource`, and marks `advisoryScoringExcluded=true`. The scoring policy now states confidence comes from app-owned internal trading-model evidence, excludes Gemini/advisory narrative, and treats `canExecute` as a compatibility final execution flag only. The June 1-July 2 read-only diagnostic audited 383 snapshots with zero findings: execution_ready 1, review_ticket 39, ranked_candidate 107, blocked_missing_5m_proof 230, blocked_missing_plan_geometry 6, blocked_no_fill 0. Report paths: `tools/automation/diagnostic-reports/unified-desk-candidate-book-diagnostic-1784244918394.json` and `.md`.
Trading logic changed: No. This phase is audit/contract metadata only. It does not change setup definitions, live ranking, scanner behavior, entry, stop, target, risk, invalidation, session gates, Discord posting, Supabase behavior, bridge behavior, or executable approval.
Bridge impact: None.
Journal/RAG impact: None. This phase does not read or write RAG/outcome records.
Supabase impact: None.
Known risks: The real diagnostic still shows broad SweepMssFvgRetrace review-ticket over-promotion risk in historical snapshots. The candidate book must remain audit-only until a ranking-quality pass overlays replay/RAG outcomes and proves model selection quality.
Next recommended action: Keep live wiring off. Add a read-only outcome/RAG overlay to the unified trading-model candidate diagnostic, then use it to penalize no-fill/stop-prone model states and identify which review tickets deserve scanner visibility.

## Previous Change

Date: 2026-07-16
Task: Reinvestigate no-chase artifact dates after rollover-aware HTF loading.
Files changed: docs/PROJECT_STATUS.md.
Reason: After installing rollover-aware scanner HTF history loading, the desk needed to re-check the previously date/contract-sensitive no-chase artifact set from June 17, June 25, and June 26 with one active-contract-anchored source.
Tests run: `npx tsx tools/automation/controlled-htf-ohlc-acquisition.ts --start-date 2026-06-17 --end-date 2026-06-26 --instrument MES --bridge-instrument "MES 09-26" --source bridge --rollover-aware --lookback-days 30 --chunk-days 7 --out-dir tools/automation/diagnostic-reports --json`; `npx tsx tools/automation/no-chase-htf-context-sufficiency.ts --simulation-report tools/automation/diagnostic-reports/no-chase-artifact-rebuild-simulation-1784241406765.json --htf-coverage-report tools/automation/diagnostic-reports/controlled-htf-ohlc-acquisition-MES-2026-06-17-to-2026-06-26-1784243443308.json --out-dir tools/automation/diagnostic-reports --json`; `git diff --check`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Investigation commands, guards, lint, and build passed. The combined rollover-aware source anchored on active `MES 09-26` loaded both legs: `MES 06-26:2026-05-18->2026-06-10` and `MES 09-26:2026-06-11->2026-06-26`. Loaded bars: 5M 8042, 15M 2682, 60M 672, 120M 352, 240M 176, with zero bridge failures. Artifact-specific sufficiency now marks all 3 rebuilt artifacts sufficient: 2026-06-17 lunch AfterLunchDriveFvgContinuation SHORT through 2026-06-17 14:05, 2026-06-25 morning IntradayMssMicroContinuation SHORT through 2026-06-25 09:35, and 2026-06-26 lunch IntradayMssMicroContinuation SHORT through 2026-06-26 12:20. `canExecute=false`, `publishDiscord=false`, and HTF promotion evidence allowed `0` remain unchanged. Replay gross one-MES values remain +$112.50, +$107.50, and +$50.00 respectively, +$270.00 total before costs. Report paths: `tools/automation/diagnostic-reports/controlled-htf-ohlc-acquisition-MES-2026-06-17-to-2026-06-26-1784243443308.json` and `tools/automation/diagnostic-reports/no-chase-htf-context-sufficiency-1784243449880.json`.
Trading logic changed: No. This is read-only reinvestigation using local diagnostics plus read-only historical NinjaTrader bridge data. It does not change setup definitions, ranking, entry, stop, target, risk, invalidation, session gates, Discord publish rules, or canExecute logic.
Bridge impact: Read-only historical NinjaTrader bridge reads occurred. No bridge behavior changed and no repair writes were performed.
Journal/RAG impact: None.
Supabase impact: None. The acquisition used `--source bridge`, so there were no Supabase reads or writes.
Known risks: The full-day acquisition report still marks 5M/15M/60M/120M data-limited when asking through Friday 2026-06-26 23:59 ET because loaded futures bars end at the 17:00 ET close. The artifact-specific sufficiency check is the correct proof for these rows because each artifact only requires coverage through its completed 5M proof bar.
Next recommended action: Keep scanner-visible wiring off until the three sufficient-context human-review-only artifacts are manually reviewed together. If approved, the next narrow implementation should create scanner-visible review tickets only, still with `canExecute=false` and no Discord live posting until separately approved.

## Previous Change

Date: 2026-07-16
Task: Install rollover-aware scanner HTF history leg loading.
Files changed: tools/automation/bridge-instrument-resolver.ts, tools/automation/bridge-instrument-resolver.test.ts, tools/automation/controlled-htf-ohlc-acquisition.ts, tools/automation/controlled-htf-ohlc-acquisition.test.ts, tools/automation/nt-scanner.ts, docs/PROJECT_STATUS.md.
Reason: A 30-day HTF preload anchored on the new active contract can miss pre-rollover history. The scanner and research tooling need one shared contract-leg policy so rollover windows load the prior front-month leg up to rollover and the new front-month leg after rollover, without rewriting old bars under the new contract.
Tests run: `npx tsx tools/automation/bridge-instrument-resolver.test.ts`; `npx tsx tools/automation/controlled-htf-ohlc-acquisition.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/controlled-htf-ohlc-acquisition.ts --start-date 2026-06-25 --end-date 2026-06-26 --instrument MES --bridge-instrument "MES 09-26" --source bridge --rollover-aware --lookback-days 30 --chunk-days 7 --out-dir tools/automation/diagnostic-reports --json`; `npx tsx tools/automation/no-chase-htf-context-sufficiency.ts --simulation-report tools/automation/diagnostic-reports/no-chase-artifact-rebuild-simulation-1784241406765.json --htf-coverage-report tools/automation/diagnostic-reports/controlled-htf-ohlc-acquisition-MES-2026-06-25-to-2026-06-26-1784243155564.json --out-dir tools/automation/diagnostic-reports --json`; `git diff --check`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run test`; `npm run lint`; `npm run build`.
Result: Focused tests, typecheck, guards, full test suite, lint, and build passed. The shared rollover planner now returns `MES 06-26:2026-05-26->2026-06-10` plus `MES 09-26:2026-06-11->2026-06-26` even when the request is anchored on active `MES 09-26`. The scanner 30-day history path now reads `market_bars`, repairs from NinjaTrader historical bars, performs segmented repair, performs trusted 5M HTF aggregation repair, and writes repaired cache rows by contract leg instead of pinning the whole range to one active contract. A real read-only `MES 09-26` anchored diagnostic loaded both rollover legs and the artifact-specific sufficiency report still marks the June 25 morning and June 26 lunch IntradayMssMicroContinuation rows sufficient, with `canExecute=false`, `publishDiscord=false`, and HTF promotion evidence allowed `0`.
Trading logic changed: No. This changes historical OHLC preload/repair source selection and diagnostics only. It does not change setup definitions, ranking, entry, stop, target, risk, invalidation, session gates, Discord publish rules, or canExecute logic.
Bridge impact: Yes, limited to historical data acquisition. Scanner HTF lookback repair now uses a rollover-aware contract-leg plan for the requested range. NinjaTrader remains the approved data source, no candles are invented, and data-limited remains the safe blocker when coverage cannot be proven.
Journal/RAG impact: None.
Supabase impact: No schema migration. Existing `market_bars.bridge_instrument` is used as intended; repaired bars are stored under their actual contract leg during normal scanner repair paths. This phase did not apply any live Supabase writes.
Known risks: The full-day acquisition report can still mark Friday post-close lower timeframes data-limited if the request asks through 23:59 ET and NinjaTrader only has bars through the 17:00 ET futures close. Artifact-specific sufficiency remains the correct proof for completed proof-bar windows.
Next recommended action: Run the prior messed-up-date investigation again with the rollover-aware scanner/data tooling in place, then decide whether the three sufficient human-review artifacts justify scanner-visible review-ticket wiring.

## Previous Change

Date: 2026-07-16
Task: Run controlled read-only HTF reload/backfill for June 25-26 no-chase artifacts.
Files changed: docs/PROJECT_STATUS.md.
Reason: The prior sufficiency pass showed the June 25 and June 26 IntradayMssMicroContinuation artifacts were data-limited because the saved HTF source ended June 18. This phase reloads rollover-aware historical HTF OHLC from the NinjaTrader bridge in read-only mode and rechecks those artifacts against the 30-calendar-day structured context rule.
Tests run: `npx tsx tools/automation/controlled-htf-ohlc-acquisition.ts --start-date 2026-06-25 --end-date 2026-06-26 --instrument MES --bridge-instrument "MES 09-26" --source bridge --rollover-aware --lookback-days 30 --chunk-days 7 --out-dir tools/automation/diagnostic-reports --json`; `npx tsx tools/automation/controlled-htf-ohlc-acquisition.ts --start-date 2026-06-25 --end-date 2026-06-26 --instrument MES --bridge-instrument "MES 06-26" --source bridge --rollover-aware --lookback-days 30 --chunk-days 7 --out-dir tools/automation/diagnostic-reports --json`; `npx tsx tools/automation/no-chase-htf-context-sufficiency.ts --simulation-report tools/automation/diagnostic-reports/no-chase-artifact-rebuild-simulation-1784241406765.json --htf-coverage-report tools/automation/diagnostic-reports/controlled-htf-ohlc-acquisition-MES-2026-06-25-to-2026-06-26-1784242436683.json --out-dir tools/automation/diagnostic-reports --json`; `git diff --check`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: The first run anchored on `MES 09-26` proved the read-only path but only covered the post-roll leg from June 11 forward, so all timeframes were still data-limited for a 30-day lookback. The second run anchored on `MES 06-26` and `--rollover-aware` loaded both legs: `MES 06-26:2026-05-26->2026-06-10` and `MES 09-26:2026-06-11->2026-06-26`. Loaded bars: 5M 6434, 15M 2146, 60M 538, 120M 282, 240M 141, with zero bridge failures. Artifact-specific sufficiency now marks 2 of 3 rebuilt artifacts sufficient: 2026-06-25 morning IntradayMssMicroContinuation SHORT through its 2026-06-25 09:35 proof bar, and 2026-06-26 lunch IntradayMssMicroContinuation SHORT through its 2026-06-26 12:20 proof bar. The June 17 AfterLunch row is data-limited against this new June 25-26-only source because that source starts May 26; it was already sufficient against the earlier broad source. `canExecute=false`, `publishDiscord=false`, and HTF promotion evidence allowed `0` remain unchanged for all 3 rows. Report paths: `tools/automation/diagnostic-reports/controlled-htf-ohlc-acquisition-MES-2026-06-25-to-2026-06-26-1784242436683.json`, `tools/automation/diagnostic-reports/controlled-htf-ohlc-source-MES-2026-06-25-to-2026-06-26-1784242436675.json`, and `tools/automation/diagnostic-reports/no-chase-htf-context-sufficiency-1784242452003.json`.
Trading logic changed: No. This was a controlled read-only historical bridge reload plus local report generation. It did not write market_bars, Supabase, RAG/journal, Discord, scanner state, setupScanner, canExecute, entry/stop/T1/T2, risk gates, or automated execution behavior.
Bridge impact: Read-only NinjaTrader historical bridge reads occurred. No bridge behavior changed and no repair writes were performed.
Journal/RAG impact: None. Local diagnostic reports only.
Supabase impact: None. `--source bridge` avoided Supabase reads and writes.
Known risks: The acquisition report's own full-day sufficiency flags 5M/15M/60M/120M as data-limited because it asks for June 26 through 23:59 ET while futures data loaded through the Friday 17:00 ET close. The artifact-specific sufficiency check is the correct read for these two rows because it requires coverage only through each completed 5M proof bar.
Next recommended action: Keep scanner-visible wiring off. Review the two now-sufficient Intraday artifacts and the already-sufficient June 17 AfterLunch artifact together as human-review-only candidates before deciding whether any narrow scanner-visible review-ticket wiring is justified.

## Previous Change

Date: 2026-07-16
Task: Check HTF context sufficiency for rebuilt no-chase artifacts.
Files changed: tools/automation/no-chase-htf-context-sufficiency.ts, tools/automation/no-chase-htf-context-sufficiency.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The rebuild simulation produced 3 human-review-only artifacts. Before any scanner-visible discussion, this phase checks whether saved structured 5M/15M/60M/120M/240M context covers each artifact's 30-calendar-day lookback through the completed 5M proof bar.
Tests run: `npx tsx tools/automation/no-chase-htf-context-sufficiency.test.ts`; `npx tsx tools/automation/no-chase-artifact-rebuild-simulation.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/no-chase-htf-context-sufficiency.ts --simulation-report tools/automation/diagnostic-reports/no-chase-artifact-rebuild-simulation-1784241406765.json --htf-coverage-report tools/automation/diagnostic-reports/controlled-htf-ohlc-acquisition-MES-2026-06-01-to-2026-07-02-1784221366520.json --out-dir tools/automation/diagnostic-reports --json`; `git diff --check`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run test`; `npm run lint`; `npm run build`.
Result: Focused tests, typecheck, guards, full test suite, lint, and build passed. The local sufficiency check reviewed the 3 rebuilt artifacts against the saved controlled HTF coverage report. One artifact is sufficient: 2026-06-17 lunch AfterLunchDriveFvgContinuation SHORT has 5M/15M/60M/120M/240M coverage from early May through its 2026-06-17 14:05 proof bar. Two artifacts remain data-limited: 2026-06-25 morning IntradayMssMicroContinuation SHORT and 2026-06-26 lunch IntradayMssMicroContinuation SHORT require coverage through June 25/26, but the saved HTF source ends June 18. `canExecute=false` and `publishDiscord=false` remain true for all 3 rows. HTF promotion evidence allowed: 0. Report paths: `tools/automation/diagnostic-reports/no-chase-htf-context-sufficiency-1784241889331.json` and `.md`.
Trading logic changed: No. This is a read-only local sufficiency report. It does not run setupScanner, change setup detection, live scanner ranking, canExecute creation, Discord posting, bridge reads, Supabase schema/writes, entry/stop/T1/T2 math, risk gates, or automated execution behavior.
Bridge impact: None in this phase. The runner reads a prior local controlled HTF coverage report only. That source report had historical live reads when it was originally created, but this phase did not perform live reads.
Journal/RAG impact: None. The runner does not write RAG/journal records.
Supabase impact: No schema migration and no Supabase reads/writes in this phase.
Known risks: The sufficient June 17 row still remains human-review-only and does not approve execution. The two Intraday rows are data-limited, not failed. They need controlled HTF data reload/backfill before scanner-visible review-ticket discussion.
Next recommended action: Keep scanner-visible wiring off. Either manually review only the June 17 AfterLunch artifact as a single sufficient-context case, or first run a controlled read-only HTF reload/backfill for June 25-26 before revisiting the Intraday artifacts.

## Previous Change

Date: 2026-07-16
Task: Simulate read-only no-chase human-review artifact rebuilds.
Files changed: tools/automation/no-chase-artifact-rebuild-simulation.ts, tools/automation/no-chase-artifact-rebuild-simulation.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The rebuild pack isolated 3 positive no-chase rows. This phase proves those rows can be reconstructed into complete local human-review artifacts while preserving `canExecute=false`, no Discord posting, no scanner execution, and no live system side effects.
Tests run: `npx tsx tools/automation/no-chase-artifact-rebuild-simulation.test.ts`; `npx tsx tools/automation/no-chase-artifact-rebuild-pack.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/no-chase-artifact-rebuild-simulation.ts --rebuild-pack tools/automation/diagnostic-reports/no-chase-artifact-rebuild-pack-1784240574825.json --out-dir tools/automation/diagnostic-reports --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `git diff --check`; `npm run test`; `npm run lint`; `npm run build`.
Result: Focused tests and typecheck passed. The simulation consumed the 10-row rebuild pack and created exactly 3 `human_review_rebuilt` artifacts: 2026-06-17 lunch AfterLunchDriveFvgContinuation SHORT (+$112.50), 2026-06-25 morning IntradayMssMicroContinuation SHORT (+$107.50), and 2026-06-26 lunch IntradayMssMicroContinuation SHORT (+$50.00). All 3 artifacts have complete entry/stop/T1/T2 fields, preserved completed-5M proof metadata, `canExecute=false`, and `publishDiscord=false`. Seven rows were rejected from simulation because they were hold/filter or exclude rows. Simulated artifact gross one-MES replay P/L: +$270.00 before commissions/slippage. Report paths: `tools/automation/diagnostic-reports/no-chase-artifact-rebuild-simulation-1784241406765.json` and `.md`.
Trading logic changed: No. This is a read-only local simulation. It does not run setupScanner, change setup detection, live scanner ranking, canExecute creation, Discord posting, bridge reads, Supabase schema/writes, entry/stop/T1/T2 math, risk gates, or automated execution behavior.
Bridge impact: None. The runner reads a local diagnostic JSON report only.
Journal/RAG impact: None. The runner does not write RAG/journal records.
Supabase impact: No schema migration and no Supabase reads/writes.
Known risks: The artifacts are not live tickets and do not validate live execution. P/L excludes commissions/slippage, uses prior saved completed 5M decision-tape research, and does not reload 30-day HTF context.
Next recommended action: Run a read-only HTF/context sufficiency check for only these 3 rebuilt artifacts before considering any scanner-visible human-review wiring.

## Previous Change

Date: 2026-07-16
Task: Build read-only no-chase artifact rebuild candidate pack.
Files changed: tools/automation/no-chase-artifact-rebuild-pack.ts, tools/automation/no-chase-artifact-rebuild-pack.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The replay phase showed 10 full-plan no-chase cases with +$173.75 gross one-MES, but not all rows deserve rebuild promotion. This phase creates a local research-only pack that separates positive replay rows from no-fill, unresolved, stopped, and ambiguous rows before any scanner-visible work.
Tests run: `npx tsx tools/automation/no-chase-artifact-rebuild-pack.test.ts`; `npx tsx tools/automation/no-chase-ohlc-proof-extractor.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/no-chase-ohlc-proof-extractor.ts --audit-dir tools/automation/discord-audit --start-date 2026-06-01 --end-date 2026-07-02 --out-dir tools/automation/diagnostic-reports --json`; `npx tsx tools/automation/no-chase-artifact-rebuild-pack.ts --proof-report tools/automation/diagnostic-reports/no-chase-ohlc-proof-extractor-1784240569590.json --out-dir tools/automation/diagnostic-reports --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `git diff --check`; `npm run test`; `npm run lint`; `npm run build`.
Result: Focused tests and typecheck passed. The rebuilt proof source again found 29 target no-chase cases, 10 full-plan replay rows, 14 proof-only missing-plan rows, and 5 no-proof rows. The rebuild pack contains all 10 full-plan rows but marks only 3 as `include_for_rebuild_review`: 2026-06-17 lunch AfterLunchDriveFvgContinuation SHORT (+$112.50), 2026-06-25 morning IntradayMssMicroContinuation SHORT (+$107.50), and 2026-06-26 lunch IntradayMssMicroContinuation SHORT (+$50.00). It holds 6 rows for filter review due to no-fill or filled-open outcomes and excludes 1 stopped row until revalidated. Pack summary: 10 rows, 3 include, 6 hold, 1 exclude, 1 AfterLunch include, 2 Intraday includes, +$173.75 total gross one-MES across the full pack. Report paths: `tools/automation/diagnostic-reports/no-chase-artifact-rebuild-pack-1784240574825.json` and `.md`.
Trading logic changed: No. This is a read-only local research pack. It does not run setupScanner, change setup detection, live scanner ranking, canExecute creation, Discord posting, bridge reads, Supabase schema/writes, entry/stop/T1/T2 math, risk gates, or automated execution behavior.
Bridge impact: None. The runner reads a local diagnostic JSON report only.
Journal/RAG impact: None. The runner does not write RAG/journal records.
Supabase impact: No schema migration and no Supabase reads/writes.
Known risks: The pack is not a ticket list and does not validate live execution. P/L excludes commissions/slippage, relies on saved completed 5M decision-tape data, does not reload 30-day HTF context, and treats no-fill/filled-open rows as filter evidence rather than promotions.
Next recommended action: Run a read-only scanner artifact rebuild simulation only for the 3 `include_for_rebuild_review` rows, proving whether the scanner can reconstruct complete human-review artifacts from saved evidence while preserving `canExecute=false` and no Discord posting.

## Previous Change

Date: 2026-07-16
Task: Replay reviewable no-chase full-plan cases from completed 5M OHLC.
Files changed: tools/automation/no-chase-ohlc-proof-extractor.ts, tools/automation/no-chase-ohlc-proof-extractor.test.ts, docs/PROJECT_STATUS.md.
Reason: The prior classifier found 10 no-chase cases with completed 5M proof and valid entry/stop/T1/T2 fields. This phase adds read-only outcome replay for those full-plan cases only, so the desk can decide whether scanner artifact rebuild work is justified before touching live behavior.
Tests run: `npx tsx tools/automation/no-chase-ohlc-proof-extractor.test.ts`; `npx tsx tools/automation/no-chase-proof-audit.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/no-chase-ohlc-proof-extractor.ts --audit-dir tools/automation/discord-audit --start-date 2026-06-01 --end-date 2026-07-02 --out-dir tools/automation/diagnostic-reports --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `git diff --check`; `npm run test`; `npm run lint`; `npm run build`.
Result: Focused tests and typecheck passed. The real replay again loaded 383 snapshots and 1,919 saved completed 5M bars, with 29 target no-chase cases, 24 local OHLC proof cases, 10 reviewable full-plan cases, 14 proof-only missing-plan cases, and 5 no-proof blocked cases. The 10 replayed full-plan cases produced 3 wins, 1 loss, 4 no-fills, 0 ambiguous outcomes, 2 filled-open/unresolved cases, and +$173.75 gross one-MES before commissions/slippage. By setup: AfterLunchDriveFvgContinuation was 3 cases for +$112.50 gross; IntradayMssMicroContinuation was 7 cases for +$61.25 gross. Report paths: `tools/automation/diagnostic-reports/no-chase-ohlc-proof-extractor-1784236957510.json` and `.md`.
Trading logic changed: No. This is read-only outcome replay inside the diagnostic extractor. It does not run setupScanner, change setup detection, live scanner ranking, canExecute creation, Discord posting, bridge reads, Supabase schema/writes, entry/stop/T1/T2 math, risk gates, or automated execution behavior.
Bridge impact: None. The runner reads saved local decision-tape 5M bars unless a local market-bars JSON is explicitly provided.
Journal/RAG impact: None. The runner does not write RAG/journal records.
Supabase impact: No schema migration and no Supabase reads/writes.
Known risks: Replay P/L is research triage only. It uses completed 5M bars from saved decision-tape data, excludes commissions/slippage, does not reload 30-day HTF context, and treats unresolved filled cases as $0 rather than inventing an exit. No-fill cases remain blocked. Proof-only missing-plan cases remain blocked because they lack full deterministic plan fields.
Next recommended action: Add a small read-only scanner artifact rebuild candidate pack for only IntradayMssMicroContinuation and AfterLunchDriveFvgContinuation full-plan no-chase cases, then compare rebuilt artifacts against these replay outcomes before any live scanner, Discord, or canExecute behavior change.

## Previous Change

Date: 2026-07-16
Task: Classify OHLC proof-found no-chase cases by full-plan readiness.
Files changed: tools/automation/no-chase-ohlc-proof-extractor.ts, tools/automation/no-chase-ohlc-proof-extractor.test.ts, docs/PROJECT_STATUS.md.
Reason: The OHLC extractor found 24 local completed-5M proof cases, but some no-chase artifacts lacked entry/stop/T1/T2. This phase adds a conservative read-only classifier so proof does not get confused with a reviewable ticket.
Tests run: `npx tsx tools/automation/no-chase-ohlc-proof-extractor.test.ts`; `npx tsx tools/automation/no-chase-proof-audit.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/no-chase-ohlc-proof-extractor.ts --audit-dir tools/automation/discord-audit --start-date 2026-06-01 --end-date 2026-07-02 --out-dir tools/automation/diagnostic-reports --json`; full verification pending below.
Result: Focused tests and typecheck passed. The updated extractor again found 24 OHLC proof cases out of 29 target no-chase cases, then classified them as 10 `reviewable_full_plan`, 14 `proof_only_missing_plan_fields`, and 5 `not_reviewable_no_ohlc_proof`. All 3 AfterLunchDriveFvgContinuation cases are full-plan reviewable. IntradayMssMicroContinuation has 7 full-plan reviewable, 14 proof-only incomplete, and 5 no-proof blocked. Report paths: `tools/automation/diagnostic-reports/no-chase-ohlc-proof-extractor-1784236475743.json` and `.md`.
Trading logic changed: No. This is a read-only research classifier inside the diagnostic extractor. It does not run setupScanner, change setup detection, live scanner ranking, canExecute creation, Discord posting, bridge reads, Supabase schema/writes, entry/stop/T1/T2 math, risk gates, or automated execution behavior.
Bridge impact: None. The runner reads saved local decision-tape 5M bars unless a local market-bars JSON is explicitly provided.
Journal/RAG impact: None. The runner does not write RAG/journal records.
Supabase impact: No schema migration and no Supabase reads/writes.
Known risks: Full-plan reviewable means the historical artifact contains completed 5M proof plus valid entry/stop/T1/T2 geometry. It is still not a live ticket, not canExecute, and not HTF 30-day sufficiency proof. The 14 proof-only cases must not become tickets until rebuild logic can produce full deterministic plan fields.
Next recommended action: Manually replay only the 10 `reviewable_full_plan` cases against chart context and outcome, then decide whether a small scanner artifact-rebuild phase is justified for Intraday/AfterLunch only. Keep TurtleSoup/Sweep strict and keep live Discord/canExecute untouched.

## Previous Change

Date: 2026-07-16
Task: Add read-only OHLC proof extractor for target no-chase cases.
Files changed: tools/automation/no-chase-ohlc-proof-extractor.ts, tools/automation/no-chase-ohlc-proof-extractor.test.ts, docs/PROJECT_STATUS.md.
Reason: The prior no-chase proof audit showed saved scanner candidate artifacts did not convert missed/no-chase positives into fresh review tickets. This phase checks whether local completed 5M OHLC later crossed or retested the candidate-owned reference line after the no-chase timestamp, without changing scanner behavior or creating tickets.
Tests run: `npx tsx tools/automation/no-chase-ohlc-proof-extractor.test.ts`; `npx tsx tools/automation/no-chase-proof-audit.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/no-chase-ohlc-proof-extractor.ts --audit-dir tools/automation/discord-audit --start-date 2026-06-01 --end-date 2026-07-02 --out-dir tools/automation/diagnostic-reports --json`; full verification pending below.
Result: Focused tests and typecheck passed. The extractor loaded 1,919 saved decision-tape completed 5M bars and reviewed the same 383 scanner snapshots / 29 target no-chase cases. Local OHLC proof was found for 24 cases: 21 of 26 IntradayMssMicroContinuation and 3 of 3 AfterLunchDriveFvgContinuation. Five Intraday cases still have no local OHLC proof. Report paths: `tools/automation/diagnostic-reports/no-chase-ohlc-proof-extractor-1784236106923.json` and `.md`.
Trading logic changed: No. This is a read-only research extractor. It does not run setupScanner, change setup detection, live scanner ranking, canExecute creation, Discord posting, bridge reads, Supabase schema/writes, entry/stop/T1/T2 math, risk gates, or automated execution behavior.
Bridge impact: None. The runner reads saved local decision-tape 5M bars unless a local market-bars JSON is explicitly provided.
Journal/RAG impact: None. The runner does not write RAG/journal records.
Supabase impact: No schema migration and no Supabase reads/writes.
Known risks: The proof-found result is not a trade ticket. Several cases have missing entry/stop/target fields in the no-chase artifact, so the result proves a possible scanner capture/rebuild gap, not executable readiness. Decision-tape OHLC is 5M-only; HTF sufficiency was not reloaded in this phase.
Next recommended action: Add a second read-only classifier over the 24 proof-found cases that separates `reviewable_full_plan` from `proof_only_missing_plan_fields`, then only consider scanner artifact rebuild logic for full-plan cases. Keep TurtleSoup/Sweep strict and keep live Discord/canExecute untouched.

## Previous Change

Date: 2026-07-16
Task: Run narrow no-chase proof audit for Intraday MSS and After-Lunch FVG continuation.
Files changed: tools/automation/no-chase-proof-audit.ts, tools/automation/no-chase-proof-audit.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: Planning review narrowed the next phase to proving whether prior positive missed/no-chase cases later produced scanner-owned completed 5M proof before any live scanner or Discord behavior change. The new audit is local/read-only and checks only `IntradayMssMicroContinuation` and `AfterLunchDriveFvgContinuation`; TurtleSoup and SweepMssFvgRetrace are intentionally out of scope and remain strict.
Tests run: `npx tsx tools/automation/no-chase-proof-audit.test.ts`; `npx tsx tools/automation/unified-desk-candidate-book-diagnostic.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/no-chase-proof-audit.ts --input-dir tools/automation/discord-audit --start-date 2026-06-01 --end-date 2026-07-02 --out-dir tools/automation/diagnostic-reports --json`; full verification pending below.
Result: Focused tests and typecheck passed. The local proof audit reviewed 383 snapshots and found 29 target no-chase cases: 26 IntradayMssMicroContinuation and 3 AfterLunchDriveFvgContinuation. Zero converted to human-review/executable review tickets with later fresh completed 5M proof; all 29 remain no-chase. Report paths: `tools/automation/diagnostic-reports/no-chase-proof-audit-1784234622948.json` and `.md`.
Trading logic changed: No. This is a read-only diagnostic/report phase. It does not change setup detection, live scanner ranking, canExecute creation, Discord posting, bridge reads, Supabase schema/writes, entry/stop/T1/T2 math, risk gates, or automated execution behavior.
Bridge impact: None. The runner reads local scanner audit JSON only.
Journal/RAG impact: None. The runner does not write RAG/journal records.
Supabase impact: No schema migration and no Supabase reads/writes.
Known risks: The audit proves the current scanner artifacts do not contain later completed-5M re-entry proof for these no-chase cases; it does not prove such proof never occurred in market data outside the saved artifacts.
Next recommended action: Keep the no-chase block intact. Do not broaden TurtleSoup/Sweep or wire unified ranking live. If further improvement is desired, build a separate after-the-fact OHLC proof extractor for the positive Intraday/AfterLunch research set to see whether the scanner failed to save proof that the market actually produced.

## Previous Change

Date: 2026-07-16
Task: Run Unified Desk Candidate Book diagnostic on June 1-July 2 scanner audit artifacts.
Files changed: src/lib/unifiedDeskCandidateBook.ts, tools/automation/unified-desk-candidate-book-diagnostic.ts, tools/automation/unified-desk-candidate-book-diagnostic.test.ts, docs/PROJECT_STATUS.md.
Reason: The prior phase built the diagnostic runner. This phase fed local scanner audit artifacts from June 1 through July 2 into the runner, using scanner-owned `normalizedPlan.setupCandidates`, `sourceCandidate`, completed 5M timestamps, and existing canExecute status. The runner now supports scanner-audit directory ingestion and evening-session diagnostics while preserving read-only/no-side-effect authority.
Tests run: `npx tsx tools/automation/unified-desk-candidate-book-diagnostic.test.ts`; `npx tsx src/lib/unifiedDeskCandidateBook.test.ts`; `npx tsc --noEmit --pretty false`; `npx tsx tools/automation/unified-desk-candidate-book-diagnostic.ts --input-dir tools/automation/discord-audit --start-date 2026-06-01 --end-date 2026-07-02 --out-dir tools/automation/diagnostic-reports --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `git diff --check`; `npm run test`; `npm run lint`; `npm run build`.
Result: Passed. Diagnostic completed with 383 snapshots, 157 same-primary, 226 unified-different-primary, 0 current-missing, 0 no-candidate, 1 executable current selection preserved, 213 human-review primaries, 164 no-chase primaries, and 0 authority/canExecute findings. The local report paths are `tools/automation/diagnostic-reports/unified-desk-candidate-book-diagnostic-1784227593597.json` and `.md`. Cross-checking against the formal replay/master desk audit shows the current unified score policy would over-promote broad SweepMssFvgRetrace human-review candidates; do not wire this into scanner visibility yet.
Trading logic changed: No. This is a read-only diagnostic loader/report phase. It does not change setup detection, live scanner ranking, canExecute creation, Discord posting, bridge reads, Supabase schema/writes, entry/stop/T1/T2 math, risk gates, or automated execution behavior.
Bridge impact: None. The runner reads local scanner audit JSON only.
Journal/RAG impact: None. The runner does not write RAG/journal records.
Supabase impact: No schema migration and no Supabase reads/writes.
Known risks: The unified book proves authority boundaries but the ranking policy is not ready for live visibility. Formal replay P/L still favors IntradayMssMicroContinuation (+$181.25) and AfterLunchDriveFvgContinuation (+$45.01) while broad TurtleSoup/Sweep human-review expansion is negative. The diagnostic also shows no AfterLunch primary promotion in this run, so that family needs targeted isolation rather than broad unified wiring.
Next recommended action: Add a narrow candidate-book scoring calibration test that keeps TurtleSoup and SweepMssFvgRetrace strict unless existing deterministic gates pass, then separately isolates Intraday MSS and After-Lunch FVG human-review candidates before any scanner-visible wiring.

## Previous Change

Date: 2026-07-16
Task: Add read-only Unified Desk Candidate Book diagnostic runner.
Files changed: src/lib/unifiedDeskCandidateBook.ts, tools/automation/unified-desk-candidate-book-diagnostic.ts, tools/automation/unified-desk-candidate-book-diagnostic.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The audit-only candidate book needed a replay-safe comparator before live wiring. The new diagnostic accepts scanner/replay snapshots, maps the existing selected candidate and existing canExecute state into the unified book, compares current selection versus the unified primary desk idea, and reports whether the unified book agrees, promotes a different human-review idea, preserves no-chase, or has no candidate. It is local/read-only and writes only optional local diagnostic JSON/Markdown output when run from the CLI.
Tests run: `npx tsx src/lib/unifiedDeskCandidateBook.test.ts`; `npx tsx tools/automation/unified-desk-candidate-book-diagnostic.test.ts`; `npx tsc --noEmit --pretty false`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run test`; `npm run lint`; `npm run build`.
Result: Passed. Full test suite exited 0. Existing research/Discord dry-run test logging and duplicate Invalid label warnings remain non-failing test output.
Trading logic changed: No. This is a read-only diagnostic runner and key export. It does not change setup detection, live scanner ranking, canExecute creation, Discord posting, bridge reads, Supabase schema/writes, entry/stop/T1/T2 math, risk gates, or automated execution behavior.
Bridge impact: None. The runner does not read live bridge data.
Journal/RAG impact: None. The runner does not write RAG/journal records.
Supabase impact: No schema migration and no Supabase reads/writes.
Known risks: The runner has synthetic replay-style test coverage and a generic JSON input contract; it has not yet been fed the full June 1-July 2 replay artifact set. Its output is diagnostic only and should not be wired into scanner behavior until real replay comparisons are reviewed.
Next recommended action: Feed the June 1-July 2 morning/lunch/evening scanner artifacts into the diagnostic runner, summarize same-primary versus unified-different-primary cases, and only then decide whether a scanner-visible human-review wiring phase is justified.

## Previous Change

Date: 2026-07-16
Task: Add audit-only Unified Desk Candidate Book contract.
Files changed: src/lib/unifiedDeskCandidateBook.ts, src/lib/unifiedDeskCandidateBook.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: Planning review identified that `canExecute` should remain the final internal gate, while all scanner ideas need one ranked audit book before any live visibility or publish behavior changes. The new builder ranks existing candidates into executable, human_review, watch, no_chase, blocked, or no_trade states while preserving model families, blockers, HTF support/conflict, 5M proof status, risk/target context, and explicit no-side-effect boundaries.
Tests run: `npx tsx src/lib/unifiedDeskCandidateBook.test.ts`; `npx tsc --noEmit --pretty false`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `git diff --check`; `npm run test`; `npm run lint`; `npm run build`.
Result: Passed. `git diff --check` reported only existing line-ending normalization warnings for touched files. The full test suite exited 0; existing Discord payload duplicate-label warnings were emitted by tests but did not fail the suite.
Trading logic changed: No. This is an audit-only contract and focused test. It does not change setup detection, ranking used by live scanner behavior, canExecute, Discord posting, bridge reads, Supabase schema/writes, entry/stop/T1/T2 math, risk gates, or automated execution behavior.
Bridge impact: None.
Journal/RAG impact: None.
Supabase impact: No schema migration and no Supabase reads/writes.
Known risks: The book is not wired into scanner/Discord behavior yet; it proves the ranking contract only. A later phase should replay real scanner cycles through the book before any live behavior change.
Next recommended action: Add a read-only diagnostic runner that compares current scanner selection versus the unified book on replay artifacts before considering scanner wiring.

## Previous Change

Date: 2026-07-16
Task: Install retest-required re-entry rule for HTF displacement continuations.
Files changed: src/lib/setupScanner.ts, src/lib/setupScanner.test.ts, src/lib/tradeDecisionPipeline.test.ts, docs/PROJECT_STATUS.md.
Reason: Formal replay/master-desk audit showed missed/no-chase continuation opportunities should not be promoted from stale first-break levels. The scanner now requires fresh completed 5M re-entry proof before HTF displacement MSS/FVG continuation promotion.
Tests run: `npx tsx src/lib/setupScanner.test.ts`; `npx tsx src/lib/tradeDecisionPipeline.test.ts`; `npx tsc --noEmit --pretty false`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run test`; `npm run lint`; `npm run build`.
Result: Passed. HTF displacement MSS continuation now rebuilds entry from the completed 5M close-through/retest plan and uses retest proof before promotion. HTF displacement FVG continuation now requires a completed 5M FVG retest/rejection re-entry plan; confirmed MSS can support confidence but does not replace the FVG retest proof.
Trading logic changed: Yes. Limited to HTF displacement continuation candidate promotion and fresh re-entry proof. Existing canExecute boundaries, bridge behavior, Discord send behavior, Supabase schema, and automated execution behavior are unchanged.
Bridge impact: None.
Journal/RAG impact: Future scanner artifacts may show stricter conditional/missing-evidence reasons for stale HTF displacement continuation candidates.
Supabase impact: No schema migration.
Known risks: Existing historical audit artifacts are not rewritten. FVG re-entry proof requires FVG formation metadata; zones without formed candle/time remain conditional instead of inventing a retest.
Next recommended action: Rerun targeted replay research for the previously positive missed/no-chase cases to measure impact before broadening this rule to other model families.

## Previous Change

Date: 2026-07-15
Task: Install TopDownFvgDecisionLadder support model.
Files changed: src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, docs/PROJECT_STATUS.md.
Reason: The scanner needed a professional top-down FVG confluence model that treats 4H/2H/1H/15M FVG stacks as directional support and decision-zone context while preserving 5M execution authority. The ladder identifies bias/support metadata, decision-zone inventory, active battlefield, completed-5M acceptance/rejection state, next HTF reaction zone, extension condition, ranking support, and ticket-builder story from scanner-owned OHLC facts.
Tests run: `npx tsx src/lib/localScannerEngine.test.ts`; `npx tsc --noEmit`; `npm run live:desk-observer -- --trade-date 2026-07-06 --instrument MES --session morning --json`; `npm run live:desk-observer -- --trade-date 2026-07-09 --instrument MES --session morning --json`; full verification pending below.
Result: Focused tests and typecheck passed. July 6 morning remained LONG with bullish FVG stack support despite a nearby opposite FVG context zone. July 9 morning routed SHORT from bearish HTF FVG stack context with zero candidate/desk conflicts.
Trading logic changed: Yes. Scanner-owned primary direction support now considers same-direction top-down HTF FVG stacks when a 5M scanner candidate already exists, and HTF FVG cascade parent selection can no longer borrow an opposite-direction active parent zone. Execution approval, canExecute, entry/stop/T1/T2 math, risk gates, bridge behavior, Supabase, and Discord send eligibility are unchanged.
Bridge impact: None.
Journal/RAG impact: DeskState records now include derived `topDownFvgDecisionLadder` metadata when current scanner code writes them.
Supabase impact: No schema migration.
Known risks: Existing audit artifacts and Discord messages are not rewritten. The ladder supports/ranks existing scanner-owned candidates only; it does not create trades without 5M evidence.
Next recommended action: Run full checks, replay morning/lunch/evening loopbacks, then commit/push and restart scanner services.

## Previous Change

Date: 2026-07-15
Task: Add behavior validation / live replay pack.
Files changed: tools/automation/behavior-validation-pack.ts, tools/automation/behavior-validation-pack.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: After the DeskPublishDecision cleanup, the project needed one repeatable read-only validation pack that proves scanner-owned DeskState, canonical publish decision, Discord visibility, suppression/hold reasons, and replay/loopback checks agree before any live-send stage or further cleanup.
Tests run: `npx tsx tools/automation/behavior-validation-pack.test.ts`; `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npx tsx tools/automation/desk-publish-contract-audit.test.ts`; `npm run diagnostic:behavior-validation -- --skip-commands --json`; `npm run diagnostic:behavior-validation -- --json`; `npm run test`; `npm run lint`; `npm run build`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`.
Result: Passed. The pack runs the existing publish-contract, no-silent-drop, active-DeskState, replay-validation, workflow-loopback, and scanner-alert fixture checks, writes only local ignored diagnostic reports, and includes a failed-high breakdown regression proving a SHORT conditional ticket remains visible with line 7618.75, entry 7608.00, stop 7626.50, T1 7607.25, T2 7603.25, and canExecute=false.
Trading logic changed: No. This is validation/reporting only. It does not change setup definitions, ranking, Discord send eligibility, canExecute, entry/stop/target math, risk gates, bridge behavior, bar-close handling, Supabase schema, or live scanner behavior.
Bridge impact: None.
Journal/RAG impact: None.
Supabase impact: No schema migration and no Supabase writes.
Known risks: The pack is read-only and does not replace a controlled live-send signoff. Live Discord posting still requires the existing live policy confirmation path.
Next recommended action: Use `npm run diagnostic:behavior-validation -- --json` before any controlled live-send stage or future visibility cleanup.

## Previous Change

Date: 2026-07-09
Task: Add daily bar-by-bar learning extract workflow.
Files changed: tools/automation/daily-bar-by-bar-learning-extract.ts, tools/automation/daily-bar-by-bar-learning-extract.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: Bar-by-bar reviews were happening manually in chat, which made it too easy for lessons to remain informal. The new workflow turns scanner decision tapes into a durable daily learning artifact with candidate outcome, best reviewed campaign, one-MES gross result, Discord/suppression context, and explicit lesson cadence.
Tests run: `npx tsx tools/automation/daily-bar-by-bar-learning-extract.test.ts`; `npx tsx tools/automation/daily-bar-by-bar-learning-extract.ts --tape tools/automation/discord-audit/scanner-decision-tape-2026-07-09-MES-lunch.json --out tools/automation/discord-audit/daily-learning-2026-07-09-MES-lunch.json --persist-rag`; `npx tsc --noEmit`; `npm run test`; `npm run workflow:loopback`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The July 9 lunch learning extract was generated locally and inserted into RAG as `LEARNING-2026-07-09-MES-LUNCH`.
Trading logic changed: No. This is post-session review and learning persistence only. It does not change setup definitions, ranking, Discord send eligibility, canExecute, entry/stop/target math, risk gates, bridge behavior, or bar-close handling.
Bridge impact: None. The extractor consumes existing scanner decision tapes and completed 5M bars already recorded in those tapes.
Journal/RAG impact: Adds optional Supabase/RAG persistence for `daily_bar_by_bar_learning_extract` records when Supabase RAG env is available; otherwise it writes a local JSON artifact and reports skipped persistence.
Supabase impact: No schema migration.
Known risks: None known for normal scanner tapes. The extractor now records source-tape quality and refuses RAG persistence for data-limited tapes with missing scanner fields, malformed completed 5M bars, missing plan snapshots, or missing visibility metadata.
Next recommended action: Run this after morning, lunch/PM, and evening sessions, then review the accumulated extracts weekly before promoting any repeated lesson into live scanner rules.

## Previous Change

Date: 2026-07-09
Task: Add single active DeskTicket and hide canExecute from trader-facing Discord tickets.
Files changed: src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, src/lib/liveDiscordPostEligibility.test.ts, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, docs/PROJECT_STATUS.md.
Reason: The scanner was producing useful candidates, but Discord could still read like multiple competing reports and expose internal canExecute churn. The new DeskTicket is a scanner-owned, single trader-facing ticket derived from existing DeskState/candidate evidence. Discord uses it as the compact ticket when present, while canExecute remains internal/audit-only.
Tests run: `npx tsx src/lib/localScannerEngine.test.ts`; `npx tsx src/lib/liveDiscordPostEligibility.test.ts`; `npx tsx tools/automation/discord-alert-format.test.ts`; `npx tsc --noEmit`; full verification pending below.
Result: Focused tests and typecheck passed. DeskState now carries `deskTicket` with one state, one primary direction, one line in the sand, one trigger, entry/stop/T1/T2 when proven, HTF status/story, and one opposite scenario. Discord Desk Play output prefers that ticket and displays `Human review only` / `No automated orders` instead of visible canExecute language.
Trading logic changed: No. This is a presentation/orchestration wrapper derived from existing scanner evidence. It does not change setup definitions, ranking, canExecute, entry/stop/target math, risk gates, bridge behavior, bar-close handling, Discord send eligibility, or Supabase schema.
Bridge impact: None.
Journal/RAG impact: Existing DeskState/RAG records get an additional derived ticket field when written by current scanner code.
Supabase impact: No schema migration.
Known risks: Existing Discord messages and older audit artifacts are not rewritten. Non-DeskTicket legacy formatter paths may still use internal authority language for audit/research outputs, but live Desk Play tickets now use the simplified ticket when DeskState is present.
Next recommended action: Restart scanner services after full checks so live DeskState/Discord output uses the single-ticket formatter.

## Previous Change

Date: 2026-07-09
Task: Cleanup chunks 3/4 - compact scanner operator logging and preserve canonical Discord formatter paths.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: The scanner already had a canonical compact cycle summary, but dry-run/disabled Discord posts could still dump full Discord JSON into operator logs. That made live troubleshooting noisy and encouraged reading logs instead of audit JSON. The cleanup keeps full evidence in audit artifacts and makes the default operator path compact.
Tests run: `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npx tsx tools/automation/discord-alert-format.test.ts`; `npm run workflow:loopback`; `npx tsc --noEmit`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `npm run test`.
Result: Passed. Dry-run/Discord-disabled scanner posts now log a single compact operator line with source, title, text length, files, and component count. Full dry-run payload JSON remains available only when `SCANNER_VERBOSE_DISCORD_PAYLOAD_LOG=true` or `--verbose-discord-payload-log true` is explicitly set. Suppression summary output is regression-tested as compact. No obsolete formatter/render path was removed because the remaining Desk Play fallback helpers are live safety fallbacks and architecture-guard protected.
Trading logic changed: No. This changes operator logging and test coverage only; it does not change canExecute, execution approval, setup definitions, ranking, risk gates, stop/target math, model definitions, bridge behavior, Discord send eligibility, or 5M bar-close handling.
Bridge impact: None.
Journal/RAG impact: None.
Supabase impact: No schema migration.
Known risks: Existing log files are not rewritten. Non-scanner research/scheduler dry-run commands may still print their own dry-run summaries by design.
Next recommended action: Use the next live scanner cycle to confirm the operator log shows one compact scanner line and compact Discord held/post lines.

## Previous Change

Date: 2026-07-09
Task: Clean Discord compact-ticket duplicate labels and false warning noise.
Files changed: tools/automation/discord-alert-format.ts, tools/automation/discord-artifact-lint.ts, docs/PROJECT_STATUS.md.
Reason: Workflow loopback still emitted Discord formatter warnings for duplicate `Invalid` labels and valid compact ticket length. The formatter needed a single final description sanitizer and the lint warning budget needed to stop flagging valid chart-backed/current-plan payloads below the true Discord safety boundary.
Tests run: `npx tsx tools/automation/discord-alert-format.test.ts`; `npm run workflow:loopback`; `npx tsc --noEmit`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `npm run test`.
Result: Passed. Compact Discord descriptions now strip duplicate `Invalid`, `Invalidation`, `Action`, `Entry`, `Stop`, `T1`, and `T2` labels at the formatter boundary. Desk Play fallback now uses the existing compact fallback helpers only near the embed-size safety boundary. Workflow loopback completed with no Discord payload warnings.
Trading logic changed: No. This is Discord formatter/lint presentation only; it does not change canExecute, execution approval, setup definitions, ranking, risk gates, stop/target math, model definitions, bridge behavior, or 5M bar-close handling.
Bridge impact: None.
Journal/RAG impact: None.
Supabase impact: No schema migration.
Known risks: Existing Discord messages and older audit artifacts are not rewritten.
Next recommended action: Restart scanner services after commit so live Discord posts use the cleaned formatter.

## Previous Change

Date: 2026-07-09
Task: Prevent blocked/stale high-confidence conditional drift and make HTF history rolling.
Files changed: src/lib/tradeDecisionPipeline.ts, src/agents/scannerPlanSelectionAgent.ts, tools/automation/discord-alert-format.ts, tools/automation/nt-scanner.ts, tools/automation/discord-scheduler.ts, related regression tests, docs/PROJECT_STATUS.md.
Reason: A July 9 AM long review posted as `LONG HIGH-CONFIDENCE CONDITIONAL` even though the app audit showed confidence 0, no executable trade, blocked target room before T1, and canExecute=false. The scanner/scheduler HTF context also needed to use an inclusive rolling 30-calendar-date history window instead of previous-month starts.
Tests run: `npx tsx tools/automation/discord-alert-format.test.ts`; `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npx tsx src/agents/scannerPlanSelectionAgent.test.ts`; `npx tsx src/lib/localScannerEngine.test.ts`; `npx tsx src/lib/tradeDecisionPipeline.test.ts`; `npx tsx src/lib/setupScanner.test.ts`; `npx tsc --noEmit`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run test`; `npm run lint`; `npm run build`.
Result: Passed. Target-room blocked-before-T1 now becomes a decision-quality hard blocker; Discord and scanner high-confidence conditional promotion refuse candidates with target-room blockers, decision-quality hard blockers, or explicit NoTrade/OutsideRules status. Scanner selection can still surface conditional review/watch plans, but canExecute=false can no longer display as `Executable`. Scanner and scheduler HTF context now use a rolling 30-calendar-date inclusive window, e.g. July 1 starts at June 2.
Trading logic changed: No. This changes Discord/scanner publication labels, selection display state, target-room quality scoring metadata, and history preload date range. It does not change canExecute, execution approval, setup definitions, entry rules, stop rules, target math, risk gates, bridge behavior, or 5M bar-close handling.
Bridge impact: None.
Journal/RAG impact: Clearer audit/Discord metadata only.
Supabase impact: No schema migration.
Known risks: Existing Discord messages and older audit artifacts are not rewritten.
Next recommended action: Restart scanner services so live Discord output uses the tightened promotion guards.

## Previous Change

Date: 2026-07-08
Task: Lock the global Discord Desk Play ticket format.
Files changed: tools/automation/discord-alert-format.ts, tools/automation/nt-scanner.ts, tools/automation/discord-artifact-lint.ts, related formatter/scanner tests, docs/DESK_STATE_PHASE_HANDOFF.md, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: The trader approved a simpler global Discord format: Primary, HTF context, Line in the Sand, Trigger, Trade Plan, Invalid, Status, Chart, and exact Entry/Stop/Protected 5M swing/T1/T2 when a priced app-owned plan exists. Watch-only output must not pretend a trade plan exists when the protected 5M swing stop is unpriced.
Tests run: `npx tsx tools/automation/discord-alert-format.test.ts`; `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npx tsx tools/automation/htf-fvg-decision-zone-alert-audit.test.ts`; `npx tsc --noEmit`; `npm run test`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. Discord Desk Play/current-plan output now uses the approved global ticket format with explicit `Line in the Sand`, `Trigger`, `Trade Plan`, priced `Protected 5M swing`, `WATCH ONLY` when the stop is not priced, clean `Invalid` wording, and explicit chart attachment status. Architecture guard and formatter/scanner tests now protect the new wording to reduce drift.
Trading logic changed: No. This is Discord/scanner presentation, lint direction inference, and documentation only; it does not change canExecute, execution approval, setup definitions, ranking, risk gates, stop/target math, model definitions, bridge behavior, or 5M bar-close handling.
Bridge impact: None.
Journal/RAG impact: None.
Supabase impact: No schema migration.
Known risks: Existing Discord messages and old audit artifacts are not rewritten.
Next recommended action: Restart scanner services after commit so live Discord posts use the approved ticket format.

## Previous Change

Date: 2026-06-30
Task: Install Phase 3/4 MTF primary-side arbitration and HTF target-to-line Discord review-map promotion.
Files changed: src/lib/localScannerEngine.ts, tools/automation/nt-scanner.ts, tools/automation/discord-alert-format.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: Counter-structure high-quality conditional maps could still read like the main play when lower-timeframe structure favored the opposite side, and HTF/FVG/session reaction levels were not always promoted into clear review-map decision lines with the next HTF line separated from app targets.
Tests run: `npx tsx tools/automation/discord-alert-format.test.ts`; `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npx tsx tools/automation/live-discord-rollout.test.ts`; `npx tsx tools/automation/no-silent-drop-policy-audit.test.ts`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `npm run test`.
Result: Passed. Phase 3 loopbacks assert deterministic MTF primary side, lower-timeframe primary arbitration, counter-structure failure-scenario labeling, aligned long/short behavior, and data-limited WAIT behavior. Phase 4 loopbacks assert LONG/SHORT reaction-line promotion, next HTF line selection, missing/complete app-target separation, and no canExecute/target-math changes. Combined verification passed with the Phase 1/2 cache-noise and no-silent-drop tests still clean.
Trading logic changed: No. This adds DeskState/Discord/audit presentation metadata only; it does not change canExecute, execution approval, setup definitions, ranking, risk gates, stop/target math, model definitions, or 5M bar-close handling.
Bridge impact: None. Uses existing structured scanner DeskState/HTF rows and level-transition fields.
Journal/RAG impact: Audit/decision-tape records can now carry structured `mtfPrimarySideArbitration` and `htfTargetToLinePromotion` metadata.
Supabase impact: No schema migration.
Known risks: None known.
Next recommended action: Restart scanner/services when ready so fresh decision tapes carry the new Phase 3/4 metadata.

## Previous Change

Date: 2026-06-30
Task: Install Phase 1/2 HTF cache-noise cleanup and no-silent-drop Discord delivery proof.
Files changed: tools/automation/market-data-store.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: Live scanner logs were repeatedly warning on malformed 120m/240m cache upserts, and review-map artifacts could show Discord eligibility without the same artifact carrying a final sent/suppressed/failed delivery outcome.
Tests run: `npx tsx tools/automation/market-data-ingestion.test.ts`; `npx tsx tools/automation/discord-alert-format.test.ts`; `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npx tsx tools/automation/live-discord-rollout.test.ts`; `npx tsx tools/automation/no-silent-drop-policy-audit.test.ts`; 2026-06-30 review-artifact final-outcome loopback; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `npm run test`.
Result: Passed. Malformed timeframe cache writes now return structured `timeframe_interval_mismatch` skip results instead of throwing repeated scanner-cycle warnings; scanner cache/history callers summarize those skips once per distinct reason. Live scanner Discord artifacts now start with `pending_final_delivery` and are stamped with `sent`, `hard_suppressed`, or `delivery_failed` after delivery resolution. The June 30 eligible review artifact loopback confirmed the final outcome can no longer remain unknown.
Trading logic changed: No. This changes cache persistence/logging and Discord audit accountability only; it does not change canExecute, execution approval, setup definitions, ranking, risk gates, stop/target math, model definitions, or 5M bar-close handling.
Bridge impact: No bridge contract change. Malformed HTF bars are not cached as fake 120m/240m candles.
Journal/RAG impact: None.
Supabase impact: No schema migration. Invalid HTF cache writes are skipped before Supabase upsert.
Known risks: None known.
Next recommended action: Install the next separate phase for primary-side arbitration and HTF target-to-line review-map promotion so bullish HTF/FVG continuation maps are not crowded out by counter-structure shorts.

## Previous Change

Date: 2026-06-30
Task: Clean active trading-language drift around target-room suppression and high-confidence conflict review visibility.
Files changed: src/config/setupRegistry.ts, src/config/setupRegistry.test.ts, src/agents/bridgeDiagnosticReplayAgent.ts, src/lib/gemini.ts, src/lib/tradeDecisionPipeline.test.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: Active metadata and advisory prompt text still carried old 2R-minimum style language after the target-room rule moved to clean 1.5R viability. The Desk Play review-map selector also excluded HTF-conflict wording before a fresh complete high-confidence conditional map could be shown as review-only, which risked hiding counter-structure plans instead of explaining them.
Tests run: `npx tsx src/config/setupRegistry.test.ts`; `npx tsx src/lib/tradeDecisionPipeline.test.ts`; `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npx tsx tools/automation/discord-alert-format.test.ts`; `npx tsx src/agents/bridgeDiagnosticReplayAgent.test.ts`; `npx tsx tools/automation/live-discord-rollout.test.ts`; `npx tsx tools/automation/no-silent-drop-policy-audit.test.ts`; active 2R-minimum language scan; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `npm run test`.
Result: Passed. Active registry/replay/Gemini language now states clean 1.5R as the target-room floor and T2 as extension/management context. Registry tests now fail if old 2R-minimum wording returns. Fresh complete high-confidence conditional Desk Play review maps are no longer silently excluded just because HTF conflict/counter-structure language is present; stale/no-chase, invalidated, duplicate, data-quality, and active-zone guards still control delivery.
Trading logic changed: No. This phase changes active wording and Discord review-map visibility routing only; it does not change canExecute, execution approval, setup math, ranking, stops, targets, risk gates, or bar-close handling.
Bridge impact: None.
Journal/RAG impact: Clearer replay/audit wording only.
Supabase impact: No schema migration.
Known risks: None known.
Next recommended action: Continue live observation for current scanner output and keep the active-language drift scan in regression checks.

## Previous Change

Date: 2026-06-30
Task: Correct target-room viability from old 2R minimum to clean 1.5R minimum with T2 extension management.
Files changed: src/types.ts, src/config/setupRegistry.ts, src/lib/setupScanner.ts, src/lib/conditionalPlanBuilder.ts, src/lib/localScannerEngine.ts, src/lib/setupScanner.test.ts, src/lib/localScannerEngine.test.ts, src/lib/tradeDecisionPipeline.test.ts, src/agents/bridgeDiagnosticReplayAgent.test.ts, tools/automation/discord-scheduler.ts, tools/automation/replay-validation-audit.ts, docs/TRADING_RULES_REFERENCE.md, docs/TRADE_DECISION_PIPELINE.md, docs/PROJECT_STATUS.md.
Reason: Scanner/setup paths still treated 2.0R as the minimum target-room blocker. The desk rule is T1=1.5R as minimum tactical viability and T2=2.0R as the second/extension target. A fresh clean-1.5R candidate must not be suppressed solely because 2R liquidity/extension is obstructed.
Tests run: `npx tsx tools/automation/discord-alert-format.test.ts`; `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npx tsx tools/automation/live-discord-rollout.test.ts`; `npx tsx tools/automation/no-silent-drop-policy-audit.test.ts`; `npx tsx src/lib/setupScanner.test.ts`; `npx tsx src/lib/localScannerEngine.test.ts`; `npx tsx src/lib/tradeDecisionPipeline.test.ts`; old 2R-minimum active-text scan; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `npm run test`.
Result: Passed. Setup scanner, conditional builder, and local scanner now use clean 1.5R as target-room viability. T2 remains the app-owned 2.0R target/extension-management level, and a fresh clean-1.5R candidate cannot be suppressed by old 2R-minimum wording. Obstacles before T1 still block/downgrade with an explicit clean-1.5R reason, while stale/no-chase/duplicate protections remain intact.
Trading logic changed: Yes, narrowly: target-room viability now keys off clean 1.5R path; 2.0R remains app T2/extension management.
Bridge impact: None. No OHLC/bar-close or bridge contract changes.
Journal/RAG impact: Candidate/audit fields may now include structured `targetRoom` status for clearer evidence.
Supabase impact: No schema migration.
Known risks: None known.
Next recommended action: Restart scanner/services and observe live health.

## Previous Change

Date: 2026-06-30
Task: Add Quant Desk stop-all and maintenance lock for Supabase IO cleanup.
Files changed: tools/automation/quant-desk-maintenance.ts, tools/automation/quant-desk-process-control.ts, tools/automation/quant-desk-process-control.test.ts, tools/automation/candle-recorder.ts, tools/automation/nt-scanner.ts, tools/automation/backfill-market-bars.ts, tools/automation/market-bars-retention.ts, tools/supervisor/index.ts, tools/supervisor/processManager.ts, tools/supervisor/status.ts, tools/supervisor/notifications.ts, tools/supervisor/supervisor.test.ts, Stop-QuantDesk-Supervisor.ps1, package.json, docs/MARKET_BARS_IO_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Tray scanner shutdown could leave supervisor-owned or orphaned candle-recorder processes running, which continued `market_bars` Supabase writes during IO recovery/retention cleanup.
Tests run: Quant Desk process-control loopback, supervisor/health tests, recorder throttle test, retention tests, retention audit test, guards, lint, and build.
Result: Passed. Stop-all process matching excludes unrelated Vite/Node processes, maintenance lock suppresses supervisor heartbeat notifications, recorder/scanner/backfill exit before writes or Discord delivery under maintenance, retention apply refuses without maintenance, and guards/lint/build completed cleanly.
Trading logic changed: No.
Bridge impact: No market-data interpretation change. Automation can now intentionally stop before bridge fetch/write loops during maintenance.
Journal/RAG impact: None.
Supabase impact: No schema migration. Retention apply is now guarded by maintenance mode and stopped automation to prevent concurrent recorder writes.
Known risks: None known.
Next recommended action: Use `npm run quant-desk:stop-all` before Supabase cleanup; clear maintenance with `npm run quant-desk:maintenance:off` before restarting live services.

## Previous Change

Date: 2026-06-29
Task: Add market_bars IO retention, recorder throttle, and backfill hardening.
Files changed: tools/automation/market-bars-retention-core.ts, tools/automation/market-bars-retention-audit.ts, tools/automation/market-bars-retention.ts, tools/automation/market-bars-retention-audit.test.ts, tools/automation/market-bars-retention.test.ts, tools/automation/candle-recorder.ts, tools/automation/candle-recorder-throttle.test.ts, tools/automation/backfill-market-bars.ts, tools/automation/backfill-market-bars.test.ts, tools/supervisor/index.ts, package.json, docs/MARKET_BARS_IO_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Supabase Disk IO warnings and local statement/upstream timeouts showed `market_bars` cache pressure. The scanner needs a rolling 30-day OHLC cache, not indefinite cache growth or repeated unchanged HTF rewrites.
Tests run: targeted market-bars retention/audit tests, recorder throttle test, backfill skip test, supervisor/health tests, guards, lint, build, and full test suite.
Result: Passed. Retention audit/dry-run loopbacks, recorder throttle loopback, selective backfill loopback, supervisor checks, guards, lint, build, and full test suite completed cleanly. Live Supabase audit/dry-run produced timeout evidence and performed no production deletion.
Trading logic changed: No.
Bridge impact: Bridge reads remain source of truth. Recorder writes are throttled for unchanged bars; scanner bridge reads are not blocked by persistence throttle.
Journal/RAG impact: None. Retention is limited to `market_bars`; RAG/research/Discord artifacts are protected.
Supabase impact: No schema migration. Added dry-run/apply retention tooling and audit receipts for `market_bars` only.
Known risks: Production deletion is not performed unless retention apply is explicitly run after dry-run review.
Next recommended action: Run `npm run market-bars:audit` and `npm run market-bars:retention:dry-run`; review receipts before any production apply.

## Previous Change

Date: 2026-06-29
Task: Harden AM REVIEW high-confidence conditional duplicate and zone-failure Discord routing.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: The 2026-06-29 AM REVIEW SHORT SweepMssFvgRetrace plan was correctly flagged as a duplicate/stale-risk candidate, but the high-confidence conditional visibility path still created repeated Discord receipts for the same alert key. The scanner now applies hard duplicate suppression after high-confidence routing and records completed-5M tactical-zone failure before delivery.
Tests run: `npx tsx tools/automation/discord-alert-format.test.ts`; `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npx tsx tools/automation/live-discord-rollout.test.ts`; `npx tsx tools/automation/no-silent-drop-policy-audit.test.ts`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `npm run test`.
Result: Passed. Loopbacks verify a fresh high-confidence conditional candidate remains eligible for one review-only delivery; same-key duplicate repost attempts are hard-suppressed even when high-confidence bypass would otherwise apply; SHORT completed 5M close above the tactical zone blocks further short trade-plan delivery; LONG completed 5M close below the tactical zone blocks further long trade-plan delivery; and the 2026-06-29 AM REVIEW replay sequence sends once, suppresses repeated same-key reposts, and records the completed-5M zone failure.
Trading logic changed: No. This is Discord routing/dedupe/stale-zone delivery suppression only. It does not change canExecute, execution approval, setup definitions, ranking, risk gates, stop/target math, 5M bar-close handling, or trade models.
Bridge impact: None.
Discord impact: Same-key high-confidence conditional candidates can publish once, but high-confidence bypass can no longer override durable duplicate suppression. Completed 5M failure of an active tactical zone blocks further live trade-plan delivery and records a stand-down/invalidation-only reason.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Observe the next live high-confidence conditional candidate to confirm decision tapes show `duplicate_suppressed_hard` for same-key refresh attempts and `zone_failed_completed_5m` when a completed 5M candle fails the active tactical zone.

## Previous Change

Date: 2026-06-29
Task: Correct Discord visibility routing for fresh high-confidence review-only conditional plans.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: The 2026-06-29 09:50 ET SHORT Intraday MSS Micro Continuation candidate had candidate-level quality 90 with complete app-owned levels, HTF context sufficient, and canExecute=false, but Discord stayed silent because the primary alert decision had already been blocked by top-level confidence/risk gating. The routing gate now allows a fresh complete high-confidence candidate to promote a blocked primary alert into REVIEW ONLY / NOT EXECUTION APPROVAL Discord visibility while stale/no-chase, invalidated, target-passed, active-zone failure, and data-limited cases remain blocked.
Tests run: `npx tsx tools/automation/discord-alert-format.test.ts`; `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npx tsx tools/automation/live-discord-rollout.test.ts`; `npx tsx tools/automation/no-silent-drop-policy-audit.test.ts`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `npm run test`.
Result: Passed. Loopbacks verify the 2026-06-29 09:50 ET high-confidence SHORT can publish as review-only despite a blocked top-level alert score; 09:55 and target-passed variants remain suppressed as missed/no-chase; data-limited context remains blocked; missing complete levels do not publish as complete plans; and watchlist/advisory behavior remains separate from live trade-plan publication.
Trading logic changed: No. This is Discord visibility/routing only. It does not change canExecute, execution approval, setup definitions, ranking, risk gates, stop/target math, 5M bar-close handling, or trade models.
Bridge impact: None.
Discord impact: Fresh complete high-confidence conditional plans can publish as review-only even when the top-level primary alert score is blocked, provided the candidate is not stale, no-chase, invalidated, or beyond targets. Suppressed high-score candidates now include an explicit visibility-check reason.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Observe the next live scanner window to confirm fresh decision tapes show the review-only visibility reason when a high-confidence candidate is fresh and complete.

## Previous Change

Date: 2026-06-29
Task: Implement HTF Target-To-Line Promotion for Discord Review Maps.
Files changed: tools/automation/nt-scanner.ts, tools/automation/discord-alert-format.ts, tools/automation/nt-scanner-alert.test.ts, tools/automation/discord-alert-format.test.ts, docs/PROJECT_STATUS.md.
Reason: High-confidence review candidates could stay silent when price reached a reaction/target level even though the trader-facing map should show the decision line, acceptance condition, next HTF/session line, failure context, no-chase status, and review-only boundary. The scanner now allows a review-only target-to-line map to post when a valid reaction and next HTF/session line are present, while true invalidation, stale targets, passed T1/T2, active-zone failure, data-limited context, and canExecute boundaries remain blocked.
Tests run: `npx tsx tools/automation/discord-alert-format.test.ts`; `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npx tsx tools/automation/live-discord-rollout.test.ts`; `npx tsx tools/automation/no-silent-drop-policy-audit.test.ts`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `npm run test`.
Result: Passed. Loopbacks verify LONG reaction 7480.00 can publish a review-only map with next HTF line 7488.25, SHORT reaction maps promote the next lower line, incomplete app levels print Entry/Stop/T1/T2 pending instead of stale/generated levels, and existing Discord lint/build/test coverage remains clean.
Trading logic changed: No. This is Discord/DeskState presentation and review-map routing only. It does not change canExecute, execution approval, setup definitions, ranking, risk gates, stop/target math, 5M bar-close handling, or trade models.
Bridge impact: None.
Discord impact: Review-only Current Desk Plan maps can now publish target-to-line context when the map is fresh and structured. Message text explicitly separates decision line/reaction, acceptance, next HTF line, failure/opposing context, no-chase, and pending app levels.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Use a fresh scanner restart/live observation to confirm new tapes show target-to-line review maps when the market reaches an HTF/session reaction and a next line is available.

## Previous Change

Date: 2026-06-28
Task: Add controlled stale-artifact cleanup inventory and proof-exclusion guard.
Files changed: tools/automation/stale-artifact-cleanup.ts, tools/automation/stale-artifact-cleanup.test.ts, tools/automation/live-desk-observer.ts, tools/supervisor/discordCardArtifactSignoff.ts, package.json, docs/STALE_ARTIFACT_CLEANUP_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Discord/chart level drift exposed a project-hygiene risk: old generated scanner reports, receipts, decision tapes, chart renders, and temp backups can be mistaken for current scanner proof. The cleanup workflow now inventories generated artifacts first, protects source/tests/fixtures/docs/RAG/research records, defaults to dry-run, archives legacy generated artifacts only with `--apply`, deletes only per-file temp/backup generated artifacts, and blocks archived/legacy paths from current proof signoff.
Tests run: `npx tsx tools/automation/stale-artifact-cleanup.test.ts`; `npx tsx tools/automation/live-observation-proof-audit.test.ts`; `npx tsx tools/supervisor/discordCardArtifactSignoff.test.ts`; `npx tsx tools/automation/stale-artifact-cleanup.ts --json-out tools/automation/diagnostic-reports/stale-artifact-cleanup-dry-run.json --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `npm run test`.
Result: Passed. Focused cleanup loopback verified default dry-run makes no filesystem changes, apply mode only mutates an isolated temp workspace, archive/delete actions are exact, archive manifest is written, source/docs/tests/fixtures/research/RAG files are protected, and archived/legacy/backup artifacts are excluded from current proof/signoff. Real workspace dry-run produced ignored report `tools/automation/diagnostic-reports/stale-artifact-cleanup-dry-run.json` with 478 keep actions, 2,387 archive candidates, 21 generated temp/backup delete candidates, and 559 review-required items. No real workspace cleanup was applied.
Trading logic changed: No. This is generated-artifact inventory, quarantine, documentation, and proof-input filtering only. It does not change setup definitions, ranking, candidate creation, candidate filtering, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: No posting/editing/deletion. Current proof/signoff now refuses archive/legacy/backup artifact paths as current evidence.
Journal/RAG impact: Research and RAG records are explicitly protected from cleanup actions.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Run dry-run inventory first, review the JSON report, and apply cleanup only after the operator confirms the archive/delete candidates are safe.

## Previous Change

Date: 2026-06-28
Task: Fix open-market candle recorder heartbeat active-contract drift.
Files changed: tools/automation/candle-recorder.ts, tools/automation/bridge-instrument-resolver.test.ts, docs/PROJECT_STATUS.md.
Reason: During an open Sunday futures session, the supervisor scanner resolved root `MES` to active contract `MES 09-26`, but the candle recorder kept polling raw `MES`, causing repeated `Instrument not found: MES` warnings and a false recorder heartbeat issue. The recorder now preserves the configured root while refreshing the active bridge contract inside every polling cycle before OHLC fetch.
Tests run: `npx tsx tools/automation/bridge-instrument-resolver.test.ts`; `npm run nt:candle-recorder -- --instrument MES --bridge-instrument MES --bridge-url http://127.0.0.1:8765 --once --bar-time-zone eastern`; supervisor restart/status check; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run guard:bridge-contracts`; `npm run lint`; `npm run build`; `npm run test`.
Result: Passed. Focused recorder loopback resolved root `MES` to active bridge contract `MES 09-26` and upserted 600 bars across 5m, 15m, 60m, 120m, and 240m. After supervisor restart, scanner and candle-recorder were both running, NinjaTrader bridge health reported `defaultInstrument=MES 09-26`, and recorder heartbeat was `ok` with 600 bars processed.
Trading logic changed: No. This only changes recorder bridge-instrument selection before OHLC ingestion. It does not change setup definitions, ranking, candidate creation, candidate filtering, entries, stops, targets, risk, invalidation, bar-close handling, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: Recorder now re-resolves root/stale bridge instruments from NinjaTrader bridge health each cycle so market_bars ingestion does not stay pinned to an unfetchable root symbol after market open, bridge refresh, or rollover.
Discord impact: None directly. The fix reduces false supervisor recorder-heartbeat alerts caused by stale recorder ingestion.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Continue live observation during the evening scanner window. If a future alert says recorder heartbeat needs attention while the market is open, first check whether heartbeat `bridgeInstrument` is the resolved active contract and whether NinjaTrader bridge health exposes a matching `defaultInstrument`.

## Previous Change

Date: 2026-06-27
Task: Install Phase 9J live-observation proof audit.
Files changed: tools/automation/live-observation-proof-audit.ts, tools/automation/live-observation-proof-audit.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 9H completed the current audit/loopback side. The next practical risk is accepting fresh scanner output without a repeatable post-restart proof path, so this phase adds a read-only audit that verifies the live-observation signoff command, loopback flag, authority boundary, scanner-restart timestamp filter, runbook commands, and Phase 9H precondition are wired.
Tests run: `npm run diagnostic:live-observation-proof -- --json`; `npx tsx tools/automation/live-observation-proof-audit.test.ts`; `npx tsx tools/automation/htf-fvg-decision-zone-alert-audit.test.ts`; `npx tsc --noEmit`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --live-observation-signoff --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run test`; `npm run build`.
Result: Passed. The focused Phase 9J audit reported `status=pass`, 0 findings, supervisor live-observation command present, loopback flag present, read-only authority boundary present, scanner-restart timestamp filter present, runbook command present, and Phase 9H precondition present. Standard workflow loopback reported 33 pass, 0 fail, 14 skipped optional/full/real-tape checks. Real-tape live-observation plus card-signoff loopback reported 37 pass, 0 fail, 10 skipped optional checks. Full test suite, TypeScript, required guards, lint, and build passed.
Trading logic changed: No. This is read-only audit tooling, loopback coverage, and documentation only. It does not change setup definitions, ranking, candidate creation, candidate filtering, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None at runtime. The audit does not post, route, suppress, edit, or delete messages.
Journal/RAG impact: None at runtime.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Run the live-observation proof after the next scanner restart with fresh market data using `npm run workflow:loopback -- --real-tapes --live-observation-signoff --discord-card-signoff --trade-date=<date> --instrument=MES --session=<session> --json`. Add new code only if that fresh tape exposes a routing or artifact gap.

## Previous Change

Date: 2026-06-26
Task: Install Phase 9H HTF FVG decision-zone alert audit.
Files changed: tools/automation/htf-fvg-decision-zone-alert-audit.ts, tools/automation/htf-fvg-decision-zone-alert-audit.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/DESK_STATE_PHASE_HANDOFF.md, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 9H runtime visibility already existed, but the desk needed a standalone loopback audit proving Current Desk Plan Discord output keeps HTF FVG decision-zone context visible with line, why, hold, fold, no-chase, parent reaction, cascade, watch-only/no-priced-stop wording, and no-authority-change boundaries.
Tests run: `npm run diagnostic:htf-fvg-decision-zone-alert -- --json`; `npx tsx tools/automation/htf-fvg-decision-zone-alert-audit.test.ts`; `npx tsx tools/automation/replay-validation-audit.test.ts`; `npx tsc --noEmit`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run test`; `npm run build`.
Result: Passed. The focused Phase 9H audit reported `status=pass`, 0 findings, FVG decision-zone block rendered, line in the sand rendered, why/hold/fold rendered, no-chase rendered, HTF parent reaction rendered, HTF FVG cascade rendered, watch-only/no-priced-stop wording preserved, and no-authority-change true. Standard workflow loopback reported 32 pass, 0 fail, 14 skipped optional/full/real-tape checks. Real-tape card-signoff workflow loopback reported 35 pass, 0 fail, 11 skipped optional checks. Full test suite, TypeScript, required guards, lint, and build passed.
Trading logic changed: No. This is read-only audit tooling, loopback coverage, and documentation only. It does not change setup definitions, ranking, candidate creation, candidate filtering, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None at runtime. The audit renders a synthetic payload through the existing formatter; it does not post, route, suppress, edit, or delete messages.
Journal/RAG impact: None at runtime.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Phase 9 is complete from the current audit/loopback side. Next practical phase should be live-observation proof on fresh scanner output after restart/market data is active, then only add new code if live tapes expose a routing gap.

## Previous Change

Date: 2026-06-26
Task: Install Phase 9F replay validation audit.
Files changed: tools/automation/replay-validation-audit.ts, tools/automation/replay-validation-audit.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/DESK_STATE_PHASE_HANDOFF.md, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 9F replay verdicts already existed inside the bridge diagnostic replay agent; the desk needed a standalone audit/loopback check proving watch-before-plan, line metadata, promotion correctness, no-chase, explained no-trade, consumer alignment, and no-authority-change boundaries.
Tests run: `npm run diagnostic:replay-validation -- --json`; `npx tsx tools/automation/replay-validation-audit.test.ts`; `npx tsx tools/automation/watch-to-plan-promotion-audit.test.ts`; `npx tsc --noEmit`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run test`; `npm run build`.
Result: Passed. The focused Phase 9F replay validation audit reported `status=pass`, 0 findings, 3 replay cycles, watch-before-move pass, line metadata pass, promotion correctness pass, no-chase preservation pass, explained no-trade pass, consumer alignment pass, and no-authority-change true. Standard workflow loopback reported 31 pass, 0 fail, 14 skipped optional/full/real-tape checks. Real-tape card-signoff workflow loopback reported 34 pass, 0 fail, 11 skipped optional checks. Full test suite, TypeScript, required guards, lint, and build passed.
Trading logic changed: No. This is read-only audit tooling, loopback coverage, and documentation only. It does not change setup definitions, ranking, candidate creation, candidate filtering, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None at runtime. The audit verifies replay metadata only; it does not post, route, suppress, edit, or delete messages.
Journal/RAG impact: None at runtime.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Install Phase 9H HTF FVG decision-zone alert audit. After that, Phase 9 should be complete unless live observation exposes a new routing gap.

## Previous Change

Date: 2026-06-26
Task: Install Phase 9E watch-to-plan promotion audit.
Files changed: tools/automation/watch-to-plan-promotion-audit.ts, tools/automation/watch-to-plan-promotion-audit.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/DESK_STATE_PHASE_HANDOFF.md, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Before changing watch-to-plan behavior, the desk needs a repeatable audit proving `DeskState.promotion` shows continuous watch -> conditional -> human-review-ready -> posted-plan metadata with proof requirements, blockers, replay validation, `canPromoteNow=false`, and no-authority-change boundaries.
Tests run: `npx tsx tools/automation/watch-to-plan-promotion-audit.test.ts`; `npm run diagnostic:watch-to-plan-promotion -- --json`; `npx tsx tools/automation/discord-watch-alert-audit.test.ts`; `npx tsx tools/automation/active-desk-state-audit.test.ts`; `npx tsx tools/automation/candidate-lifecycle-trace-audit.test.ts`; `npx tsx tools/automation/trade-decision-map-audit.test.ts`; `npx tsx src/lib/localScannerEngine.test.ts`; `npx tsc --noEmit`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run test`; `npm run build`.
Result: Passed. The focused Phase 9E audit reported `status=pass`, 0 findings, 4 DeskState snapshots audited, stages `watch -> conditional -> human_review_ready -> posted_plan`, watch-before-plan true, promotion path observed, promotion proof metadata present, canExecute boundary preserved, no-chase preserved, scanner source-of-truth aligned, Discord/RAG/UI alignment true, and `canPromoteNow=false` for every snapshot. Standard workflow loopback reported 30 pass, 0 fail, 14 skipped optional/full/real-tape checks. Real-tape card-signoff workflow loopback reported 33 pass, 0 fail, 11 skipped optional checks. Full test suite, TypeScript, required guards, lint, and build passed.
Trading logic changed: No. This is read-only audit tooling, loopback coverage, and documentation only. It does not change setup definitions, ranking, candidate creation, candidate filtering, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None at runtime. The audit verifies promotion metadata that Discord/RAG/UI consumers may inspect, but it does not post, route, suppress, edit, or delete messages.
Journal/RAG impact: None at runtime. The audit reads scanner DeskState metadata and does not write records.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Install Phase 9F replay-validation audit refresh only if we need a standalone loopback harness for replay verdicts. Existing replay validation is already covered by `bridgeDiagnosticReplayAgent` and the 9E audit.

## Previous Change

Date: 2026-06-26
Task: Install Phase 9D Discord watch alert audit.
Files changed: tools/automation/discord-watch-alert-audit.ts, tools/automation/discord-watch-alert-audit.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/DESK_STATE_PHASE_HANDOFF.md, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Before changing Discord watch behavior, the desk needs a repeatable audit proving watch alerts tell the trader what is forming with the line in the sand, completed-5M trigger, invalidation, stand-down/no-chase instruction, and explicit not-execution-approval/canExecute boundary language.
Tests run: `npx tsx tools/automation/discord-watch-alert-audit.test.ts`; `npm run diagnostic:discord-watch-alert -- --json`; `npx tsx tools/automation/active-desk-state-audit.test.ts`; `npx tsx tools/automation/candidate-lifecycle-trace-audit.test.ts`; `npx tsx tools/automation/trade-decision-map-audit.test.ts`; `npx tsx src/lib/localScannerEngine.test.ts`; `npx tsc --noEmit`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run test`; `npm run build`.
Result: Passed. The focused Phase 9D audit reported `status=pass`, 0 findings, 1 watch alert audited, watch visibility observed, line in the sand present, completed-5M trigger present, invalidation present, stand-down/no-chase present, not-execution-approval present, canExecute boundary preserved, and prediction/execution language blocked. Standard workflow loopback reported 29 pass, 0 fail, 14 skipped optional/full/real-tape checks. Real-tape card-signoff workflow loopback reported 32 pass, 0 fail, 11 skipped optional checks. Full test suite, TypeScript, required guards, lint, and build passed.
Trading logic changed: No. This is read-only audit tooling, loopback coverage, and documentation only. It does not change setup definitions, ranking, candidate creation, candidate filtering, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None at runtime. The audit verifies watch alert wording and visibility metadata that Discord may consume, but it does not post, route, suppress, edit, or delete messages.
Journal/RAG impact: None at runtime. The audit reads scanner DeskState metadata and does not write records.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Install Phase 9E watch-to-plan promotion audit/design. This next phase should remain no-authority-change unless explicitly approved; it should prove watch-to-conditional/human-review continuity before any behavior change.

## Previous Change

Date: 2026-06-26
Task: Install Phase 9C active DeskState audit.
Files changed: tools/automation/active-desk-state-audit.ts, tools/automation/active-desk-state-audit.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/DESK_STATE_PHASE_HANDOFF.md, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Before changing DeskState behavior, the desk needs a repeatable audit proving each active DeskState snapshot is the scanner-owned source of truth and stays aligned with visibility metadata, candidate lifecycle trace, promotion path, no-chase/completed-5M language, and `canExecute` boundaries.
Tests run: `npx tsx tools/automation/active-desk-state-audit.test.ts`; `npm run diagnostic:active-desk-state -- --json`; `npx tsx tools/automation/candidate-lifecycle-trace-audit.test.ts`; `npx tsx tools/automation/trade-decision-map-audit.test.ts`; `npx tsx src/lib/localScannerEngine.test.ts`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run test`; `npx tsc --noEmit`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The focused Phase 9C audit reported `status=pass`, 0 findings, 2 DeskState snapshots, 1 watch snapshot, 1 plan/review/conditional snapshot, source-of-truth aligned, visibility aligned, promotion path observed, canExecute boundary preserved, no-chase/completed-5M language preserved, and 7 replay findings emitted as explanatory replay notes. Standard workflow loopback reported 28 pass, 0 fail, 14 skipped optional/full/real-tape checks. Real-tape card-signoff workflow loopback reported 31 pass, 0 fail, 11 skipped optional checks. Full test suite, TypeScript, required guards, lint, and build passed.
Trading logic changed: No. This is read-only audit tooling, loopback coverage, and documentation only. It does not change setup definitions, ranking, candidate creation, candidate filtering, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None at runtime. The audit verifies DeskState/visibility metadata that Discord may consume, but it does not post, route, suppress, edit, or delete messages.
Journal/RAG impact: None at runtime. The audit reads scanner DeskState metadata and does not write records.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Install Phase 9D Discord watch alert audit.

## Previous Change

Date: 2026-06-26
Task: Install Phase 9B candidate lifecycle trace audit.
Files changed: tools/automation/candidate-lifecycle-trace-audit.ts, tools/automation/candidate-lifecycle-trace-audit.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/DESK_STATE_PHASE_HANDOFF.md, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Before changing candidate lifecycle behavior, the desk needs a repeatable audit proving the existing lifecycle trace explains created candidates, selected candidate, highest-ranked candidate, best long/short ideas, filtered-out candidates, Discord send/suppress reason, missing proof, and next trigger.
Tests run: `npx tsx tools/automation/candidate-lifecycle-trace-audit.test.ts`; `npm run diagnostic:candidate-lifecycle-trace -- --json`; `npx tsx tools/automation/trade-decision-map-audit.test.ts`; `npx tsx src/lib/localScannerEngine.test.ts`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run test`; `npx tsc --noEmit`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The focused Phase 9B audit reported `status=pass`, 0 findings, 3 fixture candidates, 3 created candidates, 2 filtered candidates, highest-ranked candidate present, best long present, best short present, selected candidate present, copied Discord decision present, 4 missing-proof items, and next trigger present. Standard workflow loopback reported 27 pass, 0 fail, 14 skipped optional/full/real-tape checks. Real-tape card-signoff workflow loopback reported 30 pass, 0 fail, 11 skipped optional checks. Full test suite, TypeScript, required guards, lint, and build passed.
Trading logic changed: No. This is read-only audit tooling, loopback coverage, and documentation only. It does not change setup definitions, ranking, candidate creation, candidate filtering, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None at runtime. The audit copies and verifies existing Discord send/suppress decision metadata but does not post, route, suppress, edit, or delete messages.
Journal/RAG impact: None at runtime. The audit reads scanner lifecycle metadata and does not write records.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Install Phase 9C active DeskState audit.

## Earlier Change

Date: 2026-06-26
Task: Install Phase 9A trade decision map audit.
Files changed: tools/automation/trade-decision-map-audit.ts, tools/automation/trade-decision-map-audit.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/DESK_STATE_PHASE_HANDOFF.md, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Before changing any behavior, the desk needs a repeatable inventory of the current setup/model hierarchy: model name, session window, required evidence, rank weight, watch/plan/Discord/execution eligibility, canExecute relationship, and known suppression paths.
Tests run: `npx tsx tools/automation/trade-decision-map-audit.test.ts`; `npm run diagnostic:trade-decision-map -- --json`; `npx tsx src/config/setupRegistry.test.ts`; `npx tsx src/lib/localScannerEngine.test.ts`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run test`; `npx tsc --noEmit`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The focused Phase 9A test verified registry coverage, read-only/no-authority-change boundaries, role coverage, and key human-review model presence. The real trade decision map audit scanned `src/config/setupRegistry.ts` and `src/lib/localScannerEngine.ts`, reported `status=pass`, 0 findings, and covered 33/33 setup registry entries: 9 primary models, 7 supporting-evidence entries, 17 deprecated entries, 3 human-review-only entries, and 6 execution-eligible metadata entries. Standard workflow loopback reported 26 pass, 0 fail, 14 skipped optional/full/real-tape checks. Real-tape card-signoff workflow loopback reported 29 pass, 0 fail, 11 skipped optional checks. Full test suite, TypeScript, required guards, lint, and build passed.
Trading logic changed: No. This is read-only audit tooling, loopback coverage, and documentation only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None at runtime. The audit inventories Discord eligibility metadata but does not post, route, suppress, edit, or delete messages.
Journal/RAG impact: None at runtime. The audit reads registry/scanner metadata and does not write records.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Install Phase 9B candidate lifecycle trace audit.

## Earlier Change

Date: 2026-06-26
Task: Install Phase 8.6 no silent drop policy audit.
Files changed: tools/automation/no-silent-drop-policy-audit.ts, tools/automation/no-silent-drop-policy-audit.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/DESK_STATE_PHASE_HANDOFF.md, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Meaningful structured OHLC evidence must not disappear from desk awareness without a visible lifecycle state and explicit reason. Blocked execution can remain blocked, full-plan Discord can remain strict, and `canExecute` remains the execution boundary, but structured conditional/blocked/missed/no-trade/data-limited candidates need traceable visibility metadata.
Tests run: `npx tsx tools/automation/no-silent-drop-policy-audit.test.ts`; `npm run diagnostic:no-silent-drop -- --json`; `npx tsx src/lib/localScannerEngine.test.ts`; `npx tsx src/agents/scannerPlanSelectionAgent.test.ts`; `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run test`; `npx tsc --noEmit`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The focused Phase 8.6 test verified the pass case, missing visibility-mode failure, missing structured-evidence failure, and read-only/no-authority-change boundaries. The real no-silent-drop audit scanned `src/lib/localScannerEngine.ts` and reported `status=pass`, 0 findings. Standard workflow loopback reported 25 pass, 0 fail, 14 skipped optional/full/real-tape checks. Real-tape card-signoff workflow loopback reported 28 pass, 0 fail, 11 skipped optional checks. Full test suite, TypeScript, required guards, lint, and build passed.
Trading logic changed: No. This is read-only audit tooling, loopback coverage, and documentation only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None at runtime. The audit verifies visibility states and reasons but does not post, route, suppress, edit, or delete messages.
Journal/RAG impact: None at runtime. The audit verifies lifecycle/DeskState visibility metadata but does not write records.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: After Phase 8.6 passes, install Phase 9A trade decision map audit.

Date: 2026-06-26
Task: Install Phase 8.55 DeskState responsibility audit.
Files changed: src/agents/scannerPlanSelectionAgent.ts, tools/automation/deskstate-responsibility-audit.ts, tools/automation/deskstate-responsibility-audit.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/DESK_STATE_PHASE_HANDOFF.md, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: The workflow needs scanner-owned `DeskState`/visibility metadata to remain the single source of truth for active trade visibility. Discord, RAG, UI, and review agents may summarize/store/audit that state, but must not become independent setup scanners, trade-decision owners, conditional-plan builders, or silent suppressors.
Tests run: `npx tsx tools/automation/deskstate-responsibility-audit.test.ts`; `npm run diagnostic:deskstate-responsibility -- --json`; `npx tsx src/config/responsibilityRegistry.test.ts`; `npx tsx src/agents/scannerPlanSelectionAgent.test.ts`; `npx tsx tools/automation/discord-alert-format.test.ts`; `npx tsx tools/automation/discord-rag-persistence.test.ts`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run test`; `npx tsc --noEmit`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The focused Phase 8.55 test verified pass, forbidden ownership import failure, missing registry marker failure, and read-only/no-authority-change boundaries. The real responsibility audit scanned 6 live responsibility surfaces and reported `status=pass`, 0 findings. Standard workflow loopback reported 24 pass, 0 fail, 14 skipped optional/full/real-tape checks. Real-tape card-signoff workflow loopback reported 27 pass, 0 fail, 11 skipped optional checks. Full test suite, TypeScript, required guards, lint, and build passed.
Trading logic changed: No. This is read-only audit tooling, loopback coverage, and documentation only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None at runtime. The new audit protects Discord formatter/scheduler responsibility boundaries but does not post, route, suppress, edit, or delete messages.
Journal/RAG impact: None at runtime. The new audit verifies scanner automation carries `DeskState` evidence downstream but does not write records.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: After Phase 8.55 passes, install Phase 8.6 no silent drop policy.

Date: 2026-06-26
Task: Install Phase 8.5 authority language cleanup.
Files changed: src/lib/localScannerEngine.ts, tools/automation/nt-scanner.ts, tools/automation/discord-scheduler.ts, tools/automation/authority-language-audit.ts, tools/automation/authority-language-audit.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/DESK_STATE_PHASE_HANDOFF.md, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 8.45 identified authority-language drift risk. Live scanner and Discord surfaces needed precise registered/active/watch/plan/Discord/execution/human-review wording so model registration or visibility cannot be confused with execution approval.
Tests run: `npx tsx tools/automation/authority-language-audit.test.ts`; `npm run diagnostic:authority-language -- --json`; `npx tsx src/lib/localScannerEngine.test.ts`; `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npx tsx tools/automation/discord-scheduler-provenance.test.ts`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run test`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The focused Phase 8.5 test verified vague phrase failure, compatibility alias allowance, missing required term failure, and read-only/no-authority-change boundaries. The real authority-language audit scanned 7 live authority surfaces and reported `status=pass`, 0 findings, and all required terms present. It also caught and drove cleanup of three live wording issues: scanner heartbeat `Approved Models`, weekly scheduler `Approved Models For The Week`, and weekly scheduler `approved model tells us WHEN`. Standard workflow loopback reported 23 pass, 0 fail, 14 skipped optional/full/real-tape checks. Real-tape card-signoff workflow loopback reported 26 pass, 0 fail, 11 skipped optional checks. Full test suite, required guards, lint, and build passed.
Trading logic changed: No. This is live wording/audit tooling and documentation only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: Presentation wording only for scanner heartbeat/weekly scheduler labels. No posting, routing, suppression, cadence, webhook, or outcome-button behavior changed.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Phase 8.55 collapse agent responsibilities around DeskState: document/enforce that scanner-owned DeskState/visibility metadata is the single source of truth for Discord/RAG/UI summaries, without changing trade approvals or gates.

Date: 2026-06-26
Task: Install Phase 8.45 obsolete and dirty code cleanup audit.
Files changed: tools/automation/obsolete-dirty-code-cleanup-audit.ts, tools/automation/obsolete-dirty-code-cleanup-audit.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/DESK_STATE_PHASE_HANDOFF.md, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Before adding more DeskState/visibility structure, the project needs a repeatable audit that inventories obsolete wording, duplicate persistence risk, Gemini/advisory active-path risk, no-trade collapse risk, and hardcoded-window drift without deleting trading-path code on weak evidence.
Tests run: `npx tsx tools/automation/obsolete-dirty-code-cleanup-audit.test.ts`; `npm run diagnostic:obsolete-dirty-code-cleanup -- --json`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run test`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The focused Phase 8.45 test verified removal-ready, deferred, canonical-window exclusion, and read-only authority boundaries. The real repo audit scanned 405 files and reported 490 deferred review candidates, 0 removal-ready live-code candidates, and 0 protected/current-contract findings. The deferred inventory grouped as 365 legacy approved-authority-language references, 109 hardcoded active-window strings requiring trace review, and 16 Discord no-trade collapse risk branches requiring visibility review. Standard workflow loopback reported 22 pass, 0 fail, 14 skipped optional/full/real-tape checks. Real-tape card-signoff workflow loopback reported 25 pass, 0 fail, 11 skipped optional checks. Full test suite, required guards, lint, and build passed. No code removal was performed because the audit did not prove any live path was unused, superseded, duplicated, or unsafe.
Trading logic changed: No. This is read-only audit tooling and documentation only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None. The audit does not post, edit, delete, route, or suppress Discord messages.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known. Deferred findings are inventory only and should not be deleted without later proof.
Next recommended action: Phase 8.5 authority language cleanup: replace vague approved-model/setup wording with precise authority metadata and user-facing language without changing gates.

## Previous Change

Date: 2026-06-26
Task: Install Phase 17F Discord card artifact metadata contract signoff.
Files changed: tools/supervisor/discordCardArtifactSignoff.ts, tools/supervisor/discordCardArtifactSignoff.test.ts, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 17D verified card artifacts and Phase 17E polished card subtitles, but the artifact signoff still accepted any non-empty renderer contract instead of the current approved renderer metadata.
Tests run: `npx tsx tools/supervisor/discordCardArtifactSignoff.test.ts`; `npm run supervisor:discord-card-signoff -- --trade-date 2026-06-26 --instrument MES --session morning --json`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The focused Phase 17F test verified ready, missing-chart blocked, unsafe-recovery blocked, missing-RAG-marker blocked, stale-render-contract blocked, attachment-planVersion mismatch blocked, and missing-generatedAt blocked paths. The standalone June 26 morning card signoff returned `status=ready`, 1 scanner report, 1 matching Discord receipt, HTTP 200, safe recovery boundaries, RAG marker attached, readable chart PNG, readable level-map PNG, `chart-markup-renderer`, current renderer contract, matching attachment planVersionId, valid attachment generatedAt, and no failures. The standard workflow loopback reported 21 pass, 0 fail, 14 skipped optional/full/real-tape checks. The real-tape card-signoff loopback reported 24 pass, 0 fail, 11 skipped optional checks. Required guards, lint, and build passed.
Trading logic changed: No. This is read-only artifact metadata signoff only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None. The signoff reads local scanner reports, receipts, and chart artifact metadata only; it does not post, edit, delete, or route Discord messages.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Ready for the next explicitly scoped phase.

## Previous Change

Date: 2026-06-26
Task: Install Phase 17E Discord card subtitle visual polish.
Files changed: tools/automation/chart-markup-renderer.ts, tools/automation/chart-markup-renderer.test.ts, docs/PROJECT_STATUS.md.
Reason: Phase 17D proved card artifact readiness, but visual QA found long setup subtitles could truncate awkwardly on Discord chart and level-map cards even though required trade levels remained readable.
Tests run: `npx tsx tools/automation/chart-markup-renderer.test.ts`; `npx tsx tools/supervisor/discordCardArtifactSignoff.test.ts`; generated fresh Phase 17E chart and level-map visual QA samples with the current renderer and inspected both PNGs; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. Renderer tests confirm long model names now use concise card-facing labels instead of awkward subtitle truncation. Fresh visual QA samples showed the main banner, sidebar model line, and level-map subtitle readable with action, entry zone, stop, T1/T2, runner, right-side price labels, and decision-support footer intact. Temporary QA images were removed before commit. The standard workflow loopback reported 21 pass, 0 fail, 14 skipped optional/full/real-tape checks. The real-tape card-signoff loopback reported 24 pass, 0 fail, 11 skipped optional checks. Required guards, lint, and build passed.
Trading logic changed: No. This is renderer display-label polish only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: Presentation only for generated chart/level-map card subtitles. It does not post, edit, delete, or route Discord messages.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Ready for the next explicitly scoped phase.

## Previous Change

Date: 2026-06-26
Task: Install Phase 17D Discord card artifact signoff.
Files changed: tools/supervisor/discordCardArtifactSignoff.ts, tools/supervisor/discordCardArtifactSignoff.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 17C proved live-observation and evidence-summary readiness, but posted Discord cards still needed a formal read-only signoff that joins scanner reports to Discord receipts and chart artifacts.
Tests run: `npx tsx tools/supervisor/discordCardArtifactSignoff.test.ts`; `npm run supervisor:discord-card-signoff -- --trade-date 2026-06-26 --instrument MES --session morning --json`; visual QA inspection of `tools/automation/chart-markups/scanner-morning-2026-06-26-MES-1782481715384.png` and `tools/automation/chart-markups/scanner-morning-2026-06-26-MES-level-map-1782481715909.png`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --discord-card-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The focused Phase 17D test verified ready, missing-chart blocked, unsafe-recovery blocked, and missing-RAG-marker blocked paths. The standalone June 26 morning card signoff returned `status=ready`, 1 scanner report, 1 matching Discord receipt, HTTP 200, safe recovery boundaries, RAG marker attached, readable chart PNG, readable level-map PNG, and `chart-markup-renderer` contract present. Visual QA found the actual card artifacts readable for main levels, status, action, entry zone, stop, T1/T2, runner, and decision-support language; the setup subtitle truncation is non-blocking. The standard workflow loopback reported 21 pass, 0 fail, 14 skipped optional/full/real-tape checks. The real-tape card-signoff loopback reported 24 pass, 0 fail, 11 skipped optional checks. Required guards, lint, and build passed.
Trading logic changed: No. This is read-only artifact/signoff tooling only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None. The signoff reads local scanner reports, receipts, and chart artifact files only; it does not post, edit, or delete Discord messages.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known. Non-blocking visual polish remains: the chart/level-map setup subtitle can truncate on long setup names, but required action and level fields remain readable.
Next recommended action: Ready for the next explicitly scoped phase; if continuing the hardening path, make the next phase visual-polish only for long card subtitles, with no scanner/trading behavior changes.

## Previous Change

Date: 2026-06-26
Task: Install Phase 17C required evidence-summary live-observation workflow.
Files changed: tools/automation/new-project-workflow-loopback.ts, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 17B proved fresh live-tape observation, but end-of-day signoff still needed workflow support for `--require-evidence-summary` after creating and verifying the evidence bundle.
Tests run: `npm run workflow:loopback -- --real-tapes --eod-bundle --eod-summary --live-observation-signoff --require-evidence-summary --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run supervisor:live-observation-signoff -- --trade-date 2026-06-26 --instrument MES --session morning --require-evidence-summary --json`; `npm run supervisor:eod-summary -- --trade-date 2026-06-26 --instrument MES --session morning --json`; `npm run workflow:loopback -- --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The required-evidence real-tape workflow reported 26 pass, 0 fail, 7 skipped optional checks; it created the June 26 morning evidence bundle, verified evidence summary ready, then ran `live-observation-signoff-current-tape` with `--require-evidence-summary=pass`. The standalone required live-observation signoff returned `status=ready`, supervisor Phase 6 `ready/pass`, Discord signoff `ready`, Phase 4 failures `0`, Phase 5 failures `0`, 8 active HTF FVG routing events, 8 Phase 5 contract events, evidence summary `ready`, and no failures. The standard workflow loopback reported 20 pass, 0 fail, 13 skipped optional/full/real-tape checks. Required guards, lint, and build passed.
Trading logic changed: No. This is read-only workflow/signoff wiring only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None. The workflow reads local scanner/observer/evidence artifacts only and does not post Discord.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Phase 17D should be an actual live Discord/card review pass only if new Discord sends/cards appear; otherwise this live-observation/evidence workflow is complete.

## Previous Change

Date: 2026-06-26
Task: Install Phase 17B live-observation signoff in real-tape workflow.
Files changed: tools/automation/new-project-workflow-loopback.ts, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 17A added the live-observation signoff command, but fresh/current scanner tape proof needed to be callable from the standard real-tape loopback with a dedicated flag.
Tests run: `npm run workflow:loopback -- --real-tapes --live-observation-signoff --trade-date=2026-06-26 --instrument=MES --session=morning --json`; `npm run supervisor:live-observation-signoff -- --trade-date 2026-06-26 --instrument MES --session morning --json`; `npm run workflow:loopback -- --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The real-tape workflow with `--live-observation-signoff` reported 23 pass, 0 fail, 10 skipped optional checks and included `live-observation-signoff-current-tape=pass`. The standalone June 26 morning live-observation signoff returned `status=ready`, supervisor Phase 6 `ready/pass`, Discord signoff `ready`, Phase 4 failures `0`, Phase 5 failures `0`, 6 active HTF FVG routing events, 6 Phase 5 contract events, and no failures. The evidence summary was `unavailable` because the June 26 end-of-day bundle was not created yet, but that is non-blocking for live-window observation unless `--require-evidence-summary` is used. The standard workflow loopback reported 20 pass, 0 fail, 13 skipped optional/full/real-tape checks. Required guards, lint, and build passed.
Trading logic changed: No. This is read-only workflow/signoff wiring only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None. The workflow reads local scanner/observer evidence only and does not post Discord.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Phase 17C should run after enough June 26 live session evidence exists to review actual Discord sends/cards, or at end of day with `--require-evidence-summary` after creating the evidence bundle.

## Previous Change

Date: 2026-06-26
Task: Install Phase 17A live scanner/Discord observation signoff wrapper.
Files changed: tools/supervisor/liveObservationSignoff.ts, tools/supervisor/liveObservationSignoff.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: After evidence and guard hardening, the next live-observation phase needed one read-only command that combines supervisor Phase 6 signoff, live observer Discord signoff, Phase 4/5 failure counts, HTF routing evidence, and evidence-summary context before accepting live scanner/Discord behavior as clean.
Tests run: `npx tsx tools/supervisor/liveObservationSignoff.test.ts`; `npm run workflow:loopback -- --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `npm run supervisor:live-observation-signoff -- --trade-date 2026-06-25 --instrument MES --session morning --json`.
Result: Passed. The focused Phase 17A test verifies ready, blocked, and required-evidence-summary paths. The standard workflow loopback now includes `supervisor-live-observation-signoff` and reported 20 pass, 0 fail, 12 skipped optional/full/real-tape checks. Required guards, lint, and build passed. The real June 25 morning live-observation command returned `status=ready`, supervisor Phase 6 `ready/pass`, Discord signoff `ready`, Phase 4 failures `0`, Phase 5 failures `0`, 29 active HTF FVG routing events, 29 Phase 5 contract events, evidence summary `ready`, and no failures.
Trading logic changed: No. This is read-only supervisor/live-observation signoff tooling only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None. The command reads local scanner/observer evidence only and does not post Discord.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Phase 17B should be a live-window observation run after the scanner has produced fresh June 26 tapes. Only change code if that observation shows Discord/report drift.

## Previous Change

Date: 2026-06-25
Task: Install Phase 16 generated-artifact guard boundary.
Files changed: scripts/no-legacy-rules-check.js, docs/PROJECT_STATUS.md.
Reason: Standard loopback can regenerate ignored runtime artifacts such as `tools/automation/.nt-scanner-state.json`; the legacy-rule guard scanned those generated files and blocked `npm run lint` even though they are not source and are excluded by `.gitignore`.
Tests run: `npm run lint`; `npm run workflow:loopback -- --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run build`.
Result: Passed. `npm run lint` now passes while ignored generated scanner state remains present, proving the legacy-rule guard still scans source but no longer fails on `.gitignore`-excluded runtime output. The standard workflow loopback reported 19 pass, 0 fail, 12 skipped optional/full/real-tape checks. Required guards and build passed.
Trading logic changed: No. This is guard hygiene only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Ready for the next explicitly scoped scanner behavior, report-quality, operator-surface, or live-observation phase.

## Previous Change

Date: 2026-06-25
Task: Install Phase 15 no-open evidence-summary helper loopback.
Files changed: Open-QuantDesk-EvidenceSummary.ps1, tools/automation/new-project-workflow-loopback.ts, tools/supervisor/supervisor.test.ts, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 14 parse-checked the tray/helper scripts, but automated evidence signoff still needed to execute the evidence-summary helper without opening local report windows.
Tests run: PowerShell parser check for `Open-QuantDesk-EvidenceSummary.ps1`; `powershell -NoProfile -ExecutionPolicy Bypass -File .\Open-QuantDesk-EvidenceSummary.ps1 -NoOpen`; `npx tsx tools/supervisor/supervisor.test.ts`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --eod-summary --trade-date=2026-06-25 --instrument=MES --session=morning --json`; `npm run supervisor:eod-summary -- --trade-date 2026-06-25 --instrument MES --session morning --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The helper parses, runs in `-NoOpen` mode without launching report windows, and writes local evidence-summary output. The standard workflow loopback reported 19 pass, 0 fail, 12 skipped optional/full/real-tape checks. The real-tape workflow with `--eod-summary` reported 23 pass, 0 fail, 8 skipped optional checks, including `evidence-summary-tray-helper-no-open=pass`. Current June 25 morning evidence summary remains `status=ready`, signoff `ready`, Phase 6 `pass`, all files present, and no failures. During verification, two ignored generated runtime artifacts containing legacy text blocked `npm run lint`; they were removed because they were untracked local scanner/audit output and not source.
Trading logic changed: No. This is read-only supervisor evidence workflow validation only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: No additional evidence-workflow phase is required. Future phases should move only if there is a new scanner behavior, report-quality, operator-surface, or live-observation requirement.

## Previous Change

Date: 2026-06-25
Task: Install Phase 14 tray parser checks in workflow loopback.
Files changed: tools/automation/new-project-workflow-loopback.ts, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 13 added a tray evidence-summary shortcut, but the standard loopback runner did not directly parse-check tray/helper PowerShell scripts.
Tests run: `npm run workflow:loopback -- --json`; `npx tsx tools/supervisor/supervisor.test.ts`; `npm run supervisor:eod-summary -- --trade-date 2026-06-25 --instrument MES --session morning --json`; standalone PowerShell parser checks for `QuantDeskSupervisorTray.ps1` and `Open-QuantDesk-EvidenceSummary.ps1`; `npm run workflow:loopback -- --real-tapes --eod-summary --trade-date=2026-06-25 --instrument=MES --session=morning --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The standard loopback now includes `supervisor-tray-parser` and `evidence-summary-tray-helper-parser` and reported 19 pass, 0 fail, 11 skipped optional/full/real-tape checks. The real-tape workflow with `--eod-summary` reported 22 pass, 0 fail, 8 skipped optional checks. Current June 25 morning evidence summary remains `status=ready`, signoff `ready`, Phase 6 `pass`, all files present, and no failures.
Trading logic changed: No. This is workflow verification only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: No additional evidence-workflow phase is required. Future phases should move to a new scanner behavior, report-quality, or operator-surface request.

## Previous Change

Date: 2026-06-25
Task: Install Phase 13 tray evidence-summary shortcut.
Files changed: Open-QuantDesk-EvidenceSummary.ps1, QuantDeskSupervisorTray.ps1, tools/supervisor/supervisor.test.ts, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 12 surfaced the compact evidence summary in supervisor status, but operators still needed a dedicated tray click to open the latest summary report without typing a command.
Tests run: PowerShell parser checks for `Open-QuantDesk-EvidenceSummary.ps1` and `QuantDeskSupervisorTray.ps1`; `npx tsx tools/supervisor/supervisor.test.ts`; `npm run supervisor:eod-summary -- --trade-date 2026-06-25 --instrument MES --session morning --json`; `powershell -NoProfile -ExecutionPolicy Bypass -File .\Open-QuantDesk-EvidenceSummary.ps1`; `npm run workflow:loopback -- --real-tapes --eod-summary --trade-date=2026-06-25 --instrument=MES --session=morning --json`; `npm run workflow:loopback -- --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The new tray target script parses cleanly, static supervisor tests confirm the tray menu and helper boundaries, the helper runs `supervisor:eod-summary` successfully and writes a local report under `logs/supervisor/evidence-summary`, the current June 25 morning bundle reports `status=ready`, signoff `ready`, Phase 6 `pass`, all files present, and no failures. The real-tape workflow with `--eod-summary` reported 20 pass, 0 fail, 8 skipped optional checks. The deterministic workflow loopback reported 17 pass, 0 fail, 11 skipped optional/full/real-tape checks.
Trading logic changed: No. This is a read-only Windows tray/operator-report shortcut only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None. The helper does not post Discord.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: No additional evidence-workflow phase is required. If another phase is needed, it should move to a different operator surface or a new scanner behavior request.

## Previous Change

Date: 2026-06-25
Task: Install Phase 12 supervisor status evidence-summary visibility.
Files changed: tools/supervisor/status.ts, tools/supervisor/index.ts, tools/supervisor/supervisor.test.ts, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 11 added the compact evidence summary command, but the standard supervisor status view still did not surface that readout.
Tests run: `npx tsx tools/supervisor/endOfDayEvidenceSummary.test.ts`; `npx tsx tools/supervisor/supervisor.test.ts`; `npm run supervisor:eod-summary -- --trade-date 2026-06-25 --instrument MES --session morning --json`; `npm run supervisor:status`; `npm run workflow:loopback -- --real-tapes --eod-summary --trade-date=2026-06-25 --instrument=MES --session=morning --json`; `npm run workflow:loopback -- --json`; `npx tsx src/lib/localScannerEngine.test.ts`; `npx tsx tools/automation/discord-alert-format.test.ts`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. `supervisor:status` now includes `endOfDayEvidenceSummary` with the latest June 25 morning bundle showing `status=ready`, signoff `ready`, Phase 6 `pass`, all bundle files present, and no failures. The real-tape workflow with `--eod-summary` reported 20 pass, 0 fail, 8 skipped optional checks. The deterministic workflow loopback reported 17 pass, 0 fail, 11 skipped optional/full/real-tape checks.
Trading logic changed: No. This is read-only supervisor status reporting only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None. Supervisor status does not post Discord.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: No additional evidence-workflow phase is required unless you want the same compact summary exposed as a dedicated Windows tray click.

## Previous Change

Date: 2026-06-25
Task: Install Phase 11 compact evidence bundle summary.
Files changed: tools/supervisor/endOfDayEvidenceSummary.ts, tools/supervisor/endOfDayEvidenceSummary.test.ts, tools/supervisor/supervisor.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 10 created full end-of-day evidence bundles, but operators needed a quick ready/blocked/missing readout without opening the full JSON archive.
Tests run: `npx tsx tools/supervisor/endOfDayEvidenceSummary.test.ts`; `npx tsx tools/supervisor/endOfDayEvidenceBundle.test.ts`; `npx tsx tools/supervisor/liveSignoffManifest.test.ts`; `npx tsx tools/supervisor/supervisor.test.ts`; `npm run supervisor:eod-summary -- --trade-date 2026-06-25 --instrument MES --session morning --json`; `npm run workflow:loopback -- --real-tapes --eod-summary --trade-date=2026-06-25 --instrument=MES --session=morning --json`; Phase 1-10 loopbacks with `npx tsx src/lib/localScannerEngine.test.ts`, `npx tsx tools/automation/discord-alert-format.test.ts`, `npx tsx tools/automation/nt-scanner-alert.test.ts`, `npx tsx tools/automation/live-desk-observer.test.ts`, `npx tsx tools/automation/phase6-live-format-signoff.test.ts`, `npx tsx tools/supervisor/phase6Signoff.test.ts`, `npx tsx tools/supervisor/health.test.ts`, and `npx tsx tools/supervisor/readinessDrill.test.ts`; `npm run workflow:loopback -- --json`.
Result: Passed. The new summary command reads the existing June 25 morning evidence bundle and reports `status=ready`, signoff `ready`, Phase 6 `pass`, all four expected files present, and no failures. The real-tape workflow with `--eod-summary` reported 20 pass, 0 fail, 8 skipped optional checks. The deterministic workflow loopback reported 17 pass, 0 fail, 11 skipped optional/full/real-tape checks.
Trading logic changed: No. This is local evidence status reporting only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None. The summary command does not post Discord; it only reads local evidence artifacts.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: No additional install phase is required for the evidence workflow unless you want the compact summary surfaced through the Windows tray or supervisor status command.

## Previous Change

Date: 2026-06-25
Task: Install Phase 10 end-of-day evidence bundle.
Files changed: tools/supervisor/endOfDayEvidenceBundle.ts, tools/supervisor/endOfDayEvidenceBundle.test.ts, tools/supervisor/supervisor.test.ts, tools/automation/new-project-workflow-loopback.ts, package.json, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 9 preserved live signoff manifests, but end-of-day review still needed one dated folder containing the signoff manifest, scanner decision tape, Phase 6 observer report, and supervisor status snapshot together.
Tests run: `npx tsx tools/supervisor/endOfDayEvidenceBundle.test.ts`; `npx tsx tools/supervisor/liveSignoffManifest.test.ts`; `npx tsx tools/supervisor/supervisor.test.ts`; `npx tsx tools/supervisor/phase6Signoff.test.ts`; `npx tsx tools/supervisor/health.test.ts`; `npx tsx tools/supervisor/readinessDrill.test.ts`; Phase 1-9 loopbacks with `npx tsx src/lib/localScannerEngine.test.ts`, `npx tsx tools/automation/discord-alert-format.test.ts`, `npx tsx tools/automation/nt-scanner-alert.test.ts`, `npx tsx tools/automation/live-desk-observer.test.ts`, and `npx tsx tools/automation/phase6-live-format-signoff.test.ts`; `npm run workflow:loopback -- --json`; `npm run workflow:loopback -- --real-tapes --eod-bundle --trade-date=2026-06-25 --instrument=MES --session=morning --json`; real current-tape checks with `npm run supervisor:eod-bundle -- --trade-date 2026-06-25 --instrument MES --session morning --json`, `npm run supervisor:signoff-manifest -- --trade-date 2026-06-25 --instrument MES --session morning --json`, and `npm run supervisor:phase6-signoff -- --trade-date 2026-06-25 --instrument MES --session morning --json`.
Result: Passed. The new bundle command created `logs/supervisor/end-of-day-evidence/2026-06-25/MES/morning/` with the signoff manifest, scanner decision tape, Phase 6 observer JSON, supervisor status snapshot, and bundle manifest. Current June 25 morning bundle returned `status=ready`, signoff `ready`, Phase 6 `pass`, and no failures. The deterministic workflow loopback reported 17 pass, 0 fail, 10 skipped optional/full/real-tape checks. The real-tape morning workflow with `--eod-bundle` reported 20 pass, 0 fail, and skipped evening because `--session=morning` was requested.
Trading logic changed: No. This is local evidence bundling only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None. The bundle command does not post Discord; it only copies local evidence artifacts and writes a local manifest.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Phase 11 can optionally add a short operator command/report that summarizes the latest bundle status without opening the full JSON archive.

## Previous Change

Date: 2026-06-25
Task: Install Phase 9 live signoff manifest archive.
Files changed: tools/supervisor/liveSignoffManifest.ts, tools/supervisor/liveSignoffManifest.test.ts, tools/supervisor/supervisor.test.ts, tools/automation/new-project-workflow-loopback.ts, Open-QuantDesk-LiveSignoff.ps1, package.json, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 8 made live signoff easy to run, but the evidence still needed a durable dated manifest beside the scanner/supervisor audit artifacts so restart signoff checkpoints can be reviewed later without reconstructing CLI output.
Tests run: `npx tsx tools/supervisor/liveSignoffManifest.test.ts`; `npx tsx tools/supervisor/supervisor.test.ts`; `npx tsx tools/supervisor/phase6Signoff.test.ts`; `npx tsx tools/supervisor/health.test.ts`; `npx tsx tools/supervisor/readinessDrill.test.ts`; Phase 1-8 loopbacks with `npx tsx src/lib/localScannerEngine.test.ts`, `npx tsx tools/automation/discord-alert-format.test.ts`, `npx tsx tools/automation/nt-scanner-alert.test.ts`, `npx tsx tools/automation/live-desk-observer.test.ts`, and `npx tsx tools/automation/phase6-live-format-signoff.test.ts`; `npm run workflow:loopback -- --json`; real current-tape checks with `npm run supervisor:signoff-manifest -- --trade-date 2026-06-25 --instrument MES --session morning --json`, `npm run supervisor:phase6-signoff -- --trade-date 2026-06-25 --instrument MES --session morning --json`, and `npm run phase6:live-format-signoff -- --trade-date 2026-06-25 --instrument MES --session morning --json`.
Result: Passed. The new manifest command archived a dated JSON checkpoint under `logs/supervisor/live-signoff-manifests/2026-06-25/`, preserving the supervisor signoff status, Phase 6 status, latest completed 5M, latest DeskState primary, latest line in the sand, Phase 4/5 failure counts, active HTF FVG routing events, and linked observer JSON path. Current June 25 morning evidence returned `ready`/`pass`, `discordSignoffStatus=ready`, Phase 4 failures 0, Phase 5 failures 0, and active HTF FVG routing events present. The combined deterministic workflow loopback reported 17 pass, 0 fail, 9 skipped optional/full/real-tape checks.
Trading logic changed: No. This is evidence archiving/reporting only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None. The manifest command and tray helper do not post Discord; they only run/read supervisor signoff evidence and write local files.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Phase 10 can add optional end-of-day manifest bundling if we want one command to collect scanner tapes, observer reports, signoff manifests, and supervisor status into a dated archive folder.

## Previous Change

Date: 2026-06-25
Task: Install Phase 8 operator live-signoff shortcut for the restart workflow.
Files changed: Open-QuantDesk-LiveSignoff.ps1, QuantDeskSupervisorTray.ps1, tools/supervisor/supervisor.test.ts, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: Phase 7 added a clean supervisor signoff command, but the restart/live-observation workflow needed an operator-facing shortcut so the same proof can be run after scanner restarts without remembering the CLI command or relying on manual interpretation.
Tests run: `npx tsx tools/supervisor/supervisor.test.ts`; `npx tsx tools/supervisor/phase6Signoff.test.ts`; `npx tsx tools/supervisor/health.test.ts`; `npx tsx tools/supervisor/readinessDrill.test.ts`; Phase 1-7 loopbacks with `npx tsx src/lib/localScannerEngine.test.ts`, `npx tsx tools/automation/discord-alert-format.test.ts`, `npx tsx tools/automation/nt-scanner-alert.test.ts`, `npx tsx tools/automation/live-desk-observer.test.ts`, and `npx tsx tools/automation/phase6-live-format-signoff.test.ts`; real current-tape checks with `npm run supervisor:phase6-signoff -- --trade-date 2026-06-25 --instrument MES --session morning --json` and `npm run phase6:live-format-signoff -- --trade-date 2026-06-25 --instrument MES --session morning --json`.
Result: Passed. Tray/static coverage confirms the new `Open Live Signoff` menu calls the read-only helper, and the helper calls `npm run supervisor:phase6-signoff -- --json` with explicit no-Discord/no-Supabase/no-trading/no-child-process authority. Current June 25 morning signoff returned `ready`/`pass`, `discordSignoffStatus=ready`, Phase 4 failures 0, Phase 5 failures 0, and active HTF FVG routing events present.
Trading logic changed: No. This is operator workflow/reporting only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None. The tray/helper does not post Discord; it only runs the supervisor signoff report and opens local output.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Phase 9 can add an optional dated signoff manifest to the end-of-session loopback archive if we want every live approval checkpoint preserved beside the scanner audit tapes.

## Previous Change

Date: 2026-06-25
Task: Install Phase 7 supervisor signoff integration for Phase 6 live-format proof.
Files changed: tools/supervisor/phase6Signoff.ts, tools/supervisor/phase6Signoff.test.ts, tools/supervisor/index.ts, tools/supervisor/supervisor.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: Phase 6 created a clean live-format signoff gate, but the supervisor needed a standard read-only command to surface that signoff after scanner restarts without posting Discord, starting services, changing scanner state, or touching trading logic.
Tests run: `npx tsx tools/supervisor/phase6Signoff.test.ts`; `npx tsx tools/supervisor/supervisor.test.ts`; `npx tsx tools/supervisor/health.test.ts`; `npx tsx tools/supervisor/readinessDrill.test.ts`; Phase 1-6 loopbacks with `npx tsx src/lib/localScannerEngine.test.ts`, `npx tsx tools/automation/discord-alert-format.test.ts`, `npx tsx tools/automation/nt-scanner-alert.test.ts`, `npx tsx tools/automation/live-desk-observer.test.ts`, and `npx tsx tools/automation/phase6-live-format-signoff.test.ts`; real current-tape checks with `npm run phase6:live-format-signoff -- --trade-date 2026-06-25 --instrument MES --session morning --json` and `npm run supervisor:phase6-signoff -- --trade-date 2026-06-25 --instrument MES --session morning --json`.
Result: Passed. The new supervisor command reports `ready`, `blocked`, or `unavailable` without throwing on missing evidence. The June 25 morning current-tape supervisor check returned `status=ready`, Phase 6 `status=pass`, `discordSignoffStatus=ready`, Phase 4 failures 0, Phase 5 failures 0, and 27 active HTF FVG routing events.
Trading logic changed: No. This is supervisor status/reporting only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: None. The supervisor signoff command does not post Discord; it only reports whether Phase 6 evidence is ready, blocked, or unavailable.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Phase 8 can add a runbook/tray/live-observation shortcut that calls `npm run supervisor:phase6-signoff` after scanner restarts and before Discord sign-off.

## Previous Change

Date: 2026-06-25
Task: Install Phase 6 live-format signoff gate for fresh scanner/observer proof.
Files changed: tools/automation/phase6-live-format-signoff.ts, tools/automation/phase6-live-format-signoff.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: Phases 1-5 needed a standard pass/fail command that proves fresh/current-format scanner tapes are actually producing observer-ready HTF FVG routing and Phase 5 contract evidence, instead of relying on old historical tapes or manual observer interpretation.
Tests run: `npx tsx tools/automation/phase6-live-format-signoff.test.ts`; `npm run phase6:live-format-signoff -- --trade-date 2026-06-25 --instrument MES --session morning --json`; focused Phase 1-6 loopbacks with `npx tsx src/lib/localScannerEngine.test.ts`, `npx tsx tools/automation/discord-alert-format.test.ts`, `npx tsx tools/automation/nt-scanner-alert.test.ts`, `npx tsx tools/automation/live-desk-observer.test.ts`, and `npx tsx tools/automation/phase6-live-format-signoff.test.ts`.
Result: Passed. The Phase 6 signoff command is research-only and fails old/not-evaluable tapes, Phase 4/5 observer failures, missing HTF FVG routing fields, missing active routing events, or missing Phase 5 contract events. The live June 25 morning run reported `status=pass`, `discordSignoffStatus=ready`, Phase 4 failures 0, Phase 5 failures 0, and active HTF FVG routing events present.
Trading logic changed: No. This is verification tooling only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None. The command reads scanner decision tapes and live-observer output only.
Discord impact: None. The command does not post Discord; it verifies whether Discord signoff evidence is ready.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Use `npm run phase6:live-format-signoff -- --trade-date=<date> --instrument=MES --session=<morning|lunch|evening> --since-recorded-at=<scanner-restart-iso> --json` after scanner restarts. Phase 7 can harden supervisor automation around this command if desired.

## Previous Change

Date: 2026-06-24
Task: Correct Phase 4 audit sign-off for suppressed selected-candidate residue.
Files changed: tools/automation/live-desk-observer.ts, tools/automation/live-desk-observer.test.ts, tools/automation/scanner-behavior-audit.ts, tools/automation/scanner-behavior-audit.test.ts, docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, docs/PROJECT_STATUS.md.
Reason: The June 24 evening observer still showed a Phase 4 blocker even though the only remaining issue was a duplicate-suppressed selected SHORT candidate while DeskState/HTF FVG routing was LONG. That is historical selected-candidate residue, not trader-facing Discord delivery risk. The scanner behavior audit also used a looser stale/no-chase classifier than the observer, so the two reports disagreed.
Tests run: `npx tsx tools/automation/live-desk-observer.test.ts`; `npx tsx tools/automation/scanner-behavior-audit.test.ts`; `npm run workflow:loopback -- --real-tapes --trade-date=2026-06-24 --instrument=MES`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `git diff --check`.
Result: Passed. Duplicate/stale/non-deliverable selected-candidate drift now records `candidate_desk_*_warning` and `htf_fvg_reaction_selected_warning` instead of hard Phase 4 failure. Hard Phase 4 failures still apply to primary route mismatch, campaign mismatch, approval-boundary drift, and selected-candidate mismatch on actual trader-facing sends. June 24 real-tape loopback now reports scanner behavior Phase 4 failures = 0, evening observer `discordSignoffStatus=ready`, and morning observer still `not_evaluable` because that old tape lacks current HTF FVG routing fields.
Trading logic changed: No. This is read-only audit/sign-off classification only. It does not change setup definitions, ranking, candidate creation, entries, stops, targets, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None.
Discord impact: No send behavior change. Observer/audit reporting now distinguishes suppressed selected-candidate residue from live Discord delivery blockers.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: The 2026-06-24 morning tape remains old-format/not-evaluable for Phase 4 routing proof until a fresh scanner/replay run records current routing fields. That is evidence quality, not a current-code failure.
Next recommended action: Use `npm run workflow:loopback -- --real-tapes --trade-date=<date> --instrument=MES` after live sessions; treat selected warnings as review context and hard Phase 4 failures as sign-off blockers.

## Previous Change

Date: 2026-06-24
Task: Add New project workflow runbook and combined loopback runner.
Files changed: docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md, tools/automation/new-project-workflow-loopback.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The scanner work had spread across overposting control, MSS evidence, live scanner behavior review, DeskState cleanup, evening hardening, HTF FVG routing, and fresh tactical re-entry. The repo needed one project map and one repeatable read-only loopback command that proves those surfaces together instead of relying on separate chat history.
Tests run: `npm run workflow:loopback`; `npm run workflow:loopback -- --real-tapes --trade-date=2026-06-24 --instrument=MES`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`; `git diff --check`.
Result: Passed for deterministic loopback and repo gates. Deterministic loopback reported 17 pass, 0 fail, 8 skipped optional/full/real-tape checks. Real-tape mode reported 20 command-level passes, 0 command failures, and 5 skipped optional full checks, while preserving two audit caveats: the 2026-06-24 morning tape is not evaluable for Phase 4 routing because it lacks newer HTF FVG routing fields, and the 2026-06-24 evening observer remains blocked by 1 historical Phase 4 enforcement failure. Those tapes are immutable historical evidence and should be regenerated by a fresh scanner/replay run if they are needed as current-format sign-off proof.
Trading logic changed: No. This adds read-only documentation and a verification runner only. It does not change setup definitions, ranking, candidate creation, entry, stop, target, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, live trade approval, or canExecute.
Bridge impact: None. The runner can read existing real decision tapes when requested, but it does not call or modify the live bridge by default.
Discord impact: None. The runner does not post Discord. It verifies Discord eligibility, formatting, artifact lint, and observer/audit behavior through tests and existing tapes.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: Hidden Codex sidebar chats cannot be imported from repo state without a thread export/tool. Current durable repo evidence was mapped instead. Existing 2026-06-24 historical tapes should not be treated as clean current-format Phase 4/5 sign-off evidence.
Next recommended action: Use `npm run workflow:loopback -- --full` before future Discord sign-off, and use `npm run workflow:loopback -- --real-tapes --trade-date=<date> --instrument=MES` after live scanner sessions to catch routing or overposting drift.

## Previous Change

Date: 2026-06-24
Task: Approve Phase 3 fresh re-entry candidates for production Discord conditional-plan display only.
Files changed: src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, docs/PHASE_3_FRESH_REENTRY_DESIGN.md, docs/PROJECT_STATUS.md.
Reason: Trading-logic owner explicitly approved Phase 3 fresh re-entry candidates for Discord conditional-plan display while preserving canExecute and execution approval boundaries.
Tests run: `npx tsx src/lib/localScannerEngine.test.ts`; `npx tsx tools/automation/discord-alert-format.test.ts`; `npx tsx tools/automation/fresh-reentry-phase3-loopback.ts`; `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npx tsx tools/automation/live-desk-observer.test.ts`; `npx tsx tools/automation/scanner-behavior-audit.test.ts`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. Loopback reports `approved_discord_conditional_display`, fresh best risk 4 pts, Discord conditional display approved, and canExecute boundary preserved.
Trading logic changed: Yes, display approval state changed from pending review to approved Discord conditional display. No canExecute, execution approval, model definition, risk rule, or bar-close handling change.
Bridge impact: None.
Discord impact: Yes. Fresh re-entry candidates with complete deterministic levels now display as conditional plans with entry, stop, T1, T2, trigger, invalidation, and explicit canExecute boundary instead of watch-only pending text.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Live scanner observation/replay sign-off should verify a real Discord payload shows the fresh re-entry conditional block with chart attached.

## Previous Change

Date: 2026-06-24
Task: Begin Phase 3 deterministic fresh tactical re-entry candidate builder pending trading-logic-owner review.
Files changed: src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, tools/automation/fresh-reentry-phase3-loopback.ts, docs/PHASE_3_FRESH_REENTRY_DESIGN.md, docs/PROJECT_STATUS.md.
Reason: Watch-state-only behavior did not compute a fresh entry/stop/T1/T2 after old levels were missed/no-chase while active HTF FVG routing still supported the side. Phase 3 now builds deterministic pending-review re-entry candidates from completed 5M acceptance, active line/zone seeds, protected 5M stop, and app-owned target math.
Tests run: `npx tsx src/lib/localScannerEngine.test.ts`; `npx tsx tools/automation/fresh-reentry-phase3-loopback.ts`.
Result: Passed. Loopback compared old watch-only behavior to the new deterministic candidate package: old short entry/stop/risk 7588/7604/16 pts versus fresh pending-review candidate 7596/7600/4 pts with T1 7590 and T2 7588. `canExecute` stayed false and owner review remained required.
Trading logic changed: Yes, pending review. The scanner now computes deterministic fresh re-entry candidate levels in DeskState metadata. This does not approve execution, set canExecute, change model definitions, or change bar-close handling.
Bridge impact: Uses existing structured 5M OHLC candle facts and existing HTF FVG routing metadata only.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: Phase 3 must not be marked complete or approved until the trading-logic owner reviews the design, loopback output, tests, and risk impact.
Next recommended action: Run full guards/build, then have the trading-logic owner review `docs/PHASE_3_FRESH_REENTRY_DESIGN.md` and the loopback output before allowing Discord or execution-path promotion.

## Previous Change

Date: 2026-06-24
Task: Install Phase 1/2 fresh tactical re-entry watch diagnostics and Discord presentation.
Files changed: src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, tools/automation/live-desk-observer.ts, tools/automation/live-desk-observer.test.ts, tools/automation/scanner-behavior-audit.ts, tools/automation/scanner-behavior-audit.test.ts, docs/PROJECT_STATUS.md.
Reason: Missed/no-chase entries with active HTF FVG reaction needed a clear trader-facing watch state: old levels are management/history only, while a fresh completed 5M line acceptance must build new deterministic levels before any execution consideration. Live loopback also exposed an opposite-side high-confidence conditional Discord bypass against active HTF FVG routing, so the Discord gate now blocks that communication risk.
Tests run: `npx tsx src/lib/localScannerEngine.test.ts`; `npx tsx tools/automation/discord-alert-format.test.ts`; `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npx tsx tools/automation/live-desk-observer.test.ts`; `npx tsx tools/automation/scanner-behavior-audit.test.ts`; `npx tsx src/lib/htfFvgReactionRoutingPhase3.test.ts`; `npx tsx src/lib/htfFvgReactionMemory.test.ts`; `npx tsx src/lib/liveDiscordPostEligibility.test.ts`; real-tape dry runs with `npx tsx tools/automation/scanner-behavior-audit.ts --trade-date 2026-06-24 --instrument MES --sessions evening --json` and `npx tsx tools/automation/live-desk-observer.ts --trade-date 2026-06-24 --instrument MES --session evening --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. Phase 1 adds read-only `freshReentryWatch` metadata with approval boundaries preserved. Phase 2 shows Fresh Re-entry Watch lines in Discord Desk Play text and labels old missed levels as management/history only. Real-tape observer is ready with 0 candidate/DeskState conflicts, 0 HTF FVG routing conflicts, 0 Phase 4 failures, and 0 Phase 5 failures.
Trading logic changed: No. This does not create setup candidates, approve trades, change ranking, alter entries/stops/targets/risk/invalidation, change bar-close handling, or loosen canExecute. Discord high-confidence conditional publication is now blocked when candidate side conflicts with active HTF FVG routing.
Bridge impact: None. Existing scanner-owned OHLC/routing metadata is consumed only for visibility.
Discord impact: Yes. Desk Play can explain fresh re-entry watch state, and opposite-side high-confidence conditional cards cannot publish against active HTF FVG routing.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Phase 3 should add the approved deterministic re-entry candidate builder only after explicit trading-logic approval.

## Previous Change

Date: 2026-06-24
Task: Add Phase 5 HTF FVG live-observer drift contract.
Files changed: tools/automation/live-desk-observer.ts, tools/automation/live-desk-observer.test.ts, docs/PROJECT_STATUS.md.
Reason: Phase 1-3 now produce full-window HTF FVG inventory, lifecycle state, and active reaction line routing. Phase 5 hardens the live/replay observation checklist so active HTF FVG routing cannot be called ready unless routing, memory, cascade parent zone, and optional delivery/persistence payloads agree on the same active parent zone and line.
Tests run: `npx tsx tools/automation/live-desk-observer.test.ts`; `npx tsx tools/automation/scanner-behavior-audit.test.ts`; `npx tsx src/lib/htfFvgReactionRoutingPhase3.test.ts`; `npx tsx src/lib/htfFvgFullWindowInventory.test.ts`; `npx tsx src/lib/htfFvgLifecycle.test.ts`; `npx tsx src/lib/htfFvgReactionMemory.test.ts`; `npx tsx src/lib/localScannerEngine.test.ts`; `npx tsx tools/automation/discord-alert-format.test.ts`; real-tape dry run with `npx tsx tools/automation/live-desk-observer.ts --trade-date 2026-06-24 --instrument MES --session lunch --json`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The observer now reports Phase 5 contract events/failures, blocks Discord sign-off when active HTF FVG routing has missing or inconsistent machine-readable memory/cascade fields, and still reports old June 24 tapes as `not_evaluable` because they predate the routing fields.
Trading logic changed: No. This is observer/checklist reporting only. It does not change setup definitions, ranking, candidate creation, entry, stop, target, risk, invalidation, bar-close handling, bridge behavior, Discord send cadence, or canExecute.
Bridge impact: None. It reads existing scanner decision tape metadata only.
Discord impact: No direct send behavior change. Observer sign-off now blocks when Phase 5 detects drift across routing/memory/cascade or optional payload/persistence text.
Journal/RAG impact: No schema change. The observer only validates optional persisted payload text when such fields are present in the tape.
Supabase impact: No migration added.
Known risks: None known after verification. Existing 2026-06-24 tapes remain not evaluable until a fresh scanner run records the new routing fields.
Next recommended action: Restart/rerun the scanner with the current build and use the live observer to confirm fresh tapes show Phase 4/5 ready before treating Discord sign-off as complete.

## Previous Change

Date: 2026-06-24
Task: Correct live observer Phase 4 sign-off status for old-format tapes.
Files changed: tools/automation/live-desk-observer.ts, tools/automation/live-desk-observer.test.ts, docs/PROJECT_STATUS.md.
Reason: The live observer previously reported `discordSignoffStatus=ready` when no Phase 4 failures were present, even if the scanner tape did not contain `htfFvgReactionRouting` fields at all. That made old-format tapes look ready when the Phase 4 live-format path was actually not evaluable.
Tests run: `npx tsx tools/automation/live-desk-observer.test.ts`; real-tape dry run with `npx tsx tools/automation/live-desk-observer.ts --trade-date 2026-06-24 --instrument MES --session lunch --json`; 3x loop verification with `npx tsx tools/automation/live-desk-observer.test.ts`, `npx tsx tools/automation/scanner-behavior-audit.test.ts`, `npx tsx src/lib/htfFvgReactionRoutingPhase3.test.ts`, `npx tsx src/lib/htfFvgReactionMemory.test.ts`, and `npx tsx tools/automation/htf-fvg-reaction-phase1.test.ts`; `npx tsc --noEmit --pretty false`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. Old-format scanner tapes without `htfFvgReactionRouting` now report `discordSignoffStatus=not_evaluable` instead of `ready`. Fresh tapes can report `ready` only after the routing field exists and no Phase 4 failures are present; active routing conflicts still report `blocked`.
Trading logic changed: No. This is observer/checklist reporting only. It does not change setup definitions, ranking, candidate creation, entry, stop, target, risk, invalidation, bar-close handling, bridge behavior, Discord send cadence, or canExecute.
Bridge impact: None. It reads existing scanner decision tape metadata only.
Discord impact: No direct send behavior change. Observer sign-off now distinguishes `ready`, `blocked`, and `not_evaluable`.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Restart or rerun the scanner with the current build and confirm fresh tapes show `htfFvgReactionRoutingFieldEvents > 0` before using Phase 4 sign-off as ready.

## Previous Change

Date: 2026-06-24
Task: Wire Phase 4 HTF FVG routing enforcement into live-observation sign-off.
Files changed: tools/automation/live-desk-observer.ts, tools/automation/live-desk-observer.test.ts, docs/PROJECT_STATUS.md.
Reason: Phase 4 replay-audit enforcement caught active HTF FVG reaction routing drift after the fact, but the standard live/replay observation checklist also needed to surface that drift as a Discord sign-off blocker before review/delivery.
Tests run: 3x loop verification with `npx tsx tools/automation/live-desk-observer.test.ts`, `npx tsx tools/automation/scanner-behavior-audit.test.ts`, `npx tsx src/lib/htfFvgReactionRoutingPhase3.test.ts`, `npx tsx src/lib/htfFvgReactionMemory.test.ts`, and `npx tsx tools/automation/htf-fvg-reaction-phase1.test.ts`; live-observer dry run with `npx tsx tools/automation/live-desk-observer.ts --trade-date 2026-06-24 --instrument MES --session lunch --json`; `npx tsc --noEmit --pretty false`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The live observer now marks active HTF FVG reaction routing rows, reports Phase 4 pass/fail status bar-by-bar, blocks Discord sign-off when selected/campaign/primary side or routing approval-boundary metadata conflicts, and keeps the report research-only.
Trading logic changed: No. This is research-only live-observer/checklist reporting. It does not change setup definitions, ranking, candidate creation, entry, stop, target, risk, invalidation, bar-close handling, bridge behavior, Discord send cadence, or canExecute.
Bridge impact: None. It reads existing scanner decision tape metadata only.
Discord impact: No direct send behavior change. The observer now reports `discordSignoffStatus=blocked` when active HTF FVG reaction routing conflicts with selected/campaign/primary metadata or communication-only approval boundaries.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Use the live observer after scanner restarts so fresh scanner tapes with `htfFvgReactionRouting` prove the sign-off path is active on live-format data.

## Previous Change

Date: 2026-06-24
Task: Add Phase 4 HTF FVG reaction routing replay-audit enforcement.
Files changed: tools/automation/scanner-behavior-audit.ts, tools/automation/scanner-behavior-audit.test.ts, docs/PROJECT_STATUS.md.
Reason: Phase 3 routed trader-facing DeskState/Discord from active HTF parent FVG reaction memory when same-side 5M child confirmation and complete levels exist. Phase 4 adds a replay-audit enforcement layer so future scanner decision tapes flag any active HTF FVG reaction route that conflicts with primary DeskState, selected candidate side, active campaign side, or its communication-only approval boundary.
Tests run: 3x loop verification with `npx tsx tools/automation/scanner-behavior-audit.test.ts`, `npx tsx src/lib/htfFvgReactionRoutingPhase3.test.ts`, `npx tsx src/lib/htfFvgReactionMemory.test.ts`, and `npx tsx tools/automation/htf-fvg-reaction-phase1.test.ts`; real-tape audit dry run with `npx tsx tools/automation/scanner-behavior-audit.ts --trade-date 2026-06-24 --instrument MES --sessions all --json`; `npx tsc --noEmit --pretty false`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The new replay-audit fields mark active HTF FVG reaction routing events, fail Phase 4 enforcement when selected/campaign/primary side conflicts with the routed side, and fail if any routing approval-boundary flag drifts away from communication-only. Today's existing scanner tapes still load cleanly; they predate the new routing fields, so Phase 4-specific routing event count is zero on those tapes.
Trading logic changed: No. This is read-only scanner decision-tape audit/test coverage only. It does not change setup definitions, ranking, candidate creation, entry, stop, target, risk, invalidation, bar-close handling, bridge behavior, Discord delivery cadence, or canExecute.
Bridge impact: None. It reads existing scanner decision tape metadata only.
Discord impact: No direct runtime delivery change. The audit now makes HTF FVG routing drift visible before a future delivery/replay sign-off.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: After this passes, wire the Phase 4 audit into the normal scanner replay/live-observation checklist so active HTF FVG routing drift is reviewed before Discord sign-off.

## Previous Change

Date: 2026-06-24
Task: Add Phase 3 HTF FVG reaction communication/routing.
Files changed: src/lib/localScannerEngine.ts, src/lib/htfFvgReactionRoutingPhase3.test.ts, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, tools/automation/professional-report-language.ts, docs/PROJECT_STATUS.md.
Reason: Phase 2 stored active HTF parent FVG reaction memory, but the trader-facing DeskState/Discord path still needed to use that memory so a complete, high-quality conditional side is surfaced instead of being buried by an unrelated selected/campaign side. Phase 3 routes the displayed primary Desk Play side only when active HTF parent FVG reaction, same-direction 5M child FVG confirmation, and complete same-direction scanner-owned levels are all present.
Tests run: 3x loop verification with `npx tsx src/lib/htfFvgReactionRoutingPhase3.test.ts`, `npx tsx src/lib/htfFvgReactionMemory.test.ts`, `npx tsx tools/automation/htf-fvg-reaction-phase1.test.ts`, and `npx tsx tools/automation/discord-alert-format.test.ts`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The routing test proves a higher-ranked/selected LONG can no longer bury a complete SHORT plan when structured HTF parent FVG rejection plus 5M child confirmation supports SHORT. Discord now renders HTF FVG Reaction Memory in rich, fallback, and ultra-compact desk-play paths, including the communication-only boundary.
Trading logic changed: No. This is DeskState/Discord communication routing only. It does not change setup definitions, ranking scores, candidate creation, entry, stop, target, risk, invalidation, bar-close handling, bridge behavior, or canExecute.
Bridge impact: None. It consumes existing structured OHLC/FVG memory only.
Discord impact: Yes. Desk Play text can now show HTF parent reaction memory and route the trader-facing primary side when the memory has same-side 5M child confirmation and complete scanner-owned levels.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification. Existing Discord formatter tests still print a non-blocking preferred-length warning for a compact fixture.
Next recommended action: Phase 4 should add replay-audit enforcement over real scanner decision tapes so any future selected/campaign side that conflicts with active HTF FVG reaction routing is flagged before Discord delivery.

## Previous Change

Date: 2026-06-24
Task: Add Phase 2 structured HTF parent FVG reaction memory.
Files changed: src/lib/htfFvgReactionMemory.ts, src/lib/htfFvgReactionMemory.test.ts, src/lib/localScannerEngine.ts, docs/PROJECT_STATUS.md.
Reason: Phase 1 proved the June 24 missed short had an older 60M bearish parent FVG reaction, 15M rejection, and 5M child FVG proof. Phase 2 stores that relationship as machine-readable scanner metadata so HTF parent-zone retest/rejection, stale accepted-through zones, and 5M child confirmation are available without parsing Discord text, chart text, screenshots, or narrative.
Tests run: 3x loop verification with `npx tsx src/lib/htfFvgReactionMemory.test.ts`, `npx tsx tools/automation/htf-fvg-reaction-phase1.test.ts`, and `npx tsx tools/automation/nt-scanner-alert.test.ts`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The new memory helper records 60M and 15M parent FVG reaction state from structured OHLC facts, marks the June 24 SHORT parent zones as rejected, records the initial 5M child FVG confirmation, and keeps accepted-through opposite-side FVGs visible as stale memory without promoting them as active reaction context.
Trading logic changed: No. This is scanner context metadata only. It does not change setup definitions, ranking, entry, stop, target, risk, invalidation, bar-close handling, scanner selection, Discord suppression/routing, bridge behavior, or canExecute.
Bridge impact: None. It consumes existing `multiTimeframeContext` OHLC/FVG facts only.
Discord impact: None direct. Discord can consume this field in a later phase, but Phase 2 does not change formatting or send cadence.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification. Existing scanner alert fixture warnings still print for preferred compact length and one-image fixture coverage; they are non-blocking and pre-existing.
Next recommended action: Phase 3 should use this reaction memory for communication/routing: when active HTF parent FVG rejection plus 5M child confirmation exists, promote the correct conditional plan earlier in DeskState/Discord while preserving canExecute and all execution gates.

## Previous Change

Date: 2026-06-24
Task: Add Phase 1 HTF FVG reaction replay proof for the June 24 missed short.
Files changed: tools/automation/htf-fvg-reaction-phase1.test.ts, docs/PROJECT_STATUS.md.
Reason: The missed afternoon short needed a mechanical, OHLC-backed replay proof before changing runtime behavior. The proof locks down that the left-side 60M bearish FVG stack existed, the June 24 retest/rejection occurred, 15M rejected the same shelf, 5M produced a child bearish FVG and close below the short line, and the scanner tape later showed SHORT desk structure while selected/campaign state drifted back toward LONG.
Tests run: 3x loop verification with `npx tsx tools/automation/htf-fvg-reaction-phase1.test.ts`, `npx tsx tools/automation/nt-scanner-alert.test.ts`, and `npx tsx tools/automation/discord-alert-format.test.ts`; `npm run guard:no-firebase`; `npm run guard:architecture`; `npm run guard:schema`; `npm run lint`; `npm run build`.
Result: Passed. The Phase 1 proof repeatedly confirms the June 24 missed short sequence from OHLC and scanner tape: 60M parent bearish FVG reaction, 15M rejection, 5M child bearish FVG, 5M close below the short activation line, later no-chase state, and selected/campaign lifecycle drift away from the active SHORT structure.
Trading logic changed: No. This is test/audit coverage only. It does not change setup definitions, ranking, entry, stop, target, risk, invalidation, bar-close handling, scanner selection, bridge behavior, Discord routing, or canExecute.
Bridge impact: None. The test uses static NinjaTrader OHLC facts and an existing scanner decision tape fixture; it does not call or modify the live bridge.
Discord impact: None direct.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification. Existing Discord formatter tests still print non-blocking warnings for preferred compact length and one-image fixture coverage, but those warnings were pre-existing and did not fail the delivery gate.
Next recommended action: Phase 2 should convert this proof into structured HTF parent FVG reaction memory, still as context/routing metadata only before any promotion behavior changes.

## Previous Change

Date: 2026-06-24
Task: Add Discord artifact lint hardening for trade-plan delivery.
Files changed: tools/automation/discord-artifact-lint.ts, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, scripts/architecture-guard.js, docs/PROJECT_STATUS.md.
Reason: Live Discord/chart delivery drift showed that duplicated labels, stale `pending` text mixed with complete levels, missing required charts, missing RAG buttons, and oversized image-backed payloads need a single hard gate before Discord delivery.
Tests run: npx tsx tools/automation/discord-alert-format.test.ts; npx tsc --noEmit --pretty false; npm run guard:architecture.
Result: Focused tests and architecture guard passed. Discord delivery validation now calls a centralized artifact lint contract that blocks duplicate `Action`/`Invalid`/level labels, stale pending level text when complete Entry/Stop/T1/T2 are present, current desk plans with complete levels but no chart, current desk plans without RAG buttons, old long-form scanner text leaks, truncation artifacts, and oversized payloads. Architecture guard now requires the centralized lint owner so these checks cannot drift back into scattered formatter code.
Trading logic changed: No. This is Discord presentation/delivery validation only. It does not change setup definitions, ranking, entry, stop, target, risk, invalidation values, bar-close handling, scanner selection, bridge behavior, or canExecute.
Bridge impact: None.
Discord impact: Yes. Broken trade-plan artifacts now fail before Discord instead of posting confusing text.
Journal/RAG impact: No schema change. Existing RAG buttons are enforced for current desk plan/trade alert categories by the delivery lint.
Supabase impact: No migration added.
Known risks: None known after full verification.
Next recommended action: Add replay fixture tests from real scanner audit records so the lint contract is proven against full scanner artifacts, not only synthetic payloads.

## Previous Change

Date: 2026-06-24
Task: Normalize chart level-map action and invalidation labels.
Files changed: tools/automation/chart-markup-renderer.ts, tools/automation/chart-markup-renderer.test.ts, docs/PROJECT_STATUS.md.
Reason: The live Discord chart level map was readable and posted correctly, but the action footer rendered duplicated labels such as `Action: Action...`, and the invalidation footer could render `Invalid: Invalid if...`.
Tests run: npx tsx tools/automation/chart-markup-renderer.test.ts; npx tsc --noEmit --pretty false; fresh rendered level-map visual QA with view_image.
Result: Passed. Level-map footer text now strips duplicated action/invalidation prefixes at the renderer boundary. Regression tests prevent `Action: Action`, `Invalid: Invalid`, and `Invalid: Invalid if` from returning.
Trading logic changed: No. This is chart/level-map presentation only. It does not change setup definitions, ranking, entry, stop, target, risk, invalidation source values, bar-close handling, scanner selection, bridge behavior, Discord routing, or canExecute.
Bridge impact: None.
Discord impact: Indirect only. Future chart attachments should render cleaner action/invalidation text.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after focused verification.
Next recommended action: Add a broader visual-text lint pass for rendered report artifacts so duplicated labels and accidental repeated section headers fail before Discord delivery.

## Previous Change

Date: 2026-06-24
Task: Compact oversized live Desk Play Discord payloads.
Files changed: tools/automation/discord-alert-format.ts, docs/PROJECT_STATUS.md.
Reason: The live 09:55 ET scanner cycle produced a high-quality conditional LONG plan with chart/levels, and the Morning HTF Desk Map posted, but the trade card failed safe because the image-backed compact Discord text was 1660 characters, above the 1600-character release gate. The scanner was correctly blocking an oversized payload, but the eligible trade plan still did not reach Discord.
Tests run: npx tsx tools/automation/discord-alert-format.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit --pretty false; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed. The Desk Play Discord summary now falls back to an essential compact ticket when rich text would exceed the image-backed send limit, while preserving primary side, decision class, active tactical line/zone migration, HTF rows, FVG/cascade context, line in the sand, entry/stop/T1/T2 or pending levels, trigger, invalidation, stand-down, chart status, and decision-support boundary.
Trading logic changed: No. This is Discord presentation/length control only. It does not change setup definitions, ranking, entry, stop, target, risk, invalidation, bar-close handling, scanner selection, bridge behavior, or canExecute.
Bridge impact: None.
Discord impact: Yes. Eligible Desk Play/trade-plan posts should no longer fail solely because the rich card text is too long for an image-backed Discord alert.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Restart scanner so the live process picks up the formatter fallback, then observe the next qualifying selected plan.

## Previous Change

Date: 2026-06-24
Task: Fix live Discord boundary for high-quality selected review plans.
Files changed: src/lib/liveDiscordPostEligibility.ts, src/lib/liveDiscordPostEligibility.test.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: The 2026-06-24 morning scanner generated three high-quality LONG TurtleSoup trade-plan audits with complete levels and chart attachments, but Discord skipped them as `phase11_boundary`. The selected plan was qualified, while old rollout-checklist and mixed `promotion.blockedBy` text from non-selected/opposite candidates caused the live boundary to bury it.
Tests run: npx tsx src/lib/liveDiscordPostEligibility.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit --pretty false; actual 2026-06-24 MORNING-20260624-133501 audit replay through buildScannerLiveDiscordSendBoundaryReport; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed. Focused tests, TypeScript, actual audit boundary replay, required guards, lint, and build passed. The actual missed 09:25 ET audit now evaluates `eligible=true` with no blockers.
Trading logic changed: No. This is Discord send-boundary routing only. It does not change setup definitions, ranking, entry, stop, target, risk, invalidation, bar-close handling, scanner selection, or `canExecute`.
Bridge impact: None.
Discord impact: Yes. A selected high-quality full-level POST_REVIEW/POST_CONDITIONAL plan may now bypass the stale Phase 11 dry-scan/replay checklist when direct selected-plan suppression is absent. Direct duplicate, ledger, missed/no-chase, stale, data-quality, hold, and no-trade suppressions still block.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Restart scanner so live Discord boundary uses the fix, and observe the next qualifying selected plan.

## Previous Change

Date: 2026-06-23
Task: Clean up cross-timeframe scanner history reliability for open-timestamped OHLC bars.
Files changed: tools/automation/market-data-ingestion.ts, tools/automation/market-data-ingestion.test.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: Live scanner coverage showed 120M history could be falsely marked data-limited while 240M passed with the same latest timestamp. The scanner was judging higher-timeframe bar-open timestamps against a narrower latest-bar tolerance, which created a 120M reliability backdoor instead of a true missing-history defect.
Tests run: npx tsx tools/automation/market-data-ingestion.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; 3x loopback verification across both focused tests; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed. Focused tests, the 3x loopback, required guards, lint, and build passed. Coverage was verified across all wired timeframes: 5M, 15M, 60M, 120M, and 240M. The verifier now applies one shared open-timestamp coverage tolerance instead of an accidental 120M-specific failure mode.
Trading logic changed: No. This changes scanner history sufficiency classification and repair gating only. It does not change setup definitions, ranking, entry, stop, target, risk, invalidation, bar-close handling, scanner selection, or `canExecute`.
Bridge impact: Yes, limited to data-quality classification. The scanner still reads `market_bars` first, still repairs from NinjaTrader, still rejects malformed/misaligned/stale history, and still reports true gaps as data-quality defects.
Discord impact: Indirect only. False 120M data-limited suppression should be reduced when the latest valid 120M open-timestamped candle is current for its timeframe. True stale/missing history remains blocked.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Restart/observe scanner so live coverage records reflect the repaired sufficiency rule.

## Previous Change

Date: 2026-06-23
Task: Fix high-confidence conditional Discord boundary routing and execution-status wording.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, docs/PROJECT_STATUS.md.
Reason: Live scanner audits showed high-confidence POST_CONDITIONAL plans with complete levels could still be skipped by the Phase 11 rollout boundary even when the active scanner window was live. The trader-facing wording also made `canExecute=false` read like the plan was dead instead of a conditional plan waiting on the named completed 5M condition.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; npx tsx src/lib/liveDiscordPostEligibility.test.ts; 3x focused verification loop across those three tests; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed. High-confidence POST_CONDITIONAL DeskState with full app-owned levels, score at/above threshold, no stale/no-chase suppression, and `canExecute=false` preserved may now pass the live Discord boundary without the old rollout-confirmation blockers. Ordinary watch/hold/no-trade/stale posts still obey the existing boundary. Discord text now says high-confidence conditional plans are armed only after the named completed 5M condition instead of implying the setup is irrelevant because `canExecute` is false.
Trading logic changed: No. This changes Discord send-boundary routing and presentation wording only. It does not change setup definitions, ranking, entry, stop, target, risk, invalidation, bar-close handling, scanner selection, or the app-owned `canExecute` calculation.
Bridge impact: None.
Discord impact: Yes. Fresh high-confidence conditional trade plans with complete levels should no longer be silently held only because the Phase 11 rollout checklist flag is absent. They still publish as conditional, not execution-approved.
Journal/RAG impact: No schema change. Existing RAG persistence remains tied to the same alert/DeskState paths.
Supabase impact: No migration added.
Known risks: None known after verification. Operationally, stale/no-chase, duplicate ledger, data-quality, hold, and no-trade states remain blocked from live Discord sends.
Next recommended action: Restart the scanner so the live process picks up the boundary fix, then observe the next active-window high-confidence conditional event to confirm Discord posts it as a conditional plan with chart and levels.

## Previous Change

Date: 2026-06-22
Task: Install Phase 11E automatic live Discord posting preflight and hold notices.
Files changed: src/lib/liveDiscordPostEligibility.ts, src/lib/liveDiscordPostEligibility.test.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/SCANNER_VISIBILITY_CLEANUP_AUDIT.md, docs/PROJECT_STATUS.md.
Reason: The scanner needs one final live-post preflight that only allows scanner-owned fresh DeskState posts through Discord while holding duplicate, missed/no-chase, stale, already-reached, data-quality, hold, or no-trade states; when a market/trade-state hold occurs, Discord should show the held reason instead of staying silent.
Tests run: npx tsx src/lib/liveDiscordPostEligibility.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit --pretty false; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. Phase 11E extends the existing live Discord eligibility boundary with actionable DeskState and operational-suppression checks. The scanner already routes Morning HTF Desk Map, Tactical Reversal Watch, Current Desk Plan, and primary scanner alert posts through this boundary. Boundary-held market/trade states can now send a rate-limited Discord Scanner Hold notice with the exact held reason, line/next condition, run context, and `canExecute=false` boundary.
Trading logic changed: No intended change. This is live Discord send-boundary filtering only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, bridge behavior, or live trade approval.
Bridge impact: None.
Discord impact: Yes. Live scanner trade/DeskState posts are held unless DeskState is POST_PLAN, POST_REVIEW, POST_CONDITIONAL, or POST_WATCH and is not duplicate, missed/no-chase, stale/chasing, already past target, data-limited, hold, or no-trade. If the only failed live-boundary checks are DeskState action/suppression checks, the scanner posts one ephemeral Scanner Hold notice per completed 5M/reason so the trader sees why no trade plan was posted.
Journal/RAG impact: No schema or persistence change.
Supabase impact: No migration added.
Known risks: None known in code after verification. Operationally, Discord still only posts trade plans when the scanner has a fresh non-duplicate candidate inside an active scanner window; held notices are informational and do not create trade authority.
Next recommended action: Run the final verification suite, then observe the next active-window fresh setup. The supervisor should post only when the scanner produces a fresh non-duplicate candidate; otherwise it should hold with a logged reason.

## Previous Change

Date: 2026-06-22
Task: Install HTF FVG decision-zone Discord alerts.
Files changed: src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, docs/DESK_STATE_PHASE_HANDOFF.md, docs/PROJECT_STATUS.md.
Reason: The desk needs FVG reaction-zone visibility in Discord without turning HTF FVGs into standalone trade approvals.
Tests run: npx tsx src/lib/localScannerEngine.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. DeskState now carries scanner-owned FVG decision-zone metadata when the active line in the sand is already an FVG/imbalance line, and Current Desk Plan Discord output shows a compact `FVG Decision Zone` block with why/hold/fold/no-chase language.
Trading logic changed: No intended change. This adds scanner-owned FVG decision-zone metadata and Discord wording only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, bridge behavior, or live trade approval.
Bridge impact: None.
Discord impact: Yes. Existing Current Desk Plan / DeskState Discord output can now show a compact `FVG Decision Zone` block when the scanner already has a structured FVG/imbalance line in the sand.
Journal/RAG impact: No schema or persistence change.
Supabase impact: No migration added.
Known risks: None known. Existing live-post Phase 11B/11C policy still controls whether live Discord sends are allowed.
Next recommended action: Use the next live dry scan to confirm the FVG Decision Zone wording appears on an actual scanner-owned FVG/imbalance line before enabling any broader FVG alert cadence.

## Previous Change

Date: 2026-06-22
Task: Install 9 Phase 11C live Discord rollout checklist.
Files changed: tools/automation/live-discord-rollout.ts, tools/automation/live-discord-rollout.test.ts, package.json, scripts/architecture-guard.js, docs/SCANNER_VISIBILITY_CLEANUP_AUDIT.md, docs/PROJECT_STATUS.md.
Reason: Phase 11B blocks unconfirmed live scanner trade/DeskState posts; Phase 11C adds the deterministic operator checklist for dry scan, diagnostic replay, controlled live-post confirmation, receipt verification, and rollback.
Tests run: npx tsx tools/automation/live-discord-rollout.test.ts; npm run guard:architecture; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. The rollout tool is read-only and prints the command contract for an operator-controlled smoke; it does not run the scanner, post Discord, or set confirmation environment variables.
Trading logic changed: No intended change. This is rollout tooling, tests, guard coverage, and docs only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, bridge behavior, or live trade approval.
Bridge impact: None.
Discord impact: No runtime/cadence/send change. Phase 11C does not enable live posts; it prints the controlled command that still requires explicit operator use of `--live-discord-policy-confirmed`.
Journal/RAG impact: No schema or persistence change.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Use `npm run nt:live-discord-rollout -- --date YYYY-MM-DD --instrument MES --session lunch --bridge-instrument "MES 09-26" --from 12:00 --to 15:50 --pretty` during the selected active window to generate the dry-scan, replay, controlled one-shot live-post, receipt verification, and rollback commands. Execute the live command only after the dry scan and replay evidence pass and the operator explicitly approves the one live post.

## Previous Change

Date: 2026-06-22
Task: Install 8 Phase 11B live Discord send-boundary guard.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, scripts/architecture-guard.js, docs/SCANNER_VISIBILITY_CLEANUP_AUDIT.md, docs/PROJECT_STATUS.md.
Reason: Phase 11A defined live-post eligibility; Phase 11B wires that policy into scanner-owned live Discord trade/DeskState sends as an operational guard before webhook POST.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx src/lib/liveDiscordPostEligibility.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. Scanner-owned live Morning HTF Desk Map, Tactical Reversal Watch, Current Desk Plan, and primary scanner alert posts now build a Phase 11B send-boundary report after the decision tape/audit path exists. Live sends require READY health, resolved bridge, fresh completed 5M, HTF context present, DeskState/visibility metadata, audit/tape paths, validated payload, configured webhook, and explicit `--live-discord-policy-confirmed` or `QUANT_DESK_LIVE_DISCORD_POLICY_CONFIRMED=true`. Dry-run behavior and operational health/data-quality notices remain unchanged.
Trading logic changed: No intended change. This is Discord send-boundary enforcement only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, bridge behavior, or live trade approval.
Bridge impact: None.
Discord impact: Yes. Live scanner trade/DeskState posts are blocked unless the Phase 11A rollout checklist is explicitly confirmed. Dry-run/log-only behavior is unchanged.
Journal/RAG impact: No schema or persistence change.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: After Phase 11B passes and is committed, proceed to Phase 11C: deterministic rollout checklist, controlled live-post smoke protocol, receipt verification, and rollback steps.

## Previous Change

Date: 2026-06-22
Task: Install 7 Phase 11A live Discord post eligibility policy.
Files changed: src/lib/liveDiscordPostEligibility.ts, src/lib/liveDiscordPostEligibility.test.ts, src/config/responsibilityRegistry.ts, src/config/responsibilityRegistry.test.ts, scripts/architecture-guard.js, package.json, docs/SCANNER_VISIBILITY_CLEANUP_AUDIT.md, docs/PROJECT_STATUS.md.
Reason: Live Discord enablement needs an explicit readiness checklist before any future phase removes dry-run suppression or wires policy into the send boundary.
Tests run: npx tsx src/lib/liveDiscordPostEligibility.test.ts; npx tsx src/config/responsibilityRegistry.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. Phase 11A adds a standalone policy-only eligibility report requiring READY scanner health, connected/resolved bridge, fresh completed 5M, required HTF context, scanner-owned DeskState/visibility metadata, writable decision tape, audit path, validated Discord payload with visibility metadata, configured webhook, dry-run intentionally disabled, fresh dry scan observed, and diagnostic replay passed.
Trading logic changed: No intended change. This is a dormant policy contract, test coverage, guard coverage, responsibility metadata, and docs only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, bridge behavior, Discord cadence, Discord send behavior, or live trade approval.
Bridge impact: None.
Discord impact: No runtime/cadence/send change. Phase 11A does not enable live posts and is not wired into the sender.
Journal/RAG impact: No schema or persistence change.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: After Phase 11A passes and is committed, review Phase 11B to decide whether to wire this policy into the Discord send boundary as an operational guard without changing trade approvals.

## Previous Change

Date: 2026-06-22
Task: Install 6 Phase 10 production readiness for Phase 9F audit replay.
Files changed: tools/automation/scanner-audit-import.ts, tools/automation/diagnostic-replay.ts, src/agents/bridgeDiagnosticReplayAgent.test.ts, scripts/architecture-guard.js, docs/SCANNER_VISIBILITY_CLEANUP_AUDIT.md, docs/PROJECT_STATUS.md.
Reason: Live dry-scan review showed generated lunch decision tapes need direct importer support: the tape stores keyed events, same-day history can contain mixed Phase 9E promotion schema, and replay should honor the requested market-time window.
Tests run: npx tsx src/agents/bridgeDiagnosticReplayAgent.test.ts; npx tsc --noEmit; npm run diagnostic:replay -- --date 2026-06-22 --instrument MES --session lunch --bridge-instrument "MES 09-26" --from 12:00 --to 14:10 --direction AUTO --audit-dir tools/automation/discord-audit --pretty; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. Diagnostic replay now loads generated decision-tape audit history directly, normalizes historical DeskState promotion metadata in memory, honors the requested replay window, and reports Phase 9F pass for the generated 2026-06-22 MES lunch dry-scan tape from 12:00-14:10 ET.
Trading logic changed: No intended change. This is audit import, diagnostic replay CLI, tests, guard, and docs only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, bridge behavior, Discord cadence, or live trade approval.
Bridge impact: None.
Discord impact: No runtime/cadence change.
Journal/RAG impact: No schema or persistence change. Existing audit files are not rewritten.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: After commit, perform one fresh active-window dry scan and run `diagnostic:replay -- --session <active-session>` directly against the generated tape as the final operational smoke check before any live Discord enablement discussion.

## Previous Change

Date: 2026-06-22
Task: Install 5 Phase 9F Replay Validation verdict.
Files changed: src/agents/bridgeDiagnosticReplayAgent.ts, src/agents/bridgeDiagnosticReplayAgent.test.ts, tools/automation/diagnostic-replay.ts, scripts/architecture-guard.js, docs/SCANNER_DESK_STATE_PHASE_9_AUDIT.md, docs/SCANNER_VISIBILITY_CLEANUP_AUDIT.md, docs/PROJECT_STATUS.md.
Reason: Phase 9F needs a research/replay-only verdict that answers whether watch-to-plan visibility worked before trusting the command path live.
Tests run: npx tsx src/agents/bridgeDiagnosticReplayAgent.test.ts; npx tsx src/lib/localScannerEngine.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. Diagnostic replay reports now include `phase9FReplayValidation`, with checks for watch-before-move/path, scanner-owned line metadata, promotion correctness, no-chase preservation, explained no-trade states, and Discord/RAG/UI alignment.
Trading logic changed: No intended change. This is diagnostic replay output, tests, guard, and docs only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, bridge behavior, Discord cadence, or live trade approval.
Bridge impact: None.
Discord impact: No runtime/cadence change. The diagnostic CLI can now print the Phase 9F replay verdict.
Journal/RAG impact: No schema or persistence change.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Run a live dry-scan observation during an active window and inspect the Phase 9F verdict from generated scanner audit history before considering Phase 9 command-path work complete for live use.

## Previous Change

Date: 2026-06-22
Task: Install 4 Phase 9E Watch-To-Plan Promotion guardrails.
Files changed: src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, src/agents/bridgeDiagnosticReplayAgent.test.ts, tools/automation/nt-scanner-alert.test.ts, scripts/architecture-guard.js, docs/SCANNER_VISIBILITY_CLEANUP_AUDIT.md, docs/PROJECT_STATUS.md.
Reason: Make watch-to-plan continuity explicit and replay-verifiable without changing approvals. DeskState promotion metadata now states required proof, blockers, no-chase/protected-5M expectations, and the no-authority-change boundary.
Tests run: npx tsx src/lib/localScannerEngine.test.ts; npx tsx src/agents/bridgeDiagnosticReplayAgent.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. DeskState promotion metadata now carries proof requirements and approval-boundary diagnostics; replay validation checks watch-to-plan proof metadata and `canExecute` boundary preservation.
Trading logic changed: No intended change. This is scanner-owned metadata, replay validation, tests, guard, and docs only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, bridge behavior, Discord cadence, or live trade approval.
Bridge impact: None.
Discord impact: No runtime/cadence change. Discord/RAG/UI consumers can inspect richer DeskState promotion metadata.
Journal/RAG impact: Metadata shape only inside existing DeskState JSON; no schema migration added.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Proceed to Phase 9F Replay Validation as a research/replay-only install before trusting the full watch-to-plan command path live.

## Previous Change

Date: 2026-06-22
Task: Install 3 Discord Watch Alert hardening.
Files changed: tools/automation/discord-alert-format.ts, tools/automation/nt-scanner-alert.test.ts, docs/SCANNER_VISIBILITY_CLEANUP_AUDIT.md, docs/PROJECT_STATUS.md.
Reason: Phase 9D requires watch alerts to be Discord-ready without creating execution approval. Watch cards now state the completed-5M proof boundary and `canExecute=false` explicitly while preserving no levels, no outcome buttons, and no pending RAG save for watch-only alerts.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. Watch-only Discord text is clearer and tests now assert integration with Install 1 visibility metadata and Install 2 trade-decision map audit.
Trading logic changed: No. This is watch-card wording and test coverage only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, bridge behavior, or live trade approval.
Bridge impact: None.
Discord impact: Yes. Watch-only cards now explicitly show completed-5M proof requirements and `canExecute=false`.
Journal/RAG impact: No behavior change. Watch-only alerts remain excluded from pending trade/outcome RAG persistence.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Commit Install 1-3 together, then review whether Install 4 should start Phase 9E Watch-To-Plan Promotion.

## Previous Change

Date: 2026-06-22
Task: Install 2 source-of-truth propagation for Phase 9A-9C.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, scripts/architecture-guard.js, docs/SCANNER_VISIBILITY_CLEANUP_AUDIT.md, docs/PROJECT_STATUS.md.
Reason: Carry the scanner-owned Trade Decision Map Audit alongside existing Candidate Lifecycle Trace and DeskState metadata so scanner audits, decision tape, Discord/RAG records, and future UI consumers share the same authority map without changing trade approvals.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. Scanner Discord audit JSON, decision tape events, and RAG `trade_plan_json` now include `tradeDecisionMapAudit` generated from `buildTradeDecisionMapAudit()`.
Trading logic changed: No. This is source-of-truth metadata propagation only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, bridge behavior, Discord cadence, or live trade approval.
Bridge impact: None.
Discord impact: No runtime/cadence change. Existing Discord audit/RAG metadata becomes more complete; no new Discord hard blocker was added.
Journal/RAG impact: Yes, metadata only inside existing JSON payloads. No schema migration added.
Supabase impact: Uses existing `trade_embeddings.trade_plan_json`; no migration added.
Known risks: None known.
Next recommended action: Review this Install 2 report before considering Install 3.

## Previous Change

Date: 2026-06-22
Task: Install 1 Foundation Cleanup follow-up for DeskState authority metadata.
Files changed: src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, src/config/setupRegistry.ts, src/config/setupRegistry.test.ts, tools/automation/discord-alert-format.ts, tools/automation/june12-protected-structure-replay.test.ts, scripts/architecture-guard.js, docs/SCANNER_VISIBILITY_CLEANUP_AUDIT.md, docs/PROJECT_STATUS.md.
Reason: Complete the Phase 8.45-8.6 cleanup pass by making DeskState/model-routing metadata use precise authority terms while preserving existing scanner, Discord, RAG, bridge, and canExecute behavior.
Tests run: npx tsx src/config/setupRegistry.test.ts; npx tsx src/lib/localScannerEngine.test.ts; npx tsx tools/automation/june12-protected-structure-replay.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. Added `bestActiveModel`, `bestActiveModelName`, `selectedRegisteredModel`, and `REGISTERED_SETUP_TYPES` as precise metadata names while retaining deprecated compatibility aliases for stored audits/tests.
Trading logic changed: No. This is metadata, docs, tests, and guard coverage only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, bridge behavior, or live trade approval.
Bridge impact: None. NinjaTrader/market_bars OHLC remains source of truth.
Discord impact: No runtime behavior change. Formatter typing can now consume precise DeskState authority fields; no new Discord hard blocker or cadence change was added.
Journal/RAG impact: No schema change. Existing audit/RAG compatibility aliases remain.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Review this Install 1 report before considering Install 2.

## Previous Change

Date: 2026-06-22
Task: Add Tactical Reversal Watch learning and research feedback buttons.
Files changed: tools/automation/discord-outcome-buttons.ts, tools/automation/discord-outcome-buttons.test.ts, functions/api/discord-outcome.js, functions/api/discord-outcome.test.js, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: Tactical Reversal Watch posts need trader feedback buttons for cases where a watch map worked, failed, was stale, or worked after invalidation, and that feedback must be saved as learning plus research evidence without changing trade approval.
Tests run: npx tsx tools/automation/discord-outcome-buttons.test.ts; node --test functions/api/discord-outcome.test.js; npx tsx tools/automation/nt-scanner-alert.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed. Tactical Reversal Watch posts now include watch-quality feedback buttons, seed a RAG/research record, attach the Discord message receipt for card locking, and persist submitted feedback as `discordWatchFeedback` plus `researchOutcomeFeedback`. The local posting preflight blocks watch-feedback buttons unless the deployed Cloudflare outcome endpoint advertises `watchFeedbackResearch` support.
Trading logic changed: No. This is Discord feedback and persistence only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, bridge behavior, or live trade approval.
Bridge impact: None. NinjaTrader/market_bars OHLC remains source of truth.
Discord impact: Yes. Tactical Reversal Watch messages can now show learning/research buttons: Watch Worked, Worked After Invalid, Watch Failed, Stale When Posted, No Trigger, and Needs Review.
Journal/RAG impact: Yes. Existing `trade_embeddings` rows are seeded/updated with watch feedback and research-only outcome metadata; no schema migration added.
Supabase impact: Uses existing `trade_embeddings` fields only; no migration added.
Known risks: None known.
Next recommended action: Restart the scanner so future live Tactical Reversal Watch posts include the learning/research feedback buttons.

## Previous Change

Date: 2026-06-22
Task: Restore Alert Quality panel on Desk Map chart renders.
Files changed: tools/automation/chart-markup-renderer.ts, tools/automation/chart-markup-renderer.test.ts, docs/PROJECT_STATUS.md.
Reason: Desk Map / Review Only chart images were showing Desk Readiness but no longer showed the Alert Quality scorecard with Structure, Model, Trigger, Risk, Targets, and Conditions.
Tests run: npx tsx tools/automation/chart-markup-renderer.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; rendered QA PNG at reports/qa/desk-map-alert-quality-qa-1782138719610.png and inspected it visually; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed. Desk Map chart renders now keep Desk Readiness and add the Alert Quality scorecard below it without covering candles, price labels, time labels, or the footer.
Trading logic changed: No. This is chart rendering/presentation only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, Discord cadence, RAG save behavior, or bridge behavior.
Bridge impact: None. NinjaTrader/market_bars OHLC remains source of truth.
Discord impact: Yes. Future Discord chart card attachments for Desk Map / Review Only renders include the Alert Quality breakdown again.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Restart the scanner so future live Discord chart attachments use the restored Alert Quality panel.

## Previous Change

Date: 2026-06-22
Task: Normalize Tactical Reversal Watch Discord format.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: Current Desk Plan and Morning HTF Desk Map had the disciplined emoji/status Discord style, but Tactical Reversal Watch still used plain labels and did not make entry reference, stop, T1, and T2 prominent enough for trader review.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; visual QA on rendered reversal-watch PNG; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. Tactical Reversal Watch Discord text now matches the emoji/status style used by the other scanner reports and shows a compact `Watch Plan Levels (Reference Only)` block with line in the sand, entry ref, stop ref, T1, and T2.
Trading logic changed: No. This is Discord presentation text only; it does not change reversal-watch state detection, setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, chart rendering, or Discord cadence.
Bridge impact: None. NinjaTrader/market_bars OHLC remains source of truth.
Discord impact: Yes. Tactical Reversal Watch messages now use emoji title/content, primary/status/level lines, field headers, and a visible `Watch Plan Levels (Reference Only)` block with line in the sand, entry ref, stop ref, T1, and T2 while preserving the watch-only boundary.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Restart the scanner after deployment so future live Tactical Reversal Watch posts use the normalized format.

## Previous Change

Date: 2026-06-22
Task: Add Phase 3 read-only research case review.
Files changed: tools/automation/research-desk-case-review.ts, tools/automation/research-desk-case-review.test.ts, tools/automation/research-desk-evidence-table.ts, tools/automation/research-desk-evidence-table.test.ts, Open-QuantDesk-ResearchReview.ps1, tools/supervisor/supervisor.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: Phase 2 identified ready-for-deeper-review rows; Phase 3 needs to inspect those rows case by case, flag missing evidence/blockers, and prevent generated research meta-reports from being re-ingested as evidence.
Tests run: npx tsx tools/automation/research-desk-evidence-table.test.ts; npx tsx tools/automation/research-desk-case-review.test.ts; npx tsx tools/supervisor/supervisor.test.ts; npm run research:desk-evidence -- --json; npm run research:desk-case-review -- --json.
Result: Passed. The new case-review report reads Phase 2 ready rows, opens source artifacts, summarizes strengths/blockers/missing evidence, writes HTML/Markdown/JSON, and keeps the tray `Open Research Status` pointed at the Phase 3 HTML report. Latest Phase 2 run reviewed 697 artifacts and produced 1 ready-for-deeper-review row, 40 needs-more-data rows, and 484 keep-out-of-scanner rows. Latest Phase 3 run reviewed 1 ready row and marked it manual-validation-required before any promotion discussion.
Trading logic changed: No. This is read-only research reporting only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, Discord cadence, RAG save behavior, or bridge behavior.
Bridge impact: None.
Discord impact: None. The case-review report and tray helper do not post Discord or change Discord cadence.
Journal/RAG impact: No schema change and no Supabase writes.
Supabase impact: No migration added.
Known risks: None known. Phase 3 found no case clean enough for scanner/Discord promotion discussion yet.
Next recommended action: Use the Phase 3 HTML review to decide whether any candidate deserves manual replay expansion; do not discuss live scanner/Discord behavior until that manual replay evidence is complete.

## Previous Change

Date: 2026-06-22
Task: Add Phase 2 read-only research evidence table and tray review output.
Files changed: tools/automation/research-desk-evidence-table.ts, tools/automation/research-desk-evidence-table.test.ts, Open-QuantDesk-ResearchReview.ps1, tools/supervisor/supervisor.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: Phase 1 sorted the research pile; Phase 2 needs to turn promising artifacts into a machine-readable evidence table before any scanner behavior or Discord behavior is considered.
Tests run: npx tsx tools/automation/research-desk-evidence-table.test.ts; npx tsx tools/automation/research-desk-inventory.test.ts; npx tsx tools/supervisor/supervisor.test.ts; npm run research:desk-evidence -- --json.
Result: Passed. The new evidence table extracts sample/outcome counts when available, excludes generated research meta-reports from re-ingestion, marks promotion risk, writes HTML/Markdown/JSON, and keeps the tray `Open Research Status` pointed at the Phase 2 HTML report. Latest run reviewed 697 artifacts and produced 2 ready-for-deeper-review rows, 39 needs-more-data rows, and 484 keep-out-of-scanner rows.
Trading logic changed: No. This is read-only research reporting only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, Discord cadence, RAG save behavior, or bridge behavior.
Bridge impact: None.
Discord impact: None. The evidence table and tray helper do not post Discord.
Journal/RAG impact: No schema change and no Supabase writes.
Supabase impact: No migration added.
Known risks: None known. The evidence table uses machine-readable fields and text heuristics for triage only; it does not prove model readiness by itself.
Next recommended action: Phase 3 should deep-review the ready-for-deeper-review rows case by case before any live scanner or Discord behavior change is discussed.

## Previous Change

Date: 2026-06-22
Task: Make the tray research status open an HTML report by default.
Files changed: tools/automation/research-desk-inventory.ts, tools/automation/research-desk-inventory.test.ts, Open-QuantDesk-ResearchReview.ps1, tools/supervisor/supervisor.test.ts, docs/PROJECT_STATUS.md.
Reason: The operator review should open in a readable browser view from the Windows tray instead of relying on the OS Markdown file association.
Tests run: npx tsx tools/automation/research-desk-inventory.test.ts; npx tsx tools/supervisor/supervisor.test.ts; npm run research:desk-review -- --json.
Result: Passed. The inventory command writes HTML alongside Markdown/JSON, returns `htmlPath` in JSON mode, and the tray helper opens the newest HTML inventory report.
Trading logic changed: No. This is operator reporting only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, Discord cadence, RAG save behavior, or bridge behavior.
Bridge impact: None.
Discord impact: None. The inventory and tray helper do not post Discord.
Journal/RAG impact: No schema change and no Supabase writes.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Use the tray item to open the HTML status report, then decide whether Phase 2 should build the evidence table for promising artifacts.

## Previous Change

Date: 2026-06-22
Task: Add Phase 1 read-only Quant Desk research inventory and tray entrypoint.
Files changed: tools/automation/research-desk-inventory.ts, tools/automation/research-desk-inventory.test.ts, Open-QuantDesk-ResearchReview.ps1, QuantDeskSupervisorTray.ps1, tools/supervisor/supervisor.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The desk needs a one-click/read-only way to see where all current research stands before deciding what deserves deeper evidence review or future promotion discussion.
Tests run: npx tsx tools/automation/research-desk-inventory.test.ts; npx tsx tools/supervisor/supervisor.test.ts; npm run research:desk-review -- --json.
Result: Passed. The inventory scans local research/report artifacts, summarizes families/report types/status buckets/latest artifacts, writes Markdown/JSON under ignored `tools/automation/research-reports`, and the supervisor tray now includes `Open Research Status` to launch the report helper.
Trading logic changed: No. This is read-only research inventory and operator UI convenience only; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, Discord cadence, RAG save behavior, or bridge behavior.
Bridge impact: None.
Discord impact: None. The inventory and tray helper do not post Discord.
Journal/RAG impact: No schema change and no Supabase writes.
Supabase impact: No migration added.
Known risks: The Phase 1 inventory uses keyword/status heuristics and shallow metadata sampling only. It identifies where to review next; it does not prove or reject a model.
Next recommended action: Phase 2 should build an evidence table for the promising artifacts with sample size, T1/T2/stop/no-confirmation counts, best/worst conditions, authority impact, and promotion risk.

## Previous Change

Date: 2026-06-21
Task: Add Phase 3 research-only Sniper Watch audit.
Files changed: tools/automation/sniper-watch-research-audit.ts, tools/automation/sniper-watch-research-audit.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The desk needs to study whether review-only line-in-the-sand reference plans with discretionary 1M timing and completed 5M confirmation are worth promoting later, without changing live scanner execution rules.
Tests run: npx tsx tools/automation/sniper-watch-research-audit.test.ts; npm run diagnostic:sniper-watch-research-audit -- --trade-date 2026-06-21 --instrument MES --sessions all --json.
Result: Passed. The audit reads scanner decision tapes, consolidates duplicate reference-level refreshes, reports unique non-executable sniper-watch opportunities, completed 5M confirmations, T1/T2/stop/unresolved outcomes, and clearly states that 1M evidence is not available in decision tapes.
Trading logic changed: No. This is read-only research tooling; it does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, Discord cadence, or RAG save behavior.
Bridge impact: None. The audit reads local scanner decision tapes only.
Discord impact: None. The audit does not post Discord.
Journal/RAG impact: No schema change and no writes. This is diagnostic output only.
Supabase impact: No migration added.
Known risks: The audit cannot verify the discretionary 1M close because scanner decision tapes do not store 1M bars; it only studies the completed 5M confirmation/outcome leg.
Next recommended action: Review the generated report and decide whether Phase 4 should add optional 1M OHLC capture for research only, or keep sniper-watch study limited to 5M confirmation and manual journal notes.

## Previous Change

Date: 2026-06-21
Task: Add review-only Line-in-the-Sand Sniper Watch tracking and Discord wording.
Files changed: tools/automation/nt-scanner.ts, tools/automation/discord-alert-format.ts, tools/automation/nt-scanner-alert.test.ts, tools/automation/discord-alert-format.test.ts, docs/PROJECT_STATUS.md.
Reason: The trader successfully used scanner line-in-the-sand reference levels with discretionary 1M timing and completed 5M confirmation, and wants that workflow visible and learnable without turning it into app execution approval.
Tests run: npx tsx tools/automation/discord-alert-format.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; npm run nt:scanner -- --once --dry-run.
Result: Passed. Non-executable scanner RAG records now include `Line-in-the-Sand Sniper Watch` metadata when complete reference levels exist, with explicit 1M timing/5M confirmation and approval-boundary fields. Discord review-only level blocks now show a compact `Sniper watch: 1M timing only; 5M close/hold required.` line.
Trading logic changed: No. This is review-only metadata and wording. It does not change setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, bar-close confirmation, or Discord approval authority.
Bridge impact: None.
Discord impact: Review-only Current Desk Plan and Tactical Reversal Watch level blocks are clearer while remaining explicitly non-executable.
Journal/RAG impact: No schema change. Existing `trade_plan_json` stores optional sniper-watch research metadata for later outcome study.
Supabase impact: No migration added.
Known risks: None known after verification. The scanner alert suite still prints a non-failing pre-existing compact-text warning for one fixture being above the preferred 1200-character target.
Next recommended action: Phase 3 should be research-only replay/audit of these sniper-watch cases before any discussion of formal model promotion.

## Previous Change

Date: 2026-06-21
Task: Add reference-only levels to Tactical Reversal Watch Discord cards.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: Tactical Reversal Watch cards showed trigger, invalidation, and no-chase map lines, but did not show the existing app-owned opposite-side lifecycle reference entry/stop/T1/T2 levels, which made the trader ask why levels visible elsewhere were absent.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. Reversal Watch lines now carry optional reference entry, stop, T1, and T2 from the existing opposite-side lifecycle. Discord renders them under `Reference Levels Only` with explicit `Not execution approval` and `Reason not executable` language.
Trading logic changed: No. This is display-only Discord reference context; setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, and bar-close confirmation remain unchanged.
Bridge impact: None.
Discord impact: Tactical Reversal Watch cards are clearer while preserving the non-executable boundary and no outcome-button behavior.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Watch the next live Reversal Watch post and confirm the reference levels reduce ambiguity without making the card look like execution approval.

## Previous Change

Date: 2026-06-21
Task: Normalize NinjaTrader bridge active-chart contract reporting.
Files changed: tools/ninjatrader-bridge/QuantDeskBridge.cs, docs/PROJECT_STATUS.md.
Reason: NinjaTrader was visibly on `MES SEP26`, but the live `/health` endpoint still reported stale `MES 06-26` from an older compiled bridge. The bridge source now normalizes month-name chart instruments such as `MES SEP26` to `MES 09-26` and exposes `rawDefaultInstrument` for debugging what NinjaTrader reported.
Tests run: npx tsx tools/automation/bridge-instrument-resolver.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. Updated bridge source was also copied to `C:\Users\Mike\Documents\NinjaTrader 8\bin\Custom\AddOns\QuantDeskBridge.cs`. The running NinjaTrader bridge still reports `0.1.4-readonly` until the NinjaScript AddOn is compiled/reloaded.
Trading logic changed: No. This is bridge health metadata normalization only; bars, timestamps, setup definitions, ranking, canExecute, entries, stops, targets, risk gates, and Discord cadence remain unchanged.
Bridge impact: `/health.defaultInstrument` will report the normalized active chart contract after NinjaTrader compiles/reloads the updated AddOn; `/health.rawDefaultInstrument` keeps the raw chart value for troubleshooting.
Discord impact: None.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: Live `/health` will keep showing `MES 06-26` and `0.1.4-readonly` until NinjaTrader recompiles/reloads the AddOn. Scanner/recorder are already resolving and reading `MES 09-26` current bars.
Next recommended action: Compile NinjaScript in NinjaTrader, then verify `/health.version` is `0.1.7-readonly` and `/health.defaultInstrument` is `MES 09-26`.

## Previous Change

Date: 2026-06-19
Task: Add post-deploy since-filter support to the Scanner Discord family audit.
Files changed: tools/automation/scanner-discord-family-audit.ts, tools/automation/scanner-discord-family-audit.test.ts, docs/PROJECT_STATUS.md.
Reason: The live verification phase needed to separate old pre-fix Desk Play/Reversal Watch receipts from post-restart receipts after the secondary Discord cadence guard was installed.
Tests run: npx tsx tools/automation/scanner-discord-family-audit.test.ts; npm run diagnostic:scanner-discord-family-audit -- --trade-date 2026-06-19 --instrument MES --since 2026-06-19T23:28:24.000Z --json; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. The audit now accepts an optional --since timestamp and filters receipt rows by Discord postedAt so post-deploy cadence can be evaluated without old same-day receipts polluting the result.
Trading logic changed: No. This is read-only diagnostic filtering only; setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, Discord send logic, and bar-close confirmation remain unchanged.
Bridge impact: None.
Discord impact: None. The audit does not post Discord or change cadence.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: Live cadence proof is data-limited until NinjaTrader provides a fresh completed 5M bar; the post-restart audit showed zero new receipt rows because the scanner was safely blocked on stale bridge data.
Next recommended action: Phase 2 should rerun this since-filtered audit after valid live bridge data is restored and a few normal scanner cycles complete.

## Previous Change

Date: 2026-06-19
Task: Add Phase 1 secondary Discord cadence consolidation for Desk Play and Reversal Watch.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: The receipt-family audit showed secondary Desk Play/Reversal Watch reports could create perceived Discord flooding even when the trader-facing state had not materially changed.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. The scanner now stores optional material cadence fingerprints for Desk Play and Reversal Watch ledgers and suppresses duplicate secondary posts when side/readiness/HTF support/action state remains unchanged.
Trading logic changed: No. This only changes Discord post suppression for secondary report families; setup definitions, ranking, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, and bar-close confirmation remain unchanged.
Bridge impact: None.
Discord impact: Reduced repeat Desk Play/Reversal Watch posts when the material trader-facing state has not changed.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Phase 2 should run the scanner family audit after live scanner cycles and confirm Desk Play/Reversal Watch receipts no longer show under-five-minute repeats for unchanged material state.

## Previous Change

Date: 2026-06-19
Task: Add read-only Scanner Discord family Phase 2 audit.
Files changed: tools/automation/scanner-discord-family-audit.ts, tools/automation/scanner-discord-family-audit.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: Phase 1 proved the primary trade-card path was suppressed, so the remaining Discord flood concern needed a separate read-only audit of secondary report families and receipt cadence.
Tests run: npx tsx tools/automation/scanner-discord-family-audit.test.ts; npm run diagnostic:scanner-discord-family-audit -- --trade-date 2026-06-19 --instrument MES --json; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. The audit reads durable Discord receipt files, classifies report families by kind/session, reports counts, first/last post time, minimum spacing, under-five-minute bursts, unique cadence keys, webhook/http/message-id presence, and findings for Desk Play/Reversal Watch noise review.
Trading logic changed: No. This is read-only Discord receipt/cadence audit tooling; setup definitions, ranking, execution approvals, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, Discord cadence, and bar-close confirmation remain unchanged.
Bridge impact: None. The audit reads local Discord receipt audit files only.
Discord impact: None. The audit does not post Discord or change delivery behavior.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Phase 3 should inspect the highest-volume/noisiest family from the receipt audit and propose suppression/consolidation rules without touching trade logic.

## Previous Change

Date: 2026-06-19
Task: Add read-only scanner behavior Phase 1 audit.
Files changed: tools/automation/scanner-behavior-audit.ts, tools/automation/scanner-behavior-audit.test.ts, package.json, docs/PROJECT_STATUS.md.
Reason: The desk needs a clean post/suppress evidence table from scanner decision tapes before changing Discord cadence or stale-plan behavior.
Tests run: npx tsx tools/automation/scanner-behavior-audit.test.ts; npm run diagnostic:scanner-behavior-audit -- --trade-date 2026-06-19 --instrument MES --sessions all --json; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. The audit reads existing decision tapes, reports completed 5M rows, selected candidate, DeskState primary side, canExecute, visibility mode, Discord post/suppress decision, reason, stale/no-chase flags, duplicate suppressions, and candidate-vs-DeskState conflicts. It writes JSON/Markdown under ignored diagnostic reports.
Trading logic changed: No. This is read-only audit tooling; setup definitions, ranking, execution approvals, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, Discord cadence, and bar-close confirmation remain unchanged.
Bridge impact: None. The audit reads local scanner decision tapes only.
Discord impact: None. The audit does not post Discord or change delivery behavior.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Phase 2 should classify each current-rule post by report family and cadence gate so we can decide which family is still too noisy.

## Previous Change

Date: 2026-06-19
Task: Add runtime JSON temp cleanup and operator health bundles.
Files changed: tools/runtimeJson.ts, tools/runtimeJson.test.ts, tools/supervisor/runtimeJsonCleanup.ts, tools/supervisor/runtimeJsonCleanup.test.ts, Export-QuantDesk-HealthBundle.ps1, tools/supervisor/healthBundleScript.test.ts, package.json, docs/LOCAL_RUNTIME_ISOLATION_PLAN.md, docs/PROJECT_STATUS.md.
Reason: The local runtime needed a safe way to clean stale atomic-write temp files and a one-command troubleshooting bundle that captures supervisor status, runtime audit, duplicate-cleanup preview, JSON-cleanup preview, and operator status output.
Tests run: npx tsx tools/runtimeJson.test.ts; npx tsx tools/supervisor/runtimeJsonCleanup.test.ts; npx tsx tools/supervisor/healthBundleScript.test.ts; npm run supervisor:cleanup-json; npm run supervisor:health-bundle; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. Runtime JSON temp cleanup is preview-first and only deletes matching old `*.json.tmp-<pid>-<timestamp>-<hex>` files when explicitly run with `-- --apply`. The health bundle saves read-only diagnostics under ignored `logs/supervisor/health-bundles/<timestamp>`.
Trading logic changed: No. This is local runtime maintenance and troubleshooting only; setup definitions, ranking, execution approvals, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, Discord cadence, and bar-close confirmation remain unchanged.
Bridge impact: None. The health bundle reads existing status/audit output and does not change bridge behavior or market-data handling.
Discord impact: None. No Discord posting behavior changed.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Decide whether to add a small `Open-QuantDesk-Logs.ps1` helper or pause runtime hardening and return to scanner behavior/audit work.

## Previous Change

Date: 2026-06-19
Task: Add runtime JSON state validation and recovery visibility.
Files changed: tools/runtimeJson.ts, tools/runtimeJson.test.ts, tools/supervisor/runtimeAudit.ts, tools/supervisor/runtimeAudit.test.ts, tools/supervisor/statusScript.test.ts, Status-QuantDesk.ps1, docs/LOCAL_RUNTIME_ISOLATION_PLAN.md, docs/PROJECT_STATUS.md.
Reason: The local runtime already used atomic JSON writes and `.bak` fallback, but operator status needed to show when state was recovered from backup, malformed, missing, or failing a basic expected-shape check.
Tests run: npx tsx tools/runtimeJson.test.ts; npx tsx tools/supervisor/runtimeAudit.test.ts; npx tsx tools/supervisor/statusScript.test.ts; npm run supervisor:audit; powershell -NoProfile -ExecutionPolicy Bypass -File .\Status-QuantDesk.ps1; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. Runtime JSON reads now support optional validators and preserve backup fallback. Runtime audit reports supervisor state, scanner state, recorder heartbeat, market-data gap ledger, and notification state health. Status output now shows runtime JSON health and warns when a file is recovered from `.bak`, invalid, or missing when required.
Trading logic changed: No. This is local runtime state validation and operator visibility only; setup definitions, ranking, execution approvals, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, Discord cadence, and bar-close confirmation remain unchanged.
Bridge impact: No contract change. Recorder heartbeat shape is checked only for local status reporting.
Discord impact: None. No Discord posting behavior changed.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Add old temp-file cleanup for failed atomic writes, then consider a one-command operator health bundle that saves audit/status output for troubleshooting.

## Previous Change

Date: 2026-06-19
Task: Harden local runtime audit, duplicate cleanup, and operator status.
Files changed: Repair-QuantDesk-Runtime.ps1, Status-QuantDesk.ps1, tools/supervisor/runtimeAudit.ts, tools/supervisor/runtimeAudit.test.ts, tools/supervisor/runtimeRepairScript.test.ts, tools/supervisor/statusScript.test.ts, package.json, docs/LOCAL_RUNTIME_ISOLATION_PLAN.md, docs/PROJECT_STATUS.md.
Reason: The local Windows runtime needs a safer permanent operating layer that can prove supervisor ownership, detect duplicate scanner/recorder processes, preview cleanup before applying it, and explain live status without confusing data freshness warnings with duplicate-process risk.
Tests run: npx tsx tools/supervisor/runtimeAudit.test.ts; npx tsx tools/supervisor/runtimeRepairScript.test.ts; npx tsx tools/supervisor/statusScript.test.ts; npm run supervisor:audit; npm run supervisor:repair; powershell -NoProfile -ExecutionPolicy Bypass -File .\Status-QuantDesk.ps1; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. Runtime audit is read-only, the repair command defaults to preview and only targets external duplicate scanner/recorder PIDs, and the status command now shows supervisor ownership, startup-task health, bridge reachability, duplicate status, owned process-tree counts, and stale recorder heartbeat as a separate data freshness warning.
Trading logic changed: No. This is local runtime hardening and operator visibility only; setup definitions, ranking, execution approvals, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, Discord cadence, and bar-close confirmation remain unchanged.
Bridge impact: No contract change. The status output reports bridge reachability and recorder heartbeat freshness but does not change bridge reads or market-data handling.
Discord impact: None. No Discord posting behavior changed.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification. Current live status still warns that the recorder heartbeat has a stale latest completed 5M candle, which is an operational data freshness issue, not duplicate process ownership.
Next recommended action: Add schema validation and explicit recovery reporting for local runtime JSON state files.

## Previous Change

Date: 2026-06-19
Task: Add end-of-day market recap reporting phase.
Files changed: tools/automation/nt-scanner.ts, tools/automation/discord-message-policy.ts, tools/automation/nt-scanner-alert.test.ts, tools/automation/discord-alert-format.test.ts, docs/PROJECT_STATUS.md.
Reason: The desk needs a separate learning/reporting recap after RTH close that explains what price did versus the morning HTF map without creating a new trade alert or executable plan.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; npx tsc --noEmit; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed. Scanner can now post one End-of-Day Market Recap between 4:05 PM and 6:45 PM ET when the final RTH completed 5M bar is available. The recap includes Opening Desk Map, What Price Did, Desk Read Review, Execution Boundary, and Bottom Line sections, with no outcome buttons and no execution approval.
Trading logic changed: No. This is reporting/learning cadence only; setup definitions, ranking, execution approvals, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, and bar-close confirmation remain unchanged.
Bridge impact: None. Recap reads completed 5M bars and local scanner decision tapes; NinjaTrader/market_bars remain source of truth.
Discord impact: Yes. End-of-Day Market Recap is classified as a daily/summary report, not a trade alert.
Journal/RAG impact: No schema change. This phase does not write trade-outcome buttons or approve trades.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Restart scanner after deployment so the recap sender is active for the next RTH close.

## Previous Change

Date: 2026-06-19
Task: Add disciplined trading emojis to Current Desk Plan Discord format.
Files changed: tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: The Current Desk Plan format needed the same fast-read bull/bear/range/wait language as the Morning HTF Desk Map without changing any trade decision behavior.
Tests run: npx tsx tools/automation/discord-alert-format.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed. Current Desk Plan Discord text now shows `🛑 WAIT`, `🐂 LONG`, `🐻 SHORT`, emoji HTF rows, and emoji `LONG ABOVE` / `SHORT BELOW` headers while preserving levels, status, chart language, and decision-support boundaries.
Trading logic changed: No. This is Discord presentation only; setup definitions, ranking, execution approvals, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, and bar-close confirmation remain unchanged.
Bridge impact: None. NinjaTrader/market_bars OHLC remains source of truth.
Discord impact: Yes. Current Desk Plan messages are more scannable and stay under compact formatter limits in covered tests.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Restart the scanner after commit so live Discord posts use the updated formatter.

## Previous Change

Date: 2026-06-19
Task: Add Morning HTF Desk Map Discord report format and cadence.
Files changed: tools/automation/nt-scanner.ts, tools/automation/discord-message-policy.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: The trader needs a concise morning structure read in Discord with the trade date, primary WAIT/LONG/SHORT state, key battle area, HTF bias rows, and bottom-line instruction before reviewing individual trade plans.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed. The scanner now sends one Morning HTF Desk Map between 9:20 AM and 10:00 AM ET after a completed 5M bar is available, with `🛑 WAIT`, HTF bull/bear/range emojis, key battle area, latest completed 5M timestamp, and explicit “not execution approval” language. The report is classified as a watch/map message with no outcome buttons.
Trading logic changed: No. This is Discord presentation and cadence only; setup definitions, ranking, execution approvals, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, and bar-close confirmation remain unchanged.
Bridge impact: None. NinjaTrader/market_bars OHLC remains source of truth; the report reads scanner-owned DeskState/HTF map rows only.
Discord impact: Yes. Adds a once-per-morning HTF map report and policy classification so it is not treated as a trade alert.
Journal/RAG impact: No schema change and no RAG/outcome buttons on the HTF map report.
Supabase impact: No migration added.
Known risks: None known after verification.
Next recommended action: Observe the next live morning session and decide whether to extend the same disciplined emoji/status language to other report families in a separate formatting pass.

## Previous Change

Date: 2026-06-18
Task: Install reversal-watch Discord card, chart, and cadence phases.
Files changed: tools/automation/nt-scanner.ts, tools/automation/chart-markup-renderer.ts, tools/automation/discord-message-policy.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: The desk needs a clear trader-facing signal when a prior LONG or SHORT campaign has reached its reaction zone and the next best read is an opposite-side completed-5M reversal watch, without flooding Discord with cold invalidations, stale maps, or fake executable plans.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx tools/automation/live-desk-observer.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; replayed tools/automation/discord-audit/scanner-decision-tape-2026-06-18-MES-lunch.json from lunch through close; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. The scanner can now post a dedicated Tactical Reversal Watch Discord card with a rendered chart showing reaction zone, trigger line, invalidation line, no-chase line, current price, and completed-5M rule language. The card is classified as a watch message, has no outcome buttons, and is not an execution approval. Cadence now suppresses forming states, cold invalidated/no-chase states, and duplicate fingerprints; terminal states only post as follow-up after a prior active/validated watch. The June 18 lunch replay produced two posts from 12:00-16:00 ET: a 12:55 validated SHORT watch and a 13:15 invalidation follow-up; later cold invalidated/no-chase states stayed local.
Trading logic changed: No. This is Discord presentation, chart rendering, audit metadata, and cadence only; setup definitions, ranking, execution approvals, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, and bar-close confirmation remain unchanged.
Bridge impact: None. NinjaTrader/market_bars OHLC remains source of truth.
Discord impact: Yes. Reversal-watch states can now post as watch-only cards, while broad Desk Play refreshes stand down for the cycle when a reversal-watch card is sent.
Journal/RAG impact: No schema change and no trade-outcome buttons on reversal-watch cards.
Supabase impact: No migration added.
Known risks: None known after tests and the June 18 lunch-to-close replay.
Next recommended action: Observe the next live RTH session to confirm the watch card cadence feels trader-useful and that executable trade alerts remain limited to the app-owned canExecute path.

## Previous Change

Date: 2026-06-18
Task: Install reversal-watch line builder and state metadata phases.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: The live desk needs to recognize when a LONG or SHORT campaign has reached its target/reaction zone and the next best desk read is an opposite-side reversal watch with explicit completed-5M reclaim, retest, invalidation, and no-chase lines.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx tools/automation/live-desk-observer.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. The scanner now builds symmetric campaign-exhaustion reversal-watch metadata for SHORT exhaustion into LONG watch and LONG exhaustion into SHORT watch. The decision tape records reversal-watch lines and state for audit only, including reaction zone, trigger line, completed-5M reclaim rule, retest/hold rule, invalidation line, no-chase line, and state values such as forming, watch_active, direction_validated, stalled, invalidated, and no_chase.
Trading logic changed: No. This is metadata/audit state only; no setup definitions, ranking, execution approvals, canExecute, entries, stops, targets, risk gates, model definitions, Discord posting, or bar-close handling changed.
Bridge impact: None. NinjaTrader/market_bars OHLC remains source of truth.
Discord impact: None yet. Phases 3-4 will add Discord card/chart/cadence after this metadata is audited.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known. The new decision-tape fields are additive and audit-only.
Next recommended action: Install Phases 3-4 together: reversal-watch Discord card, chart render, and dedupe/cadence.

## Previous Change

Date: 2026-06-18
Task: Add all-trading-time HTF tactical campaign watch delivery.
Files changed: tools/automation/live-desk-observer.ts, tools/automation/live-desk-observer.test.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: The live desk needed all-trading-time language and a Discord delivery path for HTF-backed tactical campaigns when 1H/2H/4H support plus app-owned 5M lifecycle evidence exists, without pretending the plan is executable.
Tests run: npx tsx tools/automation/live-desk-observer.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; replayed tools/automation/discord-audit/scanner-decision-tape-2026-06-18-MES-lunch.json against the new policy.
Result: Passed. Observer reports now say Live Trading Time Observer, not lunch observer. Desk Play suppression now permits non-executable tactical campaign watch cards when a primary LONG/SHORT map has aligned 1H/2H/4H context and either aligned 5M protected structure or app-owned 5M candidate lifecycle evidence. The June 18 afternoon short campaign now becomes Discord-eligible from 13:45-14:20 ET, including the 14:05 HTF displacement/MSS short watch.
Trading logic changed: No. This is Discord/observer delivery and cadence metadata only; setup definitions, ranking, execution approvals, canExecute, entries, stops, targets, risk gates, model definitions, scanner selection, and bar-close handling are unchanged.
Bridge impact: None. NinjaTrader/market_bars OHLC remains source of truth.
Discord impact: Yes. HTF tactical campaign watches can post as review/watch desk maps, while executable trade approval still requires the existing app-owned canExecute path.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: One new Desk Play refresh may post after deployment because prior ledger records do not have the new tactical campaign fingerprint; unchanged repeats should suppress after the new receipt is recorded.
Next recommended action: Observe the next full RTH active desk window and confirm tactical campaign watches post as review-only maps, not executable trade alerts.

## Previous Change

Date: 2026-06-17
Task: Suppress evening HTF-only data-quality Discord notices.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: After Discord was re-enabled, the evening scanner correctly kept completed 5M ready but posted operational data-quality notices when only 240M HTF context lagged. That is a local HTF-promotion blocker, not a trader-facing Discord alert.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. Evening `completed5m=ready` HTF-only readiness blockers now remain local for 15M/60M/120M/240M-only gaps instead of posting data-quality Discord notices.
Trading logic changed: No. This is Discord operational-notice filtering only; HTF sufficiency remains enforced locally, and setup selection, ranking, execution approvals, canExecute, entries, stops, targets, risk gates, model definitions, and bar-close handling are unchanged.
Bridge impact: None. NinjaTrader/market_bars OHLC remains source of truth.
Discord impact: Yes. Evening `completed5m=ready` HTF-only readiness blockers remain local logs instead of Discord posts.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: A true completed-5M blocker can still post, by design, because that means execution evidence is not usable.
Next recommended action: Keep scanner Discord enabled under observation. Treat any future Discord data-quality notice as actionable only if completed 5M is blocked/missing; otherwise extend the presentation filter without touching execution gates.

## Previous Change

Date: 2026-06-17
Task: Clarify scanner Desk Play stale-report suppression language.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: Live scanner logs classified missed/no-chase setup suppression as `stale_data` and said completed 5M data was stale, even when the recorder and market_bars were healthy. That made left-behind plans look like operational data staleness.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. Missed/no-chase Desk Play suppression now uses `missed_no_chase`; review maps with already-passed targets use `passed_or_invalidated_levels`; neither path says completed 5M market data is stale.
Trading logic changed: No. This is Discord Desk Play suppression classification and audit/log wording only; scanner setup selection, ranking, execution approvals, canExecute, entries, stops, targets, risk gates, model definitions, and bar-close handling are unchanged.
Bridge impact: None. NinjaTrader/market_bars OHLC remains source of truth.
Discord impact: Yes. Missed/no-chase and already-passed review maps remain suppressed, but they are no longer labeled as stale completed-5M data.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known.
Next recommended action: Keep scanner Discord enabled under observation. If a Discord message still appears stale to the trader, compare the receipt ID to the suppression category and fix the remaining presentation/cadence path without touching execution logic.

## Previous Change

Date: 2026-06-17
Task: Suppress evening 120M-only data-quality Discord noise.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: After scanner Discord was re-enabled, the evening scanner posted repeated operational data-quality notices because the 120M context lagged while completed 5M, 15M, 60M, and 240M context were usable. This was correct as a local HTF-context blocker but too noisy for trader-facing Discord.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed. Evening `completed5m=ready, insufficient=120m` data-readiness notices now remain local logs instead of Discord posts. Real completed-5M/current-bar blockers and non-evening 120M data-quality notices remain eligible for Discord.
Trading logic changed: No. This is Discord operational-notice filtering only; scanner local blockers, HTF sufficiency handling, setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, scanner selection, and bar-close handling are unchanged.
Bridge impact: None. NinjaTrader/market_bars OHLC remains source of truth.
Discord impact: Yes. Reduces evening operational notice noise after re-enabling scanner Discord.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: A persistent evening 120M gap still blocks HTF promotion locally; it just no longer posts repetitive Discord notices when 5M is current.
Next recommended action: Keep scanner Discord enabled under observation. If true 5M/current-data blockers post, fix the data feed; if wrong main plays post, evaluate Phase D.

## Previous Change

Date: 2026-06-17
Task: Normalize Phase C stand-down wording after live-tape audit.
Files changed: tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, docs/PROJECT_STATUS.md.
Reason: The June 17 bar-by-bar audit showed the new Phase C `Stand down` line could inherit source invalidation text that already began with `Invalid if`, producing awkward trader-facing text such as `Stand down: Invalid if ...`.
Tests run: npx tsx tools/automation/discord-alert-format.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed. Stand-down wording now strips a leading `Invalid if` while preserving the source invalidation as the separate `Invalidation` line.
Trading logic changed: No. This is Discord presentation text only; no setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, scanner selection, or bar-close handling changed.
Bridge impact: None.
Discord impact: Yes. Trader-facing stand-down text is clearer and no longer nests invalidation phrasing inside the stand-down label.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None known in Phase C presentation after this audit fix. Scanner Discord remains intentionally disabled in local supervisor config until monitored re-enable.
Next recommended action: Re-enable scanner Discord for monitored observation with Phases A/B/C active. Move to Phase D only if the observed main play itself is selected incorrectly.

## Previous Change

Date: 2026-06-17
Task: Install Phase C one-main-play Discord workflow.
Files changed: tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: After Phase B filtering, Discord still needed trader-facing language and lifecycle memory built around one current main play. Phase C makes the Current Desk Plan state the overall play, next trigger, invalidation, and stand-down condition, and treats changes to those instructions as meaningful updates even when price levels are unchanged.
Tests run: npx tsx tools/automation/discord-alert-format.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; npm run supervisor:status; direct `/status` timing.
Result: Passed. Current Desk Plan cards now show `Overall play`, `Next trigger`, `Invalidation`, and `Stand down` near the top of the message. Desk Play refresh records now include a normalized `mainPlayFingerprint` covering direction, campaign, levels, next trigger, invalidation, stand-down instruction, and readiness. Duplicate suppression now suppresses unchanged main-play state while allowing a new Discord update when trader instructions meaningfully change.
Trading logic changed: No. This is Discord presentation and Desk Play delivery lifecycle only; no setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, scanner selection, or bar-close handling changed.
Bridge impact: None. NinjaTrader/market_bars OHLC remains source of truth; no bridge contract or candle handling changed.
Discord impact: Yes. The channel now has the structure for one main play and meaningful-update cadence.
Journal/RAG impact: No schema change. RAG payloads carry the same DeskState plus clearer rendered Discord text and receipt behavior.
Supabase impact: No migration added.
Known risks: Scanner Discord remains intentionally disabled in local supervisor config until re-enabled for observed live validation.
Next recommended action: Phase D only if live observation still shows wrong main-play selection. Otherwise re-enable scanner Discord for monitored paper/live observation with Phase A/B/C protections active.

## Previous Change

Date: 2026-06-17
Task: Install Phase B Discord Desk Play suppression and dedupe filters.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, tools/supervisor/config.ts, tools/supervisor/index.ts, tools/supervisor/supervisor.test.ts, docs/PROJECT_STATUS.md.
Reason: Live scanner Desk Play refreshes were overposting review maps and stale/unchanged levels. Phase B needed a delivery-only policy that suppresses duplicate unchanged Desk Play refreshes, low-quality maps, stale data, and levels already passed or invalidated before a Discord post is attempted.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx tools/supervisor/supervisor.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; npm run supervisor:status; direct `/status` timing.
Result: Passed. Desk Play refreshes now pass through an exported Phase B policy before chart rendering, RAG pending save, receipt writing, or Discord posting. The policy suppresses stale completed-5M data, data-limited/insufficient maps, WAIT maps without a single primary side, non-primary/blocked/not-aligned/missed-no-chase readiness states, review levels already invalidated or target-passed by current price, and materially unchanged refreshes from the latest posted Desk Play. Supervisor status remains fast and scanner Discord remains operationally disabled through Phase A while Phase B is installed.
Trading logic changed: No. This is Discord Desk Play delivery filtering only; no setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, scanner selection, or bar-close handling changed.
Bridge impact: None. NinjaTrader/market_bars OHLC remains source of truth; no bridge contract or candle handling changed.
Discord impact: Yes. Non-executable Desk Play Discord refreshes are filtered before delivery. Full scanner trade-alert approval paths are not changed.
Journal/RAG impact: No schema change. Suppressed Desk Play refreshes do not create new RAG pending records or Discord receipt audit files; existing RAG/outcome button behavior is unchanged.
Supabase impact: No migration added.
Known risks: Scanner Discord is still intentionally paused by Phase A config until the desk chooses to re-enable posting for observation.
Next recommended action: Phase C next: design the trader-facing "one main play + update only on meaningful state change" workflow, then re-enable scanner Discord under observation.

## Previous Change

Date: 2026-06-17
Task: Deploy Phase A scanner Discord suppression and harden supervisor status.
Files changed: tools/supervisor/config.ts, tools/supervisor/index.ts, tools/supervisor/supervisor.test.ts, docs/PROJECT_STATUS.md.
Reason: Live scanner Desk Play refreshes were flooding Discord while Phase B/C suppression design is still pending, and the supervisor `/status` endpoint could hang because it performed fresh live health checks inside the HTTP request path.
Tests run: npx tsx tools/supervisor/supervisor.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; npm run supervisor:status; direct `/status` request timing.
Result: Passed. `SUPERVISOR_SCANNER_DISCORD_ENABLED=false` routes the scanner through the existing `--discord false` dry-run/log-only path while leaving scanner analysis and decision tapes running. `/status` now returns cached monitor health/delivery reports instead of doing fresh bridge health work per request, and monitor checks no longer overlap. Supervisor restarted with scanner and recorder running; scanner logs show Desk Play updates skipped as `discord_disabled`; no new Discord receipt files were created after suppression.
Trading logic changed: No. This is supervisor config/status and Discord delivery suppression only; no setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, scanner selection, or bar-close handling changed.
Bridge impact: No bridge contract change. Bridge health is still checked by the background supervisor monitor, not by each status request.
Discord impact: Yes. Scanner Discord posting is disabled operationally through supervisor config; scanner continues writing logs/decision tapes for audit.
Journal/RAG impact: None. Outcome buttons and learning records are unchanged; suppressed scanner posts simply do not reach Discord.
Supabase impact: No migration added.
Known risks: Discord scanner posts remain intentionally paused until Phase B/C suppression rules are implemented and approved.
Next recommended action: Phase B first: implement Discord suppression/dedupe/stale-level filtering so the channel can be re-enabled safely before the larger one-main-play redesign.

## Previous Change

Date: 2026-06-16
Task: Enforce standard Discord Current Desk Plan format for scanner candidate alerts.
Files changed: tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, tools/automation/htf-mss-phase-5b-regression.test.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: Live scanner candidate alerts could still use the older verbose `Plan / Targets / Trigger / Memory / Details` Discord body instead of the approved compact `MES Current Desk Plan` standard.
Tests run: npx tsx tools/automation/discord-alert-format.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx tools/automation/htf-mss-phase-5b-regression.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. Full-level scanner candidate alerts now render as `MES Current Desk Plan` with Primary, Bias, HTF context when applicable, Line in sand, direction block, Entry, Stop, T1, T2, Invalid, HTF target/runner, compact Status, and chart status. Regression tests now reject the old verbose sections for live scanner payloads and keep risk/human-review/data-limited warnings in compact status/bias lines.
Trading logic changed: No. This changes Discord presentation and tests only; no setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, scanner selection, or bridge behavior changed.
Bridge impact: None.
Discord impact: Yes. Scanner trade/review candidate alerts with complete app-owned levels now use the standard Current Desk Plan text format and keep RAG buttons/chart validation intact.
Journal/RAG impact: No schema change. Outcome buttons remain learning/journal only and do not approve trades.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Keep chart card text aligned with the same compact desk-plan wording.

## Previous Change

Date: 2026-06-15
Task: Fix supervisor tray stuck in reconnecting state.
Files changed: QuantDeskSupervisorTray.ps1, tools/supervisor/supervisor.test.ts, docs/PROJECT_STATUS.md.
Reason: The tray used PowerShell `Invoke-RestMethod` with a short timeout for `/status`, which could time out even while the Node supervisor CLI and endpoint were healthy. That left the visible tray stuck on `Reconnecting` and could trigger unnecessary self-heal attempts.
Tests run: npx tsx tools/supervisor/supervisor.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. The tray now fetches supervisor status through a bounded Node `fetch` helper with a 20-second timeout, matching the runtime stack that already reads supervisor status successfully. The launcher replaced the old tray process, and supervisor status verified `health=ok`, `delivery=ok`, scanner running, recorder running, and bridge reachable.
Trading logic changed: No. This is supervisor tray/status polling only; no setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, scanner selection, or bridge behavior changed.
Bridge impact: None.
Discord impact: Operational only. Prevents false tray reconnect/self-heal loops that can lead to noisy operational alerts.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Keep the tray polling path aligned with the Node supervisor status tooling.

## Previous Change

Date: 2026-06-15
Task: Add Discord cleanup D8/D9/D10.
Files changed: docs/PROJECT_STATUS.md, package.json, scripts/architecture-guard.js, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, tools/automation/discord-cleanup-verification.test.ts, tools/automation/discord-message-policy.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, tools/supervisor/notifications.ts, tools/supervisor/supervisor.test.ts.
Reason: Discord needed to keep the best/current trading plan visible while preventing operational notices from flooding the channel, and every true trade/review report needed durable RAG outcome buttons without forcing buttons onto watch-only or operational cleanup messages.
Tests run: npx tsx tools/automation/discord-cleanup-verification.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; npx tsx tools/automation/discord-outcome-buttons.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx tools/supervisor/supervisor.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. D8 replaces older unresolved scanner/supervisor operational Discord messages of the same category after a new post succeeds. D9 makes Current Desk Plan and trade/review reports RAG-button-required, adds default outcome buttons for scanner summary paths through the canonical outcome-secret loader, and keeps operational/watchlist messages button-free. D10 adds a deterministic cleanup verification test to the normal test suite so chart-backed current desk plans, operational notices, and watch messages keep the correct policy boundaries.
Trading logic changed: No. This changes Discord cleanup, RAG button validation, tests, and architecture guards only; no setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, scanner selection, or bridge behavior changed.
Bridge impact: None.
Discord impact: Yes. Operational notices are replace/delete-capable, true trade/review messages require RAG buttons, and watch-only messages remain visible without outcome buttons.
Journal/RAG impact: Yes, validation now blocks buttonless current desk/trade/review report payloads before Discord send. Buttons still only record trader-confirmed outcomes and do not approve trades.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Keep trade/review posts retained, and let operational cleanup/recovery handling keep transient supervisor/scanner messages quiet.

## Previous Change

Date: 2026-06-15
Task: Add Discord cleanup D1/D2/D5 first batch.
Files changed: tools/automation/discord-message-policy.ts, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: Discord Desk Play messages needed a standard current-plan format, a single message policy contract for cleanup behavior, and an enforced chart attachment rule so app-owned entry/stop/T1/T2 plans cannot post without visual evidence.
Tests run: npx tsx tools/automation/discord-alert-format.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit.
Result: Passed. Added Discord message categories/policies for current desk plans, trade alerts, review learning, summaries, operational health, data-quality, and diagnostics. Operational/data-quality/diagnostic policies are marked cleanup-eligible after 15 minutes/recovery, while trade and review messages remain retained. Scanner Desk Play output now uses the compact `MES Current Desk Plan` format with `Primary`, `Bias`, `Line in sand`, side-specific `LONG ABOVE`/`SHORT BELOW`, `Entry`, `Stop`, `T1`, `T2`, invalidation, HTF target/runner, and the standard review-only status. The obsolete verbose Desk Play formatter helpers were removed. Validation now blocks a Current Desk Plan that has app-owned levels but no attached chart file.
Trading logic changed: No. This changes Discord policy/formatting/validation only; no setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, scanner selection, or bridge behavior changed.
Bridge impact: None.
Discord impact: Yes. Desk Play messages are shorter, standardized, chart-backed when complete levels exist, and operational cleanup policy metadata is centralized for the next cleanup phases.
Journal/RAG impact: No behavior change. Current Desk Plans and review posts are still expected to carry RAG buttons when delivered through the existing scanner paths.
Supabase impact: No migration added.
Known risks: None identified after focused verification.
Next recommended action: Install the remaining Discord cleanup phases to implement actual purge/update behavior using the new message policy contract.

## Previous Change

Date: 2026-06-15
Task: Harden supervisor self-heal and bridge Discord notifications.
Files changed: Launch-QuantDeskSupervisorTray.vbs, Start-QuantDeskSupervisorTray.ps1, QuantDeskSupervisorTray.ps1, package.json, tools/supervisor/notifications.ts, tools/supervisor/processManager.ts, tools/supervisor/supervisor.test.ts.
Reason: The tray could request self-heal and send Discord warnings after brief status endpoint misses even while the supervisor was healthy, and a single transient bridge health miss could post `Bridge Unreachable` before the next check recovered.
Tests run: npx tsx tools/supervisor/supervisor.test.ts; npx tsc --noEmit; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run test; npm run lint; npm run build.
Result: Passed. Tray launch now replaces any existing QuantDeskSupervisorTray PowerShell process before starting the current tray script, preventing stale tray code from continuing to run. Tray self-heal and tray startup re-confirm the supervisor endpoint before starting or notifying, and they suppress redundant starts when the supervisor process is still running but the endpoint is briefly unavailable. Supervisor self-heal Discord messages respect the standard cooldown. Bridge unreachable notifications require consecutive failed bridge checks for at least 60 seconds, and recovery still posts when the bridge becomes reachable again. Supervisor child-process tracking now avoids falsely marking owned processes stopped when Windows command-line process enumeration is unavailable.
Trading logic changed: No. This is operational supervisor/Discord health notification hardening only; no setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, or scanner trade behavior changed.
Bridge impact: No bridge contract change. Bridge health notifications are less noisy and require confirmed consecutive failure for at least 60 seconds.
Discord impact: Yes. Operational health Discord messages are quieter and clearer; trade alerts and RAG/outcome flows are unchanged.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Restart the tray process so the PowerShell tray script uses the new endpoint confirmation logic.

## Previous Change

Date: 2026-06-14
Task: Add Phase 10M/10N trade-readiness routing for protected-structure desk plans.
Files changed: docs/PROJECT_STATUS.md, scripts/architecture-guard.js, src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, tools/automation/june12-protected-structure-replay.test.ts.
Reason: Protected 15M+5M alignment and approved-model routing existed, but trader-facing output still needed a deterministic readiness layer that explains whether each side is an execution candidate, no-chase/missed, waiting for pullback or new protected 5M MSS, not aligned, blocked, or data-limited.
Tests run: npx tsx src/lib/localScannerEngine.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; npx tsx tools/automation/june12-protected-structure-replay.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run guard:bridge-contracts.
Result: Passed. DeskState now carries scanner-owned `scanner_trade_readiness_routing` metadata on both long and short bias objects. Discord Desk Play output prints concise readiness beside model fit and gate status, including WAIT/review-map rows. The layer is metadata only and does not approve execution or alter plan math. The scanner Desk Play fixture also stays under the preferred compact Discord length target without warnings.
Trading logic changed: No. This adds model-readiness/visibility metadata only; no setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, or bridge behavior changed.
Bridge impact: None.
Discord impact: Yes. Desk Play messages can now show readiness labels for both long and short routes, such as execution candidate, wait for better entry, missed/no chase, or not aligned.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Use the readiness labels during live scanner review to distinguish aligned model routes from no-chase, better-entry, blocked, not-aligned, or data-limited conditions.

## Previous Change

Date: 2026-06-14
Task: Guard protected-structure replay code against raw historical-bar array assumptions.
Files changed: docs/PROJECT_STATUS.md, tools/automation/protected-structure-trade-review.ts, tools/automation/protected-structure-trade-review.test.ts, tools/supervisor/supervisor.test.ts.
Reason: A follow-up outcome script assumed `getNinjaHistoricalBars()` returned a raw array, but the bridge helper correctly returns a wrapped historical-bars payload with `.bars`. The repo needed a reusable guard in the protected-structure review path so future replay/report code fails clearly instead of reaching `bars.filter is not a function`.
Tests run: npx tsx tools/automation/protected-structure-trade-review.test.ts; npm run diagnostic:protected-structure-trade-review -- --no-charts --output=reports/protected-structure-review/2026-06-08-to-2026-06-12-wrapper-guard-check; npx tsx tools/supervisor/supervisor.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run guard:bridge-contracts.
Result: Passed. Added `unwrapHistoricalBarsResponse()` to accept the canonical wrapped bridge payload, return an empty bar list for explicit failed bridge responses, and reject raw arrays or missing `.bars` with clear errors. The protected-structure review loader now uses this helper before merging market_bars and bridge repair bars. The supervisor heartbeat fixture was also corrected to read its isolated test heartbeat path instead of a live/default log file.
Trading logic changed: No. This is replay/report input-contract hardening only; no setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, or bridge add-on behavior changed.
Bridge impact: None to the bridge contract. The report path now enforces the existing wrapped historical-bars response shape.
Discord impact: None directly. Protected-structure review posting still uses the same review-only/RAG-button path.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Keep replay/outcome tools consuming historical bars through typed wrapped payload helpers, not ad hoc raw-array assumptions.

## Previous Change

Date: 2026-06-14
Task: Tighten Phase 10L stop-quality handling so protected-structure review maps do not widen stops blindly.
Files changed: docs/PROJECT_STATUS.md, tools/automation/protected-structure-trade-review.ts, tools/automation/protected-structure-trade-review.test.ts.
Reason: The trader clarified that 10L should keep the stop behind app-owned 5M protected structure, but should not widen stops blindly or treat a fragile/tight tactical stop as high-quality. The correct desk behavior is to wait for a better pullback entry or a new protected 5M MSS structure.
Tests run: npx tsx tools/automation/protected-structure-trade-review.test.ts; npm run diagnostic:protected-structure-trade-review -- --no-charts --output=reports/protected-structure-review/2026-06-08-to-2026-06-12-10l-stop-quality-check; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run guard:bridge-contracts.
Result: Passed. Phase 10L now adds deterministic `fragileStopStructure` and `waitForBetterEntryOrNew5mStructure` flags, lowers quality for tight/fragile stop conditions, and reports: do not widen blindly; wait for a better pullback entry or a new protected 5M MSS structure. Entry, stop, T1, T2, canExecute, setup definitions, and risk rules remain unchanged.
Trading logic changed: No. This changes review-quality metadata and trader-facing management language only; no setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, or bridge behavior changed.
Bridge impact: None.
Discord impact: Indirect. Protected-structure review cards that use 10L quality metadata will now describe fragile stops as review/wait conditions instead of implying the stop should be widened.
Journal/RAG impact: No schema change. Existing RAG buttons still record trader-confirmed outcomes only.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Use the updated 10L review language when assessing tight-stop trades and keep any future executable-rule changes separate from this review-quality layer.

## Previous Change

Date: 2026-06-14
Task: Auto-detect active NinjaTrader chart contract for live bridge workflows.
Files changed: docs/NINJATRADER_BRIDGE.md, docs/PROJECT_STATUS.md, scripts/architecture-guard.js, src/components/SessionLab.tsx, tools/automation/Start Quant Desk Live.cmd, tools/automation/bridge-instrument-resolver.ts, tools/automation/bridge-instrument-resolver.test.ts, tools/automation/discord-scheduler.ts, tools/automation/nt-scanner.ts, tools/ninjatrader-bridge/QuantDeskBridge.cs.
Reason: NinjaTrader was showing `MES SEP26` while the running bridge health still reported `MES 06-26`, which could cause scanner/recorder/scheduler paths to read stale contract data after rollover unless Quant Desk detects the chart contract automatically.
Tests run: npx tsx tools/automation/bridge-instrument-resolver.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. The read-only add-on now reports the active open NinjaTrader chart instrument when available and marks `/health.instrumentSource` as `active_chart`; if chart detection is unavailable it falls back to the quarterly front-month. The resolver also normalizes NinjaTrader month names such as `MES SEP26` to `MES 09-26`, rejects stale same-root contracts after quarterly rollover, and falls forward to the active front-month when bridge health or config still says the expired contract. The scanner, candle recorder, Discord scheduler, manual launcher, and SessionLab defaults avoid pinning stale June unless a non-stale explicit contract is provided.
Trading logic changed: No. No setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, or model definitions changed.
Bridge impact: Yes. The read-only NinjaTrader add-on default instrument and `/health.defaultInstrument` now prefer the active chart contract and then use a front-month rollover calculation instead of a hardcoded `MES 06-26` fallback. Running NinjaTrader must recompile/reload the add-on to expose version `0.1.6-readonly`; until then the TypeScript resolver still protects scanner/recorder/scheduler by falling forward from stale `MES 06-26` to `MES 09-26`.
Discord impact: Yes. Scheduled Discord reports now resolve the bridge instrument through the same active-contract resolver before loading bars.
Journal/RAG impact: No schema or learning behavior changed.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Recompile the NinjaTrader add-on so `/health` reports `version: 0.1.6-readonly` and `instrumentSource: active_chart` when a MES/MNQ chart is open; the live scanner path already resolves stale June to September even before recompilation.

## Previous Change

Date: 2026-06-13
Task: Guard Discord RAG button signing against stale local outcome secrets.
Files changed: docs/PROJECT_STATUS.md, tools/automation/discord-outcome-buttons.test.ts.
Reason: A stale shell `DISCORD_OUTCOME_SECRET` previously overrode `.env.local` in one posting path, causing local RAG button signatures to mismatch the deployed Cloudflare outcome endpoint until the review script was patched.
Tests run: npx tsx tools/automation/discord-outcome-buttons.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. The Discord outcome button test now scans runtime automation files that sign or preflight outcome buttons and fails if they do not call `loadCanonicalDiscordOutcomeSecretFromEnvLocal`. This protects the scanner, scheduler, and protected-structure review poster from the stale shell secret class of failure.
Trading logic changed: No. No setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, bridge behavior, or Discord visibility gates changed.
Bridge impact: None.
Discord impact: Yes. Runtime RAG button posting paths are guarded so local signing uses the canonical repo secret before preflight/posting.
Journal/RAG impact: Yes. This hardens RAG outcome button reliability only; buttons still record trader outcomes and do not approve trades.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Keep using the guarded posting paths for scanner, scheduler, and protected-structure review cards.

## Previous Change

Date: 2026-06-13
Task: Prevent protected-structure review artifacts and raw OHLC dumps from becoming dirty/noisy output.
Files changed: docs/PROJECT_STATUS.md, package.json, tools/automation/protected-structure-trade-review.ts, tools/automation/protected-structure-trade-review.test.ts.
Reason: The protected-structure review command should keep generated reports out of Git and should never put raw candle arrays into diagnostic JSON or console output.
Tests run: npx tsx tools/automation/protected-structure-trade-review.test.ts; npm run diagnostic:protected-structure-trade-review -- --no-charts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. The report writer now asserts that protected-structure review summaries contain compact counts, levels, chart paths, and message IDs only. It fails if future edits add raw `bars`, `candles`, `rawBars`, `chartContext`, or OHLC-shaped arrays back into the report. The focused compact-report guard is part of the standard test suite. Generated protected-structure review artifacts remain ignored by Git.
Trading logic changed: No. No setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, Discord delivery rules, or bridge behavior changed.
Bridge impact: None. Existing read-only diagnostic data loading remains unchanged.
Discord impact: None. This only hardens local review output and tests.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Continue using `npm run diagnostic:protected-structure-trade-review` for compact protected-structure review output.

## Previous Change

Date: 2026-06-13
Task: Post protected-structure trade-review cards with charts and RAG buttons.
Files changed: docs/PROJECT_STATUS.md, tools/automation/protected-structure-trade-review.ts.
Reason: The trader requested the prior-week protected 15M+5M alignment review as trade-by-trade Discord cards, each with entry reference, protected 5M stop, T1/T2, one-MES risk/reward dollars, a chart, and RAG outcome buttons for learning.
Tests run: npm run diagnostic:protected-structure-trade-review -- --post-discord --dry-run --no-charts; npm run diagnostic:protected-structure-trade-review; npm run diagnostic:protected-structure-trade-review -- --post-discord; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. The protected-structure review command can now build Discord-ready review cards, attach generated charts, and include signed RAG outcome buttons. It preflights the deployed outcome endpoint before sending, uses the canonical `.env.local` outcome secret so stale shell secrets cannot sign unusable buttons, and posted 13 review-only MES cards for June 8-12 with charts and learning buttons.
Trading logic changed: No. No setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, or bridge behavior changed.
Bridge impact: Read-only diagnostic use of existing market_bars/NinjaTrader historical bars.
Discord impact: Yes. The protected-structure review command can post review-only chart cards with RAG outcome buttons.
Journal/RAG impact: Yes. Discord buttons submit trader-confirmed learning outcomes only; they do not approve trades or place orders.
Supabase impact: No migration added. Existing RAG/outcome persistence path is reused.
Known risks: None identified after verification.
Next recommended action: Review the 13 Discord cards and use the RAG buttons to mark outcomes for learning.

## Previous Change

Date: 2026-06-13
Task: Harden protected-structure trade-review reruns and chart windows.
Files changed: .gitignore, docs/PROJECT_STATUS.md, package.json, tools/automation/chart-markup-renderer.ts, tools/automation/chart-markup-renderer.test.ts, tools/automation/protected-structure-trade-review.ts.
Reason: The prior-week protected-structure review was initially run with ad hoc shell glue and exposed two repeatable risks: Supabase market-cache credentials may be unavailable in a local shell, and desk-review charts that begin during the morning could be clipped at noon even when the campaign continues into Lunch/PM.
Tests run: npx tsx tools/automation/chart-markup-renderer.test.ts; npm run diagnostic:protected-structure-trade-review -- --no-charts; npm run diagnostic:protected-structure-trade-review; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. Added `npm run diagnostic:protected-structure-trade-review` as the standard chart-backed trade-by-trade protected-structure review command. It reads the saved protected-structure overlay, loads `market_bars` when configured, falls back to NinjaTrader `/historical-bars` when Supabase credentials are unavailable, and emits markdown/JSON plus review charts. Desk-review chart rendering now uses the full active desk-review day while normal morning trade-plan charts keep the morning crop. Generated protected-structure review artifacts are ignored by Git.
Trading logic changed: No. No setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, or bridge behavior changed.
Bridge impact: Read-only diagnostic use of the existing NinjaTrader historical-bars endpoint.
Discord impact: None directly. The generated charts remain review-only artifacts and do not post to Discord by themselves.
Journal/RAG impact: None.
Supabase impact: No migration added. The diagnostic reads `market_bars` only when existing env credentials are present.
Known risks: None identified after verification.
Next recommended action: Use `npm run diagnostic:protected-structure-trade-review` for last-week protected-structure chart review instead of ad hoc shell scripts.

## Previous Change

Date: 2026-06-13
Task: Promote protected-structure trend confirmation above candidate framing.
Files changed: docs/PROJECT_STATUS.md, package.json, scripts/architecture-guard.js, src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, tools/automation/june12-protected-structure-replay.test.ts, tools/automation/protected-structure-trend-confirmation-replay.test.ts, tools/automation/thirty-day-active-mss-plan-replay.ts, tools/automation/thirty-day-active-mss-plan-replay.test.ts.
Reason: The scanner had the protected HTF facts, but trader-facing output could still let selected-candidate text, blocker language, old WAIT framing, or selected-candidate target context compete with the protected 15M+5M structure read. The prior active-MSS replay command could also silently accept wrong date flags, fall back to the default 30-day window, and run a heap-heavy renderer as the standard proof path.
Tests run: npx tsx tools/automation/thirty-day-active-mss-plan-replay.test.ts; npx tsx tools/automation/june12-protected-structure-replay.test.ts; npx tsx tools/automation/protected-structure-trend-confirmation-replay.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; npx tsx src/lib/localScannerEngine.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. DeskState now carries `scanner_protected_structure_trend_confirmation` as a top-level metadata layer. Discord prints a concise `Desk Direction` section before candidate review details. The June 12 proof now asserts selected SHORT can remain visible while protected 15M+5M bullish structure headlines LONG review-only, and the prior-week verifier proves confirmed LONG/SHORT samples require both 15M and 5M bias alignment. Active-MSS replay arguments now reject unknown flags, support `--evaluate-from/--evaluate-to` plus `--from/--to` aliases, and the standard diagnostic command now uses the lean protected-structure verifier. The old heap-heavy renderer is only available through explicit `diagnostic:active-mss-replay:heavy` / `--allow-heavy-replay=true`.
Trading logic changed: No. No setup definitions, rankings, execution approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, or bridge data interpretation changed.
Bridge impact: None.
Discord impact: Yes. Desk Play reports now show the protected-structure desk direction before candidate review language.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Restart the supervisor/scanner so the running process loads the new Desk Direction formatter and replay safeguards.

## Previous Change

Date: 2026-06-12
Task: Harden NinjaTrader bar timestamp mode against close-time drift.
Files changed: docs/NINJATRADER_BRIDGE.md, docs/PROJECT_STATUS.md, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: Parts of the bridge/scanner pipeline previously could treat NinjaTrader bars as close-timestamped even though the add-on emits bar-open timestamps, shifting the scanner one candle behind and making valid DeskState context late or missing.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. Scanner timestamp-mode parsing now normalizes missing, invalid, or typo values to `open`; only an explicit `close` value can use close-time interpretation. The NinjaTrader bridge docs now define the bar-open timestamp contract.
Trading logic changed: No. No setup definitions, rankings, approvals, canExecute, entry rules, stop rules, target rules, risk gates, or model definitions changed.
Bridge impact: Contract documentation clarified. Bridge endpoints and emitted OHLC payloads were not changed.
Discord impact: Indirect. Prevents late/missing desk reports caused by accidental close-time scanner interpretation.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Restart the supervisor/scanner so the running process loads the hardened timestamp-mode parser.

## Previous Change

Date: 2026-06-12
Task: Harden Quant Desk tray startup after NinjaTrader updates.
Files changed: QuantDeskSupervisorTray.ps1, docs/PROJECT_STATUS.md, tools/supervisor/supervisor.test.ts.
Reason: After updating NinjaTrader, the tray could temporarily show `Stopped - Supervisor status endpoint is not reachable` while the hidden supervisor was still starting, running HTF preload, or reconnecting. That looked like a failed connection even when the bridge recovered normally.
Tests run: npx tsx tools/supervisor/supervisor.test.ts; PowerShell parser check for QuantDeskSupervisorTray.ps1; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. The tray now opens a startup grace window for manual start, restart, self-heal, and initial tray startup; shows `Starting` or `Reconnecting` instead of a false stopped state when a start is in progress or the supervisor process exists; and lets self-heal retry after the startup grace expires.
Trading logic changed: No. No setup definitions, rankings, approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, scanner decisions, or bridge data interpretation changed.
Bridge impact: None. NinjaTrader OHLC remains read-only source data.
Discord impact: None.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Restart/open the tray so the updated status handling is loaded.

## Previous Change

Date: 2026-06-12
Task: Add scanner Discord message cleanup setting.
Files changed: docs/DISCORD_ALERT_AUTOMATION.md, docs/PROJECT_STATUS.md, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: The trader requested a setting to delete stale scanner Discord messages like data-quality notices after 15 minutes so old operational messages do not clutter the channel.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. Added `SCANNER_DISCORD_MESSAGE_CLEANUP` and `SCANNER_DISCORD_MESSAGE_TTL_MINUTES`, plus CLI overrides `--discord-message-cleanup` and `--discord-message-ttl-minutes`. Scanner-owned Discord posts now request message IDs when cleanup is enabled, record expiring message receipts without storing webhook secrets, and delete expired scanner messages on later scanner cycles. Default TTL is 15 minutes.
Trading logic changed: No. No setup definitions, rankings, approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, bridge behavior, or RAG outcome semantics changed.
Bridge impact: None.
Discord impact: Yes. Scanner-owned Discord messages can be removed after the configured TTL while audit JSON, delivery state, RAG records, and outcome records remain durable.
Journal/RAG impact: No schema change. Cleanup affects Discord channel visibility only.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Restart the supervisor so the running scanner loads the Discord cleanup setting.

## Previous Change

Date: 2026-06-12
Task: Make Opening Drive FVG Continuation morning-only and add After-Lunch Drive FVG Continuation.
Files changed: docs/PROJECT_STATUS.md, src/config/setupRegistry.ts, src/config/setupRegistry.test.ts, src/config/tradeRules.ts, src/lib/gemini.ts, src/lib/geminiPromptSafety.test.ts, src/lib/ictModelLabels.ts, src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts, src/lib/tradeDecisionPipeline.ts, src/lib/tradeDecisionPipeline.test.ts, src/lib/tradeJournal.ts, src/types.ts, tools/automation/professional-report-language.ts.
Reason: The trader requested Opening Drive FVG Continuation be updated to morning only and a separate after-lunch drive model be added without changing approvals or app-owned trade math.
Tests run: npx tsx src/config/setupRegistry.test.ts; npx tsx src/lib/geminiPromptSafety.test.ts; npx tsx src/lib/tradeDecisionPipeline.test.ts; npx tsx src/lib/setupScanner.test.ts; npx tsx src/lib/localScannerEngine.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. Opening Drive FVG Continuation is now morning/replay-morning only. After-Lunch Drive FVG Continuation is a new Lunch/PM/replay-lunch human-review model that can arm during the first lunch drive, become review-ready in the after-lunch review window when structured 15M/5M drive/FVG evidence is complete, and produce app-owned entry, protected stop, T1/T2, invalidation, and target-context metadata while keeping canExecute false.
Trading logic changed: Yes, limited to adding the user-approved after-lunch human-review model and correcting the Opening Drive session boundary. No executable approval semantics, canExecute gates, entry math, stop math, target math, risk gates, or bridge authority changed.
Bridge impact: None. NinjaTrader OHLC remains the highest-authority read-only evidence layer.
Discord impact: Yes. Desk/Discord metadata can now label after-lunch drive review plans and no longer treats Opening Drive as a Lunch/PM model.
Journal/RAG impact: Model labeling and journal unions now include After-Lunch Drive FVG Continuation. No schema change.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Restart the supervisor after this commit so the running scanner loads the updated setup registry and session boundaries.

## Previous Change

Date: 2026-06-12
Task: Rewire normal execution approval windows to 9:15 AM-4:00 PM ET.
Files changed: AGENTS.md, docs/DISCORD_ALERT_AUTOMATION.md, docs/NINJATRADER_BRIDGE.md, docs/PROJECT_STATUS.md, docs/TRADE_DECISION_PIPELINE.md, docs/WORKFLOWS.md, scripts/active-window-timestamp-guard.js, scripts/architecture-guard.js, src/config/timeWindows.ts, src/config/timeWindows.test.ts, src/config/tradeRules.ts, src/constants.ts, src/lib/gemini.ts, src/lib/geminiPromptSafety.test.ts, src/lib/htfLiquidityDrawEngine.test.ts, src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts, src/lib/utils.ts, tools/automation/bridge-history-smoke.ts, tools/automation/discord-alert-format.test.ts, tools/automation/discord-scheduler.ts, tools/automation/failed-plan-reversal-phase8-audit.ts, tools/automation/htf-mss-actual-ohlc-replay.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, tools/automation/thirty-day-active-mss-plan-replay.ts, tools/supervisor/config.ts, tools/supervisor/supervisor.test.ts.
Reason: The trader explicitly requested normal execution approval windows to run from 9:15 AM through 4:00 PM ET. Morning now starts 15 minutes before the RTH open and Lunch/PM remains active through the market close.
Tests run: npx tsx tools/supervisor/supervisor.test.ts; npx tsx src/lib/setupScanner.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; npx tsx src/config/timeWindows.test.ts; npx tsx src/lib/localScannerEngine.test.ts; npx tsx src/lib/geminiPromptSafety.test.ts; npx tsx src/lib/htfLiquidityDrawEngine.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. Canonical execution approval windows, scanner window resolution, setup-scan eligibility, HTF draw active-window classification, Discord/scheduler copy, supervisor pre-window repair, bridge/replay defaults, Gemini prompt safety text, and architecture guards now use Morning 9:15 AM-12:00 PM ET and Lunch/PM 12:00 PM-4:00 PM ET. The old observation-only 9:30-10:00 blocker no longer blocks normal execution approval; opening range remains context.
Trading logic changed: Yes, limited to user-approved time-window eligibility. No setup definitions, canExecute semantics, entry rules, stop rules, target math, risk gates, model definitions, or bridge data interpretation changed.
Bridge impact: Defaults and docs now align with 9:15 AM-4:00 PM ET scan coverage. NinjaTrader OHLC remains the highest-authority read-only source data.
Discord impact: Yes. Scheduler/status copy and alert fixtures now reflect 9:15 AM-4:00 PM ET execution/desk-plan coverage.
Journal/RAG impact: No schema change. Existing DeskState/RAG persistence can receive plans from the updated approved windows.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Restart the supervisor after this commit so the running scanner loads the new execution windows.

## Previous Change

Date: 2026-06-12
Task: Expand active Quant Desk Scanner Window to publish Desk Plans from 9:15 AM-4:00 PM ET.
Files changed: AGENTS.md, docs/PROJECT_STATUS.md, src/agents/scannerPlanSelectionAgent.test.ts, src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, tools/automation/discord-scheduler.ts, tools/automation/nt-scanner.ts.
Reason: The prior boundary limited Market Mapping refresh but did not make the full 9:15 AM-4:00 PM ET scanner window produce live review maps. The trader needs simple `LONG ABOVE` / `SHORT BELOW` plans plus line-in-the-sand and HTF bias-line context throughout the active RTH desk window.
Tests run: npx tsx src/lib/localScannerEngine.test.ts; npx tsx src/agents/scannerPlanSelectionAgent.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. Added `allowsDeskPlan` as a separate scanner-window authority from `allowsTradePlan`. Desk Plans/review maps can populate from 9:15 AM through the 4:00 PM ET close, while execution approval remains controlled by existing gates. Discord HTF structure now renders as compact `HTF Bias Lines`, showing current timeframe bias, line in the sand, the price where bias changes, close/hold confirmation, and target.
Trading logic changed: No execution approval change. No setup definitions, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, or bridge data interpretation changed.
Bridge impact: None. NinjaTrader OHLC remains read-only source data.
Discord impact: Yes. Scanner window heartbeat and Desk Play text now reflect 9:15 AM-4:00 PM ET active desk-plan coverage and compact HTF bias-line wording.
Journal/RAG impact: Desk Play records may now be produced during the broader active scanner window when existing DeskState visibility allows them. No schema change.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Restart the supervisor after verification so the running scanner uses the new active Desk Plan window.

## Previous Change

Date: 2026-06-12
Task: Limit Market Mapping refresh to 9:15 AM-4:00 PM ET.
Files changed: AGENTS.md, docs/PROJECT_STATUS.md, src/config/timeWindows.ts, src/config/timeWindows.test.ts, src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, tools/automation/discord-scheduler.ts, tools/automation/nt-scanner.ts.
Reason: Market Mapping should not run all day and overnight. The scanner should keep health/state online, but context-only market-map refresh now starts 15 minutes before RTH open and pauses at the 4:00 PM ET market close.
Tests run: npx tsx src/config/timeWindows.test.ts; npx tsx src/lib/localScannerEngine.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. Added a canonical `MARKET_MAPPING_WINDOW` and `allowsMarketMapping` scanner-window flag. Off-hours scanner cycles now skip market-map refresh and log Market Mapping Off Hours instead of refreshing context. Discord schedule copy now shows 9:15 AM-4:00 PM ET as the only Market Mapping span outside setup windows.
Trading logic changed: No. No setup definitions, rankings, approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, or bridge data interpretation changed.
Bridge impact: None. NinjaTrader OHLC remains read-only source data.
Discord impact: Schedule/visibility wording changed only. No alert eligibility or trade approval changed.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Restart the supervisor after verification so the running scanner uses the new Market Mapping boundary.

## Previous Change

Date: 2026-06-12
Task: Phase 10J Live Desk Plan Refresh and stop-management visibility standard.
Files changed: docs/PROJECT_STATUS.md, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: ActiveCampaign duplicate suppression correctly prevents repeated trade alerts, but it was too blunt for live desk management. A same-campaign plan can need a fresh Discord Desk Plan when the latest completed 5M, protected 5M structure, line in the sand, entry, stop, T1/T2, reaction level, or runner map changes.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run test; npm run lint; npm run build.
Result: Added a dedicated `deskPlanRefreshSent` scanner-state ledger and a deterministic Desk Plan refresh fingerprint that is separate from the durable ActiveCampaign trade-alert ledger. Same-campaign duplicate trade alerts remain suppressed, while review-only Desk Plan refreshes can post when scanner-owned current 5M structure/levels change. The refresh ledger records campaign id, completed 5M, direction, long/short lines, entry, stop, T1/T2, and reaction level for auditability.
Trading logic changed: No. No setup definitions, rankings, approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, or bridge behavior changed.
Bridge impact: None. NinjaTrader OHLC remains read-only source data.
Discord impact: Yes. Desk Play visibility can refresh on a new structure-aware fingerprint even when a same-campaign trade alert is suppressed.
Journal/RAG impact: No schema change. Existing Desk Play RAG persistence continues to receive DeskState/visibility/lifecycle metadata when the refresh posts.
Supabase impact: No migration added. Durable Supabase ActiveCampaign one-trade-alert dedupe remains unchanged.
Known risks: None identified after verification.
Next recommended action: Restart the supervisor after verification so the running scanner uses the new refresh standard.

## Previous Change

Date: 2026-06-11
Task: Treat duplicate supervisor starts as already-running instead of startup failure.
Files changed: QuantDeskSupervisorTray.ps1, docs/PROJECT_STATUS.md, tools/supervisor/index.ts, tools/supervisor/supervisor.test.ts.
Reason: The tray could show a scary stopped/failed startup state when a second hidden supervisor start raced an already-running daemon and hit `EADDRINUSE` on the status port. This made a healthy supervisor look broken.
Tests run: npx tsx tools/supervisor/supervisor.test.ts; npx tsc --noEmit; npm run supervisor:start duplicate-start smoke; npm run supervisor:status; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run test; npm run lint; npm run build.
Result: Passed. Duplicate starts now bind-check before launching child services, classify `EADDRINUSE` as "already running", exit cleanly, and avoid spinning up duplicate scanner/recorder child services. The tray now waits briefly before rechecking the status endpoint after start/self-heal so it does not lock in a stale stopped label while the daemon is coming up.
Trading logic changed: No. No setup definitions, rankings, approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, bridge behavior, or Discord trade alert rules changed.
Bridge impact: None. Bridge health is still read-only.
Discord impact: None. No alert eligibility or delivery behavior changed.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Restart the supervisor so the running daemon uses the patched duplicate-start behavior.

## Earlier Change

Date: 2026-06-11
Task: Clean compact Discord payload wording and remove preferred-length warnings.
Files changed: docs/PROJECT_STATUS.md, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: The formatter still produced a 1200-character preferred-length warning from a conditional replay fixture and carried repeated Desk Play prose that was already covered by chart/DeskState context. The Discord card needed to stay useful while avoiding noisy warning output.
Tests run: npx tsx tools/automation/discord-alert-format.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run test; npm run lint; npm run build.
Result: Passed. Compacted Desk Play decision-map lines, condensed HTF/session level-transition language, shortened generic conditional status/action detail wording, and kept app-owned long/short lines, entry/stop/T1/T2, missing proof, no-chase, and execution-boundary language visible.
Trading logic changed: No. No setup definitions, rankings, approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, bridge behavior, or Discord hard blockers changed.
Bridge impact: None.
Discord impact: Yes. Text formatting is shorter and cleaner; alert eligibility and payload hard blockers are unchanged.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Restart the supervisor so live scanner/Discord formatting uses the compact wording.

## Earlier Change

Date: 2026-06-11
Task: Make the DeskState desk-agent plan narrative explicitly cover both long and short bias.
Files changed: docs/PROJECT_STATUS.md, src/agents/deskAgentIntegration.test.ts, src/agents/deskAgentStack.ts, src/lib/gemini.ts, src/lib/geminiPromptSafety.test.ts.
Reason: The desk-agent plan needs to read like a two-sided trading desk map: current play, long-side bias, short-side bias, target/reaction management, and the next protected 5M shift line. The opposing side must stay visible as review/countertrend/secondary context instead of disappearing behind the primary play.
Tests run: npx tsx src/agents/deskAgentIntegration.test.ts; npx tsx src/lib/geminiPromptSafety.test.ts; npx tsc --noEmit; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run test; npm run lint; npm run build.
Result: Passed. Added explicit `LONG Bias` and `SHORT Bias` narrative lines from `DeskState.primaryDeskPlay.longBias` and `DeskState.primaryDeskPlay.shortBias`, and updated Gemini prompt safety wording to require both sides when DeskState provides both.
Trading logic changed: No. No setup definitions, rankings, approvals, canExecute, entry rules, stop rules, target rules, risk gates, model definitions, bridge behavior, or Discord hard blockers changed.
Bridge impact: None.
Discord impact: No new Discord behavior in this change. Prior Discord wording remains.
Journal/RAG impact: No schema change. Desk-agent/RAG consumers can use the new narrative text from DeskState.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Restart the supervisor so live desk-agent summaries use the two-sided narrative.

## Earlier Change

Date: 2026-06-11
Task: Fix pending Desk Play candidates disappearing as "no ICT candidate/reference level".
Files changed: docs/PROJECT_STATUS.md, src/agents/scannerPlanSelectionAgent.ts, src/agents/scannerPlanSelectionAgent.test.ts.
Reason: The latest lunch scanner tape had structured LONG Desk Play candidates with entry, protected 5M stop, targets, and `EntryTriggerPending`, but the selection layer filtered blocked pending-trigger candidates before scoring. That flattened the cycle into zero-confidence "no ICT candidate/reference level" instead of a visible TriggerPending/watch or missed/no-fresh-entry review state.
Tests run: npx tsx src/agents/scannerPlanSelectionAgent.test.ts; npx tsx src/lib/localScannerEngine.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Generic `EntryTriggerPending` candidates can now drive scanner visibility without changing execution approval. If price is still near the entry/retest area, the state becomes `TriggerPending` / `POST_WATCH`; if price has already moved away or reached target context, the state becomes `Missed` / no-fresh-entry. Specialized Intraday MSS watch wrapping remains protected.
Trading logic changed: No execution approval change. No setup definitions, canExecute, entry, stop, target, risk, model definitions, bridge behavior, or Discord hard blockers changed. Scanner visibility classification changed for already-built pending-trigger candidates.
Bridge impact: None.
Discord impact: Yes. Pending Desk Play candidates can now surface as watch/trigger-pending or missed/no-fresh-entry instead of disappearing behind a no-candidate blocker.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: None identified after focused verification.
Next recommended action: Observe the next active Morning/Lunch cycle and confirm pending Desk Play states report TriggerPending/watch or missed/no-fresh-entry instead of no-candidate.

## Earlier Change

Date: 2026-06-11
Task: Make Desk Play Discord output read like a protected-structure decision map.
Files changed: docs/PROJECT_STATUS.md, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: Desk Play alerts needed to show the active long/short decision map in plain trading-desk language while preserving the app-owned pipeline boundary: no guessed levels, no loose lines, no approval drift.
Tests run: npx tsx tools/automation/discord-alert-format.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Desk Play Discord text now renders `LONG ABOVE` / `SHORT BELOW` decision-map blocks. When existing scanner-owned normalized/candidate entry and protected 5M stop are available, the formatter shows entry reference, protected stop, actual risk, and deterministic T1/T2 from the existing app math. When proof is missing, levels are withheld instead of guessed. The review-only status and canExecute boundary remain explicit.
Trading logic changed: No. No setup definitions, approvals, canExecute, entries, stops, targets, risk gates, scanner model definitions, or bridge data contracts changed.
Bridge impact: None.
Discord impact: Yes. Desk Play wording is cleaner, more deterministic, and shows protected-structure decision-map levels only when app-owned proof exists.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: None identified after focused verification.
Next recommended action: Review the next live Desk Play alert in Discord for readability during the active window.

## Previous Change

Date: 2026-06-11
Task: Install Phase 10E through 10H Primary Desk Play, HTF countertrend framing, Discord Desk Play publishing, June 11 regression coverage, Desk Play context chart attachment, and conditional Desk Plan levels.
Files changed: docs/PROJECT_STATUS.md, src/lib/localScannerEngine.ts, tools/automation/chart-markup-renderer.ts, tools/automation/discord-alert-format.ts, tools/automation/nt-scanner.ts, src/agents/bridgeDiagnosticReplayAgent.test.ts, tools/automation/discord-alert-format.test.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: Live scanner tapes could contain useful long/short structured evidence while Discord stayed quiet because the old path depended on selected-candidate alert eligibility. The desk needed scanner-owned long and short bias visibility, HTF/countertrend framing, and a compact Discord play update with a readable context chart when a full trade alert is suppressed. When app-owned entry and protected 5M structure stop proof already exist, the chart also needs to show conditional planning levels using the same T1=1.5R and T2=2.0R math, without loosening trade approvals.
Tests run: npx tsc --noEmit; npx tsx tools/automation/discord-alert-format.test.ts; npx tsx src/agents/bridgeDiagnosticReplayAgent.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx tools/automation/chart-markup-renderer.test.ts; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: DeskState now carries `primaryDeskPlay` with primary direction, long bias, short bias, line in the sand, trigger, invalidation, no-chase language, HTF conflict/countertrend warning, and an explicit approval boundary. Discord can now publish a de-duplicated Desk Play update from DeskState when a full trade alert is suppressed but structured play context exists. Desk Play updates attach a chart that renders either line-only context when protected structure is missing, or conditional Entry/Stop/T1/T2 planning levels when existing app-owned candidate/normalized levels are available. T1/T2 are recomputed from actual entry-to-stop risk through the app target model, and the chart/footer keep `canExecute=false` and review-only language. June 11-style coverage proves a bullish long desk play remains primary while a counter-HTF short remains visible as review-only, with no outcome buttons in the Desk Play card.
Trading logic changed: No. No setup definitions, approvals, canExecute, entries, stops, targets, risk gates, scanner model definitions, or bridge data contracts changed.
Bridge impact: None.
Discord impact: Yes. Scanner may now post compact Desk Play/watch-only updates from DeskState during active windows when full trade alerts are suppressed, with a single context or conditional-level chart attachment.
Journal/RAG impact: No schema change. Desk Play updates are visibility-only and do not create outcome-button trade records.
Supabase impact: No migration added.
Known risks: None identified after focused and full verification.
Next recommended action: Review live Discord Desk Play wording and chart readability during the next active Morning/Lunch window.

## Previous Change

Date: 2026-06-11
Task: Fix supervisor pre-window backfill Windows spawn failure and live status reporting.
Files changed: docs/PROJECT_STATUS.md, tools/supervisor/deliveryVisibility.ts, tools/supervisor/htfPreload.ts, tools/supervisor/index.ts, tools/supervisor/preWindowBackfill.ts, tools/supervisor/processManager.ts, tools/supervisor/supervisor.test.ts.
Reason: The live supervisor reported `[SUPERVISOR] Pre-Window Backfill Failed` because the repair command failed before launch with `spawnSync npm.cmd EINVAL`; manual backfill succeeded, proving the issue was Windows process-launch plumbing rather than NinjaTrader market data. After restart, the local `supervisor:status` command could also report a stale local supervisor PID even while the live daemon endpoint was healthy. During active morning scan, delivery visibility could also keep warning on an old Market Mapping refresh even when the current completed 5M and decision tape were fresh. `supervisor:stop` also needed to use the live daemon PID instead of relying only on the local state file. HTF preload assurance treated weekend/no-session no-bars lines as failed even when the same timeframe had successful upserts.
Tests run: npx tsx tools/supervisor/supervisor.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; manual `npm run nt:backfill -- --instrument MES --bridge-instrument MES --bridge-url http://127.0.0.1:8765 --days 2 --delay-ms 50` repaired 692 bars.
Result: Pre-window backfill and HTF preload now wrap npm through `cmd.exe /d /c` on Windows, matching the safer supervised child-service launch path and avoiding direct `npm.cmd` spawn failures from the tray/supervisor context. `supervisor:status` now reads the live daemon endpoint first and falls back to local inspection only when the daemon endpoint is unavailable. Delivery visibility no longer treats an old Market Mapping timestamp as stale while active scanner freshness is proven by current completed 5M state. `supervisor:stop` now uses the live daemon PID when the endpoint is reachable. HTF preload assurance now fails only when a required timeframe never produces bars, not when weekend/no-session gaps appear alongside successful upserts.
Trading logic changed: No. No setup definitions, approvals, canExecute, entries, stops, targets, risk gates, model definitions, scanner scoring, or bridge contracts changed.
Bridge impact: None. Manual repair read existing bridge data and upserted compact OHLCV into `market_bars`.
Discord impact: Operational alert root cause fixed; no trade alert behavior changed.
Journal/RAG impact: None.
Supabase impact: No migration added. Existing market_bars cache was repaired through the existing backfill path.
Known risks: None identified after verification.
Next recommended action: Continue monitoring through the Quant Desk tray; the supervisor has been restarted and loaded the patched launch helper.

## Previous Change

Date: 2026-06-10
Task: Install Phase 10 Alpha through Delta scanner model E2E health and supervisor readiness contracts.
Files changed: docs/PROJECT_STATUS.md, package.json, scripts/architecture-guard.js, src/lib/scannerModelE2EHealth.ts, src/lib/scannerModelE2EHealth.test.ts, tools/supervisor/readinessDrill.ts, tools/supervisor/readinessDrill.test.ts.
Reason: Every primary trading model needs an end-to-end health contract proving it remains visible through scanner lifecycle, DeskState, Discord/RAG boundaries, stale/data-quality handling, and supervisor readiness before live Discord/RAG workflows rely on it.
Tests run: npx tsx src/lib/scannerModelE2EHealth.test.ts; npx tsx tools/supervisor/readinessDrill.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Added a Phase 10 model health matrix for all primary models, required stale/missing-data routing to data-quality visibility, portfolio-level source-of-truth checks, and a read-only supervisor readiness drill for config, child services, health, delivery, stale data, market-data gap sync, and pre-window backfill status.
Trading logic changed: No. No setup definitions, approvals, canExecute, entries, stops, targets, risk gates, model definitions, or scanner scoring changed.
Bridge impact: None. The supervisor readiness drill reads status only and does not call or modify the bridge.
Discord impact: None. The readiness drill does not post Discord; it only reports whether Discord delivery visibility is operationally ready.
Journal/RAG impact: None. The Phase 10 contract validates RAG boundaries but does not write records or change schemas.
Supabase impact: No migration added.
Known risks: None identified after focused verification.
Next recommended action: Use Phase 10 as the guardrail before reviewing live Discord/RAG outputs.

## Previous Change

Date: 2026-06-10
Task: Install NT-1 through NT-8 NinjaTrader bridge watchdog and Supabase backfill automation.
Files changed: QuantDeskSupervisorTray.ps1, docs/DISCORD_ALERT_AUTOMATION.md, docs/NINJATRADER_BRIDGE.md, docs/PROJECT_STATUS.md, tools/automation/backfill-market-bars.ts, tools/automation/candle-recorder.ts, tools/supervisor/config.ts, tools/supervisor/health.ts, tools/supervisor/index.ts, tools/supervisor/notifications.ts, tools/supervisor/preWindowBackfill.ts, tools/supervisor/status.ts, tools/supervisor/supervisor.test.ts.
Reason: Local bridge reliability needed to be automated and user-friendly so the trader does not have to start recorder/scanner/backfill PowerShell jobs manually each morning.
Tests run: npx tsx tools/supervisor/supervisor.test.ts; npx tsc --noEmit; git diff --check; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run test; npm run lint; npm run build.
Result: Added supervisor-owned pre-window backfill, recorder heartbeat JSON, heartbeat health checks, bridge contract mismatch visibility, pre-window backfill Discord operational notices, active bridge contract resolution for backfill, and a tray menu action to repair the market cache manually without command-line work.
Trading logic changed: No. No setup definitions, approvals, canExecute, entries, stops, targets, risk gates, or model definitions changed.
Bridge impact: Read-only health visibility improved. Existing bridge endpoints and NinjaTrader AddOn behavior were not changed.
Discord impact: Yes, operational supervisor notices only. No new trade alert hard blocker, trade plan, outcome buttons, or RAG outcome submission path was added.
Journal/RAG impact: None. Operational notices do not write trade/outcome RAG records.
Supabase impact: No migration added. Existing `market_bars` and gap ledger remain the durable cache paths.
Known risks: None identified after focused verification.
Next recommended action: Start Quant Desk through the tray shortcut so the supervisor owns recorder, scanner, startup preload, and pre-window repair.

## Previous Change

Date: 2026-06-10
Task: Surface stale or missing completed 5M data in Discord without removing Market Mapping Mode.
Files changed: docs/PROJECT_STATUS.md, scripts/architecture-guard.js, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: Manual/live morning scanner reruns could appear quiet when the bridge had stale current-session 5M data. The desk needs a visible operational data-quality notice, not a silent Market Mapping fallback.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run nt:scanner -- --instrument MES --bridge-instrument "MES 06-26" --once --bar-time-zone eastern --dry-run; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run test; npm run lint; npm run build.
Result: Added a deduped scanner data-quality Discord notice for missing/stale completed 5M blocker exits. The notice states no trade alert was posted, shows latest vs expected completed 5M timing, gives recovery steps, and carries no outcome buttons or trade-plan attachments.
Trading logic changed: No. Market Mapping remains context-only. No setup definitions, approvals, canExecute, entries, stops, targets, risk gates, or bridge data interpretation were changed.
Bridge impact: None.
Discord impact: Yes, operational notice only. Stale/missing completed 5M data can now post a data-quality notice instead of only logging locally.
Journal/RAG impact: None. Data-quality notices do not create trade/outcome RAG records.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: During the next stale/missing completed 5M condition inside a scanner cycle, confirm the Discord data-quality notice appears before fixing the bridge feed.

## Previous Change

Date: 2026-06-10
Task: Review and harden Phase 9D-9F for live Discord/RAG workflow.
Files changed: docs/PROJECT_STATUS.md, docs/SCANNER_DESK_STATE_PHASE_9_AUDIT.md, scripts/architecture-guard.js, src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: User clarified the app UI is no longer the priority; live bridge updates through Discord and Discord outcome submission into RAG are the primary workflow.
Tests run: Focused checks passed: npx tsx src/lib/localScannerEngine.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx src/agents/bridgeDiagnosticReplayAgent.test.ts; npx tsc --noEmit. Full required suite is being rerun before commit.
Result: Watch-only Discord alerts now explicitly skip pending trade/outcome RAG writes and receipt attachment; plan/review alerts persist scanner-owned visibility, lifecycle trace, and DeskState into `trade_plan_json`; replay validation no longer reports missing DeskState cycles as aligned.
Trading logic changed: No. Setup definitions, approvals, canExecute, entry/stop/target rules, risk gates, model definitions, and bridge behavior are unchanged.
Bridge impact: None.
Discord impact: Watch-only alert behavior remains watch-only. Plan/review alert RAG metadata is richer for Discord outcome follow-through.
Journal/RAG impact: Yes, metadata only. Plan/review pending RAG records now include DeskState/visibility/lifecycle metadata; watch-only alerts remain audit-only until promotion.
Supabase impact: No migration added.
Known risks: None identified after focused verification.
Next recommended action: Run the full required command suite, commit, push, then review the live Discord/RAG output path before any new feature phase.

## Previous Change

Date: 2026-06-10
Task: Phase 9D-9F Discord watch alerts, watch-to-plan promotion metadata, and replay validation.
Files changed: docs/PROJECT_STATUS.md, docs/SCANNER_DESK_STATE_PHASE_9_AUDIT.md, scripts/architecture-guard.js, src/agents/bridgeDiagnosticReplayAgent.ts, src/agents/bridgeDiagnosticReplayAgent.test.ts, src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, tools/automation/diagnostic-replay.ts, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, tools/automation/scanner-audit-import.ts.
Reason: DeskState needed to drive Discord watch visibility, describe watch-to-plan continuity, and support replay validation before any further phases.
Tests run: Focused checks passed: npx tsx src/lib/localScannerEngine.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx src/agents/bridgeDiagnosticReplayAgent.test.ts; npx tsc --noEmit. Full required suite is being rerun before commit.
Result: Added watch-only Discord rendering from DeskState, `DeskState.promotion`, `validateDeskStateReplayPath`, scanner audit DeskState replay import, and diagnostic replay validation output.
Trading logic changed: No. Setup definitions, approvals, canExecute, entry/stop/target rules, risk gates, model definitions, and bridge behavior are unchanged.
Bridge impact: None.
Discord impact: Yes. Scanner `POST_WATCH` DeskState now renders a watch-only alert without plan levels, visuals, or outcome buttons. Existing plan/review alert behavior is preserved.
Journal/RAG impact: No schema change. Replay and consumers can inspect DeskState promotion/validation metadata from audit records.
Supabase impact: No migration added.
Known risks: None identified after focused verification.
Next recommended action: Run the full required command suite, commit, push, then review Phase 9D-9F outputs before any further phases.

## Previous Change

Date: 2026-06-10
Task: Phase 9A-9C scanner decision map, lifecycle trace, and active DeskState.
Files changed: docs/ARCHITECTURE.md, docs/PROJECT_STATUS.md, scripts/architecture-guard.js, src/config/responsibilityRegistry.ts, src/config/responsibilityRegistry.test.ts, src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: Scanner visibility needed a model authority inventory, per-cycle candidate lifecycle trace, and one active DeskState object so Discord/RAG/UI can consume deterministic scanner-owned state instead of independently deciding trade visibility.
Tests run: Focused checks passed so far: npx tsx src/lib/localScannerEngine.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit. Full required suite is being rerun before commit.
Result: Added `buildTradeDecisionMapAudit`, `buildCandidateLifecycleTrace`, and `buildDeskState`; scanner decision tape and live Discord audit JSON now persist `visibility`, `candidateLifecycleTrace`, and `deskState` together.
Trading logic changed: No. Setup definitions, rank weights, approvals, canExecute, entry/stop/target rules, risk gates, bridge behavior, and Discord hard blockers are unchanged.
Bridge impact: None.
Discord impact: Audit JSON now includes lifecycle trace and DeskState. Main Discord posting/content policy is unchanged.
Journal/RAG impact: No schema change. RAG/UI consumers can now read scanner-owned DeskState from audit metadata.
Supabase impact: No migration added.
Known risks: None identified after focused verification.
Next recommended action: Run the full required command suite, then commit and push Phase 8/9 scanner visibility cleanup together.

## Previous Change

Date: 2026-06-10
Task: Phase 8.45-8.6 scanner visibility architecture cleanup.
Files changed: docs/ARCHITECTURE.md, docs/PROJECT_STATUS.md, docs/SCANNER_VISIBILITY_CLEANUP_AUDIT.md, scripts/architecture-guard.js, src/agents/scannerPlanSelectionAgent.ts, src/config/responsibilityRegistry.ts, src/config/responsibilityRegistry.test.ts, src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: Trade visibility needed one scanner-owned source-of-truth metadata path so agents, Discord, RAG, and UI can summarize active candidates without inventing, suppressing, reranking, or reinterpreting app-owned structured OHLC evidence.
Tests run: npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. Added scanner-owned visibility metadata, authority terms, no-silent-drop lifecycle modes, audit persistence, and architecture guard coverage. No obsolete live trading path was deleted without proof; deferred cleanup is documented in `docs/SCANNER_VISIBILITY_CLEANUP_AUDIT.md`.
Trading logic changed: No. Setup definitions, model gates, ranking weights, entry/stop/target rules, risk gates, bridge behavior, Discord hard blockers, and canExecute are unchanged.
Bridge impact: None.
Discord impact: Audit metadata added. Main Discord posting policy/content is not loosened by this phase.
Journal/RAG impact: No schema change. RAG/Discord consumers can use scanner-owned visibility metadata from audit records.
Supabase impact: No migration added.
Known risks: None identified after verification.
Next recommended action: Use the scanner decision tape and live Discord audit `visibility` field as the handoff point for any later UI/RAG/Discord display work.

## Previous Change

Date: 2026-06-10
Task: Enforce patch-context hygiene in the architecture guard.
Files changed: docs/CODEX_RULES.md, docs/PROJECT_STATUS.md, scripts/architecture-guard.js.
Reason: User asked to fix the remaining caveat that patch-context mismatches cannot be made impossible. The workflow rule is now part of the architecture guard so future changes fail automated checks if the exact-context patching policy is removed or weakened.
Tests run: npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed. `docs/CODEX_RULES.md` requires agents to read exact current context immediately before `apply_patch`, use stable unique anchors, keep hunks narrow, and re-read before retrying after any mismatch. `scripts/architecture-guard.js` now enforces that policy text exists.
Trading logic changed: No. This is repo process/guardrail only.
Bridge impact: None.
Discord impact: None.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: External patch tooling can still fail when file state changes between read and patch, but the repo now enforces the workflow that prevents stale-context patching from becoming accepted practice.
Next recommended action: Keep this guard in `npm run lint` and do not bypass it during future agent changes.

## Previous Change

Date: 2026-06-10
Task: Let Intraday MSS watch line survive missing 5M evidence-candle alignment.
Files changed: docs/PROJECT_STATUS.md, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts.
Reason: User asked to remove the remaining caveat that the watch stayed quiet if the scanner did not build an Intraday MSS candidate. The safe fix is to let the app-owned setup scanner create a watch-only line from structured NinjaTrader OHLC timeframeMssEvidence when 15M/5M MSS is aligned and the 5M structureBreak.brokenLevel is present, even if the exact completed candle array cannot yet align the evidence candle.
Tests run: npx tsx src/lib/setupScanner.test.ts; npx tsx src/agents/scannerPlanSelectionAgent.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; npm run test.
Result: Passed. IntradayMssMicroContinuation can now emit an OHLC-owned retest-pending watch line from structured 5M MSS brokenLevel while keeping entry, stop, T1, and T2 empty until completed candle alignment and protected 5M swing proof are clean.
Trading logic changed: Yes, narrowly. It changes watch-only candidate construction for IntradayMssMicroContinuation when structured OHLC MSS evidence exists but candle alignment is incomplete. It does not approve execution, does not set canExecute, and does not invent entry/stop/targets.
Bridge impact: None. No bridge contract or ingestion behavior changed.
Discord impact: Indirect. Discord selection can now receive a conditional Intraday MSS watch with a named line instead of no watch when structured OHLC has the MSS broken level but candle alignment proof is incomplete.
Journal/RAG impact: No schema change. Existing RAG records may capture the watch-only line and blocker reason.
Supabase impact: No migration added.
Known risks: If timeframeMssEvidence itself is missing or lacks a 5M brokenLevel, the scanner still stays quiet rather than inventing a line. That is intentional.
Next recommended action: Restart scanner services so the live supervisor uses the patched setup scanner and selection agent.

## Previous Change

Date: 2026-06-10
Task: Correct agent responsibility and selection behavior for OHLC-owned Intraday MSS campaign watches.
Files changed: docs/PROJECT_STATUS.md, src/agents/deskAgentIntegration.test.ts, src/agents/deskAgentStack.ts, src/agents/scannerPlanSelectionAgent.ts, src/agents/scannerPlanSelectionAgent.test.ts, src/config/responsibilityRegistry.ts, src/config/responsibilityRegistry.test.ts.
Reason: User clarified that Gemini/advisory agents must not notice Intraday MSS first. NinjaTrader OHLC and the app-owned scanner should catch the first completed 5M close-through, then keep the campaign alive until retest confirms, the line fails, target is already reached before alert, or the session window expires.
Tests run: npx tsx src/agents/scannerPlanSelectionAgent.test.ts; npx tsx src/config/responsibilityRegistry.test.ts; npx tsx src/agents/deskAgentIntegration.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; npm run test; git diff --check.
Result: Passed. ScannerPlanSelectionAgent now carries explicit OHLC/setupScanner authority language for IntradayMssMicroContinuation watches and prevents stale/chasing fallback candidates from suppressing an OHLC-built retest-pending watch.
Trading logic changed: No executable approval change. Setup definitions, entry/stop/target formulas, canExecute, risk gates, and bridge data behavior are unchanged. Scanner alert selection changed only to keep the existing app-owned conditional watch visible.
Bridge impact: None. NinjaTrader OHLC remains the factual source and no bridge contract changed.
Discord impact: Indirect. Discord alert selection can now receive the conditional Intraday MSS watch instead of a stale/no-fresh-entry fallback when both exist.
Journal/RAG impact: No schema change. Existing RAG/Discord persistence can retain the selected OHLC-owned watch context.
Supabase impact: No migration added.
Known risks: The watch still depends on structured setup candidates from completed NinjaTrader OHLC. If the scanner does not build the Intraday MSS candidate, advisory/Gemini paths still cannot invent it.
Next recommended action: Restart scanner services so the updated selection agent and responsibility contracts are used by the live supervisor.

## Previous Change

Date: 2026-06-10
Task: Fix live morning scanner wiring for 10:00 ET session scoring, live history preload, and missed/no-fresh-entry review output.
Files changed: docs/PROJECT_STATUS.md, src/agents/scannerPlanSelectionAgent.ts, src/agents/scannerPlanSelectionAgent.test.ts, src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: Live NinjaTrader dry-run showed a valid morning failed-low/reclaim context was first hard-blocked as "outside approved ICT execution session" at 10:00 ET, then the live data gate requested future 12:00 ET bars, and finally stale/no-chase selection dropped the candidate snapshot. The desk needs the setup surfaced as missed/no-fresh-entry review with line/entry/stop/targets instead of flattening to no candidate.
Tests run: npx tsx src/lib/localScannerEngine.test.ts; npx tsx src/agents/scannerPlanSelectionAgent.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run nt:scanner -- --instrument MES --bridge-instrument "MES 06-26" --once --dry-run --discord false; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; npm run test.
Result: Passed. Normal scanner dry-run now reports data gate ready through the latest completed 5M, scores the morning window correctly, and emits a dry-run LONG missed/no-fresh-entry review with line in the sand, entry, stop, targets, and no-chase language.
Trading logic changed: No executable approval change. Setup definitions, entry/stop/target formulas, model gates, and canExecute remain unchanged. Scanner alert/review surfacing changed so stale/no-chase candidates keep their snapshot for human-review/RAG output.
Bridge impact: No bridge API change. Live history preload now caps requested history at the latest completed/as-of candle instead of requiring future session-close bars.
Discord impact: Yes, review visibility changed. Missed/no-fresh-entry candidates can now qualify for an educational Discord/RAG review with levels instead of being suppressed as no candidate.
Journal/RAG impact: Missed/no-fresh-entry reviews can retain candidate metadata for learning records. No schema change.
Supabase impact: No migration added.
Known risks: The dry-run payload is still above the preferred 1200-character compact target, though below the hard formatter limit. Current HTF read remains mixed/conflicting, so HTF is caution/context rather than clean directional confirmation.
Next recommended action: Restart scanner services so the supervisor uses the patched code, then watch the next live cycle for delivery status and Discord wording.

## Previous Change

Date: 2026-06-10
Task: Add source-of-truth responsibility registry and architecture drift guard.
Files changed: docs/ARCHITECTURE.md, docs/PROJECT_STATUS.md, package.json, scripts/architecture-guard.js, src/config/responsibilityRegistry.ts, src/config/responsibilityRegistry.test.ts.
Reason: User asked to fix the root drift problem: multiple paths can describe or decide the same responsibility. The fix creates a machine-readable owner registry and extends the architecture guard so protected responsibilities have one owner instead of quiet local rewrites.
Tests run: npx tsx src/config/responsibilityRegistry.test.ts; npx tsx tools/automation/discord-rag-persistence.test.ts; npm run guard:architecture; npm run guard:no-firebase; npm run guard:schema; npx tsc --noEmit; npm run lint; npm run build; npm run test; git diff --check.
Result: Passed.
Trading logic changed: No. This adds ownership documentation and guardrails only; setup definitions, model gates, entries, stops, targets, canExecute, time windows, scanner selection, bridge behavior, and Discord payload formatting are unchanged.
Bridge impact: None.
Discord impact: No payload/content behavior change. The guard now protects the shared Discord alert RAG persistence owner from being reimplemented in scanner or scheduler code.
Journal/RAG impact: No schema or write behavior change. Existing shared Discord alert RAG persistence remains the owner for scoped `trade_embeddings` alert writes and Discord message receipts.
Supabase impact: No migration added.
Known risks: The registry currently protects the highest-risk ownership boundaries and one enforced persistence path. More source-of-truth checks can be added later for market-data preload, ActiveCampaign ledger persistence, and replay/scheduler context loading.
Next recommended action: Continue Phase 8 by centralizing ActiveCampaign ledger persistence or splitting the large test script into grouped commands.

## Previous Change

Date: 2026-06-10
Task: Phase 8 operational slop cleanup: shared Discord RAG persistence helper.
Files changed: docs/PROJECT_STATUS.md, package.json, tools/automation/discord-rag-persistence.ts, tools/automation/discord-rag-persistence.test.ts, tools/automation/discord-scheduler.ts, tools/automation/nt-scanner.ts.
Reason: Scanner and scheduler duplicated the same Supabase `trade_embeddings` upsert and Discord message receipt patch logic. The duplication increased risk around user-scoped `plan_version_id` updates and future Discord/RAG fixes.
Tests run: npx tsc --noEmit; npx tsx tools/automation/discord-rag-persistence.test.ts; npx tsx tools/automation/discord-scheduler-provenance.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts.
Result: Focused tests passed. Full required checks are being rerun after this status update.
Trading logic changed: No. Candidate selection, setup definitions, entry/stop/target math, time windows, canExecute, scanner model gates, and Discord alert content are unchanged. Only low-level RAG persistence and receipt patching were extracted.
Bridge impact: None.
Discord impact: No intended payload/content behavior change. Discord alert RAG persistence now uses one shared helper for update-first/insert-fallback and receipt patching.
Journal/RAG impact: Reduced duplicate RAG persistence code. User-scoped upsert by `(user_id, plan_version_id)` remains preserved.
Supabase impact: No migration added.
Known risks: Scheduler replay record lookup and ActiveCampaign durable ledger still have their own Supabase helpers because they have different contracts. They can be considered for later cleanup, but were intentionally left alone in this slice.
Next recommended action: Continue Phase 8 with another narrow slice: split the giant `npm run test` command into grouped scripts, or extract ActiveCampaign ledger persistence into a dedicated helper.

## Previous Change

Date: 2026-06-10
Task: Make scanner, Discord, and RAG persistence Gemini-independent.
Files changed: docs/ARCHITECTURE.md, docs/DATA_GUARDRAILS.md, docs/PROJECT_STATUS.md, package.json, scripts/architecture-guard.js, src/agents/scannerHealthAgent.ts, src/agents/scannerHealthAgent.test.ts, src/config/geminiFallback.ts, src/lib/embeddings.ts, src/lib/embeddings.test.ts, src/lib/gemini.ts, src/lib/rag.ts, tools/automation/discord-alert-format.ts, tools/automation/nt-scanner.ts.
Reason: User asked to remove any operational dependency where Gemini narrative or availability is required to produce scanner/Discord/RAG trade-plan output, while keeping Gemini available only as an optional lower-authority screenshot/advisory fallback.
Tests run: npx tsc --noEmit; npx tsx src/agents/scannerHealthAgent.test.ts; npx tsx src/lib/embeddings.test.ts; npm run guard:architecture; npm run guard:no-firebase; npm run guard:schema; npm run lint; npm run build; npm run test.
Result: Passed.
Trading logic changed: No. Setup definitions, model approvals, entry/stop/target rules, canExecute, time windows, and bridge market-data behavior were not changed. Gemini screenshot/advisory calls are now gated behind `VITE_GEMINI_ADVISORY_FALLBACK_ENABLED=true`, scanner health includes "Gemini unavailable: scanner unaffected.", and RAG save/update/retrieval vector generation continues through an app-owned deterministic embedding fallback even when Gemini embeddings are disabled or unavailable.
Bridge impact: None. NinjaTrader OHLC remains the highest-authority market data path.
Discord impact: Health summaries now display the Gemini independence check. Trade-alert formatting behavior is otherwise unchanged by this task.
Journal/RAG impact: RAG records no longer require Gemini embeddings. App-owned deterministic embeddings keep vector save/query paths populated by default, while Gemini-derived visual facts are stored only as lower-authority advisory context rather than primary selected setup/chart context.
Supabase impact: No migration added for this task.
Known risks: The default deterministic embedding is stable and Gemini-independent, but less semantically rich than managed model embeddings. It preserves RAG vector continuity without making Gemini operationally required.
Next recommended action: If screenshot/advisory fallback is intentionally needed, enable `VITE_GEMINI_ADVISORY_FALLBACK_ENABLED=true`. If managed Gemini RAG embeddings are intentionally desired, separately enable `VITE_GEMINI_RAG_EMBEDDINGS_ENABLED=true`; otherwise leave both disabled so scanner/Discord/RAG operation remains OHLC/app-owned.

## Previous Change

Date: 2026-06-09
Task: Make IntradayMssMicroContinuation recognize 5M MSS close-through retest plans globally.
Files changed: docs/PROJECT_STATUS.md, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts, src/types.ts.
Reason: User identified a June 9 PM long where 15M bullish MSS/displacement context plus a fresh 5M bullish MSS close-through, retest, and reclaim should have produced a human-review plan even without a selected 5M FVG. The active model needed a second execution trigger path: completed 5M MSS close-through/retest with a named line in the sand and protected 5M retest swing stop.
Tests run: npx tsx src/lib/setupScanner.test.ts; npx tsx src/lib/tradeDecisionPipeline.test.ts; npx tsc --noEmit; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed so far. Full `npm run test` is being rerun after this status update.
Trading logic changed: Yes. `IntradayMssMicroContinuation` can now become human-review ready from 15M MSS/displacement context + confirmed 5M MSS + completed 5M close-through/retest/reclaim, even when no directional 5M FVG is selected. It still never sets canExecute true, still requires completed structured OHLC, still uses app-owned entry from the completed 5M trigger close, protected 5M swing stop, and deterministic 1.5R/2R targets.
Bridge impact: None. No bridge fetch, timestamp, recorder, or market_bars behavior changed.
Discord impact: Indirect. Existing Discord gates can now see the active human-review Intraday MSS Micro Continuation watch/plan with the MSS close-through line in the sand instead of suppressing it for lack of FVG trigger context.
Journal/RAG impact: ActiveCampaign evidence can now record `5M_MSS_CLOSE_THROUGH_RETEST_TRIGGER` as the execution-trigger evidence layer.
Supabase impact: No migration added.
Known risks: This depends on clean completed 5M and 15M/5M timeframeMssEvidence. If the protected retest swing cannot be confirmed by completed candles on both sides, the model stays pending with no stop/targets instead of falling back to an older structure stop or inventing a stop. 5M opposing MSS remains an intentional hard blocker because 5M is execution authority; HTF conflict remains caution/management context only.
Next recommended action: Observe the next live PM Intraday MSS Micro Continuation and confirm Discord/RAG text names the 5M close-through line, protected 5M swing stop, app T1/T2, HTF caution/management context, and human-review-only status.

## Previous Change

Date: 2026-06-09
Task: Add durable Supabase gap ledger for unresolved NinjaTrader ingestion defects.
Files changed: docs/PROJECT_STATUS.md, scripts/schema-guard.js, supabase/migrations/20260609190000_market_data_gap_events.sql, tools/automation/market-data-ingestion.test.ts, tools/automation/market-data-store.ts, tools/automation/nt-scanner.ts.
Reason: User requested fixing the remaining caveat that missing NinjaTrader bars were not invented and no Supabase migration had been added. The correct fix is not to fabricate OHLC, but to persist unresolved gaps as actionable data-quality defects.
Tests run: npx tsx tools/automation/market-data-ingestion.test.ts; npx tsc --noEmit; npm run guard:schema; npm run test; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed.
Trading logic changed: No. Trade setup definitions, approvals, canExecute, scanner model behavior, and Discord posting rules were not changed. Unresolved market-data gaps are now persisted to a Supabase ledger when cache plus bridge repair still cannot verify the requested window.
Bridge impact: No bridge API/fetch behavior changed.
Discord impact: None.
Journal/RAG impact: No trade journal schema change.
Supabase impact: Added migration `20260609190000_market_data_gap_events.sql` for `market_data_gap_events` with RLS and grants. Migration has not been applied to production by this local code change.
Known risks: The scanner still cannot and must not invent missing candles. The new ledger makes gaps durable and actionable, but production persistence requires applying the migration.
Next recommended action: Apply the Supabase migration, then observe the next scanner-history insufficient window and confirm a `market_data_gap_events` row is written with the requested range and operator action.

## Previous Change

Date: 2026-06-09
Task: Phase 7 NinjaTrader Market Data Ingestion Hardening.
Files changed: docs/PROJECT_STATUS.md, package.json, tools/automation/market-data-ingestion.ts, tools/automation/market-data-ingestion.test.ts, tools/automation/nt-scanner.ts.
Reason: User requested a better NinjaTrader ingestion approach and removal of bad/downstream gap-repair code that was no longer needed.
Tests run: npx tsx tools/automation/market-data-ingestion.test.ts; npx tsx src/lib/localScannerEngine.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run test; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed.
Trading logic changed: No. Scanner trade setup definitions, approval gates, canExecute behavior, Discord behavior, bridge API behavior, and model rules were not changed. The data path before ChartContext evaluation is now cleaner: scanner history windows use a named market-data ingestion verifier, live 5M execution bars are repaired from real look-left market_bars/bridge OHLC inside the live base range, and ChartContext no longer owns backfill.
Bridge impact: No bridge API/fetch behavior changed. Raw NinjaTrader payloads remain unchanged; scanner ingestion normalizes/merges real OHLC before rule evaluation.
Discord impact: Indirect only. Cleaner ingestion can reduce false data-limited/gap warnings when real repair bars exist, but Discord alert formatting and posting rules were not changed.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: This still depends on real NinjaTrader/market_bars OHLC being available. Missing bars are not synthesized. The ingestion verifier reports insufficient windows and blocks HTF promotion when cache and bridge repair cannot supply enough data.
Next recommended action: Observe the next live scanner cycle and confirm scanner-history lines report sufficient 5m/15m/60m/120m/240m context from market_bars or market_bars_bridge_repair before relying on HTF structure.

## Previous Change

Date: 2026-06-09
Task: Harden bridge timestamp normalization for out-of-order, duplicate, and gapped bars.
Files changed: docs/PROJECT_STATUS.md, src/lib/ninjaTraderBridge.ts, src/lib/localScannerEngine.test.ts.
Reason: User requested fixing the remaining caveat where badly ordered bars or large missing chunks still depended only on existing data-quality/backfill checks.
Tests run: npx tsx src/lib/localScannerEngine.test.ts; npx tsx src/lib/setupScanner.test.ts; npx tsc --noEmit; npm run test; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed.
Trading logic changed: Yes. The bridge-to-ChartContext normalizer now sorts bars by resolved normalized timestamp, repairs mixed open/close timestamp interpretation, collapses duplicate normalized timestamps deterministically, and emits explicit ChartContext extraction warnings for missing timeframe gaps before setup engines consume OHLC facts. It still does not synthesize missing candles.
Bridge impact: No bridge API/fetch behavior changed. Raw bridge payloads remain unchanged; app-owned ChartContext consumes the repaired internal OHLC stream.
Discord impact: Indirect. Scanner/Discord context can now surface data-quality gap warnings instead of silently evaluating a broken candle sequence as clean.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: Missing bars are reported, not fabricated. If a strategy requires uninterrupted 5M sequence proof, the existing completed-bar, HTF sufficiency, and backfill/repair paths remain responsible for obtaining the missing market_bars history before promotion.
Next recommended action: On the next live scanner cycle, confirm any timestamp normalization warnings are absent during normal operation; if present, repair/backfill market_bars before relying on HTF structural reads.

## Previous Change

Date: 2026-06-09
Task: Normalize mixed bridge timestamp modes before OHLC engines consume bars.
Files changed: docs/PROJECT_STATUS.md, src/lib/ninjaTraderBridge.ts, src/lib/localScannerEngine.test.ts.
Reason: User requested fixing the remaining caveat where a live feed mixing open-time and close-time timestamps within the same candle stream would be better handled upstream than by downstream MSS stop matching.
Tests run: npx tsx src/lib/localScannerEngine.test.ts; npx tsx src/lib/setupScanner.test.ts; npx tsc --noEmit; npm run test; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed.
Trading logic changed: Yes. `buildNinjaChartContext` now normalizes bridge bars into a canonical open-time internal OHLC stream before building candles, FVGs, displacement, HTF context, session levels, and timeframe MSS evidence. The normalizer is sequence-aware: it favors the configured bridge timestamp mode but can repair isolated mixed open/close bars when 5M/15M/60M/120M/240M spacing proves the alternate interpretation. Timeframe MSS evidence is then built from normalized open-time bars with a completed as-of timestamp.
Bridge impact: No bridge fetch/recorder API change. Internal app-owned ChartContext consumes normalized bars; raw bridge calls still return the bridge payload unchanged.
Discord impact: Indirect. Cleaner normalized OHLC can prevent false watch/conditional demotions caused only by mixed timestamp modes.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: This is sequence-based repair, not a substitute for a correct bridge setting. If bars arrive out of chronological order or with large missing chunks, the desk still depends on existing data-quality checks and should repair/backfill from `market_bars`.
Next recommended action: On the next live scanner cycle, confirm the ChartContext candle timestamps form a clean 5M sequence and the timeframeMssEvidence reports `barTimestampMode=open` internally.

## Previous Change

Date: 2026-06-09
Task: Make protected 5M MSS swing-stop timestamp proof open/close-mode aware.
Files changed: docs/PROJECT_STATUS.md, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts.
Reason: User requested fixing the remaining caveat where MSS-continuation plans would stay watch/conditional if live bridge evidence timestamps did not exactly equal scanner completed 5M candle timestamps.
Tests run: npx tsx src/lib/setupScanner.test.ts; npx tsc --noEmit; npm run test; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed.
Trading logic changed: Yes. Protected 5M MSS swing-stop proof now matches the evidence timestamp against exact completed candle timestamps and the alternate 5M open/close timestamp interpretation declared by timeframeMssEvidence.barTimestampMode. This lets a close-time MSS evidence timestamp align with an open-time completed 5M scanner candle, and vice versa, while preserving confirmed MSS, completed candle, direction, and protected pre-MSS swing requirements.
Bridge impact: None. No bridge fetch, recorder, or schema behavior changed.
Discord impact: Indirect. MSS-continuation candidates that were previously stuck as watch/conditional only due to open/close timestamp-mode mismatch can now show structure stop, app targets, and human-review status when all other proof is clean.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: Exact timestamp matches still take precedence. If a live feed mixes open-time and close-time bars in the same candle array, the desk should normalize the bridge timestamp mode upstream; this patch only prevents clean one-bar open/close offset mismatches from blocking protected swing proof.
Next recommended action: Watch the next live MSS-continuation alert and confirm the 5M MSS evidence timestamp, selected protected swing, and stop align with the chart.

## Previous Change

Date: 2026-06-09
Task: Remove duplicated-evidence dependency for Intraday MSS watch surfacing.
Files changed: docs/PROJECT_STATUS.md, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts, src/agents/scannerPlanSelectionAgent.ts, src/agents/scannerPlanSelectionAgent.test.ts.
Reason: User requested fixing the remaining caveat where the watch stayed quiet if upstream code did not attach both aligned 15M/5M MSS evidence text and a named line in the sand, even though the app-owned candidate already had structured MSS/FVG facts.
Tests run: npx tsx src/lib/setupScanner.test.ts; npx tsx src/agents/scannerPlanSelectionAgent.test.ts; npx tsc --noEmit; npm run test; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed.
Trading logic changed: Yes. IntradayMssMicroContinuation now derives a deterministic line in the sand from the structured 5M FVG/retest boundary when no HTF/session obstacle line is available, and scanner selection trusts the app-owned pending Intraday MSS candidate state instead of requiring duplicated evidence text. It remains canExecute=false and still requires structured 15M/5M MSS plus structured 5M FVG facts before a watch can exist.
Bridge impact: None. Uses existing structured ChartContext, timeframeMssEvidence, and FVG facts.
Discord impact: Yes. Pending IntradayMssMicroContinuation watches can surface when the scanner has app-owned structured proof and a derived FVG decision line, instead of being suppressed as missing duplicated evidence/reference text.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: The desk still will not invent a watch. If structured 15M/5M MSS evidence or a directional 5M FVG is missing, the scanner remains quiet and reports the setup as unavailable.
Next recommended action: Observe the next live aligned 15M/5M MSS watch and confirm Discord names the FVG-derived line, explains why it matters, says no chase, and keeps canExecute false.

## Previous Change

Date: 2026-06-09
Task: Require proven protected 5M MSS swing stops for MSS-continuation models.
Files changed: docs/PROJECT_STATUS.md, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts.
Reason: User requested fixing the remaining risk where missing 5M MSS evidence, timestamp mismatch, or no confirmed protected swing would fall back to the prior proposed/FVG stop source.
Tests run: npx tsx src/lib/setupScanner.test.ts; npx tsc --noEmit; npm run test; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed.
Trading logic changed: Yes. IntradayMssMicroContinuation and HtfDisplacementMssContinuation no longer use proposed/FVG fallback stops when the protected 5M MSS swing stop cannot be proven. Missing 5M MSS evidence, non-confirmed status, direction mismatch, invalid/misaligned evidence timestamp, or missing protected pre-MSS swing now blocks stop/targets and keeps the model conditional/watch rather than human-review-ready or executable.
Bridge impact: None. Uses existing structured 5M candles and timeframeMssEvidence timestamps.
Discord impact: Indirect. Watch/conditional alerts can now explain the protected 5M MSS swing-stop blocker instead of showing a fallback stop.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: This is stricter. Any live bridge timestamp-mode mismatch or sparse completed 5M candle history will prevent MSS-continuation stop/target promotion until the protected swing can be proven.
Next recommended action: Observe the next live MSS-continuation watch and confirm the bridge publishes the 5M MSS evidence timestamp on the completed 5M candle used by the scanner.

## Previous Change

Date: 2026-06-09
Task: Promote pending Intraday MSS Micro Continuation to Discord watch when aligned MSS and named line are present.
Files changed: docs/PROJECT_STATUS.md, src/agents/scannerPlanSelectionAgent.ts, src/agents/scannerPlanSelectionAgent.test.ts, src/lib/localScannerEngine.ts, src/lib/localScannerEngine.test.ts.
Reason: User requested a global fix so IntradayMssMicroContinuation counts as an approved active human-review model when 15M/5M MSS align and a named line in the sand exists, even before the completed 5M retest/hold confirms the full plan.
Tests run: npx tsx src/agents/scannerPlanSelectionAgent.test.ts; npx tsx src/lib/localScannerEngine.test.ts; npx tsc --noEmit; npm run test; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed.
Trading logic changed: Yes. MSS_CONTINUATION_RETEST_PENDING can now surface as a conditional Discord watch alert when it has aligned 15M/5M MSS and a named HTF/session line in the sand. It remains canExecute=false and still requires a completed 5M hold/retest before human-review plan promotion.
Bridge impact: None. Uses already-built structured candidates and existing OHLC-derived evidence.
Discord impact: Yes. Pending IntradayMssMicroContinuation watches can publish with line-in-the-sand, no-chase, and completed 5M hold/retest language instead of being suppressed as no candidate/reference.
Journal/RAG impact: Additive alert visibility only; no schema change.
Supabase impact: No migration added.
Known risks: Watch alerts still depend on upstream candidate construction publishing aligned MSS evidence and an activeRuleset HTF line; if either is missing, the scanner remains quiet rather than inventing a watch.
Next recommended action: Observe the next live aligned 15M/5M MSS watch and confirm Discord says the line, why it matters, no chase, and completed 5M hold/retest required.

## Previous Change

Date: 2026-06-09
Task: Tie active MSS continuation stops to the protected 5M MSS swing.
Files changed: docs/PROJECT_STATUS.md, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts.
Reason: User approved making 5M MSS stop logic active: shorts stop above the protected 5M swing high plus one tick, and longs stop below the protected 5M swing low minus one tick. The stop must not be tied to the MSS close.
Tests run: npx tsx src/lib/setupScanner.test.ts; npx tsx src/lib/localScannerEngine.test.ts; npx tsx src/agents/scannerPlanSelectionAgent.test.ts; npx tsc --noEmit; npm run test; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; git diff --check.
Result: Passed.
Trading logic changed: Yes. IntradayMssMicroContinuation and HtfDisplacementMssContinuation now prefer the protected 5M MSS swing stop when confirmed directional 5M MSS evidence and a completed 5M swing are available. FVG/retest/proposed stops remain fallback sources when the MSS swing stop cannot be proven.
Bridge impact: None. Uses existing structured 5M candles and timeframe MSS evidence.
Discord impact: Additive evidence wording can state the protected 5M MSS swing stop and that it is not tied to the MSS close.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: If 5M MSS evidence is missing, timestamp alignment fails, or no confirmed protected swing is available, the model falls back to the prior stop source.
Next recommended action: Observe the next live MSS continuation alert and confirm the Discord plan shows the protected 5M MSS swing stop clearly.

## Previous Change

Date: 2026-06-09
Task: Add ActiveCampaign Close-Through v6 research audit for meaningful HTF failed-auction line validation.
Files changed: tools/automation/active-campaign-close-through-audit.ts, tools/automation/replay-diagnostics/active-campaign-close-through-audit-v6-2026-05-10-to-2026-06-09.json, tools/automation/replay-diagnostics/active-campaign-close-through-audit-v6-2026-05-10-to-2026-06-09.md, tools/automation/replay-diagnostics/active-campaign-close-through-audit-v5-cacheonly-2026-05-10-to-2026-06-09.json, tools/automation/replay-diagnostics/active-campaign-close-through-audit-v5-cacheonly-2026-05-10-to-2026-06-09.md.
Reason: Test whether failed-auction catalyst credit improves when the swept HTF high/low must be a confirmed HTF swing level instead of merely a recent HTF bar extreme.
Tests run: npx tsx tools/automation/active-campaign-close-through-audit.ts --mode v6 --instrument MES --bridge-instrument "MES 06-26" --from-date 2026-05-10 --to-date 2026-06-09 --skip-bridge; npx tsx tools/automation/active-campaign-close-through-audit.ts --mode v5 --instrument MES --bridge-instrument "MES 06-26" --from-date 2026-05-10 --to-date 2026-06-09 --skip-bridge; npx tsc --noEmit; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build.
Result: Passed. Cache-only V6 found 9 campaigns, 3 T1, 6 stops, $31.25 gross one-MES P/L. Cache-only coverage was limited to 5M bars through 2026-05-14, so the bridge-repaired full-window run still needs a faster data loading path before treating V6 as a full 30-day result.
Trading logic changed: No.
Bridge impact: None. Research runner only; live bridge behavior unchanged.
Journal/RAG impact: None.
Supabase impact: None.
Known risks: Full bridge-repaired V6 audit timed out before writing artifacts. Cache-only artifacts are not a full 30-day proof because market_bars 5M coverage ended at 2026-05-14 in that run.
Next recommended action: Optimize the research audit loader or pre-backfill the full 30-day 5M/15M/60M/120M/240M cache, then rerun V6 bridge-repaired before considering active scanner promotion.

## Previous Change

Date: 2026-06-09
Task: Add failed HTF auction recognition to ActiveCampaign evidence.
Files changed: docs/PROJECT_STATUS.md, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts, src/types.ts.
Reason: User asked to fix the desk missing a 60M-style reversal where price failed at a named higher-timeframe line, instead of reducing HTF context to only MSS support/conflict.
Tests run: npx tsx src/lib/setupScanner.test.ts; npx tsx src/agents/scannerPlanSelectionAgent.test.ts; npx tsx src/lib/localScannerEngine.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. ActiveCampaign now includes confirmed failed-auction evidence when structured OHLC/failed-break facts show price sweeping a named HTF/session line and completing back through it. The June 9-style regression proves the failed-auction layer can support a short campaign while still preserving opposing 60M/120M MSS as visible conflict/caution and keeping execution non-executable without the existing gates.
Trading logic changed: Yes. ActiveCampaign now records a structured `HTF_FAILED_AUCTION_REJECTION` evidence layer when completed structured OHLC or failed-break facts show price swept a named HTF/session line and closed back through it. This can support the active campaign relationship and confidence context, but it does not approve execution or bypass 5M trigger, stop, risk, invalidation, target, session, or canExecute gates.
Bridge impact: None. Uses existing structured chart context, failed-break events, and OHLC candles already supplied by NinjaTrader/market_bars paths.
Discord impact: Additive campaign evidence can appear in scanner/Discord plan context when the active candidate is otherwise eligible.
Journal/RAG impact: No schema change.
Supabase impact: No migration added.
Known risks: Failed-auction recognition depends on structured HTF/session levels being present and named; if the bridge/market map does not publish the line, the detector will not invent it from narrative.
Next recommended action: Review the first live June 9-style rejection alert for wording and level selection, especially whether the bridge publishes the same named HTF line the chart trader is watching.

## Previous Change

Date: 2026-06-09
Task: Add Turtle Soup watch surfacing and direction-aware no-chase review.
Files changed: docs/PROJECT_STATUS.md, src/agents/scannerPlanSelectionAgent.ts, src/agents/scannerPlanSelectionAgent.test.ts.
Reason: User asked to fix the June 9 short miss where a Turtle Soup short was forming before full promotion, but the scanner either suppressed it as developing context or let an old opposite-direction LONG early-move review muddy the SHORT review.
Tests run: npx tsx src/agents/scannerPlanSelectionAgent.test.ts; npx tsc --noEmit.
Result: Passed. The selector can now surface a cloned, decision-support-only Turtle Soup watch candidate when the raw Turtle Soup candidate has entry, stop, and T1 but is still blocked by `InvalidStopLocation`. The watch states the line in the sand, completed 5M close condition, stop side, and no-chase warning if T1 is already reached. Early-move/no-chase review is now direction-aware, so an old LONG early-move review does not suppress or explain a SHORT candidate.
Trading logic changed: No executable approval change. This changes scanner alert selection/watch surfacing only; it does not alter setup detection, entry/stop/target/risk math, model approval gates, bridge reads, or canExecute.
Bridge impact: None.
Discord impact: Yes. Turtle Soup watch candidates can now be eligible as conditional decision-support alerts before full promotion, and stale review language is kept direction-aware.
Journal/RAG impact: Additive alert visibility only; no schema change.
Supabase impact: No migration added.
Known risks: This is a watch-surfacing layer. A live session should confirm the Discord payload language remains clearly conditional and does not read as executable before completed 5M confirmation.
Next recommended action: Observe the next Turtle Soup watch cycle and confirm the Discord card says completed 5M close required, no chase, and canExecute remains false.

## Previous Change

Date: 2026-06-09
Task: Keep human-review-ready scanner plans eligible for Discord when no-chase review is active.
Files changed: docs/PROJECT_STATUS.md, src/agents/scannerPlanSelectionAgent.ts, src/agents/scannerPlanSelectionAgent.test.ts.
Reason: User asked why the June 9 morning OpeningDriveFvgContinuation human-review short was not pushed to Discord. Investigation showed `earlyMoveReview.status=already_triggered_no_fresh_entry` caused the scanner selection layer to discard the `HUMAN_REVIEW_READY` candidate and classify the tick as `Missed` with confidence 0, so Discord publishing was suppressed even though the formatter already supports decision-support human-review cards.
Tests run: npx tsx src/agents/scannerPlanSelectionAgent.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. The selector now preserves a Discord human-review-eligible fallback candidate as `Conditional` when early-move/no-chase review is active, while keeping the review status as `already_triggered_no_fresh_entry` and preserving `canExecute=false`. Ordinary stale executable plans still become `Missed`, and early moves with no valid app-owned candidate remain context-only.
Trading logic changed: No. This does not alter setup detection, entry/stop/target/risk math, model approval gates, bridge reads, or canExecute. It only changes Discord alert selection for already-built human-review-ready decision-support candidates.
Bridge impact: None.
Discord impact: Yes. Human-review-ready candidates can now be posted as conditional review cards even when no-chase review warns that price is not a fresh chase entry.
Journal/RAG impact: Additive alert visibility only; no schema change.
Supabase impact: No migration added.
Known risks: The live June 9 10:05 opportunity was already stale by the time this patch was applied; the fix is for the next qualifying scanner tick/campaign and does not retroactively force-send stale historical cards.
Next recommended action: Keep the scanner running through the next completed 5M cycle and confirm any future `HUMAN_REVIEW_READY` candidate produces a conditional Discord card with no execution language.

## Previous Change

Date: 2026-06-08
Task: Apply and preflight the durable ActiveCampaign Supabase ledger.
Files changed: docs/NINJATRADER_BRIDGE.md, docs/PROJECT_STATUS.md, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, tools/automation/start-discord-alerts.ps1.
Reason: User requested fixing the remaining caveat that the Supabase migration had to be applied and required scanner env values had to be present before ActiveCampaign alerts could post.
Tests run: npx supabase db push --yes; npx supabase migration list; npm run nt:scanner -- --preflight-active-campaign-ledger; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. The `scanner_active_campaign_alerts` migration was applied to the linked remote Supabase project with `npx supabase db push --yes` and confirmed in the remote migration list. The scanner now exposes `--preflight-active-campaign-ledger`, verifies the table/env before live Discord posting mode starts, and the PowerShell launcher runs that preflight before launching the live scanner. Local `.env.local` contains the required key names, and the preflight returned ready.
Trading logic changed: No. This only adds operational readiness validation for the alert-delivery ledger; setup detection, ranking, entries, stops, targets, risk, bridge reads, and canExecute are unchanged.
Bridge impact: None.
Discord impact: Yes. Live Discord scanner startup now fails before posting mode if the durable ActiveCampaign ledger is not reachable.
Journal/RAG impact: None.
Supabase impact: Migration `20260609021436_scanner_active_campaign_ledger.sql` has been applied to the linked remote project.
Known risks: If the remote Supabase project changes or `.env.local` is not present on another machine, the preflight blocks live scanner startup until configured.
Next recommended action: Start the live launcher once and confirm the console prints `ActiveCampaign durable Supabase ledger is ready.`

## Previous Change

Date: 2026-06-08
Task: Require durable Supabase ledger for ActiveCampaign trade-plan alerts.
Files changed: docs/NINJATRADER_BRIDGE.md, docs/PROJECT_STATUS.md, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: User requested fixing the remaining risk that missing Supabase config or Supabase outage would fall back to local `.nt-scanner-state.json`, allowing duplicate campaign alerts if local state was deleted or another scanner instance used a different state path.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. ActiveCampaign alert delivery now fails closed when the durable Supabase ledger is unavailable. The scanner blocks/suppresses the campaign alert with an explicit reason instead of sending through local-only de-duplication. Local scanner state remains a cache and delivery audit record, not the campaign de-dup authority.
Trading logic changed: No. This only changes alert-delivery gating for ActiveCampaign duplicate safety; setup detection, ranking, entries, stops, targets, risk, bridge reads, and canExecute are unchanged.
Bridge impact: None.
Discord impact: Yes. ActiveCampaign trade-plan alerts require a successful durable ledger claim before posting.
Journal/RAG impact: None.
Supabase impact: Uses the existing `scanner_active_campaign_alerts` migration from the prior change; no new migration added in this tightening step.
Known risks: At the time of this change, the Supabase migration still needed to be applied and scanner env needed the required values; the following change applied the migration and added live startup preflight.
Next recommended action: Use the following ledger preflight change before running live Discord posting mode.

## Previous Change

Date: 2026-06-08
Task: Move ActiveCampaign one-trade-per-campaign de-duplication to durable Supabase persistence.
Files changed: docs/NINJATRADER_BRIDGE.md, docs/PROJECT_STATUS.md, scripts/schema-guard.js, supabase/migrations/20260609021436_scanner_active_campaign_ledger.sql, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: User requested fixing the remaining risk where the campaign ledger was local to `.nt-scanner-state.json`, so deleting that file or running another scanner instance with a different state path could repeat the same campaign alert.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. The scanner now claims `activeCampaign.id` in Supabase `scanner_active_campaign_alerts` before posting a Discord trade-plan alert. A duplicate sent/pending campaign suppresses later alerts across scanner instances. Failed or skipped Discord delivery releases the claim so the next valid scanner tick can retry. At the time of this change, local `.nt-scanner-state.json` still remained a fallback when Supabase ledger config was missing or temporarily unavailable.
Trading logic changed: No. This is alert-delivery persistence only; setup detection, ranking, entry, stop, targets, risk, invalidation, bridge reads, and canExecute are unchanged.
Bridge impact: None.
Discord impact: Yes. ActiveCampaign duplicate suppression used shared Supabase persistence, with local fallback still present at the time of this change.
Journal/RAG impact: Additive scanner alert ledger only; it does not alter trade_embeddings RAG semantics.
Supabase impact: Added migration `scanner_active_campaign_alerts` with RLS and explicit authenticated/service_role grants. Migration has not been applied to production by this local code change.
Known risks: At the time of this change, Supabase ledger required `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DISCORD_RAG_USER_ID`; if unavailable, the scanner still fell back to local state. That fallback was removed in the following change.
Next recommended action: Apply the new Supabase migration, then run one Discord-enabled scanner cycle and verify the first campaign row is marked `sent` and repeated same-campaign ticks are suppressed.

## Previous Change

Date: 2026-06-08
Task: Enforce persistent ActiveCampaign one-trade-per-campaign scanner de-duplication.
Files changed: docs/PROJECT_STATUS.md, src/lib/setupScanner.ts, src/types.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: User requested fixing the remaining risk where ActiveCampaign carried one-trade-per-campaign metadata but the live scanner/Discord sender did not yet persistently suppress repeated alerts for the same campaign across scanner ticks.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. The scanner state file now has an activeCampaignSent ledger keyed by activeCampaign.id. Once a Discord trade alert is successfully sent, subsequent candidates with the same campaign key are suppressed and the suppressed count/last seen timestamp are updated. The reset policy is trade_date_direction_campaign, so a new trade date, opposite direction, or new campaign key can alert again.
Trading logic changed: No. This is an alert-delivery de-duplication change only; setup detection, ranking, entry, stop, targets, risk, invalidation, canExecute, and bridge reads are unchanged.
Bridge impact: None.
Discord impact: Yes. Repeated trade-plan alerts for the same ActiveCampaign are suppressed after the first successful Discord send. Failed/skipped/dry-run deliveries do not consume the campaign.
Journal/RAG impact: Additive alert delivery metadata only; no schema change.
Supabase impact: No migration added.
Known risks: The ledger is local to the scanner state file. If `.nt-scanner-state.json` is deleted or the scanner runs from a separate machine/state path, the campaign can alert again until shared persistence is added.
Next recommended action: Run one live session in dry-run plus Discord-enabled mode to confirm the first campaign alert sends and later same-campaign ticks suppress cleanly.

## Previous Change

Date: 2026-06-08
Task: Activate late-day Intraday MSS Micro Continuation review window.
Files changed: docs/PROJECT_STATUS.md, src/config/timeWindows.ts, src/config/timeWindows.test.ts, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts.
Reason: User requested activation of the researched late-afternoon model-specific window for IntradayMssMicroContinuation / ActiveCampaign review: 15:00-16:40 ET, human-review only, canExecute false, HTF as support/caution/management.
Tests run: npx tsc --noEmit; npx tsx src/config/timeWindows.test.ts; npx tsx src/lib/setupScanner.test.ts.
Result: Passed. IntradayMssMicroContinuation can now surface human-review candidates during the canonical Morning/Lunch setup windows and during the model-specific 15:00-16:40 ET late-day review window. The canonical Lunch/PM classifier remains unchanged at 12:00-15:30 ET. Late-day micro-continuation evidence explicitly states the model-specific window is active and remains human-review only.
Trading logic changed: Yes. Files: src/config/timeWindows.ts and src/lib/setupScanner.ts. Behavior changed: IntradayMssMicroContinuation is now eligible after 15:30 ET through 16:40 ET when its structured 15M/5M MSS, 5M FVG retest/rejection, entry, stop, and app targets are present. Approval basis: user explicitly requested activation. canExecute remains false for this model.
Bridge impact: None.
Discord impact: No posting behavior changed.
Journal/RAG impact: Additive candidate evidence only; no schema change.
Supabase impact: No migration added.
Known risks: Persistent one-trade-per-campaign de-duplication had not yet been enforced at the time of this change.
Next recommended action: Add the ActiveCampaign behavior rules: HTF support increases confidence, HTF conflict becomes caution/management, and HTF lines guide target/extension management.

## Previous Change

Date: 2026-06-08
Task: Add ActiveCampaign orchestration context layer.
Files changed: docs/PROJECT_STATUS.md, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts, src/types.ts.
Reason: User requested the ActiveCampaign layer first so the app can represent one campaign with multiple evidence layers before adding confidence/support/caution behavior. The layer ties 15M/5M MSS campaign state, HTF MSS support/conflict/caution, HTF obstacle/target map, and 5M FVG execution context into a single context object.
Tests run: npx tsc --noEmit; npx tsx src/lib/setupScanner.test.ts.
Result: Passed. Directional setup candidates can now carry activeCampaign metadata with source=app_owned_structured_ohlc and authority=campaign_context_only_not_execution_authority. The first version records the primary trigger, execution timeframe, HTF relationship, HTF support/conflict timeframes, obstacle/management line, evidence layers, and a non-enforced one-trade-per-campaign recommendation. It does not change approvals, ranking, Discord behavior, bridge behavior, or canExecute.
Trading logic changed: No. The new layer is additive candidate metadata only and does not alter executionStatus, blockReason, candidate ordering, scanner eligibility, trade approval gates, or target/risk calculations.
Bridge impact: None.
Discord impact: None.
Journal/RAG impact: Additive candidate metadata only; no schema change.
Supabase impact: No migration added.
Known risks: ActiveCampaign de-duplication is explicitly not enforced yet. HTF support/caution confidence behavior is the next phase and has not been activated.
Next recommended action: Add the active campaign behavior rules: HTF support increases confidence, HTF conflict becomes caution/management, HTF lines guide target/extension management, and one-trade-per-campaign de-duplication is enforced only after reset rules are approved.

## Previous Change

Date: 2026-06-08
Task: Make Phase 6C IntradayMssMicroContinuation an active human-review model.
Files changed: docs/PROJECT_STATUS.md, src/config/setupRegistry.ts, src/config/setupRegistry.test.ts, src/config/tradeRules.ts, src/lib/gemini.ts, src/lib/geminiPromptSafety.test.ts, src/lib/ictModelLabels.ts, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts, src/lib/tradeDecisionPipeline.ts, src/lib/tradeDecisionPipeline.test.ts, src/lib/tradeJournal.ts, src/types.ts, tools/automation/professional-report-language.ts.
Reason: User requested Phase 6C become an active model so the desk can surface aligned 15M/5M MSS micro-continuation opportunities on both long and short sides, especially when the first continuation entry is missed, too risky, or pressing into HTF support/resistance.
Tests run: npx tsc --noEmit; npx tsx src/config/setupRegistry.test.ts; npx tsx src/lib/geminiPromptSafety.test.ts; npx tsx src/lib/setupScanner.test.ts; npx tsx src/lib/tradeDecisionPipeline.test.ts.
Result: Passed. IntradayMssMicroContinuation is now a primary active model for Morning and Lunch/PM setup scan sessions. It requires structured NinjaTrader OHLC timeframeMssEvidence with completed aligned 15M and 5M MSS, a directional 5M FVG, and then a completed 5M FVG retest/rejection for a HumanReviewReady micro-continuation plan. It derives entry from the completed rejection close, derives a protected stop beyond the FVG/retest structure, computes app T1/T2 from actual risk, and carries the global HTF line-in-the-sand rule for no-chase support/resistance close-through conditions. Long and short symmetry is covered.
Trading logic changed: Yes. Files: src/config/setupRegistry.ts, src/config/tradeRules.ts, src/lib/setupScanner.ts, src/lib/tradeDecisionPipeline.ts. Behavior changed: A new active primary model can surface human-review micro-continuation candidates from structured 15M/5M MSS plus 5M FVG retest/rejection. The model remains decision-support only and sets humanReview.canExecute=false; the app-owned deterministic pipeline still controls final approval semantics.
Bridge impact: None. The model consumes existing structured OHLC-derived context and timeframeMssEvidence; no bridge endpoint, payload, or timestamp behavior changed.
Discord impact: No sender behavior changed. Candidate labels and evidence are now available for downstream Discord formatting.
Journal/RAG impact: Additive model label support in journal typing.
Supabase impact: No migration added.
Known risks: The model respects canonical setup windows; a 15:35 ET retest remains outside the current 12:00-15:30 Lunch/PM scan window unless the approved time windows are separately changed. The model depends on structured 5M FVG bounds and completed candle facts being present.
Next recommended action: Run the current-candle scanner/replay to confirm the afternoon short is surfaced when the retest occurs inside the approved setup window and to inspect the Discord dry-run output.

## Previous Change

Date: 2026-06-08
Task: Add global HTF line-in-the-sand close-through rule across all active models.
Files changed: docs/PROJECT_STATUS.md, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts, src/types.ts.
Reason: User requested every active model name the line in the sand, explain why the price matters, and state the exact completed candle-close condition before continuing into a long or short near higher-timeframe/session support, resistance, FVG, gap, displacement-origin, midpoint, or round-number reaction context.
Tests run: npx tsc --noEmit; npx tsx src/lib/setupScanner.test.ts.
Result: Passed. The setup scanner now attaches activeRuleset.htfLineInSand to every directional candidate. When a structured HTF/session obstacle sits in the candidate path, the candidate evidence names the exact line, explains the source/reason, and adds the required completed 5M or 15M close above/below that line. If the line is present and the close-through is not confirmed, an otherwise executable candidate is demoted to Conditional with no-chase language. Liquidity targets remain target objectives and are not treated as close-through obstacles.
Trading logic changed: Yes. File: src/lib/setupScanner.ts. Function: applyHtfLineInSandRuleToCandidate. Behavior changed: All active LONG/SHORT models receive a global line-in-the-sand rule; executable status can be blocked until completed 5M or 15M close confirms acceptance beyond the named HTF/session reaction line. Approval basis: user explicitly requested this as a global rule for all active models before further phases.
Bridge impact: None. No bridge endpoint, payload contract, or fetch behavior changed.
Discord impact: No posting behavior changed. Candidate evidence/trigger text now carries the line-in-the-sand details for downstream display.
Journal/RAG impact: Additive candidate metadata only; no schema change.
Supabase impact: No migration added.
Known risks: The rule depends on structured HTF/session levels already present in chartContext. If a live bridge/session-story payload omits an important FVG/support/resistance line, the rule cannot name or block on it.
Next recommended action: Run the current-candle scanner/replay after this rule to confirm the desk states the active short/long line in the sand using live OHLC-derived levels.

## Previous Change

Date: 2026-06-08
Task: Execute Phase 5A + 5B audit for multi-timeframe campaign support on June 5.
Files changed: docs/PROJECT_STATUS.md, package.json, src/lib/multiTimeframeCampaignEvidence.ts, src/lib/multiTimeframeCampaignEvidence.test.ts, tools/automation/opening-drive-fvg-june5-replay.ts, tools/automation/replay-diagnostics/june-5-opening-drive-fvg-current-code-replay.json, tools/automation/replay-diagnostics/june-5-opening-drive-fvg-current-code-replay.md.
Reason: User requested the 15M, 60M, 120M, and 240M market-structure/displacement read be evaluated together by 10:00 ET, then paired with the first clean 5M execution trigger audit after that. This phase is audit-only supporting-layer work and does not activate a new model yet.
Tests run: npx tsc --noEmit; npx tsx src/lib/multiTimeframeCampaignEvidence.test.ts; npx tsx tools/automation/opening-drive-fvg-june5-replay.ts --instrument MES --bridge-instrument "MES 06-26" --trade-date 2026-06-05 --preload-date 2026-05-06.
Result: Passed. Phase 5A campaign audit by 2026-06-05T10:00:00 ET: campaignDirection=SHORT, reliability=sufficient, confidence=56/100, 15M alignment=aligned. Exact timeframe evidence: 15M bearish confirmed MSS from 2026-06-04T16:00:00 plus bearish displacement at 2026-06-05T10:00:00; 60M bullish confirmed MSS from 2026-06-05T06:00:00 but bearish displacement at 10:00; 120M bullish confirmed MSS from 2026-06-04T04:00:00 but bearish displacement at 10:00; 240M bearish confirmed MSS from 2026-06-03T10:00:00 plus bearish displacement at 10:00. Phase 5B found the first fresh SHORT 5M structure-break trigger at 2026-06-05T10:00:00, entry audit 7511.5, protected stop 7553, T1 7449.25, T2 7428.5, risk 41.5 points, riskStatus=extended, canExecute=false. Campaign-aligned human-review candidates: first at 10:05, risk 26.75; lowest-risk aligned candidate at 10:25, entry 7526.25, stop 7533.75, T1 7515, T2 7511.25, risk 7.5, canExecute=false.
Trading logic changed: No. This phase adds campaign evidence and trigger audit helpers plus replay output only.
Scanner impact: No active scanner behavior changed. The replay consumes existing scanner candidates for alignment diagnostics.
Bridge impact: None. Existing read-only market_bars-first plus NinjaTrader historical repair path is used.
Discord impact: No posting behavior changed. Existing dry-run preview remains artifact-only.
Journal/RAG impact: None.
Supabase impact: No migration added.
Known risks: Campaign scoring is intentionally audit-only and should not be treated as accepted active support until Phase 5C wires it into all active models with explicit pass/downgrade rules. June 5 showed a real bearish campaign read, but also confirmed that the first 5M structure-break trigger and first aligned FVG plans still carried extended risk under current risk policy.
Next recommended action: Phase 5C should make MultiTimeframeCampaignSupport an active supporting layer across all models, not a standalone approval path, after reviewing the June 5 conflict details in 60M/120M.

## Previous Change

Date: 2026-06-08
Task: Add slim June 5 Opening Drive FVG replay artifact and close the morning-trade audit gap.
Files changed: docs/PROJECT_STATUS.md, src/lib/setupScanner.ts, tools/automation/opening-drive-fvg-june5-replay.ts, tools/automation/thirty-day-active-mss-plan-replay.ts, tools/automation/replay-diagnostics/june-5-opening-drive-fvg-current-code-replay.json, tools/automation/replay-diagnostics/june-5-opening-drive-fvg-current-code-replay.md.
Reason: The broad replay script was too heavy for clean June 5 current-code audit output, and the OHLC scanner had no proposed stop in replay-only NinjaTrader contexts. Add a dedicated strict artifact mode and derive the protected 5M structure stop for OpeningDriveFvgContinuation when OHLC provides the structure/FVG but not a proposed stop.
Tests run: npx tsc --noEmit; npx tsx src/lib/setupScanner.test.ts; npx tsx tools/automation/opening-drive-fvg-june5-replay.ts --instrument MES --bridge-instrument "MES 06-26" --trade-date 2026-06-05 --preload-date 2026-05-06.
Result: Passed. The dedicated replay uses market_bars first, segmented NinjaTrader repair, 30-day preload from 2026-05-06, and evaluates MES 06-26 5M bars from 2026-06-05 09:30-11:00 ET. Coverage loaded: 5M=6217, 15M=2073, 60M=1432, 120M=1179, 240M=1112, failures=0. It found 16 OpeningDriveFvgContinuation candidates and 9 HumanReviewReady candidates. The first HumanReviewReady short appears at 2026-06-05T10:05:00 ET: entry 7526.25, protected stop 7553, T1 7486.25, T2 7472.75, FVG 7525.75-7526.75, completed bearish 5M MSS, bearish 15M opening displacement, Discord preview eligible, canExecute false.
Trading logic changed: Yes. File: src/lib/setupScanner.ts. Behavior changed: OpeningDriveFvgContinuation can derive a conservative protected 5M structure stop from the active FVG boundary, active swing, and recent completed 5M candles when OHLC replay/live context does not provide proposedStop. The path remains human-review-only and does not approve broker execution.
Scanner impact: Yes. The active scanner can now surface the June 5-style OpeningDriveFvgContinuation candidate from structured OHLC without requiring screenshot/manual proposedStop text.
Bridge impact: None. Read-only historical-bars requests only; no bridge behavior or contract changed.
Discord impact: No posting behavior changed. The new replay script only produces a dry-run Discord preview in JSON/Markdown; it does not post.
Journal/RAG impact: None.
Supabase impact: No migration added. Existing market_bars cache is read first and NinjaTrader repair is used for missing/replay history.
Known risks: The first ready short carries extended structural risk of 26.75 points versus the standard 5 point app limit, so the Discord plan correctly requires human final decision and says no automated orders. Live bridge OHLC should still be watched for one full morning session to confirm the same FVG bounds/retest/stop appear in real time, but the prior replay-scale blocker is closed.
Next recommended action: Use the June 5 current-code replay artifact as the audit record for the Opening Drive FVG fix and review the 10:05 ET short manually before accepting any risk-policy change.

## Previous Change

Date: 2026-06-08
Task: Add active Opening Drive FVG Continuation human-review ruleset and Discord plan output.
Files changed: docs/PROJECT_STATUS.md, src/config/setupRegistry.ts, src/config/setupRegistry.test.ts, src/config/tradeRules.ts, src/lib/gemini.ts, src/lib/geminiPromptSafety.test.ts, src/lib/ictModelLabels.ts, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts, src/lib/tradeDecisionPipeline.ts, src/lib/tradeDecisionPipeline.test.ts, src/lib/tradeJournal.ts, src/types.ts, tools/automation/discord-alert-format.ts, tools/automation/discord-alert-format.test.ts.
Reason: Add the requested symmetric long/short opening-drive model for 15M displacement plus 5M MSS/displacement and 5M FVG retest, while preserving human final approval and keeping canExecute false for this path.
Tests run: npx tsc --noEmit; npx tsx src/lib/setupScanner.test.ts; npx tsx src/lib/tradeDecisionPipeline.test.ts; npx tsx src/config/setupRegistry.test.ts; npx tsx src/lib/geminiPromptSafety.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. OpeningDriveFvgContinuation is now an active morning/replay-morning primary model. It can arm during 9:30-10:00 ET observation, become Human Review Ready during 10:00-11:00 ET when structured OHLC confirms 15M displacement, aligned completed 5M MSS or 5M displacement structure, 5M FVG retest/mitigation, protected stop, app T1/T2, and forward target context. Discord compact plans now show Human Review Ready language, full levels, and trader-confirmation copy while keeping canExecute false. The target lookup now skips behind-price objectives for both long and short continuation paths.
Trading logic changed: Yes. File: src/lib/setupScanner.ts. Function: buildOpeningDriveFvgContinuationCandidate, liquidityTargetForContinuation, applyActiveTimeframeMssRulesToCandidate. Behavior changed: New human-review-only opening-drive FVG setup candidate; forward target selection is current-price aware; opposing 60M/120M HTF MSS is a caution for this model rather than a hard blocker while aligned 5M MSS remains mandatory. Approval basis: user explicitly requested the two implementation prompts be run, including symmetric long/short bias support and full Discord trade-plan output.
Bridge impact: None. NinjaTrader bridge behavior and contract were not changed.
Journal/RAG impact: Journal model labels can classify Opening Drive FVG Continuation. No schema change.
Supabase impact: No migration added.
Known risks: June 5 live/replay OHLC should still be reviewed after deployment to confirm the intended 10:00-11:00 FVG retest is surfaced with the actual bridge-derived FVG bounds and stop.
Next recommended action: Run the MES 06-26 June 5 morning replay again and inspect the generated OpeningDriveFvgContinuation candidate and Discord dry-run payload.

## Previous Change

Date: 2026-06-07
Task: Complete verbose review and OHLC outcome check for the 30-day active MSS trigger.
Files changed: docs/PROJECT_STATUS.md, tools/automation/thirty-day-active-mss-plan-replay.ts, tools/automation/replay-diagnostics/compact-thirty-day-active-mss-plan-replay-2026-05-07-to-2026-06-05.json, tools/automation/replay-diagnostics/compact-thirty-day-active-mss-plan-replay-2026-05-07-to-2026-06-05.md, tools/automation/replay-diagnostics/active-mss-trigger-review-2026-05-20T1505.json, tools/automation/replay-diagnostics/active-mss-trigger-review-2026-05-20T1505.md.
Reason: Close the remaining caveats by adding a full verbose candidate-object dump for the single proper trigger and reviewing the 2026-05-20 15:05 ET chart/outcome from NinjaTrader OHLC.
Tests run: npx tsc --noEmit; compact OHLC replay from NinjaTrader historical bars for MES 06-26, 2026-04-07 preload through 2026-06-05 close; focused verbose trigger review for 2026-05-20T15:05:00 ET; post-signal 5M outcome review through 16:00 ET.
Result: Replay coverage loaded: 5M=12013, 15M=4005, 60M=1002, 120M=523, 240M=261, failures=0. It found 49 structural 5M MSS events and evaluated 326 MSS/follow-through bars. Proper scanner-executable active-MSS candidate count: 1, at 2026-05-20T15:05:00 ET, SweepMssFvgRetrace LONG, entry 7440.75, stop 7437.25, T1 7446, T2 7450, final status ApprovedTrade, effective canExecute true. The verbose candidate dump is written to active-mss-trigger-review-2026-05-20T1505.json. Outcome review: entry touched after signal at 15:10 ET; T1 hit first at 15:20 ET; T2 later hit at 15:40 ET; stop was not hit first; max favorable 13.75 points / 3.93R; max adverse 2 points / 0.57R.
Trading logic changed: No.
Bridge impact: Read-only NinjaTrader historical-bars requests only. No bridge behavior or contract changed.
Journal/RAG impact: None.
Supabase impact: No migration added. The focused trigger review used NinjaTrader historical bars directly.
Known risks: None known for the single-trigger verbose review and OHLC outcome check. The broader full-month exhaustive candidate-object dump remains intentionally avoided because the only proper trigger now has a full verbose artifact.
Next recommended action: Use the 2026-05-20 15:05 ET verbose review as the accepted audit record for this 30-day active MSS trigger check.

## Previous Change

Date: 2026-06-07
Task: Accept Phase 4 deterministic swing-structure MSS active-rule impact for the June 1-5 replay.
Files changed: docs/PROJECT_STATUS.md, tools/automation/week-mtf-mss-rth-replay.ts, tools/automation/replay-diagnostics/week-mtf-mss-rth-replay-2026-06-01-to-2026-06-05.json, tools/automation/replay-diagnostics/week-mtf-mss-rth-replay-2026-06-01-to-2026-06-05.md.
Reason: Close the manual-review risk by making the legacy-only and structural-only old-vs-new comparison explicit, machine-readable, and part of the June 1-5 MES 06-26 RTH replay artifact.
Tests run: npx tsc --noEmit; npx tsx tools/automation/week-mtf-mss-rth-replay.ts --instrument MES --bridge-instrument "MES 06-26"; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. The replay report now includes `activeRuleAcceptanceReview`. Legacy-only confirmed MSS events are accepted as intentional active-rule demotions when they lack completed close-through of confirmed opposite swing structure. Structural-only events are accepted only when the explicit `structureBreak` audit proves an MSS break against opposite prior swing structure. June 1-5 replay comparison: legacy heuristic confirmed MSS=77, structural confirmed MSS=18. Active-rule acceptance review: 68 legacy-only intentional demotions, 9 structural-only accepted promotions, 0 unresolved structural-only review events.
Trading logic changed: No for this fix. The previously approved Phase 4 structural MSS enforcement remains active by design.
Bridge impact: Read-only historical-bars requests only; no bridge behavior or contract changed.
Journal/RAG impact: Existing JSON evidence can now include optional `structureBreak` audit metadata.
Supabase impact: Existing market_bars cache was read first and repaired through the existing upsert path when Supabase config was available. No migration added.
Known risks: None known for the June 1-5 acceptance review. The stricter active MSS labels remain active by design, so fewer candidates may satisfy active MSS than under the retired heuristic.
Next recommended action: None required for this requested fix.

## Previous Change

Date: 2026-06-07
Task: Run strict MES 06-26 June 1-5 RTH multi-timeframe MSS replay from OHLC.
Files changed: docs/PROJECT_STATUS.md, tools/automation/week-mtf-mss-rth-replay.ts, tools/automation/replay-diagnostics/week-mtf-mss-rth-replay-2026-06-01-to-2026-06-05.json, tools/automation/replay-diagnostics/week-mtf-mss-rth-replay-2026-06-01-to-2026-06-05.md.
Reason: User requested an audit-ready replay from June 1 RTH open through June 5 RTH close using MES 06-26, 30-day preload, market_bars first, and NinjaTrader historical repair with no narrative reconstruction.
Tests run: npx tsc --noEmit; npx tsx tools/automation/week-mtf-mss-rth-replay.ts --instrument MES --bridge-instrument "MES 06-26".
Result: Passed. The replay loaded 30-day OHLC context, preferred fresh NinjaTrader historical bars for evidence when available, found 77 confirmed MSS events and 44 displacement-without-MSS events across 5M/15M/60M/120M/240M, and wrote JSON/Markdown reports.
Trading logic changed: No.
Bridge impact: Read-only historical-bars requests only; no bridge behavior or contract changed.
Journal/RAG impact: None.
Supabase impact: Existing market_bars cache was read first and repaired through the existing upsert path when Supabase config was available. No migration added.
Known risks: MSS identification uses the existing OHLC evidence heuristic from src/lib/timeframeMssEvidence.ts and is evidence-only, not trade approval.
Next recommended action: Review the generated Markdown/JSON report before using the events for model review or research notes.

## Previous Change

Date: 2026-06-07
Task: Phase 3 active multi-timeframe MSS ruleset observability and audit coverage.
Files changed: docs/PROJECT_STATUS.md, package.json, src/agents/bridgeDiagnosticReplayAgent.ts, src/agents/bridgeDiagnosticReplayAgent.test.ts, src/lib/activeTimeframeMssRulesetAudit.ts, src/lib/activeTimeframeMssRulesetAudit.test.ts, tools/automation/diagnostic-replay.ts, tools/automation/htf-mss-actual-ohlc-replay.ts, tools/automation/htf-mss-actual-ohlc-replay.test.ts, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts.
Reason: Add consistent audit visibility for the already-active MSS ruleset across diagnostic replay, actual OHLC replay artifacts, and scanner delivery snapshots without changing rule enforcement.
Tests run: npx tsx src/lib/activeTimeframeMssRulesetAudit.test.ts; npx tsx src/agents/bridgeDiagnosticReplayAgent.test.ts; npx tsx tools/automation/htf-mss-actual-ohlc-replay.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts.
Result: Focused tests passed. Active MSS ruleset diagnostics now report applied status, pass/block/missing state, all-model applicability, execution effect, candidate execution status, blockers, evidence, and a plain summary.
Trading logic changed: No.
Bridge impact: None. Existing bridge fetch behavior/endpoints/contracts were not changed.
Journal/RAG impact: Additive JSON audit metadata only in existing diagnostic/replay/scanner delivery records.
Supabase impact: None. No migration required because no new relational column/table is needed.
Known risks: None known.
Next recommended action: None required.

## Previous Change

Date: 2026-06-07
Task: Make multi-timeframe MSS evidence an active scanner ruleset across all models.
Files changed: docs/PROJECT_STATUS.md, src/lib/failedPlanReversalEngine.test.ts, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts, src/lib/tradeDecisionPipeline.test.ts, src/lib/tradeDecisionPipeline.ts, src/types.ts, tools/automation/htf-mss-june-1-regression.ts, tools/automation/htf-mss-phase-5b-regression.ts.
Reason: User explicitly requested the Phase 1/2 multi-timeframe MSS evidence layer be active and apply to all models.
Tests run: npx tsx src/lib/setupScanner.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. Every setup candidate now passes through a centralized active timeframe MSS ruleset after model construction and before ranking/selection. Executable LONG/SHORT candidates require NinjaTrader OHLC timeframeMssEvidence plus confirmed completed aligned 5M MSS; missing evidence, opposing completed 5M MSS, or opposing completed HTF MSS demotes the candidate to Conditional. The rule attaches activeRuleset.timeframeMss audit metadata to candidates.
Trading logic changed: Yes.
Bridge impact: None. Existing bridge fetch behavior/endpoints/contracts were not changed.
Journal/RAG impact: Candidate metadata can now include activeRuleset.timeframeMss inside existing JSON candidate/plan payloads.
Supabase impact: None. No migration required because no new relational column/table is needed; schema guard passed against the existing JSON persistence contract.
Known risks: None known.
Next recommended action: None required.

## Previous Change

Date: 2026-06-07
Task: Phase 2 diagnostics-only exposure for multi-timeframe MSS evidence.
Files changed: docs/PROJECT_STATUS.md, src/agents/bridgeDiagnosticReplayAgent.ts, src/agents/bridgeDiagnosticReplayAgent.test.ts, tools/automation/diagnostic-replay.ts, tools/automation/htf-mss-actual-ohlc-replay.ts, tools/automation/htf-mss-actual-ohlc-replay.test.ts.
Reason: Surface the Phase 1 timeframeMssEvidence layer in diagnostic replay JSON/pretty output and actual OHLC replay artifacts without changing model approvals, setup scanning, bridge fetch behavior, Discord posting, or canExecute behavior.
Tests run: npx tsc --noEmit; npx tsx src/agents/bridgeDiagnosticReplayAgent.test.ts; npx tsx tools/automation/htf-mss-actual-ohlc-replay.test.ts.
Result: Passed. Diagnostic reports now include a separate timeframeMssEvidenceDiagnostics block with per-timeframe direction, status, displacement score, structure-break flag, evidence timestamp, completed-bar status, timestamp mode/timezone, blockers, and explicit non-execution authority flags.
Trading logic changed: No.
Bridge impact: None. Existing bridge fetches/endpoints/contracts were not changed.
Journal/RAG impact: None.
Supabase impact: None. No migration added.
Known risks: None known.
Next recommended action: Keep the evidence diagnostic-only unless a separately approved phase defines how it may be used in visible UI or decision review.

## Previous Change

Date: 2026-06-07
Task: Make multi-timeframe MSS evidence completed-bar status timestamp-mode aware.
Files changed: docs/PROJECT_STATUS.md, src/lib/ninjaTraderBridge.ts, src/lib/timeframeMssEvidence.ts, src/lib/timeframeMssEvidence.test.ts, src/types.ts, tools/automation/nt-scanner.ts.
Reason: Remove the completed-bar status assumption that NinjaTrader OHLC timestamps are always bar-open times. Evidence now records and evaluates `open` or `close` timestamp mode explicitly. Current scanner and replay defaults use the NinjaTrader bridge convention of open-time bars unless an explicit diagnostic override is provided.
Tests run: npx tsx src/lib/timeframeMssEvidence.test.ts; npx tsc --noEmit.
Result: Passed. The June 5 120M noon regression now proves an open-time noon bar only counts after 14:00 ET, while close-time mode can count a 12:00 timestamp as completed at 12:00 ET.
Trading logic changed: No.
Bridge impact: None. Existing bridge fetches/endpoints/contracts were not changed; callers can pass timestamp interpretation into app-owned evidence derivation.
Journal/RAG impact: None.
Supabase impact: None. No migration added.
Known risks: None known.
Next recommended action: Keep this evidence layer diagnostic-only until a separately approved phase wires it into any visible report or decision flow.

## Previous Change

Date: 2026-06-07
Task: Build Phase 1 multi-timeframe MSS evidence tracking.
Files changed: docs/PROJECT_STATUS.md, package.json, src/lib/ninjaTraderBridge.ts, src/lib/timeframeMssEvidence.ts, src/lib/timeframeMssEvidence.test.ts, src/types.ts.
Reason: Add a structured OHLC-derived evidence-only layer for 5M, 15M, 60M, 120M, and 240M MSS/displacement facts without changing approvals, scanner behavior, bridge behavior, Discord behavior, or canExecute behavior.
Tests run: npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. Chart contexts built from NinjaTrader OHLC now carry a separate timeframeMssEvidence layer with per-timeframe direction, status, displacement quality, breaksStructure, evidence timestamp, completed-bar status, source, blockers, and confidence.
Trading logic changed: No.
Bridge impact: None. Existing bridge fetches/endpoints/contracts were not changed; the app derives evidence from already-provided OHLC bars.
Journal/RAG impact: None.
Supabase impact: None. No migration added.
Known risks: Resolved by the following timestamp-mode-aware evidence update.
Next recommended action: Phase 2 can expose/read this evidence in diagnostics only; do not wire it into candidate promotion or execution gates without separate approval.

## Previous Change

Date: 2026-06-06
Task: Remove the separate 5M displacement requirement from HTF Displacement + FVG Continuation.
Files changed: docs/PROJECT_STATUS.md, src/config/setupRegistry.ts, src/lib/gemini.ts, src/lib/setupScanner.ts, src/lib/setupScanner.test.ts.
Reason: HtfDisplacementFvgContinuation should require directional 15M displacement plus 5M FVG/imbalance retest or support, without requiring a separate 5M displacement candle. MSS remains optional/supportive for this model.
Tests run: npx tsx src/lib/setupScanner.test.ts; npx tsx src/config/setupRegistry.test.ts; npx tsx src/lib/geminiPromptSafety.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:legacy-rules; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. Scanner gate and rule text now treat 5M FVG/imbalance support as the required 5M continuation component for this model.
Trading logic changed: Yes, limited to HtfDisplacementFvgContinuation no longer hard-requiring 5M displacement.
Bridge impact: None.
Journal/RAG impact: None.
Supabase impact: None.
Known risks: This may allow more HTF Displacement + FVG Continuation candidates than before when 15M displacement and 5M FVG/imbalance support are present but no separate 5M displacement candle is recorded.
Next recommended action: Review scanner output after a live session to confirm the model labels the intended FVG retest/continuation cases without overpromoting weak 5M structure.

## Previous Change

Date: 2026-06-06
Task: Add four parent model-family metadata labels.
Files changed: docs/PROJECT_STATUS.md, src/config/setupRegistry.ts, src/config/setupRegistry.test.ts.
Reason: Keep the active primary setup catalog organized under four parent model families without changing setup roles, detection, scoring, approval, risk, target, Discord trade alert, bridge, or canExecute behavior.
Tests run: npx tsx src/config/setupRegistry.test.ts; npx tsc --noEmit; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed. Primary models now carry one of MODEL_1_SWEEP_MSS_FVG_RETRACE, FAILED_BREAKOUT_REVERSAL, HTF_DISPLACEMENT_CONTINUATION, or FAILED_PLAN_REVERSAL as metadata only. Supporting and deprecated entries do not carry a parent model family.
Trading logic changed: No.
Bridge impact: None.
Journal/RAG impact: None.
Supabase impact: None.
Known risks: None known. Parent model family is metadata only.
Next recommended action: Use parentModelFamily for reporting/taxonomy cleanup before considering any behavior changes.

## Previous Change

Date: 2026-06-15
Task: Install Discord cleanup D6 and D7.
Files changed: docs/PROJECT_STATUS.md, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, tools/supervisor/notifications.ts, tools/supervisor/supervisor.test.ts.
Reason: Keep Discord focused on one current Desk Plan per trade date/instrument and purge recovered operational notices more completely after scanner or supervisor health is proven ready.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx tools/supervisor/supervisor.test.ts; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed.
Trading logic changed: No. This only changes Discord message cleanup/replacement behavior and supervisor notification lifecycle state.
Bridge impact: None. Bridge data, contract resolution, timestamps, health checks, and fetch behavior were not changed.
Journal/RAG impact: None expected. Trade alerts and review-learning posts remain protected.
Supabase impact: None.
Known risks: None known.
Next recommended action: Restart scanner/supervisor services during the next live window if you want D6/D7 cleanup behavior loaded immediately.

## Previous Change

Date: 2026-06-15
Task: Add Discord Desk Plan replacement cleanup and recovered operational notice cleanup.
Files changed: docs/PROJECT_STATUS.md, tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, tools/supervisor/notifications.ts, tools/supervisor/supervisor.test.ts.
Reason: Keep Discord focused on the current Desk Plan while preserving trade alerts, and remove stale bridge/recorder/data-quality notices after scanner or supervisor recovery posts prove the issue is no longer active.
Tests run: npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema.
Result: Passed.
Trading logic changed: No. This change only affects Discord message lifecycle tracking/deletion and supervisor notification state.
Bridge impact: None. Bridge reads, contract resolution, and health classification were not changed.
Journal/RAG impact: None expected.
Supabase impact: None.
Known risks: None known.
Next recommended action: Restart scanner/supervisor services during the next live window if you want the new cleanup behavior loaded immediately.

## Previous Change

Date: 2026-06-05
Task: Make Quant Desk Supervisor desktop launch stealth, enrich operational Discord reports, and clear stale prior-session status risk.
Files changed: Launch-QuantDeskSupervisorTray.vbs, docs/PROJECT_STATUS.md, tools/supervisor/deliveryVisibility.ts, tools/supervisor/notifications.ts, tools/supervisor/supervisor.test.ts.
Reason: Avoid visible Windows Terminal/PowerShell windows from desktop launch, include loaded scanner-history and recorder-cache reports in operational Discord health messages, and prevent previous-session 5M markers from being reported as current stale blockers before the next active session state exists.
Tests run: Desktop shortcut smoke; visible-window check; npx tsx tools/supervisor/supervisor.test.ts; npx tsc --noEmit; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:legacy-rules; npm run guard:architecture; npm run guard:schema; git diff --check.
Result: Passed. Desktop shortcut now targets wscript.exe and launches Launch-QuantDeskSupervisorTray.vbs. Operational supervisor-ready Discord payloads now include service status, latest completed 5M, 5M/15M/60M/120M/240M loaded-history reports, recorder cache cycle details, and scanner report text when available; if logs are still warming up, Discord shows explicit pending report lines instead of waiting or sending an empty report. Prior-session stale completed-5M markers are ignored before the next active session state exists.
Trading logic changed: No.
Bridge impact: None. Bridge scripts and bridge behavior were not modified.
Journal/RAG impact: None.
Supabase impact: None.
Known risks: Windows tray icon may still appear in the overflow area by design; no console/application window should appear from desktop launch. Pending report lines mean the scanner/recorder child logs have not produced those report lines yet.
Next recommended action: Restart the tray/supervisor from the desktop shortcut when you want a fresh green supervisor-ready Discord message.

## Previous Change

Date: 2026-06-03
Task: Add scanner decision event tape and make missed-trade classification proof-based.
Files changed: docs/PROJECT_STATUS.md, src/agents/scannerPlanSelectionAgent.ts/tests, src/lib/localScannerEngine.ts/tests, tools/automation/nt-scanner.ts/tests.
Reason: Prevent early-move context from being reported as a missed trade unless a valid app-owned executable/conditional candidate existed first, and preserve a per-5M scanner decision audit trail for suppressed/live decisions.
Tests run: npx tsx src/agents/scannerPlanSelectionAgent.test.ts; npx tsx src/lib/localScannerEngine.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npm run nt:scanner -- --instrument MES --bridge-instrument MES --bridge-url http://127.0.0.1:8765 --poll-seconds 60 --bar-time-zone eastern --once --dry-run; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:legacy-rules; npm run guard:architecture; npm run guard:schema; npm run guard:active-windows.
Result: Passed. Current dry-run writes scanner-decision-tape-YYYY-MM-DD-SYMBOL-session.json and reports TriggerPending/context when no valid candidate proof exists.
Trading logic changed: Yes, limited to scanner alert-state classification: early-move context without a valid app-owned candidate is no longer labeled Missed. Entry, stop, target, risk, setup approval, session windows, Discord delivery, RAG, bridge behavior, and canExecute gates are unchanged.
Bridge impact: None. The event tape records existing OHLC-derived facts and history coverage; it does not alter bridge reads.
Journal/RAG impact: None. Decision tape is local audit JSON only.
Supabase impact: None.
Known risks: Existing historical watchlist artifacts generated before this change may still contain stale/confusing advisory language. Decision tape starts from new scanner cycles going forward.
Next recommended action: Keep scanner running through the active session and review the decision tape if a setup is suppressed or appears missed.

## Previous Change

Date: 2026-06-02
Task: Enforce 30-day scanner history preload with cache-first bridge self-healing.
Files changed: AGENTS.md, docs/CODEX_RULES.md, docs/PROJECT_STATUS.md, src/lib/gemini.ts, src/lib/htfLiquidityDrawEngine.ts/tests, tools/automation/nt-scanner.ts/tests, diagnostic replay and HTF/MSS regression fixtures.
Reason: Prevent the scanner or diagnostic replay from treating thin higher-timeframe context as a normal market-structure read when 30 days of structured OHLC history should be available.
Tests run: npx tsc --noEmit; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx src/lib/htfLiquidityDrawEngine.test.ts; npx tsx tools/automation/htf-mss-june-1-regression.test.ts; npx tsx tools/automation/htf-mss-phase-5b-regression.test.ts; npx tsx tools/automation/htf-mss-actual-ohlc-replay.test.ts; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:legacy-rules; npm run guard:architecture; npm run guard:schema; npm run guard:active-windows; git diff --check; npm run nt:scanner -- --instrument MES --bridge-instrument MES --once --dry-run --discord false.
Result: Passed. Scanner smoke was healthy; market-map refresh was skipped because the existing scanner state marked the map fresh.
Trading logic changed: No. Data sufficiency requirements and diagnostics were strengthened; entry, stop, target, risk, session, setup approval, and canExecute gates were not changed.
Bridge impact: Scanner now reads 30 calendar days from durable market_bars first and attempts NinjaTrader historical-bars repair/backfill when coverage is incomplete.
Journal/RAG impact: None expected.
Supabase impact: Existing market_bars cache may receive repaired bars through the existing upsert path.
Known risks: Build still reports pre-existing Vite chunk/dynamic-import warnings. Live self-healing depends on NinjaTrader bridge historical-bars returning the requested range.
Next recommended action: Restart scanner services and confirm a fresh market-map refresh logs 30-day coverage for 5M/15M/60M/120M/240M.

## Previous Change

Date: 2026-06-01
Task: Add HTF context sufficiency visibility and data-limited wording enforcement.
Files changed: AGENTS.md, docs/CODEX_RULES.md, docs/PROJECT_STATUS.md, src/lib/gemini.ts, src/lib/htfLiquidityDrawEngine.ts/tests, HTF/MSS replay/regression report renderers/tests, Discord compact alert formatter/tests.
Reason: Make every HTF/MSS-facing output show sufficiency, reliability, loaded timeframe coverage, minimum expected context, blockers, HTF usage, and candidate-promotion boundary.
Tests run: npx tsc --noEmit; npx tsx src/lib/htfLiquidityDrawEngine.test.ts; npx tsx tools/automation/htf-mss-actual-ohlc-replay.test.ts; npx tsx tools/automation/htf-mss-actual-ohlc-replay.ts --pretty; npx tsx tools/automation/htf-mss-june-1-regression.test.ts; npx tsx tools/automation/htf-mss-june-1-regression.ts; npx tsx tools/automation/htf-mss-phase-5b-regression.test.ts; npx tsx tools/automation/htf-mss-phase-5b-regression.ts; npx tsx tools/automation/discord-alert-format.test.ts; npx tsx src/lib/geminiPromptSafety.test.ts; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:legacy-rules; npm run guard:architecture; npm run guard:schema; npm run guard:active-windows; git diff --check.
Result: Passed.
Trading logic changed: No.
Bridge impact: None expected. Existing structured coverage is displayed more clearly.
Journal/RAG impact: None expected.
Supabase impact: None.
Known risks: Build still reports pre-existing Vite chunk/dynamic-import warnings.
Next recommended action: Review live scanner/Discord output after deployment to confirm the compact HTF Context section is readable in production Discord cards.

## Current Change

Date: 2026-06-29
Task: Add counter-structure conditional clarity to Discord high-confidence review maps.
Files changed: src/lib/localScannerEngine.ts, tools/automation/discord-alert-format.ts, tools/automation/nt-scanner.ts, tools/automation/discord-alert-format.test.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: A high-confidence conditional can be valid as a review-only map while 1H/15M/5M remain range, mixed, or opposed. Discord must state that clearly instead of making the plan read like an immediate trade call.
Tests run: npx tsx tools/automation/discord-alert-format.test.ts; npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx tools/automation/live-discord-rollout.test.ts; npx tsx tools/automation/no-silent-drop-policy-audit.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; npm run test.
Result: Passed.
Trading logic changed: No.
Bridge impact: None.
Journal/RAG impact: None.
Supabase impact: None.
Known risks: None known.
Next recommended action: Observe the next live high-confidence conditional review map and confirm the counter-structure wording is concise enough in Discord preview.

## Previous Change

Date: 2026-06-29
Task: Fix false morning scanner data-quality notice after trusted 5M-derived HTF repair.
Files changed: tools/automation/nt-scanner.ts, tools/automation/nt-scanner-alert.test.ts, docs/PROJECT_STATUS.md.
Reason: The scanner rebuilt sufficient 240M history from trusted 5M OHLC, but the readiness gate still kept 240M marked insufficient and sent an operational data-quality Discord notice.
Tests run: npx tsx tools/automation/nt-scanner-alert.test.ts; npx tsx tools/automation/live-discord-rollout.test.ts; npx tsx tools/automation/no-silent-drop-policy-audit.test.ts; npx tsx tools/automation/discord-alert-format.test.ts; npm run guard:no-firebase; npm run guard:architecture; npm run guard:schema; npm run lint; npm run build; npm run test.
Live verification: Restarted the supervisor-owned scanner/recorder and confirmed 15M/60M/120M/240M rebuilt from trusted 5M OHLC are accepted as sufficient HTF history; readiness gate reports ready for 5M/15M/1H/2H/4H context.
Result: Passed.
Trading logic changed: No.
Bridge impact: None. Existing 5M-derived HTF repair is now accepted only when it independently passes the same 30-day market-data verifier.
Journal/RAG impact: None.
Supabase impact: None.
Known risks: None known after focused and live checks.
Next recommended action: Continue live observation through the morning window and ensure any remaining suppression reasons are DeskState/canExecute reasons, not data-quality blockers.

## Previous Change

Date: 2026-06-01
Task: Add HTF context sufficiency rule and data-limited classification diagnostics.
Files changed: AGENTS.md, docs/CODEX_RULES.md, docs/PROJECT_STATUS.md, src/types.ts, src/lib/gemini.ts, src/lib/htfLiquidityDrawEngine.ts/tests, bridge diagnostic replay typing, HTF/MSS replay/regression tooling and tests.
Reason: Prevent thin higher-timeframe history from being treated as proof of structural conflict or absence of setup while preserving deterministic execution gates.
Tests run: npx tsc --noEmit; npx tsx tools/automation/htf-mss-actual-ohlc-replay.test.ts; npx tsx tools/automation/htf-mss-actual-ohlc-replay.ts; npx tsx tools/automation/htf-mss-june-1-regression.test.ts; npx tsx tools/automation/htf-mss-phase-5b-regression.test.ts; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:legacy-rules; npm run guard:architecture; npm run guard:schema; npm run guard:active-windows; git diff --check.
Result: Passed.
Trading logic changed: Yes, limited to HTF/MSS classification reliability and candidate-promotion blocking when HTF context is data-limited.
Bridge impact: Replay/diagnostic reports now expose exact timeframe coverage and sufficiency status. Bridge contract and live bridge behavior unchanged.
Journal/RAG impact: None.
Supabase impact: None.
Known risks: Needs broader live-history observation across more sessions after deployment.
Next recommended action: Review generated HTF/MSS replay diagnostics for sufficient/data-limited classification before using any HTF conclusion.

## Previous Change

Date: 2026-05-29
Task: Harden Discord research interaction safety handling for legacy review packs.
Files changed: research Discord interaction agent/tests, research Discord interaction automation server wrapper, project status.
Reason: Prevent crashes when legacy research samples omit `advisoryOnly` while still rejecting explicit unsafe/executable fields.
Tests run: git diff --check; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:legacy-rules; npm run guard:architecture; npm run guard:schema; isolated same-sample simulation.
Result: Passed.
Trading logic changed: No.
Bridge impact: None.
Journal/RAG impact: None.
Supabase impact: None.
Known risks: Build still reports pre-existing chunk-size/dynamic-import warnings.
Next recommended action: Restart the local interaction server and retry the Discord button click through the Cloudflare Tunnel.

## Previous Change

Date: 2026-05-29
Task: Add Discord research review interaction handler.
Files changed: research Discord interaction agent/tests, research Discord interaction automation CLI/server, research review state typing, package script wiring, environment example.
Reason: Allow research review Discord button clicks to update reviewed copies of sample review packs while preserving advisory-only boundaries.
Tests run: git diff --check; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:legacy-rules; npm run guard:architecture; npm run guard:schema.
Result: Passed.
Trading logic changed: No.
Bridge impact: None.
Journal/RAG impact: None.
Supabase impact: None.
Known risks: Real Discord endpoint still requires public URL routing plus Discord application configuration; build still reports pre-existing chunk-size/dynamic-import warnings.
Next recommended action: Configure research-only Discord interaction secrets and test with `npm run research:discord-interactions -- --simulate ... --pretty` before exposing the HTTP endpoint.

## Previous Change

Date: 2026-05-29
Task: Add research hypothetical outcome overlay for Discord review cards.
Files changed: research hypothetical overlay agent/tests, research outcome math report wiring, Discord research review card copy, research outcome CLI summary, package test wiring.
Reason: Show neutral research-only reference, favorable thresholds, adverse invalidation reference, first resolved event, and hypothetical outcome label for candidate review.
Tests run: git diff --check; npx tsc --noEmit; npm run test; npm run lint; npm run build; npm run guard:no-firebase; npm run guard:legacy-rules; npm run guard:architecture; npm run guard:schema; research outcome math sample run; research Discord dry-run.
Result: Passed.
Trading logic changed: No.
Bridge impact: None.
Journal/RAG impact: None.
Supabase impact: None.
Known risks: Build still reports pre-existing chunk-size/dynamic-import warnings.
Next recommended action: Review the generated research-only outcome report and Discord dry-run payloads before publishing live Discord review cards.
