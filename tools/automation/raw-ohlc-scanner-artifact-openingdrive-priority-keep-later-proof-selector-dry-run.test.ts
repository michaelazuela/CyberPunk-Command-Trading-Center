import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-dry-run';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-full-slate-dry-run';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-validation';

function makeFullSlateReport(args: {
  direction: 'LONG' | 'SHORT';
  session: string;
  rows: number;
  keepPl: number;
  replacementPl: number;
}): RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport {
  const slates = Array.from({ length: args.rows }, (_, index) => ({
    slateId: `2026-07-15|${args.session}|2026-07-15T10:${String(index).padStart(2, '0')}:00`,
    eventTime: `2026-07-15T10:${String(index).padStart(2, '0')}:00`,
    tradeDate: '2026-07-15',
    session: args.session,
    candidateRows: 2,
    suppressedRows: 1,
    baselineTopTicketId: `${args.direction}-later-${index}`,
    baselineTopSetupType: 'NoInstalledSetup',
    baselineTopScore: 70,
    baselineTopOneMesPl: args.keepPl,
    dedupedTopTicketId: `${args.direction}-replacement-${index}`,
    dedupedTopSetupType: args.direction === 'SHORT' ? 'NoInstalledSetup' : 'NoInstalledSetup',
    dedupedTopScore: 65,
    dedupedTopOneMesPl: args.replacementPl,
    topChanged: true,
    changedFromSuppressedSweepDuplicate: true,
    changedToNonSweep: true,
    deltaTopOneMesPl: args.replacementPl - args.keepPl,
    canExecuteTrueRows: 0,
    approvalBoundaryClean: true,
  }));
  const rows = slates.flatMap((slate, index) => [
    {
      ticketId: `${args.direction}-first-${index}`,
      campaignId: `${args.direction}-campaign-${index}`,
      eventTime: '2026-07-15T09:55:00',
      tradeDate: '2026-07-15',
      session: args.session,
      setupType: 'NoInstalledSetup',
      direction: args.direction,
      score: 60,
      outcomeLabel: 't1_first',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 1,
      suppressedByDedupe: false,
      entry: 6000,
      stop: 5995,
      t1: 6007.5,
      t2: 6010,
      riskPoints: 5,
    },
    {
      ticketId: slate.baselineTopTicketId,
      campaignId: `${args.direction}-campaign-${index}`,
      eventTime: slate.eventTime,
      tradeDate: '2026-07-15',
      session: args.session,
      setupType: 'NoInstalledSetup',
      direction: args.direction,
      score: 70,
      outcomeLabel: args.keepPl > 0 ? 't1_first' : 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: args.keepPl,
      suppressedByDedupe: true,
      entry: 6000,
      stop: 5995,
      t1: 6007.5,
      t2: 6010,
      riskPoints: 5,
    },
    {
      ticketId: slate.dedupedTopTicketId,
      campaignId: `${args.direction}-replacement-${index}`,
      eventTime: slate.eventTime,
      tradeDate: '2026-07-15',
      session: args.session,
      setupType: slate.dedupedTopSetupType,
      direction: args.direction,
      score: 65,
      outcomeLabel: args.replacementPl > 0 ? 't1_first' : 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: args.replacementPl,
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
      scannerArtifact: 'raw-ohlc-scanner-artifacts-MES-2026-07-15-to-2026-07-15-fixture.json',
    },
    slates,
    rows,
  } as RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport;
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openingdrive-selector-'));
const longPath = path.join(tempDir, 'long.json');
const shortPath = path.join(tempDir, 'short.json');
fs.writeFileSync(longPath, JSON.stringify(makeFullSlateReport({
  direction: 'LONG',
  session: 'lunch',
  rows: 10,
  keepPl: 20,
  replacementPl: -10,
})), 'utf8');
fs.writeFileSync(shortPath, JSON.stringify(makeFullSlateReport({
  direction: 'SHORT',
  session: 'morning',
  rows: 10,
  keepPl: -10,
  replacementPl: 20,
})), 'utf8');

const validationReport = {
  status: 'pass',
  summary: {
    ruleId: 'slate_size:two_candidate_slate',
  },
  source: {
    fullSlateReports: [longPath, shortPath],
  },
} as RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport;

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport({
  validationReportPath: 'validation.json',
  validationReport,
});

assert.equal(report.status, 'pass');
assert.equal(report.summary.cases, 20);
assert.equal(report.summary.keepAllOneMesPl, 100);
assert.equal(report.summary.replaceAllOneMesPl, 100);
assert.equal(report.summary.bestSelectedOneMesPl, 400);
assert.equal(report.summary.recommendation, 'selector_candidate_research_only');
assert.equal(report.summary.installableSeparatorFound, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);

console.log('OpeningDrive priority keep-later-proof selector dry run verified.');
