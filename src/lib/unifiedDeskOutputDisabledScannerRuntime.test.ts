import assert from 'node:assert/strict';
import {
  buildUnifiedDeskOutputDisabledScannerRuntimePreview,
  type UnifiedDeskOutputDisabledE2ERuntimeValidationReport,
} from './unifiedDeskOutputDisabledScannerRuntime';

const report = {
  reportType: 'unified_desk_output_disabled_e2e_runtime_validation',
  status: 'pass',
  authority: {
    localOnly: true,
    readsSavedScannerArtifactsOnly: true,
    writesDiagnosticArtifactsOnly: true,
    runtimeGateEnabled: false,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    automatedOrders: false,
  },
  summary: {
    manifestSelectedRows: 2,
    runtimeReceiptSelectedRows: 2,
    morningRows: 1,
    lunchRows: 1,
    runtimeGateEnabled: false,
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
    recommendation: 'ready_for_disabled_scanner_runtime_wiring',
  },
  selectedCandidates: [{
    cardId: 'morning-card',
    date: '2026-07-22',
    session: 'morning',
    state: 'APPROVED_DESK_PLAN',
    model: 'SweepMssFvgRetrace',
    direction: 'LONG',
    proofTime: '2026-07-22T09:10:00.0000000',
    entry: 7519.5,
    stop: 7515.25,
    target1: 7526,
    target2: 7528,
    riskPoints: 4.25,
    scannerVisibleIfExplicitGateApproved: true,
    discordEligibleIfSeparatelyApproved: true,
    supabaseEligibleIfSeparatelyApproved: true,
    canExecuteRemainsExternalGate: true,
  }, {
    cardId: 'lunch-card',
    date: '2026-07-22',
    session: 'lunch',
    state: 'APPROVED_DESK_PLAN',
    model: 'IntradayMssMicroContinuation',
    direction: 'LONG',
    proofTime: '2026-07-22T15:45:00.0000000',
    entry: 7540,
    stop: 7535.75,
    target1: 7546.5,
    target2: 7548.5,
    riskPoints: 4.25,
    scannerVisibleIfExplicitGateApproved: true,
    discordEligibleIfSeparatelyApproved: true,
    supabaseEligibleIfSeparatelyApproved: true,
    canExecuteRemainsExternalGate: true,
  }],
  blockers: [],
} satisfies UnifiedDeskOutputDisabledE2ERuntimeValidationReport;

const disabled = buildUnifiedDeskOutputDisabledScannerRuntimePreview({
  explicitLocalPreviewFlag: false,
  localHost: true,
  report,
});
assert.equal(disabled.status, 'disabled');
assert.equal(disabled.summary.scannerPreviewAllowed, false);
assert.equal(disabled.rows.length, 0);
assert.equal(disabled.authority.runtimeGateEnabled, false);
assert.equal(disabled.authority.postsDiscord, false);
assert.equal(disabled.authority.writesSupabase, false);
assert.equal(disabled.authority.canExecute, false);

const ready = buildUnifiedDeskOutputDisabledScannerRuntimePreview({
  explicitLocalPreviewFlag: true,
  localHost: true,
  report,
});
assert.equal(ready.status, 'ready');
assert.equal(ready.summary.scannerPreviewAllowed, true);
assert.equal(ready.summary.scannerPreviewRows, 2);
assert.equal(ready.summary.morningRows, 1);
assert.equal(ready.summary.lunchRows, 1);
assert.equal(ready.summary.discordPostRows, 0);
assert.equal(ready.summary.supabaseWriteRows, 0);
assert.equal(ready.summary.canExecuteTrueRows, 0);
assert.equal(ready.rows[0].headline, 'Approved Desk Plan | MORNING | LONG | SweepMssFvgRetrace');
assert.equal(ready.rows[1].model, 'IntradayMssMicroContinuation');

const remote = buildUnifiedDeskOutputDisabledScannerRuntimePreview({
  explicitLocalPreviewFlag: true,
  localHost: false,
  report,
});
assert.equal(remote.status, 'blocked');
assert.equal(remote.summary.scannerPreviewAllowed, false);
assert.ok(remote.blockers.includes('Disabled scanner runtime preview is allowed only on localhost.'));

const dirty = structuredClone(report) as UnifiedDeskOutputDisabledE2ERuntimeValidationReport;
dirty.summary.discordPostRows = 1;
const blocked = buildUnifiedDeskOutputDisabledScannerRuntimePreview({
  explicitLocalPreviewFlag: true,
  localHost: true,
  report: dirty,
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.rows.length, 0);
assert.ok(blocked.blockers.includes('Disabled E2E report has Discord post rows.'));

console.log('Unified Desk Output disabled scanner runtime preview verified.');
