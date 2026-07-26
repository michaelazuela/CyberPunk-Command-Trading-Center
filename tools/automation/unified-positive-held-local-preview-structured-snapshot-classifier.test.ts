import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport,
} from './unified-positive-held-local-preview-structured-snapshot-classifier';
import type {
  UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport,
} from './unified-positive-held-local-preview-structured-snapshot-miner';

type SnapshotRow = UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport['rows'][number];

function row(id: string, outcomeBucket: SnapshotRow['outcomeBucket'], protectedStopEvidence: boolean, resolvedOneMesPl: number): SnapshotRow {
  return {
    rowId: id,
    setupType: 'historicalReview',
    session: 'morning',
    direction: 'LONG',
    outcomeBucket,
    resolvedOneMesPl,
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
  ...Array.from({ length: 12 }, (_, index) => row(`win-${index}`, 'winner', false, 100)),
  ...Array.from({ length: 2 }, (_, index) => row(`kept-loss-${index}`, 'loss', false, -20)),
  ...Array.from({ length: 2 }, (_, index) => row(`unresolved-${index}`, 'unresolved', false, 0)),
  ...Array.from({ length: 7 }, (_, index) => row(`rejected-loss-${index}`, 'loss', true, -60)),
  ...Array.from({ length: 3 }, (_, index) => row(`rejected-win-${index}`, 'winner', true, 40)),
];

const minerReport: UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport = {
  reportType: 'unified_positive_held_local_preview_structured_snapshot_miner',
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
  source: {
    reportDir: 'diagnostic-reports',
    structuralFieldInventoryPath: 'inventory.json',
    auditDir: 'discord-audit',
  },
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

const report = buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport({
  reportDir: 'diagnostic-reports',
  structuredSnapshotMinerPath: 'miner.json',
  structuredSnapshotMinerReport: minerReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_structured_snapshot_classifier');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.excludesFuturePathEvidenceAsFeatures, true);
assert.equal(report.summary.sourceRows, rows.length);
assert.ok(report.summary.acceptedClassifiers >= 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.match(report.summary.topClassifierId || '', /historicalReview/);

const top = report.classifiers[0];
assert.equal(top.decision, 'candidate_for_more_research');
assert.equal(top.keptWinners, 12);
assert.equal(top.keptLosses, 2);
assert.equal(top.rejectedLosses, 7);
assert.match(report.markdown, /Structured Snapshot Classifier/);

const missing = buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport({
  reportDir: 'diagnostic-reports',
  structuredSnapshotMinerPath: null,
  structuredSnapshotMinerReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing structured snapshot miner path'));

console.log('unified positive held-local structured snapshot classifier verified.');
