import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';
import {
  buildHtfQualityReport,
  buildHtfQualityReviewSet,
  runTimeWindowLiquidityDeliveryHtfQuality,
  scoreHtfDrawQuality,
} from './time-window-liquidity-delivery-htf-quality';

const outDir = mkdtempSync(path.join(tmpdir(), 'twld-htf-quality-out-'));
const htfFirstDir = mkdtempSync(path.join(tmpdir(), 'twld-htf-first-in-'));
const generatedAt = '2026-06-01T00:00:00.000Z';
const baseDiscovery = {
  codedSupportedTimeframes: ['1m', '5m', '15m', '60m', '240m', '1h', '4h', '30m', 'daily', 'session'],
  discoveredHigherTimeframes: ['15m', '30m', '1h', '60m', '240m', '4h', 'daily', 'session'],
  cachedMarketBarTimeframes: ['5m', '15m', '60m', '240m'],
  bridgeOnlyTimeframes: ['1m', '1h', '4h'],
  diagnosticOnlyTimeframes: ['30m', 'daily'],
  chartContextTimeframes: ['4h', '1h', '15m', '5m'],
  sessionDerivedTimeframes: ['session', 'daily'],
  executionTimeframe: '5m',
  executionTimeframeRole: 'execution_only',
  notes: ['fixture'],
};

function candidate(overrides: Record<string, unknown>) {
  return {
    candidateId: 'am_liquidity_delivery_window-2026-01-01',
    date: '2026-01-01',
    symbol: 'MES',
    windowStudied: 'AM',
    windowLabel: 'AM 10:00-11:00 NY',
    executionTimeframe: '5m',
    executionTimeframeRole: 'execution_only',
    discoveredHigherTimeframes: [...baseDiscovery.discoveredHigherTimeframes],
    availableDrawContextTimeframes: ['15m', '60m', '240m', 'daily', 'session'],
    primaryDrawContextTimeframes: ['240m', '60m', '15m'],
    primaryDrawTimeframe: '240m',
    drawSourceTimeframes: ['240m', '60m', '15m'],
    htfDrawContextPresent: true,
    htfDrawContextStatus: 'present',
    htfDrawType: 'prior_swing_high',
    htfDrawLevel: 5050,
    htfDrawStillValidDuringWindow: true,
    htfDrawReachedBeforeWindow: false,
    executionWindowSupportsHtfDraw: true,
    executionWindowConflictsWithHtfDraw: false,
    deliveryOccurredDuringWindow: true,
    deliveryOccurredAfterWindow: false,
    twldContextClassification: 'htf_draw_with_execution_window_delivery',
    htfFirstBucket: 'priority_1_htf_draw_delivery_achieved',
    fvgOrInefficiencyPresent: true,
    marketStructureShiftPresent: true,
    sweepRaidPlusReclaimPresent: true,
    modelOneOverlapPossible: false,
    historicalReversalOverlapPossible: false,
    drawReferences: [
      {
        kind: 'prior_swing_high',
        timeframe: '240m',
        price: 5050,
        reachedInsideWindow: true,
        reachedBeforeWindow: false,
        stillValidDuringWindow: true,
        distanceFromWindowOpen: 5,
        source: 'candle_derived',
      },
    ],
    notes: ['fixture candidate'],
    researchOnly: true,
    boundary: 'research_only_not_execution_authority',
    ...overrides,
  };
}

function audit(window: 'AM' | 'PM', candidates: unknown[]) {
  return {
    reportType: 'time_window_liquidity_delivery_htf_first_audit',
    generatedAt,
    symbol: 'MES',
    from: '2026-01-01',
    to: '2026-01-03',
    windowStudied: window,
    boundary: 'research_only_not_execution_authority',
    researchOnlyWarning: 'Research-only HTF-first TWLD report. This does not approve trades, create execution authority, or mutate human labels.',
    timeframeDiscovery: baseDiscovery as never,
    summary: {
      candidateCount: candidates.length,
      htfDrawPresentCount: candidates.filter((item) => (item as { htfDrawContextPresent?: boolean }).htfDrawContextPresent).length,
      htfDrawMissingCount: candidates.filter((item) => !(item as { htfDrawContextPresent?: boolean }).htfDrawContextPresent).length,
      deliveryDuringWindowCount: candidates.filter((item) => (item as { deliveryOccurredDuringWindow?: boolean }).deliveryOccurredDuringWindow).length,
      deliveryAfterWindowCount: candidates.filter((item) => (item as { deliveryOccurredAfterWindow?: boolean }).deliveryOccurredAfterWindow).length,
      executionConflictCount: candidates.filter((item) => (item as { executionWindowConflictsWithHtfDraw?: boolean }).executionWindowConflictsWithHtfDraw).length,
      bucketCounts: {},
    },
    candidates,
    outputPaths: {
      jsonPath: path.join(htfFirstDir, `fixture-${window}.json`),
      markdownPath: path.join(htfFirstDir, `fixture-${window}.md`),
    },
  };
}

