import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow,
} from './unified-positive-held-local-preview-replay-package-outcome';
import type { RawOhlcScannerArtifactSameBarAllowlistProbeReport } from './raw-ohlc-scanner-artifact-samebar-allowlist-probe';

type OutcomeRow = UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow;

interface CliOptions {
  replayPackageOutcome: string;
  outDir: string;
  json: boolean;
}

interface SameBarModelSummary {
  setupType: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  grossOneMesPl: number | null;
  avgWinnerRiskPoints: number | null;
  avgLossRiskPoints: number | null;
  avgWinnerMfeR: number | null;
  avgLossMfeR: number | null;
  avgWinnerMaeR: number | null;
  avgLossMaeR: number | null;
  firstReplayBarStopRows: number;
  firstReplayBarT1Rows: number;
  intrabarAmbiguityRows: number;
  recommendation: string;
}

interface TimeBucketSummary {
  bucket: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  grossOneMesPl: number | null;
}

export interface RawOhlcScannerArtifactSameBarSeparatorRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  outcomeLabel: OutcomeRow['outcomeLabel'];
  outcomeStatus: OutcomeRow['outcomeStatus'];
  resolvedOneMesPl: number | null;
  proofTime: string;
  entryHitTime: string | null;
  firstReplayBarTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  riskPoints: number;
  mfeR: number | null;
  maeR: number | null;
  timeBucket: string;
  separatorTags: string[];
}

export interface RawOhlcScannerArtifactSameBarSeparatorDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactSameBarAllowlistProbeReport['authority'];
  source: {
    reportDir: string;
    replayPackageOutcomePath: string | null;
  };
  assumptions: {
    usesReadOnlyReplayOutcomeOnly: true;
    analyzesSameBarRowsOnly: true;
    firstReplayBarMeansFirstCompletedBarAfterEntryBar: true;
    livePromotionAllowed: false;
  };
  summary: {
    sameBarRows: number;
    winners: number;
    losses: number;
    unresolved: number;
    grossOneMesPl: number | null;
    modelsWithPositiveSameBar: number;
    modelsWithSameBarLosses: number;
    livePromotionAllowedRows: 0;
  };
  modelSummaries: SameBarModelSummary[];
  timeBuckets: TimeBucketSummary[];
  rows: RawOhlcScannerArtifactSameBarSeparatorRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const POINT_VALUE = 5;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function parseRawOhlcScannerArtifactSameBarSeparatorDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const replayPackageOutcome = readFlag(args, '--replay-package-outcome') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-outcome-\d+\.json$/);
  if (!replayPackageOutcome) throw new Error('--replay-package-outcome is required.');
  return { replayPackageOutcome, outDir, json: args.includes('--json') };
}

function authority(): RawOhlcScannerArtifactSameBarAllowlistProbeReport['authority'] {
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

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function proofToEntryMinutes(row: OutcomeRow): number | null {
  if (!row.entryHitTime) return null;
  const minutes = (timeMs(row.entryHitTime) - timeMs(row.proofTime)) / 60000;
  return Number.isFinite(minutes) ? round(minutes) : null;
}

function toR(points: number | null, riskPoints: number): number | null {
  return points === null || riskPoints <= 0 ? null : round(points / riskPoints);
}

function isWinner(row: Pick<OutcomeRow, 'outcomeStatus' | 'outcomeLabel'>): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: Pick<OutcomeRow, 'outcomeStatus' | 'outcomeLabel'>): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function timeBucket(proofTime: string): string {
  const hour = Number(proofTime.slice(11, 13));
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return 'unknown';
  return `${String(hour).padStart(2, '0')}:00-${String(hour).padStart(2, '0')}:59`;
}

function separatorTags(row: OutcomeRow, mfeR: number | null, maeR: number | null): string[] {
  const tags = [
    isWinner(row) ? 'winner_t1_t2' : null,
    isLoss(row) ? 'stopped_before_t1' : null,
    row.outcomeStatus !== 'resolved' ? `unresolved_${row.outcomeLabel}` : null,
    row.firstReplayBarTime && row.stopHitTime === row.firstReplayBarTime ? 'first_replay_bar_stop' : null,
    row.firstReplayBarTime && row.t1HitTime === row.firstReplayBarTime ? 'first_replay_bar_t1' : null,
    row.firstReplayBarTime && row.t2HitTime === row.firstReplayBarTime ? 'first_replay_bar_t2' : null,
    row.intrabarAmbiguity ? 'intrabar_ambiguity' : null,
    maeR !== null && maeR >= 1 ? 'mae_at_or_over_1r' : null,
    mfeR !== null && mfeR >= 2 ? 'mfe_at_or_over_2r' : null,
  ].filter((tag): tag is string => Boolean(tag));
  return tags.length ? tags : ['same_bar_clean'];
}

