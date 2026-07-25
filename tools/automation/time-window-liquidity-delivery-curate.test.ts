import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildTimeWindowLiquidityDeliveryCuratedReviewPack,
  renderTimeWindowLiquidityDeliveryCuratedMarkdown,
  writeTimeWindowLiquidityDeliveryCuratedReviewPack,
} from './time-window-liquidity-delivery-curate';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';

const temp = mkdtempSync(path.join(tmpdir(), 'twld-curate-'));
const auditPath = path.join(temp, 'time-window-liquidity-delivery-audit-MES-AM.json');
const pmAuditPath = path.join(temp, 'time-window-liquidity-delivery-audit-MES-PM.json');
const amReviewedPath = path.join(temp, 'review-packs', 'reviewed', 'time-window-liquidity-delivery-AM-curated-review-pack-MES-2018-01-01-to-2026-05-31.reviewed.json');
const outDir = path.join(temp, 'review-packs');

function candidate(index: number, overrides: Record<string, unknown> = {}) {
  return {
    candidateId: `am_liquidity_delivery_window-2026-01-${String(index).padStart(2, '0')}`,
    date: `2026-01-${String(index).padStart(2, '0')}`,
    symbol: 'MES',
    windowId: 'am_liquidity_delivery_window',
    windowLabel: 'AM 10:00-11:00 NY',
    cleanDrawObserved: true,
    expectedDeliveryHandles: 20 + index,
    expectedDeliveryTicks: (20 + index) * 4,
    deliveryAchieved: true,
    failedDelivery: false,
    fvgOrInefficiencyFormedInsideWindow: true,
    marketStructureShiftPresent: true,
    sweepRaidPlusReclaimPresent: true,
    overlapClassification: 'model_1_overlap_possible',
    priorLiquidityReferences: [
      {
        kind: 'previous_day_high',
        price: 5100 + index,
        distanceFromWindowOpen: 20 + index,
        reachedInsideWindow: true,
        roomAtWindowOpen: true,
      },
    ],
    notes: ['Research-only time-window observation.'],
    boundary: 'research_only_not_execution_authority',
    ...overrides,
  };
}

const advisory = Array.from({ length: 3 }, (_, index) => candidate(index + 1, {
  overlapClassification: 'advisory_only_time_window_research',
  cleanDrawObserved: false,
  deliveryAchieved: false,
}));
const cleanAchieved = Array.from({ length: 12 }, (_, index) => candidate(index + 4));
const failed = Array.from({ length: 12 }, (_, index) => candidate(index + 20, {
  deliveryAchieved: false,
  failedDelivery: true,
}));
const modelOne = Array.from({ length: 12 }, (_, index) => candidate(index + 40));
const turtle = Array.from({ length: 12 }, (_, index) => candidate(index + 60, {
  overlapClassification: 'RAID_RECLAIM_overlap_possible',
  marketStructureShiftPresent: false,
}));

const audit = {
  reportType: 'time_window_liquidity_delivery_audit',
  generatedAt: '2026-06-01T00:00:00.000Z',
  symbol: 'MES',
  from: '2018-01-01',
  to: '2026-05-31',
  windowStudied: 'AM',
  windowDefinition: { displayName: 'AM 10:00-11:00 NY' },
  boundary: 'research_only_not_execution_authority',
  researchOnlyWarning: 'Research-only. This report does not approve trades and does not create execution authority.',
  summary: {
    advisoryOnlyCount: advisory.length,
  },
  candidates: [...advisory, ...cleanAchieved, ...failed, ...modelOne, ...turtle],
};

writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
writeFileSync(pmAuditPath, `${JSON.stringify({ ...audit, windowStudied: 'PM', windowDefinition: { displayName: 'PM 2:00-3:00 NY' } }, null, 2)}\n`, 'utf8');
mkdirSync(path.dirname(amReviewedPath), { recursive: true });
writeFileSync(amReviewedPath, `${JSON.stringify({
  summary: {
    labelCounts: {
      strong_advisory_candidate: 1,
      needs_chart_review: 1,
      reject_time_window_standalone: 7,
    },
  },
}, null, 2)}\n`, 'utf8');
const amReviewedBefore = readFileSync(amReviewedPath, 'utf8');

