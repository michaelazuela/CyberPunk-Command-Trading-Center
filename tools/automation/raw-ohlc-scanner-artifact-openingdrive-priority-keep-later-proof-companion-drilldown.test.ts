import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofCompanionDrilldownReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-companion-drilldown';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-full-slate-dry-run';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-validation';

function makeFullSlateReport(args: {
  date: string;
  session: string;
  direction: 'LONG' | 'SHORT';
  replacementSetupType: string;
  rows: number;
  winners: number;
  deltaPerWinner: number;
  deltaPerLoss: number;
}): RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport {
  const slates = Array.from({ length: args.rows }, (_, index) => {
    const winner = index < args.winners;
    return {
      slateId: `${args.date}|${args.session}|${args.date}T10:${String(index).padStart(2, '0')}:00`,
      eventTime: `${args.date}T10:${String(index).padStart(2, '0')}:00`,
      tradeDate: args.date,
      session: args.session,
      candidateRows: 2,
      suppressedRows: 1,
      baselineTopTicketId: `${args.date}-later-${index}`,
      baselineTopSetupType: 'SweepMssFvgRetrace',
      baselineTopScore: 70,
      baselineTopOneMesPl: winner ? 75 : -25,
      dedupedTopTicketId: `${args.date}-replacement-${index}`,
      dedupedTopSetupType: args.replacementSetupType,
      dedupedTopScore: 65,
      dedupedTopOneMesPl: winner ? 75 + args.deltaPerWinner : -25 + args.deltaPerLoss,
      topChanged: true,
      changedFromSuppressedSweepDuplicate: true,
      changedToNonSweep: args.replacementSetupType !== 'SweepMssFvgRetrace',
      deltaTopOneMesPl: winner ? args.deltaPerWinner : args.deltaPerLoss,
      canExecuteTrueRows: 0,
      approvalBoundaryClean: true,
    };
  });
  const rows = slates.flatMap((slate, index) => [
    {
      ticketId: `${args.date}-first-${index}`,
      campaignId: `${args.date}-campaign-${index}`,
      eventTime: `${args.date}T09:55:00`,
      tradeDate: args.date,
      session: args.session,
      setupType: 'SweepMssFvgRetrace',
      direction: args.direction,
      score: 60,
      outcomeLabel: 't1_first',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 10,
      suppressedByDedupe: false,
      entry: 6000,
      stop: 5995,
      t1: 6007.5,
      t2: 6010,
      riskPoints: 5,
    },
    {
      ticketId: slate.baselineTopTicketId,
      campaignId: `${args.date}-campaign-${index}`,
      eventTime: slate.eventTime,
      tradeDate: args.date,
      session: args.session,
      setupType: 'SweepMssFvgRetrace',
      direction: args.direction,
      score: 70,
      outcomeLabel: index < args.winners ? 't1_first' : 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: slate.baselineTopOneMesPl,
      suppressedByDedupe: true,
      entry: 6000,
      stop: 5995,
      t1: 6007.5,
      t2: 6010,
      riskPoints: 5,
    },
    {
      ticketId: slate.dedupedTopTicketId,
      campaignId: `${args.date}-replacement-${index}`,
      eventTime: slate.eventTime,
      tradeDate: args.date,
      session: args.session,
      setupType: args.replacementSetupType,
      direction: args.direction,
      score: 65,
      outcomeLabel: 't1_first',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: slate.dedupedTopOneMesPl,
      suppressedByDedupe: false,
      entry: 6002,
      stop: 5998,
      t1: 6008,
      t2: 6010,
      riskPoints: 4,
    },
  ]);
  return {
    status: 'pass',
    source: {
      scannerArtifact: `raw-ohlc-scanner-artifacts-MES-${args.date}-to-${args.date}-fixture.json`,
    },
    slates,
    rows,
  } as RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport;
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openingdrive-companion-'));
const keepPath = path.join(tempDir, 'keep.json');
const rejectPath = path.join(tempDir, 'reject.json');
fs.writeFileSync(keepPath, JSON.stringify(makeFullSlateReport({
  date: '2026-07-15',
  session: 'lunch',
  direction: 'LONG',
  replacementSetupType: 'OpeningDriveFvgContinuation',
  rows: 10,
  winners: 9,
  deltaPerWinner: -30,
  deltaPerLoss: 10,
})), 'utf8');
fs.writeFileSync(rejectPath, JSON.stringify(makeFullSlateReport({
  date: '2026-07-10',
  session: 'morning',
  direction: 'SHORT',
  replacementSetupType: 'IntradayMssMicroContinuation',
  rows: 10,
  winners: 8,
  deltaPerWinner: 15,
  deltaPerLoss: 20,
})), 'utf8');

const validationReport = {
  status: 'pass',
  summary: {
    ruleId: 'slate_size:two_candidate_slate',
  },
  source: {
    fullSlateReports: [keepPath, rejectPath],
  },
} as RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport;

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofCompanionDrilldownReport({
  validationReportPath: 'validation.json',
  validationReport,
});

assert.equal(report.status, 'pass');
assert.equal(report.summary.cases, 20);
assert.ok(report.summary.keepCandidateGroups > 0);
assert.ok(report.summary.replacementBetterGroups > 0);
assert.equal(report.summary.installableSeparatorFound, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.ok(report.groups.some((row) => row.groupId === 'session:lunch' && row.recommendation === 'keep_later_proof_candidate'));
assert.ok(report.groups.some((row) => row.groupId === 'session:morning' && row.recommendation === 'replacement_better_candidate'));

console.log('OpeningDrive priority keep-later-proof companion drilldown verified.');
