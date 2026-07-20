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
  volume?: number;
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

interface UnresolvedTopRow {
  slateId: string;
  baselineTopTicketId: string | null;
  baselineTopOutcomeLabel: string | null;
}

interface UnresolvedTopReport {
  status?: string;
  rows?: UnresolvedTopRow[];
}

interface ExtendedOutcomeRow {
  ticketId: string;
  tradeDate: string;
  slateId: string;
  baselineOutcomeLabel: string | null;
  direction: Direction;
  proofTime: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
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
  extendedOutcomeStatus: 'resolved' | 'unresolved' | 'blocked';
  extendedOutcomeLabel: 'stopped_before_t1' | 't1_hit_only' | 't1_and_t2_hit' | 'no_fill' | 'no_target_or_stop_hit' | 'blocked';
  extendedOneMesPl: number | null;
  extendedR: number | null;
  sourceArtifactPath: string | null;
  blockers: string[];
}

export interface RawOhlcScannerArtifactSweepMorningLongExtendedHorizonOutcomeReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_extended_horizon_outcome';
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
    unresolvedTopDrilldownPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    usesSavedFullDayScannerArtifactBars: true;
    usesCompletedFiveMinuteBarsOnly: true;
    missingBarsAreNotInvented: true;
    sameBarStopAndTargetUsesConservativeStopFirst: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    targetRows: number;
    resolvedRows: number;
    unresolvedRows: number;
    blockedRows: number;
    convertedRows: number;
    grossExtendedOneMesPl: number | null;
    stillUnresolvedTicketIds: string[];
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'use_full_day_artifact_for_research_outcomes' | 'inspect_remaining_unresolved' | 'fix_inputs';
  };
  rows: ExtendedOutcomeRow[];
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
  const volume = numberOrNull(record.volume);
  return { time, open, high, low, close, ...(volume === null ? {} : { volume }) };
}

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
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

