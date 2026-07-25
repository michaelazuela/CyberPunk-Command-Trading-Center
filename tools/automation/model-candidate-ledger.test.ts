import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  assertNoExecutableLedgerFields,
  buildModelCandidateBacktestHandoff,
  buildModelCandidateResearchRecommendation,
  buildModelCandidateReviewLedger,
  interpretModelCandidateAdvisoryEvidence,
  parseModelCandidateLedgerArgs,
  runModelCandidateLedgerCli,
} from './model-candidate-ledger';
import type { ResearchOutcomeMathReport } from '../../src/agents/researchOutcomeMathAgent';
import type { ResearchHumanInspectionLabel, ResearchReviewSample, ResearchSampleReviewPack } from '../../src/agents/researchSampleReviewAgent';
import type { ModelCandidateAdvisoryEvidence } from './model-candidate-ledger';

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
    raidReclaimOverlap: false,
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
  sample('flf-watch-001', 'false_run_liquidity_fade', 'new_model_candidate_review'),
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
assert.equal(ledger.summary.ignoredLegacyReviewedSamples, 2);
assert.equal(ledger.summary.humanReviewedSamplesFound, 7);
assert.equal(ledger.summary.reviewedFilesFound, 1);
assert.equal(ledger.summary.reviewedFilesRead, 1);
assert.equal(ledger.summary.ignoredReviewedSamples, 2);
assert.equal(ledger.conceptSummaries.length, 2);
assert.ok(ledger.outputPaths.rangeJsonPath?.endsWith('model-candidate-review-ledger-MES-2026-01-01-to-2026-05-30.json'));
assert.ok(ledger.outputPaths.rangeMarkdownPath?.endsWith('model-candidate-review-ledger-MES-2026-01-01-to-2026-05-30.md'));
assert.ok(ledger.outputPaths.watchlistJsonPath?.endsWith('model-candidate-watchlist.json'));
assert.ok(ledger.outputPaths.watchlistMarkdownPath?.endsWith('model-candidate-watchlist.md'));
assert.ok(ledger.outputPaths.rangeWatchlistJsonPath?.endsWith('model-candidate-watchlist-MES-2026-01-01-to-2026-05-30.json'));
assert.ok(ledger.outputPaths.rangeWatchlistMarkdownPath?.endsWith('model-candidate-watchlist-MES-2026-01-01-to-2026-05-30.md'));
assert.ok(ledger.outputPaths.backtestHandoffJsonPath?.endsWith('model-candidate-backtest-handoff.json'));
assert.ok(ledger.outputPaths.backtestHandoffMarkdownPath?.endsWith('model-candidate-backtest-handoff.md'));
assert.ok(ledger.outputPaths.rangeBacktestHandoffJsonPath?.endsWith('model-candidate-backtest-handoff-MES-2026-01-01-to-2026-05-30.json'));
assert.ok(ledger.outputPaths.rangeBacktestHandoffMarkdownPath?.endsWith('model-candidate-backtest-handoff-MES-2026-01-01-to-2026-05-30.md'));
assert.equal(existsSync(ledger.outputPaths.jsonPath), true);
assert.equal(existsSync(ledger.outputPaths.markdownPath), true);
assert.equal(existsSync(ledger.outputPaths.rangeJsonPath || ''), true);
assert.equal(existsSync(ledger.outputPaths.rangeMarkdownPath || ''), true);
assert.equal(existsSync(ledger.outputPaths.watchlistJsonPath || ''), true);
assert.equal(existsSync(ledger.outputPaths.watchlistMarkdownPath || ''), true);
assert.equal(existsSync(ledger.outputPaths.rangeWatchlistJsonPath || ''), true);
assert.equal(existsSync(ledger.outputPaths.rangeWatchlistMarkdownPath || ''), true);
assert.equal(existsSync(ledger.outputPaths.backtestHandoffJsonPath || ''), true);
assert.equal(existsSync(ledger.outputPaths.backtestHandoffMarkdownPath || ''), true);
assert.equal(existsSync(ledger.outputPaths.rangeBacktestHandoffJsonPath || ''), true);
assert.equal(existsSync(ledger.outputPaths.rangeBacktestHandoffMarkdownPath || ''), true);
assert.equal(ledger.reviewedArtifactDiagnostics.reviewedFilesFound, 1);
assert.equal(ledger.reviewedArtifactDiagnostics.acceptedModelCandidateSamples, 5);
assert.equal(ledger.reviewedArtifactDiagnostics.humanReviewedSamplesFound, 7);
assert.equal(ledger.reviewedArtifactDiagnostics.ignoredSamplesByReason.unsupported_model_candidate_label, 2);
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
assert.equal(twld.modelCandidateAdvisoryInterpretation.evidenceBase, 'too_small');
assert.equal(twld.modelCandidateAdvisoryInterpretation.pnlSignal, 'not_meaningful_low_sample_count');
assert.equal(twld.modelCandidateAdvisoryInterpretation.advisoryStatus, 'keep_collecting_evidence');
assert.equal(twld.modelCandidateAdvisoryInterpretation.nextAction, 'collect_more_reviewed_samples');
assert.equal(twld.modelCandidateAdvisoryInterpretation.boundary, 'research_only_not_execution_authority');
assert.ok(twld.modelCandidateAdvisoryInterpretation.reasons.some((reason) => reason.includes('10-sample evidence gate')));
assert.equal(twld.modelCandidateResearchRecommendation.status, 'keep_collecting_evidence');
assert.equal(twld.modelCandidateResearchRecommendation.gateResults.sampleCountGate, 'fail');
assert.equal(twld.modelCandidateResearchRecommendation.gateResults.humanApprovalRateGate, 'pass');
assert.equal(twld.modelCandidateResearchRecommendation.gateResults.pnlSupportSignal, 'not_meaningful_low_sample_count');
assert.equal(twld.modelCandidateResearchRecommendation.humanFinalDecisionRequired, true);
assert.equal(twld.modelCandidateResearchRecommendation.boundary, 'research_only_not_execution_authority');
assert.ok(twld.deskRecommendation.includes('Human final decision required before any model promotion or implementation.'));
const flf = ledger.conceptSummaries.find((summary) => summary.concept === 'false_run_liquidity_fade');
assert.ok(flf);
assert.equal(flf.candidateReadinessStatus, 'insufficient_evidence');
assert.equal(flf.modelCandidateAdvisoryEvidence.reviewEvidenceSummary.samplesMissingCharts, 1);
assert.equal(flf.modelCandidateAdvisoryEvidence.estimatedGrossContractPnlSummary?.sampleCountWithPnl, 1);
assert.equal(flf.modelCandidateAdvisoryEvidence.estimatedGrossContractPnlSummary?.avgMfeDollars, 100);
assert.equal(flf.modelCandidateAdvisoryEvidence.estimatedGrossContractPnlSummary?.status, 'partial');
assert.equal(flf.modelCandidateAdvisoryEvidence.sampleCount < ledger.thresholds.minimumReviewedSamples, true);
assert.equal(flf.modelCandidateAdvisoryInterpretation.pnlSignal, 'not_meaningful_low_sample_count');
assert.ok(flf.modelCandidateAdvisoryInterpretation.reasons.some((reason) => reason.includes('not meaningful')));
assert.equal(flf.modelCandidateResearchRecommendation.status, 'keep_collecting_evidence');
assert.equal(flf.modelCandidateResearchRecommendation.gateResults.chartEvidenceGate, 'fail');
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
const watchlistJson = JSON.parse(readFileSync(ledger.outputPaths.watchlistJsonPath || '', 'utf8'));
const watchlistMarkdown = readFileSync(ledger.outputPaths.watchlistMarkdownPath || '', 'utf8');
const handoffJson = JSON.parse(readFileSync(ledger.outputPaths.backtestHandoffJsonPath || '', 'utf8'));
const handoffMarkdown = readFileSync(ledger.outputPaths.backtestHandoffMarkdownPath || '', 'utf8');
const geminiPromptSource = readFileSync(path.join(process.cwd(), 'src/lib/gemini.ts'), 'utf8');
assert.ok(markdown.includes('Research-only. This does not approve execution, change rules, or create trades.'));
assert.ok(markdown.includes('Human final decision required before any model promotion or implementation.'));
assert.ok(markdown.includes('Estimated Gross Contract P/L Summary, 1 Contract'));
assert.ok(markdown.includes('Avg Hypothetical Outcome: +$40.00 gross'));
assert.ok(markdown.includes('Model-Candidate Advisory Evidence:'));
assert.ok(markdown.includes('Model-Candidate Advisory Interpretation:'));
assert.ok(markdown.includes('P/L Signal: not_meaningful_low_sample_count'));
assert.ok(markdown.includes('Model-Candidate Research Recommendation:'));
assert.ok(markdown.includes('Human Final Decision Required: Yes'));
assert.ok(markdown.includes('Reviewed Artifact Diagnostics'));
assert.ok(markdown.includes('Reviewed files read: 1'));
assert.ok(markdown.includes('unsupported_model_candidate_label: 2'));
assert.ok(markdown.includes('Range-stamped JSON:'));
assert.ok(markdown.includes('Boundary: research_only_not_execution_authority'));
assert.ok(markdown.includes('supporting research/audit evidence only'));
assert.ok(!/\b(approved model|live model|trade approved|profitable system|activate model|deploy|actual P\/L|net P\/L)\b/i.test(markdown));
assert.ok(geminiPromptSource.includes('## Model-Candidate Recommendation Rule'));
assert.ok(geminiPromptSource.includes('candidate_review_recommended means only'));
assert.ok(geminiPromptSource.includes('## Pre-Candidate Watchlist Rule'));
assert.ok(geminiPromptSource.includes('## Human Review Label Rule'));
assert.ok(geminiPromptSource.includes('## Formal Backtest Handoff Rule'));
assert.equal(watchlistJson.reportType, 'pre_candidate_watchlist');
assert.equal(watchlistJson.boundary, 'research_only_not_execution_authority');
assert.equal(watchlistJson.summary.humanReviewedSamples, 7);
assert.equal(watchlistJson.summary.formalLedgerEligibleSamples, 5);
assert.equal(watchlistJson.summary.watchlistSamples, 2);
assert.equal(watchlistJson.summary.samplesWithEstimatedGrossContractPnl, 1);
assert.equal(ledger.entries.some((entry) => entry.sampleId === 'legacy-001' || entry.sampleId === 'flf-watch-001'), false);
assert.ok(watchlistJson.concepts.some((concept: { labels: Record<string, number> }) => concept.labels.keep_advisory === 1));
assert.ok(watchlistJson.concepts.some((concept: { labels: Record<string, number> }) => concept.labels.new_model_candidate_review === 1));
const watchlistFlf = watchlistJson.concepts.find((concept: { concept: string }) => concept.concept === 'false_run_liquidity_fade');
assert.equal(watchlistFlf.watchlistRecommendation.status, 'needs_more_chart_evidence');
assert.ok(watchlistFlf.watchlistRecommendation.reason.some((reason: string) => reason.includes('does not move samples into the formal ledger')));
assert.ok(watchlistFlf.samples.some((row: { sampleId: string; nextHumanAction: string; labelCategory: string; countsTowardCandidateGates: boolean }) =>
  row.sampleId === 'flf-watch-001' &&
  row.nextHumanAction === 'review_chart' &&
  row.labelCategory === 'watchlist' &&
  row.countsTowardCandidateGates === false));
