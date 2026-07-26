import assert from 'node:assert/strict';
import { buildFiveModelGuardedProductionRehearsalExecutionDryRunReport } from './five-model-guarded-production-rehearsal-execution-dry-run';

const manifestRow = {
  manifestRowId: 'five-model-production-rehearsal|row-1',
  sourceCardId: 'five-model-scanner-visibility-wiring|row-1',
  date: '2026-06-22',
  session: 'morning' as const,
  stateLabel: 'Approved Desk Plan' as const,
  model: 'Drive Raid Continuation',
  direction: 'LONG' as const,
  levelLine: 'Entry 7540.75 | Stop 7536.25 | T1 7547.50 | T2 7549.75',
  proofLine: 'Completed 5M proof: 10:15 ET.',
  productionScannerVisibilityRehearsalOnly: true as const,
  scannerVisibilityMayBeEnabledOnlyBySeparateGate: true as const,
  discordRequiresSeparateApproval: true as const,
  supabaseRequiresSeparateApproval: true as const,
  bridgeReadsRemainDisabled: true as const,
  canExecuteRemainsUnchanged: true as const,
  automatedOrdersRemainDisabled: true as const,
};

const manifest = {
  reportType: 'five_model_guarded_production_rehearsal_manifest',
  status: 'pass' as const,
  rehearsal: {
    manifestId: 'five-model-rehearsal-e1d4e355a9a3d4ec',
    idempotencySeed: 'e1d4e355a9a3d4ec',
    rollbackPlan: 'disable_five_model_scanner_visibility_gate_and_revert_to_previous_scanner_surface',
    requiredNextApproval: 'explicit_guarded_production_rehearsal_execution',
    allowedNextAction: 'one_local_production_rehearsal_execution_dry_run',
  },
  summary: {
    manifestRows: 2,
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
  manifestRows: [
    manifestRow,
    { ...manifestRow, manifestRowId: 'five-model-production-rehearsal|row-2', session: 'lunch' as const, stateLabel: 'Forming Desk Read' as const },
  ],
  blockers: [],
};

const report = buildFiveModelGuardedProductionRehearsalExecutionDryRunReport({
  manifestPath: 'manifest.json',
  manifest,
}, '2026-07-26T11:50:00.000Z');

assert.equal(report.reportType, 'five_model_guarded_production_rehearsal_execution_dry_run');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.readsSavedManifestOnly, true);
assert.equal(report.authority.writesDiagnosticArtifactsOnly, true);
assert.equal(report.authority.dryRunOnly, true);
assert.equal(report.authority.executesSideEffects, false);
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
assert.match(report.executionReceipt.rehearsalExecutionId, /^five-model-rehearsal-execution-/);
assert.equal(report.executionReceipt.idempotencyKey, 'five-model-rehearsal-execution-e1d4e355a9a3d4ec');
assert.equal(report.executionReceipt.rollbackPlanPresent, true);
assert.equal(report.executionReceipt.sideEffectsExecuted, false);
assert.equal(report.executionReceipt.executedAction, 'one_local_production_rehearsal_execution_dry_run');
assert.equal(report.summary.manifestRows, 2);
assert.equal(report.summary.executionDryRunRows, 2);
assert.equal(report.summary.approvedDeskPlanRows, 1);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.eveningRows, 0);
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
assert.equal(report.summary.recommendation, 'ready_for_scanner_visibility_install_preread');
assert.equal(report.executionRows.every((row) => row.scannerRuntimeWired === false), true);
assert.equal(report.executionRows.every((row) => row.publishDiscord === false), true);
assert.equal(report.executionRows.every((row) => row.writesSupabase === false), true);
assert.equal(report.executionRows.every((row) => row.readsLiveBridge === false), true);
assert.equal(report.executionRows.every((row) => row.canExecute === false), true);
assert.deepEqual(report.blockers, []);

const dirtyCounter = structuredClone(manifest) as any;
dirtyCounter.summary.discordPostRows = 1;
const blockedCounter = buildFiveModelGuardedProductionRehearsalExecutionDryRunReport({
  manifestPath: 'manifest.json',
  manifest: dirtyCounter,
});

assert.equal(blockedCounter.status, 'blocked');
assert.equal(blockedCounter.summary.executionDryRunRows, 0);
assert.equal(blockedCounter.summary.recommendation, 'hold_for_rehearsal_execution_contract_fix');
assert.ok(blockedCounter.blockers.some((blocker) => blocker.includes('Discord-post rows')));

const dirtyRow = structuredClone(manifest) as any;
dirtyRow.manifestRows[0].discordRequiresSeparateApproval = false;
const blockedRow = buildFiveModelGuardedProductionRehearsalExecutionDryRunReport({
  manifestPath: 'manifest.json',
  manifest: dirtyRow,
});

assert.equal(blockedRow.status, 'blocked');
assert.equal(blockedRow.summary.executionDryRunRows, 0);
assert.ok(blockedRow.blockers.some((blocker) => blocker.includes('Discord approval gate')));

console.log('five-model guarded production rehearsal execution dry run verified');
