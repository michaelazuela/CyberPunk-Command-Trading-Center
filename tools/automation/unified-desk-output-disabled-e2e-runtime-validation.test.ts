import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildUnifiedDeskOutputDisabledE2ERuntimeValidationReport } from './unified-desk-output-disabled-e2e-runtime-validation';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unified-desk-disabled-e2e-'));
const auditDir = path.join(tempDir, 'discord-audit');
const outDir = path.join(tempDir, 'diagnostic-reports');
fs.mkdirSync(auditDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'unified-desk-output-discord-guarded-live-lane-install-audit-1000.json'), `${JSON.stringify({
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
}, null, 2)}\n`);

function event(args: {
  time: string;
  session: 'morning' | 'lunch';
  model: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  stop: number;
  target1: number;
  target2: number;
}) {
  return {
    time: args.time,
    scannerState: 'Conditional',
    setupCandidateStatus: {
      selected: {
        setupType: args.model,
        direction: args.direction,
        executionStatus: 'Executable',
      },
      statuses: [
        {
          setupType: args.model,
          direction: args.direction,
          executionStatus: 'Executable',
        },
      ],
    },
    plan: {
      canExecute: false,
    },
    visibility: {
      authority: {
        discordEligible: true,
      },
      discordAction: 'post_review',
    },
    deskPublishDecision: {
      action: 'POST_REVIEW',
      discordAction: 'post_review',
      shouldPost: true,
      direction: args.direction,
      setupType: args.model,
      entry: args.entry,
      stop: args.stop,
      t1: args.target1,
      t2: args.target2,
      hasCompletePlan: true,
      canExecute: false,
      invalidationText: `Invalid if price violates ${args.stop}.`,
    },
    discord: {
      shouldSend: false,
    },
  };
}

function writeTape(session: 'morning' | 'lunch', events: Record<string, unknown>) {
  fs.writeFileSync(path.join(auditDir, `scanner-decision-tape-2026-07-22-MES-${session}.json`), `${JSON.stringify({
    reportType: 'scanner_decision_tape',
    tradeDate: '2026-07-22',
    instrument: 'MES',
    session,
    events,
  }, null, 2)}\n`);
}

writeTape('morning', {
  '2026-07-22T09:10:00.0000000': event({
    time: '2026-07-22T09:10:00',
    session: 'morning',
    model: 'NoInstalledSetup',
    direction: 'LONG',
    entry: 7519.5,
    stop: 7515.25,
    target1: 7526,
    target2: 7528,
  }),
  '2026-07-22T11:45:00.0000000': event({
    time: '2026-07-22T11:45:00',
    session: 'morning',
    model: 'historicalReview',
    direction: 'LONG',
    entry: 7546.5,
    stop: 7528.5,
    target1: 7573.5,
    target2: 7582.5,
  }),
});

writeTape('lunch', {
  '2026-07-22T15:45:00.0000000': event({
    time: '2026-07-22T15:45:00',
    session: 'lunch',
    model: 'NoInstalledSetup',
    direction: 'LONG',
    entry: 7540,
    stop: 7535.75,
    target1: 7546.5,
    target2: 7548.5,
  }),
  '2026-07-22T15:50:00.0000000': event({
    time: '2026-07-22T15:50:00',
    session: 'lunch',
    model: 'historicalReview',
    direction: 'SHORT',
    entry: 7541,
    stop: 7546.25,
    target1: 7533.25,
    target2: 7530.5,
  }),
});

const tapePaths = [
  path.join(auditDir, 'scanner-decision-tape-2026-07-22-MES-morning.json'),
  path.join(auditDir, 'scanner-decision-tape-2026-07-22-MES-lunch.json'),
];

const report = buildUnifiedDeskOutputDisabledE2ERuntimeValidationReport({
  scannerAuditDir: auditDir,
  tapePaths,
  instrument: 'MES',
  tradeDate: '2026-07-22',
  sessions: ['morning', 'lunch'],
  idempotencyKey: 'unified-desk-output:disabled-e2e:test',
  outDir,
}, '2026-07-22T23:30:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_disabled_e2e_runtime_validation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.readsSavedScannerArtifactsOnly, true);
assert.equal(report.authority.writesDiagnosticArtifactsOnly, true);
assert.equal(report.authority.runtimeGateEnabled, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.scannerTapeFilesRead, 2);
assert.equal(report.summary.scannerEventsRead, 4);
assert.equal(report.summary.selectorRows, 4);
assert.equal(report.summary.builderRows, 4);
assert.equal(report.summary.disabledRuntimeCards, 4);
assert.equal(report.summary.readinessCandidates, 4);
assert.equal(report.summary.latestProofSelectedRows, 2);
assert.equal(report.summary.provenLaneSelectedRows, 2);
assert.equal(report.summary.manifestSelectedRows, 2);
assert.equal(report.summary.runtimeReceiptSelectedRows, 2);
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.changedFromLatestProof, true);
assert.equal(report.summary.runtimeGateEnabled, false);
assert.equal(report.summary.scannerRuntimeChangedRows, 0);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.automatedOrderRows, 0);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_disabled_scanner_runtime_wiring');
assert.equal(report.selectedCandidates[0]?.model, 'NoInstalledSetup');
assert.equal(report.selectedCandidates[1]?.model, 'NoInstalledSetup');
assert.ok(report.artifacts.runtimeGateReceiptJsonPath);

const blocked = buildUnifiedDeskOutputDisabledE2ERuntimeValidationReport({
  scannerAuditDir: auditDir,
  tapePaths,
  instrument: 'MES',
  tradeDate: '2026-07-22',
  sessions: ['morning', 'lunch'],
  idempotencyKey: '',
  outDir,
});

assert.equal(blocked.status, 'blocked');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('idempotency')));

console.log('Unified Desk Output disabled E2E runtime validation verified.');
