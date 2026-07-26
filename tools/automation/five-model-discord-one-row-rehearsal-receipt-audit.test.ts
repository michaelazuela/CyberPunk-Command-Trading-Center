import assert from 'node:assert/strict';
import { buildFiveModelDiscordOneRowRehearsalReceiptAuditReport } from './five-model-discord-one-row-rehearsal-receipt-audit';

const manifestPath = 'manifest.json';
const idempotencyKey = 'five-model-discord-production-rehearsal:def456';
const candidateId = 'five-model-discord-rehearsal|abc123';

const manifest = {
  reportType: 'five_model_discord_one_row_rehearsal_manifest',
  status: 'pass',
  selectedCandidate: {
    candidateId,
    sourceCardId: 'five-model-card-1',
    idempotencyKey,
    payloadPreview: {
      content: '[DRY RUN] Approved Desk Plan | LUNCH | SHORT | Raid Failure Displacement Reversal',
    },
  },
  summary: {
    candidateSelectedRows: 1,
    payloadSelectedRows: 1,
  },
  blockers: [],
};

const receipt = {
  reportType: 'five_model_discord_one_row_production_rehearsal_receipt',
  status: 'pass',
  source: { manifestPath },
  request: {
    candidateId,
    idempotencyKey,
    explicitApprovalFlagPresent: true,
    explicitApprovalPhrasePresent: true,
    executeProductionWebhook: true,
  },
  contract: {
    manifestMatched: true,
    oneRowCap: true,
    candidateMatched: true,
    idempotencyKeyMatched: true,
    duplicateProductionReceiptFound: false,
    productionSendArmed: true,
  },
  summary: {
    candidateSelectedRows: 1,
    payloadSelectedRows: 1,
    discordPostRows: 1,
    webhookCallRows: 1,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    canExecuteChangedRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
  },
  receipt: {
    discordMessageId: '1234567890',
    webhookWaitReadback: true,
    idempotencyKey,
    payloadCopiedFromManifest: true,
    secretValuesPrinted: false as const,
  },
  blockers: [],
};

const report = buildFiveModelDiscordOneRowRehearsalReceiptAuditReport({
  manifestPath,
  manifest,
  receiptPath: 'receipt.json',
  receipt,
}, '2026-07-26T23:00:00.000Z');

assert.equal(report.reportType, 'five_model_discord_one_row_rehearsal_receipt_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.webhookCalls, 0);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.printsSecretValues, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.canExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.verifiedReceipt.candidateId, candidateId);
assert.equal(report.verifiedReceipt.sourceCardId, 'five-model-card-1');
assert.equal(report.verifiedReceipt.idempotencyKey, idempotencyKey);
assert.equal(report.verifiedReceipt.discordMessageIdPresent, true);
assert.equal(report.verifiedReceipt.payloadPreviewCompared, true);
assert.equal(report.summary.manifestPassed, true);
assert.equal(report.summary.receiptAccepted, true);
assert.equal(report.summary.candidateSelectedRows, 1);
assert.equal(report.summary.payloadSelectedRows, 1);
assert.equal(report.summary.discordPostRows, 1);
assert.equal(report.summary.webhookCallRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.duplicateReceiptRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_guarded_live_lane_closeout');
assert.deepEqual(report.blockers, []);

const disabledReceipt = structuredClone(receipt) as any;
disabledReceipt.reportType = 'five_model_discord_one_row_production_rehearsal_disabled_sender';
disabledReceipt.summary.discordPostRows = 0;
disabledReceipt.summary.webhookCallRows = 0;
disabledReceipt.receipt.discordMessageId = null;
const blocked = buildFiveModelDiscordOneRowRehearsalReceiptAuditReport({
  manifestPath,
  manifest,
  receiptPath: 'disabled.json',
  receipt: disabledReceipt,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.receiptAccepted, false);
assert.equal(blocked.summary.candidateSelectedRows, 0);
assert.equal(blocked.summary.discordPostRows, 0);
assert.ok(blocked.blockers.includes('Receipt report type is invalid.'));
assert.ok(blocked.blockers.includes('Receipt does not prove exactly one webhook call.'));
assert.ok(blocked.blockers.includes('Receipt has no Discord message id.'));

const duplicateReceipt = structuredClone(receipt) as any;
duplicateReceipt.contract.duplicateProductionReceiptFound = true;
const duplicateBlocked = buildFiveModelDiscordOneRowRehearsalReceiptAuditReport({
  manifestPath,
  manifest,
  receiptPath: 'duplicate.json',
  receipt: duplicateReceipt,
});

assert.equal(duplicateBlocked.status, 'blocked');
assert.equal(duplicateBlocked.summary.duplicateReceiptRows, 1);
assert.ok(duplicateBlocked.blockers.includes('Receipt reported duplicate idempotency state.'));

console.log('five-model Discord one-row rehearsal receipt audit verified');
