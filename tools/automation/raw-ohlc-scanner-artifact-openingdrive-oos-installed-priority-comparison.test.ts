import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonReport,
  parseRawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-installed-priority-comparison';

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

const validation = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_broader_priority_validation',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { samebarReports: ['samebar.json'] },
  assumptions: {},
  summary: {
    comparableEvents: 2,
    priorityBetterRows: 2,
    openingDriveBetterOrEqualRows: 0,
    openingDriveLosses: 1,
    priorityLosses: 0,
    openingDriveOneMesPl: 20,
    priorityOneMesPl: 350,
    deltaOneMesPl: 330,
    livePromotionAllowedRows: 0,
    recommendation: 'prepare_research_only_live_proposal',
  },
  rows: [
    {
      tradeDate: '2026-07-17',
      session: 'morning',
      proofTime: '2026-07-17T10:00:00',
      direction: 'LONG',
      openingDriveTicketId: 'od-a',
      openingDriveOneMesPl: -100,
      openingDriveOutcomeLabel: 'stopped_before_t1',
      priorityTicketId: 'sweep-a',
      prioritySetupType: 'SweepMssFvgRetrace',
      priorityOneMesPl: 150,
      priorityOutcomeLabel: 't1_and_t2_hit',
      deltaOneMesPl: 250,
      verdict: 'priority_better',
    },
    {
      tradeDate: '2026-07-17',
      session: 'morning',
      proofTime: '2026-07-17T10:05:00',
      direction: 'SHORT',
      openingDriveTicketId: 'od-b',
      openingDriveOneMesPl: 120,
      openingDriveOutcomeLabel: 't1_hit_only',
      priorityTicketId: 'sweep-b',
      prioritySetupType: 'SweepMssFvgRetrace',
      priorityOneMesPl: 200,
      priorityOutcomeLabel: 't1_and_t2_hit',
      deltaOneMesPl: 80,
      verdict: 'priority_better',
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonReport({
  validationPath: 'validation.json',
  validation,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_oos_installed_priority_comparison');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.summary.comparableEvents, 2);
assert.equal(report.summary.installedPrioritySelectedRows, 2);
assert.equal(report.summary.installedOpeningDriveSelectedRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.approvalBoundaryDriftRows, 0);
assert.equal(report.summary.proposalDeltaOneMesPl, 330);
assert.equal(report.summary.proposalPriorityLosses, 0);
assert.equal(report.summary.recommendation, 'installed_overlay_matches_oos_priority_proposal');
assert.equal(report.rows[0].installedPrimaryTicketId, 'sweep-a');
assert.equal(report.rows[1].installedPrimaryTicketId, 'sweep-b');
assert.ok((report.rows[0].priorityScore || 0) > (report.rows[0].openingDriveScore || 0));
assert.match(report.markdown, /OpeningDrive OOS Installed Priority Comparison/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonReport({
  validationPath: 'missing.json',
  validation: null,
}, '2026-07-19T00:02:00.000Z');
assert.equal(blocked.status, 'fail');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('missing broader priority validation report')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonArgs([
  '--validation',
  'validation.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.validation, 'validation.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive OOS installed priority comparison verified.');
