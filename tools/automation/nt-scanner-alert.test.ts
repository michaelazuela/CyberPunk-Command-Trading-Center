import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, SetupCandidateStatus, SetupType, TradeDecisionStatus, type ChartContext, type SetupCandidate } from '../../src/types';
import { BANNED_ACTIVE_DISCORD_ALERT_TEXT, flattenDiscordPayloadText } from './discord-alert-format';
import {
  barsCoverRequestedLookback,
  barsForMorningContinuationWatchlist,
  buildScannerHistoryPreloadPlan,
  appOwnedFailedPlanEventsFromScannerState,
  createPendingScannerAlertDeliveryRecord,
  findMissedExecutableScannerDeliveries,
  markScannerAlertDeliveryFailed,
  markScannerAlertDeliverySent,
  markScannerAlertDeliverySkipped,
  candidateForNormalizedVisualAuthority,
  prepareLiveScannerDiscordAlertArtifacts,
  prepareLiveScannerWatchlistAlertArtifacts,
  resolveScannerDiscordWebhookUrl,
  SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS,
  summarizeScannerHistoryCoverage,
  writeScannerDecisionTapeAuditLog,
} from './nt-scanner';
import { buildChartMarkupHtmlForTest, verifyApprovedDailyTradePlanRender } from './chart-markup-renderer';

const outputDir = path.join(os.tmpdir(), `nt-scanner-alert-${Date.now()}`);
const auditDir = path.join(outputDir, 'discord-audit');
const previousOutcomeBaseUrl = process.env.DISCORD_OUTCOME_BASE_URL;
const previousOutcomeSecret = process.env.DISCORD_OUTCOME_SECRET;
process.env.DISCORD_OUTCOME_BASE_URL = 'https://quant-desk.example';
process.env.DISCORD_OUTCOME_SECRET = 'test-secret';

assert.deepEqual(resolveScannerDiscordWebhookUrl({}), { url: null, source: null, usingGenericFallback: false });
assert.deepEqual(resolveScannerDiscordWebhookUrl({ DISCORD_WEBHOOK_URL: 'https://discord.example/generic' }), {
  url: 'https://discord.example/generic',
  source: 'DISCORD_WEBHOOK_URL',
  usingGenericFallback: true,
});
assert.deepEqual(resolveScannerDiscordWebhookUrl({
  DISCORD_WEBHOOK_URL: 'https://discord.example/generic',
  SCANNER_DISCORD_WEBHOOK_URL: 'https://discord.example/scanner',
}), {
  url: 'https://discord.example/scanner',
  source: 'SCANNER_DISCORD_WEBHOOK_URL',
  usingGenericFallback: false,
});

const watchlistScopedBars = barsForMorningContinuationWatchlist({
  tradeDate: '2026-06-03',
  barTimeZone: 'eastern',
  currentEtMinutes: 10 * 60,
  bars5m: [
    { time: '2026-05-18T15:05:00.0000000', open: 7265, high: 7270, low: 7225.25, close: 7269.5, volume: 1000 },
    { time: '2026-06-03T09:30:00.0000000', open: 7611.75, high: 7622.25, low: 7608, close: 7614, volume: 1000 },
    { time: '2026-06-03T09:35:00.0000000', open: 7614, high: 7618, low: 7590, close: 7595, volume: 1000 },
    { time: '2026-06-03T09:40:00.0000000', open: 7595, high: 7598, low: 7574, close: 7581, volume: 1000 },
    { time: '2026-06-03T10:00:00.0000000', open: 7585, high: 7590, low: 7584.25, close: 7586.25, volume: 1000 },
    { time: '2026-06-03T10:05:00.0000000', open: 7586.25, high: 7594, low: 7585, close: 7592, volume: 1000 },
  ],
});
assert.deepEqual(watchlistScopedBars.map((bar) => bar.time), [
  '2026-06-03T09:30:00.0000000',
  '2026-06-03T09:35:00.0000000',
  '2026-06-03T09:40:00.0000000',
  '2026-06-03T10:00:00.0000000',
]);
assert.equal(Math.max(...watchlistScopedBars.slice(0, 6).map((bar) => bar.high)), 7622.25);
assert.equal(Math.min(...watchlistScopedBars.slice(0, 6).map((bar) => bar.low)), 7574);
assert.deepEqual(resolveScannerDiscordWebhookUrl({
  DISCORD_WEBHOOK_URL: 'https://discord.example/generic',
  SCANNER_DISCORD_WEBHOOK_URL: 'https://discord.example/scanner',
  QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.example/quant-desk-scanner',
}), {
  url: 'https://discord.example/quant-desk-scanner',
  source: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
  usingGenericFallback: false,
});

