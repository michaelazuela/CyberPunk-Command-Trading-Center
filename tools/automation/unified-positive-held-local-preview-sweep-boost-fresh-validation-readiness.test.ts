import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildUnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport } from './unified-positive-held-local-preview-sweep-boost-fresh-validation-readiness';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sweep-fresh-readiness-'));

function writeJson(name: string, value: unknown): string {
  const filePath = path.join(tmp, name);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return filePath;
}

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

const trainArtifact = writeJson('raw-ohlc-scanner-artifacts-MES-2026-06-01-to-2026-07-02-111.json', {});
const testArtifact = writeJson('raw-ohlc-scanner-artifacts-MES-2026-07-03-to-2026-07-17-222.json', {});
const freshArtifact = writeJson('raw-ohlc-scanner-artifacts-MES-2026-07-20-to-2026-07-20-333.json', {});
writeJson('raw-ohlc-scanner-artifacts-MES-2026-07-10-to-2026-07-10-444.json', {});

const guardMiner = writeJson('unified-positive-held-local-preview-sweep-boost-collision-snapshot-guard-miner-1.json', {
  reportType: 'unified_positive_held_local_preview_sweep_boost_collision_snapshot_guard_miner',
  status: 'pass',
  source: {
    trainArtifactPath: trainArtifact,
    testArtifactPath: testArtifact,
  },
});

const testSimulation = writeJson('unified-positive-held-local-preview-sweep-boost-guarded-selection-simulation-2.json', {
  reportType: 'unified_positive_held_local_preview_sweep_boost_guarded_selection_simulation',
  status: 'pass',
  source: {
    period: 'test',
    guardMinerPath: guardMiner,
  },
});

const contract = writeJson('unified-positive-held-local-preview-sweep-boost-guarded-validation-contract-3.json', {
  reportType: 'unified_positive_held_local_preview_sweep_boost_guarded_validation_contract',
  status: 'pass',
  source: {
    testSimulationPath: testSimulation,
  },
  summary: {
    guardFeature: 'session_direction=morning|SHORT&&txt_rth_morning',
  },
});

const noPackage = buildUnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport({
  reportDir: tmp,
  validationContractPath: contract,
}, '2026-07-20T00:00:00.000Z');

assert.equal(noPackage.reportType, 'unified_positive_held_local_preview_sweep_boost_fresh_validation_readiness');
assert.equal(noPackage.status, 'pass');
assert.equal(noPackage.authority.changesTradingLogic, false);
assert.equal(noPackage.authority.changesCanExecute, false);
assert.equal(noPackage.lockedEvidence.latestLockedEndDate, '2026-07-17');
assert.equal(noPackage.summary.rawArtifactsScanned, 4);
assert.equal(noPackage.summary.candidateArtifactsAfterLockedEnd, 1);
assert.equal(noPackage.summary.completeCandidatePackages, 0);
assert.equal(noPackage.summary.freshValidationReady, false);
assert.equal(noPackage.summary.recommendation, 'generate_fresh_unseen_saved_package');
assert.deepEqual(noPackage.candidates[0]?.missing, ['replay package', 'outcome report', 'source/proof timing report']);

const replay = writeJson('raw-ohlc-scanner-artifact-replay-package-4.json', {
  reportType: 'unified_positive_held_local_preview_replay_package',
  status: 'pass',
  source: {
    triageReportPath: freshArtifact,
  },
});
const outcome = writeJson('unified-positive-held-local-preview-replay-package-outcome-5.json', {
  reportType: 'unified_positive_held_local_preview_replay_package_outcome',
  status: 'pass',
  source: {
    replayPackagePath: replay,
  },
});
writeJson('unified-positive-held-local-preview-replay-package-source-proof-timing-6.json', {
  reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
  status: 'pass',
  source: {
    replayPackageOutcomePath: outcome,
  },
});

const ready = buildUnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport({
  reportDir: tmp,
  validationContractPath: contract,
}, '2026-07-20T00:01:00.000Z');

assert.equal(ready.summary.completeCandidatePackages, 1);
assert.equal(ready.summary.freshValidationReady, true);
assert.equal(ready.summary.recommendation, 'run_fresh_validation_contract');
assert.equal(ready.summary.bestCandidateArtifactPath, freshArtifact);
assert.match(ready.markdown, /Fresh Validation Readiness/);

console.log('unified positive held-local Sweep boost fresh-validation readiness verified.');