function buildRows(outcomeRows: OutcomeRow[]): RawOhlcScannerArtifactSameBarSeparatorRow[] {
  return outcomeRows
    .filter((row) => proofToEntryMinutes(row) === 0)
    .map((row) => {
      const mfeR = toR(row.maximumFavorableExcursion, row.riskPoints);
      const maeR = toR(row.maximumAdverseExcursion, row.riskPoints);
      return {
        ticketId: row.ticketId,
        tradeDate: row.tradeDate,
        session: row.session,
        setupType: row.setupType,
        direction: row.direction,
        outcomeLabel: row.outcomeLabel,
        outcomeStatus: row.outcomeStatus,
        resolvedOneMesPl: row.resolvedOneMesPl,
        proofTime: row.proofTime,
        entryHitTime: row.entryHitTime,
        firstReplayBarTime: row.firstReplayBarTime,
        stopHitTime: row.stopHitTime,
        t1HitTime: row.t1HitTime,
        t2HitTime: row.t2HitTime,
        riskPoints: row.riskPoints,
        mfeR,
        maeR,
        timeBucket: timeBucket(row.proofTime),
        separatorTags: separatorTags(row, mfeR, maeR),
      };
    })
    .sort((a, b) => `${a.setupType}-${a.tradeDate}-${a.proofTime}-${a.ticketId}`.localeCompare(`${b.setupType}-${b.tradeDate}-${b.proofTime}-${b.ticketId}`));
}

function recommendation(summary: {
  grossOneMesPl: number | null;
  winners: number;
  losses: number;
  firstReplayBarStopRows: number;
}): string {
  if ((summary.grossOneMesPl ?? 0) > 0 && summary.losses === 0) {
    return 'Research candidate: same-bar rows are positive with no stopped-before-T1 rows in this sample.';
  }
  if ((summary.grossOneMesPl ?? 0) > 0) {
    return 'Research only: positive same-bar rows, but first isolate stopped-before-T1 behavior before any live-facing allowlist.';
  }
  if (summary.firstReplayBarStopRows > 0) {
    return 'Do not allowlist yet: stop-outs include immediate first-replay-bar failure.';
  }
  return 'Do not allowlist yet: same-bar evidence is not independently positive.';
}

function modelSummaries(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): SameBarModelSummary[] {
  const grouped = new Map<string, RawOhlcScannerArtifactSameBarSeparatorRow[]>();
  for (const row of rows) grouped.set(row.setupType, [...(grouped.get(row.setupType) || []), row]);
  return [...grouped.entries()]
    .map(([setupType, groupRows]) => {
      const winners = groupRows.filter(isWinner);
      const losses = groupRows.filter(isLoss);
      const summary = {
        setupType,
        rows: groupRows.length,
        winners: winners.length,
        losses: losses.length,
        unresolved: groupRows.filter((row) => row.outcomeStatus !== 'resolved').length,
        grossOneMesPl: sum(groupRows.map((row) => row.resolvedOneMesPl)),
        avgWinnerRiskPoints: avg(winners.map((row) => row.riskPoints)),
        avgLossRiskPoints: avg(losses.map((row) => row.riskPoints)),
        avgWinnerMfeR: avg(winners.map((row) => row.mfeR)),
        avgLossMfeR: avg(losses.map((row) => row.mfeR)),
        avgWinnerMaeR: avg(winners.map((row) => row.maeR)),
        avgLossMaeR: avg(losses.map((row) => row.maeR)),
        firstReplayBarStopRows: groupRows.filter((row) => row.separatorTags.includes('first_replay_bar_stop')).length,
        firstReplayBarT1Rows: groupRows.filter((row) => row.separatorTags.includes('first_replay_bar_t1')).length,
        intrabarAmbiguityRows: groupRows.filter((row) => row.separatorTags.includes('intrabar_ambiguity')).length,
      };
      return { ...summary, recommendation: recommendation(summary) };
    })
    .sort((a, b) => a.setupType.localeCompare(b.setupType));
}

