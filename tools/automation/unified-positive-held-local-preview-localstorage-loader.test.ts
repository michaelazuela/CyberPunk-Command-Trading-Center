import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HELD_LOCAL_PREVIEW_STORAGE_KEY, type HeldLocalPreviewUiIndexReport } from '../../src/lib/heldLocalPreviewUiAdapter';
import {
  buildUnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport,
  writeUnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport,
} from './unified-positive-held-local-preview-localstorage-loader';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'held-local-preview-localstorage-loader-'));

try {
  const uiIndexReport: HeldLocalPreviewUiIndexReport = {
    reportType: 'unified_positive_held_local_preview_ui_index',
    status: 'pass',
    authority: {
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
    },
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
      ticketId: 'preview-ticket',
      sourceSnapshotId: 'scanner-preview',
      setupType: 'TurtleSoup',
      direction: 'LONG',
      pngPath: path.join(tempDir, 'card.png'),
      imageSrc: 'file:///C:/preview/card.png',
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

  const report = buildUnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport({
    uiIndexReport,
    uiIndexPath: 'ui-index.json',
  }, '2026-07-16T00:03:00.000Z');

  assert.equal(report.reportType, 'unified_positive_held_local_preview_localstorage_loader');
  assert.equal(report.status, 'pass');
  assert.equal(report.authority.localOnly, true);
  assert.equal(report.authority.postsDiscord, false);
  assert.equal(report.authority.writesSupabase, false);
  assert.equal(report.authority.readsLiveSupabase, false);
  assert.equal(report.authority.readsLiveBridge, false);
  assert.equal(report.authority.runsSetupScanner, false);
  assert.equal(report.authority.changesScannerBehavior, false);
  assert.equal(report.authority.changesTradingLogic, false);
  assert.equal(report.authority.changesCanExecute, false);
  assert.equal(report.authority.changesAppRuntime, false);
  assert.equal(report.summary.storageKey, HELD_LOCAL_PREVIEW_STORAGE_KEY);
  assert.equal(report.summary.previewItemsReady, 1);
  assert.equal(report.summary.blockedItems, 0);
  assert.match(report.snippet, new RegExp(`localStorage\\.setItem\\('${HELD_LOCAL_PREVIEW_STORAGE_KEY}'`));
  assert.match(report.snippet, /heldLocalPreview=1/);
  assert.doesNotMatch(report.snippet, /shouldPost=true/);
  assert.doesNotMatch(report.snippet, /canExecute=true/);

  const paths = writeUnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport(report, tempDir);
  assert.ok(fs.existsSync(paths.jsonPath));
  assert.ok(fs.existsSync(paths.markdownPath));
  assert.ok(fs.existsSync(paths.snippetPath));
  const snippet = fs.readFileSync(paths.snippetPath, 'utf8');
  assert.match(snippet, /localStorage\.setItem/);
  assert.match(snippet, /heldLocalPreview=1/);

  const blockedUiIndex = structuredClone(uiIndexReport);
  blockedUiIndex.status = 'fail';
  blockedUiIndex.summary.blockedItems = 1;
  const blockedReport = buildUnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport({
    uiIndexReport: blockedUiIndex,
  }, '2026-07-16T00:04:00.000Z');

  assert.equal(blockedReport.status, 'fail');
  assert.equal(blockedReport.snippet, '');
  assert.ok(blockedReport.blockers.includes('preview index status fail'));
  assert.ok(blockedReport.blockers.includes('preview index has blocked items'));
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('unified positive held-local preview localStorage loader verified.');
