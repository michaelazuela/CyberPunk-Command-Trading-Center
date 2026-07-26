import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildUnifiedDeskOutputFreshGuardedScannerOutputReport } from './unified-desk-output-fresh-guarded-scanner-output';

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fresh-guarded-scanner-output-'));

const row = (session: 'morning' | 'lunch', proofTime: string, state = 'APPROVED_DESK_PLAN') => ({
  date: proofTime.slice(0, 10),
  session,
  visibleState: state,
  model: session === 'morning' ? 'NoInstalledSetup' : 'NoInstalledSetup',
  direction: session === 'morning' ? 'LONG' as const : 'SHORT' as const,
  proofTime,
  entry: session === 'morning' ? 100 : 200,
  stop: session === 'morning' ? 96 : 204,
  target1: session === 'morning' ? 106 : 194,
  target2: session === 'morning' ? 108 : 192,
  riskPoints: 4,
  movement: session === 'morning' ? 'opening_drive' : 'after_lunch_drive',
  primaryLane: session === 'morning' ? 'NoInstalledSetup' : 'NoInstalledSetup',
  contextLabels: ['NoInstalledSetup'],
  sourceCandidateRole: 'primary_lane' as const,
  deskLanguage: {
    headline: `${state === 'APPROVED_DESK_PLAN' ? 'Approved Desk Plan' : 'Forming Desk Read'} ${session}`,
    what: `${session} scanner-owned desk plan.`,
    where: 'Entry, stop, T1, T2 are present.',
    when: `Completed 5M proof time ${proofTime.slice(11, 16)} ET.`,
    why: 'Saved selector preview generated this candidate.',
    invalidation: 'Invalid if price violates the protected 5M stop line.',
    authority: 'Decision-support desk output only. No automated orders.',
  },
});

const report = buildUnifiedDeskOutputFreshGuardedScannerOutputReport({
  selectorPreviewPath: 'fixture-selector-preview.json',
  selectorPreviewReport: {
    reportType: 'unified_desk_output_selector_preview',
    generatedAt: '2026-07-22T00:00:00.000Z',
    rows: [
      row('morning', '2026-07-20T09:55:00'),
      row('morning', '2026-07-21T10:50:00'),
      row('lunch', '2026-07-17T13:25:00'),
      row('lunch', '2026-07-18T13:25:00', 'FORMING_DESK_READ'),
    ],
  },
  guardedLaneAuditPath: 'fixture-guarded-lane.json',
  guardedLaneAuditReport: {
    reportType: 'unified_desk_output_discord_guarded_live_lane_contract',
    status: 'pass',
    lane: {
      enabledByDefault: false,
      scannerOwnedOnly: true,
      allowedDeskStates: ['APPROVED_DESK_PLAN'],
      maxPostsPerSession: 1,
      sessions: ['morning', 'lunch'],
      requiresFreshManifest: true,
      requiresFreshIdempotencyKey: true,
      refusesDuplicateIdempotencyKey: true,
      requiresExplicitApprovalForProductionSend: true,
    },
    authority: {
      postsDiscordNow: false,
      webhookCallRows: 0,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    summary: {
      laneEnabledByDefault: false,
      approvedDeskPlanOnly: true,
      maxPostsPerSession: 1,
      webhookCallRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      blockedRows: 0,
    },
    blockers: [],
  } as never,
  outDir,
}, '2026-07-22T01:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_fresh_guarded_scanner_output');
assert.equal(report.status, 'pass');
assert.equal(report.summary.selectorRows, 4);
assert.equal(report.summary.builderRows, 4);
assert.equal(report.summary.disabledRuntimeCards, 4);
assert.equal(report.summary.readinessCandidates, 4);
assert.equal(report.summary.eligibleApprovedDeskPlanRows, 3);
assert.equal(report.summary.guardedSelectedRows, 2);
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.suppressedRows, 1);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.summary.recommendation, 'fresh_guarded_scanner_output_ready');
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.selectedCandidates[0].proofTime, '2026-07-21T10:50:00');
assert.equal(report.selectedCandidates[1].proofTime, '2026-07-17T13:25:00');
assert.ok(fs.existsSync(report.artifacts.builderPreviewJsonPath));
assert.ok(fs.existsSync(report.artifacts.disabledRuntimeAdapterJsonPath));
assert.ok(fs.existsSync(report.artifacts.liveGateReadinessJsonPath));
assert.ok(fs.existsSync(report.artifacts.guardedLocalLaneJsonPath));

fs.rmSync(outDir, { recursive: true, force: true });
