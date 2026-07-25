import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-readiness-summary';

const outcome = {
  reportType: 'unified_positive_held_local_preview_replay_package_outcome',
  status: 'pass',
  summary: {
    packageRows: 7,
    resolvedRows: 5,
    unresolvedRows: 2,
    grossResolvedOneMesPl: 276.25,
    modelGroups: [
      {
        setupType: 'SweepMssFvgRetrace',
        rows: 4,
        resolvedRows: 4,
        unresolvedRows: 0,
        blockedRows: 0,
        grossResolvedOneMesPl: 318.75,
      },
      {
        setupType: 'raidReclaim',
        rows: 3,
        resolvedRows: 1,
        unresolvedRows: 2,
        blockedRows: 0,
        grossResolvedOneMesPl: -42.5,
      },
    ],
  },
};

const blockerDrilldown = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_strict_blocker_drilldown',
  status: 'pass',
  summary: {
    blockedRows: 3,
  },
  rows: [
    { setupType: 'raidReclaim' },
    { setupType: 'SweepMssFvgRetrace' },
    { setupType: 'SweepMssFvgRetrace' },
  ],
};

const levelPathDiagnostic = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_level_generation_path_diagnostic',
  status: 'pass',
  summary: {
    waitingForEntryTriggerRows: 2,
    invalidatedWithoutReplayableEntryRows: 1,
  },
  rows: [
    { setupType: 'raidReclaim', pathState: 'waiting_for_entry_trigger' },
    { setupType: 'SweepMssFvgRetrace', pathState: 'waiting_for_entry_trigger' },
    { setupType: 'SweepMssFvgRetrace', pathState: 'invalidated_without_replayable_entry' },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport({
  outcomePath: 'outcome.json',
  outcome: outcome as any,
  blockerDrilldownPath: 'blocker.json',
  blockerDrilldown: blockerDrilldown as any,
  levelPathDiagnosticPath: 'path.json',
  levelPathDiagnostic: levelPathDiagnostic as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_readiness_summary');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.strictReadyReplayRows, 7);
assert.equal(report.summary.strictReadyGrossOneMesPl, 276.25);
assert.equal(report.summary.blockedRowsExcluded, 3);
assert.equal(report.summary.waitingForEntryTriggerRows, 2);
assert.equal(report.summary.invalidatedRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'continue_research_no_live_selector');

const sweep = report.modelRows.find((row) => row.setupType === 'SweepMssFvgRetrace');
const turtle = report.modelRows.find((row) => row.setupType === 'raidReclaim');
assert.equal(sweep?.evidenceState, 'positive_strict_ready_subset');
assert.equal(sweep?.grossResolvedOneMesPl, 318.75);
assert.equal(sweep?.blockedRows, 2);
assert.equal(turtle?.evidenceState, 'weak_or_mixed_subset');
assert.equal(turtle?.grossResolvedOneMesPl, -42.5);
assert.equal(turtle?.blockedRows, 1);
assert.match(report.conclusions.join('\n'), /not removal proof/);
assert.match(report.markdown, /Selector Readiness Summary/);

const missing = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport({
  outcomePath: null,
  outcome: null,
  blockerDrilldownPath: null,
  blockerDrilldown: null,
  levelPathDiagnosticPath: null,
  levelPathDiagnostic: null,
}, '2026-07-19T00:01:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing outcome path'));

console.log('OpeningDrive keep-later-proof selector readiness summary verified.');
