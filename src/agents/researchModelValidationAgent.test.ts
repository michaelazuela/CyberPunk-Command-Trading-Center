import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertNoExecutableValidationFields,
  runResearchModelValidation,
  type ResearchConceptValidation,
} from './researchModelValidationAgent';
import type { ResearchOutcomeMathReport } from './researchOutcomeMathAgent';
import type {
  ResearchReviewSample,
  ResearchSampleReviewPack,
} from './researchSampleReviewAgent';
import {
  parseResearchModelValidationArgs,
  runResearchModelValidationCli,
} from '../../tools/automation/research-model-validation';

const hypotheticalOverlaySummary = {
  favorableContinuationCount: 1,
  favorableContinuationRate: 1,
  partialFavorableCount: 0,
  partialFavorableRate: 0,
  adverseFirstCount: 0,
  adverseFirstRate: 0,
  neutralNoResolutionCount: 0,
  neutralNoResolutionRate: 0,
  ambiguousSameBarCount: 0,
  ambiguousSameBarRate: 0,
  insufficientDataCount: 0,
  insufficientDataRate: 0,
};

function outcomeReport(concepts: ResearchOutcomeMathReport['conceptSummaries']): ResearchOutcomeMathReport {
  return {
    reportType: 'research_outcome_math',
    generatedAt: '2026-05-29T20:00:00.000Z',
    sourcePath: 'fixture-outcome.json',
    instrument: 'MES',
    advisoryOnly: true,
    executionApproved: false,
    thresholds: {
      thresholdOnePoints: 4,
      thresholdTwoPoints: 8,
      adverseThresholdPoints: 4,
      observationWindowBars: 12,
    },
    summary: {
      totalCandidates: concepts.reduce((sum, concept) => sum + concept.totalCandidates, 0),
      evaluatedCandidates: concepts.reduce((sum, concept) => sum + concept.evaluatedCandidates, 0),
      insufficientDataCandidates: concepts.reduce((sum, concept) => sum + concept.totalCandidates - concept.evaluatedCandidates, 0),
      thresholdOneTouchRate: 0.9,
      thresholdTwoTouchRate: 0.7,
      adverseThresholdTouchRate: 0.3,
      favorableFirstRate: 0.7,
      adverseFirstRate: 0.2,
      hypotheticalOverlay: hypotheticalOverlaySummary,
    },
    conceptSummaries: concepts,
    candidateOutcomes: concepts.flatMap((concept) => Array.from({ length: concept.totalCandidates }, (_, index) => ({
      candidateId: `${concept.concept}-${index + 1}`,
      date: '2026-05-28',
      time: '10:00',
      instrument: 'MES',
      concept: concept.concept,
      direction: 'LONG',
      window: 'fixture',
      classification: 'advisory_only',
      advisoryOnly: true,
      observationWindowBars: 12,
      observationWindowMinutes: 60,
      referencePrice: 100,
      maxFavorableExcursionPoints: concept.medianMfePoints,
      maxAdverseExcursionPoints: concept.medianMaePoints,
      maxFavorableExcursionTicks: concept.medianMfePoints === null ? null : concept.medianMfePoints * 4,
      maxAdverseExcursionTicks: concept.medianMaePoints === null ? null : concept.medianMaePoints * 4,
      timeToMaxFavorableBars: 2,
      timeToMaxAdverseBars: 3,
      timeToMaxFavorableMinutes: 10,
      timeToMaxAdverseMinutes: 15,
      thresholdOnePoints: 4,
      thresholdTwoPoints: 8,
      thresholdOneTouched: true,
      thresholdTwoTouched: concept.thresholdTwoTouchRate !== null && concept.thresholdTwoTouchRate > 0.5,
      adverseThresholdPoints: 4,
      adverseThresholdTouched: concept.adverseThresholdTouchRate !== null && concept.adverseThresholdTouchRate > 0.5,
      firstMeaningfulMove: 'favorable',
      outcomeClassification: 'favorable_continuation',
      hypotheticalOutcomeOverlay: {
        advisoryOnly: true,
        executionApproved: false,
        hypotheticalReferencePrice: 100,
        hypotheticalInvalidationReference: 96,
        hypotheticalThresholdOne: 104,
        hypotheticalThresholdTwo: 108,
        thresholdOnePoints: 4,
        thresholdTwoPoints: 8,
        adverseInvalidationPoints: 4,
        observationWindowBars: 12,
        firstResolvedEvent: 'favorable_threshold_two',
        hypotheticalOutcomeLabel: 'favorable_continuation',
        resolvedAtBarIndex: 1,
        resolvedAtTime: '2026-05-28T10:05:00',
        maxFavorableExcursionPoints: concept.medianMfePoints,
        maxAdverseExcursionPoints: concept.medianMaePoints,
        notes: [],
      },
      dataQualityNotes: [],
    }))),
    markdown: '# fixture',
    approvalBoundary: {
      outcomeMathApprovesTrade: false,
      outcomeMathChangesRules: false,
      outcomeMathCreatesEntry: false,
      outcomeMathCreatesTargets: false,
      outcomeMathPromotesModel: false,
    },
  };
}

