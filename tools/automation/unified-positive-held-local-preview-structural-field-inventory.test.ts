import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport,
} from './unified-positive-held-local-preview-structural-field-inventory';
import type {
  UnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport,
} from './unified-positive-held-local-preview-broad-proof-context-enrichment';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'structural-field-inventory-'));
const auditDir = path.join(tempRoot, 'discord-audit');
fs.mkdirSync(auditDir, { recursive: true });

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-06-17-MES-morning.json'), JSON.stringify({
  events: {
    '2026-06-17T09:30:00': {
      time: '2026-06-17T09:30:00',
      facts: {
        mss: {
          htfState: {
            htfContextDataLimited: false,
            classificationReliability: 'structural',
            htfContextSufficiency: { dataLimited: false },
          },
        },
      },
      setupCandidateStatus: {
        selected: {
          candidateState: 'HUMAN_REVIEW_READY',
          executionStatus: 'Conditional',
          detectedStatus: 'Conditional',
          visibilityMode: 'HUMAN_REVIEW',
          htfConflict: false,
          htfContextAligned: true,
          countertrend: false,
          lineInSand: 100,
          targetReactionLevel: 110,
          requiredTrigger: 'Wait for 5M MSS and FVG retest. Do not chase.',
          missingEvidence: ['Protected 5M structure stop', 'Minimum 2.0R unavailable'],
        },
      },
      confidence: { score: 72 },
      missingProofSummary: ['EntryTriggerPending'],
    },
  },
}, null, 2));

const enrichmentReport: UnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport = {
  reportType: 'unified_positive_held_local_preview_broad_proof_context_enrichment',
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
    reportDir: tempRoot,
    broadRiskCapValidationPath: 'broad.json',
    intakeTriagePath: 'triage.json',
    auditDir,
  },
  assumptions: {
    usesCompletedFiveMinuteTapesOnly: true,
    enrichmentIsResearchOnly: true,
    missingBarsAreNotInvented: true,
    unresolvedRowsAreNotWinsOrLosses: true,
    staleEntryThresholdMinutes: 30,
    livePromotionAllowed: false,
  },
  summary: {
    sourceRows: 1,
    enrichedRows: 1,
    blockedRows: 0,
    winners: 1,
    losses: 0,
    unresolved: 0,
    grossResolvedOneMesPl: 100,
    groupSummaries: 1,
    livePromotionAllowedRows: 0,
  },
  groups: [],
  rows: [{
    rowId: 'row-1',
    tradeDate: '2026-06-17',
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: 'LONG',
    proofState: 'human_review_ready',
    riskQuality: 'tight',
    occurrences: 10,
    triageDecision: 'held_for_later_batch',
    outcomeBucket: 'winner',
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 100,
    riskPoints: 5,
    proofTime: '2026-06-17T09:30:00',
    entryHitTime: '2026-06-17T09:35:00',
    proofToEntryMinutes: 5,
    sourceFile: 'scanner-decision-tape-2026-06-17-MES-morning.json',
    completedBarsAfterProof: 3,
    mfePoints: 10,
    maePoints: 2,
    mfeR: 2,
    maeR: 0.4,
    issueTags: ['winner'],
    blockers: [],
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const intakeReport: UnifiedPositiveHeldLocalPreviewIntakeTriageReport = {
  reportType: 'unified_positive_held_local_preview_intake_triage',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority: enrichmentReport.authority,
  source: {
    reportDir: tempRoot,
    intakeReportPath: 'intake.json',
    maxReplayPackageRows: 24,
    maxRowsPerModel: 4,
  },
  summary: {
    intakeRowsRead: 1,
    newIntakeCandidates: 1,
    alreadyProcessedReferenceRows: 0,
    selectedReplayPackageRows: 0,
    heldForLaterBatchRows: 1,
    modelGroups: 1,
    proofStateGroups: 1,
    livePromotionAllowedRows: 0,
  },
  groups: [],
  rows: [{
    intakeId: 'row-1',
    tradeDate: '2026-06-17',
    session: 'morning',
    instrument: 'MES',
    setupType: 'NoInstalledSetup',
    direction: 'LONG',
    firstSeenTime: '2026-06-17T09:30:00',
    lastSeenTime: '2026-06-17T09:35:00',
    occurrences: 10,
    entry: 100,
    stop: 95,
    target1: 107.5,
    target2: 110,
    riskPoints: 5,
    candidateState: 'HUMAN_REVIEW_READY',
    executionStatus: 'Conditional',
    detectedStatus: 'Conditional',
    blockReason: null,
    sourceFile: 'scanner-decision-tape-2026-06-17-MES-morning.json',
    intakeDecision: 'candidate_for_review_intake',
    proofState: 'human_review_ready',
    modelPriority: 90,
    proofPriority: 100,
    occurrencePriority: 10,
    riskQuality: 'tight',
    triageScore: 212,
    triageDecision: 'held_for_later_batch',
    triageReason: 'held',
  }],
  selectedReplayPackage: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport({
  reportDir: tempRoot,
  proofContextEnrichmentPath: 'enrichment.json',
  proofContextEnrichmentReport: enrichmentReport,
  intakeTriagePath: 'triage.json',
  intakeTriageReport: intakeReport,
  auditDir,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_structural_field_inventory');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.sourceRows, 1);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const row = report.rows[0];
assert.equal(row.candidateState, 'HUMAN_REVIEW_READY');
assert.equal(row.htfSufficient, true);
assert.equal(row.htfDataLimited, false);
assert.equal(row.htfReliability, 'structural');
assert.equal(row.confidenceBucket, 'confidence_65_to_79');
assert.equal(row.hasLineInSand, true);
assert.equal(row.hasTargetReaction, true);
assert.equal(row.mentionsFvg, true);
assert.equal(row.mentionsRetest, true);
assert.equal(row.mentionsMss, true);
assert.equal(row.mentionsNoChase, true);
assert.equal(row.hasProtectedStopBlocker, true);
assert.equal(row.hasTargetRoomBlocker, true);
assert.equal(row.hasEntryTriggerPending, true);

assert.ok(report.fields.some((field) => field.fieldId === 'NoInstalledSetup|mentionsFvg=true'));
assert.match(report.markdown, /Structural Field Inventory/);

const missing = buildUnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport({
  reportDir: tempRoot,
  proofContextEnrichmentPath: null,
  proofContextEnrichmentReport: null,
  intakeTriagePath: null,
  intakeTriageReport: null,
  auditDir,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing proof/context enrichment path'));
assert.ok(missing.blockers.includes('missing intake triage path'));

console.log('unified positive held-local structural field inventory verified.');
