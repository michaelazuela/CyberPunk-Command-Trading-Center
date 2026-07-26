import assert from 'node:assert/strict';
import {
  buildOutcomeClosureRecord,
  buildProofLearningContext,
  DISCORD_PROOF_PROMPT,
  proofLearningAuthorityNote,
} from './proofLearningAgent';

const originalPlan = {
  canExecute: false,
  entry: 5320.25,
  stop: 5316.25,
  t1: 5326.25,
  t2: 5328.25,
  setupType: 'NoInstalledSetup',
  riskPoints: 4,
  noTradeReason: null,
};

const candidate = {
  direction: 'LONG',
  entry: 5320.25,
  stop: 5316.25,
  target1: 5326.25,
  target2: 5328.25,
  riskPoints: 4,
  executionStatus: 'Conditional',
};

const planBefore = JSON.stringify(originalPlan);
const candidateBefore = JSON.stringify(candidate);

const closure = buildOutcomeClosureRecord({
  setupId: 'setup-123',
  alertId: 'alert-456',
  planVersionId: 'PLAN-789',
  sessionType: 'morning',
  tradeDate: '2026-05-26',
  instrument: 'MES',
  originalNormalizedPlan: originalPlan,
  selectedCandidateSnapshot: candidate,
  outcome: 'win',
  tradeTaken: true,
  proofScreenshotRef: 'trade-proofs/setup-123/proof.png',
  proofReviewVerdict: 'CONFIRMED',
  pnlTicks: 24,
  pnlDollars: 300,
  notes: 'Trader marked T1 hit.',
});

assert.equal(JSON.stringify(originalPlan), planBefore, 'closure helper must not mutate original plan');
assert.equal(JSON.stringify(candidate), candidateBefore, 'closure helper must not mutate selected candidate');
assert.deepEqual(closure.originalPlanSnapshot, originalPlan);
assert.deepEqual(closure.selectedCandidateSnapshot, candidate);
assert.notEqual(closure.originalPlanSnapshot, originalPlan);
assert.notEqual(closure.selectedCandidateSnapshot, candidate);
assert.equal(closure.outcome, 'win');
assert.equal(closure.tradeTaken, true);
assert.equal(closure.proofSubmitted, true);
assert.equal(closure.proofPrompt, DISCORD_PROOF_PROMPT);
assert.equal(closure.approvalBoundary.proofSubmissionApprovesTrade, false);
assert.equal(closure.approvalBoundary.tradeConfirmationOverridesRiskRules, false);
assert.equal(closure.approvalBoundary.ragSaveApprovesTradeRetroactively, false);
assert.ok(closure.notes?.includes('This does not change trade rules or future approval gates.'));
assert.ok(!/proof approved|rag approved|changed the rule|outcome changed future trade approval/i.test(JSON.stringify(closure)));

const topLevelExecutableKeys = ['canExecute', 'entry', 'stop', 't1', 't2', 'T1', 'T2', 'setupType', 'riskPoints', 'noTradeReason'];
for (const key of topLevelExecutableKeys) {
  assert.ok(!(key in (closure as unknown as Record<string, unknown>)), `closure leaked executable field at top level: ${key}`);
}

assert.throws(() => buildOutcomeClosureRecord({
  sessionType: 'morning',
  tradeDate: '2026-05-26',
  instrument: 'MES',
  originalNormalizedPlan: originalPlan,
  selectedCandidateSnapshot: candidate,
  outcome: 'loss',
  tradeTaken: false,
}), /win\/loss\/scratch require tradeTaken=true/);

assert.throws(() => buildOutcomeClosureRecord({
  sessionType: 'morning',
  tradeDate: '2026-05-26',
  instrument: 'MES',
  originalNormalizedPlan: originalPlan,
  selectedCandidateSnapshot: candidate,
  outcome: 'missed_trade',
  tradeTaken: true,
}), /no_trade\/missed_trade require tradeTaken=false/);

const noTradeClosure = buildOutcomeClosureRecord({
  sessionType: 'lunch',
  tradeDate: '2026-05-26',
  instrument: 'MES',
  originalNormalizedPlan: { canExecute: false, noTradeReason: 'No trigger.' },
  selectedCandidateSnapshot: null,
  outcome: 'no_trade',
  tradeTaken: false,
  notes: 'No execution.',
});
assert.equal(noTradeClosure.proofPrompt, null);
assert.equal(noTradeClosure.proofSubmitted, false);
assert.equal(noTradeClosure.proofReviewVerdict, 'SKIPPED');

const proofContext = buildProofLearningContext({
  context: {
    sessionType: 'morning',
    tradeResult: 'win',
    notes: 'Existing note.',
  } as any,
  proofSubmitted: true,
  proofScreenshotUrl: 'trade-proofs/setup-123/proof.png',
  notes: 'Proof supports the recorded outcome.',
});
assert.equal(proofContext.proofSubmitted, true);
assert.equal(proofContext.proofScreenshotUrl, 'trade-proofs/setup-123/proof.png');
assert.ok(proofContext.notes?.includes('Existing note.'));
assert.ok(proofContext.notes?.includes('Proof supports the recorded outcome.'));
assert.ok(proofLearningAuthorityNote().includes('does not approve trades'));

console.log('Proof learning outcome closure helper verified.');
