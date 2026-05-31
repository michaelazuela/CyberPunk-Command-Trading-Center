import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildPriceActionReviewComponents } from '../../src/agents/researchDiscordReviewQueueAgent';
import {
  BACKTEST_APPROVAL_MESSAGE,
  DECISION_SAFETY_MESSAGE,
  assertNoExecutableDecisionFields,
  buildModelCandidateDecisionComponents,
  buildModelCandidateDecisionCustomId,
  buildModelCandidateDecisionPostPayload,
  buildModelCandidateDecisionSummary,
  handleModelCandidateDecisionInteraction,
  parseModelCandidateDecisionCustomId,
  parseModelCandidateDecisionsArgs,
  recordModelCandidateDecision,
  renderModelCandidateDecisionMarkdown,
} from './model-candidate-decisions';
import type { ModelCandidateConceptSummary, ModelCandidateReviewLedger } from './model-candidate-ledger';

function concept(overrides: Partial<ModelCandidateConceptSummary> = {}): ModelCandidateConceptSummary {
  return {
    concept: 'time_window_liquidity_delivery',
    conceptTitle: 'Time-Window Liquidity Delivery',
    totalSamplesReviewed: 12,
    humanApprovedCount: 9,
    humanNotApprovedCount: 3,
    approvalRate: 0.75,
    agentRecommendationDistribution: { 'Recommended: future model-candidate review': 12 },
    directionDistribution: { LONG: 8, SHORT: 4 },
    timeWindowDistribution: { morning: 12 },
    outcomeSummary: { favorable_continuation: 8, neutral: 4 },
    chartAvailabilityCount: 12,
    missingDataWarningsCount: 0,
    candidateReadinessStatus: 'candidate_review_recommended',
    deskRecommendation: 'Desk recommendation: candidate review recommended. Human final decision required before any model promotion or implementation.',
    modelCandidateAdvisoryEvidence: {
      sampleCount: 12,
      humanApprovedCount: 9,
      humanNotApprovedCount: 3,
      humanApprovalRate: 0.75,
      agentAssessmentSummary: {
        agreesWithHuman: 9,
        partiallyAgreesWithHuman: 0,
        disagreesWithHuman: 3,
        unclearInsufficientEvidence: 0,
      },
      reviewEvidenceSummary: {
        samplesWithChartEvidence: 12,
        samplesWithExactPngPath: 12,
        samplesWithExactReportPath: 12,
        samplesMissingCharts: 0,
        samplesWithUnknownCharts: 0,
        samplesWithWithheldCharts: 0,
      },
      estimatedGrossContractPnlSummary: {
        rootSymbol: 'MES',
        sampleCountWithPnl: 12,
        sampleCountMissingPnl: 0,
        avgHypotheticalOutcomeDollars: 40,
        status: 'available',
      },
      missingDataWarningCount: 0,
      adverseFirstContradictionCount: 0,
      boundary: 'research_only_not_execution_authority',
    },
    modelCandidateAdvisoryInterpretation: {
      advisoryStatus: 'candidate_review_recommended',
      evidenceBase: 'sufficient_for_review',
      humanReviewSignal: 'supportive',
      agentAssessmentSignal: 'mixed',
      chartEvidenceSignal: 'sufficient',
      pnlSignal: 'supportive_after_core_gates',
      nextAction: 'move_to_formal_model_candidate_backtest_human_final_decision_required',
      reasons: ['Move to formal model-candidate review/backtest. Human final decision required.'],
      boundary: 'research_only_not_execution_authority',
    },
    modelCandidateResearchRecommendation: {
      status: 'candidate_review_recommended',
      recommendationText: 'Move to formal model-candidate review/backtest. Human final decision required.',
      gateResults: {
        sampleCountGate: 'pass',
        humanApprovalRateGate: 'pass',
        missingDataGate: 'pass',
        adverseFirstGate: 'pass',
        chartEvidenceGate: 'pass',
        agentAssessmentGate: 'pass',
        pnlSupportSignal: 'supportive',
      },
      reasons: ['Move to formal model-candidate review/backtest. Human final decision required.'],
      humanFinalDecisionRequired: true,
      boundary: 'research_only_not_execution_authority',
    },
    ...overrides,
  };
}

