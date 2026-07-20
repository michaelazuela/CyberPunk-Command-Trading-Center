import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type FullDayOutcomeLabel = 'stopped_before_t1' | 't1_hit_only' | 't1_and_t2_hit' | 'no_fill' | 'no_target_or_stop_hit';
type CauseClass = 'no_fill' | 'weak_follow_through' | 'near_t1_unresolved' | 'no_stop_no_target' | 'input_blocked';

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ReplayPackageRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  proofTime: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
}

interface ReplayPackageReport {
  status?: string;
  source?: { artifactPaths?: string[] };
  rows?: ReplayPackageRow[];
}

interface FullDayComparisonRow {
  ticketId: string;
  tradeDate: string;
  proofTime: string;
  baselineOutcomeLabel: string | null;
  fullDayOutcomeLabel: FullDayOutcomeLabel | string;
  baselineOneMesPl: number | null;
  fullDayOneMesPl: number | null;
  sourceArtifactPath: string | null;
}

interface FullDayComparisonReport {
  status?: string;
  source?: { replayPackagePath?: string | null };
  rows?: FullDayComparisonRow[];
}

interface DrilldownRow {
  ticketId: string;
  tradeDate: string;
  proofTime: string;
  baselineOutcomeLabel: string | null;
  fullDayOutcomeLabel: FullDayOutcomeLabel | 'blocked';
  direction: Direction;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number | null;
  barsLoaded: number;
  barsAfterProof: number;
  firstBarTime: string | null;
  lastBarTime: string | null;
  entryHitTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  maximumFavorableExcursion: number | null;
  maximumAdverseExcursion: number | null;
  mfeR: number | null;
  maeR: number | null;
  pointsShortOfT1: number | null;
  causeClass: CauseClass;
  rankResearchAction: 'exclude_from_positive_rank_training' | 'keep_as_unresolved_review_note' | 'inspect_inputs';
  sourceArtifactPath: string | null;
  blockers: string[];
}

export interface RawOhlcScannerArtifactSweepMorningLongFullDayUnresolvedDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_full_day_unresolved_drilldown';
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
    fullDayComparisonPath: string | null;
    replayPackagePath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    usesSavedFullDayScannerArtifactBars: true;
    usesCompletedFiveMinuteBarsOnly: true;
    unresolvedRowsAreResearchNotesOnly: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    unresolvedRows: number;
    noFillRows: number;
    weakFollowThroughRows: number;
    nearT1UnresolvedRows: number;
    noStopNoTargetRows: number;
    blockedRows: number;
    averageMfeR: number | null;
    averageMaeR: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'rerun_rank_without_unresolved_positives' | 'inspect_remaining_unresolved' | 'fix_inputs';
  };
  rows: DrilldownRow[];
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function normalizeBar(value: unknown): OhlcBar | null {
  const record = asRecord(value);
  const time = normalizeTime(record.time ?? record.candle_time_et ?? record.timestamp);
  const open = numberOrNull(record.open);
  const high = numberOrNull(record.high);
  const low = numberOrNull(record.low);
  const close = numberOrNull(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  if (high < Math.max(open, close) || low > Math.min(open, close)) return null;
  return { time, open, high, low, close };
}

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function average(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!numeric.length) return null;
  return round(numeric.reduce((total, value) => total + value, 0) / numeric.length);
}

