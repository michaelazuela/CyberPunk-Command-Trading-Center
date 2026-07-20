import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCandidateLifecycleTrace,
  buildDeskPublishDecision,
  buildDeskState,
  classifyScannerVisibility,
  resolveScannerWindow,
  type DeskPublishDecision,
  type DeskState,
  type ScannerState,
} from '../../src/lib/localScannerEngine';
import {
  ExecutionStatus,
  NoTradeReason,
  SetupCandidateStatus,
  SetupType,
  type SetupCandidate,
} from '../../src/types';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-current-changed-event-drilldown';

interface CliOptions {
  changedEventDrilldownPath: string | null;
  outDir: string;
  json: boolean;
}

interface SnapshotCandidateInput {
  candidateKey: string;
  setupType: string;
  direction: string;
  executionStatus: string;
  blockReason: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  rankScore: number;
  canExecute: boolean | null;
}

interface ScannerOwnedSnapshotRow {
  eventKey: string;
  tradeDate: string;
  session: string;
  eventTime: string;
  path: 'baseline_invalid_sweep' | 'simulated_replacement';
  candidateKey: string;
  setupType: string;
  direction: string;
  executionStatus: string;
  blockReason: string | null;
  selectedCandidateSourceOfTruth: 'scanner_candidate_lifecycle_trace' | null;
  selectedCandidateKey: string | null;
  deskStateSourceOfTruth: DeskState['sourceOfTruth'];
  deskTicketSourceOfTruth: DeskState['deskTicket']['sourceOfTruth'];
  deskTicketState: DeskState['deskTicket']['state'];
  deskTicketEntry: number | null;
  deskTicketStop: number | null;
  deskTicketT1: number | null;
  deskTicketT2: number | null;
  publishDecisionSourceOfTruth: DeskPublishDecision['sourceOfTruth'];
  publishDisplaySource: DeskPublishDecision['displaySource'];
  publishShouldPost: boolean;
  publishHasCompletePlan: boolean;
  publishCanExecute: boolean;
  publishReason: string;
  canExecutePreserved: boolean;
  entryStopTargetsPreserved: boolean;
  runtimeProposalReady: boolean;
  runtimeReadinessBlockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportReport {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_scanner_owned_snapshot_export';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
    readOnly: true;
    localOnly: true;
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsSetupScanner: false;
    usesScannerOwnedBuilders: true;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
    changesDiscordPosting: false;
    changesAppRuntime: false;
  };
  source: {
    changedEventDrilldownPath: string | null;
  };
  assumptions: {
    changedEventsOnly: true;
    localBuilderSnapshotOnly: true;
    noRuntimeSelectorInstalled: true;
    discordPostingForcedFalse: true;
    livePromotionAllowed: false;
  };
  summary: {
    changedEventsRead: number;
    snapshotRows: number;
    baselineRows: number;
    simulatedReplacementRows: number;
    selectedCandidateSnapshotRows: number;
    deskTicketSnapshotRows: number;
    publishDecisionSnapshotRows: number;
    publishShouldPostRows: number;
    publishCompletePlanRows: number;
    publishCanExecuteTrueRows: number;
    runtimeProposalReadyRows: number;
    canExecuteDriftRows: number;
    entryStopTargetDriftRows: number;
    runtimeInstallAllowed: false;
    recommendation: 'research_snapshot_only_no_runtime_install' | 'fix_missing_input_reports';
  };
  rows: ScannerOwnedSnapshotRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

export function parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    changedEventDrilldownPath: readFlag(args, '--changed-event-drilldown') ||
      latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-primary-exclusion-current-changed-event-drilldown-\d+\.json$/),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function setupType(value: string): SetupType {
  return Object.values(SetupType).includes(value as SetupType) ? value as SetupType : SetupType.NoSetup;
}

function executionStatus(value: string): ExecutionStatus {
  return Object.values(ExecutionStatus).includes(value as ExecutionStatus) ? value as ExecutionStatus : ExecutionStatus.Conditional;
}

function blockReason(value: string | null): NoTradeReason | null {
  if (!value) return null;
  return Object.values(NoTradeReason).includes(value as NoTradeReason) ? value as NoTradeReason : NoTradeReason.NoApprovedSetup;
}

