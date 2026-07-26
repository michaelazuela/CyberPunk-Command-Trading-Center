import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSameSessionCompetitionInventoryReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-same-session-competition-inventory';

type BuildArgs = Parameters<typeof buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSameSessionCompetitionInventoryReport>[0];

const overlaySimulation: BuildArgs['overlaySimulation'] = {
  status: 'pass',
  overlayRows: [
    {
      slateId: '2026-07-01|lunch|NoInstalledSetup|LONG',
      proofTime: '2026-07-01T12:30:00',
      classLabel: 'problem',
      resolvedOneMesPl: null,
      overlaySelected: false,
      overlayReason: 'not in positive-lane union',
    },
    {
      slateId: '2026-07-01|lunch|NoInstalledSetup|SHORT',
      proofTime: '2026-07-01T13:00:00',
      classLabel: 'winner',
      resolvedOneMesPl: 100,
      overlaySelected: true,
      overlayReason: 'riskBucket=risk_lt_10',
    },
    {
      slateId: '2026-07-02|morning|NoInstalledSetup|LONG',
      proofTime: '2026-07-02T09:30:00',
      classLabel: 'winner',
      resolvedOneMesPl: 50,
      overlaySelected: true,
      overlayReason: 'riskBucket=risk_lt_10',
    },
    {
      slateId: '2026-07-03|morning|NoInstalledSetup|LONG',
      proofTime: '2026-07-03T09:30:00',
      classLabel: 'problem',
      resolvedOneMesPl: null,
      overlaySelected: false,
      overlayReason: 'not in positive-lane union',
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSameSessionCompetitionInventoryReport({
  overlaySimulation,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.dateSessionGroups, 3);
assert.equal(report.summary.singleSlateGroups, 2);
assert.equal(report.summary.multiSlateGroups, 1);
assert.equal(report.summary.mixedCompetitionGroups, 1);
assert.equal(report.summary.actionableMixedCompetitionGroups, 1);
assert.equal(report.summary.groupsWithPositiveLaneAndEarlierProblem, 1);
assert.equal(report.summary.problemOnlyGroups, 1);
assert.equal(report.summary.recommendation, 'mine_actionable_mixed_competition_groups');
assert.equal(report.competitionGroups.find((row) => row.groupId === '2026-07-01|lunch')?.competitionClass, 'mixed_competition_actionable');
assert.match(report.markdown, /Same-Session Competition Inventory/);

console.log('OpeningDrive same-session competition inventory verified.');
