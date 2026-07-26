import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNinjaChartContext, getNinjaHistoricalBars, type NinjaBridgeBar, type NinjaBridgeTimeframe } from '../../src/lib/ninjaTraderBridge';
import { parseBridgeTime } from '../../src/lib/localScannerEngine';
import { scanSetupCandidates } from '../../src/lib/setupScanner';
import { runTradeDecisionPipeline } from '../../src/lib/tradeDecisionPipeline';
import { normalizeTradePlan } from '../../src/lib/tradePlan';
import { getEffectiveCanExecute } from '../../src/lib/effectiveExecution';
import { summarizeActiveTimeframeMssRuleset } from '../../src/lib/activeTimeframeMssRulesetAudit';
import { ExecutionStatus, SetupType, TradeDecisionStatus, type AnalysisResult, type ChartContext } from '../../src/types';
import { fetchCachedMarketBars, loadMarketDataConfig, type MarketBarTimeframe } from './market-data-store';
import { compactDiscordSummary } from './discord-alert-format';
import { buildReplayExecutionSummary, shouldRetainReplaySample } from './replay-execution-labels';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

const REPORT_DIR = resolve('tools/automation/replay-diagnostics');
const THIS_FILE = fileURLToPath(import.meta.url);
const DEFAULT_JSON = join(REPORT_DIR, 'thirty-day-active-mss-plan-replay-2026-05-07-to-2026-06-05.json');
const DEFAULT_MD = join(REPORT_DIR, 'thirty-day-active-mss-plan-replay-2026-05-07-to-2026-06-05.md');

type TimeframeKey = '5m' | '15m' | '60m' | '120m' | '240m';

const TIMEFRAMES: Array<{ bridge: NinjaBridgeTimeframe; market: MarketBarTimeframe; contextKey: keyof BarsByTimeframe }> = [
  { bridge: '5m', market: '5m', contextKey: 'bars5m' },
  { bridge: '15m', market: '15m', contextKey: 'bars15m' },
  { bridge: '60m', market: '60m', contextKey: 'bars60m' },
  { bridge: '120m', market: '120m', contextKey: 'bars120m' },
  { bridge: '240m', market: '240m', contextKey: 'bars240m' },
];

const ALLOWED_CLI_ARGS = new Set([
  'bridge-url',
  'instrument',
  'bridge-instrument',
  'evaluate-from',
  'evaluate-to',
  'from',
  'to',
  'preload-date',
  'chunk-days',
  'post-mss-bars',
  'skip-market-bars',
  'slim-opening-drive',
  'verbose-rows',
  'max-samples',
  'max-structural-mss-events',
  'allow-heavy-replay',
  'json',
  'md',
]);

interface BarsByTimeframe {
  bars5m: NinjaBridgeBar[];
  bars15m: NinjaBridgeBar[];
  bars60m: NinjaBridgeBar[];
  bars120m: NinjaBridgeBar[];
  bars240m: NinjaBridgeBar[];
}

interface LoadedTimeframe {
  timeframe: TimeframeKey;
  bars: NinjaBridgeBar[];
  cacheBars: number;
  bridgeBars: number;
  bridgeRequests: number;
  bridgeFailures: string[];
  rangeStart: string | null;
  rangeEnd: string | null;
  source: string;
}

type SwingPoint = {
  type: 'high' | 'low';
  index: number;
  price: number;
  timestamp: string;
};

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const directIndex = process.argv.indexOf(`--${name}`);
  if (directIndex >= 0 && process.argv[directIndex + 1]) return process.argv[directIndex + 1];
  const matched = process.argv.find((arg) => arg.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : null;
}

