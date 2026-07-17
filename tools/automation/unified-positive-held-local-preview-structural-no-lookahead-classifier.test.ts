import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierReport,
} from './unified-positive-held-local-preview-structural-no-lookahead-classifier';
import type {
  UnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport,
} from './unified-positive-held-local-preview-structural-field-inventory';

const inventoryReport: UnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport = {
  reportType: 'unified_positive_held_local_preview_structural_field_inventory',
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
    proofContextEnrichmentPath: 'enrichment.json',
    intakeTriagePath: 'triage.json',
    auditDir: 'discord-audit',
  },
  assumptions: {
    inventoryIsResearchOnly: true,
    usesLocalDecisionTapesOnly: true,
    usesProofTimeSnapshotOnly: true,
    doesNotUseFuturePathAsFeature: true,
    livePromotionAllowed: false,
  },
  summary: {
    sourceRows: 5,
    inventoriedRows: 5,
    blockedRows: 0,
    fieldSummaries: 0,
    livePromotionAllowedRows: 0,
  },
  fields: [],
  rows: [
    ...['win-1', 'win-2', 'win-3'].map((rowId) => ({
      rowId,
      setupType: 'IntradayMssMicroContinuation',
      session: 'morning',
      direction: 'LONG',
      outcomeBucket: 'winner' as const,
      resolvedOneMesPl: 100,
      proofTime: '2026-06-17T09:30:00',
      sourceFile: 'tape.json',
      eventTime: '2026-06-17T09:30:00',
      candidateState: 'HUMAN_REVIEW_READY',
      executionStatus: 'Conditional',
      detectedStatus: 'Conditional',
      visibilityMode: 'HUMAN_REVIEW',
      htfSufficient: true,
      htfDataLimited: false,
      htfReliability: 'structural',
      htfConflict: false,
      htfSupported: true,
      countertrend: false,
      confidenceBucket: 'confidence_65_to_79',
      hasLineInSand: true,
      hasTargetReaction: true,
      mentionsFvg: true,
      mentionsRetest: true,
      mentionsMss: true,
      mentionsNoChase: true,
      hasProtectedStopBlocker: false,
      hasTargetRoomBlocker: false,
      hasEntryTriggerPending: true,
      hasStaleInvalidation: false,
      blockers: [],
    })),
    ...['loss-1', 'loss-2'].map((rowId) => ({
      rowId,
      setupType: 'IntradayMssMicroContinuation',
      session: 'lunch',
      direction: 'LONG',
      outcomeBucket: 'loss' as const,
      resolvedOneMesPl: -30,
      proofTime: '2026-06-17T12:30:00',
      sourceFile: 'tape.json',
      eventTime: '2026-06-17T12:30:00',
      candidateState: 'HUMAN_REVIEW_READY',
      executionStatus: 'Conditional',
      detectedStatus: 'Conditional',
      visibilityMode: 'HUMAN_REVIEW',
      htfSufficient: true,
      htfDataLimited: false,
      htfReliability: 'structural',
      htfConflict: false,
      htfSupported: true,
      countertrend: false,
      confidenceBucket: 'confidence_lt_50',
      hasLineInSand: false,
      hasTargetReaction: false,
      mentionsFvg: false,
      mentionsRetest: false,
      mentionsMss: false,
      mentionsNoChase: false,
      hasProtectedStopBlocker: true,
      hasTargetRoomBlocker: true,
      hasEntryTriggerPending: false,
      hasStaleInvalidation: false,
      blockers: [],
    })),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierReport({
  reportDir: 'diagnostic-reports',
  structuralFieldInventoryPath: 'inventory.json',
  structuralFieldInventoryReport: inventoryReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_structural_no_lookahead_classifier');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.excludesFuturePathEvidence, true);
assert.equal(report.summary.sourceRows, 5);
assert.ok(report.summary.acceptedClassifiers >= 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const top = report.classifiers[0];
assert.equal(top.decision, 'candidate_for_more_research');
assert.equal(top.falseRejectWinnerRows, 0);
assert.equal(top.keptWinners, 3);
assert.equal(top.keptLosses, 0);
assert.match(report.markdown, /Structural No-Lookahead Classifier/);

const missing = buildUnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierReport({
  reportDir: 'diagnostic-reports',
  structuralFieldInventoryPath: null,
  structuralFieldInventoryReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing structural field inventory path'));

console.log('unified positive held-local structural no-lookahead classifier verified.');
