import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport,
  parseRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-low-risk-loss-drilldown';

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
  riskPoints: number;
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1';
  resolvedOneMesPl: number;
  proofTime?: string;
  separatorTags?: string[];
}) {
  return {
    ticketId: args.ticketId,
    tradeDate: '2026-07-20',
    session: 'morning',
    setupType: 'OpeningDriveFvgContinuation',
    direction: 'LONG',
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: 'resolved',
    resolvedOneMesPl: args.resolvedOneMesPl,
    proofTime: args.proofTime || '2026-07-20T10:05:00.000Z',
    entryHitTime: '2026-07-20T10:05:00.000Z',
    firstReplayBarTime: '2026-07-20T10:10:00.000Z',
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? '2026-07-20T10:10:00.000Z' : null,
    t1HitTime: args.outcomeLabel === 't1_and_t2_hit' ? '2026-07-20T10:15:00.000Z' : null,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' ? '2026-07-20T10:20:00.000Z' : null,
    riskPoints: args.riskPoints,
    mfeR: args.outcomeLabel === 'stopped_before_t1' ? 0.3 : 2,
    maeR: args.outcomeLabel === 'stopped_before_t1' ? -1 : -0.2,
    timeBucket: '10:00-10:59',
    separatorTags: args.separatorTags || ['same_bar_entry_stop'],
  };
}

const reports = [
  {
    filePath: 'old.json',
    mtimeMs: 1,
    report: {
      status: 'pass',
      authority,
      rows: [
        row({ ticketId: 'dup-loss', riskPoints: 3.75, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -18.75 }),
      ],
    },
  },
  {
    filePath: 'new.json',
    mtimeMs: 2,
    report: {
      status: 'pass',
      authority,
      rows: [
        row({ ticketId: 'dup-loss', riskPoints: 3.25, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 32.5 }),
        row({ ticketId: 'real-loss', riskPoints: 2.75, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -13.75, separatorTags: ['first_replay_bar_stop', 'same_bar_entry_stop'] }),
        row({ ticketId: 'winner', riskPoints: 1.75, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 17.5 }),
        row({ ticketId: 'not-low', riskPoints: 5, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -25 }),
      ],
    },
  },
] as any;

const report = buildRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport({
  reportDir: 'reports',
  setupType: 'OpeningDriveFvgContinuation',
  reports,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_low_risk_loss_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.scannerVisibleInstallAllowedNow, false);
assert.equal(report.summary.lowRiskRows, 3);
assert.equal(report.summary.winners, 2);
assert.equal(report.summary.losses, 1);
assert.equal(report.summary.oneMesPl, 36.25);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'mine_loss_separator');
assert.equal(report.lossRows.length, 1);
assert.equal(report.lossRows[0].ticketId, 'real-loss');
assert.equal(report.lossRows[0].riskBucket, 'risk_2_to_3');
assert(report.bucketSummaries.some((bucket) => bucket.bucketType === 'riskBucket' && bucket.key === 'risk_2_to_3' && bucket.losses === 1));
assert.match(report.markdown, /OpeningDrive Low-Risk Loss Drilldown/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport({
  reportDir: 'reports',
  setupType: 'OpeningDriveFvgContinuation',
  reports: [],
}, '2026-07-20T00:01:00.000Z');

assert.equal(blocked.status, 'fail');
assert(blocked.blockers.some((blocker) => blocker.includes('no same-bar separator reports found')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownArgs([
  '--report-dir',
  'reports',
  '--setup-type',
  'OpeningDriveFvgContinuation',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.reportDir, 'reports');
assert.equal(parsed.setupType, 'OpeningDriveFvgContinuation');
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive low-risk loss drilldown verified.');
