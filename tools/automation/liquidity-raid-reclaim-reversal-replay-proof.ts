import fs from 'node:fs';
import path from 'node:path';
import { detectLiquidityRaidReclaimReversal } from '../../src/lib/forensicModels/liquidityRaidReclaimReversal';
import type {
  ChartCandleFact,
  ChartContext,
  FailedBreakEventFact,
  LiquidityEventFact,
  MultiTimeframeContext,
  ReclaimEventFact,
  TimeframeFactSet,
} from '../../src/types';

type SessionName = 'morning' | 'lunch';
type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';

interface MarketBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface Args {
  marketBarsJson: string;
  startDate: string;
  endDate: string;
  instrument: 'MES' | 'MNQ';
  sessions: SessionName[];
  json: boolean;
}

interface ReplayRow {
  date: string;
  session: SessionName;
  proofTime: string | null;
  direction: 'LONG' | 'SHORT';
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  raidedLevel: number | null;
  raidedLevelLabel: string | null;
  htfContext: string;
  evidence: string[];
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  const marketBarsJson = readFlag(argv, '--market-bars-json');
  if (!marketBarsJson) throw new Error('--market-bars-json is required');
  const startDate = readFlag(argv, '--start-date') || '2026-06-08';
  const endDate = readFlag(argv, '--end-date') || '2026-06-28';
  const instrument = (readFlag(argv, '--instrument') || 'MES') as Args['instrument'];
  const sessions = (readFlag(argv, '--sessions') || 'morning,lunch')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean) as SessionName[];
  if (!sessions.every((session) => session === 'morning' || session === 'lunch')) {
    throw new Error('--sessions may include only morning,lunch for this replay proof');
  }
  return {
    marketBarsJson,
    startDate,
    endDate,
    instrument,
    sessions,
    json: argv.includes('--json'),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function validBar(value: unknown): value is MarketBar {
  const row = asRecord(value);
  return (
    typeof row.time === 'string' &&
    ['open', 'high', 'low', 'close'].every((key) => typeof row[key] === 'number' && Number.isFinite(row[key]))
  );
}

function loadBars(filePath: string): Record<Timeframe, MarketBar[]> {
  const root = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  const grouped = asRecord(root.bars || root.timeframes || root);
  return {
    '5m': (Array.isArray(grouped['5m']) ? grouped['5m'] : []).filter(validBar),
    '15m': (Array.isArray(grouped['15m']) ? grouped['15m'] : []).filter(validBar),
    '60m': (Array.isArray(grouped['60m']) ? grouped['60m'] : []).filter(validBar),
    '120m': (Array.isArray(grouped['120m']) ? grouped['120m'] : []).filter(validBar),
    '240m': (Array.isArray(grouped['240m']) ? grouped['240m'] : []).filter(validBar),
  };
}

function barDate(bar: MarketBar): string {
  return bar.time.slice(0, 10);
}

function barMinutes(bar: MarketBar): number {
  const match = /T(\d{2}):(\d{2})/.exec(bar.time);
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
}

function inDateRange(bar: MarketBar, startDate: string, endDate: string): boolean {
  const date = barDate(bar);
  return date >= startDate && date <= endDate;
}

function inSession(bar: MarketBar, session: SessionName): boolean {
  const minutes = barMinutes(bar);
  if (session === 'morning') return minutes >= 9 * 60 + 15 && minutes <= 12 * 60;
  return minutes >= 12 * 60 && minutes <= 16 * 60;
}

function candleFromBar(bar: MarketBar, index: number): ChartCandleFact {
  return {
    index,
    timestamp: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    direction: bar.close > bar.open ? 'bullish' : bar.close < bar.open ? 'bearish' : 'doji',
    confidence: 'High',
  };
}

function timeframeFactSet(timeframe: Timeframe, bars: MarketBar[]): TimeframeFactSet {
  const candles = bars.map(candleFromBar);
  const valid = bars.filter((bar) => Number.isFinite(bar.open + bar.high + bar.low + bar.close));
  const high = valid.length ? Math.max(...valid.map((bar) => bar.high)) : null;
  const low = valid.length ? Math.min(...valid.map((bar) => bar.low)) : null;
  const open = valid[0]?.open ?? null;
  const close = valid.at(-1)?.close ?? null;
  const delta = open !== null && close !== null ? close - open : 0;
  return {
    timeframe: timeframe === '240m' ? '4h' : timeframe === '120m' ? '2h' : timeframe === '60m' ? '1h' : timeframe,
    role: timeframe === '5m' ? 'execution' : timeframe === '15m' ? 'liquidity_map' : timeframe === '240m' ? 'macro_context' : 'session_structure',
    barCount: valid.length,
    high,
    low,
    open,
    close,
    midpoint: high !== null && low !== null ? (high + low) / 2 : null,
    rangePoints: high !== null && low !== null ? high - low : null,
    trend: Math.abs(delta) < 1 ? 'balanced' : delta > 0 ? 'bullish' : 'bearish',
    candles,
    fvgZones: [],
    liquiditySweeps: [],
    reclaimEvents: [],
    failedBreakEvents: [],
    displacementCandles: [],
    structuralLevels: [],
    confidence: valid.length ? 'High' : 'Low',
    notes: [],
  };
}

function alignmentFromFacts(fiveMinute: TimeframeFactSet): MultiTimeframeContext['alignment']['alignedDirection'] {
  if (fiveMinute.trend === 'bullish') return 'LONG';
  if (fiveMinute.trend === 'bearish') return 'SHORT';
  if (fiveMinute.trend === 'balanced') return 'NEUTRAL';
  return 'UNKNOWN';
}

function buildLiquidityFacts(candles: ChartCandleFact[]): {
  liquiditySweeps: LiquidityEventFact[];
  reclaimEvents: ReclaimEventFact[];
  failedBreakEvents: FailedBreakEventFact[];
} {
  const liquiditySweeps: LiquidityEventFact[] = [];
  const reclaimEvents: ReclaimEventFact[] = [];
  const failedBreakEvents: FailedBreakEventFact[] = [];

  for (let index = 3; index < candles.length; index += 1) {
    const candle = candles[index];
    const lookback = candles.slice(Math.max(0, index - 6), index);
    const priorHigh = Math.max(...lookback.map((item) => typeof item.high === 'number' ? item.high : Number.NEGATIVE_INFINITY));
    const priorLow = Math.min(...lookback.map((item) => typeof item.low === 'number' ? item.low : Number.POSITIVE_INFINITY));
    if (
      typeof candle.high !== 'number' ||
      typeof candle.low !== 'number' ||
      typeof candle.close !== 'number' ||
      !Number.isFinite(priorHigh) ||
      !Number.isFinite(priorLow)
    ) {
      continue;
    }

    if (candle.low < priorLow && candle.close > priorLow) {
      liquiditySweeps.push({
        type: 'sweep',
        direction: 'LONG',
        level: priorLow,
        sweptLevelLabel: 'recent 5M swing low',
        reclaimed: true,
        timestamp: candle.timestamp,
        confidence: 'High',
        evidence: '5M candle swept below recent swing low and closed back above it.',
      });
      reclaimEvents.push({
        direction: 'LONG',
        reclaimedLevel: priorLow,
        levelLabel: 'recent 5M swing low',
        timestamp: candle.timestamp,
        candleIndex: candle.index,
        confidence: 'High',
        evidence: '5M close reclaimed the swept low.',
      });
      failedBreakEvents.push({
        direction: 'LONG',
        failedLevel: priorLow,
        levelLabel: 'recent 5M swing low',
        sweptExtreme: candle.low,
        timestamp: candle.timestamp,
        candleIndex: candle.index,
        confidence: 'High',
        evidence: 'Failed breakdown below recent 5M swing low.',
      });
    }

    if (candle.high > priorHigh && candle.close < priorHigh) {
      liquiditySweeps.push({
        type: 'sweep',
        direction: 'SHORT',
        level: priorHigh,
        sweptLevelLabel: 'recent 5M swing high',
        reclaimed: true,
        timestamp: candle.timestamp,
        confidence: 'High',
        evidence: '5M candle swept above recent swing high and closed back below it.',
      });
      reclaimEvents.push({
        direction: 'SHORT',
        reclaimedLevel: priorHigh,
        levelLabel: 'recent 5M swing high',
        timestamp: candle.timestamp,
        candleIndex: candle.index,
        confidence: 'High',
        evidence: '5M close reclaimed below the swept high.',
      });
      failedBreakEvents.push({
        direction: 'SHORT',
        failedLevel: priorHigh,
        levelLabel: 'recent 5M swing high',
        sweptExtreme: candle.high,
        timestamp: candle.timestamp,
        candleIndex: candle.index,
        confidence: 'High',
        evidence: 'Failed breakout above recent 5M swing high.',
      });
    }
  }

  return {
    liquiditySweeps: liquiditySweeps.slice(-8),
    reclaimEvents: reclaimEvents.slice(-8),
    failedBreakEvents: failedBreakEvents.slice(-8),
  };
}

function through(bars: MarketBar[], time: string): MarketBar[] {
  return bars.filter((bar) => bar.time <= time);
}

function contextFor(args: {
  instrument: 'MES' | 'MNQ';
  date: string;
  session: SessionName;
  bars: Record<Timeframe, MarketBar[]>;
  activeBars5m: MarketBar[];
  currentBar: MarketBar;
}): ChartContext {
  const fiveMinute = timeframeFactSet('5m', args.activeBars5m);
  const facts = buildLiquidityFacts(fiveMinute.candles);
  fiveMinute.liquiditySweeps = facts.liquiditySweeps;
  fiveMinute.reclaimEvents = facts.reclaimEvents;
  fiveMinute.failedBreakEvents = facts.failedBreakEvents;
  const fifteenMinute = timeframeFactSet('15m', through(args.bars['15m'], args.currentBar.time));
  const oneHour = timeframeFactSet('60m', through(args.bars['60m'], args.currentBar.time));
  const twoHour = timeframeFactSet('120m', through(args.bars['120m'], args.currentBar.time));
  const fourHour = timeframeFactSet('240m', through(args.bars['240m'], args.currentBar.time));
  const alignedDirection = alignmentFromFacts(fiveMinute);
  const current = fiveMinute.candles.at(-1);

  return {
    sessionType: args.session,
    instrument: args.instrument,
    tradeDate: args.date,
    timeframe: '5m',
    chartTimestamp: args.currentBar.time,
    screenshotUsability: 'usable',
    keyLevels: {
      currentPrice: args.currentBar.close,
      activeSwingHigh: fiveMinute.high,
      activeSwingLow: fiveMinute.low,
      triggerCandleHigh: current?.high ?? null,
      triggerCandleLow: current?.low ?? null,
    },
    candles: fiveMinute.candles,
    liquiditySweeps: facts.liquiditySweeps,
    reclaimEvents: facts.reclaimEvents,
    failedBreakEvents: facts.failedBreakEvents,
    multiTimeframeContext: {
      source: 'ninjatrader_bridge',
      authority: 'ohlc_facts_only',
      fourHour,
      twoHour,
      oneHour,
      fifteenMinute,
      fiveMinute,
      alignment: {
        macroBias: fourHour.trend === 'bullish' ? 'LONG' : fourHour.trend === 'bearish' ? 'SHORT' : 'NEUTRAL',
        sessionBias: oneHour.trend === 'bullish' ? 'LONG' : oneHour.trend === 'bearish' ? 'SHORT' : 'NEUTRAL',
        liquidityBias: fifteenMinute.trend === 'bullish' ? 'LONG' : fifteenMinute.trend === 'bearish' ? 'SHORT' : 'NEUTRAL',
        executionBias: alignedDirection === 'LONG' || alignedDirection === 'SHORT' ? alignedDirection : 'NEUTRAL',
        alignedDirection,
        conflicts: [],
        notes: [],
      },
      targetMap: {
        levelsToWatch: [],
      },
      rules: {
        higherTimeframesApproveTrades: false,
        fiveMinuteExecutionRequired: true,
        aiMayOverwriteOhlcFacts: false,
      },
      notes: [],
    },
    marketContext: 'Replay-only OHLC detector proof. No scanner candidate or promotion authority.',
  };
}

export function buildLiquidityRaidReclaimReplayProof(args: Args) {
  const bars = loadBars(args.marketBarsJson);
  const rows: ReplayRow[] = [];
  const seenRows = new Set<string>();
  let barsEvaluated = 0;
  let contextsEvaluated = 0;

  for (const session of args.sessions) {
    const evaluationBars = bars['5m'].filter((bar) => inDateRange(bar, args.startDate, args.endDate) && inSession(bar, session));
    for (const currentBar of evaluationBars) {
      const date = barDate(currentBar);
      const activeBars5m = bars['5m'].filter((bar) => barDate(bar) === date && bar.time <= currentBar.time && inSession(bar, session));
      if (activeBars5m.length < 4) continue;
      barsEvaluated += 1;
      const context = contextFor({
        instrument: args.instrument,
        date,
        session,
        bars,
        activeBars5m,
        currentBar,
      });
      contextsEvaluated += 1;
      const detection = detectLiquidityRaidReclaimReversal(context);
      if (
        detection.detected &&
        detection.direction &&
        detection.entry !== null &&
        detection.stop !== null &&
        detection.target1 !== null &&
        detection.target2 !== null &&
        detection.riskPoints !== null
      ) {
        const key = `${date}|${session}|${detection.direction}|${detection.proofTime}|${detection.entry}|${detection.stop}`;
        if (seenRows.has(key)) continue;
        seenRows.add(key);
        rows.push({
          date,
          session,
          proofTime: detection.proofTime,
          direction: detection.direction,
          entry: detection.entry,
          stop: detection.stop,
          target1: detection.target1,
          target2: detection.target2,
          riskPoints: detection.riskPoints,
          raidedLevel: detection.raidedLevel,
          raidedLevelLabel: detection.raidedLevelLabel,
          htfContext: detection.htfContext,
          evidence: detection.evidence,
        });
      }
    }
  }

  const uniqueProofKeys = new Set(rows.map((row) => `${row.date}|${row.session}|${row.direction}|${row.proofTime}|${row.entry}|${row.stop}`));
  return {
    reportType: 'liquidity_raid_reclaim_reversal_replay_proof',
    generatedAt: new Date().toISOString(),
    authority: {
      localFileOnly: true,
      noScannerWiring: true,
      noDiscordPost: true,
      noSupabaseRead: true,
      noSupabaseWrite: true,
      noBridgeRead: true,
      noExecutionApproval: true,
    },
    source: {
      marketBarsJson: args.marketBarsJson,
      startDate: args.startDate,
      endDate: args.endDate,
      instrument: args.instrument,
      sessions: args.sessions,
    },
    summary: {
      bars5mLoaded: bars['5m'].length,
      bars15mLoaded: bars['15m'].length,
      bars60mLoaded: bars['60m'].length,
      bars120mLoaded: bars['120m'].length,
      bars240mLoaded: bars['240m'].length,
      barsEvaluated,
      contextsEvaluated,
      detections: rows.length,
      uniqueDetections: uniqueProofKeys.size,
      longDetections: rows.filter((row) => row.direction === 'LONG').length,
      shortDetections: rows.filter((row) => row.direction === 'SHORT').length,
    },
    rows,
  };
}

function writeReport(report: ReturnType<typeof buildLiquidityRaidReclaimReplayProof>): string {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(
    outDir,
    `liquidity-raid-reclaim-reversal-replay-proof-${report.source.instrument}-${report.source.startDate}-to-${report.source.endDate}-${Date.now()}.json`
  );
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'liquidity-raid-reclaim-reversal-replay-proof.ts') {
  const args = parseArgs();
  const report = buildLiquidityRaidReclaimReplayProof(args);
  const outputPath = writeReport(report);
  const result = {
    outputPath,
    status: 'pass',
    summary: report.summary,
  };
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Wrote ${outputPath}`);
    console.log(JSON.stringify(report.summary, null, 2));
  }
}
