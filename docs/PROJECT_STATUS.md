# Project Status

## Latest Change

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
Reason: Remove the completed-bar status assumption that NinjaTrader OHLC timestamps are always bar-open times. Evidence now records and evaluates `open` or `close` timestamp mode explicitly, defaulting to the scanner convention of `close`.
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
