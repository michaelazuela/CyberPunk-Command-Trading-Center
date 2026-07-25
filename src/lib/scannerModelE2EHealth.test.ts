import assert from 'node:assert/strict';
import { getPrimarySetupRegistry, SETUP_REGISTRY } from '../config/setupRegistry';
import { ExecutionStatus, SetupCandidateStatus, SetupType, type SetupCandidate } from '../types';
import {
  buildCandidateLifecycleTrace,
  buildDeskState,
  buildTradeDecisionMapAudit,
  classifyScannerVisibility,
  resolveScannerWindow,
} from './localScannerEngine';
import { buildPhase10ModelHealthReport } from './scannerModelE2EHealth';

function candidate(setupType: SetupType, overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType,
    scenarioLabel: `${setupType} Phase 10 lifecycle fixture`,
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Conditional,
    executionStatus: ExecutionStatus.Conditional,
    confidence: 'Medium',
    priority: 90,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    invalidation: 'Invalidation requires protected 5M structure proof.',
    rankScore: 70,
    evidence: ['Structured NinjaTrader OHLC evidence exists for Phase 10 visibility validation.'],
    missingEvidence: ['Completed 5M entry trigger and protected structure stop are not confirmed.'],
    blockReason: null,
    requiredTrigger: 'Wait for completed 5M confirmation before any plan review.',
    nextAction: 'Watch only. No chase.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

const audit = buildTradeDecisionMapAudit();
const report = buildPhase10ModelHealthReport(SETUP_REGISTRY, audit);
const primaryRegistry = getPrimarySetupRegistry('morning')
  .concat(getPrimarySetupRegistry('lunch'))
  .filter((entry, index, items) => items.findIndex((item) => item.setupType === entry.setupType) === index);

assert.equal(report.sourceOfTruth, 'scanner_phase_10_model_e2e_health');
assert.equal(report.phases.alphaPerModelHealthMatrix, 'ready');
assert.equal(report.phases.bravoStaleDataCoverage, 'ready');
assert.equal(report.phases.charliePortfolioE2EContract, 'ready');
assert.equal(report.findings.length, 0);
assert.equal(report.primaryModelCount, primaryRegistry.length);
assert.equal(report.supportingEvidenceCount, 0);
assert.equal(report.deprecatedCount, 0);
assert.equal(report.boundaries.changesTradingLogic, false);
assert.equal(report.boundaries.changesScannerApprovals, false);
assert.equal(report.boundaries.changesCanExecute, false);
assert.equal(report.boundaries.changesEntryStopTargetRisk, false);
assert.equal(report.boundaries.changesDiscordHardBlockers, false);

const reportByType = new Map(report.entries.map((entry) => [entry.setupType, entry]));
for (const registryEntry of primaryRegistry) {
  const health = reportByType.get(registryEntry.setupType);
  assert.ok(health, `${registryEntry.setupType} missing from Phase 10 model health matrix`);
  assert.equal(health?.modelName, registryEntry.label);
  assert.equal(health?.rankWeight, registryEntry.priority);
  assert.deepEqual(health?.requiredEvidence, registryEntry.requiredEvidence);
  assert.equal(health?.authority.registeredModel, true);
  assert.equal(health?.authority.activeModel, true);
  assert.equal(health?.authority.watchEligible, true);
  assert.equal(health?.authority.planEligible, true);
  assert.equal(health?.authority.discordEligible, true);
  assert.equal(health?.authority.canExecuteChangedByPhase10, false);
  assert.equal(health?.staleDataPolicy.missingCompleted5m, 'DATA_QUALITY_BLOCKER');
  assert.equal(health?.staleDataPolicy.staleCompleted5m, 'DATA_QUALITY_BLOCKER');
  assert.equal(health?.staleDataPolicy.canInventMissingBars, false);
  assert.equal(health?.staleDataPolicy.canApproveExecution, false);
  for (const stage of [
    'registered_model',
    'active_session_window',
    'required_evidence_inventory',
    'scanner_candidate_lifecycle',
    'desk_state_visibility',
    'discord_visibility',
    'rag_boundary',
    'stale_data_quality_route',
  ] as const) {
    assert.ok(health?.stages.includes(stage), `${registryEntry.setupType} missing Phase 10 stage ${stage}`);
  }
}

const morningWindow = resolveScannerWindow(new Date('2026-06-10T10:05:00-04:00'));
for (const registryEntry of primaryRegistry) {
  const fixture = candidate(registryEntry.setupType, {
    priority: registryEntry.priority,
    scenarioLabel: registryEntry.label,
    missingEvidence: ['Completed 5M confirmation remains pending.'],
  });
  const visibility = classifyScannerVisibility({
    state: 'Watching',
    candidate: fixture,
    window: morningWindow,
    alertDecision: { shouldSend: true, reason: 'Phase 10 fixture watch route.' },
    canExecute: false,
  });
  const lifecycle = buildCandidateLifecycleTrace({
    candidates: [fixture],
    selectedCandidate: fixture,
    state: 'Watching',
    window: morningWindow,
    alertDecision: { shouldSend: true, reason: 'Phase 10 fixture watch route.' },
    canExecute: false,
  });
  const deskState = buildDeskState({
    state: 'Watching',
    candidate: fixture,
    visibilityMetadata: visibility,
    candidateLifecycleTrace: lifecycle,
    canExecute: false,
  });
  assert.equal(visibility.visibilityMode, 'POST_WATCH');
  assert.equal(visibility.discordAction, 'post_watch');
  assert.equal(visibility.authority.canExecute, false);
  assert.equal(lifecycle.createdCandidates.length, 1);
  assert.equal(lifecycle.selectedCandidate?.setupType, registryEntry.setupType);
  assert.equal(deskState.sourceOfTruth, 'scanner_desk_state');
  assert.equal(deskState.visibilityMode, 'POST_WATCH');
  assert.equal(deskState.discordAction, 'post_watch');
  assert.equal(deskState.canExecute, false);
}

const dataLimitedHtfCandidate = candidate(SetupType.IntradayMssMicroContinuation, {
  htfLiquidityDrawState: {
    source: 'ninjatrader_ohlc',
    authority: 'ohlc_facts_only',
    boundary: 'candidate_creation_only_not_execution_authority',
    macroContext: 'unknown',
    liquidityRaidState: 'unknown',
    classification: 'NO_QUALIFIED_STATE',
    timeframeStates: [],
    fiveMinuteState: {
      timeframe: '5M',
      direction: 'unknown',
      status: 'unknown',
      lifecycleState: 'unknown',
      evidence: [],
      confidence: 0,
    },
    htfDrawContinuationPending: false,
    htfContextDataLimited: true,
    htfContextSufficiency: {
      overallStatus: 'data_limited',
      dataLimited: true,
      blockers: ['120M bars loaded below 30-day minimum.'],
      notes: [],
      timeframeCoverage: [],
    },
    classificationReliability: 'data_limited',
    confidence: 0,
    notes: [],
    blockers: ['120M bars loaded below 30-day minimum.'],
    createsTradingPlanCandidate: false,
    approvesExecution: false,
  },
});
const dataLimitedVisibility = classifyScannerVisibility({
  state: 'Conditional',
  candidate: dataLimitedHtfCandidate,
  window: morningWindow,
  alertDecision: { shouldSend: false, reason: 'Phase 10 data-quality fixture.' },
  canExecute: false,
});
assert.equal(dataLimitedVisibility.visibilityMode, 'DATA_QUALITY_BLOCKER');
assert.equal(dataLimitedVisibility.discordAction, 'hold');
assert.equal(dataLimitedVisibility.authority.canExecute, false);
assert.ok(dataLimitedVisibility.dataQualityBlocker?.includes('120M bars'));

const supportingAuditEntries = audit.entries.filter((entry) => entry.role === 'supporting_evidence');
assert.ok(supportingAuditEntries.every((entry) => !entry.executionEligible));
const deprecatedAuditEntries = audit.entries.filter((entry) => entry.role === 'deprecated');
assert.ok(deprecatedAuditEntries.every((entry) => !entry.discordEligible && !entry.executionEligible));

console.log('scannerModelE2EHealth tests passed');
