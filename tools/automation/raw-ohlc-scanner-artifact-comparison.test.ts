import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactComparisonReport,
  parseRawOhlcScannerArtifactComparisonArgs,
} from './raw-ohlc-scanner-artifact-comparison';

const beforeArtifact = {
  reportType: 'raw_ohlc_scanner_artifact_package',
  generatedAt: '2026-07-18T00:00:00.000Z',
  instrument: 'MES',
  startDate: '2026-06-10',
  endDate: '2026-06-12',
  events: {
    '2026-06-10T14:45:00': {
      eventTime: '2026-06-10T14:45:00',
      date: '2026-06-10',
      session: 'lunch',
      setupCandidateStatus: {
        statuses: [
          {
            setupType: 'NoInstalledSetup',
            direction: 'LONG',
            detectedStatus: 'Blocked',
            executionStatus: 'Blocked',
            blockReason: 'InvalidStopLocation',
            entry: 7308.25,
            stop: 7319.25,
            target1: null,
            target2: null,
            riskPoints: 11,
          },
        ],
      },
    },
  },
};

const afterArtifact = {
  ...beforeArtifact,
  events: {
    '2026-06-10T14:45:00': {
      eventTime: '2026-06-10T14:45:00',
      date: '2026-06-10',
      session: 'lunch',
      setupCandidateStatus: {
        statuses: [
          {
            setupType: 'NoInstalledSetup',
            direction: 'LONG',
            detectedStatus: 'Possible',
            executionStatus: 'Conditional',
            blockReason: 'EntryTriggerPending',
            entry: 7308.25,
            stop: 7301.25,
            target1: 7318.75,
            target2: 7322.25,
            riskPoints: 7,
          },
        ],
      },
    },
  },
};

const report = buildRawOhlcScannerArtifactComparisonReport({
  beforeArtifactPath: 'before.json',
  beforeArtifact,
  afterArtifactPath: 'after.json',
  afterArtifact,
}, '2026-07-18T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_comparison');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingRules, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.beforeEvents, 1);
assert.equal(report.summary.afterEvents, 1);
assert.equal(report.summary.joinedRows, 1);
assert.equal(report.summary.changedRows, 1);
assert.equal(report.summary.invalidGeometryBeforeRows, 1);
assert.equal(report.summary.invalidGeometryAfterRows, 0);
assert.equal(report.summary.executableBeforeRows, 0);
assert.equal(report.summary.executableAfterRows, 0);
assert.equal(report.summary.conditionalAfterRows, 1);
assert.equal(report.summary.blockedBeforeRows, 1);
assert.equal(report.summary.blockedAfterRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'use_repaired_artifact_for_replay_chain');
assert.equal(report.rows[0].beforeStop, 7319.25);
assert.equal(report.rows[0].afterStop, 7301.25);
assert.match(report.reportMarkdown, /Invalid geometry before\/after: 1\/0/);

const drift = buildRawOhlcScannerArtifactComparisonReport({
  beforeArtifactPath: 'before.json',
  beforeArtifact,
  afterArtifactPath: 'after.json',
  afterArtifact: {
    ...afterArtifact,
    events: {
      ...afterArtifact.events,
      '2026-06-10T14:50:00': {
        eventTime: '2026-06-10T14:50:00',
        date: '2026-06-10',
        session: 'lunch',
        setupCandidateStatus: { statuses: [] },
      },
    },
  },
}, '2026-07-18T00:02:00.000Z');

assert.equal(drift.status, 'fail');
assert.ok(drift.blockers.includes('before and after artifact event counts differ'));

assert.throws(
  () => parseRawOhlcScannerArtifactComparisonArgs(['--after-artifact', 'after.json']),
  /--before-artifact is required/,
);
assert.throws(
  () => parseRawOhlcScannerArtifactComparisonArgs(['--before-artifact', 'before.json']),
  /--after-artifact is required/,
);

console.log('raw OHLC scanner artifact comparison verified.');
