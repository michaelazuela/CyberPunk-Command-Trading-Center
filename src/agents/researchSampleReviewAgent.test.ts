import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createResearchSampleReviewPack,
  type ResearchSampleReviewSourceReport,
} from './researchSampleReviewAgent';
import type { HistoricalResearchBackfillReport } from './historicalResearchBackfillAgent';
import {
  loadResearchBackfillReports,
  parseResearchSampleReviewArgs,
} from '../../tools/automation/research-sample-review';

function fixtureReport(): HistoricalResearchBackfillReport {
  const base = {
    totalCandidates: 0,
    datesReviewed: { from: '2026-01-01', to: '2026-05-29' },
    dataGaps: [],
    classificationCounts: { model1Overlap: 0, turtleSoupOverlap: 0, advisoryOnly: 0 },
    approvedModelOverlaps: { model1: 0, turtleSoup: 0 },
    advisoryOnlyCount: 0,
    commonReasons: [],
    sampleEvents: [],
    sampleThreshold: { minimum: 20, current: 0, met: false },
    metrics: {},
    recommendation: 'consider_future_advisory_smoke_test' as const,
    ruleChangeRecommendation: 'none' as const,
  };
  return {
    reportType: 'historical_research_backfill',
    generatedAt: '2026-05-29T20:00:00.000Z',
    from: '2026-01-01',
    to: '2026-05-29',
    instrument: 'MES',
    selectedConcept: 'all',
    executiveSummary: ['fixture'],
    dataCoverage: {
      completed5mBars: 100,
      sourceCoverage: {
        localBridgeDatesScanned: ['2026-01-02', '2026-02-03', '2026-03-04'],
        supabaseRecordsScanned: 0,
        auditJsonRecordsScanned: 0,
        diagnosticReportsScanned: 0,
        skippedDates: [],
        missingDataDates: [],
      },
      barCoverage: [],
      supabaseRecords: 0,
      auditRecords: 0,
      diagnosticReports: 0,
      existingResearchNotes: 0,
      dataGaps: [],
    },
    detectorAudit: [],
    zeroCandidateExplanation: [],
    conceptReports: [
      {
        ...base,
        conceptId: 'time_window_liquidity_delivery',
        title: 'Time-Window Liquidity Delivery',
        totalCandidates: 5,
        advisoryOnlyCount: 3,
        classificationCounts: { model1Overlap: 1, turtleSoupOverlap: 1, advisoryOnly: 3 },
        approvedModelOverlaps: { model1: 1, turtleSoup: 1 },
        commonReasons: ['Approved Model 1 or Turtle Soup gates were not evaluated by research backfill. (3)'],
        sampleEvents: [
          {
            date: '2026-01-02',
            time: '03:00',
            direction: 'LONG',
            window: '3:00-4:00 NY',
            summary: 'Defined window showed liquidity-delivery range expansion.',
            classification: 'advisory_only',
          },
          {
            date: '2026-02-03',
            time: '10:00',
            direction: 'SHORT',
            window: '10:00-11:00 NY',
            summary: 'Model 1 overlap marker from historical record.',
            classification: 'model1_overlap',
          },
          {
            date: '2026-03-04',
            time: '14:00',
            direction: 'LONG',
            window: '2:00-3:00 NY',
            summary: 'Turtle Soup overlap marker from historical record.',
            classification: 'turtle_soup_overlap',
          },
          {
            date: '2026-04-05',
            time: '10:30',
            direction: 'SHORT',
            window: '10:00-11:00 NY',
            summary: 'Second advisory sample.',
            classification: 'advisory_only',
          },
          {
            date: '2026-05-06',
            time: '14:30',
            direction: 'LONG',
            window: '2:00-3:00 NY',
            summary: 'Third advisory sample.',
            classification: 'advisory_only',
          },
        ],
      },
      {
        ...base,
        conceptId: 'false_run_liquidity_fade',
        title: 'False-Run Liquidity Fade Near Highs',
        totalCandidates: 2,
        advisoryOnlyCount: 2,
        classificationCounts: { model1Overlap: 0, turtleSoupOverlap: 0, advisoryOnly: 2 },
        commonReasons: ['False-run behavior needs sweep/reclaim validation before Turtle Soup mapping. (2)'],
        sampleEvents: [
          {
            date: '2026-01-07',
            time: '12:10',
            direction: 'SHORT',
            window: 'regular_session',
            summary: 'Price pressed a major intraday high and later delivered lower.',
            classification: 'advisory_only',
          },
          {
            date: '2026-03-09',
            time: '15:25',
            direction: 'SHORT',
            window: 'regular_session',
            summary: 'Another false-run advisory sample.',
            classification: 'advisory_only',
          },
        ],
      },
      {
        ...base,
        conceptId: 'amd_range_model',
        title: 'Accumulation-Manipulation-Distribution Range Model',
        totalCandidates: 1,
        advisoryOnlyCount: 1,
        classificationCounts: { model1Overlap: 0, turtleSoupOverlap: 0, advisoryOnly: 1 },
        commonReasons: ['AMD narrative is research-only unless Model 1 or Turtle Soup gates independently pass. (1)'],
        sampleEvents: [
          {
            date: '2026-05-25',
            time: '09:30',
            direction: 'LONG',
            window: 'opening_reference',
            summary: 'Open-based accumulation followed by later range expansion was observed.',
            classification: 'advisory_only',
          },
        ],
      },
      {
        ...base,
        conceptId: 'final_hour_liquidity_draw',
        title: 'Final-Hour Liquidity Draw',
        totalCandidates: 2,
        advisoryOnlyCount: 2,
        classificationCounts: { model1Overlap: 0, turtleSoupOverlap: 0, advisoryOnly: 2 },
        commonReasons: ['Final-hour condition remains advisory-only unless current approved gates pass independently. (2)'],
        sampleEvents: [
          {
            date: '2026-01-08',
            time: '15:15',
            direction: 'LONG',
            window: '3:15-3:45 NY',
            summary: 'Final-hour range expansion showed a possible liquidity draw.',
            classification: 'advisory_only',
          },
          {
            date: '2026-02-09',
            time: '15:15',
            direction: 'SHORT',
            window: '3:15-3:45 NY',
            summary: 'Final-hour short-side advisory sample.',
            classification: 'advisory_only',
          },
        ],
      },
    ],
    approvedModelOverlap: { model1: 1, turtleSoup: 1, total: 2 },
    advisoryOnlyFindings: [],
    repeatedFailureNoEntryReasons: [],
    candidateConceptsWorthContinuedTracking: [],
    candidateConceptsNotWorthContinuingYet: [],
    humanReviewQueue: [],
    doNotChangeYetItems: [],
    recommendedNextSteps: [],
    approvalBoundary: {
      researchBackfillApprovesTrade: false,
      researchBackfillChangesRules: false,
      researchBackfillCreatesEntry: false,
      researchBackfillCreatesTargets: false,
      researchBackfillOverridesScanner: false,
      researchBackfillPromotesModel: false,
      researchBackfillBuildsNewPlan: false,
      researchBackfillWritesRagMemory: false,
    },
    markdown: 'fixture',
  };
}

