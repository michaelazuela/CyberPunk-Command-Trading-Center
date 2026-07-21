import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TIME_WINDOWS } from '../../src/config/timeWindows';

type Direction = 'LONG' | 'SHORT';
type OutcomeBucket = 'winner' | 'loss' | 'unresolved' | 'blocked';
type OutcomeLabel = 't1_and_t2_hit' | 't1_hit_only' | 'stopped_before_t1' | 'no_fill' | 'no_target_or_stop_hit' | 'blocked';

interface Bar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TimeframeStory {
  timeframe: string;
  sufficiency: string;
  shortContext?: string;
  recentTrend?: string;
  entryRangePercentile?: number | null;
}

interface SlateStory {
  slateKey: string;
  selectedTicketId: string;
  tradeDate: string;
  proofTime: string;
  direction: Direction;
  riskBand: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  outcomeBucket: OutcomeBucket;
  outcomeLabel: OutcomeLabel;
  oneMesPl: number | null;
  mfeR: number | null;
  maeR: number | null;
  sweepCollision: boolean;
  htfCollisionFromSlate: boolean;
  session: {
    openingDriveDirection?: string;
    sweptNyPremarketHigh?: boolean;
    brokeNyPremarketLow?: boolean;
    entryInEthPercentile?: number | null;
  };
  timeframeStories: TimeframeStory[];
  tactical15m60mContextVerdict: string;
  storyVerdict: string;
}

interface HtfStoryReport {
  reportType?: string;
  source?: {
    htfSourcePath?: string | null;
  };
  slateStories?: SlateStory[];
}

interface HtfSourceReport {
  reportType?: string;
  bars?: {
    '5m'?: Bar[];
  };
}

interface CorrectedOutcome {
  bucket: OutcomeBucket;
  label: OutcomeLabel;
  oneMesPl: number | null;
  resolvedR: number | null;
  entryHitTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  mfeR: number | null;
  maeR: number | null;
}

interface CloseoutRow extends CorrectedOutcome {
  ticketId: string;
  tradeDate: string;
  session: 'morning';
  setupType: 'OpeningDriveFvgContinuation';
  direction: Direction;
  riskBand: string;
  proofTime: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  originalBucket: OutcomeBucket;
  originalLabel: OutcomeLabel;
  originalOneMesPl: number | null;
  originalMfeR: number | null;
  originalMaeR: number | null;
  labelChanged: boolean;
  plChanged: boolean;
  plDelta: number | null;
  sweepCollision: boolean;
  htfCollisionFromSlate: boolean;
  storyVerdict: string;
  tactical15m60mContextVerdict: string;
  htfSufficiency: string;
  htfSupportCount: number;
  htfCautionCount: number;
  openingDriveDirection: string | null;
  sweptNyPremarketHigh: boolean;
  brokeNyPremarketLow: boolean;
  entryInEthPercentile: number | null;
  correctionReason: string | null;
}

interface GroupSummary {
  key: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  noFills: number;
  correctedOneMesPl: number | null;
  originalOneMesPl: number | null;
  plDelta: number | null;
  winRateResolved: number | null;
  averageRiskPoints: number | null;
}

