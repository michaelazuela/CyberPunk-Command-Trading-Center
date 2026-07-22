import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputDiscordOneRowProductionPublishDisabledSenderReport } from './unified-desk-output-discord-one-row-production-publish';

const manifestReport = {
  reportType: 'unified_desk_output_discord_final_launch_manifest' as const,
  generatedAt: '2026-07-22T21:00:00.000Z',
  status: 'pass' as const,
  authority: {
    localOnly: true as const,
    readsSavedWebhookTargetAuditOnly: true as const,
    readsSavedOneRowRehearsalPlanOnly: true as const,
    writesLaunchManifestOnly: true as const,
    postsDiscord: false as const,
    writesSupabase: false as const,
    readsLiveSupabase: false as const,
    readsLiveBridge: false as const,
    printsSecretValues: false as const,
    changesTradingLogic: false as const,
    changesCanExecute: false as const,
    automatedOrders: false as const,
  },
  source: {
    webhookTargetAuditPath: 'fixture-target.json',
    oneRowRehearsalPlanPath: 'fixture-rehearsal.json',
    webhookTargetAuditGeneratedAt: '2026-07-22T20:00:00.000Z',
    oneRowRehearsalPlanGeneratedAt: '2026-07-22T19:00:00.000Z',
  },
  launchContract: {
    commandExistsNow: false as const,
    proposedCommand: 'npx tsx tools/automation/unified-desk-output-discord-one-row-production-publish.ts',
    explicitApprovalPhrase: 'I approve exactly one Unified Desk Output Discord production publish rehearsal.' as const,
    candidateId: 'approved-fixture',
    idempotencyKey: 'unified-desk-output:discord-one-row-rehearsal:approved-fixture',
    route: 'production_discord_trade_plan_webhook' as const,
    oneRowCap: true as const,
    productionSendEnabledNow: false as const,
  },
  summary: {
    webhookTargetReady: true,
    rehearsalPlanReady: true,
    candidateSelectedRows: 1,
    commandExistsNow: false as const,
    productionSendEnabledNow: false as const,
    explicitApprovalPresent: false as const,
    shouldPostRows: 0,
    publishDiscordRows: 0,
    realPostAllowedRows: 0,
    webhookCallRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    readbackSteps: 2,
    rollbackSteps: 1,
    blockedRows: 0,
    recommendation: 'ready_to_install_disabled_one_row_sender' as const,
  },
  readbackSteps: ['Confirm one receipt.', 'Confirm no side effects.'],
  rollbackSteps: ['Do not rerun.'],
  blockers: [],
};

const report = buildUnifiedDeskOutputDiscordOneRowProductionPublishDisabledSenderReport({
  manifestPath: 'fixture-manifest.json',
  manifestReport,
  candidateId: 'approved-fixture',
  idempotencyKey: 'unified-desk-output:discord-one-row-rehearsal:approved-fixture',
  explicitApprovalFlagPresent: true,
  approvalPhrase: 'I approve exactly one Unified Desk Output Discord production publish rehearsal.',
}, '2026-07-22T22:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_discord_one_row_production_publish_disabled_sender');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.validatesOneRowSenderContractOnly, true);
assert.equal(report.authority.productionSendArmed, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.webhookCalls, 0);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.printsSecretValues, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.request.explicitApprovalFlagPresent, true);
assert.equal(report.request.explicitApprovalPhrasePresent, true);
assert.equal(report.contract.commandExistsNow, true);
assert.equal(report.contract.productionSendArmed, false);
assert.equal(report.contract.productionSendBlockedReason, 'disabled_sender_contract_only');
assert.equal(report.summary.manifestPassed, true);
assert.equal(report.summary.candidateMatched, true);
assert.equal(report.summary.idempotencyKeyMatched, true);
assert.equal(report.summary.explicitApprovalFlagPresent, true);
assert.equal(report.summary.explicitApprovalPhrasePresent, true);
assert.equal(report.summary.productionSendArmed, false);
assert.equal(report.summary.shouldPostRows, 0);
assert.equal(report.summary.publishDiscordRows, 0);
assert.equal(report.summary.realPostAllowedRows, 0);
assert.equal(report.summary.webhookCallRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveSupabaseReadRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_final_explicit_one_row_production_execution');
assert.match(report.markdown, /disabled sender contract only/i);

const receipt = buildUnifiedDeskOutputDiscordOneRowProductionPublishDisabledSenderReport({
  manifestPath: 'fixture-manifest.json',
  manifestReport,
  candidateId: 'approved-fixture',
  idempotencyKey: 'unified-desk-output:discord-one-row-rehearsal:approved-fixture',
  explicitApprovalFlagPresent: true,
  approvalPhrase: 'I approve exactly one Unified Desk Output Discord production publish rehearsal.',
  productionSendArmed: true,
  discordMessageId: '1234567890',
});
assert.equal(receipt.reportType, 'unified_desk_output_discord_one_row_production_publish_receipt');
assert.equal(receipt.authority.localOnly, false);
assert.equal(receipt.authority.productionSendArmed, true);
assert.equal(receipt.authority.postsDiscord, true);
assert.equal(receipt.authority.webhookCalls, 1);
assert.equal(receipt.summary.productionSendArmed, true);
assert.equal(receipt.summary.publishDiscordRows, 1);
assert.equal(receipt.summary.realPostAllowedRows, 1);
assert.equal(receipt.summary.webhookCallRows, 1);
assert.equal(receipt.summary.supabaseWriteRows, 0);
assert.equal(receipt.summary.liveBridgeReadRows, 0);
assert.equal(receipt.summary.canExecuteTrueRows, 0);
assert.equal(receipt.receipt.discordMessageId, '1234567890');
assert.equal(receipt.receipt.secretValuesPrinted, false);
assert.match(receipt.markdown, /approved one-row production publish receipt/i);
assert.doesNotMatch(receipt.markdown, /productionSendArmed remains false/i);

const blocked = buildUnifiedDeskOutputDiscordOneRowProductionPublishDisabledSenderReport({
  manifestPath: 'fixture-manifest.json',
  manifestReport,
  candidateId: 'wrong-fixture',
  idempotencyKey: 'wrong-key',
  explicitApprovalFlagPresent: false,
  approvalPhrase: null,
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_disabled_sender_contract_fix');
assert.equal(blocked.summary.realPostAllowedRows, 0);
assert.equal(blocked.summary.webhookCallRows, 0);
assert.ok(blocked.blockers.includes('Requested candidate id does not match final launch manifest.'));
assert.ok(blocked.blockers.includes('Requested idempotency key does not match final launch manifest.'));
assert.ok(blocked.blockers.includes('Explicit approval flag is missing.'));

console.log('Unified Desk Output Discord one-row production publish disabled sender verified.');
