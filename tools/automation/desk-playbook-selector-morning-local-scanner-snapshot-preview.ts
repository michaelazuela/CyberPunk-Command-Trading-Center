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
  SetupCandidateStatus,
  SetupType,
  type SetupCandidate,
} from '../../src/types';

type Direction = 'LONG' | 'SHORT';
type Recommendation = 'ready_for_live_wiring_decision_gate' | 'hold_local_snapshot_preview' | 'fix_dry_run_contract_input';

interface CliOptions {
  dryRunContractPath: string | null;
  outDir: string;
  json: boolean;
}

interface SlateDecision {
  slateKey: string;
  selectedTicketId: string;
  tradeDate: string;
  session: 'morning';
  direction: Direction;
  firstProofTime: string;
  lastProofTime: string;
  selectedOutcomeBucket: 'winner' | 'loss' | 'unresolved' | 'blocked';
  selectedOutcomeLabel: string;
  selectedOneMesPl: number | null;
  selectedR: number | null;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  rawRowsInSlate: number;
  duplicateRowsSuppressed: number;
  staleRowsSuppressed: number;
  collisionRows: number;
  collisionWinningRows: number;
  collisionMethodKeys: string[];
  mfeR: number | null;
  maeR: number | null;
}

interface MorningSelectorDryRunContractReport {
  reportType: 'unified_positive_held_local_preview_scanner_owned_selector_dry_run_contract';
  status: 'pass' | 'fail';
  contract: {
    selectorMethodKey: string;
    staleMinutes: number;
    collisionWindowMinutes: number;
    oneTicketPerSlate: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    selectorRawRows: number;
    dryRunSlateRows: number;
    duplicateRowsSuppressed: number;
    staleRowsSuppressed: number;
    collisionRows: number;
    collisionWinningRows: number;
    rawSelectorOneMesPl: number | null;
    dryRunOneMesPl: number | null;
    dryRunVsRawDeltaOneMesPl: number | null;
    dryRunWinRateResolved: number | null;
    livePromotionAllowedRows: 0;
    recommendation: string;
  };
  selectedSlates: SlateDecision[];
  blockers: string[];
}

interface LocalScannerSnapshotRow {
  selectedTicketId: string;
  slateKey: string;
  tradeDate: string;
  session: 'morning';
  setupType: string;
  direction: Direction;
  proofTime: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  outcomeBucket: string;
  oneMesPl: number | null;
  collisionRows: number;
  collisionWinningRows: number;
  collisionMethodKeys: string[];
  selectedCandidateSourceOfTruth: 'scanner_candidate_lifecycle_trace' | null;
  selectedCandidateKey: string | null;
  deskStateSourceOfTruth: DeskState['sourceOfTruth'];
  deskTicketSourceOfTruth: DeskState['deskTicket']['sourceOfTruth'];
  deskTicketState: DeskState['deskTicket']['state'];
  deskTicketPrimaryDirection: DeskState['deskTicket']['primaryDirection'];
  deskTicketEntry: number | null;
  deskTicketStop: number | null;
  deskTicketT1: number | null;
  deskTicketT2: number | null;
  publishDecisionSourceOfTruth: DeskPublishDecision['sourceOfTruth'];
  publishDisplaySource: DeskPublishDecision['displaySource'];
  publishShouldPost: boolean;
  publishHasCompletePlan: boolean;
  publishCanExecute: boolean;
  publishHumanReviewOnly: true;
  publishReason: string;
  canExecutePreservedFalse: boolean;
  entryStopTargetsPreserved: boolean;
  localSnapshotReady: boolean;
  localSnapshotBlockers: string[];
  livePromotionAllowed: false;
  liveReadinessBlockers: string[];
}

