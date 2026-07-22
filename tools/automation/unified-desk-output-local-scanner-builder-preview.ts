import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
type SessionName = 'morning' | 'lunch';
type VisibleDeskOutputState = 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ';

interface SelectorPreviewRow {
  date: string;
  session: SessionName;
  visibleState: VisibleDeskOutputState;
  model: string;
  direction: Direction;
  proofTime: string;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  movement: string;
  primaryLane: string;
  supportingModels: string[];
  sourceCandidateRole: 'primary_lane' | 'supporting_lane';
  deskLanguage: {
    headline: string;
    what: string;
    where: string;
    when: string;
    why: string;
    invalidation: string;
    authority: string;
  };
}

interface SelectorPreviewReport {
  reportType: 'unified_desk_output_selector_preview';
  generatedAt: string;
  rows: SelectorPreviewRow[];
}

interface BuilderPreviewRow {
  date: string;
  session: SessionName;
  requestedVisibleState: VisibleDeskOutputState;
  builderVisibleState: VisibleDeskOutputState | 'SILENT_INTERNAL';
  model: string;
  direction: Direction;
  proofTime: string;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  movement: string;
  primaryLane: string;
  supportingModels: string[];
  scannerState: ScannerState;
  deskStateSourceOfTruth: DeskState['sourceOfTruth'];
  deskTicketSourceOfTruth: DeskState['deskTicket']['sourceOfTruth'];
  deskTicketState: DeskState['deskTicket']['state'];
  publishDecisionSourceOfTruth: DeskPublishDecision['sourceOfTruth'];
  publishDisplaySource: DeskPublishDecision['displaySource'];
  publishHasCompletePlan: boolean;
  publishShouldPost: boolean;
  publishCanExecute: boolean;
  noAutomatedOrders: boolean;
  canExecuteChanged: false;
  livePromotionAllowed: false;
  visibleHeadline: string | null;
  visibleWhat: string | null;
  visibleWhere: string | null;
  visibleWhen: string | null;
  visibleWhy: string | null;
  visibleInvalidation: string | null;
  visibleAuthority: string | null;
  blockers: string[];
}

