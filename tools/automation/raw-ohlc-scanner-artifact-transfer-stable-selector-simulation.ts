import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';
import type { RawOhlcScannerArtifactTransferStabilityMinerReport } from './raw-ohlc-scanner-artifact-transfer-stability-miner';

interface CliOptions {
  transferStabilityReport: string | null;
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

interface Summary {
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
}

interface SelectedRow {
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
  matchedZeroLossBuckets: string[];
}

export interface RawOhlcScannerArtifactTransferStableSelectorSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_transfer_stable_selector_simulation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    transferStabilityReport: string | null;
    samebarReports: string[];
  };
  assumptions: {
    consumesExistingSameBarAndTransferStabilityReportsOnly: true;
    selectsAtMostOneRowPerProofEvent: true;
    usesZeroLossTransferStableBucketsOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    proofEvents: number;
    selectedRows: number;
    rejectedRows: number;
    selectedSummary: Summary;
    rejectedSummary: Summary;
    zeroLossBucketsUsed: number;
    livePromotionAllowedRows: 0;
    recommendation: 'fresh_replay_validate_selector' | 'no_matching_transfer_stable_bucket' | 'revise_selector' | 'fix_inputs';
  };
  selectedRows: SelectedRow[];
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

export function parseRawOhlcScannerArtifactTransferStableSelectorSimulationArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    transferStabilityReport: readFlag(args, '--transfer-stability-report') || latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-transfer-stability-miner-\d+\.json$/),
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

