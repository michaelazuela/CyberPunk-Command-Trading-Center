import assert from 'node:assert/strict';
import { buildDeskPlaybookCamouflageAuditReport } from './desk-playbook-selector-camouflage-audit';

const report = buildDeskPlaybookCamouflageAuditReport({
  dayByDayReportPath: 'diagnostic-reports/example.json',
  report: {
    reportType: 'ytd_full_scanner_day_by_day_market_move_best_model_map',
    generatedAt: '2026-07-21T00:00:00.000Z',
    provenanceSummary: { currentRunCount: 2, staleCount: 0 },
    rows: [
      {
        date: '2026-06-01',
        session: 'morning',
        movement: 'balanced_range',
        sessionStats: { open: 7000, high: 7040, low: 6995, close: 7035, range: 45, net: 35, trend: 'bullish', bars: 34 },
        raids: { overnightHighRaid: true },
        htf: {
          '15m': { trend: 'bullish' },
          '60m': { trend: 'bullish' },
          '120m': { trend: 'bullish' },
          '240m': { trend: 'bearish' },
        },
        completeCandidateCount: 4,
        selected: {
          setupType: 'NoInstalledSetup',
          direction: 'LONG',
          eventTime: '2026-06-01T10:00:00',
          entry: 7010,
          stop: 7000,
          target1: 7025,
          target2: 7030,
          riskPoints: 10,
          outcome: { status: 't2_hit', pnl: 87.5, r: 1.75, filled: true },
        },
      },
      {
        date: '2026-06-02',
        session: 'morning',
        movement: 'bearish_drive',
        sessionStats: { open: 7000, high: 7002, low: 6950, close: 6960, range: 52, net: -40, trend: 'bearish', bars: 34 },
        raids: { overnightLowRaid: true },
        htf: {
          '15m': { trend: 'bearish' },
          '60m': { trend: 'bearish' },
          '120m': { trend: 'bearish' },
          '240m': { trend: 'bullish' },
        },
        completeCandidateCount: 1,
        selected: {
          setupType: 'NoInstalledSetup',
          direction: 'LONG',
          eventTime: '2026-06-02T11:00:00',
          entry: 6970,
          stop: 6958,
          target1: 6988,
          target2: 6994,
          riskPoints: 12,
          outcome: { status: 'stopped_before_t1', pnl: -60, r: -1, filled: true },
        },
      },
      {
        date: '2026-06-03',
        session: 'lunch',
        movement: 'bullish_drive',
        sessionStats: { open: 7000, high: 7020, low: 6998, close: 7018, range: 22, net: 18, trend: 'bullish', bars: 49 },
        raids: { priorHighRaid: true },
        htf: {
          '15m': { trend: 'bullish' },
          '60m': { trend: 'mixed' },
          '120m': { trend: 'bearish' },
          '240m': { trend: 'bearish' },
        },
        completeCandidateCount: 0,
        selected: null,
      },
      {
        date: '2026-06-04',
        session: 'lunch',
        movement: 'no_data',
        sessionStats: null,
        raids: {},
        htf: {},
        completeCandidateCount: 0,
        selected: null,
      },
      {
        date: '2026-06-05',
        session: 'morning',
        movement: 'bearish_drive',
        sessionStats: { open: 7000, high: 7005, low: 6960, close: 6970, range: 45, net: -30, trend: 'bearish', bars: 34 },
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
          direction: 'SHORT',
          eventTime: '2026-06-05T09:45:00',
          entry: 6980,
          stop: 6990,
          target1: 6965,
          target2: 6960,
          riskPoints: 10,
          outcome: { status: 't2_hit', pnl: 87.5, r: 1.75, filled: true },
        },
      },
    ],
  },
}, '2026-07-21T00:00:00.000Z');

assert.equal(report.reportType, 'desk_playbook_selector_camouflage_audit');
assert.equal(report.summary.sourceWindows, 5);
assert.equal(report.summary.suppressedWindows, 4);
assert.equal(report.summary.camouflagedPositiveProof, 1);
assert.equal(report.summary.directionConflictTrapsAvoided, 1);
assert.equal(report.summary.storyWithoutFiveMinuteProof, 1);
assert.equal(report.summary.cleanNoData, 1);
assert.equal(report.summary.positiveSuppressedPnl, 87.5);
assert.equal(report.summary.currentRunArtifacts, 2);
assert.equal(report.summary.staleArtifacts, 0);

const camouflage = report.rows.find((row) => row.camouflageClass === 'camouflaged_positive_proof');
assert.equal(camouflage?.date, '2026-06-01');
assert.equal(camouflage?.marketMoveDirection, 'LONG');
assert.equal(camouflage?.selectedModel, 'NoInstalledSetup');
assert.equal(camouflage?.htfAlignment, 'supports');
assert.match(camouflage?.explanation || '', /market-state label/);

const trap = report.rows.find((row) => row.camouflageClass === 'direction_conflict_trap_avoided');
assert.equal(trap?.suppressionReason, 'direction_fights');
assert.equal(trap?.selectedDirection, 'LONG');

assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.doesNotPromoteExecution, true);
assert.match(report.markdown, /Suppressed-Window Camouflage Audit/);

console.log('Desk playbook suppressed-window camouflage audit verified.');
