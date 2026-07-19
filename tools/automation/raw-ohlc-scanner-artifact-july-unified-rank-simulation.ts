import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';
import type {
  RawOhlcScannerArtifactJulyUnifiedSeparatorReport,
} from './raw-ohlc-scanner-artifact-july-unified-separator';

interface CliOptions {
  separatorReport: string | null;
  samebarReports: string[];
  outDir: string;
  json: boolean;
}

interface BucketSummary {
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
}

interface SimulatedRow {
  rankScore: number;
  ticketId: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  setupType: string;
  direction: string;
  riskPoints: number;
  outcomeLabel: RawOhlcScannerArtifactSameBarSeparatorRow['outcomeLabel'];
  outcomeStatus: RawOhlcScannerArtifactSameBarSeparatorRow['outcomeStatus'];
  oneMesPl: number | null;
  positiveMatches: string[];
  cautionMatches: string[];
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

export interface RawOhlcScannerArtifactJulyUnifiedRankSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_july_unified_rank_simulation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    separatorReport: string | null;
    samebarReports: string[];
  };
  assumptions: {
    consumesExistingSameBarAndSeparatorReportsOnly: true;
    selectsAtMostOneRowPerProofEvent: true;
    separatorFieldsArePreEntryOrModelMetadata: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    proofEvents: number;
    selectedRows: number;
    rejectedRows: number;
    selectedSummary: BucketSummary;
    rejectedSummary: BucketSummary;
    positiveBucketsUsed: number;
    cautionBucketsUsed: number;
    livePromotionAllowedRows: 0;
    recommendation: 'validate_on_fresh_replay' | 'revise_rank_simulation' | 'reject_rank_simulation';
  };
  selectedRows: SimulatedRow[];
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
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

export function parseRawOhlcScannerArtifactJulyUnifiedRankSimulationArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    separatorReport: readFlag(args, '--separator-report') || latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-july-unified-separator-\d+\.json$/),
    samebarReports: splitPaths(readFlag(args, '--samebar-reports')),
    outDir,
    json: args.includes('--json'),
  };
}

function riskBucket(row: RawOhlcScannerArtifactSameBarSeparatorRow): string {
  if (row.riskPoints < 4) return 'risk_lt_4';
  if (row.riskPoints < 8) return 'risk_4_to_8';
  if (row.riskPoints < 16) return 'risk_8_to_16';
  if (row.riskPoints < 24) return 'risk_16_to_24';
  if (row.riskPoints < 32) return 'risk_24_to_32';
  return 'risk_gte_32';
}

function bucketKeys(row: RawOhlcScannerArtifactSameBarSeparatorRow): string[] {
  return [
    `setupType:${row.setupType}`,
    `session_setup:${row.session}|${row.setupType}`,
    `direction_setup:${row.direction}|${row.setupType}`,
    `risk_setup:${riskBucket(row)}|${row.setupType}`,
    `time_setup:${row.timeBucket}|${row.setupType}`,
    `session_direction_setup:${row.session}|${row.direction}|${row.setupType}`,
    `session_risk_setup:${row.session}|${riskBucket(row)}|${row.setupType}`,
  ];
}

function proofEventKey(row: RawOhlcScannerArtifactSameBarSeparatorRow): string {
  return `${row.tradeDate}|${row.session}|${row.proofTime}`;
}

function isWinner(row: Pick<RawOhlcScannerArtifactSameBarSeparatorRow, 'outcomeStatus' | 'outcomeLabel'>): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: Pick<RawOhlcScannerArtifactSameBarSeparatorRow, 'outcomeStatus' | 'outcomeLabel'>): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function summarize(rows: Array<RawOhlcScannerArtifactSameBarSeparatorRow | SimulatedRow>): BucketSummary {
  return {
    rows: rows.length,
    winners: rows.filter(isWinner).length,
    losses: rows.filter(isLoss).length,
    otherResolved: rows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length,
    unresolved: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
    oneMesPl: sum(rows.map((row) => 'resolvedOneMesPl' in row ? row.resolvedOneMesPl : row.oneMesPl)),
    avgRiskPoints: avg(rows.map((row) => row.riskPoints)),
  };
}

