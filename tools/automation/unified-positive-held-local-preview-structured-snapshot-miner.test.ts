import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport,
} from './unified-positive-held-local-preview-structured-snapshot-miner';
import type {
  UnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport,
} from './unified-positive-held-local-preview-structural-field-inventory';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structured-snapshot-miner-'));
const auditDir = path.join(tmp, 'discord-audit');
fs.mkdirSync(auditDir, { recursive: true });

fs.writeFileSync(path.join(auditDir, 'tape.json'), JSON.stringify({
  events: {
    '2026-06-17T09:30:00': {
      time: '2026-06-17T09:30:00',
      historyCoverage: [
        { timeframe: '5m', sufficient: true },
        { timeframe: '15m', sufficient: true },
      ],
      facts: {
        mss: {
          htfState: {
            classification: 'BULLISH_MSS',
            drawDirection: 'LONG',
            fiveMinuteMssTriggerConfirmed: true,
            htfContextSufficiency: { overallStatus: 'sufficient' },
            fiveMinuteState: { direction: 'LONG', status: 'confirmed' },
            timeframeStates: [
              { timeframe: '4H', direction: 'LONG', status: 'confirmed' },
              { timeframe: '1H', direction: 'SHORT', status: 'conflicting' },
              { timeframe: '15M', direction: 'neutral', status: 'conflicting' },
            ],
          },
        },
      },
      setupCandidateStatus: {
        selected: {
          setupType: 'historicalReview',
          direction: 'SHORT',
          rankScore: 175,
          decisionQualityScore: 44,
          modelConfidenceScore: 60,
        },
        statuses: [
          {
            setupType: 'NoInstalledSetup',
            direction: 'LONG',
            candidateState: 'HUMAN_REVIEW_READY',
            executionStatus: 'Conditional',
            visibilityMode: 'HUMAN_REVIEW',
            rankScore: 210,
            decisionQualityScore: 75,
            modelConfidenceScore: 88,
            hasFullPlanLevels: true,
            filteredOutReason: null,
            missingEvidence: ['Completed 5M FVG retest proof', 'Protected 5M structure stop'],
            requiredTrigger: 'Fresh completed 5M FVG retest and MSS hold.',
          },
        ],
      },
      confidence: {
        scorecard: [
          { label: '5M execution quality', status: 'strong' },
          { label: 'Risk and target room', status: 'partial' },
          { label: 'HTF conflict', status: 'weak' },
        ],
      },
    },
  },
}), 'utf8');

const inventory: UnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport = {
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
    reportDir: tmp,
    proofContextEnrichmentPath: 'proof.json',
    intakeTriagePath: 'triage.json',
    auditDir,
  },
  assumptions: {
    inventoryIsResearchOnly: true,
    usesLocalDecisionTapesOnly: true,
    usesProofTimeSnapshotOnly: true,
    doesNotUseFuturePathAsFeature: true,
    livePromotionAllowed: false,
  },
  summary: {
    sourceRows: 1,
    inventoriedRows: 1,
    blockedRows: 0,
    fieldSummaries: 0,
    livePromotionAllowedRows: 0,
  },
  fields: [],
  rows: [{
    rowId: 'row-1',
    setupType: 'NoInstalledSetup',
    session: 'morning',
    direction: 'LONG',
    outcomeBucket: 'winner',
    resolvedOneMesPl: 125,
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
    htfContextAligned: true,
    countertrend: false,
    confidenceBucket: 'confidence_gte_80',
    hasLineInSand: true,
    hasTargetReaction: false,
    mentionsFvg: true,
    mentionsRetest: true,
    mentionsMss: true,
    mentionsNoChase: false,
    hasProtectedStopBlocker: false,
    hasTargetRoomBlocker: false,
    hasEntryTriggerPending: false,
    hasStaleInvalidation: false,
    blockers: [],
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport({
  reportDir: tmp,
  structuralFieldInventoryPath: 'inventory.json',
  structuralFieldInventoryReport: inventory,
  auditDir,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_structured_snapshot_miner');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.excludesFuturePathEvidenceAsFeatures, true);
assert.equal(report.summary.sourceRows, 1);
assert.equal(report.summary.minedRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.ok(report.summary.featureSummaries > 0);

const row = report.rows[0];
assert.equal(row.selectedMatchesReviewedModel, false);
assert.equal(row.modelCandidateFound, true);
assert.equal(row.modelCandidateState, 'HUMAN_REVIEW_READY');
assert.equal(row.modelCandidateRankScore, 210);
assert.equal(row.fvgRetestEvidence, true);
assert.equal(row.protectedStopEvidence, true);
assert.equal(row.htfContextStatus, 'sufficient');
assert.equal(row.htfClassification, 'BULLISH_MSS');
assert.equal(row.htfFiveMinuteTriggerConfirmed, true);
assert.equal(row.htfAlignedTimeframes, 1);
assert.equal(row.htfConflictingTimeframes, 1);
assert.equal(row.htfNeutralTimeframes, 1);
assert.equal(row.scorecardStrongCount, 1);
assert.equal(row.scorecardPartialCount, 1);
assert.equal(row.scorecardWeakCount, 1);
assert.equal(row.historyCoverageSufficient, true);
assert.match(report.markdown, /Structured Snapshot Miner/);

const missing = buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport({
  reportDir: tmp,
  structuralFieldInventoryPath: null,
  structuralFieldInventoryReport: null,
  auditDir,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing structural field inventory path'));

console.log('unified positive held-local structured snapshot miner verified.');
