import assert from 'node:assert/strict';
import {
  assertDiscordReportDesignerIsAdvisoryOnly,
  designDiscordVisualReport,
  type DiscordReportDesignRecommendation,
} from './discordReportDesignerAgent';

const recommendation = designDiscordVisualReport({
  reportType: 'discord_alert',
  session: 'Morning',
  instrument: 'MES',
  direction: 'LONG',
  status: 'CONDITIONAL',
  setupType: 'Sweep -> MSS -> FVG Retrace',
  actionInstruction: 'Wait for completed 5M reclaim and no chase.',
  entry: 5320,
  stop: 5316,
  t1: 5326,
  t2: 5328,
  riskPoints: 4,
  riskDollars: 200,
  invalidation: 'Invalid below protected sweep low.',
  messageText: [
    'Quant Desk Scanner Alert - Conditional',
    'Model: Sweep -> MSS -> FVG Retrace',
    'Action: Wait for completed 5M reclaim and no chase.',
    'Details: See attached Chart Plan + Price Level Map.',
  ].join('\n'),
  memory: {
    similarSetupCount: 8,
    completedSetupCount: 5,
    historicalSupport: 'CONFLICTS',
    confidenceAdjustment: 'decrease',
    memoryWarning: 'Similar setups underperformed. Require stronger confirmation.',
  },
});

assert.equal(recommendation.reportType, 'discord_alert');
assert.equal(typeof recommendation.clarityScore, 'number');
assert.ok(recommendation.clarityScore > 0 && recommendation.clarityScore <= 100);
assert.ok(recommendation.headlineRecommendation.includes('Quant Desk'));
assert.ok(recommendation.priorityFields.includes('action instruction'));
assert.ok(recommendation.fieldsToRemoveOrCollapse.includes('raw audit JSON'));
assert.ok(recommendation.memoryDisplayRecommendation.includes('never approval'));
assert.equal(recommendation.actionLine, 'Wait for completed 5M reclaim and no chase.');
assert.ok(recommendation.mustNotChange.includes('tradeDecisionPipeline'));
assert.ok(recommendation.mustNotChange.includes('entry'));
assertDiscordReportDesignerIsAdvisoryOnly(recommendation as unknown as Record<string, unknown>);

const forbiddenExecutableKeys = ['canExecute', 'entry', 'stop', 't1', 't2', 'T1', 'T2', 'setupType', 'riskPoints', 'noTradeReason'];
for (const key of forbiddenExecutableKeys) {
  assert.ok(!(key in (recommendation as unknown as Record<string, unknown>)), `designer output leaked executable key: ${key}`);
}

const chartRecommendation = designDiscordVisualReport({
  reportType: 'chart_plan_png',
  session: 'Lunch / PM Review',
  instrument: 'MES',
  direction: 'WAIT',
  status: 'WAIT',
  hasLabelOverlap: true,
  chartMarkerCount: 9,
  hasDirectionalHeader: false,
  hasWaitOrNoTradeBanner: false,
  hasEntryStopTargetCallouts: false,
  messageText: 'Wait state.',
});

assert.ok(chartRecommendation.chartMarkupWarnings.includes('Resolve overlapping chart labels before sending.'));
assert.ok(chartRecommendation.chartMarkupWarnings.some(warning => warning.includes('WAIT / NO TRADE state banner')));
assertDiscordReportDesignerIsAdvisoryOnly(chartRecommendation as unknown as Record<string, unknown>);

const ladderRecommendation = designDiscordVisualReport({
  reportType: 'risk_reward_ladder',
  session: 'Morning',
  instrument: 'MES',
  direction: 'SHORT',
  status: 'EXECUTABLE',
  hasRiskRewardLadder: false,
  hasRiskZone: false,
  hasTargetZone: false,
  hasDirectionalHeader: true,
  hasEntryStopTargetCallouts: true,
  invalidation: 'Invalid above protected raid high.',
  messageText: 'Compact report.',
});

assert.ok(ladderRecommendation.riskVisibilityWarnings.includes('Entry is missing from the visible report.'));
assert.ok(ladderRecommendation.riskVisibilityWarnings.includes('Risk/reward ladder is not visible enough.'));
assert.ok(ladderRecommendation.riskVisibilityWarnings.includes('Risk zone needs stronger visual separation.'));
assert.ok(ladderRecommendation.riskVisibilityWarnings.includes('Target zone needs stronger visual separation.'));
assertDiscordReportDesignerIsAdvisoryOnly(ladderRecommendation as unknown as Record<string, unknown>);

assert.throws(() => assertDiscordReportDesignerIsAdvisoryOnly({
  ...(recommendation as unknown as Record<string, unknown>),
  canExecute: true,
}), /must not include executable field/);

function acceptsOnlyDisplayRecommendations(_value: DiscordReportDesignRecommendation) {
  return true;
}
assert.equal(acceptsOnlyDisplayRecommendations(recommendation), true);

console.log('Discord visual report designer agent verified.');
