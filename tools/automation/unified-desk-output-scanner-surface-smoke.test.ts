import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputScannerSurfaceSmokeReport } from './unified-desk-output-scanner-surface-smoke';

const card = (state: 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ') => ({
  cardId: `smoke|${state}`,
  date: '2026-07-22',
  session: state === 'APPROVED_DESK_PLAN' ? 'morning' as const : 'lunch' as const,
  state,
  model: state === 'APPROVED_DESK_PLAN' ? 'NoInstalledSetup' : 'NoInstalledSetup',
  direction: state === 'APPROVED_DESK_PLAN' ? 'SHORT' as const : 'LONG' as const,
  proofTime: state === 'APPROVED_DESK_PLAN' ? '2026-07-22T09:45:00' : '2026-07-22T12:35:00',
  entry: 100,
  stop: state === 'APPROVED_DESK_PLAN' ? 104 : 96,
  target1: state === 'APPROVED_DESK_PLAN' ? 94 : 106,
  target2: state === 'APPROVED_DESK_PLAN' ? 92 : 108,
  riskPoints: 4,
  headline: state,
  what: `${state} setup.`,
  where: 'Entry/stop/targets.',
  when: 'Completed 5M proof.',
  why: `${state} scanner lane.`,
  invalidation: 'Invalid if price violates the protected 5M stop line.',
  authority: 'Decision-support desk output only. Existing deterministic execution gates remain in control. No automated orders.',
  scannerVisibleNow: true as const,
  localScannerOnly: true as const,
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
});

const report = buildUnifiedDeskOutputScannerSurfaceSmokeReport({
  installAuditPath: 'fixture-install-audit.json',
  installAuditReport: {
    reportType: 'unified_desk_output_scanner_visibility_install_audit',
    status: 'pass',
    model: {
      status: 'ready',
      sourceOfTruth: 'scanner_visible_unified_desk_output_adapter',
      localScannerOnly: true,
      scannerVisibleNow: true,
      publishDiscord: false,
      shouldPostDiscord: false,
      shouldDispatch: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      canExecuteChanged: false,
      livePromotionAllowed: false,
      noAutomatedOrders: true,
      cards: [card('APPROVED_DESK_PLAN'), card('FORMING_DESK_READ')],
      blockers: [],
    },
  },
}, '2026-07-22T01:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_scanner_surface_smoke');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.rendersScannerSurfaceOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.renderedRows, 2);
assert.equal(report.summary.approvedDeskPlanRows, 1);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.wordingViolationRows, 0);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.recommendation, 'surface_ready_for_local_display_consumer');
assert.equal(report.surface.rows[0].stateLabel, 'Approved Desk Plan');
assert.equal(report.surface.rows[1].stateLabel, 'Forming Desk Read');
assert.match(report.markdown, /Approved Desk Plan/);
assert.match(report.markdown, /Forming Desk Read/);
assert.doesNotMatch(report.markdown, /human[- ]review|no chase|missed|no-trade|no trade/i);

console.log('Unified Desk Output scanner surface smoke verified.');
