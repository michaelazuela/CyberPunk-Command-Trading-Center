import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-carveout-adjusted-readiness';

const readinessSummary = {
  status: 'pass',
  summary: {
    strictReadyReplayRows: 38,
    strictReadyResolvedRows: 22,
    strictReadyUnresolvedRows: 16,
    strictReadyGrossOneMesPl: 1220,
    blockedRowsExcluded: 12,
    waitingForEntryTriggerRows: 4,
    invalidatedRows: 5,
    livePromotionAllowedRows: 0,
    recommendation: 'continue_research_no_live_selector',
  },
  modelRows: [
    { setupType: 'SweepMssFvgRetrace', evidenceState: 'positive_strict_ready_subset' },
    { setupType: 'TurtleSoup', evidenceState: 'weak_or_mixed_subset' },
  ],
};

const carveoutMiner = {
  status: 'pass',
  summary: {
    performanceCarveoutEligibleRows: 9,
  },
};

const unresolvedDrilldown = {
  status: 'pass',
  summary: {
    newlyPerformanceCarveoutEligibleRows: 3,
    manualInspectionRows: 0,
  },
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport({
  readinessSummaryPath: 'readiness.json',
  readinessSummary: readinessSummary as any,
  carveoutMinerPath: 'carveout.json',
  carveoutMiner: carveoutMiner as any,
  unresolvedDrilldownPath: 'unresolved.json',
  unresolvedDrilldown: unresolvedDrilldown as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_carveout_adjusted_readiness');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.originalBlockedRowsExcluded, 12);
assert.equal(report.summary.totalCarveoutEligibleRows, 12);
assert.equal(report.summary.adjustedBlockedRowsExcluded, 0);
assert.equal(report.summary.blockedRowsExcluded, 0);
assert.equal(report.summary.waitingForEntryTriggerRows, 0);
assert.equal(report.summary.invalidatedRows, 0);
assert.equal(report.summary.manualInspectionRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'prepare_sweep_only_guarded_proposal');
assert.match(report.markdown, /Carveout-Adjusted Readiness/);

const missing = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport({
  readinessSummaryPath: null,
  readinessSummary: null,
  carveoutMinerPath: null,
  carveoutMiner: null,
  unresolvedDrilldownPath: null,
  unresolvedDrilldown: null,
}, '2026-07-19T00:01:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing readiness summary path'));

console.log('OpeningDrive keep-later-proof selector carveout-adjusted readiness verified.');
