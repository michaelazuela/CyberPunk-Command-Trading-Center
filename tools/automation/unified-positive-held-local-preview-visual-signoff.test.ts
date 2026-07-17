import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderHtmlToApprovedPng } from './render-html-to-png';
import {
  buildUnifiedPositiveHeldLocalPreviewVisualSignoffReport,
  type UnifiedPositiveHeldLocalPreviewVisualSignoffReport,
} from './unified-positive-held-local-preview-visual-signoff';
import {
  HELD_LOCAL_PREVIEW_VISUAL_HEIGHT,
  HELD_LOCAL_PREVIEW_VISUAL_WIDTH,
  type UnifiedPositiveHeldLocalPreviewVisualReport,
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

function noisyHtml(): string {
  const rows = Array.from({ length: 90 }, (_, index) => `
    <div class="row">
      <span>Decision Support Only</span>
      <strong>${index % 2 === 0 ? 'No automated orders' : 'Human review required'}</strong>
      <em>No Discord post / No Supabase write</em>
    </div>
  `).join('');
  return `<!doctype html>
    <html>
      <head>
        <style>
          html, body { width: ${HELD_LOCAL_PREVIEW_VISUAL_WIDTH}px; height: ${HELD_LOCAL_PREVIEW_VISUAL_HEIGHT}px; margin: 0; background: #05070b; color: #f8fafc; font-family: Arial, sans-serif; }
          body { padding: 32px; background: linear-gradient(135deg, #05070b, #0b1722 55%, #020617); }
          h1 { color: #38bdf8; font-size: 48px; margin: 0 0 20px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
          .row { border: 1px solid rgba(56,189,248,0.32); padding: 4px 8px; background: rgba(15,23,42,0.7); font-size: 15px; }
          strong { color: #22c55e; display: block; }
          em { color: #facc15; font-style: normal; }
        </style>
      </head>
      <body>
        <h1>HELD-LOCAL REVIEW CARD</h1>
        <div class="grid">${rows}</div>
      </body>
    </html>`;
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'held-local-preview-visual-signoff-'));
try {
  const pngPath = path.join(tempDir, 'held-local-preview-test.png');
  await renderHtmlToApprovedPng({
    html: noisyHtml(),
    outputPath: pngPath,
    viewport: {
      width: HELD_LOCAL_PREVIEW_VISUAL_WIDTH,
      height: HELD_LOCAL_PREVIEW_VISUAL_HEIGHT,
    },
    expectedWidth: HELD_LOCAL_PREVIEW_VISUAL_WIDTH,
    expectedHeight: HELD_LOCAL_PREVIEW_VISUAL_HEIGHT,
    minBytes: 20_000,
    failureLabel: 'Held-local signoff test render',
  });

  const visualReport = {
    reportType: 'unified_positive_held_local_preview_visual',
    generatedAt: '2026-07-16T00:00:00.000Z',
    status: 'pass',
    authority,
    source: {
      rendererPath: 'renderer.json',
      preflightPath: 'preflight.json',
    },
    summary: {
      rendererRowsLoaded: 1,
      preflightRowsLoaded: 1,
      visualRowsRendered: 1,
      blockedRows: 0,
      postableFalseRows: 1,
      shouldPostFalseRows: 1,
      canExecuteFalseRows: 1,
      publishDiscordFalseRows: 1,
      shouldDispatchFalseRows: 1,
      writesSupabaseFalseRows: 1,
      visualPassRows: 1,
    },
    rows: [
      {
        ticketId: 'visual-ticket',
        sourceSnapshotId: 'scanner-visual',
        setupType: 'TurtleSoup',
        direction: 'LONG',
        status: 'visual_rendered',
        pngPath,
        visualQuality: 'pass',
        postable: false,
        publishDiscord: false,
        shouldPost: false,
        canExecute: false,
        shouldDispatch: false,
        writesSupabase: false,
        qa: {
          pngRendered: true,
          dimensionsApproved: true,
          minBytesApproved: true,
          hasDecisionSupportFooter: true,
          hasNoAutomatedOrdersText: true,
          hasNoDiscordPostText: true,
          hasNoSupabaseWriteText: true,
          hasEntryStopTargets: true,
          hasSideSpecificInvalidation: true,
        },
        blockers: [],
      },
    ],
    recommendations: [],
    markdown: '',
  } satisfies UnifiedPositiveHeldLocalPreviewVisualReport;

  const report: UnifiedPositiveHeldLocalPreviewVisualSignoffReport = await buildUnifiedPositiveHeldLocalPreviewVisualSignoffReport({
    visualReport,
    visualReportPath: 'visual.json',
    inspectedPngPaths: [pngPath],
    inspector: 'Codex',
    note: 'view_image inspection passed: no clipping, readable levels, footer boundaries visible.',
  }, '2026-07-16T00:01:00.000Z');

  assert.equal(report.reportType, 'unified_positive_held_local_preview_visual_signoff');
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
  assert.equal(report.summary.visualRowsLoaded, 1);
  assert.equal(report.summary.rowsSignedOff, 1);
  assert.equal(report.summary.blockedRows, 0);
  assert.equal(report.summary.inspectedPngsRecorded, 1);
  assert.equal(report.summary.unrecognizedInspectedPngs, 0);
  assert.equal(report.summary.postableFalseRows, 1);
  assert.equal(report.summary.shouldPostFalseRows, 1);
  assert.equal(report.summary.canExecuteFalseRows, 1);
  assert.equal(report.summary.publishDiscordFalseRows, 1);
  assert.equal(report.summary.shouldDispatchFalseRows, 1);
  assert.equal(report.summary.writesSupabaseFalseRows, 1);
  assert.equal(report.rows[0].status, 'signed_off');
  assert.equal(report.rows[0].inspection.inspectedPngRecorded, true);
  assert.equal(report.rows[0].inspection.pngExists, true);
  assert.equal(report.rows[0].inspection.dimensionsApproved, true);
  assert.equal(report.rows[0].inspection.minBytesApproved, true);
  assert.equal(report.rows[0].inspection.reportVisualQualityPass, true);
  assert.equal(report.rows[0].inspection.reportQaPass, true);
  assert.equal(report.rows[0].inspection.inspectorNotePresent, true);
  assert.match(report.markdown, /Rows signed off: 1/);

  const missingNote = await buildUnifiedPositiveHeldLocalPreviewVisualSignoffReport({
    visualReport,
    inspectedPngPaths: [pngPath],
    note: '',
  }, '2026-07-16T00:02:00.000Z');
  assert.equal(missingNote.status, 'fail');
  assert.equal(missingNote.summary.blockedRows, 1);
  assert.ok(missingNote.rows[0].blockers.includes('inspector note is required'));

  const missingInspection = await buildUnifiedPositiveHeldLocalPreviewVisualSignoffReport({
    visualReport,
    inspectedPngPaths: [],
    note: 'not enough proof',
  }, '2026-07-16T00:03:00.000Z');
  assert.equal(missingInspection.status, 'fail');
  assert.equal(missingInspection.summary.rowsSignedOff, 0);
  assert.ok(missingInspection.rows[0].blockers.includes('rendered PNG was not listed as inspected'));
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('unified positive held-local preview visual signoff verified.');
