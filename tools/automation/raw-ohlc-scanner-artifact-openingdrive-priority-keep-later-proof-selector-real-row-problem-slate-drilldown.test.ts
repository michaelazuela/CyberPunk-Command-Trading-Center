import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowProblemSlateDrilldownReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-problem-slate-drilldown';

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowProblemSlateDrilldownReport({
  reportDir: 'reports',
  outcomePath: 'outcome.json',
  outcome: {
    status: 'pass',
    rows: [
      {
        ticketId: 'early',
        tradeDate: '2026-07-07',
        session: 'morning',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        proofTime: '2026-07-07T11:50:00',
        outcomeStatus: 'unresolved',
        outcomeLabel: 'no_target_or_stop_hit',
        entry: 100,
        stop: 98,
        riskPoints: 2,
        barsAfterProof: 1,
        entryHitTime: '2026-07-07T11:50:00',
        firstReplayBarTime: null,
        stopHitTime: null,
        t1HitTime: null,
        t2HitTime: null,
        maximumFavorableExcursion: 0,
        maximumAdverseExcursion: 0,
        resolvedOneMesPl: null,
        resolvedR: null,
      },
      {
        ticketId: 'late',
        tradeDate: '2026-07-07',
        session: 'morning',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        proofTime: '2026-07-07T11:55:00',
        outcomeStatus: 'resolved',
        outcomeLabel: 't1_hit_only',
        entry: 100,
        stop: 98,
        riskPoints: 2,
        barsAfterProof: 6,
        entryHitTime: '2026-07-07T11:55:00',
        firstReplayBarTime: '2026-07-07T12:00:00',
        stopHitTime: null,
        t1HitTime: '2026-07-07T12:15:00',
        t2HitTime: null,
        maximumFavorableExcursion: 3,
        maximumAdverseExcursion: 1,
        resolvedOneMesPl: 15,
        resolvedR: 1.5,
      },
    ],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_row_problem_slate_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.summary.outcomeRows, 2);
assert.equal(report.summary.problemSlates, 1);
assert.equal(report.summary.unresolvedProblemSlates, 1);
assert.equal(report.summary.problemSlatesWithLaterPositiveRows, 1);
assert.equal(report.summary.problemSlatesWithOnlyOneBarAfterProof, 1);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.problemSlateRows[0].bestLaterResolvedOneMesPl, 15);
assert.match(report.problemSlateRows[0].note, /minimum replay-runway/);
assert.match(report.markdown, /Problem Slate Drilldown/);

const failReport = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowProblemSlateDrilldownReport({
  reportDir: 'reports',
  outcomePath: 'outcome.json',
  outcome: { status: 'pass', rows: [] },
}, '2026-07-19T00:01:00.000Z');

assert.equal(failReport.status, 'fail');
assert.ok(failReport.blockers.some((blocker) => blocker.includes('no rows')));

console.log('OpeningDrive keep-later-proof selector problem slate drilldown verified.');
