import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';
import {
  buildHtfTimingReviewPack,
  buildReviewedTimingReport,
  parseTimeWindowLiquidityDeliveryHtfTimingReviewArgs,
  runTimeWindowLiquidityDeliveryHtfTimingReview,
  suggestTimingLabel,
  TWLD_HTF_TIMING_REVIEW_LABELS,
} from './time-window-liquidity-delivery-htf-timing-review';

const outDir = mkdtempSync(path.join(tmpdir(), 'twld-htf-timing-out-'));
const sourceDir = mkdtempSync(path.join(tmpdir(), 'twld-htf-timing-source-'));
const sourceReviewSetPath = path.join(sourceDir, 'time-window-liquidity-delivery-HTF-quality-review-set-MES-2026-01-01-to-2026-01-03.json');
const amQualityReportPath = path.join(sourceDir, 'time-window-liquidity-delivery-HTF-quality-MES-AM-2026-01-01-to-2026-01-03.json');
const generatedAt = '2026-06-01T00:00:00.000Z';

function candidate(overrides: Record<string, unknown>) {
  return {
    sampleId: 'advisory_only_samples-am_liquidity_delivery_window-2026-01-01',
    candidateId: 'am_liquidity_delivery_window-2026-01-01',
    date: '2026-01-01',
    symbol: 'MES',
    windowStudied: 'AM',
    windowLabel: 'AM 10:00-11:00 NY',
    executionTimeframe: '5m',
    executionTimeframeRole: 'execution_only',
    discoveredHigherTimeframes: ['15m', '30m', '1h', '60m', '240m', '4h', 'daily', 'session'],
    htfDrawType: 'prior_day_high',
    htfDrawLevel: 5000,
    htfDrawStillValidDuringWindow: false,
    htfDrawReachedBeforeWindow: true,
    deliveryOccurredDuringWindow: true,
    deliveryOccurredAfterWindow: false,
    executionWindowAlignment: 'aligned',
    executionWindowConflictsWithHtfDraw: false,
    drawConflictCount: 0,
    dominantDrawSource: 'mixed',
    dominantDrawTimeframe: 'daily',
    htfDrawQualityScore: 53,
    htfDrawQualityLabel: 'weak',
    htfDrawQualityReasons: ['HTF draw was present but not active.'],
    qualityAdjustedTwldPriority: 'quality_priority_4_weak_context_only',
    researchOnly: true,
    boundary: 'research_only_not_execution_authority',
    ...overrides,
  };
}

const confirmed = candidate({});
const continued = candidate({
  sampleId: 'advisory_only_samples-pm_liquidity_delivery_window-2026-01-01',
  candidateId: 'pm_liquidity_delivery_window-2026-01-01',
  windowStudied: 'PM',
  windowLabel: 'PM 2:00-3:00 NY',
  deliveryOccurredDuringWindow: false,
  deliveryOccurredAfterWindow: true,
  htfDrawStillValidDuringWindow: true,
});
const conflicted = candidate({
  sampleId: 'advisory_only_samples-pm_liquidity_delivery_window-2026-01-02',
  candidateId: 'pm_liquidity_delivery_window-2026-01-02',
  date: '2026-01-02',
  windowStudied: 'PM',
  windowLabel: 'PM 2:00-3:00 NY',
  deliveryOccurredDuringWindow: false,
  deliveryOccurredAfterWindow: true,
  executionWindowAlignment: 'conflicting',
  executionWindowConflictsWithHtfDraw: true,
  drawConflictCount: 1,
  qualityAdjustedTwldPriority: 'quality_priority_3_conflicting_or_failed_delivery',
});
const notUseful = candidate({
  sampleId: 'advisory_only_samples-am_liquidity_delivery_window-2026-01-03',
  candidateId: 'am_liquidity_delivery_window-2026-01-03',
  date: '2026-01-03',
  deliveryOccurredDuringWindow: false,
  deliveryOccurredAfterWindow: false,
});
const siblingOnly = candidate({
  sampleId: 'advisory_only_samples-am_liquidity_delivery_window-2026-01-04',
  candidateId: 'am_liquidity_delivery_window-2026-01-04',
  date: '2026-01-04',
  deliveryOccurredDuringWindow: false,
  deliveryOccurredAfterWindow: true,
  htfDrawStillValidDuringWindow: true,
});

assert.equal(suggestTimingLabel(confirmed as never).label, 'window_confirmed_prior_htf_draw');
assert.equal(suggestTimingLabel(continued as never).label, 'window_continued_prior_htf_draw');
assert.equal(suggestTimingLabel(conflicted as never).label, 'window_conflicted_with_prior_htf_draw');
assert.equal(suggestTimingLabel(notUseful as never).label, 'not_useful_for_timing');
assert.equal(suggestTimingLabel(candidate({ executionWindowAlignment: 'unclear' }) as never).label, 'needs_visual_review');

