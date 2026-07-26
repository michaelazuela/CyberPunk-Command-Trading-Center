import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewhistoricalReviewReplayPackageReport,
} from './unified-positive-held-local-preview-raidReclaim-replay-package';
import type {
  UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport,
} from './unified-positive-held-local-preview-structured-snapshot-miner';
import type {
  UnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport,
} from './unified-positive-held-local-preview-structured-snapshot-validation';

type SnapshotRow = UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport['rows'][number];

function row(id: string, outcomeBucket: SnapshotRow['outcomeBucket'], status: string, protectedStopEvidence: boolean, pl: number): SnapshotRow {
  return {
    rowId: id,
    setupType: 'historicalReview',
    session: id.includes('lunch') ? 'lunch' : 'morning',
    direction: 'LONG',
    outcomeBucket,
    resolvedOneMesPl: pl,
    proofTime: '2026-06-17T09:30:00',
    eventTime: '2026-06-17T09:30:00',
    sourceFile: 'tape.json',
    selectedSetupType: 'historicalReview',
    selectedDirection: 'LONG',
    selectedRankScore: 100,
    selectedDecisionQualityScore: 80,
    selectedModelConfidenceScore: 90,
    modelCandidateFound: true,
    modelCandidateState: 'HUMAN_REVIEW_READY',
    modelCandidateExecutionStatus: status,
    modelCandidateVisibilityMode: 'HUMAN_REVIEW',
    modelCandidateRankScore: 100,
    modelCandidateDecisionQualityScore: 80,
    modelCandidateModelConfidenceScore: 90,
    modelCandidateMissingEvidenceCount: protectedStopEvidence ? 2 : 0,
    modelCandidateHasFullPlanLevels: !protectedStopEvidence,
    modelCandidateFilteredOutReason: protectedStopEvidence ? 'InvalidStopLocation' : null,
    fvgRetestEvidence: false,
    noChaseEvidence: false,
    protectedStopEvidence,
    targetRoomEvidence: false,
    entryTriggerPendingEvidence: !protectedStopEvidence,
    staleEvidence: false,
    selectedMatchesReviewedModel: true,
    htfContextStatus: 'sufficient',
    htfClassification: 'CONFLICTING_MSS',
    htfDrawDirection: 'unknown',
    htfFiveMinuteDirection: 'neutral',
    htfFiveMinuteStatus: 'conflicting',
    htfFiveMinuteTriggerConfirmed: false,
    htfAlignedTimeframes: 0,
    htfConflictingTimeframes: 0,
    htfNeutralTimeframes: 5,
    scorecardStrongCount: protectedStopEvidence ? 0 : 3,
    scorecardPartialCount: protectedStopEvidence ? 1 : 2,
    scorecardWeakCount: protectedStopEvidence ? 3 : 1,
    historyCoverageSufficient: true,
    blockers: [],
  };
}

const rows = [
  row('2026-06-17-morning-historicalReview-LONG-a', 'winner', 'Conditional', false, 100),
  row('2026-06-18-lunch-historicalReview-LONG-a', 'winner', 'Conditional', false, 80),
  row('2026-06-19-morning-historicalReview-LONG-a', 'loss', 'Blocked', true, -60),
  row('2026-06-20-lunch-historicalReview-LONG-a', 'loss', 'Blocked', true, -50),
  row('2026-06-21-morning-historicalReview-LONG-a', 'unresolved', 'Conditional', true, 0),
  { ...row('2026-06-22-morning-NoInstalledSetup-LONG-a', 'winner', 'Conditional', false, 50), setupType: 'NoInstalledSetup' },
];

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

const minerReport: UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport = {
  reportType: 'unified_positive_held_local_preview_structured_snapshot_miner',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'diagnostic-reports', structuralFieldInventoryPath: 'inventory.json', auditDir: 'discord-audit' },
  assumptions: {
    usesProofTimeSnapshotObjectsOnly: true,
    excludesFuturePathEvidenceAsFeatures: true,
    miningIsResearchOnly: true,
    livePromotionAllowed: false,
  },
  summary: {
    sourceRows: rows.length,
    minedRows: rows.length,
    blockedRows: 0,
    featureSummaries: 1,
    livePromotionAllowedRows: 0,
  },
  features: [],
  rows,
  blockers: [],
  recommendations: [],
  markdown: '',
};

const validationReport: UnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport = {
  reportType: 'unified_positive_held_local_preview_structured_snapshot_validation',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'diagnostic-reports',
    structuredSnapshotClassifierPath: 'classifier.json',
    structuredSnapshotMinerPath: 'miner.json',
  },
  assumptions: {
    validatesAcceptedResearchClassifiersOnly: true,
    usesRetrospectiveOutcomeOnlyForReporting: true,
    livePromotionAllowed: false,
  },
  summary: {
    sourceRows: rows.length,
    acceptedClassifiersRead: 1,
    validatedClassifiers: 1,
    candidatesForBroaderReplayValidation: 1,
    bucketSummaries: 2,
    livePromotionAllowedRows: 0,
  },
  validations: [],
  buckets: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewhistoricalReviewReplayPackageReport({
  reportDir: 'diagnostic-reports',
  structuredSnapshotMinerPath: 'miner.json',
  structuredSnapshotMinerReport: minerReport,
  structuredSnapshotValidationPath: 'validation.json',
  structuredSnapshotValidationReport: validationReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_historicalReview_replay_package');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.noRankPenaltyInstalled, true);
assert.equal(report.assumptions.noModelRemoved, true);
assert.equal(report.summary.sourceRows, 6);
assert.equal(report.summary.historicalReviewRows, 5);
assert.equal(report.summary.conditionalProtectedStopCleanRows, 2);
assert.equal(report.summary.blockedProtectedStopRows, 3);
assert.equal(report.summary.replayQuestion, 'candidate_for_broader_replay');
assert.equal(report.summary.livePromotionAllowedRows, 0);

const clean = report.groups.find((group) => group.group === 'conditional_protected_stop_clean');
const blocked = report.groups.find((group) => group.group === 'blocked_protected_stop');
assert.equal(clean?.oneMesPl, 180);
assert.equal(blocked?.oneMesPl, -110);
assert.match(report.markdown, /historicalReview Replay Package/);

const missing = buildUnifiedPositiveHeldLocalPreviewhistoricalReviewReplayPackageReport({
  reportDir: 'diagnostic-reports',
  structuredSnapshotMinerPath: null,
  structuredSnapshotMinerReport: null,
  structuredSnapshotValidationPath: null,
  structuredSnapshotValidationReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing structured snapshot miner path'));

console.log('unified positive held-local historicalReview replay package verified.');
