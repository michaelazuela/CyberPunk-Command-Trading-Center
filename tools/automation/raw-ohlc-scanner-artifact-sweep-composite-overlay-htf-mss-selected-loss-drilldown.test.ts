import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-selected-loss-drilldown';

const simulation = {
  status: 'pass',
  summary: {
    selectedOneMesPl: 120,
    recommendation: 'revise_separator',
  },
  selectedRows: [
    {
      ticketId: 'win',
      tradeDate: '2026-07-06',
      session: 'morning',
      direction: 'LONG',
      riskPoints: 9,
      proofTime: '2026-07-06T10:00:00',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      oneMesPl: 90,
      positiveMatches: ['session:morning', 'risk:risk_8_to_16'],
      cautionMatches: [],
    },
    {
      ticketId: 'loss-1',
      tradeDate: '2026-07-10',
      session: 'morning',
      direction: 'LONG',
      riskPoints: 9,
      proofTime: '2026-07-10T10:30:00',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      oneMesPl: -45,
      positiveMatches: ['session:morning', 'risk:risk_8_to_16'],
      cautionMatches: [],
    },
    {
      ticketId: 'loss-2',
      tradeDate: '2026-07-10',
      session: 'morning',
      direction: 'LONG',
      riskPoints: 11,
      proofTime: '2026-07-10T10:35:00',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      oneMesPl: -55,
      positiveMatches: ['session:morning', 'risk:risk_8_to_16'],
      cautionMatches: [],
    },
  ],
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownReport({
  reportDir: 'reports',
  separatorSimulationPath: 'simulation.json',
  separatorSimulation: simulation as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_selected_loss_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.selectedLossesOnly, true);
assert.equal(report.summary.selectedRows, 3);
assert.equal(report.summary.selectedLosses, 2);
assert.equal(report.summary.selectedWinners, 1);
assert.equal(report.summary.selectedLossOneMesPl, -100);
assert.deepEqual(report.summary.lossDates, ['2026-07-10']);
assert.deepEqual(report.summary.lossDirections, ['LONG']);
assert.equal(report.summary.lossRiskMin, 9);
assert.equal(report.summary.lossRiskMax, 11);
assert.equal(report.summary.lossRiskAvg, 10);
assert.deepEqual(report.summary.sharedPositiveBuckets, ['risk:risk_8_to_16', 'session:morning']);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'add_second_separator_simulation');
assert.equal(report.bucketOverlaps[0]?.lossRows, 2);
assert.match(report.markdown, /HTF MSS Selected-Loss Drilldown/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownArgs([
  '--separator-simulation',
  'simulation.json',
  '--json',
]);
assert.equal(parsed.separatorSimulation, 'simulation.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS selected-loss drilldown verified.');
