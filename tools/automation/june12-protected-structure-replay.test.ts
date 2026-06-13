import assert from 'node:assert/strict';
import {
  buildCandidateLifecycleTrace,
  buildDeskState,
  classifyScannerVisibility,
  resolveScannerWindow,
} from '../../src/lib/localScannerEngine';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, type SetupCandidate } from '../../src/types';

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.LiquiditySweep,
    scenarioLabel: 'June 12 protected structure replay fixture',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 90,
    entry: 100,
    stop: 96,
    target1: 108,
    target2: 108,
    riskPoints: 4,
    invalidation: 'Invalid below protected structure.',
    rankScore: 100,
    evidence: ['structured OHLC evidence fixture'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Completed 5M trigger required.',
    nextAction: 'Wait for completed 5M proof.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

const morningWindow = resolveScannerWindow(new Date('2026-06-12T10:55:00-04:00'));

const selectedShort = candidate({
  scenarioLabel: 'June 12 10:55 stale short review',
  setupType: SetupType.SweepMssFvgRetrace,
  direction: 'SHORT',
  rankScore: 261,
  decisionQualityScore: 98,
  entry: 7391.25,
  stop: 7425,
  target1: 7340.75,
  target2: 7323.75,
  riskPoints: 33.75,
  evidence: [
    'Completed 5M bearish sweep/reclaim was present earlier.',
    'No completed 60M/120M/240M MSS support; HTF is caution/context only.',
  ],
  requiredTrigger: 'Entry only on retrace into bearish imbalance after sweep, reclaim, displacement, and bearish structure shift.',
  nextAction: 'Wait for retrace.',
});

const protectedLong = candidate({
  scenarioLabel: 'June 12 10:55 protected 15M/5M long review',
  direction: 'LONG',
  rankScore: 196.5,
  decisionQualityScore: 50,
  modelConfidenceScore: 70,
  entry: null,
  stop: null,
  target1: 7450,
  target2: 7460,
  riskPoints: null,
  blockReason: NoTradeReason.EntryTriggerPending,
  missingEvidence: [
    'No chase: wait for a completed 5M or 15M close above 7410.00.',
  ],
  requiredTrigger: 'Fresh completed 5M bullish trigger/retest remains required.',
});

const lifecycle = buildCandidateLifecycleTrace({
  candidates: [selectedShort, protectedLong],
  selectedCandidate: selectedShort,
  state: 'Conditional',
  window: morningWindow,
  alertDecision: { shouldSend: false, reason: 'Replay proof: June 12 10:55 selected short should not headline over protected long structure.' },
  canExecute: false,
});

const deskState = buildDeskState({
  state: 'Conditional',
  candidate: selectedShort,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: selectedShort,
    window: morningWindow,
    alertDecision: { shouldSend: false, reason: 'Replay proof: June 12 10:55 protected 15M/5M bullish structure held.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: lifecycle,
  htfLiquidityDrawState: {
    source: 'ninjatrader_ohlc',
    authority: 'ohlc_facts_only',
    boundary: 'context_only_not_execution_authority',
    drawDirection: 'buy_side',
    planDirection: 'LONG',
    macroContext: 'conflicting',
    liquidityRaidState: 'none',
    classification: 'CONFLICTING_MSS',
    timeframeStates: [
      {
        timeframe: '4H',
        direction: 'neutral',
        status: 'conflicting',
        lifecycleState: 'conflicting_mss',
        evidence: ['4H wider structure remains context only.'],
        invalidationLevel: 7577.5,
        confirmationLevel: 7620.5,
        confidence: 45,
      },
      {
        timeframe: '2H',
        direction: 'neutral',
        status: 'conflicting',
        lifecycleState: 'conflicting_mss',
        evidence: ['2H wider structure remains context only.'],
        invalidationLevel: 7527.5,
        confirmationLevel: 7588,
        confidence: 45,
      },
      {
        timeframe: '1H',
        direction: 'bullish',
        status: 'confirmed',
        lifecycleState: 'confirmed_mss',
        evidence: ['1H protected bullish structure held above 7338.75.'],
        invalidationLevel: 7270.25,
        confirmationLevel: 7338.75,
        confidence: 70,
      },
      {
        timeframe: '15M',
        direction: 'bullish',
        status: 'confirmed',
        lifecycleState: 'confirmed_mss',
        evidence: ['15M protected MSS box held; completed close reclaimed 7411.75.'],
        invalidationLevel: 7377.5,
        confirmationLevel: 7411.75,
        externalLiquidityTarget: '15M buy-side draw 7460.00',
        confidence: 76,
      },
      {
        timeframe: '5M',
        direction: 'bullish',
        status: 'confirmed',
        lifecycleState: 'confirmed_mss',
        evidence: ['5M protected MSS held and reclaimed 7393.25.'],
        invalidationLevel: 7377.5,
        confirmationLevel: 7393.25,
        externalLiquidityTarget: '5M buy-side draw 7450.00',
        confidence: 78,
      },
    ],
    timeframeStack: [],
    fiveMinuteState: {
      timeframe: '5M',
      direction: 'bullish',
      status: 'confirmed',
      lifecycleState: 'confirmed_mss',
      evidence: ['5M protected MSS held and reclaimed 7393.25.'],
      invalidationLevel: 7377.5,
      confirmationLevel: 7393.25,
      confidence: 78,
    },
    fiveMinuteMssTriggerConfirmed: true,
    fiveMinuteMssConfirmationType: 'reclaim_then_break',
    postShiftState: 'retest_pending',
    fifteenMinuteConfirmationStatus: 'confirmed',
    activeScanWindow: 'MORNING_SETUP_SCAN',
    htfDrawContinuationPending: false,
    htfContextSufficiency: {
      overallStatus: 'sufficient',
      dataLimited: false,
      blockers: [],
      notes: [],
      timeframeCoverage: [],
    },
    htfContextDataLimited: false,
    timeframeCoverage: [],
    classificationReliability: 'structural',
    classificationReason: 'Replay proof: protected 15M and 5M bullish structure held; wider HTF context remains management only.',
    confidence: 72,
    notes: [],
    blockers: [],
    createsTradingPlanCandidate: false,
    approvesExecution: false,
  },
  currentPrice: 7433.5,
  canExecute: false,
});

const fifteenMinute = deskState.primaryDeskPlay.htfProtectedStructureMap.rows.find((row) => row.timeframe === '15M');
const fiveMinute = deskState.primaryDeskPlay.htfProtectedStructureMap.rows.find((row) => row.timeframe === '5M');

assert.equal(deskState.selectedCandidate?.direction, 'SHORT');
assert.equal(deskState.primaryDeskPlay.direction, 'LONG');
assert.equal(deskState.primaryDeskPlay.longBias.state, 'primary');
assert.equal(deskState.primaryDeskPlay.shortBias.state, 'secondary');
assert.equal(fifteenMinute?.currentBias, 'BULL');
assert.equal(fifteenMinute?.biasChangeLine, 7377.5);
assert.equal(fiveMinute?.currentBias, 'BULL');
assert.equal(fiveMinute?.biasChangeLine, 7377.5);
assert.equal(deskState.primaryDeskPlay.htfObjectiveLadder.direction, 'LONG');
assert.equal(deskState.primaryDeskPlay.htfObjectiveLadder.appTarget1, 7450);
assert.equal(deskState.primaryDeskPlay.htfObjectiveLadder.appTarget2, 7460);
assert.notEqual(deskState.primaryDeskPlay.htfObjectiveLadder.appTarget1, selectedShort.target1);
assert.notEqual(deskState.primaryDeskPlay.htfObjectiveLadder.appTarget2, selectedShort.target2);
assert.equal(deskState.canExecute, false);
assert.equal(deskState.primaryDeskPlay.approvalBoundary.changesCanExecute, false);
assert.equal(deskState.primaryDeskPlay.approvalBoundary.changesTradeApprovals, false);
assert.equal(deskState.primaryDeskPlay.approvalBoundary.changesEntryStopTargets, false);
assert.ok(!deskState.primaryDeskPlay.summary.includes('No HTF-supported directional play'));

console.log('June 12 protected structure replay proof verified.');
