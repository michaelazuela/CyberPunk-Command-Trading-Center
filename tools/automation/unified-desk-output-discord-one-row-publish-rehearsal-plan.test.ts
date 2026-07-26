import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputDiscordOneRowPublishRehearsalPlanReport } from './unified-desk-output-discord-one-row-publish-rehearsal-plan';

const formatterReport = {
  reportType: 'unified_desk_output_discord_formatter_dry_run' as const,
  generatedAt: '2026-07-22T17:14:15.878Z',
  status: 'pass' as const,
  summary: {
    sourceRows: 2,
    formattedPayloads: 2,
    approvedDeskPlanPayloads: 1,
    formingDeskReadPayloads: 1,
    shouldPostRows: 0,
    publishDiscordRows: 0,
    webhookCallRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    wordingViolationRows: 0,
    blockedRows: 0,
    recommendation: 'ready_for_discord_publish_gate_decision' as const,
  },
  samplePayloads: [
    {
      id: 'forming-fixture',
      content: '[FORMING DESK READ] MORNING SHORT NoInstalledSetup\nDecision support only.',
      shouldPost: false as const,
      publishDiscord: false as const,
      webhookCalls: 0 as const,
      writesSupabase: false as const,
      readsLiveBridge: false as const,
      canExecute: false as const,
    },
    {
      id: 'approved-fixture',
      content: '[APPROVED DESK PLAN] MORNING LONG NoInstalledSetup\nDecision support only.',
      shouldPost: false as const,
      publishDiscord: false as const,
      webhookCalls: 0 as const,
      writesSupabase: false as const,
      readsLiveBridge: false as const,
      canExecute: false as const,
    },
  ],
  blockers: [],
};

const gateReport = {
  reportType: 'unified_desk_output_discord_publish_gate_decision_audit' as const,
  generatedAt: '2026-07-22T18:00:00.000Z',
  status: 'pass' as const,
  authority: {
    localOnly: true as const,
    readsSavedDiscordFormatterDryRunOnly: true as const,
    evaluatesPublishGateOnly: true as const,
    postsDiscord: false as const,
    writesSupabase: false as const,
    readsLiveSupabase: false as const,
    readsLiveBridge: false as const,
    changesTradingLogic: false as const,
    changesCanExecute: false as const,
    automatedOrders: false as const,
  },
  source: {
    discordFormatterDryRunPath: 'fixture-formatter.json',
    discordFormatterDryRunGeneratedAt: formatterReport.generatedAt,
  },
  summary: {
    publishGateEvaluated: true as const,
    productionApprovalPresent: false as const,
    sourceRows: 2,
    formattedPayloads: 2,
    approvedDeskPlanPayloads: 1,
    formingDeskReadPayloads: 1,
    shouldPostRows: 0,
    publishDiscordRows: 0,
    realPostAllowedRows: 0,
    webhookCallRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    wordingViolationRows: 0,
    blockedRows: 0,
    missingApprovalRequirements: 8,
    recommendation: 'ready_for_explicit_discord_publish_approval' as const,
  },
  missingApprovalRequirements: ['Explicit production Discord publish approval is required before any real post.'],
  blockers: [],
};

const report = buildUnifiedDeskOutputDiscordOneRowPublishRehearsalPlanReport({
  gatePath: 'fixture-gate.json',
  gateReport,
  formatterPath: 'fixture-formatter.json',
  formatterReport,
}, '2026-07-22T19:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_discord_one_row_publish_rehearsal_plan');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.createsDisabledPublishPlanOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.rehearsalCandidate?.id, 'approved-fixture');
assert.match(report.rehearsalCandidate?.idempotencyKey || '', /^unified-desk-output:discord-one-row-rehearsal:/);
assert.equal(report.rehearsalCandidate?.productionSendEnabled, false);
assert.equal(report.rehearsalCandidate?.explicitApprovalPresent, false);
assert.equal(report.rehearsalCandidate?.webhookTargetVerified, false);
assert.equal(report.rehearsalCandidate?.shouldPost, false);
assert.equal(report.rehearsalCandidate?.publishDiscord, false);
assert.equal(report.rehearsalCandidate?.webhookCalls, 0);
assert.equal(report.rehearsalCandidate?.canExecute, false);
assert.equal(report.summary.publishGatePassed, true);
assert.equal(report.summary.formatterPassed, true);
assert.equal(report.summary.oneRowCap, true);
assert.equal(report.summary.candidateSelectedRows, 1);
assert.equal(report.summary.productionSendEnabled, false);
assert.equal(report.summary.explicitApprovalPresent, false);
assert.equal(report.summary.webhookTargetVerified, false);
assert.equal(report.summary.shouldPostRows, 0);
assert.equal(report.summary.publishDiscordRows, 0);
assert.equal(report.summary.realPostAllowedRows, 0);
assert.equal(report.summary.webhookCallRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveSupabaseReadRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.launchRequirements, 8);
assert.equal(report.summary.recommendation, 'ready_for_explicit_one_row_discord_publish_approval');
assert.match(report.markdown, /disabled local rehearsal plan only/i);

const blocked = buildUnifiedDeskOutputDiscordOneRowPublishRehearsalPlanReport({
  gatePath: 'fixture-gate.json',
  gateReport: {
    ...gateReport,
    status: 'blocked' as const,
    blockers: ['fixture gate blocker'],
  },
  formatterPath: 'fixture-formatter.json',
  formatterReport,
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_one_row_publish_rehearsal_fix');
assert.equal(blocked.summary.realPostAllowedRows, 0);
assert.ok(blocked.blockers.includes('fixture gate blocker'));

console.log('Unified Desk Output Discord one-row publish rehearsal plan verified.');
