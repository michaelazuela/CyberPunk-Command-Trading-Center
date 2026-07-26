import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport,
  parseRawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-fine-risk-slate-dry-run';

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

function selectedRow(args: {
  ticketId: string;
  selector: 'fine_risk_24_to_32' | 'tight_long_risk_4_to_8';
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1';
  oneMesPl: number;
}) {
  return {
    ticketId: args.ticketId,
    tradeDate: '2026-07-10',
    session: 'morning',
    proofTime: '2026-07-10T10:25:00',
    direction: args.selector === 'fine_risk_24_to_32' ? 'SHORT' : 'LONG',
    riskPoints: args.selector === 'fine_risk_24_to_32' ? 26 : 5,
    selector: args.selector,
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: 'resolved',
    oneMesPl: args.oneMesPl,
    sourceReportPath: 'reports/source.json',
  };
}

const freshReplayPackage = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fresh_replay_package',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', setupType: 'NoInstalledSetup', samebarReportPaths: [] },
  assumptions: {
    savedReportsOnly: true,
    openingDriveOnly: true,
    aggregatesSameBarSeparatorReports: true,
    dedupesByTicketId: true,
    oneSelectedRowPerProofEvent: true,
    candidateUsesNoLookaheadFieldsOnly: true,
    outcomeFieldsAreEvaluationOnly: true,
    promotionDisabled: true,
    noLiveRankInstalled: true,
    livePromotionAllowed: false,
  },
  selectorPolicy: {
    proofEventKey: 'tradeDate|session|proofTime',
    firstPriority: 'tight_long_risk_4_to_8',
    secondPriority: 'fine_risk_24_to_32',
    tieBreak: 'lowest_risk_points',
    minReadySelectedRows: 5,
  },
  summary: {
    sourceReports: 1,
    sourceRows: 4,
    dedupedRows: 4,
    proofEvents: 4,
    selectedRows: 4,
    rejectedRows: 0,
    collisionEvents: 0,
    selectedSummary: { rows: 4, winners: 3, losses: 1, otherResolved: 0, unresolved: 0, oneMesPl: 765, avgRiskPoints: 15.5 },
    rejectedSummary: { rows: 0, winners: 0, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: null, avgRiskPoints: null },
    sampleSizeReady: false,
    livePromotionAllowedRows: 0,
    recommendation: 'mine_openingdrive_separator',
  },
  selectorSummaries: [],
  selectedRows: [
    selectedRow({ ticketId: 'fine-win-1', selector: 'fine_risk_24_to_32', outcomeLabel: 't1_and_t2_hit', oneMesPl: 260 }),
    selectedRow({ ticketId: 'fine-win-2', selector: 'fine_risk_24_to_32', outcomeLabel: 't1_and_t2_hit', oneMesPl: 280 }),
    selectedRow({ ticketId: 'tight-win', selector: 'tight_long_risk_4_to_8', outcomeLabel: 't1_and_t2_hit', oneMesPl: 250 }),
    selectedRow({ ticketId: 'tight-loss', selector: 'tight_long_risk_4_to_8', outcomeLabel: 'stopped_before_t1', oneMesPl: -25 }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const approvalContract = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fine_risk_approval_contract',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { laneValidationPath: 'lane.json', freshReplayPackagePath: 'fresh.json' },
  assumptions: {
    savedReportsOnly: true,
    contractOnly: true,
    implementationAllowedNow: false,
    scannerVisibleInstallAllowedNow: false,
    promotionDisabled: true,
  },
  proposedResearchBoundary: {
    setupType: 'NoInstalledSetup',
    selector: 'fine_risk_24_to_32',
    scannerVisibleNow: false,
    requiresFutureApprovalGate: true,
    proposedLaterBehavior: 'research only',
  },
  approvalContract: {
    name: 'openingdrive_fine_risk_approval_contract',
    approvalRequiredBeforeImplementation: true,
    implementationAllowedNow: false,
    scannerVisibleInstallAllowedNow: false,
    gates: [],
    requiredRegressionCommands: [],
    implementationInvariants: [],
    rollbackContract: [],
  },
  summary: {
    laneRows: 2,
    laneWinners: 2,
    laneLosses: 0,
    laneOtherResolved: 0,
    laneUnresolved: 0,
    laneOneMesPl: 540,
    freshPackageRejectedLosses: 0,
    freshPackageTightLongLosses: 1,
    livePromotionAllowedRows: 0,
    failedGateCount: 0,
    recommendation: 'await_explicit_approval_or_broaden_research',
  },
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport({
  freshReplayPackagePath: 'fresh.json',
  freshReplayPackage,
  approvalContractPath: 'approval.json',
  approvalContract,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_fine_risk_slate_dry_run');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.implementationAllowedNow, false);
assert.equal(report.assumptions.scannerVisibleInstallAllowedNow, false);
assert.equal(report.summary.baselineRows, 4);
assert.equal(report.summary.proposedRows, 2);
assert.equal(report.summary.removedRows, 2);
assert.equal(report.summary.changedSlates, 2);
assert.equal(report.summary.proposedSummary.winners, 2);
assert.equal(report.summary.proposedSummary.losses, 0);
assert.equal(report.summary.removedSummary.winners, 1);
assert.equal(report.summary.removedSummary.losses, 1);
assert.equal(report.summary.proposedDeltaOneMesPl, -225);
assert.equal(report.summary.removedLosses, 1);
assert.equal(report.summary.removedWinners, 1);
assert.equal(report.summary.removedTightLongRows, 2);
assert.equal(report.summary.removedFineRiskRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'approval_candidate_but_keep_research_only');
assert.deepEqual(report.changedRows.map((row) => row.ticketId), ['tight-win', 'tight-loss']);
assert.match(report.markdown, /OpeningDrive Fine-Risk Slate Dry Run/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport({
  freshReplayPackagePath: 'fresh.json',
  freshReplayPackage,
  approvalContractPath: 'approval.json',
  approvalContract: { ...approvalContract, status: 'fail' },
}, '2026-07-19T00:02:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'fix_inputs');
assert(blocked.blockers.some((blocker) => blocker.includes('approval contract status fail')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunArgs([
  '--fresh-replay-package',
  'fresh.json',
  '--approval-contract',
  'approval.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.freshReplayPackage, 'fresh.json');
assert.equal(parsed.approvalContract, 'approval.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive fine-risk slate dry run verified.');
