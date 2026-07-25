import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildTimeWindowLiquidityDeliveryTriageReport,
  renderTimeWindowLiquidityDeliveryTriageMarkdown,
  writeTimeWindowLiquidityDeliveryTriageReport,
} from './time-window-liquidity-delivery-triage';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';

const temp = mkdtempSync(path.join(tmpdir(), 'twld-triage-'));
const auditPath = path.join(temp, 'time-window-liquidity-delivery-audit-MES-PM.json');
const curatedPath = path.join(temp, 'time-window-liquidity-delivery-PM-curated-review-pack-MES-2018-01-01-to-2026-05-31.json');
const outDir = path.join(temp, 'triage');

type FixtureKind = 'clean_delivery' | 'clean_failed' | 'fvg_mss_delivery' | 'fvg_mss_not_observed' | 'noisy';

function kindForIndex(index: number): FixtureKind {
  if (index <= 2) return 'clean_delivery';
  if (index <= 5) return 'clean_failed';
  if (index <= 17) return 'fvg_mss_delivery';
  if (index <= 35) return 'fvg_mss_not_observed';
  return 'noisy';
}

function candidate(index: number) {
  const kind = kindForIndex(index);
  return {
    candidateId: `pm_liquidity_delivery_window-2026-02-${String(index).padStart(2, '0')}`,
    date: `2026-02-${String(index).padStart(2, '0')}`,
    cleanDrawObserved: kind === 'clean_delivery' || kind === 'clean_failed',
    expectedDeliveryHandles: kind === 'noisy' ? 0 : 8 + index / 10,
    expectedDeliveryTicks: kind === 'noisy' ? 0 : Math.round((8 + index / 10) * 4),
    deliveryAchieved: kind === 'clean_delivery' || kind === 'fvg_mss_delivery',
    failedDelivery: kind === 'clean_failed',
  };
}

function sample(index: number) {
  const kind = kindForIndex(index);
  return {
    sampleId: `advisory_only_samples-pm_liquidity_delivery_window-2026-02-${String(index).padStart(2, '0')}`,
    sourceCandidateId: `pm_liquidity_delivery_window-2026-02-${String(index).padStart(2, '0')}`,
    date: `2026-02-${String(index).padStart(2, '0')}`,
    window: 'PM 2:00-3:00 NY',
    nyTime: '2:00-3:00',
    symbol: 'MES',
    classificationBucket: 'advisory_only_samples',
    drawType: index % 2 === 0 ? 'previous_day_high' : 'previous_week_low',
    drawLevel: 5200 + index,
    fvgOrInefficiencyPresent: kind !== 'noisy',
    marketStructureShiftPresent: kind !== 'noisy',
    sweepRaidPlusReclaimPresent: index % 3 === 0,
    deliveryStatus: kind === 'clean_delivery' || kind === 'fvg_mss_delivery' ? 'achieved' : kind === 'clean_failed' ? 'failed' : 'not_observed',
    modelOneOverlap: false,
    raidReclaimOverlap: false,
    advisoryOnly: true,
    suggestedReviewLabels: ['needs_chart_review', 'weak_or_noisy'],
    chartPath: null,
    reportPath: null,
    inclusionReasons: ['PM advisory-only fixture.'],
    researchOnly: true,
    boundary: 'research_only_not_execution_authority',
  };
}

const audit = {
  reportType: 'time_window_liquidity_delivery_audit',
  candidates: Array.from({ length: 57 }, (_, index) => candidate(index + 1)),
};

const curated = {
  reportType: 'time_window_liquidity_delivery_curated_review_pack',
  generatedAt: '2026-06-01T00:00:00.000Z',
  symbol: 'MES',
  from: '2018-01-01',
  to: '2026-05-31',
  windowStudied: 'PM',
  sourceAuditPath: auditPath,
  boundary: 'research_only_not_execution_authority',
  researchOnlyWarning: 'Research-only. This curated review pack does not approve trades and does not create execution authority.',
  samples: [
    ...Array.from({ length: 57 }, (_, index) => sample(index + 1)),
    {
      ...sample(58),
      sampleId: 'best_clean_draw_delivery_achieved_samples-pm_liquidity_delivery_window-2026-02-58',
      sourceCandidateId: 'pm_liquidity_delivery_window-2026-02-58',
      classificationBucket: 'best_clean_draw_delivery_achieved_samples',
      advisoryOnly: true,
    },
  ],
};

writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
writeFileSync(curatedPath, `${JSON.stringify(curated, null, 2)}\n`, 'utf8');

const report = buildTimeWindowLiquidityDeliveryTriageReport({
  symbol: 'MES',
  from: '2018-01-01',
  to: '2026-05-31',
  window: 'PM',
  sourceCuratedPackPath: curatedPath,
  outDir,
  pretty: true,
  json: false,
});
writeTimeWindowLiquidityDeliveryTriageReport(report);
const markdown = renderTimeWindowLiquidityDeliveryTriageMarkdown(report);

assert.equal(report.reportType, 'time_window_liquidity_delivery_advisory_only_triage');
assert.equal(report.boundary, 'research_only_not_execution_authority');
assert.equal(report.summary.advisoryOnlySamples, 57);
assert.equal(Object.values(report.summary.bucketCounts).reduce((sum, count) => sum + count, 0), 57);
assert.equal(report.summary.bucketCounts.priority_1_clean_draw_delivery, 2);
assert.equal(report.summary.bucketCounts.priority_2_clean_draw_failed_delivery, 3);
assert.equal(report.summary.bucketCounts.priority_3_fvg_mss_delivery, 12);
assert.equal(report.summary.bucketCounts.priority_4_fvg_mss_not_observed, 18);
assert.equal(report.summary.bucketCounts.priority_5_low_quality_or_noisy, 22);
assert.equal(report.summary.recommendedFirstReviewSubsetCount, 15);
assert.ok(report.records.every((record) => record.sampleId.startsWith('advisory_only_samples-')));
assert.ok(!report.records.some((record) => record.sourceCandidateId.endsWith('02-58')));
assert.ok(report.records.every((record) => record.labelApplied === false));
assert.ok(report.recommendedFirstReviewSubset.every((record) => record.qualityBucket !== 'priority_4_fvg_mss_not_observed'));
assert.ok(report.recommendedFirstReviewSubset.every((record) => record.qualityBucket !== 'priority_5_low_quality_or_noisy'));
assert.ok(report.researchOnlyWarning.includes('Research-only'));
assert.ok(report.explicitExecutionWarning.includes('does not apply labels'));
assert.ok(markdown.includes('Research-only'));
assert.ok(markdown.includes('This triage report does not apply labels, approve trades, or create execution authority.'));
assert.ok(markdown.includes('## Recommended First Review Subset'));
assert.ok(markdown.includes('priority_5_low_quality_or_noisy'));
assert.ok(existsSync(report.outputPaths.jsonPath));
assert.ok(existsSync(report.outputPaths.markdownPath));
assertNoExecutableLedgerFields(report);

const serialized = JSON.stringify(report);
assert.ok(!/"entry"|"stop"|"target"|"targets"|"T1"|"T2"|"t1"|"t2"|"canExecute"|"executionApproved"|"tradeAlerts"|"alerts"/.test(serialized));
assert.equal(readFileSync(curatedPath, 'utf8'), `${JSON.stringify(curated, null, 2)}\n`);

console.log('Time-window liquidity-delivery advisory-only triage verified.');
