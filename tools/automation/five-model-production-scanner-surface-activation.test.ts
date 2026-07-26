import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readRuntimeJson } from '../runtimeJson';
import {
  writeFiveModelProductionScannerSurfaceActivation,
} from './five-model-production-scanner-surface-activation';
import type { FiveModelScannerSurfaceSmokeInput } from '../../src/lib/fiveModelProductionScannerSurface';

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'five-model-production-surface-'));
const smokePath = path.join(outDir, 'surface-smoke.json');
const runtimeSurfacePath = path.join(outDir, '.surface.json');

const row = {
  cardId: 'five-model-row-1',
  date: '2026-06-09',
  session: 'morning' as const,
  state: 'APPROVED_DESK_PLAN' as const,
  stateLabel: 'Approved Desk Plan' as const,
  model: 'Liquidity Raid Reclaim Reversal',
  direction: 'SHORT' as const,
  headline: 'Approved Desk Plan | MORNING | SHORT | Liquidity Raid Reclaim Reversal',
  bodyLines: [
    'Morning short desk output from the five-model visibility gate.',
    'Local scanner adapter contract only; runtime scanner consumption requires this explicit activation.',
  ],
  levelLine: 'Entry 7540.75 | Stop 7544.25 | T1 7535.50 | T2 7533.75',
  riskLine: 'Risk remains from the saved scanner-owned entry/stop line.',
  proofLine: 'Completed 5M proof: 10:15 ET.',
  invalidationLine: 'Invalidation remains the saved protected 5M stop line from the five-model adapter contract.',
  authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off in this adapter.',
  scannerVisibleNow: true as const,
  publishDiscord: false as const,
  writesSupabase: false as const,
  readsLiveBridge: false as const,
  canExecute: false as const,
};

const smoke: FiveModelScannerSurfaceSmokeInput = {
  reportType: 'five_model_scanner_surface_smoke',
  status: 'pass',
  authority: {
    localOnly: true,
    readsSavedAdapterProofOnly: true,
    readsSavedVisibilityContractOnly: true,
    writesDiagnosticArtifactsOnly: true,
    rendersScannerSurfaceOnly: true,
    installsRuntimeAdapter: false,
    scannerRuntimeWired: false,
    productionScannerVisibleNow: false,
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
  summary: {
    renderedRows: 2,
    approvedDeskPlanRows: 1,
    formingDeskReadRows: 1,
    morningRows: 1,
    lunchRows: 1,
    eveningRows: 0,
    scannerRuntimeWiredRows: 0,
    productionScannerVisibleNowRows: 0,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    tradingLogicChangedRows: 0,
    canExecuteChangedRows: 0,
    automatedOrderRows: 0,
    wordingViolationRows: 0,
    blockedRows: 0,
    recommendation: 'ready_for_explicit_runtime_visibility_decision',
  },
  surface: {
    status: 'ready',
    sourceOfTruth: 'scanner_surface_unified_desk_output_consumer',
    localScannerOnly: true,
    rows: [
      row,
      {
        ...row,
        cardId: 'five-model-row-2',
        session: 'lunch',
        state: 'FORMING_DESK_READ',
        stateLabel: 'Forming Desk Read',
      },
    ],
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

fs.writeFileSync(smokePath, `${JSON.stringify(smoke, null, 2)}\n`);

const disabledPath = path.join(outDir, '.disabled-surface.json');
const disabled = await writeFiveModelProductionScannerSurfaceActivation({
  scannerSurfaceSmokePath: smokePath,
  scannerSurfaceSmoke: smoke,
  runtimeSurfacePath: disabledPath,
  outDir,
  explicitProductionApproval: false,
  generatedAt: '2026-07-26T18:00:00.000Z',
});

assert.equal(disabled.report.status, 'disabled');
assert.equal(disabled.report.authority.scannerVisibleNow, false);
assert.equal(disabled.report.summary.selectedRows, 0);
assert.equal(fs.existsSync(disabledPath), false);

const active = await writeFiveModelProductionScannerSurfaceActivation({
  scannerSurfaceSmokePath: smokePath,
  scannerSurfaceSmoke: smoke,
  runtimeSurfacePath,
  outDir,
  explicitProductionApproval: true,
  generatedAt: '2026-07-26T18:05:00.000Z',
});

assert.equal(active.report.status, 'active');
assert.equal(active.report.authority.scannerVisibleNow, true);
assert.equal(active.report.authority.postsDiscord, false);
assert.equal(active.report.authority.writesSupabase, false);
assert.equal(active.report.authority.readsLiveBridge, false);
assert.equal(active.report.authority.changesTradingLogic, false);
assert.equal(active.report.authority.changesCanExecute, false);
assert.equal(active.report.authority.canExecute, false);
assert.equal(active.report.authority.automatedOrders, false);
assert.equal(active.report.summary.selectedRows, 2);
assert.equal(active.report.summary.approvedDeskPlanRows, 1);
assert.equal(active.report.summary.formingDeskReadRows, 1);
assert.equal(active.report.summary.morningRows, 1);
assert.equal(active.report.summary.lunchRows, 1);
assert.equal(active.report.summary.discordPostRows, 0);
assert.equal(active.report.summary.supabaseWriteRows, 0);
assert.equal(active.report.summary.liveBridgeReadRows, 0);
assert.equal(active.report.summary.canExecuteTrueRows, 0);
assert.equal(active.report.summary.tradingLogicChangedRows, 0);
assert.equal(active.report.summary.automatedOrderRows, 0);
assert.equal(fs.existsSync(runtimeSurfacePath), true);

const runtime = (await readRuntimeJson<any>(runtimeSurfacePath)).value;
assert.equal(runtime.reportType, 'five_model_production_scanner_surface_activation');
assert.equal(runtime.status, 'active');
assert.equal(runtime.rows.length, 2);
assert.equal(runtime.summary.selectedRows, 2);

const blockedPath = path.join(outDir, '.blocked-surface.json');
const blocked = await writeFiveModelProductionScannerSurfaceActivation({
  scannerSurfaceSmokePath: smokePath,
  scannerSurfaceSmoke: {
    ...smoke,
    summary: {
      ...smoke.summary,
      discordPostRows: 1,
    },
  },
  runtimeSurfacePath: blockedPath,
  outDir,
  explicitProductionApproval: true,
});

assert.equal(blocked.report.status, 'blocked');
assert.equal(blocked.report.summary.selectedRows, 0);
assert.equal(fs.existsSync(blockedPath), false);
assert.ok(blocked.report.blockers.some((blocker) => blocker.includes('Discord-post rows')));

console.log('five-model production scanner surface activation verified');