function argValueFrom(argv: string[], name: string): string | null {
  const prefix = `--${name}=`;
  const directIndex = argv.indexOf(`--${name}`);
  if (directIndex >= 0 && argv[directIndex + 1] && !argv[directIndex + 1].startsWith('--')) return argv[directIndex + 1];
  const matched = argv.find((arg) => arg.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : null;
}

function cliArgName(arg: string): string | null {
  if (!arg.startsWith('--')) return null;
  return arg.slice(2).split('=')[0] || null;
}

export function validateActiveMssReplayArgs(argv: string[] = process.argv.slice(2)): void {
  const unknown = argv
    .map(cliArgName)
    .filter((name): name is string => Boolean(name) && !ALLOWED_CLI_ARGS.has(name));
  if (unknown.length) {
    throw new Error(`Unknown active-MSS replay option(s): ${Array.from(new Set(unknown)).map((name) => `--${name}`).join(', ')}. Use --evaluate-from/--evaluate-to or aliases --from/--to for the replay date range.`);
  }
}

export function resolveActiveMssReplayDateRange(argv: string[] = process.argv.slice(2)): {
  evaluateFrom: string;
  evaluateTo: string;
} {
  validateActiveMssReplayArgs(argv);
  return {
    evaluateFrom: argValueFrom(argv, 'evaluate-from') || argValueFrom(argv, 'from') || '2026-05-07',
    evaluateTo: argValueFrom(argv, 'evaluate-to') || argValueFrom(argv, 'to') || '2026-06-05',
  };
}

function normalizeTime(value: string): string {
  return String(value || '').trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function timestampMs(value: string): number {
  return parseBridgeTime(value, 'eastern')?.getTime() ?? Number.NaN;
}

function validBar(bar: NinjaBridgeBar): boolean {
  return Boolean(
    bar &&
    typeof bar.time === 'string' &&
    Number.isFinite(bar.open) &&
    Number.isFinite(bar.high) &&
    Number.isFinite(bar.low) &&
    Number.isFinite(bar.close) &&
    bar.high >= Math.max(bar.open, bar.close) &&
    bar.low <= Math.min(bar.open, bar.close),
  );
}

function mergeBars(...sources: NinjaBridgeBar[][]): NinjaBridgeBar[] {
  const byTime = new Map<string, NinjaBridgeBar>();
  for (const source of sources) {
    for (const bar of source) {
      if (validBar(bar)) byTime.set(normalizeTime(bar.time), { ...bar, time: normalizeTime(bar.time) });
    }
  }
  return [...byTime.values()].sort((a, b) => timestampMs(a.time) - timestampMs(b.time));
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function eachChunkStartDate(fromDate: string, toDate: string, chunkDays: number): string[] {
  const dates: string[] = [];
  for (let cursor = fromDate; cursor <= toDate; cursor = addDays(cursor, chunkDays)) {
    dates.push(cursor);
  }
  return dates;
}

function dateOnly(value: string): string {
  return normalizeTime(value).slice(0, 10);
}

function minutesEt(value: string): number | null {
  const match = normalizeTime(value).match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isEvaluationTimestamp(value: string, fromDate: string, toDate: string): boolean {
  const date = dateOnly(value);
  const minutes = minutesEt(value);
  if (!date || minutes === null || date < fromDate || date > toDate) return false;
  return (minutes >= 10 * 60 && minutes < 12 * 60) || (minutes >= 12 * 60 && minutes < 15 * 60 + 30);
}

function replaySessionType(value: string): 'replay_morning' | 'replay_lunch' {
  const minutes = minutesEt(value) ?? 0;
  return minutes < 12 * 60 ? 'replay_morning' : 'replay_lunch';
}

function numberArg(name: string, fallback: number): number {
  const parsed = Number(argValue(name));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function barsThrough(bars: NinjaBridgeBar[], asOf: string): NinjaBridgeBar[] {
  const asOfMs = timestampMs(asOf);
  return bars.filter((bar) => timestampMs(bar.time) <= asOfMs);
}

function confirmedSwings(bars: NinjaBridgeBar[], strength = 1): SwingPoint[] {
  const swings: SwingPoint[] = [];
  for (let index = strength; index < bars.length - strength; index += 1) {
    const bar = bars[index];
    const left = bars.slice(index - strength, index);
    const right = bars.slice(index + 1, index + strength + 1);
    if (left.every((item) => bar.high > item.high) && right.every((item) => bar.high > item.high)) {
      swings.push({ type: 'high', index, price: bar.high, timestamp: bar.time });
    }
    if (left.every((item) => bar.low < item.low) && right.every((item) => bar.low < item.low)) {
      swings.push({ type: 'low', index, price: bar.low, timestamp: bar.time });
    }
  }
  return swings;
}

function lastSwingBefore(swings: SwingPoint[], index: number, type: SwingPoint['type']): SwingPoint | null {
  let found: SwingPoint | null = null;
  for (const swing of swings) {
    if (swing.index >= index) break;
    if (swing.type === type) found = swing;
  }
  return found;
}

function priorStructureDirection(swings: SwingPoint[], index: number): 'bullish' | 'bearish' | 'unknown' {
  const priorHighs = swings.filter((swing) => swing.type === 'high' && swing.index < index).slice(-2);
  const priorLows = swings.filter((swing) => swing.type === 'low' && swing.index < index).slice(-2);
  const highsRising = priorHighs.length === 2 && priorHighs[1].price > priorHighs[0].price;
  const lowsRising = priorLows.length === 2 && priorLows[1].price > priorLows[0].price;
  const highsFalling = priorHighs.length === 2 && priorHighs[1].price < priorHighs[0].price;
  const lowsFalling = priorLows.length === 2 && priorLows[1].price < priorLows[0].price;
  if ((highsRising && lowsRising) || (lowsRising && !highsFalling)) return 'bullish';
  if ((highsFalling && lowsFalling) || (highsFalling && !lowsRising)) return 'bearish';
  return 'unknown';
}

function structuralMssEventAt(bars: NinjaBridgeBar[], swings: SwingPoint[], index: number): {
  evidenceTimestamp: string;
  direction: 'bullish' | 'bearish';
  status: 'confirmed_mss';
  confidence: number;
} | null {
  const bar = bars[index];
  const prior = bars[index - 1];
  if (!bar || !prior) return null;
  const swingHigh = lastSwingBefore(swings, index, 'high');
  const swingLow = lastSwingBefore(swings, index, 'low');
  const structureDirection = priorStructureDirection(swings, index);
  if (swingHigh && prior.close <= swingHigh.price && bar.close > swingHigh.price && structureDirection === 'bearish') {
    return { evidenceTimestamp: bar.time, direction: 'bullish', status: 'confirmed_mss', confidence: 65 };
  }
  if (swingLow && prior.close >= swingLow.price && bar.close < swingLow.price && structureDirection === 'bullish') {
    return { evidenceTimestamp: bar.time, direction: 'bearish', status: 'confirmed_mss', confidence: 65 };
  }
  return null;
}

function barsNearStructuralMss(activeBars: NinjaBridgeBar[], all5mBars: NinjaBridgeBar[], postMssBars: number): {
  evaluationBars: NinjaBridgeBar[];
  structuralMssEvents: Array<{ evidenceTimestamp: string; direction: string; status: string; confidence: number }>;
} {
  const activeIndexes = new Map(activeBars.map((bar) => [normalizeTime(bar.time), bar]));
  const selected = new Map<string, NinjaBridgeBar>();
  const structuralMssByTimestamp = new Map<string, { evidenceTimestamp: string; direction: string; status: string; confidence: number }>();
  const swings = confirmedSwings(all5mBars);

  for (let index = 0; index < all5mBars.length; index += 1) {
    const bar = all5mBars[index];
    if (!activeIndexes.has(normalizeTime(bar.time))) continue;
    const event = structuralMssEventAt(all5mBars, swings, index);
    if (!event) continue;
    structuralMssByTimestamp.set(normalizeTime(event.evidenceTimestamp), event);
    for (let offset = 0; offset <= postMssBars; offset += 1) {
      const candidate = all5mBars[index + offset];
      if (candidate && activeIndexes.has(normalizeTime(candidate.time))) {
        selected.set(normalizeTime(candidate.time), candidate);
      }
    }
  }

  return {
    evaluationBars: [...selected.values()].sort((a, b) => timestampMs(a.time) - timestampMs(b.time)),
    structuralMssEvents: [...structuralMssByTimestamp.values()].sort((a, b) => timestampMs(a.evidenceTimestamp) - timestampMs(b.evidenceTimestamp)),
  };
}

function sameTradeDateBarsThrough(bars: NinjaBridgeBar[], asOf: string): NinjaBridgeBar[] {
  const date = dateOnly(asOf);
  return barsThrough(bars, asOf).filter((bar) => dateOnly(bar.time) === date);
}

async function fetchBridgeSegmented(args: {
  bridgeUrl: string;
  bridgeInstrument: string;
  timeframe: NinjaBridgeTimeframe;
  preloadDate: string;
  toDate: string;
  toTimestamp: string;
  chunkDays: number;
}): Promise<{ bars: NinjaBridgeBar[]; requests: number; failures: string[] }> {
  const chunks: NinjaBridgeBar[][] = [];
  const failures: string[] = [];
  let requests = 0;

  for (const date of eachChunkStartDate(args.preloadDate, args.toDate, args.chunkDays)) {
    const from = `${date}T00:00:00-04:00`;
    const nextChunkDate = addDays(date, args.chunkDays);
    const to = nextChunkDate > args.toDate ? args.toTimestamp : `${nextChunkDate}T00:00:00-04:00`;
    requests += 1;
    try {
      const response = await getNinjaHistoricalBars({
        instrument: args.bridgeInstrument,
        timeframe: args.timeframe,
        from,
        to,
        limit: 5000,
        baseUrl: args.bridgeUrl,
      });
      if (!response.ok) {
        failures.push(`${args.timeframe} ${from} to ${to}: ${response.error || 'bridge returned not ok'}`);
        continue;
      }
      chunks.push(response.bars || []);
    } catch (error) {
      failures.push(`${args.timeframe} ${from} to ${to}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { bars: mergeBars(...chunks), requests, failures };
}

async function loadTimeframeBars(args: {
  bridgeUrl: string;
  instrument: string;
  bridgeInstrument: string;
  timeframe: typeof TIMEFRAMES[number];
  preloadFrom: string;
  preloadDate: string;
  toDate: string;
  toTimestamp: string;
  chunkDays: number;
  skipMarketBars: boolean;
}): Promise<LoadedTimeframe> {
  const config = args.skipMarketBars ? null : loadMarketDataConfig();
  const cached = config
    ? await fetchCachedMarketBars({
      instrument: args.bridgeInstrument,
      timeframe: args.timeframe.market,
      from: args.preloadFrom,
      to: args.toTimestamp,
      config,
      limit: 25000,
    }).catch(() => [])
    : [];

  const bridge = await fetchBridgeSegmented({
    bridgeUrl: args.bridgeUrl,
    bridgeInstrument: args.bridgeInstrument,
    timeframe: args.timeframe.bridge,
    preloadDate: args.preloadDate,
    toDate: args.toDate,
    toTimestamp: args.toTimestamp,
    chunkDays: args.chunkDays,
  });

  const bars = bridge.bars.length ? mergeBars(bridge.bars) : mergeBars(cached);
  return {
    timeframe: args.timeframe.market as TimeframeKey,
    bars,
    cacheBars: cached.length,
    bridgeBars: bridge.bars.length,
    bridgeRequests: bridge.requests,
    bridgeFailures: bridge.failures,
    rangeStart: bars[0]?.time || null,
    rangeEnd: bars[bars.length - 1]?.time || null,
    source: cached.length && bridge.bars.length ? 'market_bars_read_ninjatrader_repair_preferred' : bridge.bars.length ? 'ninjatrader_historical_bars' : cached.length ? 'market_bars' : 'missing',
  };
}

function analysisForContext(context: ChartContext): AnalysisResult {
  return {
    dayType: context.htfLiquidityDrawState?.planDirection === 'SHORT' ? 'SHORT' : context.htfLiquidityDrawState?.planDirection === 'LONG' ? 'LONG' : 'NO TRADE',
    reasoning: 'Thirty-day OHLC replay. Existing scanner and final pipeline decide whether any plan would have triggered.',
    confidence: 0.7,
    checks: [{ label: 'NinjaTrader OHLC imported', passed: true }],
    structuredChartContext: context,
    current_rule_analysis: {
      summary: 'Replay context from NinjaTrader OHLC. Not a live alert and not broker execution.',
      setup_detected: 'Pending deterministic setup scan',
      rule_category: 'APP_OWNED_REPLAY',
      entry: null,
      stop: null,
      target_1: null,
      target_2: null,
      trigger_state: 'PENDING_TRIGGER',
      entry_trigger: null,
      no_trade_reason: null,
      base_confidence: 'Medium',
    },
    sessionLog: {
      timestamp: context.chartTimestamp || null,
      instrument: context.instrument,
      final_bias: context.htfLiquidityDrawState?.planDirection || 'WAIT',
      confidence: 0.7,
      key_structural_level: String(context.keyLevels.currentPrice || ''),
      recalibration_status: 'thirty_day_active_mss_plan_replay',
    },
  };
}

function candidateRow(candidate: any) {
  if (!candidate) return null;
  return {
    setupType: candidate.setupType,
    scenarioLabel: candidate.scenarioLabel,
    pathway: candidate.pathway,
    direction: candidate.direction,
    executionStatus: candidate.executionStatus,
    candidateState: candidate.candidateState,
    entry: candidate.entry,
    stop: candidate.stop,
    target1: candidate.target1,
    target2: candidate.target2,
    riskPoints: candidate.riskPoints,
    blockReason: candidate.blockReason,
    activeTimeframeMssRuleset: summarizeActiveTimeframeMssRuleset(candidate),
    missingEvidence: candidate.missingEvidence || [],
    evidence: candidate.evidence || [],
  };
}

function slimCandidateRow(candidate: any) {
  if (!candidate) return null;
  return {
    setupType: candidate.setupType,
    scenarioLabel: candidate.scenarioLabel,
    pathway: candidate.pathway,
    direction: candidate.direction,
    executionStatus: candidate.executionStatus,
    candidateState: candidate.candidateState,
    humanReview: candidate.humanReview || null,
    entry: candidate.entry,
    stop: candidate.stop,
    target1: candidate.target1,
    target2: candidate.target2,
    riskPoints: candidate.riskPoints,
    blockReason: candidate.blockReason,
    modelConfidenceScore: candidate.modelConfidenceScore,
    activeTimeframeMssRuleset: summarizeActiveTimeframeMssRuleset(candidate),
    evidence: (candidate.evidence || []).slice(0, 12),
    missingEvidence: (candidate.missingEvidence || []).slice(0, 12),
    requiredTrigger: candidate.requiredTrigger,
    nextAction: candidate.nextAction,
  };
}

function slimDiscordPreview(args: {
  sessionType: 'morning' | 'lunch' | 'replay_morning' | 'replay_lunch';
  tradeDate: string;
  instrument: 'MES' | 'MNQ';
  normalized: ReturnType<typeof normalizeTradePlan>;
  candidate: any;
}) {
  const payload = compactDiscordSummary({
    session: args.sessionType === 'lunch' || args.sessionType === 'replay_lunch' ? 'lunch' : 'morning',
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    planVersionId: `SLIM-OPENING-DRIVE-${args.tradeDate}`,
    normalized: {
      ...args.normalized,
      canExecute: false,
      decisionStatus: TradeDecisionStatus.ConditionalTrade,
    },
    candidates: [args.candidate],
    attachments: { chartPlan: false, priceLevelMap: false },
    sourceLabel: 'Scanner',
    windowLabel: 'Opening Drive FVG 09:30-11:00 ET',
    statusOverride: 'Conditional',
  });
  return {
    content: payload.content || '',
    embedTitle: payload.embeds?.[0]?.title || null,
    embedDescription: payload.embeds?.[0]?.description || null,
    fieldNames: payload.embeds?.[0]?.fields?.map((field: any) => field.name) || [],
    containsHumanReviewReady: JSON.stringify(payload).includes('HUMAN REVIEW READY'),
    containsTraderConfirmation: JSON.stringify(payload).includes('Trader must confirm entry before action.'),
    containsCanExecuteTrue: JSON.stringify(payload).includes('canExecute: true'),
  };
}

function buildReplayMarkdown(report: any): string {
  const triggered = report.triggeredPlans || [];
  const scannerExecutable = report.scannerExecutableCandidates || [];
  const openingDrive = report.openingDriveHumanReviewCandidates || [];
  return [
    report.reportType === 'slim_opening_drive_fvg_replay' ? '# Slim Opening Drive FVG Replay' : '# Thirty-Day Active MSS Plan Replay',
    '',
    `Instrument: ${report.instrument} (${report.bridgeInstrument})`,
    `Evaluation window: ${report.window.evaluateFrom} to ${report.window.evaluateTo}`,
    `Preload: ${report.window.preloadFrom} to ${report.window.toTimestamp}`,
    `Boundary: ${report.boundary}`,
    `Runtime mode: ${report.runtimePolicy?.memoryMode || 'bounded_samples'}; retained samples: ${report.runtimePolicy?.maxSamples ?? 'N/A'}; verbose rows: ${report.runtimePolicy?.verboseRows === true ? 'yes' : 'no'}`,
    '',
    '## Summary',
    `- Active-window completed 5M bars loaded: ${report.totals.activeWindow5mBars}`,
    `- Structural 5M MSS events found: ${report.totals.structuralMssEvents}`,
    `- Completed 5M bars evaluated around MSS: ${report.totals.evaluated5mBars}`,
    `- Final executable plans (raw ApprovedTrade + effective canExecute=true): ${report.totals.finalApprovedCanExecute}`,
    `- Scanner executable candidates before final gates: ${report.totals.scannerExecutableCandidates} (${report.totals.scannerExecutableCandidateSamples ?? scannerExecutable.length} samples retained)`,
    `- Conditional candidates observed: ${report.totals.conditionalCandidates} (${report.totals.conditionalCandidateSamples} samples retained)`,
    `- Active MSS blocked executable candidates: ${report.totals.activeMssBlockedExecutableCandidates} (${report.totals.activeMssBlockedExecutableCandidateSamples} samples retained)`,
    ...(report.reportType === 'slim_opening_drive_fvg_replay' ? [
      `- Opening Drive candidates observed: ${report.totals.openingDriveCandidates}`,
      `- Opening Drive Human Review Ready: ${report.totals.openingDriveHumanReviewReady}`,
    ] : []),
    '',
    '## Data Coverage',
    '| Timeframe | Source | Bars | Cache | Bridge | Range Start | Range End | Bridge Failures |',
    '|---|---|---:|---:|---:|---|---|---:|',
    ...report.coverage.map((item: any) => `| ${item.timeframe} | ${item.source} | ${item.barsLoaded} | ${item.cacheBars} | ${item.bridgeBars} | ${item.rangeStart || 'N/A'} | ${item.rangeEnd || 'N/A'} | ${item.bridgeFailures.length} |`),
    '',
    '## Triggered Plans',
    triggered.length
      ? '| Time | Session | Setup | Direction | Entry | Stop | T1 | T2 | canExecute |'
      : 'No final executable plans were found in this replay.',
    ...(triggered.length ? [
      '|---|---|---|---|---:|---:|---:|---:|---|',
      ...triggered.map((item: any) => `| ${item.timestamp} | ${item.sessionType} | ${item.finalGateResult.bestExecutableCandidate?.setupType || item.pipelineStatus} | ${item.finalGateResult.bestExecutableCandidate?.direction || 'N/A'} | ${item.finalGateResult.finalPlanEntry ?? 'N/A'} | ${item.finalGateResult.finalPlanStop ?? 'N/A'} | ${item.finalGateResult.target1 ?? 'N/A'} | ${item.finalGateResult.target2 ?? 'N/A'} | ${item.finalGateResult.canExecute} |`),
    ] : []),
    '',
    '## Scanner Executable Candidates Before Final Gates',
    scannerExecutable.length
      ? '| Time | Session | Setup | Direction | Entry | Stop | T1 | T2 | Raw Status | Effective Execution | canExecute | Active MSS |'
      : 'No scanner executable candidates were found.',
    ...(scannerExecutable.length ? [
      '|---|---|---|---|---:|---:|---:|---:|---|---|---|---|',
      ...scannerExecutable.map((item: any) => `| ${item.timestamp} | ${item.sessionType} | ${item.bestExecutableCandidate?.setupType || 'N/A'} | ${item.bestExecutableCandidate?.direction || 'N/A'} | ${item.bestExecutableCandidate?.entry ?? 'N/A'} | ${item.bestExecutableCandidate?.stop ?? 'N/A'} | ${item.bestExecutableCandidate?.target1 ?? 'N/A'} | ${item.bestExecutableCandidate?.target2 ?? 'N/A'} | ${item.finalGateResult.rawStatus || item.finalGateResult.status} | ${item.finalGateResult.effectiveExecutionStatus || 'N/A'} | ${item.finalGateResult.canExecute} | ${item.bestExecutableCandidate?.activeTimeframeMssRuleset?.status || 'N/A'} |`),
    ] : []),
    ...(report.reportType === 'slim_opening_drive_fvg_replay' ? [
      '',
      '## Opening Drive FVG Human-Review Candidates',
      openingDrive.length
        ? '| Time | State | Direction | Entry | Stop | T1 | T2 | canExecute | Trader Confirmation | Discord Human Review |'
        : 'No Opening Drive FVG human-review candidates were found.',
      ...(openingDrive.length ? [
        '|---|---|---|---:|---:|---:|---:|---|---|---|',
        ...openingDrive.map((item: any) => `| ${item.timestamp} | ${item.candidate?.candidateState || 'N/A'} | ${item.candidate?.direction || 'N/A'} | ${item.candidate?.entry ?? 'N/A'} | ${item.candidate?.stop ?? 'N/A'} | ${item.candidate?.target1 ?? 'N/A'} | ${item.candidate?.target2 ?? 'N/A'} | ${item.candidate?.humanReview?.canExecute === false ? 'false' : 'N/A'} | ${item.candidate?.humanReview?.requiresTraderConfirmation === true ? 'true' : 'N/A'} | ${item.discordPreview?.containsHumanReviewReady ? 'yes' : 'no'} |`),
      ] : []),
    ] : []),
    '',
    '## Authority',
    '- Uses OHLC-derived replay context only.',
    '- Uses existing setup scanner and final trade decision pipeline.',
    '- Raw ApprovedTrade is reported separately from effective execution; executable means effective canExecute=true.',
    '- Default replay output retains bounded diagnostic samples to avoid Node heap pressure. Use verbose rows only when full row retention is required.',
    '- No narrative reconstruction, screenshot fallback, Discord post, bridge behavior change, or broker execution.',
  ].join('\n');
}

async function main() {
  const dateRange = resolveActiveMssReplayDateRange();
  const bridgeUrl = argValue('bridge-url') || process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765';
  const instrument = argValue('instrument') || 'MES';
  const bridgeInstrument = argValue('bridge-instrument') || 'MES 06-26';
  const evaluateFrom = dateRange.evaluateFrom;
  const evaluateTo = dateRange.evaluateTo;
  const preloadDate = argValue('preload-date') || '2026-04-07';
  const chunkDays = numberArg('chunk-days', 14);
  const postMssBars = numberArg('post-mss-bars', 6);
  const skipMarketBars = argValue('skip-market-bars') === 'true';
  const slimOpeningDrive = argValue('slim-opening-drive') === 'true';
  const allowHeavyReplay = argValue('allow-heavy-replay') === 'true';
  const verboseRows = argValue('verbose-rows') === 'true';
  const maxSamples = Math.max(0, Math.floor(numberArg('max-samples', slimOpeningDrive ? 80 : 80)));
  const maxStructuralMssEvents = Math.max(0, Math.floor(numberArg('max-structural-mss-events', slimOpeningDrive ? 25 : 250)));
  const preloadFrom = `${preloadDate}T00:00:00-04:00`;
  const toTimestamp = `${evaluateTo}T16:00:00-04:00`;
  const jsonPath = resolve(argValue('json') || DEFAULT_JSON);
  const mdPath = resolve(argValue('md') || DEFAULT_MD);

  if (!slimOpeningDrive && !allowHeavyReplay) {
    throw new Error('Full active-MSS replay is heap-heavy and must be requested explicitly with --allow-heavy-replay=true. Use npm run diagnostic:protected-structure-trend-confirmation for the standard prior-week 15M+5M alignment proof.');
  }

  mkdirSync(REPORT_DIR, { recursive: true });

  const loaded = await Promise.all(TIMEFRAMES.map((timeframe) => loadTimeframeBars({
    bridgeUrl,
    instrument,
    bridgeInstrument,
    timeframe,
    preloadFrom,
    preloadDate,
    toDate: evaluateTo,
    toTimestamp,
    chunkDays,
    skipMarketBars,
  })));

  const barsByTimeframe = loaded.reduce((acc, item, index) => {
    acc[TIMEFRAMES[index].contextKey] = item.bars as never;
    return acc;
  }, { bars5m: [], bars15m: [], bars60m: [], bars120m: [], bars240m: [] } as BarsByTimeframe);

  const activeWindowBars = barsByTimeframe.bars5m.filter((bar) => isEvaluationTimestamp(bar.time, evaluateFrom, evaluateTo));
  const mssReplayWindow = barsNearStructuralMss(activeWindowBars, barsByTimeframe.bars5m, postMssBars);
  const boundedMssEvaluationBars = maxStructuralMssEvents > 0 && !verboseRows
    ? mssReplayWindow.evaluationBars.slice(0, maxStructuralMssEvents)
    : mssReplayWindow.evaluationBars;
  const openingDriveWindowBars = activeWindowBars.filter((bar) => {
    const minutes = minutesEt(bar.time);
    return minutes !== null && minutes >= 9 * 60 + 30 && minutes < 11 * 60;
  });
  const evaluationBars = slimOpeningDrive ? openingDriveWindowBars : boundedMssEvaluationBars;
  const triggeredPlans: any[] = [];
  const scannerExecutableCandidates: any[] = [];
  const conditionalCandidateSamples: any[] = [];
  const activeMssBlockedExecutableCandidates: any[] = [];
  const openingDriveHumanReviewCandidates: any[] = [];
  let scannerExecutableCandidateCount = 0;
  let openingDriveCandidateCount = 0;
  let openingDriveHumanReviewReadyCount = 0;
  let conditionalCandidateCount = 0;
  let activeMssBlockedExecutableCandidateCount = 0;
  const errors: string[] = [];

  for (const bar of evaluationBars) {
    const sessionType = replaySessionType(bar.time);
    const tradeDate = dateOnly(bar.time);
    const context = buildNinjaChartContext({
      bars5m: sameTradeDateBarsThrough(barsByTimeframe.bars5m, bar.time),
      htfBars5m: barsThrough(barsByTimeframe.bars5m, bar.time),
      bars15m: barsThrough(barsByTimeframe.bars15m, bar.time),
      bars60m: barsThrough(barsByTimeframe.bars60m, bar.time),
      bars120m: barsThrough(barsByTimeframe.bars120m, bar.time),
      bars240m: barsThrough(barsByTimeframe.bars240m, bar.time),
      sessionType,
      instrument: instrument === 'MNQ' ? 'MNQ' : 'MES',
      tradeDate,
      barTimestampMode: 'open',
      barTimeZone: 'eastern',
    }) as ChartContext | null;
    if (!context) {
      errors.push(`${bar.time}: buildNinjaChartContext returned null.`);
      continue;
    }

    const analysis = analysisForContext(context);
    const scan = scanSetupCandidates({ sessionType, chartContext: context, result: analysis });
    const pipeline = runTradeDecisionPipeline({
      result: analysis,
      sessionType,
      instrument: instrument === 'MNQ' ? 'MNQ' : 'MES',
      tradeDate,
    });
    const normalized = normalizeTradePlan(analysis, instrument === 'MNQ' ? 'MNQ' : 'MES', sessionType);
    const canExecute = getEffectiveCanExecute({
      decisionStatus: pipeline.status,
      canExecute: normalized.canExecute,
    });
    const finalGateResult = {
      status: pipeline.status,
      ...buildReplayExecutionSummary({
        status: pipeline.status,
        canExecute,
        normalizedCanExecuteRaw: normalized.canExecute,
      }),
      finalPlanEntry: pipeline.finalTradePlan.entry,
      finalPlanStop: pipeline.finalTradePlan.stop,
      target1: pipeline.finalTradePlan.target1,
      target2: pipeline.finalTradePlan.target2,
      noTradeReason: pipeline.noTradeReason,
      bestExecutableCandidate: slimOpeningDrive ? slimCandidateRow(pipeline.opportunitySelection?.bestExecutableCandidate || null) : candidateRow(pipeline.opportunitySelection?.bestExecutableCandidate || null),
      bestConditionalCandidate: slimOpeningDrive ? slimCandidateRow(pipeline.opportunitySelection?.bestConditionalCandidate || null) : candidateRow(pipeline.opportunitySelection?.bestConditionalCandidate || null),
    };
    const openingDriveCandidate = scan.candidates.find((candidate) =>
      candidate.setupType === SetupType.NoSetup &&
      candidate.detectedStatus !== 'NotDetected'
    ) || null;
    if (openingDriveCandidate) {
      openingDriveCandidateCount += 1;
      if (openingDriveCandidate.humanReview?.status === 'HumanReviewReady') openingDriveHumanReviewReadyCount += 1;
      if (shouldRetainReplaySample({
        currentLength: openingDriveHumanReviewCandidates.length,
        maxSamples,
        verboseRows,
      })) {
        openingDriveHumanReviewCandidates.push({
          timestamp: bar.time,
          tradeDate,
          sessionType,
          chartTimestamp: context.chartTimestamp,
          candidate: slimCandidateRow(openingDriveCandidate),
          fvgZones: (context.fvgZones || [])
            .filter((zone) => zone.direction === openingDriveCandidate.direction)
            .slice(0, 5),
          latest5mCandles: (context.candles || []).slice(-8),
          timeframeMssEvidenceSummary: context.timeframeMssEvidence ? {
            source: context.timeframeMssEvidence.source,
            timeframes: Object.values(context.timeframeMssEvidence.timeframes).map((item) => ({
              timeframe: item.timeframe,
              direction: item.direction,
              status: item.status,
              evidenceTimestamp: item.evidenceTimestamp,
              completedBarStatus: item.completedBarStatus,
              confidence: item.confidence,
            })),
          } : null,
          discordPreview: openingDriveCandidate.humanReview?.status === 'HumanReviewReady'
            ? slimDiscordPreview({
              sessionType,
              tradeDate,
              instrument: instrument === 'MNQ' ? 'MNQ' : 'MES',
              normalized,
              candidate: openingDriveCandidate,
            })
            : null,
        });
      }
    }
    const row = {
      timestamp: bar.time,
      tradeDate,
      sessionType,
      chartTimestamp: context.chartTimestamp,
      timeframeMssEvidenceSummary: context.timeframeMssEvidence ? {
        source: context.timeframeMssEvidence.source,
        timeframes: Object.values(context.timeframeMssEvidence.timeframes).map((item) => ({
          timeframe: item.timeframe,
          direction: item.direction,
          status: item.status,
          evidenceTimestamp: item.evidenceTimestamp,
          completedBarStatus: item.completedBarStatus,
          confidence: item.confidence,
        })),
      } : null,
      htfContextSufficiency: context.htfLiquidityDrawState?.htfContextSufficiency || null,
      bestExecutableCandidate: slimOpeningDrive ? slimCandidateRow(scan.bestExecutableCandidate) : candidateRow(scan.bestExecutableCandidate),
      bestConditionalCandidate: slimOpeningDrive ? slimCandidateRow(scan.bestConditionalCandidate) : candidateRow(scan.bestConditionalCandidate),
      finalGateResult,
      pipelineStatus: pipeline.status,
    };

    if (scan.bestExecutableCandidate) {
      scannerExecutableCandidateCount += 1;
      if (shouldRetainReplaySample({
        currentLength: scannerExecutableCandidates.length,
        maxSamples,
        verboseRows,
      })) scannerExecutableCandidates.push(row);
    }
    if (scan.bestConditionalCandidate) {
      conditionalCandidateCount += 1;
      if (!slimOpeningDrive && shouldRetainReplaySample({
        currentLength: conditionalCandidateSamples.length,
        maxSamples,
        verboseRows,
      })) conditionalCandidateSamples.push(row);
    }
    if (pipeline.status === TradeDecisionStatus.ApprovedTrade && canExecute) triggeredPlans.push(row);
    const mssSummary = summarizeActiveTimeframeMssRuleset(scan.bestConditionalCandidate || scan.bestExecutableCandidate || null);
    if (mssSummary.affectsExecution && mssSummary.status === 'blocked') {
      activeMssBlockedExecutableCandidateCount += 1;
      if (!slimOpeningDrive && shouldRetainReplaySample({
        currentLength: activeMssBlockedExecutableCandidates.length,
        maxSamples,
        verboseRows,
      })) activeMssBlockedExecutableCandidates.push(row);
    }
  }

  const report = {
    reportType: slimOpeningDrive ? 'slim_opening_drive_fvg_replay' : 'thirty_day_active_mss_plan_replay',
    createdAt: new Date().toISOString(),
    instrument,
    bridgeInstrument,
    bridgeUrl,
    window: {
      evaluateFrom,
      evaluateTo,
      preloadFrom,
      toTimestamp,
      activeWindows: ['09:15-12:00 America/New_York', '12:00-16:00 America/New_York'],
      postMssBars,
      bridgeChunkDays: chunkDays,
      slimOpeningDrive,
    },
    runtimePolicy: {
      memoryMode: verboseRows ? 'verbose_rows' : 'bounded_samples',
      verboseRows,
      maxSamples,
      maxStructuralMssEvents,
      structuralMssEvaluationBarsRetained: evaluationBars.length,
      fullRowsRetained: verboseRows,
      nodeHeapRecommendation: 'Use npm run diagnostic:active-mss-replay:verbose only when full diagnostic row retention is required.',
    },
    sourcePolicy: {
      readMarketBarsFirst: !skipMarketBars,
      repairFromNinjaTraderHistoricalBars: true,
      skippedMarketBars: skipMarketBars,
      narrativeFallbackUsed: false,
      screenshotFallbackUsed: false,
    },
    boundary: 'ohlc_replay_existing_live_rules_only_not_execution_authority',
    coverage: loaded.map((item) => ({
      timeframe: item.timeframe,
      source: item.source,
      barsLoaded: item.bars.length,
      cacheBars: item.cacheBars,
      bridgeBars: item.bridgeBars,
      bridgeRequests: item.bridgeRequests,
      rangeStart: item.rangeStart,
      rangeEnd: item.rangeEnd,
      bridgeFailures: item.bridgeFailures,
    })),
    totals: {
      activeWindow5mBars: activeWindowBars.length,
      structuralMssEvents: mssReplayWindow.structuralMssEvents.length,
      evaluated5mBars: evaluationBars.length,
      openingDriveWindow5mBars: openingDriveWindowBars.length,
      finalApprovedCanExecute: triggeredPlans.length,
      scannerExecutableCandidates: scannerExecutableCandidateCount,
      scannerExecutableCandidateSamples: scannerExecutableCandidates.length,
      conditionalCandidates: conditionalCandidateCount,
      conditionalCandidateSamples: conditionalCandidateSamples.length,
      activeMssBlockedExecutableCandidates: activeMssBlockedExecutableCandidateCount,
      activeMssBlockedExecutableCandidateSamples: activeMssBlockedExecutableCandidates.length,
      openingDriveCandidates: openingDriveCandidateCount,
      openingDriveHumanReviewReady: openingDriveHumanReviewReadyCount,
      openingDriveCandidateSamples: openingDriveHumanReviewCandidates.length,
      errors: errors.length,
    },
    structuralMssEvents: verboseRows ? mssReplayWindow.structuralMssEvents : mssReplayWindow.structuralMssEvents.slice(0, maxStructuralMssEvents),
    triggeredPlans,
    scannerExecutableCandidates,
    conditionalCandidateSamples,
    activeMssBlockedExecutableCandidates,
    openingDriveHumanReviewCandidates,
    errors,
    authority: {
      changesTradeLogic: false,
      approvesExecution: false,
      changesScannerBehavior: false,
      changesBridgeBehavior: false,
      changesDiscordBehavior: false,
    },
  };

  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, `${buildReplayMarkdown(report)}\n`);
  console.log(`Thirty-day active MSS plan replay complete: evaluated5mBars=${report.totals.evaluated5mBars}, finalApprovedCanExecute=${report.totals.finalApprovedCanExecute}, scannerExecutableCandidates=${report.totals.scannerExecutableCandidates}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`Markdown: ${mdPath}`);
}

if (process.argv[1] && resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
