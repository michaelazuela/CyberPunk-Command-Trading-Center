import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applyHumanReviewToPack,
  assertNoExecutableReviewFields,
  listPendingHumanReviewSamples,
  renderHumanReviewMarkdown,
  summarizeHumanReviewProgress,
} from './researchHumanReviewCaptureAgent';
import type { ResearchSampleReviewPack } from './researchSampleReviewAgent';
import { calculateEstimatedGrossContractPnl } from '../lib/futuresContractMetadata';
import {
  getHumanReviewLabelMetadata,
  isFormalModelCandidateReviewLabel,
} from '../lib/humanReviewLabels';
import {
  parseResearchHumanReviewArgs,
  runResearchHumanReviewCli,
} from '../../tools/automation/research-human-review';

function fixturePack(): ResearchSampleReviewPack {
  const sampleBase = {
    date: '2026-01-02',
    time: '10:00',
    concept: 'time_window_liquidity_delivery' as const,
    conceptTitle: 'Time-Window Liquidity Delivery',
    direction: 'LONG' as const,
    window: '10:00-11:00 NY',
    classification: 'advisory_only' as const,
    advisoryOnly: true as const,
    summary: 'Defined window showed liquidity-delivery behavior.',
    whyAdvisoryOnly: 'Approved gates did not independently pass.',
    model1Overlap: false,
    raidReclaimOverlap: false,
    researchDetectorReason: 'Research-only detector reason.',
    warningFailureReason: 'Research-only warning.',
    dataQualityNotes: ['Fixture data.'],
    sampleSourceReportPath: 'fixture/research-backfill.json',
    agentConfidence: 'high' as const,
    agentReason: 'Research structure exists, but execution is not approved.',
    agentEvidence: ['Fixture evidence.'],
    agentConcerns: ['Agent inspection cannot approve execution.'],
    agentRecommendedNextStep: 'continue_tracking' as const,
    agentApprovalBoundary: {
      agentApprovesTrade: false as const,
      agentChangesRules: false as const,
      agentCreatesEntry: false as const,
      agentCreatesTargets: false as const,
      agentPromotesModel: false as const,
    },
    humanInspectionLabel: null,
    humanConfidence: null,
    humanReason: null,
    humanNotes: null,
    humanReviewedAt: null,
    humanReviewer: null,
    agentHumanAgreement: null,
    disagreementReason: null,
    finalReviewLabel: null,
    finalReviewNotes: null,
  };

  return {
    reportType: 'research_sample_review_pack',
    generatedAt: '2026-05-29T20:41:56.969Z',
    instrument: 'MES',
    concept: 'all',
    requestedSampleSize: 2,
    selectedSampleCount: 2,
    sourceReportPaths: ['fixture/research-backfill.json'],
    sampleSourceMode: 'full_candidate_events',
    executiveSummary: ['Research-only fixture.'],
    conceptSummaries: [],
    sampleSelectionMethod: ['Fixture selection.'],
    samples: [
      {
        sampleId: 'time_window_liquidity_delivery-001',
        agentInspectionLabel: 'keep_advisory',
        ...sampleBase,
      },
      {
        sampleId: 'time_window_liquidity_delivery-002',
        agentInspectionLabel: 'keep_advisory',
        date: '2026-02-03',
        ...sampleBase,
      },
    ],
    possibleExistingModelMappingReview: [],
    advisoryOnlyFindings: [],
    humanReviewQuestions: [],
    doNotChangeYetItems: [],
    approvalBoundary: {
      sampleReviewApprovesTrade: false,
      sampleReviewChangesRules: false,
      sampleReviewCreatesEntry: false,
      sampleReviewCreatesTargets: false,
      sampleReviewPromotesModel: false,
      sampleReviewWritesRagMemory: false,
    },
    markdown: 'fixture',
  };
}

const parsed = parseResearchHumanReviewArgs([
  '--review-pack', 'pack.json',
  '--sample-id', 'time_window_liquidity_delivery-001',
  '--label', 'keep_advisory',
  '--confidence', 'medium',
  '--reviewer', 'Michael',
  '--notes', 'Good advisory context.',
  '--pretty',
]);
assert.equal(parsed.reviewPack, 'pack.json');
assert.equal(parsed.label, 'keep_advisory');
assert.equal(parsed.confidence, 'medium');
assert.equal(parsed.reviewer, 'Michael');
assert.equal(parsed.pretty, true);

assert.equal(isFormalModelCandidateReviewLabel('approved_for_future_model_candidate_review'), true);
assert.equal(isFormalModelCandidateReviewLabel('not_approved_for_future_model_candidate_review'), true);
assert.equal(isFormalModelCandidateReviewLabel('new_model_candidate_review'), false);
assert.equal(isFormalModelCandidateReviewLabel('keep_advisory'), false);
const unknownLabel = getHumanReviewLabelMetadata('approve_trade');
assert.equal(unknownLabel.formalLedgerEligible, false);
assert.equal(unknownLabel.countsTowardCandidateGates, false);
assert.equal(unknownLabel.suggestedNextAction, 'manual_review_required');

