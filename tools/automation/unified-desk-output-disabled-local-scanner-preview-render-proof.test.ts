import assert from 'node:assert/strict';
import {
  buildUnifiedDeskOutputDisabledLocalScannerPreviewRenderProofReport,
} from './unified-desk-output-disabled-local-scanner-preview-render-proof';

const row = {
  cardId: 'morning-card',
  date: '2026-07-22',
  session: 'morning' as const,
  state: 'APPROVED_DESK_PLAN' as const,
  stateLabel: 'Approved Desk Plan' as const,
  model: 'SweepMssFvgRetrace',
  direction: 'LONG' as const,
  headline: 'Approved Desk Plan | MORNING | LONG | SweepMssFvgRetrace',
  bodyLines: [
    'morning long desk plan from the validated disabled runtime gate.',
    'SweepMssFvgRetrace is the selected scanner-owned lane for this window.',
  ],
  levelLine: 'Entry 7519.5 | Stop 7515.25 | T1 7526 | T2 7528',
  riskLine: 'Risk 4.25 points from scanner-owned entry/stop.',
  proofLine: 'Completed 5M proof: 09:10 ET.',
  invalidationLine: 'Invalid if price violates the protected 5M stop line at 7515.25.',
  authorityLine: 'Decision support only. Disabled scanner-runtime preview; Discord/Supabase/bridge/canExecute remain off.',
  scannerVisibleNow: true as const,
  publishDiscord: false as const,
  writesSupabase: false as const,
  readsLiveBridge: false as const,
  canExecute: false as const,
};

const consumerProbe: any = {
  reportType: 'unified_desk_output_local_scanner_consumer_probe_report' as const,
  status: 'pass' as const,
  authority: {
    localOnly: true as const,
    readsSavedScannerArtifactsOnly: true as const,
    readsSavedDisabledE2EReportOnly: true as const,
    writesDiagnosticArtifactsOnly: true as const,
    defaultDisabled: true as const,
    runtimeGateEnabled: false as const,
    postsDiscord: false as const,
    writesSupabase: false as const,
    readsLiveSupabase: false as const,
    readsLiveBridge: false as const,
    changesNormalScannerOutput: false as const,
    changesTradingLogic: false as const,
    changesCanExecute: false as const,
    canExecute: false as const,
    automatedOrders: false as const,
  },
  summary: {
    defaultStatus: 'disabled' as const,
    localPreviewStatus: 'ready' as const,
    defaultScannerPreviewRows: 0,
    localScannerPreviewRows: 2,
    morningRows: 1,
    lunchRows: 1,
    normalScannerEventsRead: 81,
    normalShouldPostRowsPreserved: 54,
    normalCanExecuteTrueRowsPreserved: 0,
    normalDiscordSendRowsPreserved: 1,
    runtimeGateEnabled: false as const,
    scannerRuntimeChangedRows: 0,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    canExecuteChangedRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
    blockedRows: 0,
    recommendation: 'ready_for_disabled_local_scanner_preview_render' as const,
  },
  defaultProbe: {},
  localProbe: {
    preview: {
      rows: [{
        ...row,
      }, {
        ...row,
        cardId: 'lunch-card',
        session: 'lunch' as const,
        model: 'IntradayMssMicroContinuation',
        headline: 'Approved Desk Plan | LUNCH | LONG | IntradayMssMicroContinuation',
        proofLine: 'Completed 5M proof: 15:45 ET.',
        levelLine: 'Entry 7540 | Stop 7535.75 | T1 7546.5 | T2 7548.5',
      }],
    },
  },
  blockers: [],
};

const report = buildUnifiedDeskOutputDisabledLocalScannerPreviewRenderProofReport({
  consumerProbePath: 'consumer-probe.json',
  consumerProbeReport: consumerProbe,
}, '2026-07-22T04:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_disabled_local_scanner_preview_render_install_proof');
assert.equal(report.status, 'pass');
assert.equal(report.summary.defaultStatus, 'disabled');
assert.equal(report.summary.localPreviewStatus, 'ready');
assert.equal(report.summary.defaultScannerPreviewRows, 0);
assert.equal(report.summary.renderedRows, 2);
assert.equal(report.summary.approvedDeskPlanRows, 2);
assert.equal(report.summary.formingDeskReadRows, 0);
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.hiddenPreviewImportReady, true);
assert.equal(report.summary.normalScannerEventsRead, 81);
assert.equal(report.summary.normalShouldPostRowsPreserved, 54);
assert.equal(report.summary.normalCanExecuteTrueRowsPreserved, 0);
assert.equal(report.summary.normalDiscordSendRowsPreserved, 1);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.automatedOrderRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_hidden_local_preview_import');
assert.equal(report.scannerSurfaceSmokeImportPayload?.reportType, 'unified_desk_output_scanner_surface_smoke');
assert.equal(report.scannerSurfaceSmokeImportPayload?.status, 'pass');
assert.equal(report.scannerSurfaceSmokeImportPayload?.summary.renderedRows, 2);
assert.equal(report.scannerSurfaceSmokeImportPayload?.surface.rows[0].model, 'SweepMssFvgRetrace');
assert.deepEqual(report.blockers, []);

const dirty = structuredClone(consumerProbe);
dirty.localProbe.preview.rows[0].publishDiscord = true as false;
const blocked = buildUnifiedDeskOutputDisabledLocalScannerPreviewRenderProofReport({
  consumerProbePath: 'consumer-probe.json',
  consumerProbeReport: dirty,
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.hiddenPreviewImportReady, false);
assert.ok(blocked.blockers.includes('Scanner surface import payload would publish Discord.'));

console.log('Unified Desk Output disabled local scanner preview render proof verified.');
