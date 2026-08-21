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

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function setupTypes(entries: { setupType: SetupType }[]) {
  return new Set(entries.map((entry) => entry.setupType));
}

function assertExactSet(actual: Set<SetupType>, expected: SetupType[], label: string) {
  assert(actual.size === expected.length, `${label} expected ${expected.length} entries but found ${actual.size}`);
  for (const setupType of expected) {
    assert(actual.has(setupType), `${label} is missing ${setupType}`);
  }
}

const fvgOnly = [SetupType.FvgTradingSystemV1];

assertExactSet(setupTypes(SETUP_REGISTRY), fvgOnly, 'active setup registry');
assertExactSet(new Set(REGISTERED_SETUP_TYPES), fvgOnly, 'registered setup types');
assertExactSet(new Set(APPROVED_SETUP_TYPES), fvgOnly, 'approved setup types');

const parentModelFamilies: ParentModelFamily[] = ['FVG_TRADING_SYSTEM_V1'];
const configuredFamilies = new Set(
  SETUP_REGISTRY.filter((entry) => entry.parentModelFamily)
    .map((entry) => entry.parentModelFamily as ParentModelFamily),
);

assert(configuredFamilies.size === parentModelFamilies.length, 'registry must keep exactly one parent model family');
for (const family of parentModelFamilies) {
  assert(configuredFamilies.has(family), `registry is missing parent model family ${family}`);
}

for (const sessionType of ['morning', 'lunch', 'replay_morning', 'replay_lunch'] as const) {
  const primary = getPrimarySetupRegistry(sessionType);
  const supporting = getSupportingEvidenceRegistry(sessionType);
  const deprecated = getDeprecatedSetupRegistry(sessionType);
  const allowed = getAllowedSetupRegistry(sessionType);

  assert(primary.every((entry) => entry.role === 'primary_model'), `${sessionType} primary accessor returned non-primary entries`);
  assert(supporting.length === 0, `${sessionType} supporting registry must be empty`);
  assert(deprecated.length === 0, `${sessionType} deprecated registry must be empty`);
  assertExactSet(setupTypes(primary), fvgOnly, `${sessionType} primary registry`);
  assertExactSet(setupTypes(allowed), fvgOnly, `${sessionType} compatibility registry`);
}

const fvgEntry = getPrimarySetupRegistry('morning').find((entry) => entry.setupType === SetupType.FvgTradingSystemV1);
assert(fvgEntry, 'FVG Trading System v1 entry must remain the primary model');
assert(
  fvgEntry.requiredEvidence.some((line) => /HTF\/15M story/.test(line)),
  'FVG registry must require the HTF/15M story before 5M execution evidence',
);
assert(
  fvgEntry.requiredEvidence.some((line) => /same-direction 15M parent FVG/.test(line)),
  'FVG registry must require a valid same-direction 15M parent FVG',
);
assert(
  fvgEntry.requiredEvidence.some((line) => /nearest protected 5M structure/.test(line)),
  'FVG registry must require nearest protected 5M structure stop placement',
);
assert(
  !/Execute only|take the trade|enter now|buy now|sell now|trade approved/i.test(fvgEntry.defaultNextAction),
  'FVG registry action wording must not imply execution before final gates',
);

console.log('setupRegistry FVG-only runtime contract verified');
