import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, type ChartContext, type SetupCandidate } from '../../src/types';
import { renderChartMarkup } from './chart-markup-renderer';

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
  console.log('chart markup renderer tests passed');
} finally {
  await fs.rm(outputDir, { recursive: true, force: true });
}