function stopIsDirectionallyValid(direction: Direction, entry: number, stop: number): boolean {
  return direction === 'LONG' ? stop < entry : stop > entry;
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

function pointsToPl(direction: Direction, entry: number, exit: number): number {
  const points = direction === 'LONG' ? exit - entry : entry - exit;
  return round(points * POINT_VALUE);
}

function artifactPathForTicket(reportDir: string, replayPackage: ReplayPackageReport | null, ticketId: string): string | null {
  const artifactBase = ticketId.split('|')[0];
  const explicit = replayPackage?.source?.artifactPaths?.find((artifactPath) => path.basename(artifactPath, '.json') === artifactBase);
  if (explicit && fs.existsSync(explicit)) return explicit;
  const fallback = path.join(reportDir, `${artifactBase}.json`);
  return fs.existsSync(fallback) ? fallback : null;
}

function buildExtendedRow(args: {
  reportDir: string;
  replayPackage: ReplayPackageReport | null;
  unresolvedTop: UnresolvedTopRow;
}): ExtendedOutcomeRow {
  const ticketId = args.unresolvedTop.baselineTopTicketId || '';
  const packageRow = args.replayPackage?.rows?.find((row) => row.ticketId === ticketId) || null;
  const artifactPath = ticketId ? artifactPathForTicket(args.reportDir, args.replayPackage, ticketId) : null;
  const bars = loadArtifactBars(artifactPath);
  const proofTime = normalizeTime(packageRow?.proofTime) || packageRow?.proofTime || '';
  const barsAfterProof = proofTime ? bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime)).length : 0;
  const blockers = [
    !ticketId ? 'missing baseline top ticket id' : null,
    !packageRow ? 'missing replay package row for top ticket' : null,
    !artifactPath ? 'missing matching full-day scanner artifact' : null,
    bars.length === 0 ? 'missing completed 5M bars from full-day scanner artifact' : null,
    !proofTime ? 'missing proof time' : null,
    packageRow && !Number.isFinite(packageRow.entry) ? 'missing entry' : null,
    packageRow && !Number.isFinite(packageRow.stop) ? 'missing stop' : null,
    packageRow && !Number.isFinite(packageRow.t1) ? 'missing T1' : null,
    packageRow && !Number.isFinite(packageRow.t2) ? 'missing T2' : null,
    packageRow && Number.isFinite(packageRow.entry) && Number.isFinite(packageRow.stop) && !stopIsDirectionallyValid(packageRow.direction, packageRow.entry, packageRow.stop)
      ? 'directionally invalid entry-to-stop geometry'
      : null,
    barsAfterProof === 0 ? 'missing full-day completed 5M bars at or after proof time' : null,
  ].filter((item): item is string => Boolean(item));

  if (blockers.length || !packageRow) {
    return {
      ticketId,
      tradeDate: packageRow?.tradeDate || args.unresolvedTop.slateId.split('|')[0] || '',
      slateId: args.unresolvedTop.slateId,
      baselineOutcomeLabel: args.unresolvedTop.baselineTopOutcomeLabel,
      direction: packageRow?.direction || 'LONG',
      proofTime,
      entry: packageRow?.entry || 0,
      stop: packageRow?.stop || 0,
      t1: packageRow?.t1 || 0,
      t2: packageRow?.t2 || 0,
      barsLoaded: bars.length,
      barsAfterProof,
      firstBarTime: bars[0]?.time || null,
      lastBarTime: bars[bars.length - 1]?.time || null,
      entryHitTime: null,
      stopHitTime: null,
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: null,
      maximumAdverseExcursion: null,
      extendedOutcomeStatus: 'blocked',
      extendedOutcomeLabel: 'blocked',
      extendedOneMesPl: null,
      extendedR: null,
      sourceArtifactPath: artifactPath,
      blockers,
    };
  }

  const eligibleBars = bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime));
  const entryHitIndex = eligibleBars.findIndex((bar) => crosses(packageRow.direction, bar, packageRow.entry));
  if (entryHitIndex < 0) {
    return {
      ticketId,
      tradeDate: packageRow.tradeDate,
      slateId: args.unresolvedTop.slateId,
      baselineOutcomeLabel: args.unresolvedTop.baselineTopOutcomeLabel,
      direction: packageRow.direction,
      proofTime,
      entry: packageRow.entry,
      stop: packageRow.stop,
      t1: packageRow.t1,
      t2: packageRow.t2,
      barsLoaded: bars.length,
      barsAfterProof,
      firstBarTime: bars[0]?.time || null,
      lastBarTime: bars[bars.length - 1]?.time || null,
      entryHitTime: null,
      stopHitTime: null,
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: null,
      maximumAdverseExcursion: null,
      extendedOutcomeStatus: 'unresolved',
      extendedOutcomeLabel: 'no_fill',
      extendedOneMesPl: null,
      extendedR: null,
      sourceArtifactPath: artifactPath,
      blockers: [],
    };
  }

  const entryHitTime = eligibleBars[entryHitIndex].time;
  const replayBars = eligibleBars.slice(entryHitIndex + 1);
  let stopHitTime: string | null = null;
  let t1HitTime: string | null = null;
  let t2HitTime: string | null = null;
  let mfe = 0;
  let mae = 0;
  for (const bar of replayBars) {
    mfe = Math.max(mfe, favorableMove(packageRow.direction, bar, packageRow.entry));
    mae = Math.max(mae, adverseMove(packageRow.direction, bar, packageRow.entry));
    if (!stopHitTime && hitsStop(packageRow.direction, bar, packageRow.stop)) stopHitTime = bar.time;
    if (!t1HitTime && crosses(packageRow.direction, bar, packageRow.t1)) t1HitTime = bar.time;
    if (!t2HitTime && crosses(packageRow.direction, bar, packageRow.t2)) t2HitTime = bar.time;
  }
  const stopBeforeT1 = Boolean(stopHitTime && (!t1HitTime || timeMs(stopHitTime) <= timeMs(t1HitTime)));
  const extendedOutcomeLabel: ExtendedOutcomeRow['extendedOutcomeLabel'] = stopBeforeT1
    ? 'stopped_before_t1'
    : t2HitTime
      ? 't1_and_t2_hit'
      : t1HitTime
        ? 't1_hit_only'
        : 'no_target_or_stop_hit';
  const exit = extendedOutcomeLabel === 'stopped_before_t1'
    ? packageRow.stop
    : extendedOutcomeLabel === 't1_and_t2_hit'
      ? packageRow.t2
      : extendedOutcomeLabel === 't1_hit_only'
        ? packageRow.t1
        : null;
  const riskPoints = Math.abs(packageRow.entry - packageRow.stop);
  const extendedOneMesPl = exit === null ? null : pointsToPl(packageRow.direction, packageRow.entry, exit);
  return {
    ticketId,
    tradeDate: packageRow.tradeDate,
    slateId: args.unresolvedTop.slateId,
    baselineOutcomeLabel: args.unresolvedTop.baselineTopOutcomeLabel,
    direction: packageRow.direction,
    proofTime,
    entry: packageRow.entry,
    stop: packageRow.stop,
    t1: packageRow.t1,
    t2: packageRow.t2,
    barsLoaded: bars.length,
    barsAfterProof,
    firstBarTime: bars[0]?.time || null,
    lastBarTime: bars[bars.length - 1]?.time || null,
    entryHitTime,
    stopHitTime,
    t1HitTime,
    t2HitTime,
    maximumFavorableExcursion: round(mfe),
    maximumAdverseExcursion: round(mae),
    extendedOutcomeStatus: extendedOneMesPl === null ? 'unresolved' : 'resolved',
    extendedOutcomeLabel,
    extendedOneMesPl,
    extendedR: extendedOneMesPl === null ? null : round(extendedOneMesPl / (riskPoints * POINT_VALUE)),
    sourceArtifactPath: artifactPath,
    blockers: [],
  };
}

