import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

type BucketKind =
  | 'setupType'
  | 'session_setup'
  | 'direction_setup'
  | 'risk_setup'
  | 'time_setup'
  | 'session_direction_setup'
  | 'session_risk_setup';

interface CliOptions {
  samebarReports: string[];
  outDir: string;
  json: boolean;
}

interface Bucket {
  kind: BucketKind;
  key: string;
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
  winRateResolved: number | null;
  avgRiskPoints: number | null;
  avgMfeR: number | null;
  avgMaeR: number | null;
  score: number;
  recommendation: 'positive_research_selector' | 'caution_research_filter' | 'neutral_observation';
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

export interface RawOhlcScannerArtifactJulyUnifiedSeparatorReport {
  reportType: 'raw_ohlc_scanner_artifact_july_unified_separator';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    samebarReports: string[];
  };
  assumptions: {
    consumesExistingSameBarReportsOnly: true;
    separatorFieldsArePreEntryOrModelMetadata: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveFilterInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceReports: number;
    sourceRows: number;
    winners: number;
    losses: number;
    otherResolved: number;
    unresolved: number;
    oneMesPl: number | null;
    positiveResearchBuckets: number;
    cautionResearchBuckets: number;
    livePromotionAllowedRows: 0;
    recommendation: 'build_research_rank_simulation' | 'keep_research_only' | 'reject_unified_separator';
  };
  buckets: Bucket[];
  topPositiveBuckets: Bucket[];
  topCautionBuckets: Bucket[];
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

export function parseRawOhlcScannerArtifactJulyUnifiedSeparatorArgs(args = process.argv.slice(2)): CliOptions {
  return {
    samebarReports: splitPaths(readFlag(args, '--samebar-reports')),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
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

function bucketKey(row: RawOhlcScannerArtifactSameBarSeparatorRow, kind: BucketKind): string {
  if (kind === 'setupType') return row.setupType;
  if (kind === 'session_setup') return `${row.session}|${row.setupType}`;
  if (kind === 'direction_setup') return `${row.direction}|${row.setupType}`;
  if (kind === 'risk_setup') return `${riskBucket(row)}|${row.setupType}`;
  if (kind === 'time_setup') return `${row.timeBucket}|${row.setupType}`;
  if (kind === 'session_direction_setup') return `${row.session}|${row.direction}|${row.setupType}`;
  return `${row.session}|${riskBucket(row)}|${row.setupType}`;
}

function isWinner(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function classifyBucket(args: {
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  oneMesPl: number | null;
  winRateResolved: number | null;
}): Bucket['recommendation'] {
  if (args.rows < 5) return 'neutral_observation';
  if ((args.oneMesPl ?? 0) > 0 && (args.winRateResolved ?? 0) >= 0.68 && args.losses <= Math.max(1, Math.floor(args.winners / 3))) {
    return 'positive_research_selector';
  }
  if (args.losses >= args.winners && (args.oneMesPl ?? 0) <= 0) return 'caution_research_filter';
  if (args.unresolved >= args.winners + args.losses && (args.oneMesPl ?? 0) <= 0) return 'caution_research_filter';
  return 'neutral_observation';
}

function scoreBucket(args: {
  rows: number;
  winners: number;
  losses: number;
  oneMesPl: number | null;
  winRateResolved: number | null;
  avgMfeR: number | null;
  avgMaeR: number | null;
}): number {
  const plScore = Math.min(60, Math.max(-60, (args.oneMesPl ?? 0) / 100));
  const winRateScore = ((args.winRateResolved ?? 0) - 0.5) * 40;
  const lossPenalty = args.losses * -3;
  const sampleScore = Math.min(20, args.rows);
  const excursionScore = ((args.avgMfeR ?? 0) - (args.avgMaeR ?? 0)) * 4;
  return round(plScore + winRateScore + lossPenalty + sampleScore + excursionScore);
}

function buildBuckets(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): Bucket[] {
  const kinds: BucketKind[] = ['setupType', 'session_setup', 'direction_setup', 'risk_setup', 'time_setup', 'session_direction_setup', 'session_risk_setup'];
  const buckets: Bucket[] = [];
  for (const kind of kinds) {
    const groups = new Map<string, RawOhlcScannerArtifactSameBarSeparatorRow[]>();
    for (const row of rows) groups.set(bucketKey(row, kind), [...(groups.get(bucketKey(row, kind)) || []), row]);
    for (const [key, groupRows] of groups) {
      const winners = groupRows.filter(isWinner).length;
      const losses = groupRows.filter(isLoss).length;
      const otherResolved = groupRows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length;
      const unresolved = groupRows.filter((row) => row.outcomeStatus !== 'resolved').length;
      const resolved = winners + losses + otherResolved;
      const oneMesPl = sum(groupRows.map((row) => row.resolvedOneMesPl));
      const winRateResolved = resolved ? round(winners / resolved) : null;
      const avgMfeR = avg(groupRows.map((row) => row.mfeR));
      const avgMaeR = avg(groupRows.map((row) => row.maeR));
      const score = scoreBucket({ rows: groupRows.length, winners, losses, oneMesPl, winRateResolved, avgMfeR, avgMaeR });
      buckets.push({
        kind,
        key,
        rows: groupRows.length,
        winners,
        losses,
        otherResolved,
        unresolved,
        oneMesPl,
        winRateResolved,
        avgRiskPoints: avg(groupRows.map((row) => row.riskPoints)),
        avgMfeR,
        avgMaeR,
        score,
        recommendation: classifyBucket({ rows: groupRows.length, winners, losses, unresolved, oneMesPl, winRateResolved }),
      });
    }
  }
  return buckets.sort((a, b) => b.score - a.score || b.rows - a.rows || a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function formatBucket(row: Bucket): string {
  return `| ${row.kind} | ${escapeTable(row.key)} | ${row.rows} | ${row.winners}/${row.losses}/${row.otherResolved}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.winRateResolved ?? '-'} | ${row.avgRiskPoints ?? '-'} | ${row.avgMfeR ?? '-'} | ${row.avgMaeR ?? '-'} | ${row.score} | ${row.recommendation} |`;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactJulyUnifiedSeparatorReport, 'markdown'>): string {
  return [
    '# July Raw-OHLC Unified Separator',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only research separator. Outcomes evaluate buckets only; no live filter, rank change, canExecute change, Discord post, Supabase write, bridge read, or trade math change is installed.',
    '',
    '## Summary',
    `- Source reports/rows: ${report.summary.sourceReports}/${report.summary.sourceRows}.`,
    `- W/L/O/U: ${report.summary.winners}/${report.summary.losses}/${report.summary.otherResolved}/${report.summary.unresolved}.`,
    `- One-MES P/L: ${report.summary.oneMesPl ?? 'not available'}.`,
    `- Positive research buckets: ${report.summary.positiveResearchBuckets}.`,
    `- Caution research buckets: ${report.summary.cautionResearchBuckets}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Top Positive Buckets',
    '| Kind | Key | Rows | W/L/O/U | P/L | Win Rate | Avg Risk | Avg MFE-R | Avg MAE-R | Score | Recommendation |',
    '|---|---|---:|---|---:|---:|---:|---:|---:|---:|---|',
    ...report.topPositiveBuckets.map(formatBucket),
    '',
    '## Top Caution Buckets',
    '| Kind | Key | Rows | W/L/O/U | P/L | Win Rate | Avg Risk | Avg MFE-R | Avg MAE-R | Score | Recommendation |',
    '|---|---|---:|---|---:|---:|---:|---:|---:|---:|---|',
    ...report.topCautionBuckets.map(formatBucket),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactJulyUnifiedSeparatorReport(args: {
  reportDir: string;
  samebarReportPaths: string[];
  samebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactJulyUnifiedSeparatorReport {
  const rows = args.samebarReports.flatMap((report) => report.rows || []);
  const buckets = buildBuckets(rows);
  const positive = buckets.filter((bucket) => bucket.recommendation === 'positive_research_selector');
  const caution = buckets.filter((bucket) => bucket.recommendation === 'caution_research_filter')
    .sort((a, b) => a.score - b.score || (a.oneMesPl ?? 0) - (b.oneMesPl ?? 0));
  const blockers = [
    args.samebarReports.length === 0 ? 'missing same-bar reports' : null,
    rows.length === 0 ? 'no same-bar rows found' : null,
    ...args.samebarReports.map((report, index) => report.status !== 'pass' ? `same-bar report ${args.samebarReportPaths[index]} status ${report.status}` : null),
  ].filter((item): item is string => Boolean(item));
  const winners = rows.filter(isWinner).length;
  const losses = rows.filter(isLoss).length;
  const otherResolved = rows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length;
  const unresolved = rows.filter((row) => row.outcomeStatus !== 'resolved').length;
  const base: Omit<RawOhlcScannerArtifactJulyUnifiedSeparatorReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_july_unified_separator',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      samebarReports: args.samebarReportPaths,
    },
    assumptions: {
      consumesExistingSameBarReportsOnly: true,
      separatorFieldsArePreEntryOrModelMetadata: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveFilterInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceReports: args.samebarReports.length,
      sourceRows: rows.length,
      winners,
      losses,
      otherResolved,
      unresolved,
      oneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      positiveResearchBuckets: positive.length,
      cautionResearchBuckets: caution.length,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'reject_unified_separator'
        : positive.length
          ? 'build_research_rank_simulation'
          : 'keep_research_only',
    },
    buckets,
    topPositiveBuckets: positive.slice(0, 20),
    topCautionBuckets: caution.slice(0, 20),
    blockers,
    recommendations: blockers.length
      ? ['Fix the same-bar report inputs before using this separator diagnostic.']
      : [
        'Use positive and caution buckets as research hypotheses for a unified rank simulation only.',
        'Do not install any bucket as scanner-visible behavior until it passes a fresh replay validation and proves no canExecute, entry, stop, target, risk, Discord, Supabase, or bridge behavior change.',
        'OpeningDrive should not get a model-specific live allowlist from the prior combined selector; the July OOS selector was loss-bearing.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactJulyUnifiedSeparatorReport(
  report: RawOhlcScannerArtifactJulyUnifiedSeparatorReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-july-unified-separator-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactJulyUnifiedSeparatorCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactJulyUnifiedSeparatorArgs(args);
  const report = buildRawOhlcScannerArtifactJulyUnifiedSeparatorReport({
    reportDir: options.outDir,
    samebarReportPaths: options.samebarReports,
    samebarReports: options.samebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
  });
  const paths = writeRawOhlcScannerArtifactJulyUnifiedSeparatorReport(report, options.outDir);
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
    runRawOhlcScannerArtifactJulyUnifiedSeparatorCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
