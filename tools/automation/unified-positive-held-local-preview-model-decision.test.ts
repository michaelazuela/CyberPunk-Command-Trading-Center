import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewModelDecisionReport,
} from './unified-positive-held-local-preview-model-decision';
import type { UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport } from './unified-positive-held-local-preview-ohlc-outcome';

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

const formalReplay = {
  reportType: 'formal_replay_research',
  gapAnalysis: {
    bySetup: {
      raidReclaim: { count: 7, grossOneMes: -217.5 },
      SweepMssFvgRetrace: { count: 2, grossOneMes: -232.5 },
    },
  },
};

const ohlcOutcome: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport = {
  reportType: 'unified_positive_held_local_preview_ohlc_outcome',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    replayQueuePath: 'queue.json',
    heldLocalAdapterPath: 'adapter.json',
    marketBarsJsonPath: 'market-bars.json',
    auditDir: 'audit',
  },
  assumptions: {
    oneMesPointValue: 5,
    usesCompletedFiveMinuteBarsOnly: true,
    missingBarsAreNotInvented: true,
    sameBarStopAndTargetUsesConservativeStopFirst: true,
    outcomeIsResearchOnly: true,
  },
  summary: {
    queuedRows: 4,
    resolvedRows: 4,
    unresolvedRows: 0,
    blockedRows: 0,
    grossResolvedOneMesPl: 505,
    raidReclaimResolvedOneMesPl: 193.75,
    sweepMssFvgRetraceResolvedOneMesPl: 311.25,
    livePromotionAllowedRows: 0,
  },
  rows: [
    { setupType: 'raidReclaim', resolvedOneMesPl: 43.75 },
    { setupType: 'raidReclaim', resolvedOneMesPl: 65 },
    { setupType: 'raidReclaim', resolvedOneMesPl: 85 },
    { setupType: 'SweepMssFvgRetrace', resolvedOneMesPl: 311.25 },
  ] as UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport['rows'],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewModelDecisionReport({
  formalReplayPath: 'formal.json',
  formalReplayReport: formalReplay,
  ohlcOutcomePath: 'outcome.json',
  ohlcOutcomeReport: ohlcOutcome,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_model_decision');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.modelsReviewed, 2);
assert.equal(report.summary.removeModelRecommendations, 0);
assert.equal(report.summary.candidateFilterResearchRecommendations, 2);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.ok(report.rows.every((row) => row.removeModel === false));
assert.ok(report.rows.every((row) => row.broadenLiveBehavior === false));
assert.ok(report.rows.every((row) => row.changeCanExecute === false));
assert.equal(report.rows.find((row) => row.setupType === 'raidReclaim')?.priorNonStrict.grossOneMes, -217.5);
assert.equal(report.rows.find((row) => row.setupType === 'raidReclaim')?.reviewedHeldLocal.grossOneMes, 193.75);
assert.equal(report.rows.find((row) => row.setupType === 'SweepMssFvgRetrace')?.reviewedHeldLocal.grossOneMes, 311.25);
assert.match(report.markdown, /does not post Discord/);

const missing = buildUnifiedPositiveHeldLocalPreviewModelDecisionReport({
  formalReplayPath: null,
  formalReplayReport: null,
  ohlcOutcomePath: null,
  ohlcOutcomeReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing formal replay path'));
assert.ok(missing.blockers.includes('missing OHLC outcome report'));

console.log('unified positive held-local preview model decision verified.');