export interface DeskPlaybookMorningLocalScannerSnapshotPreviewReport {
  reportType: 'desk_playbook_selector_morning_local_scanner_snapshot_preview';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    readOnly: true;
    localOnly: true;
    researchOnly: true;
    readsSavedContractOnly: true;
    usesScannerOwnedBuilders: true;
    runsSetupScanner: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
    changesDiscordPosting: false;
    changesAppRuntime: false;
    livePromotionAllowed: false;
  };
  source: {
    dryRunContractPath: string | null;
    selectorMethodKey: string | null;
  };
  assumptions: {
    morningOnly: true;
    oneTicketPerMorningSlateFromContract: true;
    localBuilderSnapshotOnly: true;
    noRuntimeSelectorInstalled: true;
    noDiscordPostAttempted: true;
    noSupabaseWriteAttempted: true;
    canExecuteForcedFalse: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    selectorRawRows: number;
    contractSlateRows: number;
    snapshotRows: number;
    selectedCandidateSnapshotRows: number;
    deskTicketSnapshotRows: number;
    publishDecisionSnapshotRows: number;
    publishShouldPostRows: number;
    publishCompletePlanRows: number;
    publishCanExecuteTrueRows: number;
    localSnapshotReadyRows: number;
    canExecuteDriftRows: number;
    entryStopTargetDriftRows: number;
    duplicateRowsSuppressed: number;
    staleRowsSuppressed: number;
    collisionRows: number;
    collisionWinningRows: number;
    dryRunOneMesPl: number | null;
    dryRunWinRateResolved: number | null;
    livePromotionAllowedRows: 0;
    runtimeInstallAllowed: false;
    recommendation: Recommendation;
  };
  rows: LocalScannerSnapshotRow[];
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

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

export function parseDeskPlaybookMorningLocalScannerSnapshotPreviewArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    dryRunContractPath: readFlag(args, '--dry-run-contract') ||
      latestMatchingFile(outDir, 'unified-positive-held-local-preview-scanner-owned-selector-dry-run-contract-'),
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

function selectorSetupType(methodKey: string | null | undefined): string {
  return methodKey?.split('|')[0] || 'NoSetup';
}

function eventDateEt(eventTime: string): Date {
  return new Date(`${eventTime}-04:00`);
}

function sameLevels(row: SlateDecision, decision: DeskPublishDecision): boolean {
  if (!decision.hasCompletePlan) return false;
  return row.entry === decision.entry &&
    row.stop === decision.stop &&
    row.t1 === decision.t1 &&
    row.t2 === decision.t2;
}

function snapshotCandidate(row: SlateDecision, selectorKey: string): SetupCandidate {
  const setup = selectorSetupType(selectorKey);
  const collisionText = row.collisionMethodKeys.length ? row.collisionMethodKeys.join(', ') : 'none';
  return {
    setupType: setupType(setup),
    scenarioLabel: `Morning scanner-owned local snapshot ${setup} ${row.direction} ${row.tradeDate}`,
    direction: row.direction,
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: row.collisionWinningRows > 0 ? 'High' : 'Medium',
    priority: row.collisionWinningRows > 0 ? 240 : 220,
    entry: row.entry,
    stop: row.stop,
    target1: row.t1,
    target2: row.t2,
    riskPoints: row.riskPoints,
    modelConfidenceScore: row.collisionWinningRows > 0 ? 240 : 220,
    decisionQualityScore: row.collisionWinningRows > 0 ? 240 : 220,
    invalidation: `Invalid if price violates the protected 5M stop line at ${row.stop.toFixed(2)}.`,
    rankScore: row.collisionWinningRows > 0 ? 240 : 220,
    evidence: [
      'Saved morning selector dry-run contract replayed through scanner-owned DeskState and DeskPublishDecision builders.',
      `Selector method key: ${selectorKey}.`,
      `One selected ticket per morning slate; ${row.duplicateRowsSuppressed} duplicate rows and ${row.staleRowsSuppressed} stale rows were suppressed in the source contract.`,
      `Same-direction collision notes: ${row.collisionRows} rows; winning collisions=${row.collisionWinningRows}; methods=${collisionText}.`,
      '5M proof and deterministic geometry remain the execution reference. HTF context is not supplied by this source contract.',
    ],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: `Proof time ${row.firstProofTime} ET from saved morning selector contract.`,
    nextAction: 'Local scanner snapshot preview only; no automated orders and no live publish from this tool.',
    reducedRiskPlan: null,
    humanReview: {
      status: 'HumanReviewReady',
      canExecute: false,
      requiresTraderConfirmation: true,
      discordTradePlanEligible: false,
      reason: 'Morning local scanner snapshot preview. Human-review only; canExecute remains false.',
    },
  };
}

