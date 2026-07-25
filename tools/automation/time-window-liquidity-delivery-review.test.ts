import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildTimeWindowLiquidityDeliveryHumanReview,
  renderTimeWindowLiquidityDeliveryHumanReviewMarkdown,
  TWLD_HUMAN_REVIEW_LABELS,
  writeTimeWindowLiquidityDeliveryHumanReview,
} from './time-window-liquidity-delivery-review';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';

const temp = mkdtempSync(path.join(tmpdir(), 'twld-review-'));
const curatedPath = path.join(temp, 'time-window-liquidity-delivery-AM-curated-review-pack-MES-2018-01-01-to-2026-05-31.json');
const reviewedPath = path.join(temp, 'reviewed', 'time-window-liquidity-delivery-AM-curated-review-pack-MES-2018-01-01-to-2026-05-31.reviewed.json');

function sample(index: number, overrides: Record<string, unknown> = {}) {
  return {
    sampleId: `sample-${index}`,
    sourceCandidateId: `candidate-${index}`,
    date: `2026-01-0${index}`,
    window: 'AM 10:00-11:00 NY',
    nyTime: '10:00-11:00',
    symbol: 'MES',
    classificationBucket: index === 1 ? 'advisory_only_samples' : 'model_1_overlap_samples',
    drawType: 'previous_day_high',
    drawLevel: 5100 + index,
    fvgOrInefficiencyPresent: true,
    marketStructureShiftPresent: true,
    sweepRaidPlusReclaimPresent: false,
    deliveryStatus: 'achieved',
    modelOneOverlap: index !== 1,
    raidReclaimOverlap: false,
    advisoryOnly: index === 1,
    suggestedReviewLabels: index === 1 ? ['strong_advisory_candidate', 'needs_chart_review'] : ['covered_by_model_1', 'needs_chart_review'],
    chartPath: null,
    reportPath: null,
    inclusionReasons: ['Research-only curated sample.'],
    researchOnly: true,
    boundary: 'research_only_not_execution_authority',
    ...overrides,
  };
}

const curatedPack = {
  reportType: 'time_window_liquidity_delivery_curated_review_pack',
  generatedAt: '2026-06-01T00:00:00.000Z',
  symbol: 'MES',
  from: '2018-01-01',
  to: '2026-05-31',
  windowStudied: 'AM',
  sourceAuditPath: path.join(temp, 'audit.json'),
  boundary: 'research_only_not_execution_authority',
  researchOnlyWarning: 'Research-only. This curated review pack does not approve trades and does not create execution authority.',
  reviewLabelsAreSuggestionsOnly: true,
  suggestedReviewLabels: TWLD_HUMAN_REVIEW_LABELS,
  bucketSummary: {},
  allAdvisoryOnlySamplesIncluded: true,
  selectionLogic: [],
  samples: [sample(1), sample(2), sample(3)],
  humanReviewInstructions: [],
  outputPaths: {
    jsonPath: curatedPath,
    markdownPath: curatedPath.replace(/\.json$/, '.md'),
  },
};

writeFileSync(curatedPath, `${JSON.stringify(curatedPack, null, 2)}\n`, 'utf8');

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
  pretty: true,
  json: false,
};

const initial = buildTimeWindowLiquidityDeliveryHumanReview(baseOptions);
writeTimeWindowLiquidityDeliveryHumanReview(initial);
const initialMarkdown = renderTimeWindowLiquidityDeliveryHumanReviewMarkdown(initial);

