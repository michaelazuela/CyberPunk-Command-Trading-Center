import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewAutoReviewSeedReport,
} from './unified-positive-held-local-preview-auto-review-seed';
import type { UnifiedPositiveHeldLocalPreviewReviewChecklistReport } from './unified-positive-held-local-preview-review-checklist';

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

const checklist: UnifiedPositiveHeldLocalPreviewReviewChecklistReport = {
  reportType: 'unified_positive_held_local_preview_review_checklist',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    bundlePath: 'bundle.json',
    previewPayloadPath: 'payload.json',
    readinessAuditPath: 'readiness.json',
    readinessScreenshotPath: 'readiness.png',
  },
  summary: {
    bundleItems: 1,
    visibleRows: 1,
    reviewOnlyRows: 1,
    canExecuteFalseRows: 1,
    postableFalseRows: 1,
    publishDiscordFalseRows: 1,
    writesSupabaseFalseRows: 1,
    systemReviewNoteRows: 0,
  },
  rows: [{
    ticketId: 'eligible-ticket',
    setupType: 'raidReclaim',
    direction: 'LONG',
    visibleInHiddenTab: true,
    reviewOnly: true,
    canExecute: false,
    postable: false,
    publishDiscord: false,
    shouldPost: false,
    shouldDispatch: false,
    writesSupabase: false,
    reviewOnlyReasons: ['canExecute remains false.'],
    systemReviewNotes: [],
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const editableTemplate = {
  rows: [{
    ticketId: 'eligible-ticket',
    setupType: 'raidReclaim',
    direction: 'LONG',
    visibleInHiddenTab: true,
    reviewOnly: true,
    systemReviewNotes: [],
    reviewerNote: '',
    suggestedDisposition: 'unreviewed',
    allowedDispositions: [
      'keep_review_only',
      'needs_more_chart_evidence',
      'reject_preview',
      'candidate_for_later_research',
    ],
    boundaryReminder: 'Local note only. Does not approve execution, change canExecute, post Discord, write Supabase, or change scanner behavior.',
  }],
};

const { report, editableRows } = buildUnifiedPositiveHeldLocalPreviewAutoReviewSeedReport({
  checklistPath: 'checklist.json',
  checklistReport: checklist,
  editableTemplatePath: 'notes.editable.json',
  editableTemplate,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_auto_review_seed');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.autoReviewedRows, 1);
assert.equal(report.summary.candidateForLaterResearchRows, 1);
assert.equal(editableRows[0].suggestedDisposition, 'candidate_for_later_research');
assert.match(editableRows[0].reviewerNote, /read-only replay research/);
assert.match(report.markdown, /local-only auto review seed/);

const blockedChecklist = structuredClone(checklist);
blockedChecklist.rows[0].visibleInHiddenTab = false;
blockedChecklist.summary.visibleRows = 0;
const blocked = buildUnifiedPositiveHeldLocalPreviewAutoReviewSeedReport({
  checklistPath: 'checklist.json',
  checklistReport: blockedChecklist,
  editableTemplatePath: 'notes.editable.json',
  editableTemplate,
}, '2026-07-17T00:02:00.000Z');

assert.equal(blocked.report.status, 'pass');
assert.equal(blocked.report.summary.candidateForLaterResearchRows, 0);
assert.equal(blocked.report.summary.needsMoreChartEvidenceRows, 1);
assert.equal(blocked.editableRows[0].suggestedDisposition, 'needs_more_chart_evidence');

const missing = buildUnifiedPositiveHeldLocalPreviewAutoReviewSeedReport({
  checklistPath: null,
  checklistReport: null,
  editableTemplatePath: null,
  editableTemplate: null,
}, '2026-07-17T00:03:00.000Z');

assert.equal(missing.report.status, 'fail');
assert.ok(missing.report.blockers.includes('missing review checklist path'));
assert.ok(missing.report.blockers.includes('missing editable template path'));

console.log('unified positive held-local preview auto review seed verified.');
