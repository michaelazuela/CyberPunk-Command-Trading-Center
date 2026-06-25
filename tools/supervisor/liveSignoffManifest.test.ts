import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildLiveSignoffManifest } from './liveSignoffManifest';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'live-signoff-manifest-'));
const auditDir = path.join(tmp, 'audit');
const outDir = path.join(tmp, 'out');
const manifestDir = path.join(tmp, 'manifests');
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
      discord: { shouldSend: false, sendOrSuppressReason: 'Held locally for Phase 9 proof.' },
    },
  },
}));

const manifest = await buildLiveSignoffManifest({
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir,
  manifestDir,
  sinceRecordedAt: null,
  minRoutingEvents: 1,
  minPhase5Events: 1,
  json: false,
});

assert.equal(manifest.reportType, 'supervisor_live_signoff_manifest');
assert.equal(manifest.phase, 'phase_9_signoff_manifest_archive');
assert.equal(manifest.status, 'ready');
assert.equal(manifest.phase6Status, 'pass');
assert.deepEqual(manifest.failures, []);
assert.equal(manifest.authority.readOnly, true);
assert.equal(manifest.authority.postsDiscord, false);
assert.equal(manifest.authority.writesSupabase, false);
assert.equal(manifest.authority.changesScannerState, false);
assert.equal(manifest.authority.changesTradingLogic, false);
assert.equal(manifest.authority.changesCanExecute, false);
assert.equal(manifest.authority.startsChildProcesses, false);
assert.equal(manifest.evidence.discordSignoffStatus, 'ready');
assert.equal(manifest.evidence.phase4EnforcementFailures, 0);
assert.equal(manifest.evidence.htfFvgPhase5ContractFailures, 0);
assert.equal(manifest.evidence.htfFvgReactionRoutingEvents, 1);
assert.equal(manifest.evidence.htfFvgPhase5ContractEvents, 1);
assert.ok(manifest.archivedPaths.manifestJsonPath.endsWith('live-signoff-manifest-2026-06-25-MES-morning.json'));
assert.ok(manifest.archivedPaths.supervisorPhase6ObserverJsonPath?.endsWith('.observer.json'));
assert.match(manifest.bottomLine, /Phase 9 live signoff manifest archived/);

const written = JSON.parse(await fs.readFile(manifest.archivedPaths.manifestJsonPath, 'utf8'));
assert.equal(written.reportType, 'supervisor_live_signoff_manifest');
assert.equal(written.status, 'ready');
