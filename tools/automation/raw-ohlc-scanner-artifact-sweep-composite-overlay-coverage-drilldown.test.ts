import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayCoverageDrilldownReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayCoverageDrilldownArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-coverage-drilldown';

const overlayReport = {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_dry_run',
  status: 'pass',
  slates: [
    {
      slateId: '2026-07-16|lunch|2026-07-16T14:00:00',
      tradeDate: '2026-07-16',
      session: 'lunch',
      baselineTopTicketId: '2026-07-16-lunch-SweepMssFvgRetrace-SHORT-20260716T140000',
      baselineTopSetupType: 'SweepMssFvgRetrace',
      baselineTopOneMesPl: null,
      overlayTopTicketId: '2026-07-16-lunch-SweepMssFvgRetrace-SHORT-20260716T140000',
      overlayTopSetupType: 'SweepMssFvgRetrace',
      overlayTopOneMesPl: null,
      topChanged: false,
    },
    {
      slateId: '2026-07-16|lunch|2026-07-16T14:05:00',
      tradeDate: '2026-07-16',
      session: 'lunch',
      baselineTopTicketId: '2026-07-16-lunch-OpeningDriveFvgContinuation-LONG-20260716T140500',
      baselineTopSetupType: 'OpeningDriveFvgContinuation',
      baselineTopOneMesPl: null,
      overlayTopTicketId: '2026-07-16-lunch-OpeningDriveFvgContinuation-LONG-20260716T140500',
      overlayTopSetupType: 'OpeningDriveFvgContinuation',
      overlayTopOneMesPl: null,
      topChanged: false,
    },
  ],
};

const scannerArtifact = {
  reportType: 'raw_ohlc_scanner_artifacts',
  instrument: 'MES',
  events: {
    '2026-07-16T14:00:00': {
      eventTime: '2026-07-16T14:00:00',
      date: '2026-07-16',
      session: 'lunch',
      completed5m: { time: '2026-07-16T14:00:00', open: 100, high: 104, low: 96, close: 99 },
      setupCandidateStatus: {
        statuses: [{
          setupType: 'SweepMssFvgRetrace',
          direction: 'SHORT',
          detectedStatus: 'Possible',
          executionStatus: 'Conditional',
          blockReason: 'EntryTriggerPending',
          entry: 99,
          stop: 103,
          target1: 93,
          target2: 91,
          rankScore: 225,
        }],
      },
    },
    '2026-07-16T14:05:00': {
      eventTime: '2026-07-16T14:05:00',
      date: '2026-07-16',
      session: 'lunch',
      completed5m: { time: '2026-07-16T14:05:00', open: 99, high: 100, low: 94, close: 95 },
      setupCandidateStatus: {
        statuses: [{
          setupType: 'OpeningDriveFvgContinuation',
          direction: 'LONG',
          detectedStatus: 'Possible',
          executionStatus: 'Conditional',
          blockReason: 'EntryTriggerPending',
          entry: null,
          stop: 95,
          target1: null,
          target2: null,
          rankScore: 240,
        }],
      },
    },
    '2026-07-16T14:10:00': {
      eventTime: '2026-07-16T14:10:00',
      date: '2026-07-16',
      session: 'lunch',
      completed5m: { time: '2026-07-16T14:10:00', open: 95, high: 96, low: 90, close: 91 },
      setupCandidateStatus: { statuses: [] },
    },
  },
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayCoverageDrilldownReport({
  reportDir: 'reports',
  overlayReportPath: 'overlay.json',
  overlayReport,
  scannerArtifactPaths: ['artifact.json'],
  scannerArtifacts: [scannerArtifact],
  replayPackagePath: 'replay-package.json',
  minReadyRows: 1,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_coverage_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.missingTopRefs, 4);
assert.equal(report.summary.uniqueMissingTopTicketIds, 2);
assert.equal(report.summary.readyRows, 1);
assert.equal(report.summary.blockedRows, 1);
assert.equal(report.summary.incompleteLevelRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'run_missing_top_outcome_replay');
assert.equal(report.rows.find((row) => row.coverageStatus === 'ready_for_replay_package')?.barsAfterProof, 3);
assert.match(report.markdown, /Overlay Coverage Drilldown/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayCoverageDrilldownArgs([
  '--overlay-report',
  'overlay.json',
  '--scanner-artifacts',
  'a.json,b.json',
  '--min-ready-rows',
  '3',
  '--json',
]);
assert.equal(parsed.overlayReport, 'overlay.json');
assert.deepEqual(parsed.scannerArtifacts, ['a.json', 'b.json']);
assert.equal(parsed.minReadyRows, 3);
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay coverage drilldown verified.');
