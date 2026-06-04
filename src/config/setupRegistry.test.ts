import {
  getAllowedSetupRegistry,
  getDeprecatedSetupRegistry,
  getPrimarySetupRegistry,
  getSupportingEvidenceRegistry,
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

  assertExactSet(primaryTypes, primaryExpected, `${sessionType} primary registry`);
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
  assertContainsAll(allowedTypes, primaryExpected, `${sessionType} compatibility registry`);
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