const reviewSet = {
  reportType: 'time_window_liquidity_delivery_htf_quality_review_set',
  generatedAt,
  symbol: 'MES',
  from: '2026-01-01',
  to: '2026-01-03',
  boundary: 'research_only_not_execution_authority',
  researchOnlyWarning: 'Research-only HTF draw quality report. This quality report does not approve trades and does not create execution authority.',
  topAmStrongOrMedium: [],
  topPmStrongOrMedium: [],
  conflictingAboveThreshold: [conflicted],
  broadHtfPresentDowngraded: [confirmed, continued, notUseful],
  recommendedHumanReviewSet: [confirmed, continued, conflicted, notUseful, siblingOnly].map((item) => ({
    sampleId: item.sampleId,
    windowStudied: item.windowStudied,
    reason: 'fixture',
    htfDrawQualityScore: item.htfDrawQualityScore,
    htfDrawQualityLabel: item.htfDrawQualityLabel,
  })),
};
writeFileSync(sourceReviewSetPath, `${JSON.stringify(reviewSet, null, 2)}\n`, 'utf8');
writeFileSync(amQualityReportPath, `${JSON.stringify({
  reportType: 'time_window_liquidity_delivery_htf_quality_report',
  symbol: 'MES',
  from: '2026-01-01',
  to: '2026-01-03',
  windowStudied: 'AM',
  candidates: [siblingOnly],
}, null, 2)}\n`, 'utf8');
const sourceBefore = readFileSync(sourceReviewSetPath, 'utf8');

const pack = buildHtfTimingReviewPack({
  symbol: 'MES',
  from: '2026-01-01',
  to: '2026-01-03',
  sourceReviewSetPath,
  outDir,
});
assert.equal(pack.samples.length, 5);
assert.equal(pack.executionTimeframeRule, '5m_execution_only');
assert.equal(pack.drawContextRule, 'coded_timeframes_above_5m_are_draw_context');
assert.equal(pack.samples.find((sample) => sample.sampleId === confirmed.sampleId)?.suggestedTimingLabel, 'window_confirmed_prior_htf_draw');
assert.equal(pack.samples.every((sample) => sample.boundary === 'research_only_not_execution_authority'), true);
assertNoExecutableLedgerFields(pack);

const initOptions = {
  symbol: 'MES',
  from: '2026-01-01',
  to: '2026-01-03',
  sourceReviewSetPath,
  outDir,
  reviewedPath: null,
  sampleId: null,
  label: null,
  reviewer: null,
  notes: null,
  pretty: true,
  json: false,
};
const initialized = buildReviewedTimingReport(pack, initOptions);
assert.equal(initialized.summary.totalSamples, 5);
assert.equal(initialized.summary.reviewedSamples, 0);
assert.equal(initialized.samples.every((sample) => sample.finalTimingLabel === null), true);
assertNoExecutableLedgerFields(initialized);

const firstRun = await runTimeWindowLiquidityDeliveryHtfTimingReview({
  ...initOptions,
  sampleId: confirmed.sampleId,
  label: 'window_confirmed_prior_htf_draw',
  reviewer: 'human',
  notes: 'confirmed fixture',
});
assert.ok(existsSync(firstRun.pack.outputPaths.jsonPath));
assert.ok(existsSync(firstRun.pack.outputPaths.markdownPath));
assert.ok(existsSync(firstRun.reviewed.outputPaths.jsonPath));
assert.ok(existsSync(firstRun.reviewed.outputPaths.markdownPath));
assert.equal(firstRun.reviewed.summary.reviewedSamples, 1);
assert.equal(firstRun.reviewed.samples.find((sample) => sample.sampleId === confirmed.sampleId)?.reviewHistory.length, 1);
assert.ok(readFileSync(firstRun.reviewed.outputPaths.markdownPath, 'utf8').includes('This timing review does not approve trades and does not create execution authority.'));

const secondRun = await runTimeWindowLiquidityDeliveryHtfTimingReview({
  ...initOptions,
  sampleId: confirmed.sampleId,
  label: 'needs_visual_review',
  reviewer: 'human',
  notes: 'updated fixture',
});
const updated = secondRun.reviewed.samples.find((sample) => sample.sampleId === confirmed.sampleId);
assert.equal(updated?.finalTimingLabel, 'needs_visual_review');
assert.equal(updated?.reviewHistory.length, 2);
assert.equal(secondRun.reviewed.summary.reviewedSamples, 1);
assert.equal(readFileSync(sourceReviewSetPath, 'utf8'), sourceBefore);

assert.throws(() => parseTimeWindowLiquidityDeliveryHtfTimingReviewArgs(['--label', 'bad_label', '--sample', confirmed.sampleId]), /Unknown HTF timing review label/);
await assert.rejects(
  () => runTimeWindowLiquidityDeliveryHtfTimingReview({
    ...initOptions,
    sampleId: 'missing-sample',
    label: 'needs_visual_review',
    reviewer: 'human',
    notes: null,
  }),
  /Unknown HTF timing review sample ID/,
);

for (const label of [
  'window_confirmed_prior_htf_draw',
  'window_continued_prior_htf_draw',
  'window_failed_prior_htf_draw',
  'window_conflicted_with_prior_htf_draw',
  'not_useful_for_timing',
  'needs_visual_review',
]) {
  assert.ok(TWLD_HTF_TIMING_REVIEW_LABELS.includes(label as never));
}

assertNoExecutableLedgerFields(secondRun);
console.log('Time-window liquidity-delivery HTF timing review verified.');