function concept(
  name: string,
  totalCandidates: number,
  evaluatedCandidates: number,
  thresholdTwoTouchRate: number | null,
  adverseThresholdTouchRate: number | null,
  favorableFirstRate = 0.7,
): ResearchOutcomeMathReport['conceptSummaries'][number] {
  return {
    concept: name,
    totalCandidates,
    evaluatedCandidates,
    thresholdOneTouchRate: thresholdTwoTouchRate === null ? null : Math.min(1, thresholdTwoTouchRate + 0.1),
    thresholdTwoTouchRate,
    adverseThresholdTouchRate,
    favorableFirstRate,
    adverseFirstRate: favorableFirstRate === null ? null : 0.1,
    medianMfePoints: thresholdTwoTouchRate === null ? null : 10,
    medianMaePoints: adverseThresholdTouchRate === null ? null : 3,
    hypotheticalOverlay: hypotheticalOverlaySummary,
    advisoryOnly: true,
  };
}

function sample(
  conceptName: string,
  index: number,
  humanLabel: ResearchReviewSample['humanInspectionLabel'],
  agreement: boolean | null,
): ResearchReviewSample {
  return {
    sampleId: `${conceptName}-${index}`,
    date: '2026-05-28',
    time: '10:00',
    concept: conceptName as ResearchReviewSample['concept'],
    conceptTitle: conceptName,
    direction: 'LONG',
    window: 'fixture',
    classification: 'advisory_only',
    advisoryOnly: true,
    summary: 'fixture',
    whyAdvisoryOnly: 'Research-only fixture.',
    model1Overlap: false,
    historicalReversalOverlap: false,
    researchDetectorReason: 'fixture',
    warningFailureReason: 'fixture',
    dataQualityNotes: [],
    sampleSourceReportPath: 'fixture',
    agentInspectionLabel: humanLabel === 'human_rule_review_queue' ||
      humanLabel === 'new_model_candidate_review' ||
      humanLabel === 'needs_more_chart_evidence' ||
      humanLabel === 'needs_more_context' ||
      humanLabel === 'reject_or_deprioritize' ||
      humanLabel === 'approved_for_future_model_candidate_review' ||
      humanLabel === 'not_approved_for_future_model_candidate_review'
      ? 'keep_advisory'
      : humanLabel || 'keep_advisory',
    agentConfidence: 'medium',
    agentReason: 'fixture',
    agentEvidence: ['fixture'],
    agentConcerns: ['research-only'],
    agentRecommendedNextStep: 'continue_tracking',
    agentApprovalBoundary: {
      agentApprovesTrade: false,
      agentChangesRules: false,
      agentCreatesEntry: false,
      agentCreatesTargets: false,
      agentPromotesModel: false,
    },
    humanInspectionLabel: humanLabel,
    humanConfidence: humanLabel ? 'medium' : null,
    humanReason: humanLabel ? 'fixture' : null,
    humanNotes: humanLabel ? 'fixture' : null,
    humanReviewedAt: humanLabel ? '2026-05-29T20:00:00.000Z' : null,
    humanReviewer: humanLabel ? 'Michael' : null,
    agentHumanAgreement: agreement,
    disagreementReason: agreement === false ? 'fixture disagreement' : null,
    finalReviewLabel: humanLabel,
    finalReviewNotes: humanLabel ? 'Research-only final label.' : null,
  };
}

function reviewPack(samples: ResearchReviewSample[]): ResearchSampleReviewPack {
  return {
    reportType: 'research_sample_review_pack',
    generatedAt: '2026-05-29T20:00:00.000Z',
    instrument: 'MES',
    concept: 'all',
    requestedSampleSize: samples.length,
    selectedSampleCount: samples.length,
    sourceReportPaths: ['fixture-backfill.json'],
    sampleSourceMode: 'full_candidate_events',
    executiveSummary: ['fixture'],
    conceptSummaries: [],
    sampleSelectionMethod: ['fixture'],
    samples,
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
    markdown: '# fixture',
  };
}

