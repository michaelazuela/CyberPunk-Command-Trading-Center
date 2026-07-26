import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type OutcomeStatus = 'resolved' | 'unresolved' | 'blocked';
type Recommendation = 'investigate_morning_long_filters' | 'broaden_outcome_source' | 'fix_inputs';

interface OutcomeRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  proofTime: string;
  outcomeStatus: OutcomeStatus;
  outcomeLabel: string;
  entry: number | null;
  stop: number | null;
  t1: number | null;
  t2: number | null;
  riskPoints: number | null;
  barsLoaded: number;
  barsAfterProof: number;
  entryHitTime: string | null;
  firstReplayBarTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  maximumFavorableExcursion: number | null;
  maximumAdverseExcursion: number | null;
  resolvedOneMesPl: number | null;
  resolvedR: number | null;
  intrabarAmbiguity?: boolean;
  blockers?: string[];
}

interface OutcomeReport {
  status?: string;
  rows?: OutcomeRow[];
}

interface BucketRow {
  bucketType: 'outcome_label' | 'proof_time' | 'risk_points' | 'replay_coverage' | 'mfe_to_risk' | 'mae_to_risk';
  bucket: string;
  rows: number;
  resolvedRows: number;
  unresolvedRows: number;
  winnerRows: number;
  problemRows: number;
  grossResolvedOneMesPl: number | null;
  averageRiskPoints: number | null;
  averageMfeToRisk: number | null;
  averageMaeToRisk: number | null;
}

interface SampleRow {
  ticketId: string;
  tradeDate: string;
  proofTime: string;
  outcomeLabel: string;
  riskPoints: number | null;
  barsAfterProof: number;
  entryHitTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  maximumFavorableExcursion: number | null;
  maximumAdverseExcursion: number | null;
  resolvedOneMesPl: number | null;
  causeClass: 'no_fill' | 'stopped_before_t1' | 'target_unresolved' | 'winner' | 'blocked_or_other';
}

export interface RawOhlcScannerArtifactSweepMorningLongOutcomeDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_outcome_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
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
  };
  source: {
    reportDir: string;
    outcomePath: string | null;
    filter: {
      setupType: 'NoInstalledSetup';
      session: 'morning';
      direction: 'LONG';
    };
  };
  assumptions: {
    savedReportsOnly: true;
    repeatedRowsAreResearchRowsNotIndependentLiveTrades: true;
    drilldownOnly: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    filteredRows: number;
    resolvedRows: number;
    unresolvedRows: number;
    winnerRows: number;
    problemRows: number;
    stoppedRows: number;
    noFillRows: number;
    noTargetOrStopRows: number;
    grossResolvedOneMesPl: number | null;
    averageRiskPoints: number | null;
    averageMfeToRisk: number | null;
    averageMaeToRisk: number | null;
    dominantProblem: string | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: Recommendation;
  };
  bucketRows: BucketRow[];
  sampleRows: SampleRow[];
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

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function average(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length) : null;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function isWinner(row: OutcomeRow): boolean {
  return row.outcomeStatus === 'resolved' && (row.resolvedOneMesPl ?? 0) > 0;
}

function isProblem(row: OutcomeRow): boolean {
  return row.outcomeLabel === 'stopped_before_t1' || row.outcomeLabel === 'no_fill' || row.outcomeLabel === 'no_target_or_stop_hit';
}

function ratio(value: number | null | undefined, risk: number | null | undefined): number | null {
  if (typeof value !== 'number' || typeof risk !== 'number' || !Number.isFinite(value) || !Number.isFinite(risk) || risk <= 0) return null;
  return round(value / risk);
}

function hourBucket(proofTime: string): string {
  const hour = proofTime.match(/T(\d{2}):/)?.[1];
  return hour ? `${hour}:00` : 'unknown';
}

function riskBucket(row: OutcomeRow): string {
  const risk = row.riskPoints;
  if (typeof risk !== 'number' || !Number.isFinite(risk)) return 'missing';
  if (risk <= 8) return '<=8';
  if (risk <= 12) return '8.25-12';
  if (risk <= 18) return '12.25-18';
  if (risk <= 25) return '18.25-25';
  return '>25';
}

function coverageBucket(row: OutcomeRow): string {
  if (row.barsAfterProof < 6) return '<6 bars';
  if (row.barsAfterProof < 12) return '6-11 bars';
  if (row.barsAfterProof < 24) return '12-23 bars';
  return '>=24 bars';
}

