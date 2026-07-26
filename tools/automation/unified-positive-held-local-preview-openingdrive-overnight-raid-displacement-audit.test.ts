import assert from 'node:assert/strict';
import { buildOpeningDriveOvernightRaidDisplacementAuditReport } from './unified-positive-held-local-preview-openingdrive-overnight-raid-displacement-audit';

function bar(time: string, open: number, high: number, low: number, close: number) {
  return { time, open, high, low, close, volume: 1 };
}

function row(overrides: Record<string, unknown>) {
  return {
    ticketId: 'ticket',
    tradeDate: '2026-06-03',
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: 'SHORT',
    riskBand: 'risk_8_to_16',
    proofTime: '2026-06-03T09:40:00',
    entry: 100,
    stop: 108,
    t1: 88,
    t2: 84,
    riskPoints: 8,
    bucket: 'winner',
    label: 't1_and_t2_hit',
    oneMesPl: 80,
    entryHitTime: '2026-06-03T09:40:00',
    stopHitTime: null,
    t1HitTime: '2026-06-03T09:45:00',
    t2HitTime: '2026-06-03T09:45:00',
    storyVerdict: 'supported_short',
    htfSufficiency: 'sufficient',
    ...overrides,
  };
}

const report = buildOpeningDriveOvernightRaidDisplacementAuditReport({
  correctedCloseoutReportPath: 'closeout.json',
  correctedCloseoutReport: {
    source: { htfSourcePath: 'source.json' },
    rows: [
      row({ ticketId: 'buy-side-raid', tradeDate: '2026-06-03', proofTime: '2026-06-03T09:40:00' }),
      row({ ticketId: 'sell-side-raid', tradeDate: '2026-06-04', proofTime: '2026-06-04T09:40:00', bucket: 'loss', label: 'stopped_before_t1', oneMesPl: -40 }),
      row({ ticketId: 'disp-no-raid', tradeDate: '2026-06-05', proofTime: '2026-06-05T09:40:00', bucket: 'unresolved', label: 'no_fill', oneMesPl: null }),
    ],
  } as any,
  htfSourcePath: 'source.json',
  htfSource: {
    bars: {
      '5m': [
        bar('2026-06-02T18:00:00', 100, 110, 90, 100),
        bar('2026-06-03T09:30:00', 105, 111, 103, 110),
        bar('2026-06-03T09:35:00', 110, 110, 94, 95),
        bar('2026-06-03T09:40:00', 95, 96, 93, 94),
        bar('2026-06-03T12:00:00', 94, 95, 93, 94),
        bar('2026-06-03T18:00:00', 100, 110, 90, 100),
        bar('2026-06-04T09:30:00', 100, 102, 89, 90),
        bar('2026-06-04T09:35:00', 90, 91, 80, 81),
        bar('2026-06-04T09:40:00', 81, 82, 80, 81),
        bar('2026-06-04T18:00:00', 100, 120, 80, 100),
        bar('2026-06-05T09:30:00', 108, 108, 92, 93),
        bar('2026-06-05T09:35:00', 93, 94, 91, 92),
        bar('2026-06-05T09:40:00', 92, 93, 91, 92),
      ],
    },
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceRows, 3);
assert.equal(report.summary.auditRows, 3);
assert.equal(report.summary.rowsWithOvernightContext, 3);
assert.equal(report.summary.buySideRaidBearishDisplacementRows, 1);
assert.equal(report.summary.sellSideRaidBearishContinuationRows, 1);
assert.equal(report.summary.bearishDisplacementWithoutRaidRows, 1);
assert.equal(report.summary.correctedOneMesPl, 40);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const buySide = report.rows.find((item) => item.ticketId === 'buy-side-raid');
assert.ok(buySide);
assert.equal(buySide.playStory, 'buy_side_raid_bearish_displacement_short');
assert.equal(buySide.raidedOvernightHigh, true);
assert.equal(buySide.bearishDisplacementBeforeProof, true);

const sellSide = report.rows.find((item) => item.ticketId === 'sell-side-raid');
assert.ok(sellSide);
assert.equal(sellSide.playStory, 'sell_side_raid_bearish_continuation_short');
assert.equal(sellSide.raidedOvernightLow, true);

const noRaid = report.rows.find((item) => item.ticketId === 'disp-no-raid');
assert.ok(noRaid);
assert.equal(noRaid.playStory, 'bearish_displacement_without_overnight_raid');

const missing = buildOpeningDriveOvernightRaidDisplacementAuditReport({
  correctedCloseoutReportPath: null,
  correctedCloseoutReport: null,
  htfSourcePath: null,
  htfSource: null,
}, '2026-07-20T00:01:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_inputs');

console.log('OpeningDrive overnight raid displacement audit verified.');
