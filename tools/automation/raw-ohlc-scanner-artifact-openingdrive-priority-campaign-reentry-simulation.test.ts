import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-reentry-simulation';

const replayPackageOutcome = {
  status: 'pass',
  rows: [
    {
      ticketId: 'lead-loss',
      tradeDate: '2026-07-10',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      proofTime: '2026-07-10T10:45:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 'stopped_before_t1',
      entry: 7593.25,
      stop: 7606,
      t1: 7574.25,
      t2: 7567.75,
      riskPoints: 12.75,
      entryHitTime: '2026-07-10T10:45:00',
      stopHitTime: '2026-07-10T11:30:00',
      t1HitTime: '2026-07-13T10:20:00',
      t2HitTime: '2026-07-13T12:35:00',
      resolvedOneMesPl: -63.75,
    },
    {
      ticketId: 'post-stop-reentry',
      tradeDate: '2026-07-10',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      proofTime: '2026-07-10T11:35:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      entry: 7593.25,
      stop: 7606,
      t1: 7574.25,
      t2: 7567.75,
      riskPoints: 12.75,
      entryHitTime: '2026-07-10T11:35:00',
      stopHitTime: null,
      t1HitTime: '2026-07-13T10:20:00',
      t2HitTime: '2026-07-13T12:35:00',
      resolvedOneMesPl: 127.5,
    },
    {
      ticketId: 'other-model',
      tradeDate: '2026-07-10',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      proofTime: '2026-07-10T10:45:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      entry: 7593.25,
      stop: 7606,
      t1: 7574.25,
      t2: 7567.75,
      riskPoints: 12.75,
      entryHitTime: '2026-07-10T10:45:00',
      stopHitTime: null,
      t1HitTime: '2026-07-10T11:00:00',
      t2HitTime: '2026-07-10T11:05:00',
      resolvedOneMesPl: 127.5,
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport({
  replayPackageOutcomePath: 'outcome.json',
  setupType: 'NoInstalledSetup',
  replayPackageOutcome,
});

assert.equal(report.status, 'pass');
assert.equal(report.summary.setupRows, 2);
assert.equal(report.summary.campaigns, 1);
assert.equal(report.summary.campaignsWithPostStopReentry, 1);
assert.equal(report.summary.earliestOnly.grossOneMesPl, -63.75);
assert.equal(report.summary.earliestPlusPostStopReentry.grossOneMesPl, 63.75);
assert.equal(report.summary.oracleFirstNonLoss.grossOneMesPl, 127.5);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.campaigns[0].recommendation, 'review_post_stop_reentry_evidence');

console.log('OpeningDrive priority campaign reentry simulation verified.');