function buildRow(row: SlateDecision, selectorKey: string): LocalScannerSnapshotRow {
  const candidate = snapshotCandidate(row, selectorKey);
  const state: ScannerState = 'Conditional';
  const window = resolveScannerWindow(eventDateEt(row.firstProofTime));
  const alertDecision = {
    shouldSend: false,
    reason: 'Morning local scanner snapshot preview. This tool does not post Discord or change runtime scanner behavior.',
  };
  const canExecute = false;
  const visibility = classifyScannerVisibility({ state, candidate, window, alertDecision, canExecute });
  const lifecycle = buildCandidateLifecycleTrace({
    candidates: [candidate],
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
    asOfCompleted5mTime: row.firstProofTime,
  });
  const publishDecision = buildDeskPublishDecision({
    deskState,
    completed5mTime: row.firstProofTime,
  });
  const canExecutePreservedFalse = !publishDecision.canExecute && !deskState.canExecute;
  const entryStopTargetsPreserved = sameLevels(row, publishDecision);
  const localSnapshotBlockers = [
    publishDecision.hasCompletePlan ? null : 'DeskPublishDecision does not expose complete entry, stop, T1, and T2.',
    publishDecision.humanReviewOnly ? null : 'DeskPublishDecision is not marked human-review-only.',
    publishDecision.canExecute ? 'canExecute became true in a local snapshot.' : null,
    canExecutePreservedFalse ? null : 'canExecute did not remain false through scanner-owned builders.',
    entryStopTargetsPreserved ? null : 'Entry, stop, T1, or T2 drifted through scanner-owned builders.',
    publishDecision.driftBlocker ? publishDecision.driftBlocker : null,
  ].filter((item): item is string => Boolean(item));
  return {
    selectedTicketId: row.selectedTicketId,
    slateKey: row.slateKey,
    tradeDate: row.tradeDate,
    session: row.session,
    setupType: selectorSetupType(selectorKey),
    direction: row.direction,
    proofTime: row.firstProofTime,
    entry: row.entry,
    stop: row.stop,
    target1: row.t1,
    target2: row.t2,
    riskPoints: row.riskPoints,
    outcomeBucket: row.selectedOutcomeBucket,
    oneMesPl: row.selectedOneMesPl,
    collisionRows: row.collisionRows,
    collisionWinningRows: row.collisionWinningRows,
    collisionMethodKeys: [...row.collisionMethodKeys],
    selectedCandidateSourceOfTruth: lifecycle.sourceOfTruth,
    selectedCandidateKey: lifecycle.selectedCandidateKey,
    deskStateSourceOfTruth: deskState.sourceOfTruth,
    deskTicketSourceOfTruth: deskState.deskTicket.sourceOfTruth,
    deskTicketState: deskState.deskTicket.state,
    deskTicketPrimaryDirection: deskState.deskTicket.primaryDirection,
    deskTicketEntry: deskState.deskTicket.entry,
    deskTicketStop: deskState.deskTicket.stop,
    deskTicketT1: deskState.deskTicket.t1,
    deskTicketT2: deskState.deskTicket.t2,
    publishDecisionSourceOfTruth: publishDecision.sourceOfTruth,
    publishDisplaySource: publishDecision.displaySource,
    publishShouldPost: publishDecision.shouldPost,
    publishHasCompletePlan: publishDecision.hasCompletePlan,
    publishCanExecute: publishDecision.canExecute,
    publishHumanReviewOnly: publishDecision.humanReviewOnly,
    publishReason: publishDecision.reason,
    canExecutePreservedFalse,
    entryStopTargetsPreserved,
    localSnapshotReady: localSnapshotBlockers.length === 0,
    localSnapshotBlockers,
    livePromotionAllowed: false,
    liveReadinessBlockers: [
      'Live wiring gate is not approved; Discord posting, Supabase writes, canExecute, runtime selector changes, and scanner behavior remain disabled.',
    ],
  };
}

function recommendationFor(args: { blockers: string[]; rows: LocalScannerSnapshotRow[]; expectedRows: number }): Recommendation {
  if (args.blockers.length) return 'fix_dry_run_contract_input';
  if (args.rows.length === 0 || args.rows.length !== args.expectedRows) return 'hold_local_snapshot_preview';
  if (args.rows.some((row) => !row.localSnapshotReady)) return 'hold_local_snapshot_preview';
  return 'ready_for_live_wiring_decision_gate';
}