const pack = fixturePack();
const before = JSON.stringify(pack);
const agreementResult = applyHumanReviewToPack({
  reviewPack: pack,
  sampleId: 'time_window_liquidity_delivery-001',
  label: 'keep_advisory',
  confidence: 'medium',
  reviewer: 'Michael',
  notes: 'Good advisory context, but not enough for rule discussion.',
  reviewedAt: '2026-05-29T22:00:00.000Z',
  estimatedGrossContractPnl: calculateEstimatedGrossContractPnl({
    outcome: {
      maxFavorableExcursionPoints: 23,
      maxAdverseExcursionPoints: 4.25,
      thresholdOnePoints: 6,
      thresholdTwoPoints: 10,
      adverseThresholdPoints: 6,
      firstMeaningfulMove: 'favorable',
      hypotheticalOutcomeOverlay: {
        firstResolvedEvent: 'favorable_threshold_two',
        hypotheticalOutcomeLabel: 'favorable_continuation',
      },
    } as any,
    sampleSymbol: 'MESU6',
  }),
});

assert.equal(JSON.stringify(pack), before);
assert.equal(agreementResult.sample.humanInspectionLabel, 'keep_advisory');
assert.equal(agreementResult.sample.humanConfidence, 'medium');
assert.equal(agreementResult.sample.humanReviewer, 'Michael');
assert.equal(agreementResult.sample.humanReviewedAt, '2026-05-29T22:00:00.000Z');
assert.equal(agreementResult.sample.agentHumanAgreement, true);
assert.equal(agreementResult.sample.disagreementReason, null);
assert.equal(agreementResult.sample.finalReviewLabel, 'keep_advisory');
assert.ok(agreementResult.sample.finalReviewNotes?.includes('no execution approval'));
assert.equal(agreementResult.sample.estimatedGrossContractPnl?.rootSymbol, 'MES');
assert.equal(agreementResult.sample.estimatedGrossContractPnl?.hypotheticalOutcomeDollars, 50);
assert.equal(agreementResult.updatedPack.samples[1].humanInspectionLabel, null);
assert.ok(agreementResult.updatedPack.samples.every((sample) => sample.advisoryOnly === true));
assert.ok(agreementResult.updatedPack.samples.every((sample) => sample.agentApprovalBoundary.agentApprovesTrade === false));
assertNoExecutableReviewFields(agreementResult.updatedPack);

const disagreementResult = applyHumanReviewToPack({
  reviewPack: pack,
  sampleId: 'time_window_liquidity_delivery-001',
  label: 'reject',
  confidence: 'high',
  reviewer: 'Michael',
  notes: 'Reject this sample for future review.',
  reviewedAt: '2026-05-29T22:05:00.000Z',
});
assert.equal(disagreementResult.sample.agentHumanAgreement, false);
assert.ok(disagreementResult.sample.disagreementReason?.includes('Agent labeled this sample'));
assert.equal(disagreementResult.sample.finalReviewLabel, 'reject');

const newModelCandidateResult = applyHumanReviewToPack({
  reviewPack: pack,
  sampleId: 'time_window_liquidity_delivery-001',
  label: 'new_model_candidate_review',
  confidence: 'medium',
  reviewer: 'Michael',
  notes: 'Distinct research behavior worth future model-design discussion, not execution approval.',
  reviewedAt: '2026-05-29T22:06:00.000Z',
});
assert.equal(newModelCandidateResult.sample.humanInspectionLabel, 'new_model_candidate_review');
assert.equal(newModelCandidateResult.sample.finalReviewLabel, 'new_model_candidate_review');
assert.equal(newModelCandidateResult.sample.agentHumanAgreement, false);
assert.equal(newModelCandidateResult.sample.agentAssessment?.researchUsefulness, 'needs_chart');
assert.ok(newModelCandidateResult.sample.finalReviewNotes?.includes('no execution approval'));
assert.ok(newModelCandidateResult.updatedPack.samples.every((sample) => sample.advisoryOnly === true));
assertNoExecutableReviewFields(newModelCandidateResult.updatedPack);

const needsChartResult = applyHumanReviewToPack({
  reviewPack: pack,
  sampleId: 'time_window_liquidity_delivery-001',
  label: 'needs_more_chart_evidence',
  confidence: 'medium',
  reviewer: 'Michael',
  notes: 'Need clearer chart artifact before deciding.',
  reviewedAt: '2026-05-29T22:07:00.000Z',
});
assert.equal(needsChartResult.sample.humanInspectionLabel, 'needs_more_chart_evidence');
assert.equal(getHumanReviewLabelMetadata(needsChartResult.sample.humanInspectionLabel).formalLedgerEligible, false);

const pending = listPendingHumanReviewSamples(agreementResult.updatedPack);
assert.equal(pending.length, 1);
assert.equal(pending[0].sampleId, 'time_window_liquidity_delivery-002');

