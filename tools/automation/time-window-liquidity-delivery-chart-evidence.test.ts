import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildTimeWindowLiquidityDeliveryChartEvidenceReport,
  renderTimeWindowLiquidityDeliveryChartEvidenceMarkdown,
  writeTimeWindowLiquidityDeliveryChartEvidenceReport,
} from './time-window-liquidity-delivery-chart-evidence';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';

const temp = mkdtempSync(path.join(tmpdir(), 'twld-chart-evidence-'));
const auditPath = path.join(temp, 'time-window-liquidity-delivery-audit-MES-AM.json');
const curatedPath = path.join(temp, 'time-window-liquidity-delivery-AM-curated-review-pack-MES-2018-01-01-to-2026-05-31.json');
const reviewedPath = path.join(temp, 'reviewed', 'time-window-liquidity-delivery-AM-curated-review-pack-MES-2018-01-01-to-2026-05-31.reviewed.json');
const outDir = path.join(temp, 'chart-evidence');

const expectedSampleIds = [
  'advisory_only_samples-am_liquidity_delivery_window-2023-09-06',
  'advisory_only_samples-am_liquidity_delivery_window-2023-10-16',
  'advisory_only_samples-am_liquidity_delivery_window-2023-12-05',
  'advisory_only_samples-am_liquidity_delivery_window-2023-12-22',
  'advisory_only_samples-am_liquidity_delivery_window-2024-09-03',
  'advisory_only_samples-am_liquidity_delivery_window-2024-12-27',
  'advisory_only_samples-am_liquidity_delivery_window-2026-02-02',
  'advisory_only_samples-am_liquidity_delivery_window-2026-04-14',
];

function dateFromSampleId(sampleId: string): string {
  return sampleId.slice(-10);
}

const audit = {
  reportType: 'time_window_liquidity_delivery_audit',
  candidates: expectedSampleIds.map((sampleId, index) => ({
    candidateId: sampleId.replace('advisory_only_samples-', ''),
    date: dateFromSampleId(sampleId),
    cleanDrawObserved: true,
    expectedDeliveryHandles: 14 + index,
    expectedDeliveryTicks: 56 + index * 4,
    deliveryAchieved: false,
    failedDelivery: true,
    fvgOrInefficiencyRepricedInsideWindow: index % 2 === 0,
    bodiesRespectedFvgOrInefficiency: index % 2 === 1,
    priceAlreadyReachedDrawBeforeSetup: false,
    overlapClassification: 'advisory_only_time_window_research',
    priorLiquidityReferences: [],
    notes: ['Research-only fixture.'],
  })),
};

const curated = {
  reportType: 'time_window_liquidity_delivery_curated_review_pack',
  symbol: 'MES',
  from: '2018-01-01',
  to: '2026-05-31',
  windowStudied: 'AM',
  sourceAuditPath: auditPath,
  boundary: 'research_only_not_execution_authority',
  samples: [
    ...expectedSampleIds.map((sampleId, index) => ({
      sampleId,
      sourceCandidateId: sampleId.replace('advisory_only_samples-', ''),
      date: dateFromSampleId(sampleId),
      window: 'AM 10:00-11:00 NY',
      nyTime: '10:00-11:00',
      symbol: 'MES',
      classificationBucket: 'advisory_only_samples',
      drawType: index % 3 === 0 ? 'previous_day_high' : 'previous_day_low',
      drawLevel: 5100 + index,
      fvgOrInefficiencyPresent: true,
      marketStructureShiftPresent: true,
      sweepRaidPlusReclaimPresent: false,
      deliveryStatus: 'failed',
      modelOneOverlap: false,
      historicalReversalOverlap: false,
      advisoryOnly: true,
      chartPath: null,
      reportPath: null,
      inclusionReasons: ['Advisory-only sample.'],
      researchOnly: true,
      boundary: 'research_only_not_execution_authority',
    })),
    {
      sampleId: 'advisory_only_samples-am_liquidity_delivery_window-2023-12-04',
      sourceCandidateId: 'am_liquidity_delivery_window-2023-12-04',
      date: '2023-12-04',
      window: 'AM 10:00-11:00 NY',
      nyTime: '10:00-11:00',
      symbol: 'MES',
      classificationBucket: 'advisory_only_samples',
      drawType: 'previous_day_high',
      drawLevel: 5200,
      fvgOrInefficiencyPresent: true,
      marketStructureShiftPresent: true,
      sweepRaidPlusReclaimPresent: false,
      deliveryStatus: 'achieved',
      modelOneOverlap: false,
      historicalReversalOverlap: false,
      advisoryOnly: true,
      chartPath: null,
      reportPath: null,
      inclusionReasons: ['Strong advisory fixture.'],
      researchOnly: true,
      boundary: 'research_only_not_execution_authority',
    },
  ],
};

