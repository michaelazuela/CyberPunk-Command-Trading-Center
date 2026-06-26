import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildLiveObservationSignoff } from './liveObservationSignoff';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'live-observation-signoff-'));
const auditDir = path.join(tmp, 'audit');
const observerOutDir = path.join(tmp, 'observer');
const outDir = path.join(tmp, 'signoff');
const bundleRoot = path.join(tmp, 'bundles');
await fs.mkdir(auditDir, { recursive: true });

async function writeTape(fileName: string, payload: Record<string, unknown>) {
  await fs.writeFile(
    path.join(auditDir, fileName),
    JSON.stringify({
      reportType: 'scanner_decision_tape',
      tradeDate: payload.tradeDate,
      instrument: payload.instrument,
      session: payload.session,
      events: {
        '2026-06-25T10:30:00.0000000': payload.payload,
      },
    }),
  );
}

async function writeReadyBundle() {
  const bundleDir = path.join(bundleRoot, '2026-06-25', 'MES', 'morning');
  await fs.mkdir(bundleDir, { recursive: true });
  const signoffManifest = path.join(bundleDir, 'live-signoff-manifest-2026-06-25-MES-morning.json');
  const scannerDecisionTape = path.join(bundleDir, 'scanner-decision-tape-2026-06-25-MES-morning.json');
  const phase6ObserverJson = path.join(bundleDir, 'phase6-live-format-signoff-2026-06-25-MES-morning.observer.json');
  const supervisorStatus = path.join(bundleDir, 'supervisor-status.json');
  for (const filePath of [signoffManifest, scannerDecisionTape, phase6ObserverJson, supervisorStatus]) {
    await fs.writeFile(filePath, JSON.stringify({ ok: true }));
  }
  await fs.writeFile(path.join(bundleDir, 'manifest.json'), JSON.stringify({
    reportType: 'supervisor_end_of_day_evidence_bundle',
    phase: 'phase_10_end_of_day_evidence_bundle',
    generatedAt: '2026-06-25T16:00:00.000Z',
    authority: {
      readOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      startsChildProcesses: false,
      changesScannerState: false,
      changesTradingLogic: false,
      changesCanExecute: false,
    },
    tradeDate: '2026-06-25',
    instrument: 'MES',
    session: 'morning',
    status: 'ready',
    signoffStatus: 'ready',
    phase6Status: 'pass',
    bundleDir,
    files: { signoffManifest, scannerDecisionTape, phase6ObserverJson, supervisorStatus },
    failures: [],
    bottomLine: 'ready',
  }));
}

await writeTape('scanner-decision-tape-2026-06-25-MES-morning.json', {
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  payload: {
    recordedAt: '2026-06-25T14:30:10.000Z',
    completed5m: { time: '2026-06-25T10:30:00.0000000', open: 7460, high: 7468, low: 7448, close: 7450.75 },
    currentPrice: 7464.75,
    scannerState: 'Approved',
    setupCandidateStatus: {
      selected: {
        setupType: 'SweepMssFvgRetrace',
        direction: 'SHORT',
        executionStatus: 'Executable',
        entry: 7454.75,
        stop: 7490.75,
        target1: 7400.75,
        target2: 7382.75,
      },
    },
    plan: { canExecute: false },
    deskState: {
      primaryDeskPlay: {
        direction: 'SHORT',
        lineInSand: 7460,
        htfFvgReactionRouting: {
          status: 'routed_active_reaction',
          direction: 'SHORT',
          lineInSand: 7472.25,
          lineLabel: 'SHORT BELOW 7472.25 from 240M parent FVG 7472.25-7512.00',
          lifecycleState: 'holding',
          standDown: 'Stand down on completed 5M acceptance above parent zone 7512.00.',
          approvalBoundary: {
            changesTradeApprovals: false,
            changesCanExecute: false,
            changesEntryStopTargets: false,
            changesRiskRules: false,
            changesRanking: false,
            createsNewModel: false,
          },
        },
        htfFvgReactionMemory: {
          activeReaction: {
            direction: 'SHORT',
            timeframe: '240M',
            lower: 7472.25,
            upper: 7512,
            state: 'holding',
            lifecycle: { state: 'holding' },
            latestReaction: { close: 7450.75 },
          },
        },
        htfFvgCascade: {
          parentZone: {
            direction: 'SHORT',
            timeframe: '240M',
            lower: 7472.25,
            upper: 7512,
          },
        },
      },
    },
    discord: { shouldSend: false, sendOrSuppressReason: 'Held locally for Phase 17 proof.' },
  },
});

const readyWithoutBundle = await buildLiveObservationSignoff({
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  observerOutDir,
  outDir,
  bundleRoot,
  sinceRecordedAt: null,
  minRoutingEvents: 1,
  minPhase5Events: 1,
  requireEvidenceSummary: false,
  json: false,
});

assert.equal(readyWithoutBundle.reportType, 'supervisor_live_observation_signoff');
assert.equal(readyWithoutBundle.phase, 'phase_17_live_scanner_discord_observation');
assert.equal(readyWithoutBundle.status, 'ready');
assert.notEqual(readyWithoutBundle.evidenceSummary.status, 'ready');
assert.equal(readyWithoutBundle.checks.evidenceSummaryReadyOrNotRequired, true);
assert.deepEqual(readyWithoutBundle.failures, []);
assert.equal(readyWithoutBundle.authority.postsDiscord, false);
assert.equal(readyWithoutBundle.authority.writesSupabase, false);
assert.equal(readyWithoutBundle.authority.startsScannerServices, false);
assert.equal(readyWithoutBundle.authority.changesScannerState, false);
assert.equal(readyWithoutBundle.authority.changesTradingLogic, false);
assert.equal(readyWithoutBundle.authority.changesCanExecute, false);
assert.equal(readyWithoutBundle.authority.changesEntryStopTargets, false);
assert.ok(readyWithoutBundle.reportPath.endsWith('live-observation-signoff-2026-06-25-MES-morning.json'));
await fs.access(readyWithoutBundle.reportPath);

const blockedForRequiredBundle = await buildLiveObservationSignoff({
  ...readyWithoutBundle,
  auditDir,
  observerOutDir,
  outDir,
  bundleRoot,
  minRoutingEvents: 1,
  minPhase5Events: 1,
  requireEvidenceSummary: true,
  json: false,
});

assert.equal(blockedForRequiredBundle.status, 'blocked');
assert.ok(blockedForRequiredBundle.failures.some((failure) => failure.includes('Evidence summary is')));

await writeReadyBundle();
const readyWithRequiredBundle = await buildLiveObservationSignoff({
  ...readyWithoutBundle,
  auditDir,
  observerOutDir,
  outDir,
  bundleRoot,
  minRoutingEvents: 1,
  minPhase5Events: 1,
  requireEvidenceSummary: true,
  json: false,
});

assert.equal(readyWithRequiredBundle.status, 'ready');
assert.equal(readyWithRequiredBundle.evidenceSummary.status, 'ready');
assert.equal(readyWithRequiredBundle.checks.supervisorPhase6Ready, true);
assert.equal(readyWithRequiredBundle.checks.discordSignoffReady, true);
assert.equal(readyWithRequiredBundle.checks.phase4FailuresZero, true);
assert.equal(readyWithRequiredBundle.checks.phase5FailuresZero, true);
assert.equal(readyWithRequiredBundle.checks.htfRoutingEventsPresent, true);
assert.equal(readyWithRequiredBundle.checks.phase5ContractEventsPresent, true);
assert.equal(readyWithRequiredBundle.checks.evidenceSummaryReadyOrNotRequired, true);

console.log('Live observation signoff test verified.');
