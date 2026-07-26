import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputDiscordPostReceiptAuditReport } from './unified-desk-output-discord-post-receipt-audit';

const candidateId = 'unified-desk-output-disabled|2026-01-06|morning|APPROVED_DESK_PLAN|NoInstalledSetup|LONG|2026-01-06T09:35:00';
const idempotencyKey = `unified-desk-output:discord-one-row-rehearsal:${candidateId}`;

const receipt = {
  reportType: 'unified_desk_output_discord_one_row_production_publish_receipt',
  generatedAt: '2026-07-22T19:38:03.289Z',
  status: 'pass',
  authority: {
    postsDiscord: true,
    webhookCalls: 1,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    printsSecretValues: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    automatedOrders: false,
  },
  source: {
    finalLaunchManifestPath: 'fixture-manifest.json',
    finalLaunchManifestGeneratedAt: '2026-07-22T19:15:33.625Z',
  },
  request: {
    candidateId,
    idempotencyKey,
    explicitApprovalFlagPresent: true,
    explicitApprovalPhrasePresent: true,
  },
  summary: {
    manifestPassed: true,
    candidateMatched: true,
    idempotencyKeyMatched: true,
    explicitApprovalFlagPresent: true,
    explicitApprovalPhrasePresent: true,
    productionSendArmed: true,
    publishDiscordRows: 1,
    realPostAllowedRows: 1,
    webhookCallRows: 1,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    blockedRows: 0,
  },
  receipt: {
    discordMessageId: '1529573262068154513',
    webhookWaitReadback: true,
    payloadMatchedManifestCandidate: true,
    secretValuesPrinted: false as const,
  },
  blockers: [],
};

const manifest = {
  reportType: 'unified_desk_output_discord_final_launch_manifest',
  generatedAt: '2026-07-22T19:15:33.625Z',
  status: 'pass',
  source: {
    oneRowRehearsalPlanPath: 'fixture-rehearsal.json',
  },
  launchContract: {
    candidateId,
    idempotencyKey,
    oneRowCap: true,
    productionSendEnabledNow: false,
  },
};

const rehearsal = {
  reportType: 'unified_desk_output_discord_one_row_publish_rehearsal_plan',
  generatedAt: '2026-07-22T18:52:15.138Z',
  status: 'pass',
  rehearsalCandidate: {
    id: candidateId,
    idempotencyKey,
    payloadPreview: '**Approved Desk Plan**\nNoInstalledSetup LONG.',
    publishDiscord: false,
    webhookCalls: 0,
    canExecute: false,
  },
};

const report = buildUnifiedDeskOutputDiscordPostReceiptAuditReport({
  receiptPath: 'fixture-receipt.json',
  receipt,
  manifestPath: 'fixture-manifest.json',
  manifest,
  rehearsalPath: 'fixture-rehearsal.json',
  rehearsal,
}, '2026-07-22T20:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_discord_post_receipt_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.webhookCalls, 0);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.receiptAccepted, true);
assert.equal(report.summary.discordMessageIdPresent, true);
assert.equal(report.summary.webhookCallRows, 1);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.payloadPreviewCompared, true);
assert.equal(report.summary.recommendation, 'one_row_discord_rehearsal_accepted');

const blocked = buildUnifiedDeskOutputDiscordPostReceiptAuditReport({
  receiptPath: 'fixture-receipt.json',
  receipt: {
    ...receipt,
    summary: { ...receipt.summary, webhookCallRows: 2 },
  },
  manifestPath: 'fixture-manifest.json',
  manifest,
  rehearsalPath: 'fixture-rehearsal.json',
  rehearsal,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_receipt_audit_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('exactly one webhook call')));
