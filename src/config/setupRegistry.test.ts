import {
  SETUP_REGISTRY,
  getAllowedSetupRegistry,
  getDeprecatedSetupRegistry,
  getPrimarySetupRegistry,
  getSupportingEvidenceRegistry,
  type ParentModelFamily,
} from './setupRegistry';
import { SetupType } from '../types';

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function setupTypes(entries: { setupType: SetupType }[]) {
  return new Set(entries.map((entry) => entry.setupType));
}

function assertContainsAll(actual: Set<SetupType>, expected: SetupType[], label: string) {
  for (const setupType of expected) {
    assert(actual.has(setupType), `${label} is missing ${setupType}`);
  }
}

function assertExactSet(actual: Set<SetupType>, expected: SetupType[], label: string) {
  assert(actual.size === expected.length, `${label} expected ${expected.length} entries but found ${actual.size}`);
  assertContainsAll(actual, expected, label);
}

const primaryExpected = [
  SetupType.SweepMssFvgRetrace,
  SetupType.TurtleSoup,
  SetupType.HtfDrawContinuationAfterRaid,
  SetupType.HtfDisplacementMssContinuation,
  SetupType.HtfDisplacementFvgContinuation,
  SetupType.OpeningDriveFvgContinuation,
  SetupType.AfterLunchDriveFvgContinuation,
  SetupType.IntradayMssMicroContinuation,
  SetupType.FailedPlanReversal,
];
const supportingExpected = [
  SetupType.LiquiditySweep,
  SetupType.FairValueGap,
  SetupType.FvgImbalancePullback,
  SetupType.MarketStructureShift,
  SetupType.EqualHighsLows,
  SetupType.PreviousDaySweep,
  SetupType.BreakerBlock,
];
const deprecatedExpected = [
  SetupType.OrderBlock618,
  SetupType.MomentumRunaway,
  SetupType.OpeningOrderBlock,
  SetupType.InitialBalanceExtension,
  SetupType.OpeningGapFill,
  SetupType.CompressionBreakout,
  SetupType.AlgoKillZone,
  SetupType.MitigationBlock,
  SetupType.MomentumPullbackBreatherReclaim,
  SetupType.MorningFailedHighLiquidityRejection,
  SetupType.MorningReclaimLong,
  SetupType.MorningOpeningRangeContinuation,
  SetupType.LunchFailedHighReversal,
  SetupType.LunchFailedLowReversal,
  SetupType.LunchCompressionBreakout,
  SetupType.LunchFailedContinuation,
  SetupType.LunchRangeReclaim,
];

const noisyCatalog = [...supportingExpected, ...deprecatedExpected];
const parentModelFamilies: ParentModelFamily[] = [
  'MODEL_1_SWEEP_MSS_FVG_RETRACE',
  'FAILED_BREAKOUT_REVERSAL',
  'HTF_DISPLACEMENT_CONTINUATION',
  'FAILED_PLAN_REVERSAL',
];
const expectedFamilyByPrimarySetup = new Map<SetupType, ParentModelFamily>([
  [SetupType.SweepMssFvgRetrace, 'MODEL_1_SWEEP_MSS_FVG_RETRACE'],
  [SetupType.TurtleSoup, 'FAILED_BREAKOUT_REVERSAL'],
  [SetupType.HtfDrawContinuationAfterRaid, 'HTF_DISPLACEMENT_CONTINUATION'],
  [SetupType.HtfDisplacementMssContinuation, 'HTF_DISPLACEMENT_CONTINUATION'],
  [SetupType.HtfDisplacementFvgContinuation, 'HTF_DISPLACEMENT_CONTINUATION'],
  [SetupType.OpeningDriveFvgContinuation, 'HTF_DISPLACEMENT_CONTINUATION'],
  [SetupType.AfterLunchDriveFvgContinuation, 'HTF_DISPLACEMENT_CONTINUATION'],
  [SetupType.IntradayMssMicroContinuation, 'HTF_DISPLACEMENT_CONTINUATION'],
  [SetupType.FailedPlanReversal, 'FAILED_PLAN_REVERSAL'],
]);