function labelFor(report: ReturnType<typeof runResearchModelValidation>, conceptName: string): ResearchConceptValidation {
  const validation = report.conceptValidations.find((item) => item.concept === conceptName);
  assert.ok(validation, `Missing validation for ${conceptName}`);
  return validation;
}

const tooSmall = runResearchModelValidation({
  outcomeReport: outcomeReport([concept('amd_range_model', 1, 1, 0, 0)]),
  outcomeReportPath: 'outcome.json',
});
assert.equal(labelFor(tooSmall, 'amd_range_model').researchValidationLabel, 'needs_more_outcome_data');

const highTouchOnly = runResearchModelValidation({
  outcomeReport: outcomeReport([concept('final_hour_liquidity_draw', 96, 96, 0.95, 0.80)]),
  outcomeReportPath: 'outcome.json',
});
assert.notEqual(labelFor(highTouchOnly, 'final_hour_liquidity_draw').researchValidationLabel, 'human_model_design_discussion_only');
assert.ok(labelFor(highTouchOnly, 'final_hour_liquidity_draw').concerns.some((concern) => concern.includes('Adverse threshold')));

const missingHumanReview = runResearchModelValidation({
  outcomeReport: outcomeReport([concept('false_run_liquidity_fade', 96, 96, 0.93, 0.23)]),
  outcomeReportPath: 'outcome.json',
});
assert.equal(labelFor(missingHumanReview, 'false_run_liquidity_fade').researchValidationLabel, 'continue_research');
assert.notEqual(labelFor(missingHumanReview, 'false_run_liquidity_fade').researchValidationLabel, 'human_model_design_discussion_only');

const strongReviewedPack = reviewPack([
  ...Array.from({ length: 9 }, (_, index) => sample('false_run_liquidity_fade', index, 'keep_advisory', true)),
  sample('false_run_liquidity_fade', 9, 'human_rule_review_queue', false),
]);
const strongReviewed = runResearchModelValidation({
  outcomeReport: outcomeReport([concept('false_run_liquidity_fade', 96, 96, 0.93, 0.23)]),
  outcomeReportPath: 'outcome.json',
  reviewPack: strongReviewedPack,
  reviewPackPath: 'reviewed.json',
});
const strongValidation = labelFor(strongReviewed, 'false_run_liquidity_fade');
assert.equal(strongValidation.researchValidationLabel, 'human_model_design_discussion_only');
assert.equal(strongValidation.humanReviewMetrics?.reviewedSamples, 10);
assert.equal(strongValidation.humanReviewMetrics?.pendingSamples, 0);
assert.equal(strongValidation.humanReviewMetrics?.agreementRate, 0.9);
assert.equal(strongValidation.humanReviewMetrics?.disagreementRate, 0.1);
assert.equal(strongValidation.humanReviewMetrics?.humanLabelCounts.human_rule_review_queue, 1);

const newModelCandidatePack = reviewPack([
  ...Array.from({ length: 9 }, (_, index) => sample('false_run_liquidity_fade', index, 'keep_advisory', true)),
  sample('false_run_liquidity_fade', 9, 'new_model_candidate_review', false),
]);
const newModelCandidateReport = runResearchModelValidation({
  outcomeReport: outcomeReport([concept('false_run_liquidity_fade', 96, 96, 0.93, 0.23)]),
  outcomeReportPath: 'outcome.json',
  reviewPack: newModelCandidatePack,
  reviewPackPath: 'reviewed.json',
});
const newModelCandidateValidation = labelFor(newModelCandidateReport, 'false_run_liquidity_fade');
assert.equal(newModelCandidateValidation.researchValidationLabel, 'human_model_design_discussion_only');
assert.equal(newModelCandidateValidation.humanReviewMetrics?.humanLabelCounts.new_model_candidate_review, 1);
assert.ok(newModelCandidateValidation.contextNotes.some((line) => line.includes('distinct research model candidates')));
assert.equal(newModelCandidateReport.approvalBoundary.validationPromotesModel, false);

const weakReviewed = runResearchModelValidation({
  outcomeReport: outcomeReport([concept('time_window_liquidity_delivery', 60, 60, 0.10, 0.80, 0.2)]),
  outcomeReportPath: 'outcome.json',
  reviewPack: reviewPack(Array.from({ length: 10 }, (_, index) => sample('time_window_liquidity_delivery', index, 'reject', true))),
});
assert.equal(labelFor(weakReviewed, 'time_window_liquidity_delivery').researchValidationLabel, 'reject_research');

