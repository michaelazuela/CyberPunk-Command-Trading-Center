import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertNoExecutableOutcomeFields,
  calculateResearchCandidateOutcome,
  extractOutcomeInputFromSource,
  runResearchOutcomeMath,
  type ResearchOutcomeBar,
  type ResearchOutcomeCandidate,
} from './researchOutcomeMathAgent';
import { parseResearchOutcomeMathArgs, runResearchOutcomeMathCli } from '../../tools/automation/research-outcome-math';

const bars: ResearchOutcomeBar[] = [
  { time: '2026-05-28T10:00:00', open: 100, high: 101, low: 99, close: 100 },
  { time: '2026-05-28T10:05:00', open: 100, high: 103, low: 99, close: 102 },
  { time: '2026-05-28T10:10:00', open: 102, high: 105, low: 101, close: 104 },
  { time: '2026-05-28T10:15:00', open: 104, high: 109, low: 103, close: 108 },
  { time: '2026-05-28T10:20:00', open: 108, high: 108.5, low: 95, close: 96 },
];

const longCandidate: ResearchOutcomeCandidate = {
  candidateId: 'long-001',
  date: '2026-05-28',
  time: '10:00',
  instrument: 'MES',
  concept: 'time_window_liquidity_delivery',
  direction: 'LONG',
  window: '10:00-11:00 NY',
  classification: 'advisory_only',
  summary: 'Long advisory fixture.',
  advisoryOnly: true,
};

const longOutcome = calculateResearchCandidateOutcome(longCandidate, bars, {
  thresholdOnePoints: 4,
  thresholdTwoPoints: 8,
  adverseThresholdPoints: 4,
  observationWindowBars: 4,
});
assert.equal(longOutcome.referencePrice, 100);
assert.equal(longOutcome.maxFavorableExcursionPoints, 9);
assert.equal(longOutcome.maxAdverseExcursionPoints, 5);
assert.equal(longOutcome.maxFavorableExcursionTicks, 36);
assert.equal(longOutcome.maxAdverseExcursionTicks, 20);
assert.equal(longOutcome.thresholdOneTouched, true);
assert.equal(longOutcome.thresholdTwoTouched, true);
assert.equal(longOutcome.adverseThresholdTouched, true);
assert.equal(longOutcome.firstMeaningfulMove, 'favorable');
assert.equal(longOutcome.outcomeClassification, 'favorable_then_failed');
assert.equal(longOutcome.timeToMaxFavorableBars, 3);
assert.equal(longOutcome.timeToMaxAdverseBars, 4);

const candidateLevelOutcome = calculateResearchCandidateOutcome({
  ...longCandidate,
  referencePrice: 100,
  postSignalBars: bars.slice(1).map((bar) => ({ ...bar, advisoryOnly: true })),
}, [], {
  thresholdOnePoints: 4,
  thresholdTwoPoints: 8,
  adverseThresholdPoints: 4,
  observationWindowBars: 4,
});
assert.equal(candidateLevelOutcome.referencePrice, 100);
assert.equal(candidateLevelOutcome.outcomeClassification, 'favorable_then_failed');
assert.ok(candidateLevelOutcome.dataQualityNotes.some((note) => note.includes('candidate-level post-signal observation window')));

const shortBars: ResearchOutcomeBar[] = [
  { time: '2026-05-28T11:00:00', open: 100, high: 101, low: 99, close: 100 },
  { time: '2026-05-28T11:05:00', open: 100, high: 101, low: 96, close: 97 },
  { time: '2026-05-28T11:10:00', open: 97, high: 98, low: 91, close: 92 },
];
const shortOutcome = calculateResearchCandidateOutcome({
  ...longCandidate,
  candidateId: 'short-001',
  time: '11:00',
  direction: 'SHORT',
}, shortBars, {
  thresholdOnePoints: 4,
  thresholdTwoPoints: 8,
  adverseThresholdPoints: 4,
  observationWindowBars: 2,
});
assert.equal(shortOutcome.maxFavorableExcursionPoints, 9);
assert.equal(shortOutcome.maxAdverseExcursionPoints, 1);
assert.equal(shortOutcome.thresholdOneTouched, true);
assert.equal(shortOutcome.thresholdTwoTouched, true);
assert.equal(shortOutcome.adverseThresholdTouched, false);
assert.equal(shortOutcome.firstMeaningfulMove, 'favorable');
assert.equal(shortOutcome.outcomeClassification, 'favorable_continuation');