function authority(): RawOhlcScannerArtifactSweepMorningLongExtendedHorizonOutcomeReport['authority'] {
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

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepMorningLongExtendedHorizonOutcomeReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Morning LONG Extended-Horizon Outcome',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only full-day scanner artifact outcome replay. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Target rows: ${report.summary.targetRows}.`,
    `- Resolved/unresolved/blocked: ${report.summary.resolvedRows} / ${report.summary.unresolvedRows} / ${report.summary.blockedRows}.`,
    `- Converted rows: ${report.summary.convertedRows}.`,
    `- Gross extended one-MES P/L: ${report.summary.grossExtendedOneMesPl ?? '-'}.`,
    `- Still unresolved: ${report.summary.stillUnresolvedTicketIds.length ? report.summary.stillUnresolvedTicketIds.join(', ') : 'none'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    ...report.rows.map((row) => `- ${row.slateId}: ${row.baselineOutcomeLabel || '-'} -> ${row.extendedOutcomeLabel}; P/L ${row.extendedOneMesPl ?? '-'}; proof ${row.proofTime}; bars ${row.barsAfterProof}; last ${row.lastBarTime || '-'}.`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepMorningLongExtendedHorizonOutcomeReport(args: {
  reportDir?: string;
  replayPackagePath?: string | null;
  unresolvedTopDrilldownPath?: string | null;
  replayPackage?: ReplayPackageReport | null;
  unresolvedTopDrilldown?: UnresolvedTopReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepMorningLongExtendedHorizonOutcomeReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const replayPackagePath = args.replayPackagePath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-broader-daily-replay-package-');
  const unresolvedTopDrilldownPath = args.unresolvedTopDrilldownPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-sweep-morning-long-unresolved-top-slate-drilldown-');
  const replayPackage = args.replayPackage ?? readJson<ReplayPackageReport>(replayPackagePath);
  const unresolvedTopDrilldown = args.unresolvedTopDrilldown ?? readJson<UnresolvedTopReport>(unresolvedTopDrilldownPath);
  const targetRows = unresolvedTopDrilldown?.rows || [];
  const rows = targetRows.map((row) => buildExtendedRow({ reportDir, replayPackage, unresolvedTop: row }));
  const blockers = [
    !replayPackagePath && !args.replayPackage ? 'missing replay package path' : null,
    !unresolvedTopDrilldownPath && !args.unresolvedTopDrilldown ? 'missing unresolved top drilldown path' : null,
    !replayPackage ? 'missing replay package report' : null,
    !unresolvedTopDrilldown ? 'missing unresolved top drilldown report' : null,
    replayPackage && replayPackage.status !== 'pass' ? `replay package status ${replayPackage.status}` : null,
    unresolvedTopDrilldown && unresolvedTopDrilldown.status !== 'pass' ? `unresolved top drilldown status ${unresolvedTopDrilldown.status}` : null,
    targetRows.length === 0 ? 'unresolved top drilldown has no rows' : null,
    ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.ticketId}: ${blocker}`)),
  ].filter((item): item is string => Boolean(item));
  const convertedRows = rows.filter((row) => row.baselineOutcomeLabel !== row.extendedOutcomeLabel && row.extendedOutcomeStatus === 'resolved').length;
  const stillUnresolved = rows.filter((row) => row.extendedOutcomeStatus === 'unresolved').map((row) => row.ticketId);
  const base: Omit<RawOhlcScannerArtifactSweepMorningLongExtendedHorizonOutcomeReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_extended_horizon_outcome',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, replayPackagePath, unresolvedTopDrilldownPath },
    assumptions: {
      savedReportsOnly: true,
      usesSavedFullDayScannerArtifactBars: true,
      usesCompletedFiveMinuteBarsOnly: true,
      missingBarsAreNotInvented: true,
      sameBarStopAndTargetUsesConservativeStopFirst: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      targetRows: rows.length,
      resolvedRows: rows.filter((row) => row.extendedOutcomeStatus === 'resolved').length,
      unresolvedRows: rows.filter((row) => row.extendedOutcomeStatus === 'unresolved').length,
      blockedRows: rows.filter((row) => row.extendedOutcomeStatus === 'blocked').length,
      convertedRows,
      grossExtendedOneMesPl: sum(rows.map((row) => row.extendedOneMesPl)),
      stillUnresolvedTicketIds: stillUnresolved,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length
        ? 'fix_inputs'
        : stillUnresolved.length
          ? 'inspect_remaining_unresolved'
          : 'use_full_day_artifact_for_research_outcomes',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved replay/drilldown inputs before extended-horizon outcome replay.']
      : stillUnresolved.length
        ? ['Use full-day scanner artifacts for research outcomes and inspect the remaining unresolved ticket separately.']
        : ['Use full-day scanner artifacts for research outcomes before making ranking conclusions.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepMorningLongExtendedHorizonOutcomeReport({
    reportDir,
    replayPackagePath: readFlag(args, '--replay-package') || undefined,
    unresolvedTopDrilldownPath: readFlag(args, '--unresolved-top-drilldown') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-morning-long-extended-horizon-outcome-${Date.now()}.json`);
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
