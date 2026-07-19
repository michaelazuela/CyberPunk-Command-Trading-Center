import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-compound-pre-entry-miner';

const broadValidation = {
  status: 'pass',
  selectedRows: [
    {
      ticketId: 'winner',
      session: 'morning',
      direction: 'LONG',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 250,
      proofTime: '2026-06-24T10:30:00',
      riskPoints: 12,
    },
    {
      ticketId: 'loss-1',
      session: 'morning',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -125,
      proofTime: '2026-06-24T10:35:00',
      riskPoints: 29,
    },
    {
      ticketId: 'loss-2',
      session: 'morning',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -125,
      proofTime: '2026-06-24T10:40:00',
      riskPoints: 30,
    },
    {
      ticketId: 'loss-3',
      session: 'morning',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -125,
      proofTime: '2026-06-24T10:45:00',
      riskPoints: 31,
    },
    {
      ticketId: 'loss-4',
      session: 'morning',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -125,
      proofTime: '2026-06-24T10:50:00',
      riskPoints: 29,
    },
    {
      ticketId: 'loss-5',
      session: 'morning',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -125,
      proofTime: '2026-06-24T10:55:00',
      riskPoints: 30,
    },
    {
      ticketId: 'winner-2',
      session: 'lunch',
      direction: 'SHORT',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 150,
      proofTime: '2026-06-24T13:30:00',
      riskPoints: 10,
    },
  ],
};

const preEntrySimulation = {
  status: 'pass',
  summary: {
    recommendation: 'continue_feature_search',
  },
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerReport({
  reportDir: 'reports',
  broadValidationPath: 'broad-validation.json',
  preEntrySimulationPath: 'pre-entry-simulation.json',
  broadValidation: broadValidation as any,
  preEntrySimulation: preEntrySimulation as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_compound_pre_entry_miner');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.excludesDateRegimeFeatures, true);
assert.equal(report.assumptions.excludesReplayOutcomeFields, true);
assert.equal(report.summary.inputSelectedRows, 7);
assert.equal(report.summary.inputLossRows, 5);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.lowWinnerCostScenario, report.topCompoundScenarios[0].name);
assert.equal(report.summary.recommendation, 'simulate_compound_package');
assert.ok(report.topCompoundScenarios.some((scenario) => scenario.key.includes('fineRiskBucket=risk_28_to_32')));
assert.match(report.markdown, /HTF MSS Compound Pre-Entry Miner/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerArgs([
  '--broad-validation',
  'broad-validation.json',
  '--pre-entry-simulation',
  'pre-entry-simulation.json',
  '--json',
]);
assert.equal(parsed.broadValidation, 'broad-validation.json');
assert.equal(parsed.preEntrySimulation, 'pre-entry-simulation.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS compound pre-entry miner verified.');
