import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveOosPrioritySimulationReport,
  parseRawOhlcScannerArtifactOpeningDriveOosPrioritySimulationArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-priority-simulation';

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

const comparison = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_collision_comparison',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { oosPackagePath: 'oos.json', samebarReports: [] },
  assumptions: {},
  summary: {
    selectedRows: 3,
    selectedLosses: 0,
  },
  rows: [
    {
      selectedTicketId: 'od-keep',
      tradeDate: '2026-07-16',
      session: 'morning',
      proofTime: '2026-07-16T10:40:00',
      selectedDirection: 'LONG',
      selectedRiskPoints: 7.38,
      selectedOutcomeLabel: 't1_and_t2_hit',
      selectedOutcomeStatus: 'resolved',
      selectedOneMesPl: 74.38,
      competingRows: 0,
      competingSetupTypes: [],
      competingLosses: 0,
      competingWinners: 0,
      bestCompetingTicketId: null,
      bestCompetingSetupType: null,
      bestCompetingDirection: null,
      bestCompetingOneMesPl: null,
      selectedVsBestCompetingDelta: null,
      collisionVerdict: 'selected_clean_no_competitor',
    },
    {
      selectedTicketId: 'od-replace-sweep',
      tradeDate: '2026-07-17',
      session: 'morning',
      proofTime: '2026-07-17T10:40:00',
      selectedDirection: 'LONG',
      selectedRiskPoints: 4.25,
      selectedOutcomeLabel: 't1_and_t2_hit',
      selectedOutcomeStatus: 'resolved',
      selectedOneMesPl: 42.5,
      competingRows: 2,
      competingSetupTypes: ['NoInstalledSetup'],
      competingLosses: 0,
      competingWinners: 1,
      bestCompetingTicketId: 'sweep-best',
      bestCompetingSetupType: 'NoInstalledSetup',
      bestCompetingDirection: 'LONG',
      bestCompetingOneMesPl: 212.5,
      selectedVsBestCompetingDelta: -170,
      collisionVerdict: 'selected_clean_but_competitor_better',
    },
    {
      selectedTicketId: 'od-opposite-ignore',
      tradeDate: '2026-07-17',
      session: 'morning',
      proofTime: '2026-07-17T11:00:00',
      selectedDirection: 'LONG',
      selectedRiskPoints: 4.25,
      selectedOutcomeLabel: 't1_and_t2_hit',
      selectedOutcomeStatus: 'resolved',
      selectedOneMesPl: 50,
      competingRows: 1,
      competingSetupTypes: ['NoInstalledSetup'],
      competingLosses: 0,
      competingWinners: 1,
      bestCompetingTicketId: 'short-sweep',
      bestCompetingSetupType: 'NoInstalledSetup',
      bestCompetingDirection: 'SHORT',
      bestCompetingOneMesPl: 300,
      selectedVsBestCompetingDelta: -250,
      collisionVerdict: 'selected_clean_but_competitor_better',
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveOosPrioritySimulationReport({
  comparisonPath: 'comparison.json',
  comparison,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_oos_priority_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.summary.originalRows, 3);
assert.equal(report.summary.replacedRows, 1);
assert.equal(report.summary.keptRows, 2);
assert.equal(report.summary.originalOneMesPl, 166.88);
assert.equal(report.summary.simulatedOneMesPl, 336.88);
assert.equal(report.summary.deltaOneMesPl, 170);
assert.equal(report.summary.simulatedLosses, 0);
assert.equal(report.summary.recommendation, 'validate_priority_rule_broader_oos');
assert.equal(report.rows.find((row) => row.originalTicketId === 'od-replace-sweep')?.action, 'replaced_with_same_direction_sweep_or_htf');
assert.equal(report.rows.find((row) => row.originalTicketId === 'od-opposite-ignore')?.action, 'kept_openingdrive');
assert.match(report.markdown, /OpeningDrive OOS Priority Simulation/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveOosPrioritySimulationReport({
  comparisonPath: 'comparison.json',
  comparison: { ...comparison, status: 'fail' },
}, '2026-07-19T00:02:00.000Z');

assert.equal(blocked.status, 'fail');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('comparison status fail')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveOosPrioritySimulationArgs([
  '--comparison',
  'comparison.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.comparison, 'comparison.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive OOS priority simulation verified.');