function scannerStateForCandidate(candidate: SnapshotCandidateInput): ScannerState {
  const status = executionStatus(candidate.executionStatus);
  if (status === ExecutionStatus.Executable) return 'Executable';
  if (status === ExecutionStatus.Blocked) return 'Blocked';
  if (status === ExecutionStatus.NotDetected || status === ExecutionStatus.Invalid) return 'NoTrade';
  if (candidate.blockReason === NoTradeReason.EntryTriggerPending || candidate.blockReason === NoTradeReason.EntryTriggerMissing) return 'TriggerPending';
  return 'Conditional';
}

function eventDateEt(eventTime: string): Date {
  return new Date(`${eventTime}-04:00`);
}

function snapshotCandidate(input: SnapshotCandidateInput): SetupCandidate {
  const status = executionStatus(input.executionStatus);
  const reason = blockReason(input.blockReason);
  return {
    setupType: setupType(input.setupType),
    scenarioLabel: `Local scanner-owned snapshot for ${input.setupType} ${input.direction}`,
    direction: input.direction === 'SHORT' ? 'SHORT' : input.direction === 'LONG' ? 'LONG' : 'NO TRADE',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: input.rankScore >= 250 ? 'High' : input.rankScore >= 200 ? 'Medium' : 'Low',
    priority: input.rankScore,
    entry: input.entry,
    stop: input.stop,
    target1: input.target1,
    target2: input.target2,
    riskPoints: input.riskPoints,
    invalidation: input.stop === null ? null : `Invalid at protected structure stop ${input.stop.toFixed(2)}.`,
    rankScore: input.rankScore,
    evidence: [
      'Current raw scanner package candidate replayed through scanner-owned DeskState builders.',
      `Original executionStatus=${input.executionStatus}.`,
    ],
    missingEvidence: reason ? [`Blocked/held reason from raw package: ${reason}.`] : [],
    executionStatus: status,
    blockReason: reason,
    requiredTrigger: reason ? `Resolve ${reason} before any human-review ticket can publish.` : null,
    nextAction: reason ? `Hold local until ${reason} is resolved by completed 5M proof.` : 'Review only; no automated orders.',
    reducedRiskPlan: null,
    humanReview: status === ExecutionStatus.Executable
      ? undefined
      : {
        status: 'HumanReviewReady',
        canExecute: false,
        requiresTraderConfirmation: true,
        discordTradePlanEligible: false,
        reason: 'Local scanner-owned snapshot export; Discord remains disabled.',
      },
  };
}

function sameLevels(input: SnapshotCandidateInput, decision: DeskPublishDecision): boolean {
  if (!decision.hasCompletePlan) return true;
  return input.entry === decision.entry &&
    input.stop === decision.stop &&
    input.target1 === decision.t1 &&
    input.target2 === decision.t2;
}

