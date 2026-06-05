import assert from 'node:assert/strict';
import {
  BANNED_ACTIVE_DISCORD_ALERT_TEXT,
  compactAttachmentLine,
  compactDiscordSummary,
  flattenDiscordPayloadText,
  morningWatchlistDiscordSummary,
  scannerHealthDiscordSummary,
  shouldSendScannerHealthAlert,
  validateDiscordPayload,
} from './discord-alert-format';
import { buildOutcomeComponents } from './discord-outcome-buttons';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, TradeDecisionStatus, type SetupCandidate } from '../../src/types';
import { evaluateScannerHealth } from '../../src/agents/scannerHealthAgent';
import type { HtfLiquidityDrawState } from '../../src/lib/htfLiquidityDrawEngine';

const previousOutcomeBaseUrl = process.env.DISCORD_OUTCOME_BASE_URL;
const previousOutcomeSecret = process.env.DISCORD_OUTCOME_SECRET;
process.env.DISCORD_OUTCOME_BASE_URL = 'https://quant-desk.example';
process.env.DISCORD_OUTCOME_SECRET = 'test-secret';

function sampleCandidate(direction: 'LONG' | 'SHORT' = 'LONG'): SetupCandidate {
  return {
    setupType: SetupType.LiquiditySweep,
    scenarioLabel: 'Liquidity sweep reclaim',
    direction,
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 90,
    entry: direction === 'LONG' ? 5320 : 5328,
    stop: direction === 'LONG' ? 5316 : 5332,
    target1: direction === 'LONG' ? 5326 : 5322,
    target2: direction === 'LONG' ? 5328 : 5320,
    riskPoints: 4,
    targetObjectivePlan: {
      objectives: [],
      obstacleTarget1: null,
      liquidityTarget1: {
        label: 'NY premarket high',
        price: direction === 'LONG' ? 5329 : 5318,
        source: 'ny_premarket',
        type: 'high',
        direction,
        confidence: 'High',
        score: 80,
        reason: 'Real session liquidity.',
      },
      liquidityTarget2: null,
      liquidityRunnerTarget: null,
      nearestLiquidityTarget: null,
      nearestObstacleTarget: null,
      runnerTarget: null,
      targetQuality: 'clear_path',
      targetModel: 'actual_r_with_structural_context',
      notes: [],
    },
    invalidation: 'Invalid if price violates protected structure.',
    entryClarity: 90,
    stopClarity: 90,
    targetClarity: 90,
    levelContextScore: 18,
    evidence: ['Sweep confirmed', 'Reclaim confirmed'],
    missingEvidence: ['Score breakdown should remain out of Discord main text'],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Wait for completed 5M reclaim close.',
    nextAction: 'Wait for trigger.',
    reducedRiskPlan: null,
    decisionQualityScore: 84,
    decisionQualityRecommendation: 'Full audit detail belongs in logs.',
    decisionQualityScorecard: [
      { label: 'Trigger clarity', score: 20, max: 20, status: 'strong', note: 'Do not print this full scorecard.' },
    ],
  };
}