interface BuilderPreviewReport {
  reportType: 'unified_desk_output_local_scanner_builder_preview';
  generatedAt: string;
  authority: {
    localOnly: true;
    researchOnly: true;
    readsSavedSelectorPreviewOnly: true;
    usesScannerOwnedBuilders: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    installsRuntimeAdapter: false;
    automatedOrders: false;
  };
  source: {
    selectorPreviewPath: string;
    sourceRows: number;
  };
  summary: {
    sourceRows: number;
    builderRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    silentInternalRows: number;
    completePlanRows: number;
    publishShouldPostRows: number;
    publishCanExecuteTrueRows: number;
    canExecuteChangedRows: 0;
    livePromotionAllowedRows: 0;
    noAutomatedOrderRows: number;
    wordingViolationRows: number;
    blockedRows: number;
    runtimeInstallAllowed: false;
    recommendation: 'ready_for_disabled_runtime_adapter_preview' | 'hold_for_builder_contract_fix';
  };
  rows: BuilderPreviewRow[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  selectorPreviewPath: string | null;
  outDir: string;
  json: boolean;
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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    selectorPreviewPath: readFlag(args, '--selector-preview'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function setupType(value: string): SetupType {
  return Object.values(SetupType).includes(value as SetupType) ? value as SetupType : SetupType.NoSetup;
}

function eventDateEt(eventTime: string): Date {
  return new Date(`${eventTime}-04:00`);
}

function scannerStateFor(row: SelectorPreviewRow): ScannerState {
  return row.visibleState === 'APPROVED_DESK_PLAN' ? 'Conditional' : 'TriggerPending';
}

function hasGeometry(row: SelectorPreviewRow): boolean {
  return typeof row.entry === 'number' &&
    typeof row.stop === 'number' &&
    typeof row.target1 === 'number' &&
    typeof row.target2 === 'number' &&
    typeof row.riskPoints === 'number';
}

function snapshotCandidate(row: SelectorPreviewRow): SetupCandidate {
  return {
    setupType: setupType(row.model),
    scenarioLabel: `${row.visibleState} ${row.model} ${row.direction} ${row.date}`,
    direction: row.direction,
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: row.visibleState === 'APPROVED_DESK_PLAN' ? 'High' : 'Medium',
    priority: row.visibleState === 'APPROVED_DESK_PLAN' ? 250 : 210,
    entry: row.entry,
    stop: row.stop,
    target1: row.target1,
    target2: row.target2,
    riskPoints: row.riskPoints,
    modelConfidenceScore: row.visibleState === 'APPROVED_DESK_PLAN' ? 250 : 210,
    decisionQualityScore: row.visibleState === 'APPROVED_DESK_PLAN' ? 250 : 210,
    invalidation: row.deskLanguage.invalidation,
    rankScore: row.visibleState === 'APPROVED_DESK_PLAN' ? 250 : 210,
    evidence: [
      `Unified Desk Output Selector state: ${row.visibleState}.`,
      `Primary lane: ${row.primaryLane}.`,
      `Supporting models: ${row.supportingModels.join(', ') || 'none'}.`,
      `Session movement: ${row.movement}.`,
      'This local preview uses scanner-owned builders and does not alter trade rules, canExecute, or live publishing.',
    ],
    missingEvidence: [],
    executionStatus: hasGeometry(row) ? ExecutionStatus.Conditional : ExecutionStatus.Blocked,
    blockReason: null,
    requiredTrigger: row.deskLanguage.when,
    nextAction: row.visibleState === 'APPROVED_DESK_PLAN'
      ? 'Display as Approved Desk Plan when runtime wiring is separately approved.'
      : 'Display as Forming Desk Read when runtime wiring is separately approved.',
    reducedRiskPlan: null,
  };
}

function visibleStateFrom(args: {
  sourceRow: SelectorPreviewRow;
  publishDecision: DeskPublishDecision;
  blockers: string[];
}): BuilderPreviewRow['builderVisibleState'] {
  if (args.blockers.length || !args.publishDecision.hasCompletePlan) return 'SILENT_INTERNAL';
  return args.sourceRow.visibleState;
}

function textHasBlockedWording(row: BuilderPreviewRow): boolean {
  return [
    row.visibleHeadline,
    row.visibleWhat,
    row.visibleWhere,
    row.visibleWhen,
    row.visibleWhy,
    row.visibleInvalidation,
    row.visibleAuthority,
  ].some((value) => /human[- ]review|no chase|no-trade|no trade|missed/i.test(value || ''));
}

function buildRow(row: SelectorPreviewRow): BuilderPreviewRow {
  const candidate = snapshotCandidate(row);
  const scannerState = scannerStateFor(row);
  const window = resolveScannerWindow(eventDateEt(row.proofTime), row.session === 'lunch');
  const alertDecision = {
    shouldSend: false,
    reason: 'Unified Desk Output local scanner-builder preview only; no live publishing.',
  };
  const canExecute = false;
  const visibility = classifyScannerVisibility({ state: scannerState, candidate, window, alertDecision, canExecute });
  const lifecycle = buildCandidateLifecycleTrace({
    candidates: [candidate],
    selectedCandidate: candidate,
    state: scannerState,
    window,
    alertDecision,
    canExecute,
  });
  const deskState = buildDeskState({
    state: scannerState,
    candidate,
    visibilityMetadata: visibility,
    candidateLifecycleTrace: lifecycle,
    canExecute,
    currentPrice: null,
    asOfCompleted5mTime: row.proofTime,
  });
  const publishDecision = buildDeskPublishDecision({ deskState, completed5mTime: row.proofTime });
  const noAutomatedOrders = deskState.deskTicket.noAutomatedOrders && !publishDecision.canExecute;
  const blockers = [
    hasGeometry(row) ? null : 'Source selector row is missing entry, stop, target1, target2, or riskPoints.',
    publishDecision.hasCompletePlan ? null : 'Scanner-owned publish decision does not expose a complete plan.',
    publishDecision.canExecute ? 'canExecute became true in local builder preview.' : null,
    noAutomatedOrders ? null : 'No-automated-orders boundary was not preserved.',
    publishDecision.entry === row.entry ? null : 'Entry drifted through scanner-owned builders.',
    publishDecision.stop === row.stop ? null : 'Stop drifted through scanner-owned builders.',
    publishDecision.t1 === row.target1 ? null : 'T1 drifted through scanner-owned builders.',
    publishDecision.t2 === row.target2 ? null : 'T2 drifted through scanner-owned builders.',
    publishDecision.driftBlocker,
  ].filter((item): item is string => Boolean(item));
  const builderVisibleState = visibleStateFrom({ sourceRow: row, publishDecision, blockers });
  const visible = builderVisibleState === 'SILENT_INTERNAL' ? null : row.deskLanguage;
  const output: BuilderPreviewRow = {
    date: row.date,
    session: row.session,
    requestedVisibleState: row.visibleState,
    builderVisibleState,
    model: row.model,
    direction: row.direction,
    proofTime: row.proofTime,
    entry: publishDecision.entry,
    stop: publishDecision.stop,
    target1: publishDecision.t1,
    target2: publishDecision.t2,
    riskPoints: row.riskPoints,
    movement: row.movement,
    primaryLane: row.primaryLane,
    supportingModels: [...row.supportingModels],
    scannerState,
    deskStateSourceOfTruth: deskState.sourceOfTruth,
    deskTicketSourceOfTruth: deskState.deskTicket.sourceOfTruth,
    deskTicketState: deskState.deskTicket.state,
    publishDecisionSourceOfTruth: publishDecision.sourceOfTruth,
    publishDisplaySource: publishDecision.displaySource,
    publishHasCompletePlan: publishDecision.hasCompletePlan,
    publishShouldPost: publishDecision.shouldPost,
    publishCanExecute: publishDecision.canExecute,
    noAutomatedOrders,
    canExecuteChanged: false,
    livePromotionAllowed: false,
    visibleHeadline: visible?.headline || null,
    visibleWhat: visible?.what || null,
    visibleWhere: visible?.where || null,
    visibleWhen: visible?.when || null,
    visibleWhy: visible?.why || null,
    visibleInvalidation: visible?.invalidation || null,
    visibleAuthority: visible?.authority || null,
    blockers,
  };
  if (textHasBlockedWording(output)) {
    output.blockers.push('Visible output contains blocked legacy status wording.');
  }
  return output;
}

function buildMarkdown(report: Omit<BuilderPreviewReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Local Scanner Builder Preview',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Authority: local-only scanner-builder preview. No Discord posts, no Supabase writes, no bridge reads, no scanner behavior changes, no trading-rule changes, no canExecute changes, and no automated orders.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Builder rows: ${report.summary.builderRows}.`,
    `- Approved Desk Plans: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Reads: ${report.summary.formingDeskReadRows}.`,
    `- Silent internal rows: ${report.summary.silentInternalRows}.`,
    `- Complete-plan rows: ${report.summary.completePlanRows}.`,
    `- Publish shouldPost rows: ${report.summary.publishShouldPostRows}.`,
    `- Publish canExecute true rows: ${report.summary.publishCanExecuteTrueRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- No automated order rows: ${report.summary.noAutomatedOrderRows}.`,
    `- Wording violation rows: ${report.summary.wordingViolationRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Sample Outputs',
    '| Date | Session | State | Model | Direction | Proof ET | Entry | Stop | T1 | T2 | Builder Source |',
    '|---|---|---|---|---|---:|---:|---:|---:|---:|---|',
    ...report.rows
      .filter((row) => row.builderVisibleState !== 'SILENT_INTERNAL')
      .slice(0, 40)
      .map((row) => `| ${row.date} | ${row.session} | ${row.builderVisibleState} | ${row.model} | ${row.direction} | ${row.proofTime.slice(11, 16)} | ${row.entry ?? '-'} | ${row.stop ?? '-'} | ${row.target1 ?? '-'} | ${row.target2 ?? '-'} | ${row.publishDisplaySource} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputLocalScannerBuilderPreviewReport(args: {
  selectorPreviewPath: string;
  selectorPreviewReport: SelectorPreviewReport;
}, generatedAt = new Date().toISOString()): BuilderPreviewReport {
  const rows = args.selectorPreviewReport.rows.map(buildRow);
  const blockers = rows.flatMap((row) => row.blockers.map((blocker) => `${row.date} ${row.session} ${row.model}: ${blocker}`));
  const approvedRows = rows.filter((row) => row.builderVisibleState === 'APPROVED_DESK_PLAN');
  const formingRows = rows.filter((row) => row.builderVisibleState === 'FORMING_DESK_READ');
  const report: Omit<BuilderPreviewReport, 'markdown'> = {
    reportType: 'unified_desk_output_local_scanner_builder_preview',
    generatedAt,
    authority: {
      localOnly: true,
      researchOnly: true,
      readsSavedSelectorPreviewOnly: true,
      usesScannerOwnedBuilders: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      installsRuntimeAdapter: false,
      automatedOrders: false,
    },
    source: {
      selectorPreviewPath: args.selectorPreviewPath,
      sourceRows: args.selectorPreviewReport.rows.length,
    },
    summary: {
      sourceRows: args.selectorPreviewReport.rows.length,
      builderRows: rows.length,
      approvedDeskPlanRows: approvedRows.length,
      formingDeskReadRows: formingRows.length,
      silentInternalRows: rows.filter((row) => row.builderVisibleState === 'SILENT_INTERNAL').length,
      completePlanRows: rows.filter((row) => row.publishHasCompletePlan).length,
      publishShouldPostRows: rows.filter((row) => row.publishShouldPost).length,
      publishCanExecuteTrueRows: rows.filter((row) => row.publishCanExecute).length,
      canExecuteChangedRows: 0,
      livePromotionAllowedRows: 0,
      noAutomatedOrderRows: rows.filter((row) => row.noAutomatedOrders).length,
      wordingViolationRows: rows.filter(textHasBlockedWording).length,
      blockedRows: rows.filter((row) => row.blockers.length > 0).length,
      runtimeInstallAllowed: false,
      recommendation: blockers.length === 0 ? 'ready_for_disabled_runtime_adapter_preview' : 'hold_for_builder_contract_fix',
    },
    rows,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputLocalScannerBuilderPreviewReport(report: BuilderPreviewReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-local-scanner-builder-preview-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-local-scanner-builder-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const selectorPreviewPath = path.resolve(options.selectorPreviewPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-selector-preview-\d+\.json$/) ||
    '');
  if (!fs.existsSync(selectorPreviewPath)) throw new Error('Missing Unified Desk Output selector preview path.');
  const report = buildUnifiedDeskOutputLocalScannerBuilderPreviewReport({
    selectorPreviewPath,
    selectorPreviewReport: readJson<SelectorPreviewReport>(selectorPreviewPath),
  });
  const written = writeUnifiedDeskOutputLocalScannerBuilderPreviewReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.blockers.length ? 'blocked' : 'pass', summary: report.summary, blockers: report.blockers.slice(0, 20) }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.blockers.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
