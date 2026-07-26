import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorProposalAuditReport,
} from './unified-positive-held-local-preview-scanner-owned-selector-proposal-audit';

function row(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    ticketId: 'ticket',
    tradeDate: '2026-07-20',
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: 'SHORT',
    proofTime: '2026-07-20T10:00:00',
    entry: 100,
    stop: 112,
    t1: 82,
    t2: 76,
    riskPoints: 12,
    methodKey: 'NoInstalledSetup|morning|SHORT|risk_8_to_16',
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

const selectorRows = Array.from({ length: 25 }, (_, index) => row({
  ticketId: `selector-win-${index}`,
  tradeDate: `2026-07-${String(1 + (index % 10)).padStart(2, '0')}`,
}));
const losingRows = Array.from({ length: 3 }, (_, index) => row({
  ticketId: `selector-loss-${index}`,
  sessionOutcomeBucket: 'loss',
  sessionOutcomeLabel: 'stopped_before_t1',
  sessionResolvedOneMesPl: -60,
  sessionResolvedR: -1,
  sessionMaximumFavorableExcursion: 2,
  sessionMaximumAdverseExcursion: 12,
}));
const nonTargetWinnerRows = Array.from({ length: 8 }, (_, index) => row({
  ticketId: `non-target-win-${index}`,
  setupType: 'NoInstalledSetup',
  methodKey: 'NoInstalledSetup|morning|SHORT|risk_16_to_24',
  riskBand: 'risk_16_to_24',
  riskPoints: 18,
  sessionResolvedOneMesPl: 90,
}));
const blockedRows = Array.from({ length: 5 }, (_, index) => row({
  ticketId: `blocked-${index}`,
  setupType: 'NoInstalledSetup',
  methodKey: 'NoInstalledSetup|morning|SHORT|risk_8_to_16',
  sessionOutcomeBucket: 'blocked',
  sessionOutcomeLabel: 'blocked',
  sessionResolvedOneMesPl: null,
  sessionResolvedR: null,
  blockers: ['missing same-session bars at or after proof time'],
}));

const report = buildUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorProposalAuditReport({
  sessionBoundedReportPath: 'session-bounded.json',
  sessionBoundedReport: {
    reportType: 'unified_positive_held_local_preview_session_bounded_profit_validation',
    rows: [...selectorRows, ...losingRows, ...nonTargetWinnerRows, ...blockedRows],
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.selectorRows, 28);
assert.equal(report.summary.selectorResolvedRows, 28);
assert.equal(report.summary.selectorSessionGrossOneMesPl, 2820);
assert.equal(report.summary.selectorWinRateResolved, 0.89);
assert.equal(report.summary.selectorVsNonTargetWinnerPlRank, 1);
assert.equal(report.summary.sameSessionSideNonTargetWinnerRows, 8);
assert.equal(report.summary.sameSessionSideBlockedUnresolvedRows, 5);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'advance_to_scanner_owned_dry_run_selector_contract');
assert.equal(report.blockerCounts.length, 0);
assert.equal(report.topSelectorExamples.length, 12);
assert.equal(report.losingSelectorExamples.length, 3);

const missing = buildUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorProposalAuditReport({
  sessionBoundedReportPath: null,
  sessionBoundedReport: null,
}, '2026-07-20T00:01:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_session_bounded_report');

console.log('unified positive held-local preview scanner-owned selector proposal audit verified.');
