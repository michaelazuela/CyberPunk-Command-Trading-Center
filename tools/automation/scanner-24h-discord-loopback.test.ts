import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, SetupCandidateStatus, SetupType, TradeDecisionStatus, type ChartContext, type SetupCandidate } from '../../src/types';
import {
  buildCandidateLifecycleTrace,
  buildDeskState,
  classifyScannerVisibility,
  resolveScannerWindow,
  scoreScannerCandidate,
  shouldSendScannerAlert,
} from '../../src/lib/localScannerEngine';
import { flattenDiscordPayloadText } from './discord-alert-format';
import { prepareLiveScannerDiscordAlertArtifacts } from './nt-scanner';

const candidate: SetupCandidate = {
  setupType: SetupType.FvgStrengthContinuation,
  scenarioLabel: 'FVG Strength Continuation',
  pathway: 'fvg_strength_continuation',
  candidateState: 'HUMAN_REVIEW_READY',
  direction: 'LONG',
  detectedStatus: SetupCandidateStatus.Conditional,
  executionStatus: ExecutionStatus.Conditional,
  confidence: 'High',
  priority: 94,
  decisionQualityScore: 93,
  modelConfidenceScore: 92,
  rankScore: 94,
  entry: 7700.25,
  stop: 7686.5,
  target1: 7720.875,
  target2: 7727.75,
  riskPoints: 13.75,
  riskAdvisoryStatus: 'RISK_EXTENDED_STRUCTURAL',
  invalidation: 'Invalid below the protected 5M structure stop at 7686.50.',
  requiredTrigger: 'Review only: higher-timeframe bias aligned; completed 5M close holds the trend-side 15M FVG. No sweep required.',
  tacticalZone: {
    sourceOfTruth: 'ohlc_fvg_zone',
    direction: 'LONG',
    lower: 7691,
    upper: 7694,
    label: 'Defended 5M FVG support',
    sourceTimeframe: '5M',
    confidence: 'High',
    evidence: 'First trend-side FVG was defended after the 15M support zone held. No sweep required.',
  },
  activeRuleset: {
    timeframeMss: {
      applied: true,
      status: 'passed',
      required: 'aligned_confirmed_5m_mss',
      appliesToAllModels: true,
      affectsExecution: false,
      evidence: [
        '15M HTF support and higher-timeframe bias aligned with the long continuation.',
        '5M market structure shifted higher after the defended 15M support zone held.',
      ],
      blockers: [],
    },
    htfLineInSand: {
      applied: true,
      status: 'passed',
      required: 'completed_5m_or_15m_close_beyond_htf_line',
      appliesToAllModels: true,
      affectsExecution: false,
      direction: 'LONG',
      lineInSand: 7676,
      lineReason: '15M defended trend-side FVG support remains the line in sand for review. No sweep required.',
      requiredClose: '5M close must hold above 7676.00 after reclaim.',
      obstacleType: 'imbalance_zone',
      obstacleSource: 'ninjatrader',
      evidence: ['15M FVG support at 7676.00-7678.50 was defended.'],
      blockers: [],
    },
  },
  humanReview: {
    status: 'HumanReviewReady',
    canExecute: false,
    requiresTraderConfirmation: true,
    discordTradePlanEligible: true,
    reason: 'Trend-side FVG defense makes this a human-review Discord plan, not executable approval.',
  },
  evidence: [
    '15M trend-side fair value gap / FVG held as discount support.',
    '15M HTF support and higher-timeframe bias aligned with the continuation.',
    'Sweep is not required for this FVG Strength Continuation path.',
    'Wick rejection support formed inside the defended FVG area.',
    '5M market structure shift / MSS confirmed reclaim away from the protected support zone.',
    'Bullish displacement candle expanded from the defended FVG / imbalance.',
    'Protected 5M structure stop is visible.',
    'App targets are computed from actual entry-to-stop risk.',
  ],
  missingEvidence: [],
  blockReason: null,
  nextAction: 'Human Review Ready LONG FVG Strength Continuation. First trend-side FVG defended; no sweep required; trader confirmation required and canExecute remains false.',
  reducedRiskPlan: null,
  target1Reason: 'App target T1 = 1.5R from actual entry-to-stop risk.',
  target2Reason: 'App target T2 = 2.0R from actual entry-to-stop risk.',
};