assert.ok(watchlistMarkdown.includes('# Pre-Candidate Watchlist Report'));
assert.ok(watchlistMarkdown.includes('Boundary: research_only_not_execution_authority'));
assert.ok(watchlistMarkdown.includes('new_model_candidate_review'));
assert.ok(watchlistMarkdown.includes('watchlist; gates=no'));
assert.ok(watchlistMarkdown.includes('| Sample ID | Label | Category | Counts Toward Gates |'));
assert.ok(watchlistMarkdown.includes('Estimated Gross Contract P/L'));
assert.ok(!/\b(approved model|live model|trade approved|profitable system|activate model|deploy|actual P\/L|net P\/L)\b/i.test(watchlistMarkdown));
assertNoExecutableLedgerFields(watchlistJson);
assert.equal(handoffJson.reportType, 'model_candidate_backtest_handoff');
assert.equal(handoffJson.boundary, 'research_only_not_execution_authority');
assert.equal(handoffJson.summary.conceptCount, 2);
assert.equal(handoffJson.summary.candidateReviewRecommendedCount, 0);
assert.equal(handoffJson.concepts.find((concept: { concept: string }) => concept.concept === 'time_window_liquidity_delivery').backtestReadiness.status, 'not_ready_collect_more_evidence');
assert.equal(handoffJson.concepts.find((concept: { concept: string }) => concept.concept === 'false_run_liquidity_fade').backtestReadiness.status, 'blocked_by_missing_evidence');
assert.equal(handoffJson.concepts.every((concept: { backtestReadiness: { requiredBacktestDefinitions: Record<string, string> } }) =>
  Object.values(concept.backtestReadiness.requiredBacktestDefinitions).every((status) => status === 'missing')), true);
