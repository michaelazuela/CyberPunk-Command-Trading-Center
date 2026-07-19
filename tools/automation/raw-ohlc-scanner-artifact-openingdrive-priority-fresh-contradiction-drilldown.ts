import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

interface CliOptions {
  sourceSelectionReport: string | null;
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

interface ContradictionSide {
  ticketId: string;
  setupType: string;
  outcomeLabel: RawOhlcScannerArtifactSameBarSeparatorRow['outcomeLabel'];
  outcomeStatus: RawOhlcScannerArtifactSameBarSeparatorRow['outcomeStatus'];
  resolvedOneMesPl: number | null;
  riskPoints: number;
  proofTime: string;
  entryHitTime: string | null;
  firstReplayBarTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  mfeR: number | null;
  maeR: number | null;
  separatorTags: string[];
}

interface ContradictionRow {
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  installedPrimaryTicketId: string | null;
  installedPrimarySetupType: string | null;
  openingDrive: ContradictionSide;
  priority: ContradictionSide;
  riskDeltaPoints: number;
  riskRatio: number | null;
  priorityWorseByOneMesPl: number;
  rootCauseTags: string[];
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_contradiction_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    sourceSelectionReport: string | null;
    samebarReports: string[];
  };
  summary: {
    sourceRows: number;
    contradictionRows: number;
    bothStoppedBeforeT1Rows: number;
    priorityWiderRiskRows: number;
    openingDriveIntrabarAmbiguityRows: number;
    priorityLaterT1Rows: number;
    priorityLaterT2Rows: number;
    canExecuteTrueRows: number;
    approvalBoundaryDriftRows: number;
    totalPriorityWorseByOneMesPl: number | null;
    recommendation: 'research_priority_risk_cap_before_broadening' | 'continue_observation' | 'fix_inputs';
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
  };
  rows: ContradictionRow[];
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

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownArgs(
  args = process.argv.slice(2),
): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sourceSelectionReport = readFlag(args, '--source-selection-report') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection-\d+\.json$/);
  const source = sourceSelectionReport && fs.existsSync(sourceSelectionReport)
    ? readJson<RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport>(sourceSelectionReport)
    : null;
  const explicitSamebarReports = splitPaths(readFlag(args, '--samebar-reports'));
  return {
    sourceSelectionReport,
    samebarReports: explicitSamebarReports.length ? explicitSamebarReports : source?.source.samebarReports || [],
    outDir,
    json: args.includes('--json'),
  };
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function timeMs(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowKey(row: Pick<RawOhlcScannerArtifactSameBarSeparatorRow, 'ticketId'>): string {
  return row.ticketId;
}

function sideFrom(row: RawOhlcScannerArtifactSameBarSeparatorRow): ContradictionSide {
  return {
    ticketId: row.ticketId,
    setupType: row.setupType,
    outcomeLabel: row.outcomeLabel,
    outcomeStatus: row.outcomeStatus,
    resolvedOneMesPl: row.resolvedOneMesPl,
    riskPoints: row.riskPoints,
    proofTime: row.proofTime,
    entryHitTime: row.entryHitTime,
    firstReplayBarTime: row.firstReplayBarTime,
    stopHitTime: row.stopHitTime,
    t1HitTime: row.t1HitTime,
    t2HitTime: row.t2HitTime,
    mfeR: row.mfeR,
    maeR: row.maeR,
    separatorTags: row.separatorTags,
  };
}

function rootCauseTags(openingDrive: RawOhlcScannerArtifactSameBarSeparatorRow, priority: RawOhlcScannerArtifactSameBarSeparatorRow): string[] {
  const priorityT1 = timeMs(priority.t1HitTime);
  const openingDriveT1 = timeMs(openingDrive.t1HitTime);
  const priorityT2 = timeMs(priority.t2HitTime);
  const openingDriveT2 = timeMs(openingDrive.t2HitTime);
  return [
    openingDrive.outcomeLabel === 'stopped_before_t1' && priority.outcomeLabel === 'stopped_before_t1' ? 'both_stopped_before_t1' : null,
    priority.riskPoints > openingDrive.riskPoints ? 'priority_wider_risk' : null,
    openingDrive.separatorTags.includes('intrabar_ambiguity') ? 'openingdrive_intrabar_ambiguity' : null,
    priorityT1 !== null && openingDriveT1 !== null && priorityT1 > openingDriveT1 ? 'priority_later_t1' : null,
    priorityT2 !== null && openingDriveT2 !== null && priorityT2 > openingDriveT2 ? 'priority_later_t2' : null,
    'same_event_priority_underperformed',
  ].filter((tag): tag is string => Boolean(tag));
}

function buildRows(
  sourceReport: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport | null,
  samebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[],
): ContradictionRow[] {
  if (!sourceReport) return [];
  const samebarRowsByTicket = new Map(
    samebarReports.flatMap((report) => report.rows || []).map((row) => [rowKey(row), row]),
  );
  return sourceReport.rows.flatMap((sourceRow) => {
    if (!sourceRow.installedSelectedPriority || typeof sourceRow.deltaOneMesPl !== 'number' || sourceRow.deltaOneMesPl >= 0) return [];
    const openingDrive = samebarRowsByTicket.get(sourceRow.openingDriveTicketId);
    const priority = samebarRowsByTicket.get(sourceRow.priorityTicketId);
    if (!openingDrive || !priority) return [];
    const riskRatio = openingDrive.riskPoints > 0 ? round(priority.riskPoints / openingDrive.riskPoints) : null;
    return [{
      tradeDate: sourceRow.tradeDate,
      session: sourceRow.session,
      proofTime: sourceRow.proofTime,
      direction: sourceRow.direction,
      installedPrimaryTicketId: sourceRow.installedPrimaryTicketId,
      installedPrimarySetupType: sourceRow.installedPrimarySetupType,
      openingDrive: sideFrom(openingDrive),
      priority: sideFrom(priority),
      riskDeltaPoints: round(priority.riskPoints - openingDrive.riskPoints),
      riskRatio,
      priorityWorseByOneMesPl: round(Math.abs(sourceRow.deltaOneMesPl)),
      rootCauseTags: rootCauseTags(openingDrive, priority),
    }];
  });
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Fresh Contradiction Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only contradiction drilldown. It consumes saved source-selection and same-bar diagnostic reports only. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Contradiction rows: ${report.summary.contradictionRows}.`,
    `- Both stopped before T1: ${report.summary.bothStoppedBeforeT1Rows}.`,
    `- Priority wider risk rows: ${report.summary.priorityWiderRiskRows}.`,
    `- OpeningDrive intrabar ambiguity rows: ${report.summary.openingDriveIntrabarAmbiguityRows}.`,
    `- Priority later T1/T2 rows: ${report.summary.priorityLaterT1Rows}/${report.summary.priorityLaterT2Rows}.`,
    `- canExecute=true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Approval boundary drift rows: ${report.summary.approvalBoundaryDriftRows}.`,
    `- Total priority underperformance one-MES P/L: ${report.summary.totalPriorityWorseByOneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    ...(report.rows.length ? report.rows.map((row) => [
      `- ${row.tradeDate} ${row.session} ${row.direction} ${row.proofTime}: ${row.priority.setupType} underperformed ${row.openingDrive.setupType} by ${row.priorityWorseByOneMesPl} one-MES; risk ${row.priority.riskPoints} vs ${row.openingDrive.riskPoints}; tags ${row.rootCauseTags.join(', ')}.`,
    ].join('\n')) : ['- None.']),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownReport(args: {
  sourceSelectionReportPath: string | null;
  sourceSelectionReport: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport | null;
  samebarReports: string[];
  reports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownReport {
  const rows = buildRows(args.sourceSelectionReport, args.reports);
  const canExecuteTrueRows = args.sourceSelectionReport?.rows.reduce((total, row) => total + row.canExecuteTrueRows, 0) || 0;
  const approvalBoundaryDriftRows = args.sourceSelectionReport?.rows.filter((row) => !row.approvalBoundaryClean).length || 0;
  const blockers = [
    !args.sourceSelectionReport ? 'missing source-selection report' : null,
    args.samebarReports.length === 0 ? 'no same-bar reports supplied' : null,
    args.reports.some((report) => report.status !== 'pass') ? 'one or more same-bar reports did not pass' : null,
    args.sourceSelectionReport && args.sourceSelectionReport.status !== 'pass' ? 'source-selection report did not pass' : null,
    canExecuteTrueRows !== 0 ? `${canExecuteTrueRows} canExecute=true rows found` : null,
    approvalBoundaryDriftRows !== 0 ? `${approvalBoundaryDriftRows} approval-boundary drift rows found` : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'fix_inputs'
    : rows.length > 0
      ? 'research_priority_risk_cap_before_broadening'
      : 'continue_observation';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_contradiction_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      sourceSelectionReport: args.sourceSelectionReportPath,
      samebarReports: args.samebarReports,
    },
    summary: {
      sourceRows: args.sourceSelectionReport?.rows.length || 0,
      contradictionRows: rows.length,
      bothStoppedBeforeT1Rows: rows.filter((row) => row.rootCauseTags.includes('both_stopped_before_t1')).length,
      priorityWiderRiskRows: rows.filter((row) => row.rootCauseTags.includes('priority_wider_risk')).length,
      openingDriveIntrabarAmbiguityRows: rows.filter((row) => row.rootCauseTags.includes('openingdrive_intrabar_ambiguity')).length,
      priorityLaterT1Rows: rows.filter((row) => row.rootCauseTags.includes('priority_later_t1')).length,
      priorityLaterT2Rows: rows.filter((row) => row.rootCauseTags.includes('priority_later_t2')).length,
      canExecuteTrueRows,
      approvalBoundaryDriftRows,
      totalPriorityWorseByOneMesPl: sum(rows.map((row) => row.priorityWorseByOneMesPl)),
      recommendation,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
    },
    rows,
    blockers,
    recommendations: recommendation === 'research_priority_risk_cap_before_broadening'
      ? [
        'Do not broaden the same-event priority overlay from this fresh observation set.',
        'Next research pass should validate a priority risk cap or risk-ratio guard before any scanner-visible ranking change.',
      ]
      : recommendation === 'continue_observation'
        ? ['No fresh priority underperformance contradictions found; continue collecting fresh same-event observations.']
        : ['Resolve source report inputs before interpreting the contradiction drilldown.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-fresh-contradiction-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownArgs();
  const sourceSelectionReport = options.sourceSelectionReport && fs.existsSync(options.sourceSelectionReport)
    ? readJson<RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport>(options.sourceSelectionReport)
    : null;
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownReport({
    sourceSelectionReportPath: options.sourceSelectionReport,
    sourceSelectionReport,
    samebarReports: options.samebarReports,
    reports: options.samebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
