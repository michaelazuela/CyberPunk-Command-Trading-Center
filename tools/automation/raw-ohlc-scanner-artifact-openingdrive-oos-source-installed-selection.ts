import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUnifiedDeskCandidateBook } from '../../src/lib/unifiedDeskCandidateBook';
import { ExecutionStatus, NoTradeReason, SetupCandidate, SetupCandidateStatus, SetupType } from '../../src/types';
import type {
  RawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-replay-collision-package';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

interface CliOptions {
  samebarReports: string[];
  outDir: string;
  json: boolean;
}

interface Authority {
  readOnly: true;
  localOnly: true;
  researchOnly: true;
  postsDiscord: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  runsSetupScanner: false;
  changesScannerBehavior: false;
  changesTradingLogic: false;
  changesCanExecute: false;
  changesEntryStopTargets: false;
  changesRiskRules: false;
  changesBridgeBehavior: false;
  changesDiscordPosting: false;
  changesAppRuntime: false;
}

interface SourceSelectionRow {
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  openingDriveTicketId: string;
  priorityTicketId: string;
  prioritySetupType: string;
  installedPrimaryTicketId: string | null;
  installedPrimarySetupType: string | null;
  installedSelectedPriority: boolean;
  openingDriveOneMesPl: number | null;
  priorityOneMesPl: number | null;
  deltaOneMesPl: number | null;
  canExecuteTrueRows: number;
  approvalBoundaryClean: boolean;
}

export interface RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_source_installed_selection';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    samebarReports: string[];
  };
  summary: {
    comparableEvents: number;
    installedPrioritySelectedRows: number;
    installedOpeningDriveSelectedRows: number;
    canExecuteTrueRows: number;
    approvalBoundaryDriftRows: number;
    priorityLosses: number;
    openingDriveLosses: number;
    openingDriveOneMesPl: number | null;
    priorityOneMesPl: number | null;
    deltaOneMesPl: number | null;
    recommendation: 'source_artifacts_match_installed_priority_overlay' | 'keep_researching_source_artifacts' | 'fix_inputs';
    livePromotionAllowedRows: 0;
  };
  rows: SourceSelectionRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const PRIORITY_SET = new Set(['SweepMssFvgRetrace', 'IntradayMssMicroContinuation']);

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function samebarReportsFromLatestOosPackage(outDir: string): string[] {
  const latest = latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-oos-replay-collision-package-\d+\.json$/);
  if (!latest) return [];
  return readJson<RawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport>(latest).source?.samebarReports || [];
}

export function parseRawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const samebarReports = splitPaths(readFlag(args, '--samebar-reports'));
  return {
    samebarReports: samebarReports.length ? samebarReports : samebarReportsFromLatestOosPackage(outDir),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): Authority {
  return {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    changesDiscordPosting: false,
    changesAppRuntime: false,
  };
}

function setupTypeFrom(value: string): SetupType {
  return (Object.values(SetupType) as string[]).includes(value) ? value as SetupType : SetupType.NoSetup;
}

