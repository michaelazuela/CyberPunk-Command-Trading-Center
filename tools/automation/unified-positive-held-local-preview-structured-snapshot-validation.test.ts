import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport,
} from './unified-positive-held-local-preview-structured-snapshot-validation';
import type {
  UnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport,
} from './unified-positive-held-local-preview-structured-snapshot-classifier';
import type {
  UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport,
} from './unified-positive-held-local-preview-structured-snapshot-miner';

type SnapshotRow = UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport['rows'][number];

function snapshot(rowId: string, outcomeBucket: SnapshotRow['outcomeBucket'], protectedStopEvidence: boolean, pl: number): SnapshotRow {
  return {
    rowId,
    setupType: 'raidReclaim',
    session: rowId.includes('lunch') ? 'lunch' : 'morning',
    direction: 'LONG',
    outcomeBucket,
    resolvedOneMesPl: pl,
    proofTime: '2026-06-17T09:30:00',
    eventTime: '2026-06-17T09:30:00',
    sourceFile: 'tape.json',
    selectedSetupType: 'raidReclaim',
    selectedDirection: 'LONG',
    selectedRankScore: 100,
    selectedDecisionQualityScore: 80,
    selectedModelConfidenceScore: 90,
    modelCandidateFound: true,
    modelCandidateState: 'HUMAN_REVIEW_READY',
    modelCandidateExecutionStatus: protectedStopEvidence ? 'Blocked' : 'Conditional',
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
  snapshot('2026-06-17-morning-raidReclaim-LONG-a', 'winner', false, 100),
  snapshot('2026-06-17-morning-raidReclaim-LONG-b', 'loss', false, -25),
  snapshot('2026-06-18-lunch-raidReclaim-LONG-a', 'winner', false, 80),
  snapshot('2026-06-19-morning-raidReclaim-LONG-a', 'loss', true, -60),
  snapshot('2026-06-20-lunch-raidReclaim-LONG-a', 'loss', true, -50),
  snapshot('2026-06-21-morning-raidReclaim-LONG-a', 'winner', true, 30),
];

const classifierReport: UnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport = {
  reportType: 'unified_positive_held_local_preview_structured_snapshot_classifier',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority: {
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
  },
  source: { reportDir: 'diagnostic-reports', structuredSnapshotMinerPath: 'miner.json' },
  assumptions: {
    usesProofTimeStructuredSnapshotFieldsOnly: true,
    excludesFuturePathEvidenceAsFeatures: true,
    candidatesAreNotLiveFilters: true,
    unresolvedRowsAreNotWinsOrLosses: true,
    livePromotionAllowed: false,
  },
  summary: {
    sourceRows: rows.length,
    classifiersEvaluated: 1,
    acceptedClassifiers: 1,
    rejectedClassifiers: 0,
    topClassifierId: 'raidReclaim_protectedStopEvidence_false',
    livePromotionAllowedRows: 0,
  },
  classifiers: [{
    classifierId: 'raidReclaim_protectedStopEvidence_false',
    setupType: 'raidReclaim',
    featureName: 'protectedStopEvidence',
    featureValue: 'false',
    evaluatedRows: rows.length,
    keptRows: 3,
    rejectedRows: 3,
    keptWinners: 2,
    keptLosses: 1,
    keptUnresolved: 0,
    rejectedWinners: 1,
    rejectedLosses: 2,
    rejectedUnresolved: 0,
    keptOneMesPl: 155,
    rejectedOneMesPl: -80,
    falseRejectWinnerRows: 1,
    score: 100,
    decision: 'candidate_for_more_research',
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const minerReport: UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport = {
  reportType: 'unified_positive_held_local_preview_structured_snapshot_miner',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority: classifierReport.authority,
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

const report = buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport({
  reportDir: 'diagnostic-reports',
  structuredSnapshotClassifierPath: 'classifier.json',
  structuredSnapshotClassifierReport: classifierReport,
  structuredSnapshotMinerPath: 'miner.json',
  structuredSnapshotMinerReport: minerReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_structured_snapshot_validation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.acceptedClassifiersRead, 1);
assert.equal(report.summary.candidatesForBroaderReplayValidation, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.validations[0].decision, 'candidate_for_broader_replay_validation');
assert.equal(report.validations[0].keptOneMesPl, 155);
assert.equal(report.validations[0].rejectedOneMesPl, -80);
assert.ok(report.buckets.length >= 4);
assert.match(report.markdown, /Structured Snapshot Validation/);

const missing = buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport({
  reportDir: 'diagnostic-reports',
  structuredSnapshotClassifierPath: null,
  structuredSnapshotClassifierReport: null,
  structuredSnapshotMinerPath: null,
  structuredSnapshotMinerReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing structured snapshot classifier path'));

console.log('unified positive held-local structured snapshot validation verified.');
