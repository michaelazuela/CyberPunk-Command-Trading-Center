import dotenv from 'dotenv';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getNinjaHistoricalBars, type NinjaBridgeBar, type NinjaBridgeTimeframe } from '../../src/lib/ninjaTraderBridge';
import { parseBridgeTime } from '../../src/lib/localScannerEngine';
import { buildMultiTimeframeMssEvidenceLayer } from '../../src/lib/timeframeMssEvidence';
import { targetsFromEntryStop, TRADE_RULES } from '../../src/config/tradeRules';
import type { ChartContext, StructuralLevel, TargetObjective } from '../../src/types';
import { fetchCachedMarketBars, loadMarketDataConfig, type MarketBarTimeframe } from './market-data-store';
import { buildStructuralLevels } from '../../src/lib/sessionStructure';
import { buildSessionStory } from '../../src/lib/sessionStoryEngine';
import { buildSessionLevelContext } from '../../src/lib/sessionLevelContextEngine';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type TimeframeKey = '5m' | '15m' | '60m' | '120m' | '240m';
type Direction = 'LONG' | 'SHORT';

const REPORT_DIR = resolve('tools/automation/replay-diagnostics');
const TIMEFRAMES: Array<{ bridge: NinjaBridgeTimeframe; market: MarketBarTimeframe; key: TimeframeKey }> = [
  { bridge: '5m', market: '5m', key: '5m' },
  { bridge: '15m', market: '15m', key: '15m' },
  { bridge: '60m', market: '60m', key: '60m' },
  { bridge: '120m', market: '120m', key: '120m' },
  { bridge: '240m', market: '240m', key: '240m' },
];

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

interface FvgZone {
  direction: Direction;
  lower: number;
  upper: number;
  formedAt: string;
  formedIndex: number;
}

interface HtfLine {
  price: number;
  label: string;
  source: string;
  type: string;
  reason: string;
}

interface AuditCandidate {
  timestamp: string;
  tradeDate: string;
  direction: Direction;
  latestClose: number;
  fifteenMssTimestamp: string | null;
  fiveMssTimestamp: string | null;
  fvg: FvgZone | null;
  triggerType: 'fvg_retest_rejection' | 'htf_close_through' | 'both';
  lineInSand: HtfLine | null;
  lineCloseThrough: boolean;
  htfValidationStatus: 'passed' | 'blocked' | 'no_structured_line';
  entry: number | null;
  stop: number | null;
  riskPoints: number | null;
  target1: number | null;
  target2: number | null;
  outcomeToClose: {
    firstHit: 'T1' | 'T2' | 'STOP' | 'NONE' | 'AMBIGUOUS';
    maxFavorablePoints: number | null;
    maxAdversePoints: number | null;
    exitPrice: number | null;
    points: number | null;
    mesProfitLossDollars: number | null;
  };
  notes: string[];
}

interface DailyAuditSummary {
  tradeDate: string;
  lateBarsEvaluated: number;
  alignedMssBars: number;
  candidateCount: number;
  longs: number;
  shorts: number;
  t1: number;
  t2: number;
  stop: number;
  none: number;
  ambiguous: number;
  passedHtfValidation: number;
  blockedByHtfLine: number;
  noStructuredLine: number;
  realizedMesProfitLossDollars: number;
}

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const directIndex = process.argv.indexOf(`--${name}`);
  if (directIndex >= 0 && process.argv[directIndex + 1]) return process.argv[directIndex + 1];
  const matched = process.argv.find((arg) => arg.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : null;
}

