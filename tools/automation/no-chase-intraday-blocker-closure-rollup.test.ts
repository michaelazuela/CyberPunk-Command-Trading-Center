import assert from 'node:assert/strict';
import {
  buildNoChaseIntradayBlockerClosureRollupReport,
  type NoChaseIntradayBlockerClosureRollupReport,
} from './no-chase-intraday-blocker-closure-rollup';
import type { NoChaseIntradayBlockerDispositionRollupReport } from './no-chase-intraday-blocker-disposition-rollup';
import type { NoChaseIntradayInvalidStopLocationDrilldownReport } from './no-chase-intraday-invalid-stop-location-drilldown';
import type { NoChaseIntradayResidualRetestSwingDrilldownReport } from './no-chase-intraday-residual-retest-swing-drilldown';

const dispositionRollup = {
  rows: [
    { caseId: 'review', tradeDate: '2026-06-17', sessionType: 'morning', direction: 'SHORT', blockerFamily: 'mss_timestamp_alignment_stop_blocked', disposition: 'converted_to_human_review', evidence: [], nextAction: '' },
    { caseId: 'pending', tradeDate: '2026-06-18', sessionType: 'lunch', direction: 'LONG', blockerFamily: 'pending_fvg_retest_entry', disposition: 'keep_pending_trigger_blocked', evidence: [], nextAction: '' },
    { caseId: 'missing', tradeDate: '2026-06-25', sessionType: 'lunch', direction: 'SHORT', blockerFamily: 'mss_timestamp_alignment_stop_blocked', disposition: 'keep_missing_entry_blocked', evidence: [], nextAction: '' },
    { caseId: 'retest', tradeDate: '2026-07-02', sessionType: 'lunch', direction: 'LONG', blockerFamily: 'retest_swing_stop_not_confirmed', disposition: 'needs_retest_swing_residual_research', evidence: [], nextAction: '' },
    { caseId: 'invalid', tradeDate: '2026-07-01', sessionType: 'morning', direction: 'LONG', blockerFamily: 'invalid_stop_location', disposition: 'needs_invalid_stop_location_research', evidence: [], nextAction: '' },
  ],
} as NoChaseIntradayBlockerDispositionRollupReport;

const residual = {
  status: 'pass',
  rows: [{ caseId: 'retest', disposition: 'wide_or_losing_probe_only', firstRiskValidSwing: null }],
} as NoChaseIntradayResidualRetestSwingDrilldownReport;

const invalid = {
  status: 'pass',
  rows: [{ caseId: 'invalid', disposition: 'confirmed_stale_invalidated_stop' }],
} as NoChaseIntradayInvalidStopLocationDrilldownReport;

const report: NoChaseIntradayBlockerClosureRollupReport = buildNoChaseIntradayBlockerClosureRollupReport({
  dispositionRollupPath: 'rollup.json',
  residualRetestSwingDrilldownPath: 'residual.json',
  invalidStopLocationDrilldownPath: 'invalid.json',
  dispositionRollup,
  residualRetestSwingDrilldown: residual,
  invalidStopLocationDrilldown: invalid,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.rowsChecked, 5);
assert.equal(report.summary.humanReviewPositiveRows, 1);
assert.equal(report.summary.keepPendingTriggerBlockedRows, 1);
assert.equal(report.summary.keepMissingEntryBlockedRows, 1);
assert.equal(report.summary.keepRetestSwingBlockedRows, 1);
assert.equal(report.summary.keepInvalidStopBlockedRows, 1);
assert.equal(report.summary.openResearchRows, 0);
assert.equal(report.summary.liveFixRecommended, false);
assert.equal(report.summary.nextRecommendedPhase, 'broader_candidate_intake');

console.log('no-chase Intraday blocker closure rollup verified.');
