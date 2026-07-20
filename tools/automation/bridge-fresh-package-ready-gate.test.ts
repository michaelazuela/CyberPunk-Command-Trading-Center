import assert from 'node:assert/strict';
import {
  buildBridgeFreshPackageReadyGateReport,
} from './bridge-fresh-package-ready-gate';
import type { BridgeFreshPackageDataBoundaryAuditReport } from './bridge-fresh-package-data-boundary-audit';

const baseBoundary: BridgeFreshPackageDataBoundaryAuditReport = {
  reportType: 'bridge_fresh_package_data_boundary_audit',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority: {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: true,
    changesBridgeBehavior: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesDiscordPosting: false,
    changesAppRuntime: false,
  },
  source: {
    reportDir: 'reports',
    smokeReportPath: null,
    liveSmokeRun: true,
  },
  bridgeWindow: {
    instrument: 'MES',
    bridgeInstrument: 'MES 09-26',
    bridgeUrl: 'http://127.0.0.1:8765',
    date: '2026-07-20',
    from: '09:15',
    to: '16:00',
  },
  summary: {
    liveRecentBarsAvailable: true,
    liveRecentRawBars: 100,
    liveRecentCompletedBars: 98,
    liveRecentRangeStart: '2026-07-19T20:00:00.0000000',
    liveRecentRangeEnd: '2026-07-20T04:15:00.0000000',
    historicalBarsAvailable: true,
    completedBarsAvailable: true,
    allRequestedTimeframesCompleted: true,
    likelyCause: 'unknown',
    readyForMarketBarsJsonExport: true,
    recommendation: 'run_raw_scanner_artifact_generator',
    livePromotionAllowedRows: 0,
  },
  timeframeBoundaries: ['5m', '15m', '60m', '120m', '240m'].map((timeframe) => ({
    timeframe,
    rawBarCount: 12,
    completedBarCount: 12,
    sufficientForPackage: true,
    firstReturnedBarTimestamp: '2026-07-20T09:15:00',
    lastReturnedBarTimestamp: '2026-07-20T10:10:00',
    errorMessage: null,
  })),
  blockers: [],
  recommendations: ['Proceed.'],
  markdown: 'boundary',
};

const ready = buildBridgeFreshPackageReadyGateReport({
  reportDir: 'reports',
  boundaryAuditPath: 'boundary.json',
  boundaryAudit: baseBoundary,
}, '2026-07-20T00:00:00.000Z');

assert.equal(ready.status, 'pass');
assert.equal(ready.summary.generatorAllowed, true);
assert.equal(ready.summary.livePromotionAllowedRows, 0);
assert.ok(ready.nextAllowedCommand?.includes('research:raw-ohlc-scanner-artifacts'));
assert.equal(ready.authority.readsLiveBridge, false);
assert.equal(ready.authority.changesBridgeBehavior, false);
assert.equal(ready.authority.changesTradingLogic, false);
assert.equal(ready.authority.changesCanExecute, false);
assert.equal(ready.blockers.length, 0);

const notReady = buildBridgeFreshPackageReadyGateReport({
  reportDir: 'reports',
  boundaryAuditPath: 'boundary.json',
  boundaryAudit: {
    ...baseBoundary,
    summary: {
      ...baseBoundary.summary,
      historicalBarsAvailable: false,
      completedBarsAvailable: false,
      allRequestedTimeframesCompleted: false,
      likelyCause: 'ninjatrader_history_not_loaded',
      readyForMarketBarsJsonExport: false,
      recommendation: 'load_ninjatrader_history',
    },
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(notReady.status, 'fail');
assert.equal(notReady.summary.generatorAllowed, false);
assert.equal(notReady.nextAllowedCommand, null);
assert.ok(notReady.blockers.some((item) => item.includes('market-bars JSON export is not ready')));
assert.ok(notReady.blockers.some((item) => item.includes('requested timeframes lack completed historical bars')));
assert.ok(notReady.recommendations.some((item) => item.includes('Load NinjaTrader historical data')));

const missingBoundary = buildBridgeFreshPackageReadyGateReport({
  reportDir: 'reports',
  boundaryAuditPath: null,
  boundaryAudit: null,
}, '2026-07-20T00:00:00.000Z');

assert.equal(missingBoundary.status, 'fail');
assert.equal(missingBoundary.summary.generatorAllowed, false);
assert.ok(missingBoundary.blockers.some((item) => item.includes('missing bridge fresh-package data-boundary audit report')));

console.log('bridge fresh package ready gate verified.');