assert.equal(SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS, 30);
const morningHistoryPlan = buildScannerHistoryPreloadPlan('2026-06-02', 'morning');
assert.deepEqual(Object.keys(morningHistoryPlan).sort(), ['120m', '15m', '240m', '5m', '60m']);
for (const timeframe of ['5m', '15m', '60m', '120m', '240m'] as const) {
  assert.equal(morningHistoryPlan[timeframe].requiredLookbackDays, 30);
  assert.equal(morningHistoryPlan[timeframe].from, '2026-05-03T00:00:00-04:00');
  assert.equal(morningHistoryPlan[timeframe].to, '2026-06-02T12:00:00-04:00');
}
const lunchHistoryPlan = buildScannerHistoryPreloadPlan('2026-06-02', 'lunch');
assert.equal(lunchHistoryPlan['5m'].from, '2026-05-03T00:00:00-04:00');
assert.equal(lunchHistoryPlan['5m'].to, '2026-06-02T15:30:00-04:00');

const ethSessionCoverageBars = Array.from({ length: 6000 }, (_, index) => {
  const first = Date.parse('2026-05-03T18:05:00-04:00');
  const last = Date.parse('2026-06-02T12:00:00-04:00');
  const time = new Date(first + ((last - first) * index) / 5999).toISOString();
  return { time, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1000 };
});
assert.equal(
  barsCoverRequestedLookback(
    ethSessionCoverageBars,
    '2026-05-03T00:00:00-04:00',
    '2026-06-02T12:00:00-04:00',
    '5m',
  ),
  true,
);

