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
type ContractTicketStatus = 'dry_run_review_ticket' | 'blocked_missing_geometry' | 'suppressed_duplicate_slate';
type Recommendation = 'ready_for_live_wiring_decision_gate' | 'hold_local_snapshot_preview' | 'fix_dry_run_contract_input';

interface CliOptions {
  dryRunContractPath: string | null;
  outDir: string;
  json: boolean;
}

interface DryRunContractTicket {
  contractId: string;
  sourceTicketId: string;
  slateId: string;
  tradeDate: string;
  session: 'lunch';
  model: 'NoInstalledSetup';
  direction: Direction;
  proofTime: string;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number;
  htfContextStatus: 'supports' | 'mixed' | 'caution' | 'data_limited' | 'none' | 'partial';
  activeRaids: string[];
  movement: string | null;
  outcomeBucket: string;
  oneMesPl: number | null;
  status: ContractTicketStatus;
  canExecute: false;
  publishDiscord: false;
  writeSupabase: false;
  reviewOnly: true;
  livePromotionAllowed: false;
  blockers: string[];
  ticketText: {
    what: string;
    where: string;
    when: string;
    why: string;
    invalidation: string;
    authority: string;
  };
}

interface DryRunContractReport {
  reportType: 'desk_playbook_selector_afterlunch_scanner_owned_dry_run_contract';
  status: 'pass' | 'blocked';
  summary: {
    contractTickets: number;
    reviewTickets: number;
    winners: number;
    losses: number;
    unresolved: number;
    oneMesPl: number | null;
    winRateResolved: number | null;
    recommendation: string;
  };
  tickets: DryRunContractTicket[];
}

