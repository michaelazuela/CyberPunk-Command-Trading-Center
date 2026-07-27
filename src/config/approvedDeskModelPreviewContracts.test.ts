import assert from 'node:assert/strict';
import { getApprovedDeskModelDefinition } from './approvedDeskModels';
import {
  APPROVED_DESK_MODEL_PREVIEW_CONTRACTS,
  RAID_FAILURE_DISPLACEMENT_PREVIEW_CONTRACT,
  getApprovedDeskModelPreviewContract,
} from './approvedDeskModelPreviewContracts';
import { scanSetupCandidates } from '../lib/setupScanner';

assert.equal(APPROVED_DESK_MODEL_PREVIEW_CONTRACTS.length, 1);

const contract = getApprovedDeskModelPreviewContract('raid_failure_displacement_reversal');
assert.deepEqual(contract, RAID_FAILURE_DISPLACEMENT_PREVIEW_CONTRACT);
assert.equal(contract?.status, 'disabled_research_contract');
assert.deepEqual(contract?.allowedSessions, ['morning', 'lunch']);
assert.ok(contract?.sourceReport.endsWith('raid-failure-displacement-source-clause-miner-1785037664034.json'));
assert.ok(contract?.requiredClauses.some((line) => line.includes('HTF context must be support')));
assert.ok(contract?.requiredClauses.some((line) => line.includes('leave imbalance context')));
assert.ok(contract?.requiredClauses.some((line) => line.includes('within 20 minutes')));
assert.ok(contract?.requiredFiveMinuteProof.some((line) => line.includes('Protected 5M stop')));
assert.ok(contract?.deterministicGateRequirements.some((line) => line.includes('Normal app-owned entry')));
assert.ok(contract?.deterministicGateRequirements.some((line) => line.includes('HTF context may rank or filter')));

assert.equal(getApprovedDeskModelPreviewContract('liquidity_raid_reclaim_reversal'), null);
assert.equal(getApprovedDeskModelPreviewContract('drive_pullback_continuation'), null);
assert.equal(getApprovedDeskModelPreviewContract('structure_shift_continuation'), null);
assert.equal(getApprovedDeskModelPreviewContract('failed_breakout_reversal'), null);

for (const value of Object.values(RAID_FAILURE_DISPLACEMENT_PREVIEW_CONTRACT.forbiddenRuntimeEffects)) {
  assert.equal(value, false);
}

const model = getApprovedDeskModelDefinition('raid_failure_displacement_reversal');
assert.deepEqual(model.productionSessionsEnabled, ['morning', 'lunch', 'evening']);
assert.equal(model.installsScannerDetection, true);
assert.equal(model.installsPromotion, true);
assert.equal(model.installsDiscordPublishing, true);
assert.equal(model.installsExecutionApproval, false);

const scannerResult = scanSetupCandidates({ sessionType: 'morning' });
assert.deepEqual(scannerResult.candidates, [], 'installed scanner detection must still require structured completed 5M chart context');

console.log('approved desk model preview contract verified');
