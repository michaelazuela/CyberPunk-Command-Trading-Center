import assert from 'node:assert/strict';
import { nearestProtectedStructureStopFromLevels, targetsFromEntryStop } from './tradeRules';

assert.deepEqual(targetsFromEntryStop('LONG', 7395, 7396.75), {
  target1: null,
  target2: null,
  riskPoints: null,
});

assert.deepEqual(targetsFromEntryStop('SHORT', 7430, 7429.25), {
  target1: null,
  target2: null,
  riskPoints: null,
});

assert.deepEqual(targetsFromEntryStop('LONG', 7395, 7388), {
  target1: 7405.5,
  target2: 7409,
  riskPoints: 7,
});

assert.equal(
  nearestProtectedStructureStopFromLevels('LONG', 100, [92, 96, 98]),
  97.75
);

assert.equal(
  nearestProtectedStructureStopFromLevels('SHORT', 100, [102, 105, 99]),
  102.25
);

assert.equal(
  nearestProtectedStructureStopFromLevels('LONG', 100, [100.25, 101]),
  null
);

console.log('Trade rule target math rejects directionally invalid stops.');