const strong = scoreHtfDrawQuality(candidate({ candidateId: 'am_liquidity_delivery_window-2026-01-01' }) as never);
assert.equal(strong.htfDrawQualityLabel, 'strong');
assert.equal(strong.activeHtfDraw, true);
assert.equal(strong.qualityAdjustedTwldPriority, 'quality_priority_1_strong_htf_draw_delivery');
assert.ok(strong.htfDrawQualityReasons.some((reason) => reason.includes('Delivery occurred inside')));

const medium = scoreHtfDrawQuality(candidate({
  candidateId: 'am_liquidity_delivery_window-2026-01-02',
  deliveryOccurredDuringWindow: false,
  deliveryOccurredAfterWindow: true,
  executionWindowSupportsHtfDraw: false,
  drawSourceTimeframes: ['60m', '15m'],
  primaryDrawTimeframe: '60m',
  fvgOrInefficiencyPresent: false,
  marketStructureShiftPresent: false,
  sweepRaidPlusReclaimPresent: false,
  drawReferences: [
    {
      kind: 'prior_swing_low',
      timeframe: '60m',
      price: 5000,
      reachedInsideWindow: false,
      reachedBeforeWindow: false,
      stillValidDuringWindow: true,
      distanceFromWindowOpen: 12,
      source: 'candle_derived',
    },
  ],
}) as never);
assert.equal(medium.htfDrawQualityLabel, 'medium');
assert.equal(medium.qualityAdjustedTwldPriority, 'quality_priority_2_strong_or_medium_htf_draw_needs_review');

const weak = scoreHtfDrawQuality(candidate({
  candidateId: 'am_liquidity_delivery_window-2026-01-03',
  deliveryOccurredDuringWindow: false,
  deliveryOccurredAfterWindow: false,
  executionWindowSupportsHtfDraw: false,
  drawSourceTimeframes: ['daily', 'session'],
  primaryDrawTimeframe: 'daily',
  primaryDrawContextTimeframes: ['daily'],
  fvgOrInefficiencyPresent: true,
  marketStructureShiftPresent: false,
  sweepRaidPlusReclaimPresent: false,
  drawReferences: [
    {
      kind: 'prior_day_high',
      timeframe: 'daily',
      price: 5100,
      reachedInsideWindow: false,
      reachedBeforeWindow: false,
      stillValidDuringWindow: true,
      distanceFromWindowOpen: 8,
      source: 'session_derived',
    },
  ],
}) as never);
assert.equal(weak.htfDrawQualityLabel, 'weak');
assert.equal(weak.qualityAdjustedTwldPriority, 'quality_priority_4_weak_context_only');
assert.ok(weak.htfDrawQualityReasons.some((reason) => reason.includes('broad session/daily context')));

const taggedBefore = scoreHtfDrawQuality(candidate({
  candidateId: 'am_liquidity_delivery_window-2026-01-04',
  htfDrawReachedBeforeWindow: true,
  htfDrawStillValidDuringWindow: false,
}) as never);
assert.equal(taggedBefore.htfDrawQualityLabel, 'weak');
assert.equal(taggedBefore.activeHtfDraw, false);
assert.ok(taggedBefore.htfDrawQualityReasons.some((reason) => reason.includes('not active')));

const conflicting = scoreHtfDrawQuality(candidate({
  candidateId: 'pm_liquidity_delivery_window-2026-01-01',
  windowStudied: 'PM',
  executionWindowConflictsWithHtfDraw: true,
  htfDrawContextStatus: 'conflicting',
}) as never);
assert.equal(conflicting.htfDrawQualityLabel, 'conflicting');
assert.equal(conflicting.qualityAdjustedTwldPriority, 'quality_priority_3_conflicting_or_failed_delivery');
assert.ok(conflicting.drawConflictCount >= 1);

const none = scoreHtfDrawQuality(candidate({
  candidateId: 'pm_liquidity_delivery_window-2026-01-02',
  windowStudied: 'PM',
  htfDrawContextPresent: false,
  htfDrawContextStatus: 'missing',
  primaryDrawTimeframe: null,
  drawSourceTimeframes: [],
  drawReferences: [],
}) as never);
assert.equal(none.htfDrawQualityLabel, 'none');
assert.equal(none.qualityAdjustedTwldPriority, 'quality_priority_5_no_actionable_htf_draw');