function loadArtifactBars(artifactPath: string | null): OhlcBar[] {
  const artifact = readJson<Record<string, unknown>>(artifactPath);
  if (!artifact) return [];
  const byTime = new Map<string, OhlcBar>();
  for (const event of Object.values(asRecord(artifact.events))) {
    const bar = normalizeBar(asRecord(event).completed5m);
    if (bar) byTime.set(bar.time, bar);
  }
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function crosses(direction: Direction, bar: OhlcBar, level: number): boolean {
  return direction === 'LONG' ? bar.high >= level : bar.low <= level;
}

function hitsStop(direction: Direction, bar: OhlcBar, stop: number): boolean {
  return direction === 'LONG' ? bar.low <= stop : bar.high >= stop;
}

function favorableMove(direction: Direction, bar: OhlcBar, entry: number): number {
  return direction === 'LONG' ? bar.high - entry : entry - bar.low;
}

function adverseMove(direction: Direction, bar: OhlcBar, entry: number): number {
  return direction === 'LONG' ? entry - bar.low : bar.high - entry;
}

function pointsShortOfTarget(direction: Direction, mfe: number, entry: number, target: number): number {
  const targetMove = Math.abs(target - entry);
  return round(Math.max(0, targetMove - mfe));
}

function classify(row: {
  label: FullDayOutcomeLabel | 'blocked';
  mfeR: number | null;
  pointsShortOfT1: number | null;
  blockers: string[];
}): CauseClass {
  if (row.blockers.length) return 'input_blocked';
  if (row.label === 'no_fill') return 'no_fill';
  if (row.label !== 'no_target_or_stop_hit') return 'input_blocked';
  if ((row.mfeR ?? 0) < 0.5) return 'weak_follow_through';
  if ((row.pointsShortOfT1 ?? Number.POSITIVE_INFINITY) <= 4) return 'near_t1_unresolved';
  return 'no_stop_no_target';
}

function actionFor(causeClass: CauseClass): DrilldownRow['rankResearchAction'] {
  if (causeClass === 'input_blocked') return 'inspect_inputs';
  if (causeClass === 'near_t1_unresolved') return 'keep_as_unresolved_review_note';
  return 'exclude_from_positive_rank_training';
}

function artifactPathForTicket(reportDir: string, replayPackage: ReplayPackageReport | null, comparisonRow: FullDayComparisonRow): string | null {
  if (comparisonRow.sourceArtifactPath && fs.existsSync(comparisonRow.sourceArtifactPath)) return comparisonRow.sourceArtifactPath;
  const artifactBase = comparisonRow.ticketId.split('|')[0];
  const explicit = replayPackage?.source?.artifactPaths?.find((artifactPath) => path.basename(artifactPath, '.json') === artifactBase);
  if (explicit && fs.existsSync(explicit)) return explicit;
  const fallback = path.join(reportDir, `${artifactBase}.json`);
  return fs.existsSync(fallback) ? fallback : null;
}

function buildDrilldownRow(args: {
  reportDir: string;
  replayPackage: ReplayPackageReport | null;
  comparisonRow: FullDayComparisonRow;
}): DrilldownRow {
  const packageRow = args.replayPackage?.rows?.find((row) => row.ticketId === args.comparisonRow.ticketId) || null;
  const artifactPath = artifactPathForTicket(args.reportDir, args.replayPackage, args.comparisonRow);
  const bars = loadArtifactBars(artifactPath);
  const direction = packageRow?.direction || 'LONG';
  const proofTime = normalizeTime(packageRow?.proofTime) || args.comparisonRow.proofTime;
  const entry = packageRow?.entry ?? 0;
  const stop = packageRow?.stop ?? 0;
  const t1 = packageRow?.t1 ?? 0;
  const t2 = packageRow?.t2 ?? 0;
  const riskPoints = packageRow ? round(Math.abs(entry - stop)) : null;
  const barsAfterProof = proofTime ? bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime)).length : 0;
  const blockers = [
    !packageRow ? 'missing replay package row' : null,
    !artifactPath ? 'missing matching full-day scanner artifact' : null,
    bars.length === 0 ? 'missing completed 5M bars from full-day scanner artifact' : null,
    !proofTime ? 'missing proof time' : null,
    packageRow && !Number.isFinite(entry) ? 'missing entry' : null,
    packageRow && !Number.isFinite(stop) ? 'missing stop' : null,
    packageRow && !Number.isFinite(t1) ? 'missing T1' : null,
    packageRow && !Number.isFinite(t2) ? 'missing T2' : null,
    packageRow && riskPoints !== null && riskPoints <= 0 ? 'non-positive risk' : null,
    barsAfterProof === 0 ? 'missing full-day completed 5M bars at or after proof time' : null,
  ].filter((item): item is string => Boolean(item));

  let entryHitTime: string | null = null;
  let stopHitTime: string | null = null;
  let t1HitTime: string | null = null;
  let t2HitTime: string | null = null;
  let mfe: number | null = null;
  let mae: number | null = null;

  if (!blockers.length && packageRow) {
    const eligibleBars = bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime));
    const entryHitIndex = eligibleBars.findIndex((bar) => crosses(direction, bar, entry));
    if (entryHitIndex >= 0) {
      entryHitTime = eligibleBars[entryHitIndex].time;
      mfe = 0;
      mae = 0;
      for (const bar of eligibleBars.slice(entryHitIndex + 1)) {
        mfe = Math.max(mfe, favorableMove(direction, bar, entry));
        mae = Math.max(mae, adverseMove(direction, bar, entry));
        if (!stopHitTime && hitsStop(direction, bar, stop)) stopHitTime = bar.time;
        if (!t1HitTime && crosses(direction, bar, t1)) t1HitTime = bar.time;
        if (!t2HitTime && crosses(direction, bar, t2)) t2HitTime = bar.time;
      }
    }
  }

  const normalizedLabel = blockers.length ? 'blocked' : args.comparisonRow.fullDayOutcomeLabel as FullDayOutcomeLabel;
  const mfeR = mfe === null || !riskPoints ? null : round(mfe / riskPoints);
  const maeR = mae === null || !riskPoints ? null : round(mae / riskPoints);
  const pointsShortOfT1 = mfe === null ? null : pointsShortOfTarget(direction, mfe, entry, t1);
  const causeClass = classify({ label: normalizedLabel, mfeR, pointsShortOfT1, blockers });
  return {
    ticketId: args.comparisonRow.ticketId,
    tradeDate: packageRow?.tradeDate || args.comparisonRow.tradeDate,
    proofTime,
    baselineOutcomeLabel: args.comparisonRow.baselineOutcomeLabel,
    fullDayOutcomeLabel: normalizedLabel,
    direction,
    entry,
    stop,
    t1,
    t2,
    riskPoints,
    barsLoaded: bars.length,
    barsAfterProof,
    firstBarTime: bars[0]?.time || null,
    lastBarTime: bars[bars.length - 1]?.time || null,
    entryHitTime,
    stopHitTime,
    t1HitTime,
    t2HitTime,
    maximumFavorableExcursion: mfe === null ? null : round(mfe),
    maximumAdverseExcursion: mae === null ? null : round(mae),
    mfeR,
    maeR,
    pointsShortOfT1,
    causeClass,
    rankResearchAction: actionFor(causeClass),
    sourceArtifactPath: artifactPath,
    blockers,
  };
}

