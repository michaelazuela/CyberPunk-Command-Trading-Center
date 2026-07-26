import assert from 'node:assert/strict';
import {
  buildFiveModelLaunchChecklistReport,
} from './five-model-launch-checklist';

const activation = {
  reportType: 'five_model_production_scanner_surface_activation',
  status: 'active',
  summary: {
    selectedRows: 18,
    approvedDeskPlanRows: 5,
    formingDeskReadRows: 13,
    morningRows: 10,
    lunchRows: 8,
    eveningRows: 0,
    discordPostRows: 0,
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

const scannerReadback = {
  reportType: 'five_model_production_scanner_readback',
  status: 'pass',
  summary: {
    selectedRows: 18,
    discordPostRows: 0,
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

const discordPreview = {
  reportType: 'five_model_discord_dry_run_preview',
  status: 'pass',
  summary: {
    previewPayloads: 18,
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

const report = buildFiveModelLaunchChecklistReport({
  activationPath: 'activation.json',
  activation,
  scannerReadbackPath: 'scanner-readback.json',
  scannerReadback,
  discordPreviewPath: 'discord-preview.json',
  discordPreview,
}, '2026-07-26T20:00:00.000Z');

assert.equal(report.reportType, 'five_model_launch_checklist');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.installsRuntimeBehavior, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.webhookCalls, 0);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.canExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.activationRows, 18);
assert.equal(report.summary.scannerReadbackRows, 18);
assert.equal(report.summary.discordPreviewPayloads, 18);
assert.equal(report.summary.approvedDeskPlanRows, 5);
assert.equal(report.summary.formingDeskReadRows, 13);
assert.equal(report.summary.webhookCallRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_explicit_discord_rehearsal_decision');
assert.ok(report.launchBoundaries.some((step) => step.includes('separate explicit approval')));
assert.deepEqual(report.blockers, []);

const dirty = structuredClone(discordPreview);
dirty.summary.webhookCallRows = 1;
const blocked = buildFiveModelLaunchChecklistReport({
  activationPath: 'activation.json',
  activation,
  scannerReadbackPath: 'scanner-readback.json',
  scannerReadback,
  discordPreviewPath: 'discord-preview.json',
  discordPreview: dirty,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_five_model_launch_checklist_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('webhook-call rows')));

console.log('five-model launch checklist verified');