function htfStateFixture(dataLimited = false): Pick<HtfLiquidityDrawState, 'htfContextSufficiency' | 'classificationReliability'> {
  return {
    htfContextSufficiency: {
      overallStatus: dataLimited ? 'data_limited' : 'sufficient',
      dataLimited,
      blockers: dataLimited ? ['4H context below minimum'] : [],
      notes: [],
      timeframeCoverage: [
        {
          timeframe: '4H',
          barsLoaded: dataLimited ? 4 : 22,
          rangeStart: '2026-05-25T00:00:00-04:00',
          rangeEnd: '2026-06-01T14:00:00-04:00',
          minimumExpectedDescription: '30 calendar days when available.',
          minimumSatisfied: !dataLimited,
          status: dataLimited ? 'data_limited' : 'sufficient',
        },
        {
          timeframe: '1H',
          barsLoaded: dataLimited ? 8 : 62,
          rangeStart: '2026-05-25T00:00:00-04:00',
          rangeEnd: '2026-06-01T14:00:00-04:00',
          minimumExpectedDescription: '30 calendar days when available.',
          minimumSatisfied: !dataLimited,
          status: dataLimited ? 'data_limited' : 'sufficient',
        },
        {
          timeframe: '15M',
          barsLoaded: dataLimited ? 16 : 86,
          rangeStart: '2026-05-30T00:00:00-04:00',
          rangeEnd: '2026-06-01T14:00:00-04:00',
          minimumExpectedDescription: '30 calendar days when available.',
          minimumSatisfied: !dataLimited,
          status: dataLimited ? 'data_limited' : 'sufficient',
        },
        {
          timeframe: '5M',
          barsLoaded: 43,
          rangeStart: '2026-06-01T12:00:00-04:00',
          rangeEnd: '2026-06-01T15:30:00-04:00',
          minimumExpectedDescription: '30 calendar days when available; active setup-scan window remains the execution trigger authority.',
          minimumSatisfied: true,
          status: 'sufficient',
        },
      ],
    },
    classificationReliability: dataLimited ? 'data_limited' : 'structural',
  };
}

function assertCompactPayload(payload: ReturnType<typeof compactDiscordSummary>, files: string[]) {
  validateDiscordPayload(payload, files);
  const text = flattenDiscordPayloadText(payload);
  assert.ok(text.length < 1200, `expected compact payload under 1200 chars, got ${text.length}`);
  for (const marker of BANNED_ACTIVE_DISCORD_ALERT_TEXT) {
    assert.ok(!text.toLowerCase().includes(marker.toLowerCase()), `compact payload leaked old long-form marker: ${marker}`);
  }
  assert.ok(!/Missing rea\.\.\.|Qualified rea\.\.\.|Target casc\.\.\.|Audit det\.\.\.|Counte\.\.\.|Audit detail|\{"/i.test(text));
  assert.ok(text.includes('Compact Trade Plan Summary'));
  assert.ok(text.includes('Status:'));
  assert.ok(text.includes('Memory:'));
  assert.ok(text.includes('History: Neutral'));
  assert.ok(text.includes('Warning: none'));
  assert.ok(text.includes('Action:'));
  assert.ok(text.includes('Details: Chart + Level Map attached.'));
  assert.ok(!/Memory:[\s\S]*approve/i.test(text), 'memory display must not imply approval');
}

function assertNoExecutablePayloadKeys(value: unknown) {
  const forbiddenKeys = new Set(['canExecute', 'entry', 'stop', 't1', 't2', 'T1', 'T2', 'setupType', 'riskPoints', 'noTradeReason']);
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    for (const key of Object.keys(node as Record<string, unknown>)) {
      assert.ok(!forbiddenKeys.has(key), `formatter payload leaked executable object key: ${key}`);
      visit((node as Record<string, unknown>)[key]);
    }
  };
  visit(value);
}

const normalized = {
  canExecute: false,
  decisionStatus: TradeDecisionStatus.ConditionalTrade,
  decision: 'LONG',
  noTradeReason: null,
  invalidation: 'Invalid if protected structure fails.',
};

const morningCandidate = sampleCandidate('LONG');
const morningCandidateBefore = JSON.stringify(morningCandidate);
const morning = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-05-26',
  instrument: 'MES',
  planVersionId: 'MORNING-TEST',
  normalized,
  candidates: [morningCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Morning',
  windowLabel: '10:00-12:00 ET',
  components: buildOutcomeComponents({
    planVersionId: 'MORNING-TEST',
    sessionType: 'morning',
    tradeDate: '2026-05-26',
    instrument: 'MES',
    direction: 'LONG',
  }),
});
assertCompactPayload(morning, ['chart-plan.png', 'price-level-map.png']);
assert.equal(JSON.stringify(morningCandidate), morningCandidateBefore, 'formatter must not mutate the original candidate');
assertNoExecutablePayloadKeys(morning);
assert.ok(morning.content?.includes('[AM REVIEW] MES - LONG CONDITIONAL / NO FRESH ENTRY'));
assert.ok(flattenDiscordPayloadText(morning).includes('Risk: 4.00 pts / N/A'));
assert.ok(flattenDiscordPayloadText(morning).includes('Targets:'));
assert.ok(flattenDiscordPayloadText(morning).includes('T1: 5326.00 - scale/secure'));
assert.ok(flattenDiscordPayloadText(morning).includes('T2: 5328.00 - base exit'));
assert.ok(flattenDiscordPayloadText(morning).includes('Runner: 5329.00 - extension if T2 clears'));
assert.ok(flattenDiscordPayloadText(morning).includes('Invalidation:'));
assert.deepEqual((morning.components || []).flatMap((row: any) => row.components.map((component: any) => component.label)), ['Long T1 Hit', 'Long T2 Hit', 'Long Runner Hit', 'Long Stretch Hit', 'Long Stopped', 'Scratch', 'No Trade', 'Missed']);

