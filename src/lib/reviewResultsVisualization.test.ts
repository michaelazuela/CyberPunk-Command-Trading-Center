import assert from 'node:assert/strict';
import { adaptReviewAgentOutputToVisualization } from './reviewResultsVisualization';

const researchPack = {
  reportType: 'research_sample_review_pack',
  generatedAt: '2026-05-30T01:00:00.000Z',
  instrument: 'MES',
  samples: [
    {
      sampleId: 'time_window_liquidity_delivery-001',
      date: '2026-01-02',
      time: '03:00',
      conceptTitle: 'Time-Window Liquidity Delivery',
      direction: 'LONG',
      window: '3:00-4:00 NY',
      classification: 'advisory_only',
      warningFailureReason: 'Approved no installed model path gates were not evaluated by research backfill.',
      agentInspectionLabel: 'keep_advisory',
      agentConfidence: 'high',
      humanInspectionLabel: 'approved_for_future_model_candidate_review',
      agentAssessment: {
        status: 'partially_agrees_with_human',
      },
      reviewEvidence: {
        chartAvailable: true,
        chartWithheld: false,
        chartPngPath: 'tools/automation/research-review-charts/card.png',
        chartReportPath: 'tools/automation/research-review-charts/report.md',
        evidenceStatus: 'chart_available',
      },
      estimatedGrossContractPnl: {
        rootSymbol: 'MES',
        status: 'available',
        hypotheticalOutcomeDollars: 40,
        mfeDollars: 56.25,
        maeDollars: -8.75,
      },
      sampleSourceReportPath: 'tools/automation/research-reports/research-backfill.json',
      advisoryOnly: true,
      agentApprovalBoundary: {
        agentApprovesTrade: false,
        agentChangesRules: false,
        agentCreatesEntry: false,
        agentCreatesTargets: false,
        agentPromotesModel: false,
      },
    },
    {
      sampleId: 'false_run_liquidity_fade-001',
      date: '2026-01-07',
      time: '12:10',
      conceptTitle: 'False-Run Liquidity Fade Near Highs',
      direction: 'SHORT',
      window: 'regular_session',
      classification: 'advisory_only',
      researchDetectorReason: 'False-run behavior needs historical reversal pattern validation before no installed model path mapping.',
      agentInspectionLabel: 'reject',
      agentConfidence: 'medium',
      advisoryOnly: true,
    },
  ],
};

const visualization = adaptReviewAgentOutputToVisualization(researchPack, 'fixture-review-pack.json');
assert.equal(visualization.sourceLabel, 'fixture-review-pack.json');
assert.equal(visualization.instrument, 'MES');
assert.equal(visualization.summary.totalReviewedSamples, 2);
assert.equal(visualization.summary.executableCount, 0);
assert.equal(visualization.summary.nonExecutableCount, 2);
assert.equal(visualization.summary.averageResearchQualityScore, null);
assert.equal(visualization.summary.averageRiskScore, null);
assert.equal(visualization.rows[0].sampleId, 'time_window_liquidity_delivery-001');
assert.equal(visualization.rows[0].timestamp, '2026-01-02 03:00');
assert.equal(visualization.rows[0].setupName, 'Time-Window Liquidity Delivery');
assert.equal(visualization.rows[0].decision, 'approved_for_future_model_candidate_review');
assert.equal(visualization.rows[0].riskScore, null);
assert.equal(visualization.rows[0].entryCandidate, null);
assert.equal(visualization.rows[0].stopCandidate, null);
assert.equal(visualization.rows[0].targetArea, 'Not provided');
assert.equal(visualization.rows[0].humanReviewStatus, 'approved_for_future_model_candidate_review');
assert.equal(visualization.rows[0].agentAssessmentStatus, 'partially_agrees_with_human');
assert.equal(visualization.rows[0].chartEvidenceStatus, 'chart_available');
assert.equal(visualization.rows[0].chartPngPath, 'tools/automation/research-review-charts/card.png');
assert.equal(visualization.rows[0].chartReportPath, 'tools/automation/research-review-charts/report.md');
assert.equal(visualization.rows[0].estimatedGrossContractPnlStatus, 'available');
assert.ok(visualization.rows[0].estimatedGrossContractPnlLabel.includes('research-only estimated gross contract P/L'));
assert.ok(visualization.rows[0].estimatedGrossContractPnlLabel.includes('Hyp +$40.00 gross'));
assert.equal(visualization.summary.samplesWithChartEvidence, 1);
assert.equal(visualization.summary.samplesWithEstimatedGrossContractPnl, 1);
assert.ok(visualization.countBySetupType.some((item) => item.name === 'Time-Window Liquidity Delivery' && item.count === 1));
assert.ok(visualization.countByBlockReason.some((item) => item.name.includes('Approved no installed model path') && item.count === 1));
assert.ok(visualization.warnings.some((warning) => warning.includes('research quality score was not present')));
assert.equal((visualization.rows[0].raw as any).agentApprovalBoundary.agentApprovesTrade, false);

