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
      recordedAt: '2026-06-18T13:35:10.000Z',
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
          setupType: 'NoInstalledSetup',
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
      recordedAt: '2026-06-18T13:50:10.000Z',
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
          setupType: 'historicalReview',
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

const sinceFilteredReport = await buildLiveDeskObserverReport({
  tradeDate: '2026-06-18',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir: path.join(tmp, 'out'),
  json: false,
  watch: false,
  pollSeconds: 60,
  sinceRecordedAt: '2026-06-18T13:45:00.000Z',
});

assert.equal(sinceFilteredReport.eventCount, 1);
assert.equal(sinceFilteredReport.filteredEventCount, 1);
assert.equal(sinceFilteredReport.summary.discordSends, 1);
assert.equal(sinceFilteredReport.summary.phase4EnforcementFailures, 1);
assert.match(sinceFilteredReport.markdown, /Since recordedAt: 2026-06-18T13:45:00.000Z/);
assert.match(sinceFilteredReport.markdown, /Older tape events excluded: 1/);

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-06-19-MES-morning.json'), JSON.stringify({
  reportType: 'scanner_decision_tape',
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-19T09:10:00.0000000': {
      completed5m: {
        time: '2026-06-19T09:10:00.0000000',
        open: 7480,
        high: 7485,
        low: 7478,
        close: 7483.75,
      },
      currentPrice: 7482,
      scannerState: 'Approved',
      setupCandidateStatus: {
        selected: {
          setupType: 'historicalReview',
          direction: 'LONG',
          executionStatus: 'Executable',
          entry: 7483.75,
          stop: 7479.75,
          target1: 7489.75,
          target2: 7491.75,
        },
      },
      plan: {
        canExecute: true,
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'SHORT',
          lineInSand: 7480.25,
          htfFvgReactionRouting: {
            status: 'routed_active_reaction',
            direction: 'SHORT',
            lineInSand: 7488.25,
            lineLabel: 'SHORT BELOW 7488.25 from 60M parent FVG 7488.25-7496.50',
            lifecycleState: 'holding',
            standDown: 'Stand down on completed 5M acceptance above parent zone 7496.50.',
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
              lower: 7488.25,
              upper: 7496.5,
              lifecycle: { state: 'holding' },
            },
          },
          htfFvgCascade: {
            parentZone: {
              direction: 'SHORT',
              timeframe: '60M',
              lower: 7488.25,
              upper: 7496.5,
            },
          },
        },
      },
      discord: {
        shouldSend: true,
        sendOrSuppressReason: 'Approved app-owned 5M execution alert.',
      },
    },
  },
}));

const canExecuteAuthorityReport = await buildLiveDeskObserverReport({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir: path.join(tmp, 'out'),
  json: false,
  watch: false,
  pollSeconds: 60,
});

assert.equal(canExecuteAuthorityReport.summary.discordSends, 1);
assert.equal(canExecuteAuthorityReport.summary.phase4EnforcementFailures, 0);
assert.equal(canExecuteAuthorityReport.summary.htfFvgReactionRoutingConflicts, 0);
assert.equal(canExecuteAuthorityReport.summary.discordSignoffStatus, 'ready');
assert.ok(canExecuteAuthorityReport.observations[0].observerFlags.includes('htf_fvg_reaction_selected_warning'));
assert.equal(canExecuteAuthorityReport.observations[0].htfFvgReactionPhase4Enforcement, 'pass');

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
          setupType: 'historicalReview',
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
          setupType: 'NoInstalledSetup',
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
          setupType: 'NoInstalledSetup',
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

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-06-20-MES-morning.json'), JSON.stringify({
  reportType: 'scanner_decision_tape',
  tradeDate: '2026-06-20',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-20T09:35:00.0000000': {
      completed5m: {
        time: '2026-06-20T09:35:00.0000000',
        open: 7465,
        high: 7472,
        low: 7460,
        close: 7468,
      },
      currentPrice: 7468.25,
      scannerState: 'Missed',
      setupCandidateStatus: {
        selected: {
          setupType: 'historicalReview',
          direction: 'SHORT',
          executionStatus: 'Conditional',
          entry: 7477.75,
          stop: 7487,
          target1: 7464,
          target2: 7459.25,
        },
      },
      plan: {
        canExecute: false,
      },
      candidateLifecycleTrace: {
        activeCampaign: null,
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'LONG',
          lineInSand: 7468,
          htfFvgReactionRouting: {
            status: 'routed_active_reaction',
            direction: 'LONG',
            lineInSand: 7417.25,
            lineLabel: 'LONG ABOVE 7417.25 from 15M parent FVG 7410.00-7417.25',
            lifecycleState: 'rejected',
            standDown: 'Stand down on completed 5M acceptance below parent zone 7410.00.',
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
              direction: 'LONG',
              timeframe: '15M',
              lower: 7410,
              upper: 7417.25,
              lifecycle: { state: 'rejected' },
            },
          },
          htfFvgCascade: {
            parentZone: {
              direction: 'LONG',
              timeframe: '15M',
              lower: 7410,
              upper: 7417.25,
            },
          },
        },
      },
      reviewStatus: 'already_triggered_no_fresh_entry',
      staleReason: 'Current price is closer to T1 than the preferred entry zone. Move occurred without preferred retest. No chase entry.',
      discord: {
        shouldSend: false,
        sendOrSuppressReason: 'Missed setup below educational alert threshold.',
      },
    },
  },
}));

