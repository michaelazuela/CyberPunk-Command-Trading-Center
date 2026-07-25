import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-coverage-queue';

const outcomeJoin = {
  status: 'pass',
  rows: [
    {
      tradeDate: '2026-06-11',
      sessionType: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      selectorDecision: 'keep_later_sweep_proof',
      shadowRows: 2,
      wouldChangePrimaryRows: 2,
      sampleSnapshotIds: ['matched'],
      outcomeEvidenceCount: 10,
    },
    {
      tradeDate: '2026-06-12',
      sessionType: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      selectorDecision: 'keep_later_sweep_proof',
      shadowRows: 17,
      wouldChangePrimaryRows: 17,
      sampleSnapshotIds: ['large'],
      outcomeEvidenceCount: 0,
    },
    {
      tradeDate: '2026-06-10',
      sessionType: 'morning',
      setupType: 'raidReclaim',
      direction: 'SHORT',
      selectorDecision: 'prefer_replacement',
      shadowRows: 8,
      wouldChangePrimaryRows: 8,
      sampleSnapshotIds: ['small'],
      outcomeEvidenceCount: 0,
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport({
  outcomeJoinPath: 'join.json',
  outcomeJoin: outcomeJoin as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_coverage_queue');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.unmatchedGroupsQueued, 2);
assert.equal(report.summary.unmatchedShadowRowsQueued, 25);
assert.equal(report.summary.wouldChangePrimaryRowsQueued, 25);
assert.equal(report.summary.keepLaterSweepProofGroups, 1);
assert.equal(report.summary.preferReplacementGroups, 1);
assert.equal(report.summary.topPriorityKey, '2026-06-12|lunch|SweepMssFvgRetrace|SHORT|keep_later_sweep_proof');
assert.equal(report.summary.recommendation, 'build_missing_outcome_replay_package');
assert.equal(report.rows[0].shadowRows, 17);
assert.match(report.markdown, /OpeningDrive Keep-Later-Proof Selector Shadow Coverage Queue/);

console.log('OpeningDrive keep-later-proof selector shadow coverage queue verified.');
