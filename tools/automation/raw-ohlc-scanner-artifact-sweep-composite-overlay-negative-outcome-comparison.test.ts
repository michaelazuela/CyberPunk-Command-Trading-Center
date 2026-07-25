import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-outcome-comparison';

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

const negativeSimulationReport = {
  status: 'pass',
  authority,
  slates: [
    {
      slateId: 'slate-1',
      tradeDate: '2026-07-16',
      session: 'lunch',
      overlayTopTicketId: 'old-1',
      overlayTopSetupType: 'IntradayMssMicroContinuation',
      overlayTopOneMesPl: null,
      negativeTopTicketId: 'new-1',
      negativeTopSetupType: 'IntradayMssMicroContinuation',
      negativeTopOneMesPl: null,
      topChanged: true,
    },
    {
      slateId: 'slate-2',
      tradeDate: '2026-07-17',
      session: 'morning',
      overlayTopTicketId: 'old-2',
      overlayTopSetupType: 'SweepMssFvgRetrace',
      overlayTopOneMesPl: -25,
      negativeTopTicketId: 'new-2',
      negativeTopSetupType: 'IntradayMssMicroContinuation',
      negativeTopOneMesPl: null,
      topChanged: true,
    },
    {
      slateId: 'slate-3',
      tradeDate: '2026-07-17',
      session: 'morning',
      overlayTopTicketId: 'same',
      overlayTopSetupType: 'SweepMssFvgRetrace',
      overlayTopOneMesPl: 25,
      negativeTopTicketId: 'same',
      negativeTopSetupType: 'SweepMssFvgRetrace',
      negativeTopOneMesPl: 25,
      topChanged: false,
    },
  ],
};

const replacementCoverageReport = {
  status: 'pass',
  rows: [
    {
      ticketId: 'new-1',
      coverageStatus: 'ready_for_replay_package',
      blockers: [],
    },
    {
      ticketId: 'new-2',
      coverageStatus: 'ready_for_replay_package',
      blockers: [],
    },
  ],
};

const replacementOutcomeReport = {
  status: 'pass',
  rows: [
    {
      ticketId: 'new-1',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 100,
    },
    {
      ticketId: 'new-2',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 75,
    },
  ],
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport({
  reportDir: 'reports',
  negativeSimulationReportPath: 'negative.json',
  replacementCoverageReportPath: 'coverage.json',
  replacementOutcomeReportPath: 'outcome.json',
  negativeSimulationReport: negativeSimulationReport as any,
  replacementCoverageReport: replacementCoverageReport as any,
  replacementOutcomeReport: replacementOutcomeReport as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_outcome_comparison');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.changedSlates, 2);
assert.equal(report.summary.replacementCoverageReadySlates, 2);
assert.equal(report.summary.replacementResolvedRows, 2);
assert.equal(report.summary.replacementResolvedGrossOneMesPl, 175);
assert.equal(report.summary.bothSidesResolvedRows, 1);
assert.equal(report.summary.bothSidesResolvedDeltaOneMesPl, 100);
assert.equal(report.summary.replacementResolvedOriginalMissingRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'prepare_next_research_delta_package');
assert.equal(report.rows.find((row) => row.slateId === 'slate-1')?.evidenceClass, 'replacement_resolved_original_missing');
assert.equal(report.rows.find((row) => row.slateId === 'slate-2')?.evidenceClass, 'both_sides_resolved');
assert.match(report.markdown, /Negative Overlay Outcome Comparison/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonArgs([
  '--negative-simulation-report',
  'negative.json',
  '--replacement-coverage-report',
  'coverage.json',
  '--replacement-outcome-report',
  'outcome.json',
  '--json',
]);
assert.equal(parsed.negativeSimulationReport, 'negative.json');
assert.equal(parsed.replacementCoverageReport, 'coverage.json');
assert.equal(parsed.replacementOutcomeReport, 'outcome.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay negative outcome comparison verified.');
