import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveCombinedSelectorReport,
  parseRawOhlcScannerArtifactOpeningDriveCombinedSelectorArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-combined-selector';
import type { RawOhlcScannerArtifactSameBarSeparatorDrilldownReport } from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

const authority = {
  readOnly: true,
  localOnly: true,
  researchOnly: true,
  postsDiscord: false,
  writesSupabase: false,
  readsLiveSupabase: false,
  readsLiveBridge: false,
  runsSetupScanner: false,
  changesScannerBehavior: false,
  changesTradingLogic: false,
  changesCanExecute: false,
  changesEntryStopTargets: false,
  changesRiskRules: false,
  changesBridgeBehavior: false,
  changesDiscordPosting: false,
  changesAppRuntime: false,
} as const;

function row(args: {
  ticketId: string;
  proofTime: string;
  direction: 'LONG' | 'SHORT';
  riskPoints: number;
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1';
  resolvedOneMesPl: number;
}) {
  return {
    ticketId: args.ticketId,
    tradeDate: args.proofTime.slice(0, 10),
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: args.direction,
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: 'resolved' as const,
    resolvedOneMesPl: args.resolvedOneMesPl,
    proofTime: args.proofTime,
    entryHitTime: args.proofTime,
    firstReplayBarTime: `${args.proofTime.slice(0, 14)}25:00`,
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? `${args.proofTime.slice(0, 14)}25:00` : null,
    t1HitTime: args.outcomeLabel === 't1_and_t2_hit' ? `${args.proofTime.slice(0, 14)}25:00` : null,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' ? `${args.proofTime.slice(0, 14)}30:00` : null,
    riskPoints: args.riskPoints,
    mfeR: args.outcomeLabel === 't1_and_t2_hit' ? 2 : 0.2,
    maeR: args.outcomeLabel === 'stopped_before_t1' ? 1 : 0.2,
    timeBucket: `${args.proofTime.slice(11, 13)}:00-${args.proofTime.slice(11, 13)}:59`,
    separatorTags: args.outcomeLabel === 't1_and_t2_hit' ? ['winner_t1_t2'] : ['stopped_before_t1'],
  };
}

const separatorReport: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport = {
  reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', replayPackageOutcomePath: 'outcome.json' },
  assumptions: {
    usesReadOnlyReplayOutcomeOnly: true,
    analyzesSameBarRowsOnly: true,
    firstReplayBarMeansFirstCompletedBarAfterEntryBar: true,
    livePromotionAllowed: false,
  },
  summary: {
    sameBarRows: 5,
    winners: 3,
    losses: 2,
    unresolved: 0,
    grossOneMesPl: 185,
    modelsWithPositiveSameBar: 1,
    modelsWithSameBarLosses: 1,
    livePromotionAllowedRows: 0,
  },
  modelSummaries: [],
  timeBuckets: [],
  rows: [
    row({ ticketId: 'tight-long-win', proofTime: '2026-06-18T10:20:00', direction: 'LONG', riskPoints: 5, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 45 }),
    row({ ticketId: 'wide-win', proofTime: '2026-06-18T10:35:00', direction: 'SHORT', riskPoints: 26, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 260 }),
    row({ ticketId: 'same-event-wide-collision', proofTime: '2026-06-18T10:20:00', direction: 'LONG', riskPoints: 26, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 260 }),
    row({ ticketId: 'rejected-loss', proofTime: '2026-06-18T09:20:00', direction: 'SHORT', riskPoints: 12, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -60 }),
    { ...row({ ticketId: 'ignored-other-model', proofTime: '2026-06-18T10:45:00', direction: 'SHORT', riskPoints: 26, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 260 }), setupType: 'NoInstalledSetup' },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactOpeningDriveCombinedSelectorReport({
  reportDir: 'reports',
  samebarSeparatorReportPath: 'separator.json',
  samebarSeparatorReport: separatorReport,
  setupType: 'NoInstalledSetup',
}, '2026-07-18T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_combined_selector');
assert.equal(report.status, 'pass');
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.sourceRows, 5);
assert.equal(report.summary.proofEvents, 4);
assert.equal(report.summary.selectedRows, 3);
assert.equal(report.summary.rejectedRows, 2);
assert.equal(report.summary.collisionEvents, 1);
assert.equal(report.summary.selectedSummary.winners, 3);
assert.equal(report.summary.selectedSummary.losses, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.deepEqual(report.selectedRows.map((row) => row.ticketId), ['tight-long-win', 'wide-win', 'ignored-other-model']);
assert.match(report.markdown, /OpeningDrive Combined Selector/);
assert.match(report.recommendations[0], /stayed clean/);

assert.throws(
  () => parseRawOhlcScannerArtifactOpeningDriveCombinedSelectorArgs(['--out-dir', 'missing-dir']),
  /--samebar-separator-report is required/,
);

console.log('raw OHLC OpeningDrive combined selector verified.');
