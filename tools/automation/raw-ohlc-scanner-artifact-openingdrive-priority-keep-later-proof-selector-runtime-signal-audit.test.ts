import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-audit';

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

const checkpoint = {
  status: 'pass',
  authority,
  summary: {
    recommendation: 'request_explicit_runtime_install_approval_or_continue_research',
  },
};

const currentShapeReport = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport({
  runtimeApprovalCheckpointPath: 'runtime-checkpoint.json',
  runtimeApprovalCheckpoint: checkpoint as any,
  sourceText: {
    setupScannerText: 'export function rankSetupCandidate(candidate: SetupCandidate): number { return candidate.priority; }',
    typesText: `export interface SetupCandidate {
  setupType: SetupType;
  rankingOverlays?: Array<{ name: string; scoreAdjustment: number }>;
}

export interface NextInterface { ok: true; }`,
    unifiedDeskCandidateBookText: `export interface UnifiedDeskCandidateCollisionMetadata {
  selectorDecision: 'keep_later_sweep_proof' | 'prefer_replacement' | 'not_applicable';
  liveInstallAllowed: false;
  scannerVisibleChangeAllowed: false;
}
const selectorDecision = 'keep_later_sweep_proof';`,
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(currentShapeReport.status, 'pass');
assert.equal(currentShapeReport.authority.readOnly, true);
assert.equal(currentShapeReport.authority.changesScannerBehavior, false);
assert.equal(currentShapeReport.assumptions.noRuntimeChangeInstalled, true);
assert.equal(currentShapeReport.summary.checkpointStatus, 'pass');
assert.equal(currentShapeReport.summary.setupCandidateHasSelectorDecisionField, false);
assert.equal(currentShapeReport.summary.setupCandidateHasProofStateField, false);
assert.equal(currentShapeReport.summary.setupCandidateHasBarsSourceField, false);
assert.equal(currentShapeReport.summary.setupCandidateHasOutcomeInputStatusField, false);
assert.equal(currentShapeReport.summary.setupScannerConsumesKeepLaterSweepProof, false);
assert.equal(currentShapeReport.summary.unifiedBookHasSelectorDecision, true);
assert.equal(currentShapeReport.summary.unifiedBookHasKeepLaterSweepProofDecision, true);
assert.equal(currentShapeReport.summary.unifiedBookSelectorAuditOnly, true);
assert.equal(currentShapeReport.summary.runtimeInstallBlockedByMissingLiveSignal, true);
assert.equal(currentShapeReport.summary.safeRuntimeInstallAllowedNow, false);
assert.equal(currentShapeReport.summary.recommendation, 'add_scanner_owned_live_signal_contract_before_runtime_ranking');
assert.ok(currentShapeReport.gaps.some((gap) => gap.includes('SetupCandidate does not expose')));
assert.match(currentShapeReport.markdown, /Runtime Signal Audit/);

const missingCheckpointReport = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport({
  runtimeApprovalCheckpointPath: null,
  runtimeApprovalCheckpoint: null,
  sourceText: {
    setupScannerText: '',
    typesText: 'export interface SetupCandidate { setupType: SetupType; }',
    unifiedDeskCandidateBookText: '',
  },
}, '2026-07-19T00:01:00.000Z');

assert.equal(missingCheckpointReport.status, 'fail');
assert.equal(missingCheckpointReport.summary.recommendation, 'fix_inputs');
assert.ok(missingCheckpointReport.blockers.some((blocker) => blocker.includes('missing runtime approval checkpoint')));

const futureLiveSignalReport = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport({
  runtimeApprovalCheckpointPath: 'runtime-checkpoint.json',
  runtimeApprovalCheckpoint: checkpoint as any,
  sourceText: {
    setupScannerText: 'candidate.selectorDecision === "keep_later_sweep_proof"',
    typesText: `export interface SetupCandidate {
  selectorDecision?: 'keep_later_sweep_proof';
  proofState?: 'completed';
}
export interface NextInterface { ok: true; }`,
    unifiedDeskCandidateBookText: `selectorDecision: 'keep_later_sweep_proof';
liveInstallAllowed: false;
scannerVisibleChangeAllowed: false;`,
  },
}, '2026-07-19T00:02:00.000Z');

assert.equal(futureLiveSignalReport.status, 'pass');
assert.equal(futureLiveSignalReport.summary.setupCandidateHasSelectorDecisionField, true);
assert.equal(futureLiveSignalReport.summary.setupScannerConsumesKeepLaterSweepProof, true);
assert.equal(futureLiveSignalReport.summary.runtimeInstallBlockedByMissingLiveSignal, false);

console.log('OpeningDrive keep-later-proof selector runtime signal audit verified.');
