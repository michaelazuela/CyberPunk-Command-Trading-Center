import assert from 'node:assert/strict';
import { buildOpeningDriveNoFillTimingAuditReport } from './unified-positive-held-local-preview-openingdrive-no-fill-timing-audit';

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
    storyVerdict: 'supported_short',
    tactical15m60mContextVerdict: 'supported_short_context',
    ...overrides,
  };
}

const report = buildOpeningDriveNoFillTimingAuditReport({
  htfStoryReportPath: 'htf-story.json',
  htfStoryReport: {
    source: { htfSourcePath: 'htf-source.json' },
    slateStories: [
      slate({ selectedTicketId: 'no-fill-helped', proofTime: '2026-06-03T10:00:00', entry: 100 }),
      slate({
        selectedTicketId: 'later-winner',
        proofTime: '2026-06-03T10:20:00',
        entry: 102,
        riskPoints: 6,
        outcomeBucket: 'winner',
        outcomeLabel: 't1_and_t2_hit',
        oneMesPl: 60,
        mfeR: 2,
        maeR: 0,
      }),
      slate({ selectedTicketId: 'no-fill-original-trades', tradeDate: '2026-06-04', proofTime: '2026-06-04T10:00:00', entry: 90 }),
      slate({
        selectedTicketId: 'later-loss',
        tradeDate: '2026-06-04',
        proofTime: '2026-06-04T10:15:00',
        entry: 88,
        outcomeBucket: 'loss',
        outcomeLabel: 'stopped_before_t1',
        oneMesPl: -40,
      }),
      slate({ selectedTicketId: 'long-ignore', direction: 'LONG' }),
      slate({ selectedTicketId: 'no-sweep-ignore', sweepCollision: false }),
    ],
  } as any,
  htfSourcePath: 'htf-source.json',
  htfSource: {
    bars: {
      '5m': [
        bar('2026-06-03T10:00:00', 104, 105, 101, 102),
        bar('2026-06-03T10:20:00', 103, 104, 101, 102),
        bar('2026-06-04T10:00:00', 93, 94, 91, 92),
        bar('2026-06-04T10:05:00', 92, 93, 89, 90),
      ],
    },
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceSlates, 6);
assert.equal(report.summary.noFillRows, 2);
assert.equal(report.summary.noFillRowsWithLaterWinner, 1);
assert.equal(report.summary.noFillRowsWithOriginalEntryLaterTraded, 1);
assert.equal(report.summary.laterWinnerOneMesPl, 60);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const helped = report.rows.find((row) => row.noFillTicketId === 'no-fill-helped');
assert.ok(helped);
assert.equal(helped.timingClassification, 'wait_for_later_reentry_helped');
assert.equal(helped.minutesToFirstLaterWinner, 20);
assert.equal(helped.entryDeltaToFirstLaterWinner, 2);
assert.equal(helped.riskDeltaToFirstLaterWinner, -2);

const originalTraded = report.rows.find((row) => row.noFillTicketId === 'no-fill-original-trades');
assert.ok(originalTraded);
assert.equal(originalTraded.timingClassification, 'original_entry_later_traded');
assert.equal(originalTraded.originalEntryFirstHitTime, '2026-06-04T10:05:00');

const missing = buildOpeningDriveNoFillTimingAuditReport({
  htfStoryReportPath: null,
  htfStoryReport: null,
  htfSourcePath: null,
  htfSource: null,
}, '2026-07-20T00:01:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_inputs');

console.log('OpeningDrive no-fill timing audit verified.');
