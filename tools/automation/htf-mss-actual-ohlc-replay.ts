import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNinjaChartContext, getNinjaHistoricalBars, type NinjaBridgeBar, type NinjaBridgeTimeframe } from '../../src/lib/ninjaTraderBridge';
import { formatHtfContextSufficiencyMarkdownLines } from '../../src/lib/htfLiquidityDrawEngine';
import { runBridgeDiagnosticReplay } from '../../src/agents/bridgeDiagnosticReplayAgent';
import { scanSetupCandidates } from '../../src/lib/setupScanner';
import { runTradeDecisionPipeline } from '../../src/lib/tradeDecisionPipeline';
import { normalizeTradePlan } from '../../src/lib/tradePlan';
import { getEffectiveCanExecute } from '../../src/lib/effectiveExecution';
import { summarizeActiveTimeframeMssRuleset } from '../../src/lib/activeTimeframeMssRulesetAudit';
import { classifyActiveSetupScanWindowByEtMinutes } from '../../src/config/timeWindows';
import { SetupType, TradeDecisionStatus, type AnalysisResult, type ChartContext, type SetupCandidate } from '../../src/types';
import { buildReplayExecutionSummary } from './replay-execution-labels';

const REPORT_DIR = resolve('tools/automation/replay-diagnostics');
export const ACTUAL_OHLC_REPLAY_JSON = join(REPORT_DIR, 'htf-mss-june-1-actual-ohlc-replay.json');
export const ACTUAL_OHLC_REPLAY_MD = join(REPORT_DIR, 'htf-mss-june-1-actual-ohlc-replay.md');
export const ACTUAL_OHLC_READINESS_JSON = join(REPORT_DIR, 'htf-mss-june-1-actual-ohlc-readiness.json');
export const ACTUAL_OHLC_READINESS_MD = join(REPORT_DIR, 'htf-mss-june-1-actual-ohlc-readiness.md');

export type HtfMssHistoricalTimeframe = '5m' | '15m' | '60m' | '120m' | '240m';
export type HistoricalOhlcTimezone = 'America/New_York';

export interface HtfMssHistoricalBarsByTimeframe {
  bars5m: NinjaBridgeBar[];
  bars15m: NinjaBridgeBar[];
  bars60m: NinjaBridgeBar[];
  bars120m: NinjaBridgeBar[];
  bars240m: NinjaBridgeBar[];
}

export interface HistoricalOhlcValidation {
  ok: boolean;
  blockers: string[];
  warnings: string[];
  duplicateTimestamps: Record<HtfMssHistoricalTimeframe, string[]>;
  barCounts: Record<HtfMssHistoricalTimeframe, number>;
  timeframeRanges: Record<HtfMssHistoricalTimeframe, { from: string | null; to: string | null }>;
  insufficientLookback: string[];
  timezone: HistoricalOhlcTimezone;
  timezoneAssumption: string;
}

export interface HistoricalOhlcLoadResult extends HistoricalOhlcValidation {
  bars: HtfMssHistoricalBarsByTimeframe;
  source: 'json_file' | 'ninjatrader_historical_bars';
  sourcePath?: string;
  bridgeUrl?: string;
  instrument: string;
  date: string;
}

interface CliOptions {
  date: string;
  instrument: string;
  bridgeInstrument: string;
  bridgeUrl: string;
  from: string;
  to: string;
  contextFrom: string | null;
  contextDays: number | null;
  jsonPath: string | null;
  pretty: boolean;
}

const TIMEFRAMES: HtfMssHistoricalTimeframe[] = ['5m', '15m', '60m', '120m', '240m'];
const MIN_REPLAY_LOOKBACK_COUNTS: Record<HtfMssHistoricalTimeframe, number> = {
  '5m': 12,
  '15m': 40,
  '60m': 24,
  '120m': 20,
  '240m': 20,
};
const DEFAULT_CONTEXT_DAYS_BY_TIMEFRAME: Record<Exclude<HtfMssHistoricalTimeframe, '5m'>, number> = {
  '15m': 2,
  '60m': 4,
  '120m': 5,
  '240m': 7,
};

function offsetFromTimestamp(value: string): string {
  return value.match(/([+-]\d{2}:\d{2}|Z)$/)?.[1] || '-04:00';
}

