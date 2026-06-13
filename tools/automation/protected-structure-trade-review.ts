import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getNinjaHistoricalBars, type NinjaBridgeBar, type NinjaBridgeTimeframe } from '../../src/lib/ninjaTraderBridge';
import {
  ExecutionStatus,
  NoTradeReason,
  SetupCandidateStatus,
  SetupType,
  type ChartCandleFact,
  type ChartContext,
  type SetupCandidate,
} from '../../src/types';
import { fetchCachedMarketBars, loadMarketDataConfig, type MarketBarTimeframe } from './market-data-store';
import { renderChartMarkup } from './chart-markup-renderer';

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_OVERLAY = path.resolve(
  path.dirname(__filename),
  'replay-diagnostics',
  'phase-10k-protected-structure-overlay-2026-06-08-to-2026-06-12.json',
);
const DEFAULT_OUTPUT_ROOT = path.resolve('reports/protected-structure-review/2026-06-08-to-2026-06-12');

type Direction = 'LONG' | 'SHORT';

interface OverlayBias {
  bias: 'BULL' | 'BEAR';
  confirm: number;
  protect: number;
}

interface OverlaySegment {
  date: string;
  dir: Direction;
  start: string;
  end: string;
  count: number;
  first: {
    time: string;
    close: number;
    bias5: OverlayBias;
    bias15: OverlayBias;
  };
}

interface OverlayReport {
  totals: { evaluatedBars: number; confirmed: number; long: number; short: number; wait: number };
  segments: OverlaySegment[];
}

export interface TradeReviewOptions {
  overlayPath?: string;
  outputRoot?: string;
  instrument?: string;
  bridgeInstrument?: string;
  timeframe?: NinjaBridgeTimeframe;
  marketTimeframe?: MarketBarTimeframe;
  from?: string;
  to?: string;
  renderCharts?: boolean;
}

interface LoadedReviewBars {
  bars: NinjaBridgeBar[];
  cacheBars: number;
  bridgeBars: number;
  source: 'market_bars' | 'market_bars_bridge_repair' | 'ninjatrader_bridge' | 'missing';
  cacheUnavailableReason: string | null;
}

interface ReviewCampaignRow {
  id: number;
  date: string;
  direction: Direction;
  start: string;
  end: string;
  confirmations: number;
  firstClose: number;
  lineInSand: number;
  bias5: OverlayBias;
  bias15: OverlayBias;
  status: 'REVIEW ONLY - not execution approval';
  chart: string | null;
}

interface ReviewSourceSummary {
  bars5m: number;
  cacheBars: number;
  bridgeBars: number;
  source: LoadedReviewBars['source'];
  cacheUnavailableReason: string | null;
  firstBar: string | null;
  lastBar: string | null;
}