function mfeBucket(row: OutcomeRow): string {
  const value = ratio(row.maximumFavorableExcursion, row.riskPoints);
  if (value === null) return 'missing';
  if (value < 0.5) return '<0.5R';
  if (value < 1) return '0.5R-0.99R';
  if (value < 1.5) return '1R-1.49R';
  return '>=1.5R';
}

function maeBucket(row: OutcomeRow): string {
  const value = ratio(row.maximumAdverseExcursion, row.riskPoints);
  if (value === null) return 'missing';
  if (value < 0.5) return '<0.5R';
  if (value < 1) return '0.5R-0.99R';
  return '>=1R';
}

function causeClass(row: OutcomeRow): SampleRow['causeClass'] {
  if (row.outcomeLabel === 'no_fill') return 'no_fill';
  if (row.outcomeLabel === 'stopped_before_t1') return 'stopped_before_t1';
  if (row.outcomeLabel === 'no_target_or_stop_hit') return 'target_unresolved';
  if (isWinner(row)) return 'winner';
  return 'blocked_or_other';
}

function bucketize(rows: OutcomeRow[], bucketType: BucketRow['bucketType'], bucketFor: (row: OutcomeRow) => string): BucketRow[] {
  const groups = new Map<string, OutcomeRow[]>();
  for (const row of rows) {
    const bucket = bucketFor(row);
    groups.set(bucket, [...(groups.get(bucket) || []), row]);
  }
  return [...groups.entries()].map(([bucket, bucketRows]) => ({
    bucketType,
    bucket,
    rows: bucketRows.length,
    resolvedRows: bucketRows.filter((row) => row.outcomeStatus === 'resolved').length,
    unresolvedRows: bucketRows.filter((row) => row.outcomeStatus === 'unresolved').length,
    winnerRows: bucketRows.filter(isWinner).length,
    problemRows: bucketRows.filter(isProblem).length,
    grossResolvedOneMesPl: sum(bucketRows.map((row) => row.resolvedOneMesPl)),
    averageRiskPoints: average(bucketRows.map((row) => row.riskPoints)),
    averageMfeToRisk: average(bucketRows.map((row) => ratio(row.maximumFavorableExcursion, row.riskPoints))),
    averageMaeToRisk: average(bucketRows.map((row) => ratio(row.maximumAdverseExcursion, row.riskPoints))),
  })).sort((a, b) => b.rows - a.rows || a.bucket.localeCompare(b.bucket));
}

