import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewVisualReport,
  HELD_LOCAL_PREVIEW_VISUAL_HEIGHT,
  HELD_LOCAL_PREVIEW_VISUAL_WIDTH,
} from './unified-positive-held-local-preview-visual';
import type { UnifiedPositiveHeldLocalPreviewPreflightReport } from './unified-positive-held-local-preview-preflight';
import type { UnifiedPositiveHeldLocalPreviewRendererReport } from './unified-positive-held-local-preview-renderer';

const content = [
  '[HELD-LOCAL REVIEW] MES - LONG ACTIVE_REVIEW',
  'TurtleSoup LONG ACTIVE_REVIEW local preview',
  '',
  'What: TurtleSoup LONG held-local ACTIVE_REVIEW ticket.',
  'Where: Line 100.00; entry 100.00; stop 96.00; T1 106.00; T2 108.00.',
  'When: Fresh completed 5M proof.',
  'Why: HTF context supports review only.',
  'Invalidation: Invalid if price trades below the protected 5M stop line at 96.00. No automated order authority is granted.',
  '',
  'Line: 100.00 | Entry: 100.00 | Stop: 96.00 | T1: 106.00 | T2: 108.00',
  'HTF status: sufficient',
  'Boundary: Human-review only. No automated order authority. Local preview only; not posted to Discord and not written to Supabase.',
].join('\n');

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

const rendererReport = {
  reportType: 'unified_positive_held_local_preview_renderer',
  generatedAt: '2026-07-16T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    previewPayloadPath: 'preview-payload.json',
  },
  summary: {
    previewPayloadRowsLoaded: 1,
    renderedCards: 1,
    blockedRows: 0,
    postableFalseCards: 1,
    shouldPostFalseCards: 1,
    canExecuteFalseCards: 1,
    publishDiscordFalseCards: 1,
    shouldDispatchFalseCards: 1,
    writesSupabaseFalseCards: 1,
    shapePassCards: 1,
  },
  rows: [
    {
      ticketId: 'long-ticket',
      sourceSnapshotId: 'scanner-long',
      setupType: 'TurtleSoup',
      direction: 'LONG',
      status: 'rendered',
      renderedCard: {
        sourceOfTruth: 'scanner_owned_held_local_local_preview_render',
        ticketId: 'long-ticket',
        sourceSnapshotId: 'scanner-long',
        setupType: 'TurtleSoup',
        direction: 'LONG',
        status: 'rendered_local_preview_card',
        postable: false,
        publishDiscord: false,
        shouldPost: false,
        canExecute: false,
        shouldDispatch: false,
        writesSupabase: false,
        content,
        footer: 'Local preview only. Human review required. No automated orders. No Discord post. No Supabase write.',
        shapeChecks: {
          hasTitle: true,
          hasWhatWhereWhenWhyInvalidation: true,
          hasLevels: true,
          hasHumanReviewOnlyBoundary: true,
          hasNoAutomatedOrdersBoundary: true,
          hasNoDispatchBoundary: true,
          hasSideSpecificInvalidation: true,
          hasGenericBelowAboveWording: false,
        },
      },
      blockers: [],
    },
  ],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewRendererReport;

const preflightReport = {
  reportType: 'unified_positive_held_local_preview_preflight',
  generatedAt: '2026-07-16T00:01:00.000Z',
  status: 'pass',
  authority,
  source: {
    rendererPath: 'renderer.json',
  },
  limits: {
    maxContentChars: 1800,
    maxLineChars: 220,
    maxFooterChars: 240,
  },
  summary: {
    rendererRowsLoaded: 1,
    rowsPassed: 1,
    rowsFailed: 0,
    missingFieldFindings: 0,
    oversizedContentFindings: 0,
    oversizedLineFindings: 0,
    boundaryFindings: 0,
    forbiddenSignalFindings: 0,
  },
  rows: [
    {
      ticketId: 'long-ticket',
      sourceSnapshotId: 'scanner-long',
      setupType: 'TurtleSoup',
      direction: 'LONG',
      status: 'preflight_pass',
      contentLength: content.length,
      maxLineLength: Math.max(...content.split('\n').map((line) => line.length)),
      findings: [],
    },
  ],
  findings: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewPreflightReport;

function pngDimensions(pngPath: string): { width: number; height: number } {
  const bytes = fs.readFileSync(pngPath);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'held-local-preview-visual-'));