function normalizeTime(value: string): string {
  return String(value || '').trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function timestampMs(value: string): number {
  return parseBridgeTime(value, 'eastern')?.getTime() ?? Number.NaN;
}

function dateOnly(value: string): string {
  return normalizeTime(value).slice(0, 10);
}

function minutesEt(value: string): number | null {
  const match = normalizeTime(value).match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function parseWindowMinute(value: string, fallback: number): number {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return fallback;
  }
  return hour * 60 + minute;
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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

function through(bars: NinjaBridgeBar[], timestamp: string): NinjaBridgeBar[] {
  const end = timestampMs(timestamp);
  return bars.filter((bar) => timestampMs(bar.time) <= end);
}

function sameDateAfter(bars: NinjaBridgeBar[], timestamp: string): NinjaBridgeBar[] {
  const date = dateOnly(timestamp);
  const start = timestampMs(timestamp);
  return bars.filter((bar) => dateOnly(bar.time) === date && timestampMs(bar.time) > start);
}

function roundToTick(price: number): number {
  return Math.round(price / TRADE_RULES.targetModel.tickSize) * TRADE_RULES.targetModel.tickSize;
}

async function fetchBridgeSegmented(args: {
  bridgeUrl: string;
  bridgeInstrument: string;
  timeframe: NinjaBridgeTimeframe;
  fromDate: string;
  toDate: string;
}): Promise<{ bars: NinjaBridgeBar[]; requests: number; failures: string[] }> {
  const bars: NinjaBridgeBar[] = [];
  const failures: string[] = [];
  let requests = 0;
  for (let date = args.fromDate; date <= args.toDate; date = addDays(date, 1)) {
    const nextDate = addDays(date, 1);
    const from = `${date}T00:00:00-04:00`;
    const to = nextDate > args.toDate ? `${args.toDate}T16:00:00-04:00` : `${nextDate}T00:00:00-04:00`;
    requests += 1;
    try {
      const response = await Promise.race([
        getNinjaHistoricalBars({
          instrument: args.bridgeInstrument,
          timeframe: args.timeframe,
          from,
          to,
          limit: 2000,
          baseUrl: args.bridgeUrl,
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('bridge historical-bars request timed out after 15000ms')), 15_000);
        }),
      ]);
      if (response.ok && Array.isArray(response.bars)) bars.push(...response.bars);
      else failures.push(`${args.timeframe} ${from} to ${to}: ${response.error || 'bridge returned not ok'}`);
    } catch (error) {
      failures.push(`${args.timeframe} ${from} to ${to}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { bars: mergeBars(bars), requests, failures };
}

async function fetchBridgeRange(args: {
  bridgeUrl: string;
  bridgeInstrument: string;
  timeframe: NinjaBridgeTimeframe;
  fromDate: string;
  toDate: string;
}): Promise<{ bars: NinjaBridgeBar[]; requests: number; failures: string[] }> {
  const from = `${args.fromDate}T00:00:00-04:00`;
  const to = `${args.toDate}T16:40:00-04:00`;
  try {
    const response = await Promise.race([
      getNinjaHistoricalBars({
        instrument: args.bridgeInstrument,
        timeframe: args.timeframe,
        from,
        to,
        limit: 20000,
        baseUrl: args.bridgeUrl,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('bridge historical-bars range request timed out after 30000ms')), 30_000);
      }),
    ]);
    if (response.ok && Array.isArray(response.bars)) {
      return { bars: mergeBars(response.bars), requests: 1, failures: [] };
    }
    return { bars: [], requests: 1, failures: [`${args.timeframe} ${from} to ${to}: ${response.error || 'bridge returned not ok'}`] };
  } catch (error) {
    return { bars: [], requests: 1, failures: [`${args.timeframe} ${from} to ${to}: ${error instanceof Error ? error.message : String(error)}`] };
  }
}

async function loadTimeframe(args: {
  bridgeUrl: string;
  instrument: string;
  bridgeInstrument: string;
  timeframe: { bridge: NinjaBridgeTimeframe; market: MarketBarTimeframe; key: TimeframeKey };
  fromDate: string;
  toDate: string;
  skipBridge: boolean;
  skipCache: boolean;
  singleBridgeRange: boolean;
}): Promise<LoadedTimeframe> {
  const from = `${args.fromDate}T00:00:00-04:00`;
  const to = `${args.toDate}T16:00:00-04:00`;
  const config = loadMarketDataConfig();
  const cached = !args.skipCache && config
    ? await fetchCachedMarketBars({
      instrument: args.bridgeInstrument,
      timeframe: args.timeframe.market,
      from,
      to,
      config,
      limit: 20000,
    }).catch(() => [])
    : [];
  const bridge = args.skipBridge
    ? { bars: [] as NinjaBridgeBar[], requests: 0, failures: [] as string[] }
    : args.singleBridgeRange
    ? await fetchBridgeRange({
      bridgeUrl: args.bridgeUrl,
      bridgeInstrument: args.bridgeInstrument,
      timeframe: args.timeframe.bridge,
      fromDate: args.fromDate,
      toDate: args.toDate,
    })
    : await fetchBridgeSegmented({
      bridgeUrl: args.bridgeUrl,
      bridgeInstrument: args.bridgeInstrument,
      timeframe: args.timeframe.bridge,
      fromDate: args.fromDate,
      toDate: args.toDate,
    });
  const bars = mergeBars(cached, bridge.bars);
  return {
    timeframe: args.timeframe.key,
    bars,
    cacheBars: cached.length,
    bridgeBars: bridge.bars.length,
    bridgeRequests: bridge.requests,
    bridgeFailures: bridge.failures,
    rangeStart: bars[0]?.time || null,
    rangeEnd: bars[bars.length - 1]?.time || null,
    source: cached.length && bridge.bars.length ? 'market_bars_read_ninjatrader_repair' : bridge.bars.length ? 'ninjatrader_historical_bars' : cached.length ? 'market_bars' : 'missing',
  };
}

function detectFvgs(bars: NinjaBridgeBar[]): FvgZone[] {
  const zones: FvgZone[] = [];
  for (let index = 2; index < bars.length; index += 1) {
    const first = bars[index - 2];
    const third = bars[index];
    if (third.low > first.high) {
      zones.push({ direction: 'LONG', lower: roundToTick(first.high), upper: roundToTick(third.low), formedAt: third.time, formedIndex: index });
    }
    if (third.high < first.low) {
      zones.push({ direction: 'SHORT', lower: roundToTick(third.high), upper: roundToTick(first.low), formedAt: third.time, formedIndex: index });
    }
  }
  return zones;
}

function latestRetestedFvg(args: {
  bars: NinjaBridgeBar[];
  zones: FvgZone[];
  bar: NinjaBridgeBar;
  direction: Direction;
}): FvgZone | null {
  const barIndex = args.bars.findIndex((item) => normalizeTime(item.time) === normalizeTime(args.bar.time));
  if (barIndex < 0) return null;
  return [...args.zones]
    .filter((zone) => zone.direction === args.direction && zone.formedIndex < barIndex)
    .reverse()
    .find((zone) => {
      const touched = args.bar.high >= zone.lower && args.bar.low <= zone.upper;
      if (!touched) return false;
      return args.direction === 'SHORT'
        ? args.bar.close < zone.lower
        : args.bar.close > zone.upper;
    }) || null;
}

function readableConfidence(value: unknown): boolean {
  return value === 'High' || value === 'Medium';
}

function scannerContextForLineMap(args: {
  bar: NinjaBridgeBar;
  tradeDate: string;
  instrument: string;
  bars5m: NinjaBridgeBar[];
  bars15m: NinjaBridgeBar[];
  bars60m: NinjaBridgeBar[];
  bars120m: NinjaBridgeBar[];
  bars240m: NinjaBridgeBar[];
}): Partial<ChartContext> | null {
  const executionBars = args.bars5m.filter(validBar);
  if (!executionBars.length) return null;
  const last = executionBars[executionBars.length - 1];
  const first = executionBars[0];
  const allContextBars = [
    ...args.bars240m,
    ...args.bars120m,
    ...args.bars60m,
    ...args.bars15m,
    ...executionBars,
  ].filter(validBar);
  const baseStructuralLevels = buildStructuralLevels({
    bars5m: executionBars,
    bars15m: args.bars15m,
    bars60m: args.bars60m,
    bars120m: args.bars120m,
    bars240m: args.bars240m,
    rthOpen: first.open,
  });
  const sessionStory = buildSessionStory({
    bars: allContextBars,
    currentPrice: last.close,
    fvgZones: [],
    displacementCandles: [],
  });
  const sessionLevelContext = buildSessionLevelContext([...baseStructuralLevels, ...sessionStory.targetLevels], last.close, { fvgZones: [] });
  return {
    sessionType: 'replay_lunch',
    instrument: args.instrument === 'MNQ' ? 'MNQ' : 'MES',
    tradeDate: args.tradeDate,
    structuralLevels: sessionLevelContext.levels,
    sessionLevelContext,
    sessionStory,
    targetObjectives: sessionLevelContext.levels.map((level) => ({
      label: level.label,
      price: level.price,
      direction: level.directionRelevance === 'SHORT' ? 'SHORT' : 'LONG',
      source: level.source,
      type: level.type,
      confidence: level.confidence,
      score: level.strengthScore || 0,
      distancePoints: null,
      rMultiple: null,
      reason: `${level.label} from ${level.source} is available as target context. Strength=${level.strengthLabel || 'Low'} (${level.strengthScore || 0}).`,
    })),
  };
}

function structuralLineCandidates(context: Partial<ChartContext>, direction: Direction, currentPrice: number, target1: number | null): HtfLine[] {
  const structural = [
    ...(context.structuralLevels || []),
    ...(context.sessionLevelContext?.levels || []),
    ...(context.sessionStory?.targetLevels || []),
  ].filter((level: StructuralLevel) =>
    readableConfidence(level.confidence) &&
    (level.directionRelevance === direction || level.directionRelevance === 'BOTH')
  ).map((level: StructuralLevel) => ({
    price: roundToTick(level.price),
    label: level.label,
    source: String(level.source),
    type: level.type,
    reason: level.contextNote || level.evidence || `${level.label} from structured scanner HTF/session map.`,
  }));

  const objectives = (context.targetObjectives || [])
    .filter((target: TargetObjective) =>
      target.direction === direction &&
      readableConfidence(target.confidence) &&
      (
        target.type === 'support' ||
        target.type === 'resistance' ||
        target.type === 'imbalance_zone' ||
        target.type === 'imbalance_midpoint' ||
        target.type === 'displacement_origin' ||
        target.type === 'gap' ||
        target.type === 'round_number'
      )
    )
    .map((target: TargetObjective) => ({
      price: roundToTick(target.price),
      label: target.label,
      source: String(target.source),
      type: target.type,
      reason: target.reason,
    }));

  const maxDistanceWithoutTarget = 20;
  return [...structural, ...objectives]
    .filter((line) => {
      const distance = direction === 'LONG' ? line.price - currentPrice : currentPrice - line.price;
      if (distance < 0) return false;
      if (target1 !== null) {
        return direction === 'LONG'
          ? line.price <= target1 + TRADE_RULES.targetModel.tickSize
          : line.price >= target1 - TRADE_RULES.targetModel.tickSize;
      }
      return distance <= maxDistanceWithoutTarget;
    })
    .sort((a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice));
}

function closeThroughLine(direction: Direction, bar: NinjaBridgeBar, line: HtfLine | null): boolean {
  if (!line) return false;
  return direction === 'SHORT' ? bar.close < line.price : bar.close > line.price;
}

function outcomeToClose(direction: Direction, signalBar: NinjaBridgeBar, laterBars: NinjaBridgeBar[], entry: number | null, stop: number | null, target1: number | null, target2: number | null): AuditCandidate['outcomeToClose'] {
  if (entry === null || stop === null || target1 === null || target2 === null) {
    return { firstHit: 'NONE', maxFavorablePoints: null, maxAdversePoints: null, exitPrice: null, points: null, mesProfitLossDollars: null };
  }
  let firstHit: AuditCandidate['outcomeToClose']['firstHit'] = 'NONE';
  let maxFavorable = 0;
  let maxAdverse = 0;
  let exitPrice: number | null = laterBars[laterBars.length - 1]?.close ?? signalBar.close;
  for (const bar of laterBars) {
    const favorable = direction === 'SHORT' ? entry - bar.low : bar.high - entry;
    const adverse = direction === 'SHORT' ? bar.high - entry : entry - bar.low;
    maxFavorable = Math.max(maxFavorable, favorable);
    maxAdverse = Math.max(maxAdverse, adverse);
    const stopHit = direction === 'SHORT' ? bar.high >= stop : bar.low <= stop;
    const t1Hit = direction === 'SHORT' ? bar.low <= target1 : bar.high >= target1;
    const t2Hit = direction === 'SHORT' ? bar.low <= target2 : bar.high >= target2;
    if (stopHit && (t1Hit || t2Hit)) {
      firstHit = 'AMBIGUOUS';
      exitPrice = null;
      break;
    }
    if (stopHit) {
      firstHit = 'STOP';
      exitPrice = stop;
      break;
    }
    if (t2Hit) {
      firstHit = 'T2';
      exitPrice = target2;
      break;
    }
    if (t1Hit) {
      firstHit = 'T1';
      exitPrice = target1;
      break;
    }
  }
  const points = exitPrice === null ? null : direction === 'SHORT' ? entry - exitPrice : exitPrice - entry;
  return {
    firstHit,
    maxFavorablePoints: Math.round(maxFavorable * 100) / 100,
    maxAdversePoints: Math.round(maxAdverse * 100) / 100,
    exitPrice,
    points: points === null ? null : Math.round(points * 100) / 100,
    mesProfitLossDollars: points === null ? null : Math.round(points * 5 * 100) / 100,
  };
}

function markdownReport(report: any): string {
  const candidates = report.candidates as AuditCandidate[];
  const daily = (report.dailySummary || []) as DailyAuditSummary[];
  return [
    '# Late-Day Micro-Continuation 30-Day Audit',
    '',
    `Instrument: ${report.instrument} (${report.bridgeInstrument})`,
    `Range: ${report.fromDate} through ${report.toDate}`,
    `Late window tested: ${report.window}`,
    `Line-in-the-sand source: ${report.lineInSandSource}`,
    '',
    '## Summary',
    '',
    `- Late bars evaluated: ${report.summary.lateBarsEvaluated}`,
    `- Aligned 15M/5M MSS bars: ${report.summary.alignedMssBars}`,
    `- Candidate triggers found: ${report.summary.candidateCount}`,
    `- FVG retest/rejection triggers: ${report.summary.fvgRetestCandidates}`,
    `- HTF close-through triggers: ${report.summary.closeThroughCandidates}`,
    `- Shorts: ${report.summary.shorts}`,
    `- Longs: ${report.summary.longs}`,
    '',
    '## Daily Summary',
    '',
    '| Date | Late Bars | Aligned MSS Bars | Candidates | Longs | Shorts | T1 | T2 | Stop | None | Ambiguous |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...(daily.length ? daily.map((day) =>
      `| ${day.tradeDate} | ${day.lateBarsEvaluated} | ${day.alignedMssBars} | ${day.candidateCount} | ${day.longs} | ${day.shorts} | ${day.t1} | ${day.t2} | ${day.stop} | ${day.none} | ${day.ambiguous} |`
    ) : ['| N/A | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |']),
    '',
    '## Candidates',
    '',
    ...(candidates.length ? candidates.flatMap((candidate, index) => [
      `### ${index + 1}. ${candidate.tradeDate} ${candidate.timestamp} ${candidate.direction}`,
      '',
      `- Trigger: ${candidate.triggerType}`,
      `- Entry/Stop/Risk: ${candidate.entry ?? 'N/A'} / ${candidate.stop ?? 'N/A'} / ${candidate.riskPoints ?? 'N/A'}`,
      `- T1/T2: ${candidate.target1 ?? 'N/A'} / ${candidate.target2 ?? 'N/A'}`,
      `- FVG: ${candidate.fvg ? `${candidate.fvg.lower}-${candidate.fvg.upper} formed ${candidate.fvg.formedAt}` : 'N/A'}`,
      `- Line in sand: ${candidate.lineInSand ? `${candidate.lineInSand.price} ${candidate.lineInSand.label} (${candidate.lineInSand.reason})` : 'N/A'}`,
      `- HTF validation: ${candidate.htfValidationStatus}`,
      `- Outcome to close: ${candidate.outcomeToClose.firstHit}; exit ${candidate.outcomeToClose.exitPrice ?? 'N/A'}; points ${candidate.outcomeToClose.points ?? 'N/A'}; MES P/L $${candidate.outcomeToClose.mesProfitLossDollars ?? 'N/A'}; MFE ${candidate.outcomeToClose.maxFavorablePoints ?? 'N/A'}; MAE ${candidate.outcomeToClose.maxAdversePoints ?? 'N/A'}`,
      `- Notes: ${candidate.notes.join(' ')}`,
      '',
    ]) : ['No late-day micro-continuation candidates found under this audit definition.', '']),
    'Authority: research-only. This audit does not change active windows, approve trades, post Discord alerts, or alter canExecute.',
  ].join('\n');
}