function shiftEtDate(date: string, daysBack: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day - daysBack));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, '0'),
    String(shifted.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function contextFromFor(options: Pick<CliOptions, 'date' | 'from' | 'contextFrom' | 'contextDays'>, timeframe: Exclude<HtfMssHistoricalTimeframe, '5m'>): string {
  if (options.contextFrom) return options.contextFrom;
  const contextDays = options.contextDays ?? DEFAULT_CONTEXT_DAYS_BY_TIMEFRAME[timeframe];
  return `${shiftEtDate(options.date, contextDays)}T00:00:00${offsetFromTimestamp(options.from)}`;
}

function fiveMinuteContextFromFor(options: Pick<CliOptions, 'date' | 'from' | 'contextFrom'>): string {
  return options.contextFrom || `${shiftEtDate(options.date, 30)}T00:00:00${offsetFromTimestamp(options.from)}`;
}

function parseArgs(argv = process.argv.slice(2)): CliOptions {
  const options: CliOptions = {
    date: '2026-06-01',
    instrument: 'MES',
    bridgeInstrument: 'MES 06-26',
    bridgeUrl: 'http://127.0.0.1:8765',
    from: '2026-06-01T12:00:00-04:00',
    to: '2026-06-01T16:00:00-04:00',
    contextFrom: null,
    contextDays: null,
    jsonPath: null,
    pretty: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--date' && next) { options.date = next; index += 1; }
    else if (arg === '--instrument' && next) { options.instrument = next; index += 1; }
    else if (arg === '--bridge-instrument' && next) { options.bridgeInstrument = next; index += 1; }
    else if (arg === '--bridge-url' && next) { options.bridgeUrl = next; index += 1; }
    else if (arg === '--from' && next) { options.from = next; index += 1; }
    else if (arg === '--to' && next) { options.to = next; index += 1; }
    else if (arg === '--context-from' && next) { options.contextFrom = next; index += 1; }
    else if (arg === '--context-days' && next) {
      const parsed = Number(next);
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 10) options.contextDays = parsed;
      index += 1;
    }
    else if (arg === '--json' && next) { options.jsonPath = next; index += 1; }
    else if (arg === '--pretty') options.pretty = true;
  }
  return options;
}

function isFinitePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function timestampMinutesEt(value: string): number | null {
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeRawBar(raw: unknown): NinjaBridgeBar | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const time = record.time ?? record.timestamp ?? record.candle_time_et ?? record.candleTimeEt;
  const open = Number(record.open);
  const high = Number(record.high);
  const low = Number(record.low);
  const close = Number(record.close);
  const volume = Number(record.volume ?? 0);
  if (typeof time !== 'string') return null;
  return { time, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 };
}

function normalizeBars(rawBars: unknown, timeframe: HtfMssHistoricalTimeframe): {
  bars: NinjaBridgeBar[];
  blockers: string[];
  warnings: string[];
  duplicates: string[];
} {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const duplicates: string[] = [];
  if (!Array.isArray(rawBars)) {
    return { bars: [], blockers: [`${timeframe}: expected an array of OHLC bars.`], warnings, duplicates };
  }

  const byTime = new Map<string, NinjaBridgeBar>();
  rawBars.forEach((raw, index) => {
    const bar = normalizeRawBar(raw);
    if (!bar) {
      blockers.push(`${timeframe}: bar ${index} is missing time/open/high/low/close.`);
      return;
    }
    if (!isFinitePrice(bar.open) || !isFinitePrice(bar.high) || !isFinitePrice(bar.low) || !isFinitePrice(bar.close)) {
      blockers.push(`${timeframe}: ${bar.time} has non-numeric or non-positive OHLC.`);
      return;
    }
    if (bar.high < bar.low || bar.high < Math.max(bar.open, bar.close) || bar.low > Math.min(bar.open, bar.close)) {
      blockers.push(`${timeframe}: ${bar.time} has invalid OHLC bounds.`);
      return;
    }
    if (!/T\d{2}:\d{2}/.test(bar.time)) {
      blockers.push(`${timeframe}: ${bar.time} does not include an explicit ISO-like timestamp.`);
      return;
    }
    if (!/[+-]\d{2}:\d{2}$|Z$/.test(bar.time)) {
      warnings.push(`${timeframe}: ${bar.time} has no UTC offset; treated as America/New_York wall-clock time.`);
    }
    if (byTime.has(bar.time)) duplicates.push(bar.time);
    byTime.set(bar.time, bar);
  });

  return {
    bars: [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time)),
    blockers,
    warnings,
    duplicates,
  };
}

function timeframeRangesFromBars(bars: HtfMssHistoricalBarsByTimeframe): Record<HtfMssHistoricalTimeframe, { from: string | null; to: string | null }> {
  const source: Record<HtfMssHistoricalTimeframe, NinjaBridgeBar[]> = {
    '5m': bars.bars5m,
    '15m': bars.bars15m,
    '60m': bars.bars60m,
    '120m': bars.bars120m,
    '240m': bars.bars240m,
  };
  return Object.fromEntries(TIMEFRAMES.map((timeframe) => {
    const items = source[timeframe];
    return [timeframe, {
      from: items[0]?.time || null,
      to: items[items.length - 1]?.time || null,
    }];
  })) as Record<HtfMssHistoricalTimeframe, { from: string | null; to: string | null }>;
}

function insufficientLookbackWarnings(counts: Record<HtfMssHistoricalTimeframe, number>): string[] {
  return TIMEFRAMES
    .filter((timeframe) => counts[timeframe] > 0 && counts[timeframe] < MIN_REPLAY_LOOKBACK_COUNTS[timeframe])
    .map((timeframe) => `${timeframe}: insufficient bounded lookback for reliable replay context (${counts[timeframe]} bars loaded, preferred ${MIN_REPLAY_LOOKBACK_COUNTS[timeframe]}+).`);
}

