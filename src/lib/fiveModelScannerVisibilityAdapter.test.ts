import assert from 'node:assert/strict';
import {
  buildFiveModelScannerVisibilityAdapterModel,
} from './fiveModelScannerVisibilityAdapter';
import type { FiveModelScannerVisibilityContractReport } from './fiveModelScannerVisibilityGate';

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

const disabled = buildFiveModelScannerVisibilityAdapterModel({
  explicitProductionApproval: false,
  contract,
});

assert.equal(disabled.status, 'disabled');
assert.equal(disabled.scannerVisibleNow, false);
assert.equal(disabled.publishDiscord, false);
assert.equal(disabled.writesSupabase, false);
assert.equal(disabled.readsLiveSupabase, false);
assert.equal(disabled.readsLiveBridge, false);
assert.equal(disabled.changesScannerBehavior, false);
assert.equal(disabled.changesTradingLogic, false);
assert.equal(disabled.changesCanExecute, false);
assert.equal(disabled.canExecute, false);
assert.equal(disabled.canExecuteChanged, false);
assert.equal(disabled.livePromotionAllowed, false);
assert.equal(disabled.noAutomatedOrders, true);
assert.equal(disabled.surface.rows.length, 0);

const ready = buildFiveModelScannerVisibilityAdapterModel({
  explicitProductionApproval: true,
  contract,
});

assert.equal(ready.status, 'ready');
assert.equal(ready.scannerVisibleNow, true);
assert.equal(ready.publishDiscord, false);
assert.equal(ready.shouldPostDiscord, false);
assert.equal(ready.shouldDispatch, false);
assert.equal(ready.writesSupabase, false);
assert.equal(ready.readsLiveSupabase, false);
assert.equal(ready.readsLiveBridge, false);
assert.equal(ready.changesScannerBehavior, false);
assert.equal(ready.changesTradingLogic, false);
assert.equal(ready.changesCanExecute, false);
assert.equal(ready.canExecute, false);
assert.equal(ready.canExecuteChanged, false);
assert.equal(ready.livePromotionAllowed, false);
assert.equal(ready.noAutomatedOrders, true);
assert.equal(ready.surface.status, 'ready');
assert.equal(ready.surface.rows.length, 2);
assert.equal(ready.surface.summary.approvedDeskPlans, 1);
assert.equal(ready.surface.summary.formingDeskReads, 1);
assert.equal(ready.surface.summary.discordPostRows, 0);
assert.equal(ready.surface.summary.supabaseWriteRows, 0);
assert.equal(ready.surface.summary.liveBridgeReadRows, 0);
assert.equal(ready.surface.summary.canExecuteTrueRows, 0);
assert.equal(ready.surface.summary.wordingViolationRows, 0);
assert.equal(ready.surface.rows[0].state, 'APPROVED_DESK_PLAN');
assert.equal(ready.surface.rows[1].state, 'FORMING_DESK_READ');
assert.deepEqual(ready.blockers, []);

const dirty = structuredClone(contract);
dirty.summary.canExecuteTrueRows = 1;
const blocked = buildFiveModelScannerVisibilityAdapterModel({
  explicitProductionApproval: true,
  contract: dirty,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.scannerVisibleNow, false);
assert.equal(blocked.surface.rows.length, 0);
assert.ok(blocked.blockers.some((blocker) => blocker.includes('canExecute=true rows')));

console.log('five-model scanner visibility adapter verified');