const lunch = compactDiscordSummary({
  session: 'lunch',
  tradeDate: '2026-05-26',
  instrument: 'MES',
  planVersionId: 'LUNCH-TEST',
  normalized: { ...normalized, decision: 'SHORT' },
  candidates: [sampleCandidate('SHORT')],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Lunch',
  windowLabel: '12:00-15:30 ET',
  components: buildOutcomeComponents({
    planVersionId: 'LUNCH-TEST',
    sessionType: 'lunch',
    tradeDate: '2026-05-26',
    instrument: 'MES',
    direction: 'SHORT',
  }),
});
assertCompactPayload(lunch, ['chart-plan.png', 'price-level-map.png']);
assert.ok(lunch.content?.includes('[PM REVIEW] MES - SHORT CONDITIONAL / NO FRESH ENTRY'));
assert.deepEqual((lunch.components || []).flatMap((row: any) => row.components.map((component: any) => component.label)), ['Short T1 Hit', 'Short T2 Hit', 'Short Runner Hit', 'Short Stretch Hit', 'Short Stopped', 'Scratch', 'No Trade', 'Missed']);
assert.ok(!JSON.stringify(lunch.components).includes('Long T1 Hit'));

const extensionCandidate = sampleCandidate('LONG');
extensionCandidate.entry = 7603.25;
extensionCandidate.stop = 7599;
extensionCandidate.riskPoints = 4.25;
extensionCandidate.target1 = 7611.75;
extensionCandidate.target2 = 7620;
extensionCandidate.modelConfidenceScore = 98;
extensionCandidate.targetObjectivePlan = {
  ...extensionCandidate.targetObjectivePlan!,
  liquidityTarget1: { ...extensionCandidate.targetObjectivePlan!.liquidityTarget1!, label: 'Lunch/PM high', price: 7604.75 },
  liquidityTarget2: { ...extensionCandidate.targetObjectivePlan!.liquidityTarget1!, label: 'London high', price: 7610.5 },
  liquidityRunnerTarget: { ...extensionCandidate.targetObjectivePlan!.liquidityTarget1!, label: 'Full ETH high', price: 7632.75 },
};
const extensionPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-02',
  instrument: 'MES',
  planVersionId: 'TARGET-LADDER-TEST',
  normalized: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'LONG',
    noTradeReason: null,
    invalidation: 'Invalid if protected structure fails.',
    t1: 7609.75,
    t2: 7611.75,
  },
  candidates: [extensionCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
});
validateDiscordPayload(extensionPayload, ['chart-plan.png', 'price-level-map.png']);
const extensionText = flattenDiscordPayloadText(extensionPayload);
assert.ok(extensionText.includes('Confidence: 98/100'));
assert.ok(extensionText.includes('T1: 7609.75 - scale/secure'));
assert.ok(extensionText.includes('T2: 7611.75 - base exit'));
assert.ok(extensionText.includes('Runner: 7620.00 - extension if T2 clears'));
assert.ok(extensionText.includes('Stretch: 7632.75 - trail only if structure keeps delivering'));
assert.equal(extensionText.includes('LQ / Runner Objectives:'), false);
assert.equal(extensionText.includes('App T1'), false);
assert.equal(extensionText.includes('App T2'), false);

