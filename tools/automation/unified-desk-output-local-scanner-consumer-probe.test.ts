import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedDeskOutputLocalScannerConsumerProbeReport,
} from './unified-desk-output-local-scanner-consumer-probe';
import type {
  UnifiedDeskOutputDisabledE2ERuntimeValidationReport,
} from '../../src/lib/unifiedDeskOutputDisabledScannerRuntime';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'unified-desk-output-consumer-probe-'));
const tapePath = path.join(tmp, 'scanner-decision-tape-2026-07-22-MES-morning.json');
fs.writeFileSync(tapePath, JSON.stringify({
  events: {
    '2026-07-22T09:10:00.0000000': {
      plan: { canExecute: true },
      deskPublishDecision: { shouldPost: true, canExecute: false },
      discord: { shouldSend: true },
    },
    '2026-07-22T09:15:00.0000000': {
      plan: { canExecute: false },
      deskPublishDecision: { shouldPost: false, canExecute: false },
    },
  },
}, null, 2));

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

const report = buildUnifiedDeskOutputLocalScannerConsumerProbeReport({
  scannerAuditDir: tmp,
  tapePaths: [tapePath],
  disabledE2EReportPath: 'e2e.json',
  disabledE2EReport: e2eReport,
  instrument: 'MES',
  tradeDate: '2026-07-22',
  sessions: ['morning'],
});

assert.equal(report.status, 'pass');
assert.equal(report.summary.defaultStatus, 'disabled');
assert.equal(report.summary.localPreviewStatus, 'ready');
assert.equal(report.summary.defaultScannerPreviewRows, 0);
assert.equal(report.summary.localScannerPreviewRows, 2);
assert.equal(report.summary.normalScannerEventsRead, 2);
assert.equal(report.summary.normalShouldPostRowsPreserved, 1);
assert.equal(report.summary.normalCanExecuteTrueRowsPreserved, 1);
assert.equal(report.summary.normalDiscordSendRowsPreserved, 1);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_disabled_local_scanner_preview_render');
assert.deepEqual(report.blockers, []);

const missingTape = buildUnifiedDeskOutputLocalScannerConsumerProbeReport({
  scannerAuditDir: tmp,
  tapePaths: [],
  disabledE2EReportPath: 'e2e.json',
  disabledE2EReport: e2eReport,
  instrument: 'MES',
  tradeDate: '2026-07-22',
  sessions: ['morning'],
});
assert.equal(missingTape.status, 'blocked');
assert.ok(missingTape.blockers.includes('Missing one or more scanner decision tapes for requested sessions.'));

console.log('Unified Desk Output local scanner consumer probe report verified.');
