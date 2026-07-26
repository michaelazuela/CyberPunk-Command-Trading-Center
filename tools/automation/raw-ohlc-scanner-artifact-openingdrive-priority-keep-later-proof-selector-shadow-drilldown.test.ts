import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowDrilldownReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-drilldown';

const shadowComparison = {
  status: 'pass',
  rows: [
    {
      snapshotId: 'long-1',
      tradeDate: '2026-07-19',
      sessionType: 'morning',
      completedBarTime: '2026-07-19T10:00:00',
      direction: 'LONG',
      groupKey: 'morning|2026-07-19T10:00:00|LONG',
      groupSize: 2,
      baselinePrimaryKey: 'OpeningDrive|x',
      shadowSelectedKey: 'Sweep|x',
      shadowSelectedSetupType: 'NoInstalledSetup',
      selectorDecision: 'keep_later_sweep_proof',
      wouldChangePrimary: true,
      selectedCanExecute: false,
      selectedLiveInstallAllowed: false,
      selectedScannerVisibleChangeAllowed: false,
      selectedEntryPreserved: true,
      selectedStopPreserved: true,
      selectedTargetsPreserved: true,
      selectedRiskPreserved: true,
    },
    {
      snapshotId: 'short-1',
      tradeDate: '2026-07-19',
      sessionType: 'morning',
      completedBarTime: '2026-07-19T10:05:00',
      direction: 'SHORT',
      groupKey: 'morning|2026-07-19T10:05:00|SHORT',
      groupSize: 2,
      baselinePrimaryKey: 'Sweep|y',
      shadowSelectedKey: 'Intraday|y',
      shadowSelectedSetupType: 'NoInstalledSetup',
      selectorDecision: 'prefer_replacement',
      wouldChangePrimary: true,
      selectedCanExecute: false,
      selectedLiveInstallAllowed: false,
      selectedScannerVisibleChangeAllowed: false,
      selectedEntryPreserved: true,
      selectedStopPreserved: true,
      selectedTargetsPreserved: true,
      selectedRiskPreserved: true,
    },
    {
      snapshotId: 'lunch-1',
      tradeDate: '2026-07-19',
      sessionType: 'lunch',
      completedBarTime: '2026-07-19T12:35:00',
      direction: 'SHORT',
      groupKey: 'lunch|2026-07-19T12:35:00|SHORT',
      groupSize: 2,
      baselinePrimaryKey: 'Sweep|z',
      shadowSelectedKey: 'Sweep|z',
      shadowSelectedSetupType: 'NoInstalledSetup',
      selectorDecision: 'keep_later_sweep_proof',
      wouldChangePrimary: false,
      selectedCanExecute: false,
      selectedLiveInstallAllowed: false,
      selectedScannerVisibleChangeAllowed: false,
      selectedEntryPreserved: true,
      selectedStopPreserved: true,
      selectedTargetsPreserved: true,
      selectedRiskPreserved: true,
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowDrilldownReport({
  shadowComparisonPath: 'shadow.json',
  shadowComparison: shadowComparison as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.shadowRows, 3);
assert.equal(report.summary.keepLaterSweepProofRows, 2);
assert.equal(report.summary.preferReplacementRows, 1);
assert.equal(report.summary.wouldChangePrimaryRows, 2);
assert.equal(report.summary.selectedCanExecuteTrueRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.scannerVisibleChangeAllowedRows, 0);
assert.equal(report.summary.entryStopTargetRiskDriftRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_outcome_join');

const longBucket = report.buckets.find((bucket) => bucket.dimension === 'direction' && bucket.value === 'LONG');
const shortBucket = report.buckets.find((bucket) => bucket.dimension === 'direction' && bucket.value === 'SHORT');
const lunchBucket = report.buckets.find((bucket) => bucket.dimension === 'sessionType' && bucket.value === 'lunch');

assert.equal(longBucket?.rows, 1);
assert.equal(shortBucket?.rows, 2);
assert.equal(lunchBucket?.keepLaterSweepProofRows, 1);
assert.match(report.markdown, /OpeningDrive Keep-Later-Proof Selector Shadow Drilldown/);

console.log('OpeningDrive keep-later-proof selector shadow drilldown verified.');
