import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-separator-miner';

const outcomeJoin = {
  status: 'pass',
  summary: {
    joinedGroups: 3,
    unmatchedGroups: 4,
  },
  rows: [
    {
      tradeDate: '2026-06-11',
      sessionType: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      selectorDecision: 'keep_later_sweep_proof',
      shadowRows: 2,
      outcomeEvidenceCount: 10,
      wins: 10,
      losses: 0,
      noFillsOrUnresolved: 0,
      grossOneMesPl: 300,
      outcomeClassification: 'positive',
    },
    {
      tradeDate: '2026-06-12',
      sessionType: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      selectorDecision: 'keep_later_sweep_proof',
      shadowRows: 3,
      outcomeEvidenceCount: 11,
      wins: 11,
      losses: 0,
      noFillsOrUnresolved: 0,
      grossOneMesPl: 330,
      outcomeClassification: 'positive',
    },
    {
      tradeDate: '2026-06-13',
      sessionType: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      selectorDecision: 'keep_later_sweep_proof',
      shadowRows: 1,
      outcomeEvidenceCount: 12,
      wins: 12,
      losses: 0,
      noFillsOrUnresolved: 0,
      grossOneMesPl: 360,
      outcomeClassification: 'positive',
    },
    {
      tradeDate: '2026-06-14',
      sessionType: 'lunch',
      setupType: 'raidReclaim',
      direction: 'SHORT',
      selectorDecision: 'prefer_replacement',
      shadowRows: 1,
      outcomeEvidenceCount: 0,
      wins: 0,
      losses: 0,
      noFillsOrUnresolved: 0,
      grossOneMesPl: 0,
      outcomeClassification: 'no_evidence',
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorMinerReport({
  outcomeJoinPath: 'join.json',
  outcomeJoin: outcomeJoin as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_separator_miner');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.joinedRowsStudied, 3);
assert.equal(report.summary.noEvidenceRowsExcluded, 1);
assert.equal(report.summary.positiveSeparatorCandidates > 0, true);
assert.equal(report.summary.grossStudiedOneMesPl, 990);
assert.equal(report.summary.recommendation, 'expand_outcome_coverage_before_live_proposal');

const setupSelectorBucket = report.buckets.find((bucket) =>
  bucket.dimension === 'setupType|selectorDecision' &&
  bucket.value === 'SweepMssFvgRetrace|keep_later_sweep_proof'
);

assert.equal(setupSelectorBucket?.recommendation, 'candidate_positive_separator');
assert.equal(setupSelectorBucket?.outcomeEvidenceCount, 33);
assert.match(report.markdown, /OpeningDrive Keep-Later-Proof Selector Shadow Separator Miner/);

console.log('OpeningDrive keep-later-proof selector shadow separator miner verified.');
