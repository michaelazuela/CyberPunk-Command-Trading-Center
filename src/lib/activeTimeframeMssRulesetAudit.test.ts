import assert from 'node:assert/strict';
import { summarizeActiveTimeframeMssRuleset } from './activeTimeframeMssRulesetAudit';
import { ExecutionStatus, SetupCandidateStatus, SetupType, type SetupCandidate } from '../types';

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.NoSetup,
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 95,
    entry: 101,
    stop: 98,
    target1: 105.5,
    target2: 107,
    riskPoints: 3,
    invalidation: 'Below protected swing.',
    evidence: ['Setup evidence.'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Executable,
    blockReason: null,
    requiredTrigger: 'Completed 5M trigger.',
    nextAction: 'Execute only after deterministic gates remain valid.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

const missingCandidate = summarizeActiveTimeframeMssRuleset(null);
assert.equal(missingCandidate.status, 'not_available');
assert.equal(missingCandidate.applied, false);
assert.equal(missingCandidate.appliesToAllModels, true);
assert.ok(missingCandidate.summary.includes('not_available'));

const noMetadata = summarizeActiveTimeframeMssRuleset(candidate());
assert.equal(noMetadata.status, 'not_available');
assert.equal(noMetadata.candidateExecutionStatus, ExecutionStatus.Executable);
assert.ok(noMetadata.blockers.some((item) => item.includes('does not include active MSS')));

const passed = summarizeActiveTimeframeMssRuleset(candidate({
  activeRuleset: {
    timeframeMss: {
      applied: true,
      status: 'passed',
      required: 'aligned_confirmed_5m_mss',
      appliesToAllModels: true,
      affectsExecution: false,
      evidence: ['5M bullish MSS confirmed.'],
      blockers: [],
    },
  },
}));
assert.equal(passed.status, 'passed');
assert.equal(passed.applied, true);
assert.equal(passed.affectsExecution, false);
assert.deepEqual(passed.evidence, ['5M bullish MSS confirmed.']);
assert.ok(passed.summary.includes('Candidate=Executable'));

const blocked = summarizeActiveTimeframeMssRuleset(candidate({
  executionStatus: ExecutionStatus.Conditional,
  activeRuleset: {
    timeframeMss: {
      applied: true,
      status: 'blocked',
      required: 'aligned_confirmed_5m_mss',
      appliesToAllModels: true,
      affectsExecution: true,
      evidence: ['5M bearish MSS confirmed.'],
      blockers: ['Opposing completed 60M MSS is active.'],
    },
  },
}));
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.affectsExecution, true);
assert.equal(blocked.candidateExecutionStatus, ExecutionStatus.Conditional);
assert.ok(blocked.summary.includes('Opposing completed 60M MSS'));
