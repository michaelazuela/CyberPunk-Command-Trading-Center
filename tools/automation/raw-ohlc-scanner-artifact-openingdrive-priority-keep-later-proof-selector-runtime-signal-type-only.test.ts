import assert from 'node:assert/strict';
import { SetupType, type SetupCandidate, type SetupCandidateProofSelectionSignal } from '../../src/types';

const proofSelectionSignal: SetupCandidateProofSelectionSignal = {
  metadataSource: 'scanner_owned_completed_5m_proof_group',
  status: 'same_completed_5m_proof_collision',
  selectorDecision: 'keep_later_sweep_proof',
  completedBarTime: '2026-07-01T14:05:00.000Z',
  groupKey: 'morning|2026-07-01T14:05:00.000Z|LONG',
  groupSize: 2,
  competingSetupTypes: [SetupType.NoSetup, SetupType.NoSetup],
  changesCanExecute: false,
  changesEntryStopTargets: false,
  changesRiskRules: false,
  usesOutcomeData: false,
  usesResearchLabels: false,
  usesGeminiAdvisoryText: false,
  usesLiveBridgeReadsInsideRanker: false,
  scannerVisibleInstallAllowed: false,
};

const candidateBoundary = {
  setupType: SetupType.NoSetup,
  proofSelectionSignal,
} satisfies Partial<SetupCandidate>;

assert.equal(candidateBoundary.proofSelectionSignal.metadataSource, 'scanner_owned_completed_5m_proof_group');
assert.equal(candidateBoundary.proofSelectionSignal.selectorDecision, 'keep_later_sweep_proof');
assert.equal(candidateBoundary.proofSelectionSignal.changesCanExecute, false);
assert.equal(candidateBoundary.proofSelectionSignal.changesEntryStopTargets, false);
assert.equal(candidateBoundary.proofSelectionSignal.changesRiskRules, false);
assert.equal(candidateBoundary.proofSelectionSignal.usesOutcomeData, false);
assert.equal(candidateBoundary.proofSelectionSignal.usesResearchLabels, false);
assert.equal(candidateBoundary.proofSelectionSignal.usesGeminiAdvisoryText, false);
assert.equal(candidateBoundary.proofSelectionSignal.usesLiveBridgeReadsInsideRanker, false);
assert.equal(candidateBoundary.proofSelectionSignal.scannerVisibleInstallAllowed, false);

console.log('OpeningDrive keep-later-proof selector type-only signal boundary verified.');
