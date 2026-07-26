import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputLocalScannerBuilderPreviewReport } from './unified-desk-output-local-scanner-builder-preview';

const row = (visibleState: 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ', model: string, session: 'morning' | 'lunch') => ({
  date: '2026-07-22',
  session,
  visibleState,
  model,
  direction: 'LONG' as const,
  proofTime: session === 'morning' ? '2026-07-22T09:35:00' : '2026-07-22T12:35:00',
  entry: 100,
  stop: 96,
  target1: 106,
  target2: 108,
  riskPoints: 4,
  movement: 'bullish_drive',
  primaryLane: session === 'morning' ? 'NoInstalledSetup' : 'NoInstalledSetup',
  contextLabels: ['NoInstalledSetup'],
  sourceCandidateRole: visibleState === 'APPROVED_DESK_PLAN' ? 'primary_lane' as const : 'context_lane' as const,
  deskLanguage: {
    headline: visibleState === 'APPROVED_DESK_PLAN'
      ? `Approved Desk Plan: ${model} LONG`
      : `Forming Desk Read: ${model} LONG`,
    what: `${session} ${model} LONG.`,
    where: 'Entry 100, stop 96, T1 106, T2 108.',
    when: 'Completed 5M proof time 09:35 ET.',
    why: 'Session movement=bullish_drive.',
    invalidation: 'Invalid if price violates the protected 5M stop line at 96.',
    authority: 'Decision-support desk output only. No automated orders.',
  },
});

const report = buildUnifiedDeskOutputLocalScannerBuilderPreviewReport({
  selectorPreviewPath: 'fixture-selector-preview.json',
  selectorPreviewReport: {
    reportType: 'unified_desk_output_selector_preview',
    generatedAt: '2026-07-22T00:00:00.000Z',
    rows: [
      row('APPROVED_DESK_PLAN', 'NoInstalledSetup', 'morning'),
      row('FORMING_DESK_READ', 'NoInstalledSetup', 'lunch'),
    ],
  },
}, '2026-07-22T01:00:00.000Z');

const approved = report.rows.find((item) => item.builderVisibleState === 'APPROVED_DESK_PLAN');
const forming = report.rows.find((item) => item.builderVisibleState === 'FORMING_DESK_READ');

assert.equal(report.reportType, 'unified_desk_output_local_scanner_builder_preview');
assert.equal(report.authority.usesScannerOwnedBuilders, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.installsRuntimeAdapter, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.sourceRows, 2);
assert.equal(report.summary.builderRows, 2);
assert.equal(report.summary.approvedDeskPlanRows, 1);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.completePlanRows, 2);
assert.equal(report.summary.publishCanExecuteTrueRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.noAutomatedOrderRows, 2);
assert.equal(report.summary.wordingViolationRows, 0);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.blockers.length, 0);
assert.equal(approved?.deskStateSourceOfTruth, 'scanner_desk_state');
assert.equal(approved?.deskTicketSourceOfTruth, 'scanner_single_active_desk_ticket');
assert.equal(approved?.publishDecisionSourceOfTruth, 'scanner_desk_publish_decision');
assert.equal(approved?.entry, 100);
assert.equal(approved?.stop, 96);
assert.equal(approved?.target1, 106);
assert.equal(approved?.target2, 108);
assert.equal(approved?.publishCanExecute, false);
assert.equal(approved?.noAutomatedOrders, true);
assert.equal(forming?.builderVisibleState, 'FORMING_DESK_READ');
assert.equal(forming?.publishCanExecute, false);
assert.doesNotMatch(report.markdown, /human[- ]review|no chase|missed|no-trade|no trade/i);

console.log('Unified desk output local scanner-builder preview verified.');