const scanner = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-05-26',
  instrument: 'MES',
  planVersionId: 'SCANNER-TEST',
  normalized,
  candidates: [sampleCandidate('LONG')],
  attachments: { chartPlan: true, priceLevelMap: true, auditLogPath: 'discord-audit/scanner.json' },
  sourceLabel: 'Scanner',
  windowLabel: 'Morning Setup Scanner',
  scoreOverride: 86,
  decisionOverride: 'Conditional',
  statusOverride: 'Conditional',
});
assertCompactPayload(scanner, ['chart-plan.png', 'price-level-map.png']);
assert.ok(scanner.content?.includes('[AM REVIEW] MES - LONG CONDITIONAL / NO FRESH ENTRY'));

const scannerReadyCandidate = sampleCandidate('LONG');
scannerReadyCandidate.setupType = SetupType.HtfDrawContinuationAfterRaid;
scannerReadyCandidate.scenarioLabel = 'HTF Draw Continuation After Raid/Reclaim';
scannerReadyCandidate.executionStatus = ExecutionStatus.Executable;
scannerReadyCandidate.candidateState = 'MSS_HOLD_CONFIRMED';
scannerReadyCandidate.evidence = [
  'HTF Draw Continuation After Raid/Reclaim candidate detected. Execution still requires deterministic entry, stop, target, risk, and final pipeline gates.',
];
scannerReadyCandidate.nextAction = 'Execution still requires final app-owned gates.';
scannerReadyCandidate.htfLiquidityDrawState = htfStateFixture(false) as HtfLiquidityDrawState;
const scannerReadyPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-01',
  instrument: 'MES',
  planVersionId: 'HTF-SCANNER-READY',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'LONG',
    noTradeReason: null,
    invalidation: 'Invalid if protected structure fails.',
  },
  candidates: [scannerReadyCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
  statusOverride: 'Executable',
});
validateDiscordPayload(scannerReadyPayload, ['chart-plan.png', 'price-level-map.png']);
const scannerReadyText = flattenDiscordPayloadText(scannerReadyPayload);
assert.ok(scannerReadyText.includes('[AM REVIEW] MES - LONG CONDITIONAL / NO FRESH ENTRY'));
assert.ok(scannerReadyText.includes('WAIT - normalized plan not executable; fresh completed 5M required'));
assert.ok(scannerReadyText.includes('Trigger State: MSS_HOLD_CONFIRMED'));
assert.ok(scannerReadyText.includes('HTF Context:'));
assert.ok(scannerReadyText.includes('Status: sufficient | Reliability: structural'));
assert.ok(scannerReadyText.includes('Minimum: 30 calendar days when available'));
assert.ok(scannerReadyText.includes('Usage: structural confirmation allowed'));
assert.ok(scannerReadyPayload.content?.startsWith('🟡'), 'canExecute=false must prevent green executable Discord status even with override');
assert.equal(/APPROVED|EXECUTABLE/i.test(scannerReadyPayload.content || ''), false, 'normalized canExecute=false must not allow approved/executable headline text');
assert.equal(/EXECUTABLE -|ApprovedTrade|Trade now|Entry confirmed|Take the trade|Enter now|Buy now|Sell now|Trade approved/i.test(scannerReadyText), false);