function rawBarsFor(data: Record<string, unknown>, timeframe: HtfMssHistoricalTimeframe): unknown {
  const aliases: Record<HtfMssHistoricalTimeframe, string[]> = {
    '5m': ['bars5m', '5m', 'fiveMinute', 'bars_5m'],
    '15m': ['bars15m', '15m', 'fifteenMinute', 'bars_15m'],
    '60m': ['bars60m', '60m', 'oneHour', 'bars_60m'],
    '120m': ['bars120m', '120m', 'twoHour', 'bars_120m'],
    '240m': ['bars240m', '240m', 'fourHour', 'bars_240m'],
  };
  return aliases[timeframe].map((key) => data[key]).find((value) => Array.isArray(value));
}

export function loadHistoricalOhlcFromJson(path: string, args: { instrument?: string; date?: string } = {}): HistoricalOhlcLoadResult {
  const data = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  const blockers: string[] = [];
  const warnings: string[] = [];
  const duplicateTimestamps = {} as Record<HtfMssHistoricalTimeframe, string[]>;
  const bars = {} as HtfMssHistoricalBarsByTimeframe;

  for (const timeframe of TIMEFRAMES) {
    const normalized = normalizeBars(rawBarsFor(data, timeframe), timeframe);
    blockers.push(...normalized.blockers);
    warnings.push(...normalized.warnings);
    duplicateTimestamps[timeframe] = normalized.duplicates;
    bars[`bars${timeframe}`.replace('m', 'm') as keyof HtfMssHistoricalBarsByTimeframe] = normalized.bars as never;
  }

  const resolvedBars: HtfMssHistoricalBarsByTimeframe = {
    bars5m: bars.bars5m || [],
    bars15m: bars.bars15m || [],
    bars60m: bars.bars60m || [],
    bars120m: bars.bars120m || [],
    bars240m: bars.bars240m || [],
  };
  for (const timeframe of TIMEFRAMES) {
    const count = resolvedBars[`bars${timeframe}` as keyof HtfMssHistoricalBarsByTimeframe].length;
    if (count === 0) blockers.push(`${timeframe}: no valid bars loaded.`);
  }

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    duplicateTimestamps,
    barCounts: {
      '5m': resolvedBars.bars5m.length,
      '15m': resolvedBars.bars15m.length,
      '60m': resolvedBars.bars60m.length,
      '120m': resolvedBars.bars120m.length,
      '240m': resolvedBars.bars240m.length,
    },
    timeframeRanges: timeframeRangesFromBars(resolvedBars),
    insufficientLookback: insufficientLookbackWarnings({
      '5m': resolvedBars.bars5m.length,
      '15m': resolvedBars.bars15m.length,
      '60m': resolvedBars.bars60m.length,
      '120m': resolvedBars.bars120m.length,
      '240m': resolvedBars.bars240m.length,
    }),
    timezone: 'America/New_York',
    timezoneAssumption: 'JSON timestamps must include an explicit offset or are treated as America/New_York wall-clock time with a warning.',
    bars: resolvedBars,
    source: 'json_file',
    sourcePath: path,
    instrument: args.instrument || String(data.instrument || 'MES'),
    date: args.date || String(data.date || data.tradeDate || '2026-06-01'),
  };
}

async function fetchHistoricalTimeframe(options: CliOptions, timeframe: HtfMssHistoricalTimeframe): Promise<NinjaBridgeBar[]> {
  const contextFrom = timeframe === '5m' ? fiveMinuteContextFromFor(options) : contextFromFor(options, timeframe);
  const response = await getNinjaHistoricalBars({
    instrument: options.bridgeInstrument,
    timeframe: timeframe as NinjaBridgeTimeframe,
    from: contextFrom,
    to: options.to,
    limit: 2000,
    baseUrl: options.bridgeUrl,
  });
  return response.ok ? response.bars || [] : [];
}

export async function loadHistoricalOhlcFromBridge(options: CliOptions): Promise<HistoricalOhlcLoadResult> {
  const [bars5m, bars15m, bars60m, bars120m, bars240m] = await Promise.all([
    fetchHistoricalTimeframe(options, '5m'),
    fetchHistoricalTimeframe(options, '15m'),
    fetchHistoricalTimeframe(options, '60m'),
    fetchHistoricalTimeframe(options, '120m'),
    fetchHistoricalTimeframe(options, '240m'),
  ]);
  const payload = { bars5m, bars15m, bars60m, bars120m, bars240m };
  const tempValidation = validateHistoricalBars(payload);
  return {
    ...tempValidation,
    bars: {
      bars5m: normalizeBars(bars5m, '5m').bars,
      bars15m: normalizeBars(bars15m, '15m').bars,
      bars60m: normalizeBars(bars60m, '60m').bars,
      bars120m: normalizeBars(bars120m, '120m').bars,
      bars240m: normalizeBars(bars240m, '240m').bars,
    },
    source: 'ninjatrader_historical_bars',
    bridgeUrl: options.bridgeUrl,
    instrument: options.instrument,
    date: options.date,
  };
}