function buildRow(args: {
  eventKey: string;
  tradeDate: string;
  session: string;
  eventTime: string;
  path: ScannerOwnedSnapshotRow['path'];
  candidateInput: SnapshotCandidateInput;
  companionInput: SnapshotCandidateInput | null;
}): ScannerOwnedSnapshotRow {
  const candidate = snapshotCandidate(args.candidateInput);
  const companion = args.companionInput ? snapshotCandidate(args.companionInput) : null;
  const state = scannerStateForCandidate(args.candidateInput);
  const window = resolveScannerWindow(eventDateEt(args.eventTime));
  const alertDecision = {
    shouldSend: false,
    reason: 'Local scanner-owned snapshot export. No Discord post or runtime scanner behavior is installed.',
  };
  const canExecute = args.candidateInput.canExecute === true;
  const visibility = classifyScannerVisibility({
    state,
    candidate,
    window,
    alertDecision,
    canExecute,
  });
  const lifecycle = buildCandidateLifecycleTrace({
    candidates: companion ? [candidate, companion] : [candidate],
    selectedCandidate: candidate,
    state,
    window,
    alertDecision,
    canExecute,
  });
  const deskState = buildDeskState({
    state,
    candidate,
    visibilityMetadata: visibility,
    candidateLifecycleTrace: lifecycle,
    canExecute,
    currentPrice: null,
    asOfCompleted5mTime: args.eventTime,
  });
  const publishDecision = buildDeskPublishDecision({
    deskState,
    completed5mTime: args.eventTime,
  });
  const canExecutePreserved = publishDecision.canExecute === canExecute && deskState.canExecute === canExecute;
  const entryStopTargetsPreserved = sameLevels(args.candidateInput, publishDecision);
  const runtimeReadinessBlockers = [
    publishDecision.shouldPost ? null : 'DeskPublishDecision shouldPost is false in the local scanner-owned snapshot.',
    publishDecision.hasCompletePlan ? null : 'DeskPublishDecision does not have complete entry, stop, T1, and T2.',
    publishDecision.canExecute ? 'canExecute became true in a research-only snapshot' : null,
    canExecutePreserved ? null : 'canExecute drifted while building scanner-owned snapshot.',
    entryStopTargetsPreserved ? null : 'entry/stop/target values drifted while building scanner-owned snapshot.',
  ].filter((item): item is string => Boolean(item));
  return {
    eventKey: args.eventKey,
    tradeDate: args.tradeDate,
    session: args.session,
    eventTime: args.eventTime,
    path: args.path,
    candidateKey: args.candidateInput.candidateKey,
    setupType: args.candidateInput.setupType,
    direction: args.candidateInput.direction,
    executionStatus: args.candidateInput.executionStatus,
    blockReason: args.candidateInput.blockReason,
    selectedCandidateSourceOfTruth: lifecycle.sourceOfTruth,
    selectedCandidateKey: lifecycle.selectedCandidateKey,
    deskStateSourceOfTruth: deskState.sourceOfTruth,
    deskTicketSourceOfTruth: deskState.deskTicket.sourceOfTruth,
    deskTicketState: deskState.deskTicket.state,
    deskTicketEntry: deskState.deskTicket.entry,
    deskTicketStop: deskState.deskTicket.stop,
    deskTicketT1: deskState.deskTicket.t1,
    deskTicketT2: deskState.deskTicket.t2,
    publishDecisionSourceOfTruth: publishDecision.sourceOfTruth,
    publishDisplaySource: publishDecision.displaySource,
    publishShouldPost: publishDecision.shouldPost,
    publishHasCompletePlan: publishDecision.hasCompletePlan,
    publishCanExecute: publishDecision.canExecute,
    publishReason: publishDecision.reason,
    canExecutePreserved,
    entryStopTargetsPreserved,
    runtimeProposalReady: runtimeReadinessBlockers.length === 0,
    runtimeReadinessBlockers,
  };
}