const adverseFirst = calculateResearchCandidateOutcome(longCandidate, [
  { time: '2026-05-28T10:00:00', open: 100, high: 100.5, low: 99, close: 100 },
  { time: '2026-05-28T10:05:00', open: 100, high: 101, low: 95, close: 96 },
  { time: '2026-05-28T10:10:00', open: 96, high: 106, low: 96, close: 105 },
], { thresholdOnePoints: 4, thresholdTwoPoints: 8, adverseThresholdPoints: 4, observationWindowBars: 2 });
assert.equal(adverseFirst.firstMeaningfulMove, 'adverse');
assert.equal(adverseFirst.outcomeClassification, 'adverse_first');

const neutralOutcome = calculateResearchCandidateOutcome(longCandidate, [
  { time: '2026-05-28T10:00:00', open: 100, high: 100.5, low: 99.5, close: 100 },
  { time: '2026-05-28T10:05:00', open: 100, high: 102, low: 99, close: 101 },
], { thresholdOnePoints: 4, thresholdTwoPoints: 8, adverseThresholdPoints: 4, observationWindowBars: 1 });
assert.equal(neutralOutcome.firstMeaningfulMove, 'mixed');
assert.equal(neutralOutcome.outcomeClassification, 'neutral');

const insufficientBars = calculateResearchCandidateOutcome(longCandidate, [], undefined);
assert.equal(insufficientBars.outcomeClassification, 'insufficient_data');
assert.equal(insufficientBars.thresholdOneTouched, null);
assert.ok(insufficientBars.dataQualityNotes.some((note) => note.includes('No saved future 5M bars')));

const unclearDirection = calculateResearchCandidateOutcome({
  ...longCandidate,
  candidateId: 'no-direction',
  direction: 'NO TRADE',
}, bars, undefined);
assert.equal(unclearDirection.outcomeClassification, 'insufficient_data');
assert.ok(unclearDirection.dataQualityNotes.some((note) => note.includes('direction')));

const report = runResearchOutcomeMath({
  sourcePath: 'fixture/source.json',
  instrument: 'MES',
  candidates: [
    longCandidate,
    { ...longCandidate, candidateId: 'short-001', time: '11:00', direction: 'SHORT', concept: 'false_run_liquidity_fade' },
    { ...longCandidate, candidateId: 'missing-001', time: null, concept: 'final_hour_liquidity_draw' },
  ],
  bars5m: [...bars, ...shortBars],
  thresholds: { thresholdOnePoints: 4, thresholdTwoPoints: 8, adverseThresholdPoints: 4, observationWindowBars: 4 },
  generatedAt: '2026-05-29T20:00:00.000Z',
});
assert.equal(report.reportType, 'research_outcome_math');
assert.equal(report.advisoryOnly, true);
assert.equal(report.executionApproved, false);
assert.equal(report.summary.totalCandidates, 3);
assert.equal(report.summary.evaluatedCandidates, 2);
assert.equal(report.summary.insufficientDataCandidates, 1);
assert.equal(report.summary.thresholdOneTouchRate, 1);
assert.equal(report.summary.thresholdTwoTouchRate, 1);
assert.equal(report.conceptSummaries.length, 3);
assert.ok(report.conceptSummaries.some((summary) => summary.concept === 'time_window_liquidity_delivery' && summary.medianMfePoints === 9));
assert.equal(report.approvalBoundary.outcomeMathApprovesTrade, false);
assert.equal(report.approvalBoundary.outcomeMathChangesRules, false);
assert.equal(report.approvalBoundary.outcomeMathCreatesEntry, false);
assert.equal(report.approvalBoundary.outcomeMathCreatesTargets, false);
assert.equal(report.approvalBoundary.outcomeMathPromotesModel, false);
assert.ok(report.markdown.includes('## 2. Research-Only Boundary'));
assert.ok(report.markdown.includes('Thresholds are research thresholds, not entries, stops, or targets.'));
assertNoExecutableOutcomeFields(report);

for (const outcome of report.candidateOutcomes) {
  const keys = Object.keys(outcome);
  assert.equal(keys.includes('entry'), false);
  assert.equal(keys.includes('stop'), false);
  assert.equal(keys.includes('target'), false);
  assert.equal(keys.includes('canExecute'), false);
}

