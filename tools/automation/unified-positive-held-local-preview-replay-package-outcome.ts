import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';

type Direction = 'LONG' | 'SHORT';

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface ModelSummary {
  setupType: string;
  rows: number;
  resolvedRows: number;
  unresolvedRows: number;
  blockedRows: number;
  grossResolvedOneMesPl: number | null;
}

interface DaySessionModelSummary extends ModelSummary {
  tradeDate: string;
  session: string;
}

export interface UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  proofTime: string;
  outcomeStatus: 'resolved' | 'unresolved' | 'blocked';
  outcomeLabel: 'stopped_before_t1' | 't1_hit_only' | 't1_and_t2_hit' | 'no_fill' | 'no_target_or_stop_hit' | 'blocked';
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  barsSource: 'scanner_decision_tape_completed_5m' | 'missing';
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
  intrabarAmbiguity: boolean;
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport {
  reportType: 'unified_positive_held_local_preview_replay_package_outcome';
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
    oneMesPointValue: 5;
    usesCompletedFiveMinuteBarsOnly: true;
    missingBarsAreNotInvented: true;
    sameBarStopAndTargetUsesConservativeStopFirst: true;
    outcomeIsResearchOnly: true;
    livePromotionAllowed: false;
  };
  summary: {
    packageRows: number;
    resolvedRows: number;
    unresolvedRows: number;
    blockedRows: number;
    noFillRows: number;
    stoppedBeforeT1Rows: number;
    t1OnlyRows: number;
    t1AndT2Rows: number;
    noTargetOrStopRows: number;
    grossResolvedOneMesPl: number | null;
    modelGroups: ModelSummary[];
    daySessionModelGroups: DaySessionModelSummary[];
    livePromotionAllowedRows: 0;
  };
  rows: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport['authority'] {
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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function loadDecisionTapeBars(sourceTapePath: string): OhlcBar[] {
  if (!fs.existsSync(sourceTapePath)) return [];
  const tape = readJson<Record<string, unknown>>(sourceTapePath);
  const byTime = new Map<string, OhlcBar>();
  for (const event of Object.values(asRecord(tape.events))) {
    const bar = normalizeBar(asRecord(event).completed5m);
    if (bar) byTime.set(bar.time, bar);
  }
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function crosses(row: Pick<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow, 'direction'>, bar: OhlcBar, level: number): boolean {
  return row.direction === 'LONG' ? bar.high >= level : bar.low <= level;
}

function hitsStop(row: Pick<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow, 'direction'>, bar: OhlcBar, stop: number): boolean {
  return row.direction === 'LONG' ? bar.low <= stop : bar.high >= stop;
}

function favorableMove(row: Pick<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow, 'direction'>, bar: OhlcBar, entry: number): number {
  return row.direction === 'LONG' ? bar.high - entry : entry - bar.low;
}

function adverseMove(row: Pick<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow, 'direction'>, bar: OhlcBar, entry: number): number {
  return row.direction === 'LONG' ? entry - bar.low : bar.high - entry;
}

function pointsToPl(direction: Direction, entry: number, exit: number): number {
  const points = direction === 'LONG' ? exit - entry : entry - exit;
  return round(points * POINT_VALUE);
}

function buildOutcomeRow(row: UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number]): UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow {
  const bars = loadDecisionTapeBars(row.sourceTapePath);
  const proofTime = normalizeTime(row.proofTime) || row.proofTime;
  const riskPoints = round(Math.abs(row.entry - row.stop));
  const barsAfterProof = bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime)).length;
  const blockers = [
    row.outcomeInputStatus !== 'ready_for_read_only_outcome_replay' ? `replay package status ${row.outcomeInputStatus}` : null,
    !fs.existsSync(row.sourceTapePath) ? 'missing scanner decision tape' : null,
    bars.length === 0 ? 'missing completed 5M bars from scanner decision tape' : null,
    barsAfterProof === 0 ? 'missing completed 5M bars at or after proof time' : null,
    !Number.isFinite(row.entry) ? 'missing entry' : null,
    !Number.isFinite(row.stop) ? 'missing stop' : null,
    !Number.isFinite(row.t1) ? 'missing T1' : null,
    !Number.isFinite(row.t2) ? 'missing T2' : null,
    riskPoints <= 0 ? 'missing positive entry-to-stop risk' : null,
  ].filter((item): item is string => Boolean(item));

  if (blockers.length) {
    return {
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      proofTime,
      outcomeStatus: 'blocked',
      outcomeLabel: 'blocked',
      entry: row.entry,
      stop: row.stop,
      t1: row.t1,
      t2: row.t2,
      riskPoints,
      barsSource: bars.length ? 'scanner_decision_tape_completed_5m' : 'missing',
      barsLoaded: bars.length,
      barsAfterProof,
      entryHitTime: null,
      firstReplayBarTime: null,
      stopHitTime: null,
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: null,
      maximumAdverseExcursion: null,
      resolvedOneMesPl: null,
      resolvedR: null,
      intrabarAmbiguity: false,
      blockers,
    };
  }

  const eligibleBars = bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime));
  const entryHitIndex = eligibleBars.findIndex((bar) => crosses(row, bar, row.entry));
  if (entryHitIndex < 0) {
    return {
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      proofTime,
      outcomeStatus: 'unresolved',
      outcomeLabel: 'no_fill',
      entry: row.entry,
      stop: row.stop,
      t1: row.t1,
      t2: row.t2,
      riskPoints,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: eligibleBars.length,
      barsAfterProof,
      entryHitTime: null,
      firstReplayBarTime: null,
      stopHitTime: null,
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: null,
      maximumAdverseExcursion: null,
      resolvedOneMesPl: null,
      resolvedR: null,
      intrabarAmbiguity: false,
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
  let intrabarAmbiguity = false;

  for (const bar of replayBars) {
    mfe = Math.max(mfe, favorableMove(row, bar, row.entry));
    mae = Math.max(mae, adverseMove(row, bar, row.entry));
    const stopHit = hitsStop(row, bar, row.stop);
    const t1Hit = crosses(row, bar, row.t1);
    const t2Hit = crosses(row, bar, row.t2);
    if (stopHit && (t1Hit || t2Hit)) intrabarAmbiguity = true;
    if (!stopHitTime && stopHit) stopHitTime = bar.time;
    if (!t1HitTime && t1Hit) t1HitTime = bar.time;
    if (!t2HitTime && t2Hit) t2HitTime = bar.time;
  }

  const stopBeforeT1 = Boolean(stopHitTime && (!t1HitTime || timeMs(stopHitTime) <= timeMs(t1HitTime)));
  const outcomeLabel: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow['outcomeLabel'] = stopBeforeT1
    ? 'stopped_before_t1'
    : t2HitTime
      ? 't1_and_t2_hit'
      : t1HitTime
        ? 't1_hit_only'
        : 'no_target_or_stop_hit';
  const exit = outcomeLabel === 'stopped_before_t1'
    ? row.stop
    : outcomeLabel === 't1_and_t2_hit'
      ? row.t2
      : outcomeLabel === 't1_hit_only'
        ? row.t1
        : null;
  const resolvedOneMesPl = exit === null ? null : pointsToPl(row.direction, row.entry, exit);
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction,
    proofTime,
    outcomeStatus: resolvedOneMesPl === null ? 'unresolved' : 'resolved',
    outcomeLabel,
    entry: row.entry,
    stop: row.stop,
    t1: row.t1,
    t2: row.t2,
    riskPoints,
    barsSource: 'scanner_decision_tape_completed_5m',
    barsLoaded: eligibleBars.length,
    barsAfterProof,
    entryHitTime,
    firstReplayBarTime: replayBars[0]?.time || null,
    stopHitTime,
    t1HitTime,
    t2HitTime,
    maximumFavorableExcursion: round(mfe),
    maximumAdverseExcursion: round(mae),
    resolvedOneMesPl,
    resolvedR: resolvedOneMesPl === null ? null : round(resolvedOneMesPl / (riskPoints * POINT_VALUE)),
    intrabarAmbiguity,
    blockers: [],
  };
}