assert.equal(initial.reportType, 'time_window_liquidity_delivery_human_review');
assert.equal(initial.summary.totalSamples, 3);
assert.equal(initial.summary.reviewedSamples, 0);
assert.equal(initial.summary.unreviewedSamples, 3);
assert.ok(initial.samples.every((reviewedSample) => reviewedSample.finalHumanLabel === null));
assert.ok(initial.samples.every((reviewedSample) => reviewedSample.safety.activatesModel === false));
assert.ok(initial.samples.every((reviewedSample) => reviewedSample.safety.approvesExecution === false));
assert.ok(initial.samples.every((reviewedSample) => reviewedSample.safety.createsTrade === false));
assert.ok(initial.samples.every((reviewedSample) => reviewedSample.safety.changesScanner === false));
assert.ok(initial.samples.every((reviewedSample) => reviewedSample.safety.changesRules === false));
assert.ok(initialMarkdown.includes('Research-only. This human review file does not approve trades and does not create execution authority.'));
assert.ok(initialMarkdown.includes('This review file does not approve trades and does not create execution authority.'));
assert.ok(existsSync(reviewedPath));
assert.ok(existsSync(reviewedPath.replace(/\.json$/, '.md')));
assertNoExecutableLedgerFields(initial);

const firstReview = buildTimeWindowLiquidityDeliveryHumanReview({
  ...baseOptions,
  sampleId: 'sample-1',
  label: 'strong_advisory_candidate',
  reviewer: 'human',
  notes: 'Strong advisory-only behavior; still research-only.',
});
writeTimeWindowLiquidityDeliveryHumanReview(firstReview);
assert.equal(firstReview.summary.reviewedSamples, 1);
assert.equal(firstReview.summary.unreviewedSamples, 2);
assert.equal(firstReview.summary.labelCounts.strong_advisory_candidate, 1);

const secondReview = buildTimeWindowLiquidityDeliveryHumanReview({
  ...baseOptions,
  sampleId: 'sample-2',
  label: 'covered_by_model_1',
  reviewer: 'human',
  notes: 'Covered by existing model context.',
});
writeTimeWindowLiquidityDeliveryHumanReview(secondReview);
assert.equal(secondReview.summary.reviewedSamples, 2);
assert.equal(secondReview.samples.find((reviewedSample) => reviewedSample.sampleId === 'sample-1')?.finalHumanLabel, 'strong_advisory_candidate');
assert.equal(secondReview.samples.find((reviewedSample) => reviewedSample.sampleId === 'sample-2')?.finalHumanLabel, 'covered_by_model_1');

const updatedFirstReview = buildTimeWindowLiquidityDeliveryHumanReview({
  ...baseOptions,
  sampleId: 'sample-1',
  label: 'weak_or_noisy',
  reviewer: 'human',
  notes: 'Updated after chart review.',
});
assert.equal(updatedFirstReview.samples.find((reviewedSample) => reviewedSample.sampleId === 'sample-1')?.finalHumanLabel, 'weak_or_noisy');
assert.equal(updatedFirstReview.samples.find((reviewedSample) => reviewedSample.sampleId === 'sample-2')?.finalHumanLabel, 'covered_by_model_1');

assert.throws(
  () =>
    buildTimeWindowLiquidityDeliveryHumanReview({
      ...baseOptions,
      sampleId: 'missing-sample',
      label: 'needs_chart_review',
    }),
  /Unknown TWLD sample ID/
);

const jsonText = JSON.stringify(updatedFirstReview);
assert.ok(!/"entry"|"stop"|"target"|"targets"|"T1"|"T2"|"t1"|"t2"|"canExecute"|"executionApproved"|"tradeAlerts"|"alerts"/.test(jsonText));
assertNoExecutableLedgerFields(updatedFirstReview);

const invalidLabelModule = await import('./time-window-liquidity-delivery-review');
assert.throws(
  () => invalidLabelModule.parseTimeWindowLiquidityDeliveryReviewArgs(['--symbol', 'MES', '--window', 'AM', '--sample', 'sample-1', '--label', 'not_a_label']),
  /Unknown TWLD human review label/
);

const markdown = renderTimeWindowLiquidityDeliveryHumanReviewMarkdown(updatedFirstReview);
assert.ok(markdown.includes('## Review Progress'));
assert.ok(markdown.includes('## Samples Grouped By Final Human Label'));
assert.ok(markdown.includes('## Unreviewed Samples'));
assert.ok(markdown.includes('Updated after chart review.'));
assert.ok(markdown.includes('Research-only. Human labels do not approve trades, models, or execution.'));

console.log('Time-window liquidity-delivery human review capture verified.');

