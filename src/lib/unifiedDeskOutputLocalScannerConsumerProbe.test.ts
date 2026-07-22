import assert from 'node:assert/strict';
import {
  buildUnifiedDeskOutputLocalScannerConsumerProbe,
  type UnifiedDeskOutputNormalScannerSnapshot,
} from './unifiedDeskOutputLocalScannerConsumerProbe';
import type { UnifiedDeskOutputDisabledE2ERuntimeValidationReport } from './unifiedDeskOutputDisabledScannerRuntime';

const normalScannerOutput = {
  sourceOfTruth: 'normal_scanner_output_preserved',
  scannerEventsRead: 81,
  normalShouldPostRows: 7,
  normalCanExecuteTrueRows: 3,
  normalDiscordSendRows: 2,
} satisfies UnifiedDeskOutputNormalScannerSnapshot;

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
    model: 'HtfDisplacementFvgContinuation',
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

const defaultOff = buildUnifiedDeskOutputLocalScannerConsumerProbe({
  explicitLocalPreviewFlag: false,
  localHost: true,
  disabledE2EReport: e2eReport,
  normalScannerOutput,
});
assert.equal(defaultOff.status, 'disabled');
assert.equal(defaultOff.summary.scannerPreviewAllowed, false);
assert.equal(defaultOff.summary.scannerPreviewRows, 0);
assert.equal(defaultOff.summary.normalScannerEventsRead, 81);
assert.equal(defaultOff.summary.normalCanExecuteTrueRowsPreserved, 3);
assert.equal(defaultOff.summary.canExecuteTrueRows, 0);
assert.equal(defaultOff.authority.changesNormalScannerOutput, false);

const ready = buildUnifiedDeskOutputLocalScannerConsumerProbe({
  explicitLocalPreviewFlag: true,
  localHost: true,
  disabledE2EReport: e2eReport,
  normalScannerOutput,
});
assert.equal(ready.status, 'ready');
assert.equal(ready.summary.scannerPreviewAllowed, true);
assert.equal(ready.summary.scannerPreviewRows, 2);
assert.equal(ready.summary.morningRows, 1);
assert.equal(ready.summary.lunchRows, 1);
assert.equal(ready.summary.normalShouldPostRowsPreserved, 7);
assert.equal(ready.summary.normalCanExecuteTrueRowsPreserved, 3);
assert.equal(ready.summary.discordPostRows, 0);
assert.equal(ready.summary.supabaseWriteRows, 0);
assert.equal(ready.summary.liveBridgeReadRows, 0);
assert.equal(ready.summary.canExecuteTrueRows, 0);
assert.equal(ready.summary.canExecuteChangedRows, 0);
assert.equal(ready.summary.tradingLogicChangedRows, 0);

const remote = buildUnifiedDeskOutputLocalScannerConsumerProbe({
  explicitLocalPreviewFlag: true,
  localHost: false,
  disabledE2EReport: e2eReport,
  normalScannerOutput,
});
assert.equal(remote.status, 'blocked');
assert.equal(remote.summary.scannerPreviewAllowed, false);
assert.ok(remote.blockers.includes('Disabled scanner runtime preview status is blocked.'));
assert.ok(remote.blockers.includes('Disabled scanner runtime preview is allowed only on localhost.'));

const dirty = structuredClone(e2eReport) as UnifiedDeskOutputDisabledE2ERuntimeValidationReport;
dirty.summary.liveBridgeReadRows = 1;
const blocked = buildUnifiedDeskOutputLocalScannerConsumerProbe({
  explicitLocalPreviewFlag: true,
  localHost: true,
  disabledE2EReport: dirty,
  normalScannerOutput,
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.scannerPreviewAllowed, false);
assert.ok(blocked.blockers.includes('Disabled E2E report has live bridge read rows.'));

console.log('Unified Desk Output local scanner consumer probe verified.');
