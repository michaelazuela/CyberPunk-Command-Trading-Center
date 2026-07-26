import assert from 'node:assert/strict';
import { buildFiveModelInstallReadinessAuditReport } from './five-model-install-readiness-audit';

const candidateId = 'five-model-discord-rehearsal|abc123';
const idempotencyKey = 'five-model-discord-production-rehearsal:def456';
const approvalPhrase = 'I approve exactly one five-model Discord production rehearsal for the manifest candidate and idempotency key.';
const sourceCardId = 'five-model-card-1';

const sources = {
  activationPath: 'activation.json',
  scannerReadbackPath: 'scanner-readback.json',
  discordPreviewPath: 'discord-preview.json',
  launchChecklistPath: 'launch-checklist.json',
  oneRowManifestPath: 'manifest.json',
  disabledSenderPath: 'disabled-sender.json',
  closeoutPath: 'closeout.json',
};

const zeroCounters = {
  discordPostRows: 0,
  webhookCallRows: 0,
  supabaseWriteRows: 0,
  liveSupabaseReadRows: 0,
  liveBridgeReadRows: 0,
  canExecuteTrueRows: 0,
  canExecuteChangedRows: 0,
  tradingLogicChangedRows: 0,
  automatedOrderRows: 0,
};

const reports = {
  activationPath: {
    reportType: 'five_model_production_scanner_surface_activation',
    status: 'active',
    summary: {
      selectedRows: 18,
      approvedDeskPlanRows: 5,
      formingDeskReadRows: 13,
      ...zeroCounters,
    },
    blockers: [],
  },
  scannerReadbackPath: {
    reportType: 'five_model_production_scanner_readback',
    status: 'pass',
    summary: {
      selectedRows: 18,
      ...zeroCounters,
    },
    blockers: [],
  },
  discordPreviewPath: {
    reportType: 'five_model_discord_dry_run_preview',
    status: 'pass',
    summary: {
      previewPayloads: 18,
      ...zeroCounters,
    },
    blockers: [],
  },
  launchChecklistPath: {
    reportType: 'five_model_launch_checklist',
    status: 'pass',
    summary: {
      activationRows: 18,
      scannerReadbackRows: 18,
      discordPreviewPayloads: 18,
      approvedDeskPlanRows: 5,
      formingDeskReadRows: 13,
      ...zeroCounters,
    },
    blockers: [],
  },
  oneRowManifestPath: {
    reportType: 'five_model_discord_one_row_rehearsal_manifest',
    status: 'pass',
    selectedCandidate: {
      candidateId,
      sourceCardId,
      idempotencyKey,
      approvalPhrase,
    },
    summary: {
      candidateSelectedRows: 1,
      payloadSelectedRows: 1,
      ...zeroCounters,
    },
    blockers: [],
  },
  disabledSenderPath: {
    reportType: 'five_model_discord_one_row_production_rehearsal_disabled_sender',
    status: 'pass',
    summary: {
      candidateSelectedRows: 1,
      payloadSelectedRows: 1,
      ...zeroCounters,
    },
    blockers: [],
  },
  closeoutPath: {
    reportType: 'five_model_discord_production_rehearsal_closeout',
    status: 'pass',
    closeoutState: 'awaiting_explicit_discord_execution',
    selectedCandidate: {
      candidateId,
      sourceCardId,
      idempotencyKey,
      approvalPhrase,
    },
    summary: {
      candidateSelectedRows: 1,
      payloadSelectedRows: 1,
      productionReceiptAcceptedRows: 0,
      ...zeroCounters,
    },
    blockers: [],
  },
};

const awaiting = buildFiveModelInstallReadinessAuditReport({
  sources,
  reports,
}, '2026-07-26T21:00:00.000Z');

assert.equal(awaiting.reportType, 'five_model_install_readiness_audit');
assert.equal(awaiting.status, 'pass');
assert.equal(awaiting.readinessState, 'awaiting_explicit_discord_execution');
assert.equal(awaiting.authority.localOnly, true);
assert.equal(awaiting.authority.postsDiscord, false);
assert.equal(awaiting.authority.webhookCalls, 0);
assert.equal(awaiting.authority.writesSupabase, false);
assert.equal(awaiting.authority.readsLiveBridge, false);
assert.equal(awaiting.authority.printsSecretValues, false);
assert.equal(awaiting.authority.changesTradingLogic, false);
assert.equal(awaiting.authority.changesCanExecute, false);
assert.equal(awaiting.authority.automatedOrders, false);
assert.equal(awaiting.selectedCandidate.candidateId, candidateId);
assert.equal(awaiting.selectedCandidate.idempotencyKey, idempotencyKey);
assert.equal(awaiting.summary.artifactsChecked, 7);
assert.equal(awaiting.summary.artifactsPassed, 7);
assert.equal(awaiting.summary.scannerSurfaceRows, 18);
assert.equal(awaiting.summary.scannerReadbackRows, 18);
assert.equal(awaiting.summary.discordPreviewPayloads, 18);
assert.equal(awaiting.summary.approvedDeskPlanRows, 5);
assert.equal(awaiting.summary.formingDeskReadRows, 13);
assert.equal(awaiting.summary.candidateSelectedRows, 1);
assert.equal(awaiting.summary.payloadSelectedRows, 1);
assert.equal(awaiting.summary.productionReceiptAcceptedRows, 0);
assert.equal(awaiting.summary.discordPostRows, 0);
assert.equal(awaiting.summary.webhookCallRows, 0);
assert.equal(awaiting.summary.recommendation, 'awaiting_explicit_discord_execution');
assert.equal(awaiting.requirementAudit.at(-1)?.status, 'waiting');
assert.deepEqual(awaiting.blockers, []);

const completeReports = structuredClone(reports) as typeof reports;
completeReports.closeoutPath.closeoutState = 'ready_for_final_handoff';
completeReports.closeoutPath.summary.productionReceiptAcceptedRows = 1;
const complete = buildFiveModelInstallReadinessAuditReport({
  sources,
  reports: completeReports,
});

assert.equal(complete.status, 'pass');
assert.equal(complete.readinessState, 'ready_for_final_receipt_handoff');
assert.equal(complete.summary.productionReceiptAcceptedRows, 1);
assert.equal(complete.summary.recommendation, 'ready_for_final_receipt_handoff');
assert.equal(complete.requirementAudit.at(-1)?.status, 'proven');

const dirtyReports = structuredClone(reports) as typeof reports;
dirtyReports.discordPreviewPath.summary.webhookCallRows = 1;
const blocked = buildFiveModelInstallReadinessAuditReport({
  sources,
  reports: dirtyReports,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.readinessState, 'hold_for_install_fix');
assert.equal(blocked.summary.artifactsPassed, 0);
assert.ok(blocked.blockers.some((blocker) => blocker.includes('Discord dry-run preview has webhook-call rows.')));

console.log('five-model install readiness audit verified');
