import assert from 'node:assert/strict';
import { validateDeskWorkflowOutput } from './deskWorkflowValidationAgent';

const researchExecutable = validateDeskWorkflowOutput({
  scope: 'research',
  payload: {
    sampleId: 'research-1',
    canExecute: true,
    entry: 7420,
    stop: 7410,
    t1: 7435,
    t2: 7440,
  },
});
assert.equal(researchExecutable.ok, false);
assert.ok(researchExecutable.findings.some((finding) => finding.code === 'research_executable_field'));
assert.equal(researchExecutable.approvalBoundary.validationApprovesTrade, false);
assert.equal(researchExecutable.approvalBoundary.validationCreatesEntry, false);

const discordDrift = validateDeskWorkflowOutput({
  scope: 'discord_report',
  deskStateCandidateKeys: ['long-setup-1'],
  discordCandidateKeys: ['long-setup-1', 'invented-short'],
});
assert.equal(discordDrift.ok, false);
assert.ok(discordDrift.findings.some((finding) => finding.code === 'discord_candidate_not_in_desk_state'));

const missingChart = validateDeskWorkflowOutput({
  scope: 'discord_report',
  requiresChartPng: true,
  chartPngPath: null,
});
assert.equal(missingChart.ok, false);
assert.ok(missingChart.findings.some((finding) => finding.code === 'missing_chart_png'));

const missingButtons = validateDeskWorkflowOutput({
  scope: 'model_candidate_review',
  requiresRagButtons: true,
  ragButtonCount: 0,
});
assert.equal(missingButtons.ok, false);
assert.ok(missingButtons.findings.some((finding) => finding.code === 'missing_rag_buttons'));

const htfDataLimited = validateDeskWorkflowOutput({
  scope: 'discord_report',
  htfContextReliability: 'data_limited',
  htfStructuralClaims: ['15M bullish structure confirmed'],
});
assert.equal(htfDataLimited.ok, false);
assert.ok(htfDataLimited.findings.some((finding) => finding.code === 'htf_claim_without_sufficiency'));

const plOnlyPromotion = validateDeskWorkflowOutput({
  scope: 'model_candidate_review',
  modelPromotion: {
    requested: true,
    evidenceIncludesPnl: true,
    evidenceIncludesHumanReview: false,
    humanApproved: false,
  },
});
assert.equal(plOnlyPromotion.ok, false);
assert.ok(plOnlyPromotion.findings.some((finding) => finding.code === 'pl_only_model_promotion'));
assert.ok(plOnlyPromotion.findings.some((finding) => finding.code === 'human_review_required'));

const outcomeAuthorityDrift = validateDeskWorkflowOutput({
  scope: 'discord_report',
  outcomeButtonsApproveTrade: true,
});
assert.equal(outcomeAuthorityDrift.ok, false);
assert.ok(outcomeAuthorityDrift.findings.some((finding) => finding.code === 'outcome_button_authority_drift'));

const cleanInput = {
  scope: 'discord_report',
  deskStateCandidateKeys: ['long-setup-1'],
  discordCandidateKeys: ['long-setup-1'],
  requiresChartPng: true,
  chartPngPath: 'reports/chart.png',
  requiresRagButtons: true,
  ragButtonCount: 3,
  htfContextReliability: 'sufficient',
  htfStructuralClaims: ['15M bullish structure confirmed'],
  outcomeButtonsApproveTrade: false,
} as const;
const clean = validateDeskWorkflowOutput(cleanInput);
assert.equal(clean.ok, true);
assert.deepEqual(clean.findings, []);

assert.deepEqual(
  validateDeskWorkflowOutput(cleanInput),
  validateDeskWorkflowOutput(cleanInput),
  'validation must be deterministic for the same input state',
);

console.log('Desk workflow validation agent boundary checks verified.');