const decisionTapePath = await writeScannerDecisionTapeAuditLog({
  session: 'morning',
  tradeDate: '2026-06-03',
  instrument: 'MES',
  completed5m: { time: '2026-06-03T10:15:00.0000000', open: 7590, high: 7597, low: 7587, close: 7593, volume: 1000 },
  currentPrice: 7593,
  chartContext: {
    displacementCandles: [{ direction: 'SHORT', time: '2026-06-03T09:45:00.0000000' }],
    liquiditySweeps: [{ direction: 'LONG', level: 7575 }],
    reclaimEvents: [{ direction: 'LONG', level: 7585 }],
    marketStructure: { marketStructureShift: false },
    failedPlanReversal: {
      source: 'ninjatrader_ohlc',
      boundary: 'opposite_side_review_only_not_execution_authority',
      originalPlanDirection: 'LONG',
      oppositeDirection: 'SHORT',
      failedDecisionLevel: 7518,
      failedDecisionLevelRole: 'short_side_resistance',
      failedPlanEvidence: ['Prior long failed below 7518.'],
      htfStackStatus: 'supported_confirmation',
      timeframeConfirmations: [
        { timeframe: '15M', direction: 'SHORT', status: 'confirmed', evidence: ['15M bearish MSS.'] },
        { timeframe: '1H', direction: 'SHORT', status: 'confirmed', evidence: ['1H bearish MSS.'] },
      ],
      fiveMinuteTriggerStatus: 'pending_retest',
      decisionState: 'OPPOSITE_SIDE_RETEST_PENDING',
      freshTriggerRequired: true,
      staleOrNoFreshEntry: false,
      reasons: ['Waiting for clean 5M retest.'],
      blockers: [],
      createsCandidate: false,
      approvesExecution: false,
    },
  },
  candidate: null,
  normalized: {
    decision: 'NO TRADE',
    decisionLabel: 'NO TRADE',
    executionDecision: 'NO TRADE',
    planningDecision: 'WAIT',
    hasConditionalPlans: false,
    entry: null,
    stop: null,
    t1: null,
    t2: null,
    riskPoints: null,
    riskRewardT1: null,
    riskRewardT2: null,
    finalConfidence: 'Low',
    whyThisPlan: 'No valid candidate existed first.',
    invalidation: 'N/A',
    source: 'app_rule_engine',
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    setupCandidates: [],
    earlyMoveReview: { status: 'already_triggered_no_fresh_entry', action: 'Context only.' } as any,
  },
  state: 'TriggerPending',
  confidence: {
    score: 0,
    qualifiedReasons: [],
    missingReasons: ['no ICT candidate/reference level'],
    hardBlocker: 'no ICT candidate/reference level',
    recommendation: 'No trade.',
    scorecard: [],
  },
  staleReason: null,
  scannerReviewStatus: 'early_move_review_no_valid_candidate',
  scannerAuditWarnings: ['Early-move review is context only.'],
  alertDecision: { shouldSend: false, reason: 'TriggerPending is logged locally as developing context.' },
  planVersionId: 'MORNING-20260603-101500-TAPE',
  dryRun: true,
  historyCoverage: [],
  auditDir,
});
const decisionTape = JSON.parse(await fs.readFile(decisionTapePath, 'utf8'));
assert.equal(decisionTape.reportType, 'scanner_decision_event_tape');
assert.equal(decisionTape.eventCount, 1);
const tapeEvent = decisionTape.events['2026-06-03T10:15:00.0000000'];
assert.equal(tapeEvent.scannerState, 'TriggerPending');
assert.equal(tapeEvent.reviewStatus, 'early_move_review_no_valid_candidate');
assert.equal(tapeEvent.classification.missed, false);
assert.equal(tapeEvent.classification.advisory, true);
assert.equal(tapeEvent.discord.shouldSend, false);
assert.equal(tapeEvent.failedPlanReversal.present, true);
assert.equal(tapeEvent.failedPlanReversal.state, 'OPPOSITE_SIDE_RETEST_PENDING');
assert.equal(tapeEvent.failedPlanReversal.htfStackStatus, 'supported_confirmation');
assert.equal(tapeEvent.failedPlanReversal.fiveMinuteTriggerStatus, 'pending_retest');
assert.equal(tapeEvent.failedPlanReversal.createsCandidate, false);
assert.equal(tapeEvent.failedPlanReversal.approvesExecution, false);
assert.equal(tapeEvent.authority.decisionTapeCanExecute, false);
const fourHourCoverageBars = Array.from({ length: 1129 }, (_, index) => {
  const first = Date.parse('2026-05-03T18:05:00-04:00');
  const last = Date.parse('2026-06-02T10:00:00-04:00');
  const time = new Date(first + ((last - first) * index) / 1128).toISOString();
  return { time, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1000 };
});
assert.equal(
  barsCoverRequestedLookback(
    fourHourCoverageBars,
    '2026-05-03T00:00:00-04:00',
    '2026-06-02T12:00:00-04:00',
    '240m',
  ),
  true,
);
assert.equal(
  barsCoverRequestedLookback(
    fourHourCoverageBars.slice(-20),
    '2026-05-03T00:00:00-04:00',
    '2026-06-02T12:00:00-04:00',
    '240m',
  ),
  false,
);

const selfHealedSummary = summarizeScannerHistoryCoverage({
  timeframe: '240m',
  requiredLookbackDays: 30,
  requestedFrom: '2026-05-03T00:00:00-04:00',
  requestedTo: '2026-06-02T12:00:00-04:00',
  barsLoaded: 180,
  rangeStart: '2026-05-03T00:00:00',
  rangeEnd: '2026-06-02T12:00:00',
  source: 'market_bars_bridge_repair',
  cacheBars: 100,
  bridgeRepairBars: 80,
  selfHealed: true,
  sufficient: true,
  warning: null,
});
assert.ok(selfHealedSummary.includes('240m: sufficient'));
assert.ok(selfHealedSummary.includes('source=market_bars_bridge_repair'));
assert.ok(selfHealedSummary.includes('self-healed from bridge'));