const configuredFamilies = new Set(
  SETUP_REGISTRY
    .filter((entry) => entry.parentModelFamily)
    .map((entry) => entry.parentModelFamily as ParentModelFamily),
);
assert(configuredFamilies.size === parentModelFamilies.length, 'registry must keep exactly four parent model families');
for (const family of parentModelFamilies) {
  assert(configuredFamilies.has(family), `registry is missing parent model family ${family}`);
}
for (const entry of SETUP_REGISTRY) {
  if (entry.role === 'primary_model') {
    assert(
      entry.parentModelFamily === expectedFamilyByPrimarySetup.get(entry.setupType),
      `${entry.setupType} has unexpected parent model family ${entry.parentModelFamily}`,
    );
  } else {
    assert(!entry.parentModelFamily, `${entry.setupType} must not define a parent model family because it is ${entry.role}`);
  }
}

for (const sessionType of ['morning', 'lunch', 'replay_morning', 'replay_lunch'] as const) {
  const primary = getPrimarySetupRegistry(sessionType);
  const supporting = getSupportingEvidenceRegistry(sessionType);
  const deprecated = getDeprecatedSetupRegistry(sessionType);
  const allowed = getAllowedSetupRegistry(sessionType);

  assert(primary.every((entry) => entry.role === 'primary_model'), `${sessionType} primary accessor returned non-primary entries`);
  assert(
    supporting.every((entry) => entry.role === 'supporting_evidence'),
    `${sessionType} supporting accessor returned non-supporting entries`,
  );
  assert(deprecated.every((entry) => entry.role === 'deprecated'), `${sessionType} deprecated accessor returned non-deprecated entries`);

  const primaryTypes = setupTypes(primary);
  const supportingTypes = setupTypes(supporting);
  const deprecatedTypes = setupTypes(deprecated);
  const allowedTypes = setupTypes(allowed);
  const sessionPrimaryExpected = sessionType === 'lunch' || sessionType === 'replay_lunch'
    ? primaryExpected.filter((setupType) => setupType !== SetupType.OpeningDriveFvgContinuation)
    : primaryExpected.filter((setupType) => setupType !== SetupType.AfterLunchDriveFvgContinuation);

  assertExactSet(primaryTypes, sessionPrimaryExpected, `${sessionType} primary registry`);
  assertExactSet(supportingTypes, supportingExpected, `${sessionType} supporting registry`);

  for (const setupType of deprecatedExpected) {
    assert(!primaryTypes.has(setupType), `${sessionType} primary registry includes deprecated ${setupType}`);
    assert(!supportingTypes.has(setupType), `${sessionType} supporting registry includes deprecated ${setupType}`);
  }

  for (const setupType of noisyCatalog) {
    assert(!primaryTypes.has(setupType), `${sessionType} noisy catalog entry ${setupType} leaked into primary registry`);
  }

  for (const setupType of deprecatedTypes) {
    assert(!primaryTypes.has(setupType), `${sessionType} deprecated ${setupType} leaked into primary registry`);
    assert(!supportingTypes.has(setupType), `${sessionType} deprecated ${setupType} leaked into supporting registry`);
  }

  assertExactSet(deprecatedTypes, deprecatedExpected.filter((setupType) => allowedTypes.has(setupType)), `${sessionType} deprecated registry`);
  assertContainsAll(allowedTypes, sessionPrimaryExpected, `${sessionType} compatibility registry`);
  assertContainsAll(allowedTypes, supportingExpected, `${sessionType} compatibility registry`);
  assert(
    allowed.length === primary.length + supporting.length + deprecated.length,
    `${sessionType} compatibility accessor should still return every role`,
  );
}

const htfEntry = getPrimarySetupRegistry('morning').find((entry) => entry.setupType === SetupType.HtfDrawContinuationAfterRaid);
assert(htfEntry, 'HTF draw continuation entry must remain a primary model');
assert(
  !/Execute only|take the trade|enter now|buy now|sell now|trade approved/i.test(htfEntry.defaultNextAction),
  'HTF registry action wording must not imply execution before final gates',
);
assert(htfEntry.defaultNextAction.includes('canExecute gates'), 'HTF registry action must preserve canExecute gate wording');

console.log('setupRegistry role accessors verified');
