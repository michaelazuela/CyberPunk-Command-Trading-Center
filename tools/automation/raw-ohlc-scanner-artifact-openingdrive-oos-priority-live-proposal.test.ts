import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveOosPriorityLiveProposalReport,
  parseRawOhlcScannerArtifactOpeningDriveOosPriorityLiveProposalArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-priority-live-proposal';

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
    comparableEvents: 13,
    priorityBetterRows: 9,
    openingDriveBetterOrEqualRows: 4,
    openingDriveLosses: 2,
    priorityLosses: 0,
    openingDriveOneMesPl: 934.39,
    priorityOneMesPl: 2300,
    deltaOneMesPl: 1365.61,
    livePromotionAllowedRows: 0,
    recommendation: 'prepare_research_only_live_proposal',
  },
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveOosPriorityLiveProposalReport({
  validationPath: 'validation.json',
  validation,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_oos_priority_live_proposal');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.proposedBehavior.scannerVisibleInstallAllowedNow, false);
assert.equal(report.proposedBehavior.requiredFutureApproval, true);
assert.equal(report.proposedBehavior.behaviorName, 'same_event_same_direction_sweep_htf_priority_over_openingdrive');
assert(report.proposedBehavior.requiredConditions.includes('same completed 5M proof time'));
assert(report.proposedBehavior.disallowedInputs.includes('outcome labels, P/L, MFE, or MAE'));
assert(report.proposedBehavior.unchangedBoundaries.some((boundary) => boundary.includes('5M remains execution authority')));
assert.equal(report.readiness.failedGateCount, 0);
assert.equal(report.readiness.decision, 'ready_for_explicit_implementation_approval');
assert.match(report.markdown, /OpeningDrive OOS Sweep\/HTF Priority Live Proposal/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveOosPriorityLiveProposalReport({
  validationPath: 'validation.json',
  validation: {
    ...validation,
    summary: {
      ...validation.summary,
      priorityLosses: 1,
      deltaOneMesPl: -10,
    },
  },
}, '2026-07-19T00:02:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.readiness.decision, 'not_ready');
assert(blocked.blockers.some((blocker) => blocker.includes('priority_zero_losses')));
assert(blocked.blockers.some((blocker) => blocker.includes('positive_delta')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveOosPriorityLiveProposalArgs([
  '--validation',
  'validation.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.validation, 'validation.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive OOS priority live proposal verified.');
