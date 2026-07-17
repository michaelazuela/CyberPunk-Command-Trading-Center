import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewNoteTemplateReport,
} from './unified-positive-held-local-preview-note-template';
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
  generatedAt: '2026-07-16T00:13:00.000Z',
  status: 'pass',
  authority,
  source: {
    bundlePath: 'bundle.json',
    previewPayloadPath: 'payload.json',
    readinessAuditPath: 'readiness.json',
    readinessScreenshotPath: 'screenshot.png',
  },
  summary: {
    bundleItems: 1,
    visibleRows: 1,
    reviewOnlyRows: 1,
    canExecuteFalseRows: 1,
    postableFalseRows: 1,
    publishDiscordFalseRows: 1,
    writesSupabaseFalseRows: 1,
    systemReviewNoteRows: 1,
  },
  rows: [{
    ticketId: '2026-06-16-morning-TurtleSoup-LONG',
    setupType: 'TurtleSoup',
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
    systemReviewNotes: ['TurtleSoup long remains review-only: this cluster lacks full plan-level proof.'],
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewNoteTemplateReport({
  checklistPath: 'checklist.json',
  checklistReport: checklist,
}, '2026-07-16T00:14:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_note_template');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.checklistRows, 1);
assert.equal(report.summary.noteRows, 1);
assert.equal(report.summary.unreviewedRows, 1);
assert.equal(report.summary.reviewOnlyRows, 1);
assert.deepEqual(report.rows[0].systemReviewNotes, ['TurtleSoup long remains review-only: this cluster lacks full plan-level proof.']);
assert.equal(report.rows[0].reviewerNote, '');
assert.equal(report.rows[0].suggestedDisposition, 'unreviewed');
assert.ok(report.rows[0].allowedDispositions.includes('candidate_for_later_research'));
assert.match(report.rows[0].boundaryReminder, /Does not approve execution/);
assert.match(report.markdown, /local-only note template/);
assert.match(report.markdown, /lacks full plan-level proof/);

const failedChecklist = structuredClone(checklist);
failedChecklist.status = 'fail';
const failedReport = buildUnifiedPositiveHeldLocalPreviewNoteTemplateReport({
  checklistPath: 'checklist.json',
  checklistReport: failedChecklist,
}, '2026-07-16T00:15:00.000Z');

assert.equal(failedReport.status, 'fail');
assert.ok(failedReport.blockers.includes('review checklist status fail'));

const missingReport = buildUnifiedPositiveHeldLocalPreviewNoteTemplateReport({
  checklistPath: null,
  checklistReport: null,
}, '2026-07-16T00:16:00.000Z');

assert.equal(missingReport.status, 'fail');
assert.ok(missingReport.blockers.includes('missing review checklist path'));
assert.ok(missingReport.blockers.includes('missing review checklist report'));

console.log('unified positive held-local preview note template verified.');
