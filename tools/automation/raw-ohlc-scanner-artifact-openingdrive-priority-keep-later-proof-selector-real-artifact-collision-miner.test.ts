import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealArtifactCollisionMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-artifact-collision-miner';

const artifact = {
  events: {
    '2026-07-03T10:05:00': {
      eventTime: '2026-07-03T10:05:00',
      date: '2026-07-03',
      session: 'morning',
      completed5m: { time: '2026-07-03T10:05:00' },
      setupCandidateStatus: {
        statuses: [
          {
            setupType: 'OpeningDriveFvgContinuation',
            direction: 'SHORT',
            candidateState: 'HUMAN_REVIEW_READY',
            humanReview: { status: 'HumanReviewReady' },
            modelConfidenceScore: 78,
            entry: 7540,
            stop: 7548,
            target1: 7528,
            target2: 7524,
            riskPoints: 8,
          },
          {
            setupType: 'SweepMssFvgRetrace',
            direction: 'SHORT',
            modelConfidenceScore: 74,
            entry: 7539,
            stop: 7547,
            target1: 7527,
            target2: 7523,
            riskPoints: 8,
          },
          {
            setupType: 'raidReclaim',
            direction: 'SHORT',
          },
        ],
      },
    },
    '2026-07-03T12:10:00': {
      eventTime: '2026-07-03T12:10:00',
      date: '2026-07-03',
      session: 'lunch',
      completed5m: { time: '2026-07-03T12:10:00' },
      setupCandidateStatus: {
        statuses: [
          { setupType: 'AfterLunchDriveFvgContinuation', direction: 'LONG' },
          { setupType: 'SweepMssFvgRetrace', direction: 'LONG' },
        ],
      },
    },
  },
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealArtifactCollisionMinerReport({
  artifactPath: 'raw-artifact.json',
  artifact,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_artifact_collision_miner');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.assumptions.noSyntheticCompanionRowsAdded, true);
assert.equal(report.assumptions.scannerVisiblePopulationAllowedByThisReport, false);
assert.equal(report.summary.eventsScanned, 2);
assert.equal(report.summary.candidateRowsScanned, 4);
assert.equal(report.summary.naturalCollisionGroups, 2);
assert.equal(report.summary.openingDriveSweepGroups, 1);
assert.equal(report.summary.afterLunchSweepGroups, 1);
assert.equal(report.summary.groupsWithValidLevels, 1);
assert.equal(report.summary.readyForPopulationMetadataInstallEvidence, true);
assert.equal(report.summary.scannerVisiblePopulationAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'real_artifact_collision_coverage_supports_population_metadata_checkpoint');
assert.ok(report.pairSummary.some((row) => row.pair === 'OpeningDriveFvgContinuation+SweepMssFvgRetrace' && row.groups === 1));
assert.match(report.markdown, /Real-Artifact Collision Miner/);

const blocked = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealArtifactCollisionMinerReport({
  artifactPath: 'empty.json',
  artifact: { events: {} },
}, '2026-07-19T00:01:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'fix_inputs');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('no events')));

console.log('OpeningDrive keep-later-proof selector real-artifact collision miner verified.');
