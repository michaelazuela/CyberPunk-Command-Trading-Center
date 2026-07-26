import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactJulyHtfReadyRollupReport,
  parseRawOhlcScannerArtifactJulyHtfReadyRollupArgs,
} from './raw-ohlc-scanner-artifact-july-htf-ready-rollup';

const outcomeReports = [
  {
    status: 'pass' as const,
    summary: {
      packageRows: 10,
      resolvedRows: 8,
      unresolvedRows: 2,
      blockedRows: 0,
      grossResolvedOneMesPl: 400,
      livePromotionAllowedRows: 0,
      daySessionModelGroups: [
        {
          tradeDate: '2026-07-10',
          session: 'morning',
          setupType: 'NoInstalledSetup',
          rows: 4,
          resolvedRows: 4,
          unresolvedRows: 0,
          blockedRows: 0,
          grossResolvedOneMesPl: -90,
        },
        {
          tradeDate: '2026-07-10',
          session: 'lunch',
          setupType: 'NoInstalledSetup',
          rows: 6,
          resolvedRows: 4,
          unresolvedRows: 2,
          blockedRows: 0,
          grossResolvedOneMesPl: 490,
        },
      ],
    },
  },
  {
    status: 'pass' as const,
    summary: {
      packageRows: 5,
      resolvedRows: 5,
      unresolvedRows: 0,
      blockedRows: 0,
      grossResolvedOneMesPl: 150,
      livePromotionAllowedRows: 0,
      daySessionModelGroups: [
        {
          tradeDate: '2026-07-11',
          session: 'morning',
          setupType: 'NoInstalledSetup',
          rows: 5,
          resolvedRows: 5,
          unresolvedRows: 0,
          blockedRows: 0,
          grossResolvedOneMesPl: 150,
        },
      ],
    },
  },
];

const samebarReports = [
  {
    status: 'pass' as const,
    summary: {
      sameBarRows: 7,
      winners: 3,
      losses: 2,
      unresolved: 2,
      grossOneMesPl: 75,
      livePromotionAllowedRows: 0,
    },
  },
];

const openingDriveSelectorReports = [
  {
    status: 'pass' as const,
    source: {
      samebarSeparatorReportPath: 'samebar.json',
      setupType: 'NoInstalledSetup',
    },
    summary: {
      sourceRows: 4,
      proofEvents: 4,
      selectedRows: 3,
      rejectedRows: 1,
      collisionEvents: 0,
      selectedSummary: {
        rows: 3,
        winners: 1,
        losses: 2,
        otherResolved: 0,
        unresolved: 0,
        oneMesPl: -40,
        avgRiskPoints: 6,
      },
      rejectedSummary: {
        rows: 1,
        winners: 1,
        losses: 0,
        otherResolved: 0,
        unresolved: 0,
        oneMesPl: 100,
        avgRiskPoints: 10,
      },
      livePromotionAllowedRows: 0,
    },
  },
];

const report = buildRawOhlcScannerArtifactJulyHtfReadyRollupReport({
  outcomeReports,
  outcomeReportPaths: ['outcome-a.json', 'outcome-b.json'],
  samebarReports,
  samebarReportPaths: ['samebar.json'],
  openingDriveSelectorReports,
  openingDriveSelectorReportPaths: ['selector.json'],
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_july_htf_ready_rollup');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.packageRows, 15);
assert.equal(report.summary.resolvedRows, 13);
assert.equal(report.summary.grossResolvedOneMesPl, 550);
assert.equal(report.summary.sameBarLosses, 2);
assert.equal(report.summary.openingDriveSelectedRows, 3);
assert.equal(report.summary.openingDriveSelectedLosses, 2);
assert.equal(report.summary.openingDriveSelectedOneMesPl, -40);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.openingDriveSelectorVerdict, 'reject_live_promotion');
assert.equal(report.modelSummaries[0].setupType, 'NoInstalledSetup');
assert.match(report.markdown, /July HTF-Ready Replay Rollup/);
assert.match(report.recommendations[0], /Do not promote/);

const parsed = parseRawOhlcScannerArtifactJulyHtfReadyRollupArgs([
  '--outcome-reports',
  'a.json,b.json',
  '--samebar-reports=s.json',
  '--openingdrive-selector-reports',
  'o.json',
  '--json',
]);
assert.deepEqual(parsed.outcomeReports, ['a.json', 'b.json']);
assert.deepEqual(parsed.samebarReports, ['s.json']);
assert.deepEqual(parsed.openingDriveSelectorReports, ['o.json']);
assert.equal(parsed.json, true);

console.log('raw OHLC July HTF-ready rollup verified.');
