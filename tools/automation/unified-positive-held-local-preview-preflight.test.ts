import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewPreflightReport,
  type UnifiedPositiveHeldLocalPreviewPreflightReport,
} from './unified-positive-held-local-preview-preflight';
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

const rendererReport = {
  reportType: 'unified_positive_held_local_preview_renderer',
  generatedAt: '2026-07-16T00:00:00.000Z',
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
  },
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

const report = buildUnifiedPositiveHeldLocalPreviewPreflightReport({
  rendererReport,
  rendererPath: 'renderer.json',
}, '2026-07-16T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_preflight');
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
assert.equal(report.summary.rowsPassed, 1);
assert.equal(report.summary.rowsFailed, 0);
assert.equal(report.summary.missingFieldFindings, 0);
assert.equal(report.summary.oversizedContentFindings, 0);
assert.equal(report.summary.oversizedLineFindings, 0);
assert.equal(report.summary.boundaryFindings, 0);
assert.equal(report.summary.forbiddenSignalFindings, 0);
assert.equal(report.findings.length, 0);
assert.equal(report.rows[0].status, 'preflight_pass');
assert.ok(report.rows[0].contentLength > 0);
assert.ok(report.rows[0].maxLineLength > 0);
assert.match(report.markdown, /Rows passed: 1/);

const oversizedReport = buildUnifiedPositiveHeldLocalPreviewPreflightReport({
  rendererReport,
  limits: {
    maxContentChars: 100,
    maxLineChars: 40,
  },
}, '2026-07-16T00:02:00.000Z');

assert.equal(oversizedReport.status, 'fail');
assert.equal(oversizedReport.summary.rowsPassed, 0);
assert.equal(oversizedReport.summary.rowsFailed, 1);
assert.equal(oversizedReport.summary.oversizedContentFindings, 1);
assert.equal(oversizedReport.summary.oversizedLineFindings, 1);
assert.ok(oversizedReport.findings.some((finding) => finding.reason === 'oversized_content'));
assert.ok(oversizedReport.findings.some((finding) => finding.reason === 'oversized_line'));

const dirtyRenderer = structuredClone(rendererReport) as UnifiedPositiveHeldLocalPreviewRendererReport;
if (dirtyRenderer.rows[0].renderedCard) {
  dirtyRenderer.rows[0].renderedCard.content = dirtyRenderer.rows[0].renderedCard.content
    .replace('What: TurtleSoup LONG held-local ACTIVE_REVIEW ticket.\n', '')
    .replace('not posted to Discord and not written to Supabase', 'shouldPost=true and publishDiscord=true')
    .replace('Invalid if price trades below the protected 5M stop line at 96.00.', 'Invalid below/above the protected 5M stop line at 96.00.');
  dirtyRenderer.rows[0].renderedCard.shouldDispatch = true as false;
}
const dirtyReport: UnifiedPositiveHeldLocalPreviewPreflightReport = buildUnifiedPositiveHeldLocalPreviewPreflightReport({
  rendererReport: dirtyRenderer,
}, '2026-07-16T00:03:00.000Z');

assert.equal(dirtyReport.status, 'fail');
assert.equal(dirtyReport.summary.rowsPassed, 0);
assert.equal(dirtyReport.summary.rowsFailed, 1);
assert.ok(dirtyReport.summary.missingFieldFindings >= 1);
assert.ok(dirtyReport.summary.boundaryFindings >= 2);
assert.ok(dirtyReport.summary.forbiddenSignalFindings >= 1);
assert.ok(dirtyReport.findings.some((finding) => finding.reason === 'missing_required_card_fields'));
assert.ok(dirtyReport.findings.some((finding) => finding.reason === 'forbidden_dispatch_or_execution_signal'));
assert.ok(dirtyReport.findings.some((finding) => finding.reason === 'forbidden_true_flag_text'));
assert.ok(dirtyReport.findings.some((finding) => finding.reason === 'generic_below_above_wording'));

console.log('unified positive held-local preview preflight verified.');
