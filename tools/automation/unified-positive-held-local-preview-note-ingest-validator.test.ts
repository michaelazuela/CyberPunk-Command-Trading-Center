import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport,
} from './unified-positive-held-local-preview-note-ingest-validator';

const validEditableTemplate = {
  rows: [{
    ticketId: '2026-06-16-morning-TurtleSoup-LONG',
    setupType: 'TurtleSoup',
    direction: 'LONG',
    visibleInHiddenTab: true,
    reviewOnly: true,
    reviewerNote: '',
    suggestedDisposition: 'unreviewed',
    allowedDispositions: ['keep_review_only', 'needs_more_chart_evidence', 'reject_preview', 'candidate_for_later_research'],
    boundaryReminder: 'Local note only. Does not approve execution, change canExecute, post Discord, write Supabase, or change scanner behavior.',
  }],
};

const passReport = buildUnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport({
  editableTemplatePath: 'notes.editable.json',
  editableTemplate: validEditableTemplate,
}, '2026-07-16T00:17:00.000Z');

assert.equal(passReport.reportType, 'unified_positive_held_local_preview_note_ingest_validator');
assert.equal(passReport.status, 'pass');
assert.equal(passReport.authority.localOnly, true);
assert.equal(passReport.authority.postsDiscord, false);
assert.equal(passReport.authority.writesSupabase, false);
assert.equal(passReport.authority.readsLiveBridge, false);
assert.equal(passReport.authority.runsSetupScanner, false);
assert.equal(passReport.authority.changesTradingLogic, false);
assert.equal(passReport.authority.changesCanExecute, false);
assert.equal(passReport.summary.rowsLoaded, 1);
assert.equal(passReport.summary.validRows, 1);
assert.equal(passReport.summary.reviewedRows, 0);
assert.equal(passReport.summary.unreviewedRows, 1);
assert.equal(passReport.summary.rejectedRows, 0);
assert.equal(passReport.rows[0].valid, true);
assert.match(passReport.markdown, /local-only note validator/);

const reviewedTemplate = structuredClone(validEditableTemplate);
reviewedTemplate.rows[0].suggestedDisposition = 'candidate_for_later_research';
reviewedTemplate.rows[0].reviewerNote = 'Worth later research only after broader replay evidence.';
const reviewedReport = buildUnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport({
  editableTemplatePath: 'notes.editable.json',
  editableTemplate: reviewedTemplate,
}, '2026-07-16T00:18:00.000Z');

assert.equal(reviewedReport.status, 'pass');
assert.equal(reviewedReport.summary.reviewedRows, 1);
assert.equal(reviewedReport.rows[0].reviewerNotePresent, true);

const badTemplate = structuredClone(validEditableTemplate);
badTemplate.rows[0].suggestedDisposition = 'promote_live';
badTemplate.rows[0].boundaryReminder = 'Promote this setup.';
const badReport = buildUnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport({
  editableTemplatePath: 'notes.editable.json',
  editableTemplate: badTemplate,
}, '2026-07-16T00:19:00.000Z');

assert.equal(badReport.status, 'fail');
assert.ok(badReport.blockers.includes('2026-06-16-morning-TurtleSoup-LONG: unsupported disposition promote_live'));
assert.ok(badReport.blockers.includes('2026-06-16-morning-TurtleSoup-LONG: boundary reminder missing no-execution language'));
assert.ok(badReport.blockers.includes('2026-06-16-morning-TurtleSoup-LONG: boundary reminder missing no-Supabase-write language'));
assert.ok(badReport.blockers.includes('2026-06-16-morning-TurtleSoup-LONG: boundary reminder missing no-Discord-post language'));

const missingReport = buildUnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport({
  editableTemplatePath: null,
  editableTemplate: null,
}, '2026-07-16T00:20:00.000Z');

assert.equal(missingReport.status, 'fail');
assert.ok(missingReport.blockers.includes('missing editable template path'));
assert.ok(missingReport.blockers.includes('no editable note rows found'));

console.log('unified positive held-local preview note ingest validator verified.');
