import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-changed-slate-miner';
import type { RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-full-slate-dry-run';

const fullSlate = {
  status: 'pass',
  rows: [
    {
      ticketId: 'first',
      campaignId: 'c1',
      eventTime: '2026-07-10T09:35:00',
      tradeDate: '2026-07-10',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      score: 90,
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 40,
      suppressedByDedupe: false,
      entry: 100,
      stop: 96,
      t1: 106,
      t2: 108,
      riskPoints: 4,
    },
    {
      ticketId: 'later',
      campaignId: 'c1',
      eventTime: '2026-07-10T09:45:00',
      tradeDate: '2026-07-10',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      score: 95,
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 80,
      suppressedByDedupe: true,
      entry: 100,
      stop: 96,
      t1: 106,
      t2: 108,
      riskPoints: 4,
    },
  ],
  slates: [
    {
      slateId: '2026-07-10|morning|2026-07-10T09:45:00',
      eventTime: '2026-07-10T09:45:00',
      tradeDate: '2026-07-10',
      session: 'morning',
      candidateRows: 2,
      suppressedRows: 1,
      baselineTopTicketId: 'later',
      baselineTopSetupType: 'NoInstalledSetup',
      baselineTopScore: 90,
      baselineTopOneMesPl: 80,
      dedupedTopTicketId: 'replacement',
      dedupedTopSetupType: 'NoInstalledSetup',
      dedupedTopScore: 80,
      dedupedTopOneMesPl: -20,
      topChanged: true,
      changedFromSuppressedSweepDuplicate: true,
      changedToNonSweep: true,
      deltaTopOneMesPl: -100,
      canExecuteTrueRows: 0,
      approvalBoundaryClean: true,
    },
  ],
} as RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport;

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport({
  fullSlateDryRunPath: 'full-slate.json',
  fullSlateDryRun: fullSlate,
});

assert.equal(report.status, 'pass');
assert.equal(report.summary.changedFromSuppressedDuplicateSlates, 1);
assert.equal(report.summary.duplicateWinnerRows, 1);
assert.equal(report.summary.duplicateLossRows, 0);
assert.equal(report.summary.baselineTopOneMesPl, 80);
assert.equal(report.summary.replacementOneMesPl, -20);
assert.equal(report.summary.deltaIfSuppressedOneMesPl, -100);
assert.equal(report.summary.bestKeepBucket, 'direction:LONG');
assert.equal(report.summary.installableSeparatorFound, false);
assert.equal(report.summary.recommendation, 'keep_duplicate_suppression_rejected');

console.log('OpeningDrive priority campaign dedupe changed-slate miner verified.');