function authority(): RawOhlcScannerArtifactSweepMorningLongFullDayUnresolvedDrilldownReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepMorningLongFullDayUnresolvedDrilldownReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Morning LONG Full-Day Unresolved Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-artifact unresolved drilldown. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Unresolved rows: ${report.summary.unresolvedRows}.`,
    `- No-fill / weak-follow-through / near-T1 / no-stop-no-target / blocked: ${report.summary.noFillRows} / ${report.summary.weakFollowThroughRows} / ${report.summary.nearT1UnresolvedRows} / ${report.summary.noStopNoTargetRows} / ${report.summary.blockedRows}.`,
    `- Average MFE/MAE R: ${report.summary.averageMfeR ?? '-'} / ${report.summary.averageMaeR ?? '-'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    ...report.rows.map((row) => `- ${row.tradeDate} ${row.proofTime}: ${row.fullDayOutcomeLabel}; cause ${row.causeClass}; MFE/MAE R ${row.mfeR ?? '-'} / ${row.maeR ?? '-'}; short T1 ${row.pointsShortOfT1 ?? '-'}; action ${row.rankResearchAction}.`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepMorningLongFullDayUnresolvedDrilldownReport(args: {
  reportDir?: string;
  fullDayComparisonPath?: string | null;
  replayPackagePath?: string | null;
  fullDayComparison?: FullDayComparisonReport | null;
  replayPackage?: ReplayPackageReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepMorningLongFullDayUnresolvedDrilldownReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const fullDayComparisonPath = args.fullDayComparisonPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-sweep-morning-long-full-day-outcome-comparison-');
  const fullDayComparison = args.fullDayComparison ?? readJson<FullDayComparisonReport>(fullDayComparisonPath);
  const replayPackagePath = args.replayPackagePath ?? fullDayComparison?.source?.replayPackagePath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-broader-daily-replay-package-');
  const replayPackage = args.replayPackage ?? readJson<ReplayPackageReport>(replayPackagePath);
  const unresolvedComparisonRows = (fullDayComparison?.rows || []).filter((row) => row.fullDayOneMesPl === null);
  const rows = unresolvedComparisonRows.map((comparisonRow) => buildDrilldownRow({ reportDir, replayPackage, comparisonRow }));
  const blockers = [
    !fullDayComparisonPath && !args.fullDayComparison ? 'missing full-day comparison path' : null,
    !replayPackagePath && !args.replayPackage ? 'missing replay package path' : null,
    !fullDayComparison ? 'missing full-day comparison report' : null,
    !replayPackage ? 'missing replay package report' : null,
    fullDayComparison && fullDayComparison.status !== 'pass' ? `full-day comparison status ${fullDayComparison.status}` : null,
    replayPackage && replayPackage.status !== 'pass' ? `replay package status ${replayPackage.status}` : null,
    unresolvedComparisonRows.length === 0 ? 'full-day comparison has no unresolved rows' : null,
    ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.ticketId}: ${blocker}`)),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepMorningLongFullDayUnresolvedDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_full_day_unresolved_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, fullDayComparisonPath, replayPackagePath },
    assumptions: {
      savedReportsOnly: true,
      usesSavedFullDayScannerArtifactBars: true,
      usesCompletedFiveMinuteBarsOnly: true,
      unresolvedRowsAreResearchNotesOnly: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      unresolvedRows: rows.length,
      noFillRows: rows.filter((row) => row.causeClass === 'no_fill').length,
      weakFollowThroughRows: rows.filter((row) => row.causeClass === 'weak_follow_through').length,
      nearT1UnresolvedRows: rows.filter((row) => row.causeClass === 'near_t1_unresolved').length,
      noStopNoTargetRows: rows.filter((row) => row.causeClass === 'no_stop_no_target').length,
      blockedRows: rows.filter((row) => row.causeClass === 'input_blocked').length,
      averageMfeR: average(rows.map((row) => row.mfeR)),
      averageMaeR: average(rows.map((row) => row.maeR)),
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : rows.some((row) => row.rankResearchAction === 'exclude_from_positive_rank_training') ? 'rerun_rank_without_unresolved_positives' : 'inspect_remaining_unresolved',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved comparison/replay inputs before using unresolved drilldown.']
      : [
          'Treat full-day unresolved rows as research notes, not positive rank-training evidence.',
          'Rerun Sweep morning LONG rank/no-chase diagnostics with resolved full-day outcomes separated from unresolved rows.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepMorningLongFullDayUnresolvedDrilldownReport({
    reportDir,
    fullDayComparisonPath: readFlag(args, '--full-day-comparison') || undefined,
    replayPackagePath: readFlag(args, '--replay-package') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-morning-long-full-day-unresolved-drilldown-${Date.now()}.json`);
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
