import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputDisabledRuntimeAdapterPreviewReport } from './unified-desk-output-disabled-runtime-adapter-preview';

const row = (state: 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ' | 'SILENT_INTERNAL', model = 'NoInstalledSetup') => ({
  date: '2026-07-22',
  session: 'morning' as const,
  requestedVisibleState: state === 'SILENT_INTERNAL' ? 'FORMING_DESK_READ' as const : state,
  builderVisibleState: state,
  model,
  direction: 'LONG' as const,
  proofTime: '2026-07-22T09:35:00',
  entry: 100,
  stop: 96,
  target1: 106,
  target2: 108,
  riskPoints: 4,
  movement: 'bullish_drive',
  primaryLane: 'NoInstalledSetup',
  contextLabels: ['NoInstalledSetup'],
  publishHasCompletePlan: state !== 'SILENT_INTERNAL',
  publishShouldPost: state !== 'SILENT_INTERNAL',
  publishCanExecute: false,
  noAutomatedOrders: true,
  canExecuteChanged: false as const,
  livePromotionAllowed: false as const,
  visibleHeadline: state === 'SILENT_INTERNAL' ? null : `${state === 'APPROVED_DESK_PLAN' ? 'Approved Desk Plan' : 'Forming Desk Read'}: ${model} LONG`,
  visibleWhat: state === 'SILENT_INTERNAL' ? null : `${model} LONG.`,
  visibleWhere: state === 'SILENT_INTERNAL' ? null : 'Entry 100, stop 96, T1 106, T2 108.',
  visibleWhen: state === 'SILENT_INTERNAL' ? null : 'Completed 5M proof time 09:35 ET.',
  visibleWhy: state === 'SILENT_INTERNAL' ? null : 'Session movement=bullish_drive.',
  visibleInvalidation: state === 'SILENT_INTERNAL' ? null : 'Invalid if price violates the protected 5M stop line at 96.',
  visibleAuthority: state === 'SILENT_INTERNAL' ? null : 'Decision-support desk output only. No automated orders.',
  blockers: [],
});

const report = buildUnifiedDeskOutputDisabledRuntimeAdapterPreviewReport({
  builderPreviewPath: 'fixture-builder-preview.json',
  builderPreviewReport: {
    reportType: 'unified_desk_output_local_scanner_builder_preview',
    generatedAt: '2026-07-22T00:00:00.000Z',
    rows: [
      row('APPROVED_DESK_PLAN'),
      row('FORMING_DESK_READ', 'NoInstalledSetup'),
      row('SILENT_INTERNAL', 'NoInstalledSetup'),
    ],
  },
}, '2026-07-22T01:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_disabled_runtime_adapter_preview');
assert.equal(report.status, 'pass');
assert.equal(report.authority.runtimeAdapterDisabled, true);
assert.equal(report.authority.scannerRuntimeWired, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.installState.runtimeAdapterInstalled, false);
assert.equal(report.installState.discordPostingEnabled, false);
assert.equal(report.installState.supabasePersistenceEnabled, false);
assert.equal(report.installState.bridgeReadsEnabled, false);
assert.equal(report.summary.disabledRuntimeCards, 3);
assert.equal(report.summary.approvedDeskPlanCards, 1);
assert.equal(report.summary.formingDeskReadCards, 1);
assert.equal(report.summary.silentInternalCards, 1);
assert.equal(report.summary.completePlanCards, 2);
assert.equal(report.summary.sourcePublishShouldPostRows, 2);
assert.equal(report.summary.adapterShouldPostDiscordRows, 0);
assert.equal(report.summary.adapterWritesSupabaseRows, 0);
assert.equal(report.summary.adapterReadsLiveBridgeRows, 0);
assert.equal(report.summary.adapterCanExecuteTrueRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.noAutomatedOrderRows, 3);
assert.equal(report.summary.wordingViolationRows, 0);
assert.equal(report.summary.blockedCards, 0);
assert.equal(report.cards.every((card) => card.disabledRuntime), true);
assert.equal(report.cards.every((card) => !card.scannerVisibleNow), true);
assert.equal(report.cards.every((card) => !card.publishDiscord), true);
assert.equal(report.cards.every((card) => !card.writesSupabase), true);
assert.equal(report.cards.every((card) => !card.canExecute), true);
assert.doesNotMatch(report.markdown, /human[- ]review|no chase|missed|no-trade|no trade/i);

console.log('Unified desk output disabled runtime adapter preview verified.');
