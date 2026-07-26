import {
  buildCandidateLifecycleTrace,
  buildDeskState,
  classifyScannerVisibility,
  compareFreshReentryPhase3Behavior,
  resolveScannerWindow,
} from '../../src/lib/localScannerEngine';
import {
  ExecutionStatus,
  NoTradeReason,
  SetupCandidateStatus,
  SetupType,
  type ChartContext,
  type SetupCandidate,
} from '../../src/types';

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.NoSetup,
    scenarioLabel: 'Phase 3 loopback HTF FVG reaction with missed entry',
    direction: 'SHORT',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 88,
    entry: 7588,
    stop: 7604,
    target1: 7564,
    target2: 7556,
    riskPoints: 16,
    invalidation: 'Invalid above protected 5M swing high.',
    rankScore: 88,
    modelConfidenceScore: 88,
    decisionQualityScore: 88,
    evidence: ['HTF parent FVG reaction rejected.', 'Same-direction 5M child FVG confirmed.'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: NoTradeReason.EntryTriggerPending,
    requiredTrigger: 'Completed 5M close and hold below 7596.00.',
    nextAction: 'SHORT BELOW 7596.00 after completed 5M proof.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

const window = resolveScannerWindow(new Date('2026-06-23T12:05:00-04:00'));
const setup = candidate();
const visibility = classifyScannerVisibility({
  state: 'Missed',
  candidate: setup,
  window,
  alertDecision: { shouldSend: false, reason: 'Loopback missed/no-chase fixture.' },
  canExecute: false,
  staleReason: 'Current price is closer to T1 than the preferred entry zone. Move occurred without preferred retest. No chase entry.',
});
const lifecycle = buildCandidateLifecycleTrace({
  candidates: [setup],
  selectedCandidate: {
    ...setup,
    missingEvidence: [...setup.missingEvidence, 'No chase: old entry already moved into target context.'],
  },
  state: 'Missed',
  window,
  alertDecision: { shouldSend: false, reason: 'Loopback missed/no-chase fixture.' },
  staleReason: 'Current price is closer to T1 than the preferred entry zone. Move occurred without preferred retest. No chase entry.',
  canExecute: false,
});

const baseChartContext: Partial<ChartContext> = {
  instrument: 'MES',
  multiTimeframeContext: {
    source: 'ninjatrader_bridge',
    authority: 'ohlc_facts_only',
    fourHour: {
      timeframe: '4h',
      role: 'macro_context',
      barCount: 0,
      high: null,
      low: null,
      open: null,
      close: null,
      midpoint: null,
      rangePoints: null,
      trend: 'unknown',
      candles: [],
      fvgZones: [],
      liquiditySweeps: [],
      reclaimEvents: [],
      failedBreakEvents: [],
      displacementCandles: [],
      structuralLevels: [],
      confidence: 'Low',
      notes: [],
    },
    oneHour: {
      timeframe: '1h',
      role: 'session_structure',
      barCount: 2,
      high: 7610,
      low: 7580,
      open: 7605,
      close: 7588.5,
      midpoint: 7595,
      rangePoints: 30,
      trend: 'bearish',
      candles: [],
      fvgZones: [{
        direction: 'SHORT',
        lower: 7596,
        upper: 7604,
        midpoint: 7600,
        formedAt: '2026-06-23T10:00:00.0000000',
        confidence: 'High',
      }],
      liquiditySweeps: [],
      reclaimEvents: [],
      failedBreakEvents: [],
      displacementCandles: [],
      structuralLevels: [],
      confidence: 'High',
      notes: [],
    },
    fifteenMinute: {
      timeframe: '15m',
      role: 'liquidity_map',
      barCount: 0,
      high: null,
      low: null,
      open: null,
      close: null,
      midpoint: null,
      rangePoints: null,
      trend: 'unknown',
      candles: [],
      fvgZones: [],
      liquiditySweeps: [],
      reclaimEvents: [],
      failedBreakEvents: [],
      displacementCandles: [],
      structuralLevels: [],
      confidence: 'Low',
      notes: [],
    },
    fiveMinute: {
      timeframe: '5m',
      role: 'execution',
      barCount: 2,
      high: 7599.75,
      low: 7589,
      open: 7598,
      close: 7592,
      midpoint: 7594.5,
      rangePoints: 10.75,
      trend: 'bearish',
      candles: [],
      fvgZones: [{
        direction: 'SHORT',
        lower: 7590,
        upper: 7592,
        midpoint: 7591,
        formedAt: '2026-06-23T12:05:00.0000000',
        confidence: 'High',
      }],
      liquiditySweeps: [],
      reclaimEvents: [],
      failedBreakEvents: [],
      displacementCandles: [],
      structuralLevels: [],
      confidence: 'High',
      notes: [],
    },
    alignment: {
      macroBias: 'SHORT',
      sessionBias: 'SHORT',
      liquidityBias: 'SHORT',
      executionBias: 'SHORT',
      alignedDirection: 'SHORT',
      conflicts: [],
      notes: [],
    },
    targetMap: { levelsToWatch: [] },
    rules: {
      higherTimeframesApproveTrades: false,
      fiveMinuteExecutionRequired: true,
      aiMayOverwriteOhlcFacts: false,
    },
    notes: [],
  },
};

const oldWatchOnlyState = buildDeskState({
  state: 'Missed',
  candidate: setup,
  visibilityMetadata: visibility,
  candidateLifecycleTrace: lifecycle,
  currentPrice: 7564,
  canExecute: false,
  chartContext: baseChartContext,
});

const phase3ChartContext = JSON.parse(JSON.stringify(baseChartContext)) as Partial<ChartContext>;
if (phase3ChartContext.multiTimeframeContext?.fiveMinute) {
  phase3ChartContext.multiTimeframeContext.fiveMinute.candles = [
    { index: 0, timestamp: '2026-06-23T12:00:00.0000000', open: 7598, high: 7599.75, low: 7594, close: 7597, direction: 'bearish', confidence: 'High' },
    { index: 1, timestamp: '2026-06-23T12:05:00.0000000', open: 7597, high: 7598.25, low: 7589, close: 7592, direction: 'bearish', confidence: 'High' },
  ];
}

const newCandidateState = buildDeskState({
  state: 'Missed',
  candidate: setup,
  visibilityMetadata: visibility,
  candidateLifecycleTrace: lifecycle,
  currentPrice: 7592,
  canExecute: false,
  chartContext: phase3ChartContext,
});

const comparison = compareFreshReentryPhase3Behavior([oldWatchOnlyState, newCandidateState]);
console.log(JSON.stringify({
  sourceOfTruth: 'fresh_reentry_phase3_loopback',
  oldWatchOnly: oldWatchOnlyState.primaryDeskPlay.freshReentryWatch,
  newCandidateSet: newCandidateState.primaryDeskPlay.freshReentryCandidates,
  comparison,
}, null, 2));