function scoreRow(row: RawOhlcScannerArtifactSameBarSeparatorRow, separatorReport: RawOhlcScannerArtifactJulyUnifiedSeparatorReport): SimulatedRow {
  const positive = new Map(separatorReport.topPositiveBuckets.map((bucket) => [`${bucket.kind}:${bucket.key}`, bucket]));
  const caution = new Map(separatorReport.topCautionBuckets.map((bucket) => [`${bucket.kind}:${bucket.key}`, bucket]));
  const keys = bucketKeys(row);
  const positiveMatches = keys.filter((key) => positive.has(key));
  const cautionMatches = keys.filter((key) => caution.has(key));
  const positiveScore = positiveMatches.reduce((total, key) => total + Math.max(0, positive.get(key)?.score || 0), 0);
  const cautionPenalty = cautionMatches.reduce((total, key) => total + Math.abs(Math.min(0, caution.get(key)?.score || 0)), 0);
  const riskQuality = row.riskPoints < 4 ? 3 : row.riskPoints <= 8 ? 2 : row.riskPoints <= 16 ? 0 : -2;
  return {
    rankScore: round(positiveScore - cautionPenalty + riskQuality),
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    proofTime: row.proofTime,
    setupType: row.setupType,
    direction: row.direction,
    riskPoints: row.riskPoints,
    outcomeLabel: row.outcomeLabel,
    outcomeStatus: row.outcomeStatus,
    oneMesPl: row.resolvedOneMesPl,
    positiveMatches,
    cautionMatches,
  };
}

