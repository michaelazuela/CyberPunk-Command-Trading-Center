import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-replay-package';

const coverageQueue = {
  status: 'pass',
  rows: [
    {
      priority: 1,
      replayQueueKey: '2026-06-23|evening|NoInstalledSetup|LONG|keep_later_sweep_proof',
      tradeDate: '2026-06-23',
      sessionType: 'evening',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      selectorDecision: 'keep_later_sweep_proof',
      shadowRows: 41,
      wouldChangePrimaryRows: 29,
      sampleSnapshotIds: ['a', 'b'],
    },
    {
      priority: 2,
      replayQueueKey: '2026-06-23|evening|historicalReview|SHORT|prefer_replacement',
      tradeDate: '2026-06-23',
      sessionType: 'evening',
      setupType: 'historicalReview',
      direction: 'SHORT',
      selectorDecision: 'prefer_replacement',
      shadowRows: 37,
      wouldChangePrimaryRows: 0,
      sampleSnapshotIds: ['c'],
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport({
  coverageQueuePath: 'queue.json',
  coverageQueue: coverageQueue as any,
  limit: 1,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_replay_package');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.packageRows, 1);
assert.equal(report.summary.packagedShadowRows, 41);
assert.equal(report.summary.packagedWouldChangePrimaryRows, 29);
assert.equal(report.summary.keepLaterSweepProofRows, 1);
assert.equal(report.summary.preferReplacementRows, 0);
assert.equal(report.summary.topReplayQueueKey, '2026-06-23|evening|NoInstalledSetup|LONG|keep_later_sweep_proof');
assert.equal(report.summary.recommendation, 'run_saved_outcome_replay_for_package');
assert.equal(report.rows[0].outcomeReplayStatus, 'queued_for_saved_report_replay');
assert.match(report.markdown, /OpeningDrive Keep-Later-Proof Selector Shadow Missing Replay Package/);

console.log('OpeningDrive keep-later-proof selector shadow missing replay package verified.');
