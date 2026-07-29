import assert from 'node:assert/strict';
import { SetupType } from '../types';
import {
  APPROVED_SETUP_TYPES,
  REGISTERED_SETUP_TYPES,
  SETUP_REGISTRY,
  getAllowedSetupRegistry,
  getDeprecatedSetupRegistry,
  getPrimarySetupRegistry,
  getContextLabelRegistry,
} from './setupRegistry';

const expectedSetupTypes = [
  SetupType.LiquidityRaidReclaimReversal,
  SetupType.RaidFailureDisplacementReversal,
  SetupType.DrivePullbackContinuation,
  SetupType.IntradayMssMicroContinuation,
  SetupType.StructureShiftContinuation,
  SetupType.FailedBreakoutReversal,
];

for (const sessionType of ['morning', 'lunch', 'evening', 'replay_morning', 'replay_lunch'] as const) {
  assert.deepEqual(getPrimarySetupRegistry(sessionType).map((entry) => entry.setupType), expectedSetupTypes, `${sessionType} primary registry must contain the approved models`);
  assert.deepEqual(getAllowedSetupRegistry(sessionType).map((entry) => entry.setupType), expectedSetupTypes, `${sessionType} allowed registry must contain the approved models`);
  assert.deepEqual(getContextLabelRegistry(sessionType), [], `${sessionType} context-only labels registry must be blank`);
  assert.deepEqual(getDeprecatedSetupRegistry(sessionType), [], `${sessionType} deprecated registry must be blank`);
}

assert.deepEqual(SETUP_REGISTRY.map((entry) => entry.setupType), expectedSetupTypes, 'setup registry must contain only the approved model entries');
assert.deepEqual(REGISTERED_SETUP_TYPES, expectedSetupTypes, 'registry must register only the approved setup types');
assert.equal(APPROVED_SETUP_TYPES, REGISTERED_SETUP_TYPES, 'approved setup export remains a compatibility alias');

console.log('setupRegistry approved-model contract verified');
