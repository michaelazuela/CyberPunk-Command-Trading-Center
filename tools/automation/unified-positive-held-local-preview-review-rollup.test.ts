import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewReviewRollupReport,
} from './unified-positive-held-local-preview-review-rollup';
import type { UnifiedPositiveHeldLocalPreviewReviewChecklistReport } from './unified-positive-held-local-preview-review-checklist';
import type { UnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport } from './unified-positive-held-local-preview-note-ingest-validator';

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
  generatedAt: '2026-07-16T00:21:00.000Z',
  status: 'pass',
  authority,
  source: {
    bundlePath: 'bundle.json',
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
  },
  rows: [{
    ticketId: 'preview-ticket',
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
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const noteValidation: UnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport = {
  reportType: 'unified_positive_held_local_preview_note_ingest_validator',
  generatedAt: '2026-07-16T00:22:00.000Z',
  status: 'pass',
  authority,
  source: {
    editableTemplatePath: 'notes.editable.json',
  },
  summary: {
    rowsLoaded: 1,
    validRows: 1,
    reviewedRows: 0,
    unreviewedRows: 1,
    rejectedRows: 0,
  },
  rows: [{
    ticketId: 'preview-ticket',
    setupType: 'TurtleSoup',
    direction: 'LONG',
    suggestedDisposition: 'unreviewed',
    reviewerNotePresent: false,
    valid: true,
    findings: [],
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewReviewRollupReport({
  checklistPath: 'checklist.json',
  checklistReport: checklist,
  noteValidationPath: 'note-validation.json',
  noteValidationReport: noteValidation,
}, '2026-07-16T00:23:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_review_rollup');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.checklistRows, 1);
assert.equal(report.summary.validNoteRows, 1);
assert.equal(report.summary.reviewedRows, 0);
assert.equal(report.summary.unreviewedRows, 1);
assert.equal(report.summary.reviewOnlyRows, 1);
assert.equal(report.rows[0].livePromotionAllowed, false);
assert.match(report.rows[0].boundary, /No live promotion/);
assert.match(report.markdown, /local-only review rollup/);

const badNoteValidation = structuredClone(noteValidation);
badNoteValidation.rows[0].valid = false;
badNoteValidation.rows[0].findings = ['unsupported disposition promote_live'];
const badReport = buildUnifiedPositiveHeldLocalPreviewReviewRollupReport({
  checklistPath: 'checklist.json',
  checklistReport: checklist,
  noteValidationPath: 'note-validation.json',
  noteValidationReport: badNoteValidation,
}, '2026-07-16T00:24:00.000Z');

assert.equal(badReport.status, 'fail');
assert.ok(badReport.blockers.includes('preview-ticket note validation is not valid'));

const missingReport = buildUnifiedPositiveHeldLocalPreviewReviewRollupReport({
  checklistPath: null,
  checklistReport: null,
  noteValidationPath: null,
  noteValidationReport: null,
}, '2026-07-16T00:25:00.000Z');

assert.equal(missingReport.status, 'fail');
assert.ok(missingReport.blockers.includes('missing review checklist path'));
assert.ok(missingReport.blockers.includes('missing note validation path'));

console.log('unified positive held-local preview review rollup verified.');
