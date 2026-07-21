import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewOpeningDriveSlateEdgeAuditReport,
} from './unified-positive-held-local-preview-openingdrive-slate-edge-audit';

function row(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    ticketId: 'row',
    tradeDate: '2026-07-20',
    session: 'morning',
    setupType: 'OpeningDriveFvgContinuation',
    direction: 'SHORT',
    proofTime: '2026-07-20T10:00:00',
    entry: 100,
    stop: 112,
    t1: 82,
    t2: 76,
    riskPoints: 12,
    methodKey: 'OpeningDriveFvgContinuation|morning|SHORT|risk_8_to_16',
    riskBand: 'risk_8_to_16',
    sessionOutcomeBucket: 'winner',
    sessionOutcomeLabel: 't1_and_t2_hit',
    sessionResolvedOneMesPl: 120,
    sessionResolvedR: 2,
    sessionMaximumFavorableExcursion: 48,
    sessionMaximumAdverseExcursion: 2,
    ...overrides,
  };
}

const report = buildUnifiedPositiveHeldLocalPreviewOpeningDriveSlateEdgeAuditReport({
  sessionBoundedReportPath: 'session-bounded.json',
  sessionBoundedReport: {
    reportType: 'unified_positive_held_local_preview_session_bounded_profit_validation',
    rows: [
      row({ ticketId: 'od-a-1' }),
      row({ ticketId: 'od-a-2', proofTime: '2026-07-20T10:05:00' }),
      row({
        ticketId: 'od-b-loss',
        tradeDate: '2026-07-21',
        entry: 200,
        stop: 212,
        t1: 182,
        t2: 176,
        sessionOutcomeBucket: 'loss',
        sessionOutcomeLabel: 'stopped_before_t1',
        sessionResolvedOneMesPl: -60,
        sessionResolvedR: -1,
      }),
      row({
        ticketId: 'od-c-lunch',
        tradeDate: '2026-07-22',
        session: 'lunch',
        direction: 'LONG',
        methodKey: 'OpeningDriveFvgContinuation|lunch|LONG|risk_gte_32',
        riskBand: 'risk_gte_32',
        entry: 300,
        stop: 260,
        t1: 360,
        t2: 380,
        riskPoints: 40,
        sessionResolvedOneMesPl: 400,
      }),
      row({
        ticketId: 'sweep-collision',
        setupType: 'SweepMssFvgRetrace',
        methodKey: 'SweepMssFvgRetrace|morning|SHORT|risk_8_to_16',
        proofTime: '2026-07-20T10:04:00',
        entry: 101,
      }),
    ],
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceRows, 5);
assert.equal(report.summary.openingDriveRawRows, 4);
assert.equal(report.summary.openingDriveSlateRows, 3);
assert.equal(report.summary.duplicateRowsSuppressed, 1);
assert.equal(report.summary.rawOpeningDriveOneMesPl, 580);
assert.equal(report.summary.slateOpeningDriveOneMesPl, 460);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.allOpeningDrive.winners, 2);
assert.equal(report.allOpeningDrive.losses, 1);
assert.equal(report.sweepOverlap.some((group) => group.key.includes('with_sweep_overlap')), true);

const missing = buildUnifiedPositiveHeldLocalPreviewOpeningDriveSlateEdgeAuditReport({
  sessionBoundedReportPath: null,
  sessionBoundedReport: null,
}, '2026-07-20T00:01:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_session_bounded_report');

console.log('unified positive held-local preview OpeningDrive slate edge audit verified.');
