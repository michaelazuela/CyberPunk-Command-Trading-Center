import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewReviewChecklistReport,
} from './unified-positive-held-local-preview-review-checklist';
import type { HeldLocalPreviewUiIndexReport } from '../../src/lib/heldLocalPreviewUiAdapter';
import type { UnifiedPositiveHeldLocalPreviewReadinessAuditReport } from './unified-positive-held-local-preview-readiness-audit';
import type { UnifiedPositiveHeldLocalPreviewPayloadReport } from './unified-positive-held-local-preview-payload';

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
    ticketId: '2026-06-16-morning-historicalReview-LONG',
    sourceSnapshotId: 'scanner-preview',
    setupType: 'historicalReview',
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

const previewPayloadReport: UnifiedPositiveHeldLocalPreviewPayloadReport = {
  reportType: 'unified_positive_held_local_preview_payload',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    inspectionSurfacePath: 'inspection.json',
    wordingGuardPath: 'wording.json',
    historicalReviewReviewNotePlacementSimulationPath: 'placement.json',
  },
  summary: {
    inspectionRowsLoaded: 1,
    previewPayloadsCreated: 1,
    blockedRows: 0,
    shouldPostFalsePayloads: 1,
    canExecuteFalsePayloads: 1,
    publishDiscordFalsePayloads: 1,
    shouldDispatchFalsePayloads: 1,
    writesSupabaseFalsePayloads: 1,
    reviewNotePlacementAppliedPayloads: 1,
  },
  rows: [{
    ticketId: '2026-06-16-morning-historicalReview-LONG',
    sourceSnapshotId: 'scanner-preview',
    session: 'morning',
    setupType: 'historicalReview',
    direction: 'LONG',
    status: 'preview_payload_created',
    payload: {
      sourceOfTruth: 'scanner_owned_held_local_local_preview_payload',
      ticketId: '2026-06-16-morning-historicalReview-LONG',
      sourceSnapshotId: 'scanner-preview',
      session: 'morning',
      setupType: 'historicalReview',
      direction: 'LONG',
      state: 'ACTIVE_REVIEW',
      publishDiscord: false,
      shouldPost: false,
      canExecute: false,
      shouldDispatch: false,
      writesSupabase: false,
      reviewOnly: true,
      humanReviewOnly: true,
      noAutomatedOrders: true,
      title: 'historicalReview LONG ACTIVE_REVIEW local preview',
      sections: {
        what: 'what',
        where: 'where',
        when: 'when',
        why: 'why',
        invalidation: 'invalidation',
      },
      levels: {
        lineInSand: 100,
        entry: 100,
        stop: 96,
        t1: 106,
        t2: 108,
      },
      htfStatus: 'sufficient',
      notes: ['historicalReview long remains review-only: this cluster lacks full plan-level proof.'],
    },
    blockers: [],
  }],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewReviewChecklistReport({
  bundlePath: 'bundle.json',
  bundleReport,
  previewPayloadPath: 'payload.json',
  previewPayloadReport,
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
assert.equal(report.summary.systemReviewNoteRows, 1);
assert.equal(report.rows[0].visibleInHiddenTab, true);
assert.equal(report.rows[0].reviewOnly, true);
assert.equal(report.rows[0].canExecute, false);
assert.equal(report.rows[0].publishDiscord, false);
assert.deepEqual(report.rows[0].systemReviewNotes, ['historicalReview long remains review-only: this cluster lacks full plan-level proof.']);
assert.ok(report.rows[0].reviewOnlyReasons.includes('canExecute remains false.'));
assert.match(report.markdown, /2026-06-16-morning-historicalReview-LONG/);
assert.match(report.markdown, /Human-review only/);
assert.match(report.markdown, /lacks full plan-level proof/);

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