function ledgerFixture(summaries = [concept()]): ModelCandidateReviewLedger {
  return {
    reportType: 'model_candidate_review_ledger',
    generatedAt: '2026-05-30T20:00:00.000Z',
    from: '2026-05-25',
    to: '2026-05-29',
    symbol: 'MES',
    advisoryOnly: true,
    safety: {
      researchOnly: true,
      approvesExecution: false,
      changesRules: false,
      createsTrades: false,
      writesRag: false,
      writesJournal: false,
      message: 'Research-only. This does not approve execution, change rules, or create trades.',
    },
    thresholds: {
      minimumReviewedSamples: 10,
      minimumApprovalRate: 0.7,
    },
    summary: {
      reviewedSamplesFound: 12,
      approvedCount: 9,
      notApprovedCount: 3,
      ignoredLegacyReviewedSamples: 0,
      humanReviewedSamplesFound: 12,
      reviewedFilesFound: 1,
      reviewedFilesRead: 1,
      ignoredReviewedSamples: 0,
      conceptsReviewed: summaries.length,
      candidateReviewRecommendedConcepts: summaries.filter((summary) => summary.candidateReadinessStatus === 'candidate_review_recommended').length,
    },
    entries: [],
    conceptSummaries: summaries,
    reviewedArtifactDiagnostics: {
      reviewedFilesFound: 1,
      reviewedFilesRead: 1,
      reviewedFilesMalformed: 0,
      reviewedFilesWrongSymbol: 0,
      reviewedSamplesScanned: 12,
      humanReviewedSamplesFound: 12,
      acceptedModelCandidateSamples: 12,
      ignoredReviewedSamples: 0,
      ignoredSamplesByReason: {},
      files: [],
      note: 'fixture diagnostics',
    },
    warnings: [],
    outputPaths: {
      jsonPath: 'model-candidate-review-ledger.json',
      markdownPath: 'model-candidate-review-ledger.md',
    },
  };
}

const ledger = ledgerFixture();
const summary = ledger.conceptSummaries[0];

const components = buildModelCandidateDecisionComponents(ledger, summary);
assert.deepEqual(components.flatMap((row) => row.components.map((button) => button.label)), [
  'Approve for Formal Backtest',
  'Needs More Samples',
  'Reject Candidate',
  'Hold for Review',
]);
assert.ok(components.every((row) => row.components.every((button) => button.custom_id.startsWith('model_candidate_decision|'))));

const priceActionLabels = buildPriceActionReviewComponents('packhash001', 'sample-001')
  .flatMap((row) => row.components.map((button) => button.label));
assert.deepEqual(priceActionLabels, ['Approved', 'Not Approved']);

const payload = buildModelCandidateDecisionPostPayload(ledger, summary);
assert.ok(payload.content.includes('[MODEL CANDIDATE DECISION] Time-Window Liquidity Delivery'));
assert.ok(payload.content.includes(DECISION_SAFETY_MESSAGE));
assert.ok(payload.content.includes('Research recommendation: candidate_review_recommended'));
assert.ok(payload.content.includes('Recommendation: Move to formal model-candidate review/backtest. Human final decision required.'));
assert.ok(payload.content.includes('Human final decision required: yes'));
assert.deepEqual(payload.components.flatMap((row) => row.components.map((button) => button.label)), [
  'Approve for Formal Backtest',
  'Needs More Samples',
  'Reject Candidate',
  'Hold for Review',
]);

const customIds = {
  approved_for_formal_backtest: buildModelCandidateDecisionCustomId({ symbol: 'MES', from: '2026-05-25', to: '2026-05-29', conceptKey: summary.concept, decision: 'approved_for_formal_backtest' }),
  needs_more_samples: buildModelCandidateDecisionCustomId({ symbol: 'MES', from: '2026-05-25', to: '2026-05-29', conceptKey: summary.concept, decision: 'needs_more_samples' }),
  rejected_model_candidate: buildModelCandidateDecisionCustomId({ symbol: 'MES', from: '2026-05-25', to: '2026-05-29', conceptKey: summary.concept, decision: 'rejected_model_candidate' }),
  hold_for_human_review: buildModelCandidateDecisionCustomId({ symbol: 'MES', from: '2026-05-25', to: '2026-05-29', conceptKey: summary.concept, decision: 'hold_for_human_review' }),
} as const;
assert.equal(parseModelCandidateDecisionCustomId(customIds.approved_for_formal_backtest).decision, 'approved_for_formal_backtest');
assert.equal(parseModelCandidateDecisionCustomId(customIds.needs_more_samples).decision, 'needs_more_samples');
assert.equal(parseModelCandidateDecisionCustomId(customIds.rejected_model_candidate).decision, 'rejected_model_candidate');
assert.equal(parseModelCandidateDecisionCustomId(customIds.hold_for_human_review).decision, 'hold_for_human_review');
assert.throws(() => parseModelCandidateDecisionCustomId('model_candidate_decision|week|concept|activate_model'), /Unsupported/);

const temp = mkdtempSync(path.join(tmpdir(), 'model-candidate-decisions-'));
const decisionDir = path.join(temp, 'model-candidate-decisions');
const ledgerPath = path.join(temp, 'model-candidate-ledger.json');
writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');

