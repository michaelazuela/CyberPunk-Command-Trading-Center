import assert from 'node:assert/strict';
import {
  buildUnifiedDeskOutputDisabledScannerRuntimeWiringReport,
} from './unified-desk-output-disabled-scanner-runtime-wiring';
import type {
  UnifiedDeskOutputDisabledE2ERuntimeValidationReport,
} from '../../src/lib/unifiedDeskOutputDisabledScannerRuntime';

const e2eReport = {
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
    model: 'NoInstalledSetup',
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
    model: 'NoInstalledSetup',
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

const report = buildUnifiedDeskOutputDisabledScannerRuntimeWiringReport({
  disabledE2EReportPath: 'disabled-e2e.json',
  disabledE2EReport: e2eReport,
});
assert.equal(report.status, 'pass');
assert.equal(report.summary.defaultStatus, 'disabled');
assert.equal(report.summary.localPreviewStatus, 'ready');
assert.equal(report.summary.defaultScannerPreviewRows, 0);
assert.equal(report.summary.localScannerPreviewRows, 2);
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.runtimeGateEnabled, false);
assert.equal(report.summary.scannerRuntimeChangedRows, 0);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_local_scanner_runtime_consumer_probe');
assert.deepEqual(report.blockers, []);

const dirty = structuredClone(e2eReport) as UnifiedDeskOutputDisabledE2ERuntimeValidationReport;
dirty.summary.canExecuteTrueRows = 1;
const blocked = buildUnifiedDeskOutputDisabledScannerRuntimeWiringReport({
  disabledE2EReportPath: 'dirty.json',
  disabledE2EReport: dirty,
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.localPreviewStatus, 'blocked');
assert.ok(blocked.blockers.includes('Explicit local scanner preview status is blocked.'));
assert.ok(blocked.blockers.includes('Disabled E2E report has canExecute=true rows.'));

console.log('Unified Desk Output disabled scanner runtime wiring verified.');
