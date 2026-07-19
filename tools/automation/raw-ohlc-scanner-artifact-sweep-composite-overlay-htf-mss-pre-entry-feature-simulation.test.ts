import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-pre-entry-feature-simulation';

const broadValidation = {
  status: 'pass',
  selectedRows: [
    {
      ticketId: 'winner',
      tradeDate: '2026-06-24',
      session: 'morning',
      direction: 'LONG',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 250,
      proofTime: '2026-06-24T10:30:00',
      riskPoints: 12,
    },
    {
      ticketId: 'winner-2',
      tradeDate: '2026-06-24',
      session: 'lunch',
      direction: 'SHORT',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 125,
      proofTime: '2026-06-24T13:30:00',
      riskPoints: 10,
    },
    {
      ticketId: 'loss',
      tradeDate: '2026-06-24',
      session: 'morning',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -150,
      proofTime: '2026-06-24T10:35:00',
      riskPoints: 29,
    },
    {
      ticketId: 'loss-2',
      tradeDate: '2026-06-24',
      session: 'morning',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -100,
      proofTime: '2026-06-24T10:40:00',
      riskPoints: 30,
    },
  ],
};

const featureSearch = {
  status: 'pass',
  summary: {
    recommendation: 'simulate_pre_entry_feature_candidates',
  },
  topPreEntryCandidates: [
    {
      feature: 'fineRiskBucket',
      key: 'risk_28_to_32',
      scope: 'pre_entry_candidate',
      rows: 2,
      winners: 0,
      losses: 2,
      unresolved: 0,
      oneMesPl: -250,
      lossShare: 1,
    },
    {
      feature: 'riskBucket',
      key: 'risk_gte_24',
      scope: 'pre_entry_candidate',
      rows: 2,
      winners: 0,
      losses: 2,
      unresolved: 0,
      oneMesPl: -250,
      lossShare: 1,
    },
    {
      feature: 'separatorTag',
      key: 'stopped_before_t1',
      scope: 'replay_outcome_research_only',
      rows: 2,
      winners: 0,
      losses: 2,
      unresolved: 0,
      oneMesPl: -250,
      lossShare: 1,
    },
  ],
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationReport({
  reportDir: 'reports',
  broadValidationPath: 'broad-validation.json',
  featureSearchPath: 'feature-search.json',
  broadValidation: broadValidation as any,
  featureSearch: featureSearch as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_pre_entry_feature_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.replayOutcomeFieldsExcluded, true);
assert.equal(report.summary.inputSelectedRows, 4);
assert.equal(report.summary.inputLossRows, 2);
assert.equal(report.summary.scenariosTested, 2);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.bestInstallCandidate, 'fineRiskBucket:risk_28_to_32');
assert.equal(report.summary.recommendation, 'prepare_research_only_proposal_update');
assert.ok(report.scenarios.every((scenario) => scenario.sourceFeature !== 'separatorTag'));
assert.match(report.markdown, /HTF MSS Pre-Entry Feature Simulation/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationArgs([
  '--broad-validation',
  'broad-validation.json',
  '--feature-search',
  'feature-search.json',
  '--json',
]);
assert.equal(parsed.broadValidation, 'broad-validation.json');
assert.equal(parsed.featureSearch, 'feature-search.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS pre-entry feature simulation verified.');
