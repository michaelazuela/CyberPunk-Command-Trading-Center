import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-breadth-validation';

type BucketKind = 'session' | 'direction' | 'risk' | 'time' | 'session_direction' | 'session_risk' | 'session_direction_risk' | 'date_session';

interface CliOptions {
  breadthValidation: string;
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

interface SeparatorBucket {
  kind: BucketKind;
  key: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
  avgMfeR: number | null;
  avgMaeR: number | null;
  score: number;
  recommendation: 'positive_separator_candidate' | 'caution_separator_candidate' | 'neutral_observation';
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_separator_diagnostic';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    breadthValidationPath: string;
    samebarReports: string[];
  };
  assumptions: {
    savedReportsOnly: true;
    htfMssOnly: true;
    separatorDiagnosticOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    samebarReports: number;
    htfMssRows: number;
    winners: number;
    losses: number;
    unresolved: number;
    oneMesPl: number | null;
    negativeBreadthDaySessionGroups: number;
    positiveBuckets: number;
    cautionBuckets: number;
    livePromotionAllowedRows: 0;
    recommendation: 'build_promotion_disabled_separator_simulation' | 'keep_research_only' | 'fix_inputs';
  };
  topPositiveBuckets: SeparatorBucket[];
  topCautionBuckets: SeparatorBucket[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticArgs(args = process.argv.slice(2)): CliOptions {
  const breadthValidation = readFlag(args, '--breadth-validation');
  if (!breadthValidation) throw new Error('--breadth-validation is required.');
  return {
    breadthValidation,
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

function isWinner(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function riskBucket(row: RawOhlcScannerArtifactSameBarSeparatorRow): string {
  if (row.riskPoints < 4) return 'risk_lt_4';
  if (row.riskPoints < 8) return 'risk_4_to_8';
  if (row.riskPoints < 16) return 'risk_8_to_16';
  if (row.riskPoints < 24) return 'risk_16_to_24';
  return 'risk_gte_24';
}

function bucketKey(row: RawOhlcScannerArtifactSameBarSeparatorRow, kind: BucketKind): string {
  if (kind === 'session') return row.session;
  if (kind === 'direction') return row.direction;
  if (kind === 'risk') return riskBucket(row);
  if (kind === 'time') return row.timeBucket;
  if (kind === 'session_direction') return `${row.session}|${row.direction}`;
  if (kind === 'session_risk') return `${row.session}|${riskBucket(row)}`;
  if (kind === 'session_direction_risk') return `${row.session}|${row.direction}|${riskBucket(row)}`;
  return `${row.tradeDate}|${row.session}`;
}

function scoreBucket(args: {
  rows: number;
  winners: number;
  losses: number;
  oneMesPl: number | null;
  avgMfeR: number | null;
  avgMaeR: number | null;
}): number {
  const plScore = Math.max(-80, Math.min(80, (args.oneMesPl ?? 0) / 50));
  const winLossScore = (args.winners - args.losses) * 5;
  const excursionScore = ((args.avgMfeR ?? 0) - (args.avgMaeR ?? 0)) * 5;
  const sampleScore = Math.min(15, args.rows);
  return round(plScore + winLossScore + excursionScore + sampleScore);
}

function classifyBucket(bucket: Omit<SeparatorBucket, 'recommendation'>): SeparatorBucket['recommendation'] {
  if (bucket.rows < 3) return 'neutral_observation';
  if ((bucket.oneMesPl ?? 0) > 0 && bucket.winners > bucket.losses) return 'positive_separator_candidate';
  if (bucket.losses >= bucket.winners && (bucket.oneMesPl ?? 0) <= 0) return 'caution_separator_candidate';
  return 'neutral_observation';
}

function buildBuckets(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): SeparatorBucket[] {
  const kinds: BucketKind[] = ['session', 'direction', 'risk', 'time', 'session_direction', 'session_risk', 'session_direction_risk', 'date_session'];
  const buckets: SeparatorBucket[] = [];
  for (const kind of kinds) {
    const grouped = new Map<string, RawOhlcScannerArtifactSameBarSeparatorRow[]>();
    for (const row of rows) grouped.set(bucketKey(row, kind), [...(grouped.get(bucketKey(row, kind)) || []), row]);
    for (const [key, groupRows] of grouped) {
      const winners = groupRows.filter(isWinner).length;
      const losses = groupRows.filter(isLoss).length;
      const unresolved = groupRows.filter((row) => row.outcomeStatus !== 'resolved').length;
      const oneMesPl = sum(groupRows.map((row) => row.resolvedOneMesPl));
      const avgMfeR = avg(groupRows.map((row) => row.mfeR));
      const avgMaeR = avg(groupRows.map((row) => row.maeR));
      const base = {
        kind,
        key,
        rows: groupRows.length,
        winners,
        losses,
        unresolved,
        oneMesPl,
        avgRiskPoints: avg(groupRows.map((row) => row.riskPoints)),
        avgMfeR,
        avgMaeR,
        score: scoreBucket({ rows: groupRows.length, winners, losses, oneMesPl, avgMfeR, avgMaeR }),
      };
      buckets.push({ ...base, recommendation: classifyBucket(base) });
    }
  }
  return buckets.sort((a, b) => b.score - a.score || b.rows - a.rows || a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function formatBucket(row: SeparatorBucket): string {
  return `| ${row.kind} | ${escapeTable(row.key)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} | ${row.avgMfeR ?? '-'} | ${row.avgMaeR ?? '-'} | ${row.score} | ${row.recommendation} |`;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticReport, 'markdown'>): string {
  return [
    '# HTF MSS Separator Diagnostic',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only separator diagnostic. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- HTF-MSS same-bar rows: ${report.summary.htfMssRows}.`,
    `- W/L/U: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}.`,
    `- One-MES P/L: ${report.summary.oneMesPl ?? '-'}.`,
    `- Negative breadth day/session groups: ${report.summary.negativeBreadthDaySessionGroups}.`,
    `- Positive/caution buckets: ${report.summary.positiveBuckets}/${report.summary.cautionBuckets}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Top Positive Buckets',
    '| Kind | Key | Rows | W/L/U | P/L | Avg Risk | Avg MFE-R | Avg MAE-R | Score | Recommendation |',
    '|---|---|---:|---|---:|---:|---:|---:|---:|---|',
    ...report.topPositiveBuckets.map(formatBucket),
    '',
    '## Top Caution Buckets',
    '| Kind | Key | Rows | W/L/U | P/L | Avg Risk | Avg MFE-R | Avg MAE-R | Score | Recommendation |',
    '|---|---|---:|---|---:|---:|---:|---:|---:|---|',
    ...report.topCautionBuckets.map(formatBucket),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticReport(args: {
  reportDir: string;
  breadthValidationPath: string;
  breadthValidation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationReport | null;
  samebarReportPaths: string[];
  samebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticReport {
  const rows = args.samebarReports
    .flatMap((report) => report.rows || [])
    .filter((row) => row.setupType === 'HtfDisplacementMssContinuation');
  const buckets = buildBuckets(rows);
  const positive = buckets.filter((bucket) => bucket.recommendation === 'positive_separator_candidate');
  const caution = buckets.filter((bucket) => bucket.recommendation === 'caution_separator_candidate')
    .sort((a, b) => a.score - b.score || (a.oneMesPl ?? 0) - (b.oneMesPl ?? 0));
  const blockers = [
    !args.breadthValidation ? 'missing HTF-MSS breadth validation report' : null,
    args.breadthValidation && args.breadthValidation.status !== 'pass' ? `HTF-MSS breadth validation status ${args.breadthValidation.status}` : null,
    args.breadthValidation && args.breadthValidation.summary.recommendation !== 'build_htf_mss_separator_before_live_approval'
      ? `HTF-MSS breadth validation recommendation ${args.breadthValidation.summary.recommendation}`
      : null,
    args.samebarReports.length === 0 ? 'missing same-bar reports' : null,
    rows.length === 0 ? 'no HTF-MSS same-bar rows found' : null,
    ...args.samebarReports.map((report, index) => report.status !== 'pass' ? `same-bar report ${args.samebarReportPaths[index]} status ${report.status}` : null),
  ].filter((item): item is string => Boolean(item));
  const winners = rows.filter(isWinner).length;
  const losses = rows.filter(isLoss).length;
  const unresolved = rows.filter((row) => row.outcomeStatus !== 'resolved').length;
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_separator_diagnostic',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      breadthValidationPath: args.breadthValidationPath,
      samebarReports: args.samebarReportPaths,
    },
    assumptions: {
      savedReportsOnly: true,
      htfMssOnly: true,
      separatorDiagnosticOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      samebarReports: args.samebarReports.length,
      htfMssRows: rows.length,
      winners,
      losses,
      unresolved,
      oneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      negativeBreadthDaySessionGroups: args.breadthValidation?.summary.negativeDaySessionGroups || 0,
      positiveBuckets: positive.length,
      cautionBuckets: caution.length,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : positive.length && caution.length
          ? 'build_promotion_disabled_separator_simulation'
          : 'keep_research_only',
    },
    topPositiveBuckets: positive.slice(0, 20),
    topCautionBuckets: caution.slice(0, 20),
    blockers,
    recommendations: blockers.length
      ? ['Fix the saved breadth/same-bar inputs before using this separator diagnostic.']
      : [
        positive.length && caution.length
          ? 'Build a promotion-disabled HTF-MSS separator simulation from these buckets before any live approval discussion.'
          : 'Keep HTF-MSS research-only until the separator has both positive and caution evidence.',
        'Do not change Discord, Supabase, NinjaTrader bridge, canExecute, scanner runtime, entry, stop, target, risk, or live ranking from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-separator-diagnostic-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticReport({
    reportDir: options.outDir,
    breadthValidationPath: options.breadthValidation,
    breadthValidation: fs.existsSync(options.breadthValidation) ? readJson(options.breadthValidation) : null,
    samebarReportPaths: options.samebarReports,
    samebarReports: options.samebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, topPositiveBuckets: report.topPositiveBuckets.slice(0, 8), topCautionBuckets: report.topCautionBuckets.slice(0, 8), blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
