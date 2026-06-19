# Project Status

## Latest Change

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
