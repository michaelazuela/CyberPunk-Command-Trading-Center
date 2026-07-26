import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowOutcomeSlateAuditReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-outcome-slate-audit';

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowOutcomeSlateAuditReport({
  reportDir: 'reports',
  outcomePath: 'outcome.json',
  outcome: {
    status: 'pass',
    rows: [
      {
        ticketId: 'later',
        tradeDate: '2026-07-06',
        session: 'lunch',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        proofTime: '2026-07-06T12:10:00',
        outcomeStatus: 'resolved',
        outcomeLabel: 't1_and_t2_hit',
        resolvedOneMesPl: 120,
      },
      {
        ticketId: 'earliest',
        tradeDate: '2026-07-06',
        session: 'lunch',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        proofTime: '2026-07-06T12:05:00',
        outcomeStatus: 'resolved',
        outcomeLabel: 't1_hit_only',
        resolvedOneMesPl: 60,
      },
      {
        ticketId: 'short',
        tradeDate: '2026-07-07',
        session: 'morning',
        setupType: 'NoInstalledSetup',
        direction: 'SHORT',
        proofTime: '2026-07-07T10:00:00',
        outcomeStatus: 'unresolved',
        outcomeLabel: 'no_target_or_stop_hit',
        resolvedOneMesPl: null,
      },
    ],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_row_outcome_slate_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.summary.outcomeRows, 3);
assert.equal(report.summary.repeatedSnapshotRows, 1);
assert.equal(report.summary.slateRows, 2);
assert.equal(report.summary.resolvedSlates, 1);
assert.equal(report.summary.unresolvedSlates, 1);
assert.equal(report.summary.t1OnlySlates, 1);
assert.equal(report.summary.earliestSlateGrossResolvedOneMesPl, 60);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.slateRows[0].selectedTicketId, 'earliest');
assert.equal(report.summary.recommendation, 'analyze_losing_and_unresolved_slates_before_runtime_rank_consumer');
assert.match(report.markdown, /Outcome Slate Audit/);

const failReport = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowOutcomeSlateAuditReport({
  reportDir: 'reports',
  outcomePath: 'outcome.json',
  outcome: { status: 'pass', rows: [] },
}, '2026-07-19T00:01:00.000Z');

assert.equal(failReport.status, 'fail');
assert.ok(failReport.blockers.some((blocker) => blocker.includes('no rows')));

console.log('OpeningDrive keep-later-proof selector real-row outcome slate audit verified.');