const chartContext: ChartContext = {
  sessionType: 'lunch',
  instrument: 'MES',
  tradeDate: '2026-08-26',
  timeframe: '5m',
  screenshotUsability: 'usable',
  chartTimestamp: '2026-08-26T16:05:00-04:00',
  screenshotTimezone: 'EST',
  keyLevels: {
    currentPrice: 7700.25,
    activeSwingLow: 7686.5,
    nearestSupport: 7676,
    nearestResistance: 7728,
  },
  candles: [
    { index: 0, timestamp: '2026-08-26T15:45:00-04:00', open: 7698, high: 7705, low: 7692, close: 7702, direction: 'bullish', confidence: 'High' },
    { index: 1, timestamp: '2026-08-26T15:50:00-04:00', open: 7702, high: 7704, low: 7691, close: 7695, direction: 'bearish', confidence: 'High' },
    { index: 2, timestamp: '2026-08-26T15:55:00-04:00', open: 7695, high: 7698, low: 7686.5, close: 7696.75, direction: 'bullish', confidence: 'High' },
    { index: 3, timestamp: '2026-08-26T16:00:00-04:00', open: 7696.75, high: 7702, low: 7693, close: 7700.25, direction: 'bullish', confidence: 'High' },
    { index: 4, timestamp: '2026-08-26T16:05:00-04:00', open: 7700.25, high: 7711, low: 7696.5, close: 7710.25, direction: 'bullish', confidence: 'High' },
  ],
  fvgZones: [{
    direction: 'LONG',
    lower: 7676,
    upper: 7678.5,
    reclaimed: true,
    impulseQualified: true,
    confidence: 'High',
  }],
  displacementCandles: [{
    direction: 'LONG',
    candleIndex: 4,
    timestamp: '2026-08-26T16:05:00-04:00',
    bodyPoints: 10,
    rangePoints: 14.5,
    closeLocation: 'top_quarter',
    quality: 'confirmed',
    leavesImbalance: true,
    breaksStructure: true,
    confidence: 'High',
  }],
  multiTimeframeContext: {
    source: 'ninjatrader_bridge',
    authority: 'ohlc_facts_only',
    alignment: {
      macroBias: 'LONG',
      sessionBias: 'LONG',
      liquidityBias: 'LONG',
      executionBias: 'LONG',
      alignedDirection: 'LONG',
      conflicts: [],
      notes: [],
    },
    fifteenMinute: {
      timeframe: '15m',
      role: 'session_structure',
      barCount: 96,
      high: 7728,
      low: 7672,
      open: 7680,
      close: 7700.25,
      midpoint: 7700,
      rangePoints: 56,
      trend: 'bullish',
      candles: [
        { index: 0, timestamp: '2026-08-26T13:00:00-04:00', open: 7674, high: 7684, low: 7671, close: 7683, direction: 'bullish', confidence: 'High' },
        { index: 1, timestamp: '2026-08-26T13:15:00-04:00', open: 7683, high: 7686, low: 7678, close: 7685, direction: 'bullish', confidence: 'High' },
        { index: 2, timestamp: '2026-08-26T13:30:00-04:00', open: 7685, high: 7688, low: 7682, close: 7687, direction: 'bullish', confidence: 'High' },
        { index: 3, timestamp: '2026-08-26T14:45:00-04:00', open: 7687, high: 7690, low: 7685, close: 7689, direction: 'bullish', confidence: 'High' },
        { index: 12, timestamp: '2026-08-26T15:00:00-04:00', open: 7689, high: 7698, low: 7691, close: 7696, direction: 'bullish', confidence: 'High' },
        { index: 16, timestamp: '2026-08-26T16:00:00-04:00', open: 7692, high: 7711, low: 7686.5, close: 7710.25, direction: 'bullish', confidence: 'High' },
      ],
      fvgZones: [
        { direction: 'LONG', lower: 7676, upper: 7678.5, midpoint: 7677.25, formedAt: '2026-08-26T13:00:00-04:00', formedCandleIndex: 0, impulseQualified: true, confidence: 'High' },
        { direction: 'LONG', lower: 7691, upper: 7694, midpoint: 7692.5, formedAt: '2026-08-26T15:00:00-04:00', formedCandleIndex: 12, impulseQualified: true, confidence: 'High' },
        { direction: 'SHORT', lower: 7723.25, upper: 7725.25, midpoint: 7724.25, formedAt: '2026-08-26T15:45:00-04:00', formedCandleIndex: 15, impulseQualified: true, confidence: 'High' },
      ],
      liquiditySweeps: [],
      reclaimEvents: [],
      failedBreakEvents: [],
      displacementCandles: [],
      structuralLevels: [],
      confidence: 'High',
      notes: [],
    },
    fiveMinute: {
      timeframe: '5m',
      role: 'execution',
      barCount: 145,
      high: 7711,
      low: 7671,
      open: 7698,
      close: 7700.25,
      midpoint: 7691,
      rangePoints: 40,
      trend: 'bullish',
      candles: [
        { index: 0, timestamp: '2026-08-26T15:45:00-04:00', open: 7698, high: 7705, low: 7692, close: 7702, direction: 'bullish', confidence: 'High' },
        { index: 1, timestamp: '2026-08-26T15:50:00-04:00', open: 7702, high: 7704, low: 7691, close: 7695, direction: 'bearish', confidence: 'High' },
        { index: 2, timestamp: '2026-08-26T15:55:00-04:00', open: 7695, high: 7698, low: 7686.5, close: 7696.75, direction: 'bullish', confidence: 'High' },
        { index: 3, timestamp: '2026-08-26T16:00:00-04:00', open: 7696.75, high: 7702, low: 7693, close: 7700.25, direction: 'bullish', confidence: 'High' },
      ],
      fvgZones: [],
      liquiditySweeps: [],
      reclaimEvents: [],
      failedBreakEvents: [],
      displacementCandles: [],
      structuralLevels: [],
      confidence: 'High',
      notes: [],
    },
    oneHour: { timeframe: '1h', role: 'session_structure', barCount: 24, high: 7728, low: 7671, open: 7680, close: 7700.25, midpoint: 7700, rangePoints: 57, trend: 'bullish', candles: [], fvgZones: [], liquiditySweeps: [], reclaimEvents: [], failedBreakEvents: [], displacementCandles: [], structuralLevels: [], confidence: 'High', notes: [] },
    fourHour: { timeframe: '4h', role: 'macro_context', barCount: 8, high: 7728, low: 7671, open: 7680, close: 7700.25, midpoint: 7700, rangePoints: 57, trend: 'bullish', candles: [], fvgZones: [], liquiditySweeps: [], reclaimEvents: [], failedBreakEvents: [], displacementCandles: [], structuralLevels: [], confidence: 'High', notes: [] },
    targetMap: { liquidityTargets: [], imbalanceTargets: [], reactionZones: [], notes: [] },
  } as any,
  marketContext: '15M defended FVG support and 5M reclaim continuation. Decision support only.',
};

