import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildLiveDeskObserverReport } from './live-desk-observer';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'live-desk-observer-'));
const auditDir = path.join(tmp, 'audit');
fs.mkdirSync(auditDir, { recursive: true });

const tapePath = path.join(auditDir, 'scanner-decision-tape-2026-06-18-MES-morning.json');
fs.writeFileSync(tapePath, JSON.stringify({
  reportType: 'scanner_decision_tape',
  tradeDate: '2026-06-18',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-18T09:35:00.0000000': {
      completed5m: {
        time: '2026-06-18T09:35:00.0000000',
        open: 7577,
        high: 7581.75,
        low: 7557.25,
        close: 7557.5,
      },
      currentPrice: 7538.5,
      scannerState: 'Missed',
      setupCandidateStatus: {
        selected: {
          setupType: 'SweepMssFvgRetrace',
          direction: 'SHORT',
          executionStatus: 'Executable',
          entry: 7554,
          stop: 7559,
          target1: 7546.5,
          target2: 7544,
        },
      },
      plan: {
        canExecute: true,
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'SHORT',
          lineInSand: 7553.25,
        },
      },
      reviewStatus: 'already_triggered_no_fresh_entry',
      staleReason: 'T1 was already reached before alert generation. Move occurred without preferred retest. No chase entry.',
      discord: {
        shouldSend: false,
        sendOrSuppressReason: 'Duplicate alert suppressed for same setup/reference/direction/state.',
      },
    },
    '2026-06-18T09:50:00.0000000': {
      completed5m: {
        time: '2026-06-18T09:50:00.0000000',
        open: 7538.75,
        high: 7550.25,
        low: 7535.5,
        close: 7549,
      },
      currentPrice: 7547.5,
      scannerState: 'Approved',
      setupCandidateStatus: {
        selected: {
          setupType: 'TurtleSoup',
          direction: 'LONG',
          executionStatus: 'Executable',
          entry: 7549,
          stop: 7535.25,
          target1: 7580,
          target2: 7590,
        },
      },
      plan: {
        canExecute: false,
      },
      candidateLifecycleTrace: {
        activeCampaign: { direction: 'LONG' },
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'SHORT',
          lineInSand: 7545.5,
          htfFvgReactionRouting: {
            status: 'routed_active_reaction',
            direction: 'SHORT',
            lineInSand: 7596,
            lineLabel: 'SHORT BELOW 7596.00 from 60M parent FVG 7596.00-7604.00',
            lifecycleState: 'rejected',
            standDown: 'Stand down on completed 5M acceptance above parent zone 7604.00.',
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
              timeframe: '60M',
              lower: 7596,
              upper: 7604,
              lifecycle: { state: 'rejected' },
            },
          },
          htfFvgCascade: {
            parentZone: {
              direction: 'SHORT',
              timeframe: '60M',
              lower: 7596,
              upper: 7604,
            },
          },
        },
      },
      discord: {
        shouldSend: true,
        sendOrSuppressReason: 'High-Quality Trade Plan qualified for Discord.',
      },
    },
  },
}));

const report = await buildLiveDeskObserverReport({
  tradeDate: '2026-06-18',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir: path.join(tmp, 'out'),
  json: false,
  watch: false,
  pollSeconds: 60,
});

assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.discordSends, 1);
assert.equal(report.summary.staleOrNoChaseFlags, 1);
assert.equal(report.summary.candidateDeskConflicts, 1);
assert.equal(report.summary.htfFvgReactionRoutingFieldEvents, 1);
assert.equal(report.summary.htfFvgReactionRoutingEvents, 1);
assert.equal(report.summary.htfFvgReactionRoutingConflicts, 1);
assert.equal(report.summary.htfFvgReactionBoundaryDrift, 0);
assert.equal(report.summary.phase4EnforcementFailures, 1);
assert.equal(report.summary.htfFvgPhase5ContractEvents, 1);
assert.equal(report.summary.htfFvgPhase5ContractFailures, 0);
assert.equal(report.summary.discordSignoffStatus, 'blocked');
assert.equal(report.observations[1].htfFvgReactionRoutingDirection, 'SHORT');
assert.equal(report.observations[1].htfFvgReactionPhase4Enforcement, 'fail');
assert.equal(report.observations[1].htfFvgPhase5ContractStatus, 'pass');
assert.ok(report.observations[1].observerFlags.includes('htf_fvg_reaction_selected_conflict'));
assert.ok(report.observations[1].observerFlags.includes('htf_fvg_reaction_campaign_conflict'));
assert.match(report.bottomLine, /Discord sign-off blocked/);
assert.match(report.markdown, /# Live Trading Time Observer - MES 2026-06-18/);
assert.match(report.markdown, /Active desk coverage: RTH 09:15-16:00 ET/);
assert.match(report.markdown, /No chase/);
assert.match(report.markdown, /Discord sign-off status: blocked/);
assert.match(report.markdown, /Block Discord sign-off until active HTF FVG reaction routing agrees/);
assert.match(report.markdown, /Phase 5 contract events: 1/);

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-06-17-MES-morning.json'), JSON.stringify({
  reportType: 'scanner_decision_tape',
  tradeDate: '2026-06-17',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-17T09:35:00.0000000': {
      completed5m: {
        time: '2026-06-17T09:35:00.0000000',
        open: 7577,
        high: 7581.75,
        low: 7557.25,
        close: 7557.5,
      },
      currentPrice: 7558,
      scannerState: 'Watching',
      setupCandidateStatus: {
        selected: {
          setupType: 'TurtleSoup',
          direction: 'SHORT',
          executionStatus: 'Watching',
        },
      },
      plan: {
        canExecute: false,
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'SHORT',
          lineInSand: 7553.25,
        },
      },
      discord: {
        shouldSend: false,
        sendOrSuppressReason: 'Duplicate alert suppressed for same setup/reference/direction/state.',
      },
    },
  },
}));

const oldFormatReport = await buildLiveDeskObserverReport({
  tradeDate: '2026-06-17',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir: path.join(tmp, 'out'),
  json: false,
  watch: false,
  pollSeconds: 60,
});

assert.equal(oldFormatReport.summary.htfFvgReactionRoutingFieldEvents, 0);
assert.equal(oldFormatReport.summary.htfFvgReactionRoutingEvents, 0);
assert.equal(oldFormatReport.summary.phase4EnforcementFailures, 0);
assert.equal(oldFormatReport.summary.htfFvgPhase5ContractEvents, 0);
assert.equal(oldFormatReport.summary.htfFvgPhase5ContractFailures, 0);
assert.equal(oldFormatReport.summary.discordSignoffStatus, 'not_evaluable');
assert.match(oldFormatReport.bottomLine, /Discord sign-off not evaluable/);
assert.match(oldFormatReport.markdown, /Discord sign-off status: not_evaluable/);

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-06-20-MES-morning.json'), JSON.stringify({
  reportType: 'scanner_decision_tape',
  tradeDate: '2026-06-20',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-20T09:50:00.0000000': {
      completed5m: {
        time: '2026-06-20T09:50:00.0000000',
        open: 7600,
        high: 7603,
        low: 7580,
        close: 7588,
      },
      currentPrice: 7588,
      scannerState: 'Conditional',
      setupCandidateStatus: {
        selected: {
          setupType: 'IntradayMssMicroContinuation',
          direction: 'SHORT',
          executionStatus: 'Conditional',
          entry: 7588,
          stop: 7604,
          target1: 7564,
          target2: 7556,
        },
      },
      plan: {
        canExecute: false,
      },
      candidateLifecycleTrace: {
        activeCampaign: { direction: 'SHORT' },
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'SHORT',
          lineInSand: 7596,
          htfFvgReactionRouting: {
            status: 'routed_active_reaction',
            direction: 'SHORT',
            lineInSand: 7596,
            lineLabel: 'SHORT BELOW 7596.00 from 60M parent FVG 7596.00-7604.00',
            lifecycleState: 'rejected',
            standDown: 'Stand down on completed 5M acceptance above parent zone 7604.00.',
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
              timeframe: '60M',
              lower: 7596,
              upper: 7604,
              lifecycle: { state: 'rejected' },
            },
          },
        },
      },
      discord: {
        shouldSend: true,
        sendOrSuppressReason: 'High-confidence conditional plan qualified for Discord.',
      },
    },
  },
}));

