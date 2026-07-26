import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-comparison';
import { ExecutionStatus, SetupCandidateStatus, SetupType, type SetupCandidate } from '../../src/types';

function candidate(overrides: Partial<SetupCandidate>): SetupCandidate {
  return {
    setupType: SetupType.NoSetup,
    scenarioLabel: 'fixture',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'Medium',
    priority: 90,
    entry: 100,
    stop: 96,
    target1: 106,
    target2: 108,
    riskPoints: 4,
    modelConfidenceScore: 85,
    decisionQualityScore: 85,
    evidence: ['Completed 5M proof with HTF context support.'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Completed 5M retest/re-entry proof confirmed.',
    nextAction: 'Human-review ticket only.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

const openingDrive = candidate({
  setupType: SetupType.NoSetup,
  scenarioLabel: 'opening-drive',
  priority: 95,
  modelConfidenceScore: 95,
  decisionQualityScore: 95,
});
const sweep = candidate({
  setupType: SetupType.NoSetup,
  scenarioLabel: 'later-sweep-proof',
  priority: 88,
  modelConfidenceScore: 88,
  decisionQualityScore: 88,
});
const replacement = candidate({
  setupType: SetupType.NoSetup,
  scenarioLabel: 'replacement',
  direction: 'SHORT',
  priority: 89,
  modelConfidenceScore: 89,
  decisionQualityScore: 89,
  entry: 100,
  stop: 104,
  target1: 94,
  target2: 92,
});
const shortSweep = candidate({
  setupType: SetupType.NoSetup,
  scenarioLabel: 'short-sweep',
  direction: 'SHORT',
  priority: 87,
  modelConfidenceScore: 87,
  decisionQualityScore: 87,
  entry: 100,
  stop: 104,
  target1: 94,
  target2: 92,
});

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport({
  inputJson: 'snapshots.json',
  inputDir: null,
  startDate: null,
  endDate: null,
  snapshots: [
    {
      snapshotId: 'long-keep-sweep',
      tradeDate: '2026-07-19',
      sessionType: 'morning',
      completedBarTime: '2026-07-19T10:05:00',
      candidates: [openingDrive, sweep],
      currentSelectedCandidateIndex: 0,
      currentCanExecute: false,
    },
    {
      snapshotId: 'short-prefer-replacement',
      tradeDate: '2026-07-19',
      sessionType: 'morning',
      completedBarTime: '2026-07-19T10:10:00',
      candidates: [shortSweep, replacement],
      currentSelectedCandidateIndex: 0,
      currentCanExecute: false,
    },
    {
      snapshotId: 'no-collision',
      tradeDate: '2026-07-19',
      sessionType: 'morning',
      completedBarTime: null,
      candidates: [openingDrive, sweep],
      currentSelectedCandidateIndex: 0,
      currentCanExecute: false,
    },
  ],
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_comparison');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.snapshotsAudited, 3);
assert.equal(report.summary.collisionRows, 2);
assert.equal(report.summary.keepLaterSweepProofRows, 1);
assert.equal(report.summary.preferReplacementRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.scannerVisibleChangeAllowedRows, 0);
assert.equal(report.summary.entryStopTargetRiskDriftRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_saved_artifact_shadow_package');
assert.equal(report.rows.find((row) => row.snapshotId === 'long-keep-sweep')?.shadowSelectedSetupType, SetupType.NoSetup);
assert.equal(report.rows.find((row) => row.snapshotId === 'long-keep-sweep')?.direction, 'LONG');
assert.equal(report.rows.find((row) => row.snapshotId === 'short-prefer-replacement')?.shadowSelectedSetupType, SetupType.NoSetup);
assert.equal(report.rows.find((row) => row.snapshotId === 'short-prefer-replacement')?.direction, 'SHORT');
assert.match(report.markdown, /disabled shadow comparison/);

console.log('OpeningDrive keep-later-proof selector shadow comparison verified.');