assert.ok(handoffJson.concepts.find((concept: { concept: string }) => concept.concept === 'time_window_liquidity_delivery').supportingSamples.length === 4);
assert.ok(handoffMarkdown.includes('# Model-Candidate Backtest Handoff'));
assert.ok(handoffMarkdown.includes('This report is a research-only handoff package'));
assert.ok(handoffMarkdown.includes('Entry Model | missing'));
assert.ok(handoffMarkdown.includes('Status: not_ready_collect_more_evidence'));
assert.ok(handoffMarkdown.includes('Status: blocked_by_missing_evidence'));
assert.ok(!/\b(approved model|live model|trade approved|profitable system|activate model|deploy|actual P\/L|net P\/L)\b/i.test(handoffMarkdown));
assertNoExecutableLedgerFields(handoffJson);
assert.equal(ledger.thresholds.minimumReviewedSamples, 4);
assert.equal(ledger.thresholds.minimumApprovalRate, 0.7);
assert.equal(ledger.summary.candidateReviewRecommendedConcepts, 1);

const sufficientEvidence: ModelCandidateAdvisoryEvidence = {
  sampleCount: 10,
  humanApprovedCount: 8,
  humanNotApprovedCount: 2,
  humanApprovalRate: 0.8,
  agentAssessmentSummary: {
    agreesWithHuman: 8,
    partiallyAgreesWithHuman: 1,
    disagreesWithHuman: 1,
    unclearInsufficientEvidence: 0,
  },
  reviewEvidenceSummary: {
    samplesWithChartEvidence: 10,
    samplesWithExactPngPath: 10,
    samplesWithExactReportPath: 10,
    samplesMissingCharts: 0,
    samplesWithUnknownCharts: 0,
    samplesWithWithheldCharts: 0,
  },
  estimatedGrossContractPnlSummary: {
    rootSymbol: 'MES',
    sampleCountWithPnl: 10,
    sampleCountMissingPnl: 0,
    avgHypotheticalOutcomeDollars: 40,
    totalHypotheticalOutcomeDollars: 400,
    bestHypotheticalOutcomeDollars: 80,
    worstHypotheticalOutcomeDollars: 10,
    avgMfeDollars: 70,
    avgMaeDollars: -20,
    status: 'available',
  },
  missingDataWarningCount: 0,
  adverseFirstContradictionCount: 0,
  boundary: 'research_only_not_execution_authority',
};
const supportiveInterpretation = interpretModelCandidateAdvisoryEvidence({
  evidence: sufficientEvidence,
  candidateReadinessStatus: 'candidate_review_recommended',
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.equal(supportiveInterpretation.advisoryStatus, 'candidate_review_recommended');
assert.equal(supportiveInterpretation.pnlSignal, 'supportive_after_core_gates');
assert.equal(supportiveInterpretation.nextAction, 'move_to_formal_model_candidate_backtest_human_final_decision_required');
const supportiveRecommendation = buildModelCandidateResearchRecommendation({
  evidence: sufficientEvidence,
  interpretation: supportiveInterpretation,
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.equal(supportiveRecommendation.status, 'candidate_review_recommended');
assert.equal(supportiveRecommendation.recommendationText, 'Move to formal model-candidate review/backtest. Human final decision required.');
assert.equal(supportiveRecommendation.gateResults.sampleCountGate, 'pass');
assert.equal(supportiveRecommendation.gateResults.humanApprovalRateGate, 'pass');
assert.equal(supportiveRecommendation.gateResults.missingDataGate, 'pass');
assert.equal(supportiveRecommendation.gateResults.adverseFirstGate, 'pass');
assert.equal(supportiveRecommendation.gateResults.chartEvidenceGate, 'pass');
assert.equal(supportiveRecommendation.gateResults.agentAssessmentGate, 'pass');
assert.equal(supportiveRecommendation.gateResults.pnlSupportSignal, 'supportive');
assert.equal(supportiveRecommendation.humanFinalDecisionRequired, true);
const readyHandoff = buildModelCandidateBacktestHandoff({
  ...ledger,
  entries: [],
  conceptSummaries: [{
    ...twld,
    totalSamplesReviewed: 10,
    humanApprovedCount: 8,
    humanNotApprovedCount: 2,
    approvalRate: 0.8,
    candidateReadinessStatus: 'candidate_review_recommended',
    modelCandidateAdvisoryEvidence: sufficientEvidence,
    modelCandidateAdvisoryInterpretation: supportiveInterpretation,
    modelCandidateResearchRecommendation: supportiveRecommendation,
  }],
} as typeof ledger, { ...watchlistJson, concepts: [] });
assert.equal(readyHandoff.concepts[0].backtestReadiness.status, 'ready_for_formal_backtest_review');
assert.equal(readyHandoff.concepts[0].backtestReadiness.nextHumanAction, 'define_backtest_assumptions');
assert.equal(readyHandoff.concepts[0].backtestReadiness.requiredBacktestDefinitions.entryModel, 'missing');
assertNoExecutableLedgerFields(readyHandoff);

const watchlistOnlyHandoff = buildModelCandidateBacktestHandoff({
  ...ledger,
  entries: [],
  conceptSummaries: [],
} as typeof ledger, {
  ...watchlistJson,
  concepts: [{
    ...watchlistFlf,
    concept: 'watchlist_only_fixture',
    conceptTitle: 'Watchlist Only Fixture',
  }],
});
assert.equal(watchlistOnlyHandoff.concepts[0].backtestReadiness.status, 'watchlist_only');
assert.equal(watchlistOnlyHandoff.concepts[0].supportingSamples.length, 0);
assert.notEqual(watchlistOnlyHandoff.concepts[0].researchRecommendation.status, 'candidate_review_recommended');

const lowApprovalInterpretation = interpretModelCandidateAdvisoryEvidence({
  evidence: { ...sufficientEvidence, humanApprovedCount: 6, humanNotApprovedCount: 4, humanApprovalRate: 0.6 },
  candidateReadinessStatus: 'watchlist_candidate',
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.notEqual(lowApprovalInterpretation.advisoryStatus, 'candidate_review_recommended');
assert.equal(lowApprovalInterpretation.humanReviewSignal, 'mixed');
assert.ok(lowApprovalInterpretation.reasons.some((reason) => reason.includes('70% review gate')));
const lowApprovalRecommendation = buildModelCandidateResearchRecommendation({
  evidence: { ...sufficientEvidence, humanApprovedCount: 6, humanNotApprovedCount: 4, humanApprovalRate: 0.6 },
  interpretation: lowApprovalInterpretation,
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.notEqual(lowApprovalRecommendation.status, 'candidate_review_recommended');
assert.equal(lowApprovalRecommendation.gateResults.humanApprovalRateGate, 'fail');

const missingDataInterpretation = interpretModelCandidateAdvisoryEvidence({
  evidence: { ...sufficientEvidence, missingDataWarningCount: 1 },
  candidateReadinessStatus: 'watchlist_candidate',
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.equal(missingDataInterpretation.advisoryStatus, 'do_not_advance');
assert.equal(missingDataInterpretation.nextAction, 'resolve_missing_evidence');
const missingDataRecommendation = buildModelCandidateResearchRecommendation({
  evidence: { ...sufficientEvidence, missingDataWarningCount: 1 },
  interpretation: missingDataInterpretation,
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.notEqual(missingDataRecommendation.status, 'candidate_review_recommended');
assert.equal(missingDataRecommendation.gateResults.missingDataGate, 'fail');

const adverseFirstInterpretation = interpretModelCandidateAdvisoryEvidence({
  evidence: { ...sufficientEvidence, adverseFirstContradictionCount: 1 },
  candidateReadinessStatus: 'watchlist_candidate',
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.equal(adverseFirstInterpretation.advisoryStatus, 'do_not_advance');
assert.equal(adverseFirstInterpretation.nextAction, 'resolve_adverse_contradictions');
const adverseFirstRecommendation = buildModelCandidateResearchRecommendation({
  evidence: { ...sufficientEvidence, adverseFirstContradictionCount: 1 },
  interpretation: adverseFirstInterpretation,
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.notEqual(adverseFirstRecommendation.status, 'candidate_review_recommended');
assert.equal(adverseFirstRecommendation.gateResults.adverseFirstGate, 'fail');

const missingChartInterpretation = interpretModelCandidateAdvisoryEvidence({
  evidence: {
    ...sufficientEvidence,
    reviewEvidenceSummary: { ...sufficientEvidence.reviewEvidenceSummary, samplesMissingCharts: 1, samplesWithChartEvidence: 9, samplesWithExactPngPath: 9, samplesWithExactReportPath: 9 },
  },
  candidateReadinessStatus: 'candidate_review_recommended',
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.notEqual(missingChartInterpretation.advisoryStatus, 'candidate_review_recommended');
assert.equal(missingChartInterpretation.chartEvidenceSignal, 'missing_or_unknown');
const missingChartRecommendation = buildModelCandidateResearchRecommendation({
  evidence: {
    ...sufficientEvidence,
    reviewEvidenceSummary: { ...sufficientEvidence.reviewEvidenceSummary, samplesMissingCharts: 1, samplesWithChartEvidence: 9, samplesWithExactPngPath: 9, samplesWithExactReportPath: 9 },
  },
  interpretation: missingChartInterpretation,
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.notEqual(missingChartRecommendation.status, 'candidate_review_recommended');
assert.equal(missingChartRecommendation.gateResults.chartEvidenceGate, 'fail');

const partialPnlInterpretation = interpretModelCandidateAdvisoryEvidence({
  evidence: {
    ...sufficientEvidence,
    estimatedGrossContractPnlSummary: {
      rootSymbol: 'MES',
      sampleCountWithPnl: 10,
      sampleCountMissingPnl: 0,
      avgMfeDollars: 75,
      status: 'partial',
    },
  },
  candidateReadinessStatus: 'candidate_review_recommended',
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.equal(partialPnlInterpretation.pnlSignal, 'partial_not_decisive');
assert.ok(partialPnlInterpretation.reasons.some((reason) => reason.includes('MFE-only evidence')));
const partialPnlRecommendation = buildModelCandidateResearchRecommendation({
  evidence: {
    ...sufficientEvidence,
    estimatedGrossContractPnlSummary: {
      rootSymbol: 'MES',
      sampleCountWithPnl: 10,
      sampleCountMissingPnl: 0,
      avgMfeDollars: 75,
      status: 'partial',
    },
  },
  interpretation: partialPnlInterpretation,
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.equal(partialPnlRecommendation.gateResults.pnlSupportSignal, 'partial');
assert.ok(partialPnlRecommendation.reasons.some((reason) => reason.includes('not treated as a profit result')));

const adversePnlInterpretation = interpretModelCandidateAdvisoryEvidence({
  evidence: {
    ...sufficientEvidence,
    estimatedGrossContractPnlSummary: {
      ...sufficientEvidence.estimatedGrossContractPnlSummary,
      avgHypotheticalOutcomeDollars: -10,
      totalHypotheticalOutcomeDollars: -100,
      bestHypotheticalOutcomeDollars: 20,
      worstHypotheticalOutcomeDollars: -40,
      status: 'available',
    },
  },
  candidateReadinessStatus: 'watchlist_candidate',
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.equal(adversePnlInterpretation.pnlSignal, 'adverse_or_mixed');
assert.notEqual(adversePnlInterpretation.advisoryStatus, 'candidate_review_recommended');
const adversePnlRecommendation = buildModelCandidateResearchRecommendation({
  evidence: {
    ...sufficientEvidence,
    estimatedGrossContractPnlSummary: {
      ...sufficientEvidence.estimatedGrossContractPnlSummary,
      avgHypotheticalOutcomeDollars: -10,
      totalHypotheticalOutcomeDollars: -100,
      bestHypotheticalOutcomeDollars: 20,
      worstHypotheticalOutcomeDollars: -40,
      status: 'available',
    },
  },
  interpretation: adversePnlInterpretation,
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.equal(adversePnlRecommendation.status, 'watchlist_candidate');
assert.equal(adversePnlRecommendation.gateResults.pnlSupportSignal, 'adverse_or_mixed');

const negativeAgentInterpretation = interpretModelCandidateAdvisoryEvidence({
  evidence: {
    ...sufficientEvidence,
    agentAssessmentSummary: {
      agreesWithHuman: 1,
      partiallyAgreesWithHuman: 0,
      disagreesWithHuman: 9,
      unclearInsufficientEvidence: 0,
    },
  },
  candidateReadinessStatus: 'candidate_review_recommended',
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
const negativeAgentRecommendation = buildModelCandidateResearchRecommendation({
  evidence: {
    ...sufficientEvidence,
    agentAssessmentSummary: {
      agreesWithHuman: 1,
      partiallyAgreesWithHuman: 0,
      disagreesWithHuman: 9,
      unclearInsufficientEvidence: 0,
    },
  },
  interpretation: negativeAgentInterpretation,
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.equal(negativeAgentRecommendation.gateResults.agentAssessmentGate, 'fail');
assert.notEqual(negativeAgentRecommendation.status, 'candidate_review_recommended');

const positivePnlLowSampleRecommendation = buildModelCandidateResearchRecommendation({
  evidence: { ...sufficientEvidence, sampleCount: 4, humanApprovedCount: 4, humanNotApprovedCount: 0, humanApprovalRate: 1 },
  interpretation: interpretModelCandidateAdvisoryEvidence({
    evidence: { ...sufficientEvidence, sampleCount: 4, humanApprovedCount: 4, humanNotApprovedCount: 0, humanApprovalRate: 1 },
    candidateReadinessStatus: 'candidate_review_recommended',
    thresholds: { minimumReviewedSamples: 4, minimumApprovalRate: 0.7 },
  }),
  thresholds: { minimumReviewedSamples: 4, minimumApprovalRate: 0.7 },
});
assert.notEqual(positivePnlLowSampleRecommendation.status, 'candidate_review_recommended');
assert.equal(positivePnlLowSampleRecommendation.gateResults.sampleCountGate, 'fail');

writeFileSync(path.join(reviewDir, 'research-sample-review-MES-extra-2026-05-30.reviewed.json'), `${JSON.stringify(reviewPack([
  sample('twld-006', 'time_window_liquidity_delivery', 'approved_for_future_model_candidate_review'),
]), null, 2)}\n`, 'utf8');
writeFileSync(path.join(chartDir, 'price-action-review-card-MES-2026-01-01-to-2026-05-30-twld-006.png'), 'png fixture', 'utf8');
const multiFileLedger = await buildModelCandidateReviewLedger({
  from: '2026-01-01',
  to: '2026-05-30',
  symbol: 'MES',
  reviewPackDir: reviewDir,
  outcomeReportDir: outcomeDir,
  chartDir,
  outDir: path.join(temp, 'multi-file-ledger'),
  pretty: true,
  json: false,
  thresholds: {
    minimumReviewedSamples: 4,
    minimumApprovalRate: 0.7,
  },
});
assert.equal(multiFileLedger.summary.reviewedFilesRead, 2);
assert.equal(multiFileLedger.summary.reviewedSamplesFound, 6);
assert.equal(multiFileLedger.summary.humanReviewedSamplesFound, 8);
assert.equal(multiFileLedger.reviewedArtifactDiagnostics.files.length, 2);
assert.equal(multiFileLedger.reviewedArtifactDiagnostics.acceptedModelCandidateSamples, 6);
assert.equal(existsSync(multiFileLedger.outputPaths.rangeJsonPath || ''), true);
assert.equal(existsSync(multiFileLedger.outputPaths.rangeWatchlistJsonPath || ''), true);
assertNoExecutableLedgerFields(multiFileLedger);

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
