import assert from 'node:assert/strict';

const FORMAL_BACKTEST_RESEARCH_CONTRACT = {
  allowedRecommendationText: 'Move to formal model-candidate review/backtest. Human final decision required.',
  prohibitedWording: [
    'approved model',
    'live model',
    'trade approved',
    'profitable system',
    'activate model',
    'deploy',
    'actual P/L',
    'net P/L',
  ],
  gateRequirements: {
    sampleCountGate: 'required',
    humanApprovalRateGate: 'required',
    missingDataGate: 'required',
    adverseFirstGate: 'required',
    chartEvidenceGate: 'required',
    agentAssessmentGate: 'required',
    pnlSupportSignal: 'context_context_only',
  },
  approvalBoundary: {
    recommendationApprovesExecution: false,
    recommendationApprovesDiscordReview: false,
    recommendationApprovesDashboardOutput: false,
    recommendationApprovesAgentAssessment: false,
    estimatedPnlCanPromoteAlone: false,
    canExecute: false,
  },
  boundary: 'research_only_not_execution_authority',
};

assert.equal(FORMAL_BACKTEST_RESEARCH_CONTRACT.boundary, 'research_only_not_execution_authority');
assert.equal(
  FORMAL_BACKTEST_RESEARCH_CONTRACT.allowedRecommendationText,
  'Move to formal model-candidate review/backtest. Human final decision required.',
);
assert.equal(FORMAL_BACKTEST_RESEARCH_CONTRACT.gateRequirements.pnlSupportSignal, 'context_context_only');
assert.equal(FORMAL_BACKTEST_RESEARCH_CONTRACT.approvalBoundary.recommendationApprovesExecution, false);
assert.equal(FORMAL_BACKTEST_RESEARCH_CONTRACT.approvalBoundary.estimatedPnlCanPromoteAlone, false);
assert.equal(FORMAL_BACKTEST_RESEARCH_CONTRACT.approvalBoundary.canExecute, false);

const safeReportText = [
  FORMAL_BACKTEST_RESEARCH_CONTRACT.allowedRecommendationText,
  'Research-only evidence. Not approved for live execution.',
  'Estimated gross contract P/L is context context only.',
].join('\n');

for (const phrase of FORMAL_BACKTEST_RESEARCH_CONTRACT.prohibitedWording) {
  assert.equal(safeReportText.toLowerCase().includes(phrase.toLowerCase()), false, `Unsafe wording leaked: ${phrase}`);
}

console.log('Formal backtest research contract verified.');