const amAudit = audit('AM', [strong, medium, weak]);
const pmAudit = audit('PM', [conflicting, none]);
const amReport = buildHtfQualityReport({
  audit: amAudit as never,
  sourceHtfFirstPath: 'am-source.json',
  options: { symbol: 'MES', from: '2026-01-01', to: '2026-01-03', outDir },
});
assert.equal(amReport.summary.qualityLabelCounts.strong, 1);
assert.equal(amReport.summary.qualityLabelCounts.medium, 1);
assert.equal(amReport.summary.qualityLabelCounts.weak, 1);
assert.equal(amReport.summary.broadHtfPresentDowngradedCount, 1);
assertNoExecutableLedgerFields(amReport);

const pmReport = buildHtfQualityReport({
  audit: pmAudit as never,
  sourceHtfFirstPath: 'pm-source.json',
  options: { symbol: 'MES', from: '2026-01-01', to: '2026-01-03', outDir },
});
assert.equal(pmReport.summary.qualityLabelCounts.conflicting, 1);
assert.equal(pmReport.summary.qualityLabelCounts.none, 1);

const reviewSet = buildHtfQualityReviewSet({
  reports: [amReport, pmReport],
  reconsideration: {
    reportType: 'time_window_liquidity_delivery_htf_first_reconsideration',
    generatedAt,
    symbol: 'MES',
    from: '2026-01-01',
    to: '2026-01-03',
    boundary: 'research_only_not_execution_authority',
    researchOnlyWarning: 'Research-only',
    timeframeDiscovery: baseDiscovery as never,
    priorAmLabelsThatMayNeedReconsideration: [
      {
        sampleId: strong.sampleId,
        finalHumanLabel: 'reject_time_window_standalone',
        htfFirstBucket: 'priority_1_htf_draw_delivery_achieved',
        reason: 'Fixture reconsideration.',
      },
    ],
    priorPmTriageSamplesThatMayNeedReconsideration: [],
    recommendedNextHumanReviewSet: [medium.sampleId],
    previousAmConclusion: 'reopen',
  },
  sourceReconsiderationPath: 'reconsideration.json',
  options: { symbol: 'MES', from: '2026-01-01', to: '2026-01-03', outDir },
});
assert.ok(reviewSet.topAmStrongOrMedium.some((item) => item.sampleId === strong.sampleId));
assert.ok(reviewSet.priorLabelsThatMayNeedReconsideration.some((item) => item.sampleId === strong.sampleId));
assert.ok(reviewSet.recommendedHumanReviewSet.some((item) => item.sampleId === medium.sampleId));
assertNoExecutableLedgerFields(reviewSet);

const amPath = path.join(htfFirstDir, 'time-window-liquidity-delivery-HTF-first-audit-MES-AM-2026-01-01-to-2026-01-03.json');
const pmPath = path.join(htfFirstDir, 'time-window-liquidity-delivery-HTF-first-audit-MES-PM-2026-01-01-to-2026-01-03.json');
const reconsiderationPath = path.join(htfFirstDir, 'time-window-liquidity-delivery-HTF-first-reconsideration-MES-2026-01-01-to-2026-01-03.json');
writeFileSync(amPath, `${JSON.stringify(amAudit, null, 2)}\n`, 'utf8');
writeFileSync(pmPath, `${JSON.stringify(pmAudit, null, 2)}\n`, 'utf8');
writeFileSync(reconsiderationPath, `${JSON.stringify({
  reportType: 'time_window_liquidity_delivery_htf_first_reconsideration',
  generatedAt,
  symbol: 'MES',
  from: '2026-01-01',
  to: '2026-01-03',
  boundary: 'research_only_not_execution_authority',
  researchOnlyWarning: 'Research-only',
  timeframeDiscovery: baseDiscovery,
  priorAmLabelsThatMayNeedReconsideration: [],
  priorPmTriageSamplesThatMayNeedReconsideration: [],
  recommendedNextHumanReviewSet: [],
  previousAmConclusion: 'stand',
}, null, 2)}\n`, 'utf8');
const beforeAmHash = readFileSync(amPath, 'utf8');
const runResult = await runTimeWindowLiquidityDeliveryHtfQuality({
  symbol: 'MES',
  from: '2026-01-01',
  to: '2026-01-03',
  windows: ['AM', 'PM'],
  htfFirstDir,
  outDir,
  pretty: true,
  json: false,
});
assert.equal(readFileSync(amPath, 'utf8'), beforeAmHash);
assert.ok(existsSync(runResult.reports[0].outputPaths.jsonPath));
assert.ok(existsSync(runResult.reports[0].outputPaths.markdownPath));
assert.ok(existsSync(runResult.reviewSet.outputPaths.jsonPath));
assert.ok(existsSync(runResult.reviewSet.outputPaths.markdownPath));
assert.ok(readFileSync(runResult.reviewSet.outputPaths.markdownPath, 'utf8').includes('This quality report does not approve trades and does not create execution authority.'));
assertNoExecutableLedgerFields(runResult);

console.log('Time-window liquidity-delivery HTF quality scoring verified.');