const dataLimitedScannerCandidate = sampleCandidate('LONG');
dataLimitedScannerCandidate.setupType = SetupType.HtfDrawContinuationAfterRaid;
dataLimitedScannerCandidate.scenarioLabel = 'HTF Draw Continuation After Raid/Reclaim';
dataLimitedScannerCandidate.executionStatus = ExecutionStatus.Conditional;
dataLimitedScannerCandidate.htfLiquidityDrawState = htfStateFixture(true) as HtfLiquidityDrawState;
dataLimitedScannerCandidate.requiredTrigger = 'Wait for sufficient HTF context and completed 5M trigger.';
const dataLimitedScannerPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-01',
  instrument: 'MES',
  planVersionId: 'HTF-DATA-LIMITED',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'LONG',
    noTradeReason: null,
    invalidation: 'Invalid if protected structure fails.',
  },
  candidates: [dataLimitedScannerCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
});
validateDiscordPayload(dataLimitedScannerPayload, ['chart-plan.png', 'price-level-map.png']);
const dataLimitedScannerText = flattenDiscordPayloadText(dataLimitedScannerPayload);
assert.ok(dataLimitedScannerText.includes('HTF Context:'));
assert.ok(dataLimitedScannerText.includes('Status: partial | Reliability: data_limited'));
assert.ok(dataLimitedScannerText.includes('Minimum: 30 calendar days when available'));
assert.ok(dataLimitedScannerText.includes('Usage: context only; not structural confirmation'));
assert.ok(dataLimitedScannerText.includes('Candidate Promotion: blocked by data-limited HTF context'));
assert.equal(/HTF conflict confirmed|Bullish structure confirmed|Bearish structure confirmed|Candidate ready|structural confirmation allowed/i.test(dataLimitedScannerText), false);
assert.equal(/EXECUTABLE -|ApprovedTrade|Trade now|Entry confirmed|Take the trade|Enter now|Buy now|Sell now|Trade approved/i.test(dataLimitedScannerText), false);

const rawConditionalCanExecutePayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-01',
  instrument: 'MES',
  planVersionId: 'RAW-CONDITIONAL-CANEXECUTE',
  normalized: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ConditionalTrade,
    decision: 'LONG',
    noTradeReason: null,
    invalidation: 'Invalid if protected structure fails.',
  },
  candidates: [scannerReadyCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
  statusOverride: 'Executable',
});
validateDiscordPayload(rawConditionalCanExecutePayload, ['chart-plan.png', 'price-level-map.png']);
const rawConditionalText = flattenDiscordPayloadText(rawConditionalCanExecutePayload);
assert.ok(rawConditionalCanExecutePayload.content?.startsWith('🟡'), 'ConditionalTrade with raw canExecute=true must remain yellow/non-executable');
assert.ok(rawConditionalText.includes('WAIT - normalized plan not executable; fresh completed 5M required'));
assert.equal(/EXECUTABLE -|ApprovedTrade|Trade now|Entry confirmed|Take the trade|Enter now|Buy now|Sell now|Trade approved/i.test(rawConditionalText), false);

