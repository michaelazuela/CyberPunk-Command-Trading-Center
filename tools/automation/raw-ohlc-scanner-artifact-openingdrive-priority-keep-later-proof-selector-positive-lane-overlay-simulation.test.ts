import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneOverlaySimulationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-positive-lane-overlay-simulation';

type BuildArgs = Parameters<typeof buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneOverlaySimulationReport>[0];

const separatorMiner: BuildArgs['separatorMiner'] = {
  status: 'pass',
  retainedSlateRows: [
    {
      slateId: 'winner-low-risk',
      classLabel: 'winner',
      resolvedOneMesPl: 100,
      features: { riskBucket: 'risk_lt_10', proofWindow: 'proof_12_to_14' },
    },
    {
      slateId: 'winner-proof-window',
      classLabel: 'winner',
      resolvedOneMesPl: 75,
      features: { riskBucket: 'risk_10_to_15', proofWindow: 'proof_14_to_15' },
    },
    {
      slateId: 'winner-outside',
      classLabel: 'winner',
      resolvedOneMesPl: 50,
      features: { riskBucket: 'risk_10_to_15', proofWindow: 'proof_12_to_14' },
    },
    {
      slateId: 'problem-outside',
      classLabel: 'problem',
      resolvedOneMesPl: null,
      features: { riskBucket: 'risk_20_to_25', proofWindow: 'proof_10_to_12' },
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneOverlaySimulationReport({
  separatorMiner,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.retainedSlates, 4);
assert.equal(report.summary.retainedWinnerSlates, 3);
assert.equal(report.summary.overlaySelectedSlates, 2);
assert.equal(report.summary.overlaySelectedWinnerSlates, 2);
assert.equal(report.summary.overlaySelectedProblemSlates, 0);
assert.equal(report.summary.overlayPrecision, 1);
assert.equal(report.summary.baselinePrecision, 0.75);
assert.equal(report.summary.overlayWinnerRecall, 0.67);
assert.equal(report.summary.nonSelectedWinnerSlates, 1);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.match(report.recommendations.join('\n'), /priority boost/);
assert.match(report.markdown, /Positive-Lane Overlay Simulation/);

console.log('OpeningDrive positive-lane overlay simulation verified.');
