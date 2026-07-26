import assert from 'node:assert/strict';
import { buildFiveModelDisabledScannerUiAdapterRenderProof } from './five-model-disabled-scanner-ui-browser-adapter-preview';

const adapterRow = {
  adapterId: 'five-model-ui-adapter|five-model|row-1',
  sourceCardId: 'five-model|row-1',
  date: '2026-06-22',
  session: 'morning' as const,
  stateLabel: 'Approved Desk Plan' as const,
  model: 'Drive Raid Continuation',
  direction: 'LONG' as const,
  display: {
    headline: 'Approved Desk Plan | MORNING | LONG | Drive Raid Continuation',
    levelLine: 'Entry 7540.75 | Stop 7536.25 | T1 7547.50 | T2 7549.75',
    proofLine: 'Completed 5M proof: 10:15 ET.',
    authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off in this surface.',
  },
  runtimeGateEnabled: false as const,
  productionGoLiveApproved: false as const,
  scannerRuntimeWired: false as const,
  scannerVisibleNow: false as const,
  publishDiscord: false as const,
  writesSupabase: false as const,
  readsLiveSupabase: false as const,
  readsLiveBridge: false as const,
  changesTradingLogic: false as const,
  changesCanExecute: false as const,
  canExecute: false as const,
  automatedOrders: false as const,
};

const uiAdapterPreview = {
  reportType: 'five_model_disabled_scanner_ui_adapter_preview',
  status: 'pass' as const,
  summary: {
    adaptedRows: 2,
    runtimeGateEnabled: false,
    productionGoLiveApproved: false,
    scannerRuntimeWiredRows: 0,
    scannerVisibleRows: 0,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
  },
  adapterRows: [
    adapterRow,
    { ...adapterRow, adapterId: 'five-model-ui-adapter|five-model|row-2', sourceCardId: 'five-model|row-2', session: 'lunch' as const, stateLabel: 'Forming Desk Read' as const },
  ],
  blockers: [],
};

const renderProof = buildFiveModelDisabledScannerUiAdapterRenderProof({
  uiAdapterPreviewPath: 'ui-adapter.json',
  uiAdapterPreview,
}, '2026-07-26T09:00:00.000Z');

assert.equal(renderProof.reportType, 'unified_desk_output_disabled_local_scanner_preview_render_install_proof');
assert.equal(renderProof.status, 'pass');
assert.equal(renderProof.authority.localOnly, true);
assert.equal(renderProof.authority.producesHiddenPreviewImportPayload, true);
assert.equal(renderProof.authority.runtimeGateEnabled, false);
assert.equal(renderProof.authority.postsDiscord, false);
assert.equal(renderProof.authority.writesSupabase, false);
assert.equal(renderProof.authority.readsLiveBridge, false);
assert.equal(renderProof.authority.changesTradingLogic, false);
assert.equal(renderProof.authority.changesCanExecute, false);
assert.equal(renderProof.authority.canExecute, false);
assert.equal(renderProof.authority.automatedOrders, false);
assert.equal(renderProof.summary.hiddenPreviewImportReady, true);
assert.equal(renderProof.summary.renderedRows, 2);
assert.equal(renderProof.summary.approvedDeskPlanRows, 1);
assert.equal(renderProof.summary.formingDeskReadRows, 1);
assert.equal(renderProof.summary.discordPostRows, 0);
assert.equal(renderProof.summary.supabaseWriteRows, 0);
assert.equal(renderProof.summary.liveBridgeReadRows, 0);
assert.equal(renderProof.summary.canExecuteTrueRows, 0);
assert.equal(renderProof.summary.tradingLogicChangedRows, 0);
assert.equal(renderProof.summary.automatedOrderRows, 0);
assert.equal(renderProof.scannerSurfaceSmokeImportPayload?.reportType, 'unified_desk_output_scanner_surface_smoke');
assert.equal(renderProof.scannerSurfaceSmokeImportPayload?.status, 'pass');
assert.equal(renderProof.scannerSurfaceSmokeImportPayload?.surface.rows.length, 2);
assert.equal(renderProof.scannerSurfaceSmokeImportPayload?.surface.rows.every((row) => row.publishDiscord === false), true);
assert.equal(renderProof.scannerSurfaceSmokeImportPayload?.surface.rows.every((row) => row.canExecute === false), true);
assert.doesNotMatch(renderProof.markdown, /human[- ]review|no chase|missed|no[- ]trade/i);
assert.deepEqual(renderProof.blockers, []);

const dirty = structuredClone(uiAdapterPreview) as any;
dirty.summary.scannerVisibleRows = 1;
const blocked = buildFiveModelDisabledScannerUiAdapterRenderProof({
  uiAdapterPreviewPath: 'ui-adapter.json',
  uiAdapterPreview: dirty,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.hiddenPreviewImportReady, false);
assert.equal(blocked.scannerSurfaceSmokeImportPayload, null);
assert.ok(blocked.blockers.some((blocker) => blocker.includes('production scanner-visible rows')));

console.log('five-model disabled scanner UI browser adapter render proof verified');
