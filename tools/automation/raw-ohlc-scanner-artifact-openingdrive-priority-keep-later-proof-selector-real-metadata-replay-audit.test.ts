import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-metadata-replay-audit';

const artifact = {
  events: {
    '2026-07-06T09:35:00': {
      eventTime: '2026-07-06T09:35:00',
      date: '2026-07-06',
      session: 'morning',
      completed5m: { time: '2026-07-06T09:35:00' },
      setupCandidateStatus: {
        statuses: [
          { setupType: 'OpeningDriveFvgContinuation', direction: 'LONG', entry: 7557.5, stop: 7551.75, target1: 7566.25, target2: 7569, riskPoints: 5.75 },
          { setupType: 'SweepMssFvgRetrace', direction: 'LONG', entry: 7557.5, stop: 7551.75, target1: 7566.25, target2: 7569, riskPoints: 5.75 },
        ],
      },
    },
  },
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport({
  artifactPath: 'artifact.json',
  artifact,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_metadata_replay_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.assumptions.usesCurrentProofSelectionSignalBuilder, true);
assert.equal(report.assumptions.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.eventsScanned, 1);
assert.equal(report.summary.refsBuilt, 2);
assert.equal(report.summary.signalRows, 2);
assert.equal(report.summary.collisionSignalRows, 2);
assert.equal(report.summary.keepLaterSweepProofRows, 1);
assert.equal(report.summary.keepLaterRowsWithValidLevels, 1);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'real_metadata_replay_supports_rank_consumer_research_only');
assert.ok(report.rows.some((row) => row.selectorDecision === 'keep_later_sweep_proof'));
assert.match(report.markdown, /Real Metadata Replay Audit/);

const blocked = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport({
  artifactPath: 'empty.json',
  artifact: { events: {} },
}, '2026-07-19T00:01:00.000Z');

assert.equal(blocked.status, 'fail');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('no events')));

console.log('OpeningDrive keep-later-proof selector real metadata replay audit verified.');
