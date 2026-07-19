import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-outcome-join';

const shadowComparison = {
  status: 'pass',
  rows: [
    {
      snapshotId: 'snap-1',
      tradeDate: '2026-06-17',
      sessionType: 'morning',
      completedBarTime: '2026-06-17T10:00:00',
      direction: 'SHORT',
      groupKey: 'morning|2026-06-17T10:00:00|SHORT',
      groupSize: 2,
      baselinePrimaryKey: 'OpeningDrive|x',
      shadowSelectedKey: 'Sweep|x',
      shadowSelectedSetupType: 'SweepMssFvgRetrace',
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
      snapshotId: 'snap-2',
      tradeDate: '2026-06-17',
      sessionType: 'morning',
      completedBarTime: '2026-06-17T10:05:00',
      direction: 'SHORT',
      groupKey: 'morning|2026-06-17T10:05:00|SHORT',
      groupSize: 2,
      baselinePrimaryKey: 'OpeningDrive|y',
      shadowSelectedKey: 'Sweep|y',
      shadowSelectedSetupType: 'SweepMssFvgRetrace',
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
      snapshotId: 'snap-3',
      tradeDate: '2026-06-18',
      sessionType: 'lunch',
      completedBarTime: '2026-06-18T12:45:00',
      direction: 'LONG',
      groupKey: 'lunch|2026-06-18T12:45:00|LONG',
      groupSize: 2,
      baselinePrimaryKey: 'Sweep|z',
      shadowSelectedKey: 'AfterLunch|z',
      shadowSelectedSetupType: 'AfterLunchDriveFvgContinuation',
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
      snapshotId: 'snap-4',
      tradeDate: '2026-06-19',
      sessionType: 'morning',
      completedBarTime: '2026-06-19T09:55:00',
      direction: 'LONG',
      groupKey: 'morning|2026-06-19T09:55:00|LONG',
      groupSize: 2,
      baselinePrimaryKey: 'Sweep|missing',
      shadowSelectedKey: 'OpeningDrive|missing',
      shadowSelectedSetupType: 'OpeningDriveFvgContinuation',
      selectorDecision: 'prefer_replacement',
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

const outcomeRecords = [
  {
    tradeDate: '2026-06-17',
    sessionType: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'SHORT',
    outcome: 't1_and_t2_hit',
    oneMesGross: 150,
    source: 'local_rag_or_review',
    sourcePath: 'outcome-a.json',
  },
  {
    tradeDate: '2026-06-18',
    sessionType: 'lunch',
    setupType: 'AfterLunchDriveFvgContinuation',
    direction: 'LONG',
    outcome: 'stopped_before_t1',
    oneMesGross: -50,
    source: 'local_rag_or_review',
    sourcePath: 'outcome-b.json',
  },
];

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport({
  shadowComparisonPath: 'shadow.json',
  shadowComparison: shadowComparison as any,
  outcomeJsonPaths: [process.argv[1]],
  outcomeRecords: outcomeRecords as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_outcome_join');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.shadowRows, 4);
assert.equal(report.summary.shadowGroups, 3);
assert.equal(report.summary.outcomeRecordsLoaded, 2);
assert.equal(report.summary.joinedGroups, 2);
assert.equal(report.summary.unmatchedGroups, 1);
assert.equal(report.summary.joinedShadowRows, 3);
assert.equal(report.summary.unmatchedShadowRows, 1);
assert.equal(report.summary.positiveGroups, 1);
assert.equal(report.summary.negativeGroups, 1);
assert.equal(report.summary.grossJoinedOneMesPl, 100);
assert.equal(report.summary.recommendation, 'expand_outcome_coverage');

const sweep = report.rows.find((row) => row.setupType === 'SweepMssFvgRetrace');
const missing = report.rows.find((row) => row.setupType === 'OpeningDriveFvgContinuation');

assert.equal(sweep?.shadowRows, 2);
assert.equal(sweep?.grossOneMesPl, 150);
assert.equal(sweep?.outcomeClassification, 'positive');
assert.equal(missing?.outcomeClassification, 'no_evidence');
assert.match(report.markdown, /OpeningDrive Keep-Later-Proof Selector Shadow Outcome Join/);

console.log('OpeningDrive keep-later-proof selector shadow outcome join verified.');