export function validateHistoricalBars(raw: HtfMssHistoricalBarsByTimeframe): HistoricalOhlcValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const duplicateTimestamps = {} as Record<HtfMssHistoricalTimeframe, string[]>;
  const counts = {} as Record<HtfMssHistoricalTimeframe, number>;
  const source: Record<HtfMssHistoricalTimeframe, NinjaBridgeBar[]> = {
    '5m': raw.bars5m,
    '15m': raw.bars15m,
    '60m': raw.bars60m,
    '120m': raw.bars120m,
    '240m': raw.bars240m,
  };
  for (const timeframe of TIMEFRAMES) {
    const normalized = normalizeBars(source[timeframe], timeframe);
    blockers.push(...normalized.blockers);
    warnings.push(...normalized.warnings);
    duplicateTimestamps[timeframe] = normalized.duplicates;
    counts[timeframe] = normalized.bars.length;
    if (normalized.bars.length === 0) blockers.push(`${timeframe}: no valid bars loaded.`);
  }
  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    duplicateTimestamps,
    barCounts: counts,
    timeframeRanges: timeframeRangesFromBars({
      bars5m: normalizeBars(raw.bars5m, '5m').bars,
      bars15m: normalizeBars(raw.bars15m, '15m').bars,
      bars60m: normalizeBars(raw.bars60m, '60m').bars,
      bars120m: normalizeBars(raw.bars120m, '120m').bars,
      bars240m: normalizeBars(raw.bars240m, '240m').bars,
    }),
    insufficientLookback: insufficientLookbackWarnings(counts),
    timezone: 'America/New_York',
    timezoneAssumption: 'Historical replay classifies scan windows using America/New_York wall-clock time. Timestamps with offsets are preserved; offset-free timestamps are treated as ET with warnings.',
  };
}

function analysisForContext(context: ChartContext, date: string): AnalysisResult {
  return {
    dayType: context.htfLiquidityDrawState?.planDirection === 'SHORT' ? 'SHORT' : context.htfLiquidityDrawState?.planDirection === 'LONG' ? 'LONG' : 'WAIT',
    reasoning: 'Actual historical OHLC replay context. Structured bars feed HTF/MSS diagnostics; final gates remain app-owned.',
    confidence: 0.7,
    checks: [],
    current_rule_analysis: {
      summary: 'Actual historical OHLC replay. Candidate detection is not execution approval.',
      setup_detected: 'HTF Draw Continuation After Raid/Reclaim',
      rule_category: 'APP_OWNED_ACTUAL_OHLC_REPLAY',
      entry: null,
      stop: null,
      target_1: null,
      target_2: null,
      trigger_state: 'PENDING_TRIGGER',
      entry_trigger: 'Defined reclaim/retest trigger required before execution.',
      no_trade_reason: null,
      base_confidence: 'Medium',
    },
    sessionLog: {
      timestamp: context.chartTimestamp || `${date}T16:00:00-04:00`,
      instrument: context.instrument,
      final_bias: context.htfLiquidityDrawState?.planDirection || 'WAIT',
      confidence: 0.7,
      key_structural_level: String(context.keyLevels.currentPrice || ''),
      recalibration_status: 'actual_ohlc_replay',
    },
    structuredChartContext: context,
  };
}

function candidateSummary(candidate: SetupCandidate | null) {
  if (!candidate) return null;
  return {
    setupType: candidate.setupType,
    scenarioLabel: candidate.scenarioLabel,
    pathway: candidate.pathway,
    direction: candidate.direction,
    candidateState: candidate.candidateState,
    detectedStatus: candidate.detectedStatus,
    executionStatus: candidate.executionStatus,
    blockReason: candidate.blockReason,
    entry: candidate.entry,
    stop: candidate.stop,
    target1: candidate.target1,
    target2: candidate.target2,
    riskPoints: candidate.riskPoints,
    requiredTrigger: candidate.requiredTrigger,
    nextAction: candidate.nextAction,
    evidence: candidate.evidence,
    missingEvidence: candidate.missingEvidence,
    activeTimeframeMssRuleset: summarizeActiveTimeframeMssRuleset(candidate),
  };
}

function timeframeMssEvidenceSummary(context: ChartContext) {
  const layer = context.timeframeMssEvidence;
  if (!layer) return null;
  return {
    source: layer.source,
    authority: layer.authority,
    boundary: layer.boundary,
    timeframes: Object.values(layer.timeframes).map((item) => ({
      timeframe: item.timeframe,
      direction: item.direction,
      status: item.status,
      displacementPresent: item.displacementQuality.present,
      displacementScore: item.displacementQuality.score,
      breaksStructure: item.breaksStructure,
      evidenceTimestamp: item.evidenceTimestamp,
      completedBarStatus: item.completedBarStatus,
      barTimestampMode: item.barTimestampMode,
      barTimeZone: item.barTimeZone,
      confidence: item.confidence,
      blockers: item.blockers,
    })),
    notes: layer.notes,
    approvesExecution: layer.approvesExecution,
    changesTradeLogic: layer.changesTradeLogic,
  };
}