const backfillSource = {
  reportType: 'historical_research_backfill',
  instrument: 'MES',
  fullCandidateEvents: [{
    date: '2026-05-28',
    time: '10:00',
    instrument: 'MES',
    concept: 'time_window_liquidity_delivery',
    direction: 'LONG',
    window: '10:00-11:00 NY',
    classification: 'advisory_only',
    advisoryOnly: true,
    summary: 'fixture',
    detectorReason: 'fixture',
    warningFailureReason: 'fixture',
    dataQualityNotes: [],
    possibleModel1Overlap: false,
    possibleTurtleSoupOverlap: false,
    sourceSessionMetadata: { session: 'fixture', selectedConcept: 'all', dateRange: { from: '2026-05-28', to: '2026-05-28' } },
    researchOnlySignals: {},
    referencePrice: 100,
    postSignalBars: bars.slice(1).map((bar) => ({ ...bar, advisoryOnly: true })),
  }],
  researchBars: bars,
};
const extractedBackfill = extractOutcomeInputFromSource('backfill.json', backfillSource, 'MES');
assert.equal(extractedBackfill.candidates.length, 1);
assert.equal(extractedBackfill.bars5m?.length, bars.length);
assert.equal(extractedBackfill.candidates[0].postSignalBars?.length, 4);
assert.equal(extractedBackfill.candidates[0].referencePrice, 100);

const candidateLevelReport = runResearchOutcomeMath({
  sourcePath: 'candidate-level.json',
  instrument: 'MES',
  candidates: extractedBackfill.candidates,
  bars5m: [],
  thresholds: { thresholdOnePoints: 4, thresholdTwoPoints: 8, adverseThresholdPoints: 4, observationWindowBars: 4 },
});
assert.equal(candidateLevelReport.summary.evaluatedCandidates, 1);
assert.equal(candidateLevelReport.summary.insufficientDataCandidates, 0);
assert.ok(candidateLevelReport.candidateOutcomes[0].dataQualityNotes.some((note) => note.includes('candidate-level post-signal observation window')));

const reviewSource = {
  reportType: 'research_sample_review_pack',
  instrument: 'MES',
  samples: [{
    sampleId: 'sample-001',
    date: '2026-05-28',
    time: '10:00',
    concept: 'time_window_liquidity_delivery',
    conceptTitle: 'Time-Window Liquidity Delivery',
    direction: 'LONG',
    window: '10:00-11:00 NY',
    classification: 'advisory_only',
    advisoryOnly: true,
    summary: 'fixture',
    dataQualityNotes: [],
    sampleSourceReportPath: 'fixture',
  }],
  researchBars: bars,
};
const extractedReview = extractOutcomeInputFromSource('review.json', reviewSource, 'MES');
assert.equal(extractedReview.candidates[0].candidateId, 'sample-001');

const parsed = parseResearchOutcomeMathArgs([
  '--source', 'source.json',
  '--instrument', 'MES',
  '--threshold-one', '5',
  '--threshold-two', '10',
  '--adverse-threshold', '3',
  '--observation-bars', '6',
  '--out', 'tools/automation/research-outcome-reports',
  '--json',
  '--pretty',
]);
assert.equal(parsed.thresholds.thresholdOnePoints, 5);
assert.equal(parsed.thresholds.thresholdTwoPoints, 10);
assert.equal(parsed.thresholds.adverseThresholdPoints, 3);
assert.equal(parsed.thresholds.observationWindowBars, 6);

const temp = mkdtempSync(join(tmpdir(), 'research-outcome-math-'));
const sourceFile = join(temp, 'source.json');
const outDir = join(temp, 'out');
writeFileSync(sourceFile, `${JSON.stringify(backfillSource, null, 2)}\n`, 'utf8');
await runResearchOutcomeMathCli(['--source', sourceFile, '--instrument', 'MES', '--out', outDir, '--pretty']);
const written = join(outDir, `research-outcome-math-MES-${new Date().toISOString().slice(0, 10)}.json`);
assert.equal(existsSync(written), true);
const writtenReport = JSON.parse(readFileSync(written, 'utf8'));
assert.equal(writtenReport.reportType, 'research_outcome_math');
assert.equal(writtenReport.executionApproved, false);

console.log('Research outcome math agent verified.');
