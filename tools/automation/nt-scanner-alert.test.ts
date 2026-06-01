import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, SetupCandidateStatus, SetupType, TradeDecisionStatus, type ChartContext, type SetupCandidate } from '../../src/types';
import { BANNED_ACTIVE_DISCORD_ALERT_TEXT, flattenDiscordPayloadText } from './discord-alert-format';
import {
  prepareLiveScannerDiscordAlertArtifacts,
  prepareLiveScannerWatchlistAlertArtifacts,
  resolveScannerDiscordWebhookUrl,
} from './nt-scanner';
import { verifyApprovedDailyTradePlanRender } from './chart-markup-renderer';

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
assert.deepEqual(resolveScannerDiscordWebhookUrl({
  DISCORD_WEBHOOK_URL: 'https://discord.example/generic',
  SCANNER_DISCORD_WEBHOOK_URL: 'https://discord.example/scanner',
  QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.example/quant-desk-scanner',
}), {
  url: 'https://discord.example/quant-desk-scanner',
  source: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
  usingGenericFallback: false,
});

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
  assert.ok(text.includes('[AM PLAN] MES - LONG CONDITIONAL'));
  assert.ok(text.includes('Status: WAIT - trigger not confirmed'));
  assert.ok(text.includes('Plan:'));
  assert.ok(text.includes('Risk: 5.00 pts / N/A'));
  assert.ok(text.includes('Invalidation:'));
  assert.ok(text.includes('Memory:'));
  assert.ok(text.includes('Historical support: Neutral'));
  assert.ok(text.includes('Action:'));
  assert.ok(text.includes('Details: See attached Chart Plan + Price Level Map.'));
  assert.ok(!/Memory:[\s\S]*approve/i.test(text));
  const componentLabels = (result.payload.components || []).flatMap((row: any) => (row.components || []).map((component: any) => component.label));
  assert.deepEqual(componentLabels, ['Long Win', 'Long Loss', 'Scratch', 'Missed', 'No Trade']);
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
  assert.equal(riskAudit.conditionalRiskScore.score, 49);
  assert.equal(riskResult.payload.components, undefined);
  assert.ok(riskText.includes('Decision: WAIT | Executable by app: NO | canExecute: false'));
  assert.ok(riskText.includes('Manual decision required'));
  assert.ok(riskText.includes('Do not chase'));

  console.log(`live scanner fixture alert verified: mainText=${text.length}, files=${result.files.length}, audit=${result.auditLogPath}`);
} finally {
  if (previousOutcomeBaseUrl === undefined) delete process.env.DISCORD_OUTCOME_BASE_URL;
  else process.env.DISCORD_OUTCOME_BASE_URL = previousOutcomeBaseUrl;
  if (previousOutcomeSecret === undefined) delete process.env.DISCORD_OUTCOME_SECRET;
  else process.env.DISCORD_OUTCOME_SECRET = previousOutcomeSecret;
  await fs.rm(outputDir, { recursive: true, force: true });
}