function bucketPairs(row: RawOhlcScannerArtifactSameBarSeparatorRow): string[] {
  return [
    `setupType:${row.setupType}`,
    `session_setup:${row.session}|${row.setupType}`,
    `direction_setup:${row.direction}|${row.setupType}`,
    `risk_setup:${riskBucket(row)}|${row.setupType}`,
    `time_setup:${row.timeBucket}|${row.setupType}`,
    `session_direction_setup:${row.session}|${row.direction}|${row.setupType}`,
    `session_risk_setup:${row.session}|${riskBucket(row)}|${row.setupType}`,
    `setup_session_direction_risk:${row.setupType}|${row.session}|${row.direction}|${riskBucket(row)}`,
    `setup_session_direction_time:${row.setupType}|${row.session}|${row.direction}|${row.timeBucket}`,
    `setup_session_risk_time:${row.setupType}|${row.session}|${riskBucket(row)}|${row.timeBucket}`,
    `setup_direction_risk_time:${row.setupType}|${row.direction}|${riskBucket(row)}|${row.timeBucket}`,
    `setup_session_direction_risk_time:${row.setupType}|${row.session}|${row.direction}|${riskBucket(row)}|${row.timeBucket}`,
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

function summarize(rows: Array<RawOhlcScannerArtifactSameBarSeparatorRow | SelectedRow>): Summary {
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

function selectRows(rows: RawOhlcScannerArtifactSameBarSeparatorRow[], stabilityReport: RawOhlcScannerArtifactTransferStabilityMinerReport | null): SelectedRow[] {
  const bucketScore = new Map((stabilityReport?.zeroLossStablePositiveBuckets || []).map((bucket) => [`${bucket.kind}:${bucket.key}`, bucket.score]));
  const groups = new Map<string, RawOhlcScannerArtifactSameBarSeparatorRow[]>();
  for (const row of rows) groups.set(proofEventKey(row), [...(groups.get(proofEventKey(row)) || []), row]);
  const selected: SelectedRow[] = [];
  for (const groupRows of groups.values()) {
    const scored = groupRows.map((row) => {
      const matches = bucketPairs(row).filter((key) => bucketScore.has(key));
      const rankScore = round(matches.reduce((total, key) => total + (bucketScore.get(key) || 0), 0) - row.riskPoints);
      return { row, matches, rankScore };
    }).filter((item) => item.matches.length > 0)
      .sort((a, b) => b.rankScore - a.rankScore || a.row.riskPoints - b.row.riskPoints || a.row.ticketId.localeCompare(b.row.ticketId));
    if (scored[0]) {
      const item = scored[0];
      selected.push({
        rankScore: item.rankScore,
        ticketId: item.row.ticketId,
        tradeDate: item.row.tradeDate,
        session: item.row.session,
        proofTime: item.row.proofTime,
        setupType: item.row.setupType,
        direction: item.row.direction,
        riskPoints: item.row.riskPoints,
        outcomeLabel: item.row.outcomeLabel,
        outcomeStatus: item.row.outcomeStatus,
        oneMesPl: item.row.resolvedOneMesPl,
        matchedZeroLossBuckets: item.matches,
      });
    }
  }
  return selected.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.proofTime.localeCompare(b.proofTime) || b.rankScore - a.rankScore);
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactTransferStableSelectorSimulationReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Transfer-Stable Selector Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only selector simulation. It does not install rank behavior, loosen canExecute, post Discord, write Supabase, read the bridge, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows/proof events: ${report.summary.sourceRows}/${report.summary.proofEvents}.`,
    `- Selected/rejected rows: ${report.summary.selectedRows}/${report.summary.rejectedRows}.`,
    `- Selected W/L/O/U: ${report.summary.selectedSummary.winners}/${report.summary.selectedSummary.losses}/${report.summary.selectedSummary.otherResolved}/${report.summary.selectedSummary.unresolved}.`,
    `- Selected one-MES P/L: ${report.summary.selectedSummary.oneMesPl ?? 'not available'}.`,
    `- Zero-loss buckets used: ${report.summary.zeroLossBucketsUsed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Selected Rows',
    '| Score | Ticket | Date | Time | Session | Model | Side | Risk | Outcome | P/L | Matched Buckets |',
    '|---:|---|---|---|---|---|---|---:|---|---:|---|',
    ...report.selectedRows.slice(0, 80).map((row) => `| ${row.rankScore} | ${escapeTable(row.ticketId)} | ${row.tradeDate} | ${row.proofTime} | ${row.session} | ${row.setupType} | ${row.direction} | ${row.riskPoints} | ${row.outcomeLabel} | ${row.oneMesPl ?? '-'} | ${escapeTable(row.matchedZeroLossBuckets.join('; '))} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactTransferStableSelectorSimulationReport(args: {
  reportDir: string;
  transferStabilityReportPath: string | null;
  transferStabilityReport: RawOhlcScannerArtifactTransferStabilityMinerReport | null;
  samebarReportPaths: string[];
  samebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactTransferStableSelectorSimulationReport {
  const rows = args.samebarReports.flatMap((report) => report.rows || []);
  const selectedRows = selectRows(rows, args.transferStabilityReport);
  const selectedIds = new Set(selectedRows.map((row) => row.ticketId));
  const rejectedRows = rows.filter((row) => !selectedIds.has(row.ticketId));
  const selectedSummary = summarize(selectedRows);
  const blockers = [
    !args.transferStabilityReportPath ? 'missing transfer stability report path' : null,
    !args.transferStabilityReport ? 'missing transfer stability report' : null,
    args.transferStabilityReport && args.transferStabilityReport.status !== 'pass' ? `transfer stability report status ${args.transferStabilityReport.status}` : null,
    args.transferStabilityReport && args.transferStabilityReport.summary.zeroLossStablePositiveBuckets === 0 ? 'transfer stability report has no zero-loss stable-positive buckets' : null,
    args.samebarReports.length === 0 ? 'missing same-bar reports' : null,
    rows.length === 0 ? 'no same-bar rows found' : null,
    ...args.samebarReports.map((report, index) => report.status !== 'pass' ? `same-bar report ${args.samebarReportPaths[index]} status ${report.status}` : null),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactTransferStableSelectorSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_transfer_stable_selector_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      transferStabilityReport: args.transferStabilityReportPath,
      samebarReports: args.samebarReportPaths,
    },
    assumptions: {
      consumesExistingSameBarAndTransferStabilityReportsOnly: true,
      selectsAtMostOneRowPerProofEvent: true,
      usesZeroLossTransferStableBucketsOnly: true,
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
      rejectedSummary: summarize(rejectedRows),
      zeroLossBucketsUsed: new Set(selectedRows.flatMap((row) => row.matchedZeroLossBuckets)).size,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : selectedRows.length === 0
          ? 'no_matching_transfer_stable_bucket'
          : selectedSummary.losses === 0 && selectedSummary.winners >= 5
            ? 'fresh_replay_validate_selector'
            : 'revise_selector',
    },
    selectedRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix transfer-stability and same-bar inputs before using this selector simulation.']
      : [
        selectedRows.length === 0
          ? 'No rows matched the transfer-stable zero-loss buckets in this sample; this is a no-promotion result, not execution approval.'
          : selectedSummary.losses === 0
          ? 'Selector simulation is clean in this saved sample; validate on fresh replay before any scanner-visible proposal.'
          : 'Selector simulation is loss-bearing; revise zero-loss bucket use before any scanner-visible proposal.',
        'Keep this research-only: no Discord, Supabase, NinjaTrader bridge, canExecute, entry, stop, target, risk, or live scanner ranking change is approved.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactTransferStableSelectorSimulationReport(
  report: RawOhlcScannerArtifactTransferStableSelectorSimulationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-transfer-stable-selector-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactTransferStableSelectorSimulationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactTransferStableSelectorSimulationArgs(args);
  const report = buildRawOhlcScannerArtifactTransferStableSelectorSimulationReport({
    reportDir: options.outDir,
    transferStabilityReportPath: options.transferStabilityReport,
    transferStabilityReport: options.transferStabilityReport && fs.existsSync(options.transferStabilityReport)
      ? readJson<RawOhlcScannerArtifactTransferStabilityMinerReport>(options.transferStabilityReport)
      : null,
    samebarReportPaths: options.samebarReports,
    samebarReports: options.samebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
  });
  const paths = writeRawOhlcScannerArtifactTransferStableSelectorSimulationReport(report, options.outDir);
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
    runRawOhlcScannerArtifactTransferStableSelectorSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
