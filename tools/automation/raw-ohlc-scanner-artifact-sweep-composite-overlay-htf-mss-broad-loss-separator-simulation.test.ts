import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-broad-loss-separator-simulation';

const selectedRows = [
  {
    ticketId: 'winner-small-risk',
    tradeDate: '2026-06-24',
    session: 'morning',
    setupType: 'HtfDisplacementMssContinuation',
    direction: 'LONG',
    outcomeLabel: 't1_and_t2_hit',
    outcomeStatus: 'resolved',
    resolvedOneMesPl: 100,
    proofTime: '2026-06-24T10:25:00',
    riskPoints: 10,
  },
  {
    ticketId: 'winner-high-risk',
    tradeDate: '2026-06-24',
    session: 'morning',
    setupType: 'HtfDisplacementMssContinuation',
    direction: 'LONG',
    outcomeLabel: 't1_and_t2_hit',
    outcomeStatus: 'resolved',
    resolvedOneMesPl: 150,
    proofTime: '2026-06-24T10:30:00',
    riskPoints: 25,
  },
  {
    ticketId: 'loss-high-risk',
    tradeDate: '2026-06-24',
    session: 'morning',
    setupType: 'HtfDisplacementMssContinuation',
    direction: 'LONG',
    outcomeLabel: 'stopped_before_t1',
    outcomeStatus: 'resolved',
    resolvedOneMesPl: -125,
    proofTime: '2026-06-24T10:35:00',
    riskPoints: 26,
  },
];

const broadValidation = {
  status: 'pass',
  summary: {
    recommendation: 'revise_separator',
  },
  selectedRows,
};

const lossDrilldown = {
  status: 'pass',
  summary: {
    recommendation: 'build_broad_loss_separator_simulation',
    dominantCombo: 'morning|LONG|10:00-10:59|risk_gte_24',
  },
  buckets: {
    bySessionDirectionTimeRisk: [
      { key: 'morning|LONG|10:00-10:59|risk_gte_24', rows: 1, oneMesPl: -125 },
    ],
  },
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationReport({
  reportDir: 'reports',
  broadValidationPath: 'broad-validation.json',
  lossDrilldownPath: 'loss-drilldown.json',
  broadValidation: broadValidation as any,
  lossDrilldown: lossDrilldown as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_broad_loss_separator_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.promotionDisabled, true);
assert.equal(report.summary.inputSelectedRows, 3);
assert.equal(report.summary.inputLossRows, 1);
assert.equal(report.summary.scenariosTested, 4);
assert.equal(report.summary.zeroSelectedLossScenario, 'risk_gte_24');
assert.equal(report.summary.recommendation, 'prepare_research_only_proposal_update');
assert.equal(report.scenarios.find((scenario) => scenario.name === 'risk_gte_24')?.selectedLosses, 0);
assert.equal(report.scenarios.find((scenario) => scenario.name === 'risk_gte_24')?.rejectedWinners, 1);
assert.equal(report.scenarios.every((scenario) => scenario.livePromotionAllowedRows === 0), true);
assert.match(report.markdown, /HTF MSS Broad Loss Separator Simulation/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationArgs([
  '--broad-validation',
  'broad-validation.json',
  '--loss-drilldown',
  'loss-drilldown.json',
  '--json',
]);
assert.equal(parsed.broadValidation, 'broad-validation.json');
assert.equal(parsed.lossDrilldown, 'loss-drilldown.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS broad loss separator simulation verified.');