export function buildActualOhlcReplayReport(load: HistoricalOhlcLoadResult) {
  if (!load.ok) return buildReadinessReport(load);
  const replayBars5m = load.bars.bars5m.filter((bar) => {
    const minutes = timestampMinutesEt(bar.time);
    return minutes === null || (minutes >= 12 * 60 && minutes < 15 * 60 + 30);
  });
  const context = buildNinjaChartContext({
    bars5m: replayBars5m,
    htfBars5m: load.bars.bars5m,
    bars15m: load.bars.bars15m,
    bars60m: load.bars.bars60m,
    bars120m: load.bars.bars120m,
    bars240m: load.bars.bars240m,
    sessionType: 'replay_lunch',
    instrument: load.instrument === 'MNQ' ? 'MNQ' : 'MES',
    tradeDate: load.date,
  }) as ChartContext | null;

  if (!context?.htfLiquidityDrawState) {
    return buildReadinessReport({
      ...load,
      ok: false,
      blockers: [...load.blockers, 'buildNinjaChartContext did not produce structured HTF/MSS context.'],
    });
  }

  const scan = scanSetupCandidates({ sessionType: 'replay_lunch', chartContext: context, result: null });
  const htfCandidate = scan.candidates.find((candidate) => candidate.setupType === SetupType.HtfDrawContinuationAfterRaid) || null;
  const analysis = analysisForContext(context, load.date);
  const pipeline = runTradeDecisionPipeline({
    result: analysis,
    sessionType: 'replay_lunch',
    instrument: load.instrument === 'MNQ' ? 'MNQ' : 'MES',
    tradeDate: load.date,
  });
  const normalized = normalizeTradePlan(analysis, load.instrument === 'MNQ' ? 'MNQ' : 'MES', 'replay_lunch');
  const effectiveCanExecute = getEffectiveCanExecute({
    decisionStatus: pipeline.status,
    canExecute: normalized.canExecute,
  });
  const diagnostic = runBridgeDiagnosticReplay({
    tradeDate: load.date,
    instrument: load.instrument,
    session: 'replay_lunch',
    bars5m: replayBars5m,
    bars5mContext: load.bars.bars5m,
    bars15m: load.bars.bars15m,
    bars60m: load.bars.bars60m,
    bars120m: load.bars.bars120m,
    bars240m: load.bars.bars240m,
    replayWindow: { from: '12:00', to: '16:00' },
    suspectedMoveDirection: 'LONG',
    scannerSelectedCandidate: htfCandidate,
    scannerState: htfCandidate?.executionStatus || null,
    scannerAlertSent: false,
    scannerAlertReason: 'Actual OHLC replay only; no live Discord posting.',
  });
  const state = context.htfLiquidityDrawState;
  const latestMinutes = timestampMinutesEt(context.chartTimestamp || '') ?? 0;

  return {
    reportType: 'htf_mss_june_1_actual_ohlc_replay' as const,
    instrument: load.instrument,
    tradeDate: load.date,
    replayTimeRange: { from: '12:00', to: '16:00', timezone: load.timezone },
    dataSource: load.source,
    sourcePath: load.sourcePath || null,
    bridgeUrl: load.bridgeUrl || null,
    timezoneAssumption: load.timezoneAssumption,
    barCounts: load.barCounts,
    timeframeRanges: load.timeframeRanges,
    replayBarCountsUsed: {
      '5m': replayBars5m.length,
      '15m': load.bars.bars15m.length,
      '60m': load.bars.bars60m.length,
      '120m': load.bars.bars120m.length,
      '240m': load.bars.bars240m.length,
    },
    validationWarnings: load.warnings,
    insufficientLookback: load.insufficientLookback,
    duplicateTimestamps: load.duplicateTimestamps,
    htfContextSufficiency: context.htfLiquidityDrawState.htfContextSufficiency,
    htfContextDataLimited: context.htfLiquidityDrawState.htfContextDataLimited,
    timeframeCoverage: context.htfLiquidityDrawState.timeframeCoverage,
    classificationReliability: context.htfLiquidityDrawState.classificationReliability,
    classificationReason: context.htfLiquidityDrawState.classificationReason,
    timeframeMssEvidenceDiagnostics: timeframeMssEvidenceSummary(context),
    activeTimeframeMssRulesetDiagnostics: summarizeActiveTimeframeMssRuleset(
      htfCandidate || pipeline.opportunitySelection?.bestExecutableCandidate || pipeline.opportunitySelection?.bestConditionalCandidate || null,
    ),
    boundary: 'actual_ohlc_replay_only_not_execution_authority' as const,
    activeScanWindow: state.activeScanWindow || classifyActiveSetupScanWindowByEtMinutes(latestMinutes),
    htfLiquidityDrawState: {
      classification: state.classification,
      planDirection: state.planDirection,
      drawDirection: state.drawDirection,
      macroContext: state.macroContext,
      raidState: state.raidState,
      reclaimStatus: state.reclaimStatus,
      fiveMinuteMssTriggerConfirmed: state.fiveMinuteMssTriggerConfirmed,
      fiveMinuteMssConfirmationType: state.fiveMinuteMssConfirmationType,
      fifteenMinuteConfirmationStatus: state.fifteenMinuteConfirmationStatus,
      postShiftState: state.postShiftState,
      externalLiquidityTarget: state.externalLiquidityTarget || null,
      confidence: state.confidence,
      blockers: state.blockers,
      htfContextSufficiency: state.htfContextSufficiency,
      htfContextDataLimited: state.htfContextDataLimited,
      timeframeCoverage: state.timeframeCoverage,
      classificationReliability: state.classificationReliability,
      classificationReason: state.classificationReason,
      timeframeStack: state.timeframeStack.map((item) => ({
        timeframe: item.timeframe,
        direction: item.direction,
        status: item.status,
        lifecycleState: item.lifecycleState,
        confidence: item.confidence,
      })),
      createsTradingPlanCandidate: state.createsTradingPlanCandidate,
      approvesExecution: state.approvesExecution,
    },
    setupDetection: {
      candidateDetected: Boolean(htfCandidate && htfCandidate.candidateState !== 'NO_QUALIFIED_STATE'),
      setupType: htfCandidate?.setupType || null,
      label: htfCandidate?.scenarioLabel || null,
      direction: htfCandidate?.direction || null,
      candidate: candidateSummary(htfCandidate),
      blockers: htfCandidate?.missingEvidence || state.blockers,
    },
    finalGateResult: {
      status: pipeline.status,
      ...buildReplayExecutionSummary({
        status: pipeline.status,
        canExecute: effectiveCanExecute,
        normalizedCanExecuteRaw: normalized.canExecute,
      }),
      finalPlanEntry: pipeline.finalTradePlan.entry,
      finalPlanStop: pipeline.finalTradePlan.stop,
      target1: pipeline.finalTradePlan.target1,
      target2: pipeline.finalTradePlan.target2,
      noTradeReason: pipeline.noTradeReason,
      bestExecutableCandidate: candidateSummary(pipeline.opportunitySelection?.bestExecutableCandidate || null),
      bestConditionalCandidate: candidateSummary(pipeline.opportunitySelection?.bestConditionalCandidate || null),
      approvedTradeOnlyAfterDeterministicGates: pipeline.status === TradeDecisionStatus.ApprovedTrade ? effectiveCanExecute : true,
    },
    diagnosticReplay: {
      finalClassification: diagnostic.finalClassification,
      htfMssDiagnostics: diagnostic.htfMssDiagnostics,
      timeframeMssEvidenceDiagnostics: diagnostic.timeframeMssEvidenceDiagnostics,
      activeTimeframeMssRulesetDiagnostics: diagnostic.activeTimeframeMssRulesetDiagnostics,
      approvalBoundary: diagnostic.approvalBoundary,
      chartReportPath: null,
    },
    safeWording: {
      candidateDoesNotEqualExecutableApproval: true,
      noLiveDiscordPosted: true,
      noBrokerExecution: true,
      externalLiquidityIsContextOnly: true,
      t1T2AreAppComputedRTargets: true,
    },
  };
}

