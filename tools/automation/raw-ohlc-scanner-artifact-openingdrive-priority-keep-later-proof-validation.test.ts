import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-validation';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-full-slate-dry-run';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-rule-miner';

const slates = Array.from({ length: 10 }, (_, index) => ({
  slateId: `2026-07-10|morning|2026-07-10T10:${String(index).padStart(2, '0')}:00`,
  eventTime: `2026-07-10T10:${String(index).padStart(2, '0')}:00`,
  tradeDate: '2026-07-10',
  session: 'morning',
  candidateRows: 2,
  suppressedRows: 1,
  baselineTopTicketId: `later-${index}`,
  baselineTopSetupType: 'SweepMssFvgRetrace',
  baselineTopScore: 72,
  baselineTopOneMesPl: index < 8 ? 80 : -30,
  dedupedTopTicketId: `replacement-${index}`,
  dedupedTopSetupType: 'OpeningDriveFvgContinuation',
  dedupedTopScore: 68,
  dedupedTopOneMesPl: -10,
  topChanged: true,
  changedFromSuppressedSweepDuplicate: true,
  changedToNonSweep: true,
  deltaTopOneMesPl: index < 8 ? -90 : 20,
  canExecuteTrueRows: 0,
  approvalBoundaryClean: true,
}));

const rows = slates.flatMap((slate, index) => [
  {
    ticketId: `first-${index}`,
    campaignId: `campaign-${index}`,
    eventTime: '2026-07-10T09:55:00',
    tradeDate: '2026-07-10',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG',
    score: 62,
    outcomeLabel: 't1_first',
    outcomeStatus: 'resolved',
    resolvedOneMesPl: 15,
    suppressedByDedupe: false,
    entry: 6000,
    stop: 5995,
    t1: 6007.5,
    t2: 6010,
    riskPoints: 5,
  },
  {
    ticketId: slate.baselineTopTicketId,
    campaignId: `campaign-${index}`,
    eventTime: slate.eventTime,
    tradeDate: '2026-07-10',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG',
    score: 72,
    outcomeLabel: index < 8 ? 't1_first' : 'stopped_before_t1',
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
    campaignId: `replacement-${index}`,
    eventTime: slate.eventTime,
    tradeDate: '2026-07-10',
    session: 'morning',
    setupType: 'OpeningDriveFvgContinuation',
    direction: 'LONG',
    score: 68,
    outcomeLabel: 'stopped_before_t1',
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

const fullSlateReport = {
  status: 'pass',
  slates,
  rows,
} as RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport;

const keepRuleMiner = {
  status: 'pass',
  source: {
    changedSlateMiner: 'missing-discovery-report.json',
  },
  summary: {
    bestRuleId: 'slate_size:two_candidate_slate',
  },
} as RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport;

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport({
  keepRuleMinerPath: 'keep.json',
  keepRuleMiner,
  fullSlateReports: [{ path: 'full-slate-validation.json', report: fullSlateReport }],
});

assert.equal(report.status, 'pass');
assert.equal(report.summary.ruleId, 'slate_size:two_candidate_slate');
assert.equal(report.summary.aggregateRows, 10);
assert.equal(report.summary.aggregateWinners, 8);
assert.equal(report.summary.aggregateLosses, 2);
assert.equal(report.summary.aggregateWinRate, 0.8);
assert.equal(report.summary.aggregateDeltaIfSuppressedOneMesPl, -680);
assert.equal(report.summary.installableSeparatorFound, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);

console.log('OpeningDrive priority keep-later-proof validation verified.');
