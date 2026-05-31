import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  assertNoExecutableLedgerFields,
  buildModelCandidateReviewLedger,
  parseModelCandidateLedgerArgs,
  runModelCandidateLedgerCli,
} from './model-candidate-ledger';
import type { ResearchOutcomeMathReport } from '../../src/agents/researchOutcomeMathAgent';
import type { ResearchHumanInspectionLabel, ResearchReviewSample, ResearchSampleReviewPack } from '../../src/agents/researchSampleReviewAgent';

function sample(id: string, concept: string, label: ResearchHumanInspectionLabel | null, date = '2026-05-28'): ResearchReviewSample {
  return {
    sampleId: id,
    date,
    time: '10:00',
    concept: concept as ResearchReviewSample['concept'],
    conceptTitle: concept === 'time_window_liquidity_delivery' ? 'Time-Window Liquidity Delivery' : 'False-Run Liquidity Fade Near Highs',
    direction: id.endsWith('short') ? 'SHORT' : 'LONG',
    window: 'regular_session',
    classification: 'advisory_only',
    advisoryOnly: true,
    summary: 'Research-only reviewed sample.',
    whyAdvisoryOnly: 'Research-only. Existing gates did not independently pass.',
    model1Overlap: false,
    turtleSoupOverlap: false,
    researchDetectorReason: 'fixture',
    warningFailureReason: 'fixture',
    dataQualityNotes: [],
    sampleSourceReportPath: 'fixture-backfill.json',
    agentInspectionLabel: 'keep_advisory',
    agentConfidence: 'medium',
    agentReason: 'fixture',
    agentEvidence: ['fixture'],
    agentConcerns: ['Research-only and cannot approve execution.'],
    agentRecommendedNextStep: 'continue_tracking',
    agentApprovalBoundary: {
      agentApprovesTrade: false,
      agentChangesRules: false,
      agentCreatesEntry: false,
      agentCreatesTargets: false,
      agentPromotesModel: false,
    },
    humanInspectionLabel: label,
    humanConfidence: label ? 'medium' : null,
    humanReason: label === 'approved_for_future_model_candidate_review'
      ? 'Human approved this sample as useful evidence for future model-candidate review only.'
      : label === 'not_approved_for_future_model_candidate_review'
        ? 'Human did not approve this sample as useful evidence for future model-candidate review.'
        : label
          ? 'Legacy advisory label.'
          : null,
    humanNotes: label ? 'fixture notes' : null,
    humanReviewedAt: label ? '2026-05-29T20:00:00.000Z' : null,
    humanReviewer: label ? 'Michael' : null,
    agentHumanAgreement: label === 'keep_advisory' ? true : label ? false : null,
    disagreementReason: label && label !== 'keep_advisory' ? 'fixture disagreement' : null,
    reviewEvidence: label ? {
      chartAvailable: !id.startsWith('flf'),
      chartWithheld: false,
      chartPngPath: !id.startsWith('flf') ? `fixtures/${id}.png` : undefined,
      chartReportPath: !id.startsWith('flf') ? `fixtures/${id}.md` : undefined,
      sourceReviewCard: !id.startsWith('flf') ? `fixtures/${id}.json` : undefined,
      evidenceStatus: id.startsWith('flf') ? 'chart_missing' : 'chart_available',
    } : null,
    agentAssessment: label ? {
      status: label === 'approved_for_future_model_candidate_review'
        ? 'agrees_with_human'
        : 'disagrees_with_human',
      humanInputQuality: label === 'approved_for_future_model_candidate_review' ? 'reasonable' : 'needs_more_evidence',
      researchUsefulness: label === 'approved_for_future_model_candidate_review' ? 'useful' : 'needs_chart',
      reason: 'fixture agent assessment',
      evidenceChecked: ['fixture chart/report evidence'],
      chartReportReference: !id.startsWith('flf') ? `fixtures/${id}.md` : null,
      chartEvidenceAvailable: !id.startsWith('flf'),
      boundary: 'research_only_not_execution_authority',
      assessedAt: '2026-05-29T20:05:00.000Z',
    } : null,
    estimatedGrossContractPnl: id.startsWith('flf') ? {
      rootSymbol: 'MES',
      displayName: 'Micro E-mini S&P 500',
      contracts: 1,
      pointValue: 5,
      tickSize: 0.25,
      tickValue: 1.25,
      currency: 'USD',
      metadataSource: 'static_contract_metadata',
      mfePoints: 20,
      mfeTicks: 80,
      mfeDollars: 100,
      status: 'partial',
      note: 'Research-only gross estimate for 1 MES contract. Excludes commissions, slippage, spread, fills, partial fills, taxes, fees, and live execution effects.',
    } : undefined,
    finalReviewLabel: label,
    finalReviewNotes: label ? 'Research-only final label.' : null,
  };
}

