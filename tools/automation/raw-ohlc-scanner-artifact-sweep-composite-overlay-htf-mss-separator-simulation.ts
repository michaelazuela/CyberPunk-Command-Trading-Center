import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-separator-diagnostic';

interface CliOptions {
  separatorDiagnostic: string;
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

interface SimulatedRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  direction: string;
  riskPoints: number;
  proofTime: string;
  outcomeLabel: RawOhlcScannerArtifactSameBarSeparatorRow['outcomeLabel'];
  outcomeStatus: RawOhlcScannerArtifactSameBarSeparatorRow['outcomeStatus'];
  oneMesPl: number | null;
  positiveMatches: string[];
  cautionMatches: string[];
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_separator_simulation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    separatorDiagnosticPath: string;
    samebarReports: string[];
  };
  assumptions: {
    savedReportsOnly: true;
    htfMssOnly: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    selectedRows: number;
    rejectedRows: number;
    selectedWinners: number;
    selectedLosses: number;
    selectedUnresolved: number;
    selectedOneMesPl: number | null;
    rejectedWinners: number;
    rejectedLosses: number;
    rejectedUnresolved: number;
    rejectedOneMesPl: number | null;
    selectedPositiveBucketsUsed: number;
    rejectedCautionBucketsUsed: number;
    livePromotionAllowedRows: 0;
    recommendation: 'prepare_research_only_proposal_update' | 'revise_separator' | 'fix_inputs';
  };
  selectedRows: SimulatedRow[];
  rejectedRows: SimulatedRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationArgs(args = process.argv.slice(2)): CliOptions {
  const separatorDiagnostic = readFlag(args, '--separator-diagnostic');
  if (!separatorDiagnostic) throw new Error('--separator-diagnostic is required.');
  return {
    separatorDiagnostic,
    samebarReports: splitPaths(readFlag(args, '--samebar-reports')),
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
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

function isWinner(row: Pick<RawOhlcScannerArtifactSameBarSeparatorRow | SimulatedRow, 'outcomeStatus' | 'outcomeLabel'>): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: Pick<RawOhlcScannerArtifactSameBarSeparatorRow | SimulatedRow, 'outcomeStatus' | 'outcomeLabel'>): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function riskBucket(row: RawOhlcScannerArtifactSameBarSeparatorRow): string {
  if (row.riskPoints < 4) return 'risk_lt_4';
  if (row.riskPoints < 8) return 'risk_4_to_8';
  if (row.riskPoints < 16) return 'risk_8_to_16';
  if (row.riskPoints < 24) return 'risk_16_to_24';
  return 'risk_gte_24';
}

function bucketKeys(row: RawOhlcScannerArtifactSameBarSeparatorRow): string[] {
  return [
    `session:${row.session}`,
    `direction:${row.direction}`,
    `risk:${riskBucket(row)}`,
    `time:${row.timeBucket}`,
    `session_direction:${row.session}|${row.direction}`,
    `session_risk:${row.session}|${riskBucket(row)}`,
    `session_direction_risk:${row.session}|${row.direction}|${riskBucket(row)}`,
    `date_session:${row.tradeDate}|${row.session}`,
  ];
}

function toSimulatedRow(row: RawOhlcScannerArtifactSameBarSeparatorRow, positiveMatches: string[], cautionMatches: string[]): SimulatedRow {
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    direction: row.direction,
    riskPoints: row.riskPoints,
    proofTime: row.proofTime,
    outcomeLabel: row.outcomeLabel,
    outcomeStatus: row.outcomeStatus,
    oneMesPl: row.resolvedOneMesPl,
    positiveMatches,
    cautionMatches,
  };
}

