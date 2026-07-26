import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputLiveGateReadinessAuditReport } from './unified-desk-output-live-gate-readiness-audit';

const card = (state: 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ' | 'SILENT_INTERNAL', model = 'NoInstalledSetup') => ({
  cardId: `fixture|${state}|${model}`,
  date: '2026-07-22',
  session: 'morning' as const,
  state,
  model: state === 'SILENT_INTERNAL' ? null : model,
  direction: state === 'SILENT_INTERNAL' ? null : 'SHORT' as const,
  proofTime: state === 'SILENT_INTERNAL' ? null : '2026-07-22T09:45:00',
  levels: {
    entry: state === 'SILENT_INTERNAL' ? null : 100,
    stop: state === 'SILENT_INTERNAL' ? null : 104,
    target1: state === 'SILENT_INTERNAL' ? null : 94,
    target2: state === 'SILENT_INTERNAL' ? null : 92,
    riskPoints: state === 'SILENT_INTERNAL' ? null : 4,
  },
  visibleText: {
    headline: state === 'SILENT_INTERNAL' ? null : `${state === 'APPROVED_DESK_PLAN' ? 'Approved Desk Plan' : 'Forming Desk Read'}: ${model} SHORT`,
    what: state === 'SILENT_INTERNAL' ? null : `${model} SHORT.`,
    where: state === 'SILENT_INTERNAL' ? null : 'Entry 100, stop 104, T1 94, T2 92.',
    when: state === 'SILENT_INTERNAL' ? null : 'Completed 5M proof time 09:45 ET.',
    why: state === 'SILENT_INTERNAL' ? null : 'Opening drive rejected the high and displaced lower.',
    invalidation: state === 'SILENT_INTERNAL' ? null : 'Invalid if price violates the protected 5M stop line at 104.',
    authority: state === 'SILENT_INTERNAL' ? null : 'Decision-support desk output only. No automated orders.',
  },
  disabledRuntime: true as const,
  scannerRuntimeWired: false as const,
  scannerVisibleNow: false as const,
  publishDiscord: false as const,
  shouldPostDiscord: false as const,
  shouldDispatch: false as const,
  writesSupabase: false as const,
  readsLiveSupabase: false as const,
  readsLiveBridge: false as const,
  changesScannerBehavior: false as const,
  changesTradingLogic: false as const,
  changesCanExecute: false as const,
  canExecute: false as const,
  canExecuteChanged: false as const,
  livePromotionAllowed: false as const,
  noAutomatedOrders: true as const,
  blockers: [],
});

const sourceReport = {
  reportType: 'unified_desk_output_disabled_runtime_adapter_preview' as const,
  generatedAt: '2026-07-22T00:00:00.000Z',
  status: 'pass' as const,
  source: {
    builderPreviewPath: 'fixture-builder-preview.json',
    sourceRows: 3,
  },
  summary: {
    sourceRows: 3,
    disabledRuntimeCards: 3,
    approvedDeskPlanCards: 1,
    formingDeskReadCards: 1,
    silentInternalCards: 1,
    completePlanCards: 2,
    sourcePublishShouldPostRows: 2,
    adapterShouldPostDiscordRows: 0 as const,
    adapterWritesSupabaseRows: 0 as const,
    adapterReadsLiveBridgeRows: 0 as const,
    adapterCanExecuteTrueRows: 0 as const,
    canExecuteChangedRows: 0 as const,
    livePromotionAllowedRows: 0 as const,
    noAutomatedOrderRows: 3,
    wordingViolationRows: 0,
    blockedCards: 0,
    recommendation: 'keep_disabled_until_live_gate' as const,
  },
  cards: [
    card('APPROVED_DESK_PLAN'),
    card('FORMING_DESK_READ', 'NoInstalledSetup'),
    card('SILENT_INTERNAL', 'NoInstalledSetup'),
  ],
  blockers: [],
};

const report = buildUnifiedDeskOutputLiveGateReadinessAuditReport({
  disabledAdapterPreviewPath: 'fixture-disabled-adapter-preview.json',
  disabledAdapterPreviewReport: sourceReport,
}, '2026-07-22T01:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_live_gate_readiness_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.installsRuntimeAdapter, false);
assert.equal(report.authority.scannerVisibleNow, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.gateContract.explicitInstallStillRequired, true);
assert.equal(report.gateContract.discordRequiresSeparateApproval, true);
assert.equal(report.gateContract.supabaseRequiresSeparateApproval, true);
assert.equal(report.gateContract.canExecuteMustRemainExistingDeterministicGate, true);
assert.deepEqual(report.gateContract.allowedPublicStates, ['APPROVED_DESK_PLAN', 'FORMING_DESK_READ']);
assert.equal(report.summary.disabledRuntimeCards, 3);
assert.equal(report.summary.approvedDeskPlanCandidates, 1);
assert.equal(report.summary.formingDeskReadCandidates, 1);
assert.equal(report.summary.silentInternalRows, 1);
assert.equal(report.summary.scannerVisibleNowRows, 0);
assert.equal(report.summary.scannerVisibleIfExplicitGateApprovedRows, 2);
assert.equal(report.summary.discordPostNowRows, 0);
assert.equal(report.summary.supabaseWriteNowRows, 0);
assert.equal(report.summary.liveBridgeReadNowRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.incompleteVisiblePlanRows, 0);
assert.equal(report.summary.wordingViolationRows, 0);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_explicit_scanner_visibility_decision');
assert.equal(report.candidates.length, 2);
assert.equal(report.candidates.every((candidate) => candidate.scannerVisibleIfExplicitGateApproved), true);
assert.equal(report.candidates.every((candidate) => candidate.canExecuteRemainsExternalGate), true);
assert.doesNotMatch(report.markdown, /human[- ]review|no chase|missed|no-trade|no trade/i);

const blockedSourceReport = {
  ...sourceReport,
  cards: [
    { ...card('APPROVED_DESK_PLAN'), shouldPostDiscord: true as false },
  ],
};
const blockedReport = buildUnifiedDeskOutputLiveGateReadinessAuditReport({
  disabledAdapterPreviewPath: 'fixture-disabled-adapter-preview.json',
  disabledAdapterPreviewReport: blockedSourceReport,
}, '2026-07-22T01:00:00.000Z');

assert.equal(blockedReport.status, 'blocked');
assert.equal(blockedReport.summary.discordPostNowRows, 1);
assert.equal(blockedReport.summary.blockedRows, 1);
assert.match(blockedReport.blockers.join('\n'), /Discord/);

console.log('Unified desk output live-gate readiness audit verified.');
