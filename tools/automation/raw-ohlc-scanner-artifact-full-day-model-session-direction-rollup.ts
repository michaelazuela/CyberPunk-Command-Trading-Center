import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type OutcomeLabel = 'stopped_before_t1' | 't1_hit_only' | 't1_and_t2_hit' | 'no_fill' | 'no_target_or_stop_hit' | 'blocked';

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

interface OutcomeRow extends ReplayPackageRow {
  outcomeStatus: 'resolved' | 'unresolved' | 'blocked';
  outcomeLabel: OutcomeLabel;
  riskPoints: number;
  barsLoaded: number;
  barsAfterProof: number;
  entryHitTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  maximumFavorableExcursion: number | null;
  maximumAdverseExcursion: number | null;
  resolvedOneMesPl: number | null;
  resolvedR: number | null;
  sourceArtifactPath: string | null;
  blockers: string[];
}

interface RollupRow {
  groupId: string;
  setupType: string;
  session: string;
  direction: Direction;
  rows: number;
  resolvedRows: number;
  unresolvedRows: number;
  blockedRows: number;
  winnerRows: number;
  problemRows: number;
  stoppedRows: number;
  noFillRows: number;
  noTargetOrStopRows: number;
  grossResolvedOneMesPl: number;
  winnerRate: number;
  problemRate: number;
  averageMfeR: number | null;
  averageMaeR: number | null;
  researchPriority: 'weak_pocket' | 'strong_pocket' | 'mixed_watch';
}

export interface RawOhlcScannerArtifactFullDayModelSessionDirectionRollupReport {
  reportType: 'raw_ohlc_scanner_artifact_full_day_model_session_direction_rollup';
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
  };
  assumptions: {
    savedReportsOnly: true;
    usesSavedFullDayScannerArtifactBars: true;
    usesCompletedFiveMinuteBarsOnly: true;
    repeatedRowsAreResearchRowsNotIndependentLiveTrades: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    replayRows: number;
    resolvedRows: number;
    unresolvedRows: number;
    blockedRows: number;
    groups: number;
    grossResolvedOneMesPl: number | null;
    weakestGroupId: string | null;
    weakestProblemRate: number;
    strongestGroupId: string | null;
    strongestGrossResolvedOneMesPl: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'focus_weakest_model_session_direction' | 'mine_strongest_model_session_direction' | 'fix_inputs';
  };
  rollupRows: RollupRow[];
  rows: OutcomeRow[];
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

function average(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length) : null;
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