interface LocalScannerSnapshotRow {
  contractId: string;
  sourceTicketId: string;
  slateId: string;
  tradeDate: string;
  session: 'lunch';
  model: 'NoInstalledSetup';
  direction: Direction;
  proofTime: string;
  sourceHtfContextStatus: DryRunContractTicket['htfContextStatus'];
  sourceActiveRaids: string[];
  sourceMovement: string | null;
  outcomeBucket: string;
  oneMesPl: number | null;
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
  deskTicketHtfStatus: DeskState['deskTicket']['htfStatus'];
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

export interface DeskPlaybookAfterLunchLocalScannerSnapshotPreviewReport {
  reportType: 'desk_playbook_selector_afterlunch_local_scanner_snapshot_preview';
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
  };
  assumptions: {
    afterLunchOnly: true;
    oneTicketPerLunchSlateFromContract: true;
    localBuilderSnapshotOnly: true;
    noRuntimeSelectorInstalled: true;
    noDiscordPostAttempted: true;
    noSupabaseWriteAttempted: true;
    canExecuteForcedFalse: true;
    livePromotionAllowed: false;
  };
  summary: {
    contractTicketsRead: number;
    reviewTicketsRead: number;
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
    htfDataLimitedSourceRows: number;
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

export function parseDeskPlaybookAfterLunchLocalScannerSnapshotPreviewArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    dryRunContractPath: readFlag(args, '--dry-run-contract') ||
      latestMatchingFile(outDir, 'desk-playbook-selector-afterlunch-scanner-owned-dry-run-contract-'),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function eventDateEt(eventTime: string): Date {
  return new Date(`${eventTime}-04:00`);
}

function hasGeometry(ticket: DryRunContractTicket): boolean {
  return ticket.entry !== null && ticket.stop !== null && ticket.target1 !== null && ticket.target2 !== null;
}

function sameLevels(ticket: DryRunContractTicket, decision: DeskPublishDecision): boolean {
  if (!decision.hasCompletePlan) return false;
  return ticket.entry === decision.entry &&
    ticket.stop === decision.stop &&
    ticket.target1 === decision.t1 &&
    ticket.target2 === decision.t2;
}

function scannerStateForTicket(ticket: DryRunContractTicket): ScannerState {
  return ticket.status === 'dry_run_review_ticket' && hasGeometry(ticket) ? 'Conditional' : 'Blocked';
}

function snapshotCandidate(ticket: DryRunContractTicket): SetupCandidate {
  const directionText = ticket.direction === 'LONG' ? 'long' : 'short';
  const raids = ticket.activeRaids.length ? ticket.activeRaids.join(', ') : 'no saved raid context';
  return {
    setupType: SetupType.NoSetup,
    pathway: 'after_lunch_drive_fvg_continuation',
    scenarioLabel: `AfterLunch scanner-owned local snapshot ${directionText} ${ticket.tradeDate}`,
    direction: ticket.direction,
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: ticket.htfContextStatus === 'supports' ? 'High' : 'Medium',
    priority: ticket.htfContextStatus === 'supports' ? 240 : 220,
    entry: ticket.entry,
    stop: ticket.stop,
    target1: ticket.target1,
    target2: ticket.target2,
    riskPoints: ticket.riskPoints,
    modelConfidenceScore: ticket.htfContextStatus === 'supports' ? 240 : 220,
    decisionQualityScore: ticket.htfContextStatus === 'supports' ? 240 : 220,
    invalidation: ticket.stop === null ? null : `Invalid if price violates the protected 5M stop line at ${ticket.stop.toFixed(2)}.`,
    rankScore: ticket.htfContextStatus === 'supports' ? 240 : 220,
    evidence: [
      'Saved AfterLunch dry-run contract replayed through scanner-owned DeskState and DeskPublishDecision builders.',
      'First valid completed 5M proof per lunch slate is the selected source contract.',
      `Saved HTF/session context: ${ticket.htfContextStatus}; raids=${raids}; movement=${ticket.movement || 'not saved'}.`,
      'HTF/session context is map/support/caution only; the saved 5M proof and deterministic geometry remain the execution reference.',
    ],
    missingEvidence: ticket.blockers.length ? [...ticket.blockers] : [],
    executionStatus: hasGeometry(ticket) ? ExecutionStatus.Conditional : ExecutionStatus.Blocked,
    blockReason: null,
    requiredTrigger: ticket.ticketText.when,
    nextAction: 'Local scanner snapshot preview only; no automated orders and no live publish from this tool.',
    reducedRiskPlan: null,
    humanReview: {
      status: 'AfterLunchDriveArmed',
      canExecute: false,
      requiresTraderConfirmation: true,
      discordTradePlanEligible: false,
      reason: 'AfterLunch local scanner snapshot preview. Human-review only; canExecute remains false.',
    },
  };
}

function buildRow(ticket: DryRunContractTicket): LocalScannerSnapshotRow {
  const candidate = snapshotCandidate(ticket);
  const state = scannerStateForTicket(ticket);
  const window = resolveScannerWindow(eventDateEt(ticket.proofTime), true);
  const alertDecision = {
    shouldSend: false,
    reason: 'AfterLunch local scanner snapshot preview. This tool does not post Discord or change runtime scanner behavior.',
  };
  const canExecute = false;
  const visibility = classifyScannerVisibility({
    state,
    candidate,
    window,
    alertDecision,
    canExecute,
  });
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
    asOfCompleted5mTime: ticket.proofTime,
  });
  const publishDecision = buildDeskPublishDecision({
    deskState,
    completed5mTime: ticket.proofTime,
  });
  const canExecutePreservedFalse = !publishDecision.canExecute && !deskState.canExecute;
  const entryStopTargetsPreserved = sameLevels(ticket, publishDecision);
  const localSnapshotBlockers = [
    publishDecision.hasCompletePlan ? null : 'DeskPublishDecision does not expose complete entry, stop, T1, and T2.',
    publishDecision.humanReviewOnly ? null : 'DeskPublishDecision is not marked human-review-only.',
    publishDecision.canExecute ? 'canExecute became true in a local snapshot.' : null,
    canExecutePreservedFalse ? null : 'canExecute did not remain false through scanner-owned builders.',
    entryStopTargetsPreserved ? null : 'Entry, stop, T1, or T2 drifted through scanner-owned builders.',
    publishDecision.driftBlocker ? publishDecision.driftBlocker : null,
  ].filter((item): item is string => Boolean(item));
  return {
    contractId: ticket.contractId,
    sourceTicketId: ticket.sourceTicketId,
    slateId: ticket.slateId,
    tradeDate: ticket.tradeDate,
    session: ticket.session,
    model: ticket.model,
    direction: ticket.direction,
    proofTime: ticket.proofTime,
    sourceHtfContextStatus: ticket.htfContextStatus,
    sourceActiveRaids: [...ticket.activeRaids],
    sourceMovement: ticket.movement,
    outcomeBucket: ticket.outcomeBucket,
    oneMesPl: ticket.oneMesPl,
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
    deskTicketHtfStatus: deskState.deskTicket.htfStatus,
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

function buildRows(report: DryRunContractReport | null): LocalScannerSnapshotRow[] {
  return (report?.tickets || [])
    .filter((ticket) => ticket.status === 'dry_run_review_ticket')
    .map(buildRow);
}

function recommendationFor(args: {
  blockers: string[];
  rows: LocalScannerSnapshotRow[];
  reviewTicketsRead: number;
}): Recommendation {
  if (args.blockers.length) return 'fix_dry_run_contract_input';
  if (args.rows.length === 0 || args.rows.length !== args.reviewTicketsRead) return 'hold_local_snapshot_preview';
  if (args.rows.some((row) => !row.localSnapshotReady)) return 'hold_local_snapshot_preview';
  return 'ready_for_live_wiring_decision_gate';
}

function buildMarkdown(report: Omit<DeskPlaybookAfterLunchLocalScannerSnapshotPreviewReport, 'markdown'>): string {
  return [
    '# Desk Playbook AfterLunch Local Scanner Snapshot Preview',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    '',
    'Authority: local-only scanner-owned builder snapshot. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk behavior.',
    '',
    '## Summary',
    `- Contract tickets read: ${report.summary.contractTicketsRead}.`,
    `- Review tickets read: ${report.summary.reviewTicketsRead}.`,
    `- Snapshot rows: ${report.summary.snapshotRows}.`,
    `- Selected-candidate snapshot rows: ${report.summary.selectedCandidateSnapshotRows}.`,
    `- DeskTicket snapshot rows: ${report.summary.deskTicketSnapshotRows}.`,
    `- PublishDecision snapshot rows: ${report.summary.publishDecisionSnapshotRows}.`,
    `- Publish shouldPost rows: ${report.summary.publishShouldPostRows}.`,
    `- Publish complete-plan rows: ${report.summary.publishCompletePlanRows}.`,
    `- Publish canExecute true rows: ${report.summary.publishCanExecuteTrueRows}.`,
    `- Local snapshot ready rows: ${report.summary.localSnapshotReadyRows}.`,
    `- canExecute drift rows: ${report.summary.canExecuteDriftRows}.`,
    `- Entry/stop/target drift rows: ${report.summary.entryStopTargetDriftRows}.`,
    `- Source HTF data-limited rows: ${report.summary.htfDataLimitedSourceRows}. Data-limited HTF is context only, not structural confirmation or candidate-promotion evidence.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Snapshot Rows',
    '| Date | Direction | Proof ET | Entry | Stop | T1 | T2 | HTF Source | Ticket State | Display | Complete | Should Post | canExecute | Ready | P/L |',
    '|---|---|---:|---:|---:|---:|---:|---|---|---|---|---|---|---|---:|',
    ...report.rows.map((row) => `| ${row.tradeDate} | ${row.direction} | ${row.proofTime.slice(11, 16)} | ${row.deskTicketEntry ?? '-'} | ${row.deskTicketStop ?? '-'} | ${row.deskTicketT1 ?? '-'} | ${row.deskTicketT2 ?? '-'} | ${row.sourceHtfContextStatus} | ${row.deskTicketState} | ${row.publishDisplaySource} | ${row.publishHasCompletePlan} | ${row.publishShouldPost} | ${row.publishCanExecute} | ${row.localSnapshotReady} | ${row.oneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildDeskPlaybookAfterLunchLocalScannerSnapshotPreviewReport(args: {
  dryRunContractPath: string | null;
  dryRunContractReport: DryRunContractReport | null;
}, generatedAt = new Date().toISOString()): DeskPlaybookAfterLunchLocalScannerSnapshotPreviewReport {
  const reviewTickets = (args.dryRunContractReport?.tickets || [])
    .filter((ticket) => ticket.status === 'dry_run_review_ticket');
  const rows = buildRows(args.dryRunContractReport);
  const blockers = [
    !args.dryRunContractPath ? 'missing AfterLunch scanner-owned dry-run contract path' : null,
    !args.dryRunContractReport ? 'missing AfterLunch scanner-owned dry-run contract report' : null,
    args.dryRunContractReport && args.dryRunContractReport.status !== 'pass' ? 'AfterLunch dry-run contract report is not passing' : null,
    args.dryRunContractReport && reviewTickets.length === 0 ? 'AfterLunch dry-run contract has no review tickets' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = recommendationFor({ blockers, rows, reviewTicketsRead: reviewTickets.length });
  const base: Omit<DeskPlaybookAfterLunchLocalScannerSnapshotPreviewReport, 'markdown'> = {
    reportType: 'desk_playbook_selector_afterlunch_local_scanner_snapshot_preview',
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
    },
    assumptions: {
      afterLunchOnly: true,
      oneTicketPerLunchSlateFromContract: true,
      localBuilderSnapshotOnly: true,
      noRuntimeSelectorInstalled: true,
      noDiscordPostAttempted: true,
      noSupabaseWriteAttempted: true,
      canExecuteForcedFalse: true,
      livePromotionAllowed: false,
    },
    summary: {
      contractTicketsRead: args.dryRunContractReport?.summary.contractTickets || 0,
      reviewTicketsRead: reviewTickets.length,
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
      htfDataLimitedSourceRows: rows.filter((row) => row.sourceHtfContextStatus === 'data_limited').length,
      livePromotionAllowedRows: 0,
      runtimeInstallAllowed: false,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'ready_for_live_wiring_decision_gate'
      ? [
        'The AfterLunch dry-run contracts survive current scanner-owned DeskState and DeskPublishDecision builders as complete human-review tickets with canExecute=false.',
        'This is still not live behavior: no Discord post, no Supabase write, no runtime selector install, no canExecute change, and no trade-math change occurred.',
        'Next decision gate should decide whether to design a live wiring proposal for AfterLunch human-review tickets, or add another validation pass first.',
      ]
      : [
        'Hold this AfterLunch local snapshot preview until every review ticket has complete scanner-owned DeskTicket and DeskPublishDecision fields without drift.',
        'Do not wire live Discord/Supabase/runtime scanner behavior from a blocked local snapshot.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeDeskPlaybookAfterLunchLocalScannerSnapshotPreviewReport(report: DeskPlaybookAfterLunchLocalScannerSnapshotPreviewReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `desk-playbook-selector-afterlunch-local-scanner-snapshot-preview-${stamp}.json`);
  const markdownPath = path.join(outDir, `desk-playbook-selector-afterlunch-local-scanner-snapshot-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseDeskPlaybookAfterLunchLocalScannerSnapshotPreviewArgs();
  const report = buildDeskPlaybookAfterLunchLocalScannerSnapshotPreviewReport({
    dryRunContractPath: options.dryRunContractPath,
    dryRunContractReport: readJson<DryRunContractReport>(options.dryRunContractPath),
  });
  const written = writeDeskPlaybookAfterLunchLocalScannerSnapshotPreviewReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}