const pmCuratedPath = path.join(temp, 'time-window-liquidity-delivery-PM-curated-review-pack-MES-2018-01-01-to-2026-05-31.json');
const pmTriagePath = path.join(temp, 'time-window-liquidity-delivery-PM-advisory-only-triage-MES-2018-01-01-to-2026-05-31.json');
const pmReviewedPath = path.join(temp, 'reviewed', 'time-window-liquidity-delivery-PM-curated-review-pack-MES-2018-01-01-to-2026-05-31.reviewed.json');

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

const pmReviewFirstSampleIds = [
  'advisory_only_samples-pm_liquidity_delivery_window-2023-11-13',
  'advisory_only_samples-pm_liquidity_delivery_window-2025-11-17',
];

const pmCuratedPack = {
  ...curatedPack,
  symbol: 'MES',
  windowStudied: 'PM',
  sourceAuditPath: path.join(temp, 'pm-audit.json'),
  outputPaths: {
    jsonPath: pmCuratedPath,
    markdownPath: pmCuratedPath.replace(/\.json$/, '.md'),
  },
  samples: [
    {
      ...sample(1),
      sampleId: pmReviewFirstSampleIds[0],
      sourceCandidateId: 'pm_liquidity_delivery_window-2023-11-13',
      date: '2023-11-13',
      window: 'PM 2:00-3:00 NY',
      nyTime: '2:00-3:00',
      classificationBucket: 'advisory_only_samples',
      advisoryOnly: true,
      suggestedReviewLabels: ['needs_chart_review'],
    },
    {
      ...sample(2),
      sampleId: pmReviewFirstSampleIds[1],
      sourceCandidateId: 'pm_liquidity_delivery_window-2025-11-17',
      date: '2025-11-17',
      window: 'PM 2:00-3:00 NY',
      nyTime: '2:00-3:00',
      classificationBucket: 'advisory_only_samples',
      advisoryOnly: true,
      suggestedReviewLabels: ['needs_chart_review'],
    },
    {
      ...sample(3),
      sampleId: 'advisory_only_samples-pm_liquidity_delivery_window-2025-01-17',
      sourceCandidateId: 'pm_liquidity_delivery_window-2025-01-17',
      date: '2025-01-17',
      window: 'PM 2:00-3:00 NY',
      nyTime: '2:00-3:00',
      classificationBucket: 'advisory_only_samples',
      advisoryOnly: true,
      suggestedReviewLabels: ['weak_or_noisy'],
    },
    {
      ...sample(4),
      sampleId: 'model_1_overlap_samples-pm_liquidity_delivery_window-2025-02-26',
      sourceCandidateId: 'pm_liquidity_delivery_window-2025-02-26',
      date: '2025-02-26',
      window: 'PM 2:00-3:00 NY',
      nyTime: '2:00-3:00',
      classificationBucket: 'model_1_overlap_samples',
      advisoryOnly: false,
      suggestedReviewLabels: ['covered_by_model_1'],
    },
  ],
};
const pmTriageReport = {
  reportType: 'time_window_liquidity_delivery_advisory_only_triage',
  summary: {
    advisoryOnlySamples: 3,
    recommendedFirstReviewSubsetCount: 2,
  },
  recommendedFirstReviewSubset: pmReviewFirstSampleIds.map((sampleId) => ({ sampleId })),
  boundary: 'research_only_not_execution_authority',
};

writeFileSync(pmCuratedPath, `${JSON.stringify(pmCuratedPack, null, 2)}\n`, 'utf8');
writeFileSync(pmTriagePath, `${JSON.stringify(pmTriageReport, null, 2)}\n`, 'utf8');
const pmCuratedHashBefore = sha256(pmCuratedPath);
const pmTriageHashBefore = sha256(pmTriagePath);
const amReviewedHashBefore = sha256(reviewedPath);

const pmBaseOptions = {
  symbol: 'MES',
  from: '2018-01-01',
  to: '2026-05-31',
  window: 'PM' as const,
  sourceCuratedPackPath: pmCuratedPath,
  outDir: path.dirname(pmReviewedPath),
  reviewedPath: pmReviewedPath,
  sampleId: null,
  label: null,
  reviewer: null,
  notes: null,
  pretty: true,
  json: false,
};

