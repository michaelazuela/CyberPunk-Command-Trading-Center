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
  setupType: SetupType.DefendedBattleZoneContinuation,
  scenarioLabel: 'Defended battle-zone continuation',
  pathway: 'defended_battle_zone_continuation',
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
  invalidation: 'Invalid below the defended 5M battle-zone low at 7686.50.',
  requiredTrigger: 'Review only: higher-timeframe bias aligned; completed 5M close holds the defended 15M FVG and reclaims above 7700.25.',
  tacticalZone: {
    sourceOfTruth: 'ohlc_fvg_zone',
    direction: 'LONG',
    lower: 7691,
    upper: 7694,
    label: 'Defended 5M FVG support',
    sourceTimeframe: '5M',
    confidence: 'High',
    evidence: 'Last 5M battle zone was defended after the 15M support zone held.',
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
      lineReason: '15M defended FVG support remains the line in sand for review.',
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
    reason: 'Wide protected-structure risk makes this a human-review Discord plan, not executable approval.',
  },
  evidence: [
    '15M defended fair value gap / FVG battle zone held as discount support.',
    '15M HTF support and higher-timeframe bias aligned with the continuation.',
    'Sell-side liquidity sweep printed into the zone, followed by reclaim.',
    'Wick rejection support formed inside the defended area.',
    '5M market structure shift / MSS confirmed reclaim away from the protected support zone.',
    'Bullish displacement candle expanded from the defended FVG / imbalance.',
    'Protected 5M structure stop is visible.',
    'App targets are computed from actual entry-to-stop risk.',
  ],
  missingEvidence: [],
  blockReason: null,
  nextAction: 'Human Review Ready LONG defended battle-zone continuation plan. No chase; trader confirmation required and canExecute remains false.',
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
assert.equal(lifecycle.selectedCandidate?.setupType, SetupType.DefendedBattleZoneContinuation);
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
  assert.ok(text.includes('Decision support only. No automated orders.'));
  assert.ok(!/trade now|place orders?|guaranteed|prediction theater/i.test(text));

  const audit = JSON.parse(await fs.readFile(result.auditLogPath, 'utf8'));
  assert.equal(audit.source, 'live-scanner');
  assert.equal(audit.planVersionId, 'SCANNER-24H-LOOPBACK');
  assert.equal(audit.deskState.canExecute, false);
  assert.equal(audit.visibility.authority.discordEligible, true);
  assert.equal(audit.candidateLifecycleTrace.discordDecision.shouldSend, true);
  assert.equal(audit.candidate.setupType, SetupType.DefendedBattleZoneContinuation);
  assert.equal(audit.attachments.chartMarkup, result.chartMarkup);
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}

console.log('scanner 24h Discord loopback test passed');
