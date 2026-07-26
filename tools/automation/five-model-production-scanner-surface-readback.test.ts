import assert from 'node:assert/strict';
import {
  buildFiveModelProductionScannerSurfaceReadbackReport,
} from './five-model-production-scanner-surface-readback';
import type { FiveModelProductionScannerSurfaceActivation } from '../../src/lib/fiveModelProductionScannerSurface';
import type { UnifiedDeskOutputScannerSurfaceRow } from '../../src/lib/unifiedDeskOutputScannerSurface';

function row(index: number, session: 'morning' | 'lunch', state: 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ'): UnifiedDeskOutputScannerSurfaceRow {
  const stateLabel = state === 'APPROVED_DESK_PLAN' ? 'Approved Desk Plan' : 'Forming Desk Read';
  return {
    cardId: `five-model-row-${index}`,
    date: '2026-06-09',
    session,
    state,
    stateLabel,
    model: index % 2 === 0 ? 'Liquidity Raid Reclaim Reversal' : 'Failed Breakout Reversal',
    direction: index % 2 === 0 ? 'LONG' : 'SHORT',
    headline: `${stateLabel} | ${session.toUpperCase()} | ${index}`,
    bodyLines: ['Five-model row from tracked local runtime surface.'],
    levelLine: 'Entry 7540.75 | Stop 7536.25 | T1 7547.50 | T2 7549.75',
    riskLine: 'Risk remains from scanner-owned entry/stop.',
    proofLine: 'Completed 5M proof: 10:15 ET.',
    invalidationLine: 'Invalid if protected 5M structure fails.',
    authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off.',
    scannerVisibleNow: true,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
  };
}

const rows = [
  ...Array.from({ length: 5 }, (_, index) => row(index + 1, index < 3 ? 'morning' : 'lunch', 'APPROVED_DESK_PLAN')),
  ...Array.from({ length: 13 }, (_, index) => row(index + 6, index < 7 ? 'morning' : 'lunch', 'FORMING_DESK_READ')),
];

const surface: FiveModelProductionScannerSurfaceActivation = {
  reportType: 'five_model_production_scanner_surface_activation',
  generatedAt: '2026-07-26T18:20:00.000Z',
  status: 'active',
  approval: {
    explicitProductionApproval: true,
    approvalScope: 'five_model_scanner_surface_rows_only',
    discordPostingRemainsGuarded: true,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    automatedOrders: false,
  },
  authority: {
    scannerVisibleNow: true,
    localRuntimeSurfaceOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    canExecute: false,
    automatedOrders: false,
  },
  source: {
    scannerSurfaceSmokePath: 'surface-smoke.json',
  },
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
    blockedRows: 0,
  },
  rows,
  blockers: [],
};

const report = buildFiveModelProductionScannerSurfaceReadbackReport({
  runtimeSurfacePath: 'runtime.json',
  runtimeSurface: surface,
  runtimeReadSource: 'primary',
  runtimeError: null,
  runtimeValidationError: null,
}, '2026-07-26T18:25:00.000Z');

assert.equal(report.reportType, 'five_model_production_scanner_surface_readback');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.readsRuntimeSurfaceOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.canExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.source.runtimeReadSource, 'primary');
assert.equal(report.summary.selectedRows, 18);
assert.equal(report.summary.approvedDeskPlanRows, 5);
assert.equal(report.summary.formingDeskReadRows, 13);
assert.equal(report.summary.morningRows, 10);
assert.equal(report.summary.lunchRows, 8);
assert.equal(report.summary.eveningRows, 0);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.automatedOrderRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_scanner_consumer_file_wiring');
assert.deepEqual(report.blockers, []);

const dirty = structuredClone(surface) as any;
dirty.rows[0].canExecute = true;
const blocked = buildFiveModelProductionScannerSurfaceReadbackReport({
  runtimeSurfacePath: 'runtime.json',
  runtimeSurface: dirty,
  runtimeReadSource: 'primary',
  runtimeError: null,
  runtimeValidationError: null,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.selectedRows, 0);
assert.equal(blocked.summary.canExecuteTrueRows, 1);
assert.equal(blocked.summary.recommendation, 'hold_for_five_model_surface_readback_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('canExecute=true')));

console.log('five-model production scanner surface readback verified');
