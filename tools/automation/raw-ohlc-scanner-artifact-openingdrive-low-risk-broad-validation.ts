import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

interface CliOptions {
  reportDir: string;
  setupType: string;
  recursive: boolean;
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

interface SourceReportSummary {
  filePath: string;
  status: string;
  rows: number;
  openingDriveRows: number;
  lowRiskRows: number;
}

interface LaneSummary {
  lane: 'all_openingdrive' | 'low_risk_lt_4' | 'tight_long_risk_4_to_8' | 'fine_risk_24_to_32';
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
}

export interface RawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_broad_validation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    setupType: string;
    recursive: boolean;
    samebarReportPaths: string[];
  };
  assumptions: {
    savedReportsOnly: true;
    recursiveReadOnlyValidation: true;
    dedupesByTicketId: true;
    outcomeFieldsAreEvaluationOnly: true;
    scannerVisibleInstallAllowedNow: false;
    livePromotionAllowed: false;
  };
  summary: {
    sourceReports: number;
    sourceRows: number;
    dedupedOpeningDriveRows: number;
    lowRiskRows: number;
    lowRiskLosses: number;
    lowRiskOneMesPl: number | null;
    lowRiskSampleReady: boolean;
    livePromotionAllowedRows: 0;
    recommendation: 'prepare_research_only_proposal_update' | 'broaden_more' | 'fix_inputs';
  };
  laneSummaries: LaneSummary[];
  sourceReportSummaries: SourceReportSummary[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SETUP_TYPE = 'NoInstalledSetup';
const MIN_READY_LOW_RISK_ROWS = 10;

type RowWithSource = RawOhlcScannerArtifactSameBarSeparatorRow & {
  sourceReportPath: string;
  sourceReportMtimeMs: number;
};

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationArgs(args = process.argv.slice(2)): CliOptions {
  const reportDir = readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR;
  return {
    reportDir,
    setupType: readFlag(args, '--setup-type') || DEFAULT_SETUP_TYPE,
    recursive: !args.includes('--no-recursive'),
    outDir: readFlag(args, '--out-dir') || reportDir,
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

function listSamebarReports(reportDir: string, recursive: boolean): string[] {
  if (!fs.existsSync(reportDir)) return [];
  const entries = fs.readdirSync(reportDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /^raw-ohlc-scanner-artifact-samebar-separator-drilldown-\d+\.json$/.test(entry.name))
    .map((entry) => path.join(reportDir, entry.name));
  if (!recursive) return files.sort();
  const childFiles = entries
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => listSamebarReports(path.join(reportDir, entry.name), true));
  return [...files, ...childFiles].sort();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function isWinner(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function sum(rows: RowWithSource[]): number | null {
  const values = rows.map((row) => row.resolvedOneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}

function avg(rows: RowWithSource[]): number | null {
  const values = rows.map((row) => row.riskPoints).filter((value) => Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0) / values.length) : null;
}

function lowRisk(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.riskPoints < 4;
}

function tightLong(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.direction === 'LONG' && row.riskPoints >= 4 && row.riskPoints < 8;
}

function fineRisk(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.riskPoints >= 24 && row.riskPoints < 32;
}

function summarizeLane(lane: LaneSummary['lane'], rows: RowWithSource[]): LaneSummary {
  return {
    lane,
    rows: rows.length,
    winners: rows.filter(isWinner).length,
    losses: rows.filter(isLoss).length,
    otherResolved: rows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length,
    unresolved: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
    oneMesPl: sum(rows),
    avgRiskPoints: avg(rows),
  };
}

function dedupe(rows: RowWithSource[]): RowWithSource[] {
  const byTicket = new Map<string, RowWithSource>();
  for (const row of rows) {
    const existing = byTicket.get(row.ticketId);
    if (!existing || row.sourceReportMtimeMs > existing.sourceReportMtimeMs) byTicket.set(row.ticketId, row);
  }
  return [...byTicket.values()].sort((a, b) => `${a.tradeDate}|${a.proofTime}|${a.ticketId}`.localeCompare(`${b.tradeDate}|${b.proofTime}|${b.ticketId}`));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationReport, 'markdown'>): string {
  return [
    '# OpeningDrive Low-Risk Broad Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only validation. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source reports/source rows/deduped OpeningDrive rows: ${report.summary.sourceReports}/${report.summary.sourceRows}/${report.summary.dedupedOpeningDriveRows}.`,
    `- Low-risk rows/losses/P/L: ${report.summary.lowRiskRows}/${report.summary.lowRiskLosses}/${report.summary.lowRiskOneMesPl ?? '-'}.`,
    `- Low-risk sample ready: ${report.summary.lowRiskSampleReady}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Lanes',
    '| Lane | Rows | W/L/O/U | P/L | Avg Risk |',
    '|---|---:|---|---:|---:|',
    ...report.laneSummaries.map((row) => `| ${row.lane} | ${row.rows} | ${row.winners}/${row.losses}/${row.otherResolved}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationReport(args: {
  reportDir: string;
  setupType: string;
  recursive: boolean;
  reports: Array<{ filePath: string; mtimeMs: number; report: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport }>;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationReport {
  const sourceReportSummaries = args.reports.map((item) => {
    const openingDriveRows = item.report.rows.filter((row) => row.setupType === args.setupType);
    return {
      filePath: item.filePath,
      status: item.report.status,
      rows: item.report.rows.length,
      openingDriveRows: openingDriveRows.length,
      lowRiskRows: openingDriveRows.filter(lowRisk).length,
    };
  });
  const sourceRows = args.reports.flatMap((item) =>
    item.report.rows
      .filter((row) => row.setupType === args.setupType)
      .map((row) => ({ ...row, sourceReportPath: item.filePath, sourceReportMtimeMs: item.mtimeMs })),
  );
  const dedupedRows = dedupe(sourceRows);
  const lowRiskRows = dedupedRows.filter(lowRisk);
  const lowRiskLane = summarizeLane('low_risk_lt_4', lowRiskRows);
  const lowRiskSampleReady = lowRiskLane.rows >= MIN_READY_LOW_RISK_ROWS;
  const blockers = [
    !args.reports.length ? 'no same-bar separator reports found' : null,
    args.reports.some((item) => item.report.status !== 'pass') ? 'one or more source reports did not pass' : null,
    !sourceRows.length ? `no ${args.setupType} rows found` : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_broad_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      setupType: args.setupType,
      recursive: args.recursive,
      samebarReportPaths: args.reports.map((item) => item.filePath),
    },
    assumptions: {
      savedReportsOnly: true,
      recursiveReadOnlyValidation: true,
      dedupesByTicketId: true,
      outcomeFieldsAreEvaluationOnly: true,
      scannerVisibleInstallAllowedNow: false,
      livePromotionAllowed: false,
    },
    summary: {
      sourceReports: args.reports.length,
      sourceRows: sourceRows.length,
      dedupedOpeningDriveRows: dedupedRows.length,
      lowRiskRows: lowRiskLane.rows,
      lowRiskLosses: lowRiskLane.losses,
      lowRiskOneMesPl: lowRiskLane.oneMesPl,
      lowRiskSampleReady,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : lowRiskSampleReady && lowRiskLane.losses === 0 && (lowRiskLane.oneMesPl ?? 0) > 0
          ? 'prepare_research_only_proposal_update'
          : 'broaden_more',
    },
    laneSummaries: [
      summarizeLane('all_openingdrive', dedupedRows),
      lowRiskLane,
      summarizeLane('tight_long_risk_4_to_8', dedupedRows.filter(tightLong)),
      summarizeLane('fine_risk_24_to_32', dedupedRows.filter(fineRisk)),
    ],
    sourceReportSummaries,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved report inputs before using this broad low-risk validation.']
      : [
        lowRiskSampleReady && lowRiskLane.losses === 0
          ? 'Low-risk remains clean across the saved recursive sample; next compare collision priority against combined clean-pocket lineage before any proposal.'
          : 'Low-risk is not yet ready as a proposal input; broaden the sample or mine a stronger separator.',
        'Do not install scanner-visible ranking, Discord, Supabase, bridge, canExecute, entry, stop, target, risk, scanner runtime, or trading-rule changes from this validation.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function loadRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationReports(reportDir: string, recursive: boolean) {
  return listSamebarReports(reportDir, recursive)
    .map((filePath) => ({
      filePath,
      mtimeMs: fs.statSync(filePath).mtimeMs,
      report: readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath),
    }))
    .filter((item) => item.report.status === 'pass');
}

export function writeRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationReport(
  report: RawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-low-risk-broad-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationReport({
    reportDir: options.reportDir,
    setupType: options.setupType,
    recursive: options.recursive,
    reports: loadRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationReports(options.reportDir, options.recursive),
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, laneSummaries: report.laneSummaries, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