export async function runLateDayMicroContinuationAudit() {
  const instrument = argValue('instrument') || 'MES';
  const bridgeInstrument = argValue('bridge-instrument') || 'MES 06-26';
  const bridgeUrl = argValue('bridge-url') || process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765';
  const toDate = argValue('to-date') || new Date().toISOString().slice(0, 10);
  const fromDate = argValue('from-date') || addDays(toDate, -30);
  const windowStartText = argValue('window-start') || '15:30';
  const windowEndText = argValue('window-end') || '15:45';
  const windowStartMinute = parseWindowMinute(windowStartText, 15 * 60 + 30);
  const windowEndMinute = parseWindowMinute(windowEndText, 15 * 60 + 45);
  const skipBridge = process.argv.includes('--skip-bridge');
  const skipCache = process.argv.includes('--skip-cache');
  const skipLineMap = process.argv.includes('--skip-line-map');
  const singleBridgeRange = process.argv.includes('--single-bridge-range');
  const reportJson = argValue('out-json') || join(REPORT_DIR, `late-day-micro-continuation-audit-${fromDate}-to-${toDate}.json`);
  const reportMd = argValue('out-md') || join(REPORT_DIR, `late-day-micro-continuation-audit-${fromDate}-to-${toDate}.md`);
  const candidatesJson = argValue('candidates-json');

  mkdirSync(REPORT_DIR, { recursive: true });
  const loaded = await Promise.all(TIMEFRAMES.map((timeframe) => loadTimeframe({
    bridgeUrl,
    instrument,
    bridgeInstrument,
    timeframe,
    fromDate,
    toDate,
    skipBridge,
    skipCache,
    singleBridgeRange,
  })));
  const byKey = Object.fromEntries(loaded.map((item) => [item.timeframe, item.bars])) as Record<TimeframeKey, NinjaBridgeBar[]>;
  if (candidatesJson) {
    const seedReport = JSON.parse(readFileSync(candidatesJson, 'utf8')) as { candidates?: AuditCandidate[] };
    const dailySummary = new Map<string, DailyAuditSummary>();
    const candidates: AuditCandidate[] = [];
    const barByTime = new Map(byKey['5m'].map((bar) => [normalizeTime(bar.time), bar]));

    for (const seed of seedReport.candidates || []) {
      const bar = barByTime.get(normalizeTime(seed.timestamp));
      if (!bar || (seed.direction !== 'LONG' && seed.direction !== 'SHORT') || !seed.fvg) continue;
      const tradeDate = dateOnly(bar.time);
      if (!dailySummary.has(tradeDate)) {
        dailySummary.set(tradeDate, {
          tradeDate,
          lateBarsEvaluated: 0,
          alignedMssBars: 0,
          candidateCount: 0,
          longs: 0,
          shorts: 0,
          t1: 0,
          t2: 0,
          stop: 0,
          none: 0,
          ambiguous: 0,
          passedHtfValidation: 0,
          blockedByHtfLine: 0,
          noStructuredLine: 0,
          realizedMesProfitLossDollars: 0,
        });
      }
      const daySummary = dailySummary.get(tradeDate)!;
      const direction = seed.direction;
      const fvg = seed.fvg;
      const entry = roundToTick(bar.close);
      const stop = direction === 'SHORT'
        ? roundToTick(Math.max(fvg.upper, bar.high) + TRADE_RULES.targetModel.tickSize)
        : roundToTick(Math.min(fvg.lower, bar.low) - TRADE_RULES.targetModel.tickSize);
      const riskPoints = Math.round(Math.abs(entry - stop) * 100) / 100;
      const targets = targetsFromEntryStop(direction, entry, stop);
      const context = scannerContextForLineMap({
        bar,
        tradeDate,
        instrument,
        bars5m: through(byKey['5m'], bar.time),
        bars15m: through(byKey['15m'], bar.time),
        bars60m: through(byKey['60m'], bar.time),
        bars120m: through(byKey['120m'], bar.time),
        bars240m: through(byKey['240m'], bar.time),
      });
      const htfLines = context ? structuralLineCandidates(context, direction, bar.close, targets.target1) : [];
      const line = htfLines[0] || null;
      const lineCloseThrough = closeThroughLine(direction, bar, line);
      const htfValidationStatus: AuditCandidate['htfValidationStatus'] = line ? lineCloseThrough ? 'passed' : 'blocked' : 'no_structured_line';
      const outcome = outcomeToClose(direction, bar, sameDateAfter(byKey['5m'], bar.time), entry, stop, targets.target1, targets.target2);

      daySummary.candidateCount += 1;
      if (direction === 'LONG') daySummary.longs += 1;
      else daySummary.shorts += 1;
      if (outcome.firstHit === 'T1') daySummary.t1 += 1;
      else if (outcome.firstHit === 'T2') daySummary.t2 += 1;
      else if (outcome.firstHit === 'STOP') daySummary.stop += 1;
      else if (outcome.firstHit === 'AMBIGUOUS') daySummary.ambiguous += 1;
      else daySummary.none += 1;
      if (htfValidationStatus === 'passed') daySummary.passedHtfValidation += 1;
      else if (htfValidationStatus === 'blocked') daySummary.blockedByHtfLine += 1;
      else daySummary.noStructuredLine += 1;
      if (outcome.mesProfitLossDollars !== null && outcome.firstHit !== 'AMBIGUOUS') {
        daySummary.realizedMesProfitLossDollars = Math.round((daySummary.realizedMesProfitLossDollars + outcome.mesProfitLossDollars) * 100) / 100;
      }

      candidates.push({
        ...seed,
        timestamp: bar.time,
        tradeDate,
        latestClose: bar.close,
        lineInSand: line,
        lineCloseThrough,
        htfValidationStatus,
        entry,
        stop,
        riskPoints,
        target1: targets.target1,
        target2: targets.target2,
        outcomeToClose: outcome,
        notes: [
          'Late-day micro-continuation validation pass from precomputed 15M/5M MSS + 5M FVG candidate universe.',
          line ? `Named HTF line from structured HTF/session level engines: ${line.price} ${line.label}.` : 'No structured HTF/session line selected inside the candidate path.',
          htfValidationStatus === 'passed' ? 'Survived HTF line-in-the-sand validation: completed close is beyond the named line in the trade direction.' : htfValidationStatus === 'blocked' ? 'Did not survive HTF line-in-the-sand validation: completed close did not accept beyond the named line.' : 'No structured line was found; not counted as HTF-validated.',
          'Human-review research only. No chase.',
        ],
      });
    }

    const report = {
      generatedAt: new Date().toISOString(),
      instrument,
      bridgeInstrument,
      fromDate,
      toDate,
      window: `${windowStartText}-${windowEndText} ET completed 5M bars`,
      lineInSandSource: 'second_stage_structured_htf_session_level_validation_without_private_displacement_helpers',
      candidateUniverseSource: candidatesJson,
      sources: loaded.map(({ bars: _bars, ...item }) => item),
      dailySummary: [...dailySummary.values()].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate)),
      summary: {
        candidateCount: candidates.length,
        fvgRetestCandidates: candidates.filter((candidate) => candidate.triggerType === 'fvg_retest_rejection' || candidate.triggerType === 'both').length,
        closeThroughCandidates: candidates.filter((candidate) => candidate.triggerType === 'htf_close_through' || candidate.triggerType === 'both').length,
        shorts: candidates.filter((candidate) => candidate.direction === 'SHORT').length,
        longs: candidates.filter((candidate) => candidate.direction === 'LONG').length,
        passedHtfValidation: candidates.filter((candidate) => candidate.htfValidationStatus === 'passed').length,
        blockedByHtfLine: candidates.filter((candidate) => candidate.htfValidationStatus === 'blocked').length,
        noStructuredLine: candidates.filter((candidate) => candidate.htfValidationStatus === 'no_structured_line').length,
        mesProfitLossDollarsExcludingAmbiguous: candidates.reduce((sum, candidate) => (
          candidate.outcomeToClose.firstHit === 'AMBIGUOUS' || candidate.outcomeToClose.mesProfitLossDollars === null
            ? sum
            : Math.round((sum + candidate.outcomeToClose.mesProfitLossDollars) * 100) / 100
        ), 0),
        qualifyingMesProfitLossDollarsExcludingAmbiguous: candidates.filter((candidate) => candidate.htfValidationStatus === 'passed').reduce((sum, candidate) => (
          candidate.outcomeToClose.firstHit === 'AMBIGUOUS' || candidate.outcomeToClose.mesProfitLossDollars === null
            ? sum
            : Math.round((sum + candidate.outcomeToClose.mesProfitLossDollars) * 100) / 100
        ), 0),
      },
      candidates,
      qualifyingCandidates: candidates.filter((candidate) => candidate.htfValidationStatus === 'passed'),
      authority: 'research_only_not_window_change_not_execution_approval',
    };

    writeFileSync(reportJson, JSON.stringify(report, null, 2));
    writeFileSync(reportMd, markdownReport(report));
    console.log(`[late-day-micro] wrote ${reportJson}`);
    console.log(`[late-day-micro] wrote ${reportMd}`);
    console.log(`[late-day-micro] validatedCandidates=${candidates.length}; passedHtf=${report.summary.passedHtfValidation}`);
    return report;
  }

  const fvgZonesByDate = new Map<string, FvgZone[]>();
  const dailySummary = new Map<string, DailyAuditSummary>();
  const candidates: AuditCandidate[] = [];
  let lateBarsEvaluated = 0;
  let alignedMssBars = 0;

  const lateBars = byKey['5m'].filter((bar) => {
    const date = dateOnly(bar.time);
    const minutes = minutesEt(bar.time);
    return date >= fromDate && date <= toDate && minutes !== null && minutes >= windowStartMinute && minutes <= windowEndMinute;
  });

  for (const bar of lateBars) {
    lateBarsEvaluated += 1;
    const tradeDate = dateOnly(bar.time);
    if (!dailySummary.has(tradeDate)) {
      dailySummary.set(tradeDate, {
        tradeDate,
        lateBarsEvaluated: 0,
        alignedMssBars: 0,
        candidateCount: 0,
        longs: 0,
        shorts: 0,
        t1: 0,
        t2: 0,
        stop: 0,
        none: 0,
        ambiguous: 0,
        passedHtfValidation: 0,
        blockedByHtfLine: 0,
        noStructuredLine: 0,
        realizedMesProfitLossDollars: 0,
      });
    }
    const daySummary = dailySummary.get(tradeDate)!;
    daySummary.lateBarsEvaluated += 1;
    const dayBars = byKey['5m'].filter((item) => dateOnly(item.time) === tradeDate && timestampMs(item.time) <= timestampMs(bar.time));
    if (!fvgZonesByDate.has(tradeDate)) fvgZonesByDate.set(tradeDate, detectFvgs(byKey['5m'].filter((item) => dateOnly(item.time) === tradeDate)));
    const evidence = buildMultiTimeframeMssEvidenceLayer({
      barsByTimeframe: {
        '5M': through(byKey['5m'], bar.time),
        '15M': through(byKey['15m'], bar.time),
        '60M': through(byKey['60m'], bar.time),
        '120M': through(byKey['120m'], bar.time),
        '240M': through(byKey['240m'], bar.time),
      },
      asOfTimestamp: bar.time,
      barTimestampMode: 'open',
      barTimeZone: 'eastern',
    });
    const five = evidence.timeframes['5M'];
    const fifteen = evidence.timeframes['15M'];
    const direction: Direction | null =
      five.status === 'confirmed_mss' && fifteen.status === 'confirmed_mss' && five.direction === fifteen.direction
        ? five.direction === 'bearish'
          ? 'SHORT'
          : five.direction === 'bullish'
          ? 'LONG'
          : null
        : null;
    if (!direction) continue;
    alignedMssBars += 1;
    daySummary.alignedMssBars += 1;

    const zones = fvgZonesByDate.get(tradeDate) || [];
    const fvg = latestRetestedFvg({ bars: dayBars, zones, bar, direction });
    if (!fvg) continue;

    const entry = roundToTick(bar.close);
    const stop = direction === 'SHORT'
      ? roundToTick(Math.max(fvg.upper, bar.high) + TRADE_RULES.targetModel.tickSize)
      : roundToTick(Math.min(fvg.lower, bar.low) - TRADE_RULES.targetModel.tickSize);
    const riskPoints = Math.round(Math.abs(entry - stop) * 100) / 100;
    const targets = targetsFromEntryStop(direction, entry, stop);

    const context = skipLineMap ? null : scannerContextForLineMap({
      bar,
      tradeDate,
      instrument,
      bars5m: through(byKey['5m'], bar.time),
      bars15m: through(byKey['15m'], bar.time),
      bars60m: through(byKey['60m'], bar.time),
      bars120m: through(byKey['120m'], bar.time),
      bars240m: through(byKey['240m'], bar.time),
    });
    const htfLines = context ? structuralLineCandidates(context, direction, bar.close, targets.target1) : [];
    const line = htfLines[0] || null;
    const lineCloseThrough = closeThroughLine(direction, bar, line);
    const htfValidationStatus: AuditCandidate['htfValidationStatus'] = line ? lineCloseThrough ? 'passed' : 'blocked' : 'no_structured_line';
    const triggerType = fvg && lineCloseThrough ? 'both' : fvg ? 'fvg_retest_rejection' : 'htf_close_through';
    const outcome = outcomeToClose(direction, bar, sameDateAfter(byKey['5m'], bar.time), entry, stop, targets.target1, targets.target2);
    daySummary.candidateCount += 1;
    if (direction === 'LONG') daySummary.longs += 1;
    else daySummary.shorts += 1;
    if (outcome.firstHit === 'T1') daySummary.t1 += 1;
    else if (outcome.firstHit === 'T2') daySummary.t2 += 1;
    else if (outcome.firstHit === 'STOP') daySummary.stop += 1;
    else if (outcome.firstHit === 'AMBIGUOUS') daySummary.ambiguous += 1;
    else daySummary.none += 1;
    if (htfValidationStatus === 'passed') daySummary.passedHtfValidation += 1;
    else if (htfValidationStatus === 'blocked') daySummary.blockedByHtfLine += 1;
    else daySummary.noStructuredLine += 1;
    if (outcome.mesProfitLossDollars !== null && outcome.firstHit !== 'AMBIGUOUS') {
      daySummary.realizedMesProfitLossDollars = Math.round((daySummary.realizedMesProfitLossDollars + outcome.mesProfitLossDollars) * 100) / 100;
    }

    candidates.push({
      timestamp: bar.time,
      tradeDate,
      direction,
      latestClose: bar.close,
      fifteenMssTimestamp: fifteen.evidenceTimestamp,
      fiveMssTimestamp: five.evidenceTimestamp,
      fvg,
      triggerType,
      lineInSand: line,
      lineCloseThrough,
      htfValidationStatus,
      entry,
      stop,
      riskPoints,
      target1: targets.target1,
      target2: targets.target2,
      outcomeToClose: outcome,
      notes: [
        'Late-day micro-continuation review only.',
        '15M and 5M MSS aligned from structured OHLC.',
        fvg ? 'Completed 5M FVG retest/rejection detected.' : 'No FVG retest/rejection; candidate is close-through only.',
        line ? `Named HTF line from scanner structured map: ${line.price} ${line.label}.` : 'No scanner structured HTF line selected.',
        htfValidationStatus === 'passed' ? 'Completed close is beyond the named line in the trade direction.' : htfValidationStatus === 'blocked' ? 'Blocked by HTF line-in-the-sand validation; close did not accept beyond the named line.' : 'No structured HTF/session line was found inside the candidate path.',
        'Human review only. No chase.',
      ],
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    instrument,
    bridgeInstrument,
    fromDate,
    toDate,
    window: `${windowStartText}-${windowEndText} ET completed 5M bars`,
    lineInSandSource: skipLineMap ? 'skipped_for_fast_count_mode' : 'structured_htf_session_level_engines_without_private_displacement_helpers',
    sources: loaded.map(({ bars: _bars, ...item }) => item),
    dailySummary: [...dailySummary.values()].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate)),
    summary: {
      lateBarsEvaluated,
      alignedMssBars,
      candidateCount: candidates.length,
      fvgRetestCandidates: candidates.filter((candidate) => candidate.triggerType === 'fvg_retest_rejection' || candidate.triggerType === 'both').length,
      closeThroughCandidates: candidates.filter((candidate) => candidate.triggerType === 'htf_close_through' || candidate.triggerType === 'both').length,
      shorts: candidates.filter((candidate) => candidate.direction === 'SHORT').length,
      longs: candidates.filter((candidate) => candidate.direction === 'LONG').length,
      passedHtfValidation: candidates.filter((candidate) => candidate.htfValidationStatus === 'passed').length,
      blockedByHtfLine: candidates.filter((candidate) => candidate.htfValidationStatus === 'blocked').length,
      noStructuredLine: candidates.filter((candidate) => candidate.htfValidationStatus === 'no_structured_line').length,
      mesProfitLossDollarsExcludingAmbiguous: candidates.reduce((sum, candidate) => (
        candidate.outcomeToClose.firstHit === 'AMBIGUOUS' || candidate.outcomeToClose.mesProfitLossDollars === null
          ? sum
          : Math.round((sum + candidate.outcomeToClose.mesProfitLossDollars) * 100) / 100
      ), 0),
    },
    candidates,
    authority: 'research_only_not_window_change_not_execution_approval',
  };

  writeFileSync(reportJson, JSON.stringify(report, null, 2));
  writeFileSync(reportMd, markdownReport(report));
  console.log(`[late-day-micro] wrote ${reportJson}`);
  console.log(`[late-day-micro] wrote ${reportMd}`);
  console.log(`[late-day-micro] candidates=${candidates.length}; alignedMssBars=${alignedMssBars}; lateBars=${lateBarsEvaluated}`);
  return report;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/late-day-micro-continuation-audit.ts')) {
  runLateDayMicroContinuationAudit().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