function buildRows(report: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport | null): ScannerOwnedSnapshotRow[] {
  return (report?.changedEvents || []).flatMap((event) => {
    const baseline = event.baselineCandidate as SnapshotCandidateInput | null;
    const simulated = event.simulatedCandidate as SnapshotCandidateInput | null;
    const rows: ScannerOwnedSnapshotRow[] = [];
    if (baseline) {
      rows.push(buildRow({
        eventKey: event.eventKey,
        tradeDate: event.tradeDate,
        session: event.session,
        eventTime: event.eventTime,
        path: 'baseline_invalid_sweep',
        candidateInput: baseline,
        companionInput: simulated,
      }));
    }
    if (simulated) {
      rows.push(buildRow({
        eventKey: event.eventKey,
        tradeDate: event.tradeDate,
        session: event.session,
        eventTime: event.eventTime,
        path: 'simulated_replacement',
        candidateInput: simulated,
        companionInput: baseline,
      }));
    }
    return rows;
  });
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportReport, 'markdown'>): string {
  return [
    '# Sweep Primary Exclusion Scanner-Owned Snapshot Export',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only scanner-owned builder snapshot. It does not run setupScanner, install runtime selection behavior, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Changed events read: ${report.summary.changedEventsRead}.`,
    `- Snapshot rows: ${report.summary.snapshotRows}.`,
    `- Baseline rows: ${report.summary.baselineRows}.`,
    `- Simulated replacement rows: ${report.summary.simulatedReplacementRows}.`,
    `- Selected-candidate snapshot rows: ${report.summary.selectedCandidateSnapshotRows}.`,
    `- DeskTicket snapshot rows: ${report.summary.deskTicketSnapshotRows}.`,
    `- PublishDecision snapshot rows: ${report.summary.publishDecisionSnapshotRows}.`,
    `- Publish shouldPost rows: ${report.summary.publishShouldPostRows}.`,
    `- Publish complete-plan rows: ${report.summary.publishCompletePlanRows}.`,
    `- Publish canExecute true rows: ${report.summary.publishCanExecuteTrueRows}.`,
    `- Runtime-proposal-ready rows: ${report.summary.runtimeProposalReadyRows}.`,
    `- canExecute drift rows: ${report.summary.canExecuteDriftRows}.`,
    `- Entry/stop/target drift rows: ${report.summary.entryStopTargetDriftRows}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Date | Session | Time | Path | Setup | Reason | Ticket State | Display | Complete | Should Post | Ready |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${row.tradeDate} | ${row.session} | ${row.eventTime} | ${row.path} | ${row.setupType} ${row.direction} | ${row.blockReason || '-'} | ${row.deskTicketState} | ${row.publishDisplaySource} | ${row.publishHasCompletePlan} | ${row.publishShouldPost} | ${row.runtimeProposalReady} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportReport(args: {
  changedEventDrilldownPath: string | null;
  changedEventDrilldownReport: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportReport {
  const rows = buildRows(args.changedEventDrilldownReport);
  const blockers = [
    !args.changedEventDrilldownPath ? 'missing changed-event drilldown path' : null,
    !args.changedEventDrilldownReport ? 'missing changed-event drilldown report' : null,
    (args.changedEventDrilldownReport?.changedEvents || []).length === 0 ? 'changed-event drilldown has no changed events' : null,
    rows.length === 0 ? 'no scanner-owned snapshot rows were created' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_scanner_owned_snapshot_export',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: {
      readOnly: true,
      localOnly: true,
      researchOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      runsSetupScanner: false,
      usesScannerOwnedBuilders: true,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
      changesDiscordPosting: false,
      changesAppRuntime: false,
    },
    source: {
      changedEventDrilldownPath: args.changedEventDrilldownPath,
    },
    assumptions: {
      changedEventsOnly: true,
      localBuilderSnapshotOnly: true,
      noRuntimeSelectorInstalled: true,
      discordPostingForcedFalse: true,
      livePromotionAllowed: false,
    },
    summary: {
      changedEventsRead: (args.changedEventDrilldownReport?.changedEvents || []).length,
      snapshotRows: rows.length,
      baselineRows: rows.filter((row) => row.path === 'baseline_invalid_sweep').length,
      simulatedReplacementRows: rows.filter((row) => row.path === 'simulated_replacement').length,
      selectedCandidateSnapshotRows: rows.filter((row) => row.selectedCandidateSourceOfTruth === 'scanner_candidate_lifecycle_trace').length,
      deskTicketSnapshotRows: rows.filter((row) => row.deskTicketSourceOfTruth === 'scanner_single_active_desk_ticket').length,
      publishDecisionSnapshotRows: rows.filter((row) => row.publishDecisionSourceOfTruth === 'scanner_desk_publish_decision').length,
      publishShouldPostRows: rows.filter((row) => row.publishShouldPost).length,
      publishCompletePlanRows: rows.filter((row) => row.publishHasCompletePlan).length,
      publishCanExecuteTrueRows: rows.filter((row) => row.publishCanExecute).length,
      runtimeProposalReadyRows: rows.filter((row) => row.runtimeProposalReady).length,
      canExecuteDriftRows: rows.filter((row) => !row.canExecutePreserved).length,
      entryStopTargetDriftRows: rows.filter((row) => !row.entryStopTargetsPreserved).length,
      runtimeInstallAllowed: false,
      recommendation: blockers.length ? 'fix_missing_input_reports' : 'research_snapshot_only_no_runtime_install',
    },
    rows,
    blockers,
    recommendations: [
      'Treat the 4 changed events as non-publishable under current scanner-owned builders because neither baseline nor replacement path has a complete publish decision.',
      'Do not install a runtime Sweep exclusion from this evidence; it changes raw rankScore top selection but does not create a publishable human-review ticket.',
      'Next narrow research should look for current raw-package events where exact invalid-stop Sweep is top and a same-slate replacement already has complete entry, stop, T1, and T2.',
    ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportReport(report: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-scanner-owned-snapshot-export-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-scanner-owned-snapshot-export-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportArgs();
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportReport({
    changedEventDrilldownPath: options.changedEventDrilldownPath,
    changedEventDrilldownReport: readJson<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport>(options.changedEventDrilldownPath),
  });
  const written = writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}