function reviewPack(samples: ResearchReviewSample[]): ResearchSampleReviewPack {
  return {
    reportType: 'research_sample_review_pack',
    generatedAt: '2026-05-30T20:00:00.000Z',
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

function outcomeReport(sampleIds: string[]): ResearchOutcomeMathReport {
  const overlaySummary = {
    favorableContinuationCount: sampleIds.length,
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
  return {
    reportType: 'research_outcome_math',
    generatedAt: '2026-05-30T20:00:00.000Z',
    sourcePath: 'fixture-source.json',
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
      totalCandidates: sampleIds.length,
      evaluatedCandidates: sampleIds.length,
      insufficientDataCandidates: 0,
      thresholdOneTouchRate: 1,
      thresholdTwoTouchRate: 1,
      adverseThresholdTouchRate: 0,
      favorableFirstRate: 1,
      adverseFirstRate: 0,
      hypotheticalOverlay: overlaySummary,
    },
    conceptSummaries: [],
    candidateOutcomes: sampleIds.map((candidateId) => ({
      candidateId,
      date: '2026-05-28',
      time: '10:00',
      instrument: 'MES',
      concept: candidateId.startsWith('twld') ? 'time_window_liquidity_delivery' : 'false_run_liquidity_fade',
      direction: 'LONG',
      window: 'regular_session',
      classification: 'advisory_only',
      advisoryOnly: true,
      observationWindowBars: 12,
      observationWindowMinutes: 60,
      referencePrice: 7600,
      maxFavorableExcursionPoints: 8,
      maxAdverseExcursionPoints: 2,
      maxFavorableExcursionTicks: 32,
      maxAdverseExcursionTicks: 8,
      timeToMaxFavorableBars: 2,
      timeToMaxAdverseBars: 1,
      timeToMaxFavorableMinutes: 10,
      timeToMaxAdverseMinutes: 5,
      thresholdOnePoints: 4,
      thresholdTwoPoints: 8,
      thresholdOneTouched: true,
      thresholdTwoTouched: true,
      adverseThresholdPoints: 4,
      adverseThresholdTouched: false,
      firstMeaningfulMove: 'favorable',
      outcomeClassification: 'favorable_continuation',
      hypotheticalOutcomeOverlay: {
        advisoryOnly: true,
        executionApproved: false,
        hypotheticalReferencePrice: 7600,
        hypotheticalInvalidationReference: 7596,
        hypotheticalThresholdOne: 7604,
        hypotheticalThresholdTwo: 7608,
        thresholdOnePoints: 4,
        thresholdTwoPoints: 8,
        adverseInvalidationPoints: 4,
        observationWindowBars: 12,
        firstResolvedEvent: 'favorable_threshold_two',
        hypotheticalOutcomeLabel: 'favorable_continuation',
        resolvedAtBarIndex: 2,
        resolvedAtTime: '2026-05-28T10:10:00',
        maxFavorableExcursionPoints: 8,
        maxAdverseExcursionPoints: 2,
        notes: [],
      },
      dataQualityNotes: [],
    })),
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

const temp = mkdtempSync(path.join(tmpdir(), 'model-candidate-ledger-'));
const reviewDir = path.join(temp, 'research-review-packs');
const outcomeDir = path.join(temp, 'research-outcome-reports');
const chartDir = path.join(temp, 'research-review-charts', 'price-action-review-cards');
const outDir = path.join(temp, 'model-candidate-ledger');
await import('node:fs/promises').then((fs) => Promise.all([
  fs.mkdir(reviewDir, { recursive: true }),
  fs.mkdir(outcomeDir, { recursive: true }),
  fs.mkdir(chartDir, { recursive: true }),
]));

const samples = [
  sample('twld-001', 'time_window_liquidity_delivery', 'approved_for_future_model_candidate_review'),
  sample('twld-002', 'time_window_liquidity_delivery', 'approved_for_future_model_candidate_review'),
  sample('twld-003', 'time_window_liquidity_delivery', 'approved_for_future_model_candidate_review'),
  sample('twld-004', 'time_window_liquidity_delivery', 'not_approved_for_future_model_candidate_review'),
  sample('flf-001', 'false_run_liquidity_fade', 'not_approved_for_future_model_candidate_review'),
  sample('legacy-001', 'false_run_liquidity_fade', 'keep_advisory'),
];
writeFileSync(path.join(reviewDir, 'research-sample-review-MES-all-2026-05-30.reviewed.json'), `${JSON.stringify(reviewPack(samples), null, 2)}\n`, 'utf8');
writeFileSync(path.join(outcomeDir, 'research-outcome-math-MES-2026-05-30.json'), `${JSON.stringify(outcomeReport(['twld-001', 'twld-002', 'twld-003', 'twld-004']), null, 2)}\n`, 'utf8');
for (const sampleId of ['twld-001', 'twld-002', 'twld-003', 'twld-004']) {
  writeFileSync(path.join(chartDir, `price-action-review-card-MES-2026-01-01-to-2026-05-30-${sampleId}.png`), 'png fixture', 'utf8');
}

const ledger = await buildModelCandidateReviewLedger({
  from: '2026-01-01',
  to: '2026-05-30',
  symbol: 'MES',
  reviewPackDir: reviewDir,
  outcomeReportDir: outcomeDir,
  chartDir,
  outDir,
  pretty: true,
  json: false,
  thresholds: {
    minimumReviewedSamples: 4,
    minimumApprovalRate: 0.7,
  },
});

assert.equal(ledger.summary.reviewedSamplesFound, 5);
assert.equal(ledger.summary.approvedCount, 3);
assert.equal(ledger.summary.notApprovedCount, 2);
assert.equal(ledger.summary.ignoredLegacyReviewedSamples, 1);
assert.equal(ledger.conceptSummaries.length, 2);
const twld = ledger.conceptSummaries.find((summary) => summary.concept === 'time_window_liquidity_delivery');
assert.ok(twld);
assert.equal(twld.totalSamplesReviewed, 4);
assert.equal(twld.humanApprovedCount, 3);
assert.equal(twld.humanNotApprovedCount, 1);
assert.equal(twld.approvalRate, 0.75);
assert.equal(twld.candidateReadinessStatus, 'candidate_review_recommended');
assert.equal(twld.modelCandidateAdvisoryEvidence.sampleCount, 4);
assert.equal(twld.modelCandidateAdvisoryEvidence.humanApprovedCount, 3);
assert.equal(twld.modelCandidateAdvisoryEvidence.humanNotApprovedCount, 1);
assert.equal(twld.modelCandidateAdvisoryEvidence.humanApprovalRate, 0.75);
assert.equal(twld.modelCandidateAdvisoryEvidence.agentAssessmentSummary.agreesWithHuman, 3);
assert.equal(twld.modelCandidateAdvisoryEvidence.agentAssessmentSummary.disagreesWithHuman, 1);
assert.equal(twld.modelCandidateAdvisoryEvidence.reviewEvidenceSummary.samplesWithChartEvidence, 4);
assert.equal(twld.modelCandidateAdvisoryEvidence.reviewEvidenceSummary.samplesWithExactPngPath, 4);
assert.equal(twld.modelCandidateAdvisoryEvidence.reviewEvidenceSummary.samplesWithExactReportPath, 4);
assert.equal(twld.modelCandidateAdvisoryEvidence.estimatedGrossContractPnlSummary?.rootSymbol, 'MES');
assert.equal(twld.modelCandidateAdvisoryEvidence.estimatedGrossContractPnlSummary?.avgHypotheticalOutcomeDollars, 40);
assert.equal(twld.modelCandidateAdvisoryEvidence.missingDataWarningCount, 0);
assert.equal(twld.modelCandidateAdvisoryEvidence.adverseFirstContradictionCount, 0);
assert.equal(twld.modelCandidateAdvisoryEvidence.boundary, 'research_only_not_execution_authority');
assert.ok(twld.deskRecommendation.includes('Human final decision required before any model promotion or implementation.'));
const flf = ledger.conceptSummaries.find((summary) => summary.concept === 'false_run_liquidity_fade');
assert.ok(flf);
assert.equal(flf.candidateReadinessStatus, 'insufficient_evidence');
assert.equal(flf.modelCandidateAdvisoryEvidence.reviewEvidenceSummary.samplesMissingCharts, 1);
assert.equal(flf.modelCandidateAdvisoryEvidence.estimatedGrossContractPnlSummary?.sampleCountWithPnl, 1);
assert.equal(flf.modelCandidateAdvisoryEvidence.estimatedGrossContractPnlSummary?.avgMfeDollars, 100);
assert.equal(flf.modelCandidateAdvisoryEvidence.estimatedGrossContractPnlSummary?.status, 'partial');
assert.equal(flf.modelCandidateAdvisoryEvidence.sampleCount < ledger.thresholds.minimumReviewedSamples, true);
assert.equal(ledger.entries.find((entry) => entry.sampleId === 'twld-001')?.humanApprovalState, 'approved_for_future_model_candidate_review');
assert.equal(ledger.entries.find((entry) => entry.sampleId === 'twld-001')?.estimatedGrossContractPnl?.rootSymbol, 'MES');
assert.equal(ledger.entries.find((entry) => entry.sampleId === 'twld-001')?.estimatedGrossContractPnl?.hypotheticalOutcomeDollars, 40);
assert.equal(ledger.entries.find((entry) => entry.sampleId === 'twld-001')?.agentAssessmentStatus, 'agrees_with_human');
assert.equal(ledger.entries.find((entry) => entry.sampleId === 'twld-001')?.reviewEvidence?.chartReportPath, 'fixtures/twld-001.md');
assert.equal(ledger.entries.find((entry) => entry.sampleId === 'flf-001')?.humanApprovalState, 'not_approved_for_future_model_candidate_review');
assert.equal(ledger.entries.find((entry) => entry.sampleId === 'flf-001')?.estimatedGrossContractPnl?.mfeDollars, 100);
assert.equal(ledger.entries.find((entry) => entry.sampleId === 'flf-001')?.warningState.missingOutcomeMath, true);
assert.equal(ledger.entries.find((entry) => entry.sampleId === 'flf-001')?.warningState.missingChartArtifact, true);
assert.equal(ledger.estimatedGrossContractPnlSummary?.rootSymbol, 'MES');
assert.equal(ledger.estimatedGrossContractPnlSummary?.sampleCountWithPnl, 5);
assert.equal(ledger.estimatedGrossContractPnlSummary?.sampleCountMissingPnl, 0);
assert.equal(ledger.estimatedGrossContractPnlSummary?.avgHypotheticalOutcomeDollars, 40);
assert.equal(ledger.estimatedGrossContractPnlSummary?.status, 'partial');
assert.ok(ledger.estimatedGrossContractPnlSummary?.note.includes('P/L summary is partial'));
assert.equal(ledger.entries.every((entry) => entry.researchOnlyBoundary.approvesExecution === false), true);
assertNoExecutableLedgerFields(ledger);
assert.ok(!/"canExecute"|"executionApproved"|"entry"|"stop"|"stopLoss"|"target"|"targets"|"T1"|"T2"|"riskReward"|"orderInstructions"|"ragPayload"|"journalPayload"/.test(JSON.stringify(ledger)));
const markdown = readFileSync(ledger.outputPaths.markdownPath, 'utf8');
assert.ok(markdown.includes('Research-only. This does not approve execution, change rules, or create trades.'));
assert.ok(markdown.includes('Human final decision required before any model promotion or implementation.'));
assert.ok(markdown.includes('Estimated Gross Contract P/L Summary, 1 Contract'));
assert.ok(markdown.includes('Avg Hypothetical Outcome: +$40.00 gross'));
assert.ok(markdown.includes('Model-Candidate Advisory Evidence:'));
assert.ok(markdown.includes('Boundary: research_only_not_execution_authority'));
assert.ok(markdown.includes('supporting research/audit evidence only'));
assert.equal(ledger.thresholds.minimumReviewedSamples, 4);
assert.equal(ledger.thresholds.minimumApprovalRate, 0.7);
assert.equal(ledger.summary.candidateReviewRecommendedConcepts, 1);

const parsed = parseModelCandidateLedgerArgs([
  '--from', '2026-01-01',
  '--to', 'today',
  '--symbol', 'MES',
  '--review-pack-dir', reviewDir,
  '--outcome-report-dir', outcomeDir,
  '--chart-dir', chartDir,
  '--out', outDir,
  '--pretty',
]);
assert.equal(parsed.from, '2026-01-01');
assert.match(parsed.to, /^\d{4}-\d{2}-\d{2}$/);
assert.equal(parsed.symbol, 'MES');
assert.equal(parsed.pretty, true);

await runModelCandidateLedgerCli([
  '--from', '2026-01-01',
  '--to', '2026-05-30',
  '--symbol', 'MES',
  '--review-pack-dir', reviewDir,
  '--outcome-report-dir', outcomeDir,
  '--chart-dir', chartDir,
  '--out', path.join(temp, 'cli-ledger'),
  '--pretty',
  '--minimum-reviewed-samples', '4',
  '--minimum-approval-rate', '0.7',
]);

console.log('Model candidate review ledger verified.');
