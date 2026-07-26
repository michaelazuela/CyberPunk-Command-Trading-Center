import assert from 'node:assert/strict';
import { buildDeskPlaybookSelectorPreviewReport } from './desk-playbook-selector-preview';

const report = buildDeskPlaybookSelectorPreviewReport({
  dayByDayReportPath: 'diagnostic-reports/example.json',
  report: {
    reportType: 'ytd_full_scanner_day_by_day_market_move_best_model_map',
    generatedAt: '2026-07-21T00:00:00.000Z',
    provenanceSummary: {
      artifactDates: 2,
      currentRunCount: 2,
      staleCount: 0,
    },
    rows: [
      {
        date: '2026-06-09',
        session: 'morning',
        movement: 'high_raid_reversal_down',
        sessionStats: {
          open: 7480,
          high: 7500,
          low: 7420,
          close: 7430,
          range: 80,
          net: -50,
          trend: 'bearish',
          bars: 34,
        },
        raids: {
          overnightHighRaid: true,
          overnightLowRaid: false,
          priorHighRaid: true,
          priorLowRaid: false,
        },
        htf: {
          '15m': { trend: 'bearish' },
          '60m': { trend: 'bearish' },
          '120m': { trend: 'bearish' },
          '240m': { trend: 'bullish' },
        },
        completeCandidateCount: 6,
        selected: {
          setupType: 'NoInstalledSetup',
          direction: 'SHORT',
          eventTime: '2026-06-09T10:25:00',
          executionStatus: 'Conditional',
          candidateState: 'MSS_HOLD_CONFIRMED',
          confidence: 'Medium',
          rankScore: 250,
          modelConfidenceScore: 80,
          entry: 7441,
          stop: 7491.25,
          target1: 7365.75,
          target2: 7340.5,
          riskPoints: 50.25,
          canExecute: false,
          discordTradePlanEligible: false,
          outcome: {
            status: 't2_hit',
            pnl: 439.38,
            r: 1.75,
          },
          levelContextSummary: 'Bearish 15M MSS/displacement and 5M MSS aligned.',
        },
      },
      {
        date: '2026-06-10',
        session: 'lunch',
        movement: 'balanced_range',
        sessionStats: null,
        raids: {},
        htf: {
          '15m': { trend: 'bullish' },
          '60m': { trend: 'bullish' },
          '120m': { trend: 'bullish' },
          '240m': { trend: 'bullish' },
        },
        completeCandidateCount: 1,
        selected: {
          setupType: 'NoInstalledSetup',
          direction: 'LONG',
          eventTime: '2026-06-10T13:00:00',
          entry: 7400,
          stop: 7390,
          target1: 7415,
          target2: 7420,
          riskPoints: 10,
        },
      },
      {
        date: '2026-06-11',
        session: 'morning',
        movement: 'bearish_drive',
        sessionStats: null,
        raids: {},
        htf: {
          '15m': { trend: 'bearish' },
          '60m': { trend: 'bearish' },
          '120m': { trend: 'bearish' },
          '240m': { trend: 'bearish' },
        },
        completeCandidateCount: 1,
        selected: {
          setupType: 'NoInstalledSetup',
          direction: 'LONG',
          eventTime: '2026-06-11T10:00:00',
          entry: 7410,
          stop: 7400,
          target1: 7425,
          target2: 7430,
          riskPoints: 10,
        },
      },
    ],
  },
}, '2026-07-21T00:00:00.000Z');

assert.equal(report.reportType, 'desk_playbook_selector_preview');
assert.equal(report.summary.sourceWindows, 3);
assert.equal(report.summary.previewTickets, 1);
assert.equal(report.summary.noTradeWindows, 2);
assert.equal(report.summary.shortTickets, 1);
assert.equal(report.summary.longTickets, 0);
assert.equal(report.summary.currentRunArtifacts, 2);
assert.equal(report.summary.staleArtifacts, 0);

const ticket = report.tickets[0];
assert.equal(ticket.decision, 'watch');
assert.equal(ticket.direction, 'SHORT');
assert.equal(ticket.primaryModel, 'NoInstalledSetup');
assert.equal(ticket.primaryPlan?.entry, 7441);
assert.match(ticket.marketStory, /high_raid_reversal_down/);
assert.match(ticket.continuationPlan, /Continuation/);
assert.match(ticket.failurePlan, /do not flip automatically/);
assert.match(ticket.suppressedNoise.join(' '), /one primary ticket/);
assert.equal(ticket.authority.canExecuteChanged, false);
assert.equal(ticket.authority.discordEligibleChanged, false);

assert.equal(report.tickets[1].decision, 'no_trade');
assert.match(report.tickets[1].marketStory, /not a drive\/raid movement/);
assert.equal(report.tickets[2].decision, 'no_trade');
assert.match(report.tickets[2].marketStory, /fights bearish_drive/);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesCanExecute, false);
assert.match(report.markdown, /Desk Playbook Selector Preview/);

console.log('Desk playbook selector preview verified.');
