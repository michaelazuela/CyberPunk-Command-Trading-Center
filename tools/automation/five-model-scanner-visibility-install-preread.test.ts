import assert from 'node:assert/strict';
import { buildFiveModelScannerVisibilityInstallPrereadReport } from './five-model-scanner-visibility-install-preread';

const blockedWordingPattern = new RegExp([
  ['human[- ]', 'review'].join(''),
  ['no ', 'chase'].join(''),
  ['mis', 'sed'].join(''),
  ['no-', 'trade'].join(''),
  ['no ', 'trade'].join(''),
].join('|'), 'i');

const executionRow = {
  date: '2026-06-22',
  session: 'morning' as const,
  stateLabel: 'Approved Desk Plan' as const,
  model: 'Drive Raid Continuation',
  direction: 'LONG' as const,
  scannerRuntimeWired: false as const,
  productionScannerVisibleNow: false as const,
  publishDiscord: false as const,
  writesSupabase: false as const,
  readsLiveSupabase: false as const,
  readsLiveBridge: false as const,
  canExecute: false as const,
  tradingLogicChanged: false as const,
  canExecuteChanged: false as const,
  automatedOrder: false as const,
};

const executionDryRun = {
  reportType: 'five_model_guarded_production_rehearsal_execution_dry_run',
  status: 'pass' as const,
  source: {
    manifestId: 'five-model-rehearsal-e1d4e355a9a3d4ec',
    idempotencySeed: 'e1d4e355a9a3d4ec',
  },
  executionReceipt: {
    rehearsalExecutionId: 'five-model-rehearsal-execution-d95cd1894a2f4597',
    idempotencyKey: 'five-model-rehearsal-execution-e1d4e355a9a3d4ec',
    sideEffectsExecuted: false,
    executedAction: 'one_local_production_rehearsal_execution_dry_run',
  },
  summary: {
    executionDryRunRows: 2,
    scannerRuntimeWiredRows: 0,
    productionScannerVisibleNowRows: 0,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    tradingLogicChangedRows: 0,
    canExecuteChangedRows: 0,
    automatedOrderRows: 0,
  },
  executionRows: [
    executionRow,
    { ...executionRow, session: 'lunch' as const, stateLabel: 'Forming Desk Read' as const },
  ],
  blockers: [],
};

const report = buildFiveModelScannerVisibilityInstallPrereadReport({
  executionDryRunPath: 'execution-dry-run.json',
  executionDryRun,
}, '2026-07-26T12:10:00.000Z');

assert.equal(report.reportType, 'five_model_scanner_visibility_install_preread');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.readsSavedExecutionDryRunOnly, true);
assert.equal(report.authority.writesDiagnosticArtifactsOnly, true);
assert.equal(report.authority.prereadOnly, true);
assert.equal(report.authority.installsRuntimeAdapter, false);
assert.equal(report.authority.scannerRuntimeWired, false);
assert.equal(report.authority.productionScannerVisibleNow, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.canExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.installMap.proposedRuntimeGateOwner, 'src/lib/fiveModelScannerVisibilityGate.ts');
assert.equal(report.installMap.proposedSurfaceShapeOwner, 'src/lib/unifiedDeskOutputScannerSurface.ts');
assert.equal(report.installMap.nextPatchAllowedScope, 'local_runtime_adapter_contract_only');
assert.equal(report.installMap.requiredApprovalBeforeRuntimeVisibility, 'explicit_five_model_scanner_visibility_install');
assert.equal(report.summary.executionDryRunRows, 2);
assert.equal(report.summary.approvedDeskPlanRows, 1);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.eveningRows, 0);
assert.equal(report.summary.requiredOwnerFilesMissing, 0);
assert.equal(report.summary.scannerRuntimeWiredRows, 0);
assert.equal(report.summary.productionScannerVisibleNowRows, 0);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveSupabaseReadRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.automatedOrderRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_local_runtime_adapter_contract');
assert.doesNotMatch(report.markdown, blockedWordingPattern);
assert.deepEqual(report.blockers, []);

const dirty = structuredClone(executionDryRun) as any;
dirty.summary.productionScannerVisibleNowRows = 1;
const blocked = buildFiveModelScannerVisibilityInstallPrereadReport({
  executionDryRunPath: 'execution-dry-run.json',
  executionDryRun: dirty,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.executionDryRunRows, 0);
assert.equal(blocked.summary.recommendation, 'hold_for_install_preread_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('production scanner-visible rows')));

console.log('five-model scanner visibility install preread verified');
