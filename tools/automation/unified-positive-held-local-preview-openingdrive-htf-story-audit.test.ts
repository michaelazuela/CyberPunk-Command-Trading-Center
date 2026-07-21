import assert from 'node:assert/strict';
import { buildOpeningDriveHtfStoryAuditReport } from './unified-positive-held-local-preview-openingdrive-htf-story-audit';

function bar(time: string, open: number, high: number, low: number, close: number) {
  return { time, open, high, low, close, volume: 1 };
}

function slate(overrides: Record<string, unknown>) {
  return {
    slateKey: 'slate',
    selectedTicketId: 'ticket',
    tradeDate: '2026-07-20',
    session: 'morning',
    direction: 'SHORT',
    riskBand: 'risk_8_to_16',
    methodKey: 'OpeningDriveFvgContinuation|morning|SHORT|risk_8_to_16',
    proofTime: '2026-07-20T10:00:00',
    entry: 119,
    stop: 125,
    t1: 110,
    t2: 107,
    riskPoints: 6,
    outcomeBucket: 'winner',
    outcomeLabel: 't1_and_t2_hit',
    oneMesPl: 60,
    mfeR: 2,
    maeR: 0.2,
    hasSweepCollision: true,
    hasHtfCollision: true,
    collisionMethodKeys: ['SweepMssFvgRetrace|morning|SHORT|risk_8_to_16'],
    ...overrides,
  };
}

const bars5m = [
  bar('2026-07-19T18:00:00', 100, 103, 99, 102),
  bar('2026-07-20T00:00:00', 102, 105, 101, 104),
  bar('2026-07-20T08:30:00', 104, 121, 103, 120),
  bar('2026-07-20T09:30:00', 120, 122, 118, 119),
  bar('2026-07-20T09:45:00', 119, 120, 112, 113),
  bar('2026-07-20T10:00:00', 113, 114, 108, 109),
  bar('2026-07-21T09:30:00', 100, 103, 99, 102),
  bar('2026-07-21T10:00:00', 102, 107, 101, 106),
];

const bearishHtf = [
  bar('2026-07-19T00:00:00', 130, 132, 120, 128),
  bar('2026-07-19T12:00:00', 128, 129, 116, 120),
  bar('2026-07-20T09:45:00', 120, 121, 108, 110),
  bar('2026-07-21T09:45:00', 110, 111, 105, 106),
];

const report = buildOpeningDriveHtfStoryAuditReport({
  openingDriveReportPath: 'openingdrive.json',
  openingDriveReport: {
    dailySlates: [
      slate({ slateKey: 'winner' }),
      slate({
        slateKey: 'loss',
        selectedTicketId: 'loss-ticket',
        tradeDate: '2026-07-21',
        proofTime: '2026-07-21T10:00:00',
        entry: 102,
        stop: 108,
        t1: 93,
        t2: 90,
        outcomeBucket: 'loss',
        outcomeLabel: 'stopped_before_t1',
        oneMesPl: -30,
        mfeR: 0.3,
        maeR: 1.5,
        hasHtfCollision: false,
      }),
      slate({ slateKey: 'long-ignore', direction: 'LONG' }),
    ],
  } as any,
  htfSourcePath: 'htf-source.json',
  htfSource: {
    bars: {
      '5m': bars5m,
      '15m': bearishHtf,
      '60m': bearishHtf,
      '120m': bearishHtf,
      '240m': bearishHtf,
    },
  } as any,
  htfAcquisitionReportPath: 'htf-acquisition.json',
  htfAcquisitionReport: {
    coverage: [
      { timeframe: '15m', barsLoaded: 4, rangeStart: '2026-07-19T00:00:00', rangeEnd: '2026-07-21T09:45:00', sufficient: true, warning: null },
      { timeframe: '60m', barsLoaded: 4, rangeStart: '2026-07-19T00:00:00', rangeEnd: '2026-07-21T09:45:00', sufficient: true, warning: null },
      { timeframe: '120m', barsLoaded: 4, rangeStart: '2026-07-19T00:00:00', rangeEnd: '2026-07-21T09:45:00', sufficient: true, warning: null },
      { timeframe: '240m', barsLoaded: 4, rangeStart: '2026-07-19T00:00:00', rangeEnd: '2026-07-21T09:45:00', sufficient: true, warning: null },
    ],
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.openingDriveSlates, 3);
assert.equal(report.summary.targetMorningShortSweepSlates, 2);
assert.equal(report.summary.winners, 1);
assert.equal(report.summary.losses, 1);
assert.equal(report.summary.targetOneMesPl, 30);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.ok(report.summary.supportedShortSlates >= 1);
assert.equal(report.slateStories.length, 2);
assert.equal(report.slateStories[0].session.openingDriveDirection, 'bearish');
assert.equal(report.slateStories[0].timeframeStories.some((story) => story.shortContext === 'support'), true);

const missing = buildOpeningDriveHtfStoryAuditReport({
  openingDriveReportPath: null,
  openingDriveReport: null,
  htfSourcePath: null,
  htfSource: null,
  htfAcquisitionReportPath: null,
  htfAcquisitionReport: null,
}, '2026-07-20T00:01:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_inputs');

console.log('OpeningDrive HTF story audit verified.');