const window = resolveScannerWindow(new Date('2026-08-26T16:05:00-04:00'));
assert.equal(window.allowsDeskPlan, true);
assert.equal(window.allowsDiscordAlert, true);
assert.equal(window.label, '24-Hour High-Confidence Review Monitor');
assert.equal(window.quality, 'observe_only');

const confidence = scoreScannerCandidate(candidate, window, 7700.25, true);
assert.ok(confidence.score >= 65, `expected conditional score >= 65, got ${confidence.score}`);
assert.equal(confidence.hardBlocker, null);

const alertDecision = shouldSendScannerAlert({
  state: 'Conditional',
  confidence: confidence.score,
  window,
  candidate,
});
assert.equal(alertDecision.shouldSend, true);

const lifecycle = buildCandidateLifecycleTrace({
  candidates: [candidate],
  selectedCandidate: candidate,
  state: 'Conditional',
  window,
  alertDecision,
  canExecute: false,
});
assert.equal(lifecycle.selectedCandidate?.setupType, SetupType.FvgStrengthContinuation);
assert.equal(lifecycle.discordDecision.shouldSend, true);
assert.equal(lifecycle.sourceOfTruth, 'scanner_candidate_lifecycle_trace');

const visibility = classifyScannerVisibility({
  state: 'Conditional',
  candidate,
  window,
  alertDecision,
  canExecute: false,
});
assert.equal(visibility.discordAction, 'post_review');
assert.equal(visibility.authority.discordEligible, true);
assert.equal(visibility.authority.canExecute, false);
assert.equal(visibility.authority.humanReviewOnly, true);

