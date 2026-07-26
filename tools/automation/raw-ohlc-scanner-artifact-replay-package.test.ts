import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactReplayPackageReport,
  parseRawOhlcScannerArtifactReplayPackageArgs,
} from './raw-ohlc-scanner-artifact-replay-package';

const artifact = {
  reportType: 'raw_ohlc_scanner_artifact_package',
  generatedAt: '2026-07-18T00:00:00.000Z',
  instrument: 'MES',
  startDate: '2026-06-10',
  endDate: '2026-06-10',
  events: {
    '2026-06-10T14:45:00': {
      eventTime: '2026-06-10T14:45:00',
      date: '2026-06-10',
      session: 'lunch',
      completed5m: { time: '2026-06-10T14:45:00', open: 100, high: 102, low: 99, close: 101 },
      setupCandidateStatus: {
        statuses: [
          {
            setupType: 'NoInstalledSetup',
            direction: 'LONG',
            detectedStatus: 'Possible',
            executionStatus: 'Conditional',
            blockReason: 'EntryTriggerPending',
            entry: 100,
            stop: 98,
            target1: 103,
            target2: 104,
            riskPoints: 2,
          },
          {
            setupType: 'NoInstalledSetup',
            direction: 'LONG',
            detectedStatus: 'Blocked',
            executionStatus: 'Blocked',
            blockReason: 'InvalidStopLocation',
            entry: 100,
            stop: 101,
            target1: null,
            target2: null,
            riskPoints: 1,
          },
        ],
      },
    },
    '2026-06-10T14:50:00': {
      eventTime: '2026-06-10T14:50:00',
      date: '2026-06-10',
      session: 'lunch',
      completed5m: { time: '2026-06-10T14:50:00', open: 101, high: 105, low: 100, close: 104 },
      setupCandidateStatus: { statuses: [] },
    },
  },
};

const report = buildRawOhlcScannerArtifactReplayPackageReport({
  scannerArtifactPath: 'artifact.json',
  scannerArtifact: artifact,
}, '2026-07-18T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_replay_package');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.replayPackageRows, 1);
assert.equal(report.summary.readyRows, 1);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.directionallyInvalidGeometryRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rows[0].entry, 100);
assert.equal(report.rows[0].stop, 98);
assert.equal(report.rows[0].t1R, 1.5);
assert.equal(report.rows[0].t2R, 2);
assert.equal(report.rows[0].sourceTapePath, 'artifact.json');
assert.equal(report.rows[0].barsAfterProof, 2);
assert.match(report.markdown, /Raw OHLC Scanner Artifact Replay Package/);

const missing = buildRawOhlcScannerArtifactReplayPackageReport({
  scannerArtifactPath: 'missing.json',
  scannerArtifact: null,
}, '2026-07-18T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing scanner artifact package'));

assert.throws(
  () => parseRawOhlcScannerArtifactReplayPackageArgs([]),
  /--scanner-artifact is required/,
);

console.log('raw OHLC scanner artifact replay package verified.');
