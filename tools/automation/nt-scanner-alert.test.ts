import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, SetupCandidateStatus, SetupType, TradeDecisionStatus, type ChartContext, type SetupCandidate } from '../../src/types';
import { BANNED_ACTIVE_DISCORD_ALERT_TEXT, flattenDiscordPayloadText } from './discord-alert-format';
import { prepareLiveScannerDiscordAlertArtifacts } from './nt-scanner';
import { verifyApprovedDailyTradePlanRender } from './chart-markup-renderer';

const outputDir = path.join(os.tmpdir(), `nt-scanner-alert-${Date.now()}`);
const auditDir = path.join(outputDir, 'discord-audit');

const candles = Array.from({ length: 48 }, (_, index) => {
  const base = index < 16 ? 5328 - index * 0.35 : 5322 + (index - 16) * 0.42;
  const open = base;
  const close = index === 16 ? base - 0.45 : index >= 22 ? base + 0.35 : base + 0.1;
  return {
    index,
    timestamp: `2026-05-26T${String(9 + Math.floor(index / 12)).padStart(2, '0')}:${String((index % 12) * 5).padStart(2, '0')}:00-04:00`,
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
  liquiditySweeps: [{
    type: 'sweep',
    direction: 'LONG',
    level: candles[16].low + 0.25,
    sweptLevelLabel: 'Sell-side liquidity',
    reclaimed: true,
    timestamp: candles[16].timestamp,
    confidence: 'High',
  }],
  reclaimEvents: [{
    direction: 'LONG',
    reclaimedLevel: candles[16].low + 0.25,
    levelLabel: 'Sell-side liquidity',
    candleIndex: 22,
    timestamp: candles[22].timestamp,
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
  fvgZones: [{ direction: 'LONG', lower: 5323.25, upper: 5325, midpoint: 5324.125, confidence: 'High' }],
  marketStructure: {
    trend: 'bullish',
    higherHigh: true,
    higherLow: true,
    lowerHigh: false,
    lowerLow: false,
    marketStructureShift: true,
    chopRangeCondition: false,
  },
};

const candidate: SetupCandidate = {
  setupType: SetupType.LiquiditySweep,
  scenarioLabel: 'Liquidity sweep reclaim',
  direction: 'LONG',
  detectedStatus: SetupCandidateStatus.Detected,
  confidence: 'High',
  priority: 90,
  entry: 5324.25,
  stop: 5319.25,
  target1: 5331.75,
  target2: 5334.25,
  riskPoints: 5,
  targetObjectivePlan: {
    targetQuality: 'clear_path',
    targetModel: 'actual_r_with_structural_context',
    objectives: [],
    notes: [],
    liquidityTarget1: {
      label: 'NY premarket high',
      price: 5336,
      direction: 'LONG',
      source: 'ny_premarket',
      type: 'high',
      confidence: 'High',
      score: 88,
      reason: 'Real session liquidity above entry.',
    },
  },
  invalidation: 'Invalid if price loses the protected sweep low.',
  entryClarity: 90,
  stopClarity: 90,
  targetClarity: 90,
  proximityScore: 1,
  levelContextScore: 18,
  evidence: ['Sweep confirmed', 'Reclaim confirmed', 'Displacement confirmed'],
  missingEvidence: ['Missing reasons should remain audit-only'],
  executionStatus: ExecutionStatus.Conditional,
  blockReason: null,
  requiredTrigger: 'Wait for completed 5M reclaim close above the swept low.',
  nextAction: 'Wait for trigger.',
  reducedRiskPlan: null,
  decisionQualityScore: 86,
  decisionQualityRecommendation: 'Full score detail belongs in audit JSON.',
  decisionQualityScorecard: [
    { label: 'Score breakdown', score: 20, max: 20, status: 'strong', note: 'This must not appear in the Discord main text.' },
  ],
};

try {
  const result = await prepareLiveScannerDiscordAlertArtifacts({
    session: 'morning',
    tradeDate: '2026-05-26',
    config: { instrument: 'MES' },
    state: 'Conditional',
    confidence: {
      score: 86,
      qualifiedReasons: ['Fixture qualified reason stays in audit JSON.'],
      missingReasons: ['Fixture missing reason stays in audit JSON.'],
      recommendation: 'Fixture recommendation stays out of main Discord text.',
      hardBlocker: null,
    },
    candidate,
    normalized: {
      canExecute: false,
      decisionStatus: TradeDecisionStatus.ConditionalTrade,
      decision: 'LONG',
      noTradeReason: null,
      invalidation: candidate.invalidation,
    } as any,
    chartContext: chartContext as ChartContext,
    currentPrice: 5324.5,
    completed5m: {
      time: candles[30].timestamp!,
      open: candles[30].open,
      high: candles[30].high,
      low: candles[30].low,
      close: candles[30].close,
      volume: 1000,
    },
    scoringTimestamp: candles[30].timestamp!,
    scoringTimestampSource: 'fixture completed 5M candle',
    windowLabel: 'Morning Setup Scanner',
    staleReason: null,
    targetCascade: {
      activeTarget: null,
      activeTimeframe: null,
      sweptTargets: [],
      promotedTarget: null,
      path: ['fixture path remains audit-only'],
      targetRoomPoor: false,
      reason: 'Fixture target cascade remains audit-only.',
    },
    alertReason: 'Fixture forced live scanner alert path.',
    planVersionId: 'SCANNER-FIXTURE-TEST',
    outputDir,
    auditDir,
  });

  assert.equal(result.files.length, 2);
  assert.ok(result.chartMarkup);
  assert.ok(result.levelMap);
  assert.match(path.basename(result.levelMap), /level-map/);
  assert.deepEqual(await verifyApprovedDailyTradePlanRender(result.chartMarkup), { ok: true });
  assert.deepEqual(await verifyApprovedDailyTradePlanRender(result.levelMap), { ok: true });

  const text = flattenDiscordPayloadText(result.payload);
  assert.ok(text.length < 1200, `expected live scanner compact text under 1200 chars, got ${text.length}`);
  assert.ok((result.payload.content?.length || 0) < 2000);
  assert.ok(text.includes('Compact Trade Plan Summary'));
  assert.ok(text.includes('Quant Desk Scanner Alert'));
  assert.ok(text.includes('Details: See attached Chart Plan + Price Level Map.'));
  for (const marker of BANNED_ACTIVE_DISCORD_ALERT_TEXT) {
    assert.ok(!text.toLowerCase().includes(marker.toLowerCase()), `live scanner payload leaked old long-form marker: ${marker}`);
  }
  assert.ok(!/Missing rea\.\.\.|Qualified rea\.\.\.|Target casc\.\.\.|Audit det\.\.\.|Counte\.\.\.|Audit detail|\{"/i.test(text));

  const auditText = await fs.readFile(result.auditLogPath, 'utf8');
  const audit = JSON.parse(auditText);
  assert.equal(audit.source, 'live-scanner');
  assert.equal(audit.planVersionId, 'SCANNER-FIXTURE-TEST');
  assert.equal(audit.attachments.chartMarkup, result.chartMarkup);
  assert.equal(audit.attachments.priceLevelMap, result.levelMap);
  assert.ok(auditText.includes('Fixture target cascade remains audit-only.'));
  assert.ok(!text.includes('Fixture target cascade remains audit-only.'));
  assert.ok(result.auditLogPath.startsWith(auditDir));

  console.log(`live scanner fixture alert verified: mainText=${text.length}, files=${result.files.length}, audit=${result.auditLogPath}`);
} finally {
  await fs.rm(outputDir, { recursive: true, force: true });
}