function timeBuckets(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): TimeBucketSummary[] {
  const grouped = new Map<string, RawOhlcScannerArtifactSameBarSeparatorRow[]>();
  for (const row of rows) grouped.set(row.timeBucket, [...(grouped.get(row.timeBucket) || []), row]);
  return [...grouped.entries()]
    .map(([bucket, groupRows]) => ({
      bucket,
      rows: groupRows.length,
      winners: groupRows.filter(isWinner).length,
      losses: groupRows.filter(isLoss).length,
      unresolved: groupRows.filter((row) => row.outcomeStatus !== 'resolved').length,
      grossOneMesPl: sum(groupRows.map((row) => row.resolvedOneMesPl)),
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Same-Bar Separator Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only same-bar separator drilldown. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Same-bar rows: ${report.summary.sameBarRows}.`,
    `- Winners/losses/unresolved: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}.`,
    `- Gross one-MES P/L: ${report.summary.grossOneMesPl ?? 'not available'}.`,
    `- Models positive/loss-bearing: ${report.summary.modelsWithPositiveSameBar}/${report.summary.modelsWithSameBarLosses}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Models',
    '| Setup | Rows | Winners | Losses | Unresolved | P/L | Avg Risk W/L | Avg MFE R W/L | Avg MAE R W/L | First Replay Stop/T1 | Ambiguous | Recommendation |',
    '|---|---:|---:|---:|---:|---:|---|---|---|---|---:|---|',
    ...report.modelSummaries.map((row) => `| ${escapeTable(row.setupType)} | ${row.rows} | ${row.winners} | ${row.losses} | ${row.unresolved} | ${row.grossOneMesPl ?? '-'} | ${row.avgWinnerRiskPoints ?? '-'}/${row.avgLossRiskPoints ?? '-'} | ${row.avgWinnerMfeR ?? '-'}/${row.avgLossMfeR ?? '-'} | ${row.avgWinnerMaeR ?? '-'}/${row.avgLossMaeR ?? '-'} | ${row.firstReplayBarStopRows}/${row.firstReplayBarT1Rows} | ${row.intrabarAmbiguityRows} | ${escapeTable(row.recommendation)} |`),
    '',
    '## Time Buckets',
    '| Bucket | Rows | Winners | Losses | Unresolved | P/L |',
    '|---|---:|---:|---:|---:|---:|',
    ...report.timeBuckets.map((row) => `| ${row.bucket} | ${row.rows} | ${row.winners} | ${row.losses} | ${row.unresolved} | ${row.grossOneMesPl ?? '-'} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSameBarSeparatorDrilldownReport(args: {
  reportDir: string;
  replayPackageOutcomePath: string | null;
  replayPackageOutcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSameBarSeparatorDrilldownReport {
  const rows = buildRows(args.replayPackageOutcomeReport?.rows || []);
  const models = modelSummaries(rows);
  const blockers = [
    !args.replayPackageOutcomePath ? 'missing replay package outcome path' : null,
    !args.replayPackageOutcomeReport ? 'missing replay package outcome report' : null,
    args.replayPackageOutcomeReport && args.replayPackageOutcomeReport.summary.livePromotionAllowedRows !== 0
      ? `outcome report has ${args.replayPackageOutcomeReport.summary.livePromotionAllowedRows} live-promotion rows`
      : null,
    args.replayPackageOutcomeReport && rows.length === 0 ? 'no same-bar rows evaluated' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      replayPackageOutcomePath: args.replayPackageOutcomePath,
    },
    assumptions: {
      usesReadOnlyReplayOutcomeOnly: true,
      analyzesSameBarRowsOnly: true,
      firstReplayBarMeansFirstCompletedBarAfterEntryBar: true,
      livePromotionAllowed: false,
    },
    summary: {
      sameBarRows: rows.length,
      winners: rows.filter(isWinner).length,
      losses: rows.filter(isLoss).length,
      unresolved: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
      grossOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      modelsWithPositiveSameBar: models.filter((row) => (row.grossOneMesPl ?? 0) > 0).length,
      modelsWithSameBarLosses: models.filter((row) => row.losses > 0).length,
      livePromotionAllowedRows: 0,
    },
    modelSummaries: models,
    timeBuckets: timeBuckets(rows),
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use same-bar separator findings until the local replay outcome report is complete.']
      : [
        'Do not install a same-bar allowlist from this sample alone because every positive model still needs a stopped-before-T1 separator.',
        'Use model/time/risk/MAE features from this drilldown to design the next campaign-level candidate filter.',
        'No live promotion, Discord posting, Supabase write, canExecute change, or trading-rule change is recommended from this drilldown.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSameBarSeparatorDrilldownReport(
  report: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-samebar-separator-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSameBarSeparatorDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSameBarSeparatorDrilldownArgs(args);
  const report = buildRawOhlcScannerArtifactSameBarSeparatorDrilldownReport({
    reportDir: options.outDir,
    replayPackageOutcomePath: options.replayPackageOutcome,
    replayPackageOutcomeReport: fs.existsSync(options.replayPackageOutcome)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(options.replayPackageOutcome)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactSameBarSeparatorDrilldownReport(report, options.outDir);
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
    runRawOhlcScannerArtifactSameBarSeparatorDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