const phase5BlockedReport = await buildLiveDeskObserverReport({
  tradeDate: '2026-06-20',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir: path.join(tmp, 'out'),
  json: false,
  watch: false,
  pollSeconds: 60,
});

assert.equal(phase5BlockedReport.summary.phase4EnforcementFailures, 0);
assert.equal(phase5BlockedReport.summary.htfFvgPhase5ContractEvents, 1);
assert.equal(phase5BlockedReport.summary.htfFvgPhase5ContractFailures, 1);
assert.equal(phase5BlockedReport.summary.discordSignoffStatus, 'blocked');
assert.equal(phase5BlockedReport.observations[0].htfFvgReactionPhase4Enforcement, 'pass');
assert.equal(phase5BlockedReport.observations[0].htfFvgPhase5ContractStatus, 'fail');
assert.ok(phase5BlockedReport.observations[0].htfFvgPhase5Issues.some((issue) => issue.includes('htfFvgCascade.parentZone is missing')));
assert.match(phase5BlockedReport.bottomLine, /Phase 5 contract failure/);
assert.match(phase5BlockedReport.markdown, /Phase 5 contract failures: 1/);

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-06-21-MES-morning.json'), JSON.stringify({
  reportType: 'scanner_decision_tape',
  tradeDate: '2026-06-21',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-21T09:50:00.0000000': {
      completed5m: {
        time: '2026-06-21T09:50:00.0000000',
        open: 7600,
        high: 7603,
        low: 7580,
        close: 7588,
      },
      currentPrice: 7588,
      scannerState: 'Conditional',
      setupCandidateStatus: {
        selected: {
          setupType: 'IntradayMssMicroContinuation',
          direction: 'SHORT',
          executionStatus: 'Conditional',
          entry: 7588,
          stop: 7604,
          target1: 7564,
          target2: 7556,
        },
      },
      plan: {
        canExecute: false,
      },
      candidateLifecycleTrace: {
        activeCampaign: { direction: 'SHORT' },
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'SHORT',
          lineInSand: 7596,
          htfFvgReactionRouting: {
            status: 'routed_active_reaction',
            direction: 'SHORT',
            lineInSand: 7596,
            lineLabel: 'SHORT BELOW 7596.00 from 60M parent FVG 7596.00-7604.00',
            lifecycleState: 'rejected',
            standDown: 'Stand down on completed 5M acceptance above parent zone 7604.00.',
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
              timeframe: '60M',
              lower: 7596,
              upper: 7604,
              lifecycle: { state: 'rejected' },
            },
          },
          htfFvgCascade: {
            parentZone: {
              direction: 'SHORT',
              timeframe: '60M',
              lower: 7596,
              upper: 7604,
            },
          },
        },
      },
      discord: {
        shouldSend: true,
        sendOrSuppressReason: 'High-confidence conditional plan qualified for Discord.',
      },
    },
  },
}));

const phase5ReadyReport = await buildLiveDeskObserverReport({
  tradeDate: '2026-06-21',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir: path.join(tmp, 'out'),
  json: false,
  watch: false,
  pollSeconds: 60,
});

assert.equal(phase5ReadyReport.summary.phase4EnforcementFailures, 0);
assert.equal(phase5ReadyReport.summary.htfFvgPhase5ContractEvents, 1);
assert.equal(phase5ReadyReport.summary.htfFvgPhase5ContractFailures, 0);
assert.equal(phase5ReadyReport.summary.discordSignoffStatus, 'ready');
assert.equal(phase5ReadyReport.observations[0].htfFvgReactionPhase4Enforcement, 'pass');
assert.equal(phase5ReadyReport.observations[0].htfFvgPhase5ContractStatus, 'pass');

fs.rmSync(tmp, { recursive: true, force: true });