function buildOutcomeRow(reportDir: string, replayPackage: ReplayPackageReport | null, row: ReplayPackageRow): OutcomeRow {
  const artifactPath = artifactPathForTicket(reportDir, replayPackage, row.ticketId);
  const bars = loadArtifactBars(artifactPath);
  const proofTime = normalizeTime(row.proofTime) || row.proofTime;
  const riskPoints = round(Math.abs(row.entry - row.stop));
  const barsAfterProof = bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime)).length;
  const blockers = [
    !artifactPath ? 'missing matching full-day scanner artifact' : null,
    bars.length === 0 ? 'missing completed 5M bars from full-day scanner artifact' : null,
    barsAfterProof === 0 ? 'missing full-day completed 5M bars at or after proof time' : null,
    !Number.isFinite(row.entry) ? 'missing entry' : null,
    !Number.isFinite(row.stop) ? 'missing stop' : null,
    !Number.isFinite(row.t1) ? 'missing T1' : null,
    !Number.isFinite(row.t2) ? 'missing T2' : null,
    riskPoints <= 0 ? 'missing positive entry-to-stop risk' : null,
    Number.isFinite(row.entry) && Number.isFinite(row.stop) && !stopIsDirectionallyValid(row.direction, row.entry, row.stop)
      ? 'directionally invalid entry-to-stop geometry'
      : null,
  ].filter((item): item is string => Boolean(item));
  if (blockers.length) {
    return { ...row, proofTime, outcomeStatus: 'blocked', outcomeLabel: 'blocked', riskPoints, barsLoaded: bars.length, barsAfterProof, entryHitTime: null, stopHitTime: null, t1HitTime: null, t2HitTime: null, maximumFavorableExcursion: null, maximumAdverseExcursion: null, resolvedOneMesPl: null, resolvedR: null, sourceArtifactPath: artifactPath, blockers };
  }
  const eligibleBars = bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime));
  const entryHitIndex = eligibleBars.findIndex((bar) => crosses(row.direction, bar, row.entry));
  if (entryHitIndex < 0) {
    return { ...row, proofTime, outcomeStatus: 'unresolved', outcomeLabel: 'no_fill', riskPoints, barsLoaded: bars.length, barsAfterProof, entryHitTime: null, stopHitTime: null, t1HitTime: null, t2HitTime: null, maximumFavorableExcursion: null, maximumAdverseExcursion: null, resolvedOneMesPl: null, resolvedR: null, sourceArtifactPath: artifactPath, blockers: [] };
  }
  const entryHitTime = eligibleBars[entryHitIndex].time;
  let stopHitTime: string | null = null;
  let t1HitTime: string | null = null;
  let t2HitTime: string | null = null;
  let mfe = 0;
  let mae = 0;
  for (const bar of eligibleBars.slice(entryHitIndex + 1)) {
    mfe = Math.max(mfe, favorableMove(row.direction, bar, row.entry));
    mae = Math.max(mae, adverseMove(row.direction, bar, row.entry));
    if (!stopHitTime && hitsStop(row.direction, bar, row.stop)) stopHitTime = bar.time;
    if (!t1HitTime && crosses(row.direction, bar, row.t1)) t1HitTime = bar.time;
    if (!t2HitTime && crosses(row.direction, bar, row.t2)) t2HitTime = bar.time;
  }
  const stopBeforeT1 = Boolean(stopHitTime && (!t1HitTime || timeMs(stopHitTime) <= timeMs(t1HitTime)));
  const outcomeLabel: OutcomeLabel = stopBeforeT1
    ? 'stopped_before_t1'
    : t2HitTime
      ? 't1_and_t2_hit'
      : t1HitTime
        ? 't1_hit_only'
        : 'no_target_or_stop_hit';
  const exit = outcomeLabel === 'stopped_before_t1' ? row.stop : outcomeLabel === 't1_and_t2_hit' ? row.t2 : outcomeLabel === 't1_hit_only' ? row.t1 : null;
  const resolvedOneMesPl = exit === null ? null : pointsToPl(row.direction, row.entry, exit);
  return { ...row, proofTime, outcomeStatus: resolvedOneMesPl === null ? 'unresolved' : 'resolved', outcomeLabel, riskPoints, barsLoaded: bars.length, barsAfterProof, entryHitTime, stopHitTime, t1HitTime, t2HitTime, maximumFavorableExcursion: round(mfe), maximumAdverseExcursion: round(mae), resolvedOneMesPl, resolvedR: resolvedOneMesPl === null ? null : round(resolvedOneMesPl / (riskPoints * POINT_VALUE)), sourceArtifactPath: artifactPath, blockers: [] };
}

function isWinner(row: OutcomeRow): boolean {
  return row.outcomeStatus === 'resolved' && (row.resolvedOneMesPl ?? 0) > 0;
}

function isProblem(row: OutcomeRow): boolean {
  return row.outcomeLabel === 'stopped_before_t1' || row.outcomeLabel === 'no_fill' || row.outcomeLabel === 'no_target_or_stop_hit';
}

function priority(row: RollupRow): RollupRow['researchPriority'] {
  if (row.rows >= 20 && row.problemRate >= 0.5) return 'weak_pocket';
  if (row.rows >= 20 && row.winnerRate >= 0.7 && row.grossResolvedOneMesPl > 0) return 'strong_pocket';
  return 'mixed_watch';
}

