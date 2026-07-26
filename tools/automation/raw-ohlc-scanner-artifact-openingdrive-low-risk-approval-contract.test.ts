import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport,
  parseRawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-low-risk-approval-contract';

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

const lowRiskValidation = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fine_risk_validation',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    samebarSeparatorReportPath: 'samebar.json',
    setupType: 'NoInstalledSetup',
  },
  assumptions: {
    readOnlyPostProcessor: true,
    usesExistingSameBarSeparatorRowsOnly: true,
    validatesFrozenFineRiskCandidateOnly: true,
    candidateUsesNoLookaheadFieldsOnly: true,
    outcomeFieldsAreEvaluationOnly: true,
    livePromotionAllowed: false,
  },
  candidate: {
    feature: 'fineRiskBucket',
    featureValue: 'risk_lt_4',
  },
  splitPolicy: {
    validationStart: '2026-07-17',
    validationPercent: 0.3,
    minValidationRows: 1,
    trainDates: ['2026-07-06', '2026-07-16'],
    validationDates: ['2026-07-17', '2026-07-20'],
  },
  summary: {
    sourceRows: 76,
    matchingRows: 16,
    validationDecision: 'validated_for_more_research',
    livePromotionAllowedRows: 0,
  },
  splitSummaries: [
    {
      split: 'all',
      rows: 76,
      matchingRows: 16,
      matchingWinners: 16,
      matchingLosses: 0,
      matchingOtherResolved: 0,
      matchingUnresolved: 0,
      matchingWinRate: 1,
      matchingOneMesPl: 387.52,
      avgMatchingRiskPoints: 2.41,
    },
    {
      split: 'train',
      rows: 59,
      matchingRows: 12,
      matchingWinners: 12,
      matchingLosses: 0,
      matchingOtherResolved: 0,
      matchingUnresolved: 0,
      matchingWinRate: 1,
      matchingOneMesPl: 275.64,
      avgMatchingRiskPoints: 2.28,
    },
    {
      split: 'validation',
      rows: 17,
      matchingRows: 4,
      matchingWinners: 4,
      matchingLosses: 0,
      matchingOtherResolved: 0,
      matchingUnresolved: 0,
      matchingWinRate: 1,
      matchingOneMesPl: 111.88,
      avgMatchingRiskPoints: 2.78,
    },
  ],
  dateSummaries: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const freshReplayPackage = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fresh_replay_package',
  generatedAt: '2026-07-20T00:00:00.000Z',
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
    firstPriority: 'low_risk_lt_4',
    secondPriority: 'tight_long_risk_4_to_8',
    thirdPriority: 'fine_risk_24_to_32',
    tieBreak: 'lowest_risk_points',
    minReadySelectedRows: 5,
  },
  summary: {
    sourceReports: 1,
    sourceRows: 3,
    dedupedRows: 3,
    proofEvents: 3,
    selectedRows: 3,
    rejectedRows: 0,
    collisionEvents: 0,
    selectedSummary: { rows: 3, winners: 2, losses: 0, otherResolved: 0, unresolved: 1, oneMesPl: 101.26, avgRiskPoints: 5.46 },
    rejectedSummary: { rows: 0, winners: 0, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: null, avgRiskPoints: null },
    sampleSizeReady: false,
    livePromotionAllowedRows: 0,
    recommendation: 'mine_openingdrive_separator',
  },
  selectorSummaries: [
    { selector: 'low_risk_lt_4', rows: 1, winners: 1, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: 36.88, avgRiskPoints: 3.63 },
    { selector: 'tight_long_risk_4_to_8', rows: 2, winners: 1, losses: 0, otherResolved: 0, unresolved: 1, oneMesPl: 64.38, avgRiskPoints: 6.38 },
    { selector: 'fine_risk_24_to_32', rows: 0, winners: 0, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: null, avgRiskPoints: null },
  ],
  selectedRows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport({
  lowRiskValidationPath: 'low-risk-validation.json',
  lowRiskValidation,
  freshReplayPackagePath: 'fresh.json',
  freshReplayPackage,
}, '2026-07-20T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_low_risk_approval_contract');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.implementationAllowedNow, false);
assert.equal(report.approvalContract.scannerVisibleInstallAllowedNow, false);
assert.equal(report.proposedResearchBoundary.selector, 'low_risk_lt_4');
assert.equal(report.proposedResearchBoundary.scannerVisibleNow, false);
assert.equal(report.summary.lowRiskRows, 16);
assert.equal(report.summary.lowRiskWinners, 16);
assert.equal(report.summary.lowRiskLosses, 0);
assert.equal(report.summary.lowRiskOneMesPl, 387.52);
assert.equal(report.summary.validationLowRiskRows, 4);
assert.equal(report.summary.validationLowRiskLosses, 0);
assert.equal(report.summary.freshPackageLowRiskRows, 1);
assert.equal(report.summary.freshPackageLowRiskLosses, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.failedGateCount, 0);
assert.equal(report.summary.recommendation, 'await_explicit_approval_or_broaden_research');
assert.match(report.markdown, /OpeningDrive Low-Risk Approval Contract/);

const failed = buildRawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport({
  lowRiskValidationPath: 'low-risk-validation.json',
  lowRiskValidation: {
    ...lowRiskValidation,
    splitSummaries: lowRiskValidation.splitSummaries.map((row: any) => row.split === 'all' ? { ...row, matchingLosses: 1 } : row),
  },
  freshReplayPackagePath: 'fresh.json',
  freshReplayPackage,
}, '2026-07-20T00:02:00.000Z');

assert.equal(failed.status, 'fail');
assert.equal(failed.summary.recommendation, 'fix_inputs');
assert(failed.blockers.some((blocker) => blocker.includes('low_risk_zero_losses_positive_pl')));

const wrongBucket = buildRawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport({
  lowRiskValidationPath: 'low-risk-validation.json',
  lowRiskValidation: {
    ...lowRiskValidation,
    candidate: { ...lowRiskValidation.candidate, featureValue: 'risk_4_to_8' },
  },
  freshReplayPackagePath: 'fresh.json',
  freshReplayPackage,
}, '2026-07-20T00:03:00.000Z');

assert.equal(wrongBucket.status, 'fail');
assert(wrongBucket.blockers.some((blocker) => blocker.includes('low_risk_candidate_bucket')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractArgs([
  '--low-risk-validation',
  'low-risk-validation.json',
  '--fresh-replay-package',
  'fresh.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.lowRiskValidation, 'low-risk-validation.json');
assert.equal(parsed.freshReplayPackage, 'fresh.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive low-risk approval contract verified.');
