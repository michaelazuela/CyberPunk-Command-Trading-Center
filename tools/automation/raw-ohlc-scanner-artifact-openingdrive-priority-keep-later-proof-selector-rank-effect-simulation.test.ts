import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankEffectSimulationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-rank-effect-simulation';

const passReport = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankEffectSimulationReport({
  reportDir: 'reports',
  realMetadataReplayPath: 'real-metadata.json',
  dryRunComparisonPath: 'comparison.json',
  savedArtifactAdapterDryRunPath: 'adapter.json',
  installedMetadataAuditPath: 'installed.json',
  realMetadataReplay: {
    status: 'pass',
    summary: {
      keepLaterSweepProofRows: 220,
      keepLaterRowsWithValidLevels: 135,
      preferReplacementRows: 23,
      missingCompletedProofGroups: 0,
    },
  },
  dryRunComparison: {
    status: 'pass',
    summary: {
      changedRowsWithOutcomeEvidence: 4,
      changedRowsGrossResolvedOneMesPl: 478.75,
      missingOutcomeRows: 0,
      shouldPostRows: 0,
      publishDiscordRows: 0,
      canExecuteChangedRows: 0,
      livePromotionAllowedRows: 0,
    },
  },
  savedArtifactAdapterDryRun: {
    status: 'pass',
    summary: {
      missingOutcomeRows: 0,
      shouldPostRows: 0,
      publishDiscordRows: 0,
      canExecuteChangedRows: 0,
      livePromotionAllowedRows: 0,
    },
  },
  installedMetadataAudit: {
    status: 'pass',
    summary: {
      rankScoreChangedRows: 0,
      rankOrderChangedContexts: 0,
      executionStatusChangedRows: 0,
      blockReasonChangedRows: 0,
      discordEligibilityChangedRows: 0,
      humanCanExecuteChangedRows: 0,
      entryStopTargetRiskChangedRows: 0,
    },
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(passReport.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_rank_effect_simulation');
assert.equal(passReport.status, 'pass');
assert.equal(passReport.authority.readOnly, true);
assert.equal(passReport.authority.runsSetupScanner, false);
assert.equal(passReport.authority.changesTradingLogic, false);
assert.equal(passReport.assumptions.noRankConsumerInstalled, true);
assert.equal(passReport.assumptions.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(passReport.summary.realKeepLaterRows, 220);
assert.equal(passReport.summary.realKeepLaterRowsWithValidLevels, 135);
assert.equal(passReport.summary.outcomeBackedChangedRows, 4);
assert.equal(passReport.summary.outcomeBackedGrossResolvedOneMesPl, 478.75);
assert.equal(passReport.summary.outcomeBackedCoveragePct, 1.82);
assert.equal(passReport.summary.validLevelKeepLaterCoveragePct, 61.36);
assert.equal(passReport.summary.safetyDriftRows, 0);
assert.equal(passReport.summary.researchRankEffectSupported, true);
assert.equal(passReport.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(passReport.summary.recommendation, 'expand_outcome_join_before_runtime_rank_consumer');
assert.ok(passReport.gates.some((gate) => gate.name === 'outcome_coverage_limited' && gate.status === 'caution'));
assert.match(passReport.markdown, /Rank Effect Simulation/);

const failReport = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankEffectSimulationReport({
  reportDir: 'reports',
  realMetadataReplayPath: 'real-metadata.json',
  dryRunComparisonPath: 'comparison.json',
  savedArtifactAdapterDryRunPath: 'adapter.json',
  installedMetadataAuditPath: 'installed.json',
  realMetadataReplay: {
    status: 'pass',
    summary: { keepLaterSweepProofRows: 220, missingCompletedProofGroups: 0 },
  },
  dryRunComparison: {
    status: 'pass',
    summary: { changedRowsWithOutcomeEvidence: 4, changedRowsGrossResolvedOneMesPl: -125 },
  },
  savedArtifactAdapterDryRun: { status: 'pass', summary: {} },
  installedMetadataAudit: { status: 'pass', summary: {} },
}, '2026-07-19T00:01:00.000Z');

assert.equal(failReport.status, 'fail');
assert.equal(failReport.summary.researchRankEffectSupported, false);
assert.ok(failReport.blockers.some((blocker) => blocker.includes('outcome_backed_subset_positive')));

console.log('OpeningDrive keep-later-proof selector rank-effect simulation verified.');
