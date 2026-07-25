import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewRendererReport,
  type UnifiedPositiveHeldLocalPreviewRendererReport,
} from './unified-positive-held-local-preview-renderer';
import type { UnifiedPositiveHeldLocalPreviewPayloadReport } from './unified-positive-held-local-preview-payload';

const previewPayloadReport = {
  reportType: 'unified_positive_held_local_preview_payload',
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
    inspectionSurfacePath: 'inspection.json',
    wordingGuardPath: 'wording.json',
    raidReclaimReviewNotePlacementSimulationPath: null,
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
    reviewNotePlacementAppliedPayloads: 0,
  },
  rows: [
    {
      ticketId: 'long-ticket',
      sourceSnapshotId: 'scanner-long',
      session: null,
      setupType: 'raidReclaim',
      direction: 'LONG',
      status: 'preview_payload_created',
      payload: {
        sourceOfTruth: 'scanner_owned_held_local_local_preview_payload',
        ticketId: 'long-ticket',
        sourceSnapshotId: 'scanner-long',
        session: null,
        setupType: 'raidReclaim',
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
        title: 'raidReclaim LONG ACTIVE_REVIEW local preview',
        sections: {
          what: 'raidReclaim LONG held-local ACTIVE_REVIEW ticket.',
          where: 'Line 100.00; entry 100.00; stop 96.00; T1 106.00; T2 108.00.',
          when: 'Fresh completed 5M proof.',
          why: 'HTF context supports review only.',
          invalidation: 'Invalid if price trades below the protected 5M stop line at 96.00. No automated order authority is granted.',
        },
        levels: {
          lineInSand: 100,
          entry: 100,
          stop: 96,
          t1: 106,
          t2: 108,
        },
        htfStatus: 'sufficient',
        notes: ['fixture note'],
      },
      blockers: [],
    },
  ],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewPayloadReport;

const report = buildUnifiedPositiveHeldLocalPreviewRendererReport({
  previewPayloadReport,
  previewPayloadPath: 'preview-payload.json',
}, '2026-07-16T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_renderer');
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
assert.equal(report.summary.previewPayloadRowsLoaded, 1);
assert.equal(report.summary.renderedCards, 1);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.postableFalseCards, 1);
assert.equal(report.summary.shouldPostFalseCards, 1);
assert.equal(report.summary.canExecuteFalseCards, 1);
assert.equal(report.summary.publishDiscordFalseCards, 1);
assert.equal(report.summary.shouldDispatchFalseCards, 1);
assert.equal(report.summary.writesSupabaseFalseCards, 1);
assert.equal(report.summary.shapePassCards, 1);
assert.equal(report.rows[0].status, 'rendered');
assert.equal(report.rows[0].renderedCard?.sourceOfTruth, 'scanner_owned_held_local_local_preview_render');
assert.equal(report.rows[0].renderedCard?.postable, false);
assert.equal(report.rows[0].renderedCard?.shouldPost, false);
assert.equal(report.rows[0].renderedCard?.canExecute, false);
assert.equal(report.rows[0].renderedCard?.publishDiscord, false);
assert.equal(report.rows[0].renderedCard?.shouldDispatch, false);
assert.equal(report.rows[0].renderedCard?.writesSupabase, false);
assert.equal(report.rows[0].renderedCard?.shapeChecks.hasTitle, true);
assert.equal(report.rows[0].renderedCard?.shapeChecks.hasWhatWhereWhenWhyInvalidation, true);
assert.equal(report.rows[0].renderedCard?.shapeChecks.hasLevels, true);
assert.equal(report.rows[0].renderedCard?.shapeChecks.hasHumanReviewOnlyBoundary, true);
assert.equal(report.rows[0].renderedCard?.shapeChecks.hasNoAutomatedOrdersBoundary, true);
assert.equal(report.rows[0].renderedCard?.shapeChecks.hasNoDispatchBoundary, true);
assert.equal(report.rows[0].renderedCard?.shapeChecks.hasSideSpecificInvalidation, true);
assert.equal(report.rows[0].renderedCard?.shapeChecks.hasGenericBelowAboveWording, false);
assert.match(report.rows[0].renderedCard?.content || '', /\[HELD-LOCAL REVIEW\] MES - LONG ACTIVE_REVIEW/);
assert.match(report.rows[0].renderedCard?.content || '', /What:/);
assert.match(report.rows[0].renderedCard?.content || '', /Where:/);
assert.match(report.rows[0].renderedCard?.content || '', /When:/);
assert.match(report.rows[0].renderedCard?.content || '', /Why:/);
assert.match(report.rows[0].renderedCard?.content || '', /Invalidation:/);
assert.match(report.rows[0].renderedCard?.content || '', /Local preview only; not posted to Discord and not written to Supabase/);
assert.match(report.markdown, /Rendered cards: 1/);

const dispatchBreak = structuredClone(previewPayloadReport) as UnifiedPositiveHeldLocalPreviewPayloadReport;
if (dispatchBreak.rows[0].payload) dispatchBreak.rows[0].payload.shouldDispatch = true as false;
const dispatchBreakReport: UnifiedPositiveHeldLocalPreviewRendererReport = buildUnifiedPositiveHeldLocalPreviewRendererReport({
  previewPayloadReport: dispatchBreak,
}, '2026-07-16T00:02:00.000Z');

assert.equal(dispatchBreakReport.status, 'fail');
assert.equal(dispatchBreakReport.summary.renderedCards, 0);
assert.equal(dispatchBreakReport.summary.blockedRows, 1);
assert.ok(dispatchBreakReport.rows[0].blockers.includes('payload shouldDispatch is not false'));

const wordingBreak = structuredClone(previewPayloadReport) as UnifiedPositiveHeldLocalPreviewPayloadReport;
if (wordingBreak.rows[0].payload) {
  wordingBreak.rows[0].payload.sections.invalidation = 'Invalid below/above the protected 5M stop line at 96.00.';
}
const wordingBreakReport = buildUnifiedPositiveHeldLocalPreviewRendererReport({
  previewPayloadReport: wordingBreak,
}, '2026-07-16T00:03:00.000Z');

assert.equal(wordingBreakReport.status, 'fail');
assert.equal(wordingBreakReport.summary.renderedCards, 0);
assert.equal(wordingBreakReport.summary.blockedRows, 1);
assert.ok(wordingBreakReport.rows[0].blockers.includes('rendered card is missing side-specific invalidation'));
assert.ok(wordingBreakReport.rows[0].blockers.includes('rendered card contains generic below/above wording'));

console.log('unified positive held-local preview renderer verified.');