const failedPlanEvents = appOwnedFailedPlanEventsFromScannerState({
  state: {
    sent: {},
    alertDeliveries: {
      'prior-long': {
        alertKey: 'prior-long',
        planVersionId: 'MORNING-PRIOR-LONG',
        instrument: 'MES',
        tradeDate: '2026-06-05',
        session: 'morning',
        state: 'Executable',
        confidence: 94,
        candidate: {
          setupType: 'FailedBreakoutReversal',
          direction: 'LONG',
          entry: 7518,
          stop: 7511,
          target1: 7528.5,
          target2: 7532,
        },
        deliveryStatus: 'sent',
        webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
        httpStatus: 200,
        discordMessageId: 'discord-1',
        error: null,
        attemptedAt: '2026-06-05T14:00:00.000Z',
        sentAt: '2026-06-05T14:00:01.000Z',
        auditLogPath: null,
        stale: false,
        retryEligible: false,
      },
    },
    watchlistSent: {},
    windowStartSent: {},
    lastCompleted5mBySession: {},
    lastMarketMapRefreshBySession: {},
    lastHealthStatus: null,
    lastHealthAlertSentAt: null,
  },
  tradeDate: '2026-06-05',
  session: 'morning',
  instrument: 'MES',
  completed5m: { time: '2026-06-05T10:05:00.0000000', open: 7521, high: 7522, low: 7512.5, close: 7517.25, volume: 1000 },
});
assert.equal(failedPlanEvents.length, 1);
assert.equal(failedPlanEvents[0].direction, 'SHORT');
assert.equal(failedPlanEvents[0].failedLevel, 7518);
assert.ok(failedPlanEvents[0].levelLabel?.includes('app-owned failed plan'));
assert.ok(failedPlanEvents[0].evidence?.includes('App-owned LONG plan'));
assert.ok(failedPlanEvents[0].evidence?.includes('generic failed-break events remain ignored'));

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

const pendingDelivery = createPendingScannerAlertDeliveryRecord({
  alertKey: '2026-06-02|MES|morning|LONG|TurtleSoup|7603.25|Approved',
  planVersionId: 'MORNING-20260602-140348',
  instrument: 'MES',
  tradeDate: '2026-06-02',
  session: 'morning',
  state: 'Approved',
  confidence: 96,
  candidate,
  webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
  auditLogPath: path.join(auditDir, 'scanner-delivery-test.json'),
  attemptedAt: '2026-06-02T14:03:48.000Z',
});
assert.equal(pendingDelivery.deliveryStatus, 'pending');
assert.equal(pendingDelivery.retryEligible, true);
assert.equal(pendingDelivery.candidate.entry, candidate.entry);
assert.equal(pendingDelivery.candidate.stop, candidate.stop);
assert.equal(pendingDelivery.candidate.target1, candidate.target1);
assert.equal(pendingDelivery.candidate.target2, candidate.target2);
const sentDelivery = markScannerAlertDeliverySent(pendingDelivery, { sentAt: '2026-06-02T14:03:49.000Z', httpStatus: 204 });
assert.equal(sentDelivery.deliveryStatus, 'sent');
assert.equal(sentDelivery.retryEligible, false);
assert.equal(sentDelivery.httpStatus, 204);
const failedDelivery = markScannerAlertDeliveryFailed(pendingDelivery, {
  error: new Error('Discord webhook failed (401): https://discord.com/api/webhooks/sensitive-token'),
  httpStatus: 401,
});
assert.equal(failedDelivery.deliveryStatus, 'failed');
assert.equal(failedDelivery.retryEligible, true);
assert.equal(failedDelivery.httpStatus, 401);
assert.ok(!failedDelivery.error?.includes('sensitive-token'));
const staleFailedDelivery = markScannerAlertDeliveryFailed(pendingDelivery, { error: 'stale now', stale: true });
assert.equal(staleFailedDelivery.deliveryStatus, 'failed_stale_no_retry');
assert.equal(staleFailedDelivery.retryEligible, false);
const skippedDelivery = markScannerAlertDeliverySkipped(pendingDelivery, { reason: 'dry-run', webhookSource: 'dry_run' });
assert.equal(skippedDelivery.deliveryStatus, 'skipped');
assert.equal(skippedDelivery.retryEligible, false);