function sameEventKey(row: Pick<RawOhlcScannerArtifactSameBarSeparatorRow, 'tradeDate' | 'session' | 'proofTime' | 'direction'>): string {
  return `${row.tradeDate}|${row.session}|${row.proofTime}|${row.direction}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function isLoss(row: Pick<RawOhlcScannerArtifactSameBarSeparatorRow, 'outcomeStatus' | 'outcomeLabel'>): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function bestByPl(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): RawOhlcScannerArtifactSameBarSeparatorRow | null {
  return rows
    .filter((row) => typeof row.resolvedOneMesPl === 'number' && Number.isFinite(row.resolvedOneMesPl))
    .sort((a, b) => (b.resolvedOneMesPl as number) - (a.resolvedOneMesPl as number))[0] || null;
}

function candidateFrom(row: RawOhlcScannerArtifactSameBarSeparatorRow, score: number): SetupCandidate {
  const direction = row.direction === 'SHORT' ? 'SHORT' : 'LONG';
  return {
    setupType: setupTypeFrom(row.setupType),
    scenarioLabel: row.ticketId,
    direction,
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'High',
    priority: score,
    entry: 100,
    stop: direction === 'LONG' ? 96 : 104,
    target1: direction === 'LONG' ? 106 : 94,
    target2: direction === 'LONG' ? 108 : 92,
    riskPoints: row.riskPoints > 0 ? row.riskPoints : 4,
    modelConfidenceScore: score,
    decisionQualityScore: score,
    evidence: [`Completed 5M proof reference ${row.proofTime}.`],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: NoTradeReason.EntryTriggerPending,
    requiredTrigger: 'Completed 5M retest/re-entry proof confirmed.',
    nextAction: 'Read-only source artifact installed-selection comparison.',
    reducedRiskPlan: null,
  };
}

function sessionType(session: string): 'replay_morning' | 'replay_lunch' | 'replay_evening' {
  if (session === 'lunch') return 'replay_lunch';
  if (session === 'evening') return 'replay_evening';
  return 'replay_morning';
}

function ticketFromCandidateKey(candidateKey: string | undefined | null): string | null {
  return candidateKey?.split('|')[1] || null;
}

function buildRows(reports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[]): SourceSelectionRow[] {
  const grouped = new Map<string, RawOhlcScannerArtifactSameBarSeparatorRow[]>();
  for (const row of reports.flatMap((report) => report.rows || [])) {
    grouped.set(sameEventKey(row), [...(grouped.get(sameEventKey(row)) || []), row]);
  }
  return [...grouped.values()].flatMap((rows) => {
    const openingDrive = bestByPl(rows.filter((row) => row.setupType === 'OpeningDriveFvgContinuation'));
    const priority = bestByPl(rows.filter((row) => PRIORITY_SET.has(row.setupType)));
    if (!openingDrive || !priority) return [];
    const book = buildUnifiedDeskCandidateBook({
      sessionType: sessionType(openingDrive.session),
      completedBarTime: openingDrive.proofTime,
      candidates: [candidateFrom(openingDrive, 95), candidateFrom(priority, 88)],
    });
    const primary = book.primaryDeskIdea;
    const delta = typeof priority.resolvedOneMesPl === 'number' && typeof openingDrive.resolvedOneMesPl === 'number'
      ? round(priority.resolvedOneMesPl - openingDrive.resolvedOneMesPl)
      : null;
    return [{
      tradeDate: openingDrive.tradeDate,
      session: openingDrive.session,
      proofTime: openingDrive.proofTime,
      direction: openingDrive.direction,
      openingDriveTicketId: openingDrive.ticketId,
      priorityTicketId: priority.ticketId,
      prioritySetupType: priority.setupType,
      installedPrimaryTicketId: ticketFromCandidateKey(primary?.candidateKey),
      installedPrimarySetupType: primary?.setupType || null,
      installedSelectedPriority: primary?.candidateKey.includes(priority.ticketId) || false,
      openingDriveOneMesPl: openingDrive.resolvedOneMesPl,
      priorityOneMesPl: priority.resolvedOneMesPl,
      deltaOneMesPl: delta,
      canExecuteTrueRows: book.candidates.filter((item) => item.canExecute).length,
      approvalBoundaryClean: !book.approvalBoundary.changesCanExecute &&
        !book.approvalBoundary.changesEntryStopTargets &&
        !book.approvalBoundary.changesRiskRules &&
        !book.approvalBoundary.postsDiscord &&
        !book.approvalBoundary.writesSupabase,
    }];
  }).sort((a, b) => `${a.tradeDate}-${a.session}-${a.proofTime}-${a.direction}`.localeCompare(`${b.tradeDate}-${b.session}-${b.proofTime}-${b.direction}`));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport, 'markdown'>): string {
  return [
    '# OpeningDrive OOS Source Installed Selection',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only source-artifact installed selection comparison. It consumes saved same-bar reports and calls the installed candidate-book ranking path only. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Comparable events: ${report.summary.comparableEvents}.`,
    `- Installed priority / OpeningDrive selected rows: ${report.summary.installedPrioritySelectedRows}/${report.summary.installedOpeningDriveSelectedRows}.`,
    `- canExecute=true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Approval boundary drift rows: ${report.summary.approvalBoundaryDriftRows}.`,
    `- Priority/OpenDrive losses: ${report.summary.priorityLosses}/${report.summary.openingDriveLosses}.`,
    `- One-MES P/L OpeningDrive / priority / delta: ${report.summary.openingDriveOneMesPl ?? '-'}/${report.summary.priorityOneMesPl ?? '-'}/${report.summary.deltaOneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport(args: {
  samebarReports: string[];
  reports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport {
  const rows = buildRows(args.reports);
  const installedPrioritySelectedRows = rows.filter((row) => row.installedSelectedPriority).length;
  const installedOpeningDriveSelectedRows = rows.length - installedPrioritySelectedRows;
  const canExecuteTrueRows = rows.reduce((total, row) => total + row.canExecuteTrueRows, 0);
  const approvalBoundaryDriftRows = rows.filter((row) => !row.approvalBoundaryClean).length;
  const blockers = [
    args.samebarReports.length === 0 ? 'no same-bar reports supplied' : null,
    args.reports.some((report) => report.status !== 'pass') ? 'one or more same-bar reports did not pass' : null,
    rows.length === 0 ? 'no comparable source-artifact events found' : null,
    installedOpeningDriveSelectedRows !== 0 ? `${installedOpeningDriveSelectedRows} rows still select OpeningDrive` : null,
    canExecuteTrueRows !== 0 ? `${canExecuteTrueRows} canExecute=true rows found` : null,
    approvalBoundaryDriftRows !== 0 ? `${approvalBoundaryDriftRows} approval-boundary drift rows found` : null,
  ].filter((item): item is string => Boolean(item));
  const priorityLosses = rows.filter((row) => {
    const sourceRow = args.reports.flatMap((report) => report.rows || []).find((item) => item.ticketId === row.priorityTicketId);
    return sourceRow ? isLoss(sourceRow) : false;
  }).length;
  const openingDriveLosses = rows.filter((row) => {
    const sourceRow = args.reports.flatMap((report) => report.rows || []).find((item) => item.ticketId === row.openingDriveTicketId);
    return sourceRow ? isLoss(sourceRow) : false;
  }).length;
  const recommendation = blockers.length
    ? 'fix_inputs'
    : priorityLosses === 0
      ? 'source_artifacts_match_installed_priority_overlay'
      : 'keep_researching_source_artifacts';
  const openingDriveOneMesPl = sum(rows.map((row) => row.openingDriveOneMesPl));
  const priorityOneMesPl = sum(rows.map((row) => row.priorityOneMesPl));
  const base: Omit<RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_source_installed_selection',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { samebarReports: args.samebarReports },
    summary: {
      comparableEvents: rows.length,
      installedPrioritySelectedRows,
      installedOpeningDriveSelectedRows,
      canExecuteTrueRows,
      approvalBoundaryDriftRows,
      priorityLosses,
      openingDriveLosses,
      openingDriveOneMesPl,
      priorityOneMesPl,
      deltaOneMesPl: typeof priorityOneMesPl === 'number' && typeof openingDriveOneMesPl === 'number'
        ? round(priorityOneMesPl - openingDriveOneMesPl)
        : null,
      recommendation,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: recommendation === 'source_artifacts_match_installed_priority_overlay'
      ? [
        'Saved source artifacts match the installed same-event Sweep/HTF priority overlay.',
        'Next phase should monitor fresh replay/live-observation artifacts before broadening to other model families.',
      ]
      : ['Do not broaden the overlay until source-artifact blockers are resolved.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionArgs();
  const report = buildRawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport({
    samebarReports: options.samebarReports,
    reports: options.samebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
