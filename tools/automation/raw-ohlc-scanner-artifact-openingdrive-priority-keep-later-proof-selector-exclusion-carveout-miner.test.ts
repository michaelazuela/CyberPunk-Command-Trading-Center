import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-exclusion-carveout-miner';

const blockerDrilldown = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_strict_blocker_drilldown',
  status: 'pass',
  rows: [
    {
      ticketId: '2026-06-23|evening|historicalReview|SHORT|prefer_replacement|snapshot-entry-missing',
      tradeDate: '2026-06-23',
      session: 'evening',
      setupType: 'historicalReview',
      direction: 'SHORT',
      snapshotId: 'snapshot-entry-missing',
      likelyCause: 'matching_side_missing_levels',
    },
    {
      ticketId: '2026-06-29|lunch|NoInstalledSetup|SHORT|keep_later_sweep_proof|snapshot-invalid-stop',
      tradeDate: '2026-06-29',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      snapshotId: 'snapshot-invalid-stop',
      likelyCause: 'matching_side_invalid_entry_stop',
    },
    {
      ticketId: '2026-06-30|morning|NoInstalledSetup|LONG|keep_later_sweep_proof|snapshot-target-gap',
      tradeDate: '2026-06-30',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      snapshotId: 'snapshot-target-gap',
      likelyCause: 'matching_side_missing_levels',
    },
  ],
};

const levelPathDiagnostic = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_level_generation_path_diagnostic',
  status: 'pass',
  rows: [
    {
      ticketId: '2026-06-23|evening|historicalReview|SHORT|prefer_replacement|snapshot-entry-missing',
      tradeDate: '2026-06-23',
      session: 'evening',
      setupType: 'historicalReview',
      direction: 'SHORT',
      snapshotId: 'snapshot-entry-missing',
      pathState: 'waiting_for_entry_trigger',
      replayUse: 'do_not_replay_until_fresh_entry',
      blockReason: 'EntryTriggerMissing',
    },
    {
      ticketId: '2026-06-29|lunch|NoInstalledSetup|SHORT|keep_later_sweep_proof|snapshot-invalid-stop',
      tradeDate: '2026-06-29',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      snapshotId: 'snapshot-invalid-stop',
      pathState: 'invalidated_without_replayable_entry',
      replayUse: 'do_not_replay_stale_invalidated_plan',
      blockReason: 'InvalidStopLocation',
    },
    {
      ticketId: '2026-06-30|morning|NoInstalledSetup|LONG|keep_later_sweep_proof|snapshot-target-gap',
      tradeDate: '2026-06-30',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      snapshotId: 'snapshot-target-gap',
      pathState: 'missing_target_geometry_after_trigger',
      replayUse: 'inspect_target_generation',
      blockReason: 'TargetMissing',
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport({
  blockerDrilldownPath: 'blocker.json',
  blockerDrilldown: blockerDrilldown as any,
  levelPathDiagnosticPath: 'level-path.json',
  levelPathDiagnostic: levelPathDiagnostic as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_exclusion_carveout_miner');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.excludedRows, 3);
assert.equal(report.summary.performanceCarveoutEligibleRows, 2);
assert.equal(report.summary.targetGenerationGapRows, 1);
assert.equal(report.summary.manualInspectionRows, 0);
assert.equal(report.summary.selectorProposalEligibleRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'inspect_target_generation_before_retest');

const pending = report.rows.find((row) => row.carveoutClass === 'fresh_entry_pending');
assert.equal(pending?.performanceCarveoutEligible, true);
assert.equal(pending?.selectorProposalEligible, false);
assert.match(pending?.recommendedNextAction || '', /fresh completed 5M entry trigger/);

const invalidated = report.rows.find((row) => row.carveoutClass === 'stale_invalidated');
assert.equal(invalidated?.performanceCarveoutEligible, true);
assert.equal(invalidated?.blockReason, 'InvalidStopLocation');

const targetGap = report.rows.find((row) => row.carveoutClass === 'target_generation_gap');
assert.equal(targetGap?.performanceCarveoutEligible, false);
assert.equal(targetGap?.selectorProposalEligible, false);
assert.match(report.markdown, /Exclusion Carveout Miner/);

const missing = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport({
  blockerDrilldownPath: null,
  blockerDrilldown: null,
  levelPathDiagnosticPath: null,
  levelPathDiagnostic: null,
}, '2026-07-19T00:01:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing blocker drilldown path'));
assert.ok(missing.blockers.includes('missing level path diagnostic path'));

console.log('OpeningDrive keep-later-proof selector exclusion carveout miner verified.');
