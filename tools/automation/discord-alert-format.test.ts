import assert from 'node:assert/strict';
import {
  BANNED_ACTIVE_DISCORD_ALERT_TEXT,
  compactAttachmentLine,
  compactDiscordSummary,
  flattenDiscordPayloadText,
  morningWatchlistDiscordSummary,
  validateDiscordPayload,
} from './discord-alert-format';
import { buildOutcomeComponents } from './discord-outcome-buttons';
import { ExecutionStatus, SetupCandidateStatus, SetupType, TradeDecisionStatus, type SetupCandidate } from '../../src/types';

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
  assert.ok(text.includes('Historical support: Neutral'));
  assert.ok(text.includes('Warning: none'));
  assert.ok(text.includes('Action:'));
  assert.ok(text.includes('Details: See attached Chart Plan + Price Level Map.'));
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
  windowLabel: '09:30-11:15 ET',
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
assert.ok(morning.content?.includes('[AM PLAN] MES - LONG CONDITIONAL'));
assert.ok(flattenDiscordPayloadText(morning).includes('Risk: 4.00 pts / N/A'));
assert.ok(flattenDiscordPayloadText(morning).includes('Invalidation:'));
assert.deepEqual((morning.components || []).flatMap((row: any) => row.components.map((component: any) => component.label)), ['Long Win', 'Long Loss', 'Scratch', 'Missed', 'No Trade']);

const lunch = compactDiscordSummary({
  session: 'lunch',
  tradeDate: '2026-05-26',
  instrument: 'MES',
  planVersionId: 'LUNCH-TEST',
  normalized: { ...normalized, decision: 'SHORT' },
  candidates: [sampleCandidate('SHORT')],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Lunch',
  windowLabel: '11:50-13:00 ET',
  components: buildOutcomeComponents({
    planVersionId: 'LUNCH-TEST',
    sessionType: 'lunch',
    tradeDate: '2026-05-26',
    instrument: 'MES',
    direction: 'SHORT',
  }),
});
assertCompactPayload(lunch, ['chart-plan.png', 'price-level-map.png']);
assert.ok(lunch.content?.includes('[PM PLAN] MES - SHORT CONDITIONAL'));
assert.deepEqual((lunch.components || []).flatMap((row: any) => row.components.map((component: any) => component.label)), ['Short Win', 'Short Loss', 'Scratch', 'Missed', 'No Trade']);
assert.ok(!JSON.stringify(lunch.components).includes('Long Win'));

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
assert.ok(scanner.content?.includes('[AM PLAN] MES - LONG CONDITIONAL'));

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