const weakNewModelCandidate = runResearchModelValidation({
  outcomeReport: outcomeReport([concept('time_window_liquidity_delivery', 60, 60, 0.10, 0.80, 0.2)]),
  outcomeReportPath: 'outcome.json',
  reviewPack: reviewPack(Array.from({ length: 10 }, (_, index) => sample('time_window_liquidity_delivery', index, 'new_model_candidate_review', false))),
});
assert.equal(labelFor(weakNewModelCandidate, 'time_window_liquidity_delivery').researchValidationLabel, 'reject_research');

const adverseNewModelCandidate = runResearchModelValidation({
  outcomeReport: outcomeReport([concept('final_hour_liquidity_draw', 96, 96, 0.90, 0.80)]),
  outcomeReportPath: 'outcome.json',
  reviewPack: reviewPack(Array.from({ length: 10 }, (_, index) => sample('final_hour_liquidity_draw', index, 'new_model_candidate_review', false))),
});
assert.notEqual(labelFor(adverseNewModelCandidate, 'final_hour_liquidity_draw').researchValidationLabel, 'human_model_design_discussion_only');

const disagreementPack = reviewPack([
  ...Array.from({ length: 7 }, (_, index) => sample('time_window_liquidity_delivery', index, 'keep_advisory', true)),
  ...Array.from({ length: 3 }, (_, index) => sample('time_window_liquidity_delivery', index + 7, 'reject', false)),
]);
const disagreementReport = runResearchModelValidation({
  outcomeReport: outcomeReport([concept('time_window_liquidity_delivery', 80, 80, 0.75, 0.2)]),
  outcomeReportPath: 'outcome.json',
  reviewPack: disagreementPack,
});
assert.equal(labelFor(disagreementReport, 'time_window_liquidity_delivery').researchValidationLabel, 'continue_research');
assert.equal(labelFor(disagreementReport, 'time_window_liquidity_delivery').humanReviewMetrics?.disagreementRate, 0.3);

assert.equal(strongReviewed.advisoryOnly, true);
assert.equal(strongReviewed.executionApproved, false);
assert.equal(strongReviewed.approvalBoundary.validationApprovesTrade, false);
assert.equal(strongReviewed.approvalBoundary.validationChangesRules, false);
assert.equal(strongReviewed.approvalBoundary.validationCreatesEntry, false);
assert.equal(strongReviewed.approvalBoundary.validationCreatesTargets, false);
assert.equal(strongReviewed.approvalBoundary.validationPromotesModel, false);
assert.ok(strongReviewed.markdown.includes('## 2. Research-Only Boundary'));
assert.ok(strongReviewed.markdown.includes('Human model-design discussion is not execution approval.'));
assertNoExecutableValidationFields(strongReviewed);
assert.ok(!/"entry"|"stop"|"T1"|"T2"|"canExecute"/.test(JSON.stringify(strongReviewed)));

const parsed = parseResearchModelValidationArgs([
  '--outcome-report', 'outcome.json',
  '--review-pack', 'reviewed.json',
  '--out', 'tools/automation/research-validation-reports',
  '--json',
  '--pretty',
]);
assert.equal(parsed.outcomeReport, 'outcome.json');
assert.equal(parsed.reviewPack, 'reviewed.json');
assert.equal(parsed.json, true);
assert.equal(parsed.pretty, true);

const temp = mkdtempSync(join(tmpdir(), 'research-model-validation-'));
const outcomeFile = join(temp, 'outcome.json');
const reviewFile = join(temp, 'reviewed.json');
const outDir = join(temp, 'out');
writeFileSync(outcomeFile, `${JSON.stringify(outcomeReport([concept('false_run_liquidity_fade', 96, 96, 0.93, 0.23)]), null, 2)}\n`, 'utf8');
writeFileSync(reviewFile, `${JSON.stringify(strongReviewedPack, null, 2)}\n`, 'utf8');
await runResearchModelValidationCli([
  '--outcome-report', outcomeFile,
  '--review-pack', reviewFile,
  '--out', outDir,
  '--pretty',
]);
const written = join(outDir, `research-model-validation-${new Date().toISOString().slice(0, 10)}.json`);
assert.equal(existsSync(written), true);
const writtenReport = JSON.parse(readFileSync(written, 'utf8'));
assert.equal(writtenReport.reportType, 'research_model_validation');
assert.equal(writtenReport.executionApproved, false);

console.log('Research model validation agent verified.');
