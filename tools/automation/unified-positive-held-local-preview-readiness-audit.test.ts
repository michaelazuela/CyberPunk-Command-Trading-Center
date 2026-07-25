import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewReadinessAuditReport,
  type UnifiedPositiveHeldLocalPreviewReadinessAuditReport,
} from './unified-positive-held-local-preview-readiness-audit';
import type { HeldLocalPreviewUiIndexReport } from '../../src/lib/heldLocalPreviewUiAdapter';

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
    signoffRowsLoaded: 2,
    previewItemsReady: 2,
    blockedItems: 0,
    postableFalseItems: 2,
    shouldPostFalseItems: 2,
    canExecuteFalseItems: 2,
    publishDiscordFalseItems: 2,
    shouldDispatchFalseItems: 2,
    writesSupabaseFalseItems: 2,
  },
  output: {
    htmlPath: 'preview.html',
  },
  items: [
    {
      ticketId: 'preview-long',
      sourceSnapshotId: 'scanner-preview',
      setupType: 'raidReclaim',
      direction: 'LONG',
      pngPath: 'card-long.png',
      imageSrc: 'data:image/png;base64,iVBORw0KGgo=',
      previewStatus: 'preview_ready',
      postable: false,
      publishDiscord: false,
      shouldPost: false,
      canExecute: false,
      shouldDispatch: false,
      writesSupabase: false,
      blockers: [],
    },
    {
      ticketId: 'preview-short',
      sourceSnapshotId: 'scanner-preview',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      pngPath: 'card-short.png',
      imageSrc: 'data:image/png;base64,iVBORw0KGgo=',
      previewStatus: 'preview_ready',
      postable: false,
      publishDiscord: false,
      shouldPost: false,
      canExecute: false,
      shouldDispatch: false,
      writesSupabase: false,
      blockers: [],
    },
  ],
};

const passReport: UnifiedPositiveHeldLocalPreviewReadinessAuditReport = buildUnifiedPositiveHeldLocalPreviewReadinessAuditReport({
  appUrl: 'http://127.0.0.1:3000/?heldLocalPreview=1',
  bundlePath: 'bundle.json',
  bundleReport,
  browserResult: {
    renderedCards: 2,
    naturalWidths: [1280, 1280],
    message: 'Import ready: 2 local preview cards.',
    screenshotPath: 'screenshot.png',
  },
}, '2026-07-16T00:06:00.000Z');

assert.equal(passReport.reportType, 'unified_positive_held_local_preview_readiness_audit');
assert.equal(passReport.status, 'pass');
assert.equal(passReport.authority.localOnly, true);
assert.equal(passReport.authority.postsDiscord, false);
assert.equal(passReport.authority.writesSupabase, false);
assert.equal(passReport.authority.readsLiveBridge, false);
assert.equal(passReport.authority.runsSetupScanner, false);
assert.equal(passReport.authority.changesTradingLogic, false);
assert.equal(passReport.authority.changesCanExecute, false);
assert.equal(passReport.summary.bundleItems, 2);
assert.equal(passReport.summary.expectedCards, 2);
assert.equal(passReport.summary.renderedCards, 2);
assert.equal(passReport.summary.loadedImages, 2);
assert.equal(passReport.summary.minNaturalWidth, 1280);
assert.equal(passReport.blockers.length, 0);
assert.match(passReport.markdown, /Hidden held-local preview tab is ready/);

const failReport = buildUnifiedPositiveHeldLocalPreviewReadinessAuditReport({
  appUrl: 'http://127.0.0.1:3000/?heldLocalPreview=1',
  bundlePath: 'bundle.json',
  bundleReport,
  browserResult: {
    renderedCards: 2,
    naturalWidths: [1280, 0],
    message: 'Import ready: 2 local preview cards.',
    screenshotPath: 'screenshot.png',
  },
}, '2026-07-16T00:07:00.000Z');

assert.equal(failReport.status, 'fail');
assert.ok(failReport.blockers.includes('loaded images 1 did not match expected 2'));
assert.ok(failReport.blockers.includes('one or more preview images did not load'));

const missingBundleReport = buildUnifiedPositiveHeldLocalPreviewReadinessAuditReport({
  appUrl: 'http://127.0.0.1:3000/?heldLocalPreview=1',
  bundlePath: null,
  bundleReport: null,
  browserResult: null,
}, '2026-07-16T00:08:00.000Z');

assert.equal(missingBundleReport.status, 'fail');
assert.ok(missingBundleReport.blockers.includes('missing embedded bundle path'));
assert.ok(missingBundleReport.blockers.includes('missing local preview index report'));

console.log('unified positive held-local preview readiness audit verified.');