try {
  await fs.mkdir(auditDir, { recursive: true });
  const missedAuditPath = path.join(auditDir, 'scanner-morning-2026-06-02-MES-MORNING-DELIVERY-MISSED.json');
  await fs.writeFile(missedAuditPath, `${JSON.stringify({
    source: 'live-scanner',
    session: 'morning',
    tradeDate: '2026-06-02',
    instrument: 'MES',
    planVersionId: 'MORNING-DELIVERY-MISSED',
    state: 'Approved',
    candidate: {
      ...candidate,
      setupType: SetupType.TurtleSoup,
      direction: 'LONG',
      entry: 7603.25,
      stop: 7599,
      target1: 7611.75,
      target2: 7620,
    },
    normalizedPlan: {
      canExecute: true,
      decisionStatus: 'ApprovedTrade',
    },
  }, null, 2)}\n`, 'utf8');
  const deliveryState: any = {
    sent: {},
    watchlistSent: {},
    windowStartSent: {},
    lastCompleted5mBySession: {},
    lastMarketMapRefreshBySession: {},
    lastHealthStatus: null,
    lastHealthAlertSentAt: null,
  };
  const missed = await findMissedExecutableScannerDeliveries({
    auditDir,
    state: deliveryState,
    tradeDate: '2026-06-02',
    instrument: 'MES',
  });
  assert.equal(missed.length, 1);
  assert.equal(missed[0].deliveryStatus, 'missing');
  assert.equal(missed[0].candidate.entry, 7603.25);
  deliveryState.sent[missed[0].alertKey] = { state: 'Approved', confidence: 96, sentAt: '2026-06-02T14:03:49.000Z' };
  const noMissed = await findMissedExecutableScannerDeliveries({
    auditDir,
    state: deliveryState,
    tradeDate: '2026-06-02',
    instrument: 'MES',
  });
  assert.equal(noMissed.length, 0);

  const watchlistResult = await prepareLiveScannerWatchlistAlertArtifacts({
    tradeDate: '2026-05-28',
    instrument: 'MES',
    watchlistKey: '2026-05-28:MES:morning:LONG:morning_continuation_watchlist',
    completed5m: {
      time: '2026-05-28T10:15:00-04:00',
      open: 7540.25,
      high: 7574,
      low: 7535,
      close: 7564.75,
      volume: 1000,
    },
    currentPrice: 7564.75,
    windowLabel: 'Morning Execution Window',
    watchlist: {
      watchlistDetected: true,
      watchlistType: 'morning_continuation_watchlist',
      direction: 'LONG',
      status: 'WATCH_ONLY',
      canExecute: false,
      freshEntryAvailable: false,
      tradeAlertEligible: false,
      reason: 'Strong bullish continuation is developing, but no fresh entry remains under current approved rules.',
      noChaseWarning: true,
      requiredNextCondition: 'Wait for a completed 5M pullback or retest that passes existing approved rules.',
      memoryEligible: true,
      evidence: ['Strong bullish displacement detected after the open.'],
      missingEvidence: ['No safe fresh structure stop is available from this watchlist event.'],
      auditWarnings: ['Advisory only.'],
      approvalBoundary: {
        watchlistApprovesTrade: false,
        watchlistChangesRules: false,
        watchlistCreatesEntry: false,
        watchlistCreatesTargets: false,
        watchlistOverridesScanner: false,
      },
    },
    scannerState: 'Missed',
    bars5m: [{
      time: '2026-05-28T10:10:00-04:00',
      open: 7536.25,
      high: 7540.25,
      low: 7533.5,
      close: 7540.25,
      volume: 1000,
    }, {
      time: '2026-05-28T10:15:00-04:00',
      open: 7540.25,
      high: 7574,
      low: 7535,
      close: 7564.75,
      volume: 1000,
    }],
    auditDir,
  });

  assert.deepEqual(watchlistResult.files, []);
  assert.equal(watchlistResult.payload.components, undefined);
  const watchlistText = flattenDiscordPayloadText(watchlistResult.payload);
  assert.ok(watchlistText.includes('[AM WATCHLIST] MES - LONG DEVELOPING'));
  assert.ok(watchlistText.includes('WATCH ONLY - NO FRESH ENTRY'));
  assert.ok(watchlistText.includes('DO NOT CHASE'));
  assert.ok(!/^Entry:/m.test(watchlistText));
  assert.ok(!/^Stop:/m.test(watchlistText));
  assert.ok(!/^T1:/m.test(watchlistText));
  assert.ok(!/^T2:/m.test(watchlistText));
  assert.ok(!/Approved|Executable|Trade now|Entry confirmed/i.test(watchlistText));
  assert.ok(!JSON.stringify(watchlistResult.payload).includes('Win'));
  assert.ok(!JSON.stringify(watchlistResult.payload).includes('Loss'));
  assert.ok(!JSON.stringify(watchlistResult.payload).includes('Scratch'));
  const watchlistAudit = JSON.parse(await fs.readFile(watchlistResult.auditLogPath, 'utf8'));
  assert.equal(watchlistAudit.source, 'live-scanner-watchlist');
  assert.equal(watchlistAudit.discord.advisoryOnly, true);
  assert.equal(watchlistAudit.discord.tradeAlertEligible, false);
  assert.equal(watchlistAudit.discord.attachmentsGenerated, false);
  assert.equal(watchlistAudit.discord.outcomeButtonsIncluded, false);
  assert.equal(watchlistAudit.discord.ragMemoryWritten, false);
  assert.equal(watchlistAudit.persistence.supabaseRagWriteAttempted, false);
  assert.equal(watchlistAudit.watchlistMemory.record.memoryType, 'watchlist_context');
  assert.equal(watchlistAudit.watchlistMemory.record.canExecute, false);
  assert.equal(watchlistAudit.watchlistMemory.record.tradeAlertEligible, false);
  assert.equal(watchlistAudit.watchlistMemory.record.freshEntryAvailable, false);
  assert.equal(watchlistAudit.watchlistMemory.record.laterValidSetupFormed, null);
  assert.equal(watchlistAudit.watchlistMemory.record.laterSetupType, null);
  assert.equal(watchlistAudit.watchlistMemory.record.laterOutcome, null);
  assert.equal(watchlistAudit.watchlistMemory.record.approvalBoundary.ragMemoryApprovesTrade, false);
  assert.equal(watchlistAudit.watchlistMemory.record.approvalBoundary.ragMemoryChangesRules, false);
  assert.ok(watchlistAudit.watchlistMemory.embeddingText.includes('WATCHLIST CONTEXT ONLY'));
  assert.ok(watchlistAudit.watchlistMemory.embeddingText.includes('not a trade'));
  assert.ok(!('entry' in watchlistAudit.watchlistMemory.record));
  assert.ok(!('stop' in watchlistAudit.watchlistMemory.record));
  assert.ok(!('t1' in watchlistAudit.watchlistMemory.record));
  assert.ok(!('t2' in watchlistAudit.watchlistMemory.record));
  assert.ok(!('tradeResult' in watchlistAudit.watchlistMemory.record));
  assert.equal(watchlistResult.memoryRecord.memoryType, 'watchlist_context');

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
  assert.ok(text.includes('[AM REVIEW] MES - LONG CONDITIONAL / NO FRESH ENTRY'));
  assert.ok(text.includes('Status: WAIT - normalized plan not executable; fresh completed 5M required'));
  assert.ok(text.includes('Plan:'));
  assert.ok(text.includes('Risk: 5.00 pts / N/A'));
  assert.ok(text.includes('Invalidation:'));
  assert.ok(text.includes('Memory:'));
  assert.ok(text.includes('History: Neutral'));
  assert.ok(text.includes('Action:'));
  assert.ok(text.includes('Details: Chart + Level Map attached.'));
  assert.ok(!/Memory:[\s\S]*approve/i.test(text));
  const componentLabels = (result.payload.components || []).flatMap((row: any) => (row.components || []).map((component: any) => component.label));
  assert.deepEqual(componentLabels, ['Long T1 Hit', 'Long T2 Hit', 'Long Runner Hit', 'Long Stretch Hit', 'Long Stopped', 'Scratch', 'No Trade', 'Missed']);
  assert.ok(!componentLabels.includes('Short Win'));
  assert.ok(!componentLabels.includes('Short Loss'));
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

  const executableLookingCandidate = {
    ...candidate,
    executionStatus: ExecutionStatus.Executable,
    detectedStatus: SetupCandidateStatus.Detected,
  };
  const demotedVisualCandidate = candidateForNormalizedVisualAuthority(executableLookingCandidate, {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: null,
    invalidation: candidate.invalidation,
    whyThisPlan: 'Candidate idea detected, but normalized plan is not executable.',
  } as any);
  assert.equal(demotedVisualCandidate?.executionStatus, ExecutionStatus.Conditional);
  assert.equal(demotedVisualCandidate?.detectedStatus, SetupCandidateStatus.Conditional);
  const demotedChartHtml = buildChartMarkupHtmlForTest({
    chartContext: chartContext as ChartContext,
    candidate: demotedVisualCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-26',
    sessionLabel: 'morning',
  });
  assert.ok(demotedChartHtml.includes('[AM PLAN] MES - LONG CONDITIONAL'));
  assert.equal(/LONG EXECUTABLE|>EXECUTABLE</i.test(demotedChartHtml), false);

  const riskTooWideCandidate: SetupCandidate = {
    ...candidate,
    setupType: SetupType.TurtleSoup,
    scenarioLabel: 'Turtle Soup LONG',
    entry: 7597,
    stop: 7588.75,
    target1: 7620,
    target2: 7620,
    riskPoints: 8.25,
    blockReason: 'RiskTooWide' as any,
    requiredTrigger: 'Wait for a fresh completed 5M retest that keeps risk inside limits.',
    nextAction: 'Manual decision only. Do not chase the reclaim candle.',
    evidence: ['HTF stack aligned LONG: 4H / 1H / 15M / 5M.', 'Sell-side sweep and reclaim confirmed.'],
  };
  const riskResult = await prepareLiveScannerDiscordAlertArtifacts({
    session: 'morning',
    tradeDate: '2026-05-29',
    config: { instrument: 'MES' },
    state: 'Conditional',
    confidence: {
      score: 82,
      qualifiedReasons: ['RiskTooWide advisory fixture.'],
      missingReasons: [],
      recommendation: 'Manual decision required.',
      hardBlocker: 'RiskTooWide',
    },
    candidate: riskTooWideCandidate,
    normalized: {
      canExecute: false,
      decisionStatus: TradeDecisionStatus.Wait,
      decision: 'LONG',
      noTradeReason: 'RiskTooWide',
      invalidation: riskTooWideCandidate.invalidation,
    } as any,
    chartContext: chartContext as ChartContext,
    currentPrice: 7604.25,
    completed5m: {
      time: '2026-05-29T11:25:00-04:00',
      open: 7599.25,
      high: 7600,
      low: 7593.5,
      close: 7599.5,
      volume: 1000,
    },
    scoringTimestamp: '2026-05-29T11:25:00-04:00',
    scoringTimestampSource: 'fixture completed 5M candle',
    windowLabel: 'Morning Setup Scanner',
    staleReason: null,
    targetCascade: {
      activeTarget: null,
      activeTimeframe: null,
      sweptTargets: [],
      promotedTarget: null,
      path: [],
      targetRoomPoor: false,
      reason: 'RiskTooWide target cascade fixture.',
    },
    alertReason: 'RiskTooWide conditional advisory fixture.',
    planVersionId: 'SCANNER-RISKTOOWIDE-FIXTURE',
    outputDir,
    auditDir,
  });
  const riskText = flattenDiscordPayloadText(riskResult.payload);
  const riskAudit = JSON.parse(await fs.readFile(riskResult.auditLogPath, 'utf8'));
  const displayedScore = riskText.match(/Risk Score: (\d+)\/100 - ([^\n]+)/);
  assert.ok(displayedScore, 'Discord payload must include risk score and label');
  assert.equal(Number(displayedScore[1]), riskAudit.conditionalRiskScore.score);
  assert.equal(displayedScore[2], riskAudit.conditionalRiskScore.label);
  assert.equal(riskAudit.conditionalRiskScore.canExecute, false);
  assert.equal(riskAudit.conditionalRiskScore.blockReason, 'RiskTooWide');
  assert.equal(riskAudit.conditionalRiskScore.score, 64);
  assert.equal(riskAudit.visualAuthority, 'normalized_plan');
  assert.ok(riskAudit.sourceCandidate);
  assert.equal(riskAudit.candidate.executionStatus, ExecutionStatus.Conditional);
    assert.ok(riskResult.payload.components);
    assert.deepEqual(
      (riskResult.payload.components || []).flatMap((row: any) => row.components.map((component: any) => component.label)),
      ['Long T1 Hit', 'Long T2 Hit', 'Long Runner Hit', 'Long Stretch Hit', 'Long Stopped', 'Scratch', 'No Trade', 'Missed']
    );
    assert.ok(riskText.includes('Decision: WAIT | App plan review: NO | canExecute: false'));
    assert.ok(riskText.includes('Risk exceeds standard limit. Human final decision required.'));
  assert.ok(riskText.includes('Do not chase'));

  console.log(`live scanner fixture alert verified: mainText=${text.length}, files=${result.files.length}, audit=${result.auditLogPath}`);
} finally {
  if (previousOutcomeBaseUrl === undefined) delete process.env.DISCORD_OUTCOME_BASE_URL;
  else process.env.DISCORD_OUTCOME_BASE_URL = previousOutcomeBaseUrl;
  if (previousOutcomeSecret === undefined) delete process.env.DISCORD_OUTCOME_SECRET;
  else process.env.DISCORD_OUTCOME_SECRET = previousOutcomeSecret;
  await fs.rm(outputDir, { recursive: true, force: true });
}
