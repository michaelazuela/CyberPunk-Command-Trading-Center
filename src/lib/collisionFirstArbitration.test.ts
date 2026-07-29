import assert from 'node:assert/strict';
import {
  ExecutionStatus,
  NoTradeReason,
  SetupCandidate,
  SetupCandidateStatus,
  SetupType,
} from '../types';
import {
  COLLISION_WAIT_MESSAGE,
  applyCollisionFirstArbitration,
  hasFullCollisionProof,
} from './collisionFirstArbitration';

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.StructureShiftContinuation,
    scenarioLabel: 'Structure Shift Continuation',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 92,
    entry: 7500,
    stop: 7492,
    target1: 7512,
    target2: 7516,
    riskPoints: 8,
    riskAdvisoryStatus: 'RISK_WITHIN_STANDARD_LIMIT',
    riskPolicy: 'STANDARD_RISK',
    invalidation: 'Invalid below protected 5M structure stop 7492.',
    entryClarity: 90,
    stopClarity: 90,
    targetClarity: 90,
    evidence: [
      'Completed 5M proof with protected 5M structure stop and clean target room.',
    ],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Executable,
    blockReason: null,
    requiredTrigger: 'Completed 5M proof.',
    nextAction: 'Approved model proof exists.',
    reducedRiskPlan: null,
    activeRuleset: {
      timeframeMss: {
        applied: true,
        status: 'passed',
        required: 'aligned_confirmed_5m_mss',
        appliesToAllModels: true,
        affectsExecution: true,
        evidence: ['Completed 5M MSS proof passed.'],
        blockers: [],
      },
    },
    ...overrides,
  };
}

const incompleteLong = candidate({
  executionStatus: ExecutionStatus.Conditional,
  blockReason: NoTradeReason.EntryTriggerPending,
  missingEvidence: ['Wait for completed 5M proof.'],
});
const incompleteShort = candidate({
  direction: 'SHORT',
  entry: 7498,
  stop: 7507,
  target1: 7484.5,
  target2: 7480,
  executionStatus: ExecutionStatus.Conditional,
  blockReason: NoTradeReason.EntryTriggerPending,
  missingEvidence: ['Wait for completed 5M proof.'],
});

const neitherReady = applyCollisionFirstArbitration([incompleteLong, incompleteShort]);
assert.equal(neitherReady.state, 'collision_wait');
assert.equal(neitherReady.message, COLLISION_WAIT_MESSAGE);
assert.equal(neitherReady.selectedCandidate, null);
assert.equal(neitherReady.readyLongCount, 0);
assert.equal(neitherReady.readyShortCount, 0);

const provenLong = candidate();
const singleSideReady = applyCollisionFirstArbitration([provenLong, incompleteShort]);
assert.equal(singleSideReady.state, 'single_side_ready');
assert.equal(singleSideReady.allowedDirection, 'LONG');
assert.equal(singleSideReady.selectedCandidate, provenLong);
assert.equal(singleSideReady.supportingContextCandidates[0], incompleteShort);

const htfOnlyShort = candidate({
  direction: 'SHORT',
  setupType: SetupType.RaidFailureDisplacementReversal,
  entry: 7498,
  stop: 7507,
  target1: 7484.5,
  target2: 7480,
  executionStatus: ExecutionStatus.Conditional,
  blockReason: null,
  evidence: ['HTF context supports a short, but 5M proof is pending.'],
  missingEvidence: ['No completed 5M proof yet.'],
});
assert.equal(hasFullCollisionProof(htfOnlyShort), false);

const provenShort = candidate({
  setupType: SetupType.RaidFailureDisplacementReversal,
  direction: 'SHORT',
  priority: 100,
  entry: 7498,
  stop: 7507,
  target1: 7484.5,
  target2: 7480,
  evidence: ['Completed 5M proof with protected 5M structure stop and clean target room.'],
});
const bothReady = applyCollisionFirstArbitration([provenLong, provenShort]);
assert.equal(bothReady.state, 'collision_wait');
assert.equal(bothReady.allowedDirection, null);
assert.equal(bothReady.selectedCandidate, null);

const noCollision = applyCollisionFirstArbitration([provenLong]);
assert.equal(noCollision.state, 'no_collision');
assert.equal(noCollision.hasCollision, false);

console.log('collision-first arbitration contract verified.');