const summary = summarizeHumanReviewProgress(agreementResult.updatedPack);
assert.equal(summary.totalSamples, 2);
assert.equal(summary.reviewedSamples, 1);
assert.equal(summary.pendingSamples, 1);
assert.equal(summary.agreementCount, 1);
assert.equal(summary.disagreementCount, 0);
assert.equal(summary.labelCounts.keep_advisory, 1);
assert.equal(summary.advisoryOnlyConfirmed, true);

const markdown = renderHumanReviewMarkdown(agreementResult.updatedPack);
assert.ok(markdown.includes('## 2. Human Review Progress'));
assert.ok(markdown.includes('## 3. Agent/Human Agreement Summary'));
assert.ok(markdown.includes('## 7. Advisory-Only Boundary'));
assert.ok(markdown.includes('No entries, stops, targets'));
assert.ok(markdown.includes('Estimated Gross Contract P/L, 1 Contract'));
assert.ok(markdown.includes('Contract: MES - Micro E-mini S&P 500'));
assert.ok(markdown.includes('MFE: +23.00 pts / +92 ticks / +$115.00 gross'));
assert.ok(markdown.includes('Hypothetical Outcome: +10.00 pts / +40 ticks / +$50.00 gross'));
assert.ok(markdown.includes('Human Review Label:'));
assert.ok(markdown.includes('- Category: advisory'));
assert.ok(markdown.includes('- Counts Toward Formal Candidate Gates: No'));
assert.ok(markdown.includes('- Suggested Next Action: continue_observing'));

const partialPack = fixturePack();
const partialResult = applyHumanReviewToPack({
  reviewPack: partialPack,
  sampleId: 'time_window_liquidity_delivery-001',
  label: 'keep_advisory',
  confidence: 'medium',
  reviewer: 'Michael',
  reviewedAt: '2026-05-29T22:03:00.000Z',
});
assert.equal(partialResult.sample.estimatedGrossContractPnl?.status, 'unavailable_no_outcome_math');
assert.ok(renderHumanReviewMarkdown(partialResult.updatedPack).includes('Hypothetical Outcome: Not available - no defined hypothetical exit model.'));

const unknownPack = { ...fixturePack(), instrument: 'YM' };
const unknownResult = applyHumanReviewToPack({
  reviewPack: unknownPack,
  sampleId: 'time_window_liquidity_delivery-001',
  label: 'keep_advisory',
  confidence: 'medium',
  reviewer: 'Michael',
  reviewedAt: '2026-05-29T22:04:00.000Z',
});
assert.equal(unknownResult.sample.estimatedGrossContractPnl?.status, 'unavailable_unknown_contract');
assert.equal(unknownResult.sample.estimatedGrossContractPnl?.hypotheticalOutcomeDollars, undefined);

const badPack = fixturePack();
(badPack.samples[0] as unknown as { entry: number }).entry = 7597;
assert.throws(() => assertNoExecutableReviewFields(badPack), /prohibited executable field/);
assert.throws(
  () => applyHumanReviewToPack({
    reviewPack: badPack,
    sampleId: 'time_window_liquidity_delivery-001',
    label: 'keep_advisory',
    confidence: 'medium',
    reviewer: 'Michael',
  }),
  /prohibited executable field/,
);

for (const sample of agreementResult.updatedPack.samples) {
  const keys = Object.keys(sample);
  assert.equal(keys.includes('entry'), false);
  assert.equal(keys.includes('stop'), false);
  assert.equal(keys.includes('target'), false);
  assert.equal(keys.includes('canExecute'), false);
}

const temp = mkdtempSync(join(tmpdir(), 'research-human-review-'));
const reviewPackPath = join(temp, 'review-pack.json');
writeFileSync(reviewPackPath, `${JSON.stringify(fixturePack(), null, 2)}\n`, 'utf8');
await runResearchHumanReviewCli([
  '--review-pack', reviewPackPath,
  '--sample-id', 'time_window_liquidity_delivery-001',
  '--label', 'keep_advisory',
  '--confidence', 'medium',
  '--reviewer', 'Michael',
  '--notes', 'CLI fixture review.',
  '--pretty',
]);
const reviewedPath = join(temp, 'review-pack.reviewed.json');
assert.equal(existsSync(reviewedPath), true);
assert.equal(JSON.parse(readFileSync(reviewPackPath, 'utf8')).samples[0].humanInspectionLabel, null);
assert.equal(JSON.parse(readFileSync(reviewedPath, 'utf8')).samples[0].humanInspectionLabel, 'keep_advisory');

await runResearchHumanReviewCli([
  '--review-pack', reviewPackPath,
  '--sample-id', 'time_window_liquidity_delivery-001',
  '--label', 'reject',
  '--confidence', 'high',
  '--reviewer', 'Michael',
  '--overwrite',
  '--pretty',
]);
assert.equal(JSON.parse(readFileSync(reviewPackPath, 'utf8')).samples[0].humanInspectionLabel, 'reject');

await runResearchHumanReviewCli(['--review-pack', reviewedPath, '--list-pending', '--pretty']);
await runResearchHumanReviewCli(['--review-pack', reviewedPath, '--summary', '--pretty']);

console.log('Research human review capture agent verified.');