export function buildReadinessReport(load?: Partial<HistoricalOhlcLoadResult>) {
  const searchedLocations = [
    'tools/automation/replay-diagnostics/',
    'tools/automation/research-review-packs/',
    'tools/automation/research-review-charts/',
    'tools/automation/time-window-liquidity-delivery/',
    'tools/automation/model-candidate-ledger/',
    'docs/NINJATRADER_BRIDGE.md / local /historical-bars endpoint',
    'Supabase market_bars readers under tools/automation',
  ];
  return {
    reportType: 'htf_mss_june_1_actual_ohlc_readiness' as const,
    instrument: load?.instrument || 'MES',
    tradeDate: load?.date || '2026-06-01',
    boundary: 'readiness_only_not_execution_authority' as const,
    actualBarsFound: false,
    replayClaimMade: false,
    requiredStatement: 'Actual June 1 historical OHLC bars were not available. Phase 6 added/verified the loader/readiness path but did not claim actual-data replay success.',
    searchedLocations,
    expectedFileFormats: [
      'JSON object with bars5m, bars15m, bars60m, bars120m, bars240m arrays.',
      'Each bar: time, open, high, low, close, optional volume.',
      'NinjaTrader bridge /historical-bars responses for 5m, 15m, 60m, 120m, and 240m.',
    ],
    missingDataRequirements: [
      '5M completed OHLC bars for 2026-06-01 12:00-16:00 ET.',
      '15M, 60M, and 240M context bars from at least 2026-06-01 00:00 ET through 16:00 ET.',
      'Explicit timestamp offsets, or confirmed ET wall-clock timestamps.',
      'Numeric open/high/low/close with high >= low and valid OHLC bounds.',
    ],
    blockers: load?.blockers || ['No actual June 1 multi-timeframe OHLC data source was provided or reachable.'],
    warnings: load?.warnings || [],
    barCounts: load?.barCounts || { '5m': 0, '15m': 0, '60m': 0, '120m': 0, '240m': 0 },
    timezoneAssumption: load?.timezoneAssumption || 'Replay readiness expects America/New_York scan-window classification.',
    rerun: [
      'Place a JSON OHLC file with bars5m/bars15m/bars60m/bars120m/bars240m and run:',
      'npx tsx tools/automation/htf-mss-actual-ohlc-replay.ts --json <path> --pretty',
      'Or run against the local NinjaTrader bridge:',
      'npx tsx tools/automation/htf-mss-actual-ohlc-replay.ts --bridge-instrument "MES 06-26" --pretty',
    ],
  };
}