function rollup(rows: OutcomeRow[]): RollupRow[] {
  const groups = new Map<string, OutcomeRow[]>();
  for (const row of rows) {
    const key = `${row.setupType}|${row.session}|${row.direction}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()].map(([groupId, groupRows]) => {
    const [setupType, session, direction] = groupId.split('|') as [string, string, Direction];
    const base: RollupRow = {
      groupId,
      setupType,
      session,
      direction,
      rows: groupRows.length,
      resolvedRows: groupRows.filter((row) => row.outcomeStatus === 'resolved').length,
      unresolvedRows: groupRows.filter((row) => row.outcomeStatus === 'unresolved').length,
      blockedRows: groupRows.filter((row) => row.outcomeStatus === 'blocked').length,
      winnerRows: groupRows.filter(isWinner).length,
      problemRows: groupRows.filter(isProblem).length,
      stoppedRows: groupRows.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
      noFillRows: groupRows.filter((row) => row.outcomeLabel === 'no_fill').length,
      noTargetOrStopRows: groupRows.filter((row) => row.outcomeLabel === 'no_target_or_stop_hit').length,
      grossResolvedOneMesPl: sum(groupRows.map((row) => row.resolvedOneMesPl)) || 0,
      winnerRate: round(groupRows.filter(isWinner).length / groupRows.length),
      problemRate: round(groupRows.filter(isProblem).length / groupRows.length),
      averageMfeR: average(groupRows.map((row) => row.maximumFavorableExcursion === null ? null : row.maximumFavorableExcursion / row.riskPoints)),
      averageMaeR: average(groupRows.map((row) => row.maximumAdverseExcursion === null ? null : row.maximumAdverseExcursion / row.riskPoints)),
      researchPriority: 'mixed_watch',
    };
    return { ...base, researchPriority: priority(base) };
  }).sort((a, b) => (
    Number(b.researchPriority === 'weak_pocket') - Number(a.researchPriority === 'weak_pocket')
    || Number(b.researchPriority === 'strong_pocket') - Number(a.researchPriority === 'strong_pocket')
    || b.problemRate - a.problemRate
    || b.grossResolvedOneMesPl - a.grossResolvedOneMesPl
    || a.groupId.localeCompare(b.groupId)
  ));
}

function authority(): RawOhlcScannerArtifactFullDayModelSessionDirectionRollupReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactFullDayModelSessionDirectionRollupReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Full-Day Model/Session/Direction Rollup',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-artifact full-day outcome rollup. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Replay rows: ${report.summary.replayRows}.`,
    `- Resolved/unresolved/blocked rows: ${report.summary.resolvedRows} / ${report.summary.unresolvedRows} / ${report.summary.blockedRows}.`,
    `- Groups: ${report.summary.groups}.`,
    `- Gross resolved one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? '-'}.`,
    `- Weakest group: ${report.summary.weakestGroupId || 'none'} at problem rate ${report.summary.weakestProblemRate}.`,
    `- Strongest group: ${report.summary.strongestGroupId || 'none'} at gross P/L ${report.summary.strongestGrossResolvedOneMesPl}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Groups',
    ...report.rollupRows.map((row) => `- ${row.groupId}: rows ${row.rows}; winners/problems/unresolved ${row.winnerRows}/${row.problemRows}/${row.unresolvedRows}; P/L ${row.grossResolvedOneMesPl}; priority ${row.researchPriority}.`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactFullDayModelSessionDirectionRollupReport(args: {
  reportDir?: string;
  replayPackagePath?: string | null;
  replayPackage?: ReplayPackageReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactFullDayModelSessionDirectionRollupReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const replayPackagePath = args.replayPackagePath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-broader-daily-replay-package-');
  const replayPackage = args.replayPackage ?? readJson<ReplayPackageReport>(replayPackagePath);
  const rows = (replayPackage?.rows || []).map((row) => buildOutcomeRow(reportDir, replayPackage, row));
  const rollupRows = rollup(rows);
  const weakPocket = rollupRows.find((row) => row.researchPriority === 'weak_pocket') || null;
  const weakest = rollupRows.filter((row) => row.rows >= 20).sort((a, b) => b.problemRate - a.problemRate)[0] || null;
  const strongest = [...rollupRows].sort((a, b) => b.grossResolvedOneMesPl - a.grossResolvedOneMesPl)[0] || null;
  const blockers = [
    !replayPackagePath && !args.replayPackage ? 'missing replay package path' : null,
    !replayPackage ? 'missing replay package report' : null,
    replayPackage && replayPackage.status !== 'pass' ? `replay package status ${replayPackage.status}` : null,
    rows.length === 0 ? 'replay package has no rows' : null,
    ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.ticketId}: ${blocker}`)),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactFullDayModelSessionDirectionRollupReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_full_day_model_session_direction_rollup',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, replayPackagePath },
    assumptions: {
      savedReportsOnly: true,
      usesSavedFullDayScannerArtifactBars: true,
      usesCompletedFiveMinuteBarsOnly: true,
      repeatedRowsAreResearchRowsNotIndependentLiveTrades: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      replayRows: rows.length,
      resolvedRows: rows.filter((row) => row.outcomeStatus === 'resolved').length,
      unresolvedRows: rows.filter((row) => row.outcomeStatus === 'unresolved').length,
      blockedRows: rows.filter((row) => row.outcomeStatus === 'blocked').length,
      groups: rollupRows.length,
      grossResolvedOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      weakestGroupId: weakest?.groupId || null,
      weakestProblemRate: weakest?.problemRate || 0,
      strongestGroupId: strongest?.groupId || null,
      strongestGrossResolvedOneMesPl: strongest?.grossResolvedOneMesPl || 0,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : weakPocket ? 'focus_weakest_model_session_direction' : 'mine_strongest_model_session_direction',
    },
    rollupRows,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved replay/artifact inputs before using full-day model/session rollup.']
      : [
          'Use this full-day rollup only to choose the next narrow research target; it is not a rank consumer.',
          weakPocket ? `Next drill into weak group ${weakPocket.groupId} before any live-facing proposal.` : strongest ? `Next mine strongest group ${strongest.groupId} for a stable no-lookahead separator.` : 'No group target found.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactFullDayModelSessionDirectionRollupReport({
    reportDir,
    replayPackagePath: readFlag(args, '--replay-package') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-full-day-model-session-direction-rollup-${Date.now()}.json`);
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