for (const decision of [
  'approved_for_formal_backtest',
  'needs_more_samples',
  'rejected_model_candidate',
  'hold_for_human_review',
] as const) {
  const result = await recordModelCandidateDecision({
    ledger,
    summary,
    decision,
    decisionDir,
    decisionSource: 'manual',
    reviewedBy: 'test-user',
    decisionTimestamp: '2026-05-30T20:00:00.000Z',
  });
  assert.equal(result.record.humanDecision, decision);
  assert.equal(result.record.safety.activatesModel, false);
  assert.equal(result.record.safety.approvesExecution, false);
  assert.equal(result.record.safety.changesRules, false);
  assert.equal(result.record.safety.changesScanner, false);
  assert.equal(result.record.safety.writesRag, false);
  assert.equal(result.record.safety.writesJournal, false);
  assert.ok(readFileSync(result.jsonPath, 'utf8').includes(decision));
  assert.ok(readFileSync(result.markdownPath, 'utf8').includes(DECISION_SAFETY_MESSAGE));
  if (decision === 'approved_for_formal_backtest') assert.ok(readFileSync(result.markdownPath, 'utf8').includes(BACKTEST_APPROVAL_MESSAGE));
  assertNoExecutableDecisionFields(result.artifact);
  assert.ok(!/"canExecute"|"executionApproved"|"entry"|"stop"|"target"|"targets"|"order"|"alert"|"RAG"|"journal"/.test(JSON.stringify(result.artifact)));
}

const interactionResult = await handleModelCandidateDecisionInteraction({
  customId: customIds.approved_for_formal_backtest,
  ledgerPath,
  decisionDir,
  user: { id: 'discord-user-1', username: 'Michael' },
  reviewedAt: '2026-05-30T20:10:00.000Z',
});
assert.equal(interactionResult.ok, true);
assert.equal(interactionResult.decision, 'approved_for_formal_backtest');
assert.ok(interactionResult.responseContent.includes(DECISION_SAFETY_MESSAGE));
assert.ok(interactionResult.responseContent.includes(BACKTEST_APPROVAL_MESSAGE));
assert.ok(interactionResult.decisionJsonPath && existsSync(interactionResult.decisionJsonPath));

const staleResult = await handleModelCandidateDecisionInteraction({
  customId: 'model_candidate_decision|MES_2026-01-01_2026-01-05|missing_concept|approve_backtest',
  ledgerPath,
  decisionDir,
  user: { id: 'discord-user-1', username: 'Michael' },
});
assert.equal(staleResult.ok, false);
assert.ok(staleResult.responseContent.includes('not found or stale'));
assert.ok(staleResult.responseContent.includes(DECISION_SAFETY_MESSAGE));

const missingLedgerResult = await handleModelCandidateDecisionInteraction({
  customId: customIds.needs_more_samples,
  ledgerPath: path.join(temp, 'missing-ledger.json'),
  decisionDir,
  user: { id: 'discord-user-1', username: 'Michael' },
});
assert.equal(missingLedgerResult.ok, false);
assert.ok(missingLedgerResult.responseContent.includes('Ledger snapshot not found'));

const markdown = renderModelCandidateDecisionMarkdown({
  reportType: 'model_candidate_promotion_decisions',
  updatedAt: '2026-05-30T20:00:00.000Z',
  safety: {
    researchOnly: true,
    activatesModel: false,
    approvesExecution: false,
    changesRules: false,
    createsTrades: false,
    changesScanner: false,
    writesRag: false,
    writesJournal: false,
    message: DECISION_SAFETY_MESSAGE,
  },
  decisions: [],
});
assert.ok(markdown.includes('No concept-level model-candidate decisions have been recorded yet.'));
assert.ok(markdown.includes('No model activation is performed by this artifact.'));

const parsed = parseModelCandidateDecisionsArgs([
  '--from', '2026-01-01',
  '--to', 'today',
  '--symbol', 'MES',
  '--pretty',
  '--dry-run',
  '--decision-dir', decisionDir,
]);
assert.equal(parsed.from, '2026-01-01');
assert.match(parsed.to, /^\d{4}-\d{2}-\d{2}$/);
assert.equal(parsed.symbol, 'MES');
assert.equal(parsed.dryRun, true);

const reviewPackDir = path.join(temp, 'empty-review-packs');
const outcomeReportDir = path.join(temp, 'empty-outcomes');
const chartDir = path.join(temp, 'empty-charts');
const ledgerOutDir = path.join(temp, 'ledger-out');
mkdirSync(reviewPackDir, { recursive: true });
mkdirSync(outcomeReportDir, { recursive: true });
mkdirSync(chartDir, { recursive: true });
const cliSummary = await buildModelCandidateDecisionSummary({
  from: '2026-01-01',
  to: '2026-05-30',
  symbol: 'MES',
  pretty: true,
  json: false,
  dryRun: true,
  reviewPackDir,
  outcomeReportDir,
  chartDir,
  ledgerOutDir,
  decisionDir: path.join(temp, 'cli-decisions'),
  ledgerPath,
  thresholds: {
    minimumReviewedSamples: 10,
    minimumApprovalRate: 0.7,
  },
});
assert.equal(cliSummary.pendingConcepts.length, 1);
assert.equal(cliSummary.artifact.decisions.length, 0);

console.log('Model candidate promotion decisions verified.');