const scannerLikeReview = {
  generatedAt: '2026-05-30T02:00:00.000Z',
  symbol: 'MES',
  findings: [
    {
      id: 'scanner-review-001',
      completedCandleTime: '2026-05-29T11:25:00-04:00',
      setupName: 'no installed model path LONG',
      direction: 'LONG',
      decision: 'WAIT',
      executionStatus: 'Conditional',
      conditionalRiskScore: { score: 49, label: 'High risk', blockReason: 'ExtendedStructuralRisk' },
      candidate: {
        riskPoints: 8.25,
        entry: 7597,
        stop: 7588.75,
        target1: 7620,
        target2: 7620,
      },
    },
  ],
};

const scannerViz = adaptReviewAgentOutputToVisualization(scannerLikeReview, 'scanner-audit.json');
assert.equal(scannerViz.summary.totalReviewedSamples, 1);
assert.equal(scannerViz.summary.averageRiskScore, 49);
assert.equal(scannerViz.summary.averageResearchQualityScore, null);
assert.equal(scannerViz.rows[0].riskPoints, 8.25);
assert.equal(scannerViz.rows[0].riskScore, 49);
assert.equal(scannerViz.rows[0].blockReason, 'ExtendedStructuralRisk');
assert.equal(scannerViz.rows[0].entryCandidate, 7597);
assert.equal(scannerViz.rows[0].stopCandidate, 7588.75);
assert.equal(scannerViz.rows[0].targetArea, '7620 / 7620');

const alternateRiskFields = adaptReviewAgentOutputToVisualization({
  instrument: 'MES',
  rows: [{
    id: 'alternate-risk-001',
    timestamp: '2026-05-29T12:00:00-04:00',
    setupName: 'Review row',
    riskAssessment: { riskScore: '72', label: 'Acceptable risk', blockReason: 'Manual review only' },
    risk: { points: '3.75' },
  }],
});
assert.equal(alternateRiskFields.rows[0].riskScore, 72);
assert.equal(alternateRiskFields.rows[0].riskPoints, 3.75);
assert.equal(alternateRiskFields.rows[0].riskLabel, 'Acceptable risk');
assert.equal(alternateRiskFields.warnings.some((warning) => warning.includes('research quality score was not present')), false);

const researchQualityPack = adaptReviewAgentOutputToVisualization({
  instrument: 'MES',
  samples: [{
    sampleId: 'research-quality-001',
    date: '2026-05-29',
    time: '10:00',
    conceptTitle: 'Research Quality Fixture',
    direction: 'LONG',
    researchQualityScore: { score: 84, label: 'Strong', reasons: ['fixture'], source: 'research-only-score', researchOnly: true },
  }],
});
assert.equal(researchQualityPack.rows[0].researchQualityScore, 84);
assert.equal(researchQualityPack.rows[0].riskScore, 84);
assert.equal(researchQualityPack.summary.averageResearchQualityScore, 84);
assert.equal(researchQualityPack.researchQualityScoreBySample[0].researchQualityLabel, 'Strong');

const malformedRiskFields = adaptReviewAgentOutputToVisualization({
  instrument: 'MES',
  rows: [{
    id: 'bad-risk-001',
    setupName: 'Review row',
    riskAssessment: { riskScore: 'not-a-number', label: 'Unknown' },
  }],
});
assert.equal(malformedRiskFields.rows[0].riskScore, null);
assert.ok(malformedRiskFields.warnings.some((warning) => warning.includes('research quality/risk score field was present but not numeric')));

const unknownPnl = adaptReviewAgentOutputToVisualization({
  instrument: 'MES',
  samples: [{
    sampleId: 'unknown-pnl-001',
    estimatedGrossContractPnl: {
      rootSymbol: 'UNKNOWN',
      status: 'unavailable_unknown_contract',
    },
  }],
});
assert.equal(unknownPnl.rows[0].estimatedGrossContractPnlLabel, 'Unavailable: unknown contract');
assert.equal(unknownPnl.summary.samplesWithEstimatedGrossContractPnl, 0);

const pointerSelectedVisualization = adaptReviewAgentOutputToVisualization(researchPack, 'tools/automation/research-review-packs/research-sample-review-MES-all-2026-05-31.json');
assert.equal(pointerSelectedVisualization.sourceLabel, 'tools/automation/research-review-packs/research-sample-review-MES-all-2026-05-31.json');
assert.equal(pointerSelectedVisualization.summary.totalReviewedSamples, 2);

const malformed = adaptReviewAgentOutputToVisualization(null);
assert.equal(malformed.summary.totalReviewedSamples, 0);
assert.ok(malformed.warnings[0].includes('Malformed review data'));

console.log('Review results visualization adapter verified.');
