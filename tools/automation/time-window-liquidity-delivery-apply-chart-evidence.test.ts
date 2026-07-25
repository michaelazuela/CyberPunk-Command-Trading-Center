import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  applyTimeWindowLiquidityDeliveryChartEvidenceLabels,
  buildTimeWindowLiquidityDeliveryHumanReview,
  renderTimeWindowLiquidityDeliveryHumanReviewMarkdown,
  writeTimeWindowLiquidityDeliveryHumanReview,
} from './time-window-liquidity-delivery-review';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';

const temp = mkdtempSync(path.join(tmpdir(), 'twld-apply-chart-evidence-'));
const curatedPath = path.join(temp, 'time-window-liquidity-delivery-AM-curated-review-pack-MES-2018-01-01-to-2026-05-31.json');
const reviewedPath = path.join(temp, 'reviewed', 'time-window-liquidity-delivery-AM-curated-review-pack-MES-2018-01-01-to-2026-05-31.reviewed.json');
const evidencePath = path.join(temp, 'chart-evidence', 'time-window-liquidity-delivery-AM-chart-evidence-MES-2018-01-01-to-2026-05-31.json');

const chartEvidenceIds = [
  'advisory_only_samples-am_liquidity_delivery_window-2023-09-06',
  'advisory_only_samples-am_liquidity_delivery_window-2023-10-16',
  'advisory_only_samples-am_liquidity_delivery_window-2023-12-05',
  'advisory_only_samples-am_liquidity_delivery_window-2023-12-22',
  'advisory_only_samples-am_liquidity_delivery_window-2024-09-03',
  'advisory_only_samples-am_liquidity_delivery_window-2024-12-27',
  'advisory_only_samples-am_liquidity_delivery_window-2026-02-02',
  'advisory_only_samples-am_liquidity_delivery_window-2026-04-14',
];

function sample(sampleId: string, index: number) {
  const date = sampleId.slice(-10);
  return {
    sampleId,
    sourceCandidateId: sampleId.replace('advisory_only_samples-', ''),
    date,
    window: 'AM 10:00-11:00 NY',
    nyTime: '10:00-11:00',
    symbol: 'MES',
    classificationBucket: 'advisory_only_samples',
    drawType: 'previous_week_low',
    drawLevel: 5000 + index,
    fvgOrInefficiencyPresent: true,
    marketStructureShiftPresent: true,
    sweepRaidPlusReclaimPresent: false,
    deliveryStatus: 'failed',
    modelOneOverlap: false,
    raidReclaimOverlap: false,
    advisoryOnly: true,
    suggestedReviewLabels: ['strong_advisory_candidate', 'needs_chart_review', 'reject_time_window_standalone'],
    chartPath: null,
    reportPath: null,
    inclusionReasons: ['Fixture.'],
    researchOnly: true,
    boundary: 'research_only_not_execution_authority',
  };
}

const strongId = 'advisory_only_samples-am_liquidity_delivery_window-2023-12-04';
const weakIds = [
  'advisory_only_samples-am_liquidity_delivery_window-2025-01-03',
  'advisory_only_samples-am_liquidity_delivery_window-2025-02-04',
];
const unreviewedIds = Array.from({ length: 35 }, (_, index) => `advisory_only_samples-am_liquidity_delivery_window-2022-${String(index + 1).padStart(2, '0')}-01`);
const allIds = [strongId, ...weakIds, ...chartEvidenceIds, ...unreviewedIds];

const curated = {
  reportType: 'time_window_liquidity_delivery_curated_review_pack',
  generatedAt: '2026-06-01T00:00:00.000Z',
  symbol: 'MES',
  from: '2018-01-01',
  to: '2026-05-31',
  windowStudied: 'AM',
  boundary: 'research_only_not_execution_authority',
  researchOnlyWarning: 'Research-only.',
  samples: allIds.map(sample),
};

mkdirSync(path.dirname(reviewedPath), { recursive: true });
mkdirSync(path.dirname(evidencePath), { recursive: true });
writeFileSync(curatedPath, `${JSON.stringify(curated, null, 2)}\n`, 'utf8');

const baseOptions = {
  symbol: 'MES',
  from: '2018-01-01',
  to: '2026-05-31',
  window: 'AM' as const,
  sourceCuratedPackPath: curatedPath,
  outDir: path.dirname(reviewedPath),
  reviewedPath,
  sampleId: null,
  label: null,
  reviewer: null,
  notes: null,
  applyChartEvidence: false,
  chartEvidencePath: null,
  pretty: true,
  json: false,
};

let report = buildTimeWindowLiquidityDeliveryHumanReview(baseOptions);
writeTimeWindowLiquidityDeliveryHumanReview(report);

