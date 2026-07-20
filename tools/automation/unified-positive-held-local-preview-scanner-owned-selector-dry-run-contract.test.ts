import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorDryRunContractReport,
} from './unified-positive-held-local-preview-scanner-owned-selector-dry-run-contract';

function row(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    ticketId: 'selector',
    tradeDate: '2026-07-20',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'SHORT',
    proofTime: '2026-07-20T10:00:00',
    entry: 100,
    stop: 112,
    t1: 82,
    t2: 76,
    riskPoints: 12,
    methodKey: 'SweepMssFvgRetrace|morning|SHORT|risk_8_to_16',
    riskBand: 'risk_8_to_16',
    sessionOutcomeBucket: 'winner',
    sessionOutcomeLabel: 't1_and_t2_hit',
    sessionResolvedOneMesPl: 120,
    sessionResolvedR: 2,
    sessionEntryHitTime: '2026-07-20T10:00:00',
    sessionStopHitTime: null,
    sessionT1HitTime: '2026-07-20T10:20:00',
    sessionT2HitTime: '2026-07-20T10:35:00',
    sessionMaximumFavorableExcursion: 48,
    sessionMaximumAdverseExcursion: 1.5,
    barsLoaded: 32,
    barsAfterProof: 20,
    blockers: [],
    ...overrides,
  };
}

const report = buildUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorDryRunContractReport({
  sessionBoundedReportPath: 'session-bounded.json',
  sessionBoundedReport: {
    reportType: 'unified_positive_held_local_preview_session_bounded_profit_validation',
    rows: [
      row({ ticketId: 'slate-a-first', proofTime: '2026-07-20T10:00:00' }),
      row({ ticketId: 'slate-a-duplicate', proofTime: '2026-07-20T10:05:00' }),
      row({ ticketId: 'slate-a-stale', proofTime: '2026-07-20T10:25:00' }),
      row({
        ticketId: 'slate-b-loss',
        tradeDate: '2026-07-21',
        proofTime: '2026-07-21T10:00:00',
        entry: 200,
        stop: 212,
        t1: 182,
        t2: 176,
        sessionOutcomeBucket: 'loss',
        sessionOutcomeLabel: 'stopped_before_t1',
        sessionResolvedOneMesPl: -60,
        sessionResolvedR: -1,
        sessionMaximumFavorableExcursion: 20,
        sessionMaximumAdverseExcursion: 15,
      }),
      row({
        ticketId: 'slate-c-win',
        tradeDate: '2026-07-22',
        proofTime: '2026-07-22T10:00:00',
        entry: 300,
        stop: 312,
        t1: 282,
        t2: 276,
      }),
      row({
        ticketId: 'collision',
        setupType: 'OpeningDriveFvgContinuation',
        methodKey: 'OpeningDriveFvgContinuation|morning|SHORT|risk_16_to_24',
        proofTime: '2026-07-20T10:08:00',
        entry: 99,
        stop: 115,
        t1: 75,
        t2: 67,
        riskPoints: 16,
      }),
    ],
  },
  staleMinutes: 20,
  collisionWindowMinutes: 10,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.selectorRawRows, 5);
assert.equal(report.summary.dryRunSlateRows, 3);
assert.equal(report.summary.duplicateRowsSuppressed, 2);
assert.equal(report.summary.staleRowsSuppressed, 1);
assert.equal(report.summary.rawSelectorOneMesPl, 420);
assert.equal(report.summary.dryRunOneMesPl, 180);
assert.equal(report.summary.dryRunVsRawDeltaOneMesPl, -240);
assert.equal(report.summary.dryRunWinRateResolved, 0.67);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'advance_to_scanner_owned_local_preview_contract');
assert.equal(report.selectedSlates[0].collisionRows, 1);
assert.equal(report.collisionMethodCounts[0].methodKey, 'OpeningDriveFvgContinuation|morning|SHORT|risk_16_to_24');

const missing = buildUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorDryRunContractReport({
  sessionBoundedReportPath: null,
  sessionBoundedReport: null,
}, '2026-07-20T00:01:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_session_bounded_report');

console.log('unified positive held-local preview scanner-owned selector dry-run contract verified.');
