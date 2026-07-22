import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputDiscordFinalLaunchManifestReport } from './unified-desk-output-discord-final-launch-manifest';

const targetAuditReport = {
  reportType: 'unified_desk_output_discord_webhook_target_presence_audit' as const,
  generatedAt: '2026-07-22T20:00:00.000Z',
  status: 'pass' as const,
  authority: {
    localOnly: true as const,
    readsSavedOneRowRehearsalPlanOnly: true as const,
    readsLocalEnvNamesOnly: true as const,
    printsSecretValues: false as const,
    postsDiscord: false as const,
    writesSupabase: false as const,
    readsLiveSupabase: false as const,
    readsLiveBridge: false as const,
    changesTradingLogic: false as const,
    changesCanExecute: false as const,
    automatedOrders: false as const,
  },
  source: {
    oneRowRehearsalPlanPath: 'fixture-rehearsal.json',
    envExamplePath: '.env.example',
    envLocalPath: '.env.local',
  },
  summary: {
    rehearsalPlanPassed: true,
    candidateSelectedRows: 1,
    productionSendEnabled: false as const,
    explicitApprovalPresent: false as const,
    webhookTargetConfigured: true,
    webhookTargetShapeValid: true,
    webhookTargetVerifiedByNetwork: false as const,
    secretValuesPrinted: false as const,
    shouldPostRows: 0,
    publishDiscordRows: 0,
    realPostAllowedRows: 0,
    webhookCallRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    readinessBlockers: 0,
    recommendation: 'ready_for_explicit_one_row_discord_publish_approval' as const,
  },
  readinessBlockers: [],
};

const rehearsalReport = {
  reportType: 'unified_desk_output_discord_one_row_publish_rehearsal_plan' as const,
  generatedAt: '2026-07-22T19:00:00.000Z',
  status: 'pass' as const,
  rehearsalCandidate: {
    id: 'approved-fixture',
    idempotencyKey: 'unified-desk-output:discord-one-row-rehearsal:approved-fixture',
    route: 'production_discord_trade_plan_webhook' as const,
    payloadPreview: '[APPROVED DESK PLAN] MORNING LONG OpeningDriveFvgContinuation',
    productionSendEnabled: false as const,
    explicitApprovalPresent: false as const,
    webhookTargetVerified: false as const,
    shouldPost: false as const,
    publishDiscord: false as const,
    webhookCalls: 0 as const,
    canExecute: false as const,
  },
  summary: {
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
    recommendation: 'ready_for_explicit_one_row_discord_publish_approval' as const,
  },
  blockers: [],
};

const report = buildUnifiedDeskOutputDiscordFinalLaunchManifestReport({
  targetAuditPath: 'fixture-target-audit.json',
  targetAuditReport,
  rehearsalPath: 'fixture-rehearsal.json',
  rehearsalReport,
}, '2026-07-22T21:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_discord_final_launch_manifest');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.writesLaunchManifestOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.printsSecretValues, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.launchContract.commandExistsNow, false);
assert.match(report.launchContract.proposedCommand, /unified-desk-output-discord-one-row-production-publish\.ts/);
assert.match(report.launchContract.proposedCommand, /--i-approve-one-discord-post/);
assert.equal(report.launchContract.explicitApprovalPhrase, 'I approve exactly one Unified Desk Output Discord production publish rehearsal.');
assert.equal(report.launchContract.candidateId, 'approved-fixture');
assert.equal(report.launchContract.idempotencyKey, 'unified-desk-output:discord-one-row-rehearsal:approved-fixture');
assert.equal(report.launchContract.oneRowCap, true);
assert.equal(report.launchContract.productionSendEnabledNow, false);
assert.equal(report.summary.webhookTargetReady, true);
assert.equal(report.summary.rehearsalPlanReady, true);
assert.equal(report.summary.candidateSelectedRows, 1);
assert.equal(report.summary.commandExistsNow, false);
assert.equal(report.summary.productionSendEnabledNow, false);
assert.equal(report.summary.explicitApprovalPresent, false);
assert.equal(report.summary.shouldPostRows, 0);
assert.equal(report.summary.publishDiscordRows, 0);
assert.equal(report.summary.realPostAllowedRows, 0);
assert.equal(report.summary.webhookCallRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveSupabaseReadRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.readbackSteps, 9);
assert.equal(report.summary.rollbackSteps, 5);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.recommendation, 'ready_to_install_disabled_one_row_sender');
assert.match(report.markdown, /no-network launch manifest only/i);

const blocked = buildUnifiedDeskOutputDiscordFinalLaunchManifestReport({
  targetAuditPath: 'fixture-target-audit.json',
  targetAuditReport: {
    ...targetAuditReport,
    summary: {
      ...targetAuditReport.summary,
      webhookTargetShapeValid: false,
      recommendation: 'hold_for_webhook_target_configuration' as const,
    },
    readinessBlockers: ['fixture target blocker'],
  },
  rehearsalPath: 'fixture-rehearsal.json',
  rehearsalReport,
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_final_launch_manifest_fix');
assert.equal(blocked.summary.realPostAllowedRows, 0);
assert.ok(blocked.blockers.includes('fixture target blocker'));

console.log('Unified Desk Output Discord final launch manifest verified.');
