import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactOpeningDrivePriorityLossCaseClassifierReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-loss-case-classifier';

const lossProfile = {
  rows: [
    {
      tradeDate: '2026-07-10',
      session: 'morning',
      proofTime: '2026-07-10T10:45:00',
      direction: 'SHORT',
      prioritySetupType: 'SweepMssFvgRetrace',
      priorityOneMesPl: -63.75,
      priorityLoss: true,
      priorityEntry: 7593.25,
      priorityStop: 7606,
      priorityRiskPoints: 12.75,
      initialRankTags: [],
      postEntryResearchTags: [],
    },
    {
      tradeDate: '2026-07-10',
      session: 'morning',
      proofTime: '2026-07-10T10:50:00',
      direction: 'SHORT',
      prioritySetupType: 'SweepMssFvgRetrace',
      priorityOneMesPl: -63.75,
      priorityLoss: true,
      priorityEntry: 7593.25,
      priorityStop: 7606,
      priorityRiskPoints: 12.75,
      initialRankTags: [],
      postEntryResearchTags: [],
    },
  ],
};

const structuralContext = {
  status: 'pass',
  rows: lossProfile.rows.map((row, index) => ({
    ticketId: `ticket-${index}`,
    ...row,
    bestConditionalSetupType: 'raidReclaim',
    executionStatus: 'Conditional',
    blockReason: 'EntryTriggerPending',
    targetRoomStatus: 'blocked_before_t1',
    htfLineInSandStatus: 'blocked',
    timeframeMssStatus: 'blocked',
    riskAdvisoryStatus: 'RISK_EXTENDED_STRUCTURAL',
    structuralTags: [],
  })),
};

const samebarReport = {
  status: 'pass',
  rows: [
    {
      ticketId: 'ticket-0',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -63.75,
      proofTime: '2026-07-10T10:45:00',
      entryHitTime: '2026-07-10T10:45:00',
      firstReplayBarTime: '2026-07-10T10:50:00',
      stopHitTime: '2026-07-10T11:30:00',
      t1HitTime: '2026-07-13T10:20:00',
      t2HitTime: '2026-07-13T12:35:00',
      riskPoints: 12.75,
      mfeR: 9.43,
      maeR: 2.67,
      separatorTags: ['stopped_before_t1'],
    },
    {
      ticketId: 'ticket-1',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -63.75,
      proofTime: '2026-07-10T10:50:00',
      entryHitTime: '2026-07-10T10:50:00',
      firstReplayBarTime: '2026-07-10T10:55:00',
      stopHitTime: '2026-07-10T11:30:00',
      t1HitTime: '2026-07-13T10:20:00',
      t2HitTime: '2026-07-13T12:35:00',
      riskPoints: 12.75,
      mfeR: 9.43,
      maeR: 2.67,
      separatorTags: ['stopped_before_t1'],
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityLossCaseClassifierReport({
  lossProfilePath: 'loss.json',
  structuralContextPath: 'structural.json',
  samebarReportPath: 'samebar.json',
  lossProfile,
  structuralContext,
  samebarReport,
});

assert.equal(report.status, 'pass');
assert.equal(report.summary.lossRows, 2);
assert.equal(report.summary.replayStopThenLaterTargetsRows, 2);
assert.equal(report.summary.targetRoomRiskContextRows, 2);
assert.equal(report.summary.duplicateClusters, 1);
assert.equal(report.summary.clusteredRows, 2);
assert.equal(report.summary.recommendation, 'inspect_reentry_and_dedupe_policy');
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.ok(report.rows.every((row) => row.classes.includes('replay_stop_then_later_targets')));
assert.ok(report.rows.every((row) => row.classes.includes('duplicate_reentry_cluster')));

console.log('OpeningDrive priority loss case classifier verified.');