const pmInitial = buildTimeWindowLiquidityDeliveryHumanReview(pmBaseOptions);
writeTimeWindowLiquidityDeliveryHumanReview(pmInitial);
assert.equal(pmInitial.windowStudied, 'PM');
assert.equal(pmInitial.summary.totalSamples, 4);
assert.equal(pmInitial.summary.reviewedSamples, 0);
assert.equal(pmInitial.summary.unreviewedSamples, 4);

const pmFirstLabel = buildTimeWindowLiquidityDeliveryHumanReview({
  ...pmBaseOptions,
  sampleId: pmReviewFirstSampleIds[0],
  label: 'needs_chart_review',
  reviewer: 'human',
  notes: 'Clean draw but failed delivery. Need chart review to determine whether this is a useful PM failure pattern or invalidates standalone TWLD.',
});
writeTimeWindowLiquidityDeliveryHumanReview(pmFirstLabel);
const pmSecondLabel = buildTimeWindowLiquidityDeliveryHumanReview({
  ...pmBaseOptions,
  sampleId: pmReviewFirstSampleIds[1],
  label: 'needs_chart_review',
  reviewer: 'human',
  notes: 'FVG and MSS with delivery achieved, but no clean draw. Need chart review to verify whether the draw logic is too loose or whether this is useful PM advisory behavior.',
});
writeTimeWindowLiquidityDeliveryHumanReview(pmSecondLabel);

assert.equal(pmSecondLabel.summary.reviewedSamples, 2);
assert.equal(pmSecondLabel.summary.unreviewedSamples, 2);
assert.equal(pmSecondLabel.summary.labelCounts.needs_chart_review, 2);
assert.equal(pmSecondLabel.summary.labelCounts.strong_advisory_candidate, 0);
assert.equal(pmSecondLabel.summary.labelCounts.covered_by_model_1, 0);
assert.equal(pmSecondLabel.summary.labelCounts.covered_by_RAID_RECLAIM, 0);
assert.equal(pmSecondLabel.summary.labelCounts.weak_or_noisy, 0);
assert.equal(pmSecondLabel.summary.labelCounts.reject_time_window_standalone, 0);
assert.deepEqual(
  pmSecondLabel.samples.filter((reviewedSample) => reviewedSample.finalHumanLabel).map((reviewedSample) => reviewedSample.sampleId).sort(),
  [...pmReviewFirstSampleIds].sort(),
);
assert.equal(pmSecondLabel.samples.find((reviewedSample) => reviewedSample.sampleId === 'advisory_only_samples-pm_liquidity_delivery_window-2025-01-17')?.finalHumanLabel, null);
assert.equal(pmSecondLabel.samples.find((reviewedSample) => reviewedSample.sourceBucket === 'model_1_overlap_samples')?.finalHumanLabel, null);
assert.equal(sha256(pmCuratedPath), pmCuratedHashBefore);
assert.equal(sha256(pmTriagePath), pmTriageHashBefore);
assert.equal(sha256(reviewedPath), amReviewedHashBefore);
assert.ok(existsSync(pmReviewedPath));
assert.ok(existsSync(pmReviewedPath.replace(/\.json$/, '.md')));
const pmMarkdown = readFileSync(pmReviewedPath.replace(/\.json$/, '.md'), 'utf8');
assert.ok(pmMarkdown.includes('Research-only. This human review file does not approve trades and does not create execution authority.'));
assert.ok(pmMarkdown.includes('This review file does not approve trades and does not create execution authority.'));
assert.ok(pmMarkdown.includes('needs_chart_review: 2'));
assertNoExecutableLedgerFields(pmSecondLabel);
assert.ok(!/"entry"|"stop"|"target"|"targets"|"T1"|"T2"|"t1"|"t2"|"canExecute"|"executionApproved"|"tradeAlerts"|"alerts"/.test(JSON.stringify(pmSecondLabel)));

console.log('PM time-window liquidity-delivery review-first human capture verified.');
