import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildEndOfDayEvidenceBundle } from './endOfDayEvidenceBundle';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'end-of-day-evidence-bundle-'));
const auditDir = path.join(tmp, 'audit');
const outDir = path.join(tmp, 'out');
const manifestDir = path.join(tmp, 'signoff-manifests');
const bundleDir = path.join(tmp, 'bundle');
await fs.mkdir(auditDir, { recursive: true });

await fs.writeFile(path.join(auditDir, 'scanner-decision-tape-2026-06-25-MES-morning.json'), JSON.stringify({
  reportType: 'scanner_decision_tape',
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-25T10:30:00.0000000': {
      recordedAt: '2026-06-25T14:30:10.000Z',
      completed5m: { time: '2026-06-25T10:30:00.0000000', open: 7460, high: 7468, low: 7448, close: 7450.75 },
      currentPrice: 7464.75,
      scannerState: 'Approved',
      setupCandidateStatus: {
        selected: {
          setupType: 'NoInstalledSetup',
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
      discord: { shouldSend: false, sendOrSuppressReason: 'Held locally for Phase 10 proof.' },
    },
  },
}));

const bundle = await buildEndOfDayEvidenceBundle({
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir,
  manifestDir,
  bundleDir,
  sinceRecordedAt: null,
  minRoutingEvents: 1,
  minPhase5Events: 1,
  json: false,
  includeSupervisorStatus: false,
});

assert.equal(bundle.reportType, 'supervisor_end_of_day_evidence_bundle');
assert.equal(bundle.phase, 'phase_10_end_of_day_evidence_bundle');
assert.equal(bundle.status, 'ready');
assert.equal(bundle.signoffStatus, 'ready');
assert.equal(bundle.phase6Status, 'pass');
assert.deepEqual(bundle.failures, []);
assert.equal(bundle.authority.readOnly, true);
assert.equal(bundle.authority.postsDiscord, false);
assert.equal(bundle.authority.writesSupabase, false);
assert.equal(bundle.authority.startsChildProcesses, false);
assert.equal(bundle.authority.changesScannerState, false);
assert.equal(bundle.authority.changesTradingLogic, false);
assert.equal(bundle.authority.changesCanExecute, false);
assert.ok(bundle.files.signoffManifest?.endsWith('live-signoff-manifest-2026-06-25-MES-morning.json'));
assert.ok(bundle.files.scannerDecisionTape?.endsWith('scanner-decision-tape-2026-06-25-MES-morning.json'));
assert.ok(bundle.files.phase6ObserverJson?.endsWith('.observer.json'));
assert.equal(bundle.files.supervisorStatus, null);

for (const filePath of [bundle.files.signoffManifest, bundle.files.scannerDecisionTape, bundle.files.phase6ObserverJson]) {
  assert.ok(filePath);
  await fs.access(filePath);
}

const writtenManifest = JSON.parse(await fs.readFile(path.join(bundleDir, 'manifest.json'), 'utf8'));
assert.equal(writtenManifest.reportType, 'supervisor_end_of_day_evidence_bundle');
assert.equal(writtenManifest.status, 'ready');