const staleSelectedResidueReport = await buildLiveDeskObserverReport({
  tradeDate: '2026-06-20',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir: path.join(tmp, 'out'),
  json: false,
  watch: false,
  pollSeconds: 60,
});

assert.equal(staleSelectedResidueReport.summary.staleOrNoChaseFlags, 1);
assert.equal(staleSelectedResidueReport.summary.candidateDeskConflicts, 0);
assert.equal(staleSelectedResidueReport.summary.htfFvgReactionRoutingConflicts, 0);
assert.equal(staleSelectedResidueReport.summary.phase4EnforcementFailures, 0);
assert.equal(staleSelectedResidueReport.summary.discordSignoffStatus, 'ready');
assert.equal(staleSelectedResidueReport.observations[0].htfFvgReactionPhase4Enforcement, 'pass');
assert.equal(staleSelectedResidueReport.observations[0].observerFlags.includes('htf_fvg_reaction_selected_conflict'), false);

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-06-22-MES-morning.json'), JSON.stringify({
  reportType: 'scanner_decision_tape',
  tradeDate: '2026-06-22',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-22T09:35:00.0000000': {
      completed5m: {
        time: '2026-06-22T09:35:00.0000000',
        open: 7469,
        high: 7471,
        low: 7467,
        close: 7469,
      },
      currentPrice: 7469.75,
      scannerState: 'TriggerPending',
      setupCandidateStatus: {
        selected: {
          setupType: 'historicalReview',
          direction: 'SHORT',
          executionStatus: 'Conditional',
          entry: 7472.5,
          stop: 7479,
          target1: 7462.75,
          target2: 7459.5,
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
          direction: 'LONG',
          lineInSand: 7470,
          htfFvgReactionRouting: {
            status: 'routed_active_reaction',
            direction: 'LONG',
            lineInSand: 7470,
            lineLabel: 'LONG ABOVE 7470.00 from 15M parent FVG 7462.00-7470.00',
            lifecycleState: 'rejected',
            standDown: 'Stand down on completed 5M acceptance below parent zone 7462.00.',
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
              direction: 'LONG',
              timeframe: '15M',
              lower: 7462,
              upper: 7470,
              lifecycle: { state: 'rejected' },
            },
          },
          htfFvgCascade: {
            parentZone: {
              direction: 'LONG',
              timeframe: '15M',
              lower: 7462,
              upper: 7470,
            },
          },
        },
      },
      staleReason: 'Bearish no installed model path: buy-side sweep above 7475.5, reclaim back below the swept high, then confirm downward rejection or expansion.',
      discord: {
        shouldSend: false,
        sendOrSuppressReason: 'Duplicate alert suppressed for same setup/reference/direction/state.',
      },
    },
  },
}));

const duplicateSelectedResidueReport = await buildLiveDeskObserverReport({
  tradeDate: '2026-06-22',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir: path.join(tmp, 'out'),
  json: false,
  watch: false,
  pollSeconds: 60,
});

