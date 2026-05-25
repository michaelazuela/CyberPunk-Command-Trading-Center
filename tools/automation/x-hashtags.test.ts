import assert from 'node:assert/strict';
import { formatXHashtags, xHashtagsFor, type XHashtagContext } from './x-hashtags';

const contexts: XHashtagContext[] = [
  'default',
  'chart_plan',
  'weekly_prep',
  'morning_prep',
  'education',
  'bigger_reach',
];

for (const context of contexts) {
  const tags = xHashtagsFor(context);
  assert.ok(tags.length >= 6, `${context} should have enough reach tags`);
  assert.ok(tags.length <= 10, `${context} should stay below spam threshold`);
  assert.equal(new Set(tags).size, tags.length, `${context} should not duplicate tags`);
  assert.ok(!tags.includes('#ICT'), `${context} should avoid niche method tags in public brand copy`);
  assert.equal(formatXHashtags(context), tags.join(' '));
}

assert.deepEqual(xHashtagsFor('chart_plan'), [
  '#MES',
  '#MNQ',
  '#FuturesTrading',
  '#DayTrading',
  '#PriceAction',
  '#MarketStructure',
  '#TradePlan',
  '#RiskManagement',
]);

assert.deepEqual(xHashtagsFor('weekly_prep'), [
  '#FuturesTrading',
  '#MES',
  '#MNQ',
  '#MarketPrep',
  '#TradingPlan',
  '#PriceAction',
  '#MarketStructure',
  '#RiskManagement',
]);

assert.deepEqual(xHashtagsFor('default'), [
  '#MES',
  '#MNQ',
  '#ES_F',
  '#NQ_F',
  '#FuturesTrading',
  '#DayTrading',
  '#PriceAction',
  '#MarketStructure',
  '#RiskManagement',
]);
