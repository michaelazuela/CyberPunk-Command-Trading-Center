import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport,
} from './unified-positive-held-local-preview-valid-review-separator-diagnostic';
import type {
  UnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport,
} from './unified-positive-held-local-preview-valid-review-top-slate-outcome';

const authority = {
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
} as const;

const source: UnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport = {
  reportType: 'unified_positive_held_local_preview_valid_review_top_slate_outcome',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    installedScoreComparisonPath: 'installed.json',
    sourceProofTimingPath: 'timing.json',
  },
  summary: {
    installedScoreRows: 7,
    sourceProofTimingRows: 7,
    slates: 7,
    validReviewTopSlates: 7,
    winners: 3,
    losses: 3,
    unresolved: 1,
    blocked: 0,
    missingTiming: 0,
    grossResolvedOneMesPl: 150,
    canExecuteFalseRows: 7,
    livePromotionAllowedRows: 0,
    recommendation: 'mine_valid_review_winner_loss_separators',
  },
  modelOutcomes: [],
  rows: [
    {
      slateId: '2026-06-01|morning',
      ticketId: 'fast-tight-1',
      tradeDate: '2026-06-01',
      session: 'morning',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'LONG',
      installedScore: 90,
      outcomeBucket: 'winner_t1_t2',
      resolvedOneMesPl: 150,
      riskPoints: 5,
      proofToEntryMinutes: 1,
      entryHitTime: '2026-06-01T10:00:00.000Z',
      validSweepLead: false,
      canExecute: false,
      livePromotionAllowed: false,
    },
    {
      slateId: '2026-06-02|morning',
      ticketId: 'fast-tight-2',
      tradeDate: '2026-06-02',
      session: 'morning',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'LONG',
      installedScore: 89,
      outcomeBucket: 'winner_t1_t2',
      resolvedOneMesPl: 125,
      riskPoints: 6,
      proofToEntryMinutes: 2,
      entryHitTime: '2026-06-02T10:00:00.000Z',
      validSweepLead: false,
      canExecute: false,
      livePromotionAllowed: false,
    },
    {
      slateId: '2026-06-03|morning',
      ticketId: 'fast-tight-3',
      tradeDate: '2026-06-03',
      session: 'morning',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'SHORT',
      installedScore: 88,
      outcomeBucket: 'winner_t1_t2',
      resolvedOneMesPl: 100,
      riskPoints: 5,
      proofToEntryMinutes: 3,
      entryHitTime: '2026-06-03T10:00:00.000Z',
      validSweepLead: false,
      canExecute: false,
      livePromotionAllowed: false,
    },
    {
      slateId: '2026-06-04|lunch',
      ticketId: 'wide-stale-1',
      tradeDate: '2026-06-04',
      session: 'lunch',
      setupType: 'raidReclaim',
      direction: 'LONG',
      installedScore: 76,
      outcomeBucket: 'loss_stopped_before_t1',
      resolvedOneMesPl: -75,
      riskPoints: 18,
      proofToEntryMinutes: 22,
      entryHitTime: '2026-06-04T13:00:00.000Z',
      validSweepLead: false,
      canExecute: false,
      livePromotionAllowed: false,
    },
    {
      slateId: '2026-06-05|lunch',
      ticketId: 'wide-stale-2',
      tradeDate: '2026-06-05',
      session: 'lunch',
      setupType: 'raidReclaim',
      direction: 'LONG',
      installedScore: 75,
      outcomeBucket: 'loss_stopped_before_t1',
      resolvedOneMesPl: -80,
      riskPoints: 20,
      proofToEntryMinutes: 24,
      entryHitTime: '2026-06-05T13:00:00.000Z',
      validSweepLead: false,
      canExecute: false,
      livePromotionAllowed: false,
    },
    {
      slateId: '2026-06-06|lunch',
      ticketId: 'wide-stale-3',
      tradeDate: '2026-06-06',
      session: 'lunch',
      setupType: 'raidReclaim',
      direction: 'SHORT',
      installedScore: 74,
      outcomeBucket: 'loss_stopped_before_t1',
      resolvedOneMesPl: -70,
      riskPoints: 17,
      proofToEntryMinutes: 25,
      entryHitTime: '2026-06-06T13:00:00.000Z',
      validSweepLead: false,
      canExecute: false,
      livePromotionAllowed: false,
    },
    {
      slateId: '2026-06-07|lunch',
      ticketId: 'unresolved',
      tradeDate: '2026-06-07',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      installedScore: 73,
      outcomeBucket: 'unresolved',
      resolvedOneMesPl: null,
      riskPoints: 11,
      proofToEntryMinutes: null,
      entryHitTime: null,
      validSweepLead: false,
      canExecute: false,
      livePromotionAllowed: false,
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport({
  reportDir: 'reports',
  validReviewTopSlateOutcomePath: 'valid-review.json',
  validReviewTopSlateOutcomeReport: source,
}, '2026-07-18T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.evaluatedRows, 7);
assert.equal(report.summary.candidatePositiveSelectorBuckets > 0, true);
assert.equal(report.summary.candidateCautionFilterBuckets > 0, true);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.assumptions.outcomeUsedForEvaluationOnly, true);
assert.equal(report.assumptions.separatorFieldsArePreEntryOrModelMetadata, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.equal(report.authority.changesRiskRules, false);
assert.ok(report.topPositiveBuckets.some((row) => row.key === 'risk_tight_0_to_6'));
assert.ok(report.topCautionBuckets.some((row) => row.key === 'proof_stale_over_20'));

const blocked = buildUnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport({
  reportDir: 'reports',
  validReviewTopSlateOutcomePath: null,
  validReviewTopSlateOutcomeReport: null,
}, '2026-07-18T00:01:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'reject_valid_review_separator_diagnostic');
assert.ok(blocked.blockers.some((item) => item.includes('missing valid-review top-slate outcome path')));

console.log('unified positive held-local valid-review separator diagnostic verified.');
