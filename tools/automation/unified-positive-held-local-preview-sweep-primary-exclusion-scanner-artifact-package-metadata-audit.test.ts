import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport,
  parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditArgs,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-scanner-artifact-package-metadata-audit';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-dry-run';

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
  source: { reportDir: 'reports', approvalContractPath: 'approval.json', installedPenaltyAuditPath: 'audit.json' },
  assumptions: {
    savedReportsOnly: true,
    dryRunOnly: true,
    excludesOnlyPrimarySelectionNotAuditVisibility: true,
    noLiveFilterInstalled: true,
    livePromotionAllowed: false,
  },
  summary: {
    auditRowsRead: 1,
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
    rows: 1,
    baselinePrimaryRowId: '2026-07-20-morning-NoInstalledSetup-SHORT',
    baselinePrimaryInvalidStopSweep: true,
    simulatedPrimaryRowId: null,
    simulatedPrimaryInvalidStopSweep: false,
    topChanged: true,
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-sweep-package-metadata-'));
fs.writeFileSync(path.join(tmpDir, 'raw-ohlc-scanner-artifacts-MES-2026-07-20-to-2026-07-20-1.json'), `${JSON.stringify({
  events: {
    '2026-07-20T09:35:00': {
      date: '2026-07-20',
      session: 'morning',
      setupCandidateStatus: {
        statuses: [{
          setupType: 'NoInstalledSetup',
          direction: 'SHORT',
          executionStatus: 'Conditional',
          blockReason: 'InvalidStopLocation',
        }],
      },
    },
  },
})}\n`);

const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport({
  dryRunPath: 'dry.json',
  dryRunReport,
  scannerPackageDir: tmpDir,
}, '2026-07-20T00:01:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.changedSlatesFromDryRun, 1);
assert.equal(report.summary.packageFilesRead, 1);
assert.equal(report.summary.packageRowsMatched, 1);
assert.equal(report.summary.changedSlatesCoveredByPackage, 1);
assert.equal(report.summary.changedSlatesWithExecutionStatus, 1);
assert.equal(report.summary.changedSlatesWithBlockReason, 1);
assert.equal(report.summary.changedSlatesWithInvalidStopLocation, 1);
assert.equal(report.summary.exactRuntimeProposalReady, false);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const missingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-sweep-package-metadata-missing-'));
const missingReport = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport({
  dryRunPath: 'dry.json',
  dryRunReport,
  scannerPackageDir: missingDir,
}, '2026-07-20T00:02:00.000Z');

assert.equal(missingReport.status, 'fail');
assert.equal(missingReport.summary.recommendation, 'fix_missing_input_reports');

const parsed = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditArgs([
  '--dry-run',
  'dry.json',
  '--scanner-package-dir',
  'packages',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.dryRunPath, 'dry.json');
assert.equal(parsed.scannerPackageDir, 'packages');
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('unified positive held-local Sweep primary exclusion scanner artifact package metadata audit verified.');
