import assert from 'node:assert/strict';
import { buildFiveModelDiscordProductionRehearsalCloseoutReport } from './five-model-discord-production-rehearsal-closeout';

const manifestPath = 'manifest.json';
const disabledSenderPath = 'disabled.json';
const receiptAuditPath = 'receipt-audit.json';
const candidateId = 'five-model-discord-rehearsal|abc123';
const idempotencyKey = 'five-model-discord-production-rehearsal:def456';
const approvalPhrase = 'I approve exactly one five-model Discord production rehearsal for the manifest candidate and idempotency key.';

const manifest = {
  reportType: 'five_model_discord_one_row_rehearsal_manifest',
  status: 'pass',
  selectedCandidate: {
    candidateId,
    sourceCardId: 'five-model-card-1',
    idempotencyKey,
    approvalPhrase,
  },
  summary: {
    candidateSelectedRows: 1,
    payloadSelectedRows: 1,
  },
  blockers: [],
};

const disabledSender = {
  reportType: 'five_model_discord_one_row_production_rehearsal_disabled_sender',
  status: 'pass',
  source: { manifestPath },
  request: {
    candidateId,
    idempotencyKey,
    explicitApprovalFlagPresent: true,
    explicitApprovalPhrasePresent: true,
    executeProductionWebhook: false,
  },
  contract: {
    candidateMatched: true,
    idempotencyKeyMatched: true,
    duplicateProductionReceiptFound: false,
    productionSendArmed: false,
  },
  summary: {
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

const receiptAudit = {
  reportType: 'five_model_discord_one_row_rehearsal_receipt_audit',
  status: 'pass',
  source: {
    manifestPath,
    receiptPath: 'receipt.json',
  },
  verifiedReceipt: {
    candidateId,
    sourceCardId: 'five-model-card-1',
    idempotencyKey,
    discordMessageIdPresent: true,
    payloadPreviewCompared: true,
  },
  summary: {
    receiptAccepted: true,
    discordPostRows: 1,
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

const awaiting = buildFiveModelDiscordProductionRehearsalCloseoutReport({
  manifestPath,
  manifest,
  disabledSenderPath,
  disabledSender,
}, '2026-07-26T23:30:00.000Z');

assert.equal(awaiting.reportType, 'five_model_discord_production_rehearsal_closeout');
assert.equal(awaiting.status, 'pass');
assert.equal(awaiting.closeoutState, 'awaiting_explicit_discord_execution');
assert.equal(awaiting.authority.localOnly, true);
assert.equal(awaiting.authority.postsDiscord, false);
assert.equal(awaiting.authority.webhookCalls, 0);
assert.equal(awaiting.authority.writesSupabase, false);
assert.equal(awaiting.authority.readsLiveSupabase, false);
assert.equal(awaiting.authority.readsLiveBridge, false);
assert.equal(awaiting.authority.printsSecretValues, false);
assert.equal(awaiting.authority.changesTradingLogic, false);
assert.equal(awaiting.authority.changesCanExecute, false);
assert.equal(awaiting.authority.automatedOrders, false);
assert.equal(awaiting.selectedCandidate.candidateId, candidateId);
assert.equal(awaiting.selectedCandidate.idempotencyKey, idempotencyKey);
assert.equal(awaiting.runbook.approvalRequiredBeforeWebhook, true);
assert.equal(awaiting.runbook.exactApprovalPhrase, approvalPhrase);
assert.match(awaiting.runbook.exactExecutionCommand || '', /--execute-production-webhook/);
assert.match(awaiting.runbook.receiptAuditCommand || '', /five-model-discord-one-row-rehearsal-receipt-audit/);
assert.equal(awaiting.summary.candidateSelectedRows, 1);
assert.equal(awaiting.summary.payloadSelectedRows, 1);
assert.equal(awaiting.summary.productionReceiptAcceptedRows, 0);
assert.equal(awaiting.summary.discordPostRows, 0);
assert.equal(awaiting.summary.webhookCallRows, 0);
assert.equal(awaiting.summary.supabaseWriteRows, 0);
assert.equal(awaiting.summary.liveBridgeReadRows, 0);
assert.equal(awaiting.summary.canExecuteTrueRows, 0);
assert.equal(awaiting.summary.recommendation, 'awaiting_explicit_discord_execution');
assert.deepEqual(awaiting.blockers, []);

const complete = buildFiveModelDiscordProductionRehearsalCloseoutReport({
  manifestPath,
  manifest,
  disabledSenderPath,
  disabledSender,
  receiptAuditPath,
  receiptAudit,
});

assert.equal(complete.status, 'pass');
assert.equal(complete.closeoutState, 'ready_for_final_handoff');
assert.equal(complete.runbook.approvalRequiredBeforeWebhook, false);
assert.equal(complete.summary.receiptAuditPassed, true);
assert.equal(complete.summary.productionReceiptAcceptedRows, 1);
assert.equal(complete.summary.observedReceiptDiscordPostRows, 1);
assert.equal(complete.summary.observedReceiptWebhookCallRows, 1);
assert.equal(complete.summary.discordPostRows, 0);
assert.equal(complete.summary.webhookCallRows, 0);
assert.equal(complete.summary.recommendation, 'ready_for_final_handoff');
assert.deepEqual(complete.blockers, []);

const driftedSender = structuredClone(disabledSender) as any;
driftedSender.request.idempotencyKey = 'wrong-key';
const blocked = buildFiveModelDiscordProductionRehearsalCloseoutReport({
  manifestPath,
  manifest,
  disabledSenderPath,
  disabledSender: driftedSender,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.closeoutState, 'hold_for_closeout_fix');
assert.equal(blocked.summary.candidateSelectedRows, 0);
assert.ok(blocked.blockers.includes('Disabled sender idempotency key does not match manifest.'));

const badReceiptAudit = structuredClone(receiptAudit) as any;
badReceiptAudit.summary.canExecuteTrueRows = 1;
const receiptBlocked = buildFiveModelDiscordProductionRehearsalCloseoutReport({
  manifestPath,
  manifest,
  disabledSenderPath,
  disabledSender,
  receiptAuditPath,
  receiptAudit: badReceiptAudit,
});

assert.equal(receiptBlocked.status, 'blocked');
assert.equal(receiptBlocked.closeoutState, 'hold_for_closeout_fix');
assert.ok(receiptBlocked.blockers.includes('Receipt audit has canExecute=true rows.'));

console.log('five-model Discord production rehearsal closeout verified');
