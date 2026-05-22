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

const primaryExpected = [SetupType.SweepMssFvgRetrace, SetupType.TurtleSoup];
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

  assertContainsAll(primaryTypes, primaryExpected, `${sessionType} primary registry`);
  assertContainsAll(supportingTypes, supportingExpected, `${sessionType} supporting registry`);

  for (const setupType of deprecatedExpected) {
    assert(!primaryTypes.has(setupType), `${sessionType} primary registry includes deprecated ${setupType}`);
    assert(!supportingTypes.has(setupType), `${sessionType} supporting registry includes deprecated ${setupType}`);
  }

  for (const setupType of deprecatedTypes) {
    assert(!primaryTypes.has(setupType), `${sessionType} deprecated ${setupType} leaked into primary registry`);
    assert(!supportingTypes.has(setupType), `${sessionType} deprecated ${setupType} leaked into supporting registry`);
  }

  assertContainsAll(deprecatedTypes, deprecatedExpected.filter((setupType) => allowedTypes.has(setupType)), `${sessionType} deprecated registry`);
  assert(
    allowed.length === primary.length + supporting.length + deprecated.length,
    `${sessionType} compatibility accessor should still return every role`,
  );
}

console.log('setupRegistry role accessors verified');
