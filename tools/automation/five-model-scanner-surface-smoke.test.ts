import assert from 'node:assert/strict';
import { buildFiveModelScannerSurfaceSmokeReport } from './five-model-scanner-surface-smoke';
import type { FiveModelScannerVisibilityContractReport } from '../../src/lib/fiveModelScannerVisibilityGate';

const candidate = {
  contractId: 'five-model-visibility-contract|row-1',
  sourceAdapterId: 'row-1',
  date: '2026-06-22',
  session: 'morning' as const,
  stateLabel: 'Approved Desk Plan' as const,
  model: 'Drive Raid Continuation',
  direction: 'LONG' as const,
  headline: 'Approved Desk Plan | MORNING | LONG | Drive Raid Continuation',
  levelLine: 'Entry 7540.75 | Stop 7536.25 | T1 7547.50 | T2 7549.75',
  proofLine: 'Completed 5M proof: 10:15 ET.',
  scannerVisibilityIfExplicitlyApproved: true as const,
  discordRequiresSeparateApproval: true as const,
  supabaseRequiresSeparateApproval: true as const,
  bridgeReadsRemainDisabled: true as const,
  canExecuteRemainsExistingDeterministicGate: true as const,
  automatedOrdersRemainDisabled: true as const,
};

const contract: FiveModelScannerVisibilityContractReport = {
  reportType: 'five_model_guarded_scanner_visibility_contract',
  status: 'pass',
  authority: {
    localOnly: true,
    installsRuntimeAdapter: false,
    defaultDisabled: true,
    explicitProductionApprovalRequired: true,
    runtimeGateEnabled: false,
    productionGoLiveApproved: false,
    scannerRuntimeWired: false,
    scannerVisibleNow: false,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    canExecute: false,
    automatedOrders: false,
  },
  summary: {
    candidateRows: 2,
    approvedDeskPlanRows: 1,
    formingDeskReadRows: 1,
    runtimeGateEnabled: false,
    productionGoLiveApproved: false,
    scannerRuntimeWiredRows: 0,
    scannerVisibleNowRows: 0,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
    blockedRows: 0,
  },
  candidates: [
    candidate,
    { ...candidate, contractId: 'five-model-visibility-contract|row-2', sourceAdapterId: 'row-2', session: 'lunch' as const, stateLabel: 'Forming Desk Read' as const },
  ],
  blockers: [],
};

const adapterProof = {
  reportType: 'five_model_scanner_visibility_adapter_proof',
  status: 'pass' as const,
  summary: {
    defaultSurfaceRows: 0,
    explicitSurfaceRows: 2,
  },
  blockers: [],
};

const report = buildFiveModelScannerSurfaceSmokeReport({
  adapterProofPath: 'adapter-proof.json',
  adapterProof,
  visibilityContractPath: 'visibility-contract.json',
  visibilityContract: contract,
}, '2026-07-26T12:50:00.000Z');

assert.equal(report.reportType, 'five_model_scanner_surface_smoke');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.rendersScannerSurfaceOnly, true);
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
assert.equal(report.summary.renderedRows, 2);
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
assert.equal(report.summary.wordingViolationRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_explicit_runtime_visibility_decision');
assert.equal(report.surface.rows[0].stateLabel, 'Approved Desk Plan');
assert.equal(report.surface.rows[1].stateLabel, 'Forming Desk Read');
assert.deepEqual(report.blockers, []);

const dirtyProof = structuredClone(adapterProof) as any;
dirtyProof.summary.defaultSurfaceRows = 1;
const blocked = buildFiveModelScannerSurfaceSmokeReport({
  adapterProofPath: 'adapter-proof.json',
  adapterProof: dirtyProof,
  visibilityContractPath: 'visibility-contract.json',
  visibilityContract: contract,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.renderedRows, 0);
assert.equal(blocked.summary.recommendation, 'hold_for_five_model_surface_smoke_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('default path')));

console.log('five-model scanner surface smoke verified');
