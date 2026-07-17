import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewDecisionSummaryReport,
} from './unified-positive-held-local-preview-decision-summary';
import type { UnifiedPositiveHeldLocalPreviewReviewRollupReport } from './unified-positive-held-local-preview-review-rollup';

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

const rollup: UnifiedPositiveHeldLocalPreviewReviewRollupReport = {
  reportType: 'unified_positive_held_local_preview_review_rollup',
  generatedAt: '2026-07-16T00:30:00.000Z',
  status: 'pass',
  authority,
  source: {
    checklistPath: 'checklist.json',
    noteValidationPath: 'note-validation.json',
  },
  summary: {
    checklistRows: 5,
    validNoteRows: 5,
    reviewedRows: 4,
    unreviewedRows: 1,
    reviewOnlyRows: 5,
    candidateForLaterResearchRows: 1,
    rejectedRows: 1,
  },
  rows: [
    {
      ticketId: 'unreviewed-ticket',
      setupType: 'TurtleSoup',
      direction: 'LONG',
      visibleInHiddenTab: true,
      noteDisposition: 'unreviewed',
      noteValid: true,
      reviewOnly: true,
      livePromotionAllowed: false,
      boundary: 'Research summary only.',
    },
    {
      ticketId: 'keep-ticket',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      visibleInHiddenTab: true,
      noteDisposition: 'keep_review_only',
      noteValid: true,
      reviewOnly: true,
      livePromotionAllowed: false,
      boundary: 'Research summary only.',
    },
    {
      ticketId: 'evidence-ticket',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'SHORT',
      visibleInHiddenTab: true,
      noteDisposition: 'needs_more_chart_evidence',
      noteValid: true,
      reviewOnly: true,
      livePromotionAllowed: false,
      boundary: 'Research summary only.',
    },
    {
      ticketId: 'reject-ticket',
      setupType: 'IntradayMssMicroContinuation',
      direction: 'LONG',
      visibleInHiddenTab: true,
      noteDisposition: 'reject_preview',
      noteValid: true,
      reviewOnly: true,
      livePromotionAllowed: false,
      boundary: 'Research summary only.',
    },
    {
      ticketId: 'research-ticket',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      visibleInHiddenTab: true,
      noteDisposition: 'candidate_for_later_research',
      noteValid: true,
      reviewOnly: true,
      livePromotionAllowed: false,
      boundary: 'Research summary only.',
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewDecisionSummaryReport({
  rollupPath: 'rollup.json',
  rollupReport: rollup,
}, '2026-07-16T00:31:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_decision_summary');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.rollupRows, 5);
assert.equal(report.summary.holdForManualReviewRows, 1);
assert.equal(report.summary.keepLocalReviewOnlyRows, 1);
assert.equal(report.summary.requestMoreChartEvidenceRows, 1);
assert.equal(report.summary.excludedFromResearchQueueRows, 1);
assert.equal(report.summary.queuedForReplayResearchRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rows.find((row) => row.ticketId === 'unreviewed-ticket')?.decisionAction, 'hold_for_manual_review');
assert.equal(report.rows.find((row) => row.ticketId === 'keep-ticket')?.decisionAction, 'keep_local_review_only');
assert.equal(report.rows.find((row) => row.ticketId === 'evidence-ticket')?.decisionAction, 'request_more_chart_evidence');
assert.equal(report.rows.find((row) => row.ticketId === 'reject-ticket')?.decisionAction, 'exclude_from_research_queue');
assert.equal(report.rows.find((row) => row.ticketId === 'research-ticket')?.decisionAction, 'queue_for_replay_research');
assert.match(report.rows.find((row) => row.ticketId === 'research-ticket')?.nextStep || '', /read-only replay research/);
assert.match(report.markdown, /local-only decision summary/);

const badRollup = structuredClone(rollup);
badRollup.status = 'fail';
badRollup.rows[0].noteValid = false;
const badReport = buildUnifiedPositiveHeldLocalPreviewDecisionSummaryReport({
  rollupPath: 'bad-rollup.json',
  rollupReport: badRollup,
}, '2026-07-16T00:32:00.000Z');

assert.equal(badReport.status, 'fail');
assert.ok(badReport.blockers.includes('review rollup status fail'));
assert.ok(badReport.blockers.includes('unreviewed-ticket rollup note validation is not true'));

const missingReport = buildUnifiedPositiveHeldLocalPreviewDecisionSummaryReport({
  rollupPath: null,
  rollupReport: null,
}, '2026-07-16T00:33:00.000Z');

assert.equal(missingReport.status, 'fail');
assert.ok(missingReport.blockers.includes('missing review rollup path'));
assert.ok(missingReport.blockers.includes('missing review rollup report'));

console.log('unified positive held-local preview decision summary verified.');
