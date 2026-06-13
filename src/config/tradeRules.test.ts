import assert from 'node:assert/strict';
import { targetsFromEntryStop } from './tradeRules';

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

console.log('Trade rule target math rejects directionally invalid stops.');
