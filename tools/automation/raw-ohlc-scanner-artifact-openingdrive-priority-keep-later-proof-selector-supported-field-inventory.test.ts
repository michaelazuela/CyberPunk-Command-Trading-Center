import assert from 'node:assert/strict';
import { SetupType } from '../../src/types';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldInventoryReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-supported-field-inventory';

const artifact = {
  events: [
    {
      eventTime: '2026-07-01T10:00:00',
      date: '2026-07-01',
      session: 'morning',
      completed5m: { time: '2026-07-01T10:00:00', open: 1, high: 2, low: 1, close: 2 },
      setupCandidateStatus: {
        statuses: [
          {
            setupType: SetupType.NoSetup,
            direction: 'LONG',
            entry: 100,
            stop: 95,
            target1: 107.5,
            target2: 110,
            riskPoints: 5,
            detectedStatus: 'Possible',
            confidence: 'High',
            executionStatus: 'Conditional',
            entryClarity: 1,
            stopClarity: 1,
            targetClarity: 1,
            proximityScore: 0.75,
            levelContextScore: 12,
            rankScore: 250,
            evidence: ['a'],
            missingEvidence: ['b', 'c'],
          },
          {
            setupType: SetupType.NoSetup,
            direction: 'LONG',
            entry: 100,
            stop: 95,
            target1: 107.5,
            target2: 110,
            riskPoints: 5,
            detectedStatus: 'Possible',
            confidence: 'Medium',
            executionStatus: 'Conditional',
            entryClarity: 1,
            stopClarity: 1,
            targetClarity: 1,
            proximityScore: 0.5,
            levelContextScore: 9,
            rankScore: 240,
            evidence: ['a'],
            missingEvidence: ['b'],
          },
        ],
      },
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldInventoryReport({
  artifacts: [{ artifactPath: 'synthetic.json', artifact }],
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.artifactsRead, 1);
assert.equal(report.summary.keepLaterRowsWithValidLevels, 1);
assert.equal(report.summary.fieldsInventoried, 19);
assert.equal(report.fieldStats.find((row) => row.field === 'detectedStatus')?.presentRows, 1);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.match(report.markdown, /Supported Field Inventory/);

console.log('OpeningDrive supported field inventory verified.');
