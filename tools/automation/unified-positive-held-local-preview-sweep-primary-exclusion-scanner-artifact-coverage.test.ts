import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageReport,
  parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageArgs,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-scanner-artifact-coverage';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-dry-run';

const dryRunReport: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport = {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_dry_run',
  generatedAt: '2026-07-20T00:00:00.000Z',
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
    reportDir: 'reports',
    approvalContractPath: 'approval.json',
    installedPenaltyAuditPath: 'audit.json',
  },
  assumptions: {
    savedReportsOnly: true,
    dryRunOnly: true,
    excludesOnlyPrimarySelectionNotAuditVisibility: true,
    noLiveFilterInstalled: true,
    livePromotionAllowed: false,
  },
  summary: {
    auditRowsRead: 2,
    slates: 1,
    invalidStopSweepRows: 1,
    invalidStopSweepCanExecuteTrueRows: 0,
    baselineInvalidStopSweepPrimarySlates: 1,
    simulatedInvalidStopSweepPrimarySlates: 0,
    changedSlates: 1,
    blockedAuditRowsPreserved: 1,
    entryStopTargetRiskDriftRows: 0,
    livePromotionAllowedRows: 0,
    recommendation: 'dry_run_supports_primary_exclusion_proposal',
  },
  slates: [{
    slateId: '2026-07-20|morning',
    tradeDate: '2026-07-20',
    session: 'morning',
    rows: 2,
    baselinePrimaryRowId: '2026-07-20-morning-SweepMssFvgRetrace-SHORT',
    baselinePrimaryInvalidStopSweep: true,
    simulatedPrimaryRowId: null,
    simulatedPrimaryInvalidStopSweep: false,
    topChanged: true,
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-sweep-scanner-coverage-'));
fs.writeFileSync(path.join(tmpDir, 'raw-ohlc-scanner-artifact-sample.json'), `${JSON.stringify({
  reportType: 'raw_ohlc_scanner_artifact_sample',
  rows: [{
    ticketId: '2026-07-20-morning-SweepMssFvgRetrace-SHORT-20260720T093500',
    tradeDate: '2026-07-20',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'SHORT',
    entry: 7539,
    stop: 7505.5,
    riskPoints: 33.5,
    outcomeStatus: 'blocked',
    outcomeLabel: 'blocked',
    blockers: ['InvalidStopLocation'],
    executionStatus: 'Blocked',
  }],
})}\n`);

const passReport = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageReport({
  dryRunPath: 'dry-run.json',
  dryRunReport,
  scannerReportDir: tmpDir,
}, '2026-07-20T00:01:00.000Z');

assert.equal(passReport.status, 'pass');
assert.equal(passReport.summary.changedSlatesFromDryRun, 1);
assert.equal(passReport.summary.scannerRowsMatched, 1);
assert.equal(passReport.summary.changedSlatesCovered, 1);
assert.equal(passReport.summary.changedSlatesWithGeometry, 1);
assert.equal(passReport.summary.changedSlatesWithDirectionallyInvalidStop, 1);
assert.equal(passReport.summary.changedSlatesWithInvalidStopBlockReason, 1);
assert.equal(passReport.summary.changedSlatesWithExecutionStatus, 1);
assert.equal(passReport.summary.exactRuntimeProposalReady, false);
assert.equal(passReport.summary.livePromotionAllowedRows, 0);

const missingProofDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-sweep-scanner-coverage-missing-'));
fs.writeFileSync(path.join(missingProofDir, 'raw-ohlc-scanner-artifact-sample.json'), `${JSON.stringify({
  rows: [{
    ticketId: '2026-07-20-morning-SweepMssFvgRetrace-SHORT-20260720T093500',
    tradeDate: '2026-07-20',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'SHORT',
    entry: 7539,
    stop: 7505.5,
  }],
})}\n`);

const failReport = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageReport({
  dryRunPath: 'dry-run.json',
  dryRunReport,
  scannerReportDir: missingProofDir,
}, '2026-07-20T00:02:00.000Z');

assert.equal(failReport.status, 'fail');
assert(failReport.blockers.some((blocker) => blocker.includes('InvalidStopLocation')));
assert(failReport.blockers.some((blocker) => blocker.includes('executionStatus')));

const parsed = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageArgs([
  '--dry-run',
  'dry.json',
  '--scanner-report-dir',
  'scanner',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.dryRunPath, 'dry.json');
assert.equal(parsed.scannerReportDir, 'scanner');
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('unified positive held-local Sweep primary exclusion scanner artifact coverage verified.');
