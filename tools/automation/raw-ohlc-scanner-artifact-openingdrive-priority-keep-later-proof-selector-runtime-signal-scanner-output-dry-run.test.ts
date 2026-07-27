import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalScannerOutputDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-scanner-output-dry-run';

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalScannerOutputDryRunReport('2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_scanner_output_dry_run');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.runsSetupScanner, true);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.scannerOutputDryRunOnly, true);
assert.equal(report.assumptions.syntheticLocalContextOnly, true);
assert.equal(report.assumptions.attachesSignalToClonedCandidatesOnly, true);
assert.equal(report.assumptions.rankConsumerDisabled, true);
assert.equal(report.assumptions.scannerVisibleInstallAllowedByThisReport, false);
assert.equal(report.summary.contextsScanned, 2);
assert.ok(report.summary.candidatesCompared >= 4);
assert.equal(report.summary.proofRefsBuilt, report.summary.candidatesCompared);
assert.equal(report.summary.signalsAttached, 0);
assert.ok(report.summary.syntheticCompanionRowsAdded >= 1);
assert.equal(report.summary.keepLaterSweepProofRows, 0);
assert.equal(report.summary.missingProofTimestampRows, 0);
assert.equal(report.summary.rankScoreChangedRows, 0);
assert.equal(report.summary.rankOrderChangedContexts, 0);
assert.equal(report.summary.executionStatusChangedRows, 0);
assert.equal(report.summary.blockReasonChangedRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'prepare_scanner_population_approval_checkpoint_next');
assert.ok(report.rows.every((row) => !row.signalAttached));
assert.ok(report.rows.every((row) => row.beforeRank === row.afterRank));
assert.match(report.markdown, /Scanner-Output Dry-Run/);

console.log('OpeningDrive keep-later-proof selector scanner-output population dry-run verified.');
