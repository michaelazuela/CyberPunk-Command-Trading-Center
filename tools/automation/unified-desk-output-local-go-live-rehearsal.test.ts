import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputLocalGoLiveRehearsalReport } from './unified-desk-output-local-go-live-rehearsal';
import type { UnifiedDeskOutputScannerSurfaceSmokeReport } from '../../src/lib/unifiedDeskOutputScannerSurfacePreviewAdapter';

const surfaceRow = (state: 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ') => ({
  cardId: `rehearsal|${state}`,
  date: '2026-07-22',
  session: state === 'APPROVED_DESK_PLAN' ? 'morning' as const : 'lunch' as const,
  state,
  stateLabel: state === 'APPROVED_DESK_PLAN' ? 'Approved Desk Plan' as const : 'Forming Desk Read' as const,
  model: state === 'APPROVED_DESK_PLAN' ? 'NoInstalledSetup' : 'NoInstalledSetup',
  direction: state === 'APPROVED_DESK_PLAN' ? 'SHORT' as const : 'LONG' as const,
  headline: `${state} headline`,
  bodyLines: ['What: scanner-owned setup.', 'Why: HTF story plus completed 5M proof.'],
  levelLine: 'Entry 100 | Stop 104 | T1 94 | T2 92',
  riskLine: 'Risk 4 points from scanner-owned entry/stop.',
  proofLine: 'Completed 5M proof: 09:45 ET.',
  invalidationLine: 'Invalid if price violates the protected 5M stop line.',
  authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off in this surface.',
  scannerVisibleNow: true as const,
  publishDiscord: false as const,
  writesSupabase: false as const,
  readsLiveBridge: false as const,
  canExecute: false as const,
});

const smokeReport: UnifiedDeskOutputScannerSurfaceSmokeReport = {
  reportType: 'unified_desk_output_scanner_surface_smoke',
  status: 'pass',
  authority: {
    localOnly: true,
    readsSavedInstallAuditOnly: true,
    rendersScannerSurfaceOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    automatedOrders: false,
  },
  summary: {
    renderedRows: 2,
    approvedDeskPlanRows: 1,
    formingDeskReadRows: 1,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    wordingViolationRows: 0,
    blockedRows: 0,
  },
  surface: {
    status: 'ready',
    sourceOfTruth: 'scanner_surface_unified_desk_output_consumer',
    localScannerOnly: true,
    rows: [surfaceRow('APPROVED_DESK_PLAN'), surfaceRow('FORMING_DESK_READ')],
    summary: {
      rows: 2,
      approvedDeskPlans: 1,
      formingDeskReads: 1,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      wordingViolationRows: 0,
    },
    blockers: [],
  },
  blockers: [],
};

const report = buildUnifiedDeskOutputLocalGoLiveRehearsalReport({
  surfaceSmokePath: 'fixture-surface-smoke.json',
  surfaceSmokeReport: smokeReport,
}, '2026-07-22T02:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_local_go_live_rehearsal');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.hiddenPreviewFlagRequired, true);
assert.equal(report.authority.readsSavedSurfaceSmokeOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.previewRows, 2);
assert.equal(report.summary.approvedDeskPlanRows, 1);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveSupabaseReadRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.wordingViolationRows, 0);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_local_scanner_rehearsal_only');
assert.doesNotMatch(report.markdown, /human[- ]review|no chase|missed|no-trade|no trade/i);

const blocked = buildUnifiedDeskOutputLocalGoLiveRehearsalReport({
  surfaceSmokePath: 'fixture-surface-smoke.json',
  surfaceSmokeReport: {
    ...smokeReport,
    status: 'blocked',
    blockers: ['fixture blocker'],
  },
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_preview_contract_fix');
assert.ok(blocked.blockers.includes('fixture blocker'));

console.log('Unified Desk Output local go-live rehearsal verified.');
