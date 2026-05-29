import assert from 'node:assert/strict';
import { scoreConditionalCandidateRisk } from './conditionalCandidateRiskAgent';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, type SetupCandidate } from '../types';

function turtleSoupCandidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.TurtleSoup,
    scenarioLabel: 'Turtle Soup LONG',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'High',
    priority: 95,
    entry: 7597,
    stop: 7588.75,
    target1: 7620,
    target2: 7620,
    riskPoints: 8.25,
    invalidation: 'Invalid if reclaimed sell-side structure fails.',
    evidence: [
      'Sell-side sweep at 10:50.',
      'Reclaim at 10:55.',
      'HTF stack aligned LONG.',
    ],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: NoTradeReason.RiskTooWide,
    requiredTrigger: 'Wait for a fresh completed 5M retest.',
    nextAction: 'Manual review only.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

const wideCandidate = turtleSoupCandidate();
const wideBefore = JSON.stringify(wideCandidate);
const wideScore = scoreConditionalCandidateRisk({
  candidate: wideCandidate,
  maxAllowedRiskPoints: 5,
  higherTimeframeAlignment: 'aligned',
});
assert.equal(JSON.stringify(wideCandidate), wideBefore, 'risk scorer must not mutate the candidate');
assert.equal(wideScore.canExecute, false);
assert.equal(wideScore.blockReason, NoTradeReason.RiskTooWide);
assert.equal(wideScore.riskPoints, 8.25);
assert.equal(wideScore.maxAllowedRiskPoints, 5);
assert.equal(wideScore.estimatedRewardPoints, 23);
assert.ok(wideScore.estimatedRiskReward && wideScore.estimatedRiskReward > 2);
assert.ok(wideScore.score <= 64, 'RiskTooWide candidates must stay capped below approved/clean range');
assert.ok(wideScore.reasons.some((reason) => reason.includes('more than 50% above')));
assert.ok(wideScore.reasons.some((reason) => reason.includes('Higher-timeframe stack is aligned')));
assert.ok(wideScore.advisoryNotes.some((note) => note.includes('RiskTooWide remains a hard execution block')));
assert.deepEqual(wideScore.approvalBoundary, {
  riskScoreApprovesTrade: false,
  riskScoreChangesRules: false,
  riskScoreOverridesRisk: false,
  riskScoreCreatesEntry: false,
  riskScoreCreatesTargets: false,
});

const extendedScore = scoreConditionalCandidateRisk({
  candidate: wideCandidate,
  maxAllowedRiskPoints: 5,
  higherTimeframeAlignment: 'aligned',
  priceExtended: true,
  freshRetestCouldTightenRisk: true,
});
assert.ok(extendedScore.score <= 49, 'RiskTooWide plus price extension must cap at high-risk range or lower');
assert.ok(extendedScore.advisoryNotes.some((note) => note.includes('Do not chase')));
assert.ok(extendedScore.advisoryNotes.some((note) => note.includes('tighter retest trigger')));

const insideLimitCandidate = turtleSoupCandidate({
  entry: 7593,
  stop: 7588.75,
  target1: 7602,
  target2: 7605,
  riskPoints: 4.25,
  blockReason: null,
});
const insideScore = scoreConditionalCandidateRisk({
  candidate: insideLimitCandidate,
  maxAllowedRiskPoints: 5,
  higherTimeframeAlignment: 'aligned',
});
assert.ok(insideScore.score >= 80, 'inside-limit aligned candidate can score clean without changing approval logic');
assert.equal(insideScore.canExecute, false, 'risk score never makes a candidate executable');
assert.equal(insideScore.blockReason, null);

const conflictScore = scoreConditionalCandidateRisk({
  candidate: insideLimitCandidate,
  maxAllowedRiskPoints: 5,
  higherTimeframeAlignment: 'conflict',
});
assert.ok(conflictScore.score < insideScore.score);
assert.ok(conflictScore.reasons.some((reason) => reason.includes('conflicts')));

console.log('Conditional candidate risk scoring verified.');
