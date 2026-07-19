import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-dry-run-comparison';

const strictReplayPackage = {
  status: 'pass',
  rows: [
    {
      ticketId: '2026-06-10|morning|TurtleSoup|SHORT|prefer_replacement|snap-a',
      tradeDate: '2026-06-10',
      session: 'morning',
      setupType: 'TurtleSoup',
      direction: 'SHORT',
      entry: 7500,
      stop: 7510,
      t1: 7485,
      t2: 7480,
      riskPoints: 10,
      proofState: 'strict_missing_shadow:prefer_replacement',
      triageScore: 80,
      outcomeInputStatus: 'ready_for_read_only_outcome_replay',
      barsSource: 'scanner_decision_tape_completed_5m',
      barsAfterProof: 12,
    },
    {
      ticketId: '2026-06-10|morning|SweepMssFvgRetrace|LONG|keep_later_sweep_proof|snap-b',
      tradeDate: '2026-06-10',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      entry: 7502,
      stop: 7492,
      t1: 7517,
      t2: 7522,
      riskPoints: 10,
      proofState: 'strict_missing_shadow:keep_later_sweep_proof',
      triageScore: 70,
      outcomeInputStatus: 'ready_for_read_only_outcome_replay',
      barsSource: 'scanner_decision_tape_completed_5m',
      barsAfterProof: 10,
    },
    {
      ticketId: '2026-06-11|lunch|SweepMssFvgRetrace|SHORT|keep_later_sweep_proof|snap-c',
      tradeDate: '2026-06-11',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      entry: 7520,
      stop: 7530,
      t1: 7505,
      t2: 7500,
      riskPoints: 10,
      proofState: 'strict_missing_shadow:keep_later_sweep_proof',
      triageScore: 90,
      outcomeInputStatus: 'ready_for_read_only_outcome_replay',
      barsSource: 'scanner_decision_tape_completed_5m',
      barsAfterProof: 10,
    },
  ],
};

const outcome = {
  status: 'pass',
  rows: [
    {
      ticketId: '2026-06-10|morning|SweepMssFvgRetrace|LONG|keep_later_sweep_proof|snap-b',
      outcomeLabel: 't1_hit_only',
      resolvedOneMesPl: 75,
    },
    {
      ticketId: '2026-06-11|lunch|SweepMssFvgRetrace|SHORT|keep_later_sweep_proof|snap-c',
      outcomeLabel: 'no_fill',
      resolvedOneMesPl: null,
    },
  ],
};

const adjustedReadiness = {
  status: 'pass',
  summary: {
    recommendation: 'prepare_sweep_only_guarded_proposal',
    adjustedBlockedRowsExcluded: 0,
    blockedRowsExcluded: 0,
  },
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport({
  strictReplayPackagePath: 'strict.json',
  strictReplayPackage: strictReplayPackage as any,
  outcomePath: 'outcome.json',
  outcome: outcome as any,
  adjustedReadinessPath: 'adjusted.json',
  adjustedReadiness: adjustedReadiness as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_dry_run_comparison');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.strictReplayRows, 3);
assert.equal(report.summary.sweepScopeRows, 2);
assert.equal(report.summary.slates, 2);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.invalidProposedRows, 0);
assert.equal(report.summary.nonSweepChangedRows, 0);
assert.equal(report.summary.missingOutcomeRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'dry_run_supports_sweep_only_guarded_selector_research');
assert.equal(report.changedPnlByDaySessionModel[0].grossResolvedOneMesPl, 75);
assert.match(report.markdown, /Dry-Run Comparison/);

const badAdjusted = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport({
  strictReplayPackagePath: 'strict.json',
  strictReplayPackage: strictReplayPackage as any,
  outcomePath: 'outcome.json',
  outcome: outcome as any,
  adjustedReadinessPath: 'adjusted.json',
  adjustedReadiness: { status: 'pass', summary: { recommendation: 'continue_research_no_live_selector', blockedRowsExcluded: 1 } } as any,
}, '2026-07-19T00:01:00.000Z');

assert.equal(badAdjusted.status, 'fail');
assert.ok(badAdjusted.blockers.includes('adjusted readiness recommendation is continue_research_no_live_selector'));
assert.ok(badAdjusted.blockers.includes('1 blocked carveout rows remain'));

console.log('OpeningDrive keep-later-proof selector dry-run comparison verified.');
