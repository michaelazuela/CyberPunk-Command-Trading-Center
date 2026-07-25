import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderHtmlToApprovedPng } from './render-html-to-png';
import {
  buildUnifiedPositiveHeldLocalPreviewUiIndexReport,
  writeUnifiedPositiveHeldLocalPreviewUiIndexReport,
  type UnifiedPositiveHeldLocalPreviewUiIndexReport,
} from './unified-positive-held-local-preview-ui-index';
import type { UnifiedPositiveHeldLocalPreviewVisualSignoffReport } from './unified-positive-held-local-preview-visual-signoff';
import {
  HELD_LOCAL_PREVIEW_VISUAL_HEIGHT,
  HELD_LOCAL_PREVIEW_VISUAL_WIDTH,
} from './unified-positive-held-local-preview-visual';

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
} as const;

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'held-local-preview-ui-index-'));
try {
  const pngPath = path.join(tempDir, 'card.png');
  await renderHtmlToApprovedPng({
    html: `<!doctype html><html><body style="margin:0;width:${HELD_LOCAL_PREVIEW_VISUAL_WIDTH}px;height:${HELD_LOCAL_PREVIEW_VISUAL_HEIGHT}px;background:#05070b;color:#f8fafc;font:700 40px Arial;padding:40px">Decision Support Only<br>No automated orders<br>No Discord post<br>No Supabase write</body></html>`,
    outputPath: pngPath,
    viewport: {
      width: HELD_LOCAL_PREVIEW_VISUAL_WIDTH,
      height: HELD_LOCAL_PREVIEW_VISUAL_HEIGHT,
    },
    expectedWidth: HELD_LOCAL_PREVIEW_VISUAL_WIDTH,
    expectedHeight: HELD_LOCAL_PREVIEW_VISUAL_HEIGHT,
    minBytes: 5_000,
    failureLabel: 'Held-local preview index fixture',
  });

  const signoffReport = {
    reportType: 'unified_positive_held_local_preview_visual_signoff',
    generatedAt: '2026-07-16T00:00:00.000Z',
    status: 'pass',
    authority,
    source: {
      visualReportPath: 'visual.json',
    },
    signoff: {
      inspector: 'Codex',
      note: 'inspected',
      requireAllRenderedRows: true,
      inspectedPngPaths: [pngPath],
    },
    summary: {
      visualRowsLoaded: 1,
      rowsSignedOff: 1,
      blockedRows: 0,
      inspectedPngsRecorded: 1,
      unrecognizedInspectedPngs: 0,
      postableFalseRows: 1,
      shouldPostFalseRows: 1,
      canExecuteFalseRows: 1,
      publishDiscordFalseRows: 1,
      shouldDispatchFalseRows: 1,
      writesSupabaseFalseRows: 1,
    },
    rows: [
      {
        ticketId: 'preview-ticket',
        sourceSnapshotId: 'scanner-preview',
        setupType: 'raidReclaim',
        direction: 'LONG',
        pngPath,
        status: 'signed_off',
        postable: false,
        publishDiscord: false,
        shouldPost: false,
        canExecute: false,
        shouldDispatch: false,
        writesSupabase: false,
        inspection: {
          inspectedPngRecorded: true,
          pngExists: true,
          dimensionsApproved: true,
          minBytesApproved: true,
          reportVisualQualityPass: true,
          reportQaPass: true,
          decisionSupportLanguagePresent: true,
          noAutomatedOrdersLanguagePresent: true,
          noDiscordPostLanguagePresent: true,
          noSupabaseWriteLanguagePresent: true,
          inspectorNotePresent: true,
        },
        blockers: [],
      },
    ],
    recommendations: [],
    markdown: '',
  } satisfies UnifiedPositiveHeldLocalPreviewVisualSignoffReport;

  const report: UnifiedPositiveHeldLocalPreviewUiIndexReport = buildUnifiedPositiveHeldLocalPreviewUiIndexReport({
    signoffReport,
    signoffReportPath: 'signoff.json',
  }, '2026-07-16T00:01:00.000Z');

  assert.equal(report.reportType, 'unified_positive_held_local_preview_ui_index');
  assert.equal(report.status, 'pass');
  assert.equal(report.authority.localOnly, true);
  assert.equal(report.authority.postsDiscord, false);
  assert.equal(report.authority.writesSupabase, false);
  assert.equal(report.authority.readsLiveBridge, false);
  assert.equal(report.authority.runsSetupScanner, false);
  assert.equal(report.authority.changesScannerBehavior, false);
  assert.equal(report.authority.changesTradingLogic, false);
  assert.equal(report.authority.changesCanExecute, false);
  assert.equal(report.authority.changesDiscordPosting, false);
  assert.equal(report.authority.changesAppRuntime, false);
  assert.equal(report.summary.signoffRowsLoaded, 1);
  assert.equal(report.summary.previewItemsReady, 1);
  assert.equal(report.summary.blockedItems, 0);
  assert.equal(report.summary.postableFalseItems, 1);
  assert.equal(report.summary.shouldPostFalseItems, 1);
  assert.equal(report.summary.canExecuteFalseItems, 1);
  assert.equal(report.summary.publishDiscordFalseItems, 1);
  assert.equal(report.summary.shouldDispatchFalseItems, 1);
  assert.equal(report.summary.writesSupabaseFalseItems, 1);
  assert.equal(report.items[0].previewStatus, 'preview_ready');
  assert.equal(report.items[0].postable, false);
  assert.equal(report.items[0].shouldPost, false);
  assert.equal(report.items[0].canExecute, false);
  assert.equal(report.items[0].publishDiscord, false);
  assert.equal(report.items[0].shouldDispatch, false);
  assert.equal(report.items[0].writesSupabase, false);
  assert.match(report.items[0].imageSrc, /^file:\/\/\//);
  assert.match(report.markdown, /Preview items ready: 1/);

  const paths = writeUnifiedPositiveHeldLocalPreviewUiIndexReport(report, tempDir);
  assert.ok(fs.existsSync(paths.htmlPath));
  assert.ok(fs.existsSync(paths.jsonPath));
  assert.ok(fs.existsSync(paths.markdownPath));
  const html = fs.readFileSync(paths.htmlPath, 'utf8');
  assert.match(html, /Held-Local Preview Index/);
  assert.match(html, /Decision Support Only/);
  assert.match(html, /No automated orders/);
  assert.match(html, /No Discord post/);
  assert.match(html, /No Supabase write/);
  assert.doesNotMatch(html, /shouldPost=true/);
  assert.doesNotMatch(html, /canExecute=true/);

  const failedSignoff = structuredClone(signoffReport) as UnifiedPositiveHeldLocalPreviewVisualSignoffReport;
  failedSignoff.status = 'fail';
  failedSignoff.rows[0].status = 'blocked';
  failedSignoff.rows[0].blockers = ['not inspected'];
  const blockedReport = buildUnifiedPositiveHeldLocalPreviewUiIndexReport({
    signoffReport: failedSignoff,
  }, '2026-07-16T00:02:00.000Z');

  assert.equal(blockedReport.status, 'fail');
  assert.equal(blockedReport.summary.previewItemsReady, 0);
  assert.equal(blockedReport.summary.blockedItems, 1);
  assert.ok(blockedReport.items[0].blockers.includes('signoff report status fail'));
  assert.ok(blockedReport.items[0].blockers.includes('signoff row status blocked'));
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('unified positive held-local preview UI index verified.');