for (const sampleId of chartEvidenceIds) {
  report = buildTimeWindowLiquidityDeliveryHumanReview({
    ...baseOptions,
    sampleId,
    label: 'needs_chart_review',
    reviewer: 'human',
    notes: 'Needs chart review.',
  });
  writeTimeWindowLiquidityDeliveryHumanReview(report);
}
report = buildTimeWindowLiquidityDeliveryHumanReview({
  ...baseOptions,
  sampleId: strongId,
  label: 'strong_advisory_candidate',
  reviewer: 'human',
  notes: 'Preserve strong advisory.',
});
writeTimeWindowLiquidityDeliveryHumanReview(report);
for (const sampleId of weakIds) {
  report = buildTimeWindowLiquidityDeliveryHumanReview({
    ...baseOptions,
    sampleId,
    label: 'weak_or_noisy',
    reviewer: 'human',
    notes: 'Preserve weak/noisy.',
  });
  writeTimeWindowLiquidityDeliveryHumanReview(report);
}

const reviewedBefore = JSON.parse(readFileSync(reviewedPath, 'utf8'));
const curatedBefore = readFileSync(curatedPath, 'utf8');
assert.equal(reviewedBefore.summary.reviewedSamples, 11);
assert.equal(reviewedBefore.summary.unreviewedSamples, 35);
assert.equal(reviewedBefore.summary.labelCounts.strong_advisory_candidate, 1);
assert.equal(reviewedBefore.summary.labelCounts.needs_chart_review, 8);
assert.equal(reviewedBefore.summary.labelCounts.weak_or_noisy, 2);
assert.equal(reviewedBefore.summary.labelCounts.reject_time_window_standalone, 0);

const evidence = {
  reportType: 'time_window_liquidity_delivery_chart_evidence_pack',
  generatedAt: '2026-06-01T00:00:00.000Z',
  symbol: 'MES',
  from: '2018-01-01',
  to: '2026-05-31',
  windowStudied: 'AM',
  boundary: 'research_only_not_execution_authority',
  labelFilter: 'needs_chart_review',
  records: chartEvidenceIds.map((sampleId, index) => ({
    sampleId,
    recommendation: index === 0 ? 'keep_needs_chart_review' : 'reject_time_window_standalone',
  })),
};
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
const evidenceBefore = readFileSync(evidencePath, 'utf8');

const applied = applyTimeWindowLiquidityDeliveryChartEvidenceLabels(
  buildTimeWindowLiquidityDeliveryHumanReview(baseOptions),
  evidencePath,
  '2026-06-01T12:00:00.000Z',
);
writeTimeWindowLiquidityDeliveryHumanReview(applied);
const markdown = renderTimeWindowLiquidityDeliveryHumanReviewMarkdown(applied);

assert.equal(applied.summary.reviewedSamples, 11);
assert.equal(applied.summary.unreviewedSamples, 35);
assert.equal(applied.summary.labelCounts.strong_advisory_candidate, 1);
assert.equal(applied.summary.labelCounts.needs_chart_review, 1);
assert.equal(applied.summary.labelCounts.weak_or_noisy, 2);
assert.equal(applied.summary.labelCounts.reject_time_window_standalone, 7);
assert.equal(applied.summary.labelCounts.covered_by_model_1, 0);
assert.equal(applied.summary.labelCounts.covered_by_RAID_RECLAIM, 0);
assert.equal(applied.chartEvidenceApplication?.samplesUpdated.length, 8);
assert.equal(applied.chartEvidenceApplication?.beforeSummary.labelCounts.needs_chart_review, 8);
assert.equal(applied.chartEvidenceApplication?.afterSummary.labelCounts.reject_time_window_standalone, 7);
assert.equal(applied.samples.find((item) => item.sampleId === chartEvidenceIds[0])?.finalHumanLabel, 'needs_chart_review');
for (const sampleId of chartEvidenceIds.slice(1)) {
  assert.equal(applied.samples.find((item) => item.sampleId === sampleId)?.finalHumanLabel, 'reject_time_window_standalone');
}
assert.equal(applied.samples.find((item) => item.sampleId === strongId)?.finalHumanLabel, 'strong_advisory_candidate');
for (const sampleId of weakIds) {
  assert.equal(applied.samples.find((item) => item.sampleId === sampleId)?.finalHumanLabel, 'weak_or_noisy');
}
assert.ok(applied.samples.find((item) => item.sampleId === chartEvidenceIds[1])?.reviewerNotes?.includes('Applied from chart-evidence recommendation'));
assert.equal(readFileSync(curatedPath, 'utf8'), curatedBefore);
assert.equal(readFileSync(evidencePath, 'utf8'), evidenceBefore);
assert.ok(markdown.includes('## Chart Evidence Application'));
assert.ok(markdown.includes('Research-only. Human labels do not approve trades, models, or execution.'));
assert.ok(existsSync(reviewedPath));
assert.ok(existsSync(reviewedPath.replace(/\.json$/, '.md')));
assertNoExecutableLedgerFields(applied);
assert.ok(!/"entry"|"stop"|"target"|"targets"|"T1"|"T2"|"t1"|"t2"|"canExecute"|"executionApproved"|"tradeAlerts"|"alerts"/.test(JSON.stringify(applied)));

console.log('Time-window liquidity-delivery chart evidence label application verified.');