try {
  const report = await buildUnifiedPositiveHeldLocalPreviewVisualReport({
    rendererReport,
    preflightReport,
    visualDir: tempDir,
  }, '2026-07-16T00:02:00.000Z');

  assert.equal(report.reportType, 'unified_positive_held_local_preview_visual');
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
  assert.equal(report.summary.rendererRowsLoaded, 1);
  assert.equal(report.summary.preflightRowsLoaded, 1);
  assert.equal(report.summary.visualRowsRendered, 1);
  assert.equal(report.summary.blockedRows, 0);
  assert.equal(report.summary.postableFalseRows, 1);
  assert.equal(report.summary.shouldPostFalseRows, 1);
  assert.equal(report.summary.canExecuteFalseRows, 1);
  assert.equal(report.summary.publishDiscordFalseRows, 1);
  assert.equal(report.summary.shouldDispatchFalseRows, 1);
  assert.equal(report.summary.writesSupabaseFalseRows, 1);
  assert.equal(report.summary.visualPassRows, 1);
  assert.equal(report.rows[0].status, 'visual_rendered');
  assert.equal(report.rows[0].visualQuality, 'pass');
  assert.equal(report.rows[0].postable, false);
  assert.equal(report.rows[0].shouldPost, false);
  assert.equal(report.rows[0].canExecute, false);
  assert.equal(report.rows[0].publishDiscord, false);
  assert.equal(report.rows[0].shouldDispatch, false);
  assert.equal(report.rows[0].writesSupabase, false);
  assert.ok(report.rows[0].pngPath);
  assert.ok(fs.existsSync(report.rows[0].pngPath || ''));
  assert.ok(fs.statSync(report.rows[0].pngPath || '').size > 20_000);
  assert.deepEqual(pngDimensions(report.rows[0].pngPath || ''), {
    width: HELD_LOCAL_PREVIEW_VISUAL_WIDTH,
    height: HELD_LOCAL_PREVIEW_VISUAL_HEIGHT,
  });
  assert.equal(report.rows[0].qa.pngRendered, true);
  assert.equal(report.rows[0].qa.dimensionsApproved, true);
  assert.equal(report.rows[0].qa.minBytesApproved, true);
  assert.equal(report.rows[0].qa.hasDecisionSupportFooter, true);
  assert.equal(report.rows[0].qa.hasNoAutomatedOrdersText, true);
  assert.equal(report.rows[0].qa.hasNoDiscordPostText, true);
  assert.equal(report.rows[0].qa.hasNoSupabaseWriteText, true);
  assert.equal(report.rows[0].qa.hasEntryStopTargets, true);
  assert.equal(report.rows[0].qa.hasSideSpecificInvalidation, true);
  assert.match(report.markdown, /Visual rows rendered: 1/);

  const failedPreflight = structuredClone(preflightReport) as UnifiedPositiveHeldLocalPreviewPreflightReport;
  failedPreflight.status = 'fail';
  failedPreflight.rows[0].status = 'preflight_fail';
  failedPreflight.summary.rowsPassed = 0;
  failedPreflight.summary.rowsFailed = 1;
  const blockedReport = await buildUnifiedPositiveHeldLocalPreviewVisualReport({
    rendererReport,
    preflightReport: failedPreflight,
    visualDir: tempDir,
  }, '2026-07-16T00:03:00.000Z');

  assert.equal(blockedReport.status, 'fail');
  assert.equal(blockedReport.summary.visualRowsRendered, 0);
  assert.equal(blockedReport.summary.blockedRows, 1);
  assert.equal(blockedReport.rows[0].pngPath, null);
  assert.ok(blockedReport.rows[0].blockers.includes('preflight status fail'));
  assert.ok(blockedReport.rows[0].blockers.includes('preflight row status preflight_fail'));
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('unified positive held-local preview visual verified.');
