import assert from 'node:assert/strict';
import {
  APPROVED_SETUP_TYPES,
  REGISTERED_SETUP_TYPES,
  SETUP_REGISTRY,
  getAllowedSetupRegistry,
  getDeprecatedSetupRegistry,
  getPrimarySetupRegistry,
  getSupportingEvidenceRegistry,
  type ParentModelFamily,
} from './setupRegistry';
import { SetupType } from '../types';

function setupTypes(entries: { setupType: SetupType }[]) {
  return new Set(entries.map((entry) => entry.setupType));
}

function assertExactSet(actual: Set<SetupType>, expected: SetupType[], label: string) {
  assert.equal(actual.size, expected.length, `${label} expected ${expected.length} entries but found ${actual.size}`);
  for (const setupType of expected) {
    assert.ok(actual.has(setupType), `${label} is missing ${setupType}`);
  }
}

assertExactSet(setupTypes(SETUP_REGISTRY), REGISTERED_SETUP_TYPES, 'registered setup types');
assert.equal(APPROVED_SETUP_TYPES, REGISTERED_SETUP_TYPES, 'approved setup export must remain a compatibility alias');

const allPrimary = [
  SetupType.RaidReclaimReversal,
  SetupType.SweepMssFvgRetrace,
  SetupType.OpeningDriveFvgContinuation,
  SetupType.AfterLunchDriveFvgContinuation,
  SetupType.IntradayMssMicroContinuation,
];

const expectedFamilyByPrimarySetup = new Map<SetupType, ParentModelFamily>([
  [SetupType.RaidReclaimReversal, 'RAID_RECLAIM_REVERSAL'],
  [SetupType.SweepMssFvgRetrace, 'SWEEP_MSS_FVG_RETRACE'],
  [SetupType.OpeningDriveFvgContinuation, 'OPENING_DRIVE_FVG_CONTINUATION'],
  [SetupType.AfterLunchDriveFvgContinuation, 'AFTER_LUNCH_DRIVE_FVG_CONTINUATION'],
  [SetupType.IntradayMssMicroContinuation, 'INTRADAY_MSS_MICRO_CONTINUATION'],
]);

for (const entry of SETUP_REGISTRY) {
  assert.equal(entry.role, 'primary_model', `${entry.setupType} must be a primary model`);
  assert.equal(entry.parentModelFamily, expectedFamilyByPrimarySetup.get(entry.setupType), `${entry.setupType} has unexpected model family`);
}

for (const sessionType of ['morning', 'lunch', 'evening', 'replay_morning', 'replay_lunch'] as const) {
  const primary = getPrimarySetupRegistry(sessionType);
  const supporting = getSupportingEvidenceRegistry(sessionType);
  const deprecated = getDeprecatedSetupRegistry(sessionType);
  const allowed = getAllowedSetupRegistry(sessionType);
  const expected = sessionType === 'lunch' || sessionType === 'replay_lunch'
    ? allPrimary.filter((setupType) => setupType !== SetupType.OpeningDriveFvgContinuation)
    : sessionType === 'evening'
    ? allPrimary.filter((setupType) =>
        setupType !== SetupType.OpeningDriveFvgContinuation &&
        setupType !== SetupType.AfterLunchDriveFvgContinuation
      )
    : allPrimary.filter((setupType) => setupType !== SetupType.AfterLunchDriveFvgContinuation);

  assertExactSet(setupTypes(primary), expected, `${sessionType} primary registry`);
  assertExactSet(setupTypes(allowed), expected, `${sessionType} compatibility registry`);
  assert.equal(supporting.length, 0, `${sessionType} supporting registry should be empty`);
  assert.equal(deprecated.length, 0, `${sessionType} deprecated registry should be empty`);

  for (const retired of [
    'TurtleSoup',
    'HtfDrawContinuationAfterRaid',
    'HtfDisplacementMssContinuation',
    'HtfDisplacementFvgContinuation',
    'FailedPlanReversal',
  ]) {
    assert.ok(![...setupTypes(primary)].includes(retired as SetupType), `${sessionType} retired model leaked into primary registry: ${retired}`);
    assert.ok(![...setupTypes(allowed)].includes(retired as SetupType), `${sessionType} retired model leaked into allowed registry: ${retired}`);
  }
}

const registryText = SETUP_REGISTRY
  .flatMap((entry) => [
    entry.label,
    ...entry.requiredEvidence,
    entry.defaultRequiredTrigger,
    entry.defaultNextAction,
  ])
  .join(' ');
assert.ok(!/at least 2\.0R|minimum 2\.0R|2R target/i.test(registryText), 'registry must not reintroduce old 2R-minimum target-room wording');
assert.ok(registryText.includes('Clean 1.5R path'), 'registry must preserve clean 1.5R target-room wording');

console.log('setupRegistry canonical five-model contract verified');
