import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-separator-simulation';

const separatorSimulation = {
  status: 'pass',
  summary: {
    recommendation: 'revise_separator',
  },
  selectedRows: [
    {
      ticketId: 'winner',
      tradeDate: '2026-07-17',
      session: 'morning',
      direction: 'LONG',
      riskPoints: 9,
      proofTime: '2026-07-17T10:30:00',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      oneMesPl: 90,
      positiveMatches: [],
      cautionMatches: [],
    },
    {
      ticketId: 'loss',
      tradeDate: '2026-07-17',
      session: 'morning',
      direction: 'LONG',
      riskPoints: 17.75,
      proofTime: '2026-07-17T11:40:00',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      oneMesPl: -88.75,
      positiveMatches: [],
      cautionMatches: [],
    },
  ],
  rejectedRows: [
    {
      ticketId: 'old-loss',
      tradeDate: '2026-07-09',
      session: 'morning',
      direction: 'SHORT',
      riskPoints: 18,
      proofTime: '2026-07-09T09:40:00',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      oneMesPl: -90,
      positiveMatches: [],
      cautionMatches: [],
    },
  ],
};

const selectedLossDrilldown = {
  status: 'pass',
  summary: {
    recommendation: 'add_second_separator_simulation',
    lossDates: ['2026-07-17'],
    lossSessions: ['morning'],
    lossDirections: ['LONG'],
  },
  lossRows: [
    {
      ticketId: 'loss',
      tradeDate: '2026-07-17',
      session: 'morning',
      direction: 'LONG',
      riskPoints: 17.75,
      proofTime: '2026-07-17T11:40:00',
    },
  ],
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationReport({
  reportDir: 'reports',
  separatorSimulationPath: 'simulation.json',
  selectedLossDrilldownPath: 'drilldown.json',
  separatorSimulation: separatorSimulation as any,
  selectedLossDrilldown: selectedLossDrilldown as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_separator_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.promotionDisabled, true);
assert.equal(report.secondSeparator?.tradeDate, '2026-07-17');
assert.equal(report.secondSeparator?.timeBucket, '11:00-11:59');
assert.equal(report.secondSeparator?.riskBucket, 'risk_16_to_24');
assert.equal(report.summary.inputSelectedRows, 2);
assert.equal(report.summary.selectedRows, 1);
assert.equal(report.summary.newlyRejectedRows, 1);
assert.equal(report.summary.selectedWinners, 1);
assert.equal(report.summary.selectedLosses, 0);
assert.equal(report.summary.newlyRejectedLosses, 1);
assert.equal(report.summary.totalRejectedLosses, 2);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'prepare_research_only_proposal_update');
assert.match(report.markdown, /HTF MSS Second-Separator Simulation/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationArgs([
  '--separator-simulation',
  'simulation.json',
  '--selected-loss-drilldown',
  'drilldown.json',
  '--json',
]);
assert.equal(parsed.separatorSimulation, 'simulation.json');
assert.equal(parsed.selectedLossDrilldown, 'drilldown.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS second-separator simulation verified.');