function buildMarkdown(report: Omit<DeskPlaybookMorningLocalScannerSnapshotPreviewReport, 'markdown'>): string {
  return [
    '# Desk Playbook Morning Local Scanner Snapshot Preview',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    '',
    'Authority: local-only scanner-owned builder snapshot. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk behavior.',
    '',
    '## Summary',
    `- Selector: ${report.source.selectorMethodKey ?? '-'}.`,
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Selector raw rows: ${report.summary.selectorRawRows}.`,
    `- Contract slate rows: ${report.summary.contractSlateRows}.`,
    `- Snapshot rows: ${report.summary.snapshotRows}.`,
    `- Publish complete-plan rows: ${report.summary.publishCompletePlanRows}.`,
    `- Publish shouldPost rows: ${report.summary.publishShouldPostRows}.`,
    `- Publish canExecute true rows: ${report.summary.publishCanExecuteTrueRows}.`,
    `- Local snapshot ready rows: ${report.summary.localSnapshotReadyRows}.`,
    `- Entry/stop/target drift rows: ${report.summary.entryStopTargetDriftRows}.`,
    `- Duplicate/stale rows suppressed by source contract: ${report.summary.duplicateRowsSuppressed}/${report.summary.staleRowsSuppressed}.`,
    `- Collision rows noted: ${report.summary.collisionRows}; winning collisions: ${report.summary.collisionWinningRows}.`,
    `- Dry-run one-MES P/L: ${report.summary.dryRunOneMesPl ?? '-'}.`,
    `- Dry-run win rate resolved: ${report.summary.dryRunWinRateResolved ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Snapshot Rows',
    '| Date | Setup | Direction | Proof ET | Entry | Stop | T1 | T2 | Outcome | P/L | Complete | Should Post | canExecute | Ready |',
    '|---|---|---|---:|---:|---:|---:|---:|---|---:|---|---|---|---|',
    ...report.rows.map((row) => `| ${row.tradeDate} | ${row.setupType} | ${row.direction} | ${row.proofTime.slice(11, 16)} | ${row.deskTicketEntry ?? '-'} | ${row.deskTicketStop ?? '-'} | ${row.deskTicketT1 ?? '-'} | ${row.deskTicketT2 ?? '-'} | ${row.outcomeBucket} | ${row.oneMesPl ?? '-'} | ${row.publishHasCompletePlan} | ${row.publishShouldPost} | ${row.publishCanExecute} | ${row.localSnapshotReady} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildDeskPlaybookMorningLocalScannerSnapshotPreviewReport(args: {
  dryRunContractPath: string | null;
  dryRunContractReport: MorningSelectorDryRunContractReport | null;
}, generatedAt = new Date().toISOString()): DeskPlaybookMorningLocalScannerSnapshotPreviewReport {
  const selectorKey = args.dryRunContractReport?.contract.selectorMethodKey || null;
  const selectedSlates = args.dryRunContractReport?.selectedSlates || [];
  const rows = selectorKey ? selectedSlates.map((row) => buildRow(row, selectorKey)) : [];
  const blockers = [
    !args.dryRunContractPath ? 'missing morning scanner-owned selector dry-run contract path' : null,
    !args.dryRunContractReport ? 'missing morning scanner-owned selector dry-run contract report' : null,
    args.dryRunContractReport && args.dryRunContractReport.status !== 'pass' ? 'morning dry-run contract report is not passing' : null,
    args.dryRunContractReport && !selectorKey ? 'morning dry-run contract has no selector method key' : null,
    args.dryRunContractReport && selectedSlates.length === 0 ? 'morning dry-run contract has no selected slates' : null,
    args.dryRunContractReport && selectedSlates.some((row) => row.session !== 'morning') ? 'non-morning slate entered morning snapshot input' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = recommendationFor({ blockers, rows, expectedRows: selectedSlates.length });
  const base: Omit<DeskPlaybookMorningLocalScannerSnapshotPreviewReport, 'markdown'> = {
    reportType: 'desk_playbook_selector_morning_local_scanner_snapshot_preview',
    generatedAt,
    status: blockers.length || rows.some((row) => !row.localSnapshotReady) ? 'blocked' : 'pass',
    authority: {
      readOnly: true,
      localOnly: true,
      researchOnly: true,
      readsSavedContractOnly: true,
      usesScannerOwnedBuilders: true,
      runsSetupScanner: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
      changesDiscordPosting: false,
      changesAppRuntime: false,
      livePromotionAllowed: false,
    },
    source: {
      dryRunContractPath: args.dryRunContractPath,
      selectorMethodKey: selectorKey,
    },
    assumptions: {
      morningOnly: true,
      oneTicketPerMorningSlateFromContract: true,
      localBuilderSnapshotOnly: true,
      noRuntimeSelectorInstalled: true,
      noDiscordPostAttempted: true,
      noSupabaseWriteAttempted: true,
      canExecuteForcedFalse: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: args.dryRunContractReport?.summary.sourceRows || 0,
      selectorRawRows: args.dryRunContractReport?.summary.selectorRawRows || 0,
      contractSlateRows: selectedSlates.length,
      snapshotRows: rows.length,
      selectedCandidateSnapshotRows: rows.filter((row) => row.selectedCandidateSourceOfTruth === 'scanner_candidate_lifecycle_trace').length,
      deskTicketSnapshotRows: rows.filter((row) => row.deskTicketSourceOfTruth === 'scanner_single_active_desk_ticket').length,
      publishDecisionSnapshotRows: rows.filter((row) => row.publishDecisionSourceOfTruth === 'scanner_desk_publish_decision').length,
      publishShouldPostRows: rows.filter((row) => row.publishShouldPost).length,
      publishCompletePlanRows: rows.filter((row) => row.publishHasCompletePlan).length,
      publishCanExecuteTrueRows: rows.filter((row) => row.publishCanExecute).length,
      localSnapshotReadyRows: rows.filter((row) => row.localSnapshotReady).length,
      canExecuteDriftRows: rows.filter((row) => !row.canExecutePreservedFalse).length,
      entryStopTargetDriftRows: rows.filter((row) => !row.entryStopTargetsPreserved).length,
      duplicateRowsSuppressed: args.dryRunContractReport?.summary.duplicateRowsSuppressed || 0,
      staleRowsSuppressed: args.dryRunContractReport?.summary.staleRowsSuppressed || 0,
      collisionRows: args.dryRunContractReport?.summary.collisionRows || 0,
      collisionWinningRows: args.dryRunContractReport?.summary.collisionWinningRows || 0,
      dryRunOneMesPl: args.dryRunContractReport?.summary.dryRunOneMesPl ?? null,
      dryRunWinRateResolved: args.dryRunContractReport?.summary.dryRunWinRateResolved ?? null,
      livePromotionAllowedRows: 0,
      runtimeInstallAllowed: false,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'ready_for_live_wiring_decision_gate'
      ? [
        'The morning selector dry-run slates survive current scanner-owned DeskState and DeskPublishDecision builders as complete human-review tickets with canExecute=false.',
        'This is still not live behavior: no Discord post, no Supabase write, no runtime selector install, no canExecute change, and no trade-math change occurred.',
        'Morning proof covers the selected NoInstalledSetup morning-short selector lane only; OpeningDrive collisions are notes, not extra tickets.',
      ]
      : [
        'Hold this morning local snapshot preview until every selected slate has complete scanner-owned DeskTicket and DeskPublishDecision fields without drift.',
        'Do not wire live Discord/Supabase/runtime scanner behavior from a blocked local snapshot.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeDeskPlaybookMorningLocalScannerSnapshotPreviewReport(report: DeskPlaybookMorningLocalScannerSnapshotPreviewReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `desk-playbook-selector-morning-local-scanner-snapshot-preview-${stamp}.json`);
  const markdownPath = path.join(outDir, `desk-playbook-selector-morning-local-scanner-snapshot-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseDeskPlaybookMorningLocalScannerSnapshotPreviewArgs();
  const report = buildDeskPlaybookMorningLocalScannerSnapshotPreviewReport({
    dryRunContractPath: options.dryRunContractPath,
    dryRunContractReport: readJson<MorningSelectorDryRunContractReport>(options.dryRunContractPath),
  });
  const written = writeDeskPlaybookMorningLocalScannerSnapshotPreviewReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}