function selectRows(rows: RawOhlcScannerArtifactSameBarSeparatorRow[], separatorReport: RawOhlcScannerArtifactJulyUnifiedSeparatorReport): SimulatedRow[] {
  const groups = new Map<string, RawOhlcScannerArtifactSameBarSeparatorRow[]>();
  for (const row of rows) groups.set(proofEventKey(row), [...(groups.get(proofEventKey(row)) || []), row]);
  const selected: SimulatedRow[] = [];
  for (const groupRows of groups.values()) {
    const scored = groupRows
      .map((row) => scoreRow(row, separatorReport))
      .filter((row) => row.rankScore > 0 && row.positiveMatches.length > 0)
      .sort((a, b) => b.rankScore - a.rankScore || a.riskPoints - b.riskPoints || a.ticketId.localeCompare(b.ticketId));
    if (scored[0]) selected.push(scored[0]);
  }
  return selected.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.proofTime.localeCompare(b.proofTime) || b.rankScore - a.rankScore);
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactJulyUnifiedRankSimulationReport, 'markdown'>): string {
  return [
    '# July Raw-OHLC Unified Rank Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only rank simulation. It does not install a live rank, change canExecute, post Discord, write Supabase, read bridge data, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows/proof events: ${report.summary.sourceRows}/${report.summary.proofEvents}.`,
    `- Selected/rejected rows: ${report.summary.selectedRows}/${report.summary.rejectedRows}.`,
    `- Selected W/L/O/U: ${report.summary.selectedSummary.winners}/${report.summary.selectedSummary.losses}/${report.summary.selectedSummary.otherResolved}/${report.summary.selectedSummary.unresolved}.`,
    `- Selected one-MES P/L: ${report.summary.selectedSummary.oneMesPl ?? 'not available'}.`,
    `- Rejected W/L/O/U: ${report.summary.rejectedSummary.winners}/${report.summary.rejectedSummary.losses}/${report.summary.rejectedSummary.otherResolved}/${report.summary.rejectedSummary.unresolved}.`,
    `- Rejected one-MES P/L: ${report.summary.rejectedSummary.oneMesPl ?? 'not available'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Selected Rows',
    '| Score | Ticket | Date | Time | Session | Model | Side | Risk | Outcome | P/L | Positive | Caution |',
    '|---:|---|---|---|---|---|---|---:|---|---:|---|---|',
    ...report.selectedRows.slice(0, 80).map((row) => `| ${row.rankScore} | ${escapeTable(row.ticketId)} | ${row.tradeDate} | ${row.proofTime} | ${row.session} | ${row.setupType} | ${row.direction} | ${row.riskPoints} | ${row.outcomeLabel} | ${row.oneMesPl ?? '-'} | ${escapeTable(row.positiveMatches.join('; '))} | ${escapeTable(row.cautionMatches.join('; '))} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactJulyUnifiedRankSimulationReport(args: {
  reportDir: string;
  separatorReportPath: string | null;
  separatorReport: RawOhlcScannerArtifactJulyUnifiedSeparatorReport | null;
  samebarReportPaths: string[];
  samebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactJulyUnifiedRankSimulationReport {
  const rows = args.samebarReports.flatMap((report) => report.rows || []);
  const selectedRows = args.separatorReport ? selectRows(rows, args.separatorReport) : [];
  const selectedIds = new Set(selectedRows.map((row) => row.ticketId));
  const rejectedRows = rows.filter((row) => !selectedIds.has(row.ticketId));
  const selectedSummary = summarize(selectedRows);
  const rejectedSummary = summarize(rejectedRows);
  const blockers = [
    !args.separatorReportPath ? 'missing unified separator report path' : null,
    !args.separatorReport ? 'missing unified separator report' : null,
    args.separatorReport && args.separatorReport.status !== 'pass' ? `unified separator report status ${args.separatorReport.status}` : null,
    args.samebarReports.length === 0 ? 'missing same-bar reports' : null,
    rows.length === 0 ? 'no same-bar rows found' : null,
    ...args.samebarReports.map((report, index) => report.status !== 'pass' ? `same-bar report ${args.samebarReportPaths[index]} status ${report.status}` : null),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactJulyUnifiedRankSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_july_unified_rank_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      separatorReport: args.separatorReportPath,
      samebarReports: args.samebarReportPaths,
    },
    assumptions: {
      consumesExistingSameBarAndSeparatorReportsOnly: true,
      selectsAtMostOneRowPerProofEvent: true,
      separatorFieldsArePreEntryOrModelMetadata: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: rows.length,
      proofEvents: new Set(rows.map(proofEventKey)).size,
      selectedRows: selectedRows.length,
      rejectedRows: rejectedRows.length,
      selectedSummary,
      rejectedSummary,
      positiveBucketsUsed: new Set(selectedRows.flatMap((row) => row.positiveMatches)).size,
      cautionBucketsUsed: new Set(selectedRows.flatMap((row) => row.cautionMatches)).size,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'reject_rank_simulation'
        : selectedSummary.losses === 0 && selectedSummary.winners >= 5
          ? 'validate_on_fresh_replay'
          : 'revise_rank_simulation',
    },
    selectedRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix the separator and same-bar report inputs before using this rank simulation.']
      : [
        selectedSummary.losses === 0
          ? 'Rank simulation selected no stopped-before-T1 losses in this sample; validate on a fresh replay before any scanner-visible proposal.'
          : 'Rank simulation is still loss-bearing; revise bucket weights/filters before any scanner-visible proposal.',
        'Keep this research-only: no Discord, Supabase, NinjaTrader bridge, canExecute, entry, stop, target, risk, or live scanner ranking change is approved.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactJulyUnifiedRankSimulationReport(
  report: RawOhlcScannerArtifactJulyUnifiedRankSimulationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-july-unified-rank-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactJulyUnifiedRankSimulationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactJulyUnifiedRankSimulationArgs(args);
  const report = buildRawOhlcScannerArtifactJulyUnifiedRankSimulationReport({
    reportDir: options.outDir,
    separatorReportPath: options.separatorReport,
    separatorReport: options.separatorReport && fs.existsSync(options.separatorReport)
      ? readJson<RawOhlcScannerArtifactJulyUnifiedSeparatorReport>(options.separatorReport)
      : null,
    samebarReportPaths: options.samebarReports,
    samebarReports: options.samebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
  });
  const paths = writeRawOhlcScannerArtifactJulyUnifiedRankSimulationReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, selectedRows: report.selectedRows.slice(0, 20), blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactJulyUnifiedRankSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