const riskTooWideCandidate = sampleCandidate('LONG');
riskTooWideCandidate.setupType = SetupType.TurtleSoup;
riskTooWideCandidate.scenarioLabel = 'Turtle Soup LONG';
riskTooWideCandidate.entry = 7597;
riskTooWideCandidate.stop = 7588.75;
riskTooWideCandidate.target1 = 7620;
riskTooWideCandidate.target2 = 7620;
riskTooWideCandidate.riskPoints = 8.25;
riskTooWideCandidate.blockReason = NoTradeReason.RiskTooWide;
riskTooWideCandidate.executionStatus = ExecutionStatus.Conditional;
riskTooWideCandidate.requiredTrigger = 'Wait for a fresh completed 5M retest that keeps risk inside limits.';
riskTooWideCandidate.nextAction = 'Manual decision only. Do not chase the reclaim candle.';
riskTooWideCandidate.evidence = [
  'Sell-side sweep at 10:50.',
  'Reclaim at 10:55.',
  'HTF stack aligned LONG: 4H / 1H / 15M / 5M.',
  'Target room toward 7620.',
];
const riskTooWideBefore = JSON.stringify(riskTooWideCandidate);
const riskTooWidePayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-05-29',
  instrument: 'MES',
  planVersionId: 'RISK-WIDE-TEST',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'LONG',
    noTradeReason: NoTradeReason.RiskTooWide,
    invalidation: 'Invalid if protected structure fails.',
  },
  candidates: [riskTooWideCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
  decisionOverride: 'Conditional',
  statusOverride: 'Conditional',
  components: buildOutcomeComponents({
    planVersionId: 'RISK-WIDE-TEST',
    sessionType: 'morning',
    tradeDate: '2026-05-29',
    instrument: 'MES',
    direction: 'LONG',
  }),
});
validateDiscordPayload(riskTooWidePayload, ['chart-plan.png', 'price-level-map.png']);
assert.equal(JSON.stringify(riskTooWideCandidate), riskTooWideBefore, 'risk advisory formatter must not mutate the candidate');
const riskTooWideText = flattenDiscordPayloadText(riskTooWidePayload);
assert.ok(riskTooWideText.includes('Risk Advisory:'));
assert.ok(riskTooWideText.includes('Decision: WAIT | App plan review: NO | canExecute: false'));
assert.ok(riskTooWideText.includes('Risk State: RISK_ABOVE_STANDARD_LIMIT'));
assert.ok(riskTooWideText.includes('Risk Score:'));
assert.ok(riskTooWideText.includes('Risk exceeds standard limit. Human final decision required.'));
assert.equal(riskTooWideText.includes('Not app-approved executable.'), false);
assert.ok(riskTooWideText.includes('Do not chase'));
assert.ok(!/ApprovedTrade|Trade now|Entry confirmed/i.test(riskTooWideText));
assert.ok(riskTooWidePayload.components);
assert.deepEqual(
  (riskTooWidePayload.components || []).flatMap((row: any) => row.components.map((component: any) => component.label)),
  ['Long T1 Hit', 'Long T2 Hit', 'Long Runner Hit', 'Long Stretch Hit', 'Long Stopped', 'Scratch', 'No Trade', 'Missed']
);

const noTrade = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-05-26',
  instrument: 'MES',
  planVersionId: 'NO-TRADE-TEST',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.NoTrade,
    decision: 'WAIT',
    noTradeReason: 'No completed 5M trigger inside the active window.',
    invalidation: null,
  },
  candidates: [],
  attachments: { chartPlan: false, priceLevelMap: false },
  sourceLabel: 'Morning',
});
validateDiscordPayload(noTrade, []);
const noTradeText = flattenDiscordPayloadText(noTrade);
assert.ok(noTradeText.includes('[AM REVIEW] MES - NO TRADE'));
assert.ok(noTradeText.includes('Reason: No completed 5M trigger inside the active window.'));
assert.ok(noTradeText.includes('Key Levels:'));
assert.ok(noTradeText.includes('Action:'));
assert.ok(noTradeText.includes('Stand down. Recheck at next scheduled scan.'));
assert.ok(!noTradeText.includes('Plan:'));

const watchlist = morningWatchlistDiscordSummary({
  tradeDate: '2026-05-28',
  instrument: 'MES',
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
});
validateDiscordPayload(watchlist, []);
const watchlistText = flattenDiscordPayloadText(watchlist);
assert.ok(watchlistText.includes('[AM WATCHLIST] MES - LONG DEVELOPING'));
assert.ok(watchlistText.includes('WATCH ONLY - NO FRESH ENTRY'));
assert.ok(watchlistText.includes('DO NOT CHASE'));
assert.ok(watchlistText.includes('Wait for a completed 5M pullback or retest that passes existing current rules.'));
assert.ok(watchlistText.includes('Watch only. No entry until current rules confirm.'));
assert.ok(!/^Entry:/m.test(watchlistText));
assert.ok(!/^Stop:/m.test(watchlistText));
assert.ok(!/^T1:/m.test(watchlistText));
assert.ok(!/^T2:/m.test(watchlistText));
assert.ok(!/Risk:|R\/R|risk\/reward ladder/i.test(watchlistText));
assert.ok(!/Approved|Executable|Trade now|Entry confirmed/i.test(watchlistText));
assert.equal(watchlist.components, undefined);
assert.equal(JSON.stringify(watchlist).includes('Win'), false);
assert.equal(JSON.stringify(watchlist).includes('Loss'), false);
assert.equal(JSON.stringify(watchlist).includes('Scratch'), false);

