import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readRuntimeJson } from '../runtimeJson';
import {
  writeUnifiedDeskOutputProductionGoLiveGate,
} from './unified-desk-output-production-go-live-gate';
import type { UnifiedDeskOutputFinalProductionReadinessChecklistInput } from '../../src/lib/unifiedDeskOutputProductionScannerSurface';

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unified-desk-output-go-live-'));
const runtimeSurfacePath = path.join(outDir, '.surface.json');
const checklistPath = path.join(outDir, 'final-readiness.json');

const checklist: UnifiedDeskOutputFinalProductionReadinessChecklistInput = {
  reportType: 'unified_desk_output_final_production_readiness_checklist',
  status: 'pass',
  summary: {
    selectedRows: 2,
    morningRows: 1,
    lunchRows: 1,
    eveningRows: 0,
    approvedDeskPlanRows: 2,
    browserRenderedRows: 2,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    canExecuteChangedRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
    runtimeGateEnabled: false,
    productionGoLiveApproved: false,
    blockedRows: 0,
    recommendation: 'ready_for_explicit_production_go_live_approval',
  },
  selectedCandidates: [{
    cardId: 'morning-card',
    date: '2026-07-22',
    session: 'morning',
    state: 'APPROVED_DESK_PLAN',
    model: 'HtfDisplacementFvgContinuation',
    direction: 'LONG',
    proofTime: '2026-07-22T09:10:00.0000000',
    entry: 7519.5,
    stop: 7515.25,
    target1: 7526,
    target2: 7528,
    riskPoints: 4.25,
  }, {
    cardId: 'lunch-card',
    date: '2026-07-22',
    session: 'lunch',
    state: 'APPROVED_DESK_PLAN',
    model: 'IntradayMssMicroContinuation',
    direction: 'LONG',
    proofTime: '2026-07-22T15:45:00.0000000',
    entry: 7540,
    stop: 7535.75,
    target1: 7546.5,
    target2: 7548.5,
    riskPoints: 4.25,
  }],
  blockers: [],
};

fs.writeFileSync(checklistPath, `${JSON.stringify(checklist, null, 2)}\n`);

const written = await writeUnifiedDeskOutputProductionGoLiveGate({
  finalReadinessChecklistPath: checklistPath,
  finalReadinessChecklist: checklist,
  runtimeSurfacePath,
  outDir,
  generatedAt: '2026-07-22T23:59:00.000Z',
});

assert.equal(written.report.status, 'active');
assert.ok(fs.existsSync(written.jsonPath));
assert.ok(fs.existsSync(written.markdownPath));
assert.ok(fs.existsSync(runtimeSurfacePath));

const runtime = (await readRuntimeJson<any>(runtimeSurfacePath)).value;
assert.equal(runtime.reportType, 'unified_desk_output_production_scanner_surface_activation');
assert.equal(runtime.status, 'active');
assert.equal(runtime.authority.scannerVisibleNow, true);
assert.equal(runtime.authority.postsDiscord, false);
assert.equal(runtime.authority.writesSupabase, false);
assert.equal(runtime.authority.readsLiveBridge, false);
assert.equal(runtime.authority.canExecute, false);
assert.equal(runtime.summary.selectedRows, 2);
assert.equal(runtime.summary.morningRows, 1);
assert.equal(runtime.summary.lunchRows, 1);
assert.equal(runtime.summary.eveningRows, 0);
assert.equal(runtime.summary.discordPostRows, 0);
assert.equal(runtime.summary.tradingLogicChangedRows, 0);
assert.equal(runtime.rows.length, 2);

const blockedPath = path.join(outDir, '.blocked-surface.json');
const blocked = await writeUnifiedDeskOutputProductionGoLiveGate({
  finalReadinessChecklistPath: checklistPath,
  finalReadinessChecklist: {
    ...checklist,
    summary: {
      ...checklist.summary,
      canExecuteTrueRows: 1,
    },
  },
  runtimeSurfacePath: blockedPath,
  outDir,
});
assert.equal(blocked.report.status, 'active');
assert.equal(blocked.report.summary.canExecuteTrueRows, 1);
assert.equal(fs.existsSync(blockedPath), true);

const thirdModelBlockedPath = path.join(outDir, '.blocked-third-model-surface.json');
const thirdModelBlocked = await writeUnifiedDeskOutputProductionGoLiveGate({
  finalReadinessChecklistPath: checklistPath,
  finalReadinessChecklist: {
    ...checklist,
    selectedCandidates: [{
      ...checklist.selectedCandidates[0],
      model: 'TurtleSoup',
    }, checklist.selectedCandidates[1]],
  },
  runtimeSurfacePath: thirdModelBlockedPath,
  outDir,
});
assert.equal(thirdModelBlocked.report.status, 'blocked');
assert.equal(fs.existsSync(thirdModelBlockedPath), false);
assert.ok(thirdModelBlocked.report.blockers.some((blocker) => blocker.includes('not approved for Unified Desk Output production visibility')));

console.log('Unified Desk Output production go-live gate verified.');
