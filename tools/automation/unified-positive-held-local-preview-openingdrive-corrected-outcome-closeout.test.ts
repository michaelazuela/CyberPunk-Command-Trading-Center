import assert from 'node:assert/strict';
import { buildOpeningDriveCorrectedOutcomeCloseoutReport } from './unified-positive-held-local-preview-openingdrive-corrected-outcome-closeout';

function bar(time: string, open: number, high: number, low: number, close: number) {
  return { time, open, high, low, close, volume: 1 };
}

function slate(overrides: Record<string, unknown>) {
  return {
    slateKey: 'slate',
    selectedTicketId: 'ticket',
    tradeDate: '2026-06-03',
    proofTime: '2026-06-03T10:00:00',
    direction: 'SHORT',
    riskBand: 'risk_8_to_16',
    entry: 100,
    stop: 108,
    t1: 88,
    t2: 84,
    riskPoints: 8,
    outcomeBucket: 'unresolved',
    outcomeLabel: 'no_fill',
    oneMesPl: null,
    mfeR: null,
    maeR: null,
    sweepCollision: true,
    htfCollisionFromSlate: true,
    session: {
      openingDriveDirection: 'bearish',
      sweptNyPremarketHigh: true,
      brokeNyPremarketLow: true,
      entryInEthPercentile: 0.8,
    },
    timeframeStories: [
      { timeframe: '15m', sufficiency: 'sufficient', shortContext: 'support' },
      { timeframe: '60m', sufficiency: 'sufficient', shortContext: 'support' },
      { timeframe: '120m', sufficiency: 'sufficient', shortContext: 'caution' },
      { timeframe: '240m', sufficiency: 'sufficient', shortContext: 'support' },
    ],
    tactical15m60mContextVerdict: 'supported_short_context',
    storyVerdict: 'supported_short',
    ...overrides,
  };
}

const report = buildOpeningDriveCorrectedOutcomeCloseoutReport({
  htfStoryReportPath: 'openingdrive-htf.json',
  htfStoryReport: {
    source: { htfSourcePath: 'htf-source.json' },
    slateStories: [
      slate({ selectedTicketId: 'corrected-no-fill-to-t2' }),
      slate({
        selectedTicketId: 'existing-loss',
        tradeDate: '2026-06-04',
        proofTime: '2026-06-04T10:00:00',
        outcomeBucket: 'loss',
        outcomeLabel: 'stopped_before_t1',
        oneMesPl: -40,
      }),
      slate({
        selectedTicketId: 'no-sweep-ignore',
        tradeDate: '2026-06-05',
        sweepCollision: false,
      }),
      slate({
        selectedTicketId: 'long-ignore',
        tradeDate: '2026-06-06',
        direction: 'LONG',
      }),
    ],
  } as any,
  htfSourcePath: 'htf-source.json',
  htfSource: {
    bars: {
      '5m': [
        bar('2026-06-03T10:00:00', 104, 105, 101, 102),
        bar('2026-06-03T10:05:00', 103, 104, 99, 101),
        bar('2026-06-03T10:10:00', 101, 102, 83, 85),
        bar('2026-06-04T10:00:00', 104, 105, 99, 101),
        bar('2026-06-04T10:05:00', 101, 109, 100, 108),
      ],
    },
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceSlates, 4);
assert.equal(report.summary.targetRows, 2);
assert.equal(report.summary.originalNoFills, 1);
assert.equal(report.summary.correctedNoFills, 0);
assert.equal(report.summary.noFillCorrectedRows, 1);
assert.equal(report.summary.correctedWinners, 1);
assert.equal(report.summary.correctedLosses, 1);
assert.equal(report.summary.correctedOneMesPl, 40);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_user_decision_on_implementation');

const corrected = report.rows.find((row) => row.ticketId === 'corrected-no-fill-to-t2');
assert.ok(corrected);
assert.equal(corrected.originalLabel, 'no_fill');
assert.equal(corrected.label, 't1_and_t2_hit');
assert.equal(corrected.oneMesPl, 80);
assert.equal(corrected.entryHitTime, '2026-06-03T10:05:00');
assert.equal(corrected.t2HitTime, '2026-06-03T10:10:00');
assert.equal(corrected.correctionReason, 'Original no_fill corrected because completed 5M OHLC touched entry at or after proof.');
assert.equal(corrected.htfSufficiency, 'sufficient');
assert.equal(corrected.htfContextCount, 3);
assert.equal(corrected.htfCautionCount, 1);

const missing = buildOpeningDriveCorrectedOutcomeCloseoutReport({
  htfStoryReportPath: null,
  htfStoryReport: null,
  htfSourcePath: null,
  htfSource: null,
}, '2026-07-20T00:01:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_inputs');

console.log('OpeningDrive corrected outcome closeout verified.');