const parsed = parseResearchSampleReviewArgs([
  '--concept', 'time_window_liquidity_delivery',
  '--instrument', 'MES',
  '--sample-size', '30',
  '--out', 'tools/automation/research-review-packs',
  '--json',
  '--pretty',
]);
assert.equal(parsed.concept, 'time_window_liquidity_delivery');
assert.equal(parsed.instrument, 'MES');
assert.equal(parsed.sampleSize, 30);
assert.equal(parsed.json, true);
assert.equal(parsed.pretty, true);

const report = fixtureReport();
const sourceReports: ResearchSampleReviewSourceReport[] = [{ path: 'fixture/research-backfill.json', report }];
const timeWindowPack = createResearchSampleReviewPack({
  instrument: 'MES',
  concept: 'time_window_liquidity_delivery',
  sampleSize: 3,
  sourceReports,
  generatedAt: '2026-05-29T21:00:00.000Z',
});

assert.equal(timeWindowPack.reportType, 'research_sample_review_pack');
assert.equal(timeWindowPack.selectedSampleCount, 3);
assert.equal(timeWindowPack.samples.length, 3);
assert.ok(timeWindowPack.samples.some((sample) => sample.agentInspectionLabel === 'possible_model1_mapping_review'));
assert.ok(timeWindowPack.samples.some((sample) => sample.agentInspectionLabel === 'possible_turtle_soup_mapping_review'));
assert.ok(timeWindowPack.samples.some((sample) => sample.agentInspectionLabel === 'keep_advisory'));
assert.ok(timeWindowPack.conceptSummaries[0].directionCounts.LONG >= 1);
assert.ok(timeWindowPack.conceptSummaries[0].directionCounts.SHORT >= 1);
assert.ok(Object.keys(timeWindowPack.conceptSummaries[0].windowCounts).length >= 2);
assert.ok(timeWindowPack.samples.every((sample) => sample.agentApprovalBoundary.agentApprovesTrade === false));
assert.ok(timeWindowPack.samples.every((sample) => sample.agentApprovalBoundary.agentChangesRules === false));
assert.ok(timeWindowPack.samples.every((sample) => sample.agentApprovalBoundary.agentCreatesEntry === false));
assert.ok(timeWindowPack.samples.every((sample) => sample.agentApprovalBoundary.agentCreatesTargets === false));
assert.ok(timeWindowPack.samples.every((sample) => sample.agentApprovalBoundary.agentPromotesModel === false));
assert.ok(timeWindowPack.samples.every((sample) => sample.humanInspectionLabel === null));
assert.ok(timeWindowPack.samples.every((sample) => sample.humanConfidence === null));
assert.ok(timeWindowPack.samples.every((sample) => sample.humanReason === null));
assert.ok(timeWindowPack.samples.every((sample) => sample.humanNotes === null));
assert.ok(timeWindowPack.samples.every((sample) => sample.humanReviewedAt === null));
assert.ok(timeWindowPack.samples.every((sample) => sample.humanReviewer === null));
assert.ok(timeWindowPack.samples.every((sample) => sample.agentHumanAgreement === null));
assert.ok(timeWindowPack.samples.every((sample) => sample.disagreementReason === null));
assert.ok(timeWindowPack.samples.every((sample) => sample.finalReviewLabel === null));
assert.ok(timeWindowPack.samples.every((sample) => sample.finalReviewNotes === null));
assert.equal(timeWindowPack.approvalBoundary.sampleReviewApprovesTrade, false);
assert.equal(timeWindowPack.approvalBoundary.sampleReviewChangesRules, false);
assert.equal(timeWindowPack.approvalBoundary.sampleReviewCreatesEntry, false);
assert.equal(timeWindowPack.approvalBoundary.sampleReviewCreatesTargets, false);
assert.equal(timeWindowPack.approvalBoundary.sampleReviewPromotesModel, false);
assert.equal(timeWindowPack.approvalBoundary.sampleReviewWritesRagMemory, false);
assert.ok(timeWindowPack.markdown.includes('## 5. Agent Inspection Results'));
assert.ok(timeWindowPack.markdown.includes('## 6. Human Review Fields To Complete'));
assert.ok(timeWindowPack.markdown.includes('## 10. Do-Not-Change-Yet Items'));
assert.ok(timeWindowPack.markdown.includes('Agent inspection does not approve trades'));
assert.ok(!/Trade now|approved executable|model promotion recommended/i.test(timeWindowPack.markdown));