assert.equal(duplicateSelectedResidueReport.summary.duplicateSuppressions, 1);
assert.equal(duplicateSelectedResidueReport.summary.candidateDeskConflicts, 0);
assert.equal(duplicateSelectedResidueReport.summary.htfFvgReactionRoutingConflicts, 0);
assert.equal(duplicateSelectedResidueReport.summary.phase4EnforcementFailures, 0);
assert.equal(duplicateSelectedResidueReport.summary.discordSignoffStatus, 'ready');
assert.equal(duplicateSelectedResidueReport.observations[0].htfFvgReactionPhase4Enforcement, 'pass');
assert.equal(duplicateSelectedResidueReport.observations[0].observerFlags.includes('candidate_desk_side_conflict'), false);
assert.equal(duplicateSelectedResidueReport.observations[0].observerFlags.includes('htf_fvg_reaction_selected_conflict'), false);
assert.ok(duplicateSelectedResidueReport.observations[0].observerFlags.includes('candidate_desk_side_warning'));
assert.ok(duplicateSelectedResidueReport.observations[0].observerFlags.includes('htf_fvg_reaction_selected_warning'));
assert.match(duplicateSelectedResidueReport.observations[0].traderRead, /Warning only/);

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-06-25-MES-morning.json'), JSON.stringify({
  reportType: 'scanner_decision_tape',
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-25T10:45:00.0000000': {
      recordedAt: '2026-06-25T14:45:10.000Z',
      completed5m: {
        time: '2026-06-25T10:45:00.0000000',
        open: 7463.25,
        high: 7464,
        low: 7444.25,
        close: 7450.75,
      },
      currentPrice: 7474,
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
      candidateLifecycleTrace: {
        activeCampaign: { direction: 'SHORT' },
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'SHORT',
          lineInSand: 7444,
          activeTacticalZone: {
            direction: 'SHORT',
            lower: 7444,
            upper: 7465.25,
            state: 'waiting_retest',
          },
          shortBias: {
            state: 'primary',
            decisionQualityScore: 98,
            tradeReadiness: {
              status: 'not_aligned',
              missingProof: ['15M and 5M protected structure are not aligned for this side.'],
            },
            executableConsideration: {
              status: 'not_aligned',
              canExecuteNow: false,
              missingGates: ['15M and 5M protected structure are not aligned for this side.'],
            },
          },
          htfFvgReactionRouting: {
            status: 'routed_active_reaction',
            direction: 'SHORT',
            lineInSand: 7472.25,
            lineLabel: 'SHORT BELOW 7472.25 from 240M parent FVG 7472.25-7512.00',
            lifecycleState: 'rejected',
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
              state: 'rejected',
              lifecycle: { state: 'rejected' },
            },
            parentZones: [
              {
                direction: 'SHORT',
                timeframe: '240M',
                lower: 7472.25,
                upper: 7512,
                state: 'rejected',
                confidence: 'High',
              },
              {
                direction: 'SHORT',
                timeframe: '120M',
                lower: 7472.25,
                upper: 7496.5,
                state: 'inside_zone',
                confidence: 'High',
              },
            ],
          },
          htfFvgCascade: {
            parentZone: {
              direction: 'SHORT',
              timeframe: '240M',
              lower: 7472.25,
              upper: 7512,
              state: 'moved_away',
            },
          },
        },
      },
      discord: {
        shouldSend: false,
        sendOrSuppressReason: 'Executable/approved plan below 80 score threshold.',
      },
    },
  },
}));

const htfHeldReport = await buildLiveDeskObserverReport({
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir: path.join(tmp, 'out'),
  json: false,
  watch: false,
  pollSeconds: 60,
});

assert.equal(htfHeldReport.summary.belowScoreSuppressions, 1);
assert.match(htfHeldReport.observations[0].discordAction, /Held: high-quality SHORT HTF\/FVG map \(98\/100\)/);
assert.match(htfHeldReport.observations[0].discordAction, /15M and 5M protected structure are not aligned/);
assert.match(htfHeldReport.observations[0].discordAction, /240M SHORT FVG 7472\.25-7512\.00/);
assert.match(htfHeldReport.observations[0].htfFvgZoneContext, /120M SHORT FVG 7472\.25-7496\.50/);
assert.match(htfHeldReport.bottomLine, /HTF\/FVG map: .*240M SHORT FVG 7472\.25-7512\.00/);
assert.match(htfHeldReport.markdown, /HTF FVG Zones/);

fs.rmSync(tmp, { recursive: true, force: true });
