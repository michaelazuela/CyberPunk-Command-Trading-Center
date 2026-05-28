import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, type ChartContext, type SetupCandidate } from '../../src/types';
import { buildChartMarkupHtmlForTest, renderChartMarkup, renderPriceLevelMap, resolveChartMarkerAnchorFacts, verifyApprovedDailyTradePlanRender } from './chart-markup-renderer';

const outputDir = path.join(os.tmpdir(), `chart-markup-renderer-${Date.now()}`);

const candles = Array.from({ length: 48 }, (_, index) => {
  const base = index < 18 ? 7084 - index * 0.35 : 7077 + (index - 18) * 0.45;
  const open = base;
  const close = index % 5 === 0 ? base - 0.35 : base + 0.35;
  return {
    index,
    timestamp: `2026-05-22T${String(9 + Math.floor(index / 12)).padStart(2, '0')}:${String((index % 12) * 5).padStart(2, '0')}:00-04:00`,
    open,
    high: Math.max(open, close) + 0.6,
    low: Math.min(open, close) - 0.6,
    close,
    direction: close >= open ? 'bullish' as const : 'bearish' as const,
    confidence: 'High' as const,
  };
});

const chartContext: Partial<ChartContext> = {
  candles,
  fvgZones: [{
    direction: 'LONG',
    lower: 7079.25,
    upper: 7081.5,
    midpoint: 7080.375,
    confidence: 'High',
  }],
  liquiditySweeps: [{
    type: 'sweep',
    direction: 'LONG',
    level: 7077.25,
    sweptLevelLabel: 'Sell-side liquidity',
    reclaimed: true,
    timestamp: candles[18].timestamp,
    confidence: 'High',
  }],
  reclaimEvents: [{
    direction: 'LONG',
    reclaimedLevel: 7077.25,
    levelLabel: 'Sell-side liquidity',
    timestamp: candles[22].timestamp,
    candleIndex: 22,
    confidence: 'High',
  }],
  displacementCandles: [{
    direction: 'LONG',
    candleIndex: 30,
    timestamp: candles[30].timestamp,
    open: candles[30].open,
    high: candles[30].high,
    low: candles[30].low,
    close: candles[30].close,
    bodyPoints: Math.abs(candles[30].close - candles[30].open),
    rangePoints: candles[30].high - candles[30].low,
    confidence: 'High',
  }],
  marketStructure: {
    trend: 'bullish',
    higherHigh: true,
    higherLow: true,
    lowerHigh: false,
    lowerLow: false,
    marketStructureShift: true,
    chopRangeCondition: false,
  },
  multiTimeframeContext: {
    source: 'ninjatrader_bridge',
    authority: 'ohlc_facts_only',
    fourHour: {} as any,
    oneHour: {} as any,
    fifteenMinute: {} as any,
    fiveMinute: {} as any,
    alignment: {
      macroBias: 'LONG',
      sessionBias: 'LONG',
      liquidityBias: 'LONG',
      executionBias: 'LONG',
      alignedDirection: 'LONG',
      conflicts: [],
      notes: ['Bullish alignment.'],
      summary: 'Bullish alignment.',
    } as any,
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
};

const candidate: SetupCandidate = {
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'Sweep -> MSS -> FVG Retrace',
  direction: 'LONG',
  detectedStatus: SetupCandidateStatus.Possible,
  confidence: 'Medium',
  priority: 10,
  entry: 7080.25,
  stop: 7075.25,
  target1: 7086.5,
  target2: 7092.25,
  riskPoints: 5,
  targetObjectivePlan: {
    targetQuality: 'clear_path',
    targetModel: 'actual_r_with_structural_context',
    objectives: [],
    notes: [],
    liquidityTarget1: {
      label: 'Buy-side liquidity',
      price: 7095.25,
      direction: 'LONG',
      source: 'london',
      type: 'high',
      confidence: 'High',
      score: 90,
      reason: 'Buy-side liquidity above entry.',
    },
  },
  invalidation: 'Invalid below sweep low.',
  entryClarity: 1,
  stopClarity: 1,
  targetClarity: 1,
  proximityScore: 1,
  levelContextScore: 12,
  evidence: ['Liquidity sweep confirmed', 'Reclaim after sweep confirmed', 'Displacement confirmed', 'Market structure shift confirmed', 'Fair value gap / imbalance entry model'],
  missingEvidence: [],
  executionStatus: ExecutionStatus.Conditional,
  blockReason: NoTradeReason.EntryTriggerPending,
  requiredTrigger: 'Wait for 5M retrace into FVG.',
  nextAction: 'Wait for 5M trigger.',
  reducedRiskPlan: null,
  decisionQualityScore: 78,
  decisionQualityRecommendation: 'Conditional: wait for trigger.',
};

try {
  const missingCandidateChart = await renderChartMarkup({
    chartContext,
    candidate: null,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'missing-candidate',
  });
  assert.equal(missingCandidateChart, null);
  const missingCandidateLevelMap = await renderPriceLevelMap({
    chartContext,
    candidate: null,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'missing-candidate',
  });
  assert.equal(missingCandidateLevelMap, null);

  const candidateBeforeRender = JSON.stringify(candidate);
  const chartHtml = buildChartMarkupHtmlForTest({
    chartContext,
    candidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.equal(JSON.stringify(candidate), candidateBeforeRender, 'chart renderer must not mutate the input candidate');
  assert.ok(chartHtml.includes('[AM PLAN] MES - LONG CONDITIONAL'));
  assert.ok(chartHtml.includes('Action: wait for 5M trigger'));
  assert.ok(chartHtml.includes('Risk: <tspan fill="#f8fafc">5.00 pts</tspan>'));
  assert.ok(chartHtml.includes('Contracts: <tspan fill="#f8fafc">N/A</tspan>'));
  assert.ok(chartHtml.includes('T1: <tspan fill="#facc15">1.3R</tspan>'));
  assert.ok(chartHtml.includes('T2: <tspan fill="#facc15">2.4R</tspan>'));
  assert.ok(chartHtml.includes('Entry Zone'));
  assert.ok(chartHtml.includes('7080.25'));
  assert.ok(chartHtml.includes('7075.25'));
  assert.ok(chartHtml.includes('7086.50'));
  assert.ok(chartHtml.includes('7092.25'));
  assert.ok(!chartHtml.includes('canExecute'));
  assert.ok(!chartHtml.includes('noTradeReason'));

  const noTradeCandidate: SetupCandidate = {
    ...candidate,
    direction: 'NO TRADE',
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    executionStatus: ExecutionStatus.NotDetected,
    blockReason: NoTradeReason.NoApprovedSetup,
  };
  const noTradeChart = await renderChartMarkup({
    chartContext,
    candidate: noTradeCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'no-trade',
  });
  assert.equal(noTradeChart, null, 'NO TRADE rendering must not invent entry/stop/target levels');
  const noTradeMap = await renderPriceLevelMap({
    chartContext,
    candidate: noTradeCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'no-trade',
  });
  assert.equal(noTradeMap, null, 'NO TRADE level map must not invent trade levels');

  const missingLevelsCandidate: SetupCandidate = {
    ...candidate,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
  };
  const missingLevelsHtml = buildChartMarkupHtmlForTest({
    chartContext,
    candidate: missingLevelsCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.ok(missingLevelsHtml.includes('Entry Zone: <tspan fill="#4ade80">N/A - N/A</tspan>'));
  assert.ok(missingLevelsHtml.includes('Stop: <tspan fill="#ef4444">N/A</tspan>'));
  assert.ok(missingLevelsHtml.includes('Risk: <tspan fill="#f97316">N/A</tspan>'));
  assert.ok(!missingLevelsHtml.includes('0.00'));

  const output = await renderChartMarkup({
    chartContext,
    candidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'test',
  });
  assert.ok(output);
  const stat = await fs.stat(output);
  assert.ok(stat.size > 20_000);
  const approvedFormat = await verifyApprovedDailyTradePlanRender(output);
  assert.deepEqual(approvedFormat, { ok: true });
  const longAnchors = resolveChartMarkerAnchorFacts({
    chartContext,
    candidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.equal(longAnchors.sweep?.candleIndex, 18);
  assert.equal(longAnchors.sweep?.price, candles[18].low);
  assert.equal(longAnchors.sweep?.source, 'event_timestamp');
  assert.ok(longAnchors.sweep.price <= 7077.25);
  assert.equal(longAnchors.reclaim?.candleIndex, 22);
  assert.equal(longAnchors.reclaim?.price, 7077.25);
  assert.equal(longAnchors.reclaim?.source, 'event_candle_index');
  assert.equal(longAnchors.displacement?.candleIndex, 30);
  assert.equal(longAnchors.displacement?.price, candles[30].close);
  const longFallbackAnchors = resolveChartMarkerAnchorFacts({
    chartContext: {
      ...chartContext,
      liquiditySweeps: [{
        type: 'sweep',
        direction: 'LONG',
        level: 7077.25,
        sweptLevelLabel: 'Sell-side liquidity',
        reclaimed: true,
        confidence: 'High',
      }],
      reclaimEvents: [{
        direction: 'LONG',
        reclaimedLevel: 7077.25,
        levelLabel: 'Sell-side liquidity',
        timestamp: candles[22].timestamp,
        confidence: 'High',
      }],
      displacementCandles: [{
        direction: 'LONG',
        candleIndex: 999,
        timestamp: candles[30].timestamp,
        open: candles[30].open,
        high: candles[30].high,
        low: candles[30].low,
        close: candles[30].close,
        bodyPoints: Math.abs(candles[30].close - candles[30].open),
        rangePoints: candles[30].high - candles[30].low,
        confidence: 'High',
      }],
    },
    candidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.equal(longFallbackAnchors.sweep?.candleIndex, 18);
  assert.equal(longFallbackAnchors.sweep?.source, 'crossed_swept_level');
  assert.equal(longFallbackAnchors.sweep?.price, candles[18].low);
  assert.equal(longFallbackAnchors.reclaim?.candleIndex, 22);
  assert.equal(longFallbackAnchors.reclaim?.source, 'event_timestamp');
  assert.equal(longFallbackAnchors.displacement?.candleIndex, 30);
  assert.equal(longFallbackAnchors.displacement?.source, 'event_timestamp');

  const shortCandles = Array.from({ length: 28 }, (_, index) => {
    const base = 7560 + Math.sin(index / 3) * 1.2 + index * 0.03;
    const open = index === 9 ? 7563.6 : base;
    const close = index === 9 ? 7564.4 : index === 12 ? 7564.4 : index === 18 ? 7558.4 : base - 0.2;
    return {
      index,
      timestamp: `2026-05-22T${String(10 + Math.floor(index / 12)).padStart(2, '0')}:${String((index % 12) * 5).padStart(2, '0')}:00-04:00`,
      open,
      high: index === 9 ? 7565.75 : Math.max(open, close) + 0.35,
      low: Math.min(open, close) - 0.35,
      close,
      direction: close >= open ? 'bullish' as const : 'bearish' as const,
      confidence: 'High' as const,
    };
  });
  const shortContext: Partial<ChartContext> = {
    candles: shortCandles,
    fvgZones: [{ direction: 'SHORT', lower: 7563.69, upper: 7564.31, midpoint: 7564, confidence: 'High' }],
    liquiditySweeps: [{
      type: 'sweep',
      direction: 'SHORT',
      level: 7565,
      sweptLevelLabel: 'Buy-side liquidity',
      reclaimed: true,
      confidence: 'High',
    }],
    reclaimEvents: [{
      direction: 'SHORT',
      reclaimedLevel: 7565,
      levelLabel: 'Buy-side liquidity',
      timestamp: shortCandles[12].timestamp,
      candleIndex: 12,
      confidence: 'High',
    }],
    displacementCandles: [{
      direction: 'SHORT',
      candleIndex: 18,
      timestamp: shortCandles[18].timestamp,
      open: shortCandles[18].open,
      high: shortCandles[18].high,
      low: shortCandles[18].low,
      close: shortCandles[18].close,
      bodyPoints: Math.abs(shortCandles[18].close - shortCandles[18].open),
      rangePoints: shortCandles[18].high - shortCandles[18].low,
      confidence: 'High',
    }],
  };
  const shortCandidate: SetupCandidate = {
    ...candidate,
    direction: 'SHORT',
    entry: 7564,
    stop: 7566,
    target1: 7561,
    target2: 7558,
    targetObjectivePlan: {
      ...candidate.targetObjectivePlan,
      liquidityTarget1: {
        label: 'Sell-side liquidity',
        price: 7554,
        direction: 'SHORT',
        source: 'london',
        type: 'low',
        confidence: 'High',
        score: 90,
        reason: 'Sell-side liquidity below entry.',
      },
    },
  };
  const shortAnchors = resolveChartMarkerAnchorFacts({
    chartContext: shortContext,
    candidate: shortCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.equal(shortAnchors.sweep?.candleIndex, 9);
  assert.equal(shortAnchors.sweep?.price, shortCandles[9].high);
  assert.equal(shortAnchors.sweep?.source, 'crossed_swept_level');
  assert.ok(shortAnchors.sweep.price >= 7565);
  assert.equal(shortAnchors.reclaim?.candleIndex, 12);
  assert.equal(shortAnchors.reclaim?.price, 7565);
  assert.equal(shortAnchors.displacement?.candleIndex, 18);
  assert.equal(shortAnchors.displacement?.price, shortCandles[18].close);
  const shortOutput = await renderChartMarkup({
    chartContext: shortContext,
    candidate: shortCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'short-test',
  });
  assert.ok(shortOutput);
  assert.deepEqual(await verifyApprovedDailyTradePlanRender(shortOutput), { ok: true });
  const shortLevelMap = await renderPriceLevelMap({
    chartContext: shortContext,
    candidate: shortCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'short-test',
  });
  assert.ok(shortLevelMap);
  assert.match(path.basename(shortLevelMap), /level-map/);
  assert.deepEqual(await verifyApprovedDailyTradePlanRender(shortLevelMap), { ok: true });

  const missingAnchors = resolveChartMarkerAnchorFacts({
    chartContext: { candles: shortCandles, liquiditySweeps: [], reclaimEvents: [], displacementCandles: [] },
    candidate: shortCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.deepEqual(missingAnchors, { sweep: null, reclaim: null, displacement: null });
  const noCrossingSweepAnchors = resolveChartMarkerAnchorFacts({
    chartContext: {
      candles: shortCandles,
      liquiditySweeps: [{
        type: 'sweep',
        direction: 'SHORT',
        level: 9000,
        sweptLevelLabel: 'Buy-side liquidity',
        reclaimed: true,
        confidence: 'High',
      }],
      reclaimEvents: [],
      displacementCandles: [],
    },
    candidate: shortCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.deepEqual(noCrossingSweepAnchors, { sweep: null, reclaim: null, displacement: null });

  const levelMap = await renderPriceLevelMap({
    chartContext,
    candidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'test',
  });
  assert.ok(levelMap);
  assert.match(path.basename(levelMap), /level-map/);
  const levelMapFormat = await verifyApprovedDailyTradePlanRender(levelMap);
  assert.deepEqual(levelMapFormat, { ok: true });
  console.log('chart markup renderer tests passed');
} finally {
  await fs.rm(outputDir, { recursive: true, force: true });
}