for (const sample of timeWindowPack.samples) {
  const keys = Object.keys(sample);
  assert.equal(keys.includes('entry'), false);
  assert.equal(keys.includes('stop'), false);
  assert.equal(keys.includes('t1'), false);
  assert.equal(keys.includes('t2'), false);
  assert.equal((sample as unknown as { canExecute?: boolean }).canExecute, undefined);
}

const allPack = createResearchSampleReviewPack({
  instrument: 'MES',
  concept: 'all',
  sampleSize: 6,
  sourceReports,
  generatedAt: '2026-05-29T21:00:00.000Z',
});
assert.equal(allPack.selectedSampleCount, 6);
assert.ok(allPack.conceptSummaries.some((summary) => summary.concept === 'false_run_liquidity_fade' && summary.selectedSamples > 0));
assert.ok(allPack.conceptSummaries.some((summary) => summary.concept === 'final_hour_liquidity_draw' && summary.selectedSamples > 0));
assert.ok(allPack.samples.every((sample) => sample.agentInspectionLabel !== 'possible_model1_mapping_review' || sample.agentApprovalBoundary.agentApprovesTrade === false));
assert.ok(allPack.samples.every((sample) => sample.agentInspectionLabel !== 'possible_turtle_soup_mapping_review' || sample.agentApprovalBoundary.agentApprovesTrade === false));

const before = JSON.stringify(sourceReports);
createResearchSampleReviewPack({
  instrument: 'MES',
  concept: 'all',
  sampleSize: 4,
  sourceReports,
  generatedAt: '2026-05-29T21:00:00.000Z',
});
assert.equal(JSON.stringify(sourceReports), before);

const temp = mkdtempSync(join(tmpdir(), 'research-sample-review-'));
const nested = join(temp, 'time-window-liquidity-delivery');
mkdirSync(nested, { recursive: true });
writeFileSync(join(nested, 'research-backfill.json'), `${JSON.stringify(report)}\n`);
writeFileSync(join(nested, 'not-a-report.json'), '{"hello":"world"}\n');
writeFileSync(join(nested, 'not-json.json'), '{');
const loaded = await loadResearchBackfillReports(temp);
assert.equal(loaded.length, 1);
assert.equal(loaded[0].report.reportType, 'historical_research_backfill');
assert.equal(readFileSync(join(nested, 'research-backfill.json'), 'utf8').includes('historical_research_backfill'), true);

console.log('Research sample review agent verified.');