function parseArgs(argv: string[]): TradeReviewOptions {
  const options: TradeReviewOptions = {};
  for (const arg of argv) {
    if (arg === '--no-charts') {
      options.renderCharts = false;
      continue;
    }
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`Unknown argument: ${arg}`);
    const [, key, value] = match;
    if (key === 'overlay') options.overlayPath = value;
    else if (key === 'output') options.outputRoot = value;
    else if (key === 'instrument') options.instrument = value;
    else if (key === 'bridge-instrument') options.bridgeInstrument = value;
    else if (key === 'from') options.from = value;
    else if (key === 'to') options.to = value;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function normalizeBridgeTime(value: string): string {
  return value.replace(/\.(\d{3})\d+/, '.$1');
}

function timeMs(value: string): number {
  const normalized = normalizeBridgeTime(value);
  if (normalized.includes('Z') || /[+-]\d\d:?\d\d$/.test(normalized)) return Date.parse(normalized);
  return Date.parse(`${normalized}-04:00`);
}

function fmt(value: number | null | undefined): string {
  return Number.isFinite(value) ? Number(value).toFixed(2) : 'N/A';
}

function mergeBars(...groups: NinjaBridgeBar[][]): NinjaBridgeBar[] {
  const byTime = new Map<string, NinjaBridgeBar>();
  for (const group of groups) {
    for (const bar of group) {
      if (!bar?.time) continue;
      byTime.set(normalizeBridgeTime(bar.time), { ...bar, time: normalizeBridgeTime(bar.time) });
    }
  }
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

async function loadReviewBars(options: Required<Pick<TradeReviewOptions, 'bridgeInstrument' | 'timeframe' | 'marketTimeframe' | 'from' | 'to'>>): Promise<LoadedReviewBars> {
  const config = loadMarketDataConfig();
  const cached = config
    ? await fetchCachedMarketBars({
      instrument: options.bridgeInstrument,
      timeframe: options.marketTimeframe,
      from: options.from,
      to: options.to,
      config,
      limit: 20000,
    }).catch(() => [] as NinjaBridgeBar[])
    : [];
  const bridge = await getNinjaHistoricalBars({
    instrument: options.bridgeInstrument,
    timeframe: options.timeframe,
    from: options.from,
    to: options.to,
    limit: 20000,
  }).catch(() => ({ ok: false, bars: [] as NinjaBridgeBar[] }));
  const bridgeBars = bridge.ok && Array.isArray(bridge.bars) ? bridge.bars : [];
  const bars = mergeBars(cached, bridgeBars);
  const source = cached.length && bridgeBars.length
    ? 'market_bars_bridge_repair'
    : cached.length
      ? 'market_bars'
      : bridgeBars.length
        ? 'ninjatrader_bridge'
        : 'missing';
  return {
    bars,
    cacheBars: cached.length,
    bridgeBars: bridgeBars.length,
    source,
    cacheUnavailableReason: config ? null : 'SUPABASE market_bars credentials unavailable; used NinjaTrader bridge historical-bars fallback.',
  };
}

function lineInSand(segment: OverlaySegment): number {
  const values = [segment.first.bias5.protect, segment.first.bias15.protect].filter(Number.isFinite);
  return segment.dir === 'LONG' ? Math.min(...values) : Math.max(...values);
}

function chartCandlesForDate(bars: NinjaBridgeBar[], date: string): ChartCandleFact[] {
  const start = timeMs(`${date}T09:00:00-04:00`);
  const end = timeMs(`${date}T16:00:00-04:00`);
  return bars
    .filter((bar) => {
      const t = timeMs(bar.time);
      return t >= start && t <= end;
    })
    .map((bar, index) => {
      const range = Math.max(0.25, bar.high - bar.low);
      return {
        index,
        timestamp: normalizeBridgeTime(bar.time),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        direction: bar.close > bar.open ? 'bullish' : bar.close < bar.open ? 'bearish' : 'doji',
        confidence: 'High',
        bodyRatio: Math.abs(bar.close - bar.open) / range,
        closeLocation: (bar.close - bar.low) / range,
      };
    });
}

function candidateForSegment(segment: OverlaySegment): SetupCandidate {
  const line = lineInSand(segment);
  return {
    setupType: SetupType.IntradayMssMicroContinuation,
    scenarioLabel: 'Protected 15M + 5M Trend Confirmation',
    pathway: 'intraday_mss_micro_continuation',
    direction: segment.dir,
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'Medium',
    priority: 7,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    modelConfidenceScore: 78,
    decisionQualityScore: 78,
    levelContextSummary: `${segment.dir} review map: 15M and 5M protected structure aligned.`,
    invalidation: segment.dir === 'LONG'
      ? `Changes BEAR below protected structure ${fmt(line)}.`
      : `Changes BULL above protected structure ${fmt(line)}.`,
    evidence: [
      `5M ${segment.first.bias5.bias} confirm ${fmt(segment.first.bias5.confirm)} / protect ${fmt(segment.first.bias5.protect)}`,
      `15M ${segment.first.bias15.bias} confirm ${fmt(segment.first.bias15.confirm)} / protect ${fmt(segment.first.bias15.protect)}`,
      `First aligned close ${fmt(segment.first.close)} at ${segment.first.time}`,
    ],
    missingEvidence: ['Executable model trigger/retest still required by app gates.'],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: NoTradeReason.EntryTriggerPending,
    requiredTrigger: 'Completed 5M execution model trigger/retest; protected 5M stop; app risk/target/canExecute gates.',
    nextAction: `Review only. ${segment.dir} remains the desk direction while protected structure holds.`,
    reducedRiskPlan: null,
    humanReview: {
      status: 'HumanReviewReady',
      canExecute: false,
      requiresTraderConfirmation: true,
      discordTradePlanEligible: true,
      reason: 'Protected 15M+5M trend confirmation review map; not execution approval.',
    },
    activeRuleset: {
      htfLineInSand: {
        applied: true,
        status: 'passed',
        required: 'completed_5m_or_15m_close_beyond_htf_line',
        appliesToAllModels: true,
        affectsExecution: false,
        direction: segment.dir,
        lineInSand: line,
        lineReason: `${segment.dir} protected-structure line; bias changes if this level fails.`,
        requiredClose: segment.dir === 'LONG' ? `Hold above ${fmt(line)}` : `Hold below ${fmt(line)}`,
        obstacleType: null,
        obstacleSource: null,
        evidence: [],
        blockers: [],
      },
      timeframeMss: {
        applied: true,
        status: 'passed',
        required: 'aligned_confirmed_5m_mss',
        appliesToAllModels: true,
        affectsExecution: false,
        evidence: ['15M and 5M protected-structure bias aligned.'],
        blockers: [],
      },
    },
  };
}

function chartContextForSegment(segment: OverlaySegment, bars: NinjaBridgeBar[]): Partial<ChartContext> {
  return {
    candles: chartCandlesForDate(bars, segment.date),
    marketStructure: { trend: segment.dir === 'LONG' ? 'bullish' : 'bearish' } as any,
    multiTimeframeContext: {
      alignment: {
        alignedDirection: segment.dir,
        executionBias: segment.dir,
        macroBias: segment.dir,
        sessionBias: segment.dir,
        liquidityBias: segment.dir,
        conflicts: [],
        notes: ['Protected 15M and 5M structure aligned.'],
        summary: `${segment.dir} protected-structure alignment.`,
      },
    } as any,
    sessionStory: {
      summary: `${segment.dir} review map from protected 15M+5M structure.`,
    } as any,
  };
}

function markdownForReport(summary: {
  createdAt: string;
  instrument: string;
  bridgeInstrument: string;
  source: ReviewSourceSummary;
  totals: OverlayReport['totals'];
  campaigns: ReviewCampaignRow[];
}): string {
  const lines = [
    '# Protected Structure Trend Confirmation - Trade-by-Trade Review',
    '',
    `Created: ${summary.createdAt}`,
    `Instrument: ${summary.instrument} (${summary.bridgeInstrument})`,
    `5M candles: ${summary.source.bars5m} from ${summary.source.firstBar} to ${summary.source.lastBar}`,
    `Source: ${summary.source.source} (cache ${summary.source.cacheBars}, bridge ${summary.source.bridgeBars})`,
    'Boundary: review desk direction only; canExecute and execution gates unchanged.',
    '',
    `Totals: ${summary.totals.confirmed} aligned bars across ${summary.campaigns.length} distinct campaigns (${summary.totals.long} LONG bars / ${summary.totals.short} SHORT bars).`,
    '',
  ];
  for (const row of summary.campaigns) {
    lines.push(
      `## ${row.id}. ${row.date} ${row.direction} (${row.start.slice(11, 16)}-${row.end.slice(11, 16)} ET)`,
      `- Status: ${row.status}`,
      `- Confirmations: ${row.confirmations} completed 5M bars`,
      `- First aligned close: ${fmt(row.firstClose)}`,
      `- Line in the sand: ${fmt(row.lineInSand)}`,
      `- 5M: ${row.bias5.bias} | confirm ${fmt(row.bias5.confirm)} | protected ${fmt(row.bias5.protect)}`,
      `- 15M: ${row.bias15.bias} | confirm ${fmt(row.bias15.confirm)} | protected ${fmt(row.bias15.protect)}`,
      `- Chart: ${row.chart || 'not rendered'}`,
      '',
    );
  }
  return lines.join('\n');
}

export async function generateProtectedStructureTradeReview(options: TradeReviewOptions = {}) {
  const overlayPath = path.resolve(options.overlayPath || DEFAULT_OVERLAY);
  const outputRoot = path.resolve(options.outputRoot || DEFAULT_OUTPUT_ROOT);
  const chartsDir = path.join(outputRoot, 'charts');
  const instrument = options.instrument || 'MES';
  const bridgeInstrument = options.bridgeInstrument || 'MES 06-26';
  const timeframe = options.timeframe || '5m';
  const marketTimeframe = options.marketTimeframe || '5m';
  const from = options.from || '2026-06-08T00:00:00-04:00';
  const to = options.to || '2026-06-12T16:00:00-04:00';
  const renderCharts = options.renderCharts !== false;

  const overlay = JSON.parse(await fs.readFile(overlayPath, 'utf8')) as OverlayReport;
  const loaded = await loadReviewBars({ bridgeInstrument, timeframe, marketTimeframe, from, to });
  if (!loaded.bars.length) throw new Error('Protected-structure trade review could not load market bars from market_bars or NinjaTrader bridge.');

  await fs.mkdir(outputRoot, { recursive: true });
  if (renderCharts) {
    await fs.rm(chartsDir, { recursive: true, force: true });
    await fs.mkdir(chartsDir, { recursive: true });
  }

  const campaigns: ReviewCampaignRow[] = [];
  for (let index = 0; index < overlay.segments.length; index += 1) {
    const segment = overlay.segments[index];
    const line = lineInSand(segment);
    const chart = renderCharts
      ? await renderChartMarkup({
        chartContext: chartContextForSegment(segment, loaded.bars),
        candidate: candidateForSegment(segment),
        instrument,
        tradeDate: segment.date,
        sessionLabel: 'Morning Desk Review',
        renderMode: 'desk_play_context',
        contextLine: line,
        contextLabel: `${segment.dir} line`,
        outputDir: chartsDir,
        filePrefix: `${String(index + 1).padStart(2, '0')}-${segment.date}-${segment.dir.toLowerCase()}-${segment.start.slice(11, 16).replace(':', '')}`,
      })
      : null;
    campaigns.push({
      id: index + 1,
      date: segment.date,
      direction: segment.dir,
      start: segment.start,
      end: segment.end,
      confirmations: segment.count,
      firstClose: segment.first.close,
      lineInSand: line,
      bias5: segment.first.bias5,
      bias15: segment.first.bias15,
      status: 'REVIEW ONLY - not execution approval',
      chart: chart ? path.relative(process.cwd(), chart) : null,
    });
  }

  const source: ReviewSourceSummary = {
    bars5m: loaded.bars.length,
    cacheBars: loaded.cacheBars,
    bridgeBars: loaded.bridgeBars,
    source: loaded.source,
    cacheUnavailableReason: loaded.cacheUnavailableReason,
    firstBar: loaded.bars[0]?.time || null,
    lastBar: loaded.bars[loaded.bars.length - 1]?.time || null,
  };
  const summary = {
    reportType: 'protected_structure_trend_confirmation_trade_by_trade_review',
    createdAt: new Date().toISOString(),
    instrument,
    bridgeInstrument,
    source,
    ruleBoundary: 'Protected 15M+5M alignment produces review desk direction only; canExecute and execution gates unchanged.',
    totals: overlay.totals,
    campaigns,
  };
  const jsonPath = path.join(outputRoot, 'trade-by-trade-review.json');
  const markdownPath = path.join(outputRoot, 'trade-by-trade-review.md');
  await fs.writeFile(jsonPath, JSON.stringify(summary, null, 2));
  await fs.writeFile(markdownPath, markdownForReport({
    createdAt: summary.createdAt,
    instrument,
    bridgeInstrument,
    source,
    totals: overlay.totals,
    campaigns,
  }));
  return { outputRoot, jsonPath, markdownPath, campaigns: campaigns.length, charts: campaigns.filter((row) => row.chart).length, source };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  generateProtectedStructureTradeReview(parseArgs(process.argv.slice(2)))
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
