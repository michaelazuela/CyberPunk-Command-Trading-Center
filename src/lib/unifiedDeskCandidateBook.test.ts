import assert from 'node:assert/strict';
import { ExecutionStatus, NoTradeReason, SetupCandidate, SetupCandidateStatus, SetupType } from '../types';
import { buildUnifiedDeskCandidateBook } from './unifiedDeskCandidateBook';

function candidate(overrides: Partial<SetupCandidate>): SetupCandidate {
  return {
    setupType: SetupType.IntradayMssMicroContinuation,
    scenarioLabel: 'fixture',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'Medium',
    priority: 90,
    entry: 100,
    stop: 96,
    target1: 106,
    target2: 108,
    riskPoints: 4,
    modelConfidenceScore: 65,
    evidence: ['Completed 5M MSS and 15M context support.'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Wait for completed 5M retest proof.',
    nextAction: 'Human review only.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

const strictCandidate = candidate({
  setupType: SetupType.TurtleSoup,
  scenarioLabel: 'strict',
  confidence: 'High',
  priority: 95,
  executionStatus: ExecutionStatus.Executable,
  modelConfidenceScore: 88,
  requiredTrigger: 'Reclaim confirmation after sweep.',
  nextAction: 'Existing deterministic gates passed.',
});

const strictKey = 'TurtleSoup|strict|LONG|100.00|0';
const executableBook = buildUnifiedDeskCandidateBook({
  sessionType: 'morning',
  candidates: [strictCandidate],
  canExecuteByCandidateKey: { [strictKey]: true },
});

assert.equal(executableBook.primaryDeskIdea?.state, 'executable');
assert.equal(executableBook.primaryDeskIdea?.canExecute, true);
assert.equal(executableBook.primaryDeskIdea?.humanReviewOnly, false);
assert.equal(executableBook.approvalBoundary.changesCanExecute, false);
assert.equal(executableBook.approvalBoundary.postsDiscord, false);
assert.equal(executableBook.approvalBoundary.writesSupabase, false);

const highConfidenceReview = candidate({
  setupType: SetupType.IntradayMssMicroContinuation,
  scenarioLabel: 'review',
  modelConfidenceScore: 95,
  decisionQualityScore: 90,
  requiredTrigger: 'Completed 5M FVG retest/rejection required.',
  nextAction: 'Human-review ticket only; canExecute remains internal.',
});
const highConfidenceNoChase = candidate({
  setupType: SetupType.OpeningDriveFvgContinuation,
  scenarioLabel: 'late',
  modelConfidenceScore: 100,
  decisionQualityScore: 100,
  requiredTrigger: 'Preferred entry was missed. Do not chase. Waiting for new retest or next setup.',
  nextAction: 'No chase.',
});

const rankedBook = buildUnifiedDeskCandidateBook({
  sessionType: 'morning',
  completedBarTime: '2026-07-01T10:30:00.0000000',
  candidates: [highConfidenceNoChase, highConfidenceReview],
});

assert.equal(rankedBook.primaryDeskIdea?.candidateKey, 'IntradayMssMicroContinuation|review|LONG|100.00|1');
assert.equal(rankedBook.primaryDeskIdea?.state, 'human_review');
assert.equal(rankedBook.candidates[1].state, 'no_chase');
assert.equal(rankedBook.candidates[1].nextProofRequired[0], 'Wait for a fresh completed 5M retest/re-entry proof or next setup.');
assert.equal(rankedBook.primaryDeskIdea?.canExecute, false);

const afterLunchInWindow = candidate({
  setupType: SetupType.AfterLunchDriveFvgContinuation,
  scenarioLabel: 'in-window',
  direction: 'SHORT',
  entry: 7566.5,
  stop: 7573,
  target1: 7557,
  target2: 7554,
  priority: 97,
  requiredTrigger: '5M FVG retest/mitigation during the 12:30-13:30 ET review window.',
});
const afterLunchOutsideWindow = candidate({
  setupType: SetupType.AfterLunchDriveFvgContinuation,
  scenarioLabel: 'outside-window',
  direction: 'SHORT',
  entry: 7566.5,
  stop: 7573,
  target1: 7557,
  target2: 7554,
  priority: 97,
  requiredTrigger: '5M FVG retest/mitigation during the 12:30-13:30 ET review window.',
});

const afterLunchValidBook = buildUnifiedDeskCandidateBook({
  sessionType: 'lunch',
  completedBarTime: '2026-07-01T13:10:00.0000000',
  candidates: [afterLunchInWindow],
});
assert.equal(afterLunchValidBook.primaryDeskIdea?.state, 'human_review');
assert.equal(afterLunchValidBook.primaryDeskIdea?.family, 'after_lunch_drive_continuation');

const afterLunchBlockedBook = buildUnifiedDeskCandidateBook({
  sessionType: 'morning',
  completedBarTime: '2026-07-01T10:00:00.0000000',
  candidates: [afterLunchOutsideWindow],
});
assert.equal(afterLunchBlockedBook.primaryDeskIdea?.state, 'blocked');
assert.match(afterLunchBlockedBook.primaryDeskIdea?.blockers.join(' ') || '', /isolated to lunch/);

const blockedWithPlan = candidate({
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'risk-wide',
  blockReason: NoTradeReason.RiskTooWide,
  executionStatus: ExecutionStatus.Blocked,
  missingEvidence: ['Actual entry-to-stop risk exceeds the configured max risk.'],
});
const blockedBook = buildUnifiedDeskCandidateBook({
  sessionType: 'morning',
  candidates: [blockedWithPlan],
});

assert.equal(blockedBook.primaryDeskIdea?.state, 'blocked');
assert.equal(blockedBook.primaryDeskIdea?.setupType, SetupType.SweepMssFvgRetrace);
assert.ok(blockedBook.primaryDeskIdea?.blockers.includes('Actual entry-to-stop risk exceeds the configured max risk.'));
assert.equal(blockedBook.notes.some((note) => note.includes('automatic execution approval')), true);

console.log('Unified Desk Candidate Book audit contract verified.');
