import assert from 'node:assert/strict';
import {
  APPROVED_DESK_MODEL_DEFINITIONS,
  APPROVED_DESK_MODEL_IDS,
  getApprovedDeskModelDefinition,
  isApprovedDeskModelId,
  type ApprovedDeskModelId,
} from './approvedDeskModels';
import { scanSetupCandidates } from '../lib/setupScanner';

const expectedIds: ApprovedDeskModelId[] = [
  'liquidity_raid_reclaim_reversal',
  'raid_failure_displacement_reversal',
  'drive_pullback_continuation',
  'structure_shift_continuation',
  'failed_breakout_reversal',
];

assert.deepEqual(APPROVED_DESK_MODEL_IDS, expectedIds, 'approved desk model registry must expose exactly the five forensic models');
assert.equal(new Set(APPROVED_DESK_MODEL_IDS).size, 5, 'approved desk model ids must be unique');

for (const id of expectedIds) {
  assert.equal(isApprovedDeskModelId(id), true, `${id} must be recognized`);
  const definition = getApprovedDeskModelDefinition(id);
  assert.equal(definition.id, id);
  assert.deepEqual(definition.directions, ['LONG', 'SHORT'], `${id} must define long and short versions`);
  assert.deepEqual(definition.approvedSessionsForReplay, ['morning', 'lunch', 'evening'], `${id} replay sessions must include evening coverage`);
  assert.deepEqual(definition.productionSessionsEnabled, ['morning', 'lunch', 'evening'], `${id} production session coverage must include evening`);
  assert.equal(definition.sourceOfTruth, 'docs/FIVE_MODEL_FORENSIC_PLAYBOOK.md');
  assert.equal(definition.installsScannerDetection, true);
  assert.equal(definition.installsPromotion, true);
  assert.equal(definition.installsDiscordPublishing, false);
  assert.equal(definition.installsExecutionApproval, false);
  assert.ok(definition.requiredEvidence.length >= 5, `${id} must carry concrete evidence requirements`);
}

const blockedIds = [
  ['Turtle', 'Soup'],
  ['Sweep', 'Mss', 'Fvg', 'Retrace'],
  ['Intraday', 'Mss', 'Micro', 'Continuation'],
  ['Opening', 'Drive', 'Fvg', 'Continuation'],
  ['After', 'Lunch', 'Drive', 'Fvg', 'Continuation'],
  ['Failed', 'Plan', 'Reversal'],
  ['Htf', 'Displacement', 'Mss', 'Continuation'],
  ['Htf', 'Displacement', 'Fvg', 'Continuation'],
].map((parts) => parts.join(''));

for (const blocked of blockedIds) {
  assert.equal(isApprovedDeskModelId(blocked), false, `${blocked} must not be accepted as an approved desk model id`);
}

const scannerResult = scanSetupCandidates({ sessionType: 'morning' });
assert.deepEqual(scannerResult.candidates, [], 'scanner detection must still require structured completed 5M chart context');
assert.equal(scannerResult.bestExecutableCandidate, null, 'five-model scanner install must not create executable candidates without separate execution approval');
assert.equal(scannerResult.bestConditionalCandidate, null, 'scanner detection must not invent conditional candidates from missing chart context');

console.log('approvedDeskModels scanner-installed contract verified');
