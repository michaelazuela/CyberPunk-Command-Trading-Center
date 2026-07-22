import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputDiscordPublishGateDecisionAuditReport } from './unified-desk-output-discord-publish-gate-decision-audit';

const formatterReport = {
  reportType: 'unified_desk_output_discord_formatter_dry_run' as const,
  generatedAt: '2026-07-22T17:14:15.878Z',
  status: 'pass' as const,
  authority: {
    localOnly: true as const,
    dryRunOnly: true as const,
    readsSavedScannerSurfaceOnly: true as const,
    readsSavedScannerUiProofOnly: true as const,
    formatsDiscordPayloadsOnly: true as const,
    postsDiscord: false as const,
    writesSupabase: false as const,
    readsLiveSupabase: false as const,
    readsLiveBridge: false as const,
    changesTradingLogic: false as const,
    changesCanExecute: false as const,
    automatedOrders: false as const,
  },
  source: {
    scannerUiRefreshProofPath: 'fixture-proof.json',
    scannerSurfaceSmokePath: 'fixture-surface.json',
  },
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
  blockers: [],
};

const report = buildUnifiedDeskOutputDiscordPublishGateDecisionAuditReport({
  formatterPath: 'fixture-formatter.json',
  formatterReport,
}, '2026-07-22T18:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_discord_publish_gate_decision_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.readsSavedDiscordFormatterDryRunOnly, true);
assert.equal(report.authority.evaluatesPublishGateOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.publishGateEvaluated, true);
assert.equal(report.summary.productionApprovalPresent, false);
assert.equal(report.summary.sourceRows, 2);
assert.equal(report.summary.formattedPayloads, 2);
assert.equal(report.summary.approvedDeskPlanPayloads, 1);
assert.equal(report.summary.formingDeskReadPayloads, 1);
assert.equal(report.summary.shouldPostRows, 0);
assert.equal(report.summary.publishDiscordRows, 0);
assert.equal(report.summary.realPostAllowedRows, 0);
assert.equal(report.summary.webhookCallRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveSupabaseReadRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.wordingViolationRows, 0);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.missingApprovalRequirements, 8);
assert.equal(report.summary.recommendation, 'ready_for_explicit_discord_publish_approval');
assert.equal(report.missingApprovalRequirements.some((requirement) => /explicit production Discord publish approval/i.test(requirement)), true);
assert.match(report.markdown, /Production send remains blocked/i);

const blocked = buildUnifiedDeskOutputDiscordPublishGateDecisionAuditReport({
  formatterPath: 'fixture-formatter.json',
  formatterReport: {
    ...formatterReport,
    status: 'blocked' as const,
    summary: {
      ...formatterReport.summary,
      shouldPostRows: 1,
      blockedRows: 1,
      recommendation: 'hold_for_discord_formatter_fix' as const,
    },
    blockers: ['fixture formatter blocker'],
  },
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_discord_publish_gate_fix');
assert.equal(blocked.summary.realPostAllowedRows, 0);
assert.ok(blocked.blockers.includes('fixture formatter blocker'));

console.log('Unified Desk Output Discord publish-gate decision audit verified.');