const reviewed = {
  reportType: 'time_window_liquidity_delivery_human_review',
  generatedAt: '2026-06-01T00:00:00.000Z',
  symbol: 'MES',
  from: '2018-01-01',
  to: '2026-05-31',
  windowStudied: 'AM',
  sourceCuratedPackPath: curatedPath,
  boundary: 'research_only_not_execution_authority',
  researchOnlyWarning: 'Research-only.',
  samples: [
    ...expectedSampleIds.map((sampleId) => ({
      sampleId,
      sourceBucket: 'advisory_only_samples',
      window: 'AM 10:00-11:00 NY',
      symbol: 'MES',
      dateTime: `${dateFromSampleId(sampleId)} 10:00-11:00`,
      suggestedLabel: 'strong_advisory_candidate',
      finalHumanLabel: 'needs_chart_review',
      reviewer: 'human',
      reviewedAt: '2026-06-01T00:00:00.000Z',
      reviewerNotes: 'Needs chart review before deciding.',
      sourceCuratedPackPath: curatedPath,
      boundary: 'research_only_not_execution_authority',
      safety: {
        activatesModel: false,
        approvesExecution: false,
        createsTrade: false,
        changesScanner: false,
        changesRules: false,
      },
    })),
    {
      sampleId: 'advisory_only_samples-am_liquidity_delivery_window-2023-12-04',
      sourceBucket: 'advisory_only_samples',
      window: 'AM 10:00-11:00 NY',
      symbol: 'MES',
      dateTime: '2023-12-04 10:00-11:00',
      suggestedLabel: 'strong_advisory_candidate',
      finalHumanLabel: 'strong_advisory_candidate',
      reviewer: 'human',
      reviewedAt: '2026-06-01T00:00:00.000Z',
      reviewerNotes: 'Already labeled strong.',
      sourceCuratedPackPath: curatedPath,
      boundary: 'research_only_not_execution_authority',
      safety: {
        activatesModel: false,
        approvesExecution: false,
        createsTrade: false,
        changesScanner: false,
        changesRules: false,
      },
    },
  ],
};

writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
writeFileSync(curatedPath, `${JSON.stringify(curated, null, 2)}\n`, 'utf8');
mkdirSync(path.dirname(reviewedPath), { recursive: true });
writeFileSync(reviewedPath, `${JSON.stringify(reviewed, null, 2)}\n`, 'utf8');

const report = buildTimeWindowLiquidityDeliveryChartEvidenceReport({
  symbol: 'MES',
  from: '2018-01-01',
  to: '2026-05-31',
  window: 'AM',
  reviewedPath,
  outDir,
  pretty: true,
  json: false,
});
writeTimeWindowLiquidityDeliveryChartEvidenceReport(report);
const markdown = renderTimeWindowLiquidityDeliveryChartEvidenceMarkdown(report);

assert.equal(report.reportType, 'time_window_liquidity_delivery_chart_evidence_pack');
assert.equal(report.labelFilter, 'needs_chart_review');
assert.equal(report.summary.needsChartReviewSamples, 8);
assert.deepEqual(report.records.map((record) => record.sampleId).sort(), [...expectedSampleIds].sort());
assert.ok(!report.records.some((record) => record.sampleId === 'advisory_only_samples-am_liquidity_delivery_window-2023-12-04'));
assert.ok(report.records.every((record) => record.recommendation));
assert.ok(report.records.every((record) => record.finalHumanLabelPreserved === 'needs_chart_review'));
assert.ok(report.records.every((record) => record.recommendationAppliedAsFinalLabel === false));
assert.ok(report.records.every((record) => record.generatedPngCardPath === null));
assert.ok(report.records.every((record) => record.safety.approvesExecution === false));
assert.ok(report.records.every((record) => record.safety.createsTrade === false));
assert.ok(report.records.every((record) => record.safety.changesScanner === false));
assert.ok(report.records.every((record) => record.safety.changesRules === false));
assert.ok(report.researchOnlyWarning.includes('Research-only'));
assert.ok(report.explicitExecutionWarning.includes('does not approve trades'));
assert.ok(markdown.includes('This chart evidence pack does not approve trades and does not create execution authority.'));
assert.ok(markdown.includes('## Chart Evidence Records'));
assert.ok(markdown.includes('Recommendation Applied As Final Label: No'));
assert.ok(existsSync(report.outputPaths.jsonPath));
assert.ok(existsSync(report.outputPaths.markdownPath));

const reviewedAfter = JSON.parse(readFileSync(reviewedPath, 'utf8'));
assert.equal(reviewedAfter.samples.find((sample: { sampleId: string }) => sample.sampleId === expectedSampleIds[0]).finalHumanLabel, 'needs_chart_review');
assert.equal(reviewedAfter.samples.find((sample: { sampleId: string }) => sample.sampleId === 'advisory_only_samples-am_liquidity_delivery_window-2023-12-04').finalHumanLabel, 'strong_advisory_candidate');
assertNoExecutableLedgerFields(report);
const serialized = JSON.stringify(report);
assert.ok(!/"entry"|"stop"|"target"|"targets"|"T1"|"T2"|"t1"|"t2"|"canExecute"|"executionApproved"|"tradeAlerts"|"alerts"/.test(serialized));

console.log('Time-window liquidity-delivery chart evidence pack verified.');
