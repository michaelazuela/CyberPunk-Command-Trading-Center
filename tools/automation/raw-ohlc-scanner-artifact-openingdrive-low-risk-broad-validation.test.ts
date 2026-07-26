import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationReport,
  parseRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-low-risk-broad-validation';

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

function row(args: {
  ticketId: string;
  setupType?: string;
  tradeDate?: string;
  proofTime?: string;
  direction?: 'LONG' | 'SHORT';
  riskPoints: number;
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1' | 't1_hit_only';
  outcomeStatus?: 'resolved' | 'unresolved';
  resolvedOneMesPl: number | null;
}) {
  return {
    ticketId: args.ticketId,
    setupType: args.setupType || 'NoInstalledSetup',
    tradeDate: args.tradeDate || '2026-07-20',
    session: 'morning',
    proofTime: args.proofTime || '2026-07-20T10:05:00.000Z',
    direction: args.direction || 'LONG',
    riskPoints: args.riskPoints,
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: args.outcomeStatus || 'resolved',
    resolvedOneMesPl: args.resolvedOneMesPl,
  };
}

const reports = [
  {
    filePath: 'older.json',
    mtimeMs: 1,
    report: {
      reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
      generatedAt: '2026-07-20T00:00:00.000Z',
      status: 'pass',
      authority,
      rows: [
        row({ ticketId: 'low-duplicate', riskPoints: 3.75, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -18.75 }),
        row({ ticketId: 'fine-1', riskPoints: 25, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 250 }),
      ],
    },
  },
  {
    filePath: 'newer.json',
    mtimeMs: 2,
    report: {
      reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
      generatedAt: '2026-07-20T00:01:00.000Z',
      status: 'pass',
      authority,
      rows: [
        row({ ticketId: 'low-duplicate', riskPoints: 3.5, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 35 }),
        row({ ticketId: 'low-2', riskPoints: 2.75, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 27.5 }),
        row({ ticketId: 'tight-1', riskPoints: 5.25, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 52.5 }),
        row({ ticketId: 'other-model', setupType: 'NoInstalledSetup', riskPoints: 3, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -15 }),
      ],
    },
  },
] as any;

const report = buildRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationReport({
  reportDir: 'reports',
  setupType: 'NoInstalledSetup',
  recursive: true,
  reports,
}, '2026-07-20T00:02:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_low_risk_broad_validation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.scannerVisibleInstallAllowedNow, false);
assert.equal(report.summary.sourceReports, 2);
assert.equal(report.summary.sourceRows, 6);
assert.equal(report.summary.dedupedOpeningDriveRows, 5);
assert.equal(report.summary.lowRiskRows, 3);
assert.equal(report.summary.lowRiskLosses, 1);
assert.equal(report.summary.lowRiskOneMesPl, 47.5);
assert.equal(report.summary.lowRiskSampleReady, false);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'broaden_more');

const lowRiskLane = report.laneSummaries.find((lane) => lane.lane === 'low_risk_lt_4');
assert(lowRiskLane);
assert.equal(lowRiskLane.winners, 2);
assert.equal(lowRiskLane.losses, 1);

const tightLane = report.laneSummaries.find((lane) => lane.lane === 'tight_long_risk_4_to_8');
assert(tightLane);
assert.equal(tightLane.rows, 1);
assert.equal(tightLane.oneMesPl, 52.5);
assert.match(report.markdown, /OpeningDrive Low-Risk Broad Validation/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationReport({
  reportDir: 'reports',
  setupType: 'NoInstalledSetup',
  recursive: true,
  reports: [],
}, '2026-07-20T00:03:00.000Z');

assert.equal(blocked.status, 'fail');
assert(blocked.blockers.some((blocker) => blocker.includes('no same-bar separator reports found')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveLowRiskBroadValidationArgs([
  '--report-dir',
  'reports',
  '--setup-type',
  'NoInstalledSetup',
  '--no-recursive',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.reportDir, 'reports');
assert.equal(parsed.setupType, 'NoInstalledSetup');
assert.equal(parsed.recursive, false);
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive low-risk broad validation verified.');
