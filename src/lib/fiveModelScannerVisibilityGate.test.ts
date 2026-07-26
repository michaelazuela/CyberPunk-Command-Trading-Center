import assert from 'node:assert/strict';
import {
  evaluateFiveModelScannerVisibilityGate,
  type FiveModelScannerVisibilityContractReport,
} from './fiveModelScannerVisibilityGate';

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

const disabled = evaluateFiveModelScannerVisibilityGate({
  explicitProductionApproval: false,
  contract,
});

assert.equal(disabled.status, 'disabled');
assert.equal(disabled.scannerVisibilityAllowed, false);
assert.equal(disabled.publishDiscord, false);
assert.equal(disabled.writesSupabase, false);
assert.equal(disabled.readsLiveBridge, false);
assert.equal(disabled.canExecute, false);
assert.equal(disabled.changesTradingLogic, false);
assert.equal(disabled.changesCanExecute, false);
assert.equal(disabled.automatedOrders, false);
assert.equal(disabled.candidates.length, 0);
assert.ok(disabled.blockers.includes('Five-model scanner visibility requires explicit production approval.'));

const allowed = evaluateFiveModelScannerVisibilityGate({
  explicitProductionApproval: true,
  contract,
});

assert.equal(allowed.status, 'allowed');
assert.equal(allowed.scannerVisibilityAllowed, true);
assert.equal(allowed.publishDiscord, false);
assert.equal(allowed.writesSupabase, false);
assert.equal(allowed.readsLiveSupabase, false);
assert.equal(allowed.readsLiveBridge, false);
assert.equal(allowed.canExecute, false);
assert.equal(allowed.changesTradingLogic, false);
assert.equal(allowed.changesCanExecute, false);
assert.equal(allowed.automatedOrders, false);
assert.equal(allowed.candidates.length, 2);
assert.deepEqual(allowed.blockers, []);

const dirty = structuredClone(contract);
dirty.summary.discordPostRows = 1;
const blocked = evaluateFiveModelScannerVisibilityGate({
  explicitProductionApproval: true,
  contract: dirty,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.scannerVisibilityAllowed, false);
assert.equal(blocked.candidates.length, 0);
assert.ok(blocked.blockers.some((blocker) => blocker.includes('Discord-post rows')));

console.log('five-model scanner visibility gate verified');
