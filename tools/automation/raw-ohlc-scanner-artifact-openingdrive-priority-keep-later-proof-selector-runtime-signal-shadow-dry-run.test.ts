import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalShadowDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-shadow-dry-run';

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalShadowDryRunReport('2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_shadow_dry_run');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.shadowDryRunOnly, true);
assert.equal(report.assumptions.attachesSignalToClonedCandidatesOnly, true);
assert.equal(report.assumptions.scannerVisibleInstallAllowedByThisReport, false);
assert.equal(report.summary.rowsCompared, 4);
assert.equal(report.summary.signalsAttached, 4);
assert.equal(report.summary.keepLaterSweepProofRows, 2);
assert.equal(report.summary.rankOrderChanged, false);
assert.equal(report.summary.rankScoreChangedRows, 0);
assert.equal(report.summary.executionStatusChangedRows, 0);
assert.equal(report.summary.blockReasonChangedRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'prepare_scanner_population_preflight_next');
assert.ok(report.rows.some((row) => row.candidateKey === 'sweep-long' && row.selectorDecision === 'keep_later_sweep_proof'));
assert.ok(report.rows.every((row) => row.beforeRank === row.afterRank));
assert.match(report.markdown, /Shadow Dry-Run/);

console.log('OpeningDrive keep-later-proof selector proofSelectionSignal shadow dry-run verified.');
