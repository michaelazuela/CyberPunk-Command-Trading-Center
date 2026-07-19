import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorInstalledMetadataComparisonAuditReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-installed-metadata-comparison-audit';

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorInstalledMetadataComparisonAuditReport('2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_installed_metadata_comparison_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.runsSetupScanner, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.installedMetadataAuditOnly, true);
assert.equal(report.assumptions.scannerVisiblePopulationInstalled, true);
assert.equal(report.assumptions.scannerVisiblePopulationAllowedByThisReport, false);
assert.equal(report.summary.contextsScanned, 2);
assert.ok(report.summary.candidatesCompared > 0);
assert.ok(report.summary.signalInstalledRows > 0);
assert.equal(report.summary.rankScoreChangedRows, 0);
assert.equal(report.summary.rankOrderChangedContexts, 0);
assert.equal(report.summary.executionStatusChangedRows, 0);
assert.equal(report.summary.blockReasonChangedRows, 0);
assert.equal(report.summary.discordEligibilityChangedRows, 0);
assert.equal(report.summary.humanCanExecuteChangedRows, 0);
assert.equal(report.summary.entryStopTargetRiskChangedRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'installed_metadata_is_inert_prepare_next_rank_consumer_research');
assert.ok(report.rows.every((row) => row.installedRank === row.strippedRank));
assert.match(report.markdown, /Installed Metadata Comparison Audit/);

console.log('OpeningDrive keep-later-proof selector installed metadata comparison audit verified.');
