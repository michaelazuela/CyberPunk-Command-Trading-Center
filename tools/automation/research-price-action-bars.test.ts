import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildPriceActionReviewCardModel } from '../../src/agents/priceActionReviewCardAgent';
import { renderPriceActionReviewCard } from './price-action-review-card-renderer';
import {
  resolveActiveBridgeInstrument,
  resolvePriceActionReviewWindow,
  resolveResearchPriceActionBars,
} from './research-price-action-bars';
import type { MarketDataConfig, MarketBarTimeframe } from './market-data-store';
import type { NinjaBridgeBar, NinjaBridgeTimeframe } from '../../src/lib/ninjaTraderBridge';

const outputDir = mkdtempSync(path.join(tmpdir(), 'research-price-action-bars-'));

const sample = {
  sampleId: 'time_window_liquidity_delivery-005',
  date: '2026-01-07',
  time: '10:00',
  conceptTitle: 'Time-Window Liquidity Delivery',
  direction: 'LONG',
  window: '10:00-11:00 NY',
  agentInspectionLabel: 'keep_advisory',
  advisoryOnly: true,
};

function bars(timeframe: '5m' | '15m', count: number, startMinute = 45): NinjaBridgeBar[] {
  const step = timeframe === '5m' ? 5 : 15;
  return Array.from({ length: count }, (_, index) => {
    const minute = startMinute + index * step;
    const hour = 9 + Math.floor(minute / 60);
    const mm = minute % 60;
    const base = 7590 + index * 0.75;
    const open = base;
    const close = index % 2 ? base - 0.25 : base + 0.5;
    return {
      time: `2026-01-07T${String(hour).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`,
      open,
      high: Math.max(open, close) + 0.75,
      low: Math.min(open, close) - 0.75,
      close,
      volume: 1000 + index,
    };
  });
}

const config: MarketDataConfig = {
  userId: 'user-1',
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'not-used-in-test',
};

function forbiddenExecutablePaths(value: unknown, current = 'value'): string[] {
  const forbidden = new Set([
    'entry',
    'stop',
    'stopLoss',
    'target',
    'targets',
    'T1',
    'T2',
    't1',
    't2',
    'riskReward',
    'canExecute',
    'orderInstructions',
    'tradeAlerts',
    'ragPayload',
    'journalPayload',
  ]);
  if (!value || typeof value !== 'object') return [];
  const paths: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = `${current}.${key}`;
    if (forbidden.has(key)) paths.push(next);
    if (key === 'executionApproved' && child !== false) paths.push(next);
    paths.push(...forbiddenExecutablePaths(child, next));
  }
  return paths;
}

