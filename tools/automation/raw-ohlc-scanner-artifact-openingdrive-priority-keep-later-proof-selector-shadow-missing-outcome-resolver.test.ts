import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-outcome-resolver';

const missingReplayPackage = {
  status: 'pass',
  rows: [
    {
      packagePriority: 1,
      replayQueueKey: '2026-06-23|evening|SweepMssFvgRetrace|LONG|keep_later_sweep_proof',
      tradeDate: '2026-06-23',
      sessionType: 'evening',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      selectorDecision: 'keep_later_sweep_proof',
      shadowRows: 41,
      wouldChangePrimaryRows: 29,
    },
    {
      packagePriority: 2,
      replayQueueKey: '2026-06-23|evening|raidReclaim|SHORT|prefer_replacement',
      tradeDate: '2026-06-23',
      sessionType: 'evening',
      setupType: 'raidReclaim',
      direction: 'SHORT',
      selectorDecision: 'prefer_replacement',
      shadowRows: 37,
      wouldChangePrimaryRows: 0,
    },
    {
      packagePriority: 3,
      replayQueueKey: '2026-06-24|morning|raidReclaim|SHORT|prefer_replacement',
      tradeDate: '2026-06-24',
      sessionType: 'morning',
      setupType: 'raidReclaim',
      direction: 'SHORT',
      selectorDecision: 'prefer_replacement',
      shadowRows: 16,
      wouldChangePrimaryRows: 16,
    },
  ],
};

const outcomeRecords = [
  {
    tradeDate: '2026-06-23',
    sessionType: 'lunch',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG',
    outcome: 't1_and_t2_hit',
    oneMesGross: 100,
    sourcePath: 'outcome.json',
  },
  {
    tradeDate: '2026-06-24',
    sessionType: 'morning',
    setupType: 'raidReclaim',
    direction: 'SHORT',
    outcome: 'stopped_before_t1',
    oneMesGross: -50,
    sourcePath: 'outcome.json',
  },
];

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverReport({
  missingReplayPackagePath: 'package.json',
  missingReplayPackage: missingReplayPackage as any,
  outcomeJsonPaths: [process.argv[1]],
  outcomeRecords,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_outcome_resolver');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.packageRows, 3);
assert.equal(report.summary.outcomeRecordsLoaded, 2);
assert.equal(report.summary.resolvedStrictRows, 1);
assert.equal(report.summary.weakAdjacentOnlyRows, 1);
assert.equal(report.summary.unresolvedRows, 1);
assert.equal(report.summary.strictMatchedShadowRows, 16);
assert.equal(report.summary.stillUnresolvedShadowRows, 78);
assert.equal(report.summary.strictGrossOneMesPl, -50);
assert.equal(report.summary.weakAdjacentGrossOneMesPl, 100);
assert.equal(report.summary.recommendation, 'run_actual_missing_session_replay');

const weak = report.rows.find((row) => row.replayQueueKey.includes('SweepMssFvgRetrace'));
const strict = report.rows.find((row) => row.replayQueueKey === '2026-06-24|morning|raidReclaim|SHORT|prefer_replacement');
const missing = report.rows.find((row) => row.replayQueueKey === '2026-06-23|evening|raidReclaim|SHORT|prefer_replacement');

assert.equal(weak?.resolutionStatus, 'weak_adjacent_evidence_only');
assert.equal(strict?.resolutionStatus, 'resolved_strict');
assert.equal(missing?.resolutionStatus, 'unresolved_missing_outcome');
assert.match(report.markdown, /OpeningDrive Keep-Later-Proof Selector Shadow Missing Outcome Resolver/);

console.log('OpeningDrive keep-later-proof selector shadow missing outcome resolver verified.');
