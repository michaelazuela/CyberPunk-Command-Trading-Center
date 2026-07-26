import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowFilterSimulationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-filter-simulation';

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowFilterSimulationReport({
  reportDir: 'reports',
  slateAuditPath: 'slate.json',
  problemDrilldownPath: 'problem.json',
  slateAudit: {
    status: 'pass',
    slateRows: [
      {
        slateId: 'good',
        rows: 2,
        selectedTicketId: 'good-1',
        tradeDate: '2026-07-01',
        session: 'lunch',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        proofTime: '2026-07-01T12:00:00',
        outcomeStatus: 'resolved',
        outcomeLabel: 't1_hit_only',
        resolvedOneMesPl: 50,
      },
      {
        slateId: 'short-runway',
        rows: 1,
        selectedTicketId: 'short-1',
        tradeDate: '2026-07-02',
        session: 'morning',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        proofTime: '2026-07-02T11:50:00',
        outcomeStatus: 'unresolved',
        outcomeLabel: 'no_target_or_stop_hit',
        resolvedOneMesPl: null,
      },
      {
        slateId: 'high-adverse',
        rows: 3,
        selectedTicketId: 'bad-1',
        tradeDate: '2026-07-03',
        session: 'morning',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        proofTime: '2026-07-03T09:40:00',
        outcomeStatus: 'resolved',
        outcomeLabel: 'stopped_before_t1',
        resolvedOneMesPl: -25,
      },
    ],
  },
  problemDrilldown: {
    status: 'pass',
    problemSlateRows: [
      {
        slateId: 'short-runway',
        earliestOutcomeLabel: 'no_target_or_stop_hit',
        earliestBarsAfterProof: 1,
        earliestMfe: 0,
        earliestMae: 0,
        earliestRiskPoints: 10,
        laterPositiveRows: 0,
      },
      {
        slateId: 'high-adverse',
        earliestOutcomeLabel: 'stopped_before_t1',
        earliestBarsAfterProof: 20,
        earliestMfe: 5,
        earliestMae: 40,
        earliestRiskPoints: 10,
        laterPositiveRows: 0,
      },
    ],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_row_filter_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.summary.baselineSlates, 3);
assert.equal(report.summary.baselineGrossResolvedOneMesPl, 25);
assert.equal(report.summary.retainedSlates, 1);
assert.equal(report.summary.retainedGrossResolvedOneMesPl, 50);
assert.equal(report.summary.retainedGrossPlDelta, 25);
assert.equal(report.summary.excludedInsufficientReplayRunwaySlates, 1);
assert.equal(report.summary.excludedHighAdverseStoppedSlates, 1);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.filteredSlateRows.find((row) => row.slateId === 'high-adverse')?.adverseR, 4);
assert.match(report.markdown, /Filter Simulation/);

const failReport = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowFilterSimulationReport({
  reportDir: 'reports',
  slateAuditPath: 'slate.json',
  problemDrilldownPath: 'problem.json',
  slateAudit: { status: 'pass', slateRows: [] },
  problemDrilldown: { status: 'pass', problemSlateRows: [] },
}, '2026-07-19T00:01:00.000Z');

assert.equal(failReport.status, 'fail');
assert.ok(failReport.blockers.some((blocker) => blocker.includes('no slate rows')));

console.log('OpeningDrive keep-later-proof selector real-row filter simulation verified.');