function sumResolved(rows: Pick<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow, 'resolvedOneMesPl'>[]): number | null {
  const values = rows.map((row) => row.resolvedOneMesPl).filter((value): value is number => value !== null);
  return values.length ? round(values.reduce((sum, value) => sum + value, 0)) : null;
}

function modelGroups(rows: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow[]): ModelSummary[] {
  const grouped = new Map<string, UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow[]>();
  for (const row of rows) {
    grouped.set(row.setupType, [...(grouped.get(row.setupType) || []), row]);
  }
  return [...grouped.entries()]
    .map(([setupType, groupRows]) => ({
      setupType,
      rows: groupRows.length,
      resolvedRows: groupRows.filter((row) => row.outcomeStatus === 'resolved').length,
      unresolvedRows: groupRows.filter((row) => row.outcomeStatus === 'unresolved').length,
      blockedRows: groupRows.filter((row) => row.outcomeStatus === 'blocked').length,
      grossResolvedOneMesPl: sumResolved(groupRows),
    }))
    .sort((a, b) => a.setupType.localeCompare(b.setupType));
}

function daySessionModelGroups(rows: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow[]): DaySessionModelSummary[] {
  const grouped = new Map<string, UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow[]>();
  for (const row of rows) {
    const key = `${row.tradeDate}||${row.session}||${row.setupType}`;
    grouped.set(key, [...(grouped.get(key) || []), row]);
  }
  return [...grouped.entries()]
    .map(([key, groupRows]) => {
      const [tradeDate, session, setupType] = key.split('||');
      return {
        tradeDate,
        session,
        setupType,
        rows: groupRows.length,
        resolvedRows: groupRows.filter((row) => row.outcomeStatus === 'resolved').length,
        unresolvedRows: groupRows.filter((row) => row.outcomeStatus === 'unresolved').length,
        blockedRows: groupRows.filter((row) => row.outcomeStatus === 'blocked').length,
        grossResolvedOneMesPl: sumResolved(groupRows),
      };
    })
    .sort((a, b) => `${a.tradeDate}-${a.session}-${a.setupType}`.localeCompare(`${b.tradeDate}-${b.session}-${b.setupType}`));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Replay Package Outcome',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only completed-5M OHLC outcome replay. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change app runtime behavior, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Package rows: ${report.summary.packageRows}.`,
    `- Resolved rows: ${report.summary.resolvedRows}.`,
    `- Unresolved rows: ${report.summary.unresolvedRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- No-fill rows: ${report.summary.noFillRows}.`,
    `- Stopped before T1 rows: ${report.summary.stoppedBeforeT1Rows}.`,
    `- T1-only rows: ${report.summary.t1OnlyRows}.`,
    `- T1-and-T2 rows: ${report.summary.t1AndT2Rows}.`,
    `- No-target-or-stop rows: ${report.summary.noTargetOrStopRows}.`,
    `- Gross resolved one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? 'not available'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Model Groups',
    '| Setup | Rows | Resolved | Unresolved | Blocked | Gross Resolved One-MES P/L |',
    '|---|---:|---:|---:|---:|---:|',
    ...report.summary.modelGroups.map((row) => `| ${escapeTable(row.setupType)} | ${row.rows} | ${row.resolvedRows} | ${row.unresolvedRows} | ${row.blockedRows} | ${row.grossResolvedOneMesPl ?? '-'} |`),
    '',
    '## Day / Session / Model Groups',
    '| Date | Session | Setup | Rows | Resolved | Unresolved | Blocked | Gross Resolved One-MES P/L |',
    '|---|---|---|---:|---:|---:|---:|---:|',
    ...report.summary.daySessionModelGroups.map((row) => `| ${row.tradeDate} | ${escapeTable(row.session)} | ${escapeTable(row.setupType)} | ${row.rows} | ${row.resolvedRows} | ${row.unresolvedRows} | ${row.blockedRows} | ${row.grossResolvedOneMesPl ?? '-'} |`),
    '',
    '## Rows',
    '| Ticket | Date | Session | Setup | Side | Outcome | Entry Hit | Stop | T1 | T2 | P/L | R | MFE | MAE | Source | Blockers |',
    '|---|---|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${row.tradeDate} | ${escapeTable(row.session)} | ${escapeTable(row.setupType)} | ${row.direction} | ${row.outcomeLabel} | ${row.entryHitTime ?? '-'} | ${row.stopHitTime ?? '-'} | ${row.t1HitTime ?? '-'} | ${row.t2HitTime ?? '-'} | ${row.resolvedOneMesPl ?? '-'} | ${row.resolvedR ?? '-'} | ${row.maximumFavorableExcursion ?? '-'} | ${row.maximumAdverseExcursion ?? '-'} | ${row.barsSource} | ${escapeTable(row.blockers.join(', ') || '-')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport(args: {
  reportDir: string;
  replayPackagePath: string | null;
  replayPackageReport: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport {
  const packageRows = args.replayPackageReport?.rows || [];
  const rows = packageRows.map(buildOutcomeRow);
  const blockers = [
    !args.replayPackagePath ? 'missing replay package path' : null,
    !args.replayPackageReport ? 'missing replay package report' : null,
    args.replayPackageReport && args.replayPackageReport.status !== 'pass' ? `replay package status ${args.replayPackageReport.status}` : null,
    args.replayPackageReport && args.replayPackageReport.summary.livePromotionAllowedRows !== 0 ? `replay package has ${args.replayPackageReport.summary.livePromotionAllowedRows} live-promotion rows` : null,
    packageRows.length === 0 ? 'replay package has no rows' : null,
    ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.ticketId}: ${blocker}`)),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_replay_package_outcome',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      replayPackagePath: args.replayPackagePath,
    },
    assumptions: {
      oneMesPointValue: POINT_VALUE,
      usesCompletedFiveMinuteBarsOnly: true,
      missingBarsAreNotInvented: true,
      sameBarStopAndTargetUsesConservativeStopFirst: true,
      outcomeIsResearchOnly: true,
      livePromotionAllowed: false,
    },
    summary: {
      packageRows: packageRows.length,
      resolvedRows: rows.filter((row) => row.outcomeStatus === 'resolved').length,
      unresolvedRows: rows.filter((row) => row.outcomeStatus === 'unresolved').length,
      blockedRows: rows.filter((row) => row.outcomeStatus === 'blocked').length,
      noFillRows: rows.filter((row) => row.outcomeLabel === 'no_fill').length,
      stoppedBeforeT1Rows: rows.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
      t1OnlyRows: rows.filter((row) => row.outcomeLabel === 't1_hit_only').length,
      t1AndT2Rows: rows.filter((row) => row.outcomeLabel === 't1_and_t2_hit').length,
      noTargetOrStopRows: rows.filter((row) => row.outcomeLabel === 'no_target_or_stop_hit').length,
      grossResolvedOneMesPl: sumResolved(rows),
      modelGroups: modelGroups(rows),
      daySessionModelGroups: daySessionModelGroups(rows),
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use this outcome report for model-quality decisions until package blockers are cleared with local completed 5M evidence.']
      : ['Use this outcome report as research evidence only; source/proof validation must remain separate before any scanner-visible rank overlay expansion.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport(
  report: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-replay-package-outcome-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewReplayPackageOutcomeCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const replayPackagePath = readFlag(args, '--replay-package') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport({
    reportDir: outDir,
    replayPackagePath,
    replayPackageReport: replayPackagePath && fs.existsSync(replayPackagePath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageReport>(replayPackagePath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewReplayPackageOutcomeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
