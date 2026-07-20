import assert from 'node:assert/strict';
import {
  buildBridgeFreshPackageDataBoundaryAuditReport,
} from './bridge-fresh-package-data-boundary-audit';
import type { BridgeHistorySmokeReport } from './bridge-history-smoke';

const baseSmoke: BridgeHistorySmokeReport = {
  reportType: 'bridge_history_smoke',
  generatedAt: '2026-07-20T00:00:00.000Z',
  instrument: 'MES',
  bridgeInstrument: 'MES 09-26',
  bridgeUrl: 'http://127.0.0.1:8765',
  dateWindowTested: { date: '2026-07-20', from: '09:15', to: '16:00' },
  timeframeResults: ['5m', '15m', '60m', '120m', '240m'].map((timeframe) => ({
    timeframe,
    request: {
      label: 'primary_offsetless',
      endpoint: 'historical-bars',
      bridgeUrl: 'http://127.0.0.1:8765',
      bridgeInstrument: 'MES 09-26',
      timeframe,
      from: '2026-07-20T09:15:00',
      to: '2026-07-20T16:00:00',
      timestampMode: 'open',
      timeZoneMode: 'eastern',
    },
    succeeded: true,
    bridgeOk: true,
    errorMessage: null,
    rawBarCount: 12,
    firstReturnedBarTimestamp: '2026-07-20T09:15:00',
    lastReturnedBarTimestamp: '2026-07-20T10:10:00',
    completedBarCount: 12,
    filteredIncompleteCount: 0,
    invalidTimestampCount: 0,
    invalidOhlcCount: 0,
    aliasAttempts: [],
  })),
  fallbackResults: [],
  bestWorkingTimeframe: '5m',
  bestWorkingRequestShape: null,
  liveRecentResult: {
    timeframe: '5m',
    request: {
      label: 'live_recent_bars',
      endpoint: 'bars',
      bridgeUrl: 'http://127.0.0.1:8765',
      bridgeInstrument: 'MES 09-26',
      timeframe: '5m',
      from: null,
      to: null,
      timestampMode: 'open',
      timeZoneMode: 'eastern',
    },
    succeeded: true,
    bridgeOk: true,
    errorMessage: null,
    rawBarCount: 100,
    firstReturnedBarTimestamp: '2026-07-19T19:45:00',
    lastReturnedBarTimestamp: '2026-07-20T04:00:00',
    completedBarCount: 100,
    filteredIncompleteCount: 0,
    invalidTimestampCount: 0,
    invalidOhlcCount: 0,
    aliasAttempts: [],
  },
  liveRecentBarsAvailable: true,
  historicalBarsAvailable: true,
  completedBarsAvailable: true,
  likelyCause: 'unknown',
  recommendedFix: 'Review per-timeframe details.',
  safeNextStep: 'Proceed with local export.',
  approvalBoundary: {
    diagnosticChangesTradingRules: false,
    diagnosticChangesBridgeBehavior: false,
    diagnosticCreatesTrade: false,
    diagnosticCreatesTargets: false,
    diagnosticWritesRag: false,
    diagnosticChangesScanner: false,
  },
};

const ready = buildBridgeFreshPackageDataBoundaryAuditReport({
  reportDir: 'reports',
  smokeReportPath: 'smoke.json',
  smokeReport: baseSmoke,
}, '2026-07-20T00:00:00.000Z');

assert.equal(ready.status, 'pass');
assert.equal(ready.summary.readyForMarketBarsJsonExport, true);
assert.equal(ready.summary.allRequestedTimeframesCompleted, true);
assert.equal(ready.summary.liveRecentRawBars, 100);
assert.equal(ready.summary.liveRecentRangeStart, '2026-07-19T19:45:00');
assert.equal(ready.summary.recommendation, 'run_raw_scanner_artifact_generator');
assert.equal(ready.summary.livePromotionAllowedRows, 0);
assert.equal(ready.authority.readsLiveBridge, false);
assert.equal(ready.authority.changesBridgeBehavior, false);
assert.equal(ready.authority.changesTradingLogic, false);
assert.equal(ready.blockers.length, 0);

const missingHistory = buildBridgeFreshPackageDataBoundaryAuditReport({
  reportDir: 'reports',
  smokeReportPath: 'smoke.json',
  smokeReport: {
    ...baseSmoke,
    timeframeResults: baseSmoke.timeframeResults.map((row) => ({
      ...row,
      rawBarCount: 0,
      completedBarCount: 0,
      firstReturnedBarTimestamp: null,
      lastReturnedBarTimestamp: null,
    })),
    historicalBarsAvailable: false,
    completedBarsAvailable: false,
    likelyCause: 'ninjatrader_history_not_loaded',
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(missingHistory.status, 'pass');
assert.equal(missingHistory.summary.readyForMarketBarsJsonExport, false);
assert.equal(missingHistory.summary.recommendation, 'load_ninjatrader_history');
assert.ok(missingHistory.blockers.some((item) => item.includes('zero completed bars')));
assert.ok(missingHistory.blockers.some((item) => item.includes('live recent bars exist')));

const mismatch = buildBridgeFreshPackageDataBoundaryAuditReport({
  reportDir: 'reports',
  smokeReportPath: 'smoke.json',
  smokeReport: {
    ...baseSmoke,
    timeframeResults: baseSmoke.timeframeResults.map((row) => ({
      ...row,
      rawBarCount: 0,
      completedBarCount: 0,
      errorMessage: 'Instrument not found: MES',
    })),
    liveRecentBarsAvailable: false,
    historicalBarsAvailable: false,
    completedBarsAvailable: false,
    likelyCause: 'instrument_mismatch',
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(mismatch.summary.recommendation, 'rerun_with_active_contract');
assert.ok(mismatch.blockers.some((item) => item.includes('bridge instrument mismatch')));

const missingSmoke = buildBridgeFreshPackageDataBoundaryAuditReport({
  reportDir: 'reports',
  smokeReportPath: null,
  smokeReport: null,
}, '2026-07-20T00:00:00.000Z');

assert.equal(missingSmoke.status, 'fail');
assert.equal(missingSmoke.summary.recommendation, 'fix_smoke_inputs');

console.log('bridge fresh package data-boundary audit verified.');