function authority(): RawOhlcScannerArtifactSweepMorningLongOutcomeDrilldownReport['authority'] {
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

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepMorningLongOutcomeDrilldownReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Morning LONG Outcome Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-outcome drilldown. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Filtered rows: ${report.summary.filteredRows}.`,
    `- Resolved/unresolved: ${report.summary.resolvedRows} / ${report.summary.unresolvedRows}.`,
    `- Winners/problems: ${report.summary.winnerRows} / ${report.summary.problemRows}.`,
    `- Stopped/no-fill/no-target-or-stop: ${report.summary.stoppedRows} / ${report.summary.noFillRows} / ${report.summary.noTargetOrStopRows}.`,
    `- Gross resolved one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? '-'}.`,
    `- Average risk points: ${report.summary.averageRiskPoints ?? '-'}.`,
    `- Average MFE/MAE to risk: ${report.summary.averageMfeToRisk ?? '-'} / ${report.summary.averageMaeToRisk ?? '-'}.`,
    `- Dominant problem: ${report.summary.dominantProblem || 'none'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Buckets',
    '| Type | Bucket | Rows | Resolved | Unresolved | Winners | Problems | P/L | Avg Risk | Avg MFE/R | Avg MAE/R |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...report.bucketRows.map((row) => `| ${row.bucketType} | ${escapeTable(row.bucket)} | ${row.rows} | ${row.resolvedRows} | ${row.unresolvedRows} | ${row.winnerRows} | ${row.problemRows} | ${row.grossResolvedOneMesPl ?? '-'} | ${row.averageRiskPoints ?? '-'} | ${row.averageMfeToRisk ?? '-'} | ${row.averageMaeToRisk ?? '-'} |`),
    '',
    '## Sample Problem Rows',
    '| Date | Proof | Label | Risk | Bars After | Entry Hit | Stop Hit | T1 Hit | MFE | MAE | P/L | Cause |',
    '|---|---|---|---:|---:|---|---|---|---:|---:|---:|---|',
    ...report.sampleRows.slice(0, 30).map((row) => `| ${row.tradeDate} | ${row.proofTime} | ${row.outcomeLabel} | ${row.riskPoints ?? '-'} | ${row.barsAfterProof} | ${row.entryHitTime || '-'} | ${row.stopHitTime || '-'} | ${row.t1HitTime || '-'} | ${row.maximumFavorableExcursion ?? '-'} | ${row.maximumAdverseExcursion ?? '-'} | ${row.resolvedOneMesPl ?? '-'} | ${row.causeClass} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepMorningLongOutcomeDrilldownReport(args: {
  reportDir?: string;
  outcomePath?: string | null;
  outcome?: OutcomeReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepMorningLongOutcomeDrilldownReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const outcomePath = args.outcomePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-outcome-');
  const outcome = args.outcome ?? readJson<OutcomeReport>(outcomePath);
  const rows = (outcome?.rows || []).filter((row) => (
    row.setupType === 'NoInstalledSetup'
    && row.session === 'morning'
    && row.direction === 'LONG'
  ));
  const problemCounts = new Map<string, number>();
  for (const row of rows.filter(isProblem)) problemCounts.set(row.outcomeLabel, (problemCounts.get(row.outcomeLabel) || 0) + 1);
  const dominantProblem = [...problemCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;
  const blockers = [
    !outcomePath && !args.outcome ? 'missing outcome report path' : null,
    !outcome ? 'missing outcome report' : null,
    outcome && outcome.status !== 'pass' ? `outcome report status ${outcome.status}` : null,
    (outcome?.rows || []).length === 0 ? 'outcome report has no rows' : null,
    rows.length === 0 ? 'no NoInstalledSetup morning LONG rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const bucketRows = [
    ...bucketize(rows, 'outcome_label', (row) => row.outcomeLabel),
    ...bucketize(rows, 'proof_time', (row) => hourBucket(row.proofTime)),
    ...bucketize(rows, 'risk_points', riskBucket),
    ...bucketize(rows, 'replay_coverage', coverageBucket),
    ...bucketize(rows, 'mfe_to_risk', mfeBucket),
    ...bucketize(rows, 'mae_to_risk', maeBucket),
  ];
  const sampleRows = rows
    .filter(isProblem)
    .map((row) => ({
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      proofTime: row.proofTime,
      outcomeLabel: row.outcomeLabel,
      riskPoints: row.riskPoints,
      barsAfterProof: row.barsAfterProof,
      entryHitTime: row.entryHitTime,
      stopHitTime: row.stopHitTime,
      t1HitTime: row.t1HitTime,
      maximumFavorableExcursion: row.maximumFavorableExcursion,
      maximumAdverseExcursion: row.maximumAdverseExcursion,
      resolvedOneMesPl: row.resolvedOneMesPl,
      causeClass: causeClass(row),
    }))
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.proofTime.localeCompare(b.proofTime));
  const base: Omit<RawOhlcScannerArtifactSweepMorningLongOutcomeDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_outcome_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir,
      outcomePath,
      filter: {
        setupType: 'NoInstalledSetup',
        session: 'morning',
        direction: 'LONG',
      },
    },
    assumptions: {
      savedReportsOnly: true,
      repeatedRowsAreResearchRowsNotIndependentLiveTrades: true,
      drilldownOnly: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      filteredRows: rows.length,
      resolvedRows: rows.filter((row) => row.outcomeStatus === 'resolved').length,
      unresolvedRows: rows.filter((row) => row.outcomeStatus === 'unresolved').length,
      winnerRows: rows.filter(isWinner).length,
      problemRows: rows.filter(isProblem).length,
      stoppedRows: rows.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
      noFillRows: rows.filter((row) => row.outcomeLabel === 'no_fill').length,
      noTargetOrStopRows: rows.filter((row) => row.outcomeLabel === 'no_target_or_stop_hit').length,
      grossResolvedOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      averageRiskPoints: average(rows.map((row) => row.riskPoints)),
      averageMfeToRisk: average(rows.map((row) => ratio(row.maximumFavorableExcursion, row.riskPoints))),
      averageMaeToRisk: average(rows.map((row) => ratio(row.maximumAdverseExcursion, row.riskPoints))),
      dominantProblem,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length
        ? 'fix_inputs'
        : rows.length >= 20
          ? 'investigate_morning_long_filters'
          : 'broaden_outcome_source',
    },
    bucketRows,
    sampleRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved outcome input before using this drilldown.']
      : [
        'Keep this research-only; it identifies a weak pocket but does not justify runtime ranking by itself.',
        dominantProblem ? `Next isolate ${dominantProblem} rows against available scanner pre-entry fields before proposing a live-facing rank penalty.` : 'Broaden outcome data before proposing a filter.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepMorningLongOutcomeDrilldownReport({
    reportDir,
    outcomePath: readFlag(args, '--outcome') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-morning-long-outcome-drilldown-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
