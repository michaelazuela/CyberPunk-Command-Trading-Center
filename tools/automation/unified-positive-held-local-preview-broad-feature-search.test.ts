import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewBroadFeatureSearchReport,
} from './unified-positive-held-local-preview-broad-feature-search';
import type {
  UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport,
} from './unified-positive-held-local-preview-broad-risk-cap-validation';

const broadRiskCapValidationReport: UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport = {
  reportType: 'unified_positive_held_local_preview_broad_risk_cap_validation',
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
    reportDir: 'diagnostic-reports',
    intakeTriagePath: 'triage.json',
    auditDir: 'discord-audit',
  },
  assumptions: {
    usesCompletedFiveMinuteBarsOnly: true,
    usesIntakeTriageRowsOnly: true,
    missingBarsAreNotInvented: true,
    capsAreResearchOnly: true,
    livePromotionAllowed: false,
  },
  summary: {
    evaluatedTargetRows: 7,
    replayedRows: 7,
    blockedRows: 0,
    winners: 3,
    losses: 3,
    unresolved: 1,
    grossResolvedOneMesPl: 180,
    candidateCapRows: 0,
    livePromotionAllowedRows: 0,
  },
  capRows: [],
  rows: [
    {
      rowId: 'morning-win-1',
      tradeDate: '2026-06-17',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      triageDecision: 'held_for_later_batch',
      riskPoints: 6,
      outcomeBucket: 'winner',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 100,
      entryHitTime: '2026-06-17T09:30:00',
      blockers: [],
    },
    {
      rowId: 'morning-win-2',
      tradeDate: '2026-06-18',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      triageDecision: 'held_for_later_batch',
      riskPoints: 8,
      outcomeBucket: 'winner',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 100,
      entryHitTime: '2026-06-18T09:30:00',
      blockers: [],
    },
    {
      rowId: 'morning-win-3',
      tradeDate: '2026-06-19',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      triageDecision: 'held_for_later_batch',
      riskPoints: 9,
      outcomeBucket: 'winner',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 100,
      entryHitTime: '2026-06-19T09:30:00',
      blockers: [],
    },
    {
      rowId: 'morning-loss',
      tradeDate: '2026-06-20',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      triageDecision: 'held_for_later_batch',
      riskPoints: 12,
      outcomeBucket: 'loss',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -20,
      entryHitTime: '2026-06-20T09:30:00',
      blockers: [],
    },
    {
      rowId: 'lunch-loss-1',
      tradeDate: '2026-06-21',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      triageDecision: 'held_for_later_batch',
      riskPoints: 6,
      outcomeBucket: 'loss',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -50,
      entryHitTime: '2026-06-21T12:30:00',
      blockers: [],
    },
    {
      rowId: 'lunch-loss-2',
      tradeDate: '2026-06-22',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      triageDecision: 'held_for_later_batch',
      riskPoints: 7,
      outcomeBucket: 'loss',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -50,
      entryHitTime: '2026-06-22T12:30:00',
      blockers: [],
    },
    {
      rowId: 'lunch-unresolved',
      tradeDate: '2026-06-23',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      triageDecision: 'held_for_later_batch',
      riskPoints: 15,
      outcomeBucket: 'unresolved',
      outcomeLabel: 'no_fill',
      resolvedOneMesPl: null,
      entryHitTime: null,
      blockers: [],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewBroadFeatureSearchReport({
  reportDir: 'diagnostic-reports',
  broadRiskCapValidationPath: 'broad-risk-cap-validation.json',
  broadRiskCapValidationReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_broad_feature_search');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.sourceRows, 7);
assert.equal(report.summary.acceptedCandidates, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const top = report.candidates[0];
assert.equal(top.featureId, 'NoInstalledSetup_session_morning');
assert.equal(top.decision, 'candidate_for_more_research');
assert.equal(top.keptWinners, 3);
assert.equal(top.keptLosses, 1);
assert.equal(top.rejectedWinners, 0);
assert.equal(top.rejectedLosses, 2);
assert.equal(top.falseRejectWinnerRows, 0);
assert.equal(top.keptOneMesPl, 280);
assert.match(report.markdown, /Broad Feature Search/);

const missing = buildUnifiedPositiveHeldLocalPreviewBroadFeatureSearchReport({
  reportDir: 'diagnostic-reports',
  broadRiskCapValidationPath: null,
  broadRiskCapValidationReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing broad risk-cap validation path'));
assert.ok(missing.blockers.includes('missing broad risk-cap validation report'));

console.log('unified positive held-local broad feature search verified.');
