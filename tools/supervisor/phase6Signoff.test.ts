import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSupervisorPhase6SignoffStatus } from './phase6Signoff';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'supervisor-phase6-signoff-'));
const auditDir = path.join(tmp, 'audit');
const outDir = path.join(tmp, 'out');
await fs.mkdir(auditDir, { recursive: true });

async function writeTape(fileName: string, event: Record<string, unknown>) {
  await fs.writeFile(
    path.join(auditDir, fileName),
    JSON.stringify({
      reportType: 'scanner_decision_tape',
      tradeDate: event.tradeDate,
      instrument: event.instrument,
      session: event.session,
      events: {
        '2026-06-25T10:30:00.0000000': event.payload,
      },
    }),
  );
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
    discord: { shouldSend: false, sendOrSuppressReason: 'Held locally for Phase 7 proof.' },
  },
});

const ready = await buildSupervisorPhase6SignoffStatus({
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir,
  sinceRecordedAt: null,
  minRoutingEvents: 1,
  minPhase5Events: 1,
  json: false,
});

assert.equal(ready.reportType, 'supervisor_phase6_signoff_status');
assert.equal(ready.phase, 'phase_7_supervisor_signoff_integration');
assert.equal(ready.status, 'ready');
assert.equal(ready.phase6Status, 'pass');
assert.deepEqual(ready.failures, []);
assert.equal(ready.authority.researchOnly, true);
assert.equal(ready.authority.postsDiscord, false);
assert.equal(ready.authority.changesScannerState, false);
assert.equal(ready.authority.changesTradingLogic, false);
assert.equal(ready.authority.changesCanExecute, false);
assert.equal(ready.authority.startsChildProcesses, false);
assert.equal(ready.summary?.discordSignoffStatus, 'ready');
assert.ok(ready.observerJsonPath?.endsWith('.observer.json'));

await writeTape('scanner-decision-tape-2026-06-20-MES-morning.json', {
  tradeDate: '2026-06-20',
  instrument: 'MES',
  session: 'morning',
  payload: {
    recordedAt: '2026-06-20T14:30:10.000Z',
    completed5m: { time: '2026-06-20T10:30:00.0000000', open: 7460, high: 7468, low: 7448, close: 7450.75 },
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
    deskState: { primaryDeskPlay: { direction: 'SHORT', lineInSand: 7450 } },
    discord: { shouldSend: false, sendOrSuppressReason: 'Old-format tape fixture.' },
  },
});

const blocked = await buildSupervisorPhase6SignoffStatus({
  tradeDate: '2026-06-20',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir,
  sinceRecordedAt: null,
  minRoutingEvents: 1,
  minPhase5Events: 1,
  json: false,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.phase6Status, 'fail');
assert.ok(blocked.failures.some((failure) => failure.includes('Observer signoff is not_evaluable')));
assert.ok(blocked.failures.some((failure) => failure.includes('HTF FVG routing field events 0')));
assert.equal(blocked.authority.postsDiscord, false);
assert.equal(blocked.authority.changesTradingLogic, false);

const unavailable = await buildSupervisorPhase6SignoffStatus({
  tradeDate: '2099-01-01',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir,
  sinceRecordedAt: null,
  minRoutingEvents: 1,
  minPhase5Events: 1,
  json: false,
});

assert.equal(unavailable.status, 'unavailable');
assert.equal(unavailable.phase6Status, 'unavailable');
assert.equal(unavailable.summary, null);
assert.equal(unavailable.observerJsonPath, null);
assert.ok(unavailable.failures[0].startsWith('Phase 6 signoff unavailable:'));
assert.equal(unavailable.authority.startsChildProcesses, false);