function renderReplayMarkdown(report: ReturnType<typeof buildActualOhlcReplayReport>): string {
  if (report.reportType === 'htf_mss_june_1_actual_ohlc_readiness') return renderReadinessMarkdown(report);
  const state = report.htfLiquidityDrawState;
  return [
    '# HTF/MSS June 1 Actual OHLC Replay',
    '',
    'Boundary: actual_ohlc_replay_only_not_execution_authority',
    '',
    'This report uses historical OHLC replay data only. It does not post to Discord, place orders, or bypass app-owned final gates.',
    '',
    '## Data',
    `- Instrument: ${report.instrument}`,
    `- Date: ${report.tradeDate}`,
    `- Data Source: ${report.dataSource}`,
    `- Source Path: ${report.sourcePath || 'N/A'}`,
    `- Timezone: ${report.replayTimeRange.timezone}`,
    `- Timezone Assumption: ${report.timezoneAssumption}`,
    `- Bars: 5M=${report.barCounts['5m']}, 15M=${report.barCounts['15m']}, 60M=${report.barCounts['60m']}, 120M=${report.barCounts['120m']}, 240M=${report.barCounts['240m']}`,
    `- Ranges: 5M=${report.timeframeRanges['5m'].from || 'N/A'} to ${report.timeframeRanges['5m'].to || 'N/A'}; 15M=${report.timeframeRanges['15m'].from || 'N/A'} to ${report.timeframeRanges['15m'].to || 'N/A'}; 60M=${report.timeframeRanges['60m'].from || 'N/A'} to ${report.timeframeRanges['60m'].to || 'N/A'}; 120M=${report.timeframeRanges['120m'].from || 'N/A'} to ${report.timeframeRanges['120m'].to || 'N/A'}; 240M=${report.timeframeRanges['240m'].from || 'N/A'} to ${report.timeframeRanges['240m'].to || 'N/A'}`,
    '',
    ...formatHtfContextSufficiencyMarkdownLines({
      htfContextSufficiency: report.htfContextSufficiency,
      classificationReliability: report.classificationReliability,
    }),
    '',
    `- Classification Reason: ${report.classificationReason}`,
    `- Data Limited: ${report.htfContextDataLimited}`,
    ...(report.insufficientLookback.length ? [
      '',
      '## Lookback Warnings',
      ...report.insufficientLookback.map((item) => `- ${item}`),
    ] : []),
    '',
    '## HTF/MSS Classification',
    `- Classification: ${state.classification}`,
    `- Plan Direction: ${state.planDirection}`,
    `- Raid State: ${state.raidState}`,
    `- 5M Confirmed: ${state.fiveMinuteMssTriggerConfirmed}`,
    `- 5M Confirmation Type: ${state.fiveMinuteMssConfirmationType}`,
    `- Post-Shift State: ${state.postShiftState}`,
    `- External Liquidity Target: ${state.externalLiquidityTarget || 'N/A'}`,
    '',
    '## Timeframe Stack',
    '| Timeframe | Direction | Status | Lifecycle | Confidence |',
    '|---|---|---|---|---:|',
    ...state.timeframeStack.map((item) => `| ${item.timeframe} | ${item.direction} | ${item.status} | ${item.lifecycleState} | ${item.confidence} |`),
    ...(report.timeframeMssEvidenceDiagnostics ? [
      '',
      '## Timeframe MSS Evidence',
      '| Timeframe | Direction | Status | Displacement | Breaks Structure | Evidence Time | Completed | Timestamp Mode | Confidence |',
      '|---|---|---|---|---|---|---|---|---:|',
      ...report.timeframeMssEvidenceDiagnostics.timeframes.map((item) => `| ${item.timeframe} | ${item.direction} | ${item.status} | ${item.displacementPresent ? item.displacementScore : 'No'} | ${item.breaksStructure} | ${item.evidenceTimestamp || 'N/A'} | ${item.completedBarStatus} | ${item.barTimeZone}/${item.barTimestampMode} | ${item.confidence} |`),
      '',
      `Boundary: ${report.timeframeMssEvidenceDiagnostics.boundary}. Approves execution: ${report.timeframeMssEvidenceDiagnostics.approvesExecution}. Changes trade logic: ${report.timeframeMssEvidenceDiagnostics.changesTradeLogic}.`,
    ] : []),
    '',
    '## Active MSS Ruleset',
    `- Status: ${report.activeTimeframeMssRulesetDiagnostics.status}`,
    `- Applies To All Models: ${report.activeTimeframeMssRulesetDiagnostics.appliesToAllModels}`,
    `- Affects Execution: ${report.activeTimeframeMssRulesetDiagnostics.affectsExecution}`,
    `- Candidate Execution Status: ${report.activeTimeframeMssRulesetDiagnostics.candidateExecutionStatus || 'N/A'}`,
    `- Summary: ${report.activeTimeframeMssRulesetDiagnostics.summary}`,
    ...(report.activeTimeframeMssRulesetDiagnostics.blockers.length ? [
      '- Blockers:',
      ...report.activeTimeframeMssRulesetDiagnostics.blockers.map((item) => `  - ${item}`),
    ] : []),
    '',
    '## Candidate And Final Gates',
    `- Candidate Detected: ${report.setupDetection.candidateDetected ? 'Yes' : 'No'}`,
    `- Setup Type: ${report.setupDetection.setupType || 'N/A'}`,
    `- Direction: ${report.setupDetection.direction || 'N/A'}`,
    `- Raw Pipeline Status: ${report.finalGateResult.rawStatus || report.finalGateResult.status}`,
    `- Effective Execution Status: ${report.finalGateResult.effectiveExecutionStatus}`,
    `- Display Status: ${report.finalGateResult.displayStatus}`,
    `- canExecute: ${report.finalGateResult.canExecute}`,
    `- Entry: ${report.finalGateResult.finalPlanEntry ?? 'Not defined'}`,
    `- Stop: ${report.finalGateResult.finalPlanStop ?? 'Not defined'}`,
    `- T1/T2: ${report.finalGateResult.target1 ?? 'N/A'} / ${report.finalGateResult.target2 ?? 'N/A'}`,
    `- NoTrade Reason: ${report.finalGateResult.noTradeReason || 'None'}`,
    '',
    '## Safety',
    '- Candidate status does not equal executable approval.',
    '- Raw ApprovedTrade is not executable unless effective canExecute=true.',
    '- External liquidity remains draw/management context.',
    '- T1/T2 remain app-computed R targets.',
    '- No live Discord post was sent.',
    '- No broker execution was introduced.',
    '',
  ].join('\n');
}