assert.equal(shouldSendScannerHealthAlert('READY', 'READY'), false);
assert.equal(shouldSendScannerHealthAlert('DEGRADED', 'DEGRADED'), false);
assert.equal(shouldSendScannerHealthAlert('BLOCKED', 'BLOCKED'), false);
assert.equal(shouldSendScannerHealthAlert('READY', 'DEGRADED'), true);
assert.equal(shouldSendScannerHealthAlert('DEGRADED', 'BLOCKED'), true);
assert.equal(shouldSendScannerHealthAlert('BLOCKED', 'READY'), true);
assert.equal(shouldSendScannerHealthAlert(null, 'READY'), false);
assert.equal(shouldSendScannerHealthAlert(undefined, 'DEGRADED'), true);
assert.equal(shouldSendScannerHealthAlert(undefined, 'BLOCKED'), true);

const healthBase = {
  config: {
    appInstrument: 'MES',
    bridgeInstrument: 'MES 06-26',
    timestampMode: 'close',
    barTimeZone: 'eastern',
    discordEnabled: true,
    dryRun: false,
    macroCalendarEnabled: true,
    maxStaleBarMinutes: 10,
  },
  bridgeHealth: { ok: true, defaultInstrument: 'MES 06-26' },
  bridgeReachable: true,
  latestCompleted5mBar: { time: '2026-05-28T10:00:00-04:00', open: 7500, high: 7510, low: 7498, close: 7508, volume: 1000 },
  barStaleness: { stale: false, latestTime: '2026-05-28T10:00:00-04:00', ageMinutes: 2, maxAllowedMinutes: 10, reason: null },
  discordWebhookConfigured: true,
  marketMapStatus: { loaded: true, usableBars: 400, fallbackBridgeDataAvailable: true },
  scannerStateFileStatus: { status: 'ok' as const },
  macroCalendarStatus: { enabled: true, loaded: true },
};

const readyHealth = evaluateScannerHealth(healthBase);
const readyHealthBefore = JSON.stringify(readyHealth);
const readyHealthPayload = scannerHealthDiscordSummary({
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  dryRun: false,
  report: readyHealth,
});
validateDiscordPayload(readyHealthPayload, []);
const readyHealthText = flattenDiscordPayloadText(readyHealthPayload);
assert.ok(readyHealthText.includes('[SCANNER HEALTH] MES - READY'));
assert.ok(readyHealthText.includes('Status: Alerts can be trusted'));
assert.ok(readyHealthText.includes('Action: Scanner recovered. Trade/watchlist alerts may resume.'));
assert.equal(JSON.stringify(readyHealth), readyHealthBefore);

const degradedHealth = evaluateScannerHealth({
  ...healthBase,
  macroCalendarStatus: { enabled: true, unavailable: true, message: 'Macro calendar unavailable' },
});
const degradedPayload = scannerHealthDiscordSummary({
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  dryRun: false,
  report: degradedHealth,
});
validateDiscordPayload(degradedPayload, []);
const degradedText = flattenDiscordPayloadText(degradedPayload);
assert.ok(degradedText.includes('[SCANNER HEALTH] MES - DEGRADED'));
assert.ok(degradedText.includes('Status: Alerts allowed with caution'));
assert.ok(degradedText.includes('Warnings:'));
assert.ok(degradedText.includes('Macro calendar unavailable'));
assert.ok(degradedText.includes('Action: Scanner continues. Review warnings if alerts look unusual.'));

