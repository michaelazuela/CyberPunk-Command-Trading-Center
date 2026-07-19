import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneTopSelectionValidationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-positive-lane-top-selection-validation';

type BuildArgs = Parameters<typeof buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneTopSelectionValidationReport>[0];

const overlaySimulation: BuildArgs['overlaySimulation'] = {
  status: 'pass',
  overlayRows: [
    {
      slateId: '2026-07-01|lunch|SweepMssFvgRetrace|LONG',
      proofTime: '2026-07-01T12:30:00',
      classLabel: 'problem',
      resolvedOneMesPl: null,
      overlaySelected: false,
      overlayReason: 'not in positive-lane union',
    },
    {
      slateId: '2026-07-01|lunch|SweepMssFvgRetrace|SHORT',
      proofTime: '2026-07-01T13:00:00',
      classLabel: 'winner',
      resolvedOneMesPl: 100,
      overlaySelected: true,
      overlayReason: 'riskBucket=risk_lt_10',
    },
    {
      slateId: '2026-07-02|morning|SweepMssFvgRetrace|LONG',
      proofTime: '2026-07-02T09:30:00',
      classLabel: 'winner',
      resolvedOneMesPl: 50,
      overlaySelected: true,
      overlayReason: 'riskBucket=risk_lt_10',
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneTopSelectionValidationReport({
  overlaySimulation,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.dateSessionGroups, 2);
assert.equal(report.summary.changedSelections, 1);
assert.equal(report.summary.baselineWinnerSelections, 1);
assert.equal(report.summary.overlayWinnerSelections, 2);
assert.equal(report.summary.baselineGrossResolvedOneMesPl, 50);
assert.equal(report.summary.overlayGrossResolvedOneMesPl, 150);
assert.equal(report.summary.grossResolvedOneMesPlDelta, 100);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.match(report.markdown, /Top Selection Validation/);

console.log('OpeningDrive positive-lane top-selection validation verified.');