try {
  const bridgeHealthContract = await resolveActiveBridgeInstrument({}, {
    getNinjaBridgeHealth: async () => ({ ok: true, defaultInstrument: 'MES 09-26', readOnly: true }),
    env: {
      DEFAULT_CONTRACT: 'MES 06-26',
      NINJATRADER_BRIDGE_INSTRUMENT: 'MES 03-27',
    },
  });
  assert.equal(bridgeHealthContract.instrument, 'MES 09-26');
  assert.equal(bridgeHealthContract.source, 'bridge-health');

  const launcherContract = await resolveActiveBridgeInstrument({}, {
    getNinjaBridgeHealth: async () => ({ ok: true, readOnly: true }),
    env: {
      DEFAULT_CONTRACT: 'MES 06-26',
      NINJATRADER_BRIDGE_INSTRUMENT: 'MES 03-27',
    },
  });
  assert.equal(launcherContract.instrument, 'MES 09-26');
  assert.equal(launcherContract.source, 'front-month-rollover');
  assert.equal(launcherContract.warnings.some((warning) => warning.includes('stale after rollover')), true);

  const envContract = await resolveActiveBridgeInstrument({}, {
    getNinjaBridgeHealth: async () => {
      throw new Error('bridge unavailable');
    },
    env: {
      NINJATRADER_BRIDGE_INSTRUMENT: 'MES 03-27',
    },
  });
  assert.equal(envContract.instrument, 'MES 03-27');
  assert.equal(envContract.source, 'configured-root-fallback');
  assert.equal(envContract.warnings.some((warning) => warning.includes('bridge unavailable')), true);

  const fallbackContract = await resolveActiveBridgeInstrument({}, {
    getNinjaBridgeHealth: async () => ({ ok: true, readOnly: true }),
    env: {},
  });
  assert.equal(fallbackContract.instrument, 'MES 09-26');
  assert.equal(fallbackContract.source, 'fallback');
  assert.equal(fallbackContract.warnings.some((warning) => warning.includes('using MES 09-26')), true);

  const resolved = resolvePriceActionReviewWindow(sample);
  assert.equal(resolved.sampleTimestamp, '2026-01-07T10:00:00');
  assert.equal(resolved.fiveMinute?.from, '2026-01-07T09:45:00');
  assert.equal(resolved.fiveMinute?.to, '2026-01-07T10:15:00');
  assert.equal(resolved.fifteenMinute?.from, '2026-01-07T09:30:00');
  assert.equal(resolved.fifteenMinute?.to, '2026-01-07T10:30:00');

  const cacheCalls: Array<{ timeframe: MarketBarTimeframe; from: string; to: string; instrument: string }> = [];
  const bridgeCalls: Array<{ timeframe?: NinjaBridgeTimeframe; from: string; to: string; instrument?: string; baseUrl?: string }> = [];
  const cacheFirst = await resolveResearchPriceActionBars(sample, {
    symbol: 'MES',
    bridgeInstrument: 'MES 06-26',
    bridgeUrl: 'http://127.0.0.1:8765',
  }, {
    loadMarketDataConfig: () => config,
    fetchCachedMarketBars: async (args) => {
      cacheCalls.push({ timeframe: args.timeframe, from: args.from, to: args.to, instrument: args.instrument });
      return args.timeframe === '5m' ? bars('5m', 7) : bars('15m', 3, 30);
    },
    getNinjaHistoricalBars: async (args) => {
      bridgeCalls.push(args);
      return { ok: true, instrument: args.instrument || 'MES 06-26', timeframe: args.timeframe || '5m', count: 0, bars: [] };
    },
  });
  assert.equal(cacheFirst.dataSource, 'cache');
  assert.equal(cacheFirst.sourceByTimeframe['5m'], 'cache');
  assert.equal(cacheFirst.sourceByTimeframe['15m'], 'cache');
  assert.equal(cacheFirst.resolvedContract, 'MES 06-26');
  assert.equal(cacheFirst.bars5m.length, 7);
  assert.equal(cacheFirst.bars15m.length, 3);
  assert.equal(cacheCalls.length, 2);
  assert.equal(cacheCalls.some((call) => call.timeframe === '5m'), true);
  assert.equal(cacheCalls.some((call) => call.timeframe === '15m'), true);
  assert.equal(bridgeCalls.length, 0);

  const fallbackCalls: Array<{ timeframe?: NinjaBridgeTimeframe; from: string; to: string; instrument?: string; baseUrl?: string }> = [];
  const fallback = await resolveResearchPriceActionBars(sample, {
    symbol: 'MES',
    bridgeInstrument: 'MES 06-26',
    bridgeUrl: 'http://127.0.0.1:8765',
  }, {
    loadMarketDataConfig: () => config,
    fetchCachedMarketBars: async () => [],
    getNinjaHistoricalBars: async (args) => {
      fallbackCalls.push(args);
      return {
        ok: true,
        instrument: args.instrument || 'MES 06-26',
        timeframe: args.timeframe || '5m',
        count: args.timeframe === '5m' ? 7 : 3,
        bars: args.timeframe === '5m' ? bars('5m', 7) : bars('15m', 3, 30),
      };
    },
  });
  assert.equal(fallback.dataSource, 'ninjatrader');
  assert.equal(fallback.sourceByTimeframe['5m'], 'ninjatrader');
  assert.equal(fallback.sourceByTimeframe['15m'], 'ninjatrader');
  assert.equal(fallbackCalls.length, 2);
  assert.equal(fallbackCalls.some((call) => call.timeframe === '5m'), true);
  assert.equal(fallbackCalls.some((call) => call.timeframe === '15m'), true);
  assert.equal(fallbackCalls.every((call) => call.instrument === 'MES 06-26'), true);
  assert.equal(fallbackCalls.every((call) => call.baseUrl === 'http://127.0.0.1:8765'), true);
  assert.equal(fallback.warnings.some((warning) => warning.includes('NinjaTrader historical fallback used for 5m')), true);

  const mixed = await resolveResearchPriceActionBars(sample, {}, {
    loadMarketDataConfig: () => config,
    fetchCachedMarketBars: async (args) => args.timeframe === '5m' ? bars('5m', 7) : [],
    getNinjaHistoricalBars: async (args) => ({
      ok: true,
      instrument: args.instrument || 'MES 06-26',
      timeframe: args.timeframe || '15m',
      count: 3,
      bars: bars('15m', 3, 30),
    }),
  });
  assert.equal(mixed.dataSource, 'mixed');
  assert.equal(mixed.resolvedContract, 'MES 06-26');

  const missing = await resolveResearchPriceActionBars({
    ...sample,
    date: '2026-01-07',
    time: '10:00',
  }, {
    symbol: 'MES',
    timezone: 'America/Los_Angeles',
  }, {
    loadMarketDataConfig: () => null,
    fetchCachedMarketBars: async () => {
      throw new Error('cache should not be called without config');
    },
    getNinjaHistoricalBars: async (args) => ({
      ok: false,
      instrument: args.instrument || 'MES 06-26',
      timeframe: args.timeframe || '5m',
      count: 0,
      bars: [],
      error: 'fixture bridge unavailable',
    }),
  });
  assert.equal(missing.dataSource, 'missing');
  assert.equal(missing.bars5m.length, 0);
  assert.equal(missing.bars15m.length, 0);
  assert.equal(missing.warnings.some((warning) => warning.includes('market data cache configuration is unavailable')), true);
  assert.equal(missing.warnings.some((warning) => warning.includes('Timezone ambiguity')), true);
  assert.equal(missing.warnings.some((warning) => warning.includes('fixture bridge unavailable')), true);
  assert.equal(missing.warnings.some((warning) => warning.includes('Insufficient 5-minute bars')), true);

  const malformed = await resolveResearchPriceActionBars({ sampleId: 'bad', date: 'bad-date', time: null }, {}, {
    loadMarketDataConfig: () => config,
    fetchCachedMarketBars: async () => [],
    getNinjaHistoricalBars: async () => {
      throw new Error('bridge should not be called for malformed sample time');
    },
  });
  assert.equal(malformed.dataSource, 'missing');
  assert.equal(malformed.resolvedWindow.sampleTimestamp, null);
  assert.equal(malformed.warnings.some((warning) => warning.includes('Sample date is missing or malformed')), true);
  assert.equal(malformed.warnings.some((warning) => warning.includes('Sample time is missing or malformed')), true);

  assert.deepEqual(forbiddenExecutablePaths(fallback), []);
  const model = buildPriceActionReviewCardModel({
    symbol: fallback.symbol,
    contract: fallback.resolvedContract,
    sample,
    overlay: {
      hypotheticalReferencePrice: 7597,
      hypotheticalInvalidationReference: 7593,
      hypotheticalThresholdOne: 7601,
      hypotheticalThresholdTwo: 7605,
      hypotheticalOutcomeLabel: 'neutral_no_resolution',
      firstResolvedEvent: 'neutral_no_resolution',
      advisoryOnly: true,
      executionApproved: false,
    },
    bars5m: fallback.bars5m,
    bars15m: fallback.bars15m,
  });
  const output = await renderPriceActionReviewCard({
    model,
    outputDir,
    filePrefix: 'price-action-review-card-provider-fixture',
  });
  assert.equal(path.extname(output), '.png');
  assert.ok(statSync(output).size > 20_000);
  const png = readFileSync(output);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');

  console.log(`Research price action bars provider verified: ${output}`);
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
