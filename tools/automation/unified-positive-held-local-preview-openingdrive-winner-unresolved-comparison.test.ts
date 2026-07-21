import assert from 'node:assert/strict';
import { buildOpeningDriveWinnerUnresolvedComparisonReport } from './unified-positive-held-local-preview-openingdrive-winner-unresolved-comparison';

function slate(overrides: Record<string, unknown>) {
  return {
    slateKey: 'slate',
    selectedTicketId: 'ticket',
    tradeDate: '2026-06-17',
    proofTime: '2026-06-17T10:00:00',
    direction: 'SHORT',
    riskBand: 'risk_8_to_16',
    entry: 100,
    stop: 108,
    t1: 88,
    t2: 84,
    riskPoints: 8,
    outcomeBucket: 'winner',
    outcomeLabel: 't1_and_t2_hit',
    oneMesPl: 80,
    mfeR: 2,
    maeR: 0.25,
    sweepCollision: true,
    htfCollisionFromSlate: false,
    session: {
      openingDriveDirection: 'bearish',
      sweptNyPremarketHigh: true,
      brokeNyPremarketLow: true,
      entryInEthPercentile: 0.7,
    },
    timeframeStories: [
      { timeframe: '15m', sufficiency: 'sufficient', shortContext: 'support', recentTrend: 'bearish', entryRangePercentile: 0.7 },
      { timeframe: '60m', sufficiency: 'sufficient', shortContext: 'caution', recentTrend: 'bullish', entryRangePercentile: 0.4 },
      { timeframe: '120m', sufficiency: 'sufficient', shortContext: 'support', recentTrend: 'bearish', entryRangePercentile: 0.8 },
      { timeframe: '240m', sufficiency: 'sufficient', shortContext: 'support', recentTrend: 'neutral', entryRangePercentile: 0.9 },
    ],
    tactical15m60mContextVerdict: 'mixed_short_context',
    storyVerdict: 'mixed_short',
    ...overrides,
  };
}

const report = buildOpeningDriveWinnerUnresolvedComparisonReport({
  htfStoryReportPath: 'htf-story.json',
  htfStoryReport: {
    slateStories: [
      slate({ slateKey: 'mixed-winner', oneMesPl: 80, storyVerdict: 'mixed_short' }),
      slate({ slateKey: 'caution-winner', oneMesPl: 120, storyVerdict: 'caution_short' }),
      slate({ slateKey: 'supported-winner', oneMesPl: 60, storyVerdict: 'supported_short' }),
      slate({ slateKey: 'loss', outcomeBucket: 'loss', outcomeLabel: 'stopped_before_t1', oneMesPl: -40, storyVerdict: 'supported_short' }),
      slate({ slateKey: 'no-fill', outcomeBucket: 'unresolved', outcomeLabel: 'no_fill', oneMesPl: null, mfeR: null, maeR: null }),
      slate({ slateKey: 'no-target', outcomeBucket: 'unresolved', outcomeLabel: 'no_target_or_stop_hit', oneMesPl: null }),
      slate({ slateKey: 'long-ignore', direction: 'LONG' }),
      slate({ slateKey: 'no-sweep-ignore', sweepCollision: false }),
    ],
  } as any,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceSlates, 8);
assert.equal(report.summary.comparisonSlates, 6);
assert.equal(report.summary.winners, 3);
assert.equal(report.summary.losses, 1);
assert.equal(report.summary.unresolved, 2);
assert.equal(report.summary.mixedCautionWinnerSlates, 2);
assert.equal(report.summary.mixedCautionWinnerOneMesPl, 200);
assert.equal(report.summary.unresolvedNoFillSlates, 1);
assert.equal(report.summary.unresolvedNoTargetSlates, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const mixedCaution = report.comparisonRows.find((row) => row.key === 'mixed_or_caution_winners');
assert.ok(mixedCaution);
assert.equal(mixedCaution.winners, 2);
assert.equal(mixedCaution.oneMesPl, 200);
assert.ok(mixedCaution.read.includes('HTF caution did not reject edge'));

const noFill = report.comparisonRows.find((row) => row.key === 'unresolved_no_fill');
assert.ok(noFill);
assert.equal(noFill.unresolved, 1);
assert.equal(noFill.oneMesPl, null);

const missing = buildOpeningDriveWinnerUnresolvedComparisonReport({
  htfStoryReportPath: null,
  htfStoryReport: null,
}, '2026-07-20T00:01:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_inputs');

console.log('OpeningDrive winner/unresolved comparison verified.');