function renderReadinessMarkdown(report: ReturnType<typeof buildReadinessReport>): string {
  return [
    '# HTF/MSS June 1 Actual OHLC Readiness',
    '',
    'Boundary: readiness_only_not_execution_authority',
    '',
    report.requiredStatement,
    '',
    '## Searched Locations',
    ...report.searchedLocations.map((item) => `- ${item}`),
    '',
    '## Missing Data Requirements',
    ...report.missingDataRequirements.map((item) => `- ${item}`),
    '',
    '## Expected Formats',
    ...report.expectedFileFormats.map((item) => `- ${item}`),
    '',
    '## Current Blockers',
    ...report.blockers.map((item) => `- ${item}`),
    '',
    '## Rerun',
    ...report.rerun.map((item) => `- ${item}`),
    '',
  ].join('\n');
}

export function writeActualOhlcReplayArtifacts(report: ReturnType<typeof buildActualOhlcReplayReport>, outDir = REPORT_DIR) {
  mkdirSync(outDir, { recursive: true });
  const isReplay = report.reportType === 'htf_mss_june_1_actual_ohlc_replay';
  const jsonPath = isReplay ? join(outDir, 'htf-mss-june-1-actual-ohlc-replay.json') : join(outDir, 'htf-mss-june-1-actual-ohlc-readiness.json');
  const markdownPath = isReplay ? join(outDir, 'htf-mss-june-1-actual-ohlc-replay.md') : join(outDir, 'htf-mss-june-1-actual-ohlc-readiness.md');
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(markdownPath, renderReplayMarkdown(report), 'utf8');
  return { jsonPath, markdownPath, report };
}

export async function runActualOhlcReplayCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  let load: HistoricalOhlcLoadResult | null = null;
  try {
    if (options.jsonPath) {
      if (!existsSync(options.jsonPath)) throw new Error(`JSON OHLC file not found: ${options.jsonPath}`);
      load = loadHistoricalOhlcFromJson(options.jsonPath, { instrument: options.instrument, date: options.date });
    } else {
      load = await loadHistoricalOhlcFromBridge(options);
    }
  } catch (error) {
    load = {
      ...buildReadinessReport({
        instrument: options.instrument,
        date: options.date,
        blockers: [error instanceof Error ? error.message : String(error)],
      }),
      ok: false,
      bars: { bars5m: [], bars15m: [], bars60m: [], bars120m: [], bars240m: [] },
      source: 'ninjatrader_historical_bars',
      instrument: options.instrument,
      date: options.date,
      duplicateTimestamps: { '5m': [], '15m': [], '60m': [], '120m': [], '240m': [] },
      barCounts: { '5m': 0, '15m': 0, '60m': 0, '120m': 0, '240m': 0 },
      timeframeRanges: {
        '5m': { from: null, to: null },
        '15m': { from: null, to: null },
        '60m': { from: null, to: null },
        '120m': { from: null, to: null },
        '240m': { from: null, to: null },
      },
      insufficientLookback: [],
      timezone: 'America/New_York',
      timezoneAssumption: 'Bridge replay expects America/New_York scan-window classification.',
    } as HistoricalOhlcLoadResult;
  }

  const report = buildActualOhlcReplayReport(load);
  const artifacts = writeActualOhlcReplayArtifacts(report);
  if (options.pretty) {
    console.log(JSON.stringify({
      reportType: report.reportType,
      jsonPath: artifacts.jsonPath,
      markdownPath: artifacts.markdownPath,
      actualBarsFound: report.reportType === 'htf_mss_june_1_actual_ohlc_replay',
      barCounts: report.reportType === 'htf_mss_june_1_actual_ohlc_replay' ? report.barCounts : report.barCounts,
    }, null, 2));
  } else {
    console.log(`${report.reportType} saved: ${artifacts.jsonPath}`);
  }
  return artifacts;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runActualOhlcReplayCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
