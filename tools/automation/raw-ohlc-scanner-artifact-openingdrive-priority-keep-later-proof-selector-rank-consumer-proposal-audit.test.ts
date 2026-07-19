import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankConsumerProposalAuditReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-rank-consumer-proposal-audit';

const passReport = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankConsumerProposalAuditReport({
  reportDir: 'reports',
  realArtifactCollisionMinerPath: 'real.json',
  installedMetadataAuditPath: 'installed.json',
  savedArtifactAdapterDryRunPath: 'adapter.json',
  dryRunComparisonPath: 'comparison.json',
  realArtifactCollisionMiner: {
    status: 'pass',
    summary: { openingDriveSweepGroups: 363, afterLunchSweepGroups: 493 },
  },
  installedMetadataAudit: {
    status: 'pass',
    summary: {
      signalInstalledRows: 2,
      keepLaterSweepProofRows: 0,
      rankScoreChangedRows: 0,
      rankOrderChangedContexts: 0,
      executionStatusChangedRows: 0,
      blockReasonChangedRows: 0,
      discordEligibilityChangedRows: 0,
      humanCanExecuteChangedRows: 0,
      entryStopTargetRiskChangedRows: 0,
    },
  },
  savedArtifactAdapterDryRun: {
    status: 'pass',
    summary: {
      eligibleAdapterRows: 4,
      changedRowsGrossResolvedOneMesPl: 478.75,
      missingOutcomeRows: 0,
      shouldPostRows: 0,
      publishDiscordRows: 0,
      canExecuteChangedRows: 0,
      livePromotionAllowedRows: 0,
    },
  },
  dryRunComparison: {
    status: 'pass',
    summary: {
      missingOutcomeRows: 0,
      shouldPostRows: 0,
      publishDiscordRows: 0,
      canExecuteChangedRows: 0,
      livePromotionAllowedRows: 0,
    },
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(passReport.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_rank_consumer_proposal_audit');
assert.equal(passReport.status, 'pass');
assert.equal(passReport.authority.readOnly, true);
assert.equal(passReport.authority.runsSetupScanner, false);
assert.equal(passReport.authority.changesTradingLogic, false);
assert.equal(passReport.assumptions.noRankConsumerInstalled, true);
assert.equal(passReport.assumptions.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(passReport.summary.realOpeningDriveSweepGroups, 363);
assert.equal(passReport.summary.installedKeepLaterRows, 0);
assert.equal(passReport.summary.savedEligibleAdapterRows, 4);
assert.equal(passReport.summary.savedChangedRowsGrossResolvedOneMesPl, 478.75);
assert.equal(passReport.summary.safetyDriftRows, 0);
assert.equal(passReport.summary.researchRankConsumerSupported, true);
assert.equal(passReport.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(passReport.summary.recommendation, 'build_real_metadata_replay_before_runtime_rank_consumer');
assert.ok(passReport.gates.some((gate) => gate.name === 'runtime_rank_consumer_readiness' && gate.status === 'caution'));
assert.match(passReport.markdown, /Rank Consumer Proposal Audit/);

const failReport = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankConsumerProposalAuditReport({
  reportDir: 'reports',
  realArtifactCollisionMinerPath: 'real.json',
  installedMetadataAuditPath: 'installed.json',
  savedArtifactAdapterDryRunPath: 'adapter.json',
  dryRunComparisonPath: 'comparison.json',
  realArtifactCollisionMiner: { status: 'pass', summary: { openingDriveSweepGroups: 0 } },
  installedMetadataAudit: { status: 'pass', summary: { signalInstalledRows: 2 } },
  savedArtifactAdapterDryRun: { status: 'pass', summary: { eligibleAdapterRows: 0, changedRowsGrossResolvedOneMesPl: 0 } },
  dryRunComparison: { status: 'pass', summary: {} },
}, '2026-07-19T00:01:00.000Z');

assert.equal(failReport.status, 'fail');
assert.equal(failReport.summary.researchRankConsumerSupported, false);
assert.ok(failReport.blockers.some((blocker) => blocker.includes('real_artifact_collision_coverage')));

console.log('OpeningDrive keep-later-proof selector rank-consumer proposal audit verified.');
