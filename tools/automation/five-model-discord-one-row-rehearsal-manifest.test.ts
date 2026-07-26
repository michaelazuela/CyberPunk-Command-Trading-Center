import assert from 'node:assert/strict';
import { buildFiveModelDiscordOneRowRehearsalManifestReport } from './five-model-discord-one-row-rehearsal-manifest';

function row(index: number, state: 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ') {
  const stateLabel: 'Approved Desk Plan' | 'Forming Desk Read' = state === 'APPROVED_DESK_PLAN'
    ? 'Approved Desk Plan'
    : 'Forming Desk Read';
  return {
    cardId: `five-model-card-${index}`,
    date: '2026-06-09',
    session: index % 2 === 0 ? 'lunch' as const : 'morning' as const,
    state,
    stateLabel,
    model: index % 2 === 0 ? 'Structure Shift Continuation' : 'Raid Failure Displacement Reversal',
    direction: index % 2 === 0 ? 'SHORT' as const : 'LONG' as const,
    headline: `${stateLabel} | ${index}`,
    levelLine: 'Entry 7540.75 | Stop 7536.25 | T1 7547.50 | T2 7549.75',
    riskLine: 'Risk remains scanner-owned.',
    proofLine: 'Completed 5M proof: 10:15 ET.',
    invalidationLine: 'Invalid if protected 5M structure fails.',
    publishDiscord: false as const,
    writesSupabase: false as const,
    readsLiveBridge: false as const,
    canExecute: false as const,
  };
}

const rows = [
  ...Array.from({ length: 5 }, (_, index) => row(index + 1, 'APPROVED_DESK_PLAN')),
  ...Array.from({ length: 13 }, (_, index) => row(index + 6, 'FORMING_DESK_READ')),
];

const launchChecklist = {
  reportType: 'five_model_launch_checklist',
  status: 'pass',
  summary: {
    recommendation: 'ready_for_explicit_discord_rehearsal_decision',
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
  payloads: rows.map((item) => ({
    username: 'Quant Desk',
    content: `[DRY RUN] ${item.headline}`,
    embeds: [],
  })),
  blockers: [],
};

const runtimeSurface = {
  reportType: 'five_model_production_scanner_surface_activation',
  status: 'active',
  summary: {
    selectedRows: 18,
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
  rows,
  blockers: [],
};

const report = buildFiveModelDiscordOneRowRehearsalManifestReport({
  launchChecklistPath: 'launch.json',
  launchChecklist,
  discordPreviewPath: 'preview.json',
  discordPreview,
  runtimeSurfacePath: 'runtime.json',
  runtimeSurface,
}, '2026-07-26T21:30:00.000Z');

assert.equal(report.reportType, 'five_model_discord_one_row_rehearsal_manifest');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.selectsOnePayloadOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.webhookCalls, 0);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.canExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.launchChecklistReady, true);
assert.equal(report.summary.runtimeSurfaceRows, 18);
assert.equal(report.summary.discordPreviewPayloads, 18);
assert.equal(report.summary.approvedDeskPlanRows, 5);
assert.equal(report.summary.formingDeskReadRows, 13);
assert.equal(report.summary.candidateSelectedRows, 1);
assert.equal(report.summary.payloadSelectedRows, 1);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.webhookCallRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_exactly_one_five_model_discord_rehearsal_approval');
assert.ok(report.selectedCandidate);
assert.match(report.selectedCandidate!.candidateId, /^five-model-discord-rehearsal\|/);
assert.equal(report.selectedCandidate!.sourceCardId, 'five-model-card-1');
assert.equal(report.selectedCandidate!.payloadIndex, 0);
assert.equal(report.selectedCandidate!.state, 'APPROVED_DESK_PLAN');
assert.match(report.selectedCandidate!.idempotencyKey, /^five-model-discord-production-rehearsal:/);
assert.equal(report.selectedCandidate!.productionWebhookEnabledNow, false);
assert.match(report.selectedCandidate!.payloadPreview.content, /^\[DRY RUN\] Approved Desk Plan/);
assert.match(report.nextApprovalCommand || '', /five-model-discord-one-row-production-rehearsal/);
assert.deepEqual(report.blockers, []);

const dirtyPreview = structuredClone(discordPreview) as any;
dirtyPreview.payloads[0].content = '[DRY RUN] wrong payload';
const blocked = buildFiveModelDiscordOneRowRehearsalManifestReport({
  launchChecklistPath: 'launch.json',
  launchChecklist,
  discordPreviewPath: 'preview.json',
  discordPreview: dirtyPreview,
  runtimeSurfacePath: 'runtime.json',
  runtimeSurface,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.candidateSelectedRows, 0);
assert.equal(blocked.summary.payloadSelectedRows, 0);
assert.ok(blocked.blockers.includes('Selected Discord preview payload does not match selected row headline.'));

console.log('five-model Discord one-row rehearsal manifest verified');
