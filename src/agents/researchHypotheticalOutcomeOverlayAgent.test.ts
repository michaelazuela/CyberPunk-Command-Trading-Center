import assert from 'node:assert/strict';
import {
  calculateResearchHypotheticalOutcomeOverlay,
  type ResearchHypotheticalOutcomeOverlay,
} from './researchHypotheticalOutcomeOverlayAgent';
import type { ResearchOutcomeBar, ResearchOutcomeThresholds } from './researchOutcomeMathAgent';

const thresholds: ResearchOutcomeThresholds = {
  thresholdOnePoints: 4,
  thresholdTwoPoints: 8,
  adverseThresholdPoints: 4,
  observationWindowBars: 12,
};

function overlay(direction: 'LONG' | 'SHORT' | 'NO TRADE', bars: ResearchOutcomeBar[], referencePrice = 100): ResearchHypotheticalOutcomeOverlay {
  return calculateResearchHypotheticalOutcomeOverlay({
    direction,
    hypotheticalReferencePrice: referencePrice,
    postSignalBars: bars,
    thresholds,
  });
}

const longThresholds = overlay('LONG', [
  { time: '2026-05-28T10:05:00', open: 100, high: 104, low: 99, close: 103 },
]);
assert.equal(longThresholds.hypotheticalReferencePrice, 100);
assert.equal(longThresholds.hypotheticalThresholdOne, 104);
assert.equal(longThresholds.hypotheticalThresholdTwo, 108);
assert.equal(longThresholds.hypotheticalInvalidationReference, 96);
assert.equal(longThresholds.hypotheticalOutcomeLabel, 'partial_favorable');

const shortThresholds = overlay('SHORT', [
  { time: '2026-05-28T10:05:00', open: 100, high: 101, low: 96, close: 97 },
]);
assert.equal(shortThresholds.hypotheticalReferencePrice, 100);
assert.equal(shortThresholds.hypotheticalThresholdOne, 96);
assert.equal(shortThresholds.hypotheticalThresholdTwo, 92);
assert.equal(shortThresholds.hypotheticalInvalidationReference, 104);
assert.equal(shortThresholds.hypotheticalOutcomeLabel, 'partial_favorable');

const thresholdOneFirst = overlay('LONG', [
  { time: '2026-05-28T10:05:00', open: 100, high: 104, low: 99, close: 103 },
  { time: '2026-05-28T10:10:00', open: 103, high: 105, low: 98, close: 104 },
]);
assert.equal(thresholdOneFirst.firstResolvedEvent, 'favorable_threshold_one');
assert.equal(thresholdOneFirst.hypotheticalOutcomeLabel, 'partial_favorable');
assert.equal(thresholdOneFirst.resolvedAtBarIndex, 0);

const thresholdOneThenAdverse = overlay('LONG', [
  { time: '2026-05-28T10:05:00', open: 100, high: 104, low: 99, close: 103 },
  { time: '2026-05-28T10:10:00', open: 103, high: 103, low: 96, close: 97 },
]);
assert.equal(thresholdOneThenAdverse.firstResolvedEvent, 'favorable_threshold_one');
assert.equal(thresholdOneThenAdverse.hypotheticalOutcomeLabel, 'partial_favorable');
assert.equal(thresholdOneThenAdverse.resolvedAtBarIndex, 0);

const thresholdTwoBeforeAdverse = overlay('LONG', [
  { time: '2026-05-28T10:05:00', open: 100, high: 108, low: 99, close: 107 },
  { time: '2026-05-28T10:10:00', open: 107, high: 107, low: 95, close: 96 },
]);
assert.equal(thresholdTwoBeforeAdverse.firstResolvedEvent, 'favorable_threshold_two');
assert.equal(thresholdTwoBeforeAdverse.hypotheticalOutcomeLabel, 'favorable_continuation');

const adverseFirst = overlay('LONG', [
  { time: '2026-05-28T10:05:00', open: 100, high: 102, low: 96, close: 97 },
  { time: '2026-05-28T10:10:00', open: 97, high: 109, low: 97, close: 108 },
]);
assert.equal(adverseFirst.firstResolvedEvent, 'adverse_invalidation');
assert.equal(adverseFirst.hypotheticalOutcomeLabel, 'adverse_first');

const noResolution = overlay('LONG', [
  { time: '2026-05-28T10:05:00', open: 100, high: 103, low: 97, close: 101 },
]);
assert.equal(noResolution.firstResolvedEvent, 'neutral_no_resolution');
assert.equal(noResolution.hypotheticalOutcomeLabel, 'neutral_no_resolution');

const sameBarAmbiguous = overlay('LONG', [
  { time: '2026-05-28T10:05:00', open: 100, high: 108, low: 96, close: 101 },
]);
assert.equal(sameBarAmbiguous.firstResolvedEvent, 'ambiguous_same_bar');
assert.equal(sameBarAmbiguous.hypotheticalOutcomeLabel, 'ambiguous_same_bar');
assert.equal(sameBarAmbiguous.resolvedAtBarIndex, 0);

const intrabarOrderNotAssumed = overlay('SHORT', [
  { time: '2026-05-28T10:05:00', open: 100, high: 104, low: 92, close: 99 },
]);
assert.equal(intrabarOrderNotAssumed.firstResolvedEvent, 'ambiguous_same_bar');
assert.equal(intrabarOrderNotAssumed.hypotheticalOutcomeLabel, 'ambiguous_same_bar');

const missingDirection = overlay('NO TRADE', [
  { time: '2026-05-28T10:05:00', open: 100, high: 108, low: 99, close: 107 },
]);
assert.equal(missingDirection.firstResolvedEvent, 'insufficient_data');
assert.equal(missingDirection.hypotheticalOutcomeLabel, 'insufficient_data');

const missingBars = overlay('LONG', []);
assert.equal(missingBars.firstResolvedEvent, 'insufficient_data');
assert.equal(missingBars.hypotheticalOutcomeLabel, 'insufficient_data');

for (const item of [
  longThresholds,
  shortThresholds,
  thresholdOneFirst,
  thresholdOneThenAdverse,
  thresholdTwoBeforeAdverse,
  adverseFirst,
  noResolution,
  sameBarAmbiguous,
  missingDirection,
  missingBars,
]) {
  assert.equal(item.advisoryOnly, true);
  assert.equal(item.executionApproved, false);
  const keys = Object.keys(item);
  assert.equal(keys.includes('entry'), false);
  assert.equal(keys.includes('stop'), false);
  assert.equal(keys.includes('stopLoss'), false);
  assert.equal(keys.includes('target'), false);
  assert.equal(keys.includes('targets'), false);
  assert.equal(keys.includes('T1'), false);
  assert.equal(keys.includes('T2'), false);
  assert.equal(keys.includes('riskReward'), false);
  assert.equal(keys.includes('canExecute'), false);
}

console.log('Research hypothetical outcome overlay agent verified.');
