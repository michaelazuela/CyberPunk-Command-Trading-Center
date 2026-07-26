import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport } from './unified-positive-held-local-preview-replay-package-outcome';

const outcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_outcome',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority: {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    changesDiscordPosting: false,
    changesAppRuntime: false,
  },
  source: {
    reportDir: 'reports',
    replayPackagePath: 'replay-package.json',
  },
  assumptions: {
    oneMesPointValue: 5,
    usesCompletedFiveMinuteBarsOnly: true,
    missingBarsAreNotInvented: true,
    sameBarStopAndTargetUsesConservativeStopFirst: true,
    outcomeIsResearchOnly: true,
    livePromotionAllowed: false,
  },
  summary: {
    packageRows: 3,
    resolvedRows: 2,
    unresolvedRows: 1,
    blockedRows: 0,
    noFillRows: 1,
    stoppedBeforeT1Rows: 1,
    t1OnlyRows: 0,
    t1AndT2Rows: 1,
    noTargetOrStopRows: 0,
    grossResolvedOneMesPl: -5,
    modelGroups: [],
    daySessionModelGroups: [],
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      ticketId: 'winner',
      tradeDate: '2026-06-16',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      proofTime: '2026-06-16T12:00:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      entry: 100,
      stop: 95,
      t1: 107.5,
      t2: 110,
      riskPoints: 5,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 5,
      barsAfterProof: 5,
      entryHitTime: '2026-06-16T12:10:00',
      firstReplayBarTime: '2026-06-16T12:15:00',
      stopHitTime: null,
      t1HitTime: '2026-06-16T12:20:00',
      t2HitTime: '2026-06-16T12:25:00',
      maximumFavorableExcursion: 12,
      maximumAdverseExcursion: 2,
      resolvedOneMesPl: 50,
      resolvedR: 2,
      intrabarAmbiguity: false,
      blockers: [],
    },
    {
      ticketId: 'loss',
      tradeDate: '2026-06-17',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      proofTime: '2026-06-17T09:30:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 'stopped_before_t1',
      entry: 200,
      stop: 205,
      t1: 192.5,
      t2: 190,
      riskPoints: 5,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 6,
      barsAfterProof: 6,
      entryHitTime: '2026-06-17T10:10:00',
      firstReplayBarTime: '2026-06-17T10:15:00',
      stopHitTime: '2026-06-17T10:20:00',
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: 4,
      maximumAdverseExcursion: 6,
      resolvedOneMesPl: -25,
      resolvedR: -1,
      intrabarAmbiguity: false,
      blockers: [],
    },
    {
      ticketId: 'unresolved',
      tradeDate: '2026-06-18',
      session: 'lunch',
      setupType: 'historicalReview',
      direction: 'LONG',
      proofTime: '2026-06-18T12:00:00',
      outcomeStatus: 'unresolved',
      outcomeLabel: 'no_fill',
      entry: 100,
      stop: 96,
      t1: 106,
      t2: 108,
      riskPoints: 4,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 4,
      barsAfterProof: 4,
      entryHitTime: null,
      firstReplayBarTime: null,
      stopHitTime: null,
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: null,
      maximumAdverseExcursion: null,
      resolvedOneMesPl: null,
      resolvedR: null,
      intrabarAmbiguity: false,
      blockers: [],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport({
  reportDir: 'reports',
  replayPackageOutcomePath: 'outcome.json',
  replayPackageOutcomeReport: outcomeReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_replay_package_source_proof_timing');
assert.equal(report.status, 'pass');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.evaluatedRows, 3);
assert.equal(report.summary.winners, 1);
assert.equal(report.summary.losses, 1);
assert.equal(report.summary.unresolved, 1);
assert.equal(report.summary.blocked, 0);
assert.equal(report.summary.grossResolvedOneMesPl, 25);
assert.equal(report.summary.positiveModelGroups, 1);
assert.equal(report.summary.negativeModelGroups, 0);
assert.equal(report.summary.unresolvedModelGroups, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const winner = report.rows.find((row) => row.ticketId === 'winner');
assert.equal(winner?.outcomeBucket, 'winner_t1_t2');
assert.equal(winner?.proofToEntryMinutes, 10);
assert.equal(winner?.mfeR, 2.4);
assert.equal(winner?.maeR, 0.4);
assert.ok(winner?.issueTags.includes('full_delivery'));

const loss = report.rows.find((row) => row.ticketId === 'loss');
assert.equal(loss?.outcomeBucket, 'loss_stopped_before_t1');
assert.equal(loss?.proofToEntryMinutes, 40);
assert.ok(loss?.issueTags.includes('stale_entry_over_30m'));
assert.ok(loss?.issueTags.includes('adverse_excursion_at_or_over_1r'));

const intraday = report.modelTiming.find((row) => row.setupType === 'NoInstalledSetup');
assert.equal(intraday?.losses, 1);
assert.equal(intraday?.staleEntryOver30MinuteLosses, 1);
assert.match(intraday?.recommendation || '', /Keep in research/);
assert.match(report.markdown, /Model Timing/);

const blockedOutcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport = {
  ...outcomeReport,
  status: 'fail',
  summary: {
    ...outcomeReport.summary,
    packageRows: 4,
    blockedRows: 1,
  },
  rows: [
    ...outcomeReport.rows,
    {
      ticketId: 'invalid-stop',
      tradeDate: '2026-06-19',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      proofTime: '2026-06-19T09:30:00',
      outcomeStatus: 'blocked',
      outcomeLabel: 'blocked',
      entry: 100,
      stop: 104,
      t1: 106,
      t2: 108,
      riskPoints: 4,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 6,
      barsAfterProof: 6,
      entryHitTime: null,
      firstReplayBarTime: null,
      stopHitTime: null,
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: null,
      maximumAdverseExcursion: null,
      resolvedOneMesPl: null,
      resolvedR: null,
      intrabarAmbiguity: false,
      blockers: ['directionally invalid entry-to-stop geometry'],
    },
  ],
  blockers: ['replay package status fail', 'invalid-stop: directionally invalid entry-to-stop geometry'],
};

const blockedReport = buildUnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport({
  reportDir: 'reports',
  replayPackageOutcomePath: 'blocked-outcome.json',
  replayPackageOutcomeReport: blockedOutcomeReport,
}, '2026-07-17T00:01:30.000Z');

assert.equal(blockedReport.status, 'pass');
assert.equal(blockedReport.summary.evaluatedRows, 4);
assert.equal(blockedReport.summary.blocked, 1);
assert.equal(blockedReport.summary.grossResolvedOneMesPl, 25);
assert.equal(blockedReport.rows.find((row) => row.ticketId === 'invalid-stop')?.outcomeBucket, 'blocked');
assert.match(blockedReport.recommendations.join(' '), /blocked rows as data-quality rows/);

const missing = buildUnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport({
  reportDir: 'reports',
  replayPackageOutcomePath: null,
  replayPackageOutcomeReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing replay package outcome path'));
assert.ok(missing.blockers.includes('no outcome rows evaluated'));

console.log('unified positive held-local replay package source/proof timing verified.');