function simulateRows(
  rows: RawOhlcScannerArtifactSameBarSeparatorRow[],
  diagnostic: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticReport,
): { selectedRows: SimulatedRow[]; rejectedRows: SimulatedRow[] } {
  const positives = new Set(diagnostic.topPositiveBuckets.map((bucket) => `${bucket.kind}:${bucket.key}`));
  const cautions = new Set(diagnostic.topCautionBuckets.map((bucket) => `${bucket.kind}:${bucket.key}`));
  const selectedRows: SimulatedRow[] = [];
  const rejectedRows: SimulatedRow[] = [];
  for (const row of rows) {
    const keys = bucketKeys(row);
    const positiveMatches = keys.filter((key) => positives.has(key));
    const cautionMatches = keys.filter((key) => cautions.has(key));
    const simulated = toSimulatedRow(row, positiveMatches, cautionMatches);
    if (positiveMatches.length > 0 && cautionMatches.length === 0) selectedRows.push(simulated);
    else rejectedRows.push(simulated);
  }
  return {
    selectedRows: selectedRows.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.proofTime.localeCompare(b.proofTime) || a.ticketId.localeCompare(b.ticketId)),
    rejectedRows: rejectedRows.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.proofTime.localeCompare(b.proofTime) || a.ticketId.localeCompare(b.ticketId)),
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport, 'markdown'>): string {
  return [
    '# HTF MSS Separator Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only promotion-disabled simulation. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source/selected/rejected rows: ${report.summary.sourceRows}/${report.summary.selectedRows}/${report.summary.rejectedRows}.`,
    `- Selected W/L/U: ${report.summary.selectedWinners}/${report.summary.selectedLosses}/${report.summary.selectedUnresolved}.`,
    `- Selected one-MES P/L: ${report.summary.selectedOneMesPl ?? '-'}.`,
    `- Rejected W/L/U: ${report.summary.rejectedWinners}/${report.summary.rejectedLosses}/${report.summary.rejectedUnresolved}.`,
    `- Rejected one-MES P/L: ${report.summary.rejectedOneMesPl ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport(args: {
  reportDir: string;
  separatorDiagnosticPath: string;
  separatorDiagnostic: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticReport | null;
  samebarReportPaths: string[];
  samebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport {
  const rows = args.samebarReports
    .flatMap((report) => report.rows || [])
    .filter((row) => row.setupType === 'HtfDisplacementMssContinuation');
  const simulated = args.separatorDiagnostic ? simulateRows(rows, args.separatorDiagnostic) : { selectedRows: [], rejectedRows: [] };
  const blockers = [
    !args.separatorDiagnostic ? 'missing HTF-MSS separator diagnostic report' : null,
    args.separatorDiagnostic && args.separatorDiagnostic.status !== 'pass' ? `HTF-MSS separator diagnostic status ${args.separatorDiagnostic.status}` : null,
    args.separatorDiagnostic && args.separatorDiagnostic.summary.recommendation !== 'build_promotion_disabled_separator_simulation'
      ? `HTF-MSS separator diagnostic recommendation ${args.separatorDiagnostic.summary.recommendation}`
      : null,
    args.samebarReports.length === 0 ? 'missing same-bar reports' : null,
    rows.length === 0 ? 'no HTF-MSS rows found' : null,
    ...args.samebarReports.map((report, index) => report.status !== 'pass' ? `same-bar report ${args.samebarReportPaths[index]} status ${report.status}` : null),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_separator_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      separatorDiagnosticPath: args.separatorDiagnosticPath,
      samebarReports: args.samebarReportPaths,
    },
    assumptions: {
      savedReportsOnly: true,
      htfMssOnly: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: rows.length,
      selectedRows: simulated.selectedRows.length,
      rejectedRows: simulated.rejectedRows.length,
      selectedWinners: simulated.selectedRows.filter(isWinner).length,
      selectedLosses: simulated.selectedRows.filter(isLoss).length,
      selectedUnresolved: simulated.selectedRows.filter((row) => row.outcomeStatus !== 'resolved').length,
      selectedOneMesPl: sum(simulated.selectedRows.map((row) => row.oneMesPl)),
      rejectedWinners: simulated.rejectedRows.filter(isWinner).length,
      rejectedLosses: simulated.rejectedRows.filter(isLoss).length,
      rejectedUnresolved: simulated.rejectedRows.filter((row) => row.outcomeStatus !== 'resolved').length,
      rejectedOneMesPl: sum(simulated.rejectedRows.map((row) => row.oneMesPl)),
      selectedPositiveBucketsUsed: new Set(simulated.selectedRows.flatMap((row) => row.positiveMatches)).size,
      rejectedCautionBucketsUsed: new Set(simulated.rejectedRows.flatMap((row) => row.cautionMatches)).size,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : simulated.selectedRows.filter(isLoss).length === 0 && simulated.selectedRows.filter(isWinner).length > 0
          ? 'prepare_research_only_proposal_update'
          : 'revise_separator',
    },
    selectedRows: simulated.selectedRows,
    rejectedRows: simulated.rejectedRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix the saved diagnostic/same-bar inputs before using this simulation.']
      : [
        simulated.selectedRows.filter(isLoss).length === 0
          ? 'Selected HTF-MSS rows have no stopped-before-T1 losses in this saved simulation; still keep promotion disabled until explicit approval.'
          : 'Selected HTF-MSS rows are still loss-bearing; revise separator buckets before any proposal update.',
        'Do not change Discord, Supabase, NinjaTrader bridge, canExecute, scanner runtime, entry, stop, target, risk, or live ranking from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-separator-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport({
    reportDir: options.outDir,
    separatorDiagnosticPath: options.separatorDiagnostic,
    separatorDiagnostic: fs.existsSync(options.separatorDiagnostic) ? readJson(options.separatorDiagnostic) : null,
    samebarReportPaths: options.samebarReports,
    samebarReports: options.samebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