export interface OpeningDriveCorrectedOutcomeCloseoutReport {
  reportType: 'unified_positive_held_local_preview_openingdrive_corrected_outcome_closeout';
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
    livePromotionAllowed: false;
  };
  source: {
    htfStoryReportPath: string | null;
    htfSourcePath: string | null;
  };
  assumptions: {
    dateRange: '2026-06-01_to_2026-07-02';
    model: 'OpeningDriveFvgContinuation';
    overlapRequired: 'SweepMssFvgRetrace_collision';
    usesCompletedFiveMinuteBarsOnly: true;
    entryFillEligibleFromProofBar: true;
    outcomeEvaluationEndsAtMorningWindowClose: true;
    targetStopEvaluationStartsAfterEntryBar: true;
    sameBarStopAndTargetUsesConservativeStopFirst: true;
    htfContextIsContextOnly: true;
    outputIsResearchOnly: true;
  };
  summary: {
    sourceSlates: number;
    targetRows: number;
    originalWinners: number;
    originalLosses: number;
    originalUnresolved: number;
    originalNoFills: number;
    correctedWinners: number;
    correctedLosses: number;
    correctedUnresolved: number;
    correctedNoFills: number;
    labelChangedRows: number;
    noFillCorrectedRows: number;
    originalOneMesPl: number | null;
    correctedOneMesPl: number | null;
    plDelta: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'ready_for_user_decision_on_implementation' | 'fix_missing_inputs';
  };
  groups: GroupSummary[];
  rows: CloseoutRow[];
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
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function normalizeTime(value: string): string {
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function timeMs(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(normalizeTime(value));
  return Number.isFinite(parsed) ? parsed : 0;
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

function levelTouched(bar: Bar, level: number): boolean {
  return bar.low <= level && bar.high >= level;
}

function crosses(direction: Direction, bar: Bar, level: number): boolean {
  return direction === 'LONG' ? bar.high >= level : bar.low <= level;
}

function hitsStop(direction: Direction, bar: Bar, stop: number): boolean {
  return direction === 'LONG' ? bar.low <= stop : bar.high >= stop;
}

function favorableMove(direction: Direction, bar: Bar, entry: number): number {
  return direction === 'LONG' ? bar.high - entry : entry - bar.low;
}

function adverseMove(direction: Direction, bar: Bar, entry: number): number {
  return direction === 'LONG' ? entry - bar.low : bar.high - entry;
}

function pointsToPl(direction: Direction, entry: number, exit: number): number {
  const points = direction === 'LONG' ? exit - entry : entry - exit;
  return round(points * POINT_VALUE);
}

function barsForDateAtOrAfter(bars: Bar[], tradeDate: string, proofTime: string): Bar[] {
  const proof = timeMs(proofTime);
  const morningClose = timeMs(`${tradeDate}T${String(TIME_WINDOWS.morning.closeHour).padStart(2, '0')}:${String(TIME_WINDOWS.morning.closeMinute).padStart(2, '0')}:00`);
  return [...bars]
    .filter((bar) => normalizeTime(bar.time).slice(0, 10) === tradeDate)
    .filter((bar) => timeMs(bar.time) >= proof)
    .filter((bar) => timeMs(bar.time) < morningClose)
    .sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function replayOutcome(row: SlateStory, bars5m: Bar[]): CorrectedOutcome {
  const eligibleBars = barsForDateAtOrAfter(bars5m, row.tradeDate, row.proofTime);
  const entryHitIndex = eligibleBars.findIndex((bar) => levelTouched(bar, row.entry));
  if (entryHitIndex < 0) {
    return {
      bucket: 'unresolved',
      label: 'no_fill',
      oneMesPl: null,
      resolvedR: null,
      entryHitTime: null,
      stopHitTime: null,
      t1HitTime: null,
      t2HitTime: null,
      mfeR: null,
      maeR: null,
    };
  }
  const replayBars = eligibleBars.slice(entryHitIndex + 1);
  let stopHitTime: string | null = null;
  let t1HitTime: string | null = null;
  let t2HitTime: string | null = null;
  let maximumFavorableExcursion = 0;
  let maximumAdverseExcursion = 0;
  for (const bar of replayBars) {
    maximumFavorableExcursion = Math.max(maximumFavorableExcursion, favorableMove(row.direction, bar, row.entry));
    maximumAdverseExcursion = Math.max(maximumAdverseExcursion, adverseMove(row.direction, bar, row.entry));
    const stopHit = hitsStop(row.direction, bar, row.stop);
    const t1Hit = crosses(row.direction, bar, row.t1);
    const t2Hit = crosses(row.direction, bar, row.t2);
    if (!stopHitTime && stopHit) stopHitTime = normalizeTime(bar.time);
    if (!t1HitTime && t1Hit) t1HitTime = normalizeTime(bar.time);
    if (!t2HitTime && t2Hit) t2HitTime = normalizeTime(bar.time);
  }
  const stopBeforeT1 = Boolean(stopHitTime && (!t1HitTime || timeMs(stopHitTime) <= timeMs(t1HitTime)));
  const label: OutcomeLabel = stopBeforeT1
    ? 'stopped_before_t1'
    : t2HitTime
      ? 't1_and_t2_hit'
      : t1HitTime
        ? 't1_hit_only'
        : 'no_target_or_stop_hit';
  const exit = label === 'stopped_before_t1'
    ? row.stop
    : label === 't1_and_t2_hit'
      ? row.t2
      : label === 't1_hit_only'
        ? row.t1
        : null;
  const oneMesPl = exit === null ? null : pointsToPl(row.direction, row.entry, exit);
  return {
    bucket: oneMesPl === null ? 'unresolved' : label === 'stopped_before_t1' ? 'loss' : 'winner',
    label,
    oneMesPl,
    resolvedR: oneMesPl === null ? null : round(oneMesPl / (row.riskPoints * POINT_VALUE)),
    entryHitTime: normalizeTime(eligibleBars[entryHitIndex].time),
    stopHitTime,
    t1HitTime,
    t2HitTime,
    mfeR: row.riskPoints > 0 ? round(maximumFavorableExcursion / row.riskPoints) : null,
    maeR: row.riskPoints > 0 ? round(maximumAdverseExcursion / row.riskPoints) : null,
  };
}

function htfSufficiency(row: SlateStory): string {
  if (row.timeframeStories.length === 0) return 'missing';
  if (row.timeframeStories.some((story) => story.sufficiency !== 'sufficient')) return 'partial_or_insufficient';
  return 'sufficient';
}

function htfSupportCount(row: SlateStory): number {
  return row.timeframeStories.filter((story) => story.shortContext === 'support').length;
}

function htfCautionCount(row: SlateStory): number {
  return row.timeframeStories.filter((story) => story.shortContext === 'caution').length;
}

function buildCloseoutRow(row: SlateStory, bars5m: Bar[]): CloseoutRow {
  const corrected = replayOutcome(row, bars5m);
  const labelChanged = corrected.label !== row.outcomeLabel || corrected.bucket !== row.outcomeBucket;
  const plChanged = corrected.oneMesPl !== row.oneMesPl;
  const correctionReason = row.outcomeLabel === 'no_fill' && corrected.entryHitTime
    ? 'Original no_fill corrected because completed 5M OHLC touched entry at or after proof.'
    : labelChanged
      ? 'Corrected replay outcome differs from original saved label.'
      : null;
  return {
    ticketId: row.selectedTicketId,
    tradeDate: row.tradeDate,
    session: 'morning',
    setupType: 'OpeningDriveFvgContinuation',
    direction: row.direction,
    riskBand: row.riskBand,
    proofTime: normalizeTime(row.proofTime),
    entry: row.entry,
    stop: row.stop,
    t1: row.t1,
    t2: row.t2,
    riskPoints: row.riskPoints,
    originalBucket: row.outcomeBucket,
    originalLabel: row.outcomeLabel,
    originalOneMesPl: row.oneMesPl,
    originalMfeR: row.mfeR,
    originalMaeR: row.maeR,
    labelChanged,
    plChanged,
    plDelta: row.oneMesPl === null || corrected.oneMesPl === null ? null : round(corrected.oneMesPl - row.oneMesPl),
    sweepCollision: row.sweepCollision,
    htfCollisionFromSlate: row.htfCollisionFromSlate,
    storyVerdict: row.storyVerdict,
    tactical15m60mContextVerdict: row.tactical15m60mContextVerdict,
    htfSufficiency: htfSufficiency(row),
    htfSupportCount: htfSupportCount(row),
    htfCautionCount: htfCautionCount(row),
    openingDriveDirection: row.session.openingDriveDirection || null,
    sweptNyPremarketHigh: Boolean(row.session.sweptNyPremarketHigh),
    brokeNyPremarketLow: Boolean(row.session.brokeNyPremarketLow),
    entryInEthPercentile: row.session.entryInEthPercentile ?? null,
    correctionReason,
    ...corrected,
  };
}

function summarizeGroup(key: string, rows: CloseoutRow[]): GroupSummary {
  const resolved = rows.filter((row) => row.oneMesPl !== null);
  return {
    key,
    rows: rows.length,
    winners: rows.filter((row) => row.bucket === 'winner').length,
    losses: rows.filter((row) => row.bucket === 'loss').length,
    unresolved: rows.filter((row) => row.bucket === 'unresolved').length,
    noFills: rows.filter((row) => row.label === 'no_fill').length,
    correctedOneMesPl: sum(rows.map((row) => row.oneMesPl)),
    originalOneMesPl: sum(rows.map((row) => row.originalOneMesPl)),
    plDelta: sum(rows.map((row) => row.plDelta)),
    winRateResolved: resolved.length ? round(rows.filter((row) => row.bucket === 'winner').length / resolved.length) : null,
    averageRiskPoints: avg(rows.map((row) => row.riskPoints)),
  };
}

function groupBy(rows: CloseoutRow[], keyFor: (row: CloseoutRow) => string): GroupSummary[] {
  const groups = new Map<string, CloseoutRow[]>();
  for (const row of rows) groups.set(keyFor(row), [...(groups.get(keyFor(row)) || []), row]);
  return [...groups.entries()].map(([key, group]) => summarizeGroup(key, group));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<OpeningDriveCorrectedOutcomeCloseoutReport, 'markdown'>): string {
  return [
    '# OpeningDrive/Sweep Corrected Outcome Closeout',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only research over saved OpeningDrive/Sweep slates and completed 5M OHLC. HTF is context only. This report does not change scanner behavior, ranking, Discord, Supabase, bridge behavior, canExecute, or trading rules.',
    '',
    '## Summary',
    `- Target rows: ${report.summary.targetRows}.`,
    `- Original W/L/U/no-fill: ${report.summary.originalWinners}/${report.summary.originalLosses}/${report.summary.originalUnresolved}/${report.summary.originalNoFills}.`,
    `- Corrected W/L/U/no-fill: ${report.summary.correctedWinners}/${report.summary.correctedLosses}/${report.summary.correctedUnresolved}/${report.summary.correctedNoFills}.`,
    `- Label changed rows: ${report.summary.labelChangedRows}.`,
    `- No-fill corrected rows: ${report.summary.noFillCorrectedRows}.`,
    `- Original one-MES P/L: ${report.summary.originalOneMesPl ?? '-'}.`,
    `- Corrected one-MES P/L: ${report.summary.correctedOneMesPl ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Groups',
    '| Group | Rows | W/L/U | No-Fill | Corrected P/L | Original P/L | Win Rate | Avg Risk |',
    '|---|---:|---|---:|---:|---:|---:|---:|',
    ...report.groups.map((row) => `| ${escapeTable(row.key)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.noFills} | ${row.correctedOneMesPl ?? '-'} | ${row.originalOneMesPl ?? '-'} | ${row.winRateResolved ?? '-'} | ${row.averageRiskPoints ?? '-'} |`),
    '',
    '## Rows',
    '| Date | Proof | Ticket | HTF | Entry | Stop | T1 | T2 | Original | Corrected | P/L | Entry Hit | Stop | T1 | T2 | Reason |',
    '|---|---:|---|---|---:|---:|---:|---:|---|---|---:|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${row.tradeDate} | ${row.proofTime.slice(11, 16)} | ${escapeTable(row.ticketId)} | ${row.storyVerdict}/${row.htfSufficiency} | ${row.entry} | ${row.stop} | ${row.t1} | ${row.t2} | ${row.originalLabel} | ${row.label} | ${row.oneMesPl ?? '-'} | ${row.entryHitTime ?? '-'} | ${row.stopHitTime ?? '-'} | ${row.t1HitTime ?? '-'} | ${row.t2HitTime ?? '-'} | ${escapeTable(row.correctionReason || '')} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildOpeningDriveCorrectedOutcomeCloseoutReport(args: {
  htfStoryReportPath: string | null;
  htfStoryReport: HtfStoryReport | null;
  htfSourcePath: string | null;
  htfSource: HtfSourceReport | null;
}, generatedAt = new Date().toISOString()): OpeningDriveCorrectedOutcomeCloseoutReport {
  const slates = Array.isArray(args.htfStoryReport?.slateStories) ? args.htfStoryReport.slateStories : [];
  const bars5m = Array.isArray(args.htfSource?.bars?.['5m']) ? args.htfSource.bars['5m'] : [];
  const targetSlates = slates
    .filter((row) => row.tradeDate >= '2026-06-01' && row.tradeDate <= '2026-07-02')
    .filter((row) => row.direction === 'SHORT')
    .filter((row) => row.sweepCollision);
  const blockers = [
    !args.htfStoryReportPath ? 'missing HTF story report path' : null,
    !args.htfStoryReport ? 'missing HTF story report' : null,
    slates.length === 0 ? 'HTF story report has no slate stories' : null,
    !args.htfSourcePath ? 'missing HTF source path' : null,
    !args.htfSource ? 'missing HTF source report' : null,
    bars5m.length === 0 ? 'HTF source has no 5M bars' : null,
  ].filter((item): item is string => Boolean(item));
  const rows = blockers.length ? [] : targetSlates.map((row) => buildCloseoutRow(row, bars5m));
  const groups = [
    summarizeGroup('all_openingdrive_sweep_short', rows),
    ...groupBy(rows, (row) => `story_${row.storyVerdict}`),
    ...groupBy(rows, (row) => `risk_${row.riskBand}`),
  ];
  const base: Omit<OpeningDriveCorrectedOutcomeCloseoutReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_openingdrive_corrected_outcome_closeout',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: {
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
      livePromotionAllowed: false,
    },
    source: {
      htfStoryReportPath: args.htfStoryReportPath,
      htfSourcePath: args.htfSourcePath,
    },
    assumptions: {
      dateRange: '2026-06-01_to_2026-07-02',
      model: 'OpeningDriveFvgContinuation',
      overlapRequired: 'SweepMssFvgRetrace_collision',
      usesCompletedFiveMinuteBarsOnly: true,
      entryFillEligibleFromProofBar: true,
      outcomeEvaluationEndsAtMorningWindowClose: true,
      targetStopEvaluationStartsAfterEntryBar: true,
      sameBarStopAndTargetUsesConservativeStopFirst: true,
      htfContextIsContextOnly: true,
      outputIsResearchOnly: true,
    },
    summary: {
      sourceSlates: slates.length,
      targetRows: rows.length,
      originalWinners: rows.filter((row) => row.originalBucket === 'winner').length,
      originalLosses: rows.filter((row) => row.originalBucket === 'loss').length,
      originalUnresolved: rows.filter((row) => row.originalBucket === 'unresolved').length,
      originalNoFills: rows.filter((row) => row.originalLabel === 'no_fill').length,
      correctedWinners: rows.filter((row) => row.bucket === 'winner').length,
      correctedLosses: rows.filter((row) => row.bucket === 'loss').length,
      correctedUnresolved: rows.filter((row) => row.bucket === 'unresolved').length,
      correctedNoFills: rows.filter((row) => row.label === 'no_fill').length,
      labelChangedRows: rows.filter((row) => row.labelChanged).length,
      noFillCorrectedRows: rows.filter((row) => row.originalLabel === 'no_fill' && row.label !== 'no_fill').length,
      originalOneMesPl: sum(rows.map((row) => row.originalOneMesPl)),
      correctedOneMesPl: sum(rows.map((row) => row.oneMesPl)),
      plDelta: sum(rows.map((row) => row.plDelta)),
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_missing_inputs' : 'ready_for_user_decision_on_implementation',
    },
    groups,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Provide the OpeningDrive HTF story report and completed 5M OHLC source before closeout.']
      : [
        'Use this corrected report as the closeout evidence for the June 1-July 2 OpeningDrive/Sweep pocket.',
        'Do not install scanner promotion from this report without a separate user decision.',
        'If implemented later, keep it scanner-owned, one ticket per slate, 5M execution-authority only, and HTF as context/support/caution.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeOpeningDriveCorrectedOutcomeCloseoutReport(
  report: OpeningDriveCorrectedOutcomeCloseoutReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-openingdrive-corrected-outcome-closeout-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runOpeningDriveCorrectedOutcomeCloseoutCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const htfStoryReportPath = readFlag(args, '--htf-story-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-openingdrive-htf-story-audit-\d+\.json$/);
  const htfStoryReport = readJson<HtfStoryReport>(htfStoryReportPath);
  const htfSourcePath = readFlag(args, '--htf-source') ||
    htfStoryReport?.source?.htfSourcePath ||
    latestMatchingFile(outDir, /^controlled-htf-ohlc-source-MES-2026-06-01-to-2026-07-02-\d+\.json$/);
  const report = buildOpeningDriveCorrectedOutcomeCloseoutReport({
    htfStoryReportPath,
    htfStoryReport,
    htfSourcePath,
    htfSource: readJson<HtfSourceReport>(htfSourcePath),
  });
  const paths = writeOpeningDriveCorrectedOutcomeCloseoutReport(report, outDir);
  if (args.includes('--json')) {
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
    runOpeningDriveCorrectedOutcomeCloseoutCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
