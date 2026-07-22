import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildUnifiedDeskOutputDiscordWebhookTargetPresenceAuditReport } from './unified-desk-output-discord-webhook-target-presence-audit';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'discord-target-audit-'));
const envExamplePath = path.join(tempRoot, '.env.example');
const envLocalPath = path.join(tempRoot, '.env.local');
const previousDiscordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
delete process.env.DISCORD_WEBHOOK_URL;
fs.writeFileSync(envExamplePath, 'DISCORD_WEBHOOK_URL=""\n');
fs.writeFileSync(envLocalPath, 'DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/123456789/token_value"\n');

const rehearsalReport = {
  reportType: 'unified_desk_output_discord_one_row_publish_rehearsal_plan' as const,
  generatedAt: '2026-07-22T19:00:00.000Z',
  status: 'pass' as const,
  authority: {
    localOnly: true as const,
    readsSavedDiscordPublishGateAuditOnly: true as const,
    readsSavedDiscordFormatterDryRunOnly: true as const,
    createsDisabledPublishPlanOnly: true as const,
    postsDiscord: false as const,
    writesSupabase: false as const,
    readsLiveSupabase: false as const,
    readsLiveBridge: false as const,
    changesTradingLogic: false as const,
    changesCanExecute: false as const,
    automatedOrders: false as const,
  },
  rehearsalCandidate: {
    id: 'approved-fixture',
    idempotencyKey: 'unified-desk-output:discord-one-row-rehearsal:approved-fixture',
    route: 'production_discord_trade_plan_webhook' as const,
    productionSendEnabled: false as const,
    explicitApprovalPresent: false as const,
    webhookTargetVerified: false as const,
    shouldPost: false as const,
    publishDiscord: false as const,
    webhookCalls: 0 as const,
    canExecute: false as const,
  },
  summary: {
    publishGatePassed: true,
    formatterPassed: true,
    oneRowCap: true as const,
    candidateSelectedRows: 1,
    productionSendEnabled: false as const,
    explicitApprovalPresent: false as const,
    webhookTargetVerified: false as const,
    shouldPostRows: 0,
    publishDiscordRows: 0,
    realPostAllowedRows: 0,
    webhookCallRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    blockedRows: 0,
    launchRequirements: 8,
    recommendation: 'ready_for_explicit_one_row_discord_publish_approval' as const,
  },
  blockers: [],
};

const report = buildUnifiedDeskOutputDiscordWebhookTargetPresenceAuditReport({
  rehearsalPath: 'fixture-rehearsal.json',
  rehearsalReport,
  envExamplePath,
  envLocalPath,
}, '2026-07-22T20:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_discord_webhook_target_presence_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.readsLocalEnvNamesOnly, true);
assert.equal(report.authority.printsSecretValues, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.target.name, 'DISCORD_WEBHOOK_URL');
assert.equal(report.target.documentedInEnvExample, true);
assert.equal(report.target.presentInEnvLocal, true);
assert.equal(report.target.nonEmpty, true);
assert.equal(report.target.shapeLooksLikeDiscordWebhook, true);
assert.equal(report.target.valuePrinted, false);
assert.equal(report.summary.rehearsalPlanPassed, true);
assert.equal(report.summary.candidateSelectedRows, 1);
assert.equal(report.summary.productionSendEnabled, false);
assert.equal(report.summary.explicitApprovalPresent, false);
assert.equal(report.summary.webhookTargetConfigured, true);
assert.equal(report.summary.webhookTargetShapeValid, true);
assert.equal(report.summary.webhookTargetVerifiedByNetwork, false);
assert.equal(report.summary.secretValuesPrinted, false);
assert.equal(report.summary.shouldPostRows, 0);
assert.equal(report.summary.publishDiscordRows, 0);
assert.equal(report.summary.realPostAllowedRows, 0);
assert.equal(report.summary.webhookCallRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveSupabaseReadRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.readinessBlockers, 0);
assert.equal(report.summary.recommendation, 'ready_for_explicit_one_row_discord_publish_approval');
assert.doesNotMatch(report.markdown, /token_value|123456789/);

const blocked = buildUnifiedDeskOutputDiscordWebhookTargetPresenceAuditReport({
  rehearsalPath: 'fixture-rehearsal.json',
  rehearsalReport,
  envExamplePath,
  envLocalPath: path.join(tempRoot, 'missing.env.local'),
});
assert.equal(blocked.status, 'pass');
assert.equal(blocked.summary.recommendation, 'hold_for_webhook_target_configuration');
assert.ok(blocked.readinessBlockers.includes('DISCORD_WEBHOOK_URL is not present in .env.local or process env.'));
assert.equal(blocked.summary.realPostAllowedRows, 0);

if (previousDiscordWebhookUrl) {
  process.env.DISCORD_WEBHOOK_URL = previousDiscordWebhookUrl;
}

console.log('Unified Desk Output Discord webhook target presence audit verified.');
