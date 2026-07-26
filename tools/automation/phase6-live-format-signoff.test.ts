import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildPhase6LiveFormatSignoff } from './phase6-live-format-signoff';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'phase6-live-format-signoff-'));
const auditDir = path.join(tmp, 'audit');
const outDir = path.join(tmp, 'out');
await fs.mkdir(auditDir, { recursive: true });

await fs.writeFile(path.join(auditDir, 'scanner-decision-tape-2026-06-25-MES-morning.json'), JSON.stringify({
  reportType: 'scanner_decision_tape',
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-25T10:30:00.0000000': {
      recordedAt: '2026-06-25T14:30:10.000Z',
      completed5m: {
        time: '2026-06-25T10:30:00.0000000',
        open: 7460,
        high: 7468,
        low: 7448,
        close: 7450.75,
      },
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
      plan: {
        canExecute: false,
      },
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
      discord: {
        shouldSend: false,
        sendOrSuppressReason: 'Held locally for Phase 6 proof.',
      },
    },
    '2026-06-25T10:35:00.0000000': {
      recordedAt: '2026-06-25T14:35:10.000Z',
      completed5m: {
        time: '2026-06-25T10:35:00.0000000',
        open: 7450.75,
        high: 7462,
        low: 7444,
        close: 7460.5,
      },
      currentPrice: 7450.25,
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
      plan: {
        canExecute: false,
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'SHORT',
          lineInSand: 7450,
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
              latestReaction: { close: 7460.5 },
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
      discord: {
        shouldSend: false,
        sendOrSuppressReason: 'Held locally for Phase 6 proof.',
      },
    },
  },
}));

const passReport = await buildPhase6LiveFormatSignoff({
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir,
  sinceRecordedAt: '2026-06-25T14:32:00.000Z',
  minRoutingEvents: 1,
  minPhase5Events: 1,
  json: false,
});

assert.equal(passReport.authority.researchOnly, true);
assert.equal(passReport.authority.postsDiscord, false);
assert.equal(passReport.authority.changesScannerState, false);
assert.equal(passReport.authority.changesTradingLogic, false);
assert.equal(passReport.authority.changesCanExecute, false);
assert.equal(passReport.status, 'pass');
assert.deepEqual(passReport.failures, []);
assert.equal(passReport.summary.discordSignoffStatus, 'ready');
assert.equal(passReport.summary.phase4EnforcementFailures, 0);
assert.equal(passReport.summary.htfFvgPhase5ContractFailures, 0);
assert.equal(passReport.summary.htfFvgReactionRoutingEvents, 1);
assert.ok(passReport.observerJsonPath.endsWith('.observer.json'));
assert.match(passReport.bottomLine, /Phase 6 live-format signoff passed/);

await fs.writeFile(path.join(auditDir, 'scanner-decision-tape-2026-06-20-MES-morning.json'), JSON.stringify({
  reportType: 'scanner_decision_tape',
  tradeDate: '2026-06-20',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-20T10:30:00.0000000': {
      recordedAt: '2026-06-20T14:30:10.000Z',
      completed5m: {
        time: '2026-06-20T10:30:00.0000000',
        open: 7460,
        high: 7468,
        low: 7448,
        close: 7450.75,
      },
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
      plan: {
        canExecute: false,
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'SHORT',
          lineInSand: 7450,
        },
      },
      discord: {
        shouldSend: false,
        sendOrSuppressReason: 'Old-format tape fixture.',
      },
    },
  },
}));

const failReport = await buildPhase6LiveFormatSignoff({
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

assert.equal(failReport.status, 'fail');
assert.ok(failReport.failures.some((failure) => failure.includes('Observer signoff is not_evaluable')));
assert.ok(failReport.failures.some((failure) => failure.includes('HTF FVG routing field events 0')));
assert.ok(failReport.failures.some((failure) => failure.includes('Phase 5 contract events 0')));