const blockedHealth = evaluateScannerHealth({
  ...healthBase,
  bridgeReachable: false,
  bridgeHealth: { ok: false, error: 'Bridge unreachable' },
  latestCompleted5mBar: null,
  barStaleness: { stale: true, latestTime: null, ageMinutes: null, maxAllowedMinutes: 10, reason: 'Latest completed 5M candle is stale' },
});
const blockedPayload = scannerHealthDiscordSummary({
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  dryRun: false,
  report: blockedHealth,
});
validateDiscordPayload(blockedPayload, []);
const blockedText = flattenDiscordPayloadText(blockedPayload);
assert.ok(blockedText.includes('[SCANNER HEALTH] MES - BLOCKED'));
assert.ok(blockedText.includes('Status: Trade/watchlist alerts suppressed'));
assert.ok(blockedText.includes('Blocking reasons:'));
assert.ok(blockedText.includes('Bridge unreachable'));
assert.ok(blockedText.includes('Action: Fix NinjaTrader/bridge/data issue, then restart or wait for recovery.'));

for (const payload of [readyHealthPayload, degradedPayload, blockedPayload]) {
  const text = flattenDiscordPayloadText(payload);
  assert.equal(payload.components, undefined);
  assert.ok(!/^Entry:/m.test(text));
  assert.ok(!/^Stop:/m.test(text));
  assert.ok(!/^T1:/m.test(text));
  assert.ok(!/^T2:/m.test(text));
  assert.ok(!/risk\/reward ladder|Win|Loss|Scratch|ApprovedTrade|Executable trade|Trade now|Entry confirmed/i.test(text));
}

assert.equal(
  compactAttachmentLine({ chartPlan: true, priceLevelMap: false }, true),
  'Details: Chart Plan attached. Price Level Map unavailable.'
);
assert.equal(
  compactAttachmentLine({ chartPlan: false, priceLevelMap: true }, true),
  'Details: Price Level Map attached. Chart Plan unavailable.'
);
assert.equal(
  compactAttachmentLine({ chartPlan: false, priceLevelMap: false }, true),
  'Details: Visual attachments unavailable — review local logs before action.'
);
assert.equal(
  compactAttachmentLine({ chartPlan: false, priceLevelMap: false }, false),
  'Details: Visual attachments not generated because no active plan candidate was available.'
);

assert.throws(() => validateDiscordPayload({
  username: 'Quant Desk',
  content: 'Bad payload',
  embeds: [{
    title: 'Compact Trade Plan Summary',
    description: 'Missing rea...',
    color: 0,
    fields: [],
    footer: { text: 'Quant Desk' },
    timestamp: new Date().toISOString(),
  }],
}), /truncation artifact/);

for (const marker of BANNED_ACTIVE_DISCORD_ALERT_TEXT) {
  assert.throws(() => validateDiscordPayload({
    username: 'Quant Desk',
    content: 'Bad payload',
    embeds: [{
      title: 'Compact Trade Plan Summary',
      description: `Old report leaked into the compact alert:\n${marker}`,
      color: 0,
      fields: [],
      footer: { text: 'Quant Desk' },
      timestamp: new Date().toISOString(),
    }],
  }), /old long-form scanner card section/);
}

assert.throws(() => validateDiscordPayload({
  username: 'Quant Desk',
  content: 'Bad payload',
  embeds: [{
    title: 'Compact Trade Plan Summary',
    description: 'Counte...',
    color: 0,
    fields: [],
    footer: { text: 'Quant Desk' },
    timestamp: new Date().toISOString(),
  }],
}), /truncation artifact/);

console.log('Discord compact alert formatter verified.');

if (previousOutcomeBaseUrl === undefined) delete process.env.DISCORD_OUTCOME_BASE_URL;
else process.env.DISCORD_OUTCOME_BASE_URL = previousOutcomeBaseUrl;
if (previousOutcomeSecret === undefined) delete process.env.DISCORD_OUTCOME_SECRET;
else process.env.DISCORD_OUTCOME_SECRET = previousOutcomeSecret;