const targetCascade = {
  activeTarget: null,
  activeTimeframe: null,
  sweptTargets: [],
  promotedTarget: null,
  path: ['App targets first; 15M reaction/runner context remains management only.'],
  targetRoomPoor: false,
  reason: 'Loopback fixture keeps target cascade as audit context.',
};

const deskState = buildDeskState({
  state: 'Conditional',
  candidate,
  visibilityMetadata: visibility,
  candidateLifecycleTrace: lifecycle,
  targetCascade,
  htfLiquidityDrawState: null,
  chartContext,
  currentPrice: 7700.25,
  canExecute: false,
});
assert.equal(deskState.discordAction, 'post_review');
assert.equal(deskState.canExecute, false);
assert.equal(deskState.sourceOfTruth, 'scanner_desk_state');
assert.equal(deskState.primaryDeskPlay.retainedBossZones.bullBoss?.direction, 'LONG');
assert.equal(deskState.primaryDeskPlay.retainedBossZones.bullBoss?.lower, 7691);
assert.equal(deskState.primaryDeskPlay.retainedBossZones.bullBoss?.upper, 7694);
assert.equal(deskState.primaryDeskPlay.retainedBossZones.bullBoss?.state, 'defended');
assert.equal(deskState.primaryDeskPlay.retainedBossZones.bearBoss?.direction, 'SHORT');
assert.equal(deskState.primaryDeskPlay.retainedBossZones.bearBoss?.lower, 7723.25);
assert.equal(deskState.primaryDeskPlay.retainedBossZones.bearBoss?.upper, 7725.25);
assert.equal(deskState.primaryDeskPlay.retainedBossZones.bearBoss?.state, 'alive');
assert.equal(deskState.primaryDeskPlay.retainedBossZones.activeMssProtectedBossZone?.direction, 'LONG');
assert.equal(deskState.primaryDeskPlay.activeMssProtectedBossZone?.role, 'active_mss_protected_boss_zone');
assert.ok((deskState.primaryDeskPlay.activeMssProtectedBossZone?.formedAt || '') > '2026-08-26T13:00:00-04:00');
assert.equal(deskState.primaryDeskPlay.retainedBossZones.finalBossMssZones.primaryBull?.direction, 'LONG');
assert.equal(deskState.primaryDeskPlay.retainedBossZones.finalBossMssZones.primaryBull?.role, 'final_boss_mss_zone');
assert.equal(deskState.primaryDeskPlay.retainedBossZones.finalBossMssZones.primaryBull?.state, 'active_control');
assert.equal(deskState.primaryDeskPlay.retainedBossZones.approvalBoundary.changesCanExecute, false);

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scanner-24h-loopback-'));
try {
  const outputDir = path.join(tempDir, 'images');
  const auditDir = path.join(tempDir, 'audit');
  const result = await prepareLiveScannerDiscordAlertArtifacts({
    session: 'lunch',
    tradeDate: '2026-08-26',
    config: { instrument: 'MES' },
    state: 'Conditional',
    confidence,
    candidate,
    normalized: {
      canExecute: false,
      decisionStatus: TradeDecisionStatus.ConditionalTrade,
      decision: 'LONG',
      noTradeReason: null,
      invalidation: candidate.invalidation,
      setupCandidates: [candidate],
    } as any,
    chartContext,
    currentPrice: 7700.25,
    completed5m: {
      time: '2026-08-26T16:05:00-04:00',
      open: 7700.25,
      high: 7711,
      low: 7696.5,
      close: 7710.25,
      volume: 1000,
    },
    scoringTimestamp: '2026-08-26T16:05:00-04:00',
    scoringTimestampSource: 'loopback completed 5M candle',
    windowLabel: window.label,
    staleReason: null,
    scannerReviewStatus: 'high_confidence_review_monitor_loopback',
    scannerAuditWarnings: ['Loopback fixture only. No live Discord post was sent.'],
    targetCascade,
    alertReason: alertDecision.reason,
    visibilityMetadata: visibility,
    candidateLifecycleTrace: lifecycle,
    deskState,
    planVersionId: 'SCANNER-24H-LOOPBACK',
    outputDir,
    auditDir,
  });

  assert.ok(result.files.length >= 1, 'expected Discord artifact attachment for selected candidate');
  assert.ok(result.auditLogPath);
  const text = flattenDiscordPayloadText(result.payload);
  assert.ok(text.includes('MES Current Desk Plan'));
  assert.ok(text.includes('HIGH-CONFIDENCE'));
  assert.ok(text.includes('LONG'));
  assert.ok(text.includes('Decision class:'));
  assert.ok(text.includes('Entry:'));
  assert.ok(text.includes('Stop:'));
  assert.ok(text.includes('T1:'));
  assert.ok(text.includes('T2:'));
  assert.ok(text.includes('Retained Boss Zones:'));
  assert.ok(text.includes('Bull Final Boss Support: 7691.00-7694.00'));
  assert.ok(text.includes('Bear Final Boss Resistance: 7723.25-7725.25'));
  assert.ok(text.includes('15M Final Boss Shift Zones:'));
  assert.ok(text.includes('Bull Final Boss Shift Zone:'));
  assert.ok(!text.includes('Active structure shift-Protected Boss Zone:'));
  assert.ok(!text.includes('Active structure shift-Protected Bull Boss:'));
  assert.ok(!/Active MSS-Protected Boss Zone/i.test(text));
  assert.ok(/defended/i.test(text));
  assert.ok(text.includes('Decision support only. No automated orders.'));
  assert.ok(text.includes('FVG Strength Continuation') || text.includes('FVG'));
  assert.ok(/No sweep required/i.test(text));
  assert.ok(!/trade now|place orders?|guaranteed|prediction theater/i.test(text));

  const audit = JSON.parse(await fs.readFile(result.auditLogPath, 'utf8'));
  assert.equal(audit.source, 'live-scanner');
  assert.equal(audit.planVersionId, 'SCANNER-24H-LOOPBACK');
  assert.equal(audit.deskState.canExecute, false);
  assert.equal(audit.deskState.primaryDeskPlay.retainedBossZones.bullBoss.state, 'defended');
  assert.equal(audit.deskState.primaryDeskPlay.retainedBossZones.bullBoss.sourceKind, 'strict_15m_fvg');
  assert.equal(audit.deskState.primaryDeskPlay.retainedBossZones.bullBoss.sourceLabel, 'strict 15M FVG');
  assert.equal(audit.deskState.primaryDeskPlay.retainedBossZones.bearBoss.state, 'alive');
  assert.equal(audit.deskState.primaryDeskPlay.activeMssProtectedBossZone.direction, 'LONG');
  assert.equal(audit.deskState.primaryDeskPlay.activeMssProtectedBossZone.role, 'active_mss_protected_boss_zone');
  assert.equal(audit.deskState.primaryDeskPlay.retainedBossZones.finalBossMssZones.primaryBull.direction, 'LONG');
  assert.equal(audit.deskState.primaryDeskPlay.retainedBossZones.finalBossMssZones.primaryBull.role, 'final_boss_mss_zone');
  assert.equal(audit.visibility.authority.discordEligible, true);
  assert.equal(audit.candidateLifecycleTrace.discordDecision.shouldSend, true);
  assert.equal(audit.candidate.setupType, SetupType.FvgStrengthContinuation);
  assert.equal(audit.attachments.chartMarkup, result.chartMarkup);
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}

console.log('scanner 24h Discord loopback test passed');
