import assert from 'node:assert/strict';

const RESEARCH_CONCEPT_STABILITY_BOUNDARY = {
  reportType: 'research_concept_stability',
  boundary: 'research_only_not_execution_authority',
  stabilityInputs: [
    'reviewed_sample_count',
    'human_review_labels',
    'agent_assessment_summary',
    'chart_report_evidence',
    'estimated_gross_contract_pnl',
    'missing_data_warnings',
    'adverse_first_contradictions',
  ],
  outputAuthority: {
    changesTradingRules: false,
    changesSetupDetection: false,
    changesRiskScoring: false,
    changesScannerBehavior: false,
    changesBridgeBehavior: false,
    changesLiveExecutionBehavior: false,
    approvesExecution: false,
    setsCanExecute: false,
    activatesModel: false,
  },
};

assert.equal(RESEARCH_CONCEPT_STABILITY_BOUNDARY.boundary, 'research_only_not_execution_authority');
assert.ok(RESEARCH_CONCEPT_STABILITY_BOUNDARY.stabilityInputs.includes('reviewed_sample_count'));
assert.ok(RESEARCH_CONCEPT_STABILITY_BOUNDARY.stabilityInputs.includes('estimated_gross_contract_pnl'));
assert.equal(RESEARCH_CONCEPT_STABILITY_BOUNDARY.outputAuthority.changesTradingRules, false);
assert.equal(RESEARCH_CONCEPT_STABILITY_BOUNDARY.outputAuthority.changesScannerBehavior, false);
assert.equal(RESEARCH_CONCEPT_STABILITY_BOUNDARY.outputAuthority.approvesExecution, false);
assert.equal(RESEARCH_CONCEPT_STABILITY_BOUNDARY.outputAuthority.setsCanExecute, false);
assert.equal(RESEARCH_CONCEPT_STABILITY_BOUNDARY.outputAuthority.activatesModel, false);

console.log('Research concept stability boundary verified.');
