import assert from 'node:assert/strict';
import { buildFiveModelDiscordOneRowProductionRehearsalReport } from './five-model-discord-one-row-production-rehearsal';

const approvalPhrase = 'I approve exactly one five-model Discord production rehearsal for the manifest candidate and idempotency key.';

const manifest = {
  reportType: 'five_model_discord_one_row_rehearsal_manifest',
  status: 'pass',
  selectedCandidate: {
    candidateId: 'five-model-discord-rehearsal|abc123',
    sourceCardId: 'five-model-card-1',
    idempotencyKey: 'five-model-discord-production-rehearsal:def456',
    approvalPhrase,
    productionWebhookEnabledNow: false as const,
    payloadPreview: {
      username: 'Quant Desk',
      content: '[DRY RUN] Approved Desk Plan | LUNCH | SHORT | Raid Failure Displacement Reversal',
      embeds: [],
    },
  },
  summary: {
    recommendation: 'ready_for_exactly_one_five_model_discord_rehearsal_approval',
    candidateSelectedRows: 1,
    payloadSelectedRows: 1,
    discordPostRows: 0,
    webhookCallRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    canExecuteChangedRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
  },
  blockers: [],
};

const disabled = buildFiveModelDiscordOneRowProductionRehearsalReport({
  manifestPath: 'manifest.json',
  manifest,
  candidateId: 'five-model-discord-rehearsal|abc123',
  idempotencyKey: 'five-model-discord-production-rehearsal:def456',
  explicitApprovalFlagPresent: true,
  approvalPhrase,
  executeProductionWebhook: false,
}, '2026-07-26T22:00:00.000Z');

assert.equal(disabled.reportType, 'five_model_discord_one_row_production_rehearsal_disabled_sender');
assert.equal(disabled.status, 'pass');
assert.equal(disabled.authority.localOnly, true);
assert.equal(disabled.authority.productionSendArmed, false);
assert.equal(disabled.authority.postsDiscord, false);
assert.equal(disabled.authority.webhookCalls, 0);
assert.equal(disabled.authority.writesSupabase, false);
assert.equal(disabled.authority.readsLiveSupabase, false);
assert.equal(disabled.authority.readsLiveBridge, false);
assert.equal(disabled.authority.printsSecretValues, false);
assert.equal(disabled.authority.changesScannerBehavior, false);
assert.equal(disabled.authority.changesTradingLogic, false);
assert.equal(disabled.authority.changesCanExecute, false);
assert.equal(disabled.authority.canExecute, false);
assert.equal(disabled.authority.automatedOrders, false);
assert.equal(disabled.contract.oneRowCap, true);
assert.equal(disabled.contract.candidateMatched, true);
assert.equal(disabled.contract.idempotencyKeyMatched, true);
assert.equal(disabled.contract.duplicateProductionReceiptFound, false);
assert.equal(disabled.contract.productionSendBlockedReason, 'disabled_sender_contract_only');
assert.equal(disabled.summary.candidateSelectedRows, 1);
assert.equal(disabled.summary.payloadSelectedRows, 1);
assert.equal(disabled.summary.discordPostRows, 0);
assert.equal(disabled.summary.webhookCallRows, 0);
assert.equal(disabled.summary.canExecuteTrueRows, 0);
assert.equal(disabled.summary.recommendation, 'ready_for_exactly_one_five_model_production_discord_execution');
assert.equal(disabled.receipt.discordMessageId, null);
assert.equal(disabled.receipt.payloadCopiedFromManifest, true);
assert.deepEqual(disabled.blockers, []);

const receipt = buildFiveModelDiscordOneRowProductionRehearsalReport({
  manifestPath: 'manifest.json',
  manifest,
  candidateId: 'five-model-discord-rehearsal|abc123',
  idempotencyKey: 'five-model-discord-production-rehearsal:def456',
  explicitApprovalFlagPresent: true,
  approvalPhrase,
  executeProductionWebhook: true,
  discordMessageId: '1234567890',
});

assert.equal(receipt.reportType, 'five_model_discord_one_row_production_rehearsal_receipt');
assert.equal(receipt.authority.localOnly, false);
assert.equal(receipt.authority.productionSendArmed, true);
assert.equal(receipt.authority.postsDiscord, true);
assert.equal(receipt.authority.webhookCalls, 1);
assert.equal(receipt.summary.discordPostRows, 1);
assert.equal(receipt.summary.webhookCallRows, 1);
assert.equal(receipt.summary.supabaseWriteRows, 0);
assert.equal(receipt.summary.liveBridgeReadRows, 0);
assert.equal(receipt.summary.canExecuteTrueRows, 0);
assert.equal(receipt.receipt.discordMessageId, '1234567890');

const blocked = buildFiveModelDiscordOneRowProductionRehearsalReport({
  manifestPath: 'manifest.json',
  manifest,
  candidateId: 'wrong',
  idempotencyKey: 'wrong',
  explicitApprovalFlagPresent: false,
  approvalPhrase: null,
  executeProductionWebhook: false,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.candidateSelectedRows, 0);
assert.equal(blocked.summary.payloadSelectedRows, 0);
assert.equal(blocked.summary.webhookCallRows, 0);
assert.ok(blocked.blockers.includes('Requested candidate id does not match manifest.'));
assert.ok(blocked.blockers.includes('Requested idempotency key does not match manifest.'));
assert.ok(blocked.blockers.includes('Explicit approval flag is missing.'));

const duplicate = buildFiveModelDiscordOneRowProductionRehearsalReport({
  manifestPath: 'manifest.json',
  manifest,
  candidateId: 'five-model-discord-rehearsal|abc123',
  idempotencyKey: 'five-model-discord-production-rehearsal:def456',
  explicitApprovalFlagPresent: true,
  approvalPhrase,
  executeProductionWebhook: false,
  duplicateProductionReceiptFound: true,
});

assert.equal(duplicate.status, 'blocked');
assert.equal(duplicate.contract.duplicateProductionReceiptFound, true);
assert.ok(duplicate.blockers.includes('A production receipt already exists for this idempotency key.'));

console.log('five-model Discord one-row production rehearsal sender verified');
