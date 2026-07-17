import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewReviewHandoffReport,
} from './unified-positive-held-local-preview-review-handoff';
import type { UnifiedPositiveHeldLocalPreviewDecisionSummaryReport } from './unified-positive-held-local-preview-decision-summary';

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

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'held-local-preview-handoff-'));
const artifact = (name: string): string => path.join(tmpDir, name);

const decisionSummary: UnifiedPositiveHeldLocalPreviewDecisionSummaryReport = {
  reportType: 'unified_positive_held_local_preview_decision_summary',
  generatedAt: '2026-07-16T00:40:00.000Z',
  status: 'pass',
  authority,
  source: {
    rollupPath: artifact('rollup.json'),
  },
  summary: {
    rollupRows: 4,
    holdForManualReviewRows: 4,
    keepLocalReviewOnlyRows: 0,
    requestMoreChartEvidenceRows: 0,
    excludedFromResearchQueueRows: 0,
    queuedForReplayResearchRows: 0,
    livePromotionAllowedRows: 0,
    systemReviewNoteRows: 0,
    missingPlanCautionRows: 0,
    systemNoteDrivenDecisionRows: 0,
  },
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewReviewHandoffReport({
  reportDir: tmpDir,
  bundlePath: artifact('bundle.json'),
  readinessPath: artifact('readiness.json'),
  readinessScreenshotPath: artifact('readiness.png'),
  checklistPath: artifact('checklist.json'),
  editableNotesPath: artifact('notes.editable.json'),
  noteValidationPath: artifact('note-validation.json'),
  rollupPath: artifact('rollup.json'),
  decisionSummaryPath: artifact('decision-summary.json'),
  decisionSummaryReport: decisionSummary,
}, '2026-07-16T00:41:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_review_handoff');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.decisionRows, 4);
assert.equal(report.summary.holdForManualReviewRows, 4);
assert.equal(report.summary.queuedForReplayResearchRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.missingArtifacts, 0);
assert.ok(report.reviewCommands.includes('npm run diagnostic:held-local-preview-decision-summary -- --json'));
assert.match(report.markdown, /local-only review handoff/);

const badDecisionSummary = structuredClone(decisionSummary);
badDecisionSummary.summary.livePromotionAllowedRows = 1;
const missingReport = buildUnifiedPositiveHeldLocalPreviewReviewHandoffReport({
  reportDir: path.join(tmpDir, 'missing-dir'),
  bundlePath: null,
  readinessPath: null,
  readinessScreenshotPath: null,
  checklistPath: null,
  editableNotesPath: null,
  noteValidationPath: null,
  rollupPath: null,
  decisionSummaryPath: null,
  decisionSummaryReport: badDecisionSummary,
}, '2026-07-16T00:42:00.000Z');

assert.equal(missingReport.status, 'fail');
assert.ok(missingReport.blockers.some((blocker) => blocker.startsWith('report directory missing:')));
assert.ok(missingReport.blockers.includes('missing editable notes'));
assert.ok(missingReport.blockers.includes('missing decision summary'));
assert.ok(missingReport.blockers.includes('decision summary has 1 live-promotion rows'));

console.log('unified positive held-local preview review handoff verified.');
