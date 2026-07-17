import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewReviewChecklistReport,
} from './unified-positive-held-local-preview-review-checklist';
import type { HeldLocalPreviewUiIndexReport } from '../../src/lib/heldLocalPreviewUiAdapter';
import type { UnifiedPositiveHeldLocalPreviewReadinessAuditReport } from './unified-positive-held-local-preview-readiness-audit';

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

const bundleReport: HeldLocalPreviewUiIndexReport = {
  reportType: 'unified_positive_held_local_preview_ui_index',
  status: 'pass',
  authority,
  summary: {
    signoffRowsLoaded: 1,
    previewItemsReady: 1,
    blockedItems: 0,
    postableFalseItems: 1,
    shouldPostFalseItems: 1,
    canExecuteFalseItems: 1,
    publishDiscordFalseItems: 1,
    shouldDispatchFalseItems: 1,
    writesSupabaseFalseItems: 1,
  },
  output: {
    htmlPath: 'preview.html',
  },
  items: [{
    ticketId: '2026-06-16-morning-TurtleSoup-LONG',
    sourceSnapshotId: 'scanner-preview',
    setupType: 'TurtleSoup',
    direction: 'LONG',
    pngPath: 'card.png',
    imageSrc: 'data:image/png;base64,iVBORw0KGgo=',
    previewStatus: 'preview_ready',
    postable: false,
    publishDiscord: false,
    shouldPost: false,
    canExecute: false,
    shouldDispatch: false,
    writesSupabase: false,
    blockers: [],
  }],
};

const readinessAudit: UnifiedPositiveHeldLocalPreviewReadinessAuditReport = {
  reportType: 'unified_positive_held_local_preview_readiness_audit',
  generatedAt: '2026-07-16T00:09:00.000Z',
  status: 'pass',
  authority,
  source: {
    appUrl: 'http://127.0.0.1:3000/?heldLocalPreview=1',
    bundlePath: 'bundle.json',
    screenshotPath: 'screenshot.png',
  },
  summary: {
    bundleItems: 1,
    expectedCards: 1,
    renderedCards: 1,
    loadedImages: 1,
    minNaturalWidth: 1280,
  },
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewReviewChecklistReport({
  bundlePath: 'bundle.json',
  bundleReport,
  readinessAuditPath: 'readiness.json',
  readinessAudit,
}, '2026-07-16T00:10:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_review_checklist');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.bundleItems, 1);
assert.equal(report.summary.visibleRows, 1);
assert.equal(report.summary.reviewOnlyRows, 1);
assert.equal(report.summary.canExecuteFalseRows, 1);
assert.equal(report.summary.postableFalseRows, 1);
assert.equal(report.summary.publishDiscordFalseRows, 1);
assert.equal(report.summary.writesSupabaseFalseRows, 1);
assert.equal(report.rows[0].visibleInHiddenTab, true);
assert.equal(report.rows[0].reviewOnly, true);
assert.equal(report.rows[0].canExecute, false);
assert.equal(report.rows[0].publishDiscord, false);
assert.ok(report.rows[0].reviewOnlyReasons.includes('canExecute remains false.'));
assert.match(report.markdown, /2026-06-16-morning-TurtleSoup-LONG/);
assert.match(report.markdown, /Human-review only/);

const failedReadiness = structuredClone(readinessAudit);
failedReadiness.summary.renderedCards = 0;
const failedReport = buildUnifiedPositiveHeldLocalPreviewReviewChecklistReport({
  bundlePath: 'bundle.json',
  bundleReport,
  readinessAuditPath: 'readiness.json',
  readinessAudit: failedReadiness,
}, '2026-07-16T00:11:00.000Z');

assert.equal(failedReport.status, 'fail');
assert.ok(failedReport.blockers.includes('readiness rendered cards 0 did not match checklist rows 1'));

const missingBundleReport = buildUnifiedPositiveHeldLocalPreviewReviewChecklistReport({
  bundlePath: null,
  bundleReport: null,
}, '2026-07-16T00:12:00.000Z');

assert.equal(missingBundleReport.status, 'fail');
assert.ok(missingBundleReport.blockers.includes('missing embedded bundle path'));
assert.ok(missingBundleReport.blockers.includes('missing local preview index report'));

console.log('unified positive held-local preview review checklist verified.');
