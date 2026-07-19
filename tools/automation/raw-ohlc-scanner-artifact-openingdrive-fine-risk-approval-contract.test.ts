import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport,
  parseRawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-fine-risk-approval-contract';

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

const laneValidation = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fine_risk_lane_validation',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { freshReplayPackagePath: 'fresh.json', setupType: 'OpeningDriveFvgContinuation' },
  assumptions: {
    readsFreshReplayPackageOnly: true,
    validatesFrozenSelectorOnly: true,
    candidateUsesNoLookaheadFieldsOnly: true,
    outcomeFieldsAreEvaluationOnly: true,
    promotionDisabled: true,
    noLiveRankInstalled: true,
    livePromotionAllowed: false,
  },
  selector: { name: 'fine_risk_24_to_32', minRows: 10 },
  summary: {
    key: 'fine_risk_24_to_32',
    rows: 22,
    winners: 20,
    losses: 0,
    otherResolved: 2,
    unresolved: 0,
    oneMesPl: 5728.8,
    avgRiskPoints: 26.62,
    validationDecision: 'validated_for_research_proposal_candidate',
    livePromotionAllowedRows: 0,
  },
  daySummaries: [],
  sessionSummaries: [],
  modelSummaries: [],
  unresolvedRows: [],
  selectedRows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const freshReplayPackage = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fresh_replay_package',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', setupType: 'OpeningDriveFvgContinuation', samebarReportPaths: [] },
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
    sourceReports: 14,
    sourceRows: 371,
    dedupedRows: 222,
    proofEvents: 222,
    selectedRows: 51,
    rejectedRows: 171,
    collisionEvents: 0,
    selectedSummary: { rows: 51, winners: 39, losses: 6, otherResolved: 3, unresolved: 3, oneMesPl: 6595.16, avgRiskPoints: 14.64 },
    rejectedSummary: { rows: 171, winners: 109, losses: 56, otherResolved: 2, unresolved: 4, oneMesPl: 10551.12, avgRiskPoints: 16.43 },
    sampleSizeReady: true,
    livePromotionAllowedRows: 0,
    recommendation: 'mine_openingdrive_separator',
  },
  selectorSummaries: [
    { selector: 'tight_long_risk_4_to_8', rows: 29, winners: 19, losses: 6, otherResolved: 1, unresolved: 3, oneMesPl: 866.36, avgRiskPoints: 5.56 },
    { selector: 'fine_risk_24_to_32', rows: 22, winners: 20, losses: 0, otherResolved: 2, unresolved: 0, oneMesPl: 5728.8, avgRiskPoints: 26.62 },
  ],
  selectedRows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport({
  laneValidationPath: 'lane.json',
  laneValidation,
  freshReplayPackagePath: 'fresh.json',
  freshReplayPackage,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_fine_risk_approval_contract');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.implementationAllowedNow, false);
assert.equal(report.approvalContract.scannerVisibleInstallAllowedNow, false);
assert.equal(report.proposedResearchBoundary.scannerVisibleNow, false);
assert.equal(report.proposedResearchBoundary.requiresFutureApprovalGate, true);
assert.equal(report.summary.laneRows, 22);
assert.equal(report.summary.laneLosses, 0);
assert.equal(report.summary.freshPackageRejectedLosses, 56);
assert.equal(report.summary.freshPackageTightLongLosses, 6);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.failedGateCount, 0);
assert.equal(report.summary.recommendation, 'await_explicit_approval_or_broaden_research');
assert.match(report.markdown, /OpeningDrive Fine-Risk Approval Contract/);

const failed = buildRawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport({
  laneValidationPath: 'lane.json',
  laneValidation: {
    ...laneValidation,
    summary: { ...laneValidation.summary, losses: 1 },
  },
  freshReplayPackagePath: 'fresh.json',
  freshReplayPackage,
}, '2026-07-19T00:02:00.000Z');

assert.equal(failed.status, 'fail');
assert.equal(failed.summary.recommendation, 'fix_inputs');
assert(failed.blockers.some((blocker) => blocker.includes('lane_zero_losses_positive_pl')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractArgs([
  '--lane-validation',
  'lane.json',
  '--fresh-replay-package',
  'fresh.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.laneValidation, 'lane.json');
assert.equal(parsed.freshReplayPackage, 'fresh.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive fine-risk approval contract verified.');