const pack = buildTimeWindowLiquidityDeliveryCuratedReviewPack({
  symbol: 'MES',
  from: '2018-01-01',
  to: '2026-05-31',
  window: 'AM',
  sourceAuditPath: auditPath,
  outDir,
  pretty: true,
  json: false,
});
writeTimeWindowLiquidityDeliveryCuratedReviewPack(pack);
const markdown = renderTimeWindowLiquidityDeliveryCuratedMarkdown(pack);

assert.equal(pack.reportType, 'time_window_liquidity_delivery_curated_review_pack');
assert.equal(pack.boundary, 'research_only_not_execution_authority');
assert.equal(pack.bucketSummary.advisory_only_samples, 3);
assert.equal(pack.allAdvisoryOnlySamplesIncluded, true);
assert.equal(pack.bucketSummary.best_clean_draw_delivery_achieved_samples, 10);
assert.equal(pack.bucketSummary.clean_draw_failed_delivery_samples, 10);
assert.equal(pack.bucketSummary.model_1_overlap_samples, 10);
assert.equal(pack.bucketSummary.RAID_RECLAIM_overlap_samples, 10);
assert.equal(pack.reviewLabelsAreSuggestionsOnly, true);
assert.ok(pack.suggestedReviewLabels.includes('strong_advisory_candidate'));
assert.ok(pack.samples.every((sample) => sample.boundary === 'research_only_not_execution_authority'));
assert.ok(pack.samples.every((sample) => sample.chartPath === null && sample.reportPath === null));
assert.ok(markdown.includes('This curated review pack does not approve trades and does not create execution authority.'));
assert.ok(markdown.includes('## Bucket Summary'));
assert.ok(markdown.includes('## Human Review Instructions'));
assert.ok(markdown.includes('Advisory Only Samples'));
assert.ok(existsSync(pack.outputPaths.jsonPath));
assert.ok(existsSync(pack.outputPaths.markdownPath));
assert.ok(pack.outputPaths.jsonPath.endsWith('time-window-liquidity-delivery-AM-curated-review-pack-MES-2018-01-01-to-2026-05-31.json'));
assertNoExecutableLedgerFields(pack);
assertNoExecutableLedgerFields(JSON.parse(readFileSync(pack.outputPaths.jsonPath, 'utf8')));
assert.ok(!/"entry"|"stop"|"target"|"targets"|"T1"|"T2"|"t1"|"t2"|"canExecute"|"tradeAlerts"|"alerts"/.test(JSON.stringify(pack)));

const pmPack = buildTimeWindowLiquidityDeliveryCuratedReviewPack({
  symbol: 'MES',
  from: '2018-01-01',
  to: '2026-05-31',
  window: 'PM',
  sourceAuditPath: pmAuditPath,
  outDir,
  pretty: true,
  json: false,
});
writeTimeWindowLiquidityDeliveryCuratedReviewPack(pmPack);
const pmMarkdown = renderTimeWindowLiquidityDeliveryCuratedMarkdown(pmPack);
assert.equal(pmPack.windowStudied, 'PM');
assert.equal(pmPack.bucketSummary.advisory_only_samples, 3);
assert.equal(pmPack.bucketSummary.best_clean_draw_delivery_achieved_samples, 10);
assert.equal(pmPack.bucketSummary.clean_draw_failed_delivery_samples, 10);
assert.equal(pmPack.bucketSummary.model_1_overlap_samples, 10);
assert.equal(pmPack.bucketSummary.RAID_RECLAIM_overlap_samples, 10);
assert.ok(pmPack.selectionLogic.includes('Include all advisory-only PM samples.'));
assert.ok(pmPack.outputPaths.jsonPath.endsWith('time-window-liquidity-delivery-PM-curated-review-pack-MES-2018-01-01-to-2026-05-31.json'));
assert.notEqual(pmPack.outputPaths.jsonPath, pack.outputPaths.jsonPath);
assert.ok(pmMarkdown.includes('## AM vs PM Comparison'));
assert.ok(pmMarkdown.includes('Comparison read: too_early_to_tell'));
assert.ok(pmMarkdown.includes('No promotion decision is made'));
assert.equal(readFileSync(amReviewedPath, 'utf8'), amReviewedBefore);
assertNoExecutableLedgerFields(pmPack);

console.log('Time-window liquidity-delivery curated review pack verified.');
