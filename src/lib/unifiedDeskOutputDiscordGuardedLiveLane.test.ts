import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputDiscordGuardedLiveLaneContract } from './unifiedDeskOutputDiscordGuardedLiveLane';

const acceptedAudit = {
  reportType: 'unified_desk_output_discord_post_receipt_audit',
  status: 'pass',
  summary: {
    receiptAccepted: true,
    webhookCallRows: 1,
    publishDiscordRows: 1,
    realPostAllowedRows: 1,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    payloadPreviewCompared: true,
  },
  blockers: [],
};

const contract = buildUnifiedDeskOutputDiscordGuardedLiveLaneContract(acceptedAudit);

assert.equal(contract.reportType, 'unified_desk_output_discord_guarded_live_lane_contract');
assert.equal(contract.status, 'pass');
assert.equal(contract.lane.enabledByDefault, false);
assert.deepEqual(contract.lane.allowedDeskStates, ['APPROVED_DESK_PLAN']);
assert.equal(contract.lane.maxPostsPerSession, 1);
assert.deepEqual(contract.lane.sessions, ['morning', 'lunch']);
assert.equal(contract.lane.requiresFreshManifest, true);
assert.equal(contract.lane.requiresFreshIdempotencyKey, true);
assert.equal(contract.lane.refusesDuplicateIdempotencyKey, true);
assert.equal(contract.authority.postsDiscordNow, false);
assert.equal(contract.authority.webhookCallRows, 0);
assert.equal(contract.authority.writesSupabase, false);
assert.equal(contract.authority.readsLiveBridge, false);
assert.equal(contract.authority.changesTradingLogic, false);
assert.equal(contract.authority.changesCanExecute, false);
assert.equal(contract.authority.automatedOrders, false);
assert.equal(contract.summary.recommendation, 'ready_for_disabled_guarded_live_lane_wiring');

const blocked = buildUnifiedDeskOutputDiscordGuardedLiveLaneContract({
  ...acceptedAudit,
  summary: {
    ...acceptedAudit.summary,
    webhookCallRows: 2,
  },
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_guarded_live_lane_contract_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('exactly one prior webhook call')));
