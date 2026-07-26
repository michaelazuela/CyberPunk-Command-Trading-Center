import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Direction = 'LONG' | 'SHORT';

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

interface BaselineOutcomeRow {
  ticketId: string;
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
}

interface BaselineOutcomeReport {
  status?: string;
  source?: { replayPackagePath?: string | null };
  rows?: BaselineOutcomeRow[];
}

interface ComparisonRow {
  ticketId: string;
  tradeDate: string;
  proofTime: string;
  baselineOutcomeLabel: string | null;
  fullDayOutcomeLabel: string;
  baselineOneMesPl: number | null;
  fullDayOneMesPl: number | null;
  labelChanged: boolean;
  plDelta: number | null;
  barsAfterProof: number;
  sourceArtifactPath: string | null;
}

export interface RawOhlcScannerArtifactSweepMorningLongFullDayOutcomeComparisonReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_full_day_outcome_comparison';
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
    replayPackagePath: string | null;
    baselineOutcomePath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    usesSavedFullDayScannerArtifactBars: true;
    usesCompletedFiveMinuteBarsOnly: true;
    outcomesUsedForResearchComparisonOnly: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    comparedRows: number;
    labelChangedRows: number;
    baselineResolvedRows: number;
    fullDayResolvedRows: number;
    baselineGrossOneMesPl: number | null;
    fullDayGrossOneMesPl: number | null;
    grossDeltaOneMesPl: number | null;
    fullDayUnresolvedRows: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'rerun_rank_research_with_full_day_outcomes' | 'inspect_inputs' | 'fix_inputs';
  };
  rows: ComparisonRow[];
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

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
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

function artifactPathForTicket(reportDir: string, replayPackage: ReplayPackageReport | null, ticketId: string): string | null {
  const artifactBase = ticketId.split('|')[0];
  const explicit = replayPackage?.source?.artifactPaths?.find((artifactPath) => path.basename(artifactPath, '.json') === artifactBase);
  if (explicit && fs.existsSync(explicit)) return explicit;
  const fallback = path.join(reportDir, `${artifactBase}.json`);
  return fs.existsSync(fallback) ? fallback : null;
}

function crosses(direction: Direction, bar: OhlcBar, level: number): boolean {
  return direction === 'LONG' ? bar.high >= level : bar.low <= level;
}

function hitsStop(direction: Direction, bar: OhlcBar, stop: number): boolean {
  return direction === 'LONG' ? bar.low <= stop : bar.high >= stop;
}

function fullDayOutcome(row: ReplayPackageRow, bars: OhlcBar[]): { label: string; pl: number | null; barsAfterProof: number } {
  const eligible = bars.filter((bar) => timeMs(bar.time) >= timeMs(row.proofTime));
  const entryIndex = eligible.findIndex((bar) => crosses(row.direction, bar, row.entry));
  if (entryIndex < 0) return { label: 'no_fill', pl: null, barsAfterProof: eligible.length };
  const replay = eligible.slice(entryIndex + 1);
  let stopHitTime: string | null = null;
  let t1HitTime: string | null = null;
  let t2HitTime: string | null = null;
  for (const bar of replay) {
    if (!stopHitTime && hitsStop(row.direction, bar, row.stop)) stopHitTime = bar.time;
    if (!t1HitTime && crosses(row.direction, bar, row.t1)) t1HitTime = bar.time;
    if (!t2HitTime && crosses(row.direction, bar, row.t2)) t2HitTime = bar.time;
  }
  const stopBeforeT1 = Boolean(stopHitTime && (!t1HitTime || timeMs(stopHitTime) <= timeMs(t1HitTime)));
  const label = stopBeforeT1
    ? 'stopped_before_t1'
    : t2HitTime
      ? 't1_and_t2_hit'
      : t1HitTime
        ? 't1_hit_only'
        : 'no_target_or_stop_hit';
  const exit = label === 'stopped_before_t1' ? row.stop : label === 't1_and_t2_hit' ? row.t2 : label === 't1_hit_only' ? row.t1 : null;
  if (exit === null) return { label, pl: null, barsAfterProof: eligible.length };
  const points = row.direction === 'LONG' ? exit - row.entry : row.entry - exit;
  return { label, pl: round(points * POINT_VALUE), barsAfterProof: eligible.length };
}

