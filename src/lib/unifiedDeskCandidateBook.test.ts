import assert from 'node:assert/strict';
import { ExecutionStatus, SetupCandidate, SetupCandidateStatus, SetupType } from '../types';
import { buildUnifiedDeskCandidateBook, buildUnifiedDeskCandidateKey } from './unifiedDeskCandidateBook';

const candidate: SetupCandidate = {
  setupType: SetupType.NoSetup,
  direction: 'LONG',
  detectedStatus: SetupCandidateStatus.Detected,
  confidence: 'High',
  priority: 90,
  entry: 100,
  stop: 98,
  target1: 103,
  target2: 104,
  riskPoints: 2,
  evidence: ['Legacy evidence should not promote a model in blank-slate mode.'],
  missingEvidence: [],
  missingLevels: [],
  executionStatus: ExecutionStatus.Executable,
  blockReason: null,
  requiredTrigger: null,
  nextAction: 'Blank slate should block this candidate.',
  reducedRiskPlan: null,
};

const key = buildUnifiedDeskCandidateKey(candidate, 0);
assert.equal(key, 'blank-slate-no-model|0');

const book = buildUnifiedDeskCandidateBook({
  candidates: [candidate],
  sessionType: 'morning',
  completedBarTime: '2026-06-08T10:15:00.000-04:00',
  canExecuteByCandidateKey: { [key]: true },
});

assert.equal(book.primaryDeskIdea, null);
assert.equal(book.candidates.length, 1);
assert.equal(book.candidates[0]?.setupType, SetupType.NoSetup);
assert.equal(book.candidates[0]?.state, 'blocked');
assert.equal(book.candidates[0]?.tradingModelState, 'blocked');
assert.equal(book.candidates[0]?.canExecute, false);
assert.equal(book.candidates[0]?.entry, null);
assert.equal(book.candidates[0]?.stop, null);
assert.equal(book.candidates[0]?.target1, null);
assert.equal(book.candidates[0]?.target2, null);
assert.equal(book.stateCounts.blocked, 1);
assert.equal(book.stateCounts.executable, 0);
assert.equal(book.tradingModelStateCounts.blocked, 1);
assert.equal(book.tradingModelStateCounts.execution_ready, 0);
assert.equal(book.scoringPolicy.sourceOfConfidence, 'blank_slate_no_model_evidence');
assert.equal(book.scoringPolicy.canExecuteRole, 'disabled_blank_slate');
assert.equal(book.approvalBoundary.changesTradeApprovals, true);
assert.equal(book.approvalBoundary.postsDiscord, false);
assert.equal(book.approvalBoundary.writesSupabase, false);
assert.match(book.notes.join(' '), /Blank-slate mode is active/);

console.log('unified desk candidate book blank-slate contract ok');
