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
assert.equal(executableBook.primaryDeskIdea?.tradingModelState, 'execution_ready');
assert.equal(executableBook.primaryDeskIdea?.canExecute, true);
assert.equal(executableBook.primaryDeskIdea?.humanReviewOnly, false);
assert.equal(executableBook.primaryDeskIdea?.advisoryScoringExcluded, true);
assert.equal(executableBook.scoringPolicy.excludesGeminiAdvisory, true);
assert.equal(executableBook.scoringPolicy.canExecuteRole, 'compatibility_final_execution_flag_only');
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
assert.equal(rankedBook.primaryDeskIdea?.tradingModelState, 'review_ticket');
assert.equal(rankedBook.candidates[1].state, 'no_chase');
assert.equal(rankedBook.candidates[1].tradingModelState, 'ranked_candidate');
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
assert.equal(blockedBook.notes.some((note) => note.includes('Gemini/advisory narrative is excluded')), true);

const invalidStopSweep = candidate({
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'invalid-stop-sweep',
  direction: 'LONG',
  priority: 100,
  modelConfidenceScore: 100,
  decisionQualityScore: 100,
  executionStatus: ExecutionStatus.Blocked,
  blockReason: NoTradeReason.InvalidStopLocation,
  missingEvidence: ['Stop is on the wrong side of the protected 5M structure.'],
});
const validSweepLead = candidate({
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'valid-sweep-lead',
  direction: 'LONG',
  priority: 88,
  modelConfidenceScore: 88,
  decisionQualityScore: 88,
  executionStatus: ExecutionStatus.Conditional,
  blockReason: NoTradeReason.EntryTriggerPending,
  requiredTrigger: 'Wait for completed 5M retest/re-entry proof.',
});
const turtleSoupBlockedRisk = candidate({
  setupType: SetupType.TurtleSoup,
  scenarioLabel: 'turtle-risk',
  direction: 'LONG',
  priority: 90,
  modelConfidenceScore: 90,
  decisionQualityScore: 90,
  executionStatus: ExecutionStatus.Blocked,
  blockReason: NoTradeReason.RiskTooWide,
  missingEvidence: ['Actual entry-to-stop risk exceeds the configured max risk.'],
});

const sweepPenaltyBook = buildUnifiedDeskCandidateBook({
  sessionType: 'morning',
  candidates: [invalidStopSweep, turtleSoupBlockedRisk, validSweepLead],
});
const invalidStopSweepItem = sweepPenaltyBook.candidates.find((item) => item.candidateKey.includes('invalid-stop-sweep'));
const turtleSoupRiskItem = sweepPenaltyBook.candidates.find((item) => item.candidateKey.includes('turtle-risk'));
const validSweepLeadItem = sweepPenaltyBook.candidates.find((item) => item.candidateKey.includes('valid-sweep-lead'));

assert.equal(sweepPenaltyBook.primaryDeskIdea?.candidateKey, 'SweepMssFvgRetrace|valid-sweep-lead|LONG|100.00|2');
assert.equal(validSweepLeadItem?.state, 'human_review');
assert.equal(validSweepLeadItem?.canExecute, false);
assert.equal(validSweepLeadItem?.entry, validSweepLead.entry);
assert.equal(validSweepLeadItem?.stop, validSweepLead.stop);
assert.equal(validSweepLeadItem?.target1, validSweepLead.target1);
assert.equal(validSweepLeadItem?.target2, validSweepLead.target2);
assert.equal(turtleSoupRiskItem?.setupType, SetupType.TurtleSoup);
assert.equal(turtleSoupRiskItem?.state, 'blocked');
assert.equal(invalidStopSweepItem?.state, 'blocked');
assert.ok(
  (turtleSoupRiskItem?.score || 0) > (invalidStopSweepItem?.score || 0),
  'invalid-stop Sweep penalty should demote only the blocked invalid-stop Sweep row inside blocked candidates',
);
assert.equal(sweepPenaltyBook.approvalBoundary.changesCanExecute, false);
assert.equal(sweepPenaltyBook.approvalBoundary.changesEntryStopTargets, false);
assert.equal(sweepPenaltyBook.approvalBoundary.changesRiskRules, false);
assert.equal(sweepPenaltyBook.approvalBoundary.postsDiscord, false);
assert.equal(sweepPenaltyBook.approvalBoundary.writesSupabase, false);

const missingPlanGeometry = candidate({
  setupType: SetupType.IntradayMssMicroContinuation,
  scenarioLabel: 'missing-plan',
  entry: null,
  stop: null,
  target1: null,
  target2: null,
  modelConfidenceScore: null,
  decisionQualityScore: 87,
  rankScore: 99,
  confidence: 'Low',
  evidence: ['Completed 5M proof with 15M context support.'],
});
const missingPlanBook = buildUnifiedDeskCandidateBook({
  sessionType: 'morning',
  candidates: [missingPlanGeometry],
});
assert.equal(missingPlanBook.primaryDeskIdea?.tradingModelState, 'blocked_missing_plan_geometry');
assert.equal(missingPlanBook.primaryDeskIdea?.confidenceScore, 87);
assert.equal(missingPlanBook.primaryDeskIdea?.confidenceSource, 'decision_quality_score');
assert.equal(missingPlanBook.tradingModelStateCounts.blocked_missing_plan_geometry, 1);

const missingProof = candidate({
  scenarioLabel: 'missing-proof',
  modelConfidenceScore: null,
  decisionQualityScore: undefined,
  rankScore: 72,
  evidence: ['15M context support only.'],
  requiredTrigger: 'Waiting for trigger.',
});
const missingProofBook = buildUnifiedDeskCandidateBook({
  sessionType: 'morning',
  candidates: [missingProof],
});
assert.equal(missingProofBook.primaryDeskIdea?.tradingModelState, 'blocked_missing_5m_proof');
assert.equal(missingProofBook.primaryDeskIdea?.confidenceSource, 'rank_score');

console.log('Unified Desk Candidate Book audit contract verified.');