function authority(): RawOhlcScannerArtifactSweepMorningLongFullDayOutcomeComparisonReport['authority'] {
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

function buildRows(args: {
  reportDir: string;
  replayPackage: ReplayPackageReport | null;
  baselineOutcome: BaselineOutcomeReport | null;
}): ComparisonRow[] {
  const baselineByTicket = new Map((args.baselineOutcome?.rows || []).map((row) => [row.ticketId, row]));
  return (args.replayPackage?.rows || [])
    .filter((row) => row.setupType === 'NoInstalledSetup' && row.session === 'morning' && row.direction === 'LONG')
    .map((row) => {
      const artifactPath = artifactPathForTicket(args.reportDir, args.replayPackage, row.ticketId);
      const fullDay = fullDayOutcome(row, loadArtifactBars(artifactPath));
      const baseline = baselineByTicket.get(row.ticketId) || null;
      return {
        ticketId: row.ticketId,
        tradeDate: row.tradeDate,
        proofTime: row.proofTime,
        baselineOutcomeLabel: baseline?.outcomeLabel || null,
        fullDayOutcomeLabel: fullDay.label,
        baselineOneMesPl: baseline?.resolvedOneMesPl ?? null,
        fullDayOneMesPl: fullDay.pl,
        labelChanged: baseline?.outcomeLabel !== fullDay.label,
        plDelta: typeof baseline?.resolvedOneMesPl === 'number' && typeof fullDay.pl === 'number' ? round(fullDay.pl - baseline.resolvedOneMesPl) : null,
        barsAfterProof: fullDay.barsAfterProof,
        sourceArtifactPath: artifactPath,
      };
    });
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepMorningLongFullDayOutcomeComparisonReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Morning LONG Full-Day Outcome Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-artifact outcome comparison. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Compared rows: ${report.summary.comparedRows}.`,
    `- Label-changed rows: ${report.summary.labelChangedRows}.`,
    `- Baseline/full-day resolved rows: ${report.summary.baselineResolvedRows} / ${report.summary.fullDayResolvedRows}.`,
    `- Baseline/full-day gross one-MES P/L: ${report.summary.baselineGrossOneMesPl ?? '-'} / ${report.summary.fullDayGrossOneMesPl ?? '-'}.`,
    `- Gross delta: ${report.summary.grossDeltaOneMesPl ?? '-'}.`,
    `- Full-day unresolved rows: ${report.summary.fullDayUnresolvedRows}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepMorningLongFullDayOutcomeComparisonReport(args: {
  reportDir?: string;
  replayPackagePath?: string | null;
  baselineOutcomePath?: string | null;
  replayPackage?: ReplayPackageReport | null;
  baselineOutcome?: BaselineOutcomeReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepMorningLongFullDayOutcomeComparisonReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const baselineOutcomePath = args.baselineOutcomePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-outcome-');
  const baselineOutcome = args.baselineOutcome ?? readJson<BaselineOutcomeReport>(baselineOutcomePath);
  const replayPackagePath = args.replayPackagePath ?? baselineOutcome?.source?.replayPackagePath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-broader-daily-replay-package-');
  const replayPackage = args.replayPackage ?? readJson<ReplayPackageReport>(replayPackagePath);
  const rows = buildRows({ reportDir, replayPackage, baselineOutcome });
  const blockers = [
    !replayPackagePath && !args.replayPackage ? 'missing replay package path' : null,
    !baselineOutcomePath && !args.baselineOutcome ? 'missing baseline outcome path' : null,
    !replayPackage ? 'missing replay package report' : null,
    !baselineOutcome ? 'missing baseline outcome report' : null,
    replayPackage && replayPackage.status !== 'pass' ? `replay package status ${replayPackage.status}` : null,
    baselineOutcome && baselineOutcome.status !== 'pass' ? `baseline outcome status ${baselineOutcome.status}` : null,
    rows.length === 0 ? 'no NoInstalledSetup morning LONG rows found' : null,
    rows.some((row) => !row.sourceArtifactPath) ? 'one or more rows missing full-day scanner artifact path' : null,
  ].filter((item): item is string => Boolean(item));
  const baselineGross = sum(rows.map((row) => row.baselineOneMesPl));
  const fullDayGross = sum(rows.map((row) => row.fullDayOneMesPl));
  const base: Omit<RawOhlcScannerArtifactSweepMorningLongFullDayOutcomeComparisonReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_full_day_outcome_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, replayPackagePath, baselineOutcomePath },
    assumptions: {
      savedReportsOnly: true,
      usesSavedFullDayScannerArtifactBars: true,
      usesCompletedFiveMinuteBarsOnly: true,
      outcomesUsedForResearchComparisonOnly: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      comparedRows: rows.length,
      labelChangedRows: rows.filter((row) => row.labelChanged).length,
      baselineResolvedRows: rows.filter((row) => row.baselineOneMesPl !== null).length,
      fullDayResolvedRows: rows.filter((row) => row.fullDayOneMesPl !== null).length,
      baselineGrossOneMesPl: baselineGross,
      fullDayGrossOneMesPl: fullDayGross,
      grossDeltaOneMesPl: typeof baselineGross === 'number' && typeof fullDayGross === 'number' ? round(fullDayGross - baselineGross) : null,
      fullDayUnresolvedRows: rows.filter((row) => row.fullDayOneMesPl === null).length,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : rows.some((row) => row.labelChanged) ? 'rerun_rank_research_with_full_day_outcomes' : 'inspect_inputs',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved replay/outcome inputs before full-day outcome comparison.']
      : ['Rerun downstream Sweep morning LONG rank/model research with full-day saved artifact outcomes before changing rank behavior.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepMorningLongFullDayOutcomeComparisonReport({
    reportDir,
    replayPackagePath: readFlag(args, '--replay-package') || undefined,
    baselineOutcomePath: readFlag(args, '--baseline-outcome') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-morning-long-full-day-outcome-comparison-${Date.now()}.json`);
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
