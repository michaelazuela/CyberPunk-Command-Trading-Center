import assert from 'node:assert/strict';
import { evaluateUnifiedDeskOutputRuntimeGate, type UnifiedDeskOutputLocalGoLiveRehearsalGateReport } from './unifiedDeskOutputRuntimeGate';

const rehearsal: UnifiedDeskOutputLocalGoLiveRehearsalGateReport = {
  reportType: 'unified_desk_output_local_go_live_rehearsal',
  status: 'pass',
  authority: {
    localOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    automatedOrders: false,
  },
  summary: {
    previewRows: 276,
    approvedDeskPlanRows: 105,
    formingDeskReadRows: 171,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    wordingViolationRows: 0,
    blockedRows: 0,
  },
  blockers: [],
};

const disabled = evaluateUnifiedDeskOutputRuntimeGate({
  explicitLocalFlag: false,
  localHost: true,
  rehearsal,
});
assert.equal(disabled.status, 'disabled');
assert.equal(disabled.scannerPreviewAllowed, false);
assert.equal(disabled.publishDiscord, false);
assert.equal(disabled.writesSupabase, false);
assert.equal(disabled.canExecute, false);

const ready = evaluateUnifiedDeskOutputRuntimeGate({
  explicitLocalFlag: true,
  localHost: true,
  rehearsal,
});
assert.equal(ready.status, 'local_preview_allowed');
assert.equal(ready.scannerPreviewAllowed, true);
assert.equal(ready.publishDiscord, false);
assert.equal(ready.writesSupabase, false);
assert.equal(ready.readsLiveSupabase, false);
assert.equal(ready.readsLiveBridge, false);
assert.equal(ready.canExecute, false);
assert.equal(ready.changesTradingLogic, false);
assert.equal(ready.changesCanExecute, false);
assert.equal(ready.automatedOrders, false);
assert.deepEqual(ready.blockers, []);

const blockedRemote = evaluateUnifiedDeskOutputRuntimeGate({
  explicitLocalFlag: true,
  localHost: false,
  rehearsal,
});
assert.equal(blockedRemote.status, 'blocked');
assert.equal(blockedRemote.scannerPreviewAllowed, false);

const blockedSideEffect = evaluateUnifiedDeskOutputRuntimeGate({
  explicitLocalFlag: true,
  localHost: true,
  rehearsal: {
    ...rehearsal,
    summary: {
      ...rehearsal.summary,
      discordPostRows: 1,
    },
  },
});
assert.equal(blockedSideEffect.status, 'blocked');
assert.equal(blockedSideEffect.scannerPreviewAllowed, false);
assert.ok(blockedSideEffect.blockers.includes('Local rehearsal has Discord post rows.'));

console.log('Unified Desk Output runtime gate verified.');
