import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport,
} from './unified-positive-held-local-preview-broad-proof-context-enrichment';
import type { UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport } from './unified-positive-held-local-preview-broad-risk-cap-validation';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'broad-proof-context-enrichment-'));
const auditDir = path.join(tempRoot, 'discord-audit');
fs.mkdirSync(auditDir, { recursive: true });

function writeTape(name: string, events: Record<string, unknown>): void {
  fs.writeFileSync(path.join(auditDir, name), JSON.stringify({ events }, null, 2));
}

writeTape('scanner-decision-tape-2026-06-17-MES-morning.json', {
  a: { completed5m: { time: '2026-06-17T09:30:00', open: 100, high: 101, low: 99, close: 100 } },
  b: { completed5m: { time: '2026-06-17T09:35:00', open: 100, high: 105, low: 98, close: 104 } },
  c: { completed5m: { time: '2026-06-17T09:40:00', open: 104, high: 110, low: 103, close: 109 } },
});
writeTape('scanner-decision-tape-2026-06-18-MES-lunch.json', {
  a: { completed5m: { time: '2026-06-18T12:00:00', open: 200, high: 201, low: 199, close: 200 } },
  b: { completed5m: { time: '2026-06-18T12:05:00', open: 200, high: 203, low: 196, close: 197 } },
  c: { completed5m: { time: '2026-06-18T12:10:00', open: 197, high: 199, low: 194, close: 195 } },
});

const broadRiskCapValidationReport: UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport = {
  reportType: 'unified_positive_held_local_preview_broad_risk_cap_validation',
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
    intakeTriagePath: 'triage.json',
    auditDir,
  },
  assumptions: {
    usesCompletedFiveMinuteBarsOnly: true,
    usesIntakeTriageRowsOnly: true,
    missingBarsAreNotInvented: true,
    capsAreResearchOnly: true,
    livePromotionAllowed: false,
  },
  summary: {
    evaluatedTargetRows: 2,
    replayedRows: 2,
    blockedRows: 0,
    winners: 1,
    losses: 1,
    unresolved: 0,
    grossResolvedOneMesPl: 50,
    candidateCapRows: 0,
    livePromotionAllowedRows: 0,
  },
  capRows: [],
  rows: [
    {
      rowId: 'win-row',
      tradeDate: '2026-06-17',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      triageDecision: 'held_for_later_batch',
      riskPoints: 4,
      outcomeBucket: 'winner',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 80,
      entryHitTime: '2026-06-17T09:35:00',
      blockers: [],
    },
    {
      rowId: 'loss-row',
      tradeDate: '2026-06-18',
      session: 'lunch',
      setupType: 'historicalReview',
      direction: 'SHORT',
      triageDecision: 'held_for_later_batch',
      riskPoints: 3,
      outcomeBucket: 'loss',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -30,
      entryHitTime: '2026-06-18T12:05:00',
      blockers: [],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const intakeTriageReport: UnifiedPositiveHeldLocalPreviewIntakeTriageReport = {
  reportType: 'unified_positive_held_local_preview_intake_triage',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority: broadRiskCapValidationReport.authority,
  source: {
    reportDir: tempRoot,
    intakeReportPath: 'intake.json',
    maxReplayPackageRows: 24,
    maxRowsPerModel: 4,
  },
  summary: {
    intakeRowsRead: 2,
    newIntakeCandidates: 2,
    alreadyProcessedReferenceRows: 0,
    selectedReplayPackageRows: 0,
    heldForLaterBatchRows: 2,
    modelGroups: 2,
    proofStateGroups: 1,
    livePromotionAllowedRows: 0,
  },
  groups: [],
  rows: [
    {
      intakeId: 'win-row',
      tradeDate: '2026-06-17',
      session: 'morning',
      instrument: 'MES',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      firstSeenTime: '2026-06-17T09:30:00',
      lastSeenTime: '2026-06-17T09:40:00',
      occurrences: 3,
      entry: 100,
      stop: 96,
      target1: 106,
      target2: 108,
      riskPoints: 4,
      candidateState: 'HUMAN_REVIEW_READY',
      executionStatus: 'Conditional',
      detectedStatus: 'Conditional',
      blockReason: null,
      sourceFile: 'scanner-decision-tape-2026-06-17-MES-morning.json',
      intakeDecision: 'candidate_for_review_intake',
      proofState: 'human_review_ready',
      modelPriority: 90,
      proofPriority: 100,
      occurrencePriority: 3,
      riskQuality: 'tight',
      triageScore: 205,
      triageDecision: 'held_for_later_batch',
      triageReason: 'held',
    },
    {
      intakeId: 'loss-row',
      tradeDate: '2026-06-18',
      session: 'lunch',
      instrument: 'MES',
      setupType: 'historicalReview',
      direction: 'SHORT',
      firstSeenTime: '2026-06-18T12:00:00',
      lastSeenTime: '2026-06-18T12:10:00',
      occurrences: 2,
      entry: 200,
      stop: 203,
      target1: 195.5,
      target2: 194,
      riskPoints: 3,
      candidateState: 'HUMAN_REVIEW_READY',
      executionStatus: 'Conditional',
      detectedStatus: 'Conditional',
      blockReason: null,
      sourceFile: 'scanner-decision-tape-2026-06-18-MES-lunch.json',
      intakeDecision: 'candidate_for_review_intake',
      proofState: 'human_review_ready',
      modelPriority: 76,
      proofPriority: 100,
      occurrencePriority: 2,
      riskQuality: 'tight',
      triageScore: 190,
      triageDecision: 'held_for_later_batch',
      triageReason: 'held',
    },
  ],
  selectedReplayPackage: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport({
  reportDir: tempRoot,
  broadRiskCapValidationPath: 'broad.json',
  broadRiskCapValidationReport,
  intakeTriagePath: 'triage.json',
  intakeTriageReport,
  auditDir,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_broad_proof_context_enrichment');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.sourceRows, 2);
assert.equal(report.summary.enrichedRows, 2);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const winner = report.rows.find((row) => row.rowId === 'win-row');
assert.equal(winner?.proofToEntryMinutes, 5);
assert.equal(winner?.mfePoints, 10);
assert.equal(winner?.maePoints, 2);
assert.equal(winner?.mfeR, 2.5);
assert.equal(winner?.maeR, 0.5);
assert.ok(winner?.issueTags.includes('winner'));
assert.ok(winner?.issueTags.includes('proof_human_review_ready'));

const loss = report.rows.find((row) => row.rowId === 'loss-row');
assert.equal(loss?.proofToEntryMinutes, 5);
assert.equal(loss?.mfePoints, 6);
assert.equal(loss?.maePoints, 3);
assert.equal(loss?.mfeR, 2);
assert.equal(loss?.maeR, 1);
assert.ok(loss?.issueTags.includes('stopped_before_t1'));

assert.equal(report.groups.length, 2);
assert.match(report.markdown, /Broad Proof\/Context Enrichment/);

const missing = buildUnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport({
  reportDir: tempRoot,
  broadRiskCapValidationPath: null,
  broadRiskCapValidationReport: null,
  intakeTriagePath: null,
  intakeTriageReport: null,
  auditDir,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing broad risk-cap validation path'));
assert.ok(missing.blockers.includes('missing intake triage path'));

console.log('unified positive held-local broad proof/context enrichment verified.');
