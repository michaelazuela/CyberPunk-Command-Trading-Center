import assert from 'node:assert/strict';
import {
  APPROVED_SETUP_TYPES,
  REGISTERED_SETUP_TYPES,
  SETUP_REGISTRY,
  getAllowedSetupRegistry,
  getDeprecatedSetupRegistry,
  getPrimarySetupRegistry,
  getContextLabelRegistry,
} from './setupRegistry';

for (const sessionType of ['morning', 'lunch', 'evening', 'replay_morning', 'replay_lunch'] as const) {
  assert.deepEqual(getPrimarySetupRegistry(sessionType), [], `${sessionType} primary registry must be blank`);
  assert.deepEqual(getAllowedSetupRegistry(sessionType), [], `${sessionType} allowed registry must be blank`);
  assert.deepEqual(getContextLabelRegistry(sessionType), [], `${sessionType} context-only labels registry must be blank`);
  assert.deepEqual(getDeprecatedSetupRegistry(sessionType), [], `${sessionType} deprecated registry must be blank`);
}

assert.deepEqual(SETUP_REGISTRY, [], 'blank-slate setup registry must contain no model entries');
assert.deepEqual(REGISTERED_SETUP_TYPES, [], 'blank-slate registry must register no setup types');
assert.equal(APPROVED_SETUP_TYPES, REGISTERED_SETUP_TYPES, 'approved setup export remains a compatibility alias');

console.log('setupRegistry blank-slate contract verified');
